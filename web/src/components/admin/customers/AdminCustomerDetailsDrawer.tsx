import { useCallback, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import {
  adminSetCustomerActive,
  fetchAdminOrders,
  type AdminCustomerRow,
  type AdminOrderRow,
} from '../../../lib/adminApi'
import { formatOrderStatus } from '../../../lib/orderStatusLabels'
import { customerBtnGhost, customerBtnPrimary } from '../../../lib/adminTheme'
import { useAuthStore } from '../../../store/authStore'
import { AdminCustomerEmailDialog } from './AdminCustomerEmailDialog'

type Tab = 'summary' | 'orders'

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

function formatMoney(n: number): string {
  return new Intl.NumberFormat('sq-XK', { style: 'currency', currency: 'EUR' }).format(n)
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-3">
      <dt className="w-36 shrink-0 text-xs text-gray-500">{label}</dt>
      <dd className="text-sm font-medium text-gray-900">{value}</dd>
    </div>
  )
}

export function AdminCustomerDetailsDrawer({ row, onClose, onUpdated }: Props) {
  const token = useAuthStore((s) => s.token)
  const [tab, setTab] = useState<Tab>('summary')
  const [orders, setOrders] = useState<AdminOrderRow[]>([])
  const [ordersLoading, setOrdersLoading] = useState(false)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [showEmail, setShowEmail] = useState(false)

  const loadOrders = useCallback(async () => {
    if (!token) return
    setOrdersLoading(true)
    try {
      const d = await fetchAdminOrders(token, { customerUserId: row.id, page: 1, pageSize: 10 })
      setOrders(d.items)
    } catch {
      setOrders([])
    } finally {
      setOrdersLoading(false)
    }
  }, [token, row.id])

  useEffect(() => {
    if (tab === 'orders') void loadOrders()
  }, [tab, loadOrders])

  async function toggleActive() {
    if (!token) return
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

  const panel = (
    <div className="fixed inset-0 z-[70] flex justify-end bg-black/35" role="presentation" onClick={onClose}>
      <aside
        className="flex h-full w-full max-w-xl flex-col bg-white shadow-2xl"
        role="dialog"
        aria-label="Profili i klientit"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="border-b border-gray-100 px-5 py-5">
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
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    row.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                  }`}
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${row.isActive ? 'bg-emerald-500' : 'bg-red-500'}`} />
                  {row.isActive ? 'Aktiv' : 'Bllokuar'}
                </span>
              </div>
              <p className="mt-1 text-sm text-gray-500">{row.email}</p>
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

        <nav className="flex gap-0 border-b border-gray-100 px-5">
          {(
            [
              ['summary', 'Përmbledhje'],
              ['orders', `Porositë (${row.orderCount})`],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              className={[
                'border-b-2 px-4 py-3 text-sm font-medium transition',
                tab === id ? 'border-violet-600 text-violet-700' : 'border-transparent text-gray-500 hover:text-gray-800',
              ].join(' ')}
              onClick={() => setTab(id)}
            >
              {label}
            </button>
          ))}
        </nav>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
          {msg ? (
            <div className="mb-4 rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 text-sm text-violet-900">
              {msg}
            </div>
          ) : null}

          {tab === 'summary' ? (
            <div className="space-y-5">
              <section className="rounded-xl border border-gray-100 bg-gray-50/80 p-4">
                <h3 className="text-sm font-semibold text-gray-900">Të dhënat</h3>
                <dl className="mt-3 space-y-2.5">
                  <InfoRow label="Email" value={row.email} />
                  <InfoRow label="Telefoni" value={row.phone ?? '—'} />
                  <InfoRow label="Regjistruar" value={formatDate(row.createdAtUtc)} />
                </dl>
              </section>

              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-xl border border-gray-100 bg-white p-3 text-center shadow-sm">
                  <p className="text-xs text-gray-500">Porosi totale</p>
                  <p className="mt-1 text-xl font-bold text-gray-900">{row.orderCount}</p>
                </div>
                <div className="rounded-xl border border-gray-100 bg-white p-3 text-center shadow-sm">
                  <p className="text-xs text-gray-500">Adresa</p>
                  <p className="mt-1 text-xl font-bold text-gray-900">{row.addressCount}</p>
                </div>
                <div className="rounded-xl border border-gray-100 bg-white p-3 text-center shadow-sm">
                  <p className="text-xs text-gray-500">Porosia e fundit</p>
                  <p className="mt-1 text-sm font-bold text-gray-900">{formatDate(row.lastOrderAtUtc)}</p>
                </div>
              </div>

              {row.lastOrderAtUtc ? (
                <section className="rounded-xl border border-gray-100 bg-gray-50/80 p-4">
                  <h3 className="text-sm font-semibold text-gray-900">Porosia e fundit</h3>
                  <dl className="mt-3 space-y-2.5">
                    <InfoRow label="Restoranti" value={row.lastOrderRestaurantName ?? '—'} />
                    <InfoRow label="Data" value={formatDate(row.lastOrderAtUtc)} />
                  </dl>
                  <Link
                    to={`/admin/orders?customer=${row.id}`}
                    className="mt-3 inline-block text-sm font-medium text-violet-600 hover:underline"
                  >
                    Shiko porositë →
                  </Link>
                </section>
              ) : null}
            </div>
          ) : null}

          {tab === 'orders' ? (
            <div className="space-y-3">
              {ordersLoading ? <p className="text-sm text-gray-500">Duke ngarkuar porositë…</p> : null}
              {!ordersLoading && orders.length === 0 ? (
                <p className="text-sm text-gray-500">Nuk ka porosi.</p>
              ) : null}
              {orders.map((o) => (
                <div key={o.id} className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium text-gray-900">{o.restaurantName}</p>
                      <p className="text-xs text-gray-500">
                        {o.orderNumber} · {formatDate(o.placedAtUtc)}
                      </p>
                    </div>
                    <p className="font-semibold text-gray-900">{formatMoney(o.total)}</p>
                  </div>
                  <p className="mt-2 text-xs text-gray-600">{formatOrderStatus(o.status)}</p>
                  <Link
                    to={`/admin/orders?search=${encodeURIComponent(o.orderNumber)}`}
                    className="mt-2 inline-block text-xs font-medium text-violet-600 hover:underline"
                  >
                    Shiko porosinë
                  </Link>
                </div>
              ))}
            </div>
          ) : null}
        </div>

        <footer className="border-t border-gray-100 px-5 py-4">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy}
              className={
                row.isActive
                  ? 'rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-40'
                  : customerBtnPrimary
              }
              onClick={() => void toggleActive()}
            >
              {row.isActive ? '🔒 Blloko klientin' : 'Aktivizo klientin'}
            </button>
            <button type="button" className={customerBtnGhost} onClick={() => setShowEmail(true)}>
              ✉ Dërgo email
            </button>
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
