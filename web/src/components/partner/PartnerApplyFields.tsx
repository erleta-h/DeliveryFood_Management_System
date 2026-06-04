import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { customerLabelForm } from '../../lib/customerTheme'

export type PartnerCountryOption = {
  value: string
  label: string
  country: string
}

export const PARTNER_COUNTRIES: PartnerCountryOption[] = [
  { value: 'Kosovë', label: 'Kosovë', country: 'xk' },
  { value: 'Shqipëri', label: 'Shqipëri', country: 'al' },
  { value: 'Maqedoni e Veriut', label: 'Maqedoni e Veriut', country: 'mk' },
  { value: 'Tjetër', label: 'Tjetër', country: '' },
]

const fieldShell =
  'flex min-h-[44px] items-center gap-2.5 rounded-xl border border-white/[0.12] bg-[#1b2233] px-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition focus-within:border-amber-400/45 focus-within:ring-2 focus-within:ring-amber-400/15'

const innerInput =
  'min-w-0 flex-1 border-0 bg-transparent py-2.5 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:ring-0'

const innerSelect =
  'partner-form-select min-w-0 flex-1 cursor-pointer appearance-none border-0 bg-transparent py-2.5 pr-8 text-sm text-zinc-100 outline-none focus:ring-0'

function FlagImg({ country }: { country: string }) {
  if (!country) {
    return (
      <span
        className="flex h-4 w-[22px] shrink-0 items-center justify-center rounded-sm bg-white/10 text-[10px] text-zinc-400"
        aria-hidden
      >
        ···
      </span>
    )
  }
  return (
    <img
      src={`https://flagcdn.com/w40/${country}.png`}
      alt=""
      width={22}
      height={16}
      className="h-4 w-[22px] shrink-0 rounded-sm object-cover"
      loading="lazy"
      decoding="async"
    />
  )
}

export function PartnerFormLabel({
  htmlFor,
  children,
}: {
  htmlFor?: string
  children: ReactNode
}) {
  return (
    <label htmlFor={htmlFor} className={customerLabelForm}>
      {children}
    </label>
  )
}

export function PartnerIconInput({
  id,
  label,
  icon,
  hint,
  required,
  type = 'text',
  value,
  onChange,
  placeholder,
  autoComplete,
}: {
  id: string
  label: string
  icon: ReactNode
  hint?: string
  required?: boolean
  type?: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  autoComplete?: string
}) {
  return (
    <div className="min-w-0">
      <PartnerFormLabel htmlFor={id}>{label}</PartnerFormLabel>
      <div className={`${fieldShell} mt-1.5`}>
        <span className="shrink-0 text-zinc-500" aria-hidden>
          {icon}
        </span>
        <input
          id={id}
          type={type}
          required={required}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          className={innerInput}
        />
      </div>
      {hint ? <p className="mt-1.5 text-xs text-zinc-500">{hint}</p> : null}
    </div>
  )
}

export function PartnerIconSelect({
  id,
  label,
  icon,
  value,
  onChange,
  children,
  required,
}: {
  id: string
  label: string
  icon: ReactNode
  value: string
  onChange: (v: string) => void
  children: ReactNode
  required?: boolean
}) {
  return (
    <div className="min-w-0">
      <PartnerFormLabel htmlFor={id}>{label}</PartnerFormLabel>
      <div className={`${fieldShell} relative mt-1.5`}>
        <span className="shrink-0 text-zinc-500" aria-hidden>
          {icon}
        </span>
        <select
          id={id}
          required={required}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={innerSelect}
        >
          {children}
        </select>
        <span
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500"
          aria-hidden
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </div>
    </div>
  )
}

export function PartnerCountryPicker({
  id: idProp,
  label = 'Vendi',
  value,
  onChange,
}: {
  id?: string
  label?: string
  value: string
  onChange: (v: string) => void
}) {
  const autoId = useId()
  const id = idProp ?? autoId
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  const selected =
    PARTNER_COUNTRIES.find((c) => c.value === value) ?? PARTNER_COUNTRIES[0]

  useEffect(() => {
    if (!open) return
    function onPointerDown(e: PointerEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div className="min-w-0" ref={rootRef}>
      <PartnerFormLabel htmlFor={id}>{label}</PartnerFormLabel>
      <div className={`${fieldShell} relative mt-1.5`}>
        <button
          id={id}
          type="button"
          aria-haspopup="listbox"
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
          className="flex w-full items-center gap-2.5 py-2.5 text-left"
        >
          <FlagImg country={selected.country} />
          <span className="flex-1 text-sm font-medium text-zinc-100">{selected.label}</span>
          <span className="text-zinc-500" aria-hidden>
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className={`transition ${open ? 'rotate-180' : ''}`}
            >
              <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
        </button>
        {open ? (
          <ul
            role="listbox"
            className="absolute left-0 right-0 top-full z-[200] mt-1 overflow-hidden rounded-xl border border-white/[0.12] bg-[#1e2438] py-1 shadow-[0_12px_40px_rgba(0,0,0,0.55)]"
          >
            {PARTNER_COUNTRIES.map((c) => {
              const active = c.value === value
              return (
                <li key={c.value} role="option" aria-selected={active}>
                  <button
                    type="button"
                    className={`flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-sm transition ${
                      active
                        ? 'bg-amber-500/20 font-semibold text-amber-50'
                        : 'text-zinc-200 hover:bg-white/[0.06]'
                    }`}
                    onClick={() => {
                      onChange(c.value)
                      setOpen(false)
                    }}
                  >
                    <FlagImg country={c.country} />
                    <span>{c.label}</span>
                  </button>
                </li>
              )
            })}
          </ul>
        ) : null}
      </div>
    </div>
  )
}

export function PartnerMessageField({
  id,
  label = 'Mesazh (opsional)',
  value,
  onChange,
  placeholder = 'Çfarë dëshironi të na tregoni?',
}: {
  id: string
  label?: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
}) {
  return (
    <div className="min-w-0">
      <PartnerFormLabel htmlFor={id}>{label}</PartnerFormLabel>
      <textarea
        id={id}
        rows={3}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-1.5 min-h-[88px] w-full resize-y rounded-xl border border-white/[0.12] bg-[#1b2233] px-3 py-2.5 text-sm text-zinc-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] outline-none transition placeholder:text-zinc-600 focus:border-amber-400/45 focus:ring-2 focus:ring-amber-400/15"
      />
    </div>
  )
}

export function PartnerSubmitButton({
  busy,
  children = 'Dërgo aplikimin',
}: {
  busy?: boolean
  children?: string
}) {
  return (
    <button
      type="submit"
      disabled={busy}
      className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#f5c518] py-3.5 text-base font-bold text-zinc-900 shadow-[0_4px_28px_rgba(245,197,24,0.32)] transition hover:bg-[#fcd34d] disabled:opacity-50"
    >
      {busy ? 'Duke dërguar…' : children}
      {!busy ? (
        <span className="text-lg leading-none" aria-hidden>
          →
        </span>
      ) : null}
    </button>
  )
}

const iconClass = 'h-5 w-5 shrink-0'

export const partnerIcons = {
  utensils: (
    <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
      <path d="M8 3v8M5 3v5M11 3v5M8 11v2a4 4 0 0 0 8 0v-9" strokeLinecap="round" />
      <path d="M12 14v7" strokeLinecap="round" />
    </svg>
  ),
  mapPin: (
    <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
      <path d="M12 21s7-4.5 7-11a7 7 0 1 0-14 0c0 6.5 7 11 7 11Z" strokeLinecap="round" />
      <circle cx="12" cy="10" r="2.5" />
    </svg>
  ),
  card: (
    <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M3 10h18" />
    </svg>
  ),
  envelope: (
    <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3 7 9 6 9-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  building: (
    <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
      <path d="M4 20V6l8-3v17M12 3v17M12 9h4M12 13h4M16 20V9l4-2v13" strokeLinecap="round" />
    </svg>
  ),
  user: (
    <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
      <circle cx="12" cy="8" r="4" />
      <path d="M5 20c1.5-4 6.5-4 7 0M12 20c.5-4 5.5-4 7 0" strokeLinecap="round" />
    </svg>
  ),
  store: (
    <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
      <path d="M4 10h16M6 10V20h12V10M9 14h6M9 17h4" strokeLinecap="round" />
      <path d="M6 10 4 6h16l-2 4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
}
