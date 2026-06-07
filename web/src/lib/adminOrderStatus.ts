import { formatOrderStatus } from './orderStatusLabels'

export const ORDER_STATUS_PENDING = 0
export const ORDER_STATUS_CONFIRMED = 1
export const ORDER_STATUS_PREPARING = 2
export const ORDER_STATUS_OUT_FOR_DELIVERY = 3
export const ORDER_STATUS_DELIVERED = 4
export const ORDER_STATUS_READY_FOR_PICKUP = 5
export const ORDER_STATUS_CANCELLED = 9

export const ADMIN_ORDER_STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'Të gjitha statuset' },
  { value: '0', label: 'Në pritje' },
  { value: '1', label: 'Konfirmuar' },
  { value: '2', label: 'Në përgatitje' },
  { value: '5', label: 'Gati për marrje' },
  { value: '3', label: 'Në dërgesë' },
  { value: '4', label: 'Dorëzuar' },
  { value: '9', label: 'Anuluar' },
]

export const ADMIN_ORDER_STATUS_EDIT_OPTIONS = ADMIN_ORDER_STATUS_OPTIONS.filter((o) => o.value !== '')

export const PAYMENT_STATUS_SQ: Record<number, string> = {
  0: 'Pagesë në pritje',
  1: 'E kapur',
  2: 'E rimbursuar',
  3: 'Dështoi',
}

export function paymentStatusLabel(s: number): string {
  return PAYMENT_STATUS_SQ[s] ?? `Pagesë ${s}`
}

export function adminOrderStatusBadgeClass(status: number): string {
  switch (status) {
    case ORDER_STATUS_DELIVERED:
      return 'bg-emerald-50 text-emerald-700 ring-emerald-200'
    case ORDER_STATUS_CANCELLED:
      return 'bg-red-50 text-red-700 ring-red-200'
    case ORDER_STATUS_OUT_FOR_DELIVERY:
      return 'bg-sky-50 text-sky-700 ring-sky-200'
    case ORDER_STATUS_PREPARING:
      return 'bg-amber-50 text-amber-800 ring-amber-200'
    case ORDER_STATUS_CONFIRMED:
      return 'bg-orange-50 text-orange-800 ring-orange-200'
    case ORDER_STATUS_READY_FOR_PICKUP:
      return 'bg-violet-50 text-violet-700 ring-violet-200'
    default:
      return 'bg-gray-100 text-gray-700 ring-gray-200'
  }
}

export function adminOrderStatusBadge(status: number): string {
  return `inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${adminOrderStatusBadgeClass(status)}`
}

export function formatAdminOrderStatus(status: number): string {
  return formatOrderStatus(status)
}

export function isOrderInProcess(status: number): boolean {
  return (
    status !== ORDER_STATUS_DELIVERED &&
    status !== ORDER_STATUS_CANCELLED
  )
}

export function canAdminChangeOrderStatus(status: number): boolean {
  return status !== ORDER_STATUS_CANCELLED
}

export function canAdminCancelOrder(status: number): boolean {
  return status !== ORDER_STATUS_CANCELLED && status !== ORDER_STATUS_DELIVERED
}

export function canAdminRefundOrder(
  status: number,
  payments: { status: number }[],
): boolean {
  if (status === ORDER_STATUS_DELIVERED) return false
  return payments.some((p) => p.status === 0 || p.status === 1)
}

export function todayUtcRange(): { fromUtc: string; toUtc: string } {
  const d = new Date()
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, '0')
  const day = String(d.getUTCDate()).padStart(2, '0')
  const date = `${y}-${m}-${day}`
  return {
    fromUtc: `${date}T00:00:00.000Z`,
    toUtc: `${date}T23:59:59.999Z`,
  }
}
