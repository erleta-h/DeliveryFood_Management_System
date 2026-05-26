import { apiPath } from './apiBase'

export type RestaurantReview = {
  id: number
  rating: number
  comment: string | null
  createdAtUtc: string
  authorDisplayName: string
}

export type RestaurantReviewsResult = {
  averageRating: number
  totalCount: number
  items: RestaurantReview[]
}

export async function fetchRestaurantReviews(
  restaurantId: number,
  take = 50,
): Promise<RestaurantReviewsResult | null> {
  const res = await fetch(apiPath(`/api/restaurants/${restaurantId}/reviews?take=${take}`))
  if (res.status === 404) return null
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json() as Promise<RestaurantReviewsResult>
}
