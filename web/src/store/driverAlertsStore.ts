import { create } from 'zustand'

export type DriverOfferPayload = { orderId: number; orderNumber: string }

type DriverAlertsState = {
  bellUnread: number
  chatUnread: number
  assignmentToast: DriverOfferPayload | null
  pushAssignmentAlert: (p: DriverOfferPayload) => void
  clearAssignmentToast: () => void
  clearBell: () => void
  incrementChatUnread: () => void
  clearChatUnread: () => void
}

export const useDriverAlertsStore = create<DriverAlertsState>((set) => ({
  bellUnread: 0,
  chatUnread: 0,
  assignmentToast: null,
  pushAssignmentAlert: (p) =>
    set((s) => ({
      assignmentToast: p,
      bellUnread: s.bellUnread + 1,
    })),
  clearAssignmentToast: () => set({ assignmentToast: null }),
  clearBell: () => set({ bellUnread: 0 }),
  incrementChatUnread: () => set((s) => ({ chatUnread: s.chatUnread + 1, bellUnread: s.bellUnread + 1 })),
  clearChatUnread: () => set({ chatUnread: 0 }),
}))
