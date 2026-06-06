import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { AdminEmptyState } from '../components/admin/AdminEmptyState'
import { AdminIcon } from '../components/admin/adminIcons'
import { AdminTableSkeleton } from '../components/admin/AdminSkeleton'
import { DeliveryZoneDetailsDrawer } from '../components/admin/zones/DeliveryZoneDetailsDrawer'
import {
  fetchDeliveryZoneStats,
  fetchDeliveryZones,
  type DeliveryZoneListResult,
  type DeliveryZoneRow,
  type DeliveryZoneStats,
} from '../lib/adminApi'
import {
  adminFilterBtn,
  adminSuccessBanner,
  customerBtnGhost,
  customerBtnPrimary,
  customerField,
  customerPanelSubtitle,
  customerSelect,
} from '../lib/adminTheme'
import { useAuthStore } from '../store/authStore'

const PAGE_SIZE = 20

type StatusFilter = 'all' | 'active' | 'inactive'

function KpiCard({
  label,
  value,
  hint,
  icon,
  tone,
}: {
  label: string
  value: string | number
  hint?: string
  icon: ReactNode
  tone: string
}) {
  return (
    <div className="rounded-xl border border-gray-200/90 bg-white p-4 shadow-sm">
      <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${tone}`}>{icon}</div>
      <p className="mt-3 text-[11px] font-semibold uppercase tracking-wide text-gray-500">{label}</p>
      <p className="mt-1 text-2xl font-bold tabular-nums text-gray-900">{value}</p>
      {hint ? <p className="mt-0.5 text-xs text-gray-400">{hint}</p> : null}
    </div>
  )
}

function zoneStatusBadge(active: boolean): string {
  return active
    ? 'inline-flex rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-200'
    : 'inline-flex rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600 ring-1 ring-inset ring-gray-200'
}

export default function AdminZonesPage() {
  const token = useAuthStore((s) => s.token)
  const [search, setSearch] = useState('')
  const [searchDebounced, setSearchDebounced] = useState('')
  const [status, setStatus] = useState<StatusFilter>('all')
  const [sort, setSort] = useState('name')
  const [page, setPage] = useState(1)
  const [data, setData] = useState<DeliveryZoneListResult | null>(null)
  const [stats, setStats] = useState<DeliveryZoneStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [statsLoading, setStatsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const [drawer, setDrawer] = useState<{ mode: 'create' } | { mode: 'edit'; row: DeliveryZoneRow } | null>(null)

  useEffect(() => {
    const t = window.setTimeout(() => setSearchDebounced(search), 300)
    return () => window.clearTimeout(t)
  }, [search])

  useEffect(() => {
    setPage(1)
  }, [searchDebounced, status, sort])

  const loadStats = useCallback(async () => {
    if (!token) return
    setStatsLoading(true)
    try {
      setStats(await fetchDeliveryZoneStats(token))
    } catch {
      setStats(null)
    } finally {
      setStatsLoading(false)
    }
  }, [token])

  const load = useCallback(async () => {
    if (!token) return
    setError(null)
    const d = await fetchDeliveryZones(token, {
      page,
      pageSize: PAGE_SIZE,
      search: searchDebounced || undefined,
      status: status === 'all' ? undefined : status,
      sort,
    })
    setData(d)
  }, [token, page, searchDebounced, status, sort])

  useEffect(() => {
    if (!token) return
    void loadStats()
  }, [token, loadStats])

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

  function onSaved() {
    void load()
    void loadStats()
  }

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

  const drawerLiveRow =
    drawer?.mode === 'edit' && data
      ? data.items.find((z) => z.id === drawer.row.id) ?? drawer.row
      : drawer?.mode === 'edit'
        ? drawer.row
        : null

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-gray-900 sm:text-2xl">Zonat & tarifat</h1>
          <p className={customerPanelSubtitle}>
            Tarifa bazë e dërgesës sipas zonës. Restorantet mund të kenë override te moduli Restorantet.
          </p>
        </div>
        <button type="button" className={customerBtnPrimary} onClick={() => setDrawer({ mode: 'create' })}>
          + Shto zonë
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Zona aktive"
          value={statsLoading ? '…' : (stats?.activeZoneCount ?? 0)}
          icon={<AdminIcon name="zones" size={18} />}
          tone="bg-violet-100 text-violet-700"
        />
        <KpiCard
          label="Restorante të mbuluara"
          value={statsLoading ? '…' : (stats?.restaurantsCovered ?? 0)}
          icon={<AdminIcon name="restaurant" size={18} />}
          tone="bg-sky-100 text-sky-700"
        />
        <KpiCard
          label="Tarifa mesatare"
          value={statsLoading ? '…' : `€${(stats?.averageDeliveryFee ?? 0).toFixed(2)}`}
          icon={<span className="text-base">€</span>}
          tone="bg-emerald-100 text-emerald-700"
        />
        <KpiCard
          label="Koha mesatare"
          value={statsLoading ? '…' : `${Math.round(stats?.averageEstimatedMinutes ?? 0)} min`}
          icon={<span className="text-base">⏱</span>}
          tone="bg-amber-100 text-amber-800"
        />
      </div>

      <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="grid gap-3 lg:grid-cols-12 lg:items-end">
          <div className="relative lg:col-span-5">
            <AdminIcon name="search" size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Kërko zonë ose qytet…"
              className={customerField + ' pl-9'}
            />
          </div>
          <label className="block text-xs text-gray-500 lg:col-span-2">
            Statusi
            <select value={status} onChange={(e) => setStatus(e.target.value as StatusFilter)} className={customerSelect}>
              <option value="all">Të gjitha</option>
              <option value="active">Aktiv</option>
              <option value="inactive">Jo aktiv</option>
            </select>
          </label>
          <label className="block text-xs text-gray-500 lg:col-span-3">
            Rendit sipas
            <select value={sort} onChange={(e) => setSort(e.target.value)} className={customerSelect}>
              <option value="name">Emri</option>
              <option value="city">Qyteti</option>
              <option value="fee">Tarifa</option>
            </select>
          </label>
          <div className="flex gap-2 lg:col-span-2">
            <button type="button" className={adminFilterBtn(true)} onClick={() => void load()}>
              Filtro
            </button>
            <button
              type="button"
              className={customerBtnGhost}
              onClick={() => {
                setSearch('')
                setStatus('all')
                setSort('name')
              }}
            >
              Pastro
            </button>
          </div>
        </div>
      </section>

      {msg ? <p className={adminSuccessBanner}>{msg}</p> : null}
      {error ? <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}

      {loading ? <AdminTableSkeleton rows={6} /> : null}

      {!loading && data && data.total === 0 ? (
        <AdminEmptyState
          icon="🗺️"
          title="Nuk ka zona ende"
          description="Krijo zonën e parë — p.sh. Prishtinë Qendër, Prishtinë Periferi, Prizren."
        />
      ) : null}

      {!loading && data && data.total > 0 ? (
        <>
          <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-gray-100 bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-4 py-3">Zona / Qyteti</th>
                  <th className="px-4 py-3">Restorante</th>
                  <th className="px-4 py-3">Tarifa bazë</th>
                  <th className="px-4 py-3">Min. order</th>
                  <th className="px-4 py-3">Koha</th>
                  <th className="px-4 py-3">Statusi</th>
                  <th className="px-4 py-3 text-right">Veprime</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.items.map((z) => (
                  <tr key={z.id} className="transition hover:bg-gray-50/80">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{z.name}</p>
                      <p className="text-xs text-gray-500">{z.city}</p>
                    </td>
                    <td className="px-4 py-3 tabular-nums text-gray-700">{z.restaurantCount}</td>
                    <td className="px-4 py-3 tabular-nums font-medium text-gray-900">{z.deliveryFee.toFixed(2)} €</td>
                    <td className="px-4 py-3 tabular-nums text-gray-700">{z.minOrderAmount.toFixed(2)} €</td>
                    <td className="px-4 py-3 tabular-nums text-gray-700">{z.estimatedDeliveryMinutes} min</td>
                    <td className="px-4 py-3">
                      <span className={zoneStatusBadge(z.isActive)}>{z.isActive ? 'Aktiv' : 'Jo aktiv'}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-700 transition hover:border-violet-200 hover:bg-violet-50 hover:text-violet-700"
                        onClick={() => setDrawer({ mode: 'edit', row: z })}
                      >
                        Shiko
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-gray-500">
              Duke shfaqur {(page - 1) * PAGE_SIZE + 1} deri {Math.min(page * PAGE_SIZE, data.total)} nga {data.total}
            </p>
            <div className="flex items-center gap-1">
              <button type="button" className={customerBtnGhost + ' px-2.5 py-1.5 text-xs'} disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
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
              <button type="button" className={customerBtnGhost + ' px-2.5 py-1.5 text-xs'} disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>
                →
              </button>
            </div>
          </div>
        </>
      ) : null}

      {drawer?.mode === 'create' ? (
        <DeliveryZoneDetailsDrawer mode="create" onClose={() => setDrawer(null)} onSaved={onSaved} onMessage={setMsg} />
      ) : null}

      {drawer?.mode === 'edit' && drawerLiveRow ? (
        <DeliveryZoneDetailsDrawer
          mode="edit"
          row={drawerLiveRow}
          onClose={() => setDrawer(null)}
          onSaved={onSaved}
          onMessage={setMsg}
        />
      ) : null}
    </div>
  )
}
