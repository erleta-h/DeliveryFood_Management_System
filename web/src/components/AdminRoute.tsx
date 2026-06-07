import { Navigate, Outlet } from 'react-router-dom'
import { accessTokenExpired } from '../lib/apiClient'
import { hasAdminRole } from '../lib/jwtRoles'
import { useAuthStore } from '../store/authStore'

export function AdminRoute() {
  const token = useAuthStore((s) => s.token)
  const expiresAtUtc = useAuthStore((s) => s.expiresAtUtc)
  if (!token || accessTokenExpired(expiresAtUtc)) {
    return <Navigate to="/login?next=admin" replace />
  }
  if (!hasAdminRole(token)) return <Navigate to="/" replace />
  return <Outlet />
}
