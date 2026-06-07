import { NavLink, Navigate, Outlet, useNavigate } from 'react-router-dom'
import { BrandLogo } from '../components/BrandLogo'
import { CustomerOrderFloatWidget } from '../components/CustomerOrderFloatWidget'
import { hasAdminRole, hasCustomerRole, hasRestaurantStaffRole } from '../lib/jwtRoles'
import { createOrdersHubConnection, isHubStartAbortError, startOrdersHub } from '../lib/orderHub'
import { normalizeDeliveryChatMessage } from '../lib/deliveryChatApi'
import { customerShellBg } from '../lib/customerTheme'
import { ORDER_STATUS_CANCELLED } from '../lib/orderStatusLabels'
import { useAuthStore } from '../store/authStore'
import { useCartStore } from '../store/cartStore'
import { useCustomerNotificationsStore } from '../store/customerNotificationsStore'
import { useFavoriteRestaurantsStore } from '../store/favoriteRestaurantsStore'
import { useEffect, useRef } from 'react'

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `rounded-lg px-3 py-2 text-sm font-medium transition ${
    isActive
      ? 'bg-[#F5B800]/15 text-[#F5B800] ring-1 ring-[#F5B800]/25'
      : 'text-zinc-400 hover:bg-white/5 hover:text-zinc-200'
  }`

export default function CustomerLayout() {
  const token = useAuthStore((s) => s.token)
  const logout = useAuthStore((s) => s.logout)
  const user = useAuthStore((s) => s.user)
  const navigate = useNavigate()
  const cartCount = useCartStore((s) =>
    s.lines.reduce((n, line) => n + line.quantity, 0),
  )
  const loadFavorites = useFavoriteRestaurantsStore((s) => s.load)
  const resetFavorites = useFavoriteRestaurantsStore((s) => s.reset)
  const favoritesLoaded = useFavoriteRestaurantsStore((s) => s.loaded)
  const supportToast = useCustomerNotificationsStore((s) => s.supportToast)
  const clearSupportToast = useCustomerNotificationsStore((s) => s.clearSupportToast)
  const orderToast = useCustomerNotificationsStore((s) => s.orderToast)
  const clearOrderToast = useCustomerNotificationsStore((s) => s.clearOrderToast)

  const hubRef = useRef<ReturnType<typeof createOrdersHubConnection> | null>(null)

  useEffect(() => {
    if (!token) {
      resetFavorites()
      return
    }
    if (!favoritesLoaded) void loadFavorites(token)
  }, [token, favoritesLoaded, loadFavorites, resetFavorites])

  useEffect(() => {
    if (!token) return
    const hub = createOrdersHubConnection(token)
    hubRef.current = hub

    hub.on('customerOrderStatus', (data: {
      orderId?: number
      status?: number
      title?: string
      message?: string
      cancellationReason?: string | null
    }) => {
      useCustomerNotificationsStore.getState().bumpUnread()
      if (data.status !== ORDER_STATUS_CANCELLED) return
      const reason = data.cancellationReason?.trim()
      useCustomerNotificationsStore.getState().showOrderToast({
        title: data.title ?? 'Porosia u anulua',
        message: reason
          ? reason
          : (data.message ?? 'Restoranti e anuloi porosinë tuaj.'),
        orderId: data.orderId,
      })
      window.dispatchEvent(new CustomEvent('fd-refresh-active-order'))
    })

    hub.on('customerNotification', (data: { title?: string; message?: string; type?: string; ticketId?: number }) => {
      useCustomerNotificationsStore.getState().bumpUnread()
      if (data.type === 'support_reply') {
        useCustomerNotificationsStore.getState().showSupportToast({
          title: data.title ?? 'Mbështetja',
          message: data.message ?? 'Përgjigje e re nga stafi.',
          ticketId: data.ticketId,
        })
      }
    })

    hub.on('supportTicketMessageReceived', (data: {
      ticketId: number; messageId: number; authorUserId: number;
      authorEmail: string; isStaffReply: boolean; body: string; createdAtUtc: string
    }) => {
      useCustomerNotificationsStore.getState().pushSupportMessage(data)
    })

    hub.on('deliveryChatMessage', (raw: unknown) => {
      const m = normalizeDeliveryChatMessage(raw)
      if (!m || m.senderRole !== 'driver') return
      useCustomerNotificationsStore.getState().bumpUnread()
    })

    let cancelled = false
    void startOrdersHub(hub, [{ kind: 'customer' }], { isCancelled: () => cancelled }).catch((err: unknown) => {
      if (cancelled || isHubStartAbortError(err)) return
      console.warn('[CustomerHub] connection/join failed', err)
    })
    return () => {
      cancelled = true
      void hub.stop().catch(() => {})
    }
  }, [token])

  useEffect(() => {
    if (!supportToast) return
    const t = setTimeout(() => clearSupportToast(), 6000)
    return () => clearTimeout(t)
  }, [supportToast, clearSupportToast])

  useEffect(() => {
    if (!orderToast) return
    const t = setTimeout(() => clearOrderToast(), 8000)
    return () => clearTimeout(t)
  }, [orderToast, clearOrderToast])

  if (token && hasAdminRole(token)) return <Navigate to="/admin" replace />

  if (token && hasRestaurantStaffRole(token) && !hasCustomerRole(token))
    return <Navigate to="/kitchen" replace />

  const initials = user
    ? `${user.firstName?.charAt(0) ?? ''}${user.lastName?.charAt(0) ?? user.firstName?.charAt(1) ?? ''}`.toUpperCase() || 'KL'
    : 'KL'

  const locationLabel = user
    ? `DËRGESA NË ${user.city}${user.postalCode ? `, ${user.postalCode}` : ''}`
    : 'Zgjidh adresën'

  return (
    <div className={customerShellBg}>
      <header className="sticky top-0 z-50 border-b border-white/[0.08] bg-[#0f121c]/90 backdrop-blur-lg">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div className="flex min-w-0 items-center gap-3">
            <BrandLogo to="/app/restaurants" compact className="shrink-0" />
            <button
              type="button"
              onClick={() => navigate('/app/addresses')}
              className="flex min-w-0 max-w-[11rem] items-center gap-1 rounded-lg border border-white/10 bg-[#141a28] px-2.5 py-1.5 text-left transition hover:border-[#F5B800]/30 sm:max-w-xs"
            >
              <span className="truncate text-[11px] font-medium text-zinc-300 sm:text-xs">{locationLabel}</span>
              <span className="shrink-0 text-zinc-500" aria-hidden>
                ▾
              </span>
            </button>
          </div>
          <nav className="flex flex-wrap items-center gap-1">
            <NavLink to="/app/restaurants" className={linkClass}>
              Restorantet
            </NavLink>
            <NavLink to="/app/cart" className={linkClass}>
              <span className="relative inline-flex items-center gap-1.5">
                Shporta
                {cartCount > 0 ? (
                  <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                    {cartCount > 99 ? '99+' : cartCount}
                  </span>
                ) : null}
              </span>
            </NavLink>
            <NavLink to="/app/addresses" className={linkClass}>
              Adresat
            </NavLink>
            <NavLink to="/app/orders" className={linkClass}>
              Porositë
            </NavLink>
            <NavLink to="/app/support" className={linkClass}>
              Mbështetja
            </NavLink>
            <NavLink to="/app/account" className={linkClass}>
              <span className="inline-flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#141a28] text-xs font-bold text-[#F5B800] ring-1 ring-white/10">
                  {initials}
                </span>
                <span className="hidden sm:inline">Llogaria</span>
              </span>
            </NavLink>
            <button
              type="button"
              onClick={() => logout()}
              className="ml-1 rounded-lg border border-white/15 px-3 py-2 text-sm text-zinc-400 transition hover:text-zinc-200"
            >
              Dil
            </button>
          </nav>
        </div>
      </header>
      <CustomerOrderFloatWidget />
      {orderToast && (
        <div
          role="status"
          onClick={() => {
            clearOrderToast()
            if (orderToast.orderId != null) navigate(`/app/orders/${orderToast.orderId}`)
          }}
          className={`fixed bottom-6 left-6 z-[100] max-w-sm animate-[fadeSlideUp_0.3s_ease-out] rounded-xl border border-red-500/35 bg-[#1a1214] px-4 py-3 shadow-2xl shadow-black/50 ${
            orderToast.orderId != null ? 'cursor-pointer hover:border-red-400/50' : ''
          }`}
        >
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-500/20 text-sm">
              ✕
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-red-200">{orderToast.title}</p>
              <p className="mt-0.5 line-clamp-3 text-xs text-zinc-300">{orderToast.message}</p>
              {orderToast.orderId != null ? (
                <p className="mt-1 text-[10px] font-medium text-red-400/80">Kliko për detajet e porosisë →</p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                clearOrderToast()
              }}
              className="shrink-0 text-zinc-500 hover:text-zinc-300"
            >
              ✕
            </button>
          </div>
        </div>
      )}
      {supportToast && (
        <div
          role={supportToast.ticketId != null ? 'button' : undefined}
          tabIndex={supportToast.ticketId != null ? 0 : undefined}
          onClick={() => {
            if (supportToast.ticketId != null) {
              clearSupportToast()
              navigate(`/app/support?ticket=${supportToast.ticketId}`)
            }
          }}
          className={`fixed bottom-6 right-6 z-[100] max-w-sm animate-[fadeSlideUp_0.3s_ease-out] rounded-xl border border-violet-500/30 bg-[#1a1030] px-4 py-3 shadow-2xl shadow-black/50 ${
            supportToast.ticketId != null ? 'cursor-pointer hover:border-violet-400/50' : ''
          }`}
        >
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-violet-500/20 text-sm">💬</span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-violet-200">{supportToast.title}</p>
              <p className="mt-0.5 line-clamp-2 text-xs text-zinc-400">{supportToast.message}</p>
              {supportToast.ticketId != null ? (
                <p className="mt-1 text-[10px] font-medium text-violet-400/80">Kliko për të hapur tiketën →</p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); clearSupportToast() }}
              className="shrink-0 text-zinc-500 hover:text-zinc-300"
            >
              ✕
            </button>
          </div>
        </div>
      )}
      <main className="mx-auto max-w-6xl px-4 py-6 sm:py-8">
        <Outlet />
      </main>
    </div>
  )
}