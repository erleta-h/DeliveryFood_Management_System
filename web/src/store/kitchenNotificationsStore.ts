import { create } from 'zustand'

export type KitchenSupportMessage = {
  ticketId: number
  title: string
  message: string
  type: string
  createdAtUtc: string
}

type KitchenToast = { title: string; message: string } | null

type KitchenNotificationsState = {
  unreadCount: number
  toast: KitchenToast
  lastMessage: KitchenSupportMessage | null
  bumpUnread: () => void
  setUnreadCount: (n: number) => void
  showToast: (t: { title: string; message: string }) => void
  clearToast: () => void
  pushMessage: (m: KitchenSupportMessage) => void
  clearLastMessage: () => void
}

export const useKitchenNotificationsStore = create<KitchenNotificationsState>((set) => ({
  unreadCount: 0,
  toast: null,
  lastMessage: null,
  bumpUnread: () => set((s) => ({ unreadCount: s.unreadCount + 1 })),
  setUnreadCount: (n) => set({ unreadCount: Math.max(0, n) }),
  showToast: (t) => set({ toast: t }),
  clearToast: () => set({ toast: null }),
  pushMessage: (m) => set({ lastMessage: m }),
  clearLastMessage: () => set({ lastMessage: null }),
}))
