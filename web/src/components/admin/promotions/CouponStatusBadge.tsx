import type { AdminCouponRow } from '../../../lib/adminApi'
import { getCouponDisplayStatus } from './couponHelpers'

const styles: Record<string, string> = {
  active: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  inactive: 'bg-gray-100 text-gray-600 ring-gray-200',
  expired: 'bg-red-50 text-red-700 ring-red-200',
  scheduled: 'bg-sky-50 text-sky-700 ring-sky-200',
  exhausted: 'bg-amber-50 text-amber-800 ring-amber-200',
}

const labels: Record<string, string> = {
  active: 'Aktiv',
  inactive: 'Jo aktiv',
  expired: 'Skaduar',
  scheduled: 'Planifikuar',
  exhausted: 'Limituar',
}

type Props = Pick<AdminCouponRow, 'isActive' | 'validFrom' | 'validTo' | 'maxUses' | 'usesCount'>

export function CouponStatusBadge(props: Props) {
  const status = getCouponDisplayStatus(props)
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${styles[status]}`}
    >
      {labels[status]}
    </span>
  )
}
