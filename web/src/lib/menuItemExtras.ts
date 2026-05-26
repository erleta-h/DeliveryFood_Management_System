/** Sosat që restoranti mund t’i ofrojë (UI — derisa API të ketë listë nga kuzhina). */
export type MenuExtraOption = { id: string; label: string; price: number }

export const RESTAURANT_SAUCES: MenuExtraOption[] = [
  { id: 'ketchup', label: 'Ketchup', price: 0 },
  { id: 'mayo', label: 'Majonezë', price: 0 },
  { id: 'cocktail', label: 'Sos koktaj', price: 0.3 },
  { id: 'bbq', label: 'Sos barbecue', price: 0.3 },
  { id: 'garlic', label: 'Sos çelexhai', price: 0.3 },
  { id: 'hot', label: 'Sos i nxehtë', price: 0.3 },
  { id: 'ranch', label: 'Sos ranch', price: 0.4 },
  { id: 'mustard', label: 'Mustardë', price: 0.2 },
]

/** Për pije / ëmbëlsira nuk shfaqen madhësi as sos. */
export function showSizeOptions(itemName: string): boolean {
  const n = itemName.toLowerCase()
  return !/pije|cola|fanta|ujë|sprite|pepsi|akullore|ëmbëlsir|dessert/i.test(n)
}

export function saucesForMenuItem(itemName: string, categoryName: string): MenuExtraOption[] {
  const n = itemName.toLowerCase()
  const cat = categoryName.toLowerCase()
  if (!showSizeOptions(itemName)) return []
  if (/pizza/i.test(n) || /pizza/i.test(cat)) {
    return RESTAURANT_SAUCES.filter((s) =>
      ['ketchup', 'hot', 'garlic', 'bbq'].includes(s.id),
    )
  }
  if (/sallat/i.test(n) || /sallat/i.test(cat)) {
    return RESTAURANT_SAUCES.filter((s) =>
      ['cocktail', 'ranch', 'mustard', 'garlic'].includes(s.id),
    )
  }
  return RESTAURANT_SAUCES
}
