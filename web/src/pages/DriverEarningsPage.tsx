import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { customerCardMuted } from '../lib/customerTheme'
import { fetchDriverEarnings, type DriverEarnings } from '../lib/driverApi'
import { useAuthStore } from '../store/authStore'

export default function DriverEarningsPage() {
  const token = useAuthStore((s) => s.token)
  const [data, setData] = useState<DriverEarnings | null>(null)
  const [err, setErr] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!token) return
    setErr(null)
    const e = await fetchDriverEarnings(token)
    setData(e)
  }, [token])

  useEffect(() => {
    void load().catch((e: unknown) => setErr(e instanceof Error ? e.message : 'Gabim'))
  }, [load])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-xl font-bold text-zinc-100">Fitimet</h1>
        <Link to="/driver" className="text-xs text-sky-400 hover:text-sky-300">
          ← Paneli
        </Link>
      </div>
      {err ? <p className="text-sm text-red-300">{err}</p> : null}
      {data ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <div className={`${customerCardMuted} p-4`}>
            <p className="text-xs uppercase text-zinc-500">Sot</p>
            <p className="mt-1 text-2xl font-bold text-emerald-300">{data.todayTotal.toFixed(2)} €</p>
            <p className="mt-1 text-xs text-zinc-500">{data.todayDeliveriesCount} porosi</p>
          </div>
          <div className={`${customerCardMuted} p-4`}>
            <p className="text-xs uppercase text-zinc-500">7 ditët e fundit</p>
            <p className="mt-1 text-2xl font-bold text-sky-200">{data.weekTotal.toFixed(2)} €</p>
            <p className="mt-1 text-xs text-zinc-500">{data.weekDeliveriesCount} porosi</p>
          </div>
          <div className={`${customerCardMuted} p-4 sm:col-span-2`}>
            <p className="text-xs uppercase text-zinc-500">Bonuse</p>
            <p className="mt-1 text-lg text-zinc-200">{data.bonusesTotal.toFixed(2)} €</p>
            <p className="mt-1 text-xs text-zinc-600">Bonuset nga platforma (MVP: 0).</p>
          </div>
        </div>
      ) : !err ? (
        <p className="text-sm text-zinc-500">Duke ngarkuar…</p>
      ) : null}
      <p className="text-xs text-zinc-600">
        Shuma = tarifa e dërgesës së porosisë (model i thjeshtë për demo).
      </p>
    </div>
  )
}
