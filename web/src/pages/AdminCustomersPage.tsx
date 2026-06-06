import { useCallback, useEffect, useMemo, useState } from 'react'
import { AdminEmptyState } from '../components/admin/AdminEmptyState'
import { AdminStatCard } from '../components/admin/AdminStatCard'
import { AdminStatCardsSkeleton, AdminTableSkeleton } from '../components/admin/AdminSkeleton'
import { AdminCustomerDetailsDrawer } from '../components/admin/customers/AdminCustomerDetailsDrawer'
import { AdminCustomerEmailDialog } from '../components/admin/customers/AdminCustomerEmailDialog'
import {
  fetchAdminCustomerStats,
  fetchAdminCustomers,
  type AdminCustomerListResult,
  type AdminCustomerRow,
  type AdminCustomerStats,
} from '../lib/adminApi'
import {
  adminFilterBtn,
  customerBtnGhost,
  customerCardMuted,
  customerField,
  customerPanelSubtitle,
} from '../lib/adminTheme'
import { useAuthStore } from '../store/authStore'

const PAGE_SIZE = 10

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

function statusBadgeClass(active: boolean): string {
  return active ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
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
  const [viewRow, setViewRow] = useState<AdminCustomerRow | null>(null)
  const [emailRow, setEmailRow] = useState<AdminCustomerRow | null>(null)
  const [menuOpenId, setMenuOpenId] = useState<number | null>(null)

  useEffect(() => {
    const t = window.setTimeout(() => setSearchDebounced(search), 300)
    return () => window.clearTimeout(t)
  }, [search])

  useEffect(() => {
    setPage(1)
  }, [searchDebounced, statusFilter, registeredFrom])

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
        pageSize: PAGE_SIZE,
      }),
    ])
    setStats(st)
    setData(list)
  }, [token, searchDebounced, statusFilter, registeredFrom, page])

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

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil((data?.total ?? 0) / PAGE_SIZE)),
    [data?.total],
  )

  const activePct = stats && stats.total > 0 ? ((stats.active / stats.total) * 100).toFixed(1) : '0'
  const blockedPct = stats && stats.total > 0 ? ((stats.blocked / stats.total) * 100).toFixed(1) : '0'

  const rangeStart = data && data.total > 0 ? (page - 1) * PAGE_SIZE + 1 : 0
  const rangeEnd = data ? Math.min(page * PAGE_SIZE, data.total) : 0

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Klientët</h1>
          <p className={customerPanelSubtitle}>Përdoruesit me rol Customer — adresat dhe porositë.</p>
        </div>
        <button
          type="button"
          className={customerBtnGhost}
          disabled={!data?.items.length}
          onClick={() => data && exportCsv(data.items)}
        >
          ↓ Eksporto
        </button>
      </div>

      {loading && !stats ? (
        <AdminStatCardsSkeleton count={4} />
      ) : stats ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <AdminStatCard
            label="Total klientë"
            value={stats.total.toLocaleString('sq-AL')}
            hint={stats.newThisWeek > 0 ? `+${stats.newThisWeek} këtë javë` : 'Asnjë i ri këtë javë'}
            icon="👥"
            accent="violet"
          />
          <AdminStatCard
            label="Aktivë"
            value={stats.active.toLocaleString('sq-AL')}
            hint={`${activePct}% e totalit`}
            icon="✓"
            accent="emerald"
          />
          <AdminStatCard
            label="Bllokuar"
            value={stats.blocked.toLocaleString('sq-AL')}
            hint={`${blockedPct}% e totalit`}
            icon="⛔"
            accent="amber"
          />
          <AdminStatCard
            label="Adresa totale"
            value={stats.totalAddresses.toLocaleString('sq-AL')}
            hint={stats.newAddressesThisWeek > 0 ? `+${stats.newAddressesThisWeek} këtë javë` : undefined}
            icon="📍"
            accent="sky"
          />
        </div>
      ) : null}

      <div className={`${customerCardMuted} flex flex-wrap items-end gap-3`}>
        <div className="min-w-[220px] flex-1">
          <label className="text-xs font-medium text-gray-500">Kërko klient</label>
          <input
            className={customerField + ' mt-1'}
            placeholder="Emër, email ose telefon…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-500">Statusi</label>
          <select
            className={customerField + ' mt-1 min-w-[140px]'}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
          >
            <option value="all">Të gjithë</option>
            <option value="active">Aktiv</option>
            <option value="blocked">Bllokuar</option>
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-gray-500">Regjistruar</label>
          <input
            type="date"
            className={customerField + ' mt-1'}
            value={registeredFrom}
            onChange={(e) => setRegisteredFrom(e.target.value)}
          />
        </div>
        <button type="button" className={adminFilterBtn(true)} onClick={() => void load()}>
          Filtro
        </button>
        <button
          type="button"
          className={customerBtnGhost}
          onClick={() => {
            setSearch('')
            setStatusFilter('all')
            setRegisteredFrom('')
          }}
        >
          Pastro filtrat
        </button>
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {loading ? <AdminTableSkeleton rows={6} /> : null}

      {!loading && data && data.items.length === 0 ? (
        <AdminEmptyState title="Nuk u gjet asnjë klient" subtitle="Ndrysho filtrat ose kërkimin." />
      ) : null}

      {!loading && data && data.items.length > 0 ? (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-gray-100 bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3">Klienti</th>
                <th className="px-4 py-3">Porosi totale</th>
                <th className="px-4 py-3">Porosia e fundit</th>
                <th className="px-4 py-3">Adresa</th>
                <th className="px-4 py-3">Regjistruar</th>
                <th className="px-4 py-3">Statusi</th>
                <th className="px-4 py-3">Veprimet</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.items.map((u) => (
                <tr key={u.id} className="hover:bg-gray-50/80">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-violet-100 text-xs font-bold text-violet-800">
                        {initials(u.firstName, u.lastName)}
                      </span>
                      <div>
                        <p className="font-medium text-gray-900">
                          {u.firstName} {u.lastName}
                        </p>
                        <p className="text-xs text-gray-500">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-medium text-gray-900">{u.orderCount}</td>
                  <td className="px-4 py-3 text-gray-600">
                    {u.lastOrderAtUtc ? (
                      <>
                        <p>{formatDate(u.lastOrderAtUtc)}</p>
                        {u.lastOrderRestaurantName ? (
                          <p className="text-xs text-gray-400">{u.lastOrderRestaurantName}</p>
                        ) : null}
                      </>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{u.addressCount}</td>
                  <td className="px-4 py-3 text-gray-600">{formatDate(u.createdAtUtc)}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${statusBadgeClass(u.isActive)}`}
                    >
                      {u.isActive ? 'Aktiv' : 'Bllokuar'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="relative flex items-center gap-1">
                      <button
                        type="button"
                        className="rounded-lg border border-gray-200 p-2 text-gray-600 hover:bg-gray-50"
                        title="Shiko profilin"
                        onClick={() => setViewRow(u)}
                      >
                        👁
                      </button>
                      <button
                        type="button"
                        className="rounded-lg border border-gray-200 p-2 text-gray-600 hover:bg-gray-50"
                        title="Më shumë"
                        onClick={() => setMenuOpenId(menuOpenId === u.id ? null : u.id)}
                      >
                        ⋯
                      </button>
                      {menuOpenId === u.id ? (
                        <div className="absolute right-0 top-full z-10 mt-1 min-w-[160px] rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
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
      ) : null}

      {!loading && data && data.total > 0 ? (
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-gray-500">
          <span>
            Duke shfaqur {rangeStart} deri {rangeEnd} nga {data.total.toLocaleString('sq-AL')} rezultate
          </span>
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-400">{PAGE_SIZE} / faqe</span>
            <div className="inline-flex gap-1">
              <button
                type="button"
                className={customerBtnGhost + ' px-2 py-0.5 text-xs'}
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                ←
              </button>
              <span className="px-2 tabular-nums">
                {page} / {totalPages}
              </span>
              <button
                type="button"
                className={customerBtnGhost + ' px-2 py-0.5 text-xs'}
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                →
              </button>
            </div>
          </div>
        </div>
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
