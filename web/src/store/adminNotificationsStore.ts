import { create } from 'zustand'

import type { AdminNotificationRow } from '../lib/adminNotificationsApi'
import { loadAdminSeenMessageCounts, saveAdminSeenMessageCount } from '../lib/adminSupportRead'

type AdminToast = { title: string; message: string; linkPath?: string } | null

const UNREAD_TICKETS_KEY = 'admin-support-unread-tickets'

function loadUnreadTicketIds(): Record<number, boolean> {
  try {
    const raw = localStorage.getItem(UNREAD_TICKETS_KEY)
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

function persistUnreadTicketIds(ids: Record<number, boolean>) {
  try {
    const slim: Record<string, boolean> = {}
    for (const [k, v] of Object.entries(ids)) {
      if (v) slim[String(k)] = true
    }
    localStorage.setItem(UNREAD_TICKETS_KEY, JSON.stringify(slim))
  } catch {
    /* ignore */
  }
}

function countSupportUnread(ids: Record<number, boolean>) {
  return Object.keys(ids).filter((k) => ids[Number(k)]).length
}

type AdminNotificationsState = {
  unreadBump: number
  supportUnreadCount: number
  unreadTicketIds: Record<number, boolean>
  toast: AdminToast
  liveItems: AdminNotificationRow[]
  hydrateSupportUnread: () => void
  markSupportTicketUnread: (ticketId: number) => void
  markSupportTicketRead: (ticketId: number, messageCount?: number) => void
  syncSupportUnreadFromList: (tickets: { id: number; messageCount: number; status: number }[]) => void
  bumpUnread: () => void
  pushLive: (row: AdminNotificationRow) => void
  removeLive: (row: Pick<AdminNotificationRow, 'id' | 'createdAtUtc' | 'title'>) => void
  clearLive: () => void
  showToast: (t: { title: string; message: string; linkPath?: string }) => void
  clearToast: () => void
}

export const useAdminNotificationsStore = create<AdminNotificationsState>((set, get) => ({
  unreadBump: 0,
  supportUnreadCount: countSupportUnread(loadUnreadTicketIds()),
  unreadTicketIds: loadUnreadTicketIds(),
  toast: null,
  liveItems: [],

  hydrateSupportUnread: () => {
    const ids = loadUnreadTicketIds()
    set({ unreadTicketIds: ids, supportUnreadCount: countSupportUnread(ids) })
  },

  markSupportTicketUnread: (ticketId) => {
    const next = { ...get().unreadTicketIds, [ticketId]: true }
    persistUnreadTicketIds(next)
    set({ unreadTicketIds: next, supportUnreadCount: countSupportUnread(next) })
  },

  markSupportTicketRead: (ticketId, messageCount) => {
    if (messageCount != null) saveAdminSeenMessageCount(ticketId, messageCount)
    const next = { ...get().unreadTicketIds }
    delete next[ticketId]
    persistUnreadTicketIds(next)
    set({ unreadTicketIds: next, supportUnreadCount: countSupportUnread(next) })
  },

  syncSupportUnreadFromList: (tickets) => {
    const seen = loadAdminSeenMessageCounts()
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
      persistUnreadTicketIds(next)
      set({ unreadTicketIds: next, supportUnreadCount: countSupportUnread(next) })
    }
  },

  bumpUnread: () => set((s) => ({ unreadBump: s.unreadBump + 1 })),
  pushLive: (row) =>
    set((s) => {
      if (s.liveItems.some((x) => x.id === row.id && row.id > 0)) return s
      if (row.id === 0 && s.liveItems.some((x) => x.title === row.title && x.message === row.message))
        return s
      return { liveItems: [row, ...s.liveItems].slice(0, 30) }
    }),
  removeLive: (row) =>
    set((s) => ({
      liveItems: s.liveItems.filter(
        (x) =>
          !(x.id === row.id && x.id > 0) &&
          !(
            x.id === 0 &&
            row.id === 0 &&
            x.createdAtUtc === row.createdAtUtc &&
            x.title === row.title
          ),
      ),
    })),
  clearLive: () => set({ liveItems: [] }),
  showToast: (t) => set({ toast: t }),
  clearToast: () => set({ toast: null }),
}))
