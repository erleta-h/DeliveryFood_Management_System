import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type CartLine = {
  menuItemId: number
  name: string
  unitPrice: number
  quantity: number
}

type CartState = {
  restaurantId: number | null
  restaurantName: string
  /** Tarifë dërgese për restorantin e shportës (nga API / lista). */
  deliveryFee: number | null
  lines: CartLine[]
  setRestaurant: (id: number, name: string, deliveryFee?: number | null) => void
  setDeliveryFee: (fee: number | null) => void
  addLine: (line: Omit<CartLine, 'quantity'> & { quantity?: number }) => void
  setQty: (menuItemId: number, quantity: number) => void
  removeLine: (menuItemId: number) => void
  clear: () => void
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      restaurantId: null,
      restaurantName: '',
      deliveryFee: null,
      lines: [],
      setRestaurant: (id, name, deliveryFee) =>
        set((s) => {
          if (s.restaurantId === id) {
            return {
              restaurantName: name,
              ...(deliveryFee !== undefined ? { deliveryFee } : {}),
            }
          }
          return {
            restaurantId: id,
            restaurantName: name,
            lines: [],
            deliveryFee: deliveryFee !== undefined ? deliveryFee : null,
          }
        }),
      setDeliveryFee: (fee) => set({ deliveryFee: fee }),
      addLine: ({ menuItemId, name, unitPrice, quantity = 1 }) => {
        const { lines } = get()
        const i = lines.findIndex((l) => l.menuItemId === menuItemId)
        if (i >= 0) {
          const next = [...lines]
          next[i] = { ...next[i], quantity: next[i].quantity + quantity }
          set({ lines: next })
          return
        }
        set({ lines: [...lines, { menuItemId, name, unitPrice, quantity }] })
      },
      setQty: (menuItemId, quantity) => {
        if (quantity <= 0) {
          get().removeLine(menuItemId)
          return
        }
        set({
          lines: get().lines.map((l) =>
            l.menuItemId === menuItemId ? { ...l, quantity } : l,
          ),
        })
      },
      removeLine: (menuItemId) =>
        set({ lines: get().lines.filter((l) => l.menuItemId !== menuItemId) }),
      clear: () =>
        set({ lines: [], restaurantId: null, restaurantName: '', deliveryFee: null }),
    }),
    { name: 'fd_cart' },
  ),
)
