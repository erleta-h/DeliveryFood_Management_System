import { apiPath } from './apiBase'

export type AuthUser = {
  email: string
  firstName: string
  lastName: string
  phone: string
  line1: string
  city: string
  postalCode?: string | null
}

export type AuthResponse = {
  token: string
  expiresAtUtc: string
  user: AuthUser
}

function authHeader(token: string) {
  return { Authorization: `Bearer ${token}` }
}

async function readErrorMessage(res: Response): Promise<string> {
  try {
    const j = (await res.json()) as { message?: string }
    if (typeof j.message === 'string' && j.message) return j.message
  } catch {
    /* ignore */
  }
  return `HTTP ${res.status}`
}

export function mapAuthUser(data: AuthUser): AuthUser {
  return {
    email: data.email,
    firstName: data.firstName,
    lastName: data.lastName,
    phone: data.phone ?? '',
    line1: data.line1,
    city: data.city,
    postalCode: data.postalCode ?? undefined,
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
  const res = await fetch(apiPath('/api/auth/register'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok)
    return { ok: false, error: await readErrorMessage(res) }
  const data = (await res.json()) as AuthResponse
  return { ok: true, data }
}

export async function loginCustomer(
  email: string,
  password: string,
): Promise<{ ok: true; data: AuthResponse } | { ok: false; error: string }> {
  const res = await fetch(apiPath('/api/auth/login'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  if (!res.ok)
    return { ok: false, error: await readErrorMessage(res) }
  const data = (await res.json()) as AuthResponse
  return { ok: true, data }
}

export async function fetchCurrentUser(
  token: string,
): Promise<AuthUser | null> {
  const res = await fetch(apiPath('/api/auth/me'), {
    headers: { ...authHeader(token) },
  })
  if (res.status === 401 || res.status === 403) return null
  if (!res.ok) return null
  const data = (await res.json()) as AuthUser
  return mapAuthUser(data)
}

export async function patchCustomerProfile(
  token: string,
  partial: { line1?: string; city?: string; postalCode?: string; phone?: string },
): Promise<{ ok: true; user: AuthUser } | { ok: false; error: string }> {
  const res = await fetch(apiPath('/api/auth/profile'), {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...authHeader(token) },
    body: JSON.stringify({
      ...(partial.line1 !== undefined ? { line1: partial.line1 } : {}),
      ...(partial.city !== undefined ? { city: partial.city } : {}),
      ...(partial.postalCode !== undefined ? { postalCode: partial.postalCode } : {}),
      ...(partial.phone !== undefined ? { phone: partial.phone } : {}),
    }),
  })
  if (!res.ok)
    return { ok: false, error: await readErrorMessage(res) }
  const user = (await res.json()) as AuthUser
  return { ok: true, user: mapAuthUser(user) }
}

/** Për çdo rol të kyçur; invalidon refresh token-et — nëse përdor «mba mend», duhet hyrje përsëri. */
export async function changePassword(
  token: string,
  currentPassword: string,
  newPassword: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const res = await fetch(apiPath('/api/auth/change-password'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeader(token) },
    body: JSON.stringify({ currentPassword, newPassword }),
  })
  if (res.status === 204) return { ok: true }
  return { ok: false, error: await readErrorMessage(res) }
}
