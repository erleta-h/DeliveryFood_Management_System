import { Navigate, Outlet } from 'react-router-dom'
import { hasAdminRole } from '../lib/jwtRoles'
import { useAuthStore } from '../store/authStore'

export function AdminRoute() {
  const token = useAuthStore((s) => s.token)
  if (!token) return <Navigate to="/login?next=admin" replace />
  if (!hasAdminRole(token)) return <Navigate to="/" replace />
  return <Outlet />
}
