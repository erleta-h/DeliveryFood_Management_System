import { create } from 'zustand'

type SupportToast = { title: string; message: string } | null

type CustomerNotificationsState = {
  unreadCount: number
  supportToast: SupportToast
  setUnreadCount: (n: number) => void
  bumpUnread: () => void
  showSupportToast: (t: { title: string; message: string }) => void
  clearSupportToast: () => void
}

export const useCustomerNotificationsStore = create<CustomerNotificationsState>((set) => ({
  unreadCount: 0,
  supportToast: null,
  setUnreadCount: (n) => set({ unreadCount: Math.max(0, n) }),
  bumpUnread: () => set((s) => ({ unreadCount: s.unreadCount + 1 })),
  showSupportToast: (t) => set({ supportToast: t }),
  clearSupportToast: () => set({ supportToast: null }),
}))
