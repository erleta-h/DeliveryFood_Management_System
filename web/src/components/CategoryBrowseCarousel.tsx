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

function Chevron({ dir }: { dir: -1 | 1 }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d={dir < 0 ? 'M15 6l-6 6 6 6' : 'M9 6l6 6-6 6'}
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  )
}

/** Karusel kompakt kategorish — scroll horizontal me glow aktiv. */
export function CategoryBrowseCarousel({
  categories,
  categoryId,
  onSelectCategory,
}: Props) {
  const scrollerRef = useRef<HTMLDivElement>(null)

  const scroll = (dir: -1 | 1) => {
    scrollerRef.current?.scrollBy({ left: dir * 160, behavior: 'smooth' })
  }

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-2">
        <h2 className="text-sm font-bold text-zinc-200 sm:text-base">Kategoritë</h2>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => scroll(-1)}
            className="flex h-7 w-7 items-center justify-center rounded-full border border-white/10 bg-white/[0.05] text-zinc-400 hover:text-orange-200"
            aria-label="Majtas"
          >
            <Chevron dir={-1} />
          </button>
          <button
            type="button"
            onClick={() => scroll(1)}
            className="flex h-7 w-7 items-center justify-center rounded-full border border-white/10 bg-white/[0.05] text-zinc-400 hover:text-orange-200"
            aria-label="Djathtas"
          >
            <Chevron dir={1} />
          </button>
        </div>
      </div>

      <div
        ref={scrollerRef}
        className="-mx-0.5 flex gap-2.5 overflow-x-auto pb-1 scrollbar-thin"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        <CategoryChip
          label="Të gjitha"
          image={CATEGORY_ALL_IMAGE}
          selected={categoryId === null}
          onClick={() => onSelectCategory(null)}
        />
        {categories.map((c) => (
          <CategoryChip
            key={c.id}
            label={c.name}
            image={imageUrlForFoodCategory(c.name)}
            selected={categoryId === c.id}
            onClick={() => onSelectCategory(categoryId === c.id ? null : c.id)}
          />
        ))}
      </div>
    </div>
  )
}

function CategoryChip({
  label,
  image,
  selected,
  onClick,
}: {
  label: string
  image: string
  selected: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-[4.25rem] shrink-0 flex-col items-center gap-1.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400/50 sm:w-[4.75rem]"
    >
      <span
        className={`relative h-14 w-14 rounded-full bg-cover bg-center shadow-md transition duration-300 sm:h-16 sm:w-16 ${
          selected
            ? 'ring-2 ring-orange-400 ring-offset-2 ring-offset-[#1a1f2e] shadow-[0_0_24px_-4px_rgba(251,146,60,0.55)]'
            : 'ring-1 ring-white/15 hover:ring-orange-400/40 hover:scale-105'
        }`}
        style={{ backgroundImage: `url(${image})` }}
      >
        {selected ? (
          <span className="absolute inset-0 rounded-full bg-orange-500/10 backdrop-blur-[1px]" />
        ) : null}
      </span>
      <span
        className={`max-w-full truncate px-0.5 text-center text-[10px] font-semibold leading-tight sm:text-[11px] ${
          selected ? 'text-orange-200' : 'text-zinc-400'
        }`}
      >
        {label}
      </span>
    </button>
  )
}
