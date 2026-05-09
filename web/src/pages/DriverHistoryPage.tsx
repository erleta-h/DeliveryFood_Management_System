import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { customerCardMuted } from '../lib/customerTheme'
import { fetchDriverHistory, type DriverHistoryRow } from '../lib/driverApi'
import { useAuthStore } from '../store/authStore'

export default function DriverHistoryPage() {
  const token = useAuthStore((s) => s.token)
  const [rows, setRows] = useState<DriverHistoryRow[]>([])
  const [err, setErr] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!token) return
    setErr(null)
    const list = await fetchDriverHistory(token, 50)
    setRows(list)
  }, [token])

  useEffect(() => {
    void load().catch((e: unknown) => setErr(e instanceof Error ? e.message : 'Gabim'))
  }, [load])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-xl font-bold text-zinc-100">Historiku</h1>
        <Link to="/driver" className="text-xs text-sky-400 hover:text-sky-300">
          ← Paneli
        </Link>
      </div>
      {err ? <p className="text-sm text-red-300">{err}</p> : null}
      <ul className="space-y-2">
        {rows.map((r) => (
          <li key={r.orderId} className={`${customerCardMuted} flex flex-wrap items-center justify-between gap-2 p-3`}>
            <div>
              <p className="font-mono text-xs text-sky-200">{r.orderNumber}</p>
              <p className="text-xs text-zinc-500">
                {new Date(r.deliveredAtUtc).toLocaleString()}
              </p>
            </div>
            <div className="text-right text-sm">
              <p className="font-medium text-emerald-300">{r.driverPayout.toFixed(2)} €</p>
              {r.customerRating != null ? (
                <p className="text-xs text-amber-200/90">{r.customerRating}★</p>
              ) : (
                <p className="text-xs text-zinc-600">—</p>
              )}
            </div>
          </li>
        ))}
      </ul>
      {!err && rows.length === 0 ? <p className="text-sm text-zinc-500">Ende pa porosi të përfunduara.</p> : null}
    </div>
  )
}
