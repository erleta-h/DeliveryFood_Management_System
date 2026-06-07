import type { PublicLandingContent } from '../../lib/publicSiteApi'
import { landingSectionWrap } from '../../lib/landingTheme'

type Props = {
  content: PublicLandingContent
}

const STEP_ICONS = [
  <svg key="1" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
    <path d="M3 9h18v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9Z" />
    <path d="M5 9V7a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v2" />
  </svg>,
  <svg key="2" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
    <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4H6Z" />
    <path d="M3 6h18M16 10a4 4 0 0 1-8 0" />
  </svg>,
  <svg key="3" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
    <circle cx="6" cy="17" r="2" />
    <circle cx="18" cy="17" r="2" />
    <path d="M4 17h16M6 12h10l2-5H8l-2 5Z" strokeLinejoin="round" />
  </svg>,
]

export function HowItWorks({ content }: Props) {
  const steps = [
    { title: content.howItWorksStep1Title, body: content.howItWorksStep1Body },
    { title: content.howItWorksStep2Title, body: content.howItWorksStep2Body },
    { title: content.howItWorksStep3Title, body: content.howItWorksStep3Body },
  ]

  return (
    <section id="si-funksionon" className={`${landingSectionWrap} scroll-mt-20`}>
      <h2 className="text-center text-2xl font-bold text-white lg:text-3xl">{content.howItWorksTitle}</h2>

      <div className="relative mt-12 grid gap-10 md:grid-cols-3 md:gap-6">
        <div
          className="pointer-events-none absolute left-[16%] right-[16%] top-8 hidden border-t border-dashed border-zinc-700 md:block"
          aria-hidden
        />
        {steps.map((step, i) => (
          <div key={step.title} className="relative flex flex-col items-center text-center">
            <div className="relative flex h-14 w-14 items-center justify-center rounded-full border border-[#ffc107]/30 bg-[#ffc107]/10 text-[#ffc107] shadow-[0_0_32px_rgba(255,193,7,0.12)]">
              {STEP_ICONS[i]}
              <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-[#ffc107] text-[10px] font-bold text-zinc-950">
                {i + 1}
              </span>
            </div>
            <h3 className="mt-5 text-base font-bold text-white">{step.title}</h3>
            <p className="mt-2 max-w-xs text-sm leading-relaxed text-zinc-500">{step.body}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
