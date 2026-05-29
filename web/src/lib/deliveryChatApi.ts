import { apiPath } from './apiBase'

export type DeliveryChatMessage = {
  id: number
  orderId: number
  senderUserId: number
  senderRole: string
  body: string
  createdAtUtc: string
  isDelivered: boolean
  seenAtUtc: string | null
}

/** Hub-i / JSON ndonjëherë dërgon PascalCase — normalizo për krahasim dhe UI. */
export function normalizeDeliveryChatMessage(raw: unknown): DeliveryChatMessage | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  const id = Number(r.id ?? r.Id)
  const orderId = Number(r.orderId ?? r.OrderId)
  const senderUserId = Number(r.senderUserId ?? r.SenderUserId)
  const senderRole = String(r.senderRole ?? r.SenderRole ?? '')
  const body = String(r.body ?? r.Body ?? '')
  const createdAtUtc = String(r.createdAtUtc ?? r.CreatedAtUtc ?? '')
  const isDelivered = Boolean(r.isDelivered ?? r.IsDelivered ?? false)
  const seenRaw = r.seenAtUtc ?? r.SeenAtUtc ?? null
  const seenAtUtc = seenRaw ? String(seenRaw) : null
  if (!Number.isFinite(id) || !Number.isFinite(orderId) || !Number.isFinite(senderUserId)) return null
  return { id, orderId, senderUserId, senderRole, body, createdAtUtc, isDelivered, seenAtUtc }
}

function authHeader(token: string) {
  return { Authorization: `Bearer ${token}` }
}

export async function fetchDeliveryChatMessages(
  token: string,
  orderId: number,
): Promise<DeliveryChatMessage[]> {
  const res = await fetch(apiPath(`/api/orders/${orderId}/delivery-chat/messages`), {
    headers: { ...authHeader(token) },
  })
  if (!res.ok) {
    let msg = `HTTP ${res.status}`
    try {
      const j = (await res.json()) as { message?: string }
      if (j.message) msg = j.message
    } catch {
      /* ignore */
    }
    throw new Error(msg)
  }
  return res.json() as Promise<DeliveryChatMessage[]>
}

export async function postDeliveryChatMessage(
  token: string,
  orderId: number,
  body: string,
): Promise<{ ok: true; message: DeliveryChatMessage } | { ok: false; message: string }> {
  const res = await fetch(apiPath(`/api/orders/${orderId}/delivery-chat/messages`), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeader(token) },
    body: JSON.stringify({ body }),
  })
  if (res.ok) {
    const msg = (await res.json()) as DeliveryChatMessage
    return { ok: true, message: msg }
  }
  let message = `HTTP ${res.status}`
  try {
    const j = (await res.json()) as { message?: string }
    if (j.message) message = j.message
  } catch {
    /* ignore */
  }
  return { ok: false, message }
}

export async function markChatSeen(token: string, orderId: number): Promise<void> {
  await fetch(apiPath(`/api/orders/${orderId}/delivery-chat/mark-seen`), {
    method: 'POST',
    headers: { ...authHeader(token) },
  })
}
