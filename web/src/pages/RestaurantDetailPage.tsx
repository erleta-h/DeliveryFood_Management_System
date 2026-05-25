import { useEffect, useMemo, useState } from 'react'
import { useLocation, useParams } from 'react-router-dom'
import { CartSummaryPanel } from '../components/CartSummaryPanel'
import { RestaurantCartConflictModal } from '../components/RestaurantCartConflictModal'
import { RestaurantDetailHero } from '../components/RestaurantDetailHero'
import { RestaurantDetailInfoBar } from '../components/RestaurantDetailInfoBar'
import { RestaurantGoogleMap } from '../components/RestaurantGoogleMap'
import { RestaurantMenuItemCard } from '../components/RestaurantMenuItemCard'
import { RestaurantMenuItemModal } from '../components/RestaurantMenuItemModal'
import { RestaurantStickyCartBar } from '../components/RestaurantStickyCartBar'
import { fetchClientPublicConfig } from '../lib/publicConfigApi'
import { rdChipActive, rdChipIdle, rdPanel, rdTabActive, rdTabIdle } from '../lib/restaurantDetailTheme'
import {
  coverImageFromMenu,
  enrichMenuCategories,
  type EnrichedMenuCategory,
  type MenuItemWithMeta,
} from '../lib/restaurantDetailUi'
import { fetchRestaurantMenu, type RestaurantMenuItem } from '../lib/restaurantMenuApi'
import {
  fetchRestaurantSummary,
  type RestaurantSummary,
} from '../lib/restaurantsApi'
import { RestaurantReviewsPanel } from '../components/RestaurantReviewsPanel'
import { fetchRestaurantReviews, type RestaurantReviewsResult } from '../lib/restaurantReviewsApi'
import { useAuthStore } from '../store/authStore'
import { useCartStore } from '../store/cartStore'
import { useFavoriteRestaurantsStore } from '../store/favoriteRestaurantsStore'

type LocationState = {
  name?: string
  deliveryFee?: number
  averageRating?: number
  reviewCount?: number
  categoryName?: string
  estimatedDeliveryMinutes?: number
  minOrderAmount?: number
} | null

type TabId = 'menu' | 'info' | 'reviews'
type CategoryFilter = 'featured' | number | null

const FEATURED_LIMIT = 8
const MENU_PAGE_SIZE = 4

function featuredItems(categories: EnrichedMenuCategory[]): MenuItemWithMeta[] {
  const all = categories.flatMap((c) => c.items.filter((i) => i.isAvailable))
  const withImg = all.filter((i) => i.imageUrl)
  const rest = all.filter((i) => !i.imageUrl)
  return [...withImg, ...rest].slice(0, FEATURED_LIMIT)
}

export default function RestaurantDetailPage() {
  const { id } = useParams()
  const location = useLocation()
  const navState = location.state as LocationState
  const restaurantId = Number(id)

  const setRestaurant = useCartStore((s) => s.setRestaurant)
  const setDeliveryFee = useCartStore((s) => s.setDeliveryFee)
  const addLine = useCartStore((s) => s.addLine)
  const setQty = useCartStore((s) => s.setQty)
  const clear = useCartStore((s) => s.clear)
  const lines = useCartStore((s) => s.lines)
  const cartRid = useCartStore((s) => s.restaurantId)
  const cartRestaurantName = useCartStore((s) => s.restaurantName)
  const token = useAuthStore((s) => s.token)
  const isFavorite = useFavoriteRestaurantsStore((s) => s.isFavorite(restaurantId))
  const favoriteBusy = useFavoriteRestaurantsStore((s) => s.togglingId === restaurantId)
  const toggleFavorite = useFavoriteRestaurantsStore((s) => s.toggle)
  const loadFavorites = useFavoriteRestaurantsStore((s) => s.load)
  const favoritesLoaded = useFavoriteRestaurantsStore((s) => s.loaded)

  const [tab, setTab] = useState<TabId>('menu')
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('featured')
  const [menuSearch, setMenuSearch] = useState('')
  const [expandedCats, setExpandedCats] = useState<Set<number>>(new Set())
  const [cartPanelOpen, setCartPanelOpen] = useState(false)
  const [conflictOpen, setConflictOpen] = useState(false)
  const [detailItem, setDetailItem] = useState<MenuItemWithMeta | null>(null)

  const [title, setTitle] = useState(navState?.name ?? '')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [summary, setSummary] = useState<RestaurantSummary | null>(null)
  const [mapsBrowserKey, setMapsBrowserKey] = useState<string | null>(null)
  const [rawCategories, setRawCategories] = useState<Awaited<ReturnType<typeof fetchRestaurantMenu>>>([])
  const [reviewsData, setReviewsData] = useState<RestaurantReviewsResult | null>(null)
  const [reviewsLoading, setReviewsLoading] = useState(false)
  const [reviewsError, setReviewsError] = useState<string | null>(null)

  const categories = useMemo(() => enrichMenuCategories(rawCategories), [rawCategories])
  const categoryName = summary?.categoryName ?? navState?.categoryName ?? 'Restorant'
  const averageRating = summary?.averageRating ?? navState?.averageRating ?? 0
  const reviewCount = summary?.reviewCount ?? navState?.reviewCount ?? 0
  const estimatedMinutes =
    summary?.estimatedDeliveryMinutes ?? navState?.estimatedDeliveryMinutes ?? 30

  const coverUrl = useMemo(
    () => coverImageFromMenu(rawCategories, categoryName),
    [rawCategories, categoryName],
  )

  const cartForThisRestaurant = cartRid === restaurantId
  const cartLines = cartForThisRestaurant ? lines : []
  const cartItemCount = cartLines.reduce((n, l) => n + l.quantity, 0)
  const cartSubtotal = cartLines.reduce((s, l) => s + l.unitPrice * l.quantity, 0)
  const deliveryFee =
    useCartStore((s) => s.deliveryFee) ?? summary?.deliveryFee ?? navState?.deliveryFee ?? null

  const hasCartConflict =
    cartRid !== null && cartRid !== restaurantId && lines.length > 0

  const searchLower = menuSearch.trim().toLowerCase()

  const filteredCategories = useMemo(() => {
    if (!searchLower) return categories
    return categories
      .map((cat) => ({
        ...cat,
        items: cat.items.filter(
          (i) =>
            i.name.toLowerCase().includes(searchLower) ||
            (i.displayDescription?.toLowerCase().includes(searchLower) ?? false),
        ),
      }))
      .filter((c) => c.items.length > 0)
  }, [categories, searchLower])

  const featured = useMemo(() => featuredItems(categories), [categories])

  useEffect(() => {
    if (navState?.name) setTitle(navState.name)
  }, [navState?.name])

  useEffect(() => {
    if (token && !favoritesLoaded) void loadFavorites(token)
  }, [token, favoritesLoaded, loadFavorites])

  useEffect(() => {
    if (tab !== 'reviews' || !Number.isFinite(restaurantId) || restaurantId <= 0) return
    let cancelled = false
    setReviewsLoading(true)
    setReviewsError(null)
    fetchRestaurantReviews(restaurantId)
      .then((d) => {
        if (!cancelled) setReviewsData(d)
      })
      .catch((e: unknown) => {
        if (!cancelled)
          setReviewsError(e instanceof Error ? e.message : 'Vlerësimet nuk u ngarkuan.')
      })
      .finally(() => {
        if (!cancelled) setReviewsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [tab, restaurantId])

  const displayReviewCount = reviewsData?.totalCount ?? reviewCount
  const displayAverageRating = reviewsData?.averageRating ?? averageRating

  async function handleToggleFavorite() {
    if (!token) {
      setError('Hyni në llogari për të ruajtur restorantin te të preferuarat.')
      return
    }
    try {
      await toggleFavorite(token, restaurantId)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Gabim te të preferuarat.')
    }
  }

  useEffect(() => {
    if (!Number.isFinite(restaurantId) || restaurantId <= 0) {
      setError('ID i pavlefshëm.')
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    setError(null)
    fetchRestaurantMenu(restaurantId)
      .then((cats) => {
        if (cancelled) return
        setRawCategories(cats)
        if (!navState?.name) setTitle(`Restoranti #${restaurantId}`)
      })
      .catch((e: unknown) => {
        if (!cancelled)
          setError(e instanceof Error ? e.message : 'Menuja nuk u ngarkua.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [restaurantId, navState?.name])

  useEffect(() => {
    if (!Number.isFinite(restaurantId) || restaurantId <= 0) return
    const st = useCartStore.getState()
    if (st.restaurantId !== restaurantId) return
    if (navState?.deliveryFee !== undefined && Number.isFinite(navState.deliveryFee))
      setDeliveryFee(navState.deliveryFee)
  }, [restaurantId, navState?.deliveryFee, setDeliveryFee])

  useEffect(() => {
    if (!Number.isFinite(restaurantId) || restaurantId <= 0) return
    let cancelled = false
    fetchRestaurantSummary(restaurantId)
      .then((s) => {
        if (cancelled || !s) return
        setSummary({
          ...s,
          categoryName: s.categoryName ?? navState?.categoryName ?? 'Restorant',
          averageRating: s.averageRating ?? navState?.averageRating ?? 0,
          reviewCount: s.reviewCount ?? navState?.reviewCount ?? 0,
        })
        if (!navState?.name) setTitle(s.name)
        const st = useCartStore.getState()
        if (st.restaurantId === restaurantId && st.deliveryFee == null) setDeliveryFee(s.deliveryFee)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [restaurantId, navState, setDeliveryFee])

  useEffect(() => {
    let cancelled = false
    fetchClientPublicConfig()
      .then((cfg) => {
        if (cancelled) return
        const k = cfg.googleMapsBrowserApiKey?.trim()
        if (k) setMapsBrowserKey(k)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  function ensureRestaurantContext(): boolean {
    if (hasCartConflict) {
      setConflictOpen(true)
      return false
    }
    const name = title || summary?.name || `Restoranti ${restaurantId}`
    const fee =
      navState?.deliveryFee !== undefined && Number.isFinite(navState.deliveryFee)
        ? navState.deliveryFee
        : summary?.deliveryFee
    setRestaurant(restaurantId, name, fee)
    return true
  }

  function handleClearCartForNewRestaurant() {
    clear()
    setConflictOpen(false)
    const name = title || summary?.name || `Restoranti ${restaurantId}`
    setRestaurant(restaurantId, name, summary?.deliveryFee ?? navState?.deliveryFee)
  }

  function qtyInCartForItem(menuItemId: number): number {
    if (!cartForThisRestaurant) return 0
    return lines.find((l) => l.menuItemId === menuItemId)?.quantity ?? 0
  }

  function addItem(
    item: RestaurantMenuItem,
    opts?: { quantity?: number; unitPrice?: number; lineName?: string },
  ) {
    if (!ensureRestaurantContext()) return
    addLine({
      menuItemId: item.id,
      name: opts?.lineName ?? item.name,
      unitPrice: opts?.unitPrice ?? item.price,
      quantity: opts?.quantity ?? 1,
      imageUrl: item.imageUrl ?? null,
    })
  }

  function renderItemGrid(items: MenuItemWithMeta[], catName: string, catId: number) {
    const expanded = expandedCats.has(catId)
    const visible = expanded ? items : items.slice(0, MENU_PAGE_SIZE)
    const hasMore = items.length > MENU_PAGE_SIZE

    return (
      <>
        <ul className="grid gap-3 sm:grid-cols-2">
          {visible.map((item) => (
            <RestaurantMenuItemCard
              key={item.id}
              item={item}
              categoryName={catName}
              qty={qtyInCartForItem(item.id)}
              onOpen={() => setDetailItem(item)}
              onAdd={() => addItem(item)}
              onQtyChange={(q) => {
                if (q <= 0) {
                  setQty(item.id, 0)
                  return
                }
                if (!ensureRestaurantContext()) return
                if (qtyInCartForItem(item.id) === 0) addItem(item)
                else setQty(item.id, q)
              }}
            />
          ))}
        </ul>
        {hasMore && !expanded ? (
          <button
            type="button"
            onClick={() => setExpandedCats((s) => new Set(s).add(catId))}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-[#141a28] py-3 text-sm font-medium text-zinc-400 transition hover:text-zinc-200"
          >
            Shfaq më shumë
            <span aria-hidden>▾</span>
          </button>
        ) : null}
      </>
    )
  }

  const displayName = title || summary?.name || 'Restoranti'

  return (
    <div className="-mx-4 -mt-6 bg-[#0c0e14] sm:-mx-0 sm:-mt-8">
      <RestaurantDetailHero
        title={displayName}
        coverUrl={coverUrl}
        summary={summary}
        categoryName={categoryName}
        averageRating={displayAverageRating}
        reviewCount={displayReviewCount}
        estimatedMinutes={estimatedMinutes}
        isFavorite={isFavorite}
        favoriteBusy={favoriteBusy}
        onToggleFavorite={() => void handleToggleFavorite()}
      />

      <RestaurantDetailInfoBar
        summary={summary}
        categoryName={categoryName}
        restaurantId={restaurantId}
        onShowMap={
          summary?.latitude != null && summary?.longitude != null && mapsBrowserKey
            ? () => setTab('info')
            : undefined
        }
      />

      <div className={`mx-4 sm:mx-6 ${rdPanel} overflow-hidden`}>
        <div className="flex gap-8 border-b border-white/[0.08] px-4 pt-3 sm:px-6">
          <button
            type="button"
            className={`inline-flex items-center gap-2 ${tab === 'menu' ? rdTabActive : rdTabIdle}`}
            onClick={() => setTab('menu')}
          >
            <span className={tab === 'menu' ? 'text-[#F5B800]' : 'text-zinc-600'} aria-hidden>
              🍴
            </span>
            Menu
          </button>
          <button
            type="button"
            className={`inline-flex items-center gap-2 ${tab === 'info' ? rdTabActive : rdTabIdle}`}
            onClick={() => setTab('info')}
          >
            <span className={tab === 'info' ? 'text-[#F5B800]' : 'text-zinc-600'} aria-hidden>
              ℹ
            </span>
            Info
          </button>
          <button
            type="button"
            className={`inline-flex items-center gap-2 ${tab === 'reviews' ? rdTabActive : rdTabIdle}`}
            onClick={() => setTab('reviews')}
          >
            <span className={tab === 'reviews' ? 'text-[#F5B800]' : 'text-zinc-600'} aria-hidden>
              ⭐
            </span>
            Vlerësime{displayReviewCount > 0 ? ` (${displayReviewCount})` : ''}
          </button>
        </div>

        <div className={`px-4 py-5 sm:px-6 ${cartItemCount > 0 ? 'pb-28' : 'pb-6'}`}>
          {error ? <p className="mb-4 text-sm text-red-300">{error}</p> : null}

          {tab === 'menu' ? (
            <>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
                  <button
                    type="button"
                    onClick={() => setCategoryFilter('featured')}
                    className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
                      categoryFilter === 'featured' ? rdChipActive : rdChipIdle
                    }`}
                  >
                    Të preferuarat
                  </button>
                  {categories.map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setCategoryFilter(cat.id)}
                      className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
                        categoryFilter === cat.id ? rdChipActive : rdChipIdle
                      }`}
                    >
                      {cat.name}
                    </button>
                  ))}
                </div>
                <div className="relative w-full sm:max-w-[220px]">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">
                    🔍
                  </span>
                  <input
                    type="search"
                    value={menuSearch}
                    onChange={(e) => setMenuSearch(e.target.value)}
                    placeholder="Kërko në menu"
                    className="h-9 w-full rounded-xl border border-white/10 bg-[#0c0e14] py-2 pl-9 pr-3 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-[#F5B800]/40"
                  />
                </div>
              </div>

              {loading ? (
                <p className="mt-8 text-sm text-zinc-500">Duke ngarkuar menujen…</p>
              ) : categories.length === 0 ? (
                <p className="mt-8 text-sm text-zinc-500">Nuk ka artikuj në menu.</p>
              ) : categoryFilter === 'featured' ? (
                <div className="mt-6">
                  <h2 className="text-lg font-bold text-white">
                    Të preferuarat <span aria-hidden>🔥</span>
                  </h2>
                  <p className="mt-0.5 text-sm text-zinc-500">
                    Zgjedhjet më të preferuara nga klientët tanë
                  </p>
                  <div className="mt-4">
                    {renderItemGrid(featured, categoryName, -1)}
                  </div>
                </div>
              ) : (
                <div className="mt-6 space-y-8">
                  {(categoryFilter == null
                    ? filteredCategories
                    : filteredCategories.filter((c) => c.id === categoryFilter)
                  ).map((cat) => (
                    <div key={cat.id}>
                      <h2 className="text-lg font-bold text-white">{cat.name}</h2>
                      <div className="mt-4">{renderItemGrid(cat.items, cat.name, cat.id)}</div>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : null}

          {tab === 'info' && summary ? (
            <div className="mt-2 space-y-4 text-sm text-zinc-300">
              <p>
                <span className="text-zinc-500">Dërgesa: </span>
                {summary.estimatedDeliveryMinutes} min · Tarifa:{' '}
                <span className="font-semibold text-[#F5B800]">
                  {summary.deliveryFee.toFixed(2)} €
                </span>
              </p>
              {summary.minOrderAmount > 0 ? (
                <p>
                  <span className="text-zinc-500">Porosia minimale: </span>
                  {summary.minOrderAmount.toFixed(2)} €
                </p>
              ) : null}
              {mapsBrowserKey &&
              summary.latitude != null &&
              summary.longitude != null ? (
                <RestaurantGoogleMap
                  apiKey={mapsBrowserKey}
                  lat={summary.latitude}
                  lng={summary.longitude}
                />
              ) : null}
            </div>
          ) : tab === 'info' ? (
            <p className="mt-4 text-sm text-zinc-500">Duke ngarkuar…</p>
          ) : null}

          {tab === 'reviews' ? (
            <RestaurantReviewsPanel
              data={reviewsData}
              loading={reviewsLoading}
              error={reviewsError}
            />
          ) : null}
        </div>
      </div>

      <RestaurantStickyCartBar
        itemCount={cartItemCount}
        subtotal={cartSubtotal}
        deliveryFee={deliveryFee}
        restaurantName={cartForThisRestaurant ? cartRestaurantName || displayName : displayName}
        onOpenCart={() => setCartPanelOpen(true)}
      />

      <RestaurantCartConflictModal
        open={conflictOpen}
        restaurantName={displayName}
        onCancel={() => setConflictOpen(false)}
        onClearCart={handleClearCartForNewRestaurant}
      />

      <RestaurantMenuItemModal
        item={detailItem}
        categoryName={categoryName}
        averageRating={displayAverageRating}
        reviewCount={displayReviewCount}
        onClose={() => setDetailItem(null)}
        onAdd={({ quantity, unitPrice, lineName }) =>
          addItem(detailItem!, { quantity, unitPrice, lineName })
        }
      />

      <CartSummaryPanel
        open={cartPanelOpen}
        onClose={() => setCartPanelOpen(false)}
        pageRestaurantId={restaurantId}
      />
    </div>
  )
}
