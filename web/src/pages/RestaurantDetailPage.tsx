import { useEffect, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { CartSummaryPanel } from '../components/CartSummaryPanel'
import { RestaurantGoogleMap } from '../components/RestaurantGoogleMap'
import {
  customerBtnPrimary,
  customerCard,
  customerPanelSubtitle,
} from '../lib/customerTheme'
import { apiPath } from '../lib/apiBase'
import { fetchDrivingPreview, type DrivingPreview } from '../lib/customerMapsApi'
import { fetchClientPublicConfig } from '../lib/publicConfigApi'
import { fetchRestaurantMenu, type RestaurantMenuItem } from '../lib/restaurantMenuApi'
import {
  fetchRestaurantSummary,
  type RestaurantSummary,
} from '../lib/restaurantsApi'
import { useAuthStore } from '../store/authStore'
import { useCartStore } from '../store/cartStore'

type LocationState = { name?: string; deliveryFee?: number } | null

export default function RestaurantDetailPage() {
  const { id } = useParams()
  const location = useLocation()
  const navState = location.state as LocationState
  const stateName = navState?.name
  const stateDeliveryFee = navState?.deliveryFee
  const restaurantId = Number(id)
  const setRestaurant = useCartStore((s) => s.setRestaurant)
  const setDeliveryFee = useCartStore((s) => s.setDeliveryFee)
  const addLine = useCartStore((s) => s.addLine)
  const setQty = useCartStore((s) => s.setQty)
  const lines = useCartStore((s) => s.lines)
  const cartRid = useCartStore((s) => s.restaurantId)
  const token = useAuthStore((s) => s.token)

  const [cartPanelOpen, setCartPanelOpen] = useState(false)
  const [detailItem, setDetailItem] = useState<RestaurantMenuItem | null>(null)

  const [title, setTitle] = useState(stateName ?? '')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [summary, setSummary] = useState<RestaurantSummary | null>(null)
  const [mapsBrowserKey, setMapsBrowserKey] = useState<string | null>(null)
  const [drivePreview, setDrivePreview] = useState<DrivingPreview | null>(null)
  const [categories, setCategories] = useState<
    Awaited<ReturnType<typeof fetchRestaurantMenu>>
  >([])

  useEffect(() => {
    if (stateName) setTitle(stateName)
  }, [stateName])

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
        setCategories(cats)
        if (!stateName) setTitle(`Restoranti #${restaurantId}`)
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
  }, [restaurantId, stateName])

  useEffect(() => {
    if (!Number.isFinite(restaurantId) || restaurantId <= 0) return
    const st = useCartStore.getState()
    if (st.restaurantId !== restaurantId) return
    if (stateDeliveryFee !== undefined && Number.isFinite(stateDeliveryFee))
      setDeliveryFee(stateDeliveryFee)
  }, [restaurantId, stateDeliveryFee, setDeliveryFee])

  useEffect(() => {
    if (!Number.isFinite(restaurantId) || restaurantId <= 0) return
    let cancelled = false
    fetchRestaurantSummary(restaurantId)
      .then((s) => {
        if (cancelled || !s) return
        setSummary(s)
        if (!stateName) setTitle(s.name)
        const st = useCartStore.getState()
        if (st.restaurantId === restaurantId && st.deliveryFee == null) setDeliveryFee(s.deliveryFee)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [restaurantId, stateName, setDeliveryFee])

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

  useEffect(() => {
    if (!token || !Number.isFinite(restaurantId) || restaurantId <= 0) {
      setDrivePreview(null)
      return
    }
    let cancelled = false
    fetchDrivingPreview(token, restaurantId)
      .then((p) => {
        if (!cancelled) setDrivePreview(p)
      })
      .catch(() => {
        if (!cancelled) setDrivePreview(null)
      })
    return () => {
      cancelled = true
    }
  }, [token, restaurantId])

  function ensureRestaurantContext() {
    const name = title || `Restoranti ${restaurantId}`
    const fee =
      stateDeliveryFee !== undefined && Number.isFinite(stateDeliveryFee)
        ? stateDeliveryFee
        : undefined
    setRestaurant(restaurantId, name, fee)
  }

  function qtyInCartForItem(menuItemId: number): number {
    if (cartRid !== restaurantId) return 0
    return lines.find((l) => l.menuItemId === menuItemId)?.quantity ?? 0
  }

  useEffect(() => {
    if (!detailItem) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setDetailItem(null)
    }
    window.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [detailItem])

  function openItemModal(item: RestaurantMenuItem) {
    if (!item.isAvailable) return
    setDetailItem(item)
  }

  function addFromModal() {
    if (!detailItem) return
    ensureRestaurantContext()
    addLine({
      menuItemId: detailItem.id,
      name: detailItem.name,
      unitPrice: detailItem.price,
    })
    setDetailItem(null)
    setCartPanelOpen(true)
  }

  return (
    <section className={customerCard}>
      <Link
        to="/app/restaurants"
        className="mb-4 inline-block text-sm text-amber-400/90 hover:text-amber-300"
      >
        ← Restorantet
      </Link>
      <h1 className="text-2xl font-bold text-zinc-100">
        {title || (loading ? 'Duke ngarkuar…' : `Restoranti #${id}`)}
      </h1>
      <p className={customerPanelSubtitle}>Zgjidh artikuj dhe shto në shportë.</p>

      {summary ? (
        <div className="mt-4 space-y-3 rounded-xl border border-white/[0.08] bg-[#1a1d28]/60 p-4 text-sm text-zinc-300">
          {summary.addressLine || summary.city ? (
            <p>
              <span className="text-zinc-500">Adresa: </span>
              {[summary.addressLine, summary.city].filter(Boolean).join(', ')}
            </p>
          ) : null}
          <p>
            <span className="text-zinc-500">Dërgesa ~ </span>
            {summary.estimatedDeliveryMinutes} min (vlerësim restoranti) ·{' '}
            <span className="tabular-nums text-amber-200/90">
              {summary.deliveryFee.toFixed(2)} €
            </span>{' '}
            tarifë
          </p>
          {mapsBrowserKey && summary.latitude != null && summary.longitude != null ? (
            <RestaurantGoogleMap
              apiKey={mapsBrowserKey}
              lat={summary.latitude}
              lng={summary.longitude}
            />
          ) : summary.latitude == null || summary.longitude == null ? (
            <p className="text-xs text-zinc-500">
              Harta: mungojnë koordinatat e restorantit (partneri i shton në panel).
            </p>
          ) : (
            <p className="text-xs text-zinc-500">
              Harta: konfiguro <span className="font-mono text-zinc-400">GoogleMaps:BrowserApiKey</span> në
              API.
            </p>
          )}
          {token && drivePreview ? (
            drivePreview.coordinatesAvailable && drivePreview.durationSeconds != null ? (
              <p className="text-sky-200/90">
                Rrugë me makinë (Google): ~{Math.round(drivePreview.durationSeconds / 60)} min
                {drivePreview.distanceMeters != null
                  ? ` · ~${(drivePreview.distanceMeters / 1000).toFixed(1)} km`
                  : null}
              </p>
            ) : drivePreview.message ? (
              <p className="text-xs text-zinc-500">{drivePreview.message}</p>
            ) : null
          ) : null}
        </div>
      ) : null}

      {cartRid !== null && cartRid !== restaurantId ? (
        <p className="mt-4 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-100/90">
          Shporta përmban artikuj nga një restorant tjetër. Hap{' '}
          <Link to="/app/cart" className="font-semibold underline">
            shportën
          </Link>{' '}
          për t’i pastruar ose për të përfunduar porosinë atje.
        </p>
      ) : null}

      {error ? (
        <p className="mt-4 text-sm text-red-300">{error}</p>
      ) : loading ? (
        <p className="mt-6 text-sm text-zinc-500">Duke ngarkuar menujen…</p>
      ) : categories.length === 0 ? (
        <p className="mt-6 text-sm text-zinc-500">Nuk ka artikuj në menu për këtë restorant.</p>
      ) : (
        <div className="mt-6 space-y-6">
          {categories.map((cat) => (
            <div key={cat.id}>
              <h2 className="text-lg font-semibold text-zinc-200">{cat.name}</h2>
              <ul className="mt-3 grid gap-3 sm:grid-cols-1 lg:grid-cols-2">
                {cat.items.map((item) => {
                  const qty = qtyInCartForItem(item.id)
                  const img = item.imageUrl ? apiPath(item.imageUrl) : null
                  return (
                    <li
                      key={item.id}
                      role={item.isAvailable ? 'button' : undefined}
                      tabIndex={item.isAvailable ? 0 : undefined}
                      onClick={() => openItemModal(item)}
                      onKeyDown={(e) => {
                        if (!item.isAvailable) return
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          openItemModal(item)
                        }
                      }}
                      className={`flex overflow-hidden rounded-2xl border border-white/[0.08] bg-[#12151c] shadow-md shadow-black/25 transition ${
                        item.isAvailable
                          ? 'cursor-pointer hover:border-white/[0.14] hover:bg-[#161a22]'
                          : 'opacity-90'
                      }`}
                    >
                      <div className="flex min-w-0 flex-1 flex-col justify-center gap-1.5 p-4 text-left">
                        <p className="font-semibold leading-snug text-zinc-100">{item.name}</p>
                        {item.description ? (
                          <p className="line-clamp-2 text-xs leading-relaxed text-zinc-500">
                            {item.description}
                          </p>
                        ) : null}
                        <p className="text-base font-semibold tabular-nums text-sky-300/95">
                          {item.price.toFixed(2)} €
                        </p>
                      </div>
                      <div className="relative h-[6.75rem] w-[6.75rem] shrink-0 sm:h-[7.25rem] sm:w-[7.25rem]">
                        {img ? (
                          <img
                            src={img}
                            alt=""
                            className="h-full w-full object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <div
                            className="flex h-full w-full items-center justify-center bg-gradient-to-br from-zinc-700/35 to-zinc-900/90 text-2xl text-zinc-600"
                            aria-hidden
                          >
                            🍽
                          </div>
                        )}
                        {!item.isAvailable ? (
                          <span className="absolute inset-0 flex items-center justify-center bg-black/65 text-center text-[11px] font-medium leading-tight text-zinc-200">
                            Jo gati
                          </span>
                        ) : qty > 0 ? (
                          <div
                            className="absolute bottom-0 left-0 right-0 flex items-stretch border-t border-white/10 bg-black/75 backdrop-blur-sm"
                            role="group"
                            aria-label={`Sasia për ${item.name}`}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              type="button"
                              className="flex-1 py-2 text-lg leading-none text-zinc-100 hover:bg-white/10"
                              onClick={(e) => {
                                e.stopPropagation()
                                setQty(item.id, qty - 1)
                              }}
                            >
                              −
                            </button>
                            <span className="flex min-w-[2rem] items-center justify-center border-x border-white/10 text-sm font-bold tabular-nums text-white">
                              {qty}
                            </span>
                            <button
                              type="button"
                              className="flex-1 py-2 text-lg leading-none text-zinc-100 hover:bg-white/10"
                              onClick={(e) => {
                                e.stopPropagation()
                                setQty(item.id, qty + 1)
                              }}
                            >
                              +
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            aria-label={`Shto ${item.name}`}
                            onClick={(e) => {
                              e.stopPropagation()
                              ensureRestaurantContext()
                              addLine({
                                menuItemId: item.id,
                                name: item.name,
                                unitPrice: item.price,
                              })
                            }}
                            className="absolute right-1.5 top-1.5 flex h-9 w-9 items-center justify-center rounded-lg bg-sky-500 text-xl font-bold leading-none text-white shadow-lg transition hover:bg-sky-400 active:scale-95"
                          >
                            +
                          </button>
                        )}
                      </div>
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
        </div>
      )}

      <div className="mt-8">
        <button
          type="button"
          onClick={() => setCartPanelOpen(true)}
          className={`${customerBtnPrimary} inline-block w-full text-center sm:w-auto`}
        >
          Shiko shportën
        </button>
      </div>

      {detailItem ? (
        <div
          className="fixed inset-0 z-[70] flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-4"
          role="presentation"
          onClick={() => setDetailItem(null)}
        >
          <div
            role="dialog"
            aria-modal
            aria-labelledby="product-detail-title"
            className="flex max-h-[min(92vh,720px)] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl border border-white/[0.08] bg-[#1a1d24] shadow-2xl sm:rounded-3xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative flex w-full shrink-0 justify-center bg-[#0f1115] px-4 py-4 sm:py-5">
              <div className="relative h-32 w-full max-w-[13rem] overflow-hidden rounded-2xl border border-white/[0.06] sm:h-36 sm:max-w-[15rem]">
                {detailItem.imageUrl ? (
                  <img
                    src={apiPath(detailItem.imageUrl)}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-4xl text-zinc-700 sm:text-5xl">
                    🍽
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => setDetailItem(null)}
                className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-black/50 text-lg text-white ring-1 ring-white/20 backdrop-blur-sm transition hover:bg-black/65 sm:h-10 sm:w-10 sm:text-xl"
                aria-label="Mbyll"
              >
                ×
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-5 pt-4 sm:px-5">
              <h2 id="product-detail-title" className="text-xl font-bold leading-tight text-white sm:text-2xl">
                {detailItem.name}
              </h2>
              <p className="mt-2 text-2xl font-semibold tabular-nums text-[#009fe3] sm:text-[1.65rem]">
                {detailItem.price.toFixed(2)} €
              </p>
              {detailItem.description ? (
                <p className="mt-3 text-sm leading-relaxed text-zinc-400">{detailItem.description}</p>
              ) : null}

              <div className="mt-5 rounded-2xl border border-white/[0.06] bg-[#14161c] p-3">
                <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-zinc-500">Porosit nga</p>
                <div className="mt-2 flex items-start gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-zinc-800 text-xl text-zinc-400">
                    🏪
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-zinc-100">{title || summary?.name || 'Restoranti'}</p>
                    {summary ? (
                      <p className="mt-1 text-xs text-zinc-500">
                        <span className="tabular-nums text-amber-200/90">{summary.deliveryFee.toFixed(2)} €</span>
                        {' · '}
                        ~{summary.estimatedDeliveryMinutes} min
                      </p>
                    ) : (
                      <p className="mt-1 text-xs text-zinc-500">Duke ngarkuar detajet…</p>
                    )}
                  </div>
                </div>
              </div>

              {qtyInCartForItem(detailItem.id) > 0 ? (
                <p className="mt-3 text-center text-sm text-zinc-500">
                  Në shportë: <span className="font-semibold text-zinc-300">{qtyInCartForItem(detailItem.id)}</span>
                </p>
              ) : null}

              <button
                type="button"
                onClick={addFromModal}
                className="mt-5 w-full rounded-2xl bg-[#009fe3] py-3.5 text-center text-base font-semibold text-white shadow-[0_4px_24px_rgba(0,159,227,0.35)] transition hover:bg-[#1aacf0] active:scale-[0.99]"
              >
                {qtyInCartForItem(detailItem.id) > 0 ? 'Shto një tjetër në shportë' : 'Fillo porosinë'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <CartSummaryPanel
        open={cartPanelOpen}
        onClose={() => setCartPanelOpen(false)}
        pageRestaurantId={restaurantId}
      />
    </section>
  )
}
