import { Link } from 'react-router-dom'

function StoreIcon({ className = '' }: { className?: string }) {
  return (
    <svg
      className={className}
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
    >
      <path d="M3 9h18v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9Z" />
      <path d="M5 9V7a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v2" strokeLinecap="round" />
      <path d="M9 21v-4h6v4" />
    </svg>
  )
}

function ScooterIcon({ className = '' }: { className?: string }) {
  return (
    <svg
      className={className}
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
    >
      <circle cx="6" cy="17" r="2" />
      <circle cx="18" cy="17" r="2" />
      <path d="M4 17h16M6 12h10l2-5H8l-2 5Z" strokeLinejoin="round" />
    </svg>
  )
}

type CardProps = {
  accent: 'partner' | 'driver'
  eyebrow: string
  title: string
  description: string
  ctaTo: string
  ctaLabel: string
  loginTo: string
  loginPrefix: string
}

function CollaborateCard({
  accent,
  eyebrow,
  title,
  description,
  ctaTo,
  ctaLabel,
  loginTo,
  loginPrefix,
}: CardProps) {
  const isPartner = accent === 'partner'
  const border = isPartner ? 'border-orange-500/22' : 'border-sky-500/22'
  const glow = isPartner
    ? 'shadow-[0_0_0_1px_rgba(251,146,60,0.1),0_16px_40px_-18px_rgba(251,146,60,0.22)]'
    : 'shadow-[0_0_0_1px_rgba(56,189,248,0.1),0_16px_40px_-18px_rgba(56,189,248,0.2)]'
  const iconWrap = isPartner
    ? 'bg-orange-500/20 text-orange-200 ring-1 ring-orange-400/25'
    : 'bg-sky-500/20 text-sky-200 ring-1 ring-sky-400/25'
  const btn = isPartner
    ? 'bg-[#e67e22] hover:bg-[#f08a2c] shadow-[0_6px_24px_-8px_rgba(230,126,34,0.5)]'
    : 'bg-[#2b7cd3] hover:bg-[#3588de] shadow-[0_6px_24px_-8px_rgba(43,124,211,0.45)]'
  const linkAccent = isPartner ? 'text-orange-400 hover:text-orange-300' : 'text-sky-400 hover:text-sky-300'
  const watermark = isPartner ? 'text-orange-500/10' : 'text-sky-500/10'

  return (
    <article
      className={`relative flex min-h-[280px] flex-col overflow-hidden rounded-2xl border ${border} bg-[#181c28] ${glow} sm:min-h-[300px]`}
    >
      <div
        className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${
          isPartner ? 'from-orange-950/25 to-transparent' : 'from-sky-950/30 to-transparent'
        }`}
        aria-hidden
      />

      <div className="pointer-events-none absolute -right-4 bottom-0 top-8 flex items-center" aria-hidden>
        {isPartner ? (
          <StoreIcon className={`h-36 w-36 sm:h-40 sm:w-40 ${watermark}`} />
        ) : (
          <ScooterIcon className={`h-36 w-36 sm:h-40 sm:w-40 ${watermark}`} />
        )}
      </div>

      <div className="relative z-10 flex flex-1 flex-col p-6 sm:p-8">
        <div className="flex items-start gap-3">
          <span
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${iconWrap}`}
            aria-hidden
          >
            {isPartner ? <StoreIcon /> : <ScooterIcon />}
          </span>
          <div className="min-w-0 max-w-md">
            <p className="text-xs font-medium text-zinc-500">{eyebrow}</p>
            <h3 className="mt-1 text-xl font-bold leading-snug text-white sm:text-2xl">{title}</h3>
          </div>
        </div>

        <p className="mt-4 max-w-md text-sm leading-relaxed text-zinc-400">{description}</p>

        <div className="mt-auto flex flex-col gap-4 pt-10 sm:flex-row sm:flex-wrap sm:items-center sm:gap-5">
          <Link
            to={ctaTo}
            className={`inline-flex min-w-[12rem] items-center justify-center gap-2 rounded-xl px-6 py-3.5 text-sm font-bold text-white transition ${btn}`}
          >
            {ctaLabel}
            <span aria-hidden className="text-base">
              →
            </span>
          </Link>
          <p className="text-sm text-zinc-500">
            {loginPrefix}{' '}
            <Link to={loginTo} className={`font-semibold underline-offset-2 hover:underline ${linkAccent}`}>
              Hyr
            </Link>
          </p>
        </div>
      </div>
    </article>
  )
}

type Props = {
  partnerEyebrow?: string
  partnerTitle?: string
  partnerBody?: string
}

export function LandingCollaborateSection({
  partnerEyebrow = 'Për restorante & biznese',
  partnerTitle = 'Bëhu partner me ne',
  partnerBody = 'Listo menunë, prano porosi dhe rrit shitjet me mijëra klientë çdo ditë.',
}: Props) {
  return (
    <section aria-labelledby="collab-heading" className="mt-16 w-full sm:mt-20">
      <h2
        id="collab-heading"
        className="text-center text-xs font-bold uppercase tracking-[0.2em] text-zinc-500 sm:text-left"
      >
        Bashkëpuno me FoodDelivery
      </h2>

      <div className="mt-5 grid gap-5 sm:gap-6 lg:grid-cols-2">
        <CollaborateCard
          accent="partner"
          eyebrow={partnerEyebrow}
          title={partnerTitle}
          description={partnerBody}
          ctaTo="/partner"
          ctaLabel="Apliko si partner"
          loginTo="/partner/login"
          loginPrefix="Ke tashmë kontratë?"
        />
        <CollaborateCard
          accent="driver"
          eyebrow="Bëhu driver"
          title="Dërgo me biçikletë ose motor"
          description="Prano porosi, merr nga restoranti dhe dorëzo te klienti."
          ctaTo="/driver/apply"
          ctaLabel="Apliko si driver"
          loginTo="/driver/login"
          loginPrefix="Ke llogari?"
        />
      </div>
    </section>
  )
}
