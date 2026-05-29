import { create } from 'zustand'

type AdminToast = { title: string; message: string } | null

type AdminNotificationsState = {
  unreadBump: number
  toast: AdminToast
  bumpUnread: () => void
  showToast: (t: { title: string; message: string }) => void
  clearToast: () => void
}

export const useAdminNotificationsStore = create<AdminNotificationsState>((set) => ({
  unreadBump: 0,
  toast: null,
  bumpUnread: () => set((s) => ({ unreadBump: s.unreadBump + 1 })),
  showToast: (t) => set({ toast: t }),
  clearToast: () => set({ toast: null }),
}))
