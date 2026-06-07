import { apiPath } from './apiBase'
import type { RestaurantListItem } from './restaurantsApi'

export type PublicLandingStats = {
  openRestaurantsCount: number
  activeDriversCount: number
  ordersInProcessCount: number
  averageDeliveryMinutes: number
  partnerRestaurantsCount: number
  completedOrdersCount: number
  satisfiedCustomersCount: number
}

export type PublicLandingData = {
  stats: PublicLandingStats
  featuredRestaurants: RestaurantListItem[]
}

export async function fetchPublicLandingData(): Promise<PublicLandingData> {
  const res = await fetch(apiPath('/api/public/landing-data'))
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json() as Promise<PublicLandingData>
}

export function formatStatPlus(value: number): string {
  if (value <= 0) return '—'
  if (value >= 1000) return `${Math.floor(value / 1000)}k+`
  return `${value}+`
}

export function formatDeliveryRange(minutes: number): string {
  if (minutes <= 0) return '—'
  const low = Math.max(5, minutes - 5)
  const high = minutes + 10
  return `${low}–${high} min`
}
