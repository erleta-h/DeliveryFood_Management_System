import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useAuthStore } from '../store/authStore'
import {
  fetchKitchenAssignableDrivers,
  fetchKitchenContext,
  fetchKitchenOrders,
  fetchKitchenTodayStats,
  isKitchenHttpUnauthorized,
  patchKitchenAssignDriver,
  patchKitchenPrepMinutes,
  patchKitchenOrderStatus,
  type KitchenAssignableDriver,
  type KitchenOrder,
  type KitchenTodayStats,
} from '../lib/kitchenApi'
import { DRIVER_LEG } from '../lib/driverApi'
import { distanceKmBetween, type LatLng } from '../lib/geo'
import { createOrdersHubConnection } from '../lib/orderHub'
import {
  KitchenOrderDetailsDrawer,
  MerchantCardFooterActions,
  MerchantDetailsBtn,
} from '../components/kitchen/KitchenOrderDetailsDrawer'
import {
  ColumnEmptyState,
  KanbanColumn,
  MerchantAssignDriverBtn,
  MerchantGhostBtn,
  MerchantOrderCard,
  MerchantPrimaryBtn,
  RecentHistorySection,
  StatsRow,
} from '../components/kitchen/MerchantKitchenUi.tsx'

/** Tingull i shkurtër për porosi të re (tablet). */
function playNewOrderChime() {
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    const ctx = new Ctx()
    const o = ctx.createOscillator()
    const g = ctx.createGain()
    o.type = 'sine'
    o.frequency.setValueAtTime(740, ctx.currentTime)
    o.connect(g)
    g.connect(ctx.destination)
    g.gain.setValueAtTime(0.0001, ctx.currentTime)
    g.gain.exponentialRampToValueAtTime(0.07, ctx.currentTime + 0.02)
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.35)
    o.start(ctx.currentTime)
    o.stop(ctx.currentTime + 0.36)
    void ctx.close()
  } catch {
    /* shfletuesi bllokoi audio pa gesture — ignorojmë */
  }
}

const S = {
  Pending: 0,
  Confirmed: 1,
  Preparing: 2,
  ReadyForPickup: 5,
  OutForDelivery: 3,
  Delivered: 4,
  Cancelled: 9,
} as const

function useNowTick(enabled: boolean) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!enabled) return
    const id = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [enabled])
  return now
}

function shortCourierLabel(display: string | null | undefined) {
  if (!display?.trim()) return 'Korrier'
  const parts = display.trim().split(/\s+/)
  if (parts.length === 1) return parts[0]!
  const last = parts[parts.length - 1]!
  const first = parts.slice(0, -1).join(' ')
  return `${first} ${last[0]!.toUpperCase()}.`
}

/** Emri i klientit si në Wolt «Mike O.». */
function shortCustomerLabel(o: KitchenOrder) {
  const f = o.customerFirstName?.trim() || ''
  const l = o.customerLastName?.trim() || ''
  if (!f && !l) return 'Klient'
  if (!l) return f
  return `${f} ${l[0]!.toUpperCase()}.`
}

/** Ikonë makine si Wolt (siluetë e bardhë në rreth). */
function WoltCarGlyph({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 13h16l-1-4H5L4 13zm0 0v3h2.5M20 16v-3M4 16h16M7 17.5a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3zm10 0a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3z"
        stroke="currentColor"
        strokeWidth="1.35"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M6 9l1-2h10l1 2" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" />
    </svg>
  )
}

/**
 * Rreshti «Pickup in …» identik me copy-n e Wolt (anglisht) + ngjyra jeshile kur < 2 min.
 */
function woltPickupParts(
  o: KitchenOrder,
  nowMs: number,
): { lead: string; timePart: string; timeGreen: boolean; sub?: string } {
  if (o.fulfillmentType === 'pickup')
    return { lead: 'Pickup', timePart: 'pickup at venue', timeGreen: false }

  const leg = o.deliveryLegStatus
  if (leg == null) {
    if (o.assignedDriverUserId != null)
      return { lead: 'Pickup in', timePart: '~10 min', timeGreen: false, sub: 'Courier en route' }
    return { lead: 'Pickup in', timePart: '…', timeGreen: false }
  }

  if (leg === DRIVER_LEG.pendingAccept) {
    const off = o.deliveryOfferedAtUtc ? Date.parse(o.deliveryOfferedAtUtc) : nowMs
    const secLeft = Math.max(0, Math.ceil(10 - (nowMs - off) / 1000))
    if (secLeft > 0)
      return {
        lead: 'Offer to courier',
        timePart: `${secLeft}s`,
        timeGreen: secLeft <= 3,
      }
    return { lead: 'Pickup in', timePart: 'waiting…', timeGreen: false }
  }
  if (leg === DRIVER_LEG.headingToRestaurant) {
    const acc = o.deliveryAcceptedAtUtc ? Date.parse(o.deliveryAcceptedAtUtc) : nowMs
    const elapsedMin = (nowMs - acc) / 60_000
    const estimateTotal = 12
    const rem = Math.max(1, Math.ceil(estimateTotal - elapsedMin))
    const urgent = rem <= 2
    return {
      lead: 'Pickup in',
      timePart: urgent ? `< ${rem} min` : `${rem} min`,
      timeGreen: urgent,
    }
  }
  if (leg === DRIVER_LEG.atRestaurant)
    return { lead: 'Pickup', timePart: 'at restaurant', timeGreen: true }
  if (leg === DRIVER_LEG.enRouteToCustomer)
    return { lead: 'On the way', timePart: 'to customer', timeGreen: false }
  return { lead: 'Pickup', timePart: '—', timeGreen: false }
}

function woltEnRouteParts(): { lead: string; timePart: string; timeGreen: boolean } {
  return { lead: 'Delivery', timePart: 'in progress', timeGreen: false }
}

/**
 * «Out»: kupon porosi. «Ready» + delivery pa korrier: tre kuponat më të afërt; prekja cakton manualisht.
 * Gjatë përgatitjes të njëjtat kuponat (vetëm pamje) rifreskohen me listën e korrierëve të panelit.
 */
export function DeliverWoltRailCard({
  o,
  nowMs,
  mode,
  busy = false,
  assignableDrivers = [],
  onAssignNearest,
  onPickupComplete,
}: {
  o: KitchenOrder
  nowMs: number
  mode: 'ready' | 'enroute'
  busy?: boolean
  assignableDrivers?: KitchenAssignableDriver[]
  onAssignNearest?: (orderId: number, driverUserId: number) => void
  onPickupComplete?: (orderId: number) => void
}) {
  const readyParts = mode === 'ready' ? woltPickupParts(o, nowMs) : null
  const parts = readyParts ?? woltEnRouteParts()
  const orderShort = o.orderNumber.startsWith('FD-') ? o.orderNumber.slice(3) : o.orderNumber
  const typeLabel = o.fulfillmentType === 'pickup' ? 'Pickup' : 'Delivery'
  const vehicleLabel = o.assignedDriverVehicleType?.trim() || typeLabel
  const needsDriverAssign =
    mode === 'ready' &&
    o.fulfillmentType !== 'pickup' &&
    o.assignedDriverUserId == null &&
    onAssignNearest != null

  const shell =
    'rounded-[1.35rem] bg-[#3d424f] px-3 pb-3.5 pt-3 text-center shadow-[0_4px_14px_rgba(0,0,0,0.4)] ring-1 ring-black/25'

  /** Delivery pa korrier: kuponat e korrierëve sipas afërsisë (si Wolt Ready). */
  if (needsDriverAssign) {
    return (
      <article className={shell}>
        <div className="flex items-start justify-end">
          <p className="text-[13px] font-semibold tabular-nums text-white/90">{o.total.toFixed(2)} €</p>
        </div>
        <div className="-mt-1 flex flex-col items-center border-b border-white/[0.06] pb-2.5">
          <div className="rounded-full bg-[#2c3038] px-3 py-1 ring-1 ring-black/30">
            <span className="text-[15px] font-bold tracking-tight text-white">
              <span className="text-zinc-500">#</span>
              {orderShort}
            </span>
          </div>
          <p className="mt-1.5 max-w-full truncate px-1 text-[11px] text-zinc-500">{shortCustomerLabel(o)}</p>
        </div>

        <div className="max-h-[min(48vh,380px)] overflow-y-auto overscroll-y-contain pr-0.5">
          <DriverProximityCouponsList
            o={o}
            assignableDrivers={assignableDrivers}
            interactive
            busy={busy}
            onAssignDriver={(du) => onAssignNearest!(o.id, du)}
            intro={
              <>
                <span className="font-medium text-zinc-400">3 më të afërtit</span> — prek për caktim manual nëse #1
                nuk u caktua automatikisht me «Gati për marrje».
              </>
            }
          />
        </div>

        {o.contactPhone ? (
          <a
            href={`tel:${o.contactPhone.replace(/\s/g, '')}`}
            className="mt-3 inline-block text-[12px] font-medium text-[#5cc8ff] hover:text-[#9bdcff]"
          >
            {o.contactPhone}
          </a>
        ) : null}
      </article>
    )
  }

  const inner = (
    <>
      <div className="flex items-start justify-end">
        <p className="text-[13px] font-semibold tabular-nums text-white/90">{o.total.toFixed(2)} €</p>
      </div>
      <div className="-mt-1 flex flex-col items-center">
        <div className="rounded-full bg-[#2c3038] px-3.5 py-1.5 ring-1 ring-black/30">
          <span className="text-[16px] font-bold tracking-tight text-white">
            <span className="text-zinc-500">#</span>
            {orderShort}
          </span>
        </div>
        <p className="mt-2.5 max-w-full truncate px-1 text-[15px] font-semibold text-white">
          {shortCustomerLabel(o)}
        </p>
        <div
          className="mt-3 flex h-[52px] w-[52px] items-center justify-center rounded-full bg-[#2f333c] text-white ring-1 ring-white/15"
          title={vehicleLabel}
        >
          <WoltCarGlyph className="h-[26px] w-[26px]" />
        </div>
      </div>
      <p className="mt-3.5 text-[13px] leading-snug">
        <span className="text-zinc-400">{parts.lead} </span>
        <span
          className={
            parts.timeGreen ? 'font-semibold text-[#3ddc84]' : 'font-semibold text-white'
          }
        >
          {parts.timePart}
        </span>
      </p>
      {readyParts?.sub ? <p className="mt-1 text-[11px] text-zinc-500">{readyParts.sub}</p> : null}
      {(mode === 'enroute' || (mode === 'ready' && o.assignedDriverUserId != null)) &&
      o.assignedDriverDisplay?.trim() ? (
        <p className="mt-1.5 text-[11px] text-zinc-500">
          Korrier: <span className="font-medium text-zinc-400">{shortCourierLabel(o.assignedDriverDisplay)}</span>
        </p>
      ) : null}
      {o.contactPhone ? (
        <a
          href={`tel:${o.contactPhone.replace(/\s/g, '')}`}
          className="mt-2 inline-block text-[12px] font-medium text-[#5cc8ff] hover:text-[#9bdcff]"
        >
          {o.contactPhone}
        </a>
      ) : null}
      {mode === 'ready' && o.fulfillmentType === 'pickup' && onPickupComplete ? (
        <button
          type="button"
          disabled={busy}
          className="mt-3 w-full rounded-xl bg-[#009fe3] py-2.5 text-center text-[13px] font-semibold text-white shadow-[0_2px_12px_rgba(0,159,227,0.35)] transition hover:bg-[#1aacf0] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-45"
          onClick={() => onPickupComplete(o.id)}
        >
          Klienti e mori (përfundo)
        </button>
      ) : null}
    </>
  )

  return <article className={shell}>{inner}</article>
}

const REJECT_PRESETS = [
  { id: 'stock', label: 'Artikulli nuk është në stok' },
  { id: 'closing', label: 'Restoranti po mbyllet' },
  { id: 'staff', label: 'Mungesë e stafit' },
  { id: 'zone', label: 'Zonë jashtë mbulimit' },
  { id: 'tech', label: 'Problem teknik' },
  { id: 'other', label: 'Tjetër' },
] as const

/** Butona kryesorë si Wolt Partner (cyan). */
const primaryActionBtn =
  'w-full rounded-xl bg-[#009fe3] py-3 text-center text-sm font-semibold text-white shadow-[0_2px_12px_rgba(0,159,227,0.35)] transition hover:bg-[#1aacf0] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-45'
const dangerActionLink =
  'w-full py-1 text-center text-xs font-medium text-red-400/90 hover:text-red-300 disabled:opacity-45'
const woltGhostBtn =
  'rounded-xl border border-white/[0.1] bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-zinc-200 transition hover:bg-white/[0.08] disabled:opacity-40'
function PrepMinutesEditor({
  orderId,
  minutes,
  busy,
  onSave,
}: {
  orderId: number
  minutes: number
  busy: boolean
  onSave: (id: number, m: number) => void
}) {
  const [v, setV] = useState(String(minutes))
  useEffect(() => setV(String(minutes)), [minutes])
  return (
    <div className="mt-2 flex flex-wrap items-center gap-2 border-t border-white/[0.06] pt-2">
      <label className="flex items-center gap-1.5 text-[11px] text-zinc-500">
        <span>Min. përgatitje</span>
        <input
          type="number"
          min={5}
          max={300}
          className="w-16 rounded-lg border border-white/[0.1] bg-[#0f1115] px-1.5 py-0.5 text-xs text-zinc-100"
          value={v}
          onChange={(e) => setV(e.target.value)}
          disabled={busy}
        />
      </label>
      <button
        type="button"
        disabled={busy}
        className={`${woltGhostBtn} px-2 py-0.5 text-[11px]`}
        onClick={() => onSave(orderId, Number(v))}
      >
        Ruaj
      </button>
    </div>
  )
}

function PrepHint({ placedAtUtc, prepMinutes }: { placedAtUtc: string; prepMinutes: number }) {
  const target = useMemo(
    () => new Date(new Date(placedAtUtc).getTime() + prepMinutes * 60_000),
    [placedAtUtc, prepMinutes],
  )
  return (
    <p className="text-xs text-zinc-500">
      Synimi operativ:{' '}
      <span className="font-medium text-zinc-300">
        {target.toLocaleTimeString('sq-AL', { hour: '2-digit', minute: '2-digit' })}
      </span>{' '}
      (~{prepMinutes} min nga restoranti)
    </p>
  )
}

/** Rreth progresi si Wolt — minuta të mbetura / synimi. */
function PrepCountdownRing({
  placedAtUtc,
  prepMinutes,
  className = '',
  variant = 'dark',
}: {
  placedAtUtc: string
  prepMinutes: number
  className?: string
  /** `light` për modal të bardhë Wolt Partner. */
  variant?: 'dark' | 'light'
}) {
  const endMs = useMemo(
    () => new Date(placedAtUtc).getTime() + prepMinutes * 60_000,
    [placedAtUtc, prepMinutes],
  )
  const [tick, setTick] = useState(() => Date.now())
  useEffect(() => {
    const id = window.setInterval(() => setTick(Date.now()), 15_000)
    return () => window.clearInterval(id)
  }, [])
  const leftMs = Math.max(0, endMs - tick)
  const totalMs = Math.max(1, prepMinutes * 60_000)
  const pct = Math.min(1, leftMs / totalMs)
  const minsLeft = Math.max(0, Math.ceil(leftMs / 60_000))
  const circumference = 2 * Math.PI * 16
  const dash = circumference * pct
  const targetTime = useMemo(
    () => new Date(endMs).toLocaleTimeString('sq-AL', { hour: '2-digit', minute: '2-digit' }),
    [endMs],
  )

  const light = variant === 'light'
  return (
    <div className={`flex shrink-0 items-center gap-2 ${className}`}>
      <div className="relative h-11 w-11">
        <svg className="-rotate-90" width="44" height="44" viewBox="0 0 44 44" aria-hidden>
          <circle
            cx="22"
            cy="22"
            r="16"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            className={light ? 'text-gray-200' : 'text-white/10'}
          />
          <circle
            cx="22"
            cy="22"
            r="16"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray={`${dash} ${circumference}`}
            className={pct < 0.2 ? 'text-amber-500' : 'text-[#3ddc84]'}
          />
        </svg>
        <span
          className={`absolute inset-0 flex items-center justify-center text-xs font-bold ${
            light ? 'text-gray-900' : 'text-zinc-100'
          }`}
        >
          {minsLeft}
        </span>
      </div>
      <div className="min-w-0 text-left">
        <p
          className={`text-[10px] font-medium uppercase tracking-wide ${
            light ? 'text-gray-500' : 'text-zinc-500'
          }`}
        >
          Synimi
        </p>
        <p className={`text-xs font-semibold ${light ? 'text-gray-900' : 'text-white'}`}>{targetTime}</p>
      </div>
    </div>
  )
}

function kitchenLatLng(lat?: number | null, lng?: number | null): LatLng | null {
  if (lat == null || lng == null) return null
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
  return { lat, lng }
}

function driverLatLng(d: KitchenAssignableDriver): LatLng | null {
  return kitchenLatLng(d.lastLatitude, d.lastLongitude)
}

function computeSortedDriversForOrder(
  assignableDrivers: KitchenAssignableDriver[],
  restaurantPos: LatLng | null,
  deliveryDestPos: LatLng | null,
): KitchenAssignableDriver[] {
  const m = new Map<number, KitchenAssignableDriver>()
  for (const d of assignableDrivers) {
    if (!m.has(d.userId)) m.set(d.userId, d)
  }
  const list = [...m.values()]
  function sortKey(d: KitchenAssignableDriver): [number, number, number, string] {
    const p = driverLatLng(d)
    const toRest = distanceKmBetween(p, restaurantPos)
    const toDest = distanceKmBetween(p, deliveryDestPos)
    const hasKm = toRest != null || toDest != null
    const tier = hasKm ? 0 : 1
    const primary = toRest ?? toDest ?? Number.POSITIVE_INFINITY
    const secondary = toDest ?? Number.POSITIVE_INFINITY
    return [tier, primary, secondary, d.displayName]
  }
  list.sort((a, b) => {
    const [ta, pa, sa, na] = sortKey(a)
    const [tb, pb, sb, nb] = sortKey(b)
    if (ta !== tb) return ta - tb
    if (pa !== pb) return pa - pb
    if (sa !== sb) return sa - sb
    return na.localeCompare(nb, 'sq', { sensitivity: 'base' })
  })
  return list
}

/** Distanca më e mirë e vlerësuar: min(restorant, klient) kur të dyja ekzistojnë. */
function bestKmDriverToOrder(
  d: KitchenAssignableDriver,
  restaurantPos: LatLng | null,
  deliveryDestPos: LatLng | null,
): number | null {
  const dp = driverLatLng(d)
  const kmRest = distanceKmBetween(dp, restaurantPos)
  const kmDest = distanceKmBetween(dp, deliveryDestPos)
  if (kmRest == null && kmDest == null) return null
  if (kmRest == null) return kmDest
  if (kmDest == null) return kmRest
  return Math.min(kmRest, kmDest)
}

/**
 * Të gjithë korrierët e caktueshëm, të renditur: më i afërti me restorantin/klientin sipas GPS,
 * pastaj ata pa koordinata (sipas emrit).
 */
function useSortedDriversForReadyOrder(
  o: KitchenOrder,
  assignableDrivers: KitchenAssignableDriver[],
): KitchenAssignableDriver[] {
  return useMemo(() => {
    const restaurantPos = kitchenLatLng(o.restaurantLatitude, o.restaurantLongitude)
    const deliveryDestPos = kitchenLatLng(o.deliveryDestinationLatitude, o.deliveryDestinationLongitude)
    return computeSortedDriversForOrder(assignableDrivers, restaurantPos, deliveryDestPos)
  }, [
    assignableDrivers,
    o.restaurantLatitude,
    o.restaurantLongitude,
    o.deliveryDestinationLatitude,
    o.deliveryDestinationLongitude,
  ])
}

/** Për caktim automatik: #1 me GPS vetëm nga 3 kuponat e shfaqura në panel (si në Ready gjatë përgatitjes). */
function pickNearestAssignableDriverUserId(
  o: KitchenOrder,
  assignableDrivers: KitchenAssignableDriver[],
): number | null {
  if (o.fulfillmentType === 'pickup') return null
  if (o.assignedDriverUserId != null) return null
  const restaurantPos = kitchenLatLng(o.restaurantLatitude, o.restaurantLongitude)
  const deliveryDestPos = kitchenLatLng(o.deliveryDestinationLatitude, o.deliveryDestinationLongitude)
  const sorted = computeSortedDriversForOrder(assignableDrivers, restaurantPos, deliveryDestPos)
  const top3 = sorted.slice(0, 3)
  for (const d of top3) {
    const km = bestKmDriverToOrder(d, restaurantPos, deliveryDestPos)
    if (km != null) return d.userId
  }
  return null
}

/**
 * ETA vizuale nga distanca (si Wolt «Pickup in < 2 min» jeshil).
 * Vlerësim i përafërt, jo GPS live i korrierit.
 */
function woltDriverEtaFromKm(km: number | null): { timePart: string; timeGreen: boolean } {
  if (km == null) return { timePart: '…', timeGreen: false }
  if (km <= 2) return { timePart: '< 2 min', timeGreen: true }
  const mins = Math.max(2, Math.min(45, Math.round(km * 2.2)))
  return { timePart: `${mins} min`, timeGreen: false }
}

/** Tre kuponat më të afërt; rifreskohen me `assignableDrivers` të panelit. Prep: vetëm pamje; Ready: klik për caktim. */
function DriverProximityCouponsList({
  o,
  assignableDrivers,
  interactive,
  busy = false,
  onAssignDriver,
  intro,
}: {
  o: KitchenOrder
  assignableDrivers: KitchenAssignableDriver[]
  interactive: boolean
  busy?: boolean
  onAssignDriver?: (driverUserId: number) => void
  intro: ReactNode
}) {
  const driversSorted = useSortedDriversForReadyOrder(o, assignableDrivers)
  const driversList = useMemo(() => driversSorted.slice(0, 3), [driversSorted])
  const restaurantPos = useMemo(
    () => kitchenLatLng(o.restaurantLatitude, o.restaurantLongitude),
    [o.restaurantLatitude, o.restaurantLongitude],
  )
  const deliveryDestPos = useMemo(
    () => kitchenLatLng(o.deliveryDestinationLatitude, o.deliveryDestinationLongitude),
    [o.deliveryDestinationLatitude, o.deliveryDestinationLongitude],
  )
  const typeLabel = o.fulfillmentType === 'pickup' ? 'Pickup' : 'Delivery'

  if (driversList.length === 0) {
    return (
      <p className="mt-3 px-1 text-[10px] leading-snug text-amber-200/90">
        Nuk ka korrier online — lista rifreskohet me panelin (~12s).
      </p>
    )
  }

  const nearestIdxWithGps = driversList.findIndex(
    (x) => bestKmDriverToOrder(x, restaurantPos, deliveryDestPos) != null,
  )

  return (
    <>
      <p className="mt-2 px-1 text-center text-[9px] leading-snug text-zinc-500">{intro}</p>
      <ul className="mt-2 flex w-full flex-col gap-2" role="list">
        {driversList.map((d, idx) => {
          const km = bestKmDriverToOrder(d, restaurantPos, deliveryDestPos)
          const eta = woltDriverEtaFromKm(km)
          const isNearestWithGps = nearestIdxWithGps >= 0 && idx === nearestIdxWithGps
          const du = Number(d.userId)
          const rank = idx + 1
          const shell = `flex w-full flex-col items-center rounded-[1.15rem] px-2 py-2.5 text-center ${
            interactive
              ? `transition active:scale-[0.99] disabled:opacity-45 ${
                  isNearestWithGps
                    ? 'bg-[#343b42] ring-1 ring-[#3ddc84]/40 shadow-[0_0_0_1px_rgba(61,220,132,0.12)]'
                    : 'bg-[#363a44] ring-1 ring-white/[0.08] hover:ring-white/15'
                }`
              : `cursor-default select-none ${
                  isNearestWithGps
                    ? 'bg-[#343b42] ring-1 ring-[#3ddc84]/35 shadow-[0_0_0_1px_rgba(61,220,132,0.1)]'
                    : 'bg-[#363a44] ring-1 ring-white/[0.08]'
                }`
          }`
          const body = (
            <>
              <div className="mb-1.5 flex w-full items-center justify-center gap-1.5">
                <span className="flex h-6 min-w-[1.5rem] items-center justify-center rounded-full bg-black/35 px-1.5 text-[10px] font-bold tabular-nums text-zinc-300 ring-1 ring-white/10">
                  #{rank}
                </span>
                {isNearestWithGps ? (
                  <span className="rounded-full bg-[#3ddc84]/20 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-[#3ddc84]">
                    Më i afërmi
                  </span>
                ) : null}
              </div>
              <p className="max-w-full truncate text-[15px] font-semibold text-white">
                {shortCourierLabel(d.displayName)}
              </p>
              <div
                className="mt-2 flex h-[44px] w-[44px] items-center justify-center rounded-full bg-[#2f333c] text-white ring-1 ring-white/12"
                title={d.vehicleType?.trim() || typeLabel}
              >
                <WoltCarGlyph className="h-[22px] w-[22px]" />
              </div>
              <p className="mt-2 text-[12px] leading-snug">
                <span className="text-zinc-400">Pickup in </span>
                <span
                  className={
                    eta.timeGreen ? 'font-semibold text-[#3ddc84]' : 'font-semibold text-white'
                  }
                >
                  {eta.timePart}
                </span>
              </p>
              {km != null ? (
                <span className="mt-0.5 text-[9px] tabular-nums text-zinc-600">{km.toFixed(1)} km</span>
              ) : (
                <span className="mt-0.5 text-[9px] text-zinc-600">GPS mungon</span>
              )}
            </>
          )
          return (
            <li key={d.userId}>
              {interactive ? (
                <button
                  type="button"
                  disabled={busy}
                  className={shell}
                  aria-label={
                    isNearestWithGps
                      ? `Cakto ${d.displayName} — më i afërmi, marrje`
                      : `Cakto ${d.displayName} për marrje`
                  }
                  onClick={() => onAssignDriver?.(du)}
                >
                  {body}
                </button>
              ) : (
                <div className={shell} role="group" aria-label={`${rank}. ${d.displayName}`}>
                  {body}
                </div>
              )}
            </li>
          )
        })}
      </ul>
    </>
  )
}

export function OrderCard({
  o,
  busy,
  onAction,
  onReject,
  onPrepUpdate,
  onRequestAccept,
}: {
  o: KitchenOrder
  busy: boolean
  onAction: (id: number, status: number, note?: string | null) => void
  onReject: (id: number) => void
  onPrepUpdate: (orderId: number, minutes: number) => void
  /** Si Wolt: hap modal konfirmimi për kohën e përgatitjes para se të pranohet porosia. */
  onRequestAccept?: (orderId: number) => void
}) {
  const st = o.status
  const typeLabel = o.fulfillmentType === 'pickup' ? 'Pickup' : 'Delivery'
  const showPrepRing = st === S.Confirmed || st === S.Preparing

  const orderShort = o.orderNumber.startsWith('FD-') ? o.orderNumber.slice(3) : o.orderNumber

  return (
    <article
      className={`select-none rounded-2xl border border-white/[0.06] bg-[#23272f] p-3.5 shadow-[0_2px_8px_rgba(0,0,0,0.2)] ${
        st === S.Pending ? 'ring-1 ring-amber-400/35' : ''
      }`}
    >
      <div className="min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1 text-left">
            <p className="text-base font-semibold leading-tight tracking-tight text-white">
              <span className="text-zinc-500">#</span>
              {orderShort}
            </p>
            <p className="mt-0.5 text-[13px] text-zinc-400">
              {o.customerFirstName} {o.customerLastName}
            </p>
            <p className="mt-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">{typeLabel}</p>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-2">
            <p className="text-[15px] font-semibold tabular-nums text-white">{o.total.toFixed(2)} €</p>
            {showPrepRing ? (
              <PrepCountdownRing placedAtUtc={o.placedAtUtc} prepMinutes={o.estimatedPrepMinutes} />
            ) : null}
          </div>
        </div>

      <div className="mt-1">
        <PrepHint placedAtUtc={o.placedAtUtc} prepMinutes={o.estimatedPrepMinutes} />
      </div>

      {st === S.Pending || st === S.Confirmed || st === S.Preparing ? (
        <PrepMinutesEditor
          orderId={o.id}
          minutes={o.estimatedPrepMinutes}
          busy={busy}
          onSave={onPrepUpdate}
        />
      ) : null}

      {o.assignedDriverDisplay ? (
        <p className="mt-2 text-[12px] text-zinc-400">
          Courier: <span className="font-medium text-[#3ddc84]">{o.assignedDriverDisplay}</span>
        </p>
      ) : null}

      <ul className="mt-2.5 space-y-1 text-left text-[13px] leading-snug text-zinc-300">
        {o.lines.map((l, i) => (
          <li key={i}>
            <span className="font-semibold text-white">{l.quantity}×</span> {l.name}
          </li>
        ))}
      </ul>

      {o.customerNotes ? (
        <p className="mt-2 rounded-xl border border-amber-500/25 bg-amber-500/[0.08] px-2.5 py-1.5 text-xs text-amber-100/95">
          <span className="font-medium text-amber-400/90">Note · </span>
          {o.customerNotes}
        </p>
      ) : null}

      <p className="mt-2 text-left text-[11px] leading-relaxed text-zinc-500">
        {o.fulfillmentType === 'pickup' ? 'Pickup · ' : 'Delivery · '}
        {o.addressLine1}, {o.city}
      </p>
      {o.contactPhone ? (
        <a
          href={`tel:${o.contactPhone.replace(/\s/g, '')}`}
          className="mt-1 inline-block text-xs font-medium text-[#009fe3] hover:text-[#5cc8ff]"
        >
          {o.contactPhone}
        </a>
      ) : null}

      <div className="mt-3 space-y-2 border-t border-white/[0.06] pt-3">
        {st === S.Pending ? (
          <>
            <button
              type="button"
              disabled={busy}
              className={primaryActionBtn}
              onClick={() =>
                onRequestAccept ? onRequestAccept(o.id) : onAction(o.id, S.Confirmed)
              }
            >
              Prano porosinë
            </button>
            <button type="button" disabled={busy} className={dangerActionLink} onClick={() => onReject(o.id)}>
              Refuzo porosinë
            </button>
          </>
        ) : null}
        {st === S.Confirmed ? (
          <>
            <button
              type="button"
              disabled={busy}
              className={primaryActionBtn}
              onClick={() => onAction(o.id, S.Preparing)}
            >
              Fillo përgatitjen
            </button>
            <button type="button" disabled={busy} className={dangerActionLink} onClick={() => onReject(o.id)}>
              Refuzo porosinë
            </button>
          </>
        ) : null}
        {st === S.Preparing ? (
          <>
            <button
              type="button"
              disabled={busy}
              className={primaryActionBtn}
              title={
                o.fulfillmentType !== 'pickup'
                  ? 'Dërgesë: kalon në Ready; në panelin Ready është #1 (më i afërmi në 3 kuponat) — ai caktohet automatikisht.'
                  : 'Marrje në restorant: klienti e merr vetë; nuk ka korrier.'
              }
              onClick={() => onAction(o.id, S.ReadyForPickup)}
            >
              Gati për marrje
            </button>
            <button type="button" disabled={busy} className={dangerActionLink} onClick={() => onReject(o.id)}>
              Refuzo porosinë
            </button>
          </>
        ) : null}
        {st === S.OutForDelivery ? (
          <p className="rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2.5 text-left text-[12px] leading-snug text-zinc-400">
            <span className="font-medium text-zinc-300">In delivery</span> — next steps from the courier app.
          </p>
        ) : null}
      </div>
      </div>
    </article>
  )
}

function KitchenBoardSkeleton() {
  return (
    <div className="space-y-4 animate-pulse" aria-hidden>
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-5">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-20 rounded-xl bg-[#161b22]" />
        ))}
      </div>
      <div className="flex gap-3 overflow-hidden lg:grid lg:grid-cols-5">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="min-h-[18rem] min-w-[220px] flex-shrink-0 rounded-xl bg-[#161b22] lg:min-w-0" />
        ))}
      </div>
    </div>
  )
}

export function Column({
  title,
  count,
  children,
  accent,
  narrow,
  woltRail,
  bodyClassName,
}: {
  title: string
  count: number
  children: ReactNode
  accent?: string
  /** Kolonë më e ngushtë si «Ready» në Wolt (tablet). */
  narrow?: boolean
  /** Sfond më i errët si shiriti Deliver në Wolt. */
  woltRail?: boolean
  /** P.sh. scroll kur lista e korrierëve është e gjatë. */
  bodyClassName?: string
}) {
  return (
    <div
      className={`flex min-h-[140px] min-w-[min(100%,288px)] shrink-0 snap-start flex-col rounded-2xl border md:min-w-0 xl:min-w-0 ${
        woltRail
          ? 'border-white/[0.05] bg-[#12141a]'
          : 'border-white/[0.06] bg-[#14161c]'
      } ${narrow ? 'xl:max-w-[280px] xl:w-full xl:justify-self-start' : ''} ${accent ?? ''}`}
    >
      <div
        className={`flex items-center justify-between border-b border-white/[0.06] px-3 py-2.5 ${accent?.includes('amber') ? 'bg-amber-500/[0.06]' : ''}`}
      >
        <h2 className="text-[11px] font-bold uppercase tracking-[0.14em] text-zinc-500">{title}</h2>
        <span className="min-w-[1.5rem] rounded-full bg-white/[0.08] px-2 py-0.5 text-center text-[11px] font-semibold tabular-nums text-zinc-200">
          {count}
        </span>
      </div>
      <div
        className={`flex flex-1 flex-col p-2 ${woltRail ? 'gap-3' : 'gap-2.5'} ${bodyClassName ?? ''}`}
      >
        {children}
      </div>
    </div>
  )
}

export default function KitchenOrdersPage() {
  const token = useAuthStore((s) => s.token)
  const [orders, setOrders] = useState<KitchenOrder[]>([])
  const [stats, setStats] = useState<KitchenTodayStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<number | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [rush, setRush] = useState(() => sessionStorage.getItem('fd_kitchen_rush') === '1')
  const prevPendingRef = useRef<number | null>(null)
  const [rejectForId, setRejectForId] = useState<number | null>(null)
  const [rejectPreset, setRejectPreset] = useState<string>('stock')
  const [rejectOther, setRejectOther] = useState('')
  const [sessionExpired, setSessionExpired] = useState(false)
  const [pullBusy, setPullBusy] = useState(false)
  const [assignableDrivers, setAssignableDrivers] = useState<KitchenAssignableDriver[]>([])

  const refresh = useCallback(async () => {
    if (!token) return
    setError(null)
    setSessionExpired(false)
    try {
      const [list, st] = await Promise.all([
        fetchKitchenOrders(token),
        fetchKitchenTodayStats(token),
      ])
      let driversNext: KitchenAssignableDriver[] | 'keep' = 'keep'
      try {
        driversNext = await fetchKitchenAssignableDrivers(token)
      } catch (e: unknown) {
        if (isKitchenHttpUnauthorized(e)) throw e
        /* rrjet / 5xx — mos e zbraz listën e korrierëve në rifreskim */
      }
      setOrders(list)
      setStats(st)
      if (driversNext !== 'keep') setAssignableDrivers(driversNext)

      const pending = list.filter((o) => o.status === S.Pending).length
      if (prevPendingRef.current !== null && pending > prevPendingRef.current) {
        playNewOrderChime()
      }
      prevPendingRef.current = pending
    } catch (e: unknown) {
      if (isKitchenHttpUnauthorized(e)) {
        setSessionExpired(true)
        setOrders([])
        setStats(null)
        setAssignableDrivers([])
        return
      }
      throw e
    }
  }, [token])

  useEffect(() => {
    if (!token) return
    let c = false
    setLoading(true)
    void refresh()
      .catch((e: unknown) => {
        if (!c) setError(e instanceof Error ? e.message : 'Gabim.')
      })
      .finally(() => {
        if (!c) setLoading(false)
      })
    return () => {
      c = true
    }
  }, [token, refresh])

  useEffect(() => {
    if (!token) return
    const t = window.setInterval(() => {
      if (document.visibilityState !== 'visible') return
      void refresh().catch((e: unknown) => {
        if (!isKitchenHttpUnauthorized(e)) {
          /* rrjet — heshtur */
        }
      })
    }, 12000)
    return () => window.clearInterval(t)
  }, [token, refresh])

  useEffect(() => {
    sessionStorage.setItem('fd_kitchen_rush', rush ? '1' : '0')
  }, [rush])

  useEffect(() => {
    if (!token) return
    const conn = createOrdersHubConnection(token)
    conn.on('newOrder', () => {
      playNewOrderChime()
      void refresh().catch(() => {})
    })
    conn.on('orderStatus', () => {
      void refresh().catch(() => {})
    })
    let cancelled = false
    ;(async () => {
      const ctx = await fetchKitchenContext(token)
      if (ctx.ok !== true) return
      const rid = ctx.context.restaurantId
      if (rid == null) return
      try {
        await conn.start()
        if (!cancelled) await conn.invoke('JoinRestaurant', rid)
      } catch {
        /* pa lidhje / CORS */
      }
    })()
    return () => {
      cancelled = true
      void conn.stop()
    }
  }, [token, refresh])

  const { incoming, preparing, ready, out, completed, history } = useMemo(() => {
    const incoming = orders.filter((o) => o.status === S.Pending)
    const preparing = orders.filter((o) => o.status === S.Confirmed || o.status === S.Preparing)
    const ready = orders.filter(
      (o) =>
        o.status === S.ReadyForPickup &&
        (o.fulfillmentType === 'pickup' || o.assignedDriverUserId == null),
    )
    const out = orders.filter((o) => {
      if (o.status === S.OutForDelivery) return true
      return (
        o.status === S.ReadyForPickup &&
        o.fulfillmentType !== 'pickup' &&
        o.assignedDriverUserId != null
      )
    })
    const completed = orders.filter((o) => o.status === S.Delivered).slice(0, 10)
    const history = orders
      .filter((o) => o.status === S.Delivered || o.status === S.Cancelled)
      .slice(0, 5)
    return { incoming, preparing, ready, out, completed, history }
  }, [orders])

  const avgPrepMinutes = useMemo(() => {
    const active = orders.filter(
      (o) => o.status !== S.Cancelled && o.status !== S.Delivered && o.estimatedPrepMinutes > 0,
    )
    if (active.length === 0) return null
    const sum = active.reduce((a, o) => a + o.estimatedPrepMinutes, 0)
    return Math.round(sum / active.length)
  }, [orders])

  /** Së fundmi në «gati për marrje» më sipër (ID më i lartë = porosi më e re në sistem). */
  const readyOrdered = useMemo(() => {
    return [...ready].sort((a, b) => {
      if (b.id !== a.id) return b.id - a.id
      const ta = Date.parse(a.placedAtUtc) || 0
      const tb = Date.parse(b.placedAtUtc) || 0
      return tb - ta
    })
  }, [ready])

  const outOrdered = useMemo(() => {
    return [...out].sort((a, b) => {
      if (b.id !== a.id) return b.id - a.id
      const ta = Date.parse(a.placedAtUtc) || 0
      const tb = Date.parse(b.placedAtUtc) || 0
      return tb - ta
    })
  }, [out])

  const needKitchenClock = useMemo(
    () =>
      ready.length > 0 ||
      out.some((o) => o.fulfillmentType !== 'pickup' && o.assignedDriverUserId != null),
    [ready, out],
  )
  const nowMs = useNowTick(needKitchenClock)

  const [confirmAcceptOrderId, setConfirmAcceptOrderId] = useState<number | null>(null)
  const [detailsOrderId, setDetailsOrderId] = useState<number | null>(null)
  const [detailsFocusPrep, setDetailsFocusPrep] = useState(false)
  const acceptPreviewOrder = useMemo(
    () => (confirmAcceptOrderId == null ? null : orders.find((x) => x.id === confirmAcceptOrderId) ?? null),
    [confirmAcceptOrderId, orders],
  )
  const detailsOrder = useMemo(
    () => (detailsOrderId == null ? null : orders.find((x) => x.id === detailsOrderId) ?? null),
    [detailsOrderId, orders],
  )

  function openOrderDetails(orderId: number, focusPrep = false) {
    setDetailsOrderId(orderId)
    setDetailsFocusPrep(focusPrep)
  }

  function closeOrderDetails() {
    setDetailsOrderId(null)
    setDetailsFocusPrep(false)
  }

  async function runAssignDriver(
    orderId: number,
    driverUserId: number,
    opts?: { immediateHandoff?: boolean },
  ) {
    if (!token) return
    setActionError(null)
    setBusyId(orderId)
    const r = await patchKitchenAssignDriver(token, orderId, driverUserId, {
      immediateHandoff: opts?.immediateHandoff === true,
    })
    setBusyId(null)
    if (!r.ok) {
      if (r.message.includes('401')) {
        setSessionExpired(true)
        return
      }
      setActionError(r.message)
    } else void refresh()
  }

  async function runPrepUpdate(orderId: number, minutes: number): Promise<boolean> {
    if (!token || !Number.isFinite(minutes)) return false
    setActionError(null)
    setBusyId(orderId)
    const r = await patchKitchenPrepMinutes(token, orderId, Math.round(minutes))
    setBusyId(null)
    if (!r.ok) {
      if (r.message.includes('401')) {
        setSessionExpired(true)
        return false
      }
      setActionError(r.message)
      return false
    }
    void refresh()
    return true
  }

  async function runAction(orderId: number, status: number, note?: string | null): Promise<boolean> {
    if (!token) return false
    setActionError(null)
    const orderBefore = orders.find((o) => o.id === orderId)
    setBusyId(orderId)
    const r = await patchKitchenOrderStatus(token, orderId, status, note)
    setBusyId(null)
    if (!r.ok) {
      if (r.message.includes('401')) {
        setSessionExpired(true)
        return false
      }
      setActionError(r.message)
      return false
    }

    const shouldAutoAssignDeliver =
      orderBefore != null &&
      status === S.ReadyForPickup &&
      orderBefore.fulfillmentType !== 'pickup' &&
      orderBefore.assignedDriverUserId == null
    if (shouldAutoAssignDeliver) {
      const driverId = pickNearestAssignableDriverUserId(orderBefore, assignableDrivers)
      if (driverId != null) {
        await runAssignDriver(orderId, driverId, { immediateHandoff: false })
        return true
      }
    }

    void refresh()
    return true
  }

  async function manualPull() {
    if (!token || pullBusy || sessionExpired) return
    setPullBusy(true)
    setError(null)
    try {
      await refresh()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Gabim.')
    } finally {
      setPullBusy(false)
    }
  }

  function submitReject() {
    if (!rejectForId || !token) return
    const preset = REJECT_PRESETS.find((p) => p.id === rejectPreset)
    let note = preset?.label ?? ''
    if (rejectPreset === 'other') note = rejectOther.trim() || 'Refuzuar nga restoranti.'
    void runAction(rejectForId, S.Cancelled, note)
    setRejectForId(null)
    setRejectOther('')
  }

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl font-bold tracking-tight text-white sm:text-2xl">Porositë</h1>
          <p className="mt-0.5 text-sm text-zinc-500">Porosi aktive · panel restoranti</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <button
            type="button"
            disabled={!token || sessionExpired || pullBusy}
            onClick={() => void manualPull()}
            className={woltGhostBtn}
          >
            {pullBusy ? 'Duke rifreskuar…' : 'Rifresko'}
          </button>
          <button
            type="button"
            role="switch"
            aria-checked={rush}
            disabled={sessionExpired}
            onClick={() => setRush((x) => !x)}
            className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-40 ${
              rush
                ? 'border-amber-500/40 bg-amber-500/10 text-amber-200'
                : 'border-[#30363d] bg-[#161b22] text-zinc-400 hover:bg-[#21262d]'
            }`}
          >
            Rush {rush ? 'ON' : 'OFF'}
          </button>
          <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-400">
            <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]" aria-hidden />
            Open
          </span>
        </div>
      </header>

      {sessionExpired ? (
        <div className="rounded-xl border border-red-500/35 bg-red-500/10 px-4 py-3 text-sm text-red-100">
          <p className="font-medium">Sesioni skadoi ose aksesi u refuzua (401).</p>
          <p className="mt-1 text-xs text-red-200/85">
            Dil nga menuja më lart dhe hyr përsëri. Nëse problemi vazhdon, kontrollo që API dhe proxy janë të njëjtat si
            në hyrje.
          </p>
        </div>
      ) : null}

      {rush ? (
        <p className="rounded-lg border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-xs text-amber-100/95">
          <strong>Rush:</strong> tregoni kuzhinën e ngarkuar (demo UI — integrimi me klientët vjen më vonë).
        </p>
      ) : null}

      {stats && !sessionExpired ? (
        <StatsRow stats={stats} inDeliveryCount={out.length} avgPrepMinutes={avgPrepMinutes} />
      ) : null}

      {loading ? <KitchenBoardSkeleton /> : null}
      {error && !sessionExpired ? (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          <p>{error}</p>
          <button
            type="button"
            className={`${woltGhostBtn} mt-2`}
            onClick={() => void manualPull()}
            disabled={pullBusy}
          >
            Provo përsëri
          </button>
        </div>
      ) : null}
      {actionError ? (
        <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-100">{actionError}</p>
      ) : null}

      {!loading && !error && !sessionExpired && orders.length === 0 ? (
        <p className="text-sm text-zinc-500">Nuk ka porosi ende — rifreskimi sjell të rejat automatikisht.</p>
      ) : null}

      <div
        className={`flex gap-2 overflow-x-auto pb-2 lg:grid lg:grid-cols-5 lg:gap-3 lg:overflow-visible ${sessionExpired ? 'pointer-events-none opacity-45' : ''}`}
      >
        <KanbanColumn kind="new" count={incoming.length}>
          {incoming.length === 0 ? (
            <ColumnEmptyState
              icon={
                <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
                  <path d="M6 2h12l2 5H4l2-5zM4 7h16v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7z" />
                </svg>
              }
              text="Nuk ka porosi të reja"
            />
          ) : (
            incoming.map((o) => (
              <MerchantOrderCard
                key={o.id}
                o={o}
                highlight
                footer={
                  <div className="space-y-1">
                    <MerchantPrimaryBtn busy={busyId === o.id} onClick={() => setConfirmAcceptOrderId(o.id)}>
                      Prano porosinë
                    </MerchantPrimaryBtn>
                    <MerchantGhostBtn busy={busyId === o.id} danger onClick={() => setRejectForId(o.id)}>
                      Refuzo porosinë
                    </MerchantGhostBtn>
                  </div>
                }
              />
            ))
          )}
        </KanbanColumn>

        <KanbanColumn kind="progress" count={preparing.length}>
          {preparing.length === 0 ? (
            <ColumnEmptyState
              icon={
                <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
                  <path d="M4 14h16M6 18h12M8 10h8M10 6h4" />
                </svg>
              }
              text="Nuk ka porosi në përgatitje"
            />
          ) : (
            preparing.map((o) => (
              <MerchantOrderCard
                key={o.id}
                o={o}
                highlight={detailsOrderId === o.id}
                statusLine={`Min. përgatitje: ${o.estimatedPrepMinutes} min`}
                footer={
                  <MerchantCardFooterActions
                    onDetails={() => openOrderDetails(o.id)}
                    onPrep={() => openOrderDetails(o.id, true)}
                  />
                }
              />
            ))
          )}
        </KanbanColumn>

        <KanbanColumn kind="ready" count={ready.length}>
          {ready.length === 0 ? (
            <ColumnEmptyState
              icon={
                <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
                  <path d="M12 3v18M8 7h8M6 11h12" />
                </svg>
              }
              text="Nuk ka porosi gati"
            />
          ) : (
            readyOrdered.map((o) => {
              const needsDriver =
                o.fulfillmentType !== 'pickup' && o.assignedDriverUserId == null
              const nearestId = needsDriver
                ? pickNearestAssignableDriverUserId(o, assignableDrivers)
                : null
              return (
                <MerchantOrderCard
                  key={o.id}
                  o={o}
                  nowMs={nowMs}
                  statusLine="Gati për dërgesë"
                  footer={
                    needsDriver ? (
                      <MerchantAssignDriverBtn
                        busy={busyId === o.id}
                        onClick={() => {
                          if (nearestId != null) void runAssignDriver(o.id, nearestId)
                          else setActionError('Nuk ka driver online për caktim.')
                        }}
                      />
                    ) : o.fulfillmentType === 'pickup' ? (
                      <MerchantPrimaryBtn busy={busyId === o.id} onClick={() => void runAction(o.id, S.Delivered)}>
                        Klienti e mori
                      </MerchantPrimaryBtn>
                    ) : null
                  }
                />
              )
            })
          )}
        </KanbanColumn>

        <KanbanColumn kind="out" count={out.length}>
          {out.length === 0 ? (
            <ColumnEmptyState
              icon={
                <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
                  <circle cx="6" cy="17" r="2" />
                  <circle cx="18" cy="17" r="2" />
                  <path d="M8 17h8M6 15l2-6h7l2 4h3" />
                </svg>
              }
              text="Nuk ka porosi në dorëzim"
            />
          ) : (
            outOrdered.map((o) => (
              <MerchantOrderCard
                key={o.id}
                o={o}
                nowMs={nowMs}
                highlight={detailsOrderId === o.id}
                statusLine={
                  o.assignedDriverDisplay
                    ? `Deliver: ${o.assignedDriverDisplay}`
                    : 'Në rrugë për klientin'
                }
                footer={
                  <MerchantDetailsBtn onClick={() => openOrderDetails(o.id)} />
                }
              />
            ))
          )}
        </KanbanColumn>

        <KanbanColumn kind="completed" count={completed.length}>
          {completed.length === 0 ? (
            <ColumnEmptyState
              icon={
                <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
                  <circle cx="12" cy="12" r="9" />
                  <path d="M8 12l2.5 2.5L16 9" />
                </svg>
              }
              text="Nuk ka porosi të përfunduara sot"
            />
          ) : (
            completed.map((o) => (
              <MerchantOrderCard
                key={o.id}
                o={o}
                nowMs={nowMs}
                statusLine="Dorëzuar"
                footer={<MerchantDetailsBtn onClick={() => openOrderDetails(o.id)} />}
              />
            ))
          )}
        </KanbanColumn>
      </div>

      <RecentHistorySection rows={history} historyLink="/kitchen/history" />

      <KitchenOrderDetailsDrawer
        order={detailsOrder}
        busy={detailsOrder != null && busyId === detailsOrder.id}
        focusPrep={detailsFocusPrep}
        onClose={closeOrderDetails}
        onPrepSave={async (oid, m) => {
          const ok = await runPrepUpdate(oid, m)
          if (ok) setDetailsFocusPrep(false)
          return ok
        }}
        onStatusAction={(oid, st) => runAction(oid, st)}
        onReject={(oid) => {
          closeOrderDetails()
          setRejectForId(oid)
        }}
      />

      {acceptPreviewOrder && acceptPreviewOrder.status === S.Pending ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal
          aria-labelledby="accept-prep-title"
        >
          <div className="w-full max-w-[720px] overflow-hidden rounded-2xl border border-white/[0.1] bg-[#1c1f26] shadow-2xl md:grid md:grid-cols-2">
            <div className="border-b border-white/[0.08] p-5 md:border-b-0 md:border-r">
              <p className="text-lg font-bold tracking-tight text-white">
                <span className="text-zinc-500">#</span>
                {acceptPreviewOrder.orderNumber.startsWith('FD-')
                  ? acceptPreviewOrder.orderNumber.slice(3)
                  : acceptPreviewOrder.orderNumber}
              </p>
              <p className="mt-1 text-[15px] font-semibold text-zinc-200">{shortCustomerLabel(acceptPreviewOrder)}</p>
              <p className="mt-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
                {acceptPreviewOrder.fulfillmentType === 'pickup' ? 'Pickup' : 'Delivery'}
              </p>
              <div className="mt-4 flex items-start justify-between gap-3">
                <PrepCountdownRing
                  placedAtUtc={acceptPreviewOrder.placedAtUtc}
                  prepMinutes={acceptPreviewOrder.estimatedPrepMinutes}
                />
              </div>
              <ul className="mt-4 max-h-[40vh] space-y-2 overflow-y-auto border-t border-white/[0.08] pt-4 text-left text-[13px] text-zinc-300">
                {acceptPreviewOrder.lines.map((l, i) => (
                  <li key={i} className="border-b border-white/[0.04] pb-2 last:border-0">
                    <span className="font-semibold text-white">{l.quantity}×</span> {l.name}
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-right text-sm font-semibold tabular-nums text-white">
                {acceptPreviewOrder.total.toFixed(2)} €
              </p>
            </div>
            <div className="flex flex-col justify-center gap-4 bg-[#181b22] p-6">
              <h2 id="accept-prep-title" className="text-xl font-bold leading-snug text-white">
                Marrje për ~{acceptPreviewOrder.estimatedPrepMinutes} min. A mund ta përmbushni?
              </h2>
              <p className="text-sm leading-relaxed text-zinc-400">
                Kjo përputhet me minutat e përgatitjes në kartë — klienti e sheh si vlerësim kohësh.
              </p>
              <button
                type="button"
                disabled={busyId === acceptPreviewOrder.id}
                className={primaryActionBtn}
                onClick={() => {
                  const id = acceptPreviewOrder.id
                  setConfirmAcceptOrderId(null)
                  void runAction(id, S.Confirmed)
                }}
              >
                Po, vazhdo!
              </button>
              <button
                type="button"
                disabled={busyId === acceptPreviewOrder.id}
                className="w-full rounded-xl border-2 border-[#009fe3] bg-transparent py-3 text-center text-sm font-semibold text-[#5cc8ff] transition hover:bg-[#009fe3]/10 active:scale-[0.99] disabled:opacity-45"
                onClick={() => setConfirmAcceptOrderId(null)}
              >
                Jo, ndrysho vlerësimin
              </button>
              <p className="text-center text-[11px] text-zinc-500">
                Nëse zgjedh «Ndrysho», mbyll modalin dhe përditëso minutat te kartë para pranimit.
              </p>
            </div>
          </div>
        </div>
      ) : null}

      {rejectForId !== null ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal
          aria-labelledby="reject-title"
        >
          <div className="w-full max-w-md rounded-2xl border border-white/[0.08] bg-[#1c1f26] p-5 shadow-2xl">
            <h2 id="reject-title" className="text-lg font-semibold text-white">
              Refuzo porosinë
            </h2>
            <p className="mt-1 text-xs text-zinc-500">
              Zgjidh arsyen — klienti e sheh te detajet e porosisë dhe në njoftim.
            </p>
            <div className="mt-4 space-y-2">
              {REJECT_PRESETS.map((p) => (
                <label key={p.id} className="flex cursor-pointer items-center gap-2 text-sm text-zinc-300">
                  <input
                    type="radio"
                    name="rej"
                    checked={rejectPreset === p.id}
                    onChange={() => setRejectPreset(p.id)}
                  />
                  {p.label}
                </label>
              ))}
            </div>
            {rejectPreset === 'other' ? (
              <textarea
                value={rejectOther}
                onChange={(e) => setRejectOther(e.target.value)}
                className="mt-3 w-full rounded-xl border border-white/[0.08] bg-[#0f1115] px-3 py-2 text-sm text-zinc-100 outline-none focus:border-[#009fe3]/50"
                rows={2}
                placeholder="Shkruaj arsyen…"
              />
            ) : null}
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" className={woltGhostBtn} onClick={() => setRejectForId(null)}>
                Anulo
              </button>
              <button
                type="button"
                className="rounded-xl bg-[#009fe3] px-4 py-2 text-sm font-semibold text-white shadow-[0_2px_12px_rgba(0,159,227,0.35)] hover:bg-[#1aacf0]"
                onClick={() => void submitReject()}
              >
                Konfirmo refuzimin
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
