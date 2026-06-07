import { type ReactNode, useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { AdminIcon } from '../components/admin/adminIcons'
import { AdminPageShell } from '../components/admin/AdminPageShell'
import { AdminStatCardsSkeleton, AdminTableSkeleton } from '../components/admin/AdminSkeleton'
import {
  fetchAdminDashboard,
  fetchAdminOrders,
  type AdminDashboardData,
  type AdminOrderRow,
} from '../lib/adminApi'
import { formatOrderStatus } from '../lib/orderStatusLabels'
import { useAuthStore } from '../store/authStore'

type DateRange = 'today' | 'week' | 'month'

function formatMoney(n: number) {
  return new Intl.NumberFormat('sq-XK', { style: 'currency', currency: 'EUR' }).format(n)
}

function formatDateTime(iso: string) {
  try {
    return new Intl.DateTimeFormat('sq-AL', {
      dateStyle: 'short',
      timeStyle: 'short',
      timeZone: 'UTC',
    }).format(new Date(iso))
  } catch {
    return iso
  }
}

function DashboardCard({
  title,
  children,
  className = '',
  action,
}: {
  title: string
  children: ReactNode
  className?: string
  action?: ReactNode
}) {
  return (
    <section
      className={`rounded-2xl border border-gray-200/90 bg-white p-5 shadow-sm sm:p-6 ${className}`}
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  )
}

function KpiCard({
  label,
  value,
  trend,
  icon,
  href,
}: {
  label: string
  value: string | number
  trend?: string
  icon: ReactNode
  href?: string
}) {
  const inner = (
    <div className="rounded-xl border border-gray-200/90 bg-white p-4 shadow-sm transition hover:border-violet-200 hover:shadow-md">
      <div className="flex items-start justify-between gap-2">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-50 text-violet-600">
          {icon}
        </div>
      </div>
      <p className="mt-3 text-[11px] font-semibold uppercase tracking-wide text-gray-500">{label}</p>
      <p className="mt-1 text-2xl font-bold tabular-nums tracking-tight text-gray-900">{value}</p>
      {trend ? <p className="mt-1 text-xs text-gray-500">{trend}</p> : null}
    </div>
  )
  if (href) {
    return (
      <Link to={href} className="block rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500">
        {inner}
      </Link>
    )
  }
  return inner
}

function DateRangeChips({
  value,
  onChange,
}: {
  value: DateRange
  onChange: (v: DateRange) => void
}) {
  const chips: { id: DateRange; label: string }[] = [
    { id: 'today', label: 'Sot' },
    { id: 'week', label: '7 ditë' },
    { id: 'month', label: '30 ditë' },
  ]
  return (
    <div className="flex flex-wrap gap-1.5">
      {chips.map((c) => (
        <button
          key={c.id}
          type="button"
          onClick={() => onChange(c.id)}
          className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
            value === c.id
              ? 'border-violet-300 bg-violet-600 text-white shadow-sm'
              : 'border-gray-200 bg-white text-gray-600 hover:border-violet-200 hover:text-violet-700'
          }`}
        >
          {c.label}
        </button>
      ))}
    </div>
  )
}

function OrdersChart({ data, range }: { data: AdminDashboardData; range: DateRange }) {
  const bars = useMemo(() => {
    if (range === 'today') {
      const hours = [...data.busiestHoursToday].sort((a, b) => a.hourUtc - b.hourUtc).slice(0, 8)
      if (hours.length === 0) return []
      const max = Math.max(...hours.map((h) => h.orderCount), 1)
      return hours.map((h) => ({
        label: `${String(h.hourUtc).padStart(2, '0')}:00`,
        value: h.orderCount,
        pct: (h.orderCount / max) * 100,
      }))
    }
    if (range === 'week') {
      const labels = ['Hën', 'Mar', 'Mër', 'Enj', 'Pre', 'Sht', 'Die']
      const total = data.ordersThisWeek
      const perDay = total > 0 ? total / 7 : 0
      return labels.map((label) => ({
        label,
        value: Math.round(perDay),
        pct: total > 0 ? Math.max(12, (perDay / Math.max(total, 1)) * 100 * 3) : 8,
      }))
    }
    const labels = ['J1', 'J2', 'J3', 'J4']
    const total = data.ordersThisMonth
    const perWeek = total > 0 ? total / 4 : 0
    return labels.map((label) => ({
      label,
      value: Math.round(perWeek),
      pct: total > 0 ? Math.max(12, (perWeek / Math.max(total, 1)) * 100 * 3) : 8,
    }))
  }, [data, range])

  const chartTitle =
    range === 'today'
      ? 'Porosi sipas orës (UTC sot)'
      : range === 'week'
        ? 'Porosi këtë javë (përmbledhje)'
        : 'Porosi këtë muaj (përmbledhje)'

  if (bars.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center rounded-xl border border-dashed border-gray-200 bg-gray-50/80 text-sm text-gray-500">
        Nuk ka të dhëna për këtë periudhë.
      </div>
    )
  }

  return (
    <div>
      <p className="mb-4 text-xs text-gray-500">{chartTitle}</p>
      <div className="flex h-48 items-end gap-2 sm:gap-3">
        {bars.map((b) => (
          <div key={b.label} className="flex min-w-0 flex-1 flex-col items-center gap-2">
            <span className="text-[10px] font-medium tabular-nums text-gray-500">{b.value}</span>
            <div className="flex w-full flex-1 items-end">
              <div
                className="w-full rounded-t-md bg-gradient-to-t from-violet-600 to-violet-400 transition-all"
                style={{ height: `${Math.max(8, b.pct)}%` }}
                title={`${b.label}: ${b.value}`}
              />
            </div>
            <span className="truncate text-[10px] font-medium text-gray-600">{b.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function QuickActionButton({ to, icon, children }: { to: string; icon: ReactNode; children: ReactNode }) {
  return (
    <Link
      to={to}
      className="flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50/80 px-4 py-3 text-sm font-medium text-gray-800 transition hover:border-violet-200 hover:bg-violet-50/60 hover:text-violet-900"
    >
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-violet-600 shadow-sm">
        {icon}
      </span>
      <span>{children}</span>
    </Link>
  )
}

function StatusBadge({ status }: { status: number }) {
  const tone =
    status === 4
      ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
      : status === 9
        ? 'bg-red-50 text-red-700 ring-red-200'
        : 'bg-violet-50 text-violet-700 ring-violet-200'
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${tone}`}>
      {formatOrderStatus(status)}
    </span>
  )
}

export default function AdminDashboardPage() {
  const token = useAuthStore((s) => s.token)
  const [data, setData] = useState<AdminDashboardData | null>(null)
  const [recentOrders, setRecentOrders] = useState<AdminOrderRow[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [ordersLoading, setOrdersLoading] = useState(true)
  const [range, setRange] = useState<DateRange>('today')

  const load = useCallback(async () => {
    if (!token) return
    setError(null)
    const d = await fetchAdminDashboard(token)
    setData(d)
  }, [token])

  const loadRecentOrders = useCallback(async () => {
    if (!token) return
    const r = await fetchAdminOrders(token, { page: 1, pageSize: 8 })
    setRecentOrders(r.items)
  }, [token])

  useEffect(() => {
    if (!token) {
      setLoading(false)
      setOrdersLoading(false)
      return
    }
    let c = false
    setLoading(true)
    setOrdersLoading(true)
    void load()
      .catch((e: unknown) => {
        if (!c) setError(e instanceof Error ? e.message : 'Gabim.')
      })
      .finally(() => {
        if (!c) setLoading(false)
      })
    void loadRecentOrders()
      .catch(() => {
        if (!c) setRecentOrders([])
      })
      .finally(() => {
        if (!c) setOrdersLoading(false)
      })
    return () => {
      c = true
    }
  }, [token, load, loadRecentOrders])

  if (!token) return null

  const pendingApps =
    (data?.pendingPartnerApplications ?? 0) + (data?.pendingDriverApplications ?? 0)

  const revenueTrend =
    range === 'today'
      ? `Java: ${formatMoney(data?.revenueThisWeek ?? 0)} · Muaji: ${formatMoney(data?.revenueThisMonth ?? 0)}`
      : range === 'week'
        ? `Periudha e zgjedhur: 7 ditë · ${formatMoney(data?.revenueThisWeek ?? 0)}`
        : `Periudha e zgjedhur: 30 ditë · ${formatMoney(data?.revenueThisMonth ?? 0)}`

  const ordersTrend =
    range === 'today'
      ? `Java: ${data?.ordersThisWeek ?? 0} · Muaji: ${data?.ordersThisMonth ?? 0}`
      : range === 'week'
        ? `7 ditë: ${data?.ordersThisWeek ?? 0} porosi`
        : `30 ditë: ${data?.ordersThisMonth ?? 0} porosi`

  return (
    <AdminPageShell
      title="Platform Overview"
      intro="Përmbledhje e operacioneve, porosive dhe të ardhurave."
      filters={<DateRangeChips value={range} onChange={setRange} />}
      fill
    >
      <div className="space-y-6">
        {error ? (
          <div
            className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
            role="alert"
          >
            {error}
          </div>
        ) : null}

        {loading ? (
          <AdminStatCardsSkeleton count={6} />
        ) : data ? (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
              <KpiCard
                label="Të ardhura sot"
                value={formatMoney(data.revenueToday)}
                trend={revenueTrend}
                icon={<AdminIcon name="finance" size={18} />}
                href="/admin/finance"
              />
              <KpiCard
                label="Porosi sot"
                value={data.ordersToday}
                trend={ordersTrend}
                icon={<AdminIcon name="orders" size={18} />}
                href="/admin/orders"
              />
              <KpiCard
                label="Porosi totale"
                value={data.totalOrders}
                trend="Gjithë platforma"
                icon={<AdminIcon name="orders" size={18} />}
                href="/admin/orders"
              />
              <KpiCard
                label="Restorante aktive"
                value={data.activeRestaurants}
                trend={`${data.ordersThisMonth} porosi këtë muaj`}
                icon={<AdminIcon name="restaurant" size={18} />}
                href="/admin/restaurants"
              />
              <KpiCard
                label="Delivera aktivë"
                value={data.activeDrivers}
                trend={`${data.ordersToday} porosi sot`}
                icon={<AdminIcon name="riders" size={18} />}
                href="/admin/riders"
              />
              <KpiCard
                label="Aplikime në pritje"
                value={pendingApps}
                trend={
                  pendingApps > 0
                    ? `${data.pendingPartnerApplications} partner · ${data.pendingDriverApplications} deliver`
                    : 'Asnjë në pritje'
                }
                icon={<AdminIcon name="partner" size={18} />}
                href="/admin/partner-applications"
              />
            </div>

            <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
              <DashboardCard title="Porositë këtë javë">
                <OrdersChart data={data} range={range} />
                <p className="mt-4 text-xs text-gray-500">
                  UTC · Raporte të plota në{' '}
                  <Link to="/admin/reports" className="font-medium text-violet-600 hover:underline">
                    Raporte
                  </Link>
                </p>
              </DashboardCard>

              <DashboardCard title="Aksione të shpejta">
                <div className="grid gap-2.5">
                  <QuickActionButton to="/admin/partner-applications" icon={<AdminIcon name="partner" size={16} />}>
                    Shiko aplikimet partner
                  </QuickActionButton>
                  <QuickActionButton to="/admin/driver-applications" icon={<AdminIcon name="driver" size={16} />}>
                    Shiko aplikimet deliver
                  </QuickActionButton>
                  <QuickActionButton to="/admin/zones" icon={<AdminIcon name="zones" size={16} />}>
                    Menaxho tarifat
                  </QuickActionButton>
                  <QuickActionButton to="/admin/reports" icon={<AdminIcon name="reports" size={16} />}>
                    Eksporto raportin
                  </QuickActionButton>
                </div>
              </DashboardCard>
            </div>

            <DashboardCard
              title="Porositë e fundit"
              action={
                <Link to="/admin/orders" className="text-xs font-medium text-violet-600 hover:underline">
                  Shiko të gjitha →
                </Link>
              }
            >
              {ordersLoading ? (
                <AdminTableSkeleton rows={5} />
              ) : recentOrders.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 bg-gray-50/60 px-6 py-14 text-center">
                  <AdminIcon name="orders" size={28} className="text-gray-300" />
                  <p className="mt-3 text-sm font-medium text-gray-700">Nuk ka porosi të regjistruara</p>
                  <p className="mt-1 text-xs text-gray-500">
                    Porositë e reja do të shfaqen këtu automatikisht.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-gray-200 text-xs font-semibold uppercase tracking-wide text-gray-500">
                        <th className="px-3 py-3">Order ID</th>
                        <th className="px-3 py-3">Klienti</th>
                        <th className="px-3 py-3">Restoranti</th>
                        <th className="px-3 py-3">Statusi</th>
                        <th className="px-3 py-3">Totali</th>
                        <th className="px-3 py-3">Koha</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {recentOrders.map((o) => (
                        <tr key={o.id} className="hover:bg-gray-50/80">
                          <td className="whitespace-nowrap px-3 py-3">
                            <Link
                              to={`/admin/orders?search=${encodeURIComponent(o.orderNumber)}`}
                              className="font-mono text-xs font-medium text-violet-700 hover:underline"
                            >
                              {o.orderNumber}
                            </Link>
                          </td>
                          <td className="max-w-[10rem] truncate px-3 py-3 text-gray-700">{o.customerEmail}</td>
                          <td className="max-w-[10rem] truncate px-3 py-3 text-gray-700">{o.restaurantName}</td>
                          <td className="whitespace-nowrap px-3 py-3">
                            <StatusBadge status={o.status} />
                          </td>
                          <td className="whitespace-nowrap px-3 py-3 font-medium tabular-nums text-gray-900">
                            {formatMoney(o.total)}
                          </td>
                          <td className="whitespace-nowrap px-3 py-3 text-xs text-gray-500">
                            {formatDateTime(o.placedAtUtc)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </DashboardCard>

            <div className="grid gap-6 lg:grid-cols-3">
              <DashboardCard title="Restorantet më aktive">
                <ul className="space-y-1">
                  {data.topRestaurantsThisMonth.length === 0 ? (
                    <li className="py-6 text-center text-sm text-gray-500">
                      Nuk ka ende të dhëna për këtë muaj.
                    </li>
                  ) : (
                    data.topRestaurantsThisMonth.map((r, i) => (
                      <li
                        key={r.name}
                        className="flex items-center justify-between gap-3 rounded-lg px-2 py-2.5 hover:bg-gray-50"
                      >
                        <div className="flex min-w-0 items-center gap-2.5">
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-violet-100 text-[10px] font-bold text-violet-700">
                            {i + 1}
                          </span>
                          <span className="truncate text-sm text-gray-800">{r.name}</span>
                        </div>
                        <span className="shrink-0 text-sm tabular-nums text-gray-500">{r.orderCount} porosi</span>
                      </li>
                    ))
                  )}
                </ul>
              </DashboardCard>

              <DashboardCard title="Orët më të ngarkuara">
                <ul className="space-y-1">
                  {data.busiestHoursToday.length === 0 ? (
                    <li className="py-6 text-center text-sm text-gray-500">Nuk ka porosi sot (UTC).</li>
                  ) : (
                    data.busiestHoursToday.map((h) => (
                      <li
                        key={h.hourUtc}
                        className="flex items-center justify-between gap-3 rounded-lg px-2 py-2.5 hover:bg-gray-50"
                      >
                        <span className="text-sm text-gray-800">
                          {String(h.hourUtc).padStart(2, '0')}:00–{String(h.hourUtc).padStart(2, '0')}:59 UTC
                        </span>
                        <span className="text-sm tabular-nums font-medium text-violet-700">{h.orderCount}</span>
                      </li>
                    ))
                  )}
                </ul>
              </DashboardCard>

              <DashboardCard title="Të ardhurat këtë muaj">
                <div className="space-y-4">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Muaji aktual</p>
                    <p className="mt-1 text-3xl font-bold tabular-nums text-gray-900">
                      {formatMoney(data.revenueThisMonth)}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-3 border-t border-gray-100 pt-4">
                    <div>
                      <p className="text-xs text-gray-500">Sot</p>
                      <p className="mt-0.5 text-sm font-semibold tabular-nums text-gray-900">
                        {formatMoney(data.revenueToday)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Këtë javë</p>
                      <p className="mt-0.5 text-sm font-semibold tabular-nums text-gray-900">
                        {formatMoney(data.revenueThisWeek)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Porosi muaji</p>
                      <p className="mt-0.5 text-sm font-semibold tabular-nums text-gray-900">
                        {data.ordersThisMonth}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Porosi totale</p>
                      <p className="mt-0.5 text-sm font-semibold tabular-nums text-gray-900">{data.totalOrders}</p>
                    </div>
                  </div>
                  <Link
                    to="/admin/finance"
                    className="inline-flex text-xs font-medium text-violet-600 hover:underline"
                  >
                    Shiko financa →
                  </Link>
                </div>
              </DashboardCard>
            </div>
          </>
        ) : null}
      </div>
    </AdminPageShell>
  )
}
