import { type ReactNode, useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchAdminDashboard, type AdminDashboardData } from '../lib/adminApi'
import { customerCard, customerCardMuted } from '../lib/customerTheme'
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
    <div className={`${customerCard} p-4`}>
      <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums text-zinc-100">{value}</p>
      {sub ? <p className="mt-1 text-xs text-zinc-500">{sub}</p> : null}
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

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-100">Dashboard</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Përmbledhje operacionale (UTC për kufijtë e ditës / javës / muajit). Raporte të plota në{' '}
          <Link to="/admin/reports" className="text-violet-300 hover:underline">
            Raporte
          </Link>
          .
        </p>
      </div>

      {error ? (
        <div
          className="rounded-xl border border-red-500/40 bg-red-950/40 px-4 py-3 text-sm text-red-200"
          role="alert"
        >
          {error}
        </div>
      ) : null}

      {loading ? (
        <p className="text-sm text-zinc-500">Duke ngarkuar statistikat…</p>
      ) : data ? (
        <>
          <section>
            <h2 className="mb-3 text-sm font-semibold text-violet-200/90">Porosi & të ardhura</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <StatCard label="Porosi sot" value={data.ordersToday} />
              <StatCard label="Porosi këtë javë (hënë–sot)" value={data.ordersThisWeek} />
              <StatCard label="Porosi këtë muaj" value={data.ordersThisMonth} />
              <StatCard label="Të ardhura sot" value={formatMoney(data.revenueToday)} />
              <StatCard label="Të ardhura këtë javë" value={formatMoney(data.revenueThisWeek)} />
              <StatCard label="Të ardhura këtë muaj" value={formatMoney(data.revenueThisMonth)} />
            </div>
          </section>

          <section>
            <h2 className="mb-3 text-sm font-semibold text-violet-200/90">Platforma</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <StatCard
                label="Restorante aktive"
                value={data.activeRestaurants}
                sub="Të aprovuara dhe aktive"
              />
              <StatCard
                label="Aplikime partner në pritje"
                value={data.pendingPartnerApplications}
                sub={
                  data.pendingPartnerApplications > 0 ? (
                    <Link to="/admin/partner-applications" className="text-violet-300 hover:underline">
                      Shiko listën
                    </Link>
                  ) : (
                    'Asnjë në pritje'
                  )
                }
              />
            </div>
          </section>

          <div className="grid gap-6 lg:grid-cols-2">
            <section className={`${customerCardMuted} p-4`}>
              <h2 className="text-sm font-semibold text-zinc-200">Restorantet më aktive (muaji)</h2>
              <p className="mt-1 text-xs text-zinc-500">Sipas numrit të porosive (jo të anuluara).</p>
              <ul className="mt-4 space-y-2">
                {data.topRestaurantsThisMonth.length === 0 ? (
                  <li className="text-sm text-zinc-500">Nuk ka ende të dhëna për këtë muaj.</li>
                ) : (
                  data.topRestaurantsThisMonth.map((r) => (
                    <li
                      key={r.name}
                      className="flex items-center justify-between border-b border-white/5 py-2 text-sm last:border-0"
                    >
                      <span className="text-zinc-200">{r.name}</span>
                      <span className="tabular-nums text-zinc-400">{r.orderCount} porosi</span>
                    </li>
                  ))
                )}
              </ul>
            </section>

            <section className={`${customerCardMuted} p-4`}>
              <h2 className="text-sm font-semibold text-zinc-200">Orët më të ngarkuara (sot, UTC)</h2>
              <p className="mt-1 text-xs text-zinc-500">Top orët sipas numrit të porosive.</p>
              <ul className="mt-4 space-y-2">
                {data.busiestHoursToday.length === 0 ? (
                  <li className="text-sm text-zinc-500">Nuk ka porosi sot (UTC).</li>
                ) : (
                  data.busiestHoursToday.map((h) => (
                    <li
                      key={h.hourUtc}
                      className="flex items-center justify-between border-b border-white/5 py-2 text-sm last:border-0"
                    >
                      <span className="text-zinc-200">
                        Ora {String(h.hourUtc).padStart(2, '0')}:00–{String(h.hourUtc).padStart(2, '0')}:59
                        (UTC)
                      </span>
                      <span className="tabular-nums text-zinc-400">{h.orderCount} porosi</span>
                    </li>
                  ))
                )}
              </ul>
            </section>
          </div>

          <p className="text-xs text-zinc-600">
            Performanca e deliverave, eksport PDF/Excel, log aktivitetesh dhe konfigurime — nga menuja e majtë
            (seksionet me etiketë &quot;Në zhvillim&quot;).
          </p>
        </>
      ) : null}
    </div>
  )
}
