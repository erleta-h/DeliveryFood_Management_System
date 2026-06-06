import type { AdminCouponRow } from '../../lib/adminApi'

export type CouponDisplayStatus = 'active' | 'inactive' | 'expired' | 'scheduled' | 'exhausted'

export function getCouponDisplayStatus(c: Pick<AdminCouponRow, 'isActive' | 'validFrom' | 'validTo' | 'maxUses' | 'usesCount'>, now = new Date()): CouponDisplayStatus {
  const from = c.validFrom ? new Date(c.validFrom) : null
  const to = c.validTo ? new Date(c.validTo) : null
  if (to && to < now) return 'expired'
  if (from && from > now) return 'scheduled'
  if (c.maxUses != null && c.usesCount >= c.maxUses) return 'exhausted'
  if (!c.isActive) return 'inactive'
  return 'active'
}

export function formatCouponValidity(c: Pick<AdminCouponRow, 'validFrom' | 'validTo'>): string {
  const fmt = (iso: string) =>
    new Date(iso).toLocaleDateString('sq-AL', { day: '2-digit', month: '2-digit', year: 'numeric' })
  if (!c.validFrom && !c.validTo) return 'Pa afat'
  if (c.validFrom && c.validTo) return `${fmt(c.validFrom)} – ${fmt(c.validTo)}`
  if (c.validTo) return `Deri ${fmt(c.validTo)}`
  if (c.validFrom) return `Nga ${fmt(c.validFrom)}`
  return 'Pa afat'
}

export function formatCouponValidityShort(c: Pick<AdminCouponRow, 'validFrom' | 'validTo'>, now = new Date()): string {
  const status = getCouponDisplayStatus({ ...c, isActive: true, maxUses: null, usesCount: 0 }, now)
  if (status === 'expired') return 'Skaduar'
  if (!c.validTo) return 'Pa afat'
  return new Date(c.validTo).toLocaleDateString('sq-AL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('sq-AL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/** `datetime-local` value from ISO UTC string (approx local display). */
export function toDateTimeLocalValue(iso: string | null | undefined): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function dateTimeLocalToIso(value: string): string | null {
  const v = value.trim()
  if (!v) return null
  const d = new Date(v)
  return Number.isNaN(d.getTime()) ? null : d.toISOString()
}
