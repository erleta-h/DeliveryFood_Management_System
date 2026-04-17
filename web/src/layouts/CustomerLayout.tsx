import { NavLink, Navigate, Outlet } from 'react-router-dom'
import { BrandLogo } from '../components/BrandLogo'
import { hasAdminRole, hasCustomerRole, hasRestaurantStaffRole } from '../lib/jwtRoles'
import { customerShellBg } from '../lib/customerTheme'
import { useAuthStore } from '../store/authStore'

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `rounded-lg px-3 py-2 text-sm font-medium transition ${
    isActive
      ? 'bg-white/10 text-amber-100'
      : 'text-zinc-400 hover:bg-white/5 hover:text-zinc-200'
  }`

export default function CustomerLayout() {
  const token = useAuthStore((s) => s.token)
  const logout = useAuthStore((s) => s.logout)
  const user = useAuthStore((s) => s.user)

  if (token && hasAdminRole(token)) return <Navigate to="/admin" replace />

  /** Vetëm stafi i restorantit (pa rol klienti) — jo thjesht «jo Customer», që të mos përzihet me JWT të palexueshëm. */
  if (token && hasRestaurantStaffRole(token) && !hasCustomerRole(token))
    return <Navigate to="/kitchen" replace />

  return (
    <div className={customerShellBg}>
      <header className="border-b border-white/[0.08] bg-[#1a1f2e]/40 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:gap-3">
            <BrandLogo to="/app/restaurants" compact className="shrink-0" />
            {user ? (
              <span className="text-xs text-zinc-500 sm:text-sm">
                {user.firstName} · {user.city}
              </span>
            ) : null}
          </div>
          <nav className="flex flex-wrap items-center gap-1">
            <NavLink to="/app/restaurants" className={linkClass}>
              Restorantet
            </NavLink>
            <NavLink to="/app/cart" className={linkClass}>
              Shporta
            </NavLink>
            <NavLink to="/app/addresses" className={linkClass}>
              Adresat
            </NavLink>
            <NavLink to="/app/orders" className={linkClass}>
              Porositë
            </NavLink>
            <NavLink to="/app/account" className={linkClass}>
              Llogaria
            </NavLink>
            <button
              type="button"
              onClick={() => logout()}
              className="ml-1 rounded-lg border border-white/15 px-3 py-2 text-sm text-zinc-300 hover:bg-white/5"
            >
              Dil
            </button>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">
        <Outlet />
      </main>
    </div>
  )
}
