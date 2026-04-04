const KEY = 'fd_delivery_location'

export type StoredDeliveryLocation = {
  address: string
  lat: number
  lng: number
  city?: string
}

export function loadDeliveryLocation(): StoredDeliveryLocation | null {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    const o = JSON.parse(raw) as StoredDeliveryLocation
    if (typeof o.address !== 'string' || typeof o.lat !== 'number' || typeof o.lng !== 'number') return null
    return o
  } catch {
    return null
  }
}

export function saveDeliveryLocation(loc: StoredDeliveryLocation) {
  localStorage.setItem(KEY, JSON.stringify(loc))
}

/** Nga adresa e plotë Nominatim + qyteti i ruajtur → fushat e formës së regjistrimit. */
export function getSignupAddressPrefill(saved: StoredDeliveryLocation): {
  line1: string
  city: string
  postalCode: string
} {
  const parts = saved.address.split(',').map((s) => s.trim()).filter(Boolean)
  const postalMatch = saved.address.match(/\b(\d{4,6})\b/)

  const line1 = parts.length > 1 ? (parts[0] ?? saved.address) : saved.address
  const city = saved.city?.trim() || (parts.length >= 2 ? parts[1]! : '')
  const postalCode = postalMatch?.[1] ?? ''

  return { line1, city, postalCode }
}
