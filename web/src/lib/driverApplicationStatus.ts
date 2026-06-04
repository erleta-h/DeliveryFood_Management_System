export const DRIVER_APP_PENDING = 0
export const DRIVER_APP_APPROVED_WAITING = 2
export const DRIVER_APP_ACTIVE = 3
export const DRIVER_APP_REJECTED = 9

export type DriverAppStatusFilter =
  | 'all'
  | 'pending'
  | 'approved_waiting'
  | 'active'
  | 'rejected'

export function statusFilterToApi(f: DriverAppStatusFilter): number | undefined {
  switch (f) {
    case 'pending':
      return DRIVER_APP_PENDING
    case 'approved_waiting':
      return DRIVER_APP_APPROVED_WAITING
    case 'active':
      return DRIVER_APP_ACTIVE
    case 'rejected':
      return DRIVER_APP_REJECTED
    default:
      return undefined
  }
}

export function driverApplicationStatusLabel(status: number): string {
  switch (status) {
    case DRIVER_APP_PENDING:
      return 'Në pritje'
    case DRIVER_APP_APPROVED_WAITING:
      return 'Miratuar'
    case DRIVER_APP_ACTIVE:
      return 'Aktiv'
    case DRIVER_APP_REJECTED:
      return 'Refuzuar'
    default:
      return `Status ${status}`
  }
}

export function driverApplicationStatusSubtext(status: number): string {
  switch (status) {
    case DRIVER_APP_PENDING:
      return 'Duke pritur miratim'
    case DRIVER_APP_APPROVED_WAITING:
      return 'Në pritje aktivizimi'
    case DRIVER_APP_ACTIVE:
      return 'Llogaria aktive'
    case DRIVER_APP_REJECTED:
      return 'Aplikim i refuzuar'
    default:
      return ''
  }
}

export function driverApplicationStatusBadgeClass(status: number): string {
  switch (status) {
    case DRIVER_APP_PENDING:
      return 'bg-amber-100 text-amber-800'
    case DRIVER_APP_APPROVED_WAITING:
      return 'bg-sky-100 text-sky-800'
    case DRIVER_APP_ACTIVE:
      return 'bg-emerald-100 text-emerald-800'
    case DRIVER_APP_REJECTED:
      return 'bg-red-100 text-red-700'
    default:
      return 'bg-gray-100 text-gray-700'
  }
}

export function auditEventLabel(eventType: string): string {
  switch (eventType) {
    case 'application_submitted':
      return 'Aplikimi u dërgua'
    case 'application_approved':
      return 'Aplikimi u miratua'
    case 'application_rejected':
      return 'Aplikimi u refuzua'
    case 'activation_email_sent':
      return 'Email aktivizimi u dërgua'
    case 'activation_email_resent':
      return 'Email aktivizimi u ridërgua'
    case 'account_activated':
      return 'Llogaria u aktivizua'
    default:
      return eventType
  }
}

export const REJECT_REASON_PRESETS = [
  'Incomplete Documentation',
  'Invalid Driver License',
  'Vehicle Requirements Not Met',
  'Other',
] as const
