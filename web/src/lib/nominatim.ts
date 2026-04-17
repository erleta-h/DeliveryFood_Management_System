/** Geokodim falas përmes OpenStreetMap Nominatim (përdor me respekt për politikat e tyre). */

type NominatimReverse = {
  display_name?: string
  address?: {
    house_number?: string
    road?: string
    pedestrian?: string
    neighbourhood?: string
    suburb?: string
    city?: string
    town?: string
    village?: string
    municipality?: string
    city_district?: string
    postcode?: string
  }
}

type NominatimSearchItem = {
  lat: string
  lon: string
  display_name: string
}

const headers = {
  Accept: 'application/json',
  'Accept-Language': 'sq,en',
} as const

export async function reverseGeocode(lat: number, lon: number): Promise<string | null> {
  const parts = await reverseGeocodeParts(lat, lon)
  return parts?.displayName ?? null
}

/** Reverse geocode me fusha për formë (rrugë, qytet, kod postar). */
export async function reverseGeocodeParts(
  lat: number,
  lon: number,
): Promise<{
  line1: string
  city: string
  postalCode?: string
  displayName: string
} | null> {
  const url = new URL('https://nominatim.openstreetmap.org/reverse')
  url.searchParams.set('format', 'jsonv2')
  url.searchParams.set('lat', String(lat))
  url.searchParams.set('lon', String(lon))

  const res = await fetch(url.toString(), { headers })
  if (!res.ok) return null
  const data = (await res.json()) as NominatimReverse
  const displayName = data.display_name?.trim()
  if (!displayName) return null

  const a = data.address
  let line1 = ''
  let city = ''
  let postalCode: string | undefined

  if (a) {
    postalCode = a.postcode?.trim() || undefined
    const street = [a.house_number, a.road || a.pedestrian].filter(Boolean).join(' ').trim()
    const area = [a.neighbourhood, a.suburb].filter(Boolean).join(', ').trim()
    line1 = street || area || ''
    city =
      a.city ||
      a.town ||
      a.village ||
      a.municipality ||
      a.city_district ||
      ''
  }

  if (!line1) {
    line1 = displayName.split(',')[0]?.trim() ?? displayName
  }
  if (!city) {
    const seg = displayName.split(',').map((s) => s.trim())
    city = seg[1] ?? seg[0] ?? ''
  }

  return { line1, city, postalCode, displayName }
}

export async function searchAddress(query: string): Promise<{ lat: number; lon: number; displayName: string } | null> {
  const q = query.trim()
  if (q.length < 3) return null

  const url = new URL('https://nominatim.openstreetmap.org/search')
  url.searchParams.set('format', 'jsonv2')
  url.searchParams.set('q', q)
  url.searchParams.set('limit', '1')

  const res = await fetch(url.toString(), { headers })
  if (!res.ok) return null
  const arr = (await res.json()) as NominatimSearchItem[]
  const first = arr[0]
  if (!first) return null
  const lat = Number.parseFloat(first.lat)
  const lon = Number.parseFloat(first.lon)
  if (Number.isNaN(lat) || Number.isNaN(lon)) return null
  return { lat, lon, displayName: first.display_name }
}
