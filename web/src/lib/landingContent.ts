import type { PublicLandingContent } from './publicSiteApi'

export const CMS_DEFAULTS: Record<string, string> = {
  'cms.landing.hero_title': 'Porosit ushqimin e preferuar',
  'cms.landing.hero_highlight': 'në derën tënde',
  'cms.landing.hero_subtitle':
    'Zbulo restorante të mrekullueshme pranë teje, porosit online dhe shijo ushqimin e preferuar pa dalë nga shtëpia.',
  'cms.landing.hero_cta': 'Porosit Tani',
  'cms.landing.hero_background_image': '',
  'cms.landing.how_it_works_title': 'Si funksionon?',
  'cms.landing.how_it_works_step_1_title': 'Zgjedh restorantin',
  'cms.landing.how_it_works_step_1_body': 'Zbulo restorante dhe menu të ndryshme.',
  'cms.landing.how_it_works_step_2_title': 'Bën porosinë',
  'cms.landing.how_it_works_step_2_body': 'Shto produktet që dëshiron në shportë.',
  'cms.landing.how_it_works_step_3_title': 'Merr dorëzimin',
  'cms.landing.how_it_works_step_3_body': 'Shoferi vjen në derën tënde, e shpejtë dhe e sigurt.',
  'cms.landing.restaurants_title': 'Restorantet më të preferuara',
  'cms.landing.restaurants_subtitle': 'Restorantet më të vlerësuara nga klientët tanë.',
  'cms.landing.restaurants_cta_label': 'Shiko të gjitha',
  'cms.landing.categories_title': 'Kategoritë',
  'cms.landing.categories_subtitle': 'Gjej ushqimin që të pëlqen.',
  'cms.landing.testimonials_title': 'Çfarë thonë klientët',
  'cms.landing.testimonial_1_name': 'Arben K.',
  'cms.landing.testimonial_1_quote': 'Dorëzim super i shpejtë dhe ushqim i freskët!',
  'cms.landing.testimonial_2_name': 'Elira M.',
  'cms.landing.testimonial_2_quote': 'Platforma më e lehtë për të porositur online.',
  'cms.landing.testimonial_3_name': 'Driton H.',
  'cms.landing.testimonial_3_quote': 'Restorante të shumta dhe çmime të mira.',
  'cms.landing.footer_tagline': 'Ushqim i shpejtë, në derën tënde.',
  'cms.landing.footer_copyright': '© 2026 FoodDelivery. Të gjitha të drejtat e rezervuara.',
  'cms.landing.footer_link_restaurants': 'Restorantet',
  'cms.landing.footer_link_categories': 'Kategoritë',
  'cms.landing.footer_link_partner': 'Bëhu partner',
  'cms.landing.partner_eyebrow': 'Për restorante & biznese',
  'cms.landing.partner_title': 'Bëhu partner me ne',
  'cms.landing.partner_body':
    'Nëse dëshiron të listosh menunë dhe të marrësh porosi përmes platformës, apliko fillimisht këtu.',
}

function pick(draft: Record<string, string>, key: string): string {
  const v = draft[key]
  if (v !== undefined && v !== '') return v
  return CMS_DEFAULTS[key] ?? ''
}

export function withMockupHeroDefaults(content: PublicLandingContent): PublicLandingContent {
  const defaults = draftToLandingContent({})
  if (/^Ushqim i shpejt/i.test(content.heroTitle.trim())) {
    return {
      ...content,
      heroTitle: defaults.heroTitle,
      heroHighlight: defaults.heroHighlight,
      heroSubtitle: defaults.heroSubtitle,
    }
  }
  return content
}

export function draftToLandingContent(draft: Record<string, string>): PublicLandingContent {
  return {
    heroTitle: pick(draft, 'cms.landing.hero_title'),
    heroHighlight: pick(draft, 'cms.landing.hero_highlight'),
    heroSubtitle: pick(draft, 'cms.landing.hero_subtitle'),
    heroCta: pick(draft, 'cms.landing.hero_cta'),
    heroBackgroundImage: pick(draft, 'cms.landing.hero_background_image'),
    howItWorksTitle: pick(draft, 'cms.landing.how_it_works_title'),
    howItWorksStep1Title: pick(draft, 'cms.landing.how_it_works_step_1_title'),
    howItWorksStep1Body: pick(draft, 'cms.landing.how_it_works_step_1_body'),
    howItWorksStep2Title: pick(draft, 'cms.landing.how_it_works_step_2_title'),
    howItWorksStep2Body: pick(draft, 'cms.landing.how_it_works_step_2_body'),
    howItWorksStep3Title: pick(draft, 'cms.landing.how_it_works_step_3_title'),
    howItWorksStep3Body: pick(draft, 'cms.landing.how_it_works_step_3_body'),
    restaurantsTitle: pick(draft, 'cms.landing.restaurants_title'),
    restaurantsSubtitle: pick(draft, 'cms.landing.restaurants_subtitle'),
    restaurantsCtaLabel: pick(draft, 'cms.landing.restaurants_cta_label'),
    categoriesTitle: pick(draft, 'cms.landing.categories_title'),
    categoriesSubtitle: pick(draft, 'cms.landing.categories_subtitle'),
    testimonialsTitle: pick(draft, 'cms.landing.testimonials_title'),
    testimonial1Name: pick(draft, 'cms.landing.testimonial_1_name'),
    testimonial1Quote: pick(draft, 'cms.landing.testimonial_1_quote'),
    testimonial2Name: pick(draft, 'cms.landing.testimonial_2_name'),
    testimonial2Quote: pick(draft, 'cms.landing.testimonial_2_quote'),
    testimonial3Name: pick(draft, 'cms.landing.testimonial_3_name'),
    testimonial3Quote: pick(draft, 'cms.landing.testimonial_3_quote'),
    footerTagline: pick(draft, 'cms.landing.footer_tagline'),
    footerCopyright: pick(draft, 'cms.landing.footer_copyright'),
    footerLinkRestaurants: pick(draft, 'cms.landing.footer_link_restaurants'),
    footerLinkCategories: pick(draft, 'cms.landing.footer_link_categories'),
    footerLinkPartner: pick(draft, 'cms.landing.footer_link_partner'),
    partnerEyebrow: pick(draft, 'cms.landing.partner_eyebrow'),
    partnerTitle: pick(draft, 'cms.landing.partner_title'),
    partnerBody: pick(draft, 'cms.landing.partner_body'),
  }
}

export function formatRelativeUpdated(iso: string | null | undefined): string | null {
  if (!iso) return null
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return null
  const diffMin = Math.round((Date.now() - then) / 60_000)
  if (diffMin < 1) return 'Përditësuar tani'
  if (diffMin < 60) return `Përditësuar para ${diffMin} minutash`
  const diffH = Math.round(diffMin / 60)
  if (diffH < 24) return `Përditësuar para ${diffH} orësh`
  return `Përditësuar më ${new Date(iso).toLocaleDateString('sq-AL')}`
}

export function latestUpdatedAt(entries: { updatedAt?: string | null }[]): string | null {
  let latest: number | null = null
  for (const e of entries) {
    if (!e.updatedAt) continue
    const t = new Date(e.updatedAt).getTime()
    if (!Number.isNaN(t) && (latest === null || t > latest)) latest = t
  }
  return latest !== null ? new Date(latest).toISOString() : null
}
