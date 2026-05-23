import { useCallback, useEffect, useMemo, useState } from 'react'
import { AdminEmptyState } from '../components/admin/AdminEmptyState'
import { AdminTableSkeleton } from '../components/admin/AdminSkeleton'
import {
  adminPatchRestaurant,
  fetchAdminRestaurants,
  type AdminRestaurantListResult,
  type AdminRestaurantRow,
} from '../lib/adminApi'
import { adminFilterBtn, customerBtnGhost, customerField } from '../lib/adminTheme'
import { useAuthStore } from '../store/authStore'

type RestaurantFilter = 'all' | 'active' | 'inactive' | 'pending' | 'approved'

function restaurantStatus(r: AdminRestaurantRow) {
  if (!r.isApproved)
    return { text: 'Në pritje aprovimi', className: 'bg-amber-100 text-amber-800' }
  if (!r.isActive)
    return { text: 'I pezulluar', className: 'bg-red-100 text-red-700' }
  return { text: 'Aktiv', className: 'bg-emerald-100 text-emerald-800' }
}

function matchesFilter(r: AdminRestaurantRow, filter: RestaurantFilter) {
  switch (filter) {
    case 'active':
      return r.isActive && r.isApproved
    case 'inactive':
      return !r.isActive
    case 'pending':
      return !r.isApproved
    case 'approved':
      return r.isApproved
    default:
      return true
  }
}

export default function AdminRestaurantsPage() {
  const token = useAuthStore((s) => s.token)
  const [search, setSearch] = useState('')
  const [searchDebounced, setSearchDebounced] = useState('')
  const [filter, setFilter] = useState<RestaurantFilter>('all')
  const [page, setPage] = useState(1)
  const [raw, setRaw] = useState<AdminRestaurantListResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<number | null>(null)

  const pageSize = 20

  useEffect(() => {
    const t = window.setTimeout(() => setSearchDebounced(search), 300)
    return () => window.clearTimeout(t)
  }, [search])

  useEffect(() => {
    setPage(1)
  }, [searchDebounced, filter])

  const load = useCallback(async () => {
    if (!token) return
    setError(null)
    const d = await fetchAdminRestaurants(token, {
      search: searchDebounced || undefined,
      page: 1,
      pageSize: 200,
    })
    setRaw(d)
  }, [token, searchDebounced])

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

  const filtered = useMemo(() => {
    if (!raw) return []
    return raw.items.filter((r) => matchesFilter(r, filter))
  }, [raw, filter])

  const total = filtered.length
  const pageItems = useMemo(() => {
    const start = (page - 1) * pageSize
    return filtered.slice(start, start + pageSize)
  }, [filtered, page])

  async function patch(id: number, body: Parameters<typeof adminPatchRestaurant>[2]) {
    if (!token) return
    setBusyId(id)
    setMsg(null)
    const r = await adminPatchRestaurant(token, id, body)
    setBusyId(null)
    if (!r.ok) setMsg(r.message)
    else void load()
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Restorantet</h1>
        <p className="mt-1 text-sm text-gray-500">
          Menaxho restorantet e platformës: aktivizim, aprovim dhe tarifa dërgese.
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
        <label className="min-w-[200px] flex-1">
          <span className="mb-1 block text-xs text-gray-500">Kërko sipas emrit ose qytetit</span>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Emër restoranti, qytet…"
            className={customerField}
          />
        </label>
        <div className="flex flex-wrap gap-2">
          {(
            [
              ['all', 'Të gjithë'],
              ['active', 'Aktiv'],
              ['inactive', 'Pezulluar'],
              ['pending', 'Në pritje'],
              ['approved', 'Aprovuar'],
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
        </div>
      </div>

      {msg ? <p className="text-sm text-amber-700">{msg}</p> : null}
      {error ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      {loading ? (
        <>
          <p className="text-sm text-gray-500">Duke ngarkuar restorantet…</p>
          <AdminTableSkeleton rows={6} />
        </>
      ) : null}

      {!loading && total === 0 ? (
        <AdminEmptyState
          icon="🏪"
          title="Nuk ka restorante për këtë filtër"
          description="Ndrysho kërkimin ose mirato një aplikim partner për të shtuar restorant të ri."
          action={{ label: 'Aplikimet partner', to: '/admin/partner-applications' }}
        />
      ) : null}

      {!loading && total > 0 ? (
        <>
          <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-gray-200 bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-4 py-3">Restoranti</th>
                  <th className="px-4 py-3">Qyteti</th>
                  <th className="px-4 py-3">Statusi</th>
                  <th className="px-4 py-3">Porosi</th>
                  <th className="px-4 py-3">Dërgesë</th>
                  <th className="px-4 py-3 text-right">Veprime</th>
                </tr>
              </thead>
              <tbody>
                {pageItems.map((r) => {
                  const st = restaurantStatus(r)
                  return (
                    <tr key={r.id} className="border-b border-gray-100 transition hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-violet-100 text-sm font-semibold text-violet-700">
                            {(r.name[0] ?? '?').toUpperCase()}
                          </span>
                          <div>
                            <div className="font-medium text-gray-900">{r.name}</div>
                            {r.slug ? (
                              <div className="text-xs text-gray-500">{r.slug}</div>
                            ) : null}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{r.city ?? '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${st.className}`}>
                          {st.text}
                        </span>
                      </td>
                      <td className="px-4 py-3 tabular-nums text-gray-600">{r.orderCount}</td>
                      <td className="px-4 py-3 tabular-nums text-gray-600">
                        {Number(r.deliveryFee).toFixed(2)} €
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap justify-end gap-2">
                          <button
                            type="button"
                            disabled={busyId === r.id}
                            className={customerBtnGhost}
                            onClick={() => void patch(r.id, { isActive: !r.isActive })}
                          >
                            {r.isActive ? 'Pezullo' : 'Aktivizo'}
                          </button>
                          <button
                            type="button"
                            disabled={busyId === r.id}
                            className={customerBtnGhost}
                            onClick={() => void patch(r.id, { isApproved: !r.isApproved })}
                          >
                            {r.isApproved ? 'Hiq aprovim' : 'Aprovo'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between text-sm text-gray-500">
            <span>
              Faqja {page} · {total} total
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                className={customerBtnGhost}
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                ← Mëparshme
              </button>
              <button
                type="button"
                className={customerBtnGhost}
                disabled={page * pageSize >= total}
                onClick={() => setPage((p) => p + 1)}
              >
                Tjetër →
              </button>
            </div>
          </div>
        </>
      ) : null}
    </div>
  )
}
