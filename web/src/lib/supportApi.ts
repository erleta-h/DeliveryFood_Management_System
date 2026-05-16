import { apiPath } from './apiBase'

function authHeader(token: string) {
  return { Authorization: `Bearer ${token}` }
}

export type MySupportTicketRow = {
  id: number
  subject: string
  status: number
  createdAtUtc: string
  updatedAtUtc: string | null
  messageCount: number
}

export type SupportTicketMessageRow = {
  id: number
  authorUserId: number
  authorEmail: string
  isStaffReply: boolean
  body: string
  createdAtUtc: string
}

export type SupportTicketThread = {
  id: number
  userId: number
  userEmail: string
  subject: string
  initialBody: string
  status: number
  createdAtUtc: string
  updatedAtUtc: string | null
  adminNote: string | null
  orderId: number | null
  orderNumber: string | null
  restaurantId: number | null
  restaurantName: string | null
  messages: SupportTicketMessageRow[]
}

export async function fetchMySupportTickets(token: string): Promise<MySupportTicketRow[]> {
  const res = await fetch(apiPath('/api/support/tickets/my'), {
    headers: { ...authHeader(token) },
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json() as Promise<MySupportTicketRow[]>
}

export async function fetchSupportTicketThread(
  token: string,
  ticketId: number,
): Promise<SupportTicketThread | null> {
  const res = await fetch(apiPath(`/api/support/tickets/${ticketId}`), {
    headers: { ...authHeader(token) },
  })
  if (res.status === 404) return null
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json() as Promise<SupportTicketThread>
}

export async function createSupportTicket(
  token: string,
  body: {
    subject: string
    body: string
    orderId?: number | null
    restaurantId?: number | null
  },
): Promise<{ ok: true; id: number } | { ok: false; message: string }> {
  const res = await fetch(apiPath('/api/support/tickets'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeader(token) },
    body: JSON.stringify(body),
  })
  if (res.status === 201) {
    const j = (await res.json()) as { id: number }
    return { ok: true, id: j.id }
  }
  let message = `Gabim ${res.status}`
  try {
    const j = (await res.json()) as { message?: string }
    if (j.message) message = j.message
  } catch {
    /* ignore */
  }
  return { ok: false, message }
}

export async function postSupportTicketMessage(
  token: string,
  ticketId: number,
  body: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const res = await fetch(apiPath(`/api/support/tickets/${ticketId}/messages`), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeader(token) },
    body: JSON.stringify({ body }),
  })
  if (res.status === 204) return { ok: true }
  let message = `Gabim ${res.status}`
  try {
    const j = (await res.json()) as { message?: string }
    if (j.message) message = j.message
  } catch {
    /* ignore */
  }
  return { ok: false, message }
}
