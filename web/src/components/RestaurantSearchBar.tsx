type Props = {
  value: string
  onChange: (value: string) => void
  id?: string
  placeholder?: string
}

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="16"
      height="16"
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

/** Shirit kërkimi kompakt (pill), i balancuar me filtrat. */
export function RestaurantSearchBar({
  value,
  onChange,
  id = 'restaurant-search',
  placeholder = 'Kërko sipas emrit të restorantit, qytetit / adresës ose kategorisë së ushqimit.',
}: Props) {
  return (
    <div className="mx-auto w-full max-w-xs sm:mx-0 sm:max-w-sm">
      <div className="relative flex w-full items-center">
        <label htmlFor={id} className="sr-only">
          Kërko restorante
        </label>
        <span
          className="pointer-events-none absolute left-2.5 text-zinc-500 sm:left-3"
          aria-hidden
        >
          <SearchIcon className="h-[15px] w-[15px]" />
        </span>
        <input
          id={id}
          type="search"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete="off"
          spellCheck={false}
          placeholder={placeholder}
          className="h-8 w-full rounded-full border border-white/[0.1] bg-[#2a3144]/90 py-1.5 pl-9 pr-3 text-xs leading-tight text-zinc-100 shadow-sm outline-none ring-1 ring-black/5 transition placeholder:text-zinc-500 focus:border-sky-400/30 focus:bg-[#2f374c] focus:ring-2 focus:ring-sky-500/15 sm:h-9 sm:pl-9 sm:pr-3.5 sm:text-[13px]"
        />
      </div>
    </div>
  )
}
