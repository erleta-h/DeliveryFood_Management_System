import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { canAccessAdminPanel, hasDriverRole, hasRestaurantStaffRole } from '../lib/jwtRoles'
import { useAuthStore } from '../store/authStore'

/**
 * Nuk lejon /login ose /signup nëse je tashmë i kyçur — përveç rasteve kur duhet ndërrim llogarie
 * (p.sh. klient që hap /login?next=driver për hyrje Deliver).
 */
export function GuestRoute() {
  const token = useAuthStore((s) => s.token)
  const location = useLocation()
  if (token) {
    if (canAccessAdminPanel(token)) return <Navigate to="/admin" replace />

    const next = new URLSearchParams(location.search).get('next')
    const wantDriverLogin = location.pathname === '/login' && next === 'driver'
    const wantClientApp = next === 'app' || next === 'customer'

    /** Stafi → kuzhina, përveç nëse po hap /login me `next=driver` ose `next=app|customer`. */
    if (hasRestaurantStaffRole(token) && !wantDriverLogin && !wantClientApp)
      return <Navigate to="/kitchen" replace />

    if (hasDriverRole(token)) {
      if (wantDriverLogin) return <Outlet />
      return <Navigate to="/driver" replace />
    }
    if (wantDriverLogin) return <Outlet />
    return <Navigate to="/app" replace />
  }
  return <Outlet />
}

