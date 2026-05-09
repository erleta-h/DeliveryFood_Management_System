import { Navigate, Outlet } from 'react-router-dom'
import { canAccessAdminPanel, hasDriverRole } from '../lib/jwtRoles'
import { useAuthStore } from '../store/authStore'

export function DriverRoute() {
  const token = useAuthStore((s) => s.token)
  if (!token) return <Navigate to="/login?next=driver" replace />
  if (canAccessAdminPanel(token)) return <Navigate to="/admin" replace />
  if (!hasDriverRole(token))
    return <Navigate to="/" replace state={{ driverDenied: true }} />
  return <Outlet />
}
