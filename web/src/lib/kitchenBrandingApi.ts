import { apiPath } from './apiBase'

export type KitchenBrandingState = {
  restaurantId: number
  restaurantName: string
  categoryName: string
  logoUrl: string | null
  coverUrl: string | null
  hasCustomLogo: boolean
  hasCustomCover: boolean
}

function authHeader(token: string) {
  return { Authorization: `Bearer ${token}` }
}

async function readMessage(res: Response): Promise<string> {
  try {
    const j = (await res.json()) as { message?: string; error?: string }
    if (typeof j.message === 'string' && j.message) return j.message
    if (typeof j.error === 'string' && j.error) return j.error
  } catch {
    /* ignore */
  }
  return `HTTP ${res.status}`
}

function normalize(raw: KitchenBrandingState & {
  LogoUrl?: string | null
  CoverUrl?: string | null
  HasCustomLogo?: boolean
  HasCustomCover?: boolean
  RestaurantName?: string
  CategoryName?: string
}): KitchenBrandingState {
  return {
    restaurantId: raw.restaurantId,
    restaurantName: raw.restaurantName ?? raw.RestaurantName ?? '',
    categoryName: raw.categoryName ?? raw.CategoryName ?? '',
    logoUrl: raw.logoUrl ?? raw.LogoUrl ?? null,
    coverUrl: raw.coverUrl ?? raw.CoverUrl ?? null,
    hasCustomLogo: Boolean(raw.hasCustomLogo ?? raw.HasCustomLogo),
    hasCustomCover: Boolean(raw.hasCustomCover ?? raw.HasCustomCover),
  }
}

export async function fetchKitchenBranding(token: string): Promise<KitchenBrandingState | null> {
  const res = await fetch(apiPath('/api/kitchen/branding'), { headers: { ...authHeader(token) } })
  if (res.status === 404) return null
  if (!res.ok) throw new Error(await readMessage(res))
  const raw = (await res.json()) as KitchenBrandingState
  return normalize(raw)
}

export async function uploadKitchenLogo(
  token: string,
  file: File,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const fd = new FormData()
  fd.append('file', file)
  const res = await fetch(apiPath('/api/kitchen/branding/logo'), {
    method: 'POST',
    headers: { ...authHeader(token) },
    body: fd,
  })
  if (res.status === 204) return { ok: true }
  return { ok: false, message: await readMessage(res) }
}

export async function uploadKitchenCover(
  token: string,
  file: File,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const fd = new FormData()
  fd.append('file', file)
  const res = await fetch(apiPath('/api/kitchen/branding/cover'), {
    method: 'POST',
    headers: { ...authHeader(token) },
    body: fd,
  })
  if (res.status === 204) return { ok: true }
  return { ok: false, message: await readMessage(res) }
}

export async function deleteKitchenLogo(
  token: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const res = await fetch(apiPath('/api/kitchen/branding/logo'), {
    method: 'DELETE',
    headers: { ...authHeader(token) },
  })
  if (res.status === 204) return { ok: true }
  return { ok: false, message: await readMessage(res) }
}

export async function deleteKitchenCover(
  token: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const res = await fetch(apiPath('/api/kitchen/branding/cover'), {
    method: 'DELETE',
    headers: { ...authHeader(token) },
  })
  if (res.status === 204) return { ok: true }
  return { ok: false, message: await readMessage(res) }
}

export function kitchenBrandingPublicUrl(path: string | null | undefined): string | null {
  if (!path) return null
  return apiPath(path)
}
