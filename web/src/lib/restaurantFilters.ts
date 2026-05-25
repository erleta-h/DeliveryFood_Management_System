import type { RestaurantListItem } from './restaurantsApi'

export type SortOption = 'rating' | 'eta' | 'name' | 'fee' | 'proximity'
export type PriceTierOption = 'all' | 'low' | 'medium' | 'high'
export type QuickFilterId = 'rating45' | 'freeDelivery' | 'popular' | 'fast30'

/** Restorantët me ETA ≤ këtë vlerë konsiderohen “të arritshëm shpejt” (hapur për dërgesë). */
export const OPEN_NOW_MAX_MINUTES = 40

/** Kufij të thjeshtë për “çmimin” e dërgesës (tarifë fikse nga katalogu). */
export const DELIVERY_FEE_LOW_MAX = 1
export const DELIVERY_FEE_MEDIUM_MAX = 1.5

const sortLabelsSq: Record<SortOption, string> = {
  rating: 'vlerësimit',
  eta: 'kohës së dërgesës',
  name: 'emrit (A–Z)',
  fee: 'tarifës së dërgesës',
  proximity: 'largësisë nga ti (GPS)',
}

/** Përmbledhje për përdoruesin: çfarë do të thotë renditja aktuale. */
export function sortSummaryLabel(sort: SortOption): string {
  return `Renditur sipas ${sortLabelsSq[sort]}.`
}

/**
 * Filtra që zbatohen mbi listën e kthyer nga API (pas kërkimit / kategorisë).
 * Renditja vjen nga serveri — këtu vetëm rregulla biznesi për çmim dërgese dhe “hapur tani”.
 */
export function applyClientRestaurantFilters(
  list: RestaurantListItem[],
  priceTier: PriceTierOption,
  openNow: boolean,
): RestaurantListItem[] {
  let out = [...list]
  if (priceTier === 'low')
    out = out.filter((r) => r.deliveryFee <= DELIVERY_FEE_LOW_MAX)
  else if (priceTier === 'medium')
    out = out.filter(
      (r) =>
        r.deliveryFee > DELIVERY_FEE_LOW_MAX &&
        r.deliveryFee <= DELIVERY_FEE_MEDIUM_MAX,
    )
  else if (priceTier === 'high')
    out = out.filter((r) => r.deliveryFee > DELIVERY_FEE_MEDIUM_MAX)

  if (openNow) {
    out = out.filter((r) => r.estimatedDeliveryMinutes <= OPEN_NOW_MAX_MINUTES)
  }

  return out
}

/** Filtra të shpejtë me ikona (chip) — mbi listën nga API. */
export function applyQuickFilters(
  list: RestaurantListItem[],
  active: Set<QuickFilterId>,
): RestaurantListItem[] {
  if (active.size === 0) return list
  let out = [...list]
  if (active.has('rating45')) out = out.filter((r) => r.averageRating >= 4.5)
  if (active.has('freeDelivery')) out = out.filter((r) => r.deliveryFee <= 0.01)
  if (active.has('popular')) {
    const minReviews = Math.max(1, Math.ceil(out.length * 0.35))
    out = [...out]
      .sort((a, b) => b.reviewCount - a.reviewCount)
      .slice(0, Math.max(minReviews, Math.min(8, out.length)))
  }
  if (active.has('fast30')) out = out.filter((r) => r.estimatedDeliveryMinutes <= 30)
  return out
}
