import { apiPath } from './apiBase'

export type RestaurantMenuItem = {
  id: number
  name: string
  description: string | null
  price: number
  isAvailable: boolean
  isFeatured?: boolean
  imageUrl?: string | null
}

export type RestaurantMenuCategory = {
  id: number
  name: string
  sortOrder: number
  items: RestaurantMenuItem[]
}

export async function fetchRestaurantMenu(
  restaurantId: number,
): Promise<RestaurantMenuCategory[]> {
  const res = await fetch(apiPath(`/api/restaurants/${restaurantId}/menu`))
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json() as Promise<RestaurantMenuCategory[]>
}
