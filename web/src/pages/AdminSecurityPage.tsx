import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { AdminIcon } from '../components/admin/adminIcons'
import { AdminTableSkeleton } from '../components/admin/AdminSkeleton'
import { fetchAdminAudit, type AdminAuditListResult, type AdminAuditRow } from '../lib/adminApi'
import {
  AUDIT_ACTION_FILTER_OPTIONS,
  AUDIT_ROLE_FILTER_OPTIONS,
  formatAuditAction,
  formatAuditDevice,
  formatAuditEntity,
  getAuditActorBadge,
  getAuditActorType,
  isAccountLockedAction,
  isAdminAction,
  isCriticalAction,
  isFailedLoginAction,
  isLoginAction,
  isPasswordResetAction,
  matchesActionFilter,
} from '../lib/auditLabels'
import {
  adminErrorBanner,
  adminFilterBtn,
  customerBtnGhost,
  customerField,
  customerPanelSubtitle,
  customerSelect,
} from '../lib/adminTheme'
import { useAuthStore } from '../store/authStore'

const PAGE_SIZE = 10
const FETCH_SIZE = 200

type QuickRange = 'today' | '7d' | '30d' | 'month'

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

function inQuickRange(iso: string, range: QuickRange): boolean {
  const dt = new Date(iso)
  const now = new Date()
  const start = startOfDay(now)
  if (range === 'today') return dt >= start
  if (range === '7d') return dt >= new Date(start.getTime() - 6 * 86400000)
  if (range === '30d') return dt >= new Date(start.getTime() - 29 * 86400000)
  if (range === 'month') return dt.getMonth() === now.getMonth() && dt.getFullYear() === now.getFullYear()
  return true
}

function formatAuditTime(iso: string) {
  try {
    return new Intl.DateTimeFormat('sq-AL', { dateStyle: 'short', timeStyle: 'medium' }).format(new Date(iso))
  } catch {
    return iso
  }
}

function KpiCard({
  label,
  value,
  trend,
  icon,
  tone,
}: {
  label: string
  value: number | string
  trend?: { text: string; positive?: boolean }
  icon: ReactNode
  tone: string
}) {
  return (
    <div className="rounded-xl border border-gray-200/90 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${tone}`}>{icon}</div>
      </div>
      <p className="mt-3 text-[11px] font-semibold uppercase tracking-wide text-gray-500">{label}</p>
      <p className="mt-1 text-2xl font-bold tabular-nums tracking-tight text-gray-900">{value}</p>
      {trend ? (
        <p className={`mt-1 text-xs ${trend.positive ? 'text-emerald-600' : trend.text.includes('0%') ? 'text-gray-400' : 'text-red-600'}`}>
          {trend.text}
        </p>
      ) : null}
    </div>
  )
}

function DeviceCell({ row }: { row: AdminAuditRow }) {
  const { label, icon } = formatAuditDevice(row)
  return (
    <div className="flex items-center gap-2 text-gray-600">
      {icon === 'desktop' ? (
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <rect x="2" y="3" width="20" height="14" rx="2" />
          <path d="M8 21h8M12 17v4" />
        </svg>
      ) : (
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <rect x="5" y="2" width="14" height="20" rx="2" />
          <path d="M12 18h.01" />
        </svg>
      )}
      <span className="text-xs">{label}</span>
    </div>
  )
}

export default function AdminSecurityPage() {
  const token = useAuthStore((s) => s.token)
  const [data, setData] = useState<AdminAuditListResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [quickRange, setQuickRange] = useState<QuickRange>('today')
  const [search, setSearch] = useState('')
  const [actionFilter, setActionFilter] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const load = useCallback(async () => {
    if (!token) return
    setError(null)
    setLoading(true)
    try {
      const d = await fetchAdminAudit(token, { page: 1, pageSize: FETCH_SIZE })
      setData(d)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Gabim.')
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    if (!token) {
      setLoading(false)
      return
    }
    void load()
  }, [token, load])

  useEffect(() => {
    setPage(1)
  }, [search, actionFilter, roleFilter, quickRange, dateFrom, dateTo])

  const allItems = data?.items ?? []

  const kpis = useMemo(() => {
    const todayItems = allItems.filter((r) => inQuickRange(r.createdAt, 'today'))
    const yesterdayStart = new Date(startOfDay(new Date()).getTime() - 86400000)
    const yesterdayEnd = startOfDay(new Date())
    const yesterdayItems = allItems.filter((r) => {
      const d = new Date(r.createdAt)
      return d >= yesterdayStart && d < yesterdayEnd
    })

    const count = (items: AdminAuditRow[], pred: (a: string) => boolean) => items.filter((r) => pred(r.action)).length

    const todayLogin = count(todayItems, isLoginAction)
    const yLogin = count(yesterdayItems, isLoginAction)
    const todayFailed = count(todayItems, isFailedLoginAction)
    const yFailed = count(yesterdayItems, isFailedLoginAction)
    const todayPw = count(todayItems, isPasswordResetAction)
    const yPw = count(yesterdayItems, isPasswordResetAction)
    const todayLocked = count(todayItems, isAccountLockedAction)
    const yLocked = count(yesterdayItems, isAccountLockedAction)
    const todayCrit = count(todayItems, isCriticalAction)
    const yCrit = count(yesterdayItems, isCriticalAction)
    const todayAdmin = count(todayItems, isAdminAction)
    const yAdmin = count(yesterdayItems, isAdminAction)

    function trend(t: number, y: number): { text: string; positive?: boolean } {
      if (y === 0) return { text: t > 0 ? '↑ nga dje' : '0% nga dje', positive: t === 0 }
      const pct = Math.round(((t - y) / y) * 1000) / 10
      const sign = pct >= 0 ? '↑' : '↓'
      return { text: `${sign} ${Math.abs(pct)}% nga dje`, positive: pct >= 0 }
    }

    return {
      loginToday: todayLogin,
      failedLogin: todayFailed,
      passwordReset: todayPw,
      locked: todayLocked,
      critical: todayCrit,
      adminActions: todayAdmin,
      trends: {
        login: trend(todayLogin, yLogin),
        failed: trend(todayFailed, yFailed),
        pw: trend(todayPw, yPw),
        locked: trend(todayLocked, yLocked),
        critical: trend(todayCrit, yCrit),
        admin: trend(todayAdmin, yAdmin),
      },
    }
  }, [allItems])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return allItems.filter((r) => {
      if (!inQuickRange(r.createdAt, quickRange)) return false
      if (dateFrom && r.createdAt.slice(0, 10) < dateFrom) return false
      if (dateTo && r.createdAt.slice(0, 10) > dateTo) return false
      if (!matchesActionFilter(r.action, actionFilter)) return false
      if (roleFilter && getAuditActorType(r) !== roleFilter) return false
      if (!q) return true
      return (
        formatAuditAction(r.action).toLowerCase().includes(q) ||
        r.action.toLowerCase().includes(q) ||
        formatAuditEntity(r).toLowerCase().includes(q) ||
        (r.userEmail?.toLowerCase().includes(q) ?? false) ||
        (r.ipAddress?.toLowerCase().includes(q) ?? false)
      )
    })
  }, [allItems, search, actionFilter, roleFilter, quickRange, dateFrom, dateTo])

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

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-gray-900 sm:text-2xl">Siguria</h1>
        <p className={customerPanelSubtitle}>
          Regjistri i auditimit (lexim). Shtimi i event-eve bëhet nga shërbimet kur implementohet.
        </p>
      </div>

      {error ? <p className={adminErrorBanner}>{error}</p> : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        <KpiCard
          label="Login Sot"
          value={loading ? '…' : kpis.loginToday}
          trend={loading ? undefined : kpis.trends.login}
          tone="bg-violet-50 text-violet-600"
          icon={<AdminIcon name="security" size={18} />}
        />
        <KpiCard
          label="Failed Login"
          value={loading ? '…' : kpis.failedLogin}
          trend={loading ? undefined : kpis.trends.failed}
          tone="bg-red-50 text-red-600"
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <rect x="3" y="11" width="18" height="11" rx="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          }
        />
        <KpiCard
          label="Password Reset"
          value={loading ? '…' : kpis.passwordReset}
          trend={loading ? undefined : kpis.trends.pw}
          tone="bg-amber-50 text-amber-600"
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0 3 3L22 7l-3-3m-3.5 3.5L19 4" />
            </svg>
          }
        />
        <KpiCard
          label="Account Locked"
          value={loading ? '…' : kpis.locked}
          trend={loading ? undefined : kpis.trends.locked}
          tone="bg-fuchsia-50 text-fuchsia-600"
          icon={<AdminIcon name="users" size={18} />}
        />
        <KpiCard
          label="Aktivitete Kritike"
          value={loading ? '…' : kpis.critical}
          trend={loading ? undefined : kpis.trends.critical}
          tone="bg-emerald-50 text-emerald-600"
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
          }
        />
        <KpiCard
          label="Admin Actions"
          value={loading ? '…' : kpis.adminActions}
          trend={loading ? undefined : kpis.trends.admin}
          tone="bg-sky-50 text-sky-600"
          icon={<AdminIcon name="settings" size={18} />}
        />
      </div>

      <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap gap-2">
          {(
            [
              ['today', 'Sot'],
              ['7d', '7 ditë'],
              ['30d', '30 ditë'],
              ['month', 'Ky muaj'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              className={adminFilterBtn(quickRange === id)}
              onClick={() => setQuickRange(id)}
            >
              {quickRange === id ? '↑ ' : ''}
              {label}
            </button>
          ))}
        </div>

        <div className="mt-4 grid gap-3 lg:grid-cols-12 lg:items-end">
          <div className="relative lg:col-span-3">
            <AdminIcon
              name="search"
              size={16}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Kërko përdorues, email, entitet…"
              className={customerField + ' pl-9'}
            />
          </div>
          <label className="block text-xs text-gray-500 lg:col-span-2">
            Veprimi
            <select value={actionFilter} onChange={(e) => setActionFilter(e.target.value)} className={customerSelect}>
              {AUDIT_ACTION_FILTER_OPTIONS.map((o) => (
                <option key={o.value || 'all'} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-xs text-gray-500 lg:col-span-2">
            Roli
            <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className={customerSelect}>
              {AUDIT_ROLE_FILTER_OPTIONS.map((o) => (
                <option key={o.value || 'all'} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-xs text-gray-500 lg:col-span-2">
            Nga data
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className={customerField} />
          </label>
          <label className="block text-xs text-gray-500 lg:col-span-2">
            Deri data
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className={customerField} />
          </label>
          <div className="lg:col-span-1">
            <button type="button" className={customerBtnGhost + ' w-full'} onClick={() => void load()}>
              ↻ Rifresko
            </button>
          </div>
        </div>
      </section>

      {loading ? <AdminTableSkeleton rows={8} /> : null}

      {!loading && filtered.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-8 text-center text-sm text-gray-500 shadow-sm">
          Nuk ka rreshta audit për filtrat e zgjedhur.
        </div>
      ) : null}

      {!loading && filtered.length > 0 ? (
        <>
          <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
            <table className="min-w-full text-left text-sm text-gray-700">
              <thead className="border-b border-gray-100 bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-4 py-3">Koha</th>
                  <th className="px-4 py-3">Lloji</th>
                  <th className="px-4 py-3">Veprimi</th>
                  <th className="px-4 py-3">Entiteti</th>
                  <th className="px-4 py-3">Përdoruesi</th>
                  <th className="px-4 py-3">IP Address</th>
                  <th className="px-4 py-3">Pajisja</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {pageRows.map((a) => {
                  const actorType = getAuditActorType(a)
                  const badge = getAuditActorBadge(actorType)
                  return (
                    <tr key={a.id} className="transition hover:bg-gray-50/80">
                      <td className="whitespace-nowrap px-4 py-3 text-xs text-gray-500">{formatAuditTime(a.createdAt)}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${badge.className}`}
                        >
                          {badge.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-900">{formatAuditAction(a.action)}</td>
                      <td className="px-4 py-3 text-gray-700">{formatAuditEntity(a)}</td>
                      <td className="px-4 py-3 text-gray-500">{a.userEmail ?? '—'}</td>
                      <td className="px-4 py-3 font-mono text-xs text-gray-500">{a.ipAddress ?? '—'}</td>
                      <td className="px-4 py-3">
                        <DeviceCell row={a} />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-gray-500">
              {(page - 1) * PAGE_SIZE + 1}-{Math.min(page * PAGE_SIZE, filtered.length)} nga {filtered.length} hyrje
              {data && data.total > allItems.length ? (
                <span className="text-gray-400"> · shfaqen {allItems.length} më të fundit</span>
              ) : null}
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
    </div>
  )
}
