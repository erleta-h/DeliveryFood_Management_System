/** Sa mesazhe ka parë restoranti për çdo tiketë (për të dalluar përgjigje të reja support). */
const MSG_COUNT_KEY = 'kitchen-support-seen-msg-count'

export function loadSeenMessageCounts(): Record<number, number> {
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

export function saveSeenMessageCount(ticketId: number, messageCount: number) {
  try {
    const all = loadSeenMessageCounts()
    all[ticketId] = messageCount
    localStorage.setItem(MSG_COUNT_KEY, JSON.stringify(all))
  } catch {
    /* ignore */
  }
}

export function ticketHasNewActivity(
  ticketId: number,
  messageCount: number,
  status: number,
  unreadTicketIds: Record<number, boolean>,
): boolean {
  if (status === 3) return false
  if (unreadTicketIds[ticketId]) return true
  const seen = loadSeenMessageCounts()[ticketId] ?? 0
  return messageCount > seen
}
