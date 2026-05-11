import { lazy, Suspense } from 'react'
import { Navigate } from 'react-router-dom'
import { hasAdminRole } from '../lib/jwtRoles'
import { PageSpinner } from '../components/PageSpinner'
import { useAuthStore } from '../store/authStore'

const AdminDashboardPage = lazy(() => import('./AdminDashboardPage'))

export default function AdminHomeEntry() {
  const token = useAuthStore((s) => s.token)
  if (!hasAdminRole(token)) return <Navigate to="/admin/support" replace />
  return (
    <Suspense fallback={<PageSpinner />}>
      <AdminDashboardPage />
    </Suspense>
  )
}
