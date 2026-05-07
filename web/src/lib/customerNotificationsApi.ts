import { apiPath } from './apiBase'

function authHeader(token: string) {
  return { Authorization: `Bearer ${token}` }
}

export type CustomerNotificationRow = {
  id: number
  title: string
  message: string
  type: string
  createdAtUtc: string
  isRead: boolean
}

export async function fetchCustomerNotifications(
  token: string,
  take = 30,
): Promise<CustomerNotificationRow[]> {
  const res = await fetch(apiPath(`/api/notifications?take=${take}`), {
    headers: { ...authHeader(token) },
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json() as Promise<CustomerNotificationRow[]>
}

export async function fetchCustomerNotificationUnreadCount(token: string): Promise<number> {
  const res = await fetch(apiPath('/api/notifications/unread-count'), {
    headers: { ...authHeader(token) },
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const j = (await res.json()) as { count: number }
  return j.count
}

export async function markCustomerNotificationRead(token: string, id: number): Promise<boolean> {
  const res = await fetch(apiPath(`/api/notifications/${id}/read`), {
    method: 'POST',
    headers: { ...authHeader(token) },
  })
  return res.status === 204
}

export async function markAllCustomerNotificationsRead(token: string): Promise<boolean> {
  const res = await fetch(apiPath('/api/notifications/read-all'), {
    method: 'POST',
    headers: { ...authHeader(token) },
  })
  return res.status === 204
}
