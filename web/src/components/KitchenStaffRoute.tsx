import { Navigate, Outlet } from 'react-router-dom'
import { hasAdminRole, hasRestaurantStaffRole } from '../lib/jwtRoles'
import { useAuthStore } from '../store/authStore'


export function KitchenStaffRoute() {
  const token = useAuthStore((s) => s.token)
  if (!token) return <Navigate to="/login?next=kitchen" replace />
  if (!hasRestaurantStaffRole(token))
    return hasAdminRole(token) ? (
      <Navigate to="/admin" replace />
    ) : (
      <Navigate to="/" replace state={{ kitchenDenied: true }} />
    )
  return <Outlet />
}
