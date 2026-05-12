import { useRef } from 'react'
import { Link } from 'react-router-dom'
import { apiPath } from '../lib/apiBase'
import type { RestaurantListItem } from '../lib/restaurantsApi'

function placeholderStyle(seed: string): { background: string } {
  let h = 0
  for (let i = 0; i < seed.length; i++) h = seed.charCodeAt(i) + ((h << 5) - h)
  const hue = Math.abs(h) % 360
  const h2 = (hue + 48) % 360
  return {
    background: `linear-gradient(145deg, hsl(${hue} 42% 18%), hsl(${h2} 38% 12%))`,
  }
}

export function RestaurantDiscoveryRow({ restaurant }: { restaurant: RestaurantListItem }) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const r = restaurant
  const initial = r.name.trim().charAt(0).toUpperCase() || 'R'

  function scrollByDir(dir: -1 | 1) {
    const el = scrollRef.current
    if (!el) return
    el.scrollBy({ left: dir * Math.min(320, el.clientWidth * 0.85), behavior: 'smooth' })
  }

  return (
    <section className="border-b border-white/[0.07] py-5 last:border-b-0">
      <div className="mb-3 flex flex-wrap items-start gap-3 sm:items-center sm:justify-between">
        <Link
          to={`/app/restaurants/${r.id}`}
          state={{ name: r.name, deliveryFee: r.deliveryFee }}
          className="group flex min-w-0 flex-1 items-center gap-3 text-left"
        >
          <div
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-gradient-to-br from-amber-500/25 to-amber-700/15 text-lg font-bold text-amber-100 shadow-inner"
            aria-hidden
          >
            {initial}
          </div>
          <div className="min-w-0">
            <h2 className="text-base font-bold text-zinc-50 transition group-hover:text-amber-100 sm:text-lg">
              {r.name}
            </h2>
            <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-zinc-500">
              <span className="inline-flex items-center gap-1">
                <span aria-hidden>🛵</span>
                {r.deliveryFee.toFixed(2)} €
              </span>
              <span aria-hidden className="text-zinc-700">
                ·
              </span>
              <span className="inline-flex items-center gap-1">
                <span aria-hidden>⏱</span>
                {r.estimatedDeliveryMinutes} min
              </span>
              <span aria-hidden className="text-zinc-700">
                ·
              </span>
              <span className="inline-flex items-center gap-1">
                <span aria-hidden>⭐</span>
                {r.averageRating.toFixed(1)}
              </span>
              {r.distanceKm != null ? (
                <>
                  <span aria-hidden className="text-zinc-700">
                    ·
                  </span>
                  <span className="inline-flex items-center gap-1 text-emerald-400/90">
                    <span aria-hidden>📍</span>
                    ~{r.distanceKm.toFixed(1)} km
                  </span>
                </>
              ) : null}
            </p>
            <p className="mt-1 text-[11px] font-medium uppercase tracking-wide text-zinc-600">
              {r.categoryName}
              {r.city ? ` · ${r.city}` : ''}
            </p>
          </div>
        </Link>
        <div className="flex shrink-0 gap-1.5 self-center sm:ml-2">
          <button
            type="button"
            aria-label="Lëviz menujen majtas"
            onClick={() => scrollByDir(-1)}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-sky-500/40 bg-sky-500/15 text-sky-200 transition hover:bg-sky-500/25"
          >
            ‹
          </button>
          <button
            type="button"
            aria-label="Lëviz menujen djathtas"
            onClick={() => scrollByDir(1)}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-sky-500/40 bg-sky-500/15 text-sky-200 transition hover:bg-sky-500/25"
          >
            ›
          </button>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="-mx-1 flex snap-x snap-mandatory gap-3 overflow-x-auto pb-1 pt-1 scrollbar-thin"
        style={{ scrollbarWidth: 'thin' }}
      >
        {r.previewItems.length === 0 ? (
          <Link
            to={`/app/restaurants/${r.id}`}
            state={{ name: r.name, deliveryFee: r.deliveryFee }}
            className="snap-start rounded-xl border border-dashed border-white/15 bg-white/[0.03] px-6 py-8 text-center text-sm text-zinc-500"
          >
            Hap menunë →
          </Link>
        ) : (
          r.previewItems.map((p) => (
            <Link
              key={p.id}
              to={`/app/restaurants/${r.id}`}
              state={{ name: r.name, deliveryFee: r.deliveryFee }}
              className="group/card relative w-[min(11.5rem,calc(100vw-4rem))] shrink-0 snap-start overflow-hidden rounded-2xl border border-white/[0.09] shadow-lg shadow-black/40 transition hover:border-amber-500/25"
            >
              <div className="relative aspect-[4/3] w-full overflow-hidden">
                {p.imageUrl ? (
                  <img
                    src={apiPath(p.imageUrl)}
                    alt=""
                    className="h-full w-full object-cover transition duration-300 group-hover/card:scale-105"
                    loading="lazy"
                  />
                ) : (
                  <div
                    className="flex h-full w-full items-center justify-center"
                    style={placeholderStyle(p.name + r.id)}
                    aria-hidden
                  >
                    <span className="text-3xl opacity-40">🍽</span>
                  </div>
                )}
                <div className="pointer-events-none absolute inset-x-0 top-0 p-2">
                  <div className="inline-flex max-w-[95%] items-center rounded-full bg-black/65 px-2.5 py-1 text-[10px] font-semibold leading-tight text-white shadow-md backdrop-blur-sm sm:text-[11px]">
                    <span className="truncate">{p.name}</span>
                    <span className="mx-1 opacity-70">·</span>
                    <span className="shrink-0">{p.price.toFixed(2)} €</span>
                  </div>
                </div>
              </div>
            </Link>
          ))
        )}
      </div>
    </section>
  )
}
