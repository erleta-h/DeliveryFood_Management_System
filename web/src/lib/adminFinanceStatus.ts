export const PAYMENT_STATUS = {
  pending: 0,
  captured: 1,
  refunded: 2,
  failed: 3,
} as const

export const PAYMENT_STATUS_OPTIONS = [
  { value: '', label: 'Të gjitha' },
  { value: '0', label: 'Në pritje' },
  { value: '1', label: 'E kapur' },
  { value: '2', label: 'E rimbursuar' },
  { value: '3', label: 'Dështoi' },
] as const

export const PAYMENT_PROVIDER_OPTIONS = [
  { value: '', label: 'Të gjitha' },
  { value: 'stripe', label: 'Stripe' },
  { value: 'cod', label: 'COD' },
] as const

export function paymentStatusLabel(status: number): string {
  switch (status) {
    case PAYMENT_STATUS.pending:
      return 'Në pritje'
    case PAYMENT_STATUS.captured:
      return 'E kapur'
    case PAYMENT_STATUS.refunded:
      return 'E rimbursuar'
    case PAYMENT_STATUS.failed:
      return 'Dështoi'
    default:
      return String(status)
  }
}

export function paymentStatusBadgeClass(status: number): string {
  switch (status) {
    case PAYMENT_STATUS.captured:
      return 'bg-emerald-50 text-emerald-700 ring-emerald-200'
    case PAYMENT_STATUS.pending:
      return 'bg-amber-50 text-amber-800 ring-amber-200'
    case PAYMENT_STATUS.refunded:
      return 'bg-sky-50 text-sky-700 ring-sky-200'
    case PAYMENT_STATUS.failed:
      return 'bg-red-50 text-red-700 ring-red-200'
    default:
      return 'bg-gray-100 text-gray-600 ring-gray-200'
  }
}

export function paymentProviderLabel(provider: string): string {
  const p = provider.trim().toLowerCase()
  if (p === 'stripe') return 'Stripe'
  if (p === 'cod') return 'COD'
  return provider
}

export function formatPaymentDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString('sq-AL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return iso
  }
}

export function formatMoneyEur(n: number): string {
  return new Intl.NumberFormat('sq-XK', { style: 'currency', currency: 'EUR' }).format(n)
}
