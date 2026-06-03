/** Sa mesazhe ka parë admini për çdo tiketë support. */
const MSG_COUNT_KEY = 'admin-support-seen-msg-count'

export function loadAdminSeenMessageCounts(): Record<number, number> {
  try {
    const raw = localStorage.getItem(MSG_COUNT_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as Record<string, number>
    const out: Record<number, number> = {}
    for (const [k, v] of Object.entries(parsed)) {
      const id = Number(k)
      if (Number.isFinite(id) && typeof v === 'number') out[id] = v
    }
    return out
  } catch {
    return {}
  }
}

export function saveAdminSeenMessageCount(ticketId: number, messageCount: number) {
  try {
    const all = loadAdminSeenMessageCounts()
    all[ticketId] = messageCount
    localStorage.setItem(MSG_COUNT_KEY, JSON.stringify(all))
  } catch {
    /* ignore */
  }
}

export function adminTicketHasNewActivity(
  ticketId: number,
  messageCount: number,
  status: number,
  unreadTicketIds: Record<number, boolean>,
): boolean {
  if (status === 3) return false
  if (unreadTicketIds[ticketId]) return true
  const seen = loadAdminSeenMessageCounts()[ticketId] ?? 0
  return messageCount > seen
}

export function isAdminSupportNotificationType(type?: string) {
  const base = (type ?? '').split(':')[0]
  return base === 'support_ticket' || base === 'support_client_reply'
}

export function supportTicketIdFromNotification(data: { ticketId?: number; type?: string }): number | null {
  if (typeof data.ticketId === 'number' && data.ticketId > 0) return data.ticketId
  const type = data.type ?? ''
  const i = type.indexOf(':')
  if (i > 0) {
    const n = Number(type.slice(i + 1))
    return Number.isFinite(n) && n > 0 ? n : null
  }
  return null
}
