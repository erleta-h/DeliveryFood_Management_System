import { fetchWithAuth } from './apiClient'

function authHeader(token: string) {
  return { Authorization: `Bearer ${token}` }
}

export type AdminNotificationRow = {
  id: number
  title: string
  message: string
  type: string
  linkPath: string | null
  createdAtUtc: string
  isRead: boolean
}

export async function fetchAdminNotifications(
  token: string,
  take = 25,
): Promise<AdminNotificationRow[]> {
  const res = await fetchWithAuth(`/api/admin/notifications?take=${take}`, {
    headers: { ...authHeader(token) },
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json() as Promise<AdminNotificationRow[]>
}

export async function fetchAdminNotificationUnreadCount(token: string): Promise<number> {
  const res = await fetchWithAuth('/api/admin/notifications/unread-count', {
    headers: { ...authHeader(token) },
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const j = (await res.json()) as { count: number }
  return j.count
}

export async function markAdminNotificationRead(token: string, id: number): Promise<boolean> {
  const res = await fetchWithAuth(`/api/admin/notifications/${id}/read`, {
    method: 'POST',
    headers: { ...authHeader(token) },
  })
  return res.status === 204
}

export async function markAllAdminNotificationsRead(token: string): Promise<boolean> {
  const res = await fetchWithAuth('/api/admin/notifications/read-all', {
    method: 'POST',
    headers: { ...authHeader(token) },
  })
  return res.status === 204
}
