/** Ikona e thjeshtë sipas emrit të seksionit (pa upload). */
export function MenuSectionIcon({ name, className = 'h-5 w-5' }: { name: string; className?: string }) {
  const n = name.toLowerCase()
  const stroke = 'currentColor'
  const sw = 1.75

  if (/pije|pije|ujë|beverage|drink|cola|kafe/.test(n)) {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={sw} aria-hidden>
        <path d="M8 2h8l1 10H7L8 2z" />
        <path d="M7 12h10v2a5 5 0 0 1-10 0v-2z" />
      </svg>
    )
  }
  if (/ëmbëlsir|dessert|cake|akullore|sweet/.test(n)) {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={sw} aria-hidden>
        <path d="M12 3v4M6 8h12l-1 13H7L6 8z" />
        <path d="M6 8c0-2 2.5-3 6-3s6 1 6 3" />
      </svg>
    )
  }
  if (/pizza/.test(n)) {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={sw} aria-hidden>
        <path d="M12 2C8 6 5 10 5 14a7 7 0 0 0 14 0c0-4-3-8-7-12z" />
        <circle cx="9" cy="13" r="1" fill="currentColor" stroke="none" />
        <circle cx="14" cy="11" r="1" fill="currentColor" stroke="none" />
        <circle cx="12" cy="16" r="1" fill="currentColor" stroke="none" />
      </svg>
    )
  }
  if (/sallat|salad/.test(n)) {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={sw} aria-hidden>
        <path d="M4 14c2-6 6-8 8-8s6 2 8 8" />
        <path d="M6 18h12" />
      </svg>
    )
  }
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={sw} aria-hidden>
      <path d="M4 6h16v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6z" />
      <path d="M4 10h16" />
    </svg>
  )
}
