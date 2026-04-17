import type { RestaurantListItem } from './restaurantsApi'

export type SortOption = 'rating' | 'eta' | 'name' | 'fee' | 'proximity'
export type PriceTierOption = 'all' | 'low' | 'medium' | 'high'

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
