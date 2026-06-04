import { fetchWithAuth } from './apiClient'

/** Përputhet me backend `OrderFulfillmentType`. */
export const FULFILLMENT_DELIVERY = 0
export const FULFILLMENT_PICKUP = 1

/** Përputhet me `OrderPaymentMethod` në API. */
export const PAYMENT_COD = 0
export const PAYMENT_STRIPE = 1

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
  /** Kur korrieri ka pranuar — chat-i aktiv në faqen e detajit. */
  deliveryChatAvailable?: boolean
}

export type CustomerOrderItem = {
  name: string
  quantity: number
  unitPrice: number
  lineTotal: number
}

export type CustomerOrderDriver = {
  displayName: string
  phone: string | null
  vehicleType: string | null
  licensePlate: string | null
  rating: number | null
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
  restaurantLatitude: number | null
  restaurantLongitude: number | null
  customerLatitude: number | null
  customerLongitude: number | null
  driverLatitude: number | null
  driverLongitude: number | null
  /** Kur korrieri ka pranuar dërgesën — shfaq chat-in me tekst. */
  deliveryChatAvailable?: boolean
  /** True kur pagesa Stripe nuk është kapur ende — duhet /orders/:id/pay. */
  pendingStripePayment?: boolean
  /** Faza Deliver (0–4); null për pickup / pa dërgesë — përputhet me `DeliveryDriverLeg` në API. */
  deliveryLegStatus?: number | null
  /** Info e korrierit — null kur nuk ka delivery ose nuk është caktuar ende. */
  driver?: CustomerOrderDriver | null
  /** Arsye e anulimit nga restoranti — vetëm kur statusi është anuluar. */
  cancellationReason?: string | null
}

const STRIPE_CHECKOUT_ORDER_KEY = 'fdStripeCheckoutOrderId'

export function setStripeCheckoutOrderSession(orderId: number) {
  sessionStorage.setItem(STRIPE_CHECKOUT_ORDER_KEY, String(orderId))
}

export function clearStripeCheckoutOrderSession() {
  sessionStorage.removeItem(STRIPE_CHECKOUT_ORDER_KEY)
}

export function readStripeCheckoutOrderSession(): number | null {
  const v = sessionStorage.getItem(STRIPE_CHECKOUT_ORDER_KEY)
  if (v == null || v === '') return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

function authHeader(token: string) {
  return { Authorization: `Bearer ${token}` }
}

export type PlaceOrderOneTimeAddress = {
  line1: string
  city: string
  postalCode?: string
  line2?: string
}

export async function placeOrder(
  token: string,
  body: {
    restaurantId: number
    lines: PlaceOrderLine[]
    customerNotes?: string
    /** 0 = dërgesë, 1 = marrje në restoran */
    fulfillmentType?: number
    /** 0 = para në dorëzim, 1 = Stripe */
    paymentMethod?: number
    /** Vetëm për dërgesë: adresë tjetër vetëm për këtë porosi (krijohet rresht i ri «Porosi (një herë)»). */
    oneTimeDeliveryAddress?: PlaceOrderOneTimeAddress | null
  },
): Promise<
  | { ok: true; orderId: number; requiresStripePayment: boolean }
  | { ok: false; message: string }
> {
  const res = await fetchWithAuth('/api/orders', {
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
      paymentMethod: body.paymentMethod ?? PAYMENT_STRIPE,
      oneTimeDeliveryAddress: body.oneTimeDeliveryAddress ?? null,
    }),
  })
  if (res.status === 201) {
    const data = (await res.json()) as {
      orderId?: number
      OrderId?: number
      requiresStripePayment?: boolean
      RequiresStripePayment?: boolean
    }
    const orderId = data.orderId ?? data.OrderId
    const requiresStripePayment =
      data.requiresStripePayment ?? data.RequiresStripePayment ?? false
    if (orderId == null || !Number.isFinite(orderId)) {
      return { ok: false, message: 'Përgjigje e papritur nga serveri (mungon ID e porosisë).' }
    }
    return { ok: true, orderId, requiresStripePayment }
  }
  try {
    const j = (await res.json()) as { message?: string; title?: string }
    const msg = j.message?.trim()
    if (msg) return { ok: false, message: msg }
    if (res.status >= 500) {
      return {
        ok: false,
        message:
          'Gabim në server gjatë ruajtjes së porosisë. Rinisni API-në (Visual Studio → Stop → Start) që të aplikohen migrimet e databazës, pastaj provoni përsëri.',
      }
    }
    return { ok: false, message: j.title ?? `HTTP ${res.status}` }
  } catch {
    if (res.status >= 500) {
      return {
        ok: false,
        message:
          'Gabim në server (HTTP 500). Rinisni API-në që të aplikohen migrimet, pastaj provoni përsëri.',
      }
    }
    return { ok: false, message: `HTTP ${res.status}` }
  }
}

/** Anulon porosinë në pritje kur pagesa me kartë refuzohet / nuk përfundon (server e vendos «anuluar»). */
export async function cancelUnpaidStripeOrder(
  token: string,
  orderId: number,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const res = await fetchWithAuth(`/api/orders/my/${orderId}/cancel-unpaid-stripe`, {
    method: 'POST',
    headers: { ...authHeader(token) },
  })
  if (res.status === 204) return { ok: true }
  try {
    const j = (await res.json()) as { message?: string }
    return { ok: false, message: j.message ?? `HTTP ${res.status}` }
  } catch {
    return { ok: false, message: `HTTP ${res.status}` }
  }
}

export async function fetchMyOrders(token: string): Promise<CustomerOrderSummary[]> {
  const res = await fetchWithAuth('/api/orders/my', {
    headers: { ...authHeader(token) },
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json() as Promise<CustomerOrderSummary[]>
}

export async function fetchMyOrder(
  token: string,
  orderId: number,
): Promise<CustomerOrderDetail | null> {
  const res = await fetchWithAuth(`/api/orders/my/${orderId}`, {
    headers: { ...authHeader(token) },
  })
  if (res.status === 404) return null
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json() as Promise<CustomerOrderDetail>
}

/** Heq porosinë nga «Porositë e mia» (nuk e fshin nga platforma për restorantin/adminin). */
export async function hideMyOrderFromHistory(
  token: string,
  orderId: number,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const res = await fetchWithAuth(`/api/orders/my/${orderId}`, {
    method: 'DELETE',
    headers: { ...authHeader(token) },
  })
  if (res.status === 204) return { ok: true }
  if (res.status === 404) return { ok: false, message: 'Porosia nuk u gjet.' }
  try {
    const j = (await res.json()) as { message?: string }
    return { ok: false, message: j.message ?? `HTTP ${res.status}` }
  } catch {
    return { ok: false, message: `HTTP ${res.status}` }
  }
}
