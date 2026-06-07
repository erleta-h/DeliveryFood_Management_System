import { create } from 'zustand'
import {
  accessTokenExpired,
  bootstrapSessionFromCookie,
  logoutSession,
  refreshSession,
  registerAuthHandlers,
  type AuthSessionPayload,
} from '../lib/apiClient'
import {
  fetchCurrentUser,
  loginCustomer,
  mapAuthUser,
  patchCustomerProfile,
  registerCustomer,
  type AuthUser,
} from '../lib/authApi'
import { clearStaffCustomerAppMode } from '../lib/staffCustomerApp'

const TOKEN_KEY = 'fd_token'
const EXPIRES_KEY = 'fd_expires_at'
/** Tregon që përdoruesi ka pasur sesion — shmang POST /refresh për vizitorë të rinj. */
const HAD_SESSION_KEY = 'fd_had_session'
/** Regjistrimi i vjetër demo — hiqet që të mos përzihet me përdoruesit në SQL. */
const LEGACY_ACCOUNTS_KEY = 'fd_accounts'

export type UserProfile = AuthUser

/** StrictMode e thirr bootstrap dy herë — një promise e vetme. */
let bootstrapPromise: Promise<void> | null = null

function persistSession(data: AuthSessionPayload) {
  localStorage.setItem(TOKEN_KEY, data.token)
  localStorage.setItem(EXPIRES_KEY, data.expiresAtUtc)
  sessionStorage.setItem(HAD_SESSION_KEY, '1')
}

function clearPersistedSession() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(EXPIRES_KEY)
  sessionStorage.removeItem(HAD_SESSION_KEY)
}

type AuthState = {
  token: string | null
  expiresAtUtc: string | null
  user: UserProfile | null
  loading: boolean
  bootstrap: () => Promise<void>
  login: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>
  register: (data: {
    email: string
    password: string
    firstName: string
    lastName: string
    phone: string
    line1: string
    city: string
    postalCode?: string
    latitude?: number
    longitude?: number
  }) => Promise<{ ok: boolean; error?: string }>
  setToken: (token: string | null) => void
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
  updateProfile: (
    partial: Partial<Pick<UserProfile, 'line1' | 'city' | 'postalCode' | 'phone' | 'latitude' | 'longitude'>>,
  ) => Promise<{ ok: boolean; error?: string }>
}

export const useAuthStore = create<AuthState>((set, get) => ({
  token: null,
  expiresAtUtc: null,
  user: null,
  loading: true,

  bootstrap: async () => {
    if (bootstrapPromise) {
      await bootstrapPromise
      return
    }

    bootstrapPromise = (async () => {
    try {
      localStorage.removeItem(LEGACY_ACCOUNTS_KEY)

      let token = localStorage.getItem(TOKEN_KEY)
      let expiresAtUtc = localStorage.getItem(EXPIRES_KEY)

      let hadSession = sessionStorage.getItem(HAD_SESSION_KEY) === '1'
      if (!hadSession && token) {
        sessionStorage.setItem(HAD_SESSION_KEY, '1')
        hadSession = true
      }

      if ((!token || accessTokenExpired(expiresAtUtc)) && hadSession) {
        const fromCookie = await bootstrapSessionFromCookie()
        if (fromCookie) {
          token = get().token
          expiresAtUtc = get().expiresAtUtc
        }
      }

      if (!token) {
        set({ token: null, expiresAtUtc: null, user: null, loading: false })
        return
      }

      if (accessTokenExpired(expiresAtUtc)) {
        if (!hadSession) {
          clearPersistedSession()
          set({ token: null, expiresAtUtc: null, user: null, loading: false })
          return
        }
        const r = await refreshSession()
        if (!r.ok) {
          clearPersistedSession()
          set({ token: null, expiresAtUtc: null, user: null, loading: false })
          return
        }
        token = r.data.token
        expiresAtUtc = r.data.expiresAtUtc
      }

      const user = await fetchCurrentUser(token)
      if (!user) {
        clearPersistedSession()
        set({ token: null, expiresAtUtc: null, user: null, loading: false })
        return
      }

      set({ token, expiresAtUtc, user, loading: false })
    } catch {
      clearPersistedSession()
      set({ token: null, expiresAtUtc: null, user: null, loading: false })
    } finally {
      bootstrapPromise = null
    }
    })()

    await bootstrapPromise
  },
  login: async (email, password) => {
    const r = await loginCustomer(email.trim(), password)
    if (!r.ok) return { ok: false, error: r.error }

    persistSession(r.data)
    set({
      token: r.data.token,
      expiresAtUtc: r.data.expiresAtUtc,
      user: mapAuthUser(r.data.user),
    })
    return { ok: true }
  },

  register: async (data) => {
    const r = await registerCustomer({
      email: data.email.trim(),
      password: data.password,
      firstName: data.firstName,
      lastName: data.lastName,
      phone: data.phone,
      line1: data.line1,
      city: data.city,
      postalCode: data.postalCode,
      ...(data.latitude != null && data.longitude != null
        ? { latitude: data.latitude, longitude: data.longitude }
        : {}),
    })
    if (!r.ok) return { ok: false, error: r.error }

    persistSession(r.data)
    set({
      token: r.data.token,
      expiresAtUtc: r.data.expiresAtUtc,
      user: mapAuthUser(r.data.user),
    })
    return { ok: true }
  },

  setToken: (token) => {
    if (!token) {
      clearPersistedSession()
      set({ token: null, expiresAtUtc: null, user: null })
      return
    }
    localStorage.setItem(TOKEN_KEY, token)
    void fetchCurrentUser(token).then((user) => {
      if (user) set({ token, user })
      else {
        clearPersistedSession()
        set({ token: null, expiresAtUtc: null, user: null })
      }
    })
  },

  logout: async () => {
    await logoutSession()
    clearStaffCustomerAppMode()
    set({ token: null, expiresAtUtc: null, user: null })
  },

  refreshUser: async () => {
    const { token } = get()
    if (!token) return
    const user = await fetchCurrentUser(token)
    if (user) set({ user })
  },

  updateProfile: async (partial) => {
    const { token, user } = get()
    if (!token || !user) return { ok: false, error: 'Nuk je i kyçur.' }

    const body: {
      line1?: string
      city?: string
      postalCode?: string
      phone?: string
      latitude?: number
      longitude?: number
    } = {}
    if (partial.line1 !== undefined) body.line1 = partial.line1
    if (partial.city !== undefined) body.city = partial.city
    if (partial.postalCode !== undefined) body.postalCode = partial.postalCode ?? ''
    if (partial.phone !== undefined) body.phone = partial.phone
    if (partial.latitude !== undefined) body.latitude = partial.latitude
    if (partial.longitude !== undefined) body.longitude = partial.longitude

    const r = await patchCustomerProfile(token, body)
    if (!r.ok) return { ok: false, error: r.error }

    set({ user: r.user })
    return { ok: true }
  },
}))

registerAuthHandlers({
  getToken: () => useAuthStore.getState().token,
  applySession: (data) => {
    persistSession(data)
    useAuthStore.setState({
      token: data.token,
      expiresAtUtc: data.expiresAtUtc,
      user: mapAuthUser(data.user as AuthUser),
    })
  },
  clearSession: () => {
    clearPersistedSession()
    useAuthStore.setState({ token: null, expiresAtUtc: null, user: null })
  },
})

