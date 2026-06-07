import type { ReactNode } from 'react'
import {
  REVIEW_STATUS_HIDDEN,
  REVIEW_STATUS_PUBLIC,
  REVIEW_STATUS_REPORTED,
  REVIEW_SUBJECT_DRIVER,
  REVIEW_SUBJECT_RESTAURANT,
} from './adminApi'

export const ADMIN_REVIEW_STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'Të gjitha' },
  { value: String(REVIEW_STATUS_PUBLIC), label: 'Publik' },
  { value: String(REVIEW_STATUS_REPORTED), label: 'Raportuar' },
  { value: String(REVIEW_STATUS_HIDDEN), label: 'Fshehur' },
]

export const ADMIN_REVIEW_SUBJECT_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'Të gjitha' },
  { value: String(REVIEW_SUBJECT_RESTAURANT), label: 'Restorant' },
  { value: String(REVIEW_SUBJECT_DRIVER), label: 'Deliver' },
]

export const ADMIN_REVIEW_RATING_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'Të gjitha' },
  { value: '5', label: '5★' },
  { value: '4', label: '4★' },
  { value: '3', label: '3★' },
  { value: '2', label: '2★' },
  { value: '1', label: '1★' },
]

export function reviewSubjectLabel(subject: number): string {
  return subject === REVIEW_SUBJECT_DRIVER ? 'Deliver' : 'Restorant'
}

export function reviewSubjectBadgeClass(subject: number): string {
  return subject === REVIEW_SUBJECT_DRIVER
    ? 'bg-sky-50 text-sky-700 ring-sky-200'
    : 'bg-violet-50 text-violet-700 ring-violet-200'
}

export function reviewStatusLabel(status: number): string {
  switch (status) {
    case REVIEW_STATUS_HIDDEN:
      return 'Fshehur'
    case REVIEW_STATUS_REPORTED:
      return 'Raportuar'
    default:
      return 'Publik'
  }
}

export function reviewStatusBadgeClass(status: number): string {
  switch (status) {
    case REVIEW_STATUS_HIDDEN:
      return 'bg-amber-50 text-amber-800 ring-amber-200'
    case REVIEW_STATUS_REPORTED:
      return 'bg-red-50 text-red-700 ring-red-200'
    default:
      return 'bg-emerald-50 text-emerald-700 ring-emerald-200'
  }
}

export function reviewStatusBadge(status: number): string {
  return `inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${reviewStatusBadgeClass(status)}`
}

export function reviewSubjectBadge(subject: number): string {
  return `inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${reviewSubjectBadgeClass(subject)}`
}

export function StarRating({ rating, className = '' }: { rating: number; className?: string }) {
  const full = Math.max(0, Math.min(5, Math.round(rating)))
  return (
    <span className={`inline-flex gap-0.5 text-base leading-none ${className}`} aria-label={`${rating} nga 5 yje`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} className={i <= full ? 'text-amber-400' : 'text-gray-300'}>
          ★
        </span>
      ))}
    </span>
  )
}

export function renderStarRating(rating: number): string {
  const full = Math.max(0, Math.min(5, Math.round(rating)))
  return `${'★'.repeat(full)}${'☆'.repeat(5 - full)}`
}

export function reviewTargetLabel(row: {
  subject: number
  restaurantName: string | null
  driverDisplayName: string | null
}): string {
  if (row.subject === REVIEW_SUBJECT_DRIVER) return row.driverDisplayName ?? 'Deliver'
  return row.restaurantName ?? '—'
}

export function reviewTargetSubtitle(row: {
  subject: number
  restaurantCity: string | null
}): string {
  if (row.subject === REVIEW_SUBJECT_DRIVER) return '(Deliver)'
  return row.restaurantCity?.trim() || '—'
}

export function formatReviewId(id: number): string {
  return `rev_${id.toString(16)}`
}

export function canHideReview(status: number): boolean {
  return status === REVIEW_STATUS_PUBLIC || status === REVIEW_STATUS_REPORTED
}

export function canRestoreReview(status: number): boolean {
  return status === REVIEW_STATUS_HIDDEN
}

export function formatTrendLine(
  value: number | null,
  opts: { suffix?: string; percent?: boolean; invert?: boolean } = {},
): ReactNode {
  if (value === null || value === 0) return null
  const positive = value > 0
  const good = opts.invert ? !positive : positive
  const tone = good ? 'text-emerald-600' : 'text-red-600'
  const sign = positive ? '+' : ''
  const formatted = opts.percent
    ? `${sign}${value}%`
    : `${sign}${Number(value).toLocaleString('sq-AL', { maximumFractionDigits: 1 })}`
  const text = `${formatted} nga muaji i kaluar`
  return <span className={tone}>{text}</span>
}
