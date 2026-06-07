import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { AdminEmptyState } from '../components/admin/AdminEmptyState'
import { AdminIcon } from '../components/admin/adminIcons'
import { AdminStatCardsSkeleton, AdminTableSkeleton } from '../components/admin/AdminSkeleton'
import { AdminCustomerDetailsDrawer } from '../components/admin/customers/AdminCustomerDetailsDrawer'
import { AdminCustomerEmailDialog } from '../components/admin/customers/AdminCustomerEmailDialog'
import { CustomerKpiCard } from '../components/admin/customers/CustomerKpiCard'
import {
  fetchAdminCustomerStats,
  fetchAdminCustomers,
  type AdminCustomerListResult,
  type AdminCustomerRow,
  type AdminCustomerStats,
} from '../lib/adminApi'
import {
  customerBtnGhost,
  customerCardMuted,
  customerField,
  customerPanelSubtitle,
  customerSelect,
} from '../lib/adminTheme'
import { useAuthStore } from '../store/authStore'

const DEFAULT_PAGE_SIZE = 10

type StatusFilter = 'all' | 'active' | 'blocked'

function initials(first: string, last: string): string {
  return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase()
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleDateString('sq-AL')
  } catch {
    return iso
  }
}

function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '—'
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

function statusBadgeClass(active: boolean): string {
  return active
    ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
    : 'bg-red-50 text-red-700 ring-red-200'
}

function exportCsv(rows: AdminCustomerRow[]) {
  const header = [
    'ID',
    'Email',
    'FirstName',
    'LastName',
    'Phone',
    'Active',
    'Addresses',
    'Orders',
    'Registered',
    'LastOrder',
  ]
  const lines = rows.map((r) =>
    [
      r.id,
      r.email,
      r.firstName,
      r.lastName,
      r.phone ?? '',
      r.isActive,
      r.addressCount,
      r.orderCount,
      r.createdAtUtc,
      r.lastOrderAtUtc ?? '',
    ]
      .map((c) => `"${String(c).replace(/"/g, '""')}"`)
      .join(','),
  )
  const blob = new Blob([[header.join(','), ...lines].join('\n')], { type: 'text/csv;charset=utf-8' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `klientet-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(a.href)
}

function IconEye({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}

function IconMore({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <circle cx="12" cy="5" r="1.5" />
      <circle cx="12" cy="12" r="1.5" />
      <circle cx="12" cy="19" r="1.5" />
    </svg>
  )
}

export default function AdminCustomersPage() {
  const token = useAuthStore((s) => s.token)
  const [stats, setStats] = useState<AdminCustomerStats | null>(null)
  const [data, setData] = useState<AdminCustomerListResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [searchDebounced, setSearchDebounced] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [registeredFrom, setRegisteredFrom] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)
  const [viewRow, setViewRow] = useState<AdminCustomerRow | null>(null)
  const [emailRow, setEmailRow] = useState<AdminCustomerRow | null>(null)
  const [menuOpenId, setMenuOpenId] = useState<number | null>(null)

  useEffect(() => {
    const t = window.setTimeout(() => setSearchDebounced(search), 300)
    return () => window.clearTimeout(t)
  }, [search])

  useEffect(() => {
    setPage(1)
  }, [searchDebounced, statusFilter, registeredFrom, pageSize])

  const load = useCallback(async () => {
    if (!token) return
    setError(null)
    const [st, list] = await Promise.all([
      fetchAdminCustomerStats(token),
      fetchAdminCustomers(token, {
        search: searchDebounced || undefined,
        status: statusFilter,
        sort: 'created_desc',
        registeredFrom: registeredFrom || undefined,
        page,
        pageSize,
      }),
    ])
    setStats(st)
    setData(list)
  }, [token, searchDebounced, statusFilter, registeredFrom, page, pageSize])

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
    if (viewRow === null || !data) return
    const fresh = data.items.find((i) => i.id === viewRow.id)
    if (fresh) setViewRow(fresh)
  }, [data, viewRow?.id])

  useEffect(() => {
    if (menuOpenId === null) return
    const close = () => setMenuOpenId(null)
    window.addEventListener('click', close)
    return () => window.removeEventListener('click', close)
  }, [menuOpenId])

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil((data?.total ?? 0) / pageSize)),
    [data?.total, pageSize],
  )

  const pageNumbers = useMemo(() => {
    const max = 5
    let start = Math.max(1, page - Math.floor(max / 2))
    const end = Math.min(totalPages, start + max - 1)
    start = Math.max(1, end - max + 1)
    const nums: number[] = []
    for (let i = start; i <= end; i++) nums.push(i)
    return nums
  }, [page, totalPages])

  const activePct = stats && stats.total > 0 ? ((stats.active / stats.total) * 100).toFixed(1) : '0'
  const blockedPct = stats && stats.total > 0 ? ((stats.blocked / stats.total) * 100).toFixed(1) : '0'

  const hasFilters = search.trim() || statusFilter !== 'all' || registeredFrom

  function clearFilters() {
    setSearch('')
    setStatusFilter('all')
    setRegisteredFrom('')
    setPage(1)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Klientët</h1>
          <p className={customerPanelSubtitle}>Përdoruesit me rol Customer — adresat dhe porositë.</p>
        </div>
        <button
          type="button"
          className={customerBtnGhost + ' inline-flex items-center gap-2'}
          disabled={!data?.items.length}
          onClick={() => data && exportCsv(data.items)}
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <path d="M12 3v12M7 8l5 5 5-5M4 21h16" />
          </svg>
          Eksporto
        </button>
      </div>

      {loading && !stats ? (
        <AdminStatCardsSkeleton count={4} />
      ) : stats ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <CustomerKpiCard
            label="Total klientë"
            value={stats.total.toLocaleString('sq-AL')}
            hint={
              stats.newThisWeek > 0 ? (
                <span className="text-emerald-600">+{stats.newThisWeek} këtë javë</span>
              ) : (
                'Asnjë i ri këtë javë'
              )
            }
            tone="bg-violet-50 text-violet-600"
            icon={<AdminIcon name="users" size={18} />}
          />
          <CustomerKpiCard
            label="Aktivë"
            value={stats.active.toLocaleString('sq-AL')}
            hint={<span className="text-emerald-600">{activePct}% e totalit</span>}
            tone="bg-emerald-50 text-emerald-600"
            icon={<span className="text-base leading-none">✓</span>}
          />
          <CustomerKpiCard
            label="Bllokuar"
            value={stats.blocked.toLocaleString('sq-AL')}
            hint={<span className="text-red-500">{blockedPct}% e totalit</span>}
            tone="bg-red-50 text-red-600"
            icon={<span className="text-base leading-none">⛔</span>}
          />
          <CustomerKpiCard
            label="Adresa totale"
            value={stats.totalAddresses.toLocaleString('sq-AL')}
            hint={
              stats.newAddressesThisWeek > 0 ? (
                <span className="text-emerald-600">+{stats.newAddressesThisWeek} këtë javë</span>
              ) : undefined
            }
            tone="bg-sky-50 text-sky-600"
            icon={<span className="text-base leading-none">📍</span>}
          />
        </div>
      ) : null}

      <section className={`${customerCardMuted} flex flex-wrap items-end gap-3`}>
        <div className="min-w-[220px] flex-[2]">
          <span className="block text-xs font-medium text-transparent select-none" aria-hidden="true">
            &nbsp;
          </span>
          <div className="relative mt-1">
            <AdminIcon
              name="search"
              size={16}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Kërko klient sipas emrit, emailit ose telefonit"
              className="h-[38px] w-full rounded-lg border border-gray-300 bg-white py-2 pl-9 pr-3 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20"
            />
          </div>
        </div>

        <div className="min-w-[132px]">
          <span className="block text-xs font-medium text-gray-500">Statusi</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            className={customerSelect}
          >
            <option value="all">Të gjithë</option>
            <option value="active">Aktiv</option>
            <option value="blocked">Bllokuar</option>
          </select>
        </div>

        <div className="min-w-[160px]">
          <span className="block text-xs font-medium text-gray-500">Regjistruar</span>
          <input
            type="date"
            value={registeredFrom}
            onChange={(e) => setRegisteredFrom(e.target.value)}
            className={customerSelect}
            aria-label="Regjistruar nga data"
          />
        </div>

        <div className="shrink-0">
          <span className="block text-xs font-medium text-transparent select-none" aria-hidden="true">
            &nbsp;
          </span>
          <button
            type="button"
            className="mt-1 inline-flex h-[38px] cursor-pointer items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 text-sm font-normal text-gray-500 transition hover:border-gray-300 hover:bg-gray-50 hover:text-gray-600"
            disabled={!hasFilters}
            onClick={clearFilters}
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M3 12a9 9 0 1 0 9-9M3 12h9" />
            </svg>
            Pastro filtrat
          </button>
        </div>
      </section>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {loading ? <AdminTableSkeleton rows={7} /> : null}

      {!loading && data && data.items.length === 0 ? (
        <AdminEmptyState title="Nuk u gjet asnjë klient" subtitle="Ndrysho filtrat ose kërkimin." />
      ) : null}

      {!loading && data && data.items.length > 0 ? (
        <>
          <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-gray-100 bg-gray-50 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-4 py-3">Klienti</th>
                  <th className="px-4 py-3">Porosi totale</th>
                  <th className="px-4 py-3">Porosia e fundit</th>
                  <th className="px-4 py-3">Adresa</th>
                  <th className="px-4 py-3">Regjistruar</th>
                  <th className="px-4 py-3">Statusi</th>
                  <th className="px-4 py-3 text-right">Veprime</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.items.map((u) => (
                  <tr key={u.id} className="transition hover:bg-gray-50/80">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-violet-100 text-xs font-bold text-violet-800">
                          {initials(u.firstName, u.lastName)}
                        </span>
                        <div className="min-w-0">
                          <p className="font-semibold text-gray-900">
                            {u.firstName} {u.lastName}
                          </p>
                          <p className="truncate text-xs text-gray-500">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-semibold tabular-nums text-gray-900">{u.orderCount}</td>
                    <td className="px-4 py-3 text-gray-600">
                      {u.lastOrderAtUtc ? (
                        <>
                          <p className="whitespace-nowrap">{formatDateTime(u.lastOrderAtUtc)}</p>
                          {u.lastOrderRestaurantName ? (
                            <p className="text-xs text-gray-400">{u.lastOrderRestaurantName}</p>
                          ) : null}
                        </>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="px-4 py-3 tabular-nums text-gray-600">{u.addressCount}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-gray-600">{formatDate(u.createdAtUtc)}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${statusBadgeClass(u.isActive)}`}
                      >
                        <span className={`h-1.5 w-1.5 rounded-full ${u.isActive ? 'bg-emerald-500' : 'bg-red-500'}`} />
                        {u.isActive ? 'Aktiv' : 'Bllokuar'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="relative flex justify-end gap-1">
                        <button
                          type="button"
                          className="rounded-lg border border-transparent p-2 text-gray-500 hover:border-gray-200 hover:bg-gray-50 hover:text-violet-700"
                          title="Shiko"
                          onClick={() => setViewRow(u)}
                        >
                          <IconEye />
                        </button>
                        <button
                          type="button"
                          className="rounded-lg border border-transparent p-2 text-gray-500 hover:border-gray-200 hover:bg-gray-50 hover:text-gray-800"
                          title="Më shumë veprime"
                          onClick={(e) => {
                            e.stopPropagation()
                            setMenuOpenId((id) => (id === u.id ? null : u.id))
                          }}
                        >
                          <IconMore />
                        </button>
                        {menuOpenId === u.id ? (
                          <div
                            className="absolute right-0 top-full z-10 mt-1 w-44 overflow-hidden rounded-xl border border-gray-200 bg-white py-1 shadow-lg"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              type="button"
                              className="block w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                              onClick={() => {
                                setViewRow(u)
                                setMenuOpenId(null)
                              }}
                            >
                              Shiko profilin
                            </button>
                            <LinkMenuItem customerId={u.id} onClose={() => setMenuOpenId(null)} />
                            <button
                              type="button"
                              className="block w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                              onClick={() => {
                                setEmailRow(u)
                                setMenuOpenId(null)
                              }}
                            >
                              Dërgo email
                            </button>
                          </div>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-3">
            <div className="flex flex-wrap items-center justify-center gap-1">
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
            <label className="flex items-center gap-2 text-sm text-gray-500">
              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                className="rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-sm text-gray-700"
              >
                {[10, 25, 50].map((n) => (
                  <option key={n} value={n}>
                    {n} / faqe
                  </option>
                ))}
              </select>
            </label>
          </div>
        </>
      ) : null}

      {viewRow ? (
        <AdminCustomerDetailsDrawer
          row={viewRow}
          onClose={() => setViewRow(null)}
          onUpdated={() => void load()}
        />
      ) : null}

      {emailRow ? (
        <AdminCustomerEmailDialog
          email={emailRow.email}
          name={`${emailRow.firstName} ${emailRow.lastName}`.trim()}
          onClose={() => setEmailRow(null)}
        />
      ) : null}
    </div>
  )
}

function LinkMenuItem({ customerId, onClose }: { customerId: number; onClose: () => void }) {
  return (
    <Link
      to={`/admin/orders?customer=${customerId}`}
      className="block w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
      onClick={onClose}
    >
      Shiko porositë
    </Link>
  )
}
