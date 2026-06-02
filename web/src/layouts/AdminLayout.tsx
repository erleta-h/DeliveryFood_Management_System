import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'

import { AdminTopBar } from '../components/admin/AdminTopBar'

import { getVisibleAdminNavGroups } from '../lib/adminNav'
import { createOrdersHubConnection, startOrdersHub } from '../lib/orderHub'

import { customerShellBg } from '../lib/adminTheme'

import { useAuthStore } from '../store/authStore'
import { useAdminNotificationsStore } from '../store/adminNotificationsStore'



function navClass(isActive: boolean) {

  return [

    'flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200',

    isActive

      ? 'border border-violet-200 bg-violet-50 text-violet-800 shadow-sm'

      : 'border border-transparent text-gray-600 hover:border-gray-200 hover:bg-gray-100 hover:text-gray-900',

  ].join(' ')

}



export default function AdminLayout() {

  const logout = useAuthStore((s) => s.logout)

  const user = useAuthStore((s) => s.user)

  const token = useAuthStore((s) => s.token)

  const navigate = useNavigate()
  const navGroups = getVisibleAdminNavGroups(token)
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const adminToast = useAdminNotificationsStore((s) => s.toast)
  const clearToast = useAdminNotificationsStore((s) => s.clearToast)
  const hubRef = useRef<ReturnType<typeof createOrdersHubConnection> | null>(null)

  useEffect(() => {
    if (!token) return
    const hub = createOrdersHubConnection(token)
    hubRef.current = hub

    hub.on('adminNotification', (data: {
      id?: number
      title?: string
      message?: string
      type?: string
      linkPath?: string
      ticketId?: number
      createdAtUtc?: string
    }) => {
      const store = useAdminNotificationsStore.getState()
      const linkPath =
        data.linkPath ?? (data.ticketId != null ? `/admin/support?ticket=${data.ticketId}` : null)
      store.pushLive({
        id: data.id ?? 0,
        title: data.title ?? 'Njoftim',
        message: data.message ?? '',
        type: data.type ?? '',
        linkPath,
        createdAtUtc: data.createdAtUtc ?? new Date().toISOString(),
        isRead: false,
      })
      store.bumpUnread()
      store.showToast({
        title: data.title ?? 'Njoftim',
        message: data.message ?? '',
        linkPath: linkPath ?? undefined,
      })
    })

    void startOrdersHub(hub, [{ kind: 'admin' }]).catch((err: unknown) =>
      console.warn('[AdminHub] connection/join failed', err),
    )
    return () => { hub.stop().catch(() => {}) }
  }, [token])

  useEffect(() => {
    if (!adminToast) return
    const t = setTimeout(() => clearToast(), 6000)
    return () => clearTimeout(t)
  }, [adminToast, clearToast])

  function handleLogout() {
    logout()
    setSidebarOpen(false)
    navigate('/login?next=admin', { replace: true })
  }

  return (

    <div className={`${customerShellBg} min-h-screen`}>

      <header className="sticky top-0 z-40 border-b border-gray-200 bg-white/95 px-4 py-3 backdrop-blur-md lg:hidden">

        <div className="flex items-center justify-between gap-3">

          <button

            type="button"

            className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700"

            onClick={() => setSidebarOpen((o) => !o)}

            aria-expanded={sidebarOpen}

            aria-controls="admin-sidebar"

          >

            Menu

          </button>

          <span className="text-sm font-medium text-gray-700">Admin</span>

          <button
            type="button"
            onClick={handleLogout}
            className="rounded-lg border border-red-200 bg-red-50 px-2 py-2 text-xs font-medium text-red-700"
          >
            Dil
          </button>
        </div>
      </header>



      <div className="mx-auto flex max-w-[1600px]">

        <aside

          id="admin-sidebar"

          className={[

            'fixed inset-y-0 left-0 z-30 w-64 shrink-0 border-r border-gray-200 bg-white pt-14 shadow-sm transition-transform lg:static lg:pt-0',

            sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',

          ].join(' ')}

        >

          <div className="flex h-full flex-col overflow-y-auto px-3 py-4 lg:max-h-screen">

            <div className="mb-6 hidden px-2 lg:block">

              <p className="text-xs font-semibold uppercase tracking-wider text-violet-600">

                Paneli i platformës

              </p>

              <p className="mt-1 truncate text-sm text-gray-800">

                {user?.firstName} {user?.lastName}

              </p>

              <Link

                to="/"

                className="mt-2 inline-block text-xs text-gray-500 transition hover:text-violet-600 hover:underline"

              >

                ← Ballina publike

              </Link>

            </div>



            <nav className="flex flex-1 flex-col gap-6" aria-label="Admin">

              {navGroups.map((group) => (

                <div key={group.title}>

                  <p className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-wider text-gray-400">

                    {group.title}

                  </p>

                  <ul className="space-y-1">

                    {group.items.map((item) => (

                      <li key={item.to}>

                        <NavLink

                          to={item.to}

                          end={item.to === '/admin'}

                          className={({ isActive }) => navClass(isActive)}

                          onClick={() => setSidebarOpen(false)}

                        >

                          <span aria-hidden className="text-base opacity-90">

                            {item.icon}

                          </span>

                          {item.label}

                        </NavLink>

                      </li>

                    ))}

                  </ul>

                </div>

              ))}

            </nav>



            <div className="mt-auto border-t border-gray-200 pt-4">
              <button
                type="button"
                onClick={handleLogout}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm font-medium text-red-700 transition hover:border-red-300 hover:bg-red-100"
              >
                <span aria-hidden>⎋</span>
                Dil nga platforma
              </button>
            </div>

          </div>

        </aside>



        {sidebarOpen ? (

          <button

            type="button"

            className="fixed inset-0 z-20 bg-black/30 lg:hidden"

            aria-label="Mbyll menunë"

            onClick={() => setSidebarOpen(false)}

          />

        ) : null}



        <main className="min-h-[calc(100vh-3.5rem)] flex-1 px-4 py-6 lg:min-h-screen lg:px-8 lg:py-8">

          <AdminTopBar />

          <Outlet key={location.pathname} />

        </main>

      </div>

      {adminToast && (
        <div
          role={adminToast.linkPath ? 'button' : undefined}
          tabIndex={adminToast.linkPath ? 0 : undefined}
          onClick={() => {
            if (adminToast.linkPath) {
              clearToast()
              navigate(adminToast.linkPath)
            }
          }}
          onKeyDown={(e) => {
            if (adminToast.linkPath && (e.key === 'Enter' || e.key === ' ')) {
              e.preventDefault()
              clearToast()
              navigate(adminToast.linkPath)
            }
          }}
          className={`fixed bottom-6 right-6 z-[100] max-w-sm animate-[fadeSlideUp_0.3s_ease-out] rounded-xl border border-violet-200 bg-white px-4 py-3 shadow-xl ${
            adminToast.linkPath ? 'cursor-pointer hover:border-violet-300' : ''
          }`}
        >
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-violet-100 text-sm">💬</span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-gray-900">{adminToast.title}</p>
              <p className="mt-0.5 line-clamp-2 text-xs text-gray-600">{adminToast.message}</p>
              {adminToast.linkPath ? (
                <p className="mt-1 text-[10px] font-medium text-violet-600">Kliko për të hapur →</p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); clearToast() }}
              className="shrink-0 text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>
        </div>
      )}

    </div>

  )

}


