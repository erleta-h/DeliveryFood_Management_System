import { apiPath } from './apiBase'

export type PublicLandingContent = {
  heroTitle: string
  heroHighlight: string
  heroSubtitle: string
  partnerEyebrow: string
  partnerTitle: string
  partnerBody: string
}

export async function fetchPublicSiteContent(): Promise<PublicLandingContent> {
  const res = await fetch(apiPath('/api/public/site-content'))
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json() as Promise<PublicLandingContent>
}
