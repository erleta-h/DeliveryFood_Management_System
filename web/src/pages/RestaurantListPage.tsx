import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { CategoryBrowseCarousel } from '../components/CategoryBrowseCarousel'
import { DeliveryLocationMapDialog } from '../components/DeliveryLocationMapDialog'
import { RestaurantCardSkeleton } from '../components/RestaurantCardSkeleton'
import { RestaurantFilterChips } from '../components/RestaurantFilterChips'
import { RestaurantHero } from '../components/RestaurantHero'
import { RestaurantSearchBar } from '../components/RestaurantSearchBar'
import { RestaurantSection } from '../components/RestaurantSection'
import {
  applyClientRestaurantFilters,
  applyQuickFilters,
  OPEN_NOW_MAX_MINUTES,
  sortSummaryLabel,
  type PriceTierOption,
  type QuickFilterId,
  type SortOption,
} from '../lib/restaurantFilters'
import {
  buildBrowseSections,
  computeHeroStats,
} from '../lib/restaurantBrowseSections'
import {
  fetchRestaurantCategories,
  searchRestaurants,
  type FoodCategoryOption,
  type RestaurantListItem,
} from '../lib/restaurantsApi'
import { useAuthStore } from '../store/authStore'

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
  const filtersRef = useRef<HTMLDivElement>(null)

  const user = useAuthStore((s) => s.user)
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
  const [quickFilters, setQuickFilters] = useState<Set<QuickFilterId>>(new Set())

  const displayedItems = useMemo(() => {
    let list = applyClientRestaurantFilters(items, priceTier, openNow)
    list = applyQuickFilters(list, quickFilters)
    return list
  }, [items, priceTier, openNow, quickFilters])

  const heroStats = useMemo(() => computeHeroStats(items), [items])
  const sections = useMemo(() => buildBrowseSections(displayedItems), [displayedItems])

  const searchSuggestions = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (q.length < 2) return []
    return items.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.categoryName.toLowerCase().includes(q) ||
        (r.city?.toLowerCase().includes(q) ?? false),
    )
  }, [search, items])

  function toggleQuick(id: QuickFilterId) {
    setQuickFilters((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

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
            minOrderAmount: x.minOrderAmount ?? 0,
          })),
        )
      })
      .catch((e: unknown) => {
        if (!active || (e as Error).name === 'AbortError') return
        setError(
          e instanceof Error
            ? e.message
            : 'Nuk u ngarkuan restorantet. Sigurohu që API po punon dhe rifresko.',
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
    <div className="flex flex-col gap-6 sm:gap-8">
      <RestaurantHero
        stats={heroStats}
        cityLabel={user?.city ?? undefined}
        onOpenDeliveryMap={() => setEntryDeliveryMapOpen(true)}
        searchSlot={
          <RestaurantSearchBar
            value={search}
            onChange={setSearch}
            suggestions={searchSuggestions}
            onPickSuggestion={setSearch}
            onOpenFilters={() =>
              filtersRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
            }
          />
        }
      />

      <div ref={filtersRef} className="space-y-4">
        <RestaurantFilterChips
          quickFilters={quickFilters}
          onToggleQuick={toggleQuick}
          sortBy={sortBy}
          onSortChange={setSortBy}
          priceTier={priceTier}
          onPriceTierChange={setPriceTier}
          openNow={openNow}
          onOpenNowChange={setOpenNow}
          categories={categories}
          categoryId={categoryId}
          onCategoryChange={setCategoryId}
        />
        <div className="rounded-2xl border border-white/[0.08] bg-[#1a1f2e]/50 p-3 backdrop-blur-sm sm:p-4">
          <CategoryBrowseCarousel
            categories={categories}
            categoryId={categoryId}
            onSelectCategory={setCategoryId}
          />
        </div>
      </div>

      {error ? (
        <p className="rounded-xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-sm text-amber-100/90">
          {error}
        </p>
      ) : null}

      {!loading && !error ? (
        <p className="text-xs text-zinc-500">
          {sortSummaryLabel(sortBy)}
          {priceTier !== 'all' || openNow || quickFilters.size > 0
            ? ` · ${[
                openNow ? `hapët (≤${OPEN_NOW_MAX_MINUTES} min)` : null,
                quickFilters.size > 0 ? `${quickFilters.size} filtër të shpejtë` : null,
              ]
                .filter(Boolean)
                .join(' · ')}`
            : ''}{' '}
          <span className="text-zinc-400">
            {displayedItems.length} restorant{displayedItems.length === 1 ? '' : 'e'}
          </span>
        </p>
      ) : null}

      {loading ? (
        <div className="space-y-8">
          <div className="flex gap-3 overflow-hidden">
            <RestaurantCardSkeleton />
            <RestaurantCardSkeleton />
            <RestaurantCardSkeleton compact />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <RestaurantCardSkeleton />
            <RestaurantCardSkeleton />
            <RestaurantCardSkeleton />
            <RestaurantCardSkeleton />
          </div>
        </div>
      ) : displayedItems.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/15 bg-white/[0.03] px-6 py-16 text-center">
          <p className="text-lg font-semibold text-zinc-300">Asnjë restorant</p>
          <p className="mt-2 text-sm text-zinc-500">
            Provo kërkim tjetër ose hiq disa filtra.
          </p>
        </div>
      ) : (
        <div className="space-y-10 sm:space-y-12">
          {sections.map((section) => (
            <RestaurantSection key={section.id} section={section} />
          ))}
        </div>
      )}

      <DeliveryLocationMapDialog
        open={entryDeliveryMapOpen}
        onClose={() => setEntryDeliveryMapOpen(false)}
        title="Ku të dorozohet porosia?"
        description="Zgjedh vendin në hartë ose zhvendos pin-in. Ruaj — adresa përdoret për dërgesë dhe renditje «afër meje»."
      />
    </div>
  )
}
