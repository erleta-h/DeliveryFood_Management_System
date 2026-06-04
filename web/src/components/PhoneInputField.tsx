import { useEffect, useId, useMemo, useRef, useState } from 'react'
import {
  combinePhone,
  DEFAULT_PHONE_DIAL,
  formatNationalDigits,
  PHONE_DIAL_OPTIONS,
  PHONE_EXAMPLE_NATIONAL,
  splitPhoneValue,
  type PhoneDialOption,
} from '../lib/phoneInput'
import { customerLabelForm, customerLabelSm } from '../lib/customerTheme'

type Variant = 'customer' | 'partner' | 'driver'

type Props = {
  id?: string
  label?: string
  value: string
  onChange: (full: string) => void
  required?: boolean
  disabled?: boolean
  hint?: string
  example?: string
  variant?: Variant
  className?: string
}

function FlagImg({ country }: { country: string }) {
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

function shellClass(variant: Variant) {
  const focus =
    variant === 'partner'
      ? 'focus-within:border-amber-400/45 focus-within:ring-amber-400/15'
      : 'focus-within:border-violet-500/45 focus-within:ring-violet-500/15'
  return (
    'flex h-11 min-h-[44px] items-stretch overflow-visible rounded-xl border border-white/[0.12] bg-[#1b2233] transition focus-within:ring-2 ' +
    focus
  )
}

const dialShell =
  'relative flex shrink-0 items-center border-r border-white/[0.08] bg-[#1a2030]'

const nationalInputBase =
  'min-w-0 flex-1 border-0 bg-transparent px-3 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 outline-none focus:ring-0'

function labelClass(variant: Variant) {
  return variant === 'customer' ? customerLabelSm : customerLabelForm
}

export function PhoneInputField({
  id: idProp,
  label = 'Telefoni',
  value,
  onChange,
  required,
  disabled,
  hint,
  example = PHONE_EXAMPLE_NATIONAL,
  variant = 'customer',
  className,
}: Props) {
  const autoId = useId()
  const id = idProp ?? autoId
  const nationalId = `${id}-national`

  const { dial, national } = useMemo(() => splitPhoneValue(value), [value])

  function onDialChange(nextDial: string) {
    onChange(combinePhone(nextDial, national))
  }

  function onNationalChange(raw: string) {
    const formatted = formatNationalDigits(raw.replace(/\D/g, ''))
    onChange(combinePhone(dial, formatted))
  }

  const selectedOpt =
    PHONE_DIAL_OPTIONS.find((o) => o.dial === dial) ?? PHONE_DIAL_OPTIONS[0]

  return (
    <div className={className}>
      <label htmlFor={nationalId} className={labelClass(variant)}>
        {label}
      </label>

      <div className={`${shellClass(variant)} mt-1.5 ${disabled ? 'opacity-55' : ''}`}>
        <DialPicker
          id={`${id}-dial`}
          selected={selectedOpt}
          dial={dial}
          disabled={disabled}
          onDialChange={onDialChange}
          variant={variant}
        />
        <input
          id={nationalId}
          type="tel"
          inputMode="tel"
          autoComplete="tel-national"
          required={required}
          disabled={disabled}
          value={national}
          onChange={(e) => onNationalChange(e.target.value)}
          placeholder={example}
          className={nationalInputBase}
          aria-describedby={hint || example ? `${id}-help` : undefined}
        />
      </div>

      <p id={`${id}-help`} className="mt-1.5 text-xs text-zinc-500">
        {hint ? (
          <>
            {hint}
            <span className="mt-1 block text-zinc-600">
              Shembull: <span className="font-medium text-zinc-500">{example}</span>
            </span>
          </>
        ) : (
          <>
            Shembull: <span className="font-medium text-zinc-400">{example}</span>
          </>
        )}
      </p>
    </div>
  )
}

function DialPicker({
  id,
  selected,
  dial,
  disabled,
  onDialChange,
  variant,
}: {
  id: string
  selected: PhoneDialOption
  dial: string
  disabled?: boolean
  onDialChange: (d: string) => void
  variant: Variant
}) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

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
    <div ref={rootRef} className={dialShell}>
      <button
        id={id}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => !disabled && setOpen((o) => !o)}
        className="flex h-full min-w-[108px] items-center gap-1.5 rounded-l-xl py-2 pl-2.5 pr-2 text-left transition hover:bg-white/[0.04] disabled:cursor-not-allowed"
      >
        <FlagImg country={selected.country} />
        <span className="text-sm font-semibold text-zinc-100">{dial}</span>
        <span className="ml-auto text-zinc-500" aria-hidden>
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            className={`transition ${open ? 'rotate-180' : ''}`}
          >
            <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </button>

      {open ? (
        <ul
          role="listbox"
          aria-label="Prefiksi i shtetit"
          className="absolute left-0 top-full z-[200] mt-1 min-w-[168px] overflow-hidden rounded-xl border border-white/[0.12] bg-[#1e2438] py-1 shadow-[0_12px_40px_rgba(0,0,0,0.55)]"
        >
          {PHONE_DIAL_OPTIONS.map((o) => {
            const active = o.dial === dial
            return (
              <li key={o.dial} role="option" aria-selected={active}>
                <button
                  type="button"
                  className={`flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-sm transition ${
                    active
                      ? variant === 'partner'
                        ? 'bg-amber-500/20 font-semibold text-amber-50'
                        : 'bg-violet-600/25 font-semibold text-white'
                      : 'text-zinc-200 hover:bg-white/[0.06]'
                  }`}
                  onClick={() => {
                    onDialChange(o.dial)
                    setOpen(false)
                  }}
                >
                  <FlagImg country={o.country} />
                  <span className="font-semibold tabular-nums">{o.dial}</span>
                  <span className="ml-auto text-xs text-zinc-500">{o.label}</span>
                </button>
              </li>
            )
          })}
        </ul>
      ) : null}
    </div>
  )
}

export function validatePhoneField(value: string): string | null {
  const t = value.trim()
  if (!t) return 'Plotëso numrin e telefonit.'
  if (t.replace(/\D/g, '').length < 8) {
    return 'Numri duhet të ketë të paktën 8 shifra (p.sh. +383 44 123 456).'
  }
  return null
}

export { DEFAULT_PHONE_DIAL, PHONE_EXAMPLE_NATIONAL }
