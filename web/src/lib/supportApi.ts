import { apiPath } from './apiBase'

function authHeader(token: string) {
  return { Authorization: `Bearer ${token}` }
}


export const CATEGORY_LABELS: Record<number, string> = {
  0: 'Vonesë',
  1: 'Artikull mungon',
  2: 'Ushqim i gabuar',
  3: 'Rimbursim',
  4: 'Problem me driverin',
  5: 'Problem me pagesë',
  6: 'Tjetër',
}
export const CATEGORY_OPTIONS = Object.entries(CATEGORY_LABELS).map(([v, l]) => ({
  value: Number(v),
  label: l,
}))

export const STATUS_LABELS: Record<number, string> = {
  0: 'Hapur',
  1: 'Në shqyrtim',
  2: 'Zgjidhur',
  3: 'Mbyllur',
}

export const PRIORITY_LABELS: Record<number, string> = {
  0: 'Ulët',
  1: 'Mesatar',
  2: 'Lartë',
  3: 'Urgjent',
}

export const STATUS_COLORS: Record<number, string> = {
  0: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  1: 'bg-sky-500/20 text-sky-300 border-sky-500/30',
  2: 'bg-violet-500/20 text-violet-300 border-violet-500/30',
  3: 'bg-zinc-600/30 text-zinc-400 border-zinc-500/30',
}

export const PRIORITY_COLORS: Record<number, string> = {
  0: 'bg-zinc-600/30 text-zinc-400 border-zinc-500/30',
  1: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  2: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
  3: 'bg-red-500/20 text-red-300 border-red-500/30',
}



export type MySupportTicketRow = {
  id: number
  subject: string
  status: number
  category: number
  priority: number
  createdAtUtc: string
  updatedAtUtc: string | null
  resolvedAtUtc: string | null
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
  category: number
  priority: number
  createdAtUtc: string
  updatedAtUtc: string | null
  resolvedAtUtc: string | null
  adminNote: string | null
  orderId: number | null
  orderNumber: string | null
  restaurantId: number | null
  restaurantName: string | null
  driverId: number | null
  driverName: string | null
  assignedToUserId: number | null
  assignedToEmail: string | null
  messages: SupportTicketMessageRow[]
}

/* ---------- Client API ---------- */

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
    category: number
    orderId?: number | null
    orderNumber?: string | null
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

/* ---------- Admin API ---------- */

export type AdminSupportTicketRow = {
  id: number
  userId: number
  userEmail: string
  subject: string
  body: string
  status: number
  category: number
  priority: number
  createdAtUtc: string
  updatedAtUtc: string | null
  resolvedAtUtc: string | null
  adminNote: string | null
  orderId: number | null
  orderNumber: string | null
  restaurantId: number | null
  restaurantName: string | null
  driverId: number | null
  driverName: string | null
  assignedToUserId: number | null
  assignedToEmail: string | null
  messageCount: number
}

export type AdminTicketListResult = {
  items: AdminSupportTicketRow[]
  total: number
  page: number
  pageSize: number
}

export type SupportTicketAuditRow = {
  id: number
  actorUserId: number
  actorEmail: string
  action: string
  createdAtUtc: string
}

export async function fetchAdminTickets(
  token: string,
  params: {
    page?: number
    pageSize?: number
    search?: string
    sort?: string
    status?: number | null
    category?: number | null
    priority?: number | null
    assignedTo?: number | null
  } = {},
): Promise<AdminTicketListResult> {
  const sp = new URLSearchParams()
  if (params.page) sp.set('page', String(params.page))
  if (params.pageSize) sp.set('pageSize', String(params.pageSize))
  if (params.search) sp.set('search', params.search)
  if (params.sort) sp.set('sort', params.sort)
  if (params.status != null) sp.set('status', String(params.status))
  if (params.category != null) sp.set('category', String(params.category))
  if (params.priority != null) sp.set('priority', String(params.priority))
  if (params.assignedTo != null) sp.set('assignedTo', String(params.assignedTo))
  const res = await fetch(apiPath(`/api/admin/support/tickets?${sp.toString()}`), {
    headers: { ...authHeader(token) },
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json() as Promise<AdminTicketListResult>
}

export async function fetchAdminTicketThread(
  token: string,
  ticketId: number,
): Promise<SupportTicketThread | null> {
  const res = await fetch(apiPath(`/api/admin/support/tickets/${ticketId}`), {
    headers: { ...authHeader(token) },
  })
  if (res.status === 404) return null
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json() as Promise<SupportTicketThread>
}

export async function adminPostStaffReply(
  token: string,
  ticketId: number,
  body: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const res = await fetch(apiPath(`/api/admin/support/tickets/${ticketId}/messages`), {
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

export async function adminAssignTicket(
  token: string,
  ticketId: number,
  agentUserId: number,
): Promise<string | null> {
  const res = await fetch(apiPath(`/api/admin/support/tickets/${ticketId}/assign`), {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...authHeader(token) },
    body: JSON.stringify({ agentUserId }),
  })
  if (res.status === 204) return null
  try {
    const j = (await res.json()) as { message?: string }
    return j.message ?? `Gabim ${res.status}`
  } catch {
    return `Gabim ${res.status}`
  }
}

export async function adminChangeStatus(
  token: string,
  ticketId: number,
  status: number,
): Promise<string | null> {
  const res = await fetch(apiPath(`/api/admin/support/tickets/${ticketId}/status`), {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...authHeader(token) },
    body: JSON.stringify({ status }),
  })
  if (res.status === 204) return null
  try {
    const j = (await res.json()) as { message?: string }
    return j.message ?? `Gabim ${res.status}`
  } catch {
    return `Gabim ${res.status}`
  }
}

export async function adminChangePriority(
  token: string,
  ticketId: number,
  priority: number,
): Promise<string | null> {
  const res = await fetch(apiPath(`/api/admin/support/tickets/${ticketId}/priority`), {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...authHeader(token) },
    body: JSON.stringify({ priority }),
  })
  if (res.status === 204) return null
  try {
    const j = (await res.json()) as { message?: string }
    return j.message ?? `Gabim ${res.status}`
  } catch {
    return `Gabim ${res.status}`
  }
}

export async function adminUpdateNote(
  token: string,
  ticketId: number,
  adminNote: string | null,
  status: number,
): Promise<string | null> {
  const res = await fetch(apiPath(`/api/admin/support/tickets/${ticketId}`), {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...authHeader(token) },
    body: JSON.stringify({ status, adminNote }),
  })
  if (res.status === 204) return null
  try {
    const j = (await res.json()) as { message?: string }
    return j.message ?? `Gabim ${res.status}`
  } catch {
    return `Gabim ${res.status}`
  }
}

export async function fetchAuditTrail(
  token: string,
  ticketId: number,
): Promise<SupportTicketAuditRow[]> {
  const res = await fetch(apiPath(`/api/admin/support/tickets/${ticketId}/audit`), {
    headers: { ...authHeader(token) },
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json() as Promise<SupportTicketAuditRow[]>
}
