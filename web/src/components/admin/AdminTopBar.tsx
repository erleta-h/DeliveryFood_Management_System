import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AdminNotificationBell } from './AdminNotificationBell'
import { useAuthStore } from '../../store/authStore'

function initials(first?: string, last?: string, email?: string) {
  const a = first?.trim()?.[0] ?? ''
  const b = last?.trim()?.[0] ?? ''
  if (a || b) return `${a}${b}`.toUpperCase()
  return (email?.[0] ?? 'A').toUpperCase()
}

export function AdminTopBar() {
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)

  function handleLogout() {
    setMenuOpen(false)
    logout()
    navigate('/login?next=admin', { replace: true })
  }

  return (
    <header className="shrink-0 border-b border-gray-200/80 bg-white px-4 py-2 lg:px-6">
      <div className="mx-auto flex h-9 max-w-[1600px] items-center justify-between gap-2">
        <p className="text-xs font-medium text-gray-500 lg:hidden">Paneli admin</p>

        <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
          <AdminNotificationBell />

          <button
            type="button"
            onClick={handleLogout}
            className="hidden h-8 items-center rounded-lg border border-red-200 bg-red-50 px-2.5 text-xs font-medium text-red-700 transition hover:bg-red-100 sm:inline-flex"
            title="Dil nga llogaria e adminit"
          >
            Dil
          </button>

          <div className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen((o) => !o)}
              className="flex h-8 items-center gap-1.5 rounded-lg border border-gray-200 bg-gray-50 py-0 pl-0.5 pr-2 transition hover:border-violet-200 hover:bg-violet-50/50"
              aria-expanded={menuOpen}
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-md bg-violet-600 text-xs font-semibold text-white">
                {initials(user?.firstName, user?.lastName, user?.email)}
              </span>
              <span className="hidden max-w-[140px] truncate text-left md:block">
                <span className="block text-xs font-medium leading-tight text-gray-900">
                  {user?.firstName} {user?.lastName}
                </span>
                <span className="block text-[10px] leading-tight text-gray-500">Administrator</span>
              </span>
            </button>
            {menuOpen ? (
              <>
                <button
                  type="button"
                  className="fixed inset-0 z-40"
                  aria-label="Mbyll menunë"
                  onClick={() => setMenuOpen(false)}
                />
                <div className="absolute right-0 z-50 mt-2 w-52 rounded-xl border border-gray-200 bg-white py-1 shadow-lg">
                  <p className="border-b border-gray-100 px-3 py-2 text-xs text-gray-500">{user?.email}</p>
                  <Link
                    to="/admin/settings"
                    className="block px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    onClick={() => setMenuOpen(false)}
                  >
                    Cilësimet
                  </Link>
                  <button
                    type="button"
                    className="w-full border-t border-gray-100 px-3 py-2.5 text-left text-sm font-medium text-red-600 hover:bg-red-50"
                    onClick={handleLogout}
                  >
                    Dil nga platforma
                  </button>
                </div>
              </>
            ) : null}
          </div>
        </div>
      </div>
    </header>
  )
}
