import type { ReactNode } from 'react'
import { LANDING_IMAGES } from '../lib/landingTheme'
import type { BrowseHeroStats } from '../lib/restaurantBrowseSections'

type Props = {
  stats: BrowseHeroStats
  searchSlot: ReactNode
  onOpenDeliveryMap?: () => void
  cityLabel?: string
  /** Deri 3 foto restorantesh për hero rrethor (fallback: landing images). */
  previewImages?: string[]
}

const FALLBACK_HERO_IMAGES = [
  LANDING_IMAGES.hero,
  LANDING_IMAGES.partner,
  LANDING_IMAGES.driver,
] as const

export function RestaurantHero({
  stats,
  searchSlot,
  onOpenDeliveryMap,
  cityLabel,
  previewImages = [],
}: Props) {
  const etaRange =
    stats.avgEtaMinutes > 0
      ? `${Math.max(15, stats.avgEtaMinutes - 8)}–${stats.avgEtaMinutes + 12} min`
      : '20–35 min'

  const heroImages = [
    previewImages[0] ?? FALLBACK_HERO_IMAGES[0],
    previewImages[1] ?? FALLBACK_HERO_IMAGES[1],
    previewImages[2] ?? FALLBACK_HERO_IMAGES[2],
  ]

  return (
    <section className="relative overflow-hidden rounded-2xl border border-white/[0.1] bg-gradient-to-br from-[#2a2238] via-[#1e2438] to-[#171c2a] p-4 shadow-[0_24px_60px_-20px_rgba(0,0,0,0.55)] sm:rounded-3xl sm:p-6 lg:p-7">
      <div
        className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-orange-500/20 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-20 left-1/3 h-48 w-48 rounded-full bg-amber-400/10 blur-3xl"
        aria-hidden
      />

      <div className="relative grid gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:gap-8">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#ffc107]/90">
            FoodDelivery · {cityLabel ?? 'Zona jote'}
          </p>
          <h1 className="landing-brand mt-2 text-2xl font-semibold leading-[1.15] tracking-tight text-zinc-50 sm:text-3xl lg:text-[2rem]">
            Zgjidh ushqimin tënd të preferuar
          </h1>
          <p className="mt-2 max-w-lg text-sm leading-relaxed text-zinc-400">
            Porosit nga restorantet më të vlerësuara — dërgesë në{' '}
            <span className="font-semibold text-orange-200">{etaRange}</span>.
          </p>

          <div className="mt-4 flex flex-wrap gap-2 sm:gap-3">
            <StatPill icon="⏱" label="Dërgesa" value={etaRange} />
            <StatPill
              icon="⭐"
              label="Vlerësimi mesatar"
              value={stats.avgRating > 0 ? stats.avgRating.toFixed(1) : '—'}
            />
            <StatPill
              icon="🍽"
              label="Restorante"
              value={stats.restaurantCount > 0 ? `${stats.restaurantCount}+` : '—'}
            />
          </div>

          <div className="mt-5">{searchSlot}</div>

          {onOpenDeliveryMap ? (
            <button
              type="button"
              onClick={onOpenDeliveryMap}
              className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-sky-300/90 transition hover:text-sky-200"
            >
              <span aria-hidden>📍</span>
              Ndrysho adresën e dërgesës
            </button>
          ) : null}
        </div>

        <div className="relative mx-auto flex min-h-[11rem] w-full max-w-[19rem] items-center justify-center sm:min-h-[13rem] lg:mx-0 lg:ml-auto lg:max-w-none">
          <HeroFoodCircles images={heroImages} />
        </div>
      </div>
    </section>
  )
}

function HeroFoodCircles({ images }: { images: string[] }) {
  return (
    <div className="relative h-44 w-full max-w-[17rem] sm:h-52 sm:max-w-[19rem]">
      <div className="absolute right-0 top-0 z-10 h-[7.5rem] w-[7.5rem] overflow-hidden rounded-full border-[3px] border-[#1e2438] shadow-[0_16px_40px_-8px_rgba(0,0,0,0.65)] sm:h-[8.5rem] sm:w-[8.5rem]">
        <img src={images[0]} alt="" className="h-full w-full object-cover" />
      </div>
      <div className="absolute left-0 top-6 z-20 h-[6.5rem] w-[6.5rem] overflow-hidden rounded-full border-[3px] border-[#1e2438] shadow-[0_16px_40px_-8px_rgba(0,0,0,0.65)] sm:top-8 sm:h-[7.5rem] sm:w-[7.5rem]">
        <img src={images[1]} alt="" className="h-full w-full object-cover" />
      </div>
      <div className="absolute bottom-0 right-8 z-30 h-[5.5rem] w-[5.5rem] overflow-hidden rounded-full border-[3px] border-[#1e2438] shadow-[0_16px_40px_-8px_rgba(0,0,0,0.65)] sm:right-10 sm:h-[6.25rem] sm:w-[6.25rem]">
        <img src={images[2]} alt="" className="h-full w-full object-cover" />
      </div>

      <div className="absolute -bottom-1 left-2 z-40 max-w-[10.5rem] rounded-xl border border-white/15 bg-[#1a1f2e]/95 p-2.5 shadow-xl backdrop-blur-md sm:left-4 sm:p-3">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-orange-300">
          Porosi live
        </p>
        <p className="mt-0.5 text-sm font-bold text-zinc-100">Pizza · 24 min</p>
        <p className="text-xs text-zinc-500">Duke u përgatitur…</p>
      </div>
      <div className="absolute right-0 top-2 z-40 rounded-xl border border-amber-400/30 bg-gradient-to-br from-amber-500/25 to-orange-600/20 px-2.5 py-1.5 shadow-lg backdrop-blur-sm sm:top-0 sm:px-3 sm:py-2">
        <p className="text-[10px] font-bold uppercase text-amber-100">Promo</p>
        <p className="text-sm font-bold text-white">-15% sot</p>
      </div>
    </div>
  )
}

function StatPill({
  icon,
  label,
  value,
}: {
  icon: string
  label: string
  value: string
}) {
  return (
    <div className="rounded-xl border border-white/[0.1] bg-white/[0.05] px-3 py-2 backdrop-blur-sm">
      <p className="flex items-center gap-1 text-[10px] font-medium uppercase tracking-wide text-zinc-500">
        <span aria-hidden>{icon}</span>
        {label}
      </p>
      <p className="mt-0.5 text-sm font-bold text-zinc-100">{value}</p>
    </div>
  )
}
