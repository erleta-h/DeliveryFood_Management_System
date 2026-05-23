import { type ReactNode, useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AdminStatCard } from '../components/admin/AdminStatCard'
import { AdminStatCardsSkeleton } from '../components/admin/AdminSkeleton'
import { fetchAdminDashboard, type AdminDashboardData } from '../lib/adminApi'
import { customerCardMuted } from '../lib/adminTheme'
import { useAuthStore } from '../store/authStore'

function formatMoney(n: number) {
  return new Intl.NumberFormat('sq-XK', { style: 'currency', currency: 'EUR' }).format(n)
}

function StatCard({
  label,
  value,
  sub,
}: {
  label: string
  value: string | number
  sub?: ReactNode
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums text-gray-900">{value}</p>
      {sub ? <p className="mt-1 text-xs text-gray-500">{sub}</p> : null}
    </div>
  )
}

export default function AdminDashboardPage() {
  const token = useAuthStore((s) => s.token)
  const [data, setData] = useState<AdminDashboardData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!token) return
    setError(null)
    const d = await fetchAdminDashboard(token)
    setData(d)
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

  if (!token) return null

  const pendingApps =
    (data?.pendingPartnerApplications ?? 0) + (data?.pendingDriverApplications ?? 0)

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">
          Përmbledhje operacionale (UTC). Raporte të plota në{' '}
          <Link to="/admin/reports" className="text-violet-600 hover:underline">
            Raporte
          </Link>
          .
        </p>
      </div>

      {error ? (
        <div
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
          role="alert"
        >
          {error}
        </div>
      ) : null}

      {loading ? (
        <AdminStatCardsSkeleton count={4} />
      ) : data ? (
        <>
          <section>
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500">
              Sot — përmbledhje
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <AdminStatCard
                label="Porosi totale"
                value={data.totalOrders}
                icon="📦"
                accent="violet"
                href="/admin/orders"
              />
              <AdminStatCard
                label="Delivera aktivë"
                value={data.activeDrivers}
                icon="🛵"
                accent="emerald"
                href="/admin/riders"
                hint={`${data.ordersToday} porosi sot`}
              />
              <AdminStatCard
                label="Të ardhura sot"
                value={formatMoney(data.revenueToday)}
                icon="💰"
                accent="amber"
                href="/admin/finance"
              />
              <AdminStatCard
                label="Aplikime në pritje"
                value={pendingApps}
                icon="📝"
                accent="sky"
                href="/admin/partner-applications"
                hint={
                  pendingApps > 0 ? (
                    <span>
                      {data.pendingPartnerApplications} partner · {data.pendingDriverApplications} deliver
                    </span>
                  ) : (
                    'Asnjë në pritje'
                  )
                }
              />
            </div>
          </section>

          <section>
            <h2 className="mb-3 text-sm font-semibold text-violet-700">Porosi & të ardhura</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <StatCard label="Porosi sot" value={data.ordersToday} />
              <StatCard label="Porosi këtë javë" value={data.ordersThisWeek} />
              <StatCard label="Porosi këtë muaj" value={data.ordersThisMonth} />
              <StatCard label="Të ardhura këtë javë" value={formatMoney(data.revenueThisWeek)} />
              <StatCard label="Të ardhura këtë muaj" value={formatMoney(data.revenueThisMonth)} />
              <StatCard label="Restorante aktive" value={data.activeRestaurants} />
            </div>
          </section>

          <div className="grid gap-6 lg:grid-cols-2">
            <section className={`${customerCardMuted} p-4`}>
              <h2 className="text-sm font-semibold text-gray-800">Restorantet më aktive (muaji)</h2>
              <ul className="mt-4 space-y-2">
                {data.topRestaurantsThisMonth.length === 0 ? (
                  <li className="text-sm text-gray-500">Nuk ka ende të dhëna për këtë muaj.</li>
                ) : (
                  data.topRestaurantsThisMonth.map((r) => (
                    <li
                      key={r.name}
                      className="flex items-center justify-between border-b border-gray-100 py-2 text-sm last:border-0"
                    >
                      <span className="text-gray-800">{r.name}</span>
                      <span className="tabular-nums text-gray-500">{r.orderCount} porosi</span>
                    </li>
                  ))
                )}
              </ul>
            </section>

            <section className={`${customerCardMuted} p-4`}>
              <h2 className="text-sm font-semibold text-gray-800">Orët më të ngarkuara (sot, UTC)</h2>
              <ul className="mt-4 space-y-2">
                {data.busiestHoursToday.length === 0 ? (
                  <li className="text-sm text-gray-500">Nuk ka porosi sot (UTC).</li>
                ) : (
                  data.busiestHoursToday.map((h) => (
                    <li
                      key={h.hourUtc}
                      className="flex items-center justify-between border-b border-gray-100 py-2 text-sm last:border-0"
                    >
                      <span className="text-gray-800">
                        {String(h.hourUtc).padStart(2, '0')}:00–{String(h.hourUtc).padStart(2, '0')}:59 (UTC)
                      </span>
                      <span className="tabular-nums text-gray-500">{h.orderCount}</span>
                    </li>
                  ))
                )}
              </ul>
            </section>
          </div>
        </>
      ) : null}
    </div>
  )
}
