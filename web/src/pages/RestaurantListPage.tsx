import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { CategoryBrowseCarousel } from '../components/CategoryBrowseCarousel'
import { DeliveryLocationMapDialog } from '../components/DeliveryLocationMapDialog'
import { RestaurantDiscoveryRow } from '../components/RestaurantDiscoveryRow'
import { RestaurantBrowseToolbar } from '../components/RestaurantBrowseToolbar'
import { RestaurantSearchBar } from '../components/RestaurantSearchBar'
import { customerCard } from '../lib/customerTheme'
import {
  applyClientRestaurantFilters,
  OPEN_NOW_MAX_MINUTES,
  sortSummaryLabel,
  type PriceTierOption,
  type SortOption,
} from '../lib/restaurantFilters'
import {
  fetchRestaurantCategories,
  searchRestaurants,
  type FoodCategoryOption,
  type RestaurantListItem,
} from '../lib/restaurantsApi'

function useDebounced<T>(value: T, ms: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(value), ms)
    return () => window.clearTimeout(t)
  }, [value, ms])
  return debounced
}

export default function RestaurantListPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [entryDeliveryMapOpen, setEntryDeliveryMapOpen] = useState(false)
  const openedFromDeliveryQuery = useRef(false)

  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounced(search, 320)
  const [categoryId, setCategoryId] = useState<number | null>(null)
  const [categories, setCategories] = useState<FoodCategoryOption[]>([])
  const [items, setItems] = useState<RestaurantListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [sortBy, setSortBy] = useState<SortOption>('rating')
  const [customerGeo, setCustomerGeo] = useState<{ lat: number; lng: number } | null>(null)
  const [priceTier, setPriceTier] = useState<PriceTierOption>('all')
  const [openNow, setOpenNow] = useState(false)

  const displayedItems = useMemo(
    () => applyClientRestaurantFilters(items, priceTier, openNow),
    [items, priceTier, openNow],
  )

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const cats = await fetchRestaurantCategories()
        if (!cancelled) setCategories(cats)
      } catch {
        if (!cancelled) setCategories([])
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (openedFromDeliveryQuery.current) return
    if (searchParams.get('openDeliveryMap') !== '1') return
    openedFromDeliveryQuery.current = true
    setEntryDeliveryMapOpen(true)
    const next = new URLSearchParams(searchParams)
    next.delete('openDeliveryMap')
    setSearchParams(next, { replace: true })
  }, [searchParams, setSearchParams])

  useEffect(() => {
    if (sortBy !== 'proximity') return
    if (customerGeo) return
    if (!navigator.geolocation) {
      setError('Shfletuesi nuk ofron GPS — zgjidh rend tjetër.')
      setSortBy('rating')
      return
    }
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setCustomerGeo({ lat: p.coords.latitude, lng: p.coords.longitude })
        setError(null)
      },
      () => {
        setError('Lejo lokacionin për «afër meje», ose zgjidh rend tjetër.')
        setSortBy('rating')
      },
      { enableHighAccuracy: false, timeout: 14_000, maximumAge: 120_000 },
    )
  }, [sortBy, customerGeo])

  useEffect(() => {
    const controller = new AbortController()
    let active = true
    if (sortBy === 'proximity' && !customerGeo) {
      setLoading(true)
      return () => controller.abort()
    }
    setLoading(true)
    setError(null)
    searchRestaurants(debouncedSearch, categoryId, sortBy, controller.signal, customerGeo)
      .then((list) => {
        if (!active) return
        setItems(
          list.map((x) => ({
            ...x,
            previewItems: x.previewItems ?? [],
          })),
        )
      })
      .catch((e: unknown) => {
        if (!active || (e as Error).name === 'AbortError') return
        setError(
          e instanceof Error
            ? e.message
            : 'Nuk u ngarkuan restorantet. Sigurohu që API po punon (dotnet run) dhe rifresko.',
        )
        setItems([])
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
      controller.abort()
    }
  }, [debouncedSearch, categoryId, sortBy, customerGeo])

  return (
    <section className={customerCard}>
      <div className="flex flex-col gap-5 sm:gap-6">
        <div className="flex flex-col gap-3 sm:gap-3.5">
          <h1 className="text-2xl font-bold tracking-tight text-zinc-100 sm:text-3xl">
            Të gjitha restorantet
          </h1>
          <RestaurantSearchBar
            value={search}
            onChange={setSearch}
            placeholder="Kërko sipas emrit të restorantit, qytetit / adresës ose kategorisë së ushqimit."
          />
        </div>

        <div className="rounded-xl border border-white/[0.08] bg-[#252b3d]/90 p-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] backdrop-blur-sm sm:rounded-2xl sm:p-3">
          <RestaurantBrowseToolbar
            categories={categories}
            categoryId={categoryId}
            onCategoryChange={setCategoryId}
            sortBy={sortBy}
            onSortChange={setSortBy}
            priceTier={priceTier}
            onPriceTierChange={setPriceTier}
            openNow={openNow}
            onOpenNowChange={setOpenNow}
          />
          <CategoryBrowseCarousel
            categories={categories}
            categoryId={categoryId}
            onSelectCategory={setCategoryId}
          />
        </div>

        {error ? (
          <p className="rounded-xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-sm text-amber-100/90">
            {error}
          </p>
        ) : null}

        {!loading && !error ? (
          <p className="text-xs leading-relaxed text-zinc-500">
            {sortSummaryLabel(sortBy)}
            {priceTier !== 'all' || openNow
              ? ` Filtrat lokalë: ${[
                  openNow ? `hapur tani (≤${OPEN_NOW_MAX_MINUTES} min)` : null,
                  priceTier !== 'all'
                    ? priceTier === 'low'
                      ? 'dërgesë e ulët'
                      : priceTier === 'medium'
                        ? 'dërgesë mesatare'
                        : 'dërgesë më e lartë'
                    : null,
                ]
                  .filter(Boolean)
                  .join(' · ')}.`
              : ''}{' '}
            <span className="text-zinc-400">
              {displayedItems.length === items.length
                ? `${displayedItems.length} restorant${displayedItems.length === 1 ? '' : 'e'}.`
                : `${displayedItems.length} nga ${items.length} restorante (pas filtrave).`}
            </span>
          </p>
        ) : null}

        {loading ? (
          <p className="text-sm text-zinc-500">Duke ngarkuar…</p>
        ) : displayedItems.length === 0 ? (
          <p className="text-sm text-zinc-500">
            Nuk u gjet asnjë restorant për këtë kërkim ose filtra.
          </p>
        ) : (
          <div className="rounded-2xl border border-white/[0.08] bg-[#1a1f2e]/70 px-2 py-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] backdrop-blur-sm sm:px-4">
            {displayedItems.map((r) => (
              <RestaurantDiscoveryRow key={r.id} restaurant={r} />
            ))}
          </div>
        )}
      </div>

      <DeliveryLocationMapDialog
        open={entryDeliveryMapOpen}
        onClose={() => setEntryDeliveryMapOpen(false)}
        title="Ku të dorozohet porosia?"
        description="Zgjedh vendin në hartë ose zhvendos pin-in. Ruaj — adresa përdoret për dërgesë dhe renditje «afër meje»."
      />
    </section>
  )
}
