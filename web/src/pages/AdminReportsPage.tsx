import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchAdminDashboard, type AdminDashboardData } from '../lib/adminApi'
import { customerBtnGhost, customerCardMuted } from '../lib/customerTheme'
import { useAuthStore } from '../store/authStore'

function fmtMoney(n: number) {
  return new Intl.NumberFormat('sq-XK', { style: 'currency', currency: 'EUR' }).format(n)
}

export default function AdminReportsPage() {
  const token = useAuthStore((s) => s.token)
  const [data, setData] = useState<AdminDashboardData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!token) {
      setLoading(false)
      return
    }
    let c = false
    setLoading(true)
    void fetchAdminDashboard(token)
      .then((d) => {
        if (!c) setData(d)
      })
      .catch((e: unknown) => {
        if (!c) setError(e instanceof Error ? e.message : 'Gabim.')
      })
      .finally(() => {
        if (!c) setLoading(false)
      })
    return () => {
      c = true
    }
  }, [token])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-100">Raporte</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Përmbledhje nga dashboard-i; për detaje eksporto nga porositë dhe financat.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Link to="/admin/orders" className={customerBtnGhost}>
          Porositë
        </Link>
        <Link to="/admin/finance" className={customerBtnGhost}>
          Pagesat
        </Link>
        <Link to="/admin/restaurants" className={customerBtnGhost}>
          Restorantet
        </Link>
      </div>

      {error ? <p className="text-sm text-red-300">{error}</p> : null}
      {loading ? <p className="text-sm text-zinc-500">Duke ngarkuar…</p> : null}

      {data && !loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className={`${customerCardMuted} p-4`}>
            <p className="text-xs uppercase text-zinc-500">Porosi sot</p>
            <p className="mt-1 text-2xl font-semibold text-zinc-100">{data.ordersToday}</p>
          </div>
          <div className={`${customerCardMuted} p-4`}>
            <p className="text-xs uppercase text-zinc-500">Porosi muaji</p>
            <p className="mt-1 text-2xl font-semibold text-zinc-100">{data.ordersThisMonth}</p>
          </div>
          <div className={`${customerCardMuted} p-4`}>
            <p className="text-xs uppercase text-zinc-500">Të ardhura muaji</p>
            <p className="mt-1 text-2xl font-semibold text-zinc-100">{fmtMoney(data.revenueThisMonth)}</p>
          </div>
          <div className={`${customerCardMuted} p-4`}>
            <p className="text-xs uppercase text-zinc-500">Restorantet aktive</p>
            <p className="mt-1 text-2xl font-semibold text-zinc-100">{data.activeRestaurants}</p>
          </div>
          <div className={`${customerCardMuted} p-4`}>
            <p className="text-xs uppercase text-zinc-500">Aplikime në pritje</p>
            <p className="mt-1 text-2xl font-semibold text-zinc-100">{data.pendingPartnerApplications}</p>
          </div>
        </div>
      ) : null}
    </div>
  )
}
