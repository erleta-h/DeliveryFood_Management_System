import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useSearchParams } from 'react-router-dom'
import { AdminEmptyState } from '../components/admin/AdminEmptyState'
import { AdminIcon } from '../components/admin/adminIcons'
import { AdminTableSkeleton } from '../components/admin/AdminSkeleton'
import { AdminOrderDetailsDrawer } from '../components/admin/orders/AdminOrderDetailsDrawer'
import {
  fetchAdminCustomers,
  fetchAdminDashboard,
  fetchAdminOrders,
  fetchAdminRestaurants,
  type AdminOrderListResult,
  type AdminOrderRow,
} from '../lib/adminApi'
import {
  ADMIN_ORDER_STATUS_OPTIONS,
  adminOrderStatusBadge,
  formatAdminOrderStatus,
  paymentStatusLabel,
  todayUtcRange,
} from '../lib/adminOrderStatus'
import {
  adminSuccessBanner,
  customerBtnGhost,
  customerField,
  customerPanelSubtitle,
  customerSelect,
} from '../lib/adminTheme'
import { useAuthStore } from '../store/authStore'

const PAGE_SIZE = 20

type OrderKpis = {
  ordersToday: number
  inProcessToday: number
  deliveredToday: number
  cancelledToday: number
  revenueToday: number
}

function formatMoney(n: number): string {
  return `€${n.toLocaleString('sq-AL', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

function formatTableDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString('sq-AL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return iso
  }
}

function KpiCard({
  label,
  value,
  hint,
  icon,
  tone,
  valueClass,
}: {
  label: string
  value: string | number
  hint: string
  icon: ReactNode
  tone: string
  valueClass?: string
}) {
  return (
    <div className="rounded-xl border border-gray-200/90 bg-white p-4 shadow-sm">
      <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${tone}`}>{icon}</div>
      <p className="mt-3 text-[11px] font-semibold uppercase tracking-wide text-gray-500">{label}</p>
      <p className={`mt-1 text-2xl font-bold tabular-nums text-gray-900 ${valueClass ?? ''}`}>{value}</p>
      {hint ? <p className="mt-0.5 text-xs text-gray-400">{hint}</p> : null}
    </div>
  )
}

function matchesSearch(row: AdminOrderRow, q: string): boolean {
  const s = q.trim().toLowerCase()
  if (!s) return true
  return (
    row.orderNumber.toLowerCase().includes(s) ||
    row.customerEmail.toLowerCase().includes(s) ||
    row.restaurantName.toLowerCase().includes(s) ||
    String(row.id).includes(s) ||
    String(row.customerUserId).includes(s)
  )
}

export default function AdminOrdersPage() {
  const token = useAuthStore((s) => s.token)
  const [searchParams] = useSearchParams()

  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [status, setStatus] = useState('')
  const [restaurantId, setRestaurantId] = useState('')
  const [customerUserId, setCustomerUserId] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  const [data, setData] = useState<AdminOrderListResult | null>(null)
  const [kpis, setKpis] = useState<OrderKpis | null>(null)
  const [restaurants, setRestaurants] = useState<{ id: number; name: string }[]>([])
  const [customers, setCustomers] = useState<{ id: number; email: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [kpiLoading, setKpiLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [drawerRow, setDrawerRow] = useState<AdminOrderRow | null>(null)

  useEffect(() => {
    const c = searchParams.get('customer')
    if (c) setCustomerUserId(c)
    const s = searchParams.get('search')
    if (s) setSearch(s)
  }, [searchParams])

  const loadKpis = useCallback(async () => {
    if (!token) return
    setKpiLoading(true)
    try {
      const { fromUtc, toUtc } = todayUtcRange()
      const [dashboard, delivered, cancelled] = await Promise.all([
        fetchAdminDashboard(token),
        fetchAdminOrders(token, { fromUtc, toUtc, status: 4, page: 1, pageSize: 1 }),
        fetchAdminOrders(token, { fromUtc, toUtc, status: 9, page: 1, pageSize: 1 }),
      ])
      const deliveredToday = delivered.totalCount
      const cancelledToday = cancelled.totalCount
      const ordersToday = dashboard.ordersToday
      setKpis({
        ordersToday,
        deliveredToday,
        cancelledToday,
        inProcessToday: Math.max(0, ordersToday - deliveredToday - cancelledToday),
        revenueToday: dashboard.revenueToday,
      })
    } catch {
      setKpis(null)
    } finally {
      setKpiLoading(false)
    }
  }, [token])

  const loadFiltersMeta = useCallback(async () => {
    if (!token) return
    try {
      const [r, c] = await Promise.all([
        fetchAdminRestaurants(token, { page: 1, pageSize: 100 }),
        fetchAdminCustomers(token, { page: 1, pageSize: 100 }),
      ])
      setRestaurants(r.items.map((x) => ({ id: x.id, name: x.name })))
      setCustomers(c.items.map((x) => ({ id: x.id, email: x.email })))
    } catch {
      setRestaurants([])
      setCustomers([])
    }
  }, [token])

  const load = useCallback(async () => {
    if (!token) return
    setError(null)
    const q: Parameters<typeof fetchAdminOrders>[1] = {
      page,
      pageSize: search.trim() ? 100 : PAGE_SIZE,
    }
    if (fromDate) q.fromUtc = `${fromDate}T00:00:00.000Z`
    if (toDate) q.toUtc = `${toDate}T23:59:59.999Z`
    if (status !== '') q.status = Number(status)
    const rid = Number(restaurantId)
    if (restaurantId.trim() && Number.isFinite(rid)) q.restaurantId = rid
    const uid = Number(customerUserId)
    if (customerUserId.trim() && Number.isFinite(uid)) q.customerUserId = uid

    const d = await fetchAdminOrders(token, q)
    setData(d)
  }, [token, fromDate, toDate, status, restaurantId, customerUserId, page, search])

  useEffect(() => {
    if (!token) {
      setLoading(false)
      return
    }
    void loadFiltersMeta()
    void loadKpis()
  }, [token, loadFiltersMeta, loadKpis])

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

  useEffect(() => {
    setPage(1)
  }, [fromDate, toDate, status, restaurantId, customerUserId, search])

  const filteredItems = useMemo(() => {
    if (!data) return []
    return data.items.filter((r) => matchesSearch(r, search))
  }, [data, search])

  const displayItems = useMemo(() => {
    if (search.trim() && data && data.pageSize > PAGE_SIZE) {
      const start = (page - 1) * PAGE_SIZE
      return filteredItems.slice(start, start + PAGE_SIZE)
    }
    return filteredItems
  }, [filteredItems, page, search, data])

  const totalCount = search.trim() && data && data.pageSize > PAGE_SIZE ? filteredItems.length : (data?.totalCount ?? 0)
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE))

  const pageNumbers = useMemo(() => {
    const max = 5
    let start = Math.max(1, page - Math.floor(max / 2))
    const end = Math.min(totalPages, start + max - 1)
    start = Math.max(1, end - max + 1)
    const nums: number[] = []
    for (let i = start; i <= end; i++) nums.push(i)
    return nums
  }, [page, totalPages])

  function clearFilters() {
    setFromDate('')
    setToDate('')
    setStatus('')
    setRestaurantId('')
    setCustomerUserId('')
    setSearch('')
    setPage(1)
  }

  function onUpdated() {
    void load()
    void loadKpis()
  }

  const drawerLiveRow = useMemo(() => {
    if (!drawerRow || !data) return drawerRow
    return data.items.find((r) => r.id === drawerRow.id) ?? drawerRow
  }, [drawerRow, data])

  if (!token) return null

  const hasFilters =
    fromDate || toDate || status || restaurantId || customerUserId || search.trim()

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-gray-900 sm:text-2xl">
          Porositë e platformës
        </h1>
        <p className={customerPanelSubtitle}>
          Menaxho porositë, statuset, pagesat dhe rimbursimet. Rimbursimi vlen për pagesa në pritje / të
          kapura; porositë e dorëzuara nuk anulohen nga ky modul.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <KpiCard
          label="Porosi sot"
          value={kpiLoading ? '…' : (kpis?.ordersToday ?? 0)}
          hint="UTC · sot"
          tone="bg-violet-100 text-violet-700"
          icon={<AdminIcon name="orders" size={18} />}
        />
        <KpiCard
          label="Në proces"
          value={kpiLoading ? '…' : (kpis?.inProcessToday ?? 0)}
          hint="Sot · jo dorëzuar/anuluar"
          tone="bg-sky-100 text-sky-700"
          icon={<span className="text-base leading-none">⏳</span>}
        />
        <KpiCard
          label="Dorëzuar"
          value={kpiLoading ? '…' : (kpis?.deliveredToday ?? 0)}
          hint="Sot (UTC)"
          tone="bg-emerald-100 text-emerald-700"
          icon={<span className="text-base leading-none">✓</span>}
        />
        <KpiCard
          label="Anuluar"
          value={kpiLoading ? '…' : (kpis?.cancelledToday ?? 0)}
          hint="Sot (UTC)"
          tone="bg-red-100 text-red-700"
          icon={<span className="text-base leading-none">✕</span>}
        />
        <KpiCard
          label="Të ardhura"
          value={kpiLoading ? '…' : formatMoney(kpis?.revenueToday ?? 0)}
          hint="Sot (UTC)"
          tone="bg-amber-100 text-amber-800"
          icon={<AdminIcon name="finance" size={18} />}
        />
      </div>

      <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="grid gap-3 lg:grid-cols-12 lg:items-end">
          <div className="relative lg:col-span-4">
            <AdminIcon
              name="search"
              size={16}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Kërko porosi, klient, restorant…"
              className={customerField + ' pl-9'}
            />
          </div>
          <label className="block text-xs text-gray-500 lg:col-span-2">
            Statusi
            <select value={status} onChange={(e) => setStatus(e.target.value)} className={customerSelect}>
              {ADMIN_ORDER_STATUS_OPTIONS.map((o) => (
                <option key={o.value || 'all'} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-xs text-gray-500 lg:col-span-2">
            Nga data (UTC)
            <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className={customerField} />
          </label>
          <label className="block text-xs text-gray-500 lg:col-span-2">
            Deri data (UTC)
            <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className={customerField} />
          </label>
          <label className="block text-xs text-gray-500 lg:col-span-3">
            Restoranti
            <select value={restaurantId} onChange={(e) => setRestaurantId(e.target.value)} className={customerSelect}>
              <option value="">Të gjithë</option>
              {restaurants.map((r) => (
                <option key={r.id} value={String(r.id)}>
                  {r.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-xs text-gray-500 lg:col-span-3">
            Klienti
            <select value={customerUserId} onChange={(e) => setCustomerUserId(e.target.value)} className={customerSelect}>
              <option value="">Të gjithë</option>
              {customers.map((c) => (
                <option key={c.id} value={String(c.id)}>
                  {c.email}
                </option>
              ))}
            </select>
          </label>
          <div className="flex lg:col-span-2 lg:justify-end">
            <button
              type="button"
              disabled={!hasFilters}
              onClick={clearFilters}
              className={customerBtnGhost + ' w-full lg:w-auto'}
            >
              Pastro filtrat
            </button>
          </div>
        </div>
        {search.trim() ? (
          <p className="mt-2 text-xs text-gray-400">
            Kërkim tekstual: deri në 100 porosi të fundit me filtrat aktualë (API nuk ka ende search server-side).
          </p>
        ) : null}
      </section>

      {message ? <p className={adminSuccessBanner}>{message}</p> : null}
      {error ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
      ) : null}

      {loading ? <AdminTableSkeleton rows={8} /> : null}

      {!loading && displayItems.length === 0 ? (
        <AdminEmptyState
          icon="📦"
          title={hasFilters ? 'Nuk u gjet asnjë porosi' : 'Nuk ka porosi'}
          description={
            hasFilters
              ? 'Provo filtra të tjerë ose pastro filtrat.'
              : 'Porositë e klientëve do të shfaqen këtu.'
          }
        />
      ) : null}

      {!loading && displayItems.length > 0 ? (
        <>
          <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-gray-100 bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-4 py-3">ID porosie</th>
                  <th className="px-4 py-3">Klienti</th>
                  <th className="px-4 py-3">Restoranti</th>
                  <th className="px-4 py-3">Statusi</th>
                  <th className="px-4 py-3">Pagesa</th>
                  <th className="px-4 py-3">Totali</th>
                  <th className="px-4 py-3">Data</th>
                  <th className="px-4 py-3 text-right">Veprime</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {displayItems.map((row) => {
                  const pay = row.payments[0]
                  return (
                    <tr key={row.id} className="transition hover:bg-gray-50/80">
                      <td className="px-4 py-3">
                        <p className="font-mono text-xs font-medium text-violet-700">{row.orderNumber}</p>
                        <p className="text-xs text-gray-400">#{row.id}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900">{row.customerEmail}</p>
                        <p className="text-xs text-gray-400">user #{row.customerUserId}</p>
                      </td>
                      <td className="px-4 py-3 text-gray-800">{row.restaurantName}</td>
                      <td className="px-4 py-3">
                        <span className={adminOrderStatusBadge(row.status)}>
                          {formatAdminOrderStatus(row.status)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {pay ? (
                          <div>
                            <p className="text-xs font-medium text-gray-700">{paymentStatusLabel(pay.status)}</p>
                            <p className="text-xs capitalize text-gray-400">{pay.provider}</p>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 tabular-nums font-medium text-gray-900">
                        {row.total.toFixed(2)} €
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-600">{formatTableDate(row.placedAtUtc)}</td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-700 transition hover:border-violet-200 hover:bg-violet-50 hover:text-violet-700"
                          onClick={() => setDrawerRow(row)}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                            <circle cx="12" cy="12" r="3" />
                          </svg>
                          Shiko
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-gray-500">
              {totalCount} porosi · faqja {page} / {totalPages}
            </p>
            <div className="flex items-center gap-1">
              <button
                type="button"
                className={customerBtnGhost + ' px-2.5 py-1.5 text-xs'}
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                ←
              </button>
              {pageNumbers.map((n) => (
                <button
                  key={n}
                  type="button"
                  className={
                    n === page
                      ? 'flex h-8 min-w-8 items-center justify-center rounded-lg bg-violet-600 px-2 text-xs font-semibold text-white'
                      : customerBtnGhost + ' h-8 min-w-8 px-2 py-1.5 text-xs'
                  }
                  onClick={() => setPage(n)}
                >
                  {n}
                </button>
              ))}
              <button
                type="button"
                className={customerBtnGhost + ' px-2.5 py-1.5 text-xs'}
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                →
              </button>
            </div>
          </div>
        </>
      ) : null}

      {drawerLiveRow ? (
        <AdminOrderDetailsDrawer
          row={drawerLiveRow}
          onClose={() => setDrawerRow(null)}
          onUpdated={onUpdated}
          onMessage={setMessage}
        />
      ) : null}
    </div>
  )
}
