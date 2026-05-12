/** Distanca në km në sipërfaqe sferike (WGS84). */
export function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2
  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)))
}

export type LatLng = { lat: number; lng: number }

/** Kthen distancën në km (1 shifër dhjetore) ose null nëse mungojnë të dhënat. */
export function distanceKmBetween(a: LatLng | null | undefined, b: LatLng | null | undefined): number | null {
  if (a == null || b == null) return null
  if (![a.lat, a.lng, b.lat, b.lng].every((x) => Number.isFinite(x))) return null
  return Math.round(haversineKm(a.lat, a.lng, b.lat, b.lng) * 10) / 10
}
