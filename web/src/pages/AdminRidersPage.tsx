import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { AdminDriversMap } from '../components/AdminDriversMap'
import { AdminEmptyState } from '../components/admin/AdminEmptyState'
import { AdminIcon } from '../components/admin/adminIcons'
import { AdminDriverDetailsDrawer } from '../components/admin/drivers/AdminDriverDetailsDrawer'
import { AdminTableSkeleton } from '../components/admin/AdminSkeleton'
import {
  approveDriverApplication,
  fetchAdminDrivers,
  fetchDriverApplications,
  type AdminDriverListResult,
  type AdminDriverRow,
  type DriverApplicationRow,
} from '../lib/adminApi'
import {
  driverDisplayName,
  driverInitial,
  driverStatusBadgeClass,
  driverStatusInfo,
  formatDriverDate,
  formatGpsAgo,
  vehicleLabel,
} from '../lib/adminDriverStatus'
import {
  adminFilterBtn,
  adminSuccessBanner,
  customerBtnGhost,
  customerBtnPrimary,
  customerField,
  customerPanelSubtitle,
} from '../lib/adminTheme'
import { useAuthStore } from '../store/authStore'

type DriverFilter = 'all' | 'active' | 'suspended' | 'online' | 'pending'

const PENDING_STATUS = 0
const PAGE_SIZE = 20

type DriverKpis = {
  total: number
  online: number
  activeOffline: number
  suspended: number
  pending: number
}

function KpiCard({
  label,
  value,
  hint,
  icon,
  tone,
  action,
}: {
  label: string
  value: string | number
  hint?: string
  icon: ReactNode
  tone: string
  action?: ReactNode
}) {
  return (
    <div className="rounded-xl border border-gray-200/90 bg-white p-4 shadow-sm">
      <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${tone}`}>{icon}</div>
      <p className="mt-3 text-[11px] font-semibold uppercase tracking-wide text-gray-500">{label}</p>
      <p className="mt-1 text-2xl font-bold tabular-nums text-gray-900">{value}</p>
      {hint ? <p className="mt-0.5 text-xs text-gray-400">{hint}</p> : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  )
}

export default function AdminRidersPage() {
  const token = useAuthStore((s) => s.token)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [searchDebounced, setSearchDebounced] = useState('')
  const [filter, setFilter] = useState<DriverFilter>('all')
  const [data, setData] = useState<AdminDriverListResult | null>(null)
  const [pendingApps, setPendingApps] = useState<DriverApplicationRow[]>([])
  const [kpis, setKpis] = useState<DriverKpis | null>(null)
  const [kpiLoading, setKpiLoading] = useState(true)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<number | null>(null)
  const [drawerDriver, setDrawerDriver] = useState<AdminDriverRow | null>(null)

  useEffect(() => {
    const t = window.setTimeout(() => setSearchDebounced(search), 300)
    return () => window.clearTimeout(t)
  }, [search])

  useEffect(() => {
    setPage(1)
  }, [searchDebounced, filter])

  const mapDrivers = useMemo(() => {
    if (!data) return []
    return data.items
      .filter((d) => d.lastLatitude != null && d.lastLongitude != null)
      .map((d) => ({
        userId: d.userId,
        lat: d.lastLatitude as number,
        lng: d.lastLongitude as number,
        label: driverDisplayName(d),
      }))
  }, [data])

  const loadKpis = useCallback(async () => {
    if (!token) return
    setKpiLoading(true)
    try {
      const [totalR, onlineR, activeR, suspendedR, apps] = await Promise.all([
        fetchAdminDrivers(token, { page: 1, pageSize: 1 }),
        fetchAdminDrivers(token, { page: 1, pageSize: 1, status: 'online' }),
        fetchAdminDrivers(token, { page: 1, pageSize: 1, status: 'active' }),
        fetchAdminDrivers(token, { page: 1, pageSize: 1, status: 'suspended' }),
        fetchDriverApplications(token),
      ])
      const pending = apps.filter((a) => a.status === PENDING_STATUS).length
      const online = onlineR.total
      const active = activeR.total
      setKpis({
        total: totalR.total,
        online,
        activeOffline: Math.max(0, active - online),
        suspended: suspendedR.total,
        pending,
      })
      setPendingApps(apps.filter((a) => a.status === PENDING_STATUS))
    } catch {
      setKpis(null)
    } finally {
      setKpiLoading(false)
    }
  }, [token])

  const loadRegistered = useCallback(async () => {
    if (!token) return
    setError(null)
    const statusParam =
      filter === 'active'
        ? 'active'
        : filter === 'suspended'
          ? 'suspended'
          : filter === 'online'
            ? 'online'
            : undefined
    const d = await fetchAdminDrivers(token, {
      page,
      pageSize: PAGE_SIZE,
      search: searchDebounced || undefined,
      status: statusParam,
    })
    setData(d)
  }, [token, page, searchDebounced, filter])

  useEffect(() => {
    if (!token) return
    void loadKpis()
  }, [token, loadKpis])

  useEffect(() => {
    if (!token) {
      setLoading(false)
      return
    }
    if (filter === 'pending') {
      setLoading(true)
      void loadKpis().finally(() => setLoading(false))
      return
    }
    let c = false
    setLoading(true)
    void loadRegistered()
      .catch((e: unknown) => {
        if (!c) setError(e instanceof Error ? e.message : 'Gabim.')
      })
      .finally(() => {
        if (!c) setLoading(false)
      })
    return () => {
      c = true
    }
  }, [token, loadRegistered, filter, loadKpis])

  async function approveApp(id: number) {
    if (!token) return
    setBusyId(id)
    setMsg(null)
    const r = await approveDriverApplication(token, id)
    setBusyId(null)
    if (!r.ok) setMsg(r.message)
    else {
      setMsg('Deliver u miratua.')
      void loadKpis()
      if (filter !== 'pending') void loadRegistered()
    }
  }

  function onUpdated() {
    void loadRegistered()
    void loadKpis()
  }

  const drawerLive = useMemo(() => {
    if (!drawerDriver || !data) return drawerDriver
    return data.items.find((d) => d.userId === drawerDriver.userId) ?? drawerDriver
  }, [drawerDriver, data])

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1

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
    setSearch('')
    setFilter('all')
    setPage(1)
  }

  const pendingPreview = pendingApps.slice(0, 4)

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-gray-900 sm:text-2xl">Delivera</h1>
        <p className={customerPanelSubtitle}>
          Menaxho deliverat e regjistruar, GPS-në e fundit dhe aplikimet në pritje.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <KpiCard
          label="Total delivera"
          value={kpiLoading ? '…' : (kpis?.total ?? 0)}
          icon={<AdminIcon name="riders" size={18} />}
          tone="bg-violet-100 text-violet-700"
        />
        <KpiCard
          label="Online"
          value={kpiLoading ? '…' : (kpis?.online ?? 0)}
          hint="Aktiv + online"
          icon={<span className="text-base leading-none">●</span>}
          tone="bg-emerald-100 text-emerald-700"
        />
        <KpiCard
          label="Aktivë (offline)"
          value={kpiLoading ? '…' : (kpis?.activeOffline ?? 0)}
          hint="Jo online"
          icon={<span className="text-base leading-none">○</span>}
          tone="bg-sky-100 text-sky-700"
        />
        <KpiCard
          label="Pezulluar"
          value={kpiLoading ? '…' : (kpis?.suspended ?? 0)}
          icon={<span className="text-base leading-none">⏸</span>}
          tone="bg-red-100 text-red-700"
        />
        <KpiCard
          label="Në pritje"
          value={kpiLoading ? '…' : (kpis?.pending ?? 0)}
          icon={<span className="text-base leading-none">⏳</span>}
          tone="bg-amber-100 text-amber-800"
          action={
            (kpis?.pending ?? 0) > 0 ? (
              <button type="button" className="text-xs font-medium text-violet-600 hover:underline" onClick={() => setFilter('pending')}>
                Shiko aplikimet →
              </button>
            ) : null
          }
        />
      </div>

      <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="relative min-w-0 flex-1 max-w-md">
            <AdminIcon
              name="search"
              size={16}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Kërko emër, email ose targa…"
              className={customerField + ' pl-9'}
              disabled={filter === 'pending'}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {(
              [
                ['all', 'Të gjithë'],
                ['active', 'Aktiv'],
                ['online', 'Online'],
                ['suspended', 'Pezulluar'],
                ['pending', 'Në pritje'],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setFilter(key)}
                className={adminFilterBtn(filter === key)}
              >
                {label}
              </button>
            ))}
            <button type="button" className={customerBtnGhost} onClick={clearFilters}>
              Pastro
            </button>
            <button
              type="button"
              className={customerBtnGhost}
              title="Rifresko"
              onClick={() => {
                void loadKpis()
                if (filter === 'pending') return
                void loadRegistered()
              }}
            >
              ↻
            </button>
          </div>
        </div>
      </section>

      {msg ? <p className={adminSuccessBanner}>{msg}</p> : null}
      {error ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
      ) : null}

      {loading ? <AdminTableSkeleton rows={6} /> : null}

      {!loading && filter === 'pending' ? (
        pendingApps.length === 0 ? (
          <AdminEmptyState
            icon="🛵"
            title="Nuk ka aplikime në pritje"
            description="Kur dikush aplikon si deliver, shfaqet këtu për miratim."
            action={{ label: 'Aplikimet Deliver', to: '/admin/driver-applications' }}
          />
        ) : (
          <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-gray-100 bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-4 py-3">Deliveri</th>
                  <th className="px-4 py-3">Statusi</th>
                  <th className="px-4 py-3">Mjeti</th>
                  <th className="px-4 py-3 text-right">Veprime</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {pendingApps.map((a) => (
                  <tr key={a.id} className="hover:bg-gray-50/80">
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">
                        {a.firstName} {a.lastName}
                      </div>
                      <div className="text-xs text-gray-500">{a.email}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-800 ring-1 ring-inset ring-amber-200">
                        Në pritje
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {a.vehicleType}
                      {a.licensePlate ? ` · ${a.licensePlate}` : ''}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          className={customerBtnPrimary + ' px-3 py-1.5 text-xs'}
                          disabled={busyId === a.id}
                          onClick={() => void approveApp(a.id)}
                        >
                          Mirato
                        </button>
                        <Link to="/admin/driver-applications" className={customerBtnGhost + ' px-3 py-1.5 text-xs'}>
                          Shiko
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      ) : null}

      {!loading && filter !== 'pending' && data && data.total === 0 ? (
        <AdminEmptyState
          icon="🛵"
          title="Nuk ka delivera të regjistruar"
          description="Mirato një aplikim deliver ose kontrollo filtrat e kërkimit."
          action={{ label: 'Aplikimet Deliver', to: '/admin/driver-applications' }}
        />
      ) : null}

      {!loading && filter !== 'pending' && data && data.total > 0 ? (
        <div className="grid gap-5 xl:grid-cols-3">
          <div className="space-y-4 xl:col-span-2">
            <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-gray-100 bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                  <tr>
                    <th className="px-4 py-3">Deliveri</th>
                    <th className="px-4 py-3">Statusi</th>
                    <th className="px-4 py-3">Mjeti</th>
                    <th className="px-4 py-3">GPS i fundit</th>
                    <th className="px-4 py-3">Regjistruar</th>
                    <th className="px-4 py-3 text-right">Veprime</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {data.items.map((d) => {
                    const st = driverStatusInfo(d)
                    return (
                      <tr key={d.userId} className="transition hover:bg-gray-50/80">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-violet-100 text-sm font-semibold text-violet-700">
                              {driverInitial(d)}
                            </span>
                            <div>
                              <div className="font-medium text-gray-900">{driverDisplayName(d)}</div>
                              <div className="text-xs text-gray-500">{d.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={driverStatusBadgeClass(d)}>{st.text}</span>
                        </td>
                        <td className="px-4 py-3 text-gray-600">{vehicleLabel(d)}</td>
                        <td className="px-4 py-3 text-xs text-gray-600">
                          {formatGpsAgo(d.lastLocationAtUtc)}
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-600">{formatDriverDate(d.createdAt)}</td>
                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-700 transition hover:border-violet-200 hover:bg-violet-50 hover:text-violet-700"
                            onClick={() => setDrawerDriver(d)}
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
                Duke shfaqur {(page - 1) * PAGE_SIZE + 1} deri {Math.min(page * PAGE_SIZE, data.total)} nga{' '}
                {data.total}
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
          </div>

          <div className="space-y-4">
            <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <h2 className="text-sm font-semibold text-gray-900">Harta — GPS i fundit</h2>
              <p className="mt-0.5 text-xs text-gray-500">Deliverat në faqen aktuale me koordinata</p>
              {mapDrivers.length > 0 ? (
                <AdminDriversMap drivers={mapDrivers} className="mt-3 h-64" />
              ) : (
                <p className="mt-4 rounded-lg border border-dashed border-gray-200 bg-gray-50 px-3 py-8 text-center text-xs text-gray-500">
                  Nuk ka GPS për deliverat e kësaj faqeje.
                </p>
              )}
              <div className="mt-3 flex flex-wrap gap-3 text-[10px] text-gray-500">
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" /> Online
                </span>
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-sky-500" /> Aktiv
                </span>
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-red-400" /> Pezulluar
                </span>
              </div>
            </section>

            {pendingPreview.length > 0 ? (
              <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="text-sm font-semibold text-gray-900">Në pritje (aplikime)</h2>
                  <button
                    type="button"
                    className="text-xs font-medium text-violet-600 hover:underline"
                    onClick={() => setFilter('pending')}
                  >
                    Të gjitha →
                  </button>
                </div>
                <ul className="mt-3 space-y-2">
                  {pendingPreview.map((a) => (
                    <li
                      key={a.id}
                      className="flex items-center justify-between gap-2 rounded-lg border border-gray-100 bg-gray-50/80 px-3 py-2"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-gray-900">
                          {a.firstName} {a.lastName}
                        </p>
                        <p className="truncate text-xs text-gray-500">{a.email}</p>
                      </div>
                      <button
                        type="button"
                        disabled={busyId === a.id}
                        className={customerBtnPrimary + ' shrink-0 px-2 py-1 text-xs'}
                        onClick={() => void approveApp(a.id)}
                      >
                        Mirato
                      </button>
                    </li>
                  ))}
                </ul>
                <Link
                  to="/admin/driver-applications"
                  className="mt-3 block text-center text-xs font-medium text-violet-600 hover:underline"
                >
                  Shiko të gjitha aplikimet →
                </Link>
              </section>
            ) : null}
          </div>
        </div>
      ) : null}

      {drawerLive ? (
        <AdminDriverDetailsDrawer
          driver={drawerLive}
          onClose={() => setDrawerDriver(null)}
          onUpdated={onUpdated}
          onMessage={setMsg}
        />
      ) : null}
    </div>
  )
}
