import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  adminCancelOrder,
  adminRefundOrder,
  adminUpdateOrderStatus,
  fetchAdminOrders,
  type AdminOrderListResult,
  type AdminOrderRow,
} from '../lib/adminApi'
import {
  customerBtnGhost,
  customerBtnPrimary,
  customerCard,
  customerCardMuted,
} from '../lib/customerTheme'
import { formatOrderStatus } from '../lib/orderStatusLabels'
import { useAuthStore } from '../store/authStore'

const PAYMENT_STATUS_SQ: Record<number, string> = {
  0: 'Pagesë në pritje',
  1: 'E kapur',
  2: 'E rimbursuar',
  3: 'Dështoi',
}

function paymentStatusLabel(s: number) {
  return PAYMENT_STATUS_SQ[s] ?? `Pagesë ${s}`
}

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'Të gjitha statuset' },
  { value: '0', label: 'Në pritje' },
  { value: '1', label: 'Konfirmuar' },
  { value: '2', label: 'Në përgatitje' },
  { value: '5', label: 'Gati për marrje' },
  { value: '3', label: 'Në dërgesë' },
  { value: '4', label: 'Dorëzuar' },
  { value: '9', label: 'Anuluar' },
]

export default function AdminOrdersPage() {
  const token = useAuthStore((s) => s.token)
  const [searchParams] = useSearchParams()
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [status, setStatus] = useState('')
  const [restaurantId, setRestaurantId] = useState('')
  const [customerUserId, setCustomerUserId] = useState('')
  const [page, setPage] = useState(1)

  useEffect(() => {
    const c = searchParams.get('customer')
    if (c) setCustomerUserId(c)
  }, [searchParams])
  const [data, setData] = useState<AdminOrderListResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [busyOrderId, setBusyOrderId] = useState<number | null>(null)
  const [rowStatus, setRowStatus] = useState<Record<number, number>>({})

  const load = useCallback(async () => {
    if (!token) return
    setError(null)
    setMessage(null)
    const q: Parameters<typeof fetchAdminOrders>[1] = { page, pageSize: 20 }
    if (fromDate) q.fromUtc = `${fromDate}T00:00:00.000Z`
    if (toDate) q.toUtc = `${toDate}T23:59:59.999Z`
    if (status !== '') q.status = Number(status)
    const rid = Number(restaurantId)
    if (restaurantId.trim() && Number.isFinite(rid)) q.restaurantId = rid
    const uid = Number(customerUserId)
    if (customerUserId.trim() && Number.isFinite(uid)) q.customerUserId = uid

    const d = await fetchAdminOrders(token, q)
    setData(d)
    const nextRow: Record<number, number> = {}
    for (const row of d.items) nextRow[row.id] = row.status
    setRowStatus(nextRow)
  }, [token, fromDate, toDate, status, restaurantId, customerUserId, page])

  useEffect(() => {
    if (!token) {
      setLoading(false)
      return
    }
    let c = false
    setLoading(true)
    void load()
      .catch((e: unknown) => {
        if (!c) setError(e instanceof Error ? e.message : 'Gabim.')
      })
      .finally(() => {
        if (!c) setLoading(false)
      })
    return () => {
      c = true
    }
  }, [token, load])

  async function runAction(
    orderId: number,
    fn: (t: string, id: number) => Promise<{ ok: true } | { ok: false; message: string }>,
  ) {
    if (!token) return
    setBusyOrderId(orderId)
    setMessage(null)
    const r = await fn(token, orderId)
    setBusyOrderId(null)
    if (r.ok) {
      setMessage('U përditësua.')
      await load()
    } else setMessage(r.message)
  }

  function onApplyStatus(row: AdminOrderRow) {
    const st = rowStatus[row.id]
    if (st === undefined || st === row.status) {
      setMessage('Zgjidh status tjetër.')
      return
    }
    void runAction(row.id, (t, id) => adminUpdateOrderStatus(t, id, st))
  }

  if (!token) return null

  const totalPages = data ? Math.max(1, Math.ceil(data.totalCount / data.pageSize)) : 1

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-100">Porositë (platformë)</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Filtro sipas datës (UTC), statusit, restorantit ose ID-së së klientit. Rimbursimi vlen për pagesa{' '}
          <strong className="text-zinc-300">në pritje / të kapura</strong> dhe nuk lejohet për porosi të dorëzuara.
        </p>
      </div>

      <section className={`${customerCard} space-y-4 p-4`}>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <label className="block text-xs text-zinc-500">
            Nga data (UTC)
            <input
              type="date"
              value={fromDate}
              onChange={(e) => {
                setFromDate(e.target.value)
                setPage(1)
              }}
              className="mt-1 w-full rounded-lg border border-white/10 bg-[#0f0d12] px-3 py-2 text-sm text-zinc-200"
            />
          </label>
          <label className="block text-xs text-zinc-500">
            Deri data (UTC)
            <input
              type="date"
              value={toDate}
              onChange={(e) => {
                setToDate(e.target.value)
                setPage(1)
              }}
              className="mt-1 w-full rounded-lg border border-white/10 bg-[#0f0d12] px-3 py-2 text-sm text-zinc-200"
            />
          </label>
          <label className="block text-xs text-zinc-500">
            Statusi
            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value)
                setPage(1)
              }}
              className="mt-1 w-full rounded-lg border border-white/10 bg-[#0f0d12] px-3 py-2 text-sm text-zinc-200"
            >
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value || 'all'} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-xs text-zinc-500">
            ID restoranti
            <input
              type="number"
              min={1}
              value={restaurantId}
              onChange={(e) => {
                setRestaurantId(e.target.value)
                setPage(1)
              }}
              placeholder="p.sh. 1"
              className="mt-1 w-full rounded-lg border border-white/10 bg-[#0f0d12] px-3 py-2 text-sm text-zinc-200"
            />
          </label>
          <label className="block text-xs text-zinc-500">
            ID klienti (User)
            <input
              type="number"
              min={1}
              value={customerUserId}
              onChange={(e) => {
                setCustomerUserId(e.target.value)
                setPage(1)
              }}
              placeholder="p.sh. 2"
              className="mt-1 w-full rounded-lg border border-white/10 bg-[#0f0d12] px-3 py-2 text-sm text-zinc-200"
            />
          </label>
        </div>
        <p className="text-xs text-zinc-600">
          Porositë e vjetra mund të mos kenë rresht në <code className="rounded bg-white/5 px-1">Payments</code> — ato
          nuk rimbursohen nga ky modul.
        </p>
      </section>

      {message ? (
        <p className="rounded-lg border border-violet-500/30 bg-violet-500/10 px-3 py-2 text-sm text-violet-100">
          {message}
        </p>
      ) : null}

      {error ? (
        <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">{error}</p>
      ) : null}

      {loading ? <p className="text-sm text-zinc-500">Duke ngarkuar…</p> : null}

      {!loading && data && data.items.length === 0 ? (
        <p className="text-sm text-zinc-500">Nuk u gjet asnjë porosi me këto filtra.</p>
      ) : null}

      {!loading && data && data.items.length > 0 ? (
        <>
          <ul className="space-y-4">
            {data.items.map((row) => {
              const busy = busyOrderId === row.id
              const sel = rowStatus[row.id] ?? row.status
              return (
                <li key={row.id} className={customerCardMuted}>
                  <div className="flex flex-wrap items-start justify-between gap-3 border-b border-white/5 pb-3">
                    <div>
                      <p className="font-mono text-sm font-medium text-amber-200/90">{row.orderNumber}</p>
                      <p className="text-xs text-zinc-500">
                        {new Date(row.placedAtUtc).toLocaleString('sq-AL')} · ID #{row.id}
                      </p>
                      <p className="mt-1 text-sm text-zinc-200">{row.restaurantName}</p>
                      <p className="text-xs text-zinc-500">
                        Klienti: {row.customerEmail} (user #{row.customerUserId})
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-zinc-100">{row.total.toFixed(2)} €</p>
                      <p className="text-xs text-zinc-400">{formatOrderStatus(row.status)}</p>
                    </div>
                  </div>
                  <div className="mt-3 text-xs text-zinc-500">
                    Pagesat:{' '}
                    {row.payments.length === 0 ? (
                      '—'
                    ) : (
                      <span className="text-zinc-400">
                        {row.payments.map((p) => (
                          <span key={p.id} className="mr-2 inline-block">
                            {p.amount.toFixed(2)} {p.currency} ({p.provider}) · {paymentStatusLabel(p.status)}
                          </span>
                        ))}
                      </span>
                    )}
                  </div>
                  <div className="mt-4 flex flex-wrap items-end gap-2">
                    <label className="text-xs text-zinc-500">
                      Ndrysho status
                      <select
                        value={sel}
                        disabled={busy || row.status === 9}
                        onChange={(e) =>
                          setRowStatus((s) => ({ ...s, [row.id]: Number(e.target.value) }))
                        }
                        className="ml-2 rounded-lg border border-white/10 bg-[#0f0d12] px-2 py-1.5 text-sm text-zinc-200"
                      >
                        {STATUS_OPTIONS.filter((o) => o.value !== '').map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <button
                      type="button"
                      disabled={busy || row.status === 9}
                      onClick={() => onApplyStatus(row)}
                      className={`${customerBtnPrimary} px-3 py-1.5 text-xs`}
                    >
                      Ruaj statusin
                    </button>
                    <button
                      type="button"
                      disabled={busy || row.status === 9 || row.status === 4}
                      onClick={() => void runAction(row.id, adminCancelOrder)}
                      className={`${customerBtnGhost} px-3 py-1.5 text-xs text-red-200`}
                    >
                      Anulo
                    </button>
                    <button
                      type="button"
                      disabled={
                        busy ||
                        row.status === 4 ||
                        !row.payments.some((p) => p.status === 0 || p.status === 1)
                      }
                      onClick={() => void runAction(row.id, adminRefundOrder)}
                      className={`${customerBtnGhost} px-3 py-1.5 text-xs text-amber-200`}
                    >
                      Rimbursim
                    </button>
                  </div>
                </li>
              )
            })}
          </ul>

          <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-zinc-400">
            <span>
              {data.totalCount} porosi · faqja {data.page} / {totalPages}
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={page <= 1 || loading}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className={customerBtnGhost}
              >
                Para
              </button>
              <button
                type="button"
                disabled={page >= totalPages || loading}
                onClick={() => setPage((p) => p + 1)}
                className={customerBtnGhost}
              >
                Pas
              </button>
            </div>
          </div>
        </>
      ) : null}
    </div>
  )
}
