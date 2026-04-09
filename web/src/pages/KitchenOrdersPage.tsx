import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  customerBtnGhost,
  customerBtnPrimary,
  customerCardMuted,
} from '../lib/customerTheme'
import { useAuthStore } from '../store/authStore'
import {
  fetchKitchenAssignableDrivers,
  fetchKitchenOrders,
  fetchKitchenTodayStats,
  isKitchenHttpUnauthorized,
  patchKitchenAssignDriver,
  patchKitchenOrderStatus,
  type KitchenAssignableDriver,
  type KitchenOrder,
  type KitchenTodayStats,
} from './../lib/kitchenApi'

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

const REJECT_PRESETS = [
  { id: 'stock', label: 'Produkti nuk është në stok' },
  { id: 'busy', label: 'Kuzhina shumë e ngarkuar' },
  { id: 'tech', label: 'Problem teknik' },
  { id: 'other', label: 'Tjetër (shkruaj më poshtë)' },
] as const

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

function OrderCard({
  o,
  busy,
  onAction,
  onReject,
  assignableDrivers,
  onAssignDriver,
}: {
  o: KitchenOrder
  busy: boolean
  onAction: (id: number, status: number, note?: string | null) => void
  onReject: (id: number) => void
  assignableDrivers: KitchenAssignableDriver[]
  onAssignDriver: (orderId: number, driverUserId: number) => void
}) {
  const [pickDriverId, setPickDriverId] = useState<string>(() =>
    o.assignedDriverUserId != null ? String(o.assignedDriverUserId) : '',
  )
  useEffect(() => {
    setPickDriverId(o.assignedDriverUserId != null ? String(o.assignedDriverUserId) : '')
  }, [o.assignedDriverUserId])
  const st = o.status
  const typeLabel = o.fulfillmentType === 'pickup' ? 'Marrje në lokacion' : 'Dërgesë'

  return (
    <article
      className={`rounded-xl border border-white/10 bg-[#14181f]/95 p-3 shadow-lg shadow-black/20 ${st === S.Pending ? 'ring-2 ring-amber-500/40' : ''}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-mono text-sm font-bold text-amber-200/95">{o.orderNumber}</p>
          <p className="text-xs text-zinc-500">
            {o.customerFirstName} {o.customerLastName}
          </p>
        </div>
        <p className="text-sm font-semibold text-white">{o.total.toFixed(2)} €</p>
      </div>
      <p className="mt-1 text-[10px] uppercase tracking-wide text-sky-400/90">{typeLabel}</p>
      <PrepHint placedAtUtc={o.placedAtUtc} prepMinutes={o.estimatedPrepMinutes} />
      {o.assignedDriverDisplay ? (
        <p className="mt-1 text-xs text-emerald-300/90">
          Deliveri: <strong>{o.assignedDriverDisplay}</strong>
        </p>
      ) : null}
      <div className="mt-2 space-y-0.5 text-xs text-zinc-300">
        {o.lines.map((l, i) => (
          <div key={i}>
            {l.quantity}× {l.name}
          </div>
        ))}
      </div>
      {o.customerNotes ? (
        <p className="mt-2 rounded border border-amber-500/20 bg-amber-500/5 px-2 py-1 text-xs text-amber-100/90">
          <span className="text-amber-500/80">Shënim: </span>
          {o.customerNotes}
        </p>
      ) : null}
      <p className="mt-2 text-[11px] text-zinc-600">
        {o.fulfillmentType === 'pickup' ? 'Marrje: ' : 'Dërgesë: '}
        {o.addressLine1}, {o.city}
      </p>
      {o.contactPhone ? (
        <a
          href={`tel:${o.contactPhone.replace(/\s/g, '')}`}
          className="mt-1 inline-block text-xs font-medium text-sky-400 hover:text-sky-300"
        >
          {o.contactPhone}
        </a>
      ) : null}

      <div className="mt-3 flex flex-wrap gap-2 border-t border-white/[0.06] pt-3">
        {st === S.Pending ? (
          <>
            <button
              type="button"
              disabled={busy}
              className={`${customerBtnPrimary} px-3 py-1.5 text-xs`}
              onClick={() => onAction(o.id, S.Confirmed)}
            >
              Prano
            </button>
            <button
              type="button"
              disabled={busy}
              className={`${customerBtnGhost} border-red-400/25 px-3 py-1.5 text-xs text-red-200`}
              onClick={() => onReject(o.id)}
            >
              Refuzo
            </button>
          </>
        ) : null}
        {st === S.Confirmed ? (
          <>
            <button
              type="button"
              disabled={busy}
              className={`${customerBtnPrimary} px-3 py-1.5 text-xs`}
              onClick={() => onAction(o.id, S.Preparing)}
            >
              Në përgatitje
            </button>
            <button
              type="button"
              disabled={busy}
              className={`${customerBtnGhost} border-red-400/25 px-3 py-1.5 text-xs text-red-200`}
              onClick={() => onReject(o.id)}
            >
              Refuzo
            </button>
          </>
        ) : null}
        {st === S.Preparing ? (
          <>
            <button
              type="button"
              disabled={busy}
              className={`${customerBtnPrimary} px-3 py-1.5 text-xs`}
              onClick={() => onAction(o.id, S.ReadyForPickup)}
            >
              Gati për marrje
            </button>
            <button
              type="button"
              disabled={busy}
              className={`${customerBtnGhost} border-red-400/25 px-3 py-1.5 text-xs text-red-200`}
              onClick={() => onReject(o.id)}
            >
              Refuzo
            </button>
          </>
        ) : null}
        {st === S.ReadyForPickup ? (
          <>
            {o.fulfillmentType === 'pickup' ? (
              <button
                type="button"
                disabled={busy}
                className={`${customerBtnPrimary} px-3 py-1.5 text-xs`}
                onClick={() => onAction(o.id, S.Delivered)}
              >
                Marrë nga klienti (përfundo)
              </button>
            ) : (
              <div className="w-full space-y-2">
                {assignableDrivers.length === 0 ? (
                  <p className="text-[10px] text-amber-200/80">
                    Nuk ka kalorës të miratuar në sistem — admini duhet të miratojë aplikimet dhe të ekzistojë roli Driver.
                  </p>
                ) : (
                  <div className="flex flex-wrap items-center gap-2">
                    <select
                      value={pickDriverId}
                      onChange={(e) => setPickDriverId(e.target.value)}
                      className="max-w-[14rem] rounded-lg border border-white/15 bg-zinc-900/90 px-2 py-1.5 text-xs text-zinc-100"
                    >
                      <option value="">— Zgjidh kalorësin —</option>
                      {assignableDrivers.map((d) => (
                        <option key={d.userId} value={String(d.userId)}>
                          {d.displayName} ({d.vehicleType})
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      disabled={busy || !pickDriverId}
                      className={`${customerBtnPrimary} px-3 py-1.5 text-xs`}
                      onClick={() => onAssignDriver(o.id, Number(pickDriverId))}
                    >
                      Cakto kalorësin
                    </button>
                  </div>
                )}
                <p className="text-[10px] text-zinc-500">
                  Kalorësi e kalon porosinë në «në dërgesë» kur e mbledh nga restoranti (paneli i kalorësit).
                </p>
              </div>
            )}
            {o.fulfillmentType === 'pickup' ? (
              <p className="w-full text-[10px] text-zinc-500">
                Për marrje në lokacion, porosia përfundohet kur klienti e merr në restorant.
              </p>
            ) : null}
          </>
        ) : null}
        {st === S.OutForDelivery ? (
          <p className="text-xs text-zinc-500">Në dërgesë — përditësimet e radhës nga deliveri / klienti.</p>
        ) : null}
      </div>
    </article>
  )
}

function KitchenBoardSkeleton() {
  return (
    <div className="space-y-4 animate-pulse" aria-hidden>
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-[4.5rem] rounded-xl bg-white/[0.06] sm:h-24" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="min-h-[10rem] rounded-xl border border-white/[0.06] bg-white/[0.04]"
          />
        ))}
      </div>
    </div>
  )
}

function Column({
  title,
  count,
  children,
  accent,
}: {
  title: string
  count: number
  children: React.ReactNode
  accent?: string
}) {
  return (
    <div className="flex min-h-[120px] flex-col rounded-xl border border-white/[0.07] bg-[#0d1014]/80">
      <div
        className={`flex items-center justify-between border-b border-white/[0.06] px-3 py-2 ${accent ?? ''}`}
      >
        <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-400">{title}</h2>
        <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs font-semibold text-zinc-200">{count}</span>
      </div>
      <div className="flex flex-1 flex-col gap-3 p-2">{children}</div>
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
      const [list, st, drv] = await Promise.all([
        fetchKitchenOrders(token),
        fetchKitchenTodayStats(token),
        fetchKitchenAssignableDrivers(token).catch(() => [] as KitchenAssignableDriver[]),
      ])
      setOrders(list)
      setStats(st)
      setAssignableDrivers(drv)

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

  const { incoming, preparing, ready, out, history } = useMemo(() => {
    const incoming = orders.filter((o) => o.status === S.Pending)
    const preparing = orders.filter((o) => o.status === S.Confirmed || o.status === S.Preparing)
    const ready = orders.filter((o) => o.status === S.ReadyForPickup)
    const out = orders.filter((o) => o.status === S.OutForDelivery)
    const history = orders
      .filter((o) => o.status === S.Delivered || o.status === S.Cancelled)
      .slice(0, 40)
    return { incoming, preparing, ready, out, history }
  }, [orders])

  async function runAssignDriver(orderId: number, driverUserId: number) {
    if (!token) return
    setActionError(null)
    setBusyId(orderId)
    const r = await patchKitchenAssignDriver(token, orderId, driverUserId)
    setBusyId(null)
    if (!r.ok) {
      if (r.message.includes('401')) {
        setSessionExpired(true)
        return
      }
      setActionError(r.message)
    } else void refresh()
  }

  async function runAction(orderId: number, status: number, note?: string | null) {
    if (!token) return
    setActionError(null)
    setBusyId(orderId)
    const r = await patchKitchenOrderStatus(token, orderId, status, note)
    setBusyId(null)
    if (!r.ok) {
      if (r.message.includes('401')) {
        setSessionExpired(true)
        return
      }
      setActionError(r.message)
    } else void refresh()
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
          <h1 className="text-xl font-bold text-zinc-100 sm:text-2xl">Porosi aktive</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <button
            type="button"
            disabled={!token || sessionExpired || pullBusy}
            onClick={() => void manualPull()}
            className={`${customerBtnGhost} px-3 py-1.5 text-xs disabled:opacity-40`}
          >
            {pullBusy ? 'Duke rifreskuar…' : 'Rifresko tani'}
          </button>
          <button
            type="button"
            role="switch"
            aria-checked={rush}
            disabled={sessionExpired}
            onClick={() => setRush((x) => !x)}
            className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-40 ${
              rush
                ? 'border-amber-500/50 bg-amber-500/15 text-amber-200'
                : 'border-white/15 text-zinc-400 hover:bg-white/5'
            }`}
          >
            Rush {rush ? 'ON' : 'OFF'}
          </button>
          <span className="flex max-w-[10rem] items-center gap-1.5 text-xs leading-tight text-emerald-400/90 sm:max-w-none">
            <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-400" aria-hidden />
            Operativisht hapur
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
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          <div className={customerCardMuted + ' p-3 text-center'}>
            <p className="text-[10px] uppercase text-zinc-500">Sot (UTC)</p>
            <p className="text-lg font-bold text-zinc-100">{stats.ordersCount}</p>
            <p className="text-[10px] text-zinc-500">porosi</p>
          </div>
          <div className={customerCardMuted + ' p-3 text-center'}>
            <p className="text-[10px] uppercase text-zinc-500">Përfunduar</p>
            <p className="text-lg font-bold text-zinc-100">{stats.completedCount}</p>
          </div>
          <div className={customerCardMuted + ' p-3 text-center'}>
            <p className="text-[10px] uppercase text-zinc-500">Të ardhura</p>
            <p className="text-lg font-bold text-emerald-300/90">{stats.revenueTotal.toFixed(2)} €</p>
            <p className="text-[10px] text-zinc-500">jo anuluar</p>
          </div>
        </div>
      ) : null}

      {loading ? <KitchenBoardSkeleton /> : null}
      {error && !sessionExpired ? (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          <p>{error}</p>
          <button
            type="button"
            className={`${customerBtnGhost} mt-2 px-3 py-1.5 text-xs`}
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
        className={`grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4 ${sessionExpired ? 'pointer-events-none opacity-45' : ''}`}
      >
        <Column title="Të reja" count={incoming.length} accent="bg-amber-500/5">
          {incoming.length === 0 ? (
            <p className="px-1 py-4 text-center text-xs text-zinc-600">—</p>
          ) : (
            incoming.map((o) => (
              <OrderCard
                key={o.id}
                o={o}
                busy={busyId === o.id}
                onAction={(id, st, n) => void runAction(id, st, n)}
                onReject={setRejectForId}
                assignableDrivers={assignableDrivers}
                onAssignDriver={(oid, du) => void runAssignDriver(oid, du)}
              />
            ))
          )}
        </Column>
        <Column title="Në përgatitje" count={preparing.length}>
          {preparing.length === 0 ? (
            <p className="px-1 py-4 text-center text-xs text-zinc-600">—</p>
          ) : (
            preparing.map((o) => (
              <OrderCard
                key={o.id}
                o={o}
                busy={busyId === o.id}
                onAction={(id, st, n) => void runAction(id, st, n)}
                onReject={setRejectForId}
                assignableDrivers={assignableDrivers}
                onAssignDriver={(oid, du) => void runAssignDriver(oid, du)}
              />
            ))
          )}
        </Column>
        <Column title="Gati" count={ready.length}>
          {ready.length === 0 ? (
            <p className="px-1 py-4 text-center text-xs text-zinc-600">—</p>
          ) : (
            ready.map((o) => (
              <OrderCard
                key={o.id}
                o={o}
                busy={busyId === o.id}
                onAction={(id, st, n) => void runAction(id, st, n)}
                onReject={setRejectForId}
                assignableDrivers={assignableDrivers}
                onAssignDriver={(oid, du) => void runAssignDriver(oid, du)}
              />
            ))
          )}
        </Column>
        <Column title="Në dërgesë" count={out.length}>
          {out.length === 0 ? (
            <p className="px-1 py-4 text-center text-xs text-zinc-600">—</p>
          ) : (
            out.map((o) => (
              <OrderCard
                key={o.id}
                o={o}
                busy={busyId === o.id}
                onAction={(id, st, n) => void runAction(id, st, n)}
                onReject={setRejectForId}
                assignableDrivers={assignableDrivers}
                onAssignDriver={(oid, du) => void runAssignDriver(oid, du)}
              />
            ))
          )}
        </Column>
      </div>

      {history.length > 0 ? (
        <section>
          <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-zinc-500">Histori së fundmi</h2>
          <ul className="space-y-2">
            {history.map((o) => (
              <li
                key={o.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2 text-xs text-zinc-400"
              >
                <span className="font-mono text-zinc-300">{o.orderNumber}</span>
                <span>
                  {o.status === S.Cancelled
                    ? 'Refuzuar / anuluar'
                    : o.fulfillmentType === 'pickup'
                      ? 'Marrë në lokacion'
                      : 'Dorëzuar'}
                </span>
                <span>{o.total.toFixed(2)} €</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {rejectForId !== null ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal
          aria-labelledby="reject-title"
        >
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#1a1f28] p-5 shadow-2xl">
            <h2 id="reject-title" className="text-lg font-semibold text-zinc-100">
              Refuzo porosinë
            </h2>
            <p className="mt-1 text-xs text-zinc-500">
              Arsyeja regjistrohet për histori dhe audit (admin); klienti e sheh në UI kur të lidhet njoftimi.
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
                className="mt-3 w-full rounded-lg border border-white/10 bg-zinc-900/80 px-3 py-2 text-sm text-zinc-100"
                rows={2}
                placeholder="Shkruaj arsyen…"
              />
            ) : null}
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" className={customerBtnGhost} onClick={() => setRejectForId(null)}>
                Anulo
              </button>
              <button type="button" className={customerBtnPrimary} onClick={() => void submitReject()}>
                Konfirmo refuzimin
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
