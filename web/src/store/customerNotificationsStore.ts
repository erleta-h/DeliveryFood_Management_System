import { create } from 'zustand'

type SupportToast = { title: string; message: string } | null

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
  lastSupportMessage: LastSupportMessage
  setUnreadCount: (n: number) => void
  bumpUnread: () => void
  showSupportToast: (t: { title: string; message: string }) => void
  clearSupportToast: () => void
  setLastSupportMessage: (m: NonNullable<LastSupportMessage>) => void
  clearLastSupportMessage: () => void
  /** Shtohet për t'u përdorur te CustomerLayout gjatë pranimit të mesazheve realtime */
  pushSupportMessage: (m: NonNullable<LastSupportMessage>) => void // <-- SHTO KËTË TE TIPI
}

export const useCustomerNotificationsStore = create<CustomerNotificationsState>((set) => ({
  unreadCount: 0,
  supportToast: null,
  lastSupportMessage: null,
  setUnreadCount: (n) => set({ unreadCount: Math.max(0, n) }),
  bumpUnread: () => set((s) => ({ unreadCount: s.unreadCount + 1 })),
  showSupportToast: (t) => set({ supportToast: t }),
  clearSupportToast: () => set({ supportToast: null }),
  setLastSupportMessage: (m) => set({ lastSupportMessage: m }),
  clearLastSupportMessage: () => set({ lastSupportMessage: null }),
  
  pushSupportMessage: (m) => set((s) => ({
    unreadCount: s.unreadCount + 1, // Rrit njoftimet automatikisht
    lastSupportMessage: m           // Përditëson mesazhin e fundit
  })),
}))