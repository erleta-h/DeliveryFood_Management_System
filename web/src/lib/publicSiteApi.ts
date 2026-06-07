import { apiPath } from './apiBase'

export type PublicLandingContent = {
  heroTitle: string
  heroHighlight: string
  heroSubtitle: string
  heroCta: string
  heroBackgroundImage: string
  howItWorksTitle: string
  howItWorksStep1Title: string
  howItWorksStep1Body: string
  howItWorksStep2Title: string
  howItWorksStep2Body: string
  howItWorksStep3Title: string
  howItWorksStep3Body: string
  restaurantsTitle: string
  restaurantsSubtitle: string
  restaurantsCtaLabel: string
  categoriesTitle: string
  categoriesSubtitle: string
  testimonialsTitle: string
  testimonial1Name: string
  testimonial1Quote: string
  testimonial2Name: string
  testimonial2Quote: string
  testimonial3Name: string
  testimonial3Quote: string
  footerTagline: string
  footerCopyright: string
  footerLinkRestaurants: string
  footerLinkCategories: string
  footerLinkPartner: string
  partnerEyebrow: string
  partnerTitle: string
  partnerBody: string
}

export async function fetchPublicSiteContent(): Promise<PublicLandingContent> {
  const res = await fetch(apiPath('/api/public/site-content'))
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json() as Promise<PublicLandingContent>
}
