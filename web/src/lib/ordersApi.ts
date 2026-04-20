import { apiPath } from './apiBase'

/** Përputhet me backend `OrderFulfillmentType`. */
export const FULFILLMENT_DELIVERY = 0
export const FULFILLMENT_PICKUP = 1

export type PlaceOrderLine = { menuItemId: number; quantity: number }

export type CustomerOrderSummary = {
  id: number
  orderNumber: string
  restaurantId: number
  restaurantName: string
  placedAtUtc: string
  status: number
  fulfillmentType: number
  total: number
}

export type CustomerOrderItem = {
  name: string
  quantity: number
  unitPrice: number
  lineTotal: number
}

export type CustomerOrderDetail = {
  id: number
  orderNumber: string
  restaurantId: number
  restaurantName: string
  placedAtUtc: string
  status: number
  fulfillmentType: number
  subtotal: number
  deliveryFee: number
  total: number
  customerNotes: string | null
  contactPhone: string
  addressLine1: string
  city: string
  postalCode: string | null
  items: CustomerOrderItem[]
}

function authHeader(token: string) {
  return { Authorization: `Bearer ${token}` }
}

export async function placeOrder(
  token: string,
  body: {
    restaurantId: number
    lines: PlaceOrderLine[]
    customerNotes?: string
    /** 0 = dërgesë, 1 = marrje në restoran */
    fulfillmentType?: number
  },
): Promise<{ ok: true; orderId: number } | { ok: false; message: string }> {
  const res = await fetch(apiPath('/api/orders'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeader(token) },
    body: JSON.stringify({
      restaurantId: body.restaurantId,
      lines: body.lines.map((l) => ({
        menuItemId: l.menuItemId,
        quantity: l.quantity,
      })),
      customerNotes: body.customerNotes ?? null,
      fulfillmentType: body.fulfillmentType ?? FULFILLMENT_DELIVERY,
    }),
  })
  if (res.status === 201) {
    const orderId = (await res.json()) as number
    return { ok: true, orderId }
  }
  try {
    const j = (await res.json()) as { message?: string }
    return { ok: false, message: j.message ?? `HTTP ${res.status}` }
  } catch {
    return { ok: false, message: `HTTP ${res.status}` }
  }
}

export async function fetchMyOrders(token: string): Promise<CustomerOrderSummary[]> {
  const res = await fetch(apiPath('/api/orders/my'), {
    headers: { ...authHeader(token) },
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json() as Promise<CustomerOrderSummary[]>
}

export async function fetchMyOrder(
  token: string,
  orderId: number,
): Promise<CustomerOrderDetail | null> {
  const res = await fetch(apiPath(`/api/orders/my/${orderId}`), {
    headers: { ...authHeader(token) },
  })
  if (res.status === 404) return null
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json() as Promise<CustomerOrderDetail>
}
