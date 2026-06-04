import { apiPath } from './apiBase'

export const DRIVER_LEG = {
  pendingAccept: 0,
  headingToRestaurant: 1,
  atRestaurant: 2,
  enRouteToCustomer: 3,
  completed: 4,
} as const

export type DriverDeliveryRow = {
  orderId: number
  orderNumber: string
  restaurantName: string
  restaurantAddressLine: string
  restaurantCity: string
  restaurantPhone: string | null
  restaurantLatitude: number | null
  restaurantLongitude: number | null
  customerAddressLine1: string
  customerCity: string
  customerPostalCode: string | null
  customerLatitude: number | null
  customerLongitude: number | null
  customerFirstName: string
  customerLastName: string
  customerPhone: string | null
  orderStatus: number
  driverLegStatus: number
  customerNotes: string | null
  contactPhone: string
  placedAtUtc: string
  offeredAtUtc: string | null
  acceptSecondsRemaining: number | null
  distanceToRestaurantKm: number | null
  distanceRestaurantToCustomerKm: number | null
  estimatedDriverPayout: number
  estimatedTotalMinutes: number
  requiresAccept: boolean
  canMarkArrivedRestaurant: boolean
  canMarkPickedUp: boolean
  canMarkDelivered: boolean
  orderTotal: number
  paymentMethodLabel: string
  cashCollectAtDoor: boolean
}

export type DriverStatus = {
  isOnline: boolean
  isBusy: boolean
  secondsOnlineToday: number
  onlineSinceUtc: string | null
  lastLatitude: number | null
  lastLongitude: number | null
  lastLocationAtUtc: string | null
}

export type DriverEarnings = {
  todayTotal: number
  todayDeliveriesCount: number
  weekTotal: number
  weekDeliveriesCount: number
  bonusesTotal: number
}

export type DriverHistoryRow = {
  orderId: number
  orderNumber: string
  deliveredAtUtc: string
  driverPayout: number
  customerRating: number | null
}

export type DriverPerformance = {
  averageRating: number
  ratingsCount: number
  acceptanceRatePercent: number
  declineRatePercent: number
  offersAccepted: number
  offersDeclined: number
  offersTimedOut: number
  performanceHint: string | null
}

export type DriverNotificationRow = {
  id: number
  title: string
  message: string
  type: string
  createdAtUtc: string
  isRead: boolean
}

export type DriverAccountProfile = {
  firstName: string
  lastName: string
  email: string
  phone: string
  line1: string
  city: string
  postalCode: string | null
  vehicleType: string
  licensePlate: string | null
  partnerSinceUtc: string
  isOnline: boolean
  verificationStatus: 'complete' | 'incomplete' | string
  verificationSummary: string
  todayEarnings: number
  todayDeliveriesCount: number
  weekEarnings: number
  weekDeliveriesCount: number
  averageRating: number
  ratingsCount: number
  acceptanceRatePercent: number
  gpsStatusHint: string | null
  nextStepHint: string | null
}

export type DriverOrderDetail = {
  orderId: number
  orderNumber: string
  orderStatus: number
  driverLegStatus: number
  customerNotes: string | null
  placedAtUtc: string
  subtotal: number
  deliveryFee: number
  total: number
  paymentMethodLabel: string
  cashCollectAtDoor: boolean
  cashToCollect: number | null
  restaurant: {
    displayName: string
    addressLine: string
    city: string
    postalCode: string | null
    latitude: number | null
    longitude: number | null
    phone: string | null
  }
  customer: {
    displayName: string
    addressLine: string
    city: string
    postalCode: string | null
    latitude: number | null
    longitude: number | null
    phone: string | null
  }
  lines: { name: string; quantity: number; unitPrice: number }[]
}

function authHeader(token: string) {
  return { Authorization: `Bearer ${token}` }
}

export async function submitDriverApplication(body: {
  firstName: string
  lastName: string
  phone: string
  email: string
  vehicleType: string
  licensePlate?: string
  message?: string
  identityDocument: File
  licenseDocument: File
  vehiclePhoto: File
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const form = new FormData()
  form.append('firstName', body.firstName)
  form.append('lastName', body.lastName)
  form.append('phone', body.phone)
  form.append('email', body.email)
  form.append('vehicleType', body.vehicleType)
  if (body.licensePlate) form.append('licensePlate', body.licensePlate)
  if (body.message) form.append('message', body.message)
  form.append('identityDocument', body.identityDocument)
  form.append('licenseDocument', body.licenseDocument)
  form.append('vehiclePhoto', body.vehiclePhoto)

  const res = await fetch(apiPath('/api/driver/applications'), {
    method: 'POST',
    body: form,
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

export async function fetchDriverStatus(token: string): Promise<DriverStatus> {
  const res = await fetch(apiPath('/api/driver/me/status'), { headers: { ...authHeader(token) } })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json() as Promise<DriverStatus>
}

export async function postDriverOnline(token: string): Promise<{ ok: true } | { ok: false; message: string }> {
  const res = await fetch(apiPath('/api/driver/me/online'), { method: 'POST', headers: { ...authHeader(token) } })
  if (res.status === 204) return { ok: true }
  return parseErr(res)
}

export async function postDriverOffline(token: string): Promise<{ ok: true } | { ok: false; message: string }> {
  const res = await fetch(apiPath('/api/driver/me/offline'), { method: 'POST', headers: { ...authHeader(token) } })
  if (res.status === 204) return { ok: true }
  return parseErr(res)
}

export async function postDriverLocation(
  token: string,
  latitude: number,
  longitude: number,
): Promise<void> {
  await fetch(apiPath('/api/driver/me/location'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeader(token) },
    body: JSON.stringify({ latitude, longitude }),
  })
}

export async function fetchDriverDeliveries(token: string): Promise<DriverDeliveryRow[]> {
  const res = await fetch(apiPath('/api/driver/deliveries'), {
    headers: { ...authHeader(token) },
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json() as Promise<DriverDeliveryRow[]>
}

export async function fetchDriverOrderDetail(token: string, orderId: number): Promise<DriverOrderDetail | null> {
  const res = await fetch(apiPath(`/api/driver/orders/${orderId}`), {
    headers: { ...authHeader(token) },
  })
  if (res.status === 404) return null
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json() as Promise<DriverOrderDetail>
}

async function parseErr(res: Response): Promise<{ ok: false; message: string }> {
  let message = `Gabim ${res.status}`
  try {
    const j = (await res.json()) as { message?: string }
    if (j.message) message = j.message
  } catch {
    /* ignore */
  }
  return { ok: false, message }
}

export async function postDriverAcceptOffer(
  token: string,
  orderId: number,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const res = await fetch(apiPath(`/api/driver/orders/${orderId}/accept-offer`), {
    method: 'POST',
    headers: { ...authHeader(token) },
  })
  if (res.status === 204) return { ok: true }
  return parseErr(res)
}

export async function postDriverDeclineOffer(
  token: string,
  orderId: number,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const res = await fetch(apiPath(`/api/driver/orders/${orderId}/decline-offer`), {
    method: 'POST',
    headers: { ...authHeader(token) },
  })
  if (res.status === 204) return { ok: true }
  return parseErr(res)
}

export async function postDriverArrivedRestaurant(
  token: string,
  orderId: number,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const res = await fetch(apiPath(`/api/driver/orders/${orderId}/arrived-restaurant`), {
    method: 'POST',
    headers: { ...authHeader(token) },
  })
  if (res.status === 204) return { ok: true }
  return parseErr(res)
}

export async function postDriverPickup(
  token: string,
  orderId: number,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const res = await fetch(apiPath(`/api/driver/orders/${orderId}/pickup`), {
    method: 'POST',
    headers: { ...authHeader(token) },
  })
  if (res.status === 204) return { ok: true }
  return parseErr(res)
}

export async function postDriverDelivered(
  token: string,
  orderId: number,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const res = await fetch(apiPath(`/api/driver/orders/${orderId}/delivered`), {
    method: 'POST',
    headers: { ...authHeader(token) },
  })
  if (res.status === 204) return { ok: true }
  return parseErr(res)
}

export async function fetchDriverEarnings(token: string): Promise<DriverEarnings> {
  const res = await fetch(apiPath('/api/driver/earnings'), { headers: { ...authHeader(token) } })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json() as Promise<DriverEarnings>
}

export async function fetchDriverHistory(token: string, take = 30): Promise<DriverHistoryRow[]> {
  const res = await fetch(apiPath(`/api/driver/history?take=${take}`), {
    headers: { ...authHeader(token) },
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json() as Promise<DriverHistoryRow[]>
}

export async function fetchDriverPerformance(token: string): Promise<DriverPerformance> {
  const res = await fetch(apiPath('/api/driver/performance'), { headers: { ...authHeader(token) } })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json() as Promise<DriverPerformance>
}

export async function fetchDriverAccount(token: string): Promise<DriverAccountProfile> {
  const res = await fetch(apiPath('/api/driver/me/account'), { headers: { ...authHeader(token) } })
  if (res.status === 404) {
    const j = (await res.json().catch(() => ({}))) as { message?: string }
    throw new Error(j.message ?? 'Profili nuk u gjet.')
  }
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json() as Promise<DriverAccountProfile>
}

export async function patchDriverAccount(
  token: string,
  body: { phone?: string; line1?: string; city?: string; postalCode?: string },
): Promise<{ ok: true; profile: DriverAccountProfile } | { ok: false; message: string }> {
  const res = await fetch(apiPath('/api/driver/me/account'), {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...authHeader(token) },
    body: JSON.stringify({
      ...(body.phone !== undefined ? { phone: body.phone } : {}),
      ...(body.line1 !== undefined ? { line1: body.line1 } : {}),
      ...(body.city !== undefined ? { city: body.city } : {}),
      ...(body.postalCode !== undefined ? { postalCode: body.postalCode } : {}),
    }),
  })
  if (res.ok) {
    const profile = (await res.json()) as DriverAccountProfile
    return { ok: true, profile }
  }
  let message = `Gabim ${res.status}`
  try {
    const j = (await res.json()) as { message?: string }
    if (j.message) message = j.message
  } catch {
    /* ignore */
  }
  return { ok: false, message }
}

export async function fetchDriverNotifications(token: string, take = 20): Promise<DriverNotificationRow[]> {
  const res = await fetch(apiPath(`/api/driver/notifications?take=${take}`), {
    headers: { ...authHeader(token) },
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json() as Promise<DriverNotificationRow[]>
}

export function mapsDirectionsUrl(opts: {
  destLat?: number | null
  destLng?: number | null
  originLat?: number | null
  originLng?: number | null
  labelFallback?: string
}): string | null {
  const { destLat, destLng, originLat, originLng, labelFallback } = opts
  if (destLat != null && destLng != null) {
    const dest = `${destLat},${destLng}`
    if (originLat != null && originLng != null)
      return `https://www.google.com/maps/dir/${originLat},${originLng}/${dest}`
    return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(dest)}`
  }
  if (labelFallback)
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(labelFallback)}`
  return null
}
