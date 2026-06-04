import { useCallback, useEffect, useMemo, useState } from 'react'
import { AdminEmptyState } from '../components/admin/AdminEmptyState'
import { AdminTableSkeleton } from '../components/admin/AdminSkeleton'
import { DriverApplicationApproveModal } from '../components/admin/driverApplications/DriverApplicationApproveModal'
import { DriverApplicationDetailsDrawer } from '../components/admin/driverApplications/DriverApplicationDetailsDrawer'
import { DriverApplicationRejectModal } from '../components/admin/driverApplications/DriverApplicationRejectModal'
import {
  approveDriverApplication,
  driverApplicationStatsFromRows,
  fetchDriverApplicationStats,
  fetchDriverApplications,
  rejectDriverApplication,
  type DriverApplicationRow,
  type DriverApplicationStats,
} from '../lib/adminApi'
import {
  adminFilterBtn,
  customerBtnGhost,
  customerBtnPrimary,
  customerCardMuted,
  customerField,
  customerPanelSubtitle,
} from '../lib/adminTheme'
import {
  DRIVER_APP_APPROVED_WAITING,
  DRIVER_APP_PENDING,
  driverApplicationStatusBadgeClass,
  driverApplicationStatusLabel,
  driverApplicationStatusSubtext,
  statusFilterToApi,
  type DriverAppStatusFilter,
} from '../lib/driverApplicationStatus'
import { useAuthStore } from '../store/authStore'

const PAGE_SIZE = 10

function initials(first: string, last: string): string {
  return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase()
}

function formatApplied(iso: string): string {
  try {
    const d = new Date(iso)
    return `${d.toLocaleDateString('sq-AL')} · ${d.toLocaleTimeString('sq-AL', { hour: '2-digit', minute: '2-digit' })}`
  } catch {
    return iso
  }
}

function exportCsv(rows: DriverApplicationRow[]) {
  const header = ['ID', 'FirstName', 'LastName', 'Email', 'Phone', 'Vehicle', 'Plate', 'Status', 'CreatedAt']
  const lines = rows.map((r) =>
    [
      r.id,
      r.firstName,
      r.lastName,
      r.email,
      r.phone,
      r.vehicleType,
      r.licensePlate ?? '',
      r.status,
      r.createdAtUtc,
    ]
      .map((c) => `"${String(c).replace(/"/g, '""')}"`)
      .join(','),
  )
  const blob = new Blob([[header.join(','), ...lines].join('\n')], { type: 'text/csv;charset=utf-8' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `driver-applications-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(a.href)
}

export default function AdminDriverApplicationsPage() {
  const token = useAuthStore((s) => s.token)
  const [stats, setStats] = useState<DriverApplicationStats | null>(null)
  const [rows, setRows] = useState<DriverApplicationRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [searchDebounced, setSearchDebounced] = useState('')
  const [statusFilter, setStatusFilter] = useState<DriverAppStatusFilter>('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [page, setPage] = useState(1)
  const [busyId, setBusyId] = useState<number | null>(null)
  const [actionMsg, setActionMsg] = useState<string | null>(null)
  const [approveRow, setApproveRow] = useState<DriverApplicationRow | null>(null)
  const [rejectRow, setRejectRow] = useState<DriverApplicationRow | null>(null)
  const [viewRow, setViewRow] = useState<DriverApplicationRow | null>(null)

  useEffect(() => {
    const t = window.setTimeout(() => setSearchDebounced(search), 300)
    return () => window.clearTimeout(t)
  }, [search])

  useEffect(() => {
    setPage(1)
  }, [searchDebounced, statusFilter, dateFrom, dateTo])

  const load = useCallback(async () => {
    if (!token) return
    setError(null)
    const statusApi = statusFilterToApi(statusFilter)
    const list = await fetchDriverApplications(token, {
      search: searchDebounced || undefined,
      status: statusApi,
      from: dateFrom ? `${dateFrom}T00:00:00.000Z` : undefined,
      to: dateTo ? `${dateTo}T23:59:59.999Z` : undefined,
    })
    setRows(list)

    let st = await fetchDriverApplicationStats(token)
    if (!st) {
      const all = await fetchDriverApplications(token)
      st = driverApplicationStatsFromRows(all)
    }
    setStats(st)
  }, [token, searchDebounced, statusFilter, dateFrom, dateTo])

  useEffect(() => {
    if (!token) return
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

  const pageRows = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE
    return rows.slice(start, start + PAGE_SIZE)
  }, [rows, page])

  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE))

  async function confirmApprove() {
    if (!token || !approveRow) return
    setBusyId(approveRow.id)
    setActionMsg(null)
    const r = await approveDriverApplication(token, approveRow.id)
    setBusyId(null)
    setApproveRow(null)
    if (r.ok) {
      setActionMsg(
        r.data.devActivationUrl
          ? `Email aktivizimi u dërgua te ${r.data.email}. (Dev link: ${r.data.devActivationUrl})`
          : `Email aktivizimi u dërgua te ${r.data.email}.`,
      )
      await load()
    } else setActionMsg(r.message)
  }

  async function confirmReject(reason: string) {
    if (!token || !rejectRow) return
    setBusyId(rejectRow.id)
    const r = await rejectDriverApplication(token, rejectRow.id, reason)
    setBusyId(null)
    setRejectRow(null)
    if (r.ok) {
      setActionMsg('Aplikimi u refuzua.')
      await load()
    } else setActionMsg(r.message)
  }

  const statCards = stats
    ? [
        { label: 'Totali i aplikimeve', value: stats.total, hint: '', color: 'text-violet-600' },
        { label: 'Në pritje', value: stats.pending, hint: 'Duke pritur miratim', color: 'text-amber-600' },
        {
          label: 'Miratuar',
          value: stats.approvedWaitingActivation,
          hint: 'Në pritje aktivizimi',
          color: 'text-sky-600',
        },
        { label: 'Aktiv', value: stats.active, hint: 'Driver aktivë', color: 'text-emerald-600' },
        { label: 'Refuzuar', value: stats.rejected, hint: 'Aplikime të refuzuara', color: 'text-red-600' },
      ]
    : []

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Aplikimet Deliverer</h1>
          <p className={customerPanelSubtitle}>
            Shqyrto aplikimet, mirato me email aktivizimi dhe ndiq statusin deri në llogari aktive.
          </p>
        </div>
        <button type="button" className={customerBtnGhost} onClick={() => exportCsv(rows)} disabled={rows.length === 0}>
          Eksporto CSV
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {statCards.map((c) => (
          <div key={c.label} className={`${customerCardMuted} border-violet-100`}>
            <p className="text-xs font-medium text-gray-500">{c.label}</p>
            <p className={`mt-1 text-2xl font-bold ${c.color}`}>{c.value}</p>
            {c.hint ? <p className="text-xs text-gray-400">{c.hint}</p> : null}
          </div>
        ))}
      </div>

      <div className={`${customerCardMuted} flex flex-wrap items-end gap-3`}>
        <div className="min-w-[200px] flex-1">
          <label className="text-xs font-medium text-gray-500">Kërko</label>
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
            className={customerField + ' mt-1 min-w-[160px]'}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as DriverAppStatusFilter)}
          >
            <option value="all">Të gjitha</option>
            <option value="pending">Në pritje</option>
            <option value="approved_waiting">Miratuar</option>
            <option value="active">Aktiv</option>
            <option value="rejected">Refuzuar</option>
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-gray-500">Data nga</label>
          <input type="date" className={customerField + ' mt-1'} value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-500">Data deri</label>
          <input type="date" className={customerField + ' mt-1'} value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
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
            setDateFrom('')
            setDateTo('')
          }}
        >
          Pastro
        </button>
      </div>

      {actionMsg ? (
        <div className="rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 text-sm text-violet-900">{actionMsg}</div>
      ) : null}
      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      {loading ? <AdminTableSkeleton rows={5} /> : null}
      {!loading && rows.length === 0 ? <AdminEmptyState title="Nuk ka aplikime" subtitle="Ndrysho filtrat ose prit aplikime të reja." /> : null}

      {!loading && rows.length > 0 ? (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-gray-100 bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3">Aplikanti</th>
                <th className="px-4 py-3">Kontakt</th>
                <th className="px-4 py-3">Mjeti</th>
                <th className="px-4 py-3">Data aplikimit</th>
                <th className="px-4 py-3">Statusi</th>
                <th className="px-4 py-3">Veprimet</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {pageRows.map((a) => (
                <tr key={a.id} className="hover:bg-gray-50/80">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-violet-100 text-xs font-bold text-violet-800">
                        {initials(a.firstName, a.lastName)}
                      </span>
                      <div>
                        <p className="font-medium text-gray-900">
                          {a.firstName} {a.lastName}
                        </p>
                        <p className="text-xs text-gray-400">ID: APP-{String(a.id).padStart(5, '0')}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    <p>{a.email}</p>
                    <p className="text-xs">{a.phone}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {a.vehicleType}
                    {a.licensePlate ? <span className="block text-xs text-gray-400">{a.licensePlate}</span> : null}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{formatApplied(a.createdAtUtc)}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${driverApplicationStatusBadgeClass(a.status)}`}
                    >
                      {driverApplicationStatusLabel(a.status)}
                    </span>
                    <p className="mt-0.5 text-xs text-gray-400">{driverApplicationStatusSubtext(a.status)}</p>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      <button
                        type="button"
                        className={customerBtnGhost + ' text-xs'}
                        onClick={() => setViewRow(a)}
                      >
                        Shiko
                      </button>
                      {a.status === DRIVER_APP_PENDING ? (
                        <>
                          <button
                            type="button"
                            disabled={busyId === a.id}
                            className={customerBtnPrimary + ' px-2 py-1 text-xs'}
                            onClick={() => setApproveRow(a)}
                          >
                            Mirato
                          </button>
                          <button
                            type="button"
                            disabled={busyId === a.id}
                            className="rounded-lg border border-red-200 px-2 py-1 text-xs text-red-700 hover:bg-red-50"
                            onClick={() => setRejectRow(a)}
                          >
                            Refuzo
                          </button>
                        </>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {!loading && rows.length > 0 ? (
        <p className="text-sm text-gray-500">
          Duke shfaqur {(page - 1) * PAGE_SIZE + 1} deri në {Math.min(page * PAGE_SIZE, rows.length)} nga {rows.length}{' '}
          rezultate
          {totalPages > 1 ? (
            <span className="ml-4 inline-flex gap-1">
              <button
                type="button"
                className={customerBtnGhost + ' px-2 py-0.5 text-xs'}
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                ←
              </button>
              <span className="px-2">
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
            </span>
          ) : null}
        </p>
      ) : null}

      {approveRow ? (
        <DriverApplicationApproveModal
          row={approveRow}
          busy={busyId === approveRow.id}
          onClose={() => setApproveRow(null)}
          onConfirm={() => void confirmApprove()}
        />
      ) : null}
      {rejectRow ? (
        <DriverApplicationRejectModal
          row={rejectRow}
          busy={busyId === rejectRow.id}
          onClose={() => setRejectRow(null)}
          onConfirm={(reason) => void confirmReject(reason)}
        />
      ) : null}
      {viewRow ? (
        <DriverApplicationDetailsDrawer row={viewRow} onClose={() => setViewRow(null)} onUpdated={() => void load()} />
      ) : null}
    </div>
  )
}
