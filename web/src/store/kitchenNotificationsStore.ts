import { create } from 'zustand'
import { loadSeenMessageCounts, saveSeenMessageCount } from '../lib/kitchenSupportRead'

export type KitchenSupportMessage = {
  ticketId: number
  title: string
  message: string
  type: string
  createdAtUtc: string
}

type KitchenToast = { title: string; message: string; ticketId?: number } | null

const UNREAD_IDS_KEY = 'kitchen-support-unread-tickets'

function loadUnreadIds(): Record<number, boolean> {
  try {
    const raw = localStorage.getItem(UNREAD_IDS_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as Record<string, boolean>
    const out: Record<number, boolean> = {}
    for (const [k, v] of Object.entries(parsed)) {
      const id = Number(k)
      if (Number.isFinite(id) && v) out[id] = true
    }
    return out
  } catch {
    return {}
  }
}

function persistUnreadIds(ids: Record<number, boolean>) {
  try {
    const slim: Record<string, boolean> = {}
    for (const [k, v] of Object.entries(ids)) {
      if (v) slim[String(k)] = true
    }
    localStorage.setItem(UNREAD_IDS_KEY, JSON.stringify(slim))
  } catch {
    /* ignore */
  }
}

function countUnread(ids: Record<number, boolean>) {
  return Object.keys(ids).filter((k) => ids[Number(k)]).length
}

type KitchenNotificationsState = {
  unreadCount: number
  unreadTicketIds: Record<number, boolean>
  toast: KitchenToast
  lastMessage: KitchenSupportMessage | null
  hydrateUnread: () => void
  markTicketUnread: (ticketId: number) => void
  markTicketRead: (ticketId: number, messageCount?: number) => void
  syncUnreadFromTicketList: (tickets: { id: number; messageCount: number; status: number }[]) => void
  setUnreadCount: (n: number) => void
  showToast: (t: { title: string; message: string; ticketId?: number }) => void
  clearToast: () => void
  pushMessage: (m: KitchenSupportMessage) => void
  clearLastMessage: () => void
}

export const useKitchenNotificationsStore = create<KitchenNotificationsState>((set, get) => ({
  unreadCount: countUnread(loadUnreadIds()),
  unreadTicketIds: loadUnreadIds(),
  toast: null,
  lastMessage: null,

  hydrateUnread: () => {
    const ids = loadUnreadIds()
    set({ unreadTicketIds: ids, unreadCount: countUnread(ids) })
  },

  markTicketUnread: (ticketId) => {
    const next = { ...get().unreadTicketIds, [ticketId]: true }
    persistUnreadIds(next)
    set({ unreadTicketIds: next, unreadCount: countUnread(next) })
  },

  markTicketRead: (ticketId, messageCount) => {
    if (messageCount != null) saveSeenMessageCount(ticketId, messageCount)
    const next = { ...get().unreadTicketIds }
    delete next[ticketId]
    persistUnreadIds(next)
    set({ unreadTicketIds: next, unreadCount: countUnread(next) })
  },

  syncUnreadFromTicketList: (tickets) => {
    const seen = loadSeenMessageCounts()
    const next = { ...get().unreadTicketIds }
    let changed = false
    for (const t of tickets) {
      if (t.status === 3) continue
      const last = seen[t.id] ?? 0
      if (t.messageCount > last && !next[t.id]) {
        next[t.id] = true
        changed = true
      }
    }
    if (changed) {
      persistUnreadIds(next)
      set({ unreadTicketIds: next, unreadCount: countUnread(next) })
    }
  },

  setUnreadCount: (n) => set({ unreadCount: Math.max(0, n) }),

  showToast: (t) => set({ toast: t }),
  clearToast: () => set({ toast: null }),
  pushMessage: (m) => set({ lastMessage: m }),
  clearLastMessage: () => set({ lastMessage: null }),
}))
