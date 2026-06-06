import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { AdminEmptyState } from '../components/admin/AdminEmptyState'
import { AdminIcon } from '../components/admin/adminIcons'
import { AdminTableSkeleton } from '../components/admin/AdminSkeleton'
import { CouponCreateModal } from '../components/admin/promotions/CouponCreateModal'
import { CouponDetailsDrawer } from '../components/admin/promotions/CouponDetailsDrawer'
import { CouponStatusBadge } from '../components/admin/promotions/CouponStatusBadge'
import { CouponUsesProgress } from '../components/admin/promotions/CouponUsesProgress'
import { formatCouponValidityShort } from '../components/admin/promotions/couponHelpers'
import {
  fetchAdminCouponStats,
  fetchAdminCoupons,
  type AdminCouponListResult,
  type AdminCouponRow,
  type AdminCouponStats,
} from '../lib/adminApi'
import {
  adminSuccessBanner,
  customerBtnGhost,
  customerBtnPrimary,
  customerPanelSubtitle,
  customerSelect,
} from '../lib/adminTheme'
import { useAuthStore } from '../store/authStore'

const PAGE_SIZE = 20

type StatusFilter = 'all' | 'active' | 'inactive' | 'expired'

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

export default function AdminPromotionsPage() {
  const token = useAuthStore((s) => s.token)
  const [search, setSearch] = useState('')
  const [searchDebounced, setSearchDebounced] = useState('')
  const [status, setStatus] = useState<StatusFilter>('all')
  const [sort, setSort] = useState('created_desc')
  const [page, setPage] = useState(1)
  const [data, setData] = useState<AdminCouponListResult | null>(null)
  const [stats, setStats] = useState<AdminCouponStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [statsLoading, setStatsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [selected, setSelected] = useState<AdminCouponRow | null>(null)

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
      setStats(await fetchAdminCouponStats(token))
    } catch {
      setStats(null)
    } finally {
      setStatsLoading(false)
    }
  }, [token])

  const load = useCallback(async () => {
    if (!token) return
    setError(null)
    const d = await fetchAdminCoupons(token, {
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

  function refreshAll() {
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

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-gray-900 sm:text-2xl">Promocione</h1>
          <p className={customerPanelSubtitle}>
            Kupona globale — kodi bëhet automatikisht me shkronja të mëdha.
          </p>
        </div>
        <button type="button" className={customerBtnPrimary} onClick={() => setCreateOpen(true)}>
          + Kupon i ri
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Kupona aktivë"
          value={statsLoading ? '…' : (stats?.activeCount ?? 0)}
          icon={<AdminIcon name="promotions" size={18} />}
          tone="bg-violet-100 text-violet-700"
        />
        <KpiCard
          label="Përdorime totale"
          value={statsLoading ? '…' : (stats?.totalUses ?? 0)}
          icon={<span className="text-base">📊</span>}
          tone="bg-sky-100 text-sky-700"
        />
        <KpiCard
          label="Skadojnë së shpejti"
          value={statsLoading ? '…' : (stats?.expiringSoonCount ?? 0)}
          hint="brenda 7 ditëve"
          icon={<span className="text-base">⏳</span>}
          tone="bg-amber-100 text-amber-800"
        />
        <KpiCard
          label="Zbritje totale dhënë"
          value={statsLoading ? '…' : `€${(stats?.totalDiscountGiven ?? 0).toFixed(2)}`}
          icon={<span className="text-base">€</span>}
          tone="bg-emerald-100 text-emerald-700"
        />
      </div>

      <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="grid gap-3 lg:grid-cols-12 lg:items-end">
          <div className="relative lg:col-span-5">
            <AdminIcon
              name="search"
              size={16}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Kërko kod…"
              className="h-10 w-full rounded-xl border border-gray-200 bg-white pl-9 pr-3 font-mono text-sm uppercase text-gray-900 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-500/15"
            />
          </div>
          <label className="block text-xs font-medium text-gray-500 lg:col-span-3">
            Statusi
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as StatusFilter)}
              className={`${customerSelect} mt-1.5`}
            >
              <option value="all">Të gjitha</option>
              <option value="active">Aktiv</option>
              <option value="inactive">Jo aktiv</option>
              <option value="expired">Skaduar</option>
            </select>
          </label>
          <label className="block text-xs font-medium text-gray-500 lg:col-span-3">
            Renditja
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className={`${customerSelect} mt-1.5`}
            >
              <option value="created_desc">Më i riu</option>
              <option value="created_asc">Më i vjetri</option>
              <option value="code_asc">Kodi A–Z</option>
              <option value="code_desc">Kodi Z–A</option>
              <option value="discount_desc">Zbritja më e lartë</option>
              <option value="uses_desc">Më shumë përdorime</option>
            </select>
          </label>
        </div>
      </section>

      {msg ? <p className={adminSuccessBanner}>{msg}</p> : null}
      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      {loading ? (
        <AdminTableSkeleton rows={6} />
      ) : data && data.items.length === 0 ? (
        <AdminEmptyState
          title="Nuk ka kupona"
          description="Krijo kuponin e parë promocional për platformën."
          action={
            <button type="button" className={customerBtnPrimary} onClick={() => setCreateOpen(true)}>
              + Kupon i ri
            </button>
          }
        />
      ) : data ? (
        <>
          <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
            <table className="min-w-full text-left text-sm text-gray-700">
              <thead className="border-b border-gray-200 bg-gray-50 text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-4 py-3">Kodi</th>
                  <th className="px-4 py-3">Zbritja</th>
                  <th className="px-4 py-3">Përdorime</th>
                  <th className="px-4 py-3">Afati</th>
                  <th className="px-4 py-3">Statusi</th>
                  <th className="px-4 py-3">Veprime</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((c) => (
                  <tr key={c.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50/60">
                    <td className="px-4 py-3 font-mono font-semibold text-gray-900">{c.code}</td>
                    <td className="px-4 py-3 tabular-nums">
                      {c.discountPercent}%
                      {c.maxDiscountAmount != null ? (
                        <span className="mt-0.5 block text-xs text-gray-400">
                          max €{c.maxDiscountAmount.toFixed(2)}
                        </span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3">
                      <CouponUsesProgress usesCount={c.usesCount} maxUses={c.maxUses} />
                    </td>
                    <td className="px-4 py-3 text-gray-600">{formatCouponValidityShort(c)}</td>
                    <td className="px-4 py-3">
                      <CouponStatusBadge {...c} />
                    </td>
                    <td className="px-4 py-3">
                      <button type="button" className={customerBtnGhost} onClick={() => setSelected(c)}>
                        Shiko
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-gray-500">
            <span>
              Faqja {page} / {totalPages} · {data.total} kupona
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                className={customerBtnGhost}
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
                    n === page ?
                      'min-w-[2rem] rounded-lg bg-violet-600 px-2 py-1 text-xs font-semibold text-white'
                    : customerBtnGhost
                  }
                  onClick={() => setPage(n)}
                >
                  {n}
                </button>
              ))}
              <button
                type="button"
                className={customerBtnGhost}
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                →
              </button>
            </div>
          </div>
        </>
      ) : null}

      {createOpen ? (
        <CouponCreateModal
          onClose={() => setCreateOpen(false)}
          onCreated={refreshAll}
          onMessage={setMsg}
        />
      ) : null}

      {selected ? (
        <CouponDetailsDrawer
          row={selected}
          onClose={() => setSelected(null)}
          onUpdated={refreshAll}
          onMessage={setMsg}
        />
      ) : null}
    </div>
  )
}
