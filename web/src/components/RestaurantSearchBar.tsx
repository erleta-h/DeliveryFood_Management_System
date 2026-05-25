import { useId, useRef, useState } from 'react'
import type { RestaurantListItem } from '../lib/restaurantsApi'

type Props = {
  value: string
  onChange: (value: string) => void
  id?: string
  placeholder?: string
  suggestions?: RestaurantListItem[]
  onPickSuggestion?: (name: string) => void
  onOpenFilters?: () => void
}

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-4-4" />
    </svg>
  )
}

/** Shirit kërkimi premium me blur dhe sugjerime. */
export function RestaurantSearchBar({
  value,
  onChange,
  id: idProp,
  placeholder = 'Kërko restorante, kuzhina ose pjata…',
  suggestions = [],
  onPickSuggestion,
  onOpenFilters,
}: Props) {
  const autoId = useId()
  const id = idProp ?? `restaurant-search-${autoId}`
  const [focused, setFocused] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)

  const showSuggestions =
    focused && value.trim().length >= 2 && suggestions.length > 0 && onPickSuggestion

  return (
    <div ref={wrapRef} className="relative w-full max-w-xl">
      <div
        className={`relative flex items-center gap-2 rounded-2xl border bg-[#1a2030]/80 px-3 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-md transition sm:px-4 sm:py-2.5 ${
          focused
            ? 'border-orange-400/35 ring-2 ring-orange-500/15'
            : 'border-white/[0.12] hover:border-white/20'
        }`}
      >
        <span className="shrink-0 text-orange-300/80" aria-hidden>
          <SearchIcon />
        </span>
        <label htmlFor={id} className="sr-only">
          Kërko restorante
        </label>
        <input
          id={id}
          type="search"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => window.setTimeout(() => setFocused(false), 160)}
          autoComplete="off"
          spellCheck={false}
          placeholder={placeholder}
          className="min-w-0 flex-1 bg-transparent text-sm text-zinc-100 outline-none placeholder:text-zinc-500 sm:text-[15px]"
        />
        {onOpenFilters ? (
          <button
            type="button"
            onClick={onOpenFilters}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.06] text-zinc-400 transition hover:border-orange-400/30 hover:text-orange-200"
            aria-label="Filtrat"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M4 6h16M7 12h10M10 18h4" strokeLinecap="round" />
            </svg>
          </button>
        ) : null}
      </div>

      {showSuggestions ? (
        <ul
          role="listbox"
          className="absolute left-0 right-0 top-[calc(100%+6px)] z-30 max-h-52 overflow-y-auto rounded-xl border border-white/10 bg-[#1a1f2e]/98 py-1 shadow-2xl backdrop-blur-md"
        >
          {suggestions.slice(0, 6).map((r) => (
            <li key={r.id}>
              <button
                type="button"
                role="option"
                className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-zinc-200 transition hover:bg-orange-500/10 hover:text-orange-50"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  onPickSuggestion(r.name)
                  setFocused(false)
                }}
              >
                <span className="font-semibold">{r.name}</span>
                <span className="truncate text-xs text-zinc-500">{r.categoryName}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
