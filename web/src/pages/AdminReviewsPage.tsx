import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AdminEmptyState } from '../components/admin/AdminEmptyState'
import { AdminIcon } from '../components/admin/adminIcons'
import { AdminStatCardsSkeleton, AdminTableSkeleton } from '../components/admin/AdminSkeleton'
import { AdminReviewDetailsDrawer } from '../components/admin/reviews/AdminReviewDetailsDrawer'
import { ReviewKpiCard, reviewKpiIcons } from '../components/admin/reviews/ReviewKpiCard'
import {
  adminDeleteReview,
  adminSetReviewStatus,
  fetchAdminReviews,
  fetchAdminReviewStats,
  REVIEW_STATUS_HIDDEN,
  type AdminReviewListResult,
  type AdminReviewRow,
  type AdminReviewStats,
} from '../lib/adminApi'
import {
  ADMIN_REVIEW_RATING_OPTIONS,
  ADMIN_REVIEW_STATUS_OPTIONS,
  ADMIN_REVIEW_SUBJECT_OPTIONS,
  formatTrendLine,
  reviewStatusBadge,
  reviewStatusLabel,
  reviewSubjectBadge,
  reviewTargetLabel,
  reviewTargetSubtitle,
  StarRating,
} from '../lib/adminReviewStatus'
import { adminSuccessBanner, customerBtnGhost, customerCardMuted, customerPanelSubtitle, customerSelect } from '../lib/adminTheme'
import { useAuthStore } from '../store/authStore'

const DEFAULT_PAGE_SIZE = 15

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

function commentSnippet(comment: string | null, max = 56): string {
  const t = comment?.trim()
  if (!t) return '—'
  return t.length <= max ? t : `${t.slice(0, max)}…`
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

function IconCalendar({ className = 'text-gray-400' }: { className?: string }) {
  return (
    <svg
      className={`h-4 w-4 shrink-0 ${className}`}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden
    >
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  )
}

function formatFilterDate(iso: string): string {
  const [y, m, d] = iso.split('-')
  if (!y || !m || !d) return iso
  return `${d.padStart(2, '0')}/${m.padStart(2, '0')}/${y}`
}

function dateRangeLabel(from: string, to: string): string {
  if (from && to) return `${formatFilterDate(from)} - ${formatFilterDate(to)}`
  if (from) return `Nga ${formatFilterDate(from)}`
  if (to) return `Deri ${formatFilterDate(to)}`
  return 'Nga - Deri'
}

function ReviewDateRangeFilter({
  fromDate,
  toDate,
  onFromChange,
  onToChange,
}: {
  fromDate: string
  toDate: string
  onFromChange: (value: string) => void
  onToChange: (value: string) => void
}) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const empty = !fromDate && !toDate

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  return (
    <div ref={rootRef} className="relative min-w-[180px]">
      <span className="block text-xs font-medium text-gray-500">Data</span>
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen((v) => !v)}
        className="mt-1 flex h-[38px] w-full min-w-[180px] items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 text-left text-sm transition hover:border-gray-400 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
      >
        <IconCalendar />
        <span className={empty ? 'text-gray-400' : 'text-gray-900'}>{dateRangeLabel(fromDate, toDate)}</span>
      </button>
      {open ? (
        <div className="absolute left-0 top-full z-30 mt-1 w-72 rounded-xl border border-gray-200 bg-white p-3 shadow-lg">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-xs font-medium text-gray-500">
              Nga
              <input
                type="date"
                value={fromDate}
                onChange={(e) => onFromChange(e.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-sm text-gray-900 [color-scheme:light] focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
              />
            </label>
            <label className="block text-xs font-medium text-gray-500">
              Deri
              <input
                type="date"
                value={toDate}
                onChange={(e) => onToChange(e.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-sm text-gray-900 [color-scheme:light] focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
              />
            </label>
          </div>
          {fromDate || toDate ? (
            <button
              type="button"
              className="mt-3 text-xs font-medium text-violet-600 hover:text-violet-800"
              onClick={() => {
                onFromChange('')
                onToChange('')
              }}
            >
              Pastro datat
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

export default function AdminReviewsPage() {
  const token = useAuthStore((s) => s.token)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)
  const [search, setSearch] = useState('')
  const [searchDebounced, setSearchDebounced] = useState('')
  const [status, setStatus] = useState('')
  const [subject, setSubject] = useState('')
  const [rating, setRating] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')

  const [stats, setStats] = useState<AdminReviewStats | null>(null)
  const [data, setData] = useState<AdminReviewListResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [statsLoading, setStatsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<number | null>(null)
  const [drawerRow, setDrawerRow] = useState<AdminReviewRow | null>(null)
  const [menuOpenId, setMenuOpenId] = useState<number | null>(null)

  useEffect(() => {
    const t = window.setTimeout(() => setSearchDebounced(search), 300)
    return () => window.clearTimeout(t)
  }, [search])

  useEffect(() => {
    setPage(1)
  }, [searchDebounced, status, subject, rating, fromDate, toDate, pageSize])

  const loadStats = useCallback(async () => {
    if (!token) return
    setStatsLoading(true)
    try {
      setStats(await fetchAdminReviewStats(token))
    } catch {
      setStats(null)
    } finally {
      setStatsLoading(false)
    }
  }, [token])

  const load = useCallback(async () => {
    if (!token) return
    setError(null)
    const q: Parameters<typeof fetchAdminReviews>[1] = { page, pageSize }
    if (searchDebounced.trim()) q.search = searchDebounced.trim()
    if (status !== '') q.status = Number(status)
    if (subject !== '') q.subject = Number(subject)
    if (rating !== '') q.rating = Number(rating)
    if (fromDate) q.fromUtc = `${fromDate}T00:00:00.000Z`
    if (toDate) q.toUtc = `${toDate}T23:59:59.999Z`
    setData(await fetchAdminReviews(token, q))
  }, [token, page, pageSize, searchDebounced, status, subject, rating, fromDate, toDate])

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

  useEffect(() => {
    if (menuOpenId === null) return
    const close = () => setMenuOpenId(null)
    window.addEventListener('click', close)
    return () => window.removeEventListener('click', close)
  }, [menuOpenId])

  function onUpdated() {
    void load()
    void loadStats()
  }

  async function quickHide(row: AdminReviewRow) {
    if (!token) return
    setMenuOpenId(null)
    setBusyId(row.id)
    setMessage(null)
    const r = await adminSetReviewStatus(token, row.id, REVIEW_STATUS_HIDDEN)
    setBusyId(null)
    if (!r.ok) setMessage(r.message)
    else {
      setMessage('Vlerësimi u fsheh.')
      onUpdated()
    }
  }

  async function quickDelete(row: AdminReviewRow) {
    if (!token) return
    setMenuOpenId(null)
    if (!window.confirm('Fshi përgjithmonë këtë vlerësim?')) return
    setBusyId(row.id)
    setMessage(null)
    const r = await adminDeleteReview(token, row.id)
    setBusyId(null)
    if (!r.ok) setMessage(r.message)
    else {
      setMessage('Vlerësimi u fshi përgjithmonë.')
      onUpdated()
    }
  }

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

  function clearFilters() {
    setSearch('')
    setStatus('')
    setSubject('')
    setRating('')
    setFromDate('')
    setToDate('')
    setPage(1)
  }

  const drawerLive = useMemo(() => {
    if (!drawerRow || !data) return drawerRow
    return data.items.find((r) => r.id === drawerRow.id) ?? drawerRow
  }, [drawerRow, data])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Vlerësime</h1>
        <p className={customerPanelSubtitle}>
          Moderim i vlerësimeve të klientëve. Shih, filtro dhe menaxho vlerësimet.
        </p>
      </div>

      {statsLoading && !stats ? <AdminStatCardsSkeleton count={4} /> : null}
      {stats ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <ReviewKpiCard
            label="Total vlerësime"
            value={stats.total.toLocaleString('sq-AL')}
            icon={reviewKpiIcons.total}
            iconWrapClass="bg-violet-100 text-violet-700"
            trend={formatTrendLine(stats.totalChangePercent, { percent: true })}
          />
          <ReviewKpiCard
            label="Mesatarja e përgjithshme"
            value={`${stats.averageRating.toFixed(1)} / 5`}
            icon={reviewKpiIcons.average}
            iconWrapClass="bg-amber-100 text-amber-600"
            trend={formatTrendLine(stats.averageRatingChange, { suffix: '' })}
          />
          <ReviewKpiCard
            label="Vlerësime të raportuara"
            value={stats.reported.toLocaleString('sq-AL')}
            icon={reviewKpiIcons.reported}
            iconWrapClass="bg-red-100 text-red-600"
            trend={formatTrendLine(stats.reportedChange, { invert: true })}
          />
          <ReviewKpiCard
            label="Vlerësime të fshehura"
            value={stats.hidden.toLocaleString('sq-AL')}
            icon={reviewKpiIcons.hidden}
            iconWrapClass="bg-sky-100 text-sky-700"
            trend={formatTrendLine(stats.hiddenChange)}
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
              placeholder="Kërko klient, restorant, porosi…"
              className="h-[38px] w-full rounded-lg border border-gray-300 bg-white py-2 pl-9 pr-3 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20"
            />
          </div>
        </div>

        <div className="min-w-[132px]">
          <span className="block text-xs font-medium text-gray-500">Subjekti</span>
          <select value={subject} onChange={(e) => setSubject(e.target.value)} className={customerSelect}>
            {ADMIN_REVIEW_SUBJECT_OPTIONS.map((o) => (
              <option key={o.value || 'all'} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        <div className="min-w-[132px]">
          <span className="block text-xs font-medium text-gray-500">Statusi</span>
          <select value={status} onChange={(e) => setStatus(e.target.value)} className={customerSelect}>
            {ADMIN_REVIEW_STATUS_OPTIONS.map((o) => (
              <option key={o.value || 'all'} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        <div className="min-w-[120px]">
          <span className="block text-xs font-medium text-gray-500">Rating</span>
          <select value={rating} onChange={(e) => setRating(e.target.value)} className={customerSelect}>
            {ADMIN_REVIEW_RATING_OPTIONS.map((o) => (
              <option key={o.value || 'all'} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        <ReviewDateRangeFilter
          fromDate={fromDate}
          toDate={toDate}
          onFromChange={setFromDate}
          onToChange={setToDate}
        />

        <div className="shrink-0">
          <span className="block text-xs font-medium text-transparent select-none" aria-hidden="true">
            &nbsp;
          </span>
          <button
            type="button"
            className="mt-1 inline-flex h-[38px] cursor-pointer items-center rounded-xl border border-gray-200 bg-white px-5 text-sm font-normal text-gray-500 transition hover:border-gray-300 hover:bg-gray-50 hover:text-gray-600"
            onClick={clearFilters}
          >
            Reset filters
          </button>
        </div>
      </section>

      {message ? <p className={adminSuccessBanner}>{message}</p> : null}
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {loading ? <AdminTableSkeleton rows={8} /> : null}

      {!loading && data && data.items.length === 0 ? (
        <AdminEmptyState
          icon="⭐"
          title="Nuk u gjet asnjë vlerësim"
          description="Provo filtra të tjerë ose pastro kërkimin."
        />
      ) : null}

      {!loading && data && data.items.length > 0 ? (
        <>
          <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-gray-100 bg-gray-50 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-4 py-3">Rating</th>
                  <th className="px-4 py-3">Subjekti</th>
                  <th className="px-4 py-3">Restoranti / Deliveri</th>
                  <th className="px-4 py-3">Klienti</th>
                  <th className="px-4 py-3">Porosia</th>
                  <th className="px-4 py-3">Komenti</th>
                  <th className="px-4 py-3">Data</th>
                  <th className="px-4 py-3">Statusi</th>
                  <th className="px-4 py-3 text-right">Veprime</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.items.map((row) => (
                  <tr key={row.id} className="transition hover:bg-gray-50/80">
                    <td className="px-4 py-3">
                      <StarRating rating={row.rating} className="text-sm" />
                    </td>
                    <td className="px-4 py-3">
                      <span className={reviewSubjectBadge(row.subject)}>
                        {row.subject === 1 ? 'Deliver' : 'Restorant'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-gray-900">{reviewTargetLabel(row)}</p>
                      <p className="text-xs text-gray-500">{reviewTargetSubtitle(row)}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{row.authorEmail}</td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-700">{row.orderNumber}</td>
                    <td className="max-w-[220px] px-4 py-3 text-gray-600">{commentSnippet(row.comment)}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-gray-600">{formatTableDate(row.createdAt)}</td>
                    <td className="px-4 py-3">
                      <span className={reviewStatusBadge(row.status)}>{reviewStatusLabel(row.status)}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="relative flex justify-end gap-1">
                        <button
                          type="button"
                          className="rounded-lg border border-transparent p-2 text-gray-500 hover:border-gray-200 hover:bg-gray-50 hover:text-violet-700"
                          title="Shiko detajet"
                          onClick={() => setDrawerRow(row)}
                        >
                          <IconEye />
                        </button>
                        <button
                          type="button"
                          disabled={busyId === row.id}
                          className="rounded-lg border border-transparent p-2 text-gray-500 hover:border-gray-200 hover:bg-gray-50 hover:text-gray-800"
                          title="Më shumë veprime"
                          onClick={(e) => {
                            e.stopPropagation()
                            setMenuOpenId((id) => (id === row.id ? null : row.id))
                          }}
                        >
                          <IconMore />
                        </button>
                        {menuOpenId === row.id ? (
                          <div
                            className="absolute right-0 top-full z-10 mt-1 w-44 overflow-hidden rounded-xl border border-gray-200 bg-white py-1 shadow-lg"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              type="button"
                              className="block w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                              onClick={() => {
                                setMenuOpenId(null)
                                setDrawerRow(row)
                              }}
                            >
                              Shiko detajet
                            </button>
                            {row.status !== REVIEW_STATUS_HIDDEN ? (
                              <button
                                type="button"
                                className="block w-full px-3 py-2 text-left text-sm text-amber-800 hover:bg-amber-50"
                                onClick={() => void quickHide(row)}
                              >
                                Fsheh vlerësimin
                              </button>
                            ) : null}
                            <button
                              type="button"
                              className="block w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                              onClick={() => void quickDelete(row)}
                            >
                              Fshi përgjithmonë
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
                {[15, 25, 50].map((n) => (
                  <option key={n} value={n}>
                    {n} / faqe
                  </option>
                ))}
              </select>
            </label>
          </div>

          <p className="text-xs text-gray-400">
            Vlerësimet e fshehura nuk shfaqen publikisht por mbeten në sistem për auditim.
          </p>
        </>
      ) : null}

      {drawerLive ? (
        <AdminReviewDetailsDrawer
          row={drawerLive}
          onClose={() => setDrawerRow(null)}
          onUpdated={onUpdated}
          onMessage={setMessage}
        />
      ) : null}
    </div>
  )
}
