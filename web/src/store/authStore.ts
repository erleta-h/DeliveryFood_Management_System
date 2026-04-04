import { create } from 'zustand'
import {
  fetchCurrentUser,
  loginCustomer,
  mapAuthUser,
  patchCustomerProfile,
  registerCustomer,
  type AuthUser,
} from '../lib/authApi'

const TOKEN_KEY = 'fd_token'
/** Regjistrimi i vjetër demo — hiqet që të mos përzihet me përdoruesit në SQL. */
const LEGACY_ACCOUNTS_KEY = 'fd_accounts'

export type UserProfile = AuthUser

type AuthState = {
  token: string | null
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
  }) => Promise<{ ok: boolean; error?: string }>
  setToken: (token: string | null) => void
  logout: () => void
  updateProfile: (
    partial: Partial<Pick<UserProfile, 'line1' | 'city' | 'postalCode' | 'phone'>>,
  ) => Promise<{ ok: boolean; error?: string }>
}

export const useAuthStore = create<AuthState>((set, get) => ({
  token: null,
  user: null,
  loading: true,

  bootstrap: async () => {
    try {
      localStorage.removeItem(LEGACY_ACCOUNTS_KEY)

      const token = localStorage.getItem(TOKEN_KEY)
      if (!token) {
        set({ token: null, user: null, loading: false })
        return
      }

      const user = await fetchCurrentUser(token)
      if (!user) {
        localStorage.removeItem(TOKEN_KEY)
        set({ token: null, user: null, loading: false })
        return
      }

      set({ token, user, loading: false })
    } catch {
      localStorage.removeItem(TOKEN_KEY)
      set({ token: null, user: null, loading: false })
    }
  },

  login: async (email, password) => {
    const r = await loginCustomer(email.trim(), password)
    if (!r.ok) return { ok: false, error: r.error }

    localStorage.setItem(TOKEN_KEY, r.data.token)
    set({ token: r.data.token, user: mapAuthUser(r.data.user) })
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
    })
    if (!r.ok) return { ok: false, error: r.error }

    localStorage.setItem(TOKEN_KEY, r.data.token)
    set({ token: r.data.token, user: mapAuthUser(r.data.user) })
    return { ok: true }
  },

  setToken: (token) => {
    if (!token) {
      localStorage.removeItem(TOKEN_KEY)
      set({ token: null, user: null })
      return
    }
    localStorage.setItem(TOKEN_KEY, token)
    void fetchCurrentUser(token).then((user) => {
      if (user) set({ token, user })
      else {
        localStorage.removeItem(TOKEN_KEY)
        set({ token: null, user: null })
      }
    })
  },

  logout: () => {
    localStorage.removeItem(TOKEN_KEY)
    set({ token: null, user: null })
  },

  updateProfile: async (partial) => {
    const { token, user } = get()
    if (!token || !user) return { ok: false, error: 'Nuk je i kyçur.' }

    const body: {
      line1?: string
      city?: string
      postalCode?: string
      phone?: string
    } = {}
    if (partial.line1 !== undefined) body.line1 = partial.line1
    if (partial.city !== undefined) body.city = partial.city
    if (partial.postalCode !== undefined)
      body.postalCode = partial.postalCode ?? ''
    if (partial.phone !== undefined) body.phone = partial.phone

    const r = await patchCustomerProfile(token, body)
    if (!r.ok) return { ok: false, error: r.error }

    set({ user: r.user })
    return { ok: true }
  },
}))
