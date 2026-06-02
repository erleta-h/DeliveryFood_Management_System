import { create } from 'zustand'

import type { AdminNotificationRow } from '../lib/adminNotificationsApi'

type AdminToast = { title: string; message: string; linkPath?: string } | null

type AdminNotificationsState = {
  unreadBump: number
  toast: AdminToast
  /** Njoftime të marra përmes SignalR para/pas sync me API. */
  liveItems: AdminNotificationRow[]
  bumpUnread: () => void
  pushLive: (row: AdminNotificationRow) => void
  removeLive: (row: Pick<AdminNotificationRow, 'id' | 'createdAtUtc' | 'title'>) => void
  clearLive: () => void
  showToast: (t: { title: string; message: string; linkPath?: string }) => void
  clearToast: () => void
}

export const useAdminNotificationsStore = create<AdminNotificationsState>((set) => ({
  unreadBump: 0,
  toast: null,
  liveItems: [],
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
