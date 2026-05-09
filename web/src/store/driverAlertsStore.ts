import { create } from 'zustand'

export type DriverOfferPayload = { orderId: number; orderNumber: string }

type DriverAlertsState = {
  /** Numër njoftimesh «live» (SignalR) që nuk janë hapur paneli. */
  bellUnread: number
  assignmentToast: DriverOfferPayload | null
  pushAssignmentAlert: (p: DriverOfferPayload) => void
  clearAssignmentToast: () => void
  /** Thirr kur hapet /driver (paneli kryesor). */
  clearBell: () => void
}

export const useDriverAlertsStore = create<DriverAlertsState>((set) => ({
  bellUnread: 0,
  assignmentToast: null,
  pushAssignmentAlert: (p) =>
    set((s) => ({
      assignmentToast: p,
      bellUnread: s.bellUnread + 1,
    })),
  clearAssignmentToast: () => set({ assignmentToast: null }),
  clearBell: () => set({ bellUnread: 0 }),
}))
