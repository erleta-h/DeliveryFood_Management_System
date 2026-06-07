import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import { AdminIcon } from '../adminIcons'
import {
  adminSetCustomerActive,
  fetchAdminOrders,
  type AdminCustomerRow,
  type AdminOrderRow,
} from '../../../lib/adminApi'
import { loadCustomerAdminNote, saveCustomerAdminNote } from '../../../lib/adminCustomerNotes'
import {
  formatOrderStatus,
  ORDER_STATUS_DELIVERED,
} from '../../../lib/orderStatusLabels'
import { customerBtnGhost, customerBtnPrimary } from '../../../lib/adminTheme'
import { useAuthStore } from '../../../store/authStore'
import { AdminCustomerEmailDialog } from './AdminCustomerEmailDialog'

type Tab = 'overview' | 'addresses' | 'orders' | 'activity'

type Props = {
  row: AdminCustomerRow
  onClose: () => void
  onUpdated: () => void
}

function initials(first: string, last: string): string {
  return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase()
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleDateString('sq-AL')
  } catch {
    return iso
  }
}

function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleString('sq-AL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return iso
  }
}

function formatMoney(n: number): string {
  return new Intl.NumberFormat('sq-XK', { style: 'currency', currency: 'EUR' }).format(n)
}

function statusBadgeClass(active: boolean): string {
  return active
    ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
    : 'bg-red-50 text-red-700 ring-red-200'
}

function orderStatusBadgeClass(status: number): string {
  if (status === ORDER_STATUS_DELIVERED) return 'bg-emerald-50 text-emerald-700 ring-emerald-200'
  return 'bg-gray-50 text-gray-700 ring-gray-200'
}

function RowIcon({ children }: { children: ReactNode }) {
  return (
    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-500">
      {children}
    </span>
  )
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: ReactNode
  label: string
  value: string
}) {
  return (
    <div className="flex items-center gap-3 border-b border-gray-100 py-3 last:border-0">
      <RowIcon>{icon}</RowIcon>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-gray-500">{label}</p>
        <p className="text-sm font-semibold text-gray-900">{value}</p>
      </div>
    </div>
  )
}

function MiniStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-gray-100 bg-white px-3 py-3 text-center shadow-sm">
      <p className="text-[11px] font-medium text-gray-500">{label}</p>
      <p className="mt-1 text-lg font-bold tabular-nums text-gray-900">{value}</p>
    </div>
  )
}

export function AdminCustomerDetailsDrawer({ row, onClose, onUpdated }: Props) {
  const token = useAuthStore((s) => s.token)
  const [tab, setTab] = useState<Tab>('overview')
  const [orders, setOrders] = useState<AdminOrderRow[]>([])
  const [latestOrder, setLatestOrder] = useState<AdminOrderRow | null>(null)
  const [ordersLoading, setOrdersLoading] = useState(false)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [showEmail, setShowEmail] = useState(false)
  const [adminNote, setAdminNote] = useState(() => loadCustomerAdminNote(row.id))
  const [noteSaved, setNoteSaved] = useState(false)

  const loadOrders = useCallback(async () => {
    if (!token) return
    setOrdersLoading(true)
    try {
      const d = await fetchAdminOrders(token, { customerUserId: row.id, page: 1, pageSize: 20 })
      setOrders(d.items)
      setLatestOrder(d.items[0] ?? null)
    } catch {
      setOrders([])
      setLatestOrder(null)
    } finally {
      setOrdersLoading(false)
    }
  }, [token, row.id])

  useEffect(() => {
    void loadOrders()
  }, [loadOrders])

  useEffect(() => {
    setAdminNote(loadCustomerAdminNote(row.id))
    setNoteSaved(false)
  }, [row.id])

  async function toggleActive() {
    if (!token) return
    if (!window.confirm(row.isActive ? 'Blloko këtë klient?' : 'Aktivizo këtë klient?')) return
    setBusy(true)
    setMsg(null)
    const r = await adminSetCustomerActive(token, row.id, !row.isActive)
    setBusy(false)
    if (!r.ok) setMsg(r.message)
    else {
      setMsg(row.isActive ? 'Klienti u bllokua.' : 'Klienti u aktivizua.')
      onUpdated()
    }
  }

  function saveNote() {
    saveCustomerAdminNote(row.id, adminNote)
    setNoteSaved(true)
    window.setTimeout(() => setNoteSaved(false), 2000)
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: 'overview', label: 'Përmbledhje' },
    { id: 'addresses', label: `Adresa (${row.addressCount})` },
    { id: 'orders', label: 'Porositë' },
    { id: 'activity', label: 'Aktiviteti' },
  ]

  const panel = (
    <div className="fixed inset-0 z-[70] flex justify-end bg-black/35" role="presentation" onClick={onClose}>
      <aside
        className="flex h-full w-full max-w-[420px] flex-col bg-white shadow-2xl"
        role="dialog"
        aria-label="Detajet e klientit"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="border-b border-gray-100 px-6 py-5">
          <div className="flex items-start gap-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-violet-100 text-sm font-bold text-violet-800">
              {initials(row.firstName, row.lastName)}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-bold text-gray-900">
                  {row.firstName} {row.lastName}
                </h2>
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${statusBadgeClass(row.isActive)}`}
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${row.isActive ? 'bg-emerald-500' : 'bg-red-500'}`} />
                  {row.isActive ? 'Aktiv' : 'Bllokuar'}
                </span>
              </div>
            </div>
            <button
              type="button"
              className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
              onClick={onClose}
              aria-label="Mbyll"
            >
              ✕
            </button>
          </div>
        </header>

        <nav className="flex gap-0 overflow-x-auto border-b border-gray-100 px-6">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              className={[
                'shrink-0 border-b-2 px-3 py-3 text-sm font-medium transition',
                tab === t.id
                  ? 'border-violet-600 text-violet-700'
                  : 'border-transparent text-gray-500 hover:text-gray-800',
              ].join(' ')}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </nav>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
          {msg ? (
            <div className="mb-4 rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 text-sm text-violet-900">
              {msg}
            </div>
          ) : null}

          {tab === 'overview' ? (
            <div className="space-y-5">
              <section className="rounded-xl border border-gray-100 bg-gray-50/60 px-4 py-1">
                <h3 className="pt-3 text-sm font-semibold text-gray-900">Informacion i klientit</h3>
                <div className="mt-1">
                  <InfoRow icon="✉" label="Email" value={row.email} />
                  <InfoRow icon="📞" label="Telefoni" value={row.phone ?? '—'} />
                  <InfoRow icon="📅" label="Regjistruar" value={formatDateTime(row.createdAtUtc)} />
                </div>
              </section>

              <div className="grid grid-cols-3 gap-2">
                <MiniStat label="Porosi totale" value={row.orderCount} />
                <MiniStat label="Adresa aktive" value={row.addressCount} />
                <MiniStat label="Porosia e fundit" value={formatDate(row.lastOrderAtUtc)} />
              </div>

              {latestOrder ? (
                <section className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
                  <h3 className="text-sm font-semibold text-gray-900">Porosia e fundit</h3>
                  <div className="mt-3 flex items-start gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-900 text-xs font-bold text-white">
                      {(latestOrder.restaurantName[0] ?? 'R').toUpperCase()}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <p className="font-semibold text-gray-900">{latestOrder.restaurantName}</p>
                        <p className="font-bold text-gray-900">{formatMoney(latestOrder.total)}</p>
                      </div>
                      <p className="mt-0.5 font-mono text-xs text-gray-500">#{latestOrder.orderNumber}</p>
                      <p className="mt-0.5 text-xs text-gray-500">{formatDateTime(latestOrder.placedAtUtc)}</p>
                      <span
                        className={`mt-2 inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${orderStatusBadgeClass(latestOrder.status)}`}
                      >
                        {formatOrderStatus(latestOrder.status)}
                      </span>
                    </div>
                  </div>
                  <Link
                    to={`/admin/orders?search=${encodeURIComponent(latestOrder.orderNumber)}`}
                    className="mt-4 inline-block text-sm font-semibold text-violet-600 hover:text-violet-800"
                  >
                    Shiko porosinë
                  </Link>
                </section>
              ) : row.lastOrderAtUtc ? (
                <section className="rounded-xl border border-gray-100 bg-gray-50/60 p-4">
                  <h3 className="text-sm font-semibold text-gray-900">Porosia e fundit</h3>
                  <p className="mt-2 text-sm text-gray-600">
                    {row.lastOrderRestaurantName ?? 'Restorant'} · {formatDateTime(row.lastOrderAtUtc)}
                  </p>
                  <Link
                    to={`/admin/orders?customer=${row.id}`}
                    className="mt-3 inline-block text-sm font-semibold text-violet-600 hover:text-violet-800"
                  >
                    Shiko porositë
                  </Link>
                </section>
              ) : null}

              <section className="rounded-xl border border-gray-100 bg-gray-50/60 p-4">
                <h3 className="text-sm font-semibold text-gray-900">Shënime (vetëm për admin)</h3>
                <textarea
                  value={adminNote}
                  onChange={(e) => setAdminNote(e.target.value)}
                  rows={4}
                  placeholder="Shto shënim për këtë klient…"
                  className="mt-3 w-full resize-none rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20"
                />
                <div className="mt-3 flex items-center justify-end gap-2">
                  {noteSaved ? <span className="text-xs text-emerald-600">U ruajt</span> : null}
                  <button
                    type="button"
                    className={customerBtnGhost + ' px-4 py-2 text-sm'}
                    onClick={saveNote}
                  >
                    Ruaj shënimin
                  </button>
                </div>
              </section>
            </div>
          ) : null}

          {tab === 'addresses' ? (
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Ky klient ka <span className="font-semibold text-gray-900">{row.addressCount}</span> adresa të
                regjistruara në sistem.
              </p>
              <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50/80 px-4 py-8 text-center">
                <p className="text-sm font-medium text-gray-700">Lista e detajeve të adresave</p>
                <p className="mt-2 text-xs text-gray-500">
                  Adresat ruhen me porositë e klientit. Për detaje të plota, shiko tab-in Porositë ose faqen e
                  porosive në admin.
                </p>
                {row.addressCount > 0 ? (
                  <Link
                    to={`/admin/orders?customer=${row.id}`}
                    className="mt-4 inline-block text-sm font-semibold text-violet-600 hover:text-violet-800"
                  >
                    Shiko porositë e klientit
                  </Link>
                ) : null}
              </div>
            </div>
          ) : null}

          {tab === 'orders' ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm text-gray-600">{row.orderCount} porosi totale</p>
                <Link
                  to={`/admin/orders?customer=${row.id}`}
                  className="text-sm font-semibold text-violet-600 hover:text-violet-800"
                >
                  Shiko të gjitha →
                </Link>
              </div>
              {ordersLoading ? <p className="text-sm text-gray-500">Duke ngarkuar porositë…</p> : null}
              {!ordersLoading && orders.length === 0 ? (
                <p className="text-sm text-gray-500">Nuk ka porosi.</p>
              ) : null}
              {orders.map((o) => (
                <div key={o.id} className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-gray-900">{o.restaurantName}</p>
                      <p className="mt-0.5 font-mono text-xs text-gray-500">#{o.orderNumber}</p>
                      <p className="mt-0.5 text-xs text-gray-500">{formatDateTime(o.placedAtUtc)}</p>
                    </div>
                    <p className="font-bold text-gray-900">{formatMoney(o.total)}</p>
                  </div>
                  <span
                    className={`mt-2 inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${orderStatusBadgeClass(o.status)}`}
                  >
                    {formatOrderStatus(o.status)}
                  </span>
                  <Link
                    to={`/admin/orders?search=${encodeURIComponent(o.orderNumber)}`}
                    className="mt-3 inline-block text-sm font-semibold text-violet-600 hover:text-violet-800"
                  >
                    Shiko porosinë
                  </Link>
                </div>
              ))}
            </div>
          ) : null}

          {tab === 'activity' ? (
            <ul className="space-y-3">
              <li className="flex gap-3 rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-violet-50 text-violet-600">
                  <AdminIcon name="users" size={16} />
                </span>
                <div>
                  <p className="text-sm font-semibold text-gray-900">Regjistruar në platformë</p>
                  <p className="mt-0.5 text-xs text-gray-500">{formatDateTime(row.createdAtUtc)}</p>
                </div>
              </li>
              {row.lastOrderAtUtc ? (
                <li className="flex gap-3 rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                    <AdminIcon name="orders" size={16} />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">Porosia e fundit</p>
                    <p className="mt-0.5 text-xs text-gray-500">
                      {row.lastOrderRestaurantName ?? 'Restorant'} · {formatDateTime(row.lastOrderAtUtc)}
                    </p>
                  </div>
                </li>
              ) : null}
              {!row.isActive ? (
                <li className="flex gap-3 rounded-xl border border-red-100 bg-red-50/50 p-4">
                  <span className="mt-0.5 text-red-500">⛔</span>
                  <div>
                    <p className="text-sm font-semibold text-red-800">Llogaria është bllokuar</p>
                    <p className="mt-0.5 text-xs text-red-600/80">Klienti nuk mund të porosisë.</p>
                  </div>
                </li>
              ) : null}
              {adminNote.trim() ? (
                <li className="flex gap-3 rounded-xl border border-gray-100 bg-gray-50/80 p-4">
                  <span className="mt-0.5 text-gray-500">📝</span>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">Shënim admin</p>
                    <p className="mt-1 text-sm text-gray-600">{adminNote.trim()}</p>
                  </div>
                </li>
              ) : null}
            </ul>
          ) : null}
        </div>

        <footer className="border-t border-gray-100 px-6 py-5">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Veprime</p>
          <div className="flex flex-col gap-2.5">
            <button
              type="button"
              disabled={busy}
              className={
                row.isActive
                  ? 'flex w-full items-center justify-center gap-2 rounded-xl border-2 border-red-200 bg-white px-4 py-3 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-40'
                  : customerBtnPrimary + ' w-full py-3'
              }
              onClick={() => void toggleActive()}
            >
              {row.isActive ? '🔒 Blloko klientin' : 'Aktivizo klientin'}
            </button>
            <button
              type="button"
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              onClick={() => setShowEmail(true)}
            >
              ✉ Dërgo email
            </button>
            <Link
              to={`/admin/orders?customer=${row.id}`}
              className="flex w-full items-center justify-center rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              Shiko porositë
            </Link>
          </div>
        </footer>
      </aside>
    </div>
  )

  return (
    <>
      {createPortal(panel, document.body)}
      {showEmail ? (
        <AdminCustomerEmailDialog
          email={row.email}
          name={`${row.firstName} ${row.lastName}`.trim()}
          onClose={() => setShowEmail(false)}
        />
      ) : null}
    </>
  )
}
