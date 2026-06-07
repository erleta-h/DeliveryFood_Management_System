import type { AdminDriverRow } from './adminApi'

export type DriverStatusInfo = { text: string; className: string }

export function driverDisplayName(d: Pick<AdminDriverRow, 'firstName' | 'lastName' | 'email'>): string {
  const name = `${d.firstName} ${d.lastName}`.trim()
  return name || d.email
}

export function driverInitial(d: Pick<AdminDriverRow, 'firstName' | 'lastName' | 'email'>): string {
  return (d.firstName[0] ?? d.email[0] ?? '?').toUpperCase()
}

export function driverStatusInfo(d: Pick<AdminDriverRow, 'userIsActive' | 'isOnline'>): DriverStatusInfo {
  if (!d.userIsActive) return { text: 'Pezulluar', className: 'bg-red-50 text-red-700 ring-red-200' }
  if (d.isOnline) return { text: 'Online', className: 'bg-emerald-50 text-emerald-700 ring-emerald-200' }
  return { text: 'Aktiv', className: 'bg-sky-50 text-sky-700 ring-sky-200' }
}

export function driverStatusBadgeClass(d: Pick<AdminDriverRow, 'userIsActive' | 'isOnline'>): string {
  return `inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${driverStatusInfo(d).className}`
}

export function formatDriverDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('sq-AL', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
  } catch {
    return iso
  }
}

export function formatDriverDateTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString('sq-AL', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return iso
  }
}

export function formatGpsAgo(iso: string | null): string {
  if (!iso) return '—'
  try {
    const diff = Date.now() - new Date(iso).getTime()
    if (diff < 0) return 'Tani'
    const mins = Math.floor(diff / 60_000)
    if (mins < 1) return 'Tani'
    if (mins < 60) return `${mins} min më parë`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs} orë më parë`
    const days = Math.floor(hrs / 24)
    return `${days} ditë më parë`
  } catch {
    return '—'
  }
}

export function vehicleLabel(d: Pick<AdminDriverRow, 'vehicleType' | 'licensePlate'>): string {
  return d.licensePlate ? `${d.vehicleType} · ${d.licensePlate}` : d.vehicleType
}
