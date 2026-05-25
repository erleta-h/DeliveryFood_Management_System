import { apiPath } from './apiBase'

/** Përgjigjet e API përdorin camelCase (default ASP.NET Core). */

export type RestaurantProductPreview = {
  id: number
  name: string
  price: number
  /** Rrugë relative `/api/files/public/{id}` — përdor me `apiPath`. */
  imageUrl: string | null
}

export type RestaurantListItem = {
  id: number
  name: string
  slug: string | null
  city: string | null
  addressLine: string | null
  categoryName: string
  categoryId: number
  deliveryFee: number
  minOrderAmount: number
  averageRating: number
  reviewCount: number
  estimatedDeliveryMinutes: number
  previewItems: RestaurantProductPreview[]
  /** Kur sort=proximity dhe ke dërguar koordinata klienti. */
  distanceKm?: number | null
}

export type FoodCategoryOption = {
  id: number
  name: string
  sortOrder: number
}

async function parseJson<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(text || `HTTP ${res.status}`)
  }
  return res.json() as Promise<T>
}

export async function fetchRestaurantCategories(): Promise<FoodCategoryOption[]> {
  const res = await fetch(apiPath('/api/restaurants/categories'))
  return parseJson<FoodCategoryOption[]>(res)
}

export type RestaurantSummary = {
  id: number
  name: string
  categoryName: string
  deliveryFee: number
  estimatedDeliveryMinutes: number
  averageRating: number
  reviewCount: number
  addressLine: string | null
  city: string | null
  latitude: number | null
  longitude: number | null
  minOrderAmount: number
}

export async function fetchRestaurantSummary(
  id: number,
  signal?: AbortSignal,
): Promise<RestaurantSummary | null> {
  const res = await fetch(apiPath(`/api/restaurants/${id}`), { signal })
  if (res.status === 404) return null
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(text || `HTTP ${res.status}`)
  }
  return parseJson<RestaurantSummary>(res)
}

export async function searchRestaurants(
  q: string,
  categoryId: number | null,
  /** Perputhet me API : rating, eta, name, fee, proximity */
  sort: 'rating' | 'eta' | 'name' | 'fee' | 'proximity',
  signal?: AbortSignal,
  customerGeo?: { lat: number; lng: number } | null,
): Promise<RestaurantListItem[]> {
  const params = new URLSearchParams()
  const trimmed = q.trim()
  if (trimmed) params.set('q', trimmed)
  if (categoryId != null) params.set('categoryId', String(categoryId))
  params.set('sort', sort)
  if (sort === 'proximity' && customerGeo) {
    params.set('customerLat', String(customerGeo.lat))
    params.set('customerLng', String(customerGeo.lng))
  }
  const query = params.toString()
  const url = apiPath(`/api/restaurants?${query}`)
  const res = await fetch(url, { signal })
  return parseJson<RestaurantListItem[]>(res)
}
