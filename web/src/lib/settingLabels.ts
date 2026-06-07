export type SettingSectionId =
  | 'platform'
  | 'finance'
  | 'delivery'
  | 'orders'
  | 'partners'
  | 'drivers'
  | 'customers'
  | 'coupons'
  | 'support'
  | 'social'
  | 'cms'
  | 'other'

export type SettingSectionFilter = 'all' | SettingSectionId

export type SettingCatalogEntry = {
  key: string
  label: string
  section: SettingSectionId
  description: string
}

/** CMS keys shown on Konfigurime — full CMS lives on the dedicated CMS admin page. */
export const SETTINGS_PAGE_CMS_KEYS = new Set([
  'cms.landing.hero_title',
  'cms.landing.hero_subtitle',
  'cms.landing.hero_highlight',
  'cms.landing.categories_title',
  'cms.landing.footer_copyright',
])

export const SETTING_CATALOG: SettingCatalogEntry[] = [
  // Platform identity
  {
    key: 'platform.company_name',
    label: 'Company Name',
    section: 'platform',
    description: 'Legal or brand name shown across the platform and customer communications.',
  },
  {
    key: 'platform.company_address',
    label: 'Company Address',
    section: 'platform',
    description: 'Registered business address displayed on invoices, footer, and legal pages.',
  },
  {
    key: 'platform.support_email',
    label: 'Support Email',
    section: 'platform',
    description: 'Email shown to customers for help, contact forms, and order support.',
  },
  {
    key: 'platform.support_phone',
    label: 'Support Phone',
    section: 'platform',
    description: 'Phone number customers can call for assistance.',
  },
  // Finance
  {
    key: 'platform.commission_percent',
    label: 'Commission Percent',
    section: 'finance',
    description: 'Percentage the platform earns from restaurant orders.',
  },
  {
    key: 'platform.platform_fee_percent',
    label: 'Platform Fee Percent',
    section: 'finance',
    description: 'Additional service fee charged to customers on each order.',
  },
  {
    key: 'platform.default_currency',
    label: 'Default Currency',
    section: 'finance',
    description: 'Primary currency code used for prices and payouts (e.g. EUR).',
  },
  {
    key: 'platform.tax_percent',
    label: 'Tax Percent',
    section: 'finance',
    description: 'Default tax rate applied where applicable.',
  },
  // Delivery
  {
    key: 'platform.base_delivery_fee',
    label: 'Base Delivery Fee',
    section: 'delivery',
    description: 'Default delivery fee when no restaurant or zone override exists.',
  },
  {
    key: 'platform.free_delivery_threshold',
    label: 'Free Delivery Threshold',
    section: 'delivery',
    description: 'Minimum cart subtotal required for free delivery.',
  },
  {
    key: 'platform.min_order_amount',
    label: 'Minimum Order Amount',
    section: 'delivery',
    description: 'Smallest order subtotal a customer must reach before checkout.',
  },
  {
    key: 'platform.default_delivery_minutes',
    label: 'Default Delivery Time',
    section: 'delivery',
    description: 'Estimated delivery time shown when no restaurant-specific ETA exists.',
  },
  {
    key: 'platform.max_delivery_radius_km',
    label: 'Max Delivery Radius (km)',
    section: 'delivery',
    description: 'Maximum distance from a restaurant where delivery is offered.',
  },
  // Orders
  {
    key: 'platform.auto_cancel_unpaid_minutes',
    label: 'Auto-Cancel Unpaid Orders',
    section: 'orders',
    description: 'Minutes before an unpaid order is automatically cancelled.',
  },
  {
    key: 'platform.order_support_window_minutes',
    label: 'Order Support Window',
    section: 'orders',
    description: 'How long after delivery customers can open a support request for an order.',
  },
  // Drivers
  {
    key: 'platform.driver_auto_offline_minutes',
    label: 'Driver Auto-Offline Minutes',
    section: 'drivers',
    description: 'Shoferi shënohet offline nëse nuk ka aktivitet brenda kësaj kohe.',
  },
  {
    key: 'platform.driver_location_stale_minutes',
    label: 'Driver Location Stale Minutes',
    section: 'drivers',
    description: 'Sa kohë para se pozicioni GPS të konsiderohet i vjetëruar.',
  },
  {
    key: 'platform.driver_max_active_orders',
    label: 'Driver Max Active Orders',
    section: 'drivers',
    description: 'Numri maksimal i dorëzimeve aktive që një shofer mund të mbajë njëkohësisht.',
  },
  {
    key: 'platform.driver_location_update_interval_seconds',
    label: 'Driver Location Update Interval',
    section: 'drivers',
    description: 'Sa shpesh pritet përditësimi i pozicionit GPS nga aplikacioni i shoferit (sekonda).',
  },
  // Partner onboarding
  {
    key: 'platform.require_signed_contract_before_approval',
    label: 'Require Signed Contract Before Approval',
    section: 'partners',
    description: 'Restorantet nuk mund të miratohen pa kontratë të nënshkruar.',
  },
  {
    key: 'platform.auto_approve_restaurant_applications',
    label: 'Auto Approve Restaurant Applications',
    section: 'partners',
    description: 'Nëse është false, çdo aplikim restoranti kërkon shqyrtim manual nga admini.',
  },
  // Customer rules
  {
    key: 'platform.max_addresses_per_customer',
    label: 'Max Addresses Per Customer',
    section: 'customers',
    description: 'Numri maksimal i adresave që një klient mund të ruajë në llogarinë e tij.',
  },
  {
    key: 'platform.review_allowed_within_days',
    label: 'Review Allowed Within Days',
    section: 'customers',
    description: 'Ditët pas porosisë së përfunduar kur klienti lejohet të lërë vlerësim.',
  },
  // Coupon rules
  {
    key: 'platform.max_coupon_discount_amount',
    label: 'Max Coupon Discount Amount',
    section: 'coupons',
    description: 'Zbritja maksimale në euro që mund të aplikohet me një kupon.',
  },
  {
    key: 'platform.default_coupon_validity_days',
    label: 'Default Coupon Validity Days',
    section: 'coupons',
    description: 'Kohëzgjatja e paracaktuar e vlefshmërisë së kuponave të rinj (ditë).',
  },
  {
    key: 'platform.first_order_coupon_enabled',
    label: 'First Order Coupon Enabled',
    section: 'coupons',
    description: 'Aktivizon promovimin automatik me kupon për porosinë e parë të klientit.',
  },
  // Support operations
  {
    key: 'platform.support_working_hours',
    label: 'Support Working Hours',
    section: 'support',
    description: 'Orari kur support-i live është i disponueshëm për klientët.',
  },
  {
    key: 'platform.support_response_target_minutes',
    label: 'Support Response Target',
    section: 'support',
    description: 'Kohë synimi për përgjigjen e ekipit të support-it.',
  },
  {
    key: 'platform.auto_close_ticket_after_days',
    label: 'Auto Close Ticket After Days',
    section: 'support',
    description: 'Tiketat e support-it mbyllen automatikisht pas ditëve pa aktivitet.',
  },
  {
    key: 'platform.target_first_response_minutes',
    label: 'Target First Response Minutes',
    section: 'support',
    description: 'SLA-ja e synuar për përgjigjen e parë të agjentit ndaj një tikete.',
  },
  // Social
  {
    key: 'platform.facebook_url',
    label: 'Facebook Page',
    section: 'social',
    description: 'Link to the official Facebook page.',
  },
  {
    key: 'platform.instagram_url',
    label: 'Instagram Profile',
    section: 'social',
    description: 'Link to the official Instagram profile.',
  },
  // CMS essentials (landing shortcuts)
  {
    key: 'cms.landing.hero_title',
    label: 'Hero Headline',
    section: 'cms',
    description: 'Main headline on the public homepage.',
  },
  {
    key: 'cms.landing.hero_subtitle',
    label: 'Hero Subtitle',
    section: 'cms',
    description: 'Supporting text below the homepage headline.',
  },
  {
    key: 'cms.landing.hero_highlight',
    label: 'Hero Highlight Text',
    section: 'cms',
    description: 'Accent phrase highlighted in the hero section.',
  },
  {
    key: 'cms.landing.categories_title',
    label: 'Categories Section Title',
    section: 'cms',
    description: 'Title above the food categories block on the homepage.',
  },
  {
    key: 'cms.landing.footer_copyright',
    label: 'Footer Copyright',
    section: 'cms',
    description: 'Copyright line shown in the site footer.',
  },
]

const CATALOG_BY_KEY = Object.fromEntries(SETTING_CATALOG.map((e) => [e.key, e])) as Record<
  string,
  SettingCatalogEntry
>

/** Legacy key aliases for display grouping. */
const KEY_ALIASES: Record<string, string> = {
  'platform.address': 'platform.company_address',
  'platform.delivery_fee': 'platform.base_delivery_fee',
  'platform.currency': 'platform.default_currency',
}

export const SETTING_SECTIONS: { id: SettingSectionFilter; label: string }[] = [
  { id: 'all', label: 'Të gjitha' },
  { id: 'platform', label: 'Platformë' },
  { id: 'finance', label: 'Financa' },
  { id: 'delivery', label: 'Dorëzim' },
  { id: 'orders', label: 'Porosi' },
  { id: 'partners', label: 'Partner Onboarding' },
  { id: 'drivers', label: 'Shoferë' },
  { id: 'customers', label: 'Klientë' },
  { id: 'coupons', label: 'Kuponë' },
  { id: 'support', label: 'Support' },
  { id: 'social', label: 'Sociale' },
  { id: 'cms', label: 'CMS' },
  { id: 'other', label: 'Të tjera' },
]

const SECTION_META: Record<SettingSectionId, { label: string; badge: string }> = {
  platform: { label: 'Platform', badge: 'bg-violet-100 text-violet-800' },
  finance: { label: 'Finance', badge: 'bg-amber-100 text-amber-800' },
  delivery: { label: 'Delivery', badge: 'bg-emerald-100 text-emerald-800' },
  orders: { label: 'Orders', badge: 'bg-orange-100 text-orange-800' },
  partners: { label: 'Partner Onboarding', badge: 'bg-rose-100 text-rose-800' },
  drivers: { label: 'Drivers', badge: 'bg-cyan-100 text-cyan-800' },
  customers: { label: 'Customers', badge: 'bg-teal-100 text-teal-800' },
  coupons: { label: 'Coupons', badge: 'bg-lime-100 text-lime-800' },
  support: { label: 'Support', badge: 'bg-sky-100 text-sky-800' },
  social: { label: 'Social', badge: 'bg-indigo-100 text-indigo-800' },
  cms: { label: 'CMS', badge: 'bg-fuchsia-100 text-fuchsia-800' },
  other: { label: 'Other', badge: 'bg-gray-100 text-gray-600' },
}

const BUSINESS_RULE_SECTIONS: SettingSectionId[] = [
  'finance',
  'delivery',
  'orders',
  'partners',
  'drivers',
  'customers',
  'coupons',
  'support',
]

function humanizeSegment(segment: string): string {
  return segment
    .split('_')
    .filter(Boolean)
    .map((w) => {
      const lower = w.toLowerCase()
      if (lower === 'cta') return 'CTA'
      if (lower === 'url') return 'URL'
      if (lower === 'km') return 'km'
      if (lower === 'id') return 'ID'
      return w.charAt(0).toUpperCase() + w.slice(1)
    })
    .join(' ')
}

function resolveCatalogKey(key: string): string {
  return KEY_ALIASES[key] ?? key
}

export function isVisibleOnSettingsPage(key: string): boolean {
  if (key.startsWith('cms.') && !SETTINGS_PAGE_CMS_KEYS.has(key)) return false
  return true
}

export function getSettingLabel(key: string): string {
  const catalogKey = resolveCatalogKey(key)
  if (CATALOG_BY_KEY[catalogKey]) return CATALOG_BY_KEY[catalogKey].label
  const parts = key.split('.')
  const tail = parts.slice(-2).join(' ')
  return humanizeSegment(tail.replace(/\./g, ' '))
}

export function getSettingSection(key: string): SettingSectionId {
  const catalogKey = resolveCatalogKey(key)
  if (CATALOG_BY_KEY[catalogKey]) return CATALOG_BY_KEY[catalogKey].section
  const k = key.toLowerCase()
  if (k.startsWith('cms.')) return 'cms'
  if (k.includes('facebook') || k.includes('instagram') || k.includes('social')) return 'social'
  if (k.includes('coupon')) return 'coupons'
  if (k.includes('partner') || k.includes('restaurant_application') || k.includes('contract')) return 'partners'
  if (k.includes('address') || k.includes('review')) return 'customers'
  if (k.includes('driver')) return 'drivers'
  if (k.includes('ticket') || k.includes('support') || k.includes('response')) return 'support'
  if (k.includes('order') && !k.includes('min_order') && !k.includes('first_order')) return 'orders'
  if (k.includes('commission') || k.includes('fee_percent') || k.includes('tax') || k.includes('currency'))
    return 'finance'
  if (k.includes('delivery') || k.includes('min_order') || k.includes('radius')) return 'delivery'
  if (k.startsWith('platform.')) return 'platform'
  return 'other'
}

export function getSettingSectionMeta(section: SettingSectionId) {
  return SECTION_META[section]
}

export function getSettingDescription(key: string, stored?: string | null): string {
  const trimmed = stored?.trim()
  if (trimmed) return trimmed
  const catalogKey = resolveCatalogKey(key)
  return CATALOG_BY_KEY[catalogKey]?.description ?? ''
}

export function countSettingsKpis(keys: string[]) {
  const visible = keys.filter(isVisibleOnSettingsPage)
  let platform = 0
  let businessRules = 0
  let cms = 0
  for (const key of visible) {
    const section = getSettingSection(key)
    if (section === 'platform') platform++
    if (BUSINESS_RULE_SECTIONS.includes(section)) businessRules++
    if (section === 'cms') cms++
  }
  return { total: visible.length, platform, businessRules, cms }
}
