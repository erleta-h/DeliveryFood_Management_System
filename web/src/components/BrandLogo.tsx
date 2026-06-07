import { Link } from 'react-router-dom'
import { ScooterIcon } from './landing/landingIcons'

type Props = {
  className?: string
  /** Hyrje “moderne”: blur që largohet + Food/Delivery me vonesë të vogël. */
  entrance?: boolean
  /** Ikona e skuterit para logos (landing mockup). */
  withIcon?: boolean
  /** Ku të çojë klikimi (default: ballina). */
  to?: string
  /** Madhësi më e vogël për header në /app — i njëjti font Fraunces. */
  compact?: boolean
}

const sizeLandingFood =
  'text-[1.35rem] font-semibold sm:text-3xl tracking-[-0.03em]'
const sizeLandingDelivery = 'text-[1.35rem] font-bold sm:text-3xl tracking-[-0.02em]'
const sizeCompactFood = 'text-lg font-semibold sm:text-xl tracking-[-0.03em]'
const sizeCompactDelivery = 'text-lg font-bold sm:text-xl tracking-[-0.02em]'

/** Logo në krye — font Fraunces (si në faqen e parë). */
export function BrandLogo({
  className = '',
  entrance = false,
  withIcon = false,
  to = '/',
  compact = false,
}: Props) {
  const sf = compact ? sizeCompactFood : sizeLandingFood
  const sd = compact ? sizeCompactDelivery : sizeLandingDelivery

  return (
    <span className={`inline-flex items-center gap-2.5 ${entrance ? 'animate-site-logo-wrap' : ''}`}>
      {withIcon ? (
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#ffc107]/15 text-[#ffc107]">
          <ScooterIcon className="h-6 w-6" />
        </span>
      ) : null}
      <Link
        to={to}
        className={`group inline-flex select-none items-baseline gap-0.5 no-underline ${className}`}
      >
        <span
          className={`landing-brand leading-none text-zinc-100 italic transition group-hover:text-white ${sf} ${entrance ? 'animate-site-logo-food' : ''}`}
        >
          Food
        </span>
        <span
          className={`landing-brand leading-none transition ${sd} ${entrance ? 'animate-site-logo-delivery' : ''}`}
        >
          <span className="bg-gradient-to-r from-amber-200 via-amber-400 to-amber-300 bg-clip-text text-transparent drop-shadow-[0_0_28px_rgba(251,191,36,0.22)] transition group-hover:from-amber-100 group-hover:via-amber-300 group-hover:to-amber-200">
            Delivery
          </span>
        </span>
      </Link>
    </span>
  )
}
