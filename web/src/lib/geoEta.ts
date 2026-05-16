/** Distancë në km (sipërfaqe e tokës — jo rrugë reale). */
export function haversineDistanceKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const R = 6371
  const dLat = ((b.lat - a.lat) * Math.PI) / 180
  const dLng = ((b.lng - a.lng) * Math.PI) / 180
  const lat1 = (a.lat * Math.PI) / 180
  const lat2 = (b.lat * Math.PI) / 180
  const x =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(x)))
}

/**
 * Vlerësim i thjeshtë i kohës së mbetur (minuta), pa trafik live.
 * Shpejtësia mesatare urbane ~24 km/h — përshtatet lehtë sipas nevojës.
 */
export function estimateDriveEtaMinutes(
  from: { lat: number; lng: number },
  to: { lat: number; lng: number },
  avgSpeedKmh = 24,
): number {
  if (!(avgSpeedKmh > 0)) return 1
  const km = haversineDistanceKm(from, to)
  const hours = km / avgSpeedKmh
  return Math.max(1, Math.round(hours * 60))
}
