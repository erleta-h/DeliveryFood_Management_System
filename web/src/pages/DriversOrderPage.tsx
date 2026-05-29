import { useCallback, useEffect, useState } from 'react'
import {
  DRIVER_LEG,
  fetchDriverDeliveries,
  fetchDriverHistory,
  mapsDirectionsUrl,
  type DriverDeliveryRow,
  type DriverHistoryRow,
} from '../lib/driverApi'
import { useAuthStore } from '../store/authStore'

type Tab = 'aktive' | 'historiku'

function fmtMoney(n: number) {
  return `${n.toFixed(2)} €`
}

function Stars({ rating }: { rating: number | null }) {
  if (rating == null) return <span className="text-zinc-600">—</span>
  return (
    <span className="inline-flex gap-0.5">
      {Array.from({ length: 5 }, (_, i) => (
        <svg
          key={i}
          className={`h-3.5 w-3.5 ${i < rating ? 'text-amber-400' : 'text-zinc-700'}`}
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.957a1 1 0 00.95.69h4.162c.969 0 1.371 1.24.588 1.81l-3.37 2.448a1 1 0 00-.364 1.118l1.287 3.957c.3.921-.755 1.688-1.54 1.118l-3.37-2.448a1 1 0 00-1.176 0l-3.37 2.448c-.784.57-1.838-.197-1.539-1.118l1.287-3.957a1 1 0 00-.364-1.118L2.065 9.384c-.783-.57-.38-1.81.588-1.81h4.162a1 1 0 00.95-.69l1.284-3.957z" />
        </svg>
      ))}
    </span>
  )
}

function legLabel(leg: number): string {
  if (leg === DRIVER_LEG.headingToRestaurant) return 'Në rrugë → restorant'
  if (leg === DRIVER_LEG.atRestaurant) return 'Në restorant'
  if (leg === DRIVER_LEG.enRouteToCustomer) return 'Në rrugë → klient'
  return ''
}

export default function DriverOrdersPage() {
  const token = useAuthStore((s) => s.token)
  const [tab, setTab] = useState<Tab>('aktive')
  const [deliveries, setDeliveries] = useState<DriverDeliveryRow[]>([])
  const [history, setHistory] = useState<DriverHistoryRow[]>([])
  const [loadingActive, setLoadingActive] = useState(true)
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadDeliveries = useCallback(async () => {
    if (!token) return
    setError(null)
    setLoadingActive(true)
    try {
      const list = await fetchDriverDeliveries(token)
      setDeliveries(list)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Gabim gjatë ngarkimit.')
    } finally {
      setLoadingActive(false)
    }
  }, [token])

  const loadHistory = useCallback(async () => {
    if (!token) return
    setError(null)
    setLoadingHistory(true)
    try {
      const list = await fetchDriverHistory(token, 50)
      setHistory(list)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Gabim gjatë ngarkimit.')
    } finally {
      setLoadingHistory(false)
    }
  }, [token])

  useEffect(() => {
    void loadDeliveries()
  }, [loadDeliveries])

  useEffect(() => {
    if (tab === 'historiku' && history.length === 0) void loadHistory()
  }, [tab, history.length, loadHistory])

  useEffect(() => {
    if (!token) return
    const id = window.setInterval(() => {
      if (document.visibilityState !== 'visible') return
      void loadDeliveries().catch(() => {})
    }, 6000)
    return () => window.clearInterval(id)
  }, [token, loadDeliveries])

  const activeDeliveries = deliveries.filter(
    (r) =>
      r.driverLegStatus === DRIVER_LEG.enRouteToCustomer ||
      r.driverLegStatus === DRIVER_LEG.atRestaurant,
  )
  const queueDeliveries = deliveries.filter(
    (r) => r.driverLegStatus === DRIVER_LEG.headingToRestaurant,
  )

  return (
    <div className="min-h-screen bg-[#0b1120] pb-24">
      {/* Tab bar */}
      <div className="sticky top-0 z-20 flex border-b border-white/[0.08] bg-[#0b1120]/95 backdrop-blur">
        {(['aktive', 'historiku'] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`relative flex-1 py-3.5 text-center text-sm font-semibold transition-colors ${
              tab === t ? 'text-emerald-400' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            {t === 'aktive' ? 'Aktive' : 'Historiku'}
            {tab === t && (
              <span className="absolute inset-x-0 bottom-0 h-[2.5px] rounded-full bg-emerald-500" />
            )}
          </button>
        ))}
      </div>

      <div className="mx-auto max-w-lg px-4 pt-5">
        {error && (
          <p className="mb-4 rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-200">
            {error}
          </p>
        )}

        {/* ─── AKTIVE TAB ─── */}
        {tab === 'aktive' && (
          <div className="space-y-6">
            {loadingActive && deliveries.length === 0 && (
              <p className="text-center text-sm text-zinc-500">Duke ngarkuar…</p>
            )}

            {/* Active deliveries section */}
            {activeDeliveries.length > 0 && (
              <section className="space-y-3">
                <h2 className="text-[11px] font-bold uppercase tracking-widest text-emerald-400/80">
                  Aktive – Në Dorëzim
                </h2>
                {activeDeliveries.map((row) => (
                  <ActiveDeliveryCard key={row.orderId} row={row} />
                ))}
              </section>
            )}

            {/* Queue section */}
            {queueDeliveries.length > 0 && (
              <section className="space-y-3">
                <h2 className="text-[11px] font-bold uppercase tracking-widest text-amber-400/80">
                  Në Radhë – Prit Pickup
                </h2>
                {queueDeliveries.map((row) => (
                  <QueueDeliveryCard key={row.orderId} row={row} />
                ))}
              </section>
            )}

            {!loadingActive &&
              activeDeliveries.length === 0 &&
              queueDeliveries.length === 0 && (
                <div className="py-16 text-center">
                  <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-zinc-800/60">
                    <svg className="h-7 w-7 text-zinc-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
                      <path d="M9 17H5a2 2 0 01-2-2V5a2 2 0 012-2h14a2 2 0 012 2v10a2 2 0 01-2 2h-4m-5 0v4m-2 0h8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <p className="text-sm text-zinc-500">
                    Nuk ka dërgesa aktive për momentin.
                  </p>
                  <p className="mt-1 text-xs text-zinc-600">
                    Qëndro online — porositë shfaqen automatikisht.
                  </p>
                </div>
              )}
          </div>
        )}

        {/* ─── HISTORIKU TAB ─── */}
        {tab === 'historiku' && (
          <div className="space-y-3">
            {loadingHistory && history.length === 0 && (
              <p className="text-center text-sm text-zinc-500">Duke ngarkuar…</p>
            )}
            {history.length === 0 && !loadingHistory && (
              <div className="py-16 text-center">
                <p className="text-sm text-zinc-500">Ende pa dorëzime të përfunduara.</p>
              </div>
            )}
            {history.map((row) => (
              <div
                key={row.orderId}
                className="flex items-center justify-between gap-3 rounded-2xl border border-white/[0.08] bg-[#111827] px-4 py-3.5"
              >
                <div className="min-w-0">
                  <p className="truncate font-mono text-sm font-semibold text-zinc-200">
                    {row.orderNumber}
                  </p>
                  <p className="mt-0.5 text-xs text-zinc-500">
                    {new Date(row.deliveredAtUtc).toLocaleDateString('sq-AL', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })}{' '}
                    ·{' '}
                    {new Date(row.deliveredAtUtc).toLocaleTimeString('sq-AL', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="text-sm font-semibold text-emerald-400">
                    {fmtMoney(row.driverPayout)}
                  </span>
                  <Stars rating={row.customerRating} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function ActiveDeliveryCard({ row }: { row: DriverDeliveryRow }) {
  const isEnRoute = row.driverLegStatus === DRIVER_LEG.enRouteToCustomer

  const navUrl = isEnRoute
    ? mapsDirectionsUrl({
        destLat: row.customerLatitude,
        destLng: row.customerLongitude,
        labelFallback: `${row.customerAddressLine1}, ${row.customerCity}`,
      })
    : mapsDirectionsUrl({
        destLat: row.restaurantLatitude,
        destLng: row.restaurantLongitude,
        labelFallback: `${row.restaurantAddressLine}, ${row.restaurantCity}`,
      })

  return (
    <div className="rounded-2xl border border-white/[0.08] bg-[#111827] p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-mono text-sm font-bold text-zinc-100">{row.orderNumber}</p>
          <p className="mt-0.5 text-xs font-medium text-emerald-400">{fmtMoney(row.orderTotal)}</p>
        </div>
        <span className="rounded-full bg-emerald-500/15 px-2.5 py-1 text-[10px] font-semibold text-emerald-300">
          {legLabel(row.driverLegStatus)}
        </span>
      </div>

      <div className="mt-3 space-y-2">
        <div className="flex items-start gap-2">
          <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-500/20">
            <svg className="h-3 w-3 text-amber-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
              <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-zinc-300">{row.restaurantName}</p>
            <p className="truncate text-[11px] text-zinc-500">
              {row.restaurantAddressLine}, {row.restaurantCity}
            </p>
          </div>
        </div>
        <div className="flex items-start gap-2">
          <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-sky-500/20">
            <svg className="h-3 w-3 text-sky-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
              <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-zinc-300">
              {row.customerFirstName} {row.customerLastName}
            </p>
            <p className="truncate text-[11px] text-zinc-500">
              {row.customerAddressLine1}, {row.customerCity}
            </p>
          </div>
        </div>
      </div>

      {navUrl && (
        <a
          href={navUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-4 flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 text-sm font-semibold text-white no-underline transition-colors hover:bg-emerald-500 active:bg-emerald-700"
        >
          <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <polygon points="3 11 22 2 13 21 11 13 3 11" />
          </svg>
          {isEnRoute ? 'Navigo te klienti' : 'Navigo te restoranti'}
        </a>
      )}
    </div>
  )
}

function QueueDeliveryCard({ row }: { row: DriverDeliveryRow }) {
  const navUrl = mapsDirectionsUrl({
    destLat: row.restaurantLatitude,
    destLng: row.restaurantLongitude,
    labelFallback: `${row.restaurantAddressLine}, ${row.restaurantCity}`,
  })

  return (
    <div className="rounded-2xl border border-white/[0.08] bg-[#111827] p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-mono text-sm font-bold text-zinc-100">{row.orderNumber}</p>
          <p className="mt-0.5 text-xs font-medium text-emerald-400">{fmtMoney(row.orderTotal)}</p>
        </div>
        <span className="rounded-full bg-amber-500/15 px-2.5 py-1 text-[10px] font-semibold text-amber-300">
          {legLabel(row.driverLegStatus)}
        </span>
      </div>

      <div className="mt-3 space-y-2">
        <div className="flex items-start gap-2">
          <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-500/20">
            <svg className="h-3 w-3 text-amber-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
              <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-zinc-300">{row.restaurantName}</p>
            <p className="truncate text-[11px] text-zinc-500">
              {row.restaurantAddressLine}, {row.restaurantCity}
            </p>
          </div>
        </div>
        <div className="flex items-start gap-2">
          <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-sky-500/20">
            <svg className="h-3 w-3 text-sky-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
              <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-zinc-300">
              {row.customerFirstName} {row.customerLastName}
            </p>
            <p className="truncate text-[11px] text-zinc-500">
              {row.customerAddressLine1}, {row.customerCity}
            </p>
          </div>
        </div>
      </div>

      {navUrl && (
        <a
          href={navUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-4 flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-zinc-700/60 text-sm font-semibold text-zinc-200 no-underline transition-colors hover:bg-zinc-700 active:bg-zinc-600"
        >
          <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <polygon points="3 11 22 2 13 21 11 13 3 11" />
          </svg>
          Navigo te restoranti
        </a>
      )}
    </div>
  )
}
