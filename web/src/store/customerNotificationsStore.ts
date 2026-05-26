import { create } from 'zustand'

export type RealtimeSupportMessage = {
  ticketId: number
  messageId: number
  authorUserId: number
  authorEmail: string
  isStaffReply: boolean
  body: string
  createdAtUtc: string
}

type SupportToast = { title: string; message: string } | null

type CustomerNotificationsState = {
  unreadCount: number
  supportToast: SupportToast
  lastSupportMessage: RealtimeSupportMessage | null
  setUnreadCount: (n: number) => void
  bumpUnread: () => void
  showSupportToast: (t: { title: string; message: string }) => void
  clearSupportToast: () => void
  pushSupportMessage: (m: RealtimeSupportMessage) => void
  clearLastSupportMessage: () => void
}

export const useCustomerNotificationsStore = create<CustomerNotificationsState>((set) => ({
  unreadCount: 0,
  supportToast: null,
  lastSupportMessage: null,
  setUnreadCount: (n) => set({ unreadCount: Math.max(0, n) }),
  bumpUnread: () => set((s) => ({ unreadCount: s.unreadCount + 1 })),
  showSupportToast: (t) => set({ supportToast: t }),
  clearSupportToast: () => set({ supportToast: null }),
  pushSupportMessage: (m) => set({ lastSupportMessage: m }),
  clearLastSupportMessage: () => set({ lastSupportMessage: null }),
}))
