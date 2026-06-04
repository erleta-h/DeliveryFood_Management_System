import { useId, useMemo, useRef, type KeyboardEvent } from 'react'
import {
  combinePlate,
  formatPlateDigits,
  formatPlateLetters,
  PLATE_EXAMPLE_DISPLAY,
  splitPlateValue,
} from '../lib/licensePlateInput'
import { customerLabelForm } from '../lib/customerTheme'

type Props = {
  id?: string
  label?: string
  value: string
  onChange: (full: string) => void
  disabled?: boolean
  className?: string
}

const shellClass =
  'flex h-12 min-h-[48px] items-stretch overflow-hidden rounded-xl border border-sky-500/35 bg-[#141a28] transition focus-within:border-sky-400/55 focus-within:ring-2 focus-within:ring-sky-500/15'

const segmentClass =
  'w-full min-w-0 border-0 bg-transparent text-center text-base font-semibold tracking-widest text-zinc-100 outline-none placeholder:text-zinc-600 focus:ring-0'

const segmentShellClass =
  'flex min-w-0 flex-1 items-center justify-center bg-[#1c2436] px-1 py-2 transition focus-within:bg-[#243044]'

function RksStrip() {
  return (
    <div
      className="flex w-[3.25rem] shrink-0 flex-col items-center justify-between border-r border-white/10 bg-[#1e4a8c] py-1.5"
      aria-hidden
    >
      <svg viewBox="0 0 24 24" className="h-5 w-5 text-amber-300" fill="currentColor" role="presentation">
        <path d="M12 2l2.2 4.5 5 .7-3.6 3.5.9 5.1L12 13.8 7.5 16.8l.9-5.1L4.8 7.2l5-.7L12 2z" />
      </svg>
      <span className="text-[10px] font-bold tracking-wide text-white">RKS</span>
    </div>
  )
}

export function LicensePlateInputField({
  id: idProp,
  label = 'Targa',
  value,
  onChange,
  disabled,
  className,
}: Props) {
  const autoId = useId()
  const id = idProp ?? autoId
  const ref1 = useRef<HTMLInputElement>(null)
  const ref2 = useRef<HTMLInputElement>(null)
  const ref3 = useRef<HTMLInputElement>(null)

  const { part1, part2, part3 } = useMemo(() => splitPlateValue(value), [value])

  function update(p1: string, p2: string, p3: string) {
    onChange(combinePlate(p1, p2, p3))
  }

  function onPart1(raw: string) {
    const next = formatPlateDigits(raw, 2)
    update(next, part2, part3)
    if (next.length === 2) ref2.current?.focus()
  }

  function onPart2(raw: string) {
    const next = formatPlateDigits(raw, 3)
    update(part1, next, part3)
    if (next.length === 3) ref3.current?.focus()
  }

  function onPart3(raw: string) {
    update(part1, part2, formatPlateLetters(raw, 2))
  }

  function onPart2KeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !part2) {
      e.preventDefault()
      ref1.current?.focus()
    }
  }

  function onPart3KeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !part3) {
      e.preventDefault()
      ref2.current?.focus()
    }
  }

  return (
    <div className={className}>
      <label className={customerLabelForm + ' uppercase tracking-wide'} htmlFor={`${id}-p1`}>
        {label}
      </label>
      <div className={shellClass + (disabled ? ' pointer-events-none opacity-60' : '')}>
        <RksStrip />
        <div className="flex min-w-0 flex-1 items-stretch gap-0 px-2">
          <div className={segmentShellClass}>
            <input
              id={`${id}-p1`}
              ref={ref1}
              type="text"
              inputMode="numeric"
              autoComplete="off"
              maxLength={2}
              placeholder="01"
              className={segmentClass}
              value={part1}
              onChange={(e) => onPart1(e.target.value)}
              disabled={disabled}
              aria-label="Prefektura e targës"
            />
          </div>
          <span className="flex shrink-0 items-center px-0.5 text-zinc-500 select-none" aria-hidden>
            •
          </span>
          <div className={segmentShellClass}>
            <input
              id={`${id}-p2`}
              ref={ref2}
              type="text"
              inputMode="numeric"
              autoComplete="off"
              maxLength={3}
              placeholder="123"
              className={segmentClass}
              value={part2}
              onChange={(e) => onPart2(e.target.value)}
              onKeyDown={onPart2KeyDown}
              disabled={disabled}
              aria-label="Numri i targës"
            />
          </div>
          <span className="flex shrink-0 items-center px-0.5 text-zinc-500 select-none" aria-hidden>
            •
          </span>
          <div className={segmentShellClass}>
            <input
              id={`${id}-p3`}
              ref={ref3}
              type="text"
              autoComplete="off"
              maxLength={2}
              placeholder="AB"
              className={segmentClass}
              value={part3}
              onChange={(e) => onPart3(e.target.value)}
              onKeyDown={onPart3KeyDown}
              disabled={disabled}
              aria-label="Shkronjat e targës"
            />
          </div>
        </div>
      </div>
      <p className="mt-1.5 text-xs text-zinc-500">
        Shembull: {PLATE_EXAMPLE_DISPLAY}
      </p>
    </div>
  )
}

export { validateLicensePlateField } from '../lib/licensePlateInput'
