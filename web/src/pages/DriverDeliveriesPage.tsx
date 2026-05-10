import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  customerBtnGhost,
  customerBtnPrimary,
  customerCardMuted,
} from '../lib/customerTheme'
import {
  DRIVER_LEG,
  fetchDriverDeliveries,
  fetchDriverOrderDetail,
  fetchDriverStatus,
  mapsDirectionsUrl,
  postDriverAcceptOffer,
  postDriverArrivedRestaurant,
  postDriverDeclineOffer,
  postDriverDelivered,
  postDriverOffline,
  postDriverOnline,
  postDriverPickup,
  type DriverDeliveryRow,
  type DriverOrderDetail,
  type DriverStatus,
} from '../lib/driverApi'
import { ORDER_STATUS_CANCELLED, ORDER_STATUS_DELIVERED } from '../lib/orderStatusLabels'
import { OrderDeliveryChatPanel } from '../components/OrderDeliveryChatPanel'
import { useAuthStore } from '../store/authStore'
import { useDriverAlertsStore } from '../store/driverAlertsStore'

function fmtMoney(n: number) {
  return `${n.toFixed(2)} €`
}

function fmtDurationSeconds(total: number) {
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

export default function DriverDeliveriesPage() {
  const token = useAuthStore((s) => s.token)
  const [status, setStatus] = useState<DriverStatus | null>(null)
  const [rows, setRows] = useState<DriverDeliveryRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<number | null>(null)
  const [detail, setDetail] = useState<DriverOrderDetail | null>(null)
  const [detailFor, setDetailFor] = useState<number | null>(null)
  const [chatOrderId, setChatOrderId] = useState<number | null>(null)

  const loadStatus = useCallback(async () => {
    if (!token) return
    const s = await fetchDriverStatus(token)
    setStatus(s)
  }, [token])

  const loadDeliveries = useCallback(async () => {
    if (!token) return
    const list = await fetchDriverDeliveries(token)
    setRows(list)
  }, [token])

  const loadAll = useCallback(async () => {
    if (!token) return
    setError(null)
    await Promise.all([loadStatus(), loadDeliveries()])
  }, [token, loadStatus, loadDeliveries])

  useEffect(() => {
    if (!token) return
    let c = false
    setLoading(true)
    void loadAll()
      .catch((e: unknown) => {
        if (!c) setError(e instanceof Error ? e.message : 'Gabim.')
      })
      .finally(() => {
        if (!c) setLoading(false)
      })
    return () => {
      c = true
    }
  }, [token, loadAll])

  useEffect(() => {
    if (!token) return
    const t = window.setInterval(() => {
      if (document.visibilityState !== 'visible') return
      void loadAll().catch(() => {})
    }, 5000)
    return () => window.clearInterval(t)
  }, [token, loadAll])

  useEffect(() => {
    useDriverAlertsStore.getState().clearBell()
  }, [])

  useEffect(() => {
    const onRefresh = () => void loadAll().catch(() => {})
    window.addEventListener('fd-driver-refresh-deliveries', onRefresh)
    return () => window.removeEventListener('fd-driver-refresh-deliveries', onRefresh)
  }, [loadAll])

  const incoming = useMemo(() => rows.filter((r) => r.requiresAccept), [rows])
  const activeJobs = useMemo(() => rows.filter((r) => !r.requiresAccept), [rows])
  const chatRow = useMemo(() => rows.find((r) => r.orderId === chatOrderId), [rows, chatOrderId])

  async function toggleOnline() {
    if (!token || !status) return
    setActionError(null)
    if (status.isOnline) {
      const r = await postDriverOffline(token)
      if (!r.ok) setActionError(r.message)
    } else {
      const r = await postDriverOnline(token)
      if (!r.ok) setActionError(r.message)
    }
    void loadStatus().then(() => {
      window.dispatchEvent(new CustomEvent('fd-driver-status-changed'))
    })
  }

  async function run(
    fn: () => Promise<{ ok: true } | { ok: false; message: string }>,
    orderId?: number,
  ) {
    if (!token) return
    setActionError(null)
    if (orderId != null) setBusyId(orderId)
    const r = await fn()
    if (orderId != null) setBusyId(null)
    if (!r.ok) setActionError(r.message)
    else void loadAll()
  }

  async function openDetail(orderId: number) {
    if (!token) return
    setDetailFor(orderId)
    setDetail(null)
    try {
      const d = await fetchDriverOrderDetail(token, orderId)
      setDetail(d)
    } catch {
      setDetail(null)
    }
  }

  function closeDetail() {
    setDetail(null)
    setDetailFor(null)
  }

  const busyLabel = status?.isBusy ? 'Busy' : 'I lirë'
  const onlineSeconds = status?.secondsOnlineToday ?? 0

  return (
    <div className="space-y-6">
      <div className={`${customerCardMuted} border-emerald-500/20 p-4`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-400/90">Gjendja</p>
            <p className="mt-1 text-sm text-zinc-300">
              {status?.isOnline ? 'Online' : 'Offline'} · {busyLabel}
            </p>
            <p className="mt-0.5 text-xs text-zinc-500">
              Kohë online sot:{' '}
              <span className="font-mono text-zinc-300">{fmtDurationSeconds(onlineSeconds)}</span>
            </p>
          </div>
          <button
            type="button"
            onClick={() => void toggleOnline()}
            className={`min-h-[48px] min-w-[140px] rounded-xl px-5 text-sm font-semibold transition-colors ${
              status?.isOnline
                ? 'bg-rose-500/90 text-white hover:bg-rose-500'
                : 'bg-emerald-500 text-white hover:bg-emerald-400'
            }`}
          >
            {status?.isOnline ? 'Offline' : 'Online'}
          </button>
        </div>
        {!status?.isOnline ? (
          <p className="mt-3 text-xs text-amber-200/90">
            Ndiz «Online» për të marrë oferta dhe për të përditësuar vendndodhjen (lejo GPS).
          </p>
        ) : null}
      </div>

      <nav className="flex flex-wrap gap-2 text-xs">
        <Link to="/driver/earnings" className={`${customerBtnGhost} px-3 py-2`}>
          Fitimet
        </Link>
        <Link to="/driver/history" className={`${customerBtnGhost} px-3 py-2`}>
          Historiku
        </Link>
        <Link to="/driver/stats" className={`${customerBtnGhost} px-3 py-2`}>
          Performance
        </Link>
        <Link to="/driver/support" className={`${customerBtnGhost} px-3 py-2`}>
          Support
        </Link>
        <Link to="/driver/profile" className={`${customerBtnGhost} px-3 py-2`}>
          Profili
        </Link>
      </nav>

      {loading ? <p className="text-sm text-zinc-500">Duke ngarkuar…</p> : null}
      {error ? <p className="text-sm text-red-300">{error}</p> : null}
      {actionError ? (
        <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-100">
          {actionError}
        </p>
      ) : null}

      {incoming.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-amber-100">Porosi e re — prano shpejt</h2>
          {incoming.map((r) => (
            <IncomingCard
              key={r.orderId}
              offeredAtUtc={r.offeredAtUtc}
              row={r}
              busy={busyId === r.orderId}
              onAccept={() =>
                void run(() => postDriverAcceptOffer(token!, r.orderId), r.orderId)
              }
              onDecline={() =>
                void run(() => postDriverDeclineOffer(token!, r.orderId), r.orderId)
              }
            />
          ))}
        </section>
      ) : null}

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-lg font-bold text-zinc-100">Dërgesat aktive</h2>
          <button type="button" className={`${customerBtnGhost} px-3 py-1.5 text-xs`} onClick={() => void loadAll()}>
            Rifresko
          </button>
        </div>
        {!loading && !error && activeJobs.length === 0 && incoming.length === 0 ? (
          <p className="text-sm text-zinc-500">
            Nuk ke dërgesa aktive. Caktimi nga restoranti është detyrë e drejtpërdrejtë — shfaqet këtu pa «prano ofertë».
          </p>
        ) : null}
        <ul className="space-y-4">
          {activeJobs.map((r) => (
            <li key={r.orderId} className={`${customerCardMuted} border-sky-500/15 p-4`}>
              <JobCard
                row={r}
                busyId={busyId}
                onArrived={() =>
                  void run(() => postDriverArrivedRestaurant(token!, r.orderId), r.orderId)
                }
                onPickup={() => void run(() => postDriverPickup(token!, r.orderId), r.orderId)}
                onDelivered={() => void run(() => postDriverDelivered(token!, r.orderId), r.orderId)}
                onOpenDetail={() => void openDetail(r.orderId)}
                onOpenChat={() => setChatOrderId(r.orderId)}
              />
            </li>
          ))}
        </ul>
      </section>

      {detailFor != null && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-3 sm:items-center"
          role="dialog"
          aria-modal
        >
          <div className={`${customerCardMuted} max-h-[85vh] w-full max-w-lg overflow-y-auto border border-white/10 p-4`}>
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-mono text-sm font-bold text-sky-200">Detaje porosie</h3>
              <button type="button" className="text-zinc-400 hover:text-white" onClick={closeDetail}>
                ✕
              </button>
            </div>
            {detail && token ? (
              <DetailBody detail={detail} token={token} />
            ) : (
              <p className="mt-3 text-sm text-zinc-500">Duke ngarkuar…</p>
            )}
          </div>
        </div>
      )}

      {chatOrderId != null && token ? (
        <div
          className="fixed inset-0 z-[55] flex items-end justify-center bg-black/70 p-3 sm:items-center"
          role="dialog"
          aria-modal
          aria-labelledby="driver-chat-title"
        >
          <div className={`${customerCardMuted} max-h-[90vh] w-full max-w-lg overflow-y-auto border border-violet-500/25 p-4`}>
            <div className="flex items-start justify-between gap-2">
              <h3 id="driver-chat-title" className="text-sm font-bold text-violet-200">
                Chat me klientin
              </h3>
              <button
                type="button"
                className="text-zinc-400 hover:text-white"
                onClick={() => setChatOrderId(null)}
              >
                ✕
              </button>
            </div>
            <OrderDeliveryChatPanel
              token={token}
              orderId={chatOrderId}
              allowPost={
                chatRow != null &&
                chatRow.orderStatus !== ORDER_STATUS_DELIVERED &&
                chatRow.orderStatus !== ORDER_STATUS_CANCELLED &&
                chatRow.driverLegStatus !== DRIVER_LEG.completed
              }
              compact
            />
          </div>
        </div>
      ) : null}
    </div>
  )
}

const ACCEPT_WINDOW_SEC = 15

function useOfferCountdown(offeredAtUtc: string | null) {
  const [left, setLeft] = useState(ACCEPT_WINDOW_SEC)
  useEffect(() => {
    if (!offeredAtUtc) return
    const tick = () => {
      const off = new Date(offeredAtUtc).getTime()
      setLeft(Math.max(0, ACCEPT_WINDOW_SEC - Math.floor((Date.now() - off) / 1000)))
    }
    tick()
    const id = window.setInterval(tick, 300)
    return () => window.clearInterval(id)
  }, [offeredAtUtc])
  return left
}

function IncomingCard({
  offeredAtUtc,
  row,
  busy,
  onAccept,
  onDecline,
}: {
  offeredAtUtc: string | null
  row: DriverDeliveryRow
  busy: boolean
  onAccept: () => void
  onDecline: () => void
}) {
  const left = useOfferCountdown(offeredAtUtc)
  return (
    <div className="rounded-xl border-2 border-amber-500/40 bg-amber-500/5 p-4 shadow-lg shadow-amber-900/20">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <p className="font-mono text-sm font-bold text-amber-100">{row.orderNumber}</p>
        <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-xs font-bold text-amber-200">
          {left}s
        </span>
      </div>
      <p className="mt-2 text-base font-semibold text-zinc-100">{row.restaurantName}</p>
      <p className="mt-1 text-[11px] text-amber-200/80">
        Njoftimi vjen në zile (sipër) dhe si toast — prano përpara se të skadojë koha.
      </p>
      <ul className="mt-2 space-y-1 text-xs text-zinc-400">
        <li>
          Deri te restoranti:{' '}
          <span className="text-zinc-200">
            {row.distanceToRestaurantKm != null ? `${row.distanceToRestaurantKm} km` : '— (ndiz GPS)'}
          </span>
        </li>
        <li>
          Restorant → klient:{' '}
          <span className="text-zinc-200">
            {row.distanceRestaurantToCustomerKm != null ? `${row.distanceRestaurantToCustomerKm} km` : '—'}
          </span>
        </li>
        <li>
          Pagesa e vlerësuar: <span className="font-medium text-emerald-300">{fmtMoney(row.estimatedDriverPayout)}</span>
        </li>
        <li>
          ETA e përafërt:{' '}
          <span className="text-zinc-200">~{row.estimatedTotalMinutes} min</span>
        </li>
      </ul>
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy}
          className="min-h-[44px] flex-1 rounded-xl bg-emerald-600 px-4 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
          onClick={onAccept}
        >
          Prano
        </button>
        <button
          type="button"
          disabled={busy}
          className="min-h-[44px] flex-1 rounded-xl border border-zinc-500/40 px-4 text-sm font-semibold text-zinc-200 hover:bg-white/5 disabled:opacity-50"
          onClick={onDecline}
        >
          Refuzo
        </button>
      </div>
    </div>
  )
}

function stepLabel(leg: number) {
  if (leg === DRIVER_LEG.headingToRestaurant) return '1/4 · Nisu drejt restorantit'
  if (leg === DRIVER_LEG.atRestaurant) return '2/4 · Arrita te restoranti'
  if (leg === DRIVER_LEG.enRouteToCustomer) return '3/4 · Nisur drejt klientit'
  return 'Dërgesë'
}

function JobCard({
  row,
  busyId,
  onArrived,
  onPickup,
  onDelivered,
  onOpenDetail,
  onOpenChat,
}: {
  row: DriverDeliveryRow
  busyId: number | null
  onArrived: () => void
  onPickup: () => void
  onDelivered: () => void
  onOpenDetail: () => void
  onOpenChat: () => void
}) {
  const toRest = mapsDirectionsUrl({
    destLat: row.restaurantLatitude,
    destLng: row.restaurantLongitude,
    labelFallback: `${row.restaurantAddressLine}, ${row.restaurantCity}`,
  })
  const toClientFromRestaurant = mapsDirectionsUrl({
    destLat: row.customerLatitude,
    destLng: row.customerLongitude,
    originLat: row.restaurantLatitude,
    originLng: row.restaurantLongitude,
    labelFallback: `${row.customerAddressLine1}, ${row.customerCity}`,
  })
  /** Nga pozicioni aktual (GPS) drejt klientit — për fazën «nisur drejt klientit». */
  const toClientFromHere = mapsDirectionsUrl({
    destLat: row.customerLatitude,
    destLng: row.customerLongitude,
    labelFallback: `${row.customerAddressLine1}, ${row.customerCity}`,
  })
  const enRouteToCustomer = row.driverLegStatus === DRIVER_LEG.enRouteToCustomer
  const mapToCustomerHref = enRouteToCustomer ? toClientFromHere : toClientFromRestaurant

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <p className="font-mono text-sm font-bold text-sky-200/95">{row.orderNumber}</p>
        <span className="text-xs text-zinc-500">{stepLabel(row.driverLegStatus)}</span>
      </div>
      <p className="mt-2 text-sm font-medium text-zinc-200">{row.restaurantName}</p>
      <p className="text-xs text-zinc-500">
        Klienti: {row.customerFirstName} {row.customerLastName}
      </p>
      {row.customerNotes ? (
        <p className="mt-2 rounded-lg bg-amber-500/10 px-2 py-1.5 text-xs text-amber-100">
          Shënim: {row.customerNotes}
        </p>
      ) : null}
      <p className="mt-2 text-xs text-zinc-400">
        {row.paymentMethodLabel}
        {row.cashCollectAtDoor ? (
          <span className="ml-2 font-semibold text-emerald-300">Mblidh {fmtMoney(row.orderTotal)}</span>
        ) : null}
      </p>
      {enRouteToCustomer && mapToCustomerHref ? (
        <a
          href={mapToCustomerHref}
          target="_blank"
          rel="noreferrer"
          className={`${customerBtnPrimary} mt-3 flex min-h-[48px] w-full items-center justify-center gap-2 text-sm font-semibold no-underline`}
        >
          <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <polygon points="3 11 22 2 13 21 11 13 3 11" />
          </svg>
          Hap hartën — navigo te klienti
        </a>
      ) : null}
      <div className="mt-2 flex flex-wrap gap-2 text-xs">
        {toRest ? (
          <a
            href={toRest}
            target="_blank"
            rel="noreferrer"
            className="rounded-lg bg-white/10 px-2 py-1 text-sky-300 hover:bg-white/15"
          >
            Harta → restorant
          </a>
        ) : null}
        {mapToCustomerHref ? (
          <a
            href={mapToCustomerHref}
            target="_blank"
            rel="noreferrer"
            className="rounded-lg bg-white/10 px-2 py-1 text-sky-300 hover:bg-white/15"
          >
            {enRouteToCustomer ? 'Harta → klienti (nga unë)' : 'Harta restorant → klient'}
          </a>
        ) : null}
        <button type="button" className="rounded-lg bg-white/5 px-2 py-1 text-zinc-300 hover:bg-white/10" onClick={onOpenDetail}>
          Detaje &amp; lista
        </button>
        <button
          type="button"
          className="inline-flex items-center gap-1 rounded-lg border border-violet-500/35 bg-violet-500/15 px-2 py-1 font-medium text-violet-100 hover:bg-violet-500/25"
          onClick={onOpenChat}
          title="Chat me klientin"
        >
          <svg className="h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          Chat klienti
        </button>
      </div>
      <div className="mt-3 flex flex-col gap-2 border-t border-white/[0.06] pt-3">
        {row.canMarkArrivedRestaurant ? (
          <button
            type="button"
            disabled={busyId === row.orderId}
            className={`${customerBtnPrimary} min-h-[44px] w-full text-sm`}
            onClick={onArrived}
          >
            Arrita te restoranti
          </button>
        ) : null}
        {row.canMarkPickedUp ? (
          <button
            type="button"
            disabled={busyId === row.orderId}
            className={`${customerBtnPrimary} min-h-[44px] w-full text-sm`}
            onClick={onPickup}
          >
            E mora porosinë
          </button>
        ) : null}
        {row.driverLegStatus === DRIVER_LEG.enRouteToCustomer ? (
          <p className="text-center text-xs text-sky-300/80">
            Harta përdor vendndodhjen tënde aktuale drejt adresës së klientit. Pas dorëzimit:
          </p>
        ) : null}
        {row.canMarkDelivered ? (
          <button
            type="button"
            disabled={busyId === row.orderId}
            className={`${customerBtnPrimary} min-h-[44px] w-full bg-emerald-600 text-sm hover:bg-emerald-500`}
            onClick={onDelivered}
          >
            Dorëzova te klienti
          </button>
        ) : null}
      </div>
    </>
  )
}

function DetailBody({ detail, token }: { detail: DriverOrderDetail; token: string }) {
  const chatVisible = detail.driverLegStatus !== DRIVER_LEG.pendingAccept
  const chatAllowPost =
    detail.orderStatus !== ORDER_STATUS_DELIVERED &&
    detail.orderStatus !== ORDER_STATUS_CANCELLED &&
    detail.driverLegStatus !== DRIVER_LEG.completed
  const rUrl = mapsDirectionsUrl({
    destLat: detail.restaurant.latitude,
    destLng: detail.restaurant.longitude,
    labelFallback: `${detail.restaurant.addressLine}, ${detail.restaurant.city}`,
  })
  const cUrl = mapsDirectionsUrl({
    destLat: detail.customer.latitude,
    destLng: detail.customer.longitude,
    labelFallback: `${detail.customer.addressLine}, ${detail.customer.city}`,
  })
  return (
    <div className="mt-3 space-y-4 text-sm">
      <div>
        <p className="text-xs font-semibold uppercase text-zinc-500">Restoranti</p>
        <p className="font-medium text-zinc-100">{detail.restaurant.displayName}</p>
        <p className="text-xs text-zinc-400">
          {detail.restaurant.addressLine}, {detail.restaurant.city}
        </p>
        {detail.restaurant.phone ? (
          <a href={`tel:${detail.restaurant.phone.replace(/\s/g, '')}`} className="text-xs text-sky-400">
            {detail.restaurant.phone}
          </a>
        ) : null}
        {rUrl ? (
          <a href={rUrl} target="_blank" rel="noreferrer" className="mt-1 block text-xs text-sky-400">
            Hap në hartë
          </a>
        ) : null}
      </div>
      <div>
        <p className="text-xs font-semibold uppercase text-zinc-500">Klienti</p>
        <p className="font-medium text-zinc-100">{detail.customer.displayName}</p>
        <p className="text-xs text-zinc-400">
          {detail.customer.addressLine}, {detail.customer.city}
        </p>
        {detail.customer.phone ? (
          <a href={`tel:${detail.customer.phone.replace(/\s/g, '')}`} className="text-xs text-sky-400">
            {detail.customer.phone}
          </a>
        ) : null}
        {cUrl ? (
          <a href={cUrl} target="_blank" rel="noreferrer" className="mt-1 block text-xs text-sky-400">
            Hap në hartë (pin)
          </a>
        ) : null}
      </div>
      {detail.customerNotes ? (
        <p className="rounded-lg bg-amber-500/10 px-2 py-2 text-xs text-amber-100">Shënim: {detail.customerNotes}</p>
      ) : null}
      <div>
        <p className="text-xs font-semibold uppercase text-zinc-500">Produktet</p>
        <ul className="mt-1 space-y-1 text-xs text-zinc-300">
          {detail.lines.map((l, i) => (
            <li key={i}>
              {l.quantity}× {l.name} — {fmtMoney(l.unitPrice * l.quantity)}
            </li>
          ))}
        </ul>
        <p className="mt-2 text-xs text-zinc-500">
          {detail.paymentMethodLabel}
          {detail.cashToCollect != null ? (
            <span className="ml-2 text-emerald-300">Cash në dorë: {fmtMoney(detail.cashToCollect)}</span>
          ) : null}
        </p>
      </div>
      {chatVisible ? (
        <OrderDeliveryChatPanel
          token={token}
          orderId={detail.orderId}
          allowPost={chatAllowPost}
          compact
        />
      ) : null}
    </div>
  )
}
