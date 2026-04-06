import { useRef } from 'react'
import {
  CATEGORY_ALL_IMAGE,
  imageUrlForFoodCategory,
} from '../lib/categoryBrowseImages'
import type { FoodCategoryOption } from '../lib/restaurantsApi'

type Props = {
  categories: FoodCategoryOption[]
  categoryId: number | null
  onSelectCategory: (id: number | null) => void
}

function ChevronLeft({ className }: { className?: string }) {
  return (
    <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M15 6l-6 6 6 6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function ChevronRight({ className }: { className?: string }) {
  return (
    <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M9 6l6 6-6 6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/** Karusel horizontal “Browse by category” me foto rrethore. */
export function CategoryBrowseCarousel({
  categories,
  categoryId,
  onSelectCategory,
}: Props) {
  const scrollerRef = useRef<HTMLDivElement>(null)

  const scroll = (dir: -1 | 1) => {
    scrollerRef.current?.scrollBy({
      left: dir * 200,
      behavior: 'smooth',
    })
  }

  return (
    <div className="pt-3 sm:pt-4">
      <div className="mb-3 flex items-center justify-between gap-2 sm:mb-3.5">
        <h2 className="text-base font-bold tracking-tight text-zinc-100 sm:text-lg">
          Shfletoni sipas kategorisë
        </h2>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={() => scroll(-1)}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-[#1a3a52] text-sky-100/95 shadow-md transition hover:bg-[#234a68] hover:text-white sm:h-9 sm:w-9"
            aria-label="Lëviz majtas"
          >
            <ChevronLeft className="h-[18px] w-[18px]" />
          </button>
          <button
            type="button"
            onClick={() => scroll(1)}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-[#1a3a52] text-sky-100/95 shadow-md transition hover:bg-[#234a68] hover:text-white sm:h-9 sm:w-9"
            aria-label="Lëviz djathtas"
          >
            <ChevronRight className="h-[18px] w-[18px]" />
          </button>
        </div>
      </div>

      <div
        ref={scrollerRef}
        className="-mx-0.5 flex gap-3 overflow-x-auto pb-1.5 pt-1 scrollbar-thin [scrollbar-color:rgba(255,255,255,0.15)_transparent] [scrollbar-width:thin] sm:gap-4"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        <button
          type="button"
          onClick={() => onSelectCategory(null)}
          className="flex w-[5rem] shrink-0 flex-col items-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/50 sm:w-[5.5rem]"
        >
          <span
            className={`h-[4.25rem] w-[4.25rem] rounded-full bg-cover bg-center shadow-lg ring-2 ring-offset-2 ring-offset-[#252b3d] transition sm:h-20 sm:w-20 ${
              categoryId === null ? 'ring-white' : 'ring-white/15 hover:ring-white/35'
            }`}
            style={{ backgroundImage: `url(${CATEGORY_ALL_IMAGE})` }}
          />
          <span className="max-w-full truncate px-0.5 text-center text-[11px] font-medium leading-tight text-zinc-200 sm:text-xs">
            Të gjitha
          </span>
        </button>

        {categories.map((c) => {
          const selected = categoryId === c.id
          const img = imageUrlForFoodCategory(c.name)
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => onSelectCategory(selected ? null : c.id)}
              className="flex w-[5rem] shrink-0 flex-col items-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/50 sm:w-[5.5rem]"
            >
              <span
                className={`h-[4.25rem] w-[4.25rem] rounded-full bg-cover bg-center shadow-lg ring-2 ring-offset-2 ring-offset-[#252b3d] transition sm:h-20 sm:w-20 ${
                  selected ? 'ring-white' : 'ring-white/15 hover:ring-white/35'
                }`}
                style={{ backgroundImage: `url(${img})` }}
              />
              <span className="max-w-full truncate px-0.5 text-center text-[11px] font-medium leading-tight text-zinc-200 sm:text-xs">
                {c.name}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
