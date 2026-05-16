import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { useSearchParams } from 'react-router-dom'
import {
  isCourierEnRouteToCustomer,
  ORDER_STATUS_CANCELLED,
  ORDER_STATUS_DELIVERED,
  ORDER_STATUS_OUT_FOR_DELIVERY,
} from '../lib/orderStatusLabels'
import { FULFILLMENT_PICKUP, type CustomerOrderDetail } from '../lib/ordersApi'
import { OrderTrackingMapLeaflet } from './OrderTrackingMapLeaflet'

type Step = { id: string; pill: string; line: string }

const DELIVERY_STEPS: Step[] = [
  { id: '0', pill: 'Dërguar', line: 'Porosia u dërgua te restoranti.' },
  { id: '1', pill: 'Pranuar', line: 'Restoranti e pranoi — gatimi fillon.' },
  { id: '2', pill: 'Përgatitje', line: 'Ushqimi po përgatitet në kuzhinë.' },
  { id: '5', pill: 'Gati', line: 'Gati për korrier — së shpejti niset për ty.' },
  { id: '3', pill: 'Nisur', line: 'Korrieri është nisur drejt adresës suaj.' },
  { id: '4', pill: 'Dorëzuar', line: 'Porosia mbërriti. Faleminderit!' },
]

const PICKUP_STEPS: Step[] = [
  { id: '0', pill: 'Dërguar', line: 'Porosia u dërgua te restoranti.' },
  { id: '1', pill: 'Pranuar', line: 'Restoranti e pranoi porosinë.' },
  { id: '2', pill: 'Përgatitje', line: 'Po përgatitet për marrje.' },
  { id: '5', pill: 'Gati', line: 'Mund ta marrësh në restoran.' },
  { id: '4', pill: 'Marrë', line: 'Porosia u përfundua.' },
]

/** Indeksi aktiv në vargun e hapave (0-based), vetëm nga statusi i porosisë. */
function deliveryStepIndex(status: number): number {
  if (status === ORDER_STATUS_CANCELLED) return -1
  const m: Record<number, number> = {
    0: 0,
    1: 1,
    2: 2,
    5: 3,
    3: 4,
    4: 5,
  }
  return m[status] ?? 0
}

/** Përfshin edhe fazën e Deliver (në rrugë te klienti) kur API/SignalR janë për një moment të padukshëm. */
function deliveryTimelineActiveIndex(order: CustomerOrderDetail): number {
  if (!pickupOrder(order) && isCourierEnRouteToCustomer(order)) return 4
  return deliveryStepIndex(order.status)
}

function pickupOrder(order: CustomerOrderDetail): boolean {
  return order.fulfillmentType === FULFILLMENT_PICKUP
}

function pickupStepIndex(status: number): number {
  if (status === ORDER_STATUS_CANCELLED) return -1
  const m: Record<number, number> = {
    0: 0,
    1: 1,
    2: 2,
    5: 3,
    4: 4,
  }
  if (status === ORDER_STATUS_OUT_FOR_DELIVERY) return 3
  return m[status] ?? 0
}

type Props = {
  order: CustomerOrderDetail
  driverForMap: { lat: number; lng: number } | null
  liveDriver: boolean
  courierEtaMinutes: number | null
}

export function OrderDeliveryTracking({ order, driverForMap, liveDriver, courierEtaMinutes }: Props) {
  const gradId = `fd-order-track-${order.id}`
  const [mapOpen, setMapOpen] = useState(false)
  const [searchParams, setSearchParams] = useSearchParams()
  const pickup = pickupOrder(order)

  const steps = pickup ? PICKUP_STEPS : DELIVERY_STEPS
  const activeIdx = pickup ? pickupStepIndex(order.status) : deliveryTimelineActiveIndex(order)
  const cancelled = order.status === ORDER_STATUS_CANCELLED
  const delivered = order.status === ORDER_STATUS_DELIVERED

  const progress = useMemo(() => {
    if (cancelled) return 0
    if (delivered) return 1
    if (activeIdx < 0) return 0
    return Math.min(1, (activeIdx + 0.15) / Math.max(1, steps.length - 0.85))
  }, [activeIdx, cancelled, delivered, steps.length])

  const ringPct = delivered ? 100 : Math.round(progress * 100)

  const centerLine = useMemo(() => {
    if (cancelled) return 'Porosia u anulua.'
    if (activeIdx < 0 || activeIdx >= steps.length) return steps[0]?.line ?? ''
    let line = steps[activeIdx]!.line
    if (!pickup && isCourierEnRouteToCustomer(order) && courierEtaMinutes != null) {
      line = `Korrieri është nisur — rreth ${courierEtaMinutes} min deri te ti (vlerësim).`
    }
    return line
  }, [activeIdx, cancelled, courierEtaMinutes, order, pickup, steps])

  const restaurantPt =
    order.restaurantLatitude != null && order.restaurantLongitude != null
      ? {
          lat: order.restaurantLatitude,
          lng: order.restaurantLongitude,
          title: order.restaurantName,
          label: 'R',
          color: '#d97706',
        }
      : null
  const customerPt =
    order.customerLatitude != null && order.customerLongitude != null
      ? {
          lat: order.customerLatitude,
          lng: order.customerLongitude,
          title: 'Adresa e dorëzimit',
          label: 'K',
          color: '#38bdf8',
        }
      : null
  const driverPt = driverForMap
    ? {
        ...driverForMap,
        title: liveDriver ? 'Korrieri (live GPS)' : 'Korrieri',
        label: 'D',
        color: '#34d399',
      }
    : null

  const canOpenMap = !!(restaurantPt || customerPt || driverPt) && !cancelled

  useEffect(() => {
    if (searchParams.get('harta') !== '1') return
    if (!canOpenMap) return
    setMapOpen(true)
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        next.delete('harta')
        return next
      },
      { replace: true },
    )
  }, [searchParams, canOpenMap, setSearchParams])

  useEffect(() => {
    if (!mapOpen) return
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.scrollTo(0, 0)
    return () => {
      document.body.style.overflow = prevOverflow
    }
  }, [mapOpen])

  const mapModal =
    mapOpen && typeof document !== 'undefined'
      ? createPortal(
          <div
            className="fixed inset-0 z-[200] overflow-y-auto bg-black/75 p-3 backdrop-blur-sm sm:p-6"
            role="dialog"
            aria-modal="true"
            aria-label="Harta e gjurmimit"
            onClick={() => setMapOpen(false)}
          >
            {/*
              `customerCard` përdor backdrop-blur; në shumë shfletues `fixed` brenda tij lidhet me kartën,
              jo me viewport — modal-i duket “poshtë”. Portal te body + qendër me min-h-full.
            */}
            <div className="flex min-h-full w-full items-center justify-center">
              <div
                className="flex w-full max-w-lg max-h-[min(90dvh,680px)] flex-col overflow-hidden rounded-2xl border border-white/15 bg-zinc-950 shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex shrink-0 items-center justify-between border-b border-white/10 px-4 py-3">
                  <p className="text-sm font-semibold text-zinc-100">
                    {pickup ? 'Harta' : 'Ku është korrieri'}
                  </p>
                  <button
                    type="button"
                    onClick={() => setMapOpen(false)}
                    className="rounded-lg border border-white/15 px-3 py-1.5 text-xs font-medium text-zinc-300 hover:bg-white/5"
                  >
                    Mbyll
                  </button>
                </div>
                <div className="min-h-0 w-full shrink-0 p-3">
                  <OrderTrackingMapLeaflet
                    restaurant={restaurantPt}
                    customer={customerPt}
                    driver={driverPt}
                    followDriver={!!driverPt}
                    driverEtaMinutes={
                      !pickup && isCourierEnRouteToCustomer(order) ? courierEtaMinutes : null
                    }
                    className="h-[min(52dvh,420px)] min-h-[260px] w-full overflow-hidden rounded-xl border border-white/[0.08]"
                  />
                </div>
                <p className="shrink-0 border-t border-white/10 px-4 py-2 text-center text-[10px] text-zinc-500">
                  R restorant · K adresa jote · D korrieri
                </p>
              </div>
            </div>
          </div>,
          document.body,
        )
      : null

  return (
    <>
      <div className="overflow-hidden rounded-2xl border border-white/[0.1] bg-gradient-to-b from-zinc-900/90 to-zinc-950/95 p-4 shadow-lg shadow-black/20">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
          Gjurmimi i porosisë
        </p>

        {cancelled ? (
          <p className="mt-3 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200/95">
            Kjo porosi u anulua.
          </p>
        ) : null}

        {/* Hapat — scroll horizontal (stil aplikacioni) */}
        <div className="mt-4 -mx-1 flex gap-2 overflow-x-auto pb-2 pt-1 [scrollbar-width:thin] snap-x snap-mandatory">
          {steps.map((s, i) => {
            const done = !cancelled && (delivered || i < activeIdx)
            const current = !cancelled && !delivered && i === activeIdx
            return (
              <div
                key={s.id + i}
                className="flex min-w-[4.25rem] shrink-0 snap-center flex-col items-center gap-1.5"
              >
                <div
                  className={`flex h-11 w-11 items-center justify-center rounded-full border-2 text-[11px] font-bold transition ${
                    done
                      ? 'border-emerald-400/60 bg-emerald-500/25 text-emerald-100'
                      : current
                        ? 'border-amber-400/80 bg-amber-500/20 text-amber-100 shadow-[0_0_20px_rgba(251,191,36,0.15)]'
                        : 'border-zinc-600/80 bg-zinc-800/40 text-zinc-500'
                  }`}
                  aria-current={current ? 'step' : undefined}
                >
                  {done ? '✓' : i + 1}
                </div>
                <span
                  className={`max-w-[4.25rem] text-center text-[10px] font-medium leading-tight ${
                    current ? 'text-amber-200/90' : done ? 'text-emerald-200/80' : 'text-zinc-500'
                  }`}
                >
                  {s.pill}
                </span>
              </div>
            )
          })}
        </div>

        {/* Qendra — rreth + hap hartën */}
        {!cancelled ? (
          <button
            type="button"
            onClick={() => {
              if (canOpenMap) setMapOpen(true)
            }}
            disabled={!canOpenMap}
            className="relative mt-5 flex w-full flex-col items-center rounded-2xl border border-white/[0.08] bg-zinc-900/40 px-4 py-6 text-center transition hover:border-amber-500/25 hover:bg-zinc-900/60 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <span className="pointer-events-none relative flex h-36 w-36 items-center justify-center">
              <svg
                className="absolute h-full w-full -rotate-90 text-zinc-800"
                viewBox="0 0 100 100"
                aria-hidden
              >
                <circle
                  cx="50"
                  cy="50"
                  r="42"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="7"
                  className="text-zinc-800"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="42"
                  fill="none"
                  stroke={`url(#${gradId})`}
                  strokeWidth="7"
                  strokeLinecap="round"
                  strokeDasharray={`${(ringPct / 100) * 264} 264`}
                  className="transition-[stroke-dasharray] duration-500 ease-out"
                />
                <defs>
                  <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#7dd3fc" />
                    <stop offset="100%" stopColor="#38bdf8" />
                  </linearGradient>
                </defs>
              </svg>
              <span className="relative z-[1] flex max-w-[7.5rem] flex-col items-center gap-1">
                {!pickup && isCourierEnRouteToCustomer(order) && courierEtaMinutes != null ? (
                  <>
                    <span className="font-sans text-[2rem] font-bold leading-none tracking-tight text-white tabular-nums">
                      {Math.round(courierEtaMinutes)}
                    </span>
                    <span className="mt-1 font-sans text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-400">
                      MIN
                    </span>
                    <span className="mt-2 text-[11px] leading-snug text-zinc-500">
                      vlerësim sipas distancës
                    </span>
                  </>
                ) : delivered ? (
                  <span className="text-lg font-semibold text-emerald-200">
                    {pickup ? 'U mbyll!' : 'Dorëzuar!'}
                  </span>
                ) : (
                  <span className="text-3xl font-light text-zinc-400">{activeIdx + 1}</span>
                )}
              </span>
            </span>
            <p className="mt-4 max-w-sm text-sm font-medium leading-snug text-zinc-100">{centerLine}</p>
            {liveDriver && driverForMap ? (
              <p className="mt-1 text-xs text-sky-400/90">GPS live · përditësohet automatikisht</p>
            ) : null}
            <span className="mt-3 text-xs font-semibold text-amber-400/90">
              {canOpenMap
                ? pickup
                  ? 'Prek për hartën (restoranti & adresa)'
                  : 'Prek për hartën · ku është korrieri'
                : 'Harta kur të ketë koordinata GPS'}
            </span>
          </button>
        ) : null}

        <p className="mt-3 text-center text-[10px] text-zinc-600">
          Harta: OpenStreetMap — pa nevojë për Google API key.
        </p>
      </div>

      {mapModal}
    </>
  )
}
