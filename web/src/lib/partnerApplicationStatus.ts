import type { PartnerApplicationRow, PartnerApplicationStats } from './adminApi'

export const PARTNER_APP_PENDING = 0
export const PARTNER_APP_CONTACTED = 1
export const PARTNER_APP_APPROVED = 2
export const PARTNER_APP_REJECTED = 9

export type PartnerAppStatusFilter = 'all' | 'pending' | 'contacted' | 'approved' | 'rejected'

export function partnerApplicationStatsFromRows(rows: PartnerApplicationRow[]): PartnerApplicationStats {
  return {
    total: rows.length,
    pending: rows.filter((r) => r.status === PARTNER_APP_PENDING).length,
    contacted: rows.filter((r) => r.status === PARTNER_APP_CONTACTED).length,
    approved: rows.filter((r) => r.status === PARTNER_APP_APPROVED).length,
    rejected: rows.filter((r) => r.status === PARTNER_APP_REJECTED).length,
  }
}

export function partnerApplicationStatusLabel(status: number): string {
  switch (status) {
    case PARTNER_APP_PENDING:
      return 'Në pritje'
    case PARTNER_APP_CONTACTED:
      return 'Kontaktuar'
    case PARTNER_APP_APPROVED:
      return 'Miratuar'
    case PARTNER_APP_REJECTED:
      return 'Refuzuar'
    default:
      return `Status ${status}`
  }
}

export function partnerApplicationStatusSubtext(status: number): string {
  switch (status) {
    case PARTNER_APP_PENDING:
      return 'Duke pritur shqyrtim'
    case PARTNER_APP_CONTACTED:
      return 'Kontakt i kryer'
    case PARTNER_APP_APPROVED:
      return 'Restoranti u krijua'
    case PARTNER_APP_REJECTED:
      return 'Aplikim i refuzuar'
    default:
      return ''
  }
}

export function partnerApplicationStatusBadgeClass(status: number): string {
  switch (status) {
    case PARTNER_APP_PENDING:
      return 'bg-amber-100 text-amber-800'
    case PARTNER_APP_CONTACTED:
      return 'bg-sky-100 text-sky-800'
    case PARTNER_APP_APPROVED:
      return 'bg-emerald-100 text-emerald-800'
    case PARTNER_APP_REJECTED:
      return 'bg-red-100 text-red-700'
    default:
      return 'bg-gray-100 text-gray-700'
  }
}

export function partnerCanActOn(status: number): boolean {
  return status !== PARTNER_APP_APPROVED && status !== PARTNER_APP_REJECTED
}

export function formatVenueLocations(label: string | undefined): string {
  if (!label?.trim()) return '1 lokacion'
  const t = label.trim()
  if (/^\d+$/.test(t)) {
    const n = parseInt(t, 10)
    return n === 1 ? '1 lokacion' : `${n} lokacione`
  }
  return t
}

export function partnerAuditEventLabel(eventType: string): string {
  switch (eventType) {
    case 'application_submitted':
      return 'Aplikimi u dërgua'
    case 'marked_as_contacted':
      return 'U shënua si kontaktuar'
    case 'contract_uploaded':
      return 'Kontrata u ngarkua'
    case 'contract_replaced':
      return 'Kontrata u zëvendësua'
    case 'application_approved':
      return 'Aplikimi u miratua'
    case 'application_rejected':
      return 'Aplikimi u refuzua'
    case 'staff_password_reset':
      return 'Fjalëkalimi i stafit u rivendos'
    default:
      return eventType
  }
}

export function partnerCanMarkContacted(status: number): boolean {
  return status === PARTNER_APP_PENDING
}
