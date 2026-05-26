import { apiPath } from './apiBase'

function authHeader(token: string) {
  return { Authorization: `Bearer ${token}` }
}

export async function fetchFavoriteRestaurantIds(token: string): Promise<number[]> {
  const res = await fetch(apiPath('/api/customer/favorite-restaurants'), {
    headers: { ...authHeader(token) },
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const data = (await res.json()) as { restaurantIds: number[] }
  return data.restaurantIds ?? []
}

export async function toggleFavoriteRestaurant(
  token: string,
  restaurantId: number,
): Promise<boolean> {
  const res = await fetch(
    apiPath(`/api/customer/favorite-restaurants/${restaurantId}/toggle`),
    {
      method: 'POST',
      headers: { ...authHeader(token) },
    },
  )
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(text || `HTTP ${res.status}`)
  }
  const data = (await res.json()) as { isFavorite: boolean }
  return data.isFavorite
}
