import { useRef } from 'react'
import type { BrowseSection } from '../lib/restaurantBrowseSections'
import { RestaurantCard } from './RestaurantCard'

type Props = {
  section: BrowseSection
}

function badgeForIndex(sectionId: string, index: number): 'trending' | 'top' | 'sponsored' | null {
  if (sectionId === 'featured' && index === 0) return 'top'
  if (sectionId === 'popular' && index < 2) return 'trending'
  if (sectionId === 'offers' && index === 0) return 'sponsored'
  return null
}

export function RestaurantSection({ section }: Props) {
  const scrollerRef = useRef<HTMLDivElement>(null)
  const isCarousel = section.layout === 'carousel' || section.layout === 'carousel-compact'
  const variant = section.layout === 'carousel-compact' ? 'compact' : section.layout === 'carousel' ? 'featured' : 'default'

  const scroll = (dir: -1 | 1) => {
    scrollerRef.current?.scrollBy({
      left: dir * (scrollerRef.current.clientWidth * 0.75),
      behavior: 'smooth',
    })
  }

  return (
    <section className="space-y-3">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold tracking-tight text-zinc-50 sm:text-xl">{section.title}</h2>
          {section.subtitle ? (
            <p className="mt-0.5 text-xs text-zinc-500 sm:text-sm">{section.subtitle}</p>
          ) : null}
        </div>
        {isCarousel && section.items.length > 2 ? (
          <div className="flex shrink-0 gap-1.5">
            <button
              type="button"
              onClick={() => scroll(-1)}
              aria-label="Majtas"
              className="flex h-8 w-8 items-center justify-center rounded-full border border-white/15 bg-white/[0.06] text-zinc-300 transition hover:border-orange-400/30 hover:text-orange-100"
            >
              ‹
            </button>
            <button
              type="button"
              onClick={() => scroll(1)}
              aria-label="Djathtas"
              className="flex h-8 w-8 items-center justify-center rounded-full border border-white/15 bg-white/[0.06] text-zinc-300 transition hover:border-orange-400/30 hover:text-orange-100"
            >
              ›
            </button>
          </div>
        ) : null}
      </div>

      {isCarousel ? (
        <div
          ref={scrollerRef}
          className="-mx-1 flex gap-3 overflow-x-auto pb-2 pt-0.5 scrollbar-thin [scrollbar-color:rgba(255,255,255,0.12)_transparent]"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          {section.items.map((r, i) => (
            <RestaurantCard
              key={r.id}
              restaurant={r}
              variant={variant}
              badge={badgeForIndex(section.id, i)}
            />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {section.items.map((r, i) => (
            <RestaurantCard
              key={r.id}
              restaurant={r}
              variant="default"
              badge={badgeForIndex(section.id, i)}
            />
          ))}
        </div>
      )}
    </section>
  )
}
