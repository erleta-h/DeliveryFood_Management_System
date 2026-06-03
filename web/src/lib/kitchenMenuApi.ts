import { apiPath } from './apiBase'

export type KitchenMenuItemRow = {
  id: number
  name: string
  description: string | null
  price: number
  isAvailable: boolean
  isFeatured: boolean
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
    const j = (await res.json()) as { message?: string; error?: string }
    if (typeof j.message === 'string' && j.message) return j.message
    if (typeof j.error === 'string' && j.error) return j.error
  } catch {
    /* ignore */
  }
  return `HTTP ${res.status}`
}

function normalizeKitchenItem(raw: KitchenMenuItemRow & { IsAvailable?: boolean; IsFeatured?: boolean }): KitchenMenuItemRow {
  return {
    id: raw.id,
    name: raw.name,
    description: raw.description ?? null,
    price: Number(raw.price),
    isAvailable: raw.isAvailable ?? raw.IsAvailable ?? true,
    isFeatured: Boolean(raw.isFeatured ?? raw.IsFeatured ?? false),
    imageUrl: raw.imageUrl ?? null,
  }
}

function normalizeKitchenMenu(
  rows: (KitchenMenuCategoryRow & { Items?: KitchenMenuItemRow[] })[]
): KitchenMenuCategoryRow[] {
  return rows.map((cat) => {
    const items = (cat.items ?? cat.Items ?? []).map((it) =>
      normalizeKitchenItem(it as KitchenMenuItemRow & { IsAvailable?: boolean; IsFeatured?: boolean }),
    )
    return {
      id: cat.id,
      name: cat.name,
      sortOrder: cat.sortOrder,
      items,
    }
  })
}

export async function fetchKitchenMenu(token: string): Promise<KitchenMenuCategoryRow[]> {
  const res = await fetch(apiPath('/api/kitchen/menu'), { headers: { ...authHeader(token) } })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const raw = (await res.json()) as (KitchenMenuCategoryRow & { Items?: KitchenMenuItemRow[] })[]
  return normalizeKitchenMenu(raw)
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
    isFeatured?: boolean
  },
): Promise<{ ok: true; id: number } | { ok: false; message: string }> {
  const res = await fetch(apiPath('/api/kitchen/menu/items'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeader(token) },
    body: JSON.stringify({
      menuCategoryId: body.menuCategoryId,
      name: body.name,
      price: body.price,
      description: body.description ?? null,
      isAvailable: body.isAvailable ?? true,
      isFeatured: body.isFeatured ?? false,
    }),
  })
  if (res.status === 201) {
    const raw: unknown = await res.json()
    const id = typeof raw === 'number' ? raw : Number(raw)
    if (!Number.isFinite(id))
      return { ok: false, message: 'Përgjigje e pavlefshme nga serveri.' }
    return { ok: true, id }
  }
  return { ok: false, message: await readMessage(res) }
}

export async function updateKitchenMenuItem(
  token: string,
  id: number,
  body: {
    name?: string
    description?: string | null
    price?: number
    isAvailable?: boolean
    isFeatured?: boolean
  },
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

export async function uploadKitchenMenuItemImage(
  token: string,
  itemId: number,
  file: File,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const fd = new FormData()
  fd.append('file', file)
  const res = await fetch(apiPath(`/api/kitchen/menu/items/${itemId}/image`), {
    method: 'POST',
    headers: { ...authHeader(token) },
    body: fd,
  })
  if (res.status === 204) return { ok: true }
  return { ok: false, message: await readMessage(res) }
}

export async function deleteKitchenMenuItemImage(
  token: string,
  itemId: number,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const res = await fetch(apiPath(`/api/kitchen/menu/items/${itemId}/image`), {
    method: 'DELETE',
    headers: { ...authHeader(token) },
  })
  if (res.status === 204) return { ok: true }
  return { ok: false, message: await readMessage(res) }
}
