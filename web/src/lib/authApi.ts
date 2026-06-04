import { apiPath } from './apiBase'
import { networkErrorMessage, readApiErrorMessage } from './apiErrors'
import {
  bootstrapSessionFromCookie,
  fetchWithAuth,
  logoutSession,
  refreshSession,
  type AuthSessionPayload,
} from './apiClient'

export type AuthUser = {
  id: number
  email: string
  firstName: string
  lastName: string
  phone: string
  line1: string
  city: string
  postalCode?: string | null
  /** True kur admini ka dhënë fjalëkalim të përkohshëm — paneli kërkon ndryshim para përdorimit të plotë. */
  mustChangePassword?: boolean
  latitude?: number
  longitude?: number
}

export type AuthResponse = AuthSessionPayload & { user: AuthUser }

function authHeader(token: string) {
  return { Authorization: `Bearer ${token}` }
}

export function mapAuthUser(data: AuthUser): AuthUser {
  return {
      id: data.id,
    email: data.email,
    firstName: data.firstName,
    lastName: data.lastName,
    phone: data.phone ?? '',
    line1: data.line1,
    city: data.city,
    postalCode: data.postalCode ?? undefined,
    mustChangePassword: data.mustChangePassword === true,
  }
}

export async function registerCustomer(body: {
  email: string
  password: string
  firstName: string
  lastName: string
  phone: string
  line1: string
  city: string
  postalCode?: string
}): Promise<{ ok: true; data: AuthResponse } | { ok: false; error: string }> {
  try {
    const res = await fetch(apiPath('/api/auth/register'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(body),
    })
    if (!res.ok) return { ok: false, error: await readApiErrorMessage(res) }
    const data = (await res.json()) as AuthResponse
    return { ok: true, data }
  } catch (e) {
    return { ok: false, error: networkErrorMessage(e) }
  }
}

export async function loginCustomer(
  email: string,
  password: string,
): Promise<{ ok: true; data: AuthResponse } | { ok: false; error: string }> {
  try {
    const res = await fetch(apiPath('/api/auth/login'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email, password }),
    })
    if (!res.ok) return { ok: false, error: await readApiErrorMessage(res) }
    const data = (await res.json()) as AuthResponse
    return { ok: true, data }
  } catch (e) {
    return { ok: false, error: networkErrorMessage(e) }
  }
}

export async function fetchCurrentUser(token: string): Promise<AuthUser | null> {
  const res = await fetchWithAuth('/api/auth/me', {
    headers: { ...authHeader(token) },
  })
  if (res.status === 401 || res.status === 403) return null
  if (!res.ok) return null
  const data = (await res.json()) as AuthUser
  return mapAuthUser(data)
}

export async function patchCustomerProfile(
  token: string,
  partial: { line1?: string; city?: string; postalCode?: string; phone?: string; latitude?: number; longitude?: number },
): Promise<{ ok: true; user: AuthUser } | { ok: false; error: string }> {
  const res = await fetchWithAuth('/api/auth/profile', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...authHeader(token) },
    body: JSON.stringify({
      ...(partial.line1 !== undefined ? { line1: partial.line1 } : {}),
      ...(partial.city !== undefined ? { city: partial.city } : {}),
      ...(partial.postalCode !== undefined ? { postalCode: partial.postalCode } : {}),
      ...(partial.phone !== undefined ? { phone: partial.phone } : {}),
      ...(partial.latitude !== undefined ? { latitude: partial.latitude } : {}),
      ...(partial.longitude !== undefined ? { longitude: partial.longitude } : {}),
    }),
  })
  if (!res.ok) return { ok: false, error: await readApiErrorMessage(res) }
  const user = (await res.json()) as AuthUser
  return { ok: true, user: mapAuthUser(user) }
}

/** Invalidon refresh token-et në server — pas ndryshimit të fjalëkalimit duhet hyrje përsëri. */
export async function activateAccount(body: {
  token: string
  email?: string
  newPassword: string
  confirmPassword: string
}): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const res = await fetch(apiPath('/api/auth/activate-account'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token: body.token,
        email: body.email ?? null,
        newPassword: body.newPassword,
        confirmPassword: body.confirmPassword,
      }),
    })
    if (res.status === 204) return { ok: true }
    return { ok: false, error: await readApiErrorMessage(res) }
  } catch (e) {
    return { ok: false, error: networkErrorMessage(e) }
  }
}

export async function changePassword(
  token: string,
  currentPassword: string,
  newPassword: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const res = await fetchWithAuth('/api/auth/change-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeader(token) },
    body: JSON.stringify({ currentPassword, newPassword }),
  })
  if (res.status === 204) return { ok: true }
  return { ok: false, error: await readApiErrorMessage(res) }
}
export { bootstrapSessionFromCookie, fetchWithAuth, logoutSession, refreshSession }
