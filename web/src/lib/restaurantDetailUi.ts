import { apiPath } from './apiBase'
import { imageUrlForFoodCategory } from './categoryBrowseImages'
import type { RestaurantMenuCategory, RestaurantMenuItem } from './restaurantMenuApi'

const DEMO_DESC = /porosi demo|çmim dhe emër nga menuja/i

/** Tekst i pastër për klient — pa mesazhe “demo” nga seeder-i. */
export function menuItemDescription(
  description: string | null | undefined,
  name: string,
): string | null {
  const d = description?.trim()
  if (!d || DEMO_DESC.test(d)) {
    if (/pije|cola|fanta|ujë/i.test(name)) return 'Pije e ftohtë, gati për dërgesë.'
    if (/burger/i.test(name)) return 'Mish viçi, sallatë freske dhe sos i veçantë.'
    if (/pizza/i.test(name)) return 'Brumë e freskët, salcë domateje dhe djathë.'
    if (/sallat/i.test(name)) return 'Perime sezonale me vaj ulliri.'
    return null
  }
  return d
}

export function coverImageFromMenu(
  categories: RestaurantMenuCategory[],
  categoryName: string,
  customCoverUrl?: string | null,
): string {
  if (customCoverUrl) return apiPath(customCoverUrl)
  for (const cat of categories) {
    for (const item of cat.items) {
      if (item.imageUrl) return apiPath(item.imageUrl)
    }
  }
  return imageUrlForFoodCategory(categoryName)
}

/** Rreshta të emrit për logo të gjeneruar (fallback). */
export function generatedLogoLines(title: string): string[] {
  return title.trim().split(/\s+/).slice(0, 2)
}

export function etaRangeLabel(minutes: number): string {
  const lo = Math.max(15, minutes - 5)
  const hi = minutes + 10
  return `${lo}–${hi} min`
}

export function closingTimeLabel(restaurantId: number): string {
  const hour = 22 + (restaurantId % 2)
  return `Hapur deri ${hour}:00`
}

export function ordersBadge(reviewCount: number): string | null {
  if (reviewCount >= 40) return `${Math.max(100, reviewCount * 12)}+ porosi këtë muaj`
  if (reviewCount >= 15) return `${reviewCount * 8}+ porosi`
  return null
}

export function isRestaurantOpenNow(estimatedMinutes: number): boolean {
  return estimatedMinutes <= 40
}

export type MenuItemWithMeta = RestaurantMenuItem & { displayDescription: string | null }

export type EnrichedMenuCategory = Omit<RestaurantMenuCategory, 'items'> & {
  items: MenuItemWithMeta[]
}

function normalizeMenuItem(
  item: RestaurantMenuItem & {
    IsAvailable?: boolean
    IsFeatured?: boolean
    Name?: string
    Price?: number | string
    Description?: string | null
    ImageUrl?: string | null
  },
): RestaurantMenuItem {
  const raw = item
  const price = Number(raw.price ?? raw.Price ?? 0)
  return {
    id: raw.id,
    name: String(raw.name ?? raw.Name ?? 'Artikull'),
    description: raw.description ?? raw.Description ?? null,
    price: Number.isFinite(price) ? price : 0,
    isAvailable: raw.isAvailable ?? raw.IsAvailable ?? true,
    isFeatured: raw.isFeatured ?? raw.IsFeatured ?? false,
    imageUrl: raw.imageUrl ?? raw.ImageUrl ?? null,
  }
}

export function enrichMenuCategories(
  categories: RestaurantMenuCategory[],
): EnrichedMenuCategory[] {
  return categories.map((cat) => ({
    ...cat,
    items: cat.items.map((item) => {
      const normalized = normalizeMenuItem(item)
      return {
        ...normalized,
        displayDescription: menuItemDescription(normalized.description, normalized.name),
      }
    }),
  }))
}
