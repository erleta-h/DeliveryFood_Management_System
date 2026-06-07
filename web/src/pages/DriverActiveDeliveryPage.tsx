import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  DRIVER_LEG,
  fetchDriverOrderDetail,
  mapsDirectionsUrl,
  postDriverArrivedRestaurant,
  postDriverPickup,
  postDriverDelivered,
  type DriverOrderDetail,
} from '../lib/driverApi'
import { useAuthStore } from '../store/authStore'

function money(n: number) {
  return `${(Number.isFinite(n) ? n : 0).toFixed(2)} €`
}

function googleMapsEmbedUrl(
  originLat?: number | null,
  originLng?: number | null,
  destLat?: number | null,
  destLng?: number | null,
) {
  if (destLat == null || destLng == null) return null
  const origin =
    originLat != null && originLng != null ? `${originLat},${originLng}` : ''
  const dest = `${destLat},${destLng}`
  if (origin) {
    return `https://www.google.com/maps/embed/v1/directions?key=AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8&origin=${origin}&destination=${dest}&mode=driving`
  }
  return `https://www.google.com/maps/embed/v1/place?key=AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8&q=${dest}`
}

function MapEmbed({
  originLat,
  originLng,
  destLat,
  destLng,
}: {
  originLat?: number | null
  originLng?: number | null
  destLat?: number | null
  destLng?: number | null
}) {
  const url = googleMapsEmbedUrl(originLat, originLng, destLat, destLng)
  if (!url) {
    return (
      <div className="flex h-full items-center justify-center bg-[#0d1117] text-sm text-zinc-600">
        Koordinatat mungojnë
      </div>
    )
  }
  return (
    <iframe
      src={url}
      className="h-full w-full border-0"
      allowFullScreen
      loading="lazy"
      referrerPolicy="no-referrer-when-downgrade"
      title="Harta"
    />
  )
}

function BackHeader({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <div className="flex items-center gap-3 px-4 pb-3 pt-4">
      <button
        type="button"
        onClick={onBack}
        className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-zinc-200 active:bg-white/20"
        aria-label="Kthehu"
      >
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M19 12H5M12 19l-7-7 7-7" />
        </svg>
      </button>
      <h1 className="text-base font-semibold text-zinc-100">{title}</h1>
    </div>
  )
}

function OrderFooterBar({ detail }: { detail: DriverOrderDetail }) {
  return (
    <div className="flex items-center gap-3 border-t border-white/[0.06] bg-[#111827] px-4 py-3">
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/20">
        <svg className="h-4 w-4 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="2" y="7" width="20" height="14" rx="2" />
          <path d="M16 3h-8l-2 4h12z" />
        </svg>
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-medium text-zinc-300">Porosia</p>
        <p className="truncate font-mono text-[11px] text-zinc-500">{detail.orderNumber}</p>
      </div>
      <p className="text-sm font-bold text-zinc-100">{money(detail.total)}</p>
    </div>
  )
}

// ──────────── Step 1: Navigate to Restaurant ────────────

function NavigateToRestaurantView({
  detail,
  busy,
  onArrived,
  onBack,
}: {
  detail: DriverOrderDetail
  busy: boolean
  onArrived: () => void
  onBack: () => void
}) {
  const navUrl = mapsDirectionsUrl({
    destLat: detail.restaurant.latitude,
    destLng: detail.restaurant.longitude,
    labelFallback: `${detail.restaurant.addressLine}, ${detail.restaurant.city}`,
  })

  return (
    <div className="flex h-full flex-col">
      <BackHeader title="Navigo te restoranti" onBack={onBack} />

      <div className="relative h-[40vh] min-h-[200px] w-full overflow-hidden">
        <MapEmbed
          destLat={detail.restaurant.latitude}
          destLng={detail.restaurant.longitude}
        />
      </div>

      <div className="flex-1 space-y-4 px-4 py-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Shko te restoranti</p>
          <p className="mt-1 text-lg font-bold text-zinc-100">{detail.restaurant.displayName}</p>
          <p className="text-sm text-zinc-400">
            {detail.restaurant.addressLine}, {detail.restaurant.city}
          </p>
        </div>

        <button
          type="button"
          disabled={busy}
          onClick={onArrived}
          className="flex min-h-[52px] w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 text-base font-bold text-white shadow-lg shadow-emerald-900/30 transition active:scale-[0.98] disabled:opacity-50"
        >
          Kam arritur
        </button>

        <div className="flex items-center gap-3">
          {detail.restaurant.phone ? (
            <a
              href={`tel:${detail.restaurant.phone.replace(/\s/g, '')}`}
              className="flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 text-sm font-medium text-zinc-200 active:bg-white/10"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
              </svg>
              Kontakto restorantin
            </a>
          ) : null}
          {navUrl ? (
            <a
              href={navUrl}
              target="_blank"
              rel="noreferrer"
              className="flex h-[44px] w-[44px] items-center justify-center rounded-xl border border-white/10 bg-white/5 text-zinc-300 active:bg-white/10"
              title="Hap Google Maps"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="3 11 22 2 13 21 11 13 3 11" />
              </svg>
            </a>
          ) : null}
        </div>
      </div>

      <OrderFooterBar detail={detail} />
    </div>
  )
}

// ──────────── Step 2: Pickup Confirmation ────────────

function PickupConfirmView({
  detail,
  busy,
  onPickup,
  onBack,
}: {
  detail: DriverOrderDetail
  busy: boolean
  onPickup: () => void
  onBack: () => void
}) {
  const navigate = useNavigate()

  return (
    <div className="flex h-full flex-col">
      <BackHeader title="Merr porosinë" onBack={onBack} />

      <div className="flex flex-1 flex-col items-center justify-center px-6">
        <div className="flex h-28 w-28 items-center justify-center rounded-full bg-emerald-500/15 ring-2 ring-emerald-500/30">
          <svg className="h-14 w-14 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M20 12v10H4V12" />
            <path d="M2 7h20v5H2z" />
            <path d="M12 22V7" />
            <path d="M12 7H7.5a2.5 2.5 0 1 1 0-5C11 2 12 7 12 7z" />
            <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" />
          </svg>
        </div>

        <h2 className="mt-6 text-xl font-bold text-zinc-100">A e ke marrë porosinë?</h2>
        <p className="mt-2 text-center text-sm text-zinc-400">
          Konfirmo pasi ta kesh marrë porosinë nga restoranti.
        </p>

        <button
          type="button"
          disabled={busy}
          onClick={onPickup}
          className="mt-8 flex min-h-[52px] w-full max-w-xs items-center justify-center gap-2 rounded-2xl bg-emerald-600 text-base font-bold text-white shadow-lg shadow-emerald-900/30 transition active:scale-[0.98] disabled:opacity-50"
        >
          E mora porosinë
        </button>

        <button
          type="button"
          onClick={() => navigate(`/driver/chat/${detail.orderId}`)}
          className="mt-3 flex min-h-[44px] w-full max-w-xs items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 text-sm text-zinc-300 active:bg-white/10"
        >
          Ka problem
        </button>
      </div>
    </div>
  )
}

// ──────────── Step 3: Navigate to Customer ────────────

function NavigateToCustomerView({
  detail,
  busy,
  onDelivered,
  onBack,
}: {
  detail: DriverOrderDetail
  busy: boolean
  onDelivered: () => void
  onBack: () => void
}) {
  const navigate = useNavigate()
  const navUrl = mapsDirectionsUrl({
    destLat: detail.customer.latitude,
    destLng: detail.customer.longitude,
    labelFallback: `${detail.customer.addressLine}, ${detail.customer.city}`,
  })

  return (
    <div className="flex h-full flex-col">
      <BackHeader title="Navigo te klienti" onBack={onBack} />

      <div className="relative h-[40vh] min-h-[200px] w-full overflow-hidden">
        <MapEmbed
          originLat={detail.restaurant.latitude}
          originLng={detail.restaurant.longitude}
          destLat={detail.customer.latitude}
          destLng={detail.customer.longitude}
        />
      </div>

      <div className="flex-1 space-y-4 px-4 py-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Shko te klienti</p>
          <p className="mt-1 text-lg font-bold text-zinc-100">{detail.customer.displayName}</p>
          <p className="text-sm text-zinc-400">
            {detail.customer.addressLine}, {detail.customer.city}
          </p>
        </div>

        <button
          type="button"
          disabled={busy}
          onClick={onDelivered}
          className="flex min-h-[52px] w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 text-base font-bold text-white shadow-lg shadow-emerald-900/30 transition active:scale-[0.98] disabled:opacity-50"
        >
          Kam arritur te klienti
        </button>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(`/driver/chat/${detail.orderId}`)}
            className="flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 text-sm font-medium text-zinc-200 active:bg-white/10"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            Kontakto klientin
          </button>
          {navUrl ? (
            <a
              href={navUrl}
              target="_blank"
              rel="noreferrer"
              className="flex h-[44px] w-[44px] items-center justify-center rounded-xl border border-white/10 bg-white/5 text-zinc-300 active:bg-white/10"
              title="Hap Google Maps"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="3 11 22 2 13 21 11 13 3 11" />
              </svg>
            </a>
          ) : null}
        </div>
      </div>

      <OrderFooterBar detail={detail} />
    </div>
  )
}

// ──────────── Step 4: Delivery Complete ────────────

function DeliveryCompleteView({
  detail,
}: {
  detail: DriverOrderDetail
  onBack: () => void
}) {
  const [rating, setRating] = useState(0)
  const navigate = useNavigate()

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-1 flex-col items-center justify-center px-6">
        <div className="flex h-28 w-28 items-center justify-center rounded-full bg-emerald-500/15 ring-2 ring-emerald-500/30">
          <svg className="h-16 w-16 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M20 6L9 17l-5-5" />
          </svg>
        </div>

        <h2 className="mt-6 text-xl font-bold text-zinc-100">Porosia u dorëzua!</h2>
        <p className="mt-1 text-sm text-zinc-500">Faleminderit.</p>

        <div className="mt-6 flex items-center gap-4">
          <div>
            <p className="text-xs text-zinc-500">Fitimi</p>
            <p className="text-2xl font-bold text-emerald-400">{money(detail.deliveryFee)}</p>
          </div>
          {detail.cashCollectAtDoor ? (
            <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-bold text-emerald-300 ring-1 ring-emerald-500/30">
              Cash
            </span>
          ) : (
            <span className="rounded-full bg-sky-500/15 px-3 py-1 text-xs font-bold text-sky-300 ring-1 ring-sky-500/30">
              Kartë
            </span>
          )}
        </div>

        <div className="mt-8">
          <p className="text-center text-sm text-zinc-400">Vlerëso klientin</p>
          <div className="mt-2 flex justify-center gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setRating(star)}
                className="p-1 transition active:scale-110"
                aria-label={`${star} yje`}
              >
                <svg
                  className={`h-9 w-9 ${star <= rating ? 'fill-amber-400 text-amber-400' : 'fill-none text-zinc-600'}`}
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="1.5"
                >
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
              </button>
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={() => navigate('/driver')}
          className="mt-8 flex min-h-[52px] w-full max-w-xs items-center justify-center rounded-2xl bg-emerald-600 text-base font-bold text-white shadow-lg shadow-emerald-900/30 transition active:scale-[0.98]"
        >
          Përfundo porosinë
        </button>
      </div>
    </div>
  )
}

// ──────────── Main Page ────────────

export default function DriverActiveDeliveryPage() {
  const { orderId: rawId } = useParams()
  const orderId = Number(rawId)
  const navigate = useNavigate()
  const token = useAuthStore((s) => s.token)

  const [detail, setDetail] = useState<DriverOrderDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [completed, setCompleted] = useState(false)

  const load = useCallback(async () => {
    if (!token || !Number.isFinite(orderId)) return
    setError(null)
    try {
      const d = await fetchDriverOrderDetail(token, orderId)
      if (!d) {
        setDetail((prev) => {
          if (prev) return prev
          setError('Porosia nuk u gjet.')
          return null
        })
        return
      }
      setDetail(d)
      if (d.driverLegStatus === DRIVER_LEG.completed) setCompleted(true)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Gabim.')
    } finally {
      setLoading(false)
    }
  }, [token, orderId])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    if (!token || completed || detail?.driverLegStatus === DRIVER_LEG.completed) return
    const t = window.setInterval(() => {
      if (document.visibilityState !== 'visible') return
      void load()
    }, 5000)
    return () => window.clearInterval(t)
  }, [token, load, completed, detail?.driverLegStatus])

  async function action(
    fn: () => Promise<{ ok: true } | { ok: false; message: string }>,
    opts?: { reload?: boolean },
  ) {
    if (!token) return
    setBusy(true)
    setError(null)
    const r = await fn()
    setBusy(false)
    if (!r.ok) {
      setError(r.message)
      return
    }
    if (opts?.reload === false || completed) return
    void load()
  }

  function goBack() {
    navigate('/driver')
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a0e17]">
        <p className="text-sm text-zinc-500">Duke ngarkuar…</p>
      </div>
    )
  }

  if (error && !detail) {
    return (
      <div className="flex min-h-screen flex-col bg-[#0a0e17] p-4">
        <BackHeader title="Dërgesa" onBack={goBack} />
        <p className="mt-4 text-sm text-red-300">{error}</p>
      </div>
    )
  }

  if (!detail) return null

  if (completed || detail.driverLegStatus === DRIVER_LEG.completed) {
    return (
      <div className="flex min-h-screen flex-col bg-[#0a0e17]">
        <DeliveryCompleteView detail={detail} onBack={goBack} />
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#0a0e17]">
      {error ? (
        <div className="mx-4 mt-2 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-200">
          {error}
        </div>
      ) : null}

      {detail.driverLegStatus === DRIVER_LEG.headingToRestaurant ? (
        <NavigateToRestaurantView
          detail={detail}
          busy={busy}
          onArrived={() => void action(() => postDriverArrivedRestaurant(token!, orderId))}
          onBack={goBack}
        />
      ) : detail.driverLegStatus === DRIVER_LEG.atRestaurant ? (
        <PickupConfirmView
          detail={detail}
          busy={busy}
          onPickup={() =>
            void action(() => postDriverPickup(token!, orderId))
          }
          onBack={goBack}
        />
      ) : detail.driverLegStatus === DRIVER_LEG.enRouteToCustomer ? (
        <NavigateToCustomerView
          detail={detail}
          busy={busy}
          onDelivered={() =>
            void action(async () => {
              const r = await postDriverDelivered(token!, orderId)
              if (r.ok) setCompleted(true)
              return r
            }, { reload: false })
          }
          onBack={goBack}
        />
      ) : (
        <div className="p-4">
          <BackHeader title="Dërgesa" onBack={goBack} />
          <p className="text-sm text-zinc-400">Statusi: {detail.driverLegStatus}</p>
        </div>
      )}
    </div>
  )
}
