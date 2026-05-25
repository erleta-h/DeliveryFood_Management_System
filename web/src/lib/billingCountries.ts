/** Kodi ISO për Stripe `billing_details.address.country`. */
export type BillingCountryCode = 'XK' | 'AL' | 'MK' | 'ME' | 'RS'

export const BILLING_COUNTRIES: { code: BillingCountryCode; label: string }[] = [
  { code: 'XK', label: 'Kosovë' },
  { code: 'AL', label: 'Shqipëri' },
  { code: 'MK', label: 'Maqedoni e Veriut' },
  { code: 'ME', label: 'Mali i Zi' },
  { code: 'RS', label: 'Serbi' },
]

export const DEFAULT_BILLING_COUNTRY: BillingCountryCode = 'XK'
