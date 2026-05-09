import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { customerCardMuted } from '../lib/customerTheme'
import { fetchDriverPerformance, type DriverPerformance } from '../lib/driverApi'
import { useAuthStore } from '../store/authStore'

export default function DriverPerformancePage() {
  const token = useAuthStore((s) => s.token)
  const [p, setP] = useState<DriverPerformance | null>(null)
  const [err, setErr] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!token) return
    setErr(null)
    setP(await fetchDriverPerformance(token))
  }, [token])

  useEffect(() => {
    void load().catch((e: unknown) => setErr(e instanceof Error ? e.message : 'Gabim'))
  }, [load])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-xl font-bold text-zinc-100">Performance</h1>
        <Link to="/driver" className="text-xs text-sky-400 hover:text-sky-300">
          ← Paneli
        </Link>
      </div>
      {err ? <p className="text-sm text-red-300">{err}</p> : null}
      {p ? (
        <div className="space-y-3">
          <div className={`${customerCardMuted} p-4`}>
            <p className="text-xs uppercase text-zinc-500">Vlerësimi mesatar</p>
            <p className="mt-1 text-3xl font-bold text-amber-200">
              {p.ratingsCount > 0 ? `${p.averageRating.toFixed(1)}★` : '—'}
            </p>
            <p className="text-xs text-zinc-500">{p.ratingsCount} vlerësime</p>
          </div>
          <div className={`${customerCardMuted} grid gap-3 p-4 sm:grid-cols-2`}>
            <div>
              <p className="text-xs uppercase text-zinc-500">Acceptance rate</p>
              <p className="mt-1 text-xl font-semibold text-emerald-300">{p.acceptanceRatePercent}%</p>
            </div>
            <div>
              <p className="text-xs uppercase text-zinc-500">Refuzime + timeout</p>
              <p className="mt-1 text-xl font-semibold text-rose-300/90">{p.declineRatePercent}%</p>
            </div>
            <p className="text-xs text-zinc-600 sm:col-span-2">
              Oferta: {p.offersAccepted} pranuara · {p.offersDeclined} refuzuara · {p.offersTimedOut} skaduar
            </p>
          </div>
          {p.performanceHint ? (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-100">
              {p.performanceHint}
            </div>
          ) : null}
        </div>
      ) : !err ? (
        <p className="text-sm text-zinc-500">Duke ngarkuar…</p>
      ) : null}
    </div>
  )
}
