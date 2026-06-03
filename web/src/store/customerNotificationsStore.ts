import { create } from 'zustand'

type SupportToast = { title: string; message: string; ticketId?: number } | null
type OrderToast = { title: string; message: string; orderId?: number } | null

type LastSupportMessage = {
  ticketId: number
  messageId?: number
  authorUserId: number
  authorEmail: string
  isStaffReply: boolean
  body: string
  createdAtUtc: string
} | null

type CustomerNotificationsState = {
  unreadCount: number
  supportToast: SupportToast
  orderToast: OrderToast
  lastSupportMessage: LastSupportMessage
  setUnreadCount: (n: number) => void
  bumpUnread: () => void
  showSupportToast: (t: { title: string; message: string; ticketId?: number }) => void
  clearSupportToast: () => void
  showOrderToast: (t: { title: string; message: string; orderId?: number }) => void
  clearOrderToast: () => void
  setLastSupportMessage: (m: NonNullable<LastSupportMessage>) => void
  clearLastSupportMessage: () => void
  pushSupportMessage: (m: NonNullable<LastSupportMessage>) => void
}

export const useCustomerNotificationsStore = create<CustomerNotificationsState>((set) => ({
  unreadCount: 0,
  supportToast: null,
  orderToast: null,
  lastSupportMessage: null,
  setUnreadCount: (n) => set({ unreadCount: Math.max(0, n) }),
  bumpUnread: () => set((s) => ({ unreadCount: s.unreadCount + 1 })),
  showSupportToast: (t) => set({ supportToast: t }),
  clearSupportToast: () => set({ supportToast: null }),
  showOrderToast: (t) => set({ orderToast: t }),
  clearOrderToast: () => set({ orderToast: null }),
  setLastSupportMessage: (m) => set({ lastSupportMessage: m }),
  clearLastSupportMessage: () => set({ lastSupportMessage: null }),
  pushSupportMessage: (m) =>
    set((s) => ({
      unreadCount: s.unreadCount + 1,
      lastSupportMessage: m,
    })),
}))
