import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'

import { AdminIcon } from '../components/admin/adminIcons'
import { AdminTopBar } from '../components/admin/AdminTopBar'

import { getVisibleAdminNavGroups } from '../lib/adminNav'
import { createOrdersHubConnection, startOrdersHub } from '../lib/orderHub'

import { customerShellBg } from '../lib/adminTheme'

import { useAuthStore } from '../store/authStore'
import {
  isAdminSupportNotificationType,
  supportTicketIdFromNotification,
} from '../lib/adminSupportRead'
import { useAdminNotificationsStore } from '../store/adminNotificationsStore'

function navClass(isActive: boolean) {
  return [
    'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150',
    isActive
      ? 'bg-violet-600 text-white shadow-md shadow-violet-900/30'
      : 'text-gray-400 hover:bg-white/[0.06] hover:text-gray-100',
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
  const supportUnreadCount = useAdminNotificationsStore((s) => s.supportUnreadCount)
  const hydrateSupportUnread = useAdminNotificationsStore((s) => s.hydrateSupportUnread)
  const hubRef = useRef<ReturnType<typeof createOrdersHubConnection> | null>(null)

  useEffect(() => {
    document.documentElement.classList.add('admin-panel')
    return () => document.documentElement.classList.remove('admin-panel')
  }, [])

  useEffect(() => {
    hydrateSupportUnread()
  }, [hydrateSupportUnread])

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
      if (isAdminSupportNotificationType(data.type)) {
        const ticketId = supportTicketIdFromNotification(data)
        if (ticketId != null) store.markSupportTicketUnread(ticketId)
      }
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

  const initials =
    `${user?.firstName?.trim()?.[0] ?? ''}${user?.lastName?.trim()?.[0] ?? ''}`.toUpperCase() ||
    (user?.email?.[0] ?? 'A').toUpperCase()

  return (
    <div className={`${customerShellBg} flex`}>
      <header className="fixed inset-x-0 top-0 z-40 flex items-center justify-between gap-3 border-b border-gray-800 bg-[#0f1419] px-4 py-3 lg:hidden">
        <button
          type="button"
          className="rounded-lg border border-gray-700 px-3 py-2 text-sm text-gray-200"
          onClick={() => setSidebarOpen((o) => !o)}
          aria-expanded={sidebarOpen}
          aria-controls="admin-sidebar"
        >
          Menu
        </button>
        <span className="text-sm font-medium text-gray-200">Platform Admin</span>
        <button
          type="button"
          onClick={handleLogout}
          className="rounded-lg border border-red-500/40 bg-red-500/10 px-2 py-2 text-xs font-medium text-red-300"
        >
          Dil
        </button>
      </header>

      <aside
        id="admin-sidebar"
        className={[
          'fixed inset-y-0 left-0 z-30 flex w-[260px] shrink-0 flex-col border-r border-gray-800/60 bg-[#0c1017] pt-14 transition-transform lg:static lg:z-auto lg:h-full lg:pt-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
        ].join(' ')}
      >
        <div className="flex h-full min-h-0 flex-col">
          <div className="hidden shrink-0 border-b border-gray-800/80 px-4 py-5 lg:block">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-600 text-white shadow-lg shadow-violet-900/40">
                <AdminIcon name="logo" size={22} />
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-white">Platform Admin</p>
                <p className="text-[11px] text-gray-500">Paneli i kontrollit</p>
              </div>
            </div>
            <Link
              to="/"
              className="mt-4 inline-flex items-center gap-1 text-xs text-gray-500 transition hover:text-violet-300"
            >
              ← Ballina publike
            </Link>
          </div>

          <nav className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-4" aria-label="Admin">
            {navGroups.map((group) => (
              <div key={group.title} className="mb-6 last:mb-0">
                <p className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-wider text-gray-600">
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
                          {({ isActive }) => (
                            <>
                              <AdminIcon
                                name={item.icon}
                                size={18}
                                className={isActive ? 'text-white' : 'text-gray-500'}
                              />
                              <span className="flex flex-1 items-center justify-between gap-2">
                                {item.label}
                                {item.to === '/admin/support' && supportUnreadCount > 0 ? (
                                  <span
                                    className={`flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[10px] font-bold ${
                                      isActive ? 'bg-white text-violet-700' : 'bg-violet-500 text-white'
                                    }`}
                                  >
                                    {supportUnreadCount > 9 ? '9+' : supportUnreadCount}
                                  </span>
                                ) : null}
                              </span>
                            </>
                          )}
                        </NavLink>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>

          <div className="shrink-0 border-t border-gray-800/80 p-3">
            <div className="mb-3 flex items-center gap-3 rounded-xl bg-white/[0.04] px-3 py-2.5 ring-1 ring-white/5">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-600 text-sm font-semibold text-white">
                {initials}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-gray-100">
                  {user?.firstName} {user?.lastName}
                </p>
                <p className="truncate text-[11px] text-gray-500">{user?.email}</p>
              </div>
              <span
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-gray-500"
                title="Tema e çelët"
              >
                <AdminIcon name="sun" size={18} />
              </span>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2.5 text-sm font-medium text-red-300 transition hover:bg-red-500/20"
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
          className="fixed inset-0 z-20 bg-black/50 lg:hidden"
          aria-label="Mbyll menunë"
          onClick={() => setSidebarOpen(false)}
        />
      ) : null}

      <div className="flex min-h-0 min-w-0 flex-1 flex-col pt-14 lg:pt-0">
        <AdminTopBar />
        <main className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-5 lg:px-8 lg:py-6">
          <div className="mx-auto flex min-h-full max-w-[1600px] flex-col">
            <Outlet key={location.pathname} />
          </div>
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
            <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-violet-100 text-sm">
              💬
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-gray-900">{adminToast.title}</p>
              <p className="mt-0.5 line-clamp-2 text-xs text-gray-600">{adminToast.message}</p>
              {adminToast.linkPath ? (
                <p className="mt-1 text-[10px] font-medium text-violet-600">Kliko për të hapur →</p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                clearToast()
              }}
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
