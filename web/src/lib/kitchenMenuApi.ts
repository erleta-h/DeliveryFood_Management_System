import { apiPath } from './apiBase'

export type KitchenMenuItemRow = {
  id: number
  name: string
  description: string | null
  price: number
  isAvailable: boolean
  imageUrl?: string | null
}

export type KitchenMenuCategoryRow = {
  id: number
  name: string
  sortOrder: number
  items: KitchenMenuItemRow[]
}

function authHeader(token: string) {
  return { Authorization: `Bearer ${token}` }
}

async function readMessage(res: Response): Promise<string> {
  try {
    const j = (await res.json()) as { message?: string }
    if (typeof j.message === 'string' && j.message) return j.message
  } catch {
    /* ignore */
  }
  return `HTTP ${res.status}`
}

export async function fetchKitchenMenu(token: string): Promise<KitchenMenuCategoryRow[]> {
  const res = await fetch(apiPath('/api/kitchen/menu'), { headers: { ...authHeader(token) } })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json() as Promise<KitchenMenuCategoryRow[]>
}

export async function createKitchenCategory(
  token: string,
  body: { name: string; sortOrder?: number },
): Promise<{ ok: true } | { ok: false; message: string }> {
  const res = await fetch(apiPath('/api/kitchen/menu/categories'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeader(token) },
    body: JSON.stringify(body),
  })
  if (res.status === 201) return { ok: true }
  return { ok: false, message: await readMessage(res) }
}

export async function updateKitchenCategory(
  token: string,
  id: number,
  body: { name?: string; sortOrder?: number },
): Promise<{ ok: true } | { ok: false; message: string }> {
  const res = await fetch(apiPath(`/api/kitchen/menu/categories/${id}`), {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...authHeader(token) },
    body: JSON.stringify(body),
  })
  if (res.status === 204) return { ok: true }
  return { ok: false, message: await readMessage(res) }
}

export async function deleteKitchenCategory(
  token: string,
  id: number,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const res = await fetch(apiPath(`/api/kitchen/menu/categories/${id}`), {
    method: 'DELETE',
    headers: { ...authHeader(token) },
  })
  if (res.status === 204) return { ok: true }
  return { ok: false, message: await readMessage(res) }
}

export async function createKitchenMenuItem(
  token: string,
  body: {
    menuCategoryId: number
    name: string
    price: number
    description?: string | null
    isAvailable?: boolean
  },
): Promise<{ ok: true } | { ok: false; message: string }> {
  const res = await fetch(apiPath('/api/kitchen/menu/items'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeader(token) },
    body: JSON.stringify({
      menuCategoryId: body.menuCategoryId,
      name: body.name,
      price: body.price,
      description: body.description ?? null,
      isAvailable: body.isAvailable ?? true,
    }),
  })
  if (res.status === 201) return { ok: true }
  return { ok: false, message: await readMessage(res) }
}

export async function updateKitchenMenuItem(
  token: string,
  id: number,
  body: { name?: string; description?: string | null; price?: number; isAvailable?: boolean },
): Promise<{ ok: true } | { ok: false; message: string }> {
  const res = await fetch(apiPath(`/api/kitchen/menu/items/${id}`), {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...authHeader(token) },
    body: JSON.stringify(body),
  })
  if (res.status === 204) return { ok: true }
  return { ok: false, message: await readMessage(res) }
}

export async function deleteKitchenMenuItem(
  token: string,
  id: number,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const res = await fetch(apiPath(`/api/kitchen/menu/items/${id}`), {
    method: 'DELETE',
    headers: { ...authHeader(token) },
  })
  if (res.status === 204) return { ok: true }
  return { ok: false, message: await readMessage(res) }
}
