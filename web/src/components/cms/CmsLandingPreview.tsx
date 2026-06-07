import { draftToLandingContent } from '../../lib/landingContent'
import { HowItWorks } from '../landing/HowItWorks'
import { PartnerCta } from '../landing/PartnerCta'

type Props = {
  draft: Record<string, string>
}

/** Preview i thjeshtuar për CMS admin — pa të dhëna live nga API. */
export function CmsLandingPreview({ draft }: Props) {
  const content = draftToLandingContent(draft)

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="mb-3 flex shrink-0 items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Live Preview</p>
          <p className="text-sm text-gray-400">Tekstet nga draft — statistikat/restorantet live në faqen publike</p>
        </div>
        <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-700 ring-1 ring-emerald-200">
          Live
        </span>
      </div>

      <div className="min-h-0 flex-1 overflow-hidden rounded-xl border border-gray-200 bg-[#0a0c12] shadow-inner">
        <div className="h-full overflow-y-auto overscroll-contain p-4">
          <div className="origin-top scale-[0.68] xl:scale-[0.78]">
            <div className="rounded-xl border border-white/[0.08] bg-[#0d1018] p-6">
              <h1 className="text-2xl font-extrabold text-white">
                {content.heroTitle}{' '}
                <span className="bg-gradient-to-r from-amber-200 to-amber-400 bg-clip-text text-transparent">
                  {content.heroHighlight}
                </span>
              </h1>
              <p className="mt-2 text-sm text-zinc-400">{content.heroSubtitle}</p>
              <p className="mt-4 inline-block rounded-lg bg-amber-500/20 px-3 py-1.5 text-xs font-bold text-amber-300">
                {content.heroCta}
              </p>
            </div>
            <div className="mt-4">
              <HowItWorks content={content} />
            </div>
            <div className="mt-4 scale-90">
              <PartnerCta />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
