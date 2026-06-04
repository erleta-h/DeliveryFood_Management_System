/** Formati i targës së Kosovës: 2 shifra · 3 shifra · 2 shkronja (p.sh. 01 123 AB). */

export const PLATE_EXAMPLE_DISPLAY = '01 • 123 • AB'
export const PLATE_SEGMENT_LENS = [2, 3, 2] as const

export type PlateSegments = {
  part1: string
  part2: string
  part3: string
}

export function formatPlateDigits(raw: string, maxLen: number): string {
  return raw.replace(/\D/g, '').slice(0, maxLen)
}

export function formatPlateLetters(raw: string, maxLen: number): string {
  return raw
    .replace(/[^a-zA-Z]/g, '')
    .toUpperCase()
    .slice(0, maxLen)
}

export function splitPlateValue(value: string): PlateSegments {
  const t = value.trim().toUpperCase()
  if (!t) return { part1: '', part2: '', part3: '' }

  const compact = t.replace(/[\s.\-•]+/g, '')
  const m = compact.match(/^(\d{0,2})(\d{0,3})([A-Z]{0,2})/)
  if (m) {
    return {
      part1: m[1] ?? '',
      part2: m[2] ?? '',
      part3: m[3] ?? '',
    }
  }

  const digits = t.replace(/\D/g, '')
  const letters = t.replace(/[^A-Z]/g, '')
  return {
    part1: digits.slice(0, 2),
    part2: digits.slice(2, 5),
    part3: letters.slice(0, 2),
  }
}

export function combinePlate(part1: string, part2: string, part3: string): string {
  const p1 = formatPlateDigits(part1, 2)
  const p2 = formatPlateDigits(part2, 3)
  const p3 = formatPlateLetters(part3, 2)
  if (!p1 && !p2 && !p3) return ''
  return [p1, p2, p3].filter(Boolean).join(' ')
}

export function isPlateComplete(value: string): boolean {
  const { part1, part2, part3 } = splitPlateValue(value)
  return /^\d{2}$/.test(part1) && /^\d{3}$/.test(part2) && /^[A-Z]{2}$/.test(part3)
}

export function plateHasPartialValue(value: string): boolean {
  const { part1, part2, part3 } = splitPlateValue(value)
  return Boolean(part1 || part2 || part3)
}

export function validateLicensePlateField(value: string, required = false): string | null {
  const t = value.trim()
  if (!t) return required ? 'Plotëso targën.' : null
  if (!plateHasPartialValue(t)) return null
  if (!isPlateComplete(t)) {
    return `Targa duhet të jetë në formatin ${PLATE_EXAMPLE_DISPLAY}.`
  }
  return null
}
