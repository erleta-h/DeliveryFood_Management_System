import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { customerCardMuted } from '../lib/customerTheme'
import { fetchDriverNotifications, type DriverNotificationRow } from '../lib/driverApi'
import { useAuthStore } from '../store/authStore'
import { useDriverAlertsStore } from './../store/driverAlertsStore'

export default function DriverNotificationsPage() {
  const token = useAuthStore((s) => s.token)
  const [rows, setRows] = useState<DriverNotificationRow[]>([])
  const [err, setErr] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!token) return
    setErr(null)
    setRows(await fetchDriverNotifications(token, 30))
  }, [token])

  useEffect(() => {
    useDriverAlertsStore.getState().clearBell()
  }, [])

  useEffect(() => {
    void load().catch((e: unknown) => setErr(e instanceof Error ? e.message : 'Gabim'))
  }, [load])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-xl font-bold text-zinc-100">Njoftime</h1>
        <Link to="/driver" className="text-xs text-sky-400 hover:text-sky-300">
          ← Paneli
        </Link>
      </div>
      {err ? <p className="text-sm text-red-300">{err}</p> : null}
      <ul className="space-y-2">
        {rows.map((n) => (
          <li
            key={n.id}
            className={`${customerCardMuted} p-3 ${n.isRead ? 'opacity-70' : 'ring-1 ring-sky-500/25'}`}
          >
            <p className="text-sm font-medium text-zinc-100">{n.title}</p>
            <p className="mt-1 text-xs text-zinc-400">{n.message}</p>
            <p className="mt-2 text-[10px] uppercase text-zinc-600">
              {n.type} · {new Date(n.createdAtUtc).toLocaleString()}
            </p>
          </li>
        ))}
      </ul>
      {!err && rows.length === 0 ? (
        <p className="text-sm text-zinc-500">
          Nuk ka njoftime të ruajtura. Kur restoranti ose sistemi të caktojë një porosi, shfaqet këtu dhe merr njoftim në
          kohë reale (zikë në krye + toast).
        </p>
      ) : null}
    </div>
  )
}
