import { apiPath } from './apiBase'
import { networkErrorMessage, readApiErrorMessage } from './apiErrors'

export type AuthSessionPayload = {
  token: string
  expiresAtUtc: string
  refreshExpiresAtUtc: string
  user: unknown
}

type AuthHandlers = {
  getToken: () => string | null
  applySession: (data: AuthSessionPayload) => void
  clearSession: () => void
}

let handlers: AuthHandlers = {
  getToken: () => null,
  applySession: () => {},
  clearSession: () => {},
}

export function registerAuthHandlers(next: AuthHandlers) {
  handlers = next
}

let refreshInFlight: Promise<boolean> | null = null

export async function refreshSession(): Promise<
  { ok: true; data: AuthSessionPayload } | { ok: false; error: string }
> {
  try {
    const res = await fetch(apiPath('/api/auth/refresh'), {
      method: 'POST',
      credentials: 'include',
    })
    if (!res.ok) return { ok: false, error: await readApiErrorMessage(res) }
    const data = (await res.json()) as AuthSessionPayload
    handlers.applySession(data)
    return { ok: true, data }
  } catch (e) {
    return { ok: false, error: networkErrorMessage(e) }
  }
}

async function tryRefreshOnce(): Promise<boolean> {
  if (refreshInFlight) return refreshInFlight
  refreshInFlight = refreshSession()
    .then((r) => {
      refreshInFlight = null
      return r.ok
    })
    .catch(() => {
      refreshInFlight = null
      return false
    })
  return refreshInFlight
}

export async function logoutSession(): Promise<void> {
  try {
    await fetch(apiPath('/api/auth/logout'), {
      method: 'POST',
      credentials: 'include',
    })
  } catch {
    /* ignore */
  }
  handlers.clearSession()
}

export async function fetchWithAuth(path: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers)
  const token = handlers.getToken()
  if (token) headers.set('Authorization', `Bearer ${token}`)

  let res = await fetch(apiPath(path), {
    ...init,
    headers,
    credentials: 'include',
  })

  if (res.status === 401) {
    const refreshed = await tryRefreshOnce()
    if (refreshed) {
      const next = handlers.getToken()
      if (next) headers.set('Authorization', `Bearer ${next}`)
      res = await fetch(apiPath(path), {
        ...init,
        headers,
        credentials: 'include',
      })
    }
  }

  return res
}

export async function bootstrapSessionFromCookie(): Promise<boolean> {
  const r = await refreshSession()
  return r.ok
}

export function accessTokenExpired(expiresAtUtc: string | null, skewMs = 60_000): boolean {
  if (!expiresAtUtc) return true
  return Date.parse(expiresAtUtc) <= Date.now() + skewMs
}
