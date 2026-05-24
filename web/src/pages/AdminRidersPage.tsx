import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { AdminDriversMap } from '../components/AdminDriversMap'
import { AdminEmptyState } from '../components/admin/AdminEmptyState'
import { AdminTableSkeleton } from '../components/admin/AdminSkeleton'
import {
  adminPatchDriver,
  approveDriverApplication,
  fetchAdminDrivers,
  fetchDriverApplications,
  type AdminDriverListResult,
  type DriverApplicationRow,
} from '../lib/adminApi'
import { adminFilterBtn, customerBtnGhost, customerCardMuted, customerField } from '../lib/adminTheme'
import { useAuthStore } from '../store/authStore'

type DriverFilter = 'all' | 'active' | 'suspended' | 'online' | 'pending'

const PENDING_STATUS = 0

function driverStatusLabel(d: { userIsActive: boolean; isOnline: boolean }) {
  if (!d.userIsActive) return { text: 'I pezulluar', className: 'bg-red-100 text-red-700' }
  if (d.isOnline) return { text: 'Online', className: 'bg-emerald-100 text-emerald-800' }
  return { text: 'Aktiv', className: 'bg-violet-100 text-violet-800' }
}

export default function AdminRidersPage() {
  const token = useAuthStore((s) => s.token)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [searchDebounced, setSearchDebounced] = useState('')
  const [filter, setFilter] = useState<DriverFilter>('all')
  const [data, setData] = useState<AdminDriverListResult | null>(null)
  const [pendingApps, setPendingApps] = useState<DriverApplicationRow[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingPending, setLoadingPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<number | null>(null)
  const [viewId, setViewId] = useState<number | null>(null)

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
        label: `${d.firstName} ${d.lastName}`.trim() || d.email,
      }))
  }, [data])

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
      pageSize: 20,
      search: searchDebounced || undefined,
      status: statusParam,
    })
    setData(d)
  }, [token, page, searchDebounced, filter])

  const loadPending = useCallback(async () => {
    if (!token) return
    setLoadingPending(true)
    try {
      const list = await fetchDriverApplications(token)
      setPendingApps(list.filter((a) => a.status === PENDING_STATUS))
    } catch {
      setPendingApps([])
    } finally {
      setLoadingPending(false)
    }
  }, [token])

  useEffect(() => {
    if (!token) {
      setLoading(false)
      return
    }
    if (filter === 'pending') {
      setLoading(true)
      void loadPending().finally(() => setLoading(false))
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
  }, [token, loadRegistered, filter, loadPending])

  async function patch(userId: number, body: { userIsActive?: boolean; isOnline?: boolean }) {
    if (!token) return
    setBusyId(userId)
    setMsg(null)
    const r = await adminPatchDriver(token, userId, body)
    setBusyId(null)
    if (!r.ok) setMsg(r.message)
    else void loadRegistered()
  }

  async function approveApp(id: number) {
    if (!token) return
    setBusyId(id)
    setMsg(null)
    const r = await approveDriverApplication(token, id)
    setBusyId(null)
    if (!r.ok) setMsg(r.message)
    else {
      setMsg('Deliver u miratua.')
      void loadPending()
    }
  }

  const viewDriver = data?.items.find((d) => d.userId === viewId)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Delivera</h1>
        <p className="mt-1 text-sm text-gray-500">
          Menaxho deliverat e regjistruar dhe aplikimet në pritje.
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
        <label className="min-w-[200px] flex-1">
          <span className="mb-1 block text-xs text-gray-500">Kërko sipas emrit ose emailit</span>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Emër, email, targa…"
            className={customerField}
            disabled={filter === 'pending'}
          />
        </label>
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
          <p className="text-sm text-gray-500">Duke ngarkuar deliverat…</p>
          <AdminTableSkeleton rows={6} />
        </>
      ) : null}

      {!loading && filter === 'pending' ? (
        pendingApps.length === 0 ? (
          <AdminEmptyState
            icon="🛵"
            title="Nuk ka aplikime në pritje"
            description="Kur dikush aplikon si deliver, shfaqet këtu për miratim."
          />
        ) : (
          <div className="overflow-x-auto rounded-xl border border-gray-200 bg-gray-50">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-gray-200 bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-4 py-3">Deliveri</th>
                  <th className="px-4 py-3">Statusi</th>
                  <th className="px-4 py-3">Mjeti</th>
                  <th className="px-4 py-3 text-right">Veprime</th>
                </tr>
              </thead>
              <tbody>
                {pendingApps.map((a) => (
                  <tr key={a.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">
                        {a.firstName} {a.lastName}
                      </div>
                      <div className="text-xs text-gray-500">{a.email}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800">
                        Në pritje
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {a.vehicleType}
                      {a.licensePlate ? ` · ${a.licensePlate}` : ''}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          className={customerBtnGhost}
                          disabled={busyId === a.id}
                          onClick={() => void approveApp(a.id)}
                        >
                          Mirato
                        </button>
                        <Link to="/admin/driver-applications" className={customerBtnGhost}>
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
          title="Nuk ka delivera të regjistruar ende"
          description="Mirato një aplikim deliver ose kontrollo filtrat e kërkimit."
          action={{ label: 'Aplikimet Deliver', to: '/admin/driver-applications' }}
        />
      ) : null}

      {!loading && filter !== 'pending' && data && data.total > 0 ? (
        <>
          {mapDrivers.length > 0 ? (
            <section className={`${customerCardMuted} p-4`}>
              <h2 className="text-sm font-semibold text-gray-800">Harta — GPS i fundit</h2>
              <AdminDriversMap drivers={mapDrivers} className="mt-3" />
            </section>
          ) : null}

          <div className="overflow-x-auto rounded-xl border border-gray-200 bg-gray-50 shadow-lg">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-gray-200 bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-4 py-3">Deliveri</th>
                  <th className="px-4 py-3">Statusi</th>
                  <th className="px-4 py-3">Porosi</th>
                  <th className="px-4 py-3">Vlerësimi</th>
                  <th className="px-4 py-3 text-right">Veprime</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((d) => {
                  const st = driverStatusLabel(d)
                  return (
                    <tr key={d.userId} className="border-b border-gray-100 transition hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-violet-100 text-sm font-semibold text-violet-700">
                            {(d.firstName[0] ?? d.email[0] ?? '?').toUpperCase()}
                          </span>
                          <div>
                            <div className="font-medium text-gray-900">
                              {d.firstName} {d.lastName}
                            </div>
                            <div className="text-xs text-gray-500">{d.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${st.className}`}>
                          {st.text}
                        </span>
                      </td>
                      <td className="px-4 py-3 tabular-nums text-gray-500">—</td>
                      <td className="px-4 py-3 text-gray-500">—</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap justify-end gap-2">
                          <button
                            type="button"
                            className={customerBtnGhost}
                            onClick={() => setViewId(viewId === d.userId ? null : d.userId)}
                          >
                            {viewId === d.userId ? 'Mbyll' : 'Shiko'}
                          </button>
                          <button
                            type="button"
                            disabled={busyId === d.userId}
                            className={customerBtnGhost}
                            onClick={() =>
                              void patch(d.userId, { userIsActive: !d.userIsActive })
                            }
                          >
                            {d.userIsActive ? 'Pezullo' : 'Aktivizo'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {viewDriver ? (
            <div className={`${customerCardMuted} p-4 text-sm text-gray-700`}>
              <h3 className="font-semibold text-gray-900">Detaje — {viewDriver.email}</h3>
              <dl className="mt-3 grid gap-2 sm:grid-cols-2">
                <div>
                  <dt className="text-xs text-gray-500">Mjeti</dt>
                  <dd>
                    {viewDriver.vehicleType}
                    {viewDriver.licensePlate ? ` (${viewDriver.licensePlate})` : ''}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-gray-500">GPS</dt>
                  <dd>
                    {viewDriver.lastLatitude != null
                      ? `${viewDriver.lastLatitude.toFixed(5)}, ${viewDriver.lastLongitude?.toFixed(5)}`
                      : '—'}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-gray-500">Regjistruar</dt>
                  <dd>{new Date(viewDriver.createdAt).toLocaleString('sq-AL')}</dd>
                </div>
              </dl>
            </div>
          ) : null}

          <div className="flex items-center justify-between text-sm text-gray-500">
            <span>
              Faqja {data.page} · {data.total} total
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
                disabled={page * data.pageSize >= data.total}
                onClick={() => setPage((p) => p + 1)}
              >
                Tjetër →
              </button>
            </div>
          </div>
        </>
      ) : null}

      {loadingPending && filter === 'pending' ? (
        <p className="text-xs text-gray-500">Duke rifreskuar aplikimet…</p>
      ) : null}
    </div>
  )
}
