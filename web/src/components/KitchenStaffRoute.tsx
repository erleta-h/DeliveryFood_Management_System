import { Navigate, Outlet } from 'react-router-dom'
import { canAccessAdminPanel, hasRestaurantStaffRole } from '../lib/jwtRoles'
import { useAuthStore } from '../store/authStore'

/** Vetëm përdorues me rol RestaurantStaff (JWT). */
export function KitchenStaffRoute() {
  const token = useAuthStore((s) => s.token)
  if (!token) return <Navigate to="/login?next=kitchen" replace />
  if (!hasRestaurantStaffRole(token))
    return canAccessAdminPanel(token) ? (
      <Navigate to="/admin" replace />
    ) : (
      <Navigate to="/" replace state={{ kitchenDenied: true }} />
    )
  return <Outlet />
}
