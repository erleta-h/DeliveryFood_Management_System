import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { hasAdminRole, hasCustomerRole, hasDriverRole, hasRestaurantStaffRole } from '../lib/jwtRoles'
import { useAuthStore } from '../store/authStore'

/**
 * Nuk lejon /login ose /signup nëse je tashmë i kyçur — përveç rasteve kur duhet ndërrim llogarie
 * (p.sh. klient që hap /login?next=driver për hyrje Deliver).
 */
export function GuestRoute() {
  const token = useAuthStore((s) => s.token)
  const location = useLocation()
  if (token) {
    if (hasAdminRole(token)) return <Navigate to="/admin" replace />
    if (hasDriverRole(token)) return <Navigate to="/driver" replace />
    if (hasRestaurantStaffRole(token) && !hasCustomerRole(token))
      return <Navigate to="/kitchen" replace />
    const wantDriverLogin =
      location.pathname === '/login' && new URLSearchParams(location.search).get('next') === 'driver'
    if (wantDriverLogin) return <Outlet />
    return <Navigate to="/app" replace />
  }
  return <Outlet />
}
