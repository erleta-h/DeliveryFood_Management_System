import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { AdminEmptyState } from '../components/admin/AdminEmptyState'
import { AdminIcon } from '../components/admin/adminIcons'
import { AdminTableSkeleton } from '../components/admin/AdminSkeleton'
import { PartnerApplicationApproveModal } from '../components/admin/partnerApplications/PartnerApplicationApproveModal'
import { PartnerApplicationCredentialsModal } from '../components/admin/partnerApplications/PartnerApplicationCredentialsModal'
import { PartnerApplicationDetailsDrawer } from '../components/admin/partnerApplications/PartnerApplicationDetailsDrawer'
import {
  approvePartnerApplication,
  fetchPartnerApplications,
  rejectPartnerApplication,
  type ApprovePartnerResult,
  type PartnerApplicationRow,
  type PartnerApplicationStats,
  type ResetPartnerStaffPasswordResult,
} from '../lib/adminApi'
import {
  adminFilterBtn,
  customerBtnGhost,
  customerField,
  customerPanelSubtitle,
} from '../lib/adminTheme'
import {
  PARTNER_APP_APPROVED,
  PARTNER_APP_CONTACTED,
  PARTNER_APP_PENDING,
  PARTNER_APP_REJECTED,
  formatVenueLocations,
  partnerApplicationStatsFromRows,
  partnerApplicationStatusBadgeClass,
  partnerApplicationStatusLabel,
  partnerApplicationStatusSubtext,
  partnerCanActOn,
  type PartnerAppStatusFilter,
} from '../lib/partnerApplicationStatus'
import { useAuthStore } from '../store/authStore'

const PAGE_SIZE = 5

function formatApplied(iso: string): string {
  try {
    const d = new Date(iso)
    return `${d.toLocaleDateString('sq-AL')} · ${d.toLocaleTimeString('sq-AL', { hour: '2-digit', minute: '2-digit' })}`
  } catch {
    return iso
  }
}

function exportCsv(rows: PartnerApplicationRow[]) {
  const header = [
    'ID',
    'VenueName',
    'BusinessType',
    'City',
    'OwnerFirst',
    'OwnerLast',
    'Email',
    'Phone',
    'Locations',
    'Status',
    'CreatedAt',
  ]
  const lines = rows.map((r) =>
    [
      r.id,
      r.venueName,
      r.businessType ?? '',
      r.city,
      r.contactFirstName,
      r.contactLastName,
      r.email,
      r.phone ?? '',
      r.venueCountLabel ?? '',
      r.status,
      r.createdAtUtc,
    ]
      .map((c) => `"${String(c).replace(/"/g, '""')}"`)
      .join(','),
  )
  const blob = new Blob([[header.join(','), ...lines].join('\n')], { type: 'text/csv;charset=utf-8' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `partner-applications-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(a.href)
}

function matchesStatus(r: PartnerApplicationRow, filter: PartnerAppStatusFilter): boolean {
  switch (filter) {
    case 'pending':
      return r.status === PARTNER_APP_PENDING
    case 'contacted':
      return r.status === PARTNER_APP_CONTACTED
    case 'approved':
      return r.status === PARTNER_APP_APPROVED
    case 'rejected':
      return r.status === PARTNER_APP_REJECTED
    default:
      return true
  }
}

function KpiCard({
  label,
  value,
  hint,
  icon,
  tone,
}: {
  label: string
  value: number
  hint: string
  icon: ReactNode
  tone: string
}) {
  return (
    <div className="rounded-xl border border-gray-200/90 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${tone}`}>{icon}</div>
      </div>
      <p className="mt-3 text-[11px] font-semibold uppercase tracking-wide text-gray-500">{label}</p>
      <p className="mt-1 text-2xl font-bold tabular-nums text-gray-900">{value}</p>
      {hint ? <p className="mt-0.5 text-xs text-gray-400">{hint}</p> : null}
    </div>
  )
}

function RowActionsMenu({
  row,
  onView,
  onApprove,
  onReject,
}: {
  row: PartnerApplicationRow
  onView: () => void
  onApprove: () => void
  onReject: () => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const canAct = partnerCanActOn(row.status)

  useEffect(() => {
    if (!open) return
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-500 transition hover:border-violet-200 hover:bg-violet-50 hover:text-violet-700"
        aria-label="Më shumë veprime"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        ⋮
      </button>
      {open ? (
        <div className="absolute right-0 z-20 mt-1 w-44 overflow-hidden rounded-xl border border-gray-200 bg-white py-1 shadow-lg">
          <button
            type="button"
            className="block w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
            onClick={() => {
              setOpen(false)
              onView()
            }}
          >
            Shiko detajet
          </button>
          {canAct ? (
            <>
              <button
                type="button"
                className="block w-full px-3 py-2 text-left text-sm text-violet-700 hover:bg-violet-50"
                onClick={() => {
                  setOpen(false)
                  onApprove()
                }}
              >
                Mirato
              </button>
              <button
                type="button"
                className="block w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                onClick={() => {
                  setOpen(false)
                  onReject()
                }}
              >
                Refuzo
              </button>
            </>
          ) : null}
          {row.status === PARTNER_APP_APPROVED ? (
            <button
              type="button"
              className="block w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
              onClick={() => {
                setOpen(false)
                onView()
              }}
            >
              Mbështetje (fjalëkalim)
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

export default function AdminPartnerApplicationsPage() {
  const token = useAuthStore((s) => s.token)
  const [allRows, setAllRows] = useState<PartnerApplicationRow[]>([])
  const [stats, setStats] = useState<PartnerApplicationStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionMsg, setActionMsg] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<number | null>(null)

  const [searchDraft, setSearchDraft] = useState('')
  const [statusDraft, setStatusDraft] = useState<PartnerAppStatusFilter>('all')
  const [cityDraft, setCityDraft] = useState('')
  const [dateFromDraft, setDateFromDraft] = useState('')
  const [dateToDraft, setDateToDraft] = useState('')

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<PartnerAppStatusFilter>('all')
  const [cityFilter, setCityFilter] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [page, setPage] = useState(1)

  const [viewRow, setViewRow] = useState<PartnerApplicationRow | null>(null)
  const [approveRow, setApproveRow] = useState<PartnerApplicationRow | null>(null)
  const [credentials, setCredentials] = useState<
    | { kind: 'approve'; data: ApprovePartnerResult }
    | { kind: 'reset'; data: ResetPartnerStaffPasswordResult }
    | null
  >(null)

  const load = useCallback(async () => {
    if (!token) return
    setError(null)
    const list = await fetchPartnerApplications(token)
    setAllRows(list)
    setStats(partnerApplicationStatsFromRows(list))
  }, [token])

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

  const cities = useMemo(() => {
    const set = new Set(allRows.map((r) => r.city.trim()).filter(Boolean))
    return [...set].sort((a, b) => a.localeCompare(b, 'sq'))
  }, [allRows])

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    return allRows.filter((r) => {
      if (!matchesStatus(r, statusFilter)) return false
      if (cityFilter && r.city !== cityFilter) return false
      if (dateFrom) {
        const from = new Date(`${dateFrom}T00:00:00`)
        if (new Date(r.createdAtUtc) < from) return false
      }
      if (dateTo) {
        const to = new Date(`${dateTo}T23:59:59.999`)
        if (new Date(r.createdAtUtc) > to) return false
      }
      if (!term) return true
      const hay = [
        r.venueName,
        r.city,
        r.email,
        r.contactFirstName,
        r.contactLastName,
        r.phone ?? '',
        r.businessType ?? '',
      ]
        .join(' ')
        .toLowerCase()
      return hay.includes(term)
    })
  }, [allRows, search, statusFilter, cityFilter, dateFrom, dateTo])

  useEffect(() => {
    setPage(1)
  }, [search, statusFilter, cityFilter, dateFrom, dateTo])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const pageRows = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE
    return filtered.slice(start, start + PAGE_SIZE)
  }, [filtered, page])

  const pageNumbers = useMemo(() => {
    const max = 5
    let start = Math.max(1, page - Math.floor(max / 2))
    const end = Math.min(totalPages, start + max - 1)
    start = Math.max(1, end - max + 1)
    const nums: number[] = []
    for (let i = start; i <= end; i++) nums.push(i)
    return nums
  }, [page, totalPages])

  function applyFilters() {
    setSearch(searchDraft)
    setStatusFilter(statusDraft)
    setCityFilter(cityDraft)
    setDateFrom(dateFromDraft)
    setDateTo(dateToDraft)
  }

  function clearFilters() {
    setSearchDraft('')
    setStatusDraft('all')
    setCityDraft('')
    setDateFromDraft('')
    setDateToDraft('')
    setSearch('')
    setStatusFilter('all')
    setCityFilter('')
    setDateFrom('')
    setDateTo('')
  }

  async function confirmApprove(initialPassword?: string) {
    if (!token || !approveRow) return
    setBusyId(approveRow.id)
    setActionMsg(null)
    const id = approveRow.id
    const r = await approvePartnerApplication(token, id, initialPassword)
    setBusyId(null)
    setApproveRow(null)
    if (viewRow?.id === id) setViewRow(null)
    if (r.ok) {
      setCredentials({ kind: 'approve', data: r.data })
      setActionMsg('Restoranti u krijua. Dërgo kredencialet partnerit përmes kanalit të sigurt.')
      await load()
    } else setActionMsg(r.message)
  }

  function openReject(row: PartnerApplicationRow) {
    if (!window.confirm(`Të refuzohet aplikimi i «${row.venueName}»?`)) return
    void (async () => {
      if (!token) return
      setBusyId(row.id)
      setActionMsg(null)
      const r = await rejectPartnerApplication(token, row.id)
      setBusyId(null)
      if (r.ok) {
        setActionMsg('Aplikimi u shënua si refuzuar.')
        setViewRow((v) => (v?.id === row.id ? null : v))
        await load()
      } else setActionMsg(r.message)
    })()
  }

  const statCards = stats
    ? [
        {
          label: 'Totali aplikimeve',
          value: stats.total,
          hint: 'Të gjitha aplikimet',
          tone: 'bg-violet-50 text-violet-600',
          icon: <AdminIcon name="restaurant" size={18} />,
        },
        {
          label: 'Në pritje',
          value: stats.pending,
          hint: 'Duke pritur shqyrtim',
          tone: 'bg-amber-50 text-amber-600',
          icon: <span className="text-base">⏳</span>,
        },
        {
          label: 'Kontaktuar',
          value: stats.contacted,
          hint: 'Kontakt i kryer',
          tone: 'bg-sky-50 text-sky-600',
          icon: <span className="text-base">📞</span>,
        },
        {
          label: 'Miratuar',
          value: stats.approved,
          hint: 'Restorante të krijuara',
          tone: 'bg-emerald-50 text-emerald-600',
          icon: <span className="text-base">✓</span>,
        },
        {
          label: 'Refuzuar',
          value: stats.rejected,
          hint: 'Aplikime të refuzuara',
          tone: 'bg-red-50 text-red-600',
          icon: <span className="text-base">✕</span>,
        },
      ]
    : []

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-gray-900 sm:text-2xl">Aplikimet Partner</h1>
          <p className={customerPanelSubtitle}>
            Mirato aplikimet pas kontratës; krijohen restoranti dhe kredencialet e stafit.
          </p>
        </div>
        <button
          type="button"
          className={customerBtnGhost + ' shrink-0'}
          onClick={() => exportCsv(filtered)}
          disabled={filtered.length === 0}
        >
          ↓ Eksporto CSV
        </button>
      </div>

      {!loading && stats ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {statCards.map((c) => (
            <KpiCard key={c.label} {...c} />
          ))}
        </div>
      ) : null}

      <div className="rounded-xl border border-gray-200/90 bg-white p-4 shadow-sm sm:p-5">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6 lg:items-end">
          <label className="lg:col-span-2">
            <span className="mb-1 block text-xs font-medium text-gray-500">Kërko restorantin…</span>
            <input
              type="search"
              value={searchDraft}
              onChange={(e) => setSearchDraft(e.target.value)}
              placeholder="Emër, qytet, email…"
              className={customerField}
            />
          </label>
          <label>
            <span className="mb-1 block text-xs font-medium text-gray-500">Statusi</span>
            <select
              className={customerField}
              value={statusDraft}
              onChange={(e) => setStatusDraft(e.target.value as PartnerAppStatusFilter)}
            >
              <option value="all">Të gjitha</option>
              <option value="pending">Në pritje</option>
              <option value="contacted">Kontaktuar</option>
              <option value="approved">Miratuar</option>
              <option value="rejected">Refuzuar</option>
            </select>
          </label>
          <label>
            <span className="mb-1 block text-xs font-medium text-gray-500">Qyteti</span>
            <select className={customerField} value={cityDraft} onChange={(e) => setCityDraft(e.target.value)}>
              <option value="">Të gjitha</option>
              {cities.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="mb-1 block text-xs font-medium text-gray-500">Nga data</span>
            <input
              type="date"
              className={customerField}
              value={dateFromDraft}
              onChange={(e) => setDateFromDraft(e.target.value)}
            />
          </label>
          <label>
            <span className="mb-1 block text-xs font-medium text-gray-500">Deri data</span>
            <input
              type="date"
              className={customerField}
              value={dateToDraft}
              onChange={(e) => setDateToDraft(e.target.value)}
            />
          </label>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" className={adminFilterBtn(true)} onClick={applyFilters}>
            Filtro
          </button>
          <button type="button" className={customerBtnGhost} onClick={clearFilters}>
            Pastro
          </button>
        </div>
      </div>

      {actionMsg ? (
        <div className="rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 text-sm text-violet-900">{actionMsg}</div>
      ) : null}
      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      {loading ? <AdminTableSkeleton rows={5} /> : null}

      {!loading && filtered.length === 0 ? (
        <AdminEmptyState
          icon="📝"
          title="Nuk ka aplikime për këtë filtër"
          description="Kur një restorant aplikon nga faqja publike, shfaqet këtu për miratim."
        />
      ) : null}

      {!loading && filtered.length > 0 ? (
        <>
          <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-gray-100 bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-4 py-3">Restoranti</th>
                  <th className="px-4 py-3">Pronari</th>
                  <th className="px-4 py-3">Qyteti</th>
                  <th className="px-4 py-3">Lokacione</th>
                  <th className="px-4 py-3">Statusi</th>
                  <th className="px-4 py-3">Data aplikimit</th>
                  <th className="px-4 py-3 text-right">Veprimet</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {pageRows.map((r) => (
                  <tr key={r.id} className="transition hover:bg-gray-50/80">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-sm font-bold text-violet-800">
                          {(r.venueName[0] ?? '?').toUpperCase()}
                        </span>
                        <div>
                          <p className="font-medium text-gray-900">{r.venueName}</p>
                          <p className="text-xs text-gray-500">{r.businessType?.trim() || 'Partner'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-800">
                        {r.contactFirstName} {r.contactLastName}
                      </p>
                      <p className="text-xs text-gray-500">{r.email}</p>
                      {r.phone ? <p className="text-xs text-gray-400">{r.phone}</p> : null}
                    </td>
                    <td className="px-4 py-3 text-gray-700">{r.city}</td>
                    <td className="px-4 py-3 text-gray-600">{formatVenueLocations(r.venueCountLabel)}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${partnerApplicationStatusBadgeClass(r.status)}`}
                      >
                        {partnerApplicationStatusLabel(r.status)}
                      </span>
                      <p className="mt-0.5 text-xs text-gray-400">{partnerApplicationStatusSubtext(r.status)}</p>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-gray-600">{formatApplied(r.createdAtUtc)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          className={customerBtnGhost + ' text-xs'}
                          onClick={() => setViewRow(r)}
                        >
                          Shiko
                        </button>
                        <RowActionsMenu
                          row={r}
                          onView={() => setViewRow(r)}
                          onApprove={() => setApproveRow(r)}
                          onReject={() => openReject(r)}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-gray-500">
              Duke shfaqur {(page - 1) * PAGE_SIZE + 1} deri {Math.min(page * PAGE_SIZE, filtered.length)} nga{' '}
              {filtered.length} rezultate
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

      {approveRow ? (
        <PartnerApplicationApproveModal
          row={approveRow}
          busy={busyId === approveRow.id}
          onClose={() => setApproveRow(null)}
          onConfirm={(pw) => void confirmApprove(pw)}
        />
      ) : null}

      {viewRow ? (
        <PartnerApplicationDetailsDrawer
          row={allRows.find((x) => x.id === viewRow.id) ?? viewRow}
          busy={busyId === viewRow.id}
          onClose={() => setViewRow(null)}
          onUpdated={() => void load()}
          onApprove={(row) => {
            setViewRow(null)
            setApproveRow(row)
          }}
          onReject={(row) => openReject(row)}
          onResetSuccess={(email, newPassword) => {
            setCredentials({
              kind: 'reset',
              data: { staffEmail: email, newPassword },
            })
            setActionMsg('Fjalëkalimi u rivendos. Dërgo vlerën e re te partneri — sesionet e vjetra u anuluan.')
            void load()
          }}
        />
      ) : null}

      {credentials?.kind === 'approve' ? (
        <PartnerApplicationCredentialsModal
          title="Kredencialet e krijuara"
          subtitle="Kopjo dhe dërgo te partneri përmes kanalit të sigurt (jo chat publik)."
          data={credentials.data}
          passwordKey="temporaryPassword"
          onClose={() => setCredentials(null)}
        />
      ) : null}

      {credentials?.kind === 'reset' ? (
        <PartnerApplicationCredentialsModal
          title="Fjalëkalimi i ri"
          subtitle="Kopjo dhe dërgo te partneri — sesionet e vjetra u anuluan."
          data={credentials.data}
          passwordKey="newPassword"
          onClose={() => setCredentials(null)}
        />
      ) : null}
    </div>
  )
}
