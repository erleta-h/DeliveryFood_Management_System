import { useCallback, useEffect, useState } from 'react'
import { Link, NavLink, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { fetchDriverStatus, postDriverLocation } from '../lib/driverApi'
import { createOrdersHubConnection } from '../lib/orderHub'
import { customerBtnGhost, customerShellBg } from '../lib/customerTheme'
import { useAuthStore } from '../store/authStore'
import { useDriverAlertsStore } from '../store/driverAlertsStore'

function navClass(isActive: boolean) {
  return `rounded-lg px-3 py-2 text-sm transition-colors ${
    isActive
      ? 'bg-sky-500/15 font-medium text-sky-100 ring-1 ring-sky-500/25'
      : 'text-zinc-400 hover:bg-white/5 hover:text-zinc-200'
  }`
}

function navIconClass(isActive: boolean) {
  return `inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors ${
    isActive
      ? 'bg-sky-500/15 text-sky-100 ring-1 ring-sky-500/25'
      : 'text-zinc-400 hover:bg-white/5 hover:text-zinc-200'
  }`
}

export default function DriverLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const token = useAuthStore((s) => s.token)
  const logout = useAuthStore((s) => s.logout)
  const user = useAuthStore((s) => s.user)
  const assignmentToast = useDriverAlertsStore((s) => s.assignmentToast)
  const clearAssignmentToast = useDriverAlertsStore((s) => s.clearAssignmentToast)
  const bellUnread = useDriverAlertsStore((s) => s.bellUnread)

  const [driverOnline, setDriverOnline] = useState(false)
  const [gpsHint, setGpsHint] = useState<string | null>(null)

  const refreshDriverOnline = useCallback(async () => {
    if (!token) {
      setDriverOnline(false)
      return
    }
    try {
      const s = await fetchDriverStatus(token)
      setDriverOnline(s.isOnline)
    } catch {
      setDriverOnline(false)
    }
  }, [token])

  useEffect(() => {
    if (!token) return
    void refreshDriverOnline()
    const id = window.setInterval(() => void refreshDriverOnline(), 6000)
    return () => window.clearInterval(id)
  }, [token, refreshDriverOnline])

  useEffect(() => {
    const onStatus = () => void refreshDriverOnline()
    window.addEventListener('fd-driver-status-changed', onStatus)
    return () => window.removeEventListener('fd-driver-status-changed', onStatus)
  }, [refreshDriverOnline])

  /** GPS dërgohet te serveri kur je «Online» — në çdo faqe /driver (jo vetëm te paneli). */
  useEffect(() => {
    if (!token || !driverOnline) {
      setGpsHint(null)
      return
    }
    if (!navigator.geolocation) {
      setGpsHint('Shfletuesi nuk ofron GPS — përdor Chrome / Edge në telefon.')
      return
    }
    setGpsHint(null)
    const id = navigator.geolocation.watchPosition(
      (pos) => {
        setGpsHint(null)
        void postDriverLocation(token, pos.coords.latitude, pos.coords.longitude).catch(() => {})
      },
      (err: GeolocationPositionError) => {
        if (err.code === 1) {
          setGpsHint(
            'Lejo «Lokacionin» për këtë sajt (te adresa e faqes → Site settings → Location → Allow).',
          )
        } else if (err.code === 2) {
          setGpsHint(
            'Shfletuesi nuk lexon vendndodhjen. Në laptop/PC kjo është e zakonshme (pa GPS). Për punë reale hap Deliver nga telefoni me GPS të ndezur, ose te Windows: Settings → Privacy → Location → On.',
          )
        } else if (err.code === 3) {
          setGpsHint(
            'Koha për lokacion skadoi — kontrollo sinjalin GPS / Wi‑Fi dhe rifresko faqen.',
          )
        } else {
          setGpsHint('Nuk lexohet lokacioni — provo nga telefoni ose rifresko faqen.')
        }
      },
      /* false: në shumë PC me Windows/Chrome lexon vendndodhje të përafërt (Wi‑Fi); true shpesh dështon pa GPS hardware. */
      { enableHighAccuracy: false, maximumAge: 20000, timeout: 30000 },
    )
    return () => navigator.geolocation.clearWatch(id)
  }, [token, driverOnline])

  useEffect(() => {
    if (!token) return
    const conn = createOrdersHubConnection(token)
    conn.on('deliveryOffer', (payload: unknown) => {
      const p = payload as { orderId?: number; orderNumber?: string }
      if (p?.orderId != null && p.orderNumber) {
        useDriverAlertsStore.getState().pushAssignmentAlert({
          orderId: p.orderId,
          orderNumber: p.orderNumber,
        })
      }
      window.dispatchEvent(new CustomEvent('fd-driver-refresh-deliveries'))
    })
    let stopped = false
    ;(async () => {
      try {
        await conn.start()
        if (!stopped) await conn.invoke('JoinDriver')
      } catch {
        /* SignalR — dev */
      }
    })()
    return () => {
      stopped = true
      void conn.stop()
    }
  }, [token])

  if (user?.mustChangePassword && location.pathname !== '/driver/profile') {
    return <Navigate to="/driver/profile" replace />
  }

  function onLogout() {
    logout()
    void navigate('/', { replace: true })
  }

  return (
    <div className={`${customerShellBg} min-h-screen`}>
      <header className="border-b border-sky-500/20 bg-[#10161c]/90 px-3 py-3 backdrop-blur-md sm:px-4">
        <div className="mx-auto flex max-w-3xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wider text-sky-400/90">Deliver</p>
            <p className="mt-0.5 text-sm text-zinc-300">
              {user?.firstName} {user?.lastName}
            </p>
            {driverOnline ? (
              <p
                className={`mt-1 max-w-[16rem] text-[11px] leading-snug ${
                  gpsHint ? 'text-amber-200/90' : 'text-emerald-400/85'
                }`}
              >
                {gpsHint ?? 'GPS aktiv — klienti sheh vendndodhjen gjatë dërgesës (hap Panelin për punë).'}
              </p>
            ) : null}
          </div>
          <nav className="flex flex-wrap items-center gap-2">
            <NavLink to="/driver" end className={({ isActive }) => navClass(isActive)}>
              Paneli
            </NavLink>
            <NavLink to="/driver/earnings" className={({ isActive }) => navClass(isActive)}>
              Fitime
            </NavLink>
            <NavLink to="/driver/history" className={({ isActive }) => navClass(isActive)}>
              Histori
            </NavLink>
            <NavLink
              to="/driver/notifications"
              title="Njoftime"
              aria-label="Njoftime"
              className={({ isActive }) => `${navIconClass(isActive)} relative`}
            >
              <span className="relative inline-flex">
                <svg
                  className="h-[1.2rem] w-[1.2rem]"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                >
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                  <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                </svg>
                {bellUnread > 0 ? (
                  <span className="absolute -right-2 -top-2 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-rose-500 px-0.5 text-[10px] font-bold leading-none text-white ring-2 ring-[#10161c]">
                    {bellUnread > 9 ? '9+' : bellUnread}
                  </span>
                ) : null}
              </span>
            </NavLink>
            <Link to="/" className="rounded-lg px-3 py-2 text-sm text-zinc-500 hover:text-zinc-200">
              Ballina
            </Link>
            <button
              type="button"
              onClick={() => onLogout()}
              className="rounded-lg border border-white/10 px-3 py-2 text-sm text-zinc-400 hover:bg-white/5"
            >
              Dil
            </button>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-3 py-6 sm:px-4">
        {!token ? <p className="text-sm text-zinc-500">Duke ngarkuar sesionin…</p> : <Outlet />}
      </main>

      {assignmentToast ? (
        <div
          className="fixed bottom-4 left-1/2 z-[70] w-[min(100%-1.5rem,22rem)] -translate-x-1/2 rounded-xl border border-amber-400/40 bg-[#1a1420] px-4 py-3 shadow-xl shadow-black/40"
          role="status"
        >
          <p className="text-sm font-semibold text-amber-100">Porosi e re</p>
          <p className="mt-1 font-mono text-xs text-zinc-300">{assignmentToast.orderNumber}</p>
          <p className="mt-1 text-xs text-zinc-400">
            Të është caktuar një dërgesë — hap panelin për ta pranuar ose nisur.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link
              to="/driver"
              onClick={() => clearAssignmentToast()}
              className={`${customerBtnGhost} border-amber-500/30 bg-amber-500/15 text-amber-100 hover:bg-amber-500/25`}
            >
              Hap panelin
            </Link>
            <button
              type="button"
              className={`${customerBtnGhost} text-xs text-zinc-400`}
              onClick={() => clearAssignmentToast()}
            >
              Mbyll
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
