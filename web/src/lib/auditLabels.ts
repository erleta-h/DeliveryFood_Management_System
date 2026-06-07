import type { AdminAuditRow } from './adminApi'

export type AuditActorType = 'admin' | 'user' | 'kitchen' | 'security' | 'system'

const ACTION_LABELS: Record<string, string> = {
  'user.change_password': 'User ndryshoi fjalëkalimin',
  'admin.partner.reset_staff_password': 'Admin resetoi fjalëkalimin e stafit',
  'kitchen.order.rejected': 'Restoranti refuzoi porosinë',
  'auth.login.success': 'Login i suksesshëm',
  'auth.login.failed': 'Failed login attempt',
  'auth.password.reset': 'Password reset',
  'auth.account.locked': 'Llogaria u bllokua',
  'system.audit.sync': 'System audit sync',
  'security.rule.trigger': 'Security rule trigger',
  'admin.settings.updated': 'Admin përditësoi konfigurimin',
  'admin.coupon.created': 'Admin krijoi kupon',
  'admin.coupon.updated': 'Admin përditësoi kupon',
}

const ACTOR_BADGE: Record<
  AuditActorType,
  { label: string; className: string }
> = {
  admin: { label: 'ADMIN', className: 'bg-violet-100 text-violet-800' },
  user: { label: 'USER', className: 'bg-sky-100 text-sky-800' },
  kitchen: { label: 'KITCHEN', className: 'bg-orange-100 text-orange-800' },
  security: { label: 'SECURITY', className: 'bg-red-100 text-red-800' },
  system: { label: 'SYSTEM', className: 'bg-emerald-100 text-emerald-800' },
}

function humanizeAction(action: string): string {
  return action
    .split(/[._]/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

export function formatAuditAction(action: string): string {
  return ACTION_LABELS[action] ?? humanizeAction(action)
}

export function getAuditActorType(row: AdminAuditRow): AuditActorType {
  const a = row.action.toLowerCase()
  if (a.startsWith('admin.')) return 'admin'
  if (a.startsWith('kitchen.')) return 'kitchen'
  if (a.startsWith('security.') || isFailedLoginAction(row.action) || isAccountLockedAction(row.action))
    return 'security'
  if (a.startsWith('system.')) return 'system'
  if (a.startsWith('user.') || a.startsWith('auth.')) return 'user'
  return 'system'
}

export function getAuditActorBadge(type: AuditActorType) {
  return ACTOR_BADGE[type]
}

/** Entity line e.g. User #16 (owner@restaurant.com) */
export function formatAuditEntity(row: AdminAuditRow): string {
  const id = row.entityId ? `#${row.entityId}` : ''
  const base = `${row.entity}${id ? ` ${id}` : ''}`.trim()

  if (row.entity === 'User' && row.userEmail) {
    const local = row.userEmail.split('@')[0]?.replace(/[._]/g, ' ')
    const name = local
      ? local
          .split(' ')
          .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
          .join(' ')
      : row.userEmail
    return `${base} (${name})`
  }

  if (row.entity === 'Order' && row.action === 'kitchen.order.rejected') {
    return `${base} (Kitchen)`
  }

  if (row.userEmail && row.entity !== 'User') {
    return `${base} (${row.userEmail.split('@')[0]})`
  }

  return base || '—'
}

export function formatAuditDevice(_row: AdminAuditRow): { label: string; icon: 'desktop' | 'mobile' | 'unknown' } {
  // Device is not persisted in audit API — show neutral web client placeholder.
  return { label: 'Web', icon: 'desktop' }
}

export function isLoginAction(action: string): boolean {
  const a = action.toLowerCase()
  return a.includes('login') && !a.includes('failed')
}

export function isFailedLoginAction(action: string): boolean {
  return action.toLowerCase().includes('login') && action.toLowerCase().includes('failed')
}

export function isPasswordResetAction(action: string): boolean {
  const a = action.toLowerCase()
  return a.includes('password') && (a.includes('reset') || a.includes('change'))
}

export function isAccountLockedAction(action: string): boolean {
  return action.toLowerCase().includes('locked')
}

export function isCriticalAction(action: string): boolean {
  const a = action.toLowerCase()
  return (
    a.startsWith('security.') ||
    isFailedLoginAction(action) ||
    isAccountLockedAction(action) ||
    a.includes('trigger')
  )
}

export function isAdminAction(action: string): boolean {
  return action.toLowerCase().startsWith('admin.')
}

export const AUDIT_ACTION_FILTER_OPTIONS = [
  { value: '', label: 'Të gjitha veprimet' },
  { value: 'login', label: 'Login' },
  { value: 'password', label: 'Password' },
  { value: 'order', label: 'Porosi' },
  { value: 'admin', label: 'Admin' },
  { value: 'security', label: 'Security' },
]

export const AUDIT_ROLE_FILTER_OPTIONS = [
  { value: '', label: 'Të gjithë rolet' },
  { value: 'admin', label: 'Admin' },
  { value: 'user', label: 'User' },
  { value: 'kitchen', label: 'Kitchen' },
  { value: 'security', label: 'Security' },
  { value: 'system', label: 'System' },
]

export function matchesActionFilter(action: string, filter: string): boolean {
  if (!filter) return true
  const a = action.toLowerCase()
  if (filter === 'login') return a.includes('login')
  if (filter === 'password') return a.includes('password')
  if (filter === 'order') return a.includes('order')
  if (filter === 'admin') return a.startsWith('admin.')
  if (filter === 'security') return a.startsWith('security.') || isFailedLoginAction(action)
  return true
}
