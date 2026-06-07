import type { RestaurantListItem } from './restaurantsApi'
import { isFreeDelivery } from './restaurantCardImages'

export type BrowseSection = {
  id: string
  title: string
  subtitle?: string
  items: RestaurantListItem[]
  layout: 'carousel' | 'grid' | 'carousel-compact'
}

export type BrowseHeroStats = {
  restaurantCount: number
  avgRating: number
  avgEtaMinutes: number
  freeDeliveryCount: number
}

export function computeHeroStats(items: RestaurantListItem[]): BrowseHeroStats {
  if (items.length === 0) {
    return { restaurantCount: 0, avgRating: 0, avgEtaMinutes: 0, freeDeliveryCount: 0 }
  }
  const sumRating = items.reduce((s, r) => s + r.averageRating, 0)
  const sumEta = items.reduce((s, r) => s + r.estimatedDeliveryMinutes, 0)
  return {
    restaurantCount: items.length,
    avgRating: sumRating / items.length,
    avgEtaMinutes: Math.round(sumEta / items.length),
    freeDeliveryCount: items.filter((r) => isFreeDelivery(r.deliveryFee)).length,
  }
}

/** Ndarje në seksione si Wolt — nga të njëjtat të dhëna API. */
export function buildBrowseSections(items: RestaurantListItem[]): BrowseSection[] {
  if (items.length === 0) return []

  const byRating = [...items].sort(
    (a, b) => b.averageRating - a.averageRating || b.reviewCount - a.reviewCount,
  )
  const featured = byRating.slice(0, Math.min(5, items.length))
  const featuredIds = new Set(featured.map((r) => r.id))

  const offers = items
    .filter((r) => !featuredIds.has(r.id) && (isFreeDelivery(r.deliveryFee) || r.deliveryFee <= 1))
    .slice(0, 6)

  const offerIds = new Set([...featuredIds, ...offers.map((r) => r.id)])

  const fast = items
    .filter((r) => !offerIds.has(r.id) && r.estimatedDeliveryMinutes <= 30)
    .sort((a, b) => a.estimatedDeliveryMinutes - b.estimatedDeliveryMinutes)
    .slice(0, 6)

  const used = new Set([...offerIds, ...fast.map((r) => r.id)])
  const rest = items.filter((r) => !used.has(r.id))

  const sections: BrowseSection[] = []

  if (featured.length > 0) {
    sections.push({
      id: 'featured',
      title: 'Restorantet më të mira',
      subtitle: 'Vlerësimi më i lartë në zonën tënde',
      items: featured,
      layout: 'carousel',
    })
  }
  if (offers.length > 0) {
    sections.push({
      id: 'offers',
      title: 'Oferta sot',
      subtitle: 'Dërgesë falas ose tarifë e ulët',
      items: offers,
      layout: 'carousel-compact',
    })
  }
  if (fast.length > 0) {
    sections.push({
      id: 'fast',
      title: 'Dërgesë e shpejtë',
      subtitle: 'Nën 30 minuta',
      items: fast,
      layout: 'carousel-compact',
    })
  }
  if (rest.length > 0 || sections.length === 0) {
    sections.push({
      id: 'all',
      title: sections.length > 0 ? 'Të gjitha restorantet' : 'Restorantet',
      subtitle: undefined,
      items: sections.length > 0 ? rest : items,
      layout: 'grid',
    })
  }

  return sections
}
