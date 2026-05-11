import { useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { getVisibleAdminNavGroups } from '../lib/adminNav'
import { customerShellBg } from '../lib/customerTheme'
import { useAuthStore } from '../store/authStore'

function navClass(isActive: boolean) {
  return [
    'flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors',
    isActive
      ? 'bg-violet-600/25 text-violet-100'
      : 'text-zinc-400 hover:bg-white/5 hover:text-zinc-200',
  ].join(' ')
}

export default function AdminLayout() {
  const logout = useAuthStore((s) => s.logout)
  const user = useAuthStore((s) => s.user)
  const token = useAuthStore((s) => s.token)
  const navGroups = getVisibleAdminNavGroups(token)
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className={`${customerShellBg} min-h-screen`}>
      <header className="sticky top-0 z-40 border-b border-violet-500/25 bg-[#1a1625]/95 px-4 py-3 backdrop-blur-md lg:hidden">
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            className="rounded-lg border border-white/15 px-3 py-2 text-sm text-zinc-200"
            onClick={() => setSidebarOpen((o) => !o)}
            aria-expanded={sidebarOpen}
            aria-controls="admin-sidebar"
          >
            Menu
          </button>
          <span className="text-sm font-medium text-zinc-300">Admin</span>
          <Link
            to="/"
            className="rounded-lg px-2 py-2 text-xs text-zinc-400 hover:text-zinc-200"
          >
            Ballina
          </Link>
        </div>
      </header>

      <div className="mx-auto flex max-w-[1600px]">
        <aside
          id="admin-sidebar"
          className={[
            'fixed inset-y-0 left-0 z-30 w-64 shrink-0 border-r border-violet-500/20 bg-[#141218]/98 pt-14 backdrop-blur-md transition-transform lg:static lg:pt-0',
            sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
          ].join(' ')}
        >
          <div className="flex h-full flex-col overflow-y-auto px-3 py-4 lg:max-h-screen">
            <div className="mb-6 hidden px-2 lg:block">
              <p className="text-xs font-semibold uppercase tracking-wider text-violet-300/90">
                Paneli i platformës
              </p>
              <p className="mt-1 truncate text-sm text-zinc-400">
                {user?.firstName} {user?.lastName}
              </p>
              <Link
                to="/"
                className="mt-2 inline-block text-xs text-zinc-500 hover:text-violet-300 hover:underline"
              >
                ← Ballina publike
              </Link>
            </div>

            <nav className="flex flex-1 flex-col gap-6" aria-label="Admin">
              {navGroups.map((group) => (
                <div key={group.title}>
                  <p className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-600">
                    {group.title}
                  </p>
                  <ul className="space-y-0.5">
                    {group.items.map((item) => (
                      <li key={item.to}>
                        <NavLink
                          to={item.to}
                          end={item.to === '/admin'}
                          className={({ isActive }) => navClass(isActive)}
                          onClick={() => setSidebarOpen(false)}
                        >
                          <span aria-hidden>{item.icon}</span>
                          {item.label}
                        </NavLink>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </nav>

            <div className="mt-6 border-t border-white/10 pt-4">
              <button
                type="button"
                onClick={() => logout()}
                className="w-full rounded-lg border border-white/15 px-3 py-2 text-left text-sm text-zinc-300 hover:bg-white/5"
              >
                Dil
              </button>
            </div>
          </div>
        </aside>

        {sidebarOpen ? (
          <button
            type="button"
            className="fixed inset-0 z-20 bg-black/50 lg:hidden"
            aria-label="Mbyll menunë"
            onClick={() => setSidebarOpen(false)}
          />
        ) : null}

        <main className="min-h-[calc(100vh-3.5rem)] flex-1 px-4 py-6 lg:min-h-screen lg:px-8 lg:py-8">
          <Outlet key={location.pathname} />
        </main>
      </div>
    </div>
  )
}
