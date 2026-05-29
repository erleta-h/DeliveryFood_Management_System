import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  fetchAdminNotificationUnreadCount,
  fetchAdminNotifications,
  markAdminNotificationRead,
  markAllAdminNotificationsRead,
  type AdminNotificationRow,
} from '../../lib/adminNotificationsApi'
import { customerBtnGhost } from '../../lib/adminTheme'
import { useAuthStore } from '../../store/authStore'
import { useAdminNotificationsStore } from '../../store/adminNotificationsStore'

function formatWhen(iso: string) {
  try {
    return new Date(iso).toLocaleString('sq-AL', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return iso
  }
}

export function AdminNotificationBell() {
  const token = useAuthStore((s) => s.token)
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [unread, setUnread] = useState(0)
  const [rows, setRows] = useState<AdminNotificationRow[]>([])
  const [loading, setLoading] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)

  const refreshCount = useCallback(async () => {
    if (!token) return
    try {
      const c = await fetchAdminNotificationUnreadCount(token)
      setUnread(c)
    } catch {
      setUnread(0)
    }
  }, [token])

  const loadList = useCallback(async () => {
    if (!token) return
    setLoading(true)
    try {
      const list = await fetchAdminNotifications(token, 25)
      setRows(list)
    } catch {
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [token])

  const unreadBump = useAdminNotificationsStore((s) => s.unreadBump)

  useEffect(() => {
    void refreshCount()
  }, [refreshCount, unreadBump])

  useEffect(() => {
    if (open) void loadList()
  }, [open, loadList])

  useEffect(() => {
    if (!open) return
    function onDoc(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  async function onOpenItem(n: AdminNotificationRow) {
    if (!token) return
    if (!n.isRead) {
      const ok = await markAdminNotificationRead(token, n.id)
      if (ok) {
        setRows((prev) => prev.map((x) => (x.id === n.id ? { ...x, isRead: true } : x)))
        setUnread((c) => Math.max(0, c - 1))
      }
    }
    setOpen(false)
    if (n.linkPath) navigate(n.linkPath)
  }

  async function onReadAll() {
    if (!token) return
    const ok = await markAllAdminNotificationsRead(token)
    if (ok) {
      setUnread(0)
      setRows((prev) => prev.map((x) => ({ ...x, isRead: true })))
    }
  }

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 bg-gray-50 text-lg transition hover:border-violet-300 hover:bg-violet-50"
        title="Njoftimet"
        aria-expanded={open}
      >
        <span aria-hidden>🔔</span>
        {unread > 0 ? (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-bold text-white">
            {unread > 9 ? '9+' : unread}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute right-0 z-50 mt-2 w-[min(100vw-2rem,22rem)] overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl">
          <div className="flex items-center justify-between border-b border-gray-100 px-3 py-2.5">
            <p className="text-sm font-semibold text-gray-900">Njoftimet</p>
            {unread > 0 ? (
              <button
                type="button"
                className="text-xs font-medium text-violet-600 hover:underline"
                onClick={() => void onReadAll()}
              >
                Lexo të gjitha
              </button>
            ) : null}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {loading ? (
              <p className="px-3 py-6 text-center text-sm text-gray-500">Duke ngarkuar…</p>
            ) : rows.length === 0 ? (
              <p className="px-3 py-6 text-center text-sm text-gray-500">Nuk ka njoftime.</p>
            ) : (
              <ul>
                {rows.map((n) => (
                  <li key={n.id} className="border-b border-gray-50 last:border-0">
                    <button
                      type="button"
                      onClick={() => void onOpenItem(n)}
                      className={[
                        'w-full px-3 py-2.5 text-left transition hover:bg-gray-50',
                        n.isRead ? 'opacity-75' : 'bg-violet-50/50',
                      ].join(' ')}
                    >
                      <p className="text-sm font-medium text-gray-900">{n.title}</p>
                      <p className="mt-0.5 line-clamp-2 text-xs text-gray-600">{n.message}</p>
                      <p className="mt-1 text-[10px] text-gray-400">{formatWhen(n.createdAtUtc)}</p>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="border-t border-gray-100 px-3 py-2">
            <Link
              to="/admin/partner-applications"
              className={`${customerBtnGhost} block w-full text-center text-xs`}
              onClick={() => setOpen(false)}
            >
              Aplikimet partner
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  )
}
