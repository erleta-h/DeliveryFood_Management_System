import { useEffect, useState } from 'react'
import { FeaturedRestaurants } from './landing/FeaturedRestaurants'
import { HeroSection } from './landing/HeroSection'
import { HowItWorks } from './landing/HowItWorks'
import { LandingFooter } from './landing/LandingFooter'
import { LandingNavbar } from './landing/LandingNavbar'
import { PartnerCta } from './landing/PartnerCta'
import { StatsBar } from './landing/StatsBar'
import { draftToLandingContent, withMockupHeroDefaults } from '../lib/landingContent'
import { landingShellBg } from '../lib/landingTheme'
import { fetchPublicLandingData, type PublicLandingData } from '../lib/publicLandingApi'
import { fetchPublicSiteContent, type PublicLandingContent } from '../lib/publicSiteApi'
import type { RestaurantListItem } from '../lib/restaurantsApi'

export function LandingPage() {
  const [content, setContent] = useState<PublicLandingContent | null>(null)
  const [landingData, setLandingData] = useState<PublicLandingData | null>(null)
  const [dataLoading, setDataLoading] = useState(true)

  useEffect(() => {
    let c = false
    setDataLoading(true)
    void Promise.all([
      fetchPublicSiteContent().catch(() => draftToLandingContent({})),
      fetchPublicLandingData().catch(() => null),
    ])
      .then(([cms, data]) => {
        if (c) return
        setContent(cms)
        setLandingData(data)
      })
      .finally(() => {
        if (!c) setDataLoading(false)
      })
    return () => {
      c = true
    }
  }, [])

  const cms = withMockupHeroDefaults(content ?? draftToLandingContent({}))
  const stats = landingData?.stats ?? null
  const restaurants: RestaurantListItem[] = landingData?.featuredRestaurants ?? []

  return (
    <div className={landingShellBg}>
      <LandingNavbar />
      <main>
        <HeroSection content={cms} stats={stats} />
        <div className="space-y-20 pb-20 pt-8">
          <FeaturedRestaurants content={cms} restaurants={restaurants} loading={dataLoading} />
          <HowItWorks content={cms} />
          <PartnerCta />
          <StatsBar stats={stats} />
        </div>
      </main>
      <LandingFooter content={cms} />
    </div>
  )
}
