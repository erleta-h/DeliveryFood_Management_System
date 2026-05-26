import { create } from 'zustand'
import {
  fetchFavoriteRestaurantIds,
  toggleFavoriteRestaurant,
} from '../lib/favoriteRestaurantsApi'

type State = {
  ids: Set<number>
  loaded: boolean
  loading: boolean
  togglingId: number | null
  load: (token: string) => Promise<void>
  toggle: (token: string, restaurantId: number) => Promise<boolean>
  isFavorite: (restaurantId: number) => boolean
  reset: () => void
}

export const useFavoriteRestaurantsStore = create<State>((set, get) => ({
  ids: new Set(),
  loaded: false,
  loading: false,
  togglingId: null,

  isFavorite: (restaurantId) => get().ids.has(restaurantId),

  reset: () => set({ ids: new Set(), loaded: false, loading: false, togglingId: null }),

  load: async (token) => {
    if (get().loading) return
    set({ loading: true })
    try {
      const list = await fetchFavoriteRestaurantIds(token)
      set({ ids: new Set(list), loaded: true })
    } catch {
      set({ loaded: true })
    } finally {
      set({ loading: false })
    }
  },

  toggle: async (token, restaurantId) => {
    const prev = get().ids.has(restaurantId)
    const next = new Set(get().ids)
    if (prev) next.delete(restaurantId)
    else next.add(restaurantId)
    set({ ids: next, togglingId: restaurantId })
    try {
      const isFavorite = await toggleFavoriteRestaurant(token, restaurantId)
      const synced = new Set(get().ids)
      if (isFavorite) synced.add(restaurantId)
      else synced.delete(restaurantId)
      set({ ids: synced })
      return isFavorite
    } catch {
      const rollback = new Set(get().ids)
      if (prev) rollback.add(restaurantId)
      else rollback.delete(restaurantId)
      set({ ids: rollback })
      throw new Error('Nuk u ruajt te preferuarat. Provo përsëri.')
    } finally {
      set({ togglingId: null })
    }
  },
}))
