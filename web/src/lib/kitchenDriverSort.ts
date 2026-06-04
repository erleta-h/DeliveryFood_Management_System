import type { KitchenAssignableDriver, KitchenOrder } from './kitchenApi'
import { distanceKmBetween, type LatLng } from './geo'

export function kitchenLatLng(lat?: number | null, lng?: number | null): LatLng | null {
  if (lat == null || lng == null) return null
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
  return { lat, lng }
}

export function driverLatLng(d: KitchenAssignableDriver): LatLng | null {
  return kitchenLatLng(d.lastLatitude, d.lastLongitude)
}

/** Për një porosi: më afër restorantit/klientit → më larg. */
export function sortDriversForOrder(
  assignableDrivers: KitchenAssignableDriver[],
  restaurantPos: LatLng | null,
  deliveryDestPos: LatLng | null,
): KitchenAssignableDriver[] {
  const m = new Map<number, KitchenAssignableDriver>()
  for (const d of assignableDrivers) {
    if (!m.has(d.userId)) m.set(d.userId, d)
  }
  const list = [...m.values()]
  function sortKey(d: KitchenAssignableDriver): [number, number, number, string] {
    const p = driverLatLng(d)
    const toRest = distanceKmBetween(p, restaurantPos)
    const toDest = distanceKmBetween(p, deliveryDestPos)
    const hasKm = toRest != null || toDest != null
    const tier = hasKm ? 0 : 1
    const primary = toRest ?? toDest ?? Number.POSITIVE_INFINITY
    const secondary = toDest ?? Number.POSITIVE_INFINITY
    return [tier, primary, secondary, d.displayName]
  }
  list.sort((a, b) => {
    const [ta, pa, sa, na] = sortKey(a)
    const [tb, pb, sb, nb] = sortKey(b)
    if (ta !== tb) return ta - tb
    if (pa !== pb) return pa - pb
    if (sa !== sb) return sa - sb
    return na.localeCompare(nb, 'sq', { sensitivity: 'base' })
  })
  return list
}

/** Deliver të renditur: më afër restorantit → më larg; pa GPS në fund (emër). */
export function sortDriversByRestaurantDistance(
  assignableDrivers: KitchenAssignableDriver[],
  restaurantPos: LatLng | null,
): KitchenAssignableDriver[] {
  const m = new Map<number, KitchenAssignableDriver>()
  for (const d of assignableDrivers) {
    if (!m.has(d.userId)) m.set(d.userId, d)
  }
  const list = [...m.values()]
  function sortKey(d: KitchenAssignableDriver): [number, number, string] {
    const p = driverLatLng(d)
    const km = distanceKmBetween(p, restaurantPos)
    const hasKm = km != null
    return [hasKm ? 0 : 1, km ?? Number.POSITIVE_INFINITY, d.displayName]
  }
  list.sort((a, b) => {
    const [ta, pa, na] = sortKey(a)
    const [tb, pb, nb] = sortKey(b)
    if (ta !== tb) return ta - tb
    if (pa !== pb) return pa - pb
    return na.localeCompare(nb, 'sq', { sensitivity: 'base' })
  })
  return list
}

export function driverKmToRestaurant(
  d: KitchenAssignableDriver,
  restaurantPos: LatLng | null,
): number | null {
  return distanceKmBetween(driverLatLng(d), restaurantPos)
}

export function formatDriverKm(km: number | null): string {
  if (km == null) return '—'
  if (km < 1) return `${Math.round(km * 1000)} m`
  return `${km.toFixed(1)} km`
}

/** Emër i shkurtër për listë: «Eria H.» */
export function shortDriverLabel(display: string | null | undefined): string {
  const parts = (display ?? '').trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return 'Driver'
  if (parts.length === 1) return parts[0]!
  return `${parts[0]} ${parts[parts.length - 1]![0]}.`
}

/** Distanca më e mirë: min(restaurant, klient) kur të dyja ekzistojnë. */
export function bestKmDriverToOrder(
  d: KitchenAssignableDriver,
  restaurantPos: LatLng | null,
  deliveryDestPos: LatLng | null,
): number | null {
  const dp = driverLatLng(d)
  const kmRest = distanceKmBetween(dp, restaurantPos)
  const kmDest = distanceKmBetween(dp, deliveryDestPos)
  if (kmRest == null && kmDest == null) return null
  if (kmRest == null) return kmDest
  if (kmDest == null) return kmRest
  return Math.min(kmRest, kmDest)
}

export function driversSortedForKitchenOrder(
  o: KitchenOrder,
  assignableDrivers: KitchenAssignableDriver[],
): KitchenAssignableDriver[] {
  const restaurantPos = kitchenLatLng(o.restaurantLatitude, o.restaurantLongitude)
  const deliveryDestPos = kitchenLatLng(o.deliveryDestinationLatitude, o.deliveryDestinationLongitude)
  return sortDriversForOrder(assignableDrivers, restaurantPos, deliveryDestPos)
}

/** Caktim automatik: më i afërmi me GPS; pa GPS → i pari në listë. */
export function pickNearestAssignableDriverUserId(
  o: KitchenOrder,
  assignableDrivers: KitchenAssignableDriver[],
): number | null {
  if (o.fulfillmentType === 'pickup') return null
  if (o.assignedDriverUserId != null) return null
  const restaurantPos = kitchenLatLng(o.restaurantLatitude, o.restaurantLongitude)
  const deliveryDestPos = kitchenLatLng(o.deliveryDestinationLatitude, o.deliveryDestinationLongitude)
  const sorted = sortDriversForOrder(assignableDrivers, restaurantPos, deliveryDestPos)
  for (const d of sorted) {
    if (bestKmDriverToOrder(d, restaurantPos, deliveryDestPos) != null) return d.userId
  }
  return sorted[0]?.userId ?? null
}

/** Ngarkesa vizuale (demo): 1 porosi ≈ 20%, max 100%. */
export function driverWorkloadPercent(activeOrders: number): number {
  if (activeOrders <= 0) return 0
  return Math.min(100, activeOrders * 20)
}

export function workloadBarClass(percent: number): string {
  if (percent >= 80) return 'bg-red-500'
  if (percent >= 60) return 'bg-orange-500'
  if (percent >= 40) return 'bg-amber-400'
  return 'bg-emerald-500'
}

export function workloadDotClass(percent: number): string {
  if (percent >= 80) return 'bg-red-500'
  if (percent >= 60) return 'bg-orange-500'
  if (percent >= 40) return 'bg-amber-400'
  return 'bg-emerald-500'
}
