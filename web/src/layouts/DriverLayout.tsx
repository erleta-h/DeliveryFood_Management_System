import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, NavLink, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { fetchDriverStatus, postDriverLocation } from '../lib/driverApi'
import { createOrdersHubConnection, isHubStartAbortError, startOrdersHub } from '../lib/orderHub'
import { normalizeDeliveryChatMessage } from '../lib/deliveryChatApi'
import { useAuthStore } from '../store/authStore'
import { useDriverAlertsStore } from '../store/driverAlertsStore'

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
  const [menuOpen, setMenuOpen] = useState(false)
  const lastLocationPostWarnAt = useRef(0)

  const reportLocationPostFailure = useCallback((err: unknown) => {
    console.warn('[DriverLayout] Nuk u dërgua lokacioni në server.', err)
    const now = Date.now()
    if (now - lastLocationPostWarnAt.current < 30_000) return
    lastLocationPostWarnAt.current = now
    setGpsHint(
      'GPS lexohet, por serveri nuk e pranoi lokacionin — kontrollo internetin dhe që je Online.',
    )
  }, [])

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
        void postDriverLocation(token, pos.coords.latitude, pos.coords.longitude)
          .then(() => setGpsHint(null))
          .catch(reportLocationPostFailure)
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
      { enableHighAccuracy: false, maximumAge: 20000, timeout: 30000 },
    )
    return () => navigator.geolocation.clearWatch(id)
  }, [token, driverOnline, reportLocationPostFailure])

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
    conn.on('deliveryChatMessage', (raw: unknown) => {
      const m = normalizeDeliveryChatMessage(raw)
      if (!m || m.senderRole === 'driver') return
      useDriverAlertsStore.getState().incrementChatUnread()
    })
    let cancelled = false
    ;(async () => {
      try {
        await startOrdersHub(conn, [{ kind: 'driver' }], { isCancelled: () => cancelled })
      } catch (err) {
        if (cancelled || isHubStartAbortError(err)) return
        console.warn('[DriverHub] SignalR nuk u lidh.', err)
      }
      if (cancelled) return
    })()
    return () => {
      cancelled = true
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

  const initials = `${user?.firstName?.[0] ?? ''}${user?.lastName?.[0] ?? ''}`.toUpperCase()

  return (
    <div className="flex min-h-screen flex-col bg-[#0a0e17]">
      {/* Top bar */}
      <header className="sticky top-0 z-40 flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          {/* Hamburger menu */}
          <button
            type="button"
            onClick={() => setMenuOpen(!menuOpen)}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 text-zinc-300 active:bg-white/10"
            aria-label="Menu"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          {/* Avatar + name + online badge */}
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-500/20 text-xs font-bold text-emerald-400">
              {initials}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-zinc-100">
                {user?.firstName} {user?.lastName}
              </p>
              <div className="flex items-center gap-1.5">
                <span
                  className={`inline-block h-2 w-2 rounded-full ${driverOnline ? 'bg-emerald-400' : 'bg-zinc-600'}`}
                />
                <span className={`text-[11px] ${driverOnline ? 'text-emerald-400' : 'text-zinc-500'}`}>
                  {driverOnline ? 'Online' : 'Offline'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Njoftime & mbështetje */}
        <div className="flex items-center gap-2">
          <NavLink
            to="/driver/support"
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 text-zinc-300 active:bg-white/10"
            aria-label="Mbështetja"
            title="Mbështetja"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <circle cx="12" cy="12" r="10" />
              <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </NavLink>
          <NavLink
            to="/driver/notifications"
            className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 text-zinc-300 active:bg-white/10"
            aria-label="Njoftime"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
            {bellUnread > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
                {bellUnread > 9 ? '9+' : bellUnread}
              </span>
            )}
          </NavLink>
        </div>
      </header>

      {/* GPS hint banner */}
      {driverOnline && gpsHint && (
        <div className="mx-4 mb-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2">
          <p className="text-xs leading-snug text-amber-200">{gpsHint}</p>
        </div>
      )}

      {/* Slide-out menu overlay */}
      {menuOpen && (
        <div className="fixed inset-0 z-50 flex" onClick={() => setMenuOpen(false)}>
          <div
            className="h-full w-64 bg-[#0f1520] p-5 shadow-2xl shadow-black/60"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/20 text-sm font-bold text-emerald-400">
                {initials}
              </div>
              <div>
                <p className="text-sm font-medium text-zinc-100">
                  {user?.firstName} {user?.lastName}
                </p>
                <p className="text-xs text-zinc-500">Shofer</p>
              </div>
            </div>
            <nav className="flex flex-col gap-1">
              <Link
                to="/driver"
                onClick={() => setMenuOpen(false)}
                className="rounded-lg px-3 py-2.5 text-sm text-zinc-300 hover:bg-white/5"
              >
                Paneli
              </Link>
              <Link
                to="/driver/orders"
                onClick={() => setMenuOpen(false)}
                className="rounded-lg px-3 py-2.5 text-sm text-zinc-300 hover:bg-white/5"
              >
                Porositë
              </Link>
              <Link
                to="/driver/earnings"
                onClick={() => setMenuOpen(false)}
                className="rounded-lg px-3 py-2.5 text-sm text-zinc-300 hover:bg-white/5"
              >
                Të ardhurat
              </Link>
              <Link
                to="/driver/history"
                onClick={() => setMenuOpen(false)}
                className="rounded-lg px-3 py-2.5 text-sm text-zinc-300 hover:bg-white/5"
              >
                Histori
              </Link>
              <Link
                to="/driver/stats"
                onClick={() => setMenuOpen(false)}
                className="rounded-lg px-3 py-2.5 text-sm text-zinc-300 hover:bg-white/5"
              >
                Statistikat
              </Link>
              <Link
                to="/driver/profile"
                onClick={() => setMenuOpen(false)}
                className="rounded-lg px-3 py-2.5 text-sm text-zinc-300 hover:bg-white/5"
              >
                Profili
              </Link>
              <Link
                to="/driver/support"
                onClick={() => setMenuOpen(false)}
                className="rounded-lg px-3 py-2.5 text-sm text-zinc-300 hover:bg-white/5"
              >
                Mbështetja
              </Link>
              <Link
                to="/"
                onClick={() => setMenuOpen(false)}
                className="rounded-lg px-3 py-2.5 text-sm text-zinc-500 hover:bg-white/5"
              >
                Ballina
              </Link>
              <hr className="my-2 border-white/5" />
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false)
                  onLogout()
                }}
                className="rounded-lg px-3 py-2.5 text-left text-sm text-rose-400 hover:bg-rose-500/10"
              >
                Dil nga llogaria
              </button>
            </nav>
          </div>
          <div className="flex-1" />
        </div>
      )}

      {/* Main content */}
      <main className="flex-1 px-4 pb-24 pt-2">
        {!token ? (
          <p className="text-sm text-zinc-500">Duke ngarkuar sesionin…</p>
        ) : (
          <Outlet />
        )}
      </main>

      {/* Assignment toast — positioned above bottom nav */}
      {assignmentToast && (
        <div
          className="fixed bottom-[5.5rem] left-1/2 z-[70] w-[min(100%-1.5rem,22rem)] -translate-x-1/2 rounded-xl border border-amber-400/40 bg-[#1a1420] px-4 py-3 shadow-xl shadow-black/40"
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
              className="rounded-lg border border-amber-500/30 bg-amber-500/15 px-3 py-1.5 text-xs font-medium text-amber-100 hover:bg-amber-500/25"
            >
              Hap panelin
            </Link>
            <button
              type="button"
              className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-zinc-400 hover:bg-white/5"
              onClick={() => clearAssignmentToast()}
            >
              Mbyll
            </button>
          </div>
        </div>
      )}

      {/* Bottom navigation bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-white/5 bg-[#0a0e17]/95 backdrop-blur-lg">
        <div className="mx-auto flex max-w-lg items-stretch justify-around px-2 py-2">
          <NavLink
            to="/driver"
            end
            className={({ isActive }) =>
              `flex flex-1 flex-col items-center gap-0.5 rounded-xl py-2 text-[11px] transition-colors ${
                isActive ? 'text-emerald-400' : 'text-zinc-500 active:text-zinc-300'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={isActive ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                  <polyline points="9 22 9 12 15 12 15 22" />
                </svg>
                <span className="font-medium">Paneli</span>
              </>
            )}
          </NavLink>

          <NavLink
            to="/driver/orders"
            className={({ isActive }) =>
              `flex flex-1 flex-col items-center gap-0.5 rounded-xl py-2 text-[11px] transition-colors ${
                isActive ? 'text-emerald-400' : 'text-zinc-500 active:text-zinc-300'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={isActive ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
                  <path d="M16 3h-8l-2 4h12z" />
                  <line x1="12" y1="11" x2="12" y2="17" />
                  <line x1="9" y1="14" x2="15" y2="14" />
                </svg>
                <span className="font-medium">Porosia</span>
              </>
            )}
          </NavLink>

          <NavLink
            to="/driver/earnings"
            className={({ isActive }) =>
              `flex flex-1 flex-col items-center gap-0.5 rounded-xl py-2 text-[11px] transition-colors ${
                isActive ? 'text-emerald-400' : 'text-zinc-500 active:text-zinc-300'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={isActive ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="4" width="20" height="16" rx="2" />
                  <path d="M2 10h20" />
                  <path d="M6 16h4" />
                </svg>
                <span className="font-medium">Të ardhurat</span>
              </>
            )}
          </NavLink>

          <NavLink
            to="/driver/profile"
            className={({ isActive }) =>
              `flex flex-1 flex-col items-center gap-0.5 rounded-xl py-2 text-[11px] transition-colors ${
                isActive ? 'text-emerald-400' : 'text-zinc-500 active:text-zinc-300'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={isActive ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
                <span className="font-medium">Profili</span>
              </>
            )}
          </NavLink>
        </div>
      </nav>
    </div>
  )
}
