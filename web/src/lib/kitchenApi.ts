import { apiPath } from './apiBase'

export type KitchenStaffContext = {
  isLinked: boolean
  restaurantId: number | null
  restaurantName: string | null
  slug: string | null
}

export type KitchenOrderLine = {
  name: string
  quantity: number
  unitPrice: number
}

export type KitchenOrder = {
  id: number
  orderNumber: string
  placedAtUtc: string
  status: number
  subtotal: number
  deliveryFee: number
  total: number
  customerNotes: string | null
  customerFirstName: string
  customerLastName: string
  contactPhone: string
  addressLine1: string
  city: string
  postalCode: string | null
  estimatedPrepMinutes: number
  fulfillmentType: string
  assignedDriverDisplay: string | null
  assignedDriverUserId: number | null
  lines: KitchenOrderLine[]
  /** Lloj mjeti nga profili i Deliver (API i ri). */
  assignedDriverVehicleType?: string | null
  /** Delivery.Status (DeliveryDriverLeg); null për pickup. */
  deliveryLegStatus?: number | null
  deliveryOfferedAtUtc?: string | null
  deliveryAcceptedAtUtc?: string | null
  deliveryArrivedAtRestaurantUtc?: string | null
  restaurantLatitude?: number | null
  restaurantLongitude?: number | null
  deliveryDestinationLatitude?: number | null
  deliveryDestinationLongitude?: number | null
}

export type KitchenAssignableDriver = {
  userId: number
  displayName: string
  vehicleType: string
  lastLatitude?: number | null
  lastLongitude?: number | null
}

export type KitchenTodayStats = {
  ordersCount: number
  completedCount: number
  revenueTotal: number
}

function authHeader(token: string) {
  return { Authorization: `Bearer ${token}` }
}

export type KitchenContextResult =
  | { ok: true; context: KitchenStaffContext }
  | { ok: false; reason: 'unauthorized' }
  | { ok: false; reason: 'error'; message: string }

export async function fetchKitchenContext(token: string): Promise<KitchenContextResult> {
  const res = await fetch(apiPath('/api/kitchen/context'), {
    headers: { ...authHeader(token) },
  })
  if (res.status === 401 || res.status === 403) return { ok: false, reason: 'unauthorized' }
  if (!res.ok) return { ok: false, reason: 'error', message: `HTTP ${res.status}` }
  const context = (await res.json()) as KitchenStaffContext
  return { ok: true, context }
}

/** Gabimet nga `fetchKitchenOrders` / `fetchKitchenTodayStats` (throw `HTTP ${status}`). */
export function isKitchenHttpUnauthorized(e: unknown): boolean {
  return e instanceof Error && e.message === 'HTTP 401'
}

export async function fetchKitchenTodayStats(token: string): Promise<KitchenTodayStats> {
  const res = await fetch(apiPath('/api/kitchen/stats/today'), {
    headers: { ...authHeader(token) },
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json() as Promise<KitchenTodayStats>
}

export async function fetchKitchenOrders(token: string): Promise<KitchenOrder[]> {
  const res = await fetch(apiPath('/api/kitchen/orders'), {
    headers: { ...authHeader(token) },
  })
  if (res.status === 403) return []
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json() as Promise<KitchenOrder[]>
}

export type KitchenOrderHistoryResult = {
  items: KitchenOrder[]
  totalCount: number
  page: number
  pageSize: number
}

export async function fetchKitchenOrderHistory(
  token: string,
  page = 1,
  pageSize = 20,
): Promise<KitchenOrderHistoryResult> {
  const qs = new URLSearchParams({ page: String(page), pageSize: String(pageSize) })
  const res = await fetch(`${apiPath('/api/kitchen/orders/history')}?${qs}`, {
    headers: { ...authHeader(token) },
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json() as Promise<KitchenOrderHistoryResult>
}

export async function fetchKitchenAssignableDrivers(token: string): Promise<KitchenAssignableDriver[]> {
  const res = await fetch(apiPath('/api/kitchen/drivers/assignable'), {
    headers: { ...authHeader(token) },
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json() as Promise<KitchenAssignableDriver[]>
}

export async function patchKitchenAssignDriver(
  token: string,
  orderId: number,
  driverUserId: number,
  options?: { immediateHandoff?: boolean },
): Promise<{ ok: true } | { ok: false; message: string }> {
  const res = await fetch(apiPath(`/api/kitchen/orders/${orderId}/assign-driver`), {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...authHeader(token) },
    body: JSON.stringify({
      driverUserId,
      immediateHandoff: options?.immediateHandoff === true,
    }),
  })
  if (res.status === 204) return { ok: true }
  let message = `Gabim ${res.status}`
  try {
    const j = (await res.json()) as { message?: string }
    if (j.message) message = j.message
  } catch {
    /* ignore */
  }
  return { ok: false, message }
}

export async function patchKitchenOrderStatus(
  token: string,
  orderId: number,
  status: number,
  note?: string | null,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const body: { status: number; note?: string | null } = { status }
  if (note != null && note !== '') body.note = note

  const res = await fetch(apiPath(`/api/kitchen/orders/${orderId}/status`), {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...authHeader(token) },
    body: JSON.stringify(body),
  })
  if (res.status === 204) return { ok: true }
  let message = `Gabim ${res.status}`
  try {
    const j = (await res.json()) as { message?: string }
    if (j.message) message = j.message
  } catch {
    /* ignore */
  }
  return { ok: false, message }
}

export async function patchKitchenPrepMinutes(
  token: string,
  orderId: number,
  prepMinutes: number,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const res = await fetch(apiPath(`/api/kitchen/orders/${orderId}/prep-minutes`), {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...authHeader(token) },
    body: JSON.stringify({ prepMinutes }),
  })
  if (res.status === 204) return { ok: true }
  let message = `Gabim ${res.status}`
  try {
    const j = (await res.json()) as { message?: string }
    if (j.message) message = j.message
  } catch {
    /* ignore */
  }
  return { ok: false, message }
}
