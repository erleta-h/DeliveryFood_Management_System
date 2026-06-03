/** Seksione plani produkti — UI + përmbajtje; API përveç dashboard & partner-applications vjen më vonë. */

import type { AdminNavIconName } from '../components/admin/adminIcons'
import { getPermissionsFromToken, hasAdminRole } from './jwtRoles'

export type AdminSectionDef = {
  id: string
  navLabel: string
  title: string
  icon: string
  intro: string
  features: string[]
}

export const ADMIN_SECTIONS: Record<string, AdminSectionDef> = {
  restaurants: {
    id: 'restaurants',
    navLabel: 'Restorantet',
    title: 'Menaxhimi i restoranteve',
    icon: '🏪',
    intro:
      'Operacionet e platformës për partnerët: nga aplikimi deri te komisioni, aktivizimi dhe performanca.',
    features: [
      'Pranon / refuzon aplikimet e restoranteve',
      'Cakton takime dhe ndjek statusin e onboardimit',
      'Ngarkon kontratën dhe e ruan në sistem',
      'Gjeneron kredencialet (email, password, role)',
      'Aktivizon / çaktivizon restorantin',
      'Ndryshon komisionin për secilin restorant',
      'Shikon performancën e restorantit (porosi, ankesa, vlerësime)',
      'Mund ta bllokojë restorantin në rast shkeljesh',
      'Kategoritë globale të ushqimit menaxhohen te moduli «Kategoritë e ushqimit»',
    ],
  },
  foodCategories: {
    id: 'foodCategories',
    navLabel: 'Kategoritë e ushqimit',
    title: 'Kategoritë globale të ushqimit',
    icon: '🍽️',
    intro:
      'Lista e kategorive që klientët filtrojnë në katalog dhe që çdo restorant zgjedh në onboarding — me invalidim të cache-it pas ndryshimesh.',
    features: [
      'Krijon, përditëson dhe fshin kategori (emër unik, renditje, përshkrim)',
      'Sheh sa restorante përdorin secilën kategori — bllokon fshirjen nëse ka lidhje',
      'Pas ruajtjes pastrohet cache-i i listës publike të kategorive',
    ],
  },
  orders: {
    id: 'orders',
    navLabel: 'Porositë',
    title: 'Menaxhimi i porosive',
    icon: '📦',
    intro: 'Pamje operacionale mbi të gjitha porositë — live, histori dhe ndërhyrje kur duhet.',
    features: [
      'Sheh të gjitha porositë në sistem (live & histori)',
      'Ndryshon statusin e porosisë në raste problemi',
      'Anulon porosi',
      'Rimburson pagesa (refund)',
      'Ndërhyn kur ka konflikt mes klientit dhe restorantit',
      'Sheh kohën mesatare të përgatitjes dhe dërgesës',
    ],
  },
  riders: {
    id: 'riders',
    navLabel: 'Delivera',
    title: 'Menaxhimi i deliverave',
    icon: '🛵',
    intro: 'Flota e dërgesave: aprovim, zona, tarifa dhe performancë.',
    features: [
      'Regjistron / aprovon deliverat',
      'Aktivizon / çaktivizon deliverat',
      'Sheh lokacionin live të deliverave',
      'Sheh performancën (koha e dërgesës, rating)',
      'Menaxhon zonat ku mund të punojnë',
      'Vendos tarifat e dërgesës sipas zonave',
    ],
  },
  users: {
    id: 'users',
    navLabel: 'Klientët',
    title: 'Menaxhimi i përdoruesve (klientëve)',
    icon: '👥',
    intro: 'Klientët, historiku dhe kompensimet.',
    features: [
      'Sheh listën e klientëve',
      'Bllokon klientë problematik',
      'Sheh historikun e porosive të klientit',
      'Menaxhon ankesat (complaints / tickets)',
      'Mund të japë kupon manual si kompensim',
    ],
  },
  finance: {
    id: 'finance',
    navLabel: 'Financa',
    title: 'Pagesat & financat',
    icon: '💰',
    intro: 'Transparencë mbi të ardhurat, komisionin dhe rimbursimet.',
    features: [
      'Sheh të gjitha pagesat që hyjnë në sistem',
      'Llogarit komisionin e platformës',
      'Sheh sa i takon secilit restorant',
      'Gjeneron raporte mujore për pagesat e restoranteve',
      'Eksporton raporte (PDF/Excel)',
      'Menaxhon refundet',
      'Vendos tarifën e komisionit global',
    ],
  },
  promotions: {
    id: 'promotions',
    navLabel: 'Promocione',
    title: 'Kuponat, zbritjet, promocionet',
    icon: '🎟️',
    intro: 'Marketing i centralizuar dhe oferta për restorante specifike.',
    features: [
      'Krijon kupona global',
      'Krijon kupona për restorante specifike',
      'Vendos kushte (minimum order, data skadimit)',
      'Aktivizon / çaktivizon promocione',
    ],
  },
  reviews: {
    id: 'reviews',
    navLabel: 'Vlerësime',
    title: 'Ratings & reviews',
    icon: '⭐',
    intro: 'Moderimi i përshtypjeve dhe raportimeve.',
    features: [
      'Sheh review-t e klientëve',
      'Fshin review abuzive',
      'Ndërhyn kur ka raportime',
    ],
  },
  zones: {
    id: 'zones',
    navLabel: 'Zonat & tarifat',
    title: 'Zonat & tarifat e dërgesës',
    icon: '🗺️',
    intro: 'Gjeografia e shërbimit dhe çmimet sipas zonës.',
    features: [
      'Definon zonat e dërgesës (map zones)',
      'Vendos çmimin e dërgesës për zonë',
      'Vendos kohën e pritshme të dërgesës për zonë',
    ],
  },
  reports: {
    id: 'reports',
    navLabel: 'Raporte',
    title: 'Raporte & statistikë',
    icon: '📊',
    intro: 'Analiza të thella dhe eksporte — plotëson dashboard-in operacional.',
    features: [
      'Raporte të eksportueshme (PDF/Excel)',
      'Trende mujore / javore',
      'Krahasim restorantesh & zonash',
    ],
  },
  security: {
    id: 'security',
    navLabel: 'Siguria',
    title: 'Siguria & kontrolli i sistemit',
    icon: '🔐',
    intro: 'Aksesi, auditimi dhe përmbajtja ligjore.',
    features: [
      'Menaxhon rolet (admin, support, finance, etj.)',
      'Reset password për restorante / delivera',
      'Log i aktiviteteve (kush çka ka bërë në sistem)',
      'Backup i të dhënave',
      'Menaxhon përmbajtjen statike të faqes (terms, privacy, etj.)',
    ],
  },
  support: {
    id: 'support',
    navLabel: 'Support',
    title: 'Support & konflikte',
    icon: '🆘',
    intro: 'Ndërmjetësimi dhe komunikimi me palët.',
    features: [
      'Panel për tickets / ankesa',
      'Chat ose komunikim me restorant / klient',
      'Ndërhyn në raste mashtrimesh, vonesash, gabimesh',
    ],
  },
  settings: {
    id: 'settings',
    navLabel: 'Konfigurime',
    title: 'Konfigurime të sistemit',
    icon: '⚙️',
    intro: 'Parametra globalë të platformës.',
    features: [
      'Tarifa e komisionit',
      'Tarifa e delivery',
      'Orari global i punës',
      'Notifikimet (email / SMS / push)',
      'Integrimet me pagesa (Stripe, PayPal, etj.)',
    ],
  },
}

export const ADMIN_SECTION_IDS = Object.keys(ADMIN_SECTIONS) as (keyof typeof ADMIN_SECTIONS)[]

export type AdminNavGroup = {
  title: string
  items: { to: string; label: string; icon: AdminNavIconName }[]
}

/** Leja RBAC e nevojshme për çdo rrugë paneli (për përdorues me rol Support — Admin sheh gjithçka). */
export const ADMIN_ROUTE_PERMISSION: Record<string, string> = {
  '/admin': 'admin.dashboard',
  '/admin/partner-applications': 'admin.partner_applications',
  '/admin/driver-applications': 'admin.driver_applications',
  '/admin/restaurants': 'admin.restaurants',
  '/admin/food-categories': 'admin.food_categories',
  '/admin/orders': 'admin.orders',
  '/admin/riders': 'admin.drivers',
  '/admin/zones': 'admin.zones',
  '/admin/users': 'admin.customers',
  '/admin/support': 'admin.support',
  '/admin/finance': 'admin.finance',
  '/admin/promotions': 'admin.coupons',
  '/admin/reviews': 'admin.reviews',
  '/admin/reports': 'admin.reports',
  '/admin/data-port': 'admin.data_port',
  '/admin/cms': 'admin.cms',
  '/admin/security': 'admin.audit',
  '/admin/settings': 'admin.settings',
}

export function getVisibleAdminNavGroups(token: string | null): AdminNavGroup[] {
  if (!token || hasAdminRole(token)) return ADMIN_NAV_GROUPS
  const perms = getPermissionsFromToken(token)
  return ADMIN_NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => {
      const req = ADMIN_ROUTE_PERMISSION[item.to]
      return req ? perms.includes(req) : false
    }),
  })).filter((g) => g.items.length > 0)
}

export const ADMIN_NAV_GROUPS: AdminNavGroup[] = [
  {
    title: 'Përmbledhje',
    items: [{ to: '/admin', label: 'Dashboard', icon: 'dashboard' }],
  },
  {
    title: 'Operacionet',
    items: [
      { to: '/admin/partner-applications', label: 'Aplikimet partner', icon: 'partner' },
      { to: '/admin/driver-applications', label: 'Aplikimet Deliver', icon: 'driver' },
      { to: '/admin/restaurants', label: 'Restorantet', icon: 'restaurant' },
      { to: '/admin/food-categories', label: 'Kategoritë e ushqimit', icon: 'food' },
      { to: '/admin/orders', label: 'Porositë', icon: 'orders' },
      { to: '/admin/riders', label: 'Delivera', icon: 'riders' },
      { to: '/admin/zones', label: 'Zonat & tarifat', icon: 'zones' },
    ],
  },
  {
    title: 'Klientë & mbështetja',
    items: [
      { to: '/admin/users', label: 'Klientët', icon: 'users' },
      { to: '/admin/support', label: 'Support', icon: 'support' },
    ],
  },
  {
    title: 'Financa & marketing',
    items: [
      { to: '/admin/finance', label: 'Financa', icon: 'finance' },
      { to: '/admin/promotions', label: 'Promocione', icon: 'promotions' },
    ],
  },
  {
    title: 'Cilësia',
    items: [{ to: '/admin/reviews', label: 'Vlerësime', icon: 'reviews' }],
  },
  {
    title: 'Analiza & sistemi',
    items: [
      { to: '/admin/reports', label: 'Raporte', icon: 'reports' },
      { to: '/admin/data-port', label: 'Eksport / import', icon: 'import' },
      { to: '/admin/cms', label: 'CMS (faqja kryesore)', icon: 'cms' },
      { to: '/admin/security', label: 'Siguria', icon: 'security' },
      { to: '/admin/settings', label: 'Konfigurime', icon: 'settings' },
    ],
  },
]
