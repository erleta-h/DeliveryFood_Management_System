import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { AdminIcon } from '../components/admin/adminIcons'
import { AdminStatCardsSkeleton, AdminTableSkeleton } from '../components/admin/AdminSkeleton'
import {
  authenticatedDownloadFile,
  fetchAdminDashboard,
  fetchAdminOrders,
  fetchOperationsReport,
  operationsReportExportUrl,
  type AdminDashboardData,
  type AdminOrderRow,
  type OperationsReport,
} from '../lib/adminApi'
import {
  adminErrorBanner,
  adminFilterBtn,
  customerBtnGhost,
  customerField,
  customerPanelSubtitle,
} from '../lib/adminTheme'
import { formatOrderStatus } from '../lib/orderStatusLabels'
import { useAuthStore } from '../store/authStore'

type QuickRange = 'today' | '7d' | '30d' | 'month' | 'year'

type TrendInfo = { text: string; positive: boolean } | null

function fmtMoney(n: number) {
  return new Intl.NumberFormat('sq-XK', { style: 'currency', currency: 'EUR' }).format(n)
}

function utcDateOnly(d: Date) {
  return d.toISOString().slice(0, 10)
}

function startOfUtcDay(d: Date) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
}

function quickRangeDates(range: QuickRange): { from: string; to: string } {
  const now = new Date()
  const to = utcDateOnly(now)
  const start = startOfUtcDay(now)

  if (range === 'today') return { from: to, to }
  if (range === '7d') {
    const f = new Date(start)
    f.setUTCDate(f.getUTCDate() - 6)
    return { from: utcDateOnly(f), to }
  }
  if (range === '30d') {
    const f = new Date(start)
    f.setUTCDate(f.getUTCDate() - 29)
    return { from: utcDateOnly(f), to }
  }
  if (range === 'month') {
    const f = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
    return { from: utcDateOnly(f), to }
  }
  const f = new Date(Date.UTC(now.getUTCFullYear(), 0, 1))
  return { from: utcDateOnly(f), to }
}

function toUtcIso(date: string, end = false) {
  return end ? `${date}T23:59:59.999Z` : `${date}T00:00:00.000Z`
}

function previousPeriod(from: string, to: string): { from: string; to: string } {
  const f = new Date(`${from}T00:00:00.000Z`)
  const t = new Date(`${to}T00:00:00.000Z`)
  const days = Math.max(1, Math.round((t.getTime() - f.getTime()) / 86400000) + 1)
  const prevEnd = new Date(f)
  prevEnd.setUTCDate(prevEnd.getUTCDate() - 1)
  const prevStart = new Date(prevEnd)
  prevStart.setUTCDate(prevStart.getUTCDate() - (days - 1))
  return { from: utcDateOnly(prevStart), to: utcDateOnly(prevEnd) }
}

function computeTrend(current: number, previous: number, label = 'nga periudha e mëparshme'): TrendInfo {
  if (previous === 0 && current === 0) return { text: `0% ${label}`, positive: true }
  if (previous === 0) return { text: `↑ ${label}`, positive: true }
  const pct = Math.round(((current - previous) / previous) * 1000) / 10
  const sign = pct >= 0 ? '↑' : '↓'
  return { text: `${sign} ${Math.abs(pct)}% ${label}`, positive: pct >= 0 }
}

function yesterdayUtcRange() {
  const d = startOfUtcDay(new Date())
  d.setUTCDate(d.getUTCDate() - 1)
  const y = utcDateOnly(d)
  return { fromUtc: toUtcIso(y), toUtc: toUtcIso(y, true) }
}

function priorWeekUtcRange() {
  const end = startOfUtcDay(new Date())
  end.setUTCDate(end.getUTCDate() - 7)
  const start = new Date(end)
  start.setUTCDate(start.getUTCDate() - 6)
  return { fromUtc: toUtcIso(utcDateOnly(start)), toUtc: toUtcIso(utcDateOnly(end), true) }
}

function priorMonthUtcRange() {
  const now = new Date()
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1))
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 0))
  return { fromUtc: toUtcIso(utcDateOnly(start)), toUtc: toUtcIso(utcDateOnly(end), true) }
}

async function fetchOrdersInRange(
  token: string,
  fromUtc: string,
  toUtc: string,
): Promise<AdminOrderRow[]> {
  const all: AdminOrderRow[] = []
  let page = 1
  const pageSize = 100
  while (page <= 50) {
    const r = await fetchAdminOrders(token, { fromUtc, toUtc, page, pageSize })
    all.push(...r.items)
    if (all.length >= r.totalCount || r.items.length === 0) break
    page++
  }
  return all
}

function KpiCard({
  label,
  value,
  trend,
  icon,
  tone,
}: {
  label: string
  value: string | number
  trend?: TrendInfo
  icon: ReactNode
  tone: string
}) {
  return (
    <div className="rounded-xl border border-gray-200/90 bg-white p-4 shadow-sm ring-1 ring-black/[0.02]">
      <div className="flex items-start gap-3">
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${tone}`}>{icon}</div>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">{label}</p>
          <p className="mt-0.5 text-2xl font-bold tabular-nums tracking-tight text-gray-900">{value}</p>
          {trend ? (
            <p className={`mt-0.5 text-xs ${trend.positive ? 'text-emerald-600' : 'text-red-600'}`}>{trend.text}</p>
          ) : (
            <p className="mt-0.5 text-xs text-gray-300">—</p>
          )}
        </div>
      </div>
    </div>
  )
}

function ReportCard({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) {
  return (
    <section className="flex h-full flex-col rounded-xl border border-gray-200/90 bg-white p-4 shadow-sm ring-1 ring-black/[0.02] sm:p-5">
      <div className="mb-4 flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
        {action}
      </div>
      <div className="min-h-0 flex-1">{children}</div>
    </section>
  )
}

function EmptyChartState({ message }: { message: string }) {
  return (
    <div className="flex h-56 items-center justify-center rounded-lg border border-dashed border-gray-200 bg-gray-50/80 px-4 text-center text-sm text-gray-500">
      {message}
    </div>
  )
}

const STATUS_COLORS: Record<number, string> = {
  0: '#3b82f6',
  1: '#8b5cf6',
  2: '#f97316',
  3: '#06b6d4',
  4: '#7c3aed',
  5: '#64748b',
  9: '#ef4444',
}

function RevenueLineChart({ points }: { points: { label: string; value: number }[] }) {
  if (points.length === 0) {
    return <EmptyChartState message="Të dhënat nuk janë të disponueshme ende." />
  }

  const w = 640
  const h = 220
  const pad = { t: 16, r: 16, b: 32, l: 48 }
  const innerW = w - pad.l - pad.r
  const innerH = h - pad.t - pad.b
  const max = Math.max(...points.map((p) => p.value), 1)

  const coords = points.map((p, i) => {
    const x = pad.l + (points.length === 1 ? innerW / 2 : (i / (points.length - 1)) * innerW)
    const y = pad.t + innerH - (p.value / max) * innerH
    return { x, y, ...p }
  })

  const line = coords.map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x} ${c.y}`).join(' ')
  const area = `${line} L ${coords[coords.length - 1].x} ${pad.t + innerH} L ${coords[0].x} ${pad.t + innerH} Z`

  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((t) => ({
    y: pad.t + innerH - t * innerH,
    label: fmtMoney(max * t),
  }))

  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${w} ${h}`} className="h-56 w-full min-w-[320px]" role="img" aria-label="Grafiku i të ardhurave">
        <defs>
          <linearGradient id="revFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.02" />
          </linearGradient>
        </defs>
        {yTicks.map((t) => (
          <g key={t.label}>
            <line x1={pad.l} y1={t.y} x2={w - pad.r} y2={t.y} stroke="#e5e7eb" strokeWidth="1" />
            <text x={pad.l - 6} y={t.y + 4} textAnchor="end" className="fill-gray-400 text-[9px]">
              {t.label}
            </text>
          </g>
        ))}
        <path d={area} fill="url(#revFill)" />
        <path d={line} fill="none" stroke="#7c3aed" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
        {coords.map((c) => (
          <circle key={c.label} cx={c.x} cy={c.y} r="3" fill="#7c3aed" />
        ))}
        {coords.filter((_, i) => i % Math.ceil(points.length / 6) === 0 || points.length <= 6).map((c) => (
          <text key={`lbl-${c.label}`} x={c.x} y={h - 8} textAnchor="middle" className="fill-gray-500 text-[9px]">
            {c.label}
          </text>
        ))}
      </svg>
    </div>
  )
}

function StatusDonutChart({ slices }: { slices: { status: number; count: number; label: string }[] }) {
  const total = slices.reduce((s, x) => s + x.count, 0)
  if (total === 0) {
    return <EmptyChartState message="Të dhënat nuk janë të disponueshme ende." />
  }

  let angle = -90
  const r = 54
  const cx = 80
  const cy = 80
  const paths = slices.map((s) => {
    const sweep = (s.count / total) * 360
    const start = angle
    angle += sweep
    const x1 = cx + r * Math.cos((Math.PI * start) / 180)
    const y1 = cy + r * Math.sin((Math.PI * start) / 180)
    const x2 = cx + r * Math.cos((Math.PI * (start + sweep)) / 180)
    const y2 = cy + r * Math.sin((Math.PI * (start + sweep)) / 180)
    const large = sweep > 180 ? 1 : 0
    const d = `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`
    return { ...s, d, color: STATUS_COLORS[s.status] ?? '#94a3b8' }
  })

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
      <div className="relative mx-auto shrink-0 sm:mx-0">
        <svg width="160" height="160" viewBox="0 0 160 160" role="img" aria-label="Porosi sipas statusit">
          {paths.map((p) => (
            <path key={p.status} d={p.d} fill={p.color} />
          ))}
          <circle cx={cx} cy={cy} r="34" fill="white" />
          <text x={cx} y={cy - 4} textAnchor="middle" className="fill-gray-900 text-[14px] font-bold">
            {total}
          </text>
          <text x={cx} y={cy + 12} textAnchor="middle" className="fill-gray-500 text-[9px]">
            Total
          </text>
        </svg>
      </div>
      <ul className="min-w-0 flex-1 space-y-2">
        {paths.map((p) => (
          <li key={p.status} className="flex items-center justify-between gap-2 text-xs">
            <div className="flex min-w-0 items-center gap-2">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: p.color }} />
              <span className="truncate text-gray-700">{p.label}</span>
            </div>
            <span className="shrink-0 tabular-nums text-gray-500">
              {p.count}{' '}
              <span className="text-gray-400">({Math.round((p.count / total) * 1000) / 10}%)</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function OpsMetricCard({
  label,
  value,
  trend,
  icon,
  tone,
}: {
  label: string
  value: string | number
  trend?: TrendInfo
  icon: ReactNode
  tone: string
}) {
  return (
    <div className="rounded-xl border border-gray-200/90 bg-white p-3.5 shadow-sm ring-1 ring-black/[0.02]">
      <div className="flex items-center gap-2.5">
        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${tone}`}>{icon}</div>
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">{label}</p>
          <p className="text-lg font-bold tabular-nums text-gray-900">{value}</p>
          {trend ? (
            <p className={`text-[11px] ${trend.positive ? 'text-emerald-600' : 'text-red-600'}`}>{trend.text}</p>
          ) : null}
        </div>
      </div>
    </div>
  )
}

export default function AdminReportsPage() {
  const token = useAuthStore((s) => s.token)
  const [dash, setDash] = useState<AdminDashboardData | null>(null)
  const [ops, setOps] = useState<OperationsReport | null>(null)
  const [prevOps, setPrevOps] = useState<OperationsReport | null>(null)
  const [kpiTrends, setKpiTrends] = useState<{
    today: TrendInfo
    week: TrendInfo
    month: TrendInfo
    revenue: TrendInfo
  }>({ today: null, week: null, month: null, revenue: null })
  const [chartOrders, setChartOrders] = useState<AdminOrderRow[]>([])
  const [quickRange, setQuickRange] = useState<QuickRange | null>('30d')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [dashError, setDashError] = useState<string | null>(null)
  const [opsError, setOpsError] = useState<string | null>(null)
  const [chartError, setChartError] = useState<string | null>(null)
  const [loadingDash, setLoadingDash] = useState(true)
  const [loadingOps, setLoadingOps] = useState(false)
  const [loadingCharts, setLoadingCharts] = useState(false)
  const [exportOpen, setExportOpen] = useState(false)
  const [exportMsg, setExportMsg] = useState<string | null>(null)
  const exportRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const { from, to } = quickRangeDates('30d')
    setFromDate(from)
    setToDate(to)
  }, [])

  useEffect(() => {
    if (!exportOpen) return
    function onDoc(e: MouseEvent) {
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) setExportOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [exportOpen])

  useEffect(() => {
    if (!token) {
      setLoadingDash(false)
      return
    }
    let c = false
    setLoadingDash(true)
    setDashError(null)
    void fetchAdminDashboard(token)
      .then(async (d) => {
        if (c) return
        setDash(d)
        const [yOps, pwOps, pmOps] = await Promise.all([
          fetchOperationsReport(token, yesterdayUtcRange()),
          fetchOperationsReport(token, priorWeekUtcRange()),
          fetchOperationsReport(token, priorMonthUtcRange()),
        ])
        if (c) return
        setKpiTrends({
          today: computeTrend(d.ordersToday, yOps.orderCount, 'nga dje'),
          week: computeTrend(d.ordersThisWeek, pwOps.orderCount, 'nga java e kaluar'),
          month: computeTrend(d.ordersThisMonth, pmOps.orderCount, 'nga muaji i kaluar'),
          revenue: computeTrend(d.revenueThisMonth, pmOps.orderTotalSum, 'nga muaji i kaluar'),
        })
      })
      .catch((e: unknown) => {
        if (!c) setDashError(e instanceof Error ? e.message : 'Gabim.')
      })
      .finally(() => {
        if (!c) setLoadingDash(false)
      })
    return () => {
      c = true
    }
  }, [token])

  const loadOps = useCallback(async () => {
    if (!token) return
    setOpsError(null)
    setLoadingOps(true)
    try {
      const q: { fromUtc?: string; toUtc?: string } = {}
      if (fromDate) q.fromUtc = toUtcIso(fromDate)
      if (toDate) q.toUtc = toUtcIso(toDate, true)
      const r = await fetchOperationsReport(token, q)
      setOps(r)
      if (fromDate && toDate) {
        const prev = previousPeriod(fromDate, toDate)
        const prevReport = await fetchOperationsReport(token, {
          fromUtc: toUtcIso(prev.from),
          toUtc: toUtcIso(prev.to, true),
        })
        setPrevOps(prevReport)
      } else {
        setPrevOps(null)
      }
    } catch (e: unknown) {
      setOpsError(e instanceof Error ? e.message : 'Gabim.')
      setOps(null)
      setPrevOps(null)
    } finally {
      setLoadingOps(false)
    }
  }, [token, fromDate, toDate])

  const loadCharts = useCallback(async () => {
    if (!token || !fromDate || !toDate) {
      setChartOrders([])
      return
    }
    setChartError(null)
    setLoadingCharts(true)
    try {
      const orders = await fetchOrdersInRange(token, toUtcIso(fromDate), toUtcIso(toDate, true))
      setChartOrders(orders)
    } catch (e: unknown) {
      setChartError(e instanceof Error ? e.message : 'Gabim.')
      setChartOrders([])
    } finally {
      setLoadingCharts(false)
    }
  }, [token, fromDate, toDate])

  useEffect(() => {
    if (!token) return
    void loadOps()
  }, [token, loadOps])

  useEffect(() => {
    if (!token) return
    void loadCharts()
  }, [token, loadCharts])

  function applyQuickRange(range: QuickRange) {
    setQuickRange(range)
    const { from, to } = quickRangeDates(range)
    setFromDate(from)
    setToDate(to)
  }

  async function onExport(format: 'csv' | 'json' | 'xlsx') {
    if (!token) return
    setExportOpen(false)
    setExportMsg(null)
    const q: { fromUtc?: string; toUtc?: string } = {}
    if (fromDate) q.fromUtc = toUtcIso(fromDate)
    if (toDate) q.toUtc = toUtcIso(toDate, true)
    try {
      await authenticatedDownloadFile(
        token,
        operationsReportExportUrl(format, q),
        `operations-report.${format === 'xlsx' ? 'xlsx' : format}`,
      )
    } catch (e: unknown) {
      setExportMsg(e instanceof Error ? e.message : 'Eksporti dështoi.')
    }
  }

  const revenuePoints = useMemo(() => {
    const byDay = new Map<string, number>()
    for (const o of chartOrders) {
      const day = o.placedAtUtc.slice(0, 10)
      byDay.set(day, (byDay.get(day) ?? 0) + o.total)
    }
    return [...byDay.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([day, value]) => ({
        label: day.slice(8) + '/' + day.slice(5, 7),
        value,
      }))
  }, [chartOrders])

  const statusSlices = useMemo(() => {
    const counts = new Map<number, number>()
    for (const o of chartOrders) {
      counts.set(o.status, (counts.get(o.status) ?? 0) + 1)
    }
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([status, count]) => ({ status, count, label: formatOrderStatus(status) }))
  }, [chartOrders])

  const topRestaurants = useMemo(() => {
    const map = new Map<string, { orders: number; revenue: number }>()
    for (const o of chartOrders) {
      const cur = map.get(o.restaurantName) ?? { orders: 0, revenue: 0 }
      map.set(o.restaurantName, { orders: cur.orders + 1, revenue: cur.revenue + o.total })
    }
    const fromOrders = [...map.entries()]
      .map(([name, v]) => ({ name, ...v }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5)

    if (fromOrders.length > 0) return fromOrders

    if (dash?.topRestaurantsThisMonth.length) {
      return dash.topRestaurantsThisMonth.map((r) => ({
        name: r.name,
        orders: r.orderCount,
        revenue: 0,
      }))
    }
    return []
  }, [chartOrders, dash])

  const chartRangeLabel = useMemo(() => {
    if (quickRange === 'today') return 'sot'
    if (quickRange === '7d') return '7 ditët e fundit'
    if (quickRange === '30d') return '30 ditët e fundit'
    if (quickRange === 'month') return 'këtë muaj'
    if (quickRange === 'year') return 'këtë vit'
    if (fromDate && toDate) return `${fromDate} – ${toDate}`
    return 'intervali i zgjedhur'
  }, [quickRange, fromDate, toDate])

  const opsTrends = useMemo(() => {
    if (!ops || !prevOps) return null
    return {
      orders: computeTrend(ops.orderCount, prevOps.orderCount),
      sum: computeTrend(ops.orderTotalSum, prevOps.orderTotalSum),
      restaurants: computeTrend(ops.activeRestaurantCount, prevOps.activeRestaurantCount),
      customers: computeTrend(ops.customerRoleUserCount, prevOps.customerRoleUserCount),
      tickets: computeTrend(ops.openSupportTickets, prevOps.openSupportTickets),
      coupons: computeTrend(ops.couponCountActive, prevOps.couponCountActive),
    }
  }, [ops, prevOps])

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-gray-900 sm:text-2xl">Raporte</h1>
          <p className={customerPanelSubtitle}>
            Përmbledhje dashboard; raport operacional me filtra data (UTC) dhe eksport CSV / JSON / Excel.
          </p>
        </div>
        <div className="relative shrink-0" ref={exportRef}>
          <button
            type="button"
            className={customerBtnGhost + ' inline-flex items-center gap-2'}
            onClick={() => setExportOpen((o) => !o)}
            aria-expanded={exportOpen}
          >
            Eksporto
            <span className="text-gray-400" aria-hidden>
              ▼
            </span>
          </button>
          {exportOpen ? (
            <div className="absolute right-0 z-20 mt-1 min-w-[9rem] rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
              {(['csv', 'json', 'xlsx'] as const).map((fmt) => (
                <button
                  key={fmt}
                  type="button"
                  className="block w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                  onClick={() => void onExport(fmt)}
                >
                  {fmt === 'xlsx' ? 'Excel' : fmt.toUpperCase()}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      {dashError ? <p className={adminErrorBanner}>Dashboard: {dashError}</p> : null}
      {exportMsg ? <p className="text-sm text-amber-700">{exportMsg}</p> : null}

      {loadingDash ? (
        <AdminStatCardsSkeleton count={5} />
      ) : dash ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          <KpiCard
            label="Porosi Sot"
            value={dash.ordersToday}
            trend={kpiTrends.today}
            tone="bg-violet-50 text-violet-600"
            icon={<AdminIcon name="orders" size={18} />}
          />
          <KpiCard
            label="Porosi (7 Ditë)"
            value={dash.ordersThisWeek}
            trend={kpiTrends.week}
            tone="bg-sky-50 text-sky-600"
            icon={
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <rect x="3" y="3" width="7" height="7" />
                <rect x="14" y="3" width="7" height="7" />
                <rect x="3" y="14" width="7" height="7" />
                <rect x="14" y="14" width="7" height="7" />
              </svg>
            }
          />
          <KpiCard
            label="Porosi (Muaj)"
            value={dash.ordersThisMonth}
            trend={kpiTrends.month}
            tone="bg-emerald-50 text-emerald-600"
            icon={
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" />
              </svg>
            }
          />
          <KpiCard
            label="Të Ardhura (Muaj)"
            value={fmtMoney(dash.revenueThisMonth)}
            trend={kpiTrends.revenue}
            tone="bg-amber-50 text-amber-600"
            icon={<AdminIcon name="finance" size={18} />}
          />
          <KpiCard
            label="Restorante Aktive"
            value={dash.activeRestaurants}
            tone="bg-fuchsia-50 text-fuchsia-600"
            icon={<AdminIcon name="restaurant" size={18} />}
          />
        </div>
      ) : null}

      <section className="rounded-xl border border-gray-200/90 bg-white p-4 shadow-sm ring-1 ring-black/[0.02] sm:p-5">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-wrap gap-2">
            {(
              [
                ['today', 'Sot'],
                ['7d', '7 ditë'],
                ['30d', '30 ditë'],
                ['month', 'Ky muaj'],
                ['year', 'Viti'],
              ] as const
            ).map(([id, label]) => (
              <button key={id} type="button" className={adminFilterBtn(quickRange === id)} onClick={() => applyQuickRange(id)}>
                {label}
              </button>
            ))}
          </div>
          <label className="block text-xs font-medium text-gray-500">
            Nga (UTC)
            <input
              type="date"
              value={fromDate}
              onChange={(e) => {
                setQuickRange(null)
                setFromDate(e.target.value)
              }}
              className={customerField}
            />
          </label>
          <label className="block text-xs font-medium text-gray-500">
            Deri (UTC)
            <input
              type="date"
              value={toDate}
              onChange={(e) => {
                setQuickRange(null)
                setToDate(e.target.value)
              }}
              className={customerField}
            />
          </label>
          <button
            type="button"
            className={customerBtnGhost + ' whitespace-nowrap'}
            onClick={() => {
              void loadOps()
              void loadCharts()
            }}
          >
            ↻ Rifresko
          </button>
        </div>
      </section>

      {opsError ? <p className={adminErrorBanner}>Raport operacional: {opsError}</p> : null}
      {chartError ? <p className={adminErrorBanner}>Grafikët: {chartError}</p> : null}

      <div className="grid gap-4 xl:grid-cols-12">
        <div className="xl:col-span-6">
          <ReportCard title={`Të ardhurat (${chartRangeLabel})`}>
            {loadingCharts ? (
              <div className="flex h-56 items-center justify-center text-sm text-gray-500">Duke ngarkuar…</div>
            ) : (
              <RevenueLineChart points={revenuePoints} />
            )}
          </ReportCard>
        </div>
        <div className="xl:col-span-3">
          <ReportCard title="Porosi sipas statusit">
            {loadingCharts ? (
              <div className="flex h-56 items-center justify-center text-sm text-gray-500">Duke ngarkuar…</div>
            ) : (
              <StatusDonutChart slices={statusSlices} />
            )}
          </ReportCard>
        </div>
        <div className="xl:col-span-3">
          <ReportCard
            title="Top 5 Restorantet"
            action={
              <Link to="/admin/restaurants" className="text-xs font-medium text-violet-600 hover:underline">
                Shiko të gjitha
              </Link>
            }
          >
            {loadingCharts && !dash ? (
              <AdminTableSkeleton rows={5} />
            ) : topRestaurants.length === 0 ? (
              <EmptyChartState message="Të dhënat nuk janë të disponueshme ende." />
            ) : (
              <ul className="space-y-1">
                {topRestaurants.map((r, i) => (
                  <li key={r.name} className="flex items-center justify-between gap-2 rounded-lg px-1 py-2 hover:bg-gray-50">
                    <div className="flex min-w-0 items-center gap-2.5">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-violet-100 text-[10px] font-bold text-violet-700">
                        {i + 1}
                      </span>
                      <span className="truncate text-sm text-gray-800">{r.name}</span>
                    </div>
                    <span className="shrink-0 text-sm tabular-nums font-medium text-gray-700">
                      {r.revenue > 0 ? fmtMoney(r.revenue) : `${r.orders} porosi`}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </ReportCard>
        </div>
      </div>

      <div>
        <h2 className="mb-3 text-sm font-semibold text-gray-900">Përmbledhje operacionale</h2>
        {loadingOps ? (
          <AdminStatCardsSkeleton count={6} />
        ) : ops ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            <OpsMetricCard
              label="Porosi (interval)"
              value={ops.orderCount}
              trend={opsTrends?.orders ?? null}
              tone="bg-violet-50 text-violet-600"
              icon={<AdminIcon name="orders" size={16} />}
            />
            <OpsMetricCard
              label="Shuma porosive"
              value={fmtMoney(ops.orderTotalSum)}
              trend={opsTrends?.sum ?? null}
              tone="bg-amber-50 text-amber-600"
              icon={<AdminIcon name="finance" size={16} />}
            />
            <OpsMetricCard
              label="Restorante aktive"
              value={ops.activeRestaurantCount}
              trend={opsTrends?.restaurants ?? null}
              tone="bg-fuchsia-50 text-fuchsia-600"
              icon={<AdminIcon name="restaurant" size={16} />}
            />
            <OpsMetricCard
              label="Klientë (roli)"
              value={ops.customerRoleUserCount}
              trend={opsTrends?.customers ?? null}
              tone="bg-sky-50 text-sky-600"
              icon={<AdminIcon name="users" size={16} />}
            />
            <OpsMetricCard
              label="Tiketa të hapura"
              value={ops.openSupportTickets}
              trend={opsTrends?.tickets ?? null}
              tone="bg-emerald-50 text-emerald-600"
              icon={<AdminIcon name="support" size={16} />}
            />
            <OpsMetricCard
              label="Kupona aktive"
              value={ops.couponCountActive}
              trend={opsTrends?.coupons ?? null}
              tone="bg-pink-50 text-pink-600"
              icon={<AdminIcon name="promotions" size={16} />}
            />
          </div>
        ) : (
          <EmptyChartState message="Të dhënat nuk janë të disponueshme ende." />
        )}
      </div>
    </div>
  )
}
