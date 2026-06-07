import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { fetchKitchenContext, type KitchenStaffContext } from '../lib/kitchenApi'
import { hasCustomerRole } from '../lib/jwtRoles'
import { createOrdersHubConnection, isHubStartAbortError, startOrdersHub } from '../lib/orderHub'
import { customerBtnPrimary } from '../lib/customerTheme'
import { enableStaffCustomerAppMode } from '../lib/staffCustomerApp'
import { useAuthStore } from '../store/authStore'
import { useKitchenNotificationsStore } from '../store/kitchenNotificationsStore'

type CtxPhase = 'loading' | 'ready' | 'unauthorized' | 'error'

function navClass(isActive: boolean, accent = false) {
  const activeColor = accent ? 'text-[#ffc107]' : 'text-white'
  const barColor = accent ? 'after:bg-[#ffc107]' : 'after:bg-white'
  return `relative px-2 py-2 text-sm transition-colors ${
    isActive
      ? `font-medium ${activeColor} after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:rounded-full ${barColor}`
      : 'text-zinc-500 hover:text-zinc-200'
  }`
}

export default function KitchenLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const token = useAuthStore((s) => s.token)
  const logout = useAuthStore((s) => s.logout)
  const user = useAuthStore((s) => s.user)
  const [kitchenCtx, setKitchenCtx] = useState<KitchenStaffContext | null>(null)
  const [ctxPhase, setCtxPhase] = useState<CtxPhase>('loading')
  const kitchenUnread = useKitchenNotificationsStore((s) => s.unreadCount)
  const kitchenToast = useKitchenNotificationsStore((s) => s.toast)
  const clearKitchenToast = useKitchenNotificationsStore((s) => s.clearToast)
  const hubRef = useRef<ReturnType<typeof createOrdersHubConnection> | null>(null)

  useEffect(() => {
    if (!token) {
      setKitchenCtx(null)
      setCtxPhase('loading')
      return
    }
    let cancelled = false
    setCtxPhase('loading')
    void fetchKitchenContext(token).then((r) => {
      if (cancelled) return
      if (r.ok) {
        setKitchenCtx(r.context)
        setCtxPhase('ready')
        return
      }
      setKitchenCtx(null)
      setCtxPhase(r.reason === 'unauthorized' ? 'unauthorized' : 'error')
    })
    return () => {
      cancelled = true
    }
  }, [token])

  useEffect(() => {
    useKitchenNotificationsStore.getState().hydrateUnread()
  }, [])

  useEffect(() => {
    if (!token) return
    const hub = createOrdersHubConnection(token)
    hubRef.current = hub

    hub.on(
      'kitchenNotification',
      (data: { title?: string; message?: string; ticketId?: number; type?: string }) => {
        const store = useKitchenNotificationsStore.getState()
        if (data.type === 'support_reply' && typeof data.ticketId === 'number') {
          store.markTicketUnread(data.ticketId)
        }
        store.showToast({
          title: data.title ?? 'Përgjigje nga supporti',
          message: data.message ?? '',
          ticketId: typeof data.ticketId === 'number' ? data.ticketId : undefined,
        })
      },
    )

    let cancelled = false
    void startOrdersHub(hub, [{ kind: 'kitchen' }], { isCancelled: () => cancelled }).catch(
      (err: unknown) => {
        if (cancelled || isHubStartAbortError(err)) return
        console.warn('[KitchenHub] connection/join failed', err)
      },
    )
    return () => {
      cancelled = true
      void hub.stop().catch(() => {})
    }
  }, [token])

  useEffect(() => {
    if (!kitchenToast) return
    const t = setTimeout(() => clearKitchenToast(), 6000)
    return () => clearTimeout(t)
  }, [kitchenToast, clearKitchenToast])

  const restaurantTitle =
    kitchenCtx?.isLinked && kitchenCtx.restaurantName
      ? kitchenCtx.restaurantName.toUpperCase()
      : 'PANELI I RESTORANTIT'

  const kitchenLabel =
    kitchenCtx?.isLinked && kitchenCtx.restaurantName
      ? `Kuzhinë ${kitchenCtx.restaurantName.split(' ')[0]}`
      : user?.firstName
        ? `Kuzhinë ${user.firstName}`
        : 'Kuzhinë'

  function onReauth() {
    logout()
    void navigate('/partner/login', { replace: true })
  }

  if (user?.mustChangePassword && location.pathname !== '/kitchen/account') {
    return <Navigate to="/kitchen/account" replace />
  }

  return (
    <div className="min-h-screen bg-[#0d1117] font-sans text-zinc-200 antialiased">
      <header className="border-b border-[#30363d] bg-[#0d1117] px-4 py-3 sm:px-6">
        <div className="mx-auto flex max-w-[1600px] flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <p className="truncate text-sm font-bold tracking-wide text-white sm:text-base">
              {ctxPhase === 'loading' && token ? (
                <span className="animate-pulse text-zinc-500">Duke lidhur…</span>
              ) : (
                restaurantTitle
              )}
            </p>
            <p className="mt-0.5 text-xs text-zinc-500">
              {location.pathname.startsWith('/kitchen/menu')
                ? `${kitchenLabel} / Menaxho seksionet e menusë`
                : location.pathname.startsWith('/kitchen/branding')
                  ? `${kitchenLabel} / Branding i restorantit`
                : location.pathname.startsWith('/kitchen/history')
                  ? `${kitchenLabel} / Historiku i porosive`
                  : location.pathname.startsWith('/kitchen/account')
                    ? `${kitchenLabel} / Llogaria`
                    : location.pathname.startsWith('/kitchen/support')
                      ? `${kitchenLabel} / Mbështetja`
                      : `${kitchenLabel} / Porositë hyrëse`}
            </p>
          </div>
          <nav className="flex flex-wrap items-center gap-1 sm:gap-4">
            <NavLink to="/kitchen" end className={({ isActive }) => navClass(isActive)}>
              Porositë
            </NavLink>
            <NavLink to="/kitchen/history" className={({ isActive }) => navClass(isActive)}>
              Historiku
            </NavLink>
            <NavLink to="/kitchen/menu" className={({ isActive }) => navClass(isActive)}>
              Menuja
            </NavLink>
            <NavLink to="/kitchen/branding" className={({ isActive }) => navClass(isActive, true)}>
              Branding
            </NavLink>
            <NavLink to="/kitchen/account" className={({ isActive }) => navClass(isActive)}>
              Llogaria
            </NavLink>
            <Link
              to="/kitchen/support"
              className={`relative inline-flex items-center gap-1.5 px-2 py-2 text-sm transition-colors ${
                location.pathname.startsWith('/kitchen/support')
                  ? 'font-medium text-white after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:rounded-full after:bg-white'
                  : 'text-zinc-500 hover:text-zinc-200'
              }`}
              title={kitchenUnread > 0 ? `${kitchenUnread} përgjigje të reja` : 'Mbështetja'}
            >
              <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
              <span className="hidden sm:inline">Mbështetja</span>
              {kitchenUnread > 0 ? (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-0.5 text-[9px] font-bold text-white ring-2 ring-[#0d1117]">
                  {kitchenUnread > 9 ? '9+' : kitchenUnread}
                </span>
              ) : null}
            </Link>
            {token && hasCustomerRole(token) ? (
              <Link
                to="/app/restaurants"
                onClick={() => enableStaffCustomerAppMode()}
                className="hidden px-2 py-2 text-sm text-zinc-500 hover:text-zinc-200 sm:inline"
              >
                Porosit si klient
              </Link>
            ) : null}
            <Link to="/" className="px-2 py-2 text-sm text-zinc-500 hover:text-zinc-200">
              Ballina
            </Link>
            <button
              type="button"
              onClick={() => logout()}
              className="rounded-lg border border-[#30363d] px-3 py-1.5 text-sm text-zinc-300 hover:bg-[#21262d]"
            >
              Dil
            </button>
          </nav>
        </div>
      </header>

      {ctxPhase === 'unauthorized' ? (
        <div className="mx-auto max-w-[1600px] px-4 pt-4 sm:px-6">
          <div className="rounded-xl border border-red-500/35 bg-red-500/10 px-4 py-3 text-sm text-red-100">
            <p className="font-medium">Sesioni nuk është më i vlefshëm ose nuk ke akses në panel.</p>
            <p className="mt-1 text-xs text-red-200/80">
              Dil dhe hyr përsëri me emailin e stafit te hyrja e partnerit.
            </p>
            <button type="button" onClick={() => onReauth()} className={`${customerBtnPrimary} mt-3 text-sm`}>
              Hyr përsëri
            </button>
          </div>
        </div>
      ) : null}

      {ctxPhase === 'error' ? (
        <div className="mx-auto max-w-[1600px] px-4 pt-4 sm:px-6">
          <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
            Nuk u lexua dot lidhja me restorantin (rrjet ose server). Rifresko faqen ose kontrollo nëse API është
            ndezur.
          </p>
        </div>
      ) : null}

      {ctxPhase === 'ready' && kitchenCtx && !kitchenCtx.isLinked ? (
        <div className="mx-auto max-w-[1600px] px-4 pt-6 sm:px-6">
          <p className="rounded-xl border border-amber-500/35 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
            <strong className="font-semibold">Llogaria nuk është lidhur me restorant.</strong> Kontakto administratorin
            për lidhjen e stafit me restorantin.
          </p>
        </div>
      ) : null}

      <main className="mx-auto max-w-[1600px] px-3 py-5 sm:px-6 sm:py-6">
        <Outlet />
      </main>

      {kitchenToast && (
        <div
          role={kitchenToast.ticketId != null ? 'button' : undefined}
          tabIndex={kitchenToast.ticketId != null ? 0 : undefined}
          onClick={() => {
            if (kitchenToast.ticketId != null) {
              clearKitchenToast()
              void navigate(`/kitchen/support?ticket=${kitchenToast.ticketId}`)
            }
          }}
          onKeyDown={(e) => {
            if (kitchenToast.ticketId != null && (e.key === 'Enter' || e.key === ' ')) {
              e.preventDefault()
              clearKitchenToast()
              void navigate(`/kitchen/support?ticket=${kitchenToast.ticketId}`)
            }
          }}
          className={`fixed bottom-6 right-6 z-[100] max-w-sm animate-[fadeSlideUp_0.3s_ease-out] rounded-xl border border-violet-500/30 bg-[#1a1030] px-4 py-3 shadow-2xl shadow-black/50 ${
            kitchenToast.ticketId != null ? 'cursor-pointer hover:border-violet-400/50' : ''
          }`}
        >
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-violet-500/20 text-sm">
              💬
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-violet-200">{kitchenToast.title}</p>
              <p className="mt-0.5 line-clamp-2 text-xs text-zinc-400">{kitchenToast.message}</p>
              {kitchenToast.ticketId != null ? (
                <p className="mt-1 text-[10px] text-violet-300/80">Kliko për të hapur tiketën</p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                clearKitchenToast()
              }}
              className="shrink-0 text-zinc-500 hover:text-zinc-300"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
