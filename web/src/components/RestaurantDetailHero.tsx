import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import type { RestaurantSummary } from '../lib/restaurantsApi'
import { apiPath } from '../lib/apiBase'
import { etaRangeLabel, generatedLogoLines, isRestaurantOpenNow } from '../lib/restaurantDetailUi'

type Props = {
  title: string
  coverUrl: string
  logoUrl?: string | null
  summary: RestaurantSummary | null
  categoryName: string
  averageRating: number
  reviewCount: number
  estimatedMinutes: number
  isFavorite: boolean
  favoriteBusy: boolean
  onToggleFavorite: () => void
}

function IconBtn({
  children,
  label,
  onClick,
}: {
  children: ReactNode
  label: string
  onClick?: () => void
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/15 bg-black/40 text-zinc-200 backdrop-blur-md transition hover:bg-black/55"
    >
      {children}
    </button>
  )
}

export function RestaurantDetailHero({
  title,
  coverUrl,
  logoUrl,
  summary,
  categoryName,
  averageRating,
  reviewCount,
  estimatedMinutes,
  isFavorite,
  favoriteBusy,
  onToggleFavorite,
}: Props) {
  const eta = summary?.estimatedDeliveryMinutes ?? estimatedMinutes
  const fee = summary?.deliveryFee ?? 0
  const minOrder = summary?.minOrderAmount ?? 0
  const open = isRestaurantOpenNow(eta)

  async function handleShare() {
    const url = window.location.href
    try {
      if (navigator.share) await navigator.share({ title, url })
      else await navigator.clipboard.writeText(url)
    } catch {
      /* ignore */
    }
  }

  const logoLines = generatedLogoLines(title)
  const logoSrc = logoUrl ? apiPath(logoUrl) : null

  return (
    <div className="relative overflow-hidden">
      <div className="relative h-[200px] w-full sm:h-[240px]">
        <img src={coverUrl} alt="" className="h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#0c0e14]/25 via-[#0c0e14]/20 to-[#0c0e14]" />
        <div className="absolute left-4 right-4 top-4 flex items-start justify-between sm:left-6 sm:right-6">
          <Link
            to="/app/restaurants"
            className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-black/45 px-3 py-2 text-xs font-semibold text-white backdrop-blur-md transition hover:bg-black/60 sm:text-sm"
          >
            <span aria-hidden>←</span> Kthehu te restorantet
          </Link>
          <div className="flex gap-2">
            <IconBtn
              label={isFavorite ? 'Hiq nga të preferuarat' : 'Shto te të preferuarat'}
              onClick={onToggleFavorite}
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill={isFavorite ? '#F5B800' : 'none'}
                stroke={isFavorite ? '#F5B800' : 'currentColor'}
                strokeWidth="2"
                className={favoriteBusy ? 'opacity-50' : ''}
              >
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
            </IconBtn>
            <IconBtn label="Ndaj" onClick={handleShare}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8M16 6l-4-4-4 4M12 2v13" strokeLinecap="round" />
              </svg>
            </IconBtn>
          </div>
        </div>
      </div>

      <div className="relative border-b border-white/[0.06] bg-[#0c0e14] px-4 pb-5 pt-0 sm:px-6">
        <div className="-mt-14 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex min-w-0 gap-4">
            <div className="flex h-[4.5rem] w-[4.5rem] shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-black shadow-xl">
              {logoSrc ? (
                <img src={logoSrc} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="flex flex-col items-center justify-center px-1.5 text-center">
                  {logoLines.map((line) => (
                    <span
                      key={line}
                      className="text-[11px] font-bold leading-tight text-[#F5B800] sm:text-xs"
                    >
                      {line}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div className="min-w-0 pt-8 sm:pt-10">
              {open ? (
                <span className="mb-1.5 inline-block rounded-md bg-emerald-500 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
                  Hapur
                </span>
              ) : null}
              <h1 className="text-2xl font-bold tracking-tight text-white sm:text-[1.85rem]">
                {title}
              </h1>
              <p className="mt-1 text-sm text-zinc-400">
                {categoryName}
                <span className="text-zinc-600"> · </span>
                <span aria-hidden>🍔</span> Fast Food
              </p>
              <p className="mt-1.5 text-sm text-zinc-300">
                <span className="text-[#F5B800]">⭐</span>{' '}
                <span className="font-semibold">{averageRating.toFixed(1)}</span>
                {reviewCount > 0 ? (
                  <span className="text-zinc-500"> ({reviewCount} vlerësime)</span>
                ) : null}
              </p>
            </div>
          </div>

          <div className="grid shrink-0 grid-cols-3 gap-2 sm:gap-3 lg:max-w-[420px]">
            <StatBox
              icon={
                <svg className="text-zinc-500" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 6v6l4 2" />
                </svg>
              }
              value={etaRangeLabel(eta)}
              label="Koha e dërgesës"
            />
            <StatBox
              icon={
                <svg className="text-zinc-500" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="5.5" cy="17.5" r="2.5" />
                  <circle cx="18.5" cy="17.5" r="2.5" />
                  <path d="M8 17H16M5.5 15H6l2-7h8l2 7h.5" />
                </svg>
              }
              value={`${fee.toFixed(2)} €`}
              label="Tarifa e dërgesës"
            />
            <StatBox
              icon={
                <svg className="text-zinc-500" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
                  <path d="M3 6h18M16 10a4 4 0 0 1-8 0" />
                </svg>
              }
              value={minOrder > 0 ? `${minOrder.toFixed(2)} €` : '—'}
              label="Porosia minimale"
            />
          </div>
        </div>
      </div>
    </div>
  )
}

function StatBox({
  icon,
  value,
  label,
}: {
  icon: ReactNode
  value: string
  label: string
}) {
  return (
    <div className="rounded-2xl border border-white/[0.08] bg-[#141a28] px-3 py-3 text-center">
      <div className="mb-1.5 flex justify-center">{icon}</div>
      <p className="text-sm font-bold tabular-nums text-white sm:text-base">{value}</p>
      <p className="mt-0.5 text-[10px] leading-tight text-zinc-500">{label}</p>
    </div>
  )
}
