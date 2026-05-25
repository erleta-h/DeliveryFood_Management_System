import { imageUrlForFoodCategory } from './categoryBrowseImages'
import { apiPath } from './apiBase'
import type { RestaurantListItem } from './restaurantsApi'

/** Kapak për kartë: foto e parë e menusë, përndryshe foto kategorie. */
export function coverImageForRestaurant(r: RestaurantListItem): string {
  const first = r.previewItems.find((p) => p.imageUrl)
  if (first?.imageUrl) return apiPath(first.imageUrl)
  return imageUrlForFoodCategory(r.categoryName)
}

export function isFreeDelivery(fee: number): boolean {
  return fee <= 0.01
}
