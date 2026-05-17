import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  fetchCustomerNotificationUnreadCount,
  fetchCustomerNotifications,
  markAllCustomerNotificationsRead,
  markCustomerNotificationRead,
  type CustomerNotificationRow,
} from '../lib/customerNotificationsApi'
import { customerBtnGhost, customerCardMuted } from '../lib/customerTheme'
import { useAuthStore } from '../store/authStore'
import { useCustomerNotificationsStore } from '../store/customerNotificationsStore.ts'

function typeLabelSq(type: string): string {
  if (type === 'support_reply') return 'Support'
  if (type === 'order_status') return 'Porosi'
  return type
}

export default function CustomerNotificationsPage() {
  const token = useAuthStore((s) => s.token)
  const navigate = useNavigate()
  const setUnreadCount = useCustomerNotificationsStore((s) => s.setUnreadCount)
  const [rows, setRows] = useState<CustomerNotificationRow[]>([])
  const [err, setErr] = useState<string | null>(null)
  const [busyAll, setBusyAll] = useState(false)

  const load = useCallback(async () => {
    if (!token) return
    setErr(null)
    const list = await fetchCustomerNotifications(token, 40)
    setRows(list)
  }, [token])

  const refreshUnread = useCallback(async () => {
    if (!token) return
    try {
      const c = await fetchCustomerNotificationUnreadCount(token)
      setUnreadCount(c)
    } catch {
      /* ignore */
    }
  }, [token, setUnreadCount])

  useEffect(() => {
    void load().catch((e: unknown) => setErr(e instanceof Error ? e.message : 'Gabim'))
  }, [load])

  useEffect(() => {
    void refreshUnread()
  }, [refreshUnread])

  async function onReadAll() {
    if (!token) return
    setBusyAll(true)
    try {
      await markAllCustomerNotificationsRead(token)
      setUnreadCount(0)
      await load()
    } finally {
      setBusyAll(false)
    }
  }

  async function onOpenRow(n: CustomerNotificationRow) {
    if (!token) return
    if (!n.isRead) {
      const ok = await markCustomerNotificationRead(token, n.id)
      if (ok) {
        setRows((prev) => prev.map((x) => (x.id === n.id ? { ...x, isRead: true } : x)))
        await refreshUnread()
      }
    }
    if (n.type === 'support_reply') {
      navigate('/app/support')
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-bold text-zinc-100">Njoftime</h1>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={busyAll || rows.every((r) => r.isRead)}
            onClick={() => void onReadAll()}
            className={customerBtnGhost}
          >
            Shëno të gjitha si të lexuara
          </button>
          <Link to="/app/restaurants" className={`${customerBtnGhost} text-xs`}>
            ← Aplikacioni
          </Link>
        </div>
      </div>
      <p className="text-xs text-zinc-500">
        Kur supporti të përgjigjet në një tiketë, shfaqet këtu dhe në zilën e krye — edhe nëse nuk je te faqja e
        supportit.
      </p>
      {err ? <p className="text-sm text-red-300">{err}</p> : null}
      <ul className="space-y-2">
        {rows.map((n) => (
          <li key={n.id}>
            <button
              type="button"
              onClick={() => void onOpenRow(n)}
              className={`${customerCardMuted} w-full p-3 text-left transition hover:bg-white/[0.04] ${
                n.isRead ? 'opacity-75' : 'ring-1 ring-amber-500/30'
              }`}
            >
              <p className="text-sm font-medium text-zinc-100">{n.title}</p>
              <p className="mt-1 text-xs text-zinc-400">{n.message}</p>
              <p className="mt-2 flex flex-wrap items-center gap-2 text-[10px] uppercase text-zinc-600">
                <span className="rounded bg-zinc-800/80 px-1.5 py-0.5 text-zinc-400">
                  {typeLabelSq(n.type)}
                </span>
                <span>{new Date(n.createdAtUtc).toLocaleString('sq-AL')}</span>
                {n.type === 'support_reply' ? (
                  <span className="normal-case text-amber-200/80">Kliko për supportin</span>
                ) : null}
              </p>
            </button>
          </li>
        ))}
      </ul>
      {!err && rows.length === 0 ? (
        <p className="text-sm text-zinc-500">Nuk ka njoftime të ruajtura.</p>
      ) : null}
    </div>
  )
}
