export type PhoneDialOption = {
  dial: string
  label: string
  /** ISO 3166-1 alpha-2 për flamur (flagcdn). */
  country: string
}

export const PHONE_DIAL_OPTIONS: PhoneDialOption[] = [
  { dial: '+383', label: 'Kosovë', country: 'xk' },
  { dial: '+355', label: 'Shqipëri', country: 'al' },
  { dial: '+389', label: 'MK', country: 'mk' },
  { dial: '+381', label: 'Serbi', country: 'rs' },
]

export const DEFAULT_PHONE_DIAL = '+383'
export const PHONE_EXAMPLE_NATIONAL = '44 202 222'

const DIAL_SORTED = [...PHONE_DIAL_OPTIONS].sort((a, b) => b.dial.length - a.dial.length)

export function formatNationalDigits(digits: string, maxLen = 9): string {
  const d = digits.replace(/\D/g, '').slice(0, maxLen)
  if (d.length <= 2) return d
  if (d.length <= 5) return `${d.slice(0, 2)} ${d.slice(2)}`
  return `${d.slice(0, 2)} ${d.slice(2, 5)} ${d.slice(5)}`
}

export function splitPhoneValue(value: string): { dial: string; national: string } {
  const t = value.trim()
  if (!t) return { dial: DEFAULT_PHONE_DIAL, national: '' }

  for (const opt of DIAL_SORTED) {
    const code = opt.dial.slice(1)
    if (t.startsWith(opt.dial)) {
      return {
        dial: opt.dial,
        national: formatNationalDigits(t.slice(opt.dial.length)),
      }
    }
    if (t.startsWith(code)) {
      return {
        dial: opt.dial,
        national: formatNationalDigits(t.slice(code.length)),
      }
    }
  }

  const digits = t.replace(/\D/g, '')
  if (digits.startsWith('383') && digits.length > 3) {
    return { dial: '+383', national: formatNationalDigits(digits.slice(3)) }
  }

  return { dial: DEFAULT_PHONE_DIAL, national: formatNationalDigits(digits) }
}

export function combinePhone(dial: string, national: string): string {
  const nd = national.replace(/\D/g, '')
  if (!nd) return ''
  return `${dial} ${formatNationalDigits(nd)}`
}

export function nationalDigitCount(national: string): number {
  return national.replace(/\D/g, '').length
}
