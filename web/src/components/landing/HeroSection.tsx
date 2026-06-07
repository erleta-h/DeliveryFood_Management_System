import { useState, type FormEvent, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import type { PublicLandingContent } from '../../lib/publicSiteApi'
import type { PublicLandingStats } from '../../lib/publicLandingApi'
import { KOSOVO_CITIES } from '../../lib/kosovoCities'
import {
  LANDING_IMAGES,
  landingIconBox,
  landingSearchBar,
  landingTextGold,
} from '../../lib/landingTheme'
import { useAuthStore } from '../../store/authStore'
import {
  BagIcon,
  ClockIcon,
  LocationPinIcon,
  ScooterIcon,
  ShopIcon,
} from './landingIcons'

type Props = {
  content: PublicLandingContent
  stats: PublicLandingStats | null
}

function HeroMetricCard({
  icon,
  value,
  label,
  valueClassName = 'text-white',
}: {
  icon: ReactNode
  value: string
  label: string
  valueClassName?: string
}) {
  return (
    <div className="flex min-w-0 flex-col items-center justify-center rounded-2xl border border-white/[0.07] bg-[#141824]/45 px-2 py-3.5 text-center backdrop-blur-sm sm:px-2.5 sm:py-4">
      <span className={landingIconBox}>{icon}</span>
      <p className={`mt-2 text-lg font-bold tabular-nums leading-none sm:text-xl ${valueClassName}`}>{value}</p>
      <p className="mt-1.5 line-clamp-2 text-[10px] leading-snug text-zinc-500 sm:text-[11px]">{label}</p>
    </div>
  )
}

export function HeroSection({ content, stats }: Props) {
  const navigate = useNavigate()
  const token = useAuthStore((s) => s.token)
  const [city, setCity] = useState('Prishtinë, Kosovë')
  const [query, setQuery] = useState('')

  const heroImage = content.heroBackgroundImage?.trim() || LANDING_IMAGES.hero

  function onSearch(e: FormEvent) {
    e.preventDefault()
    const q = query.trim()
    const params = new URLSearchParams()
    if (q) params.set('q', q)
    const path = `/app/restaurants${params.toString() ? `?${params}` : ''}`
    if (token) navigate(path)
    else navigate(`/login?next=${encodeURIComponent(path)}`)
  }

  const openCount = stats?.openRestaurantsCount ?? 0
  const drivers = stats?.activeDriversCount ?? 0
  const inProcess = stats?.ordersInProcessCount ?? 0
  const avgMin = stats?.averageDeliveryMinutes ?? 0

  return (
    <section className="relative overflow-x-clip pb-6 lg:pb-10">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_70%_40%,rgba(255,193,7,0.06)_0%,transparent_55%)]"
        aria-hidden
      />

      <div className="relative mx-auto max-w-7xl px-6 pt-10 lg:px-10 lg:pt-14">
        <div className="lg:grid lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:items-center lg:gap-6 xl:gap-10">
          {/* Majtas */}
          <div className="relative z-10 min-w-0 max-w-xl lg:max-w-none">
            <h1 className="animate-site-hero text-[2rem] font-extrabold leading-[1.12] tracking-tight text-white sm:text-4xl lg:text-[2.85rem] lg:leading-[1.1] xl:text-[3.15rem]">
              <span className="block whitespace-pre-line">{content.heroTitle}</span>
              <span className={`mt-0.5 block ${landingTextGold}`}>{content.heroHighlight}</span>
            </h1>

            <p className="animate-site-hero-sub mt-5 max-w-lg text-[15px] leading-relaxed text-zinc-400 lg:text-base">
              {content.heroSubtitle}
            </p>

            <form
              onSubmit={onSearch}
              className={`${landingSearchBar} animate-site-hero-sub mt-8 w-full max-w-[85%]`}
              style={{ animationDelay: '0.52s' }}
            >
              <div className="relative flex w-[11.25rem] max-w-[13.75rem] shrink-0 items-center gap-1.5 border-r border-white/[0.08] px-2.5 sm:w-[12.5rem] sm:px-3">
                <LocationPinIcon className="h-4 w-4 shrink-0 text-zinc-500" />
                <label className="sr-only" htmlFor="hero-city">
                  Qyteti
                </label>
                <select
                  id="hero-city"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="h-11 w-full min-w-0 appearance-none truncate bg-transparent py-2 pr-1 text-xs font-medium text-zinc-200 outline-none sm:text-sm"
                >
                  {KOSOVO_CITIES.map((c) => (
                    <option key={c.name} value={`${c.name}, Kosovë`} className="bg-[#161922]">
                      {c.name}, Kosovë
                    </option>
                  ))}
                </select>
              </div>

              <label className="sr-only" htmlFor="hero-search">
                Kërko
              </label>
              <input
                id="hero-search"
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Kërko restorant ose ushqim..."
                className="h-11 min-w-0 flex-1 bg-transparent px-3 text-sm text-zinc-100 placeholder:text-zinc-500 outline-none sm:px-4"
              />

              <div className="flex shrink-0 items-center p-1">
                <button
                  type="submit"
                  className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#ffc107] text-zinc-950 transition hover:bg-[#f5b800]"
                  aria-label="Kërko"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <circle cx="11" cy="11" r="7" />
                    <path d="M20 20l-3.5-3.5" strokeLinecap="round" />
                  </svg>
                </button>
              </div>
            </form>

            <div
              className="animate-site-hero-sub mt-7 grid w-full max-w-[85%] grid-cols-4 gap-2 sm:gap-3"
              style={{ animationDelay: '0.66s' }}
            >
              {openCount > 0 ? (
                <HeroMetricCard
                  icon={<ShopIcon className="h-4 w-4" />}
                  value={String(openCount)}
                  label="Restorante të hapura"
                />
              ) : null}
              {drivers > 0 ? (
                <HeroMetricCard
                  icon={<ScooterIcon className="h-4 w-4" />}
                  value={String(drivers)}
                  label="Shoferë aktivë"
                />
              ) : null}
              {inProcess > 0 ? (
                <HeroMetricCard
                  icon={<BagIcon className="h-4 w-4" />}
                  value={String(inProcess)}
                  label="Porosi në proces"
                />
              ) : null}
              {avgMin > 0 ? (
                <HeroMetricCard
                  icon={<ClockIcon className="h-4 w-4" />}
                  value={`${avgMin} min`}
                  label="Mesatarja e dorëzimit"
                  valueClassName={landingTextGold}
                />
              ) : null}
            </div>
          </div>

          {/* Djathtas — imazh i lirë, pa kuti */}
          <div
            className="animate-site-hero-sub relative mt-10 lg:mt-0 lg:-mr-6 lg:min-h-[26rem] xl:-mr-10 xl:min-h-[30rem]"
            style={{ animationDelay: '0.48s' }}
          >
            <img
              src={heroImage}
              alt=""
              className="mx-auto w-full max-w-md object-contain lg:absolute lg:right-0 lg:top-1/2 lg:mx-0 lg:max-w-none lg:w-[120%] lg:max-h-[29rem] lg:-translate-y-1/2 lg:object-right xl:max-h-[34rem] xl:w-[125%]"
              style={{
                WebkitMaskImage:
                  'linear-gradient(to right, transparent 0%, rgba(0,0,0,0.4) 12%, black 28%, black 100%)',
                maskImage:
                  'linear-gradient(to right, transparent 0%, rgba(0,0,0,0.4) 12%, black 28%, black 100%)',
              }}
            />
          </div>
        </div>
      </div>
    </section>
  )
}
