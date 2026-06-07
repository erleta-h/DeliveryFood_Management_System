import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import {
  adminCancelOrder,
  adminRefundOrder,
  adminUpdateOrderStatus,
  fetchAdminOrderDetail,
  type AdminOrderDetail,
  type AdminOrderRow,
} from '../../../lib/adminApi'
import {
  ADMIN_ORDER_STATUS_EDIT_OPTIONS,
  adminOrderStatusBadge,
  canAdminCancelOrder,
  canAdminChangeOrderStatus,
  canAdminRefundOrder,
  formatAdminOrderStatus,
  paymentStatusLabel,
} from '../../../lib/adminOrderStatus'
import {
  adminFieldInline,
  customerBtnGhost,
  customerBtnPrimary,
  customerSelect,
} from '../../../lib/adminTheme'
import { useAuthStore } from '../../../store/authStore'

type Tab = 'details' | 'items' | 'payment' | 'history'

type Props = {
  row: AdminOrderRow
  onClose: () => void
  onUpdated: () => void
  onMessage: (msg: string) => void
}

function formatDt(iso: string): string {
  try {
    return new Date(iso).toLocaleString('sq-AL', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return iso
  }
}

function formatAddress(d: AdminOrderDetail): string {
  const parts = [d.addressLine1, d.addressLine2, d.city, d.postalCode].filter(Boolean)
  return parts.join(', ')
}

function fulfillmentLabel(t: number): string {
  return t === 1 ? 'Marrje në restorant' : 'Dërgesë'
}

function InfoRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-3">
      <dt className="w-36 shrink-0 text-xs text-gray-500">{label}</dt>
      <dd className="text-sm font-medium text-gray-900">{value}</dd>
    </div>
  )
}

function SectionCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-gray-100 bg-gray-50/80 p-4">
      <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
      <dl className="mt-3 space-y-2.5">{children}</dl>
    </section>
  )
}

const TABS: { id: Tab; label: string }[] = [
  { id: 'details', label: 'Detajet' },
  { id: 'items', label: 'Artikujt' },
  { id: 'payment', label: 'Pagesa' },
  { id: 'history', label: 'Historiku' },
]

export function AdminOrderDetailsDrawer({ row, onClose, onUpdated, onMessage }: Props) {
  const token = useAuthStore((s) => s.token)
  const [tab, setTab] = useState<Tab>('details')
  const [detail, setDetail] = useState<AdminOrderDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusDraft, setStatusDraft] = useState(row.status)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    if (!token) return
    setLoading(true)
    setError(null)
    try {
      const d = await fetchAdminOrderDetail(token, row.id)
      setDetail(d)
      setStatusDraft(d.status)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gabim.')
      setDetail(null)
    } finally {
      setLoading(false)
    }
  }, [token, row.id])

  useEffect(() => {
    void load()
  }, [load])

  const status = detail?.status ?? row.status
  const payments = detail?.payments ?? row.payments
  const total = detail?.total ?? row.total

  async function runAction(
    fn: (t: string, id: number) => Promise<{ ok: true } | { ok: false; message: string }>,
  ) {
    if (!token) return
    setBusy(true)
    const r = await fn(token, row.id)
    setBusy(false)
    if (r.ok) {
      onMessage('U përditësua.')
      onUpdated()
      await load()
    } else onMessage(r.message)
  }

  function onSaveStatus() {
    if (statusDraft === status) {
      onMessage('Zgjidh status tjetër.')
      return
    }
    void (async () => {
      if (!token) return
      setBusy(true)
      const r = await adminUpdateOrderStatus(token, row.id, statusDraft)
      setBusy(false)
      if (r.ok) {
        onMessage('Statusi u ruajt.')
        onUpdated()
        await load()
      } else onMessage(r.message)
    })()
  }

  const panel = (
    <div className="fixed inset-0 z-[70] flex justify-end bg-black/35" role="presentation" onClick={onClose}>
      <aside
        className="flex h-full w-full max-w-xl flex-col bg-white shadow-2xl"
        role="dialog"
        aria-label={`Porosia ${row.orderNumber}`}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="border-b border-gray-100 px-5 py-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-mono text-sm font-semibold text-violet-700">
                {detail?.orderNumber ?? row.orderNumber}
              </p>
              <h2 className="mt-1 text-lg font-semibold text-gray-900">Porosia #{row.id}</h2>
              <p className="mt-0.5 text-sm text-gray-500">{detail?.restaurantName ?? row.restaurantName}</p>
              <p className="text-xs text-gray-400">{formatDt(detail?.placedAtUtc ?? row.placedAtUtc)}</p>
            </div>
            <button
              type="button"
              className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
              onClick={onClose}
              aria-label="Mbyll"
            >
              ✕
            </button>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className={adminOrderStatusBadge(status)}>{formatAdminOrderStatus(status)}</span>
            <span className="text-sm font-semibold tabular-nums text-gray-900">{total.toFixed(2)} €</span>
          </div>
        </header>

        <nav className="flex gap-1 border-b border-gray-100 px-5">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              className={
                tab === t.id
                  ? 'border-b-2 border-violet-600 px-3 py-2.5 text-sm font-medium text-violet-700'
                  : 'px-3 py-2.5 text-sm text-gray-500 hover:text-gray-800'
              }
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </nav>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {loading ? <p className="text-sm text-gray-500">Duke ngarkuar detajet…</p> : null}
          {error ? <p className="text-sm text-red-600">{error}</p> : null}

          {!loading && detail && tab === 'details' ? (
            <div className="space-y-4">
              <SectionCard title="Klienti">
                <InfoRow label="Email" value={detail.customerEmail} />
                <InfoRow label="User ID" value={`#${detail.customerUserId}`} />
                {detail.customerPhone ? <InfoRow label="Telefon" value={detail.customerPhone} /> : null}
              </SectionCard>
              <SectionCard title="Restoranti">
                <InfoRow label="Emri" value={detail.restaurantName} />
                <InfoRow label="Restorant ID" value={`#${detail.restaurantId}`} />
              </SectionCard>
              <SectionCard title="Dorëzimi">
                <InfoRow label="Lloji" value={fulfillmentLabel(detail.fulfillmentType)} />
                <InfoRow label="Adresa" value={formatAddress(detail)} />
              </SectionCard>
              <SectionCard title="Porosia">
                <InfoRow label="Data" value={formatDt(detail.placedAtUtc)} />
                <InfoRow
                  label="Statusi"
                  value={
                    <span className={adminOrderStatusBadge(detail.status)}>
                      {formatAdminOrderStatus(detail.status)}
                    </span>
                  }
                />
                {detail.customerNotes?.trim() ? (
                  <InfoRow label="Shënim" value={detail.customerNotes} />
                ) : (
                  <InfoRow label="Shënim" value={<span className="text-gray-400">Pa shënime</span>} />
                )}
              </SectionCard>
            </div>
          ) : null}

          {!loading && detail && tab === 'items' ? (
            detail.items.length === 0 ? (
              <p className="text-sm text-gray-500">Nuk ka artikuj në këtë porosi.</p>
            ) : (
              <ul className="divide-y divide-gray-100 rounded-xl border border-gray-200 bg-white">
                {detail.items.map((item, i) => (
                  <li key={i} className="flex items-center justify-between gap-3 px-4 py-3">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{item.name}</p>
                      <p className="text-xs text-gray-500">
                        {item.quantity} × {item.unitPrice.toFixed(2)} €
                      </p>
                    </div>
                    <p className="text-sm font-semibold tabular-nums text-gray-900">
                      {item.lineTotal.toFixed(2)} €
                    </p>
                  </li>
                ))}
              </ul>
            )
          ) : null}

          {!loading && detail && tab === 'payment' ? (
            <div className="space-y-4">
              <SectionCard title="Përmbledhje">
                <InfoRow label="Nëntotali" value={`${detail.subtotal.toFixed(2)} €`} />
                <InfoRow label="Tarifa dërgese" value={`${detail.deliveryFee.toFixed(2)} €`} />
                {detail.discountTotal > 0 ? (
                  <InfoRow label="Zbritje" value={`−${detail.discountTotal.toFixed(2)} €`} />
                ) : null}
                <InfoRow label="Totali" value={`${detail.total.toFixed(2)} €`} />
              </SectionCard>
              {detail.payments.length === 0 ? (
                <p className="text-sm text-gray-500">Nuk ka rresht pagese — porosi e vjetër ose pa pagesë online.</p>
              ) : (
                <ul className="space-y-3">
                  {detail.payments.map((p) => (
                    <li key={p.id} className="rounded-xl border border-gray-200 bg-white p-4">
                      <p className="text-lg font-semibold tabular-nums text-gray-900">
                        {p.amount.toFixed(2)} {p.currency}
                      </p>
                      <p className="mt-1 text-sm capitalize text-gray-600">{p.provider}</p>
                      <p className="mt-2 text-xs font-medium text-gray-500">{paymentStatusLabel(p.status)}</p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : null}

          {!loading && detail && tab === 'history' ? (
            detail.statusHistory.length === 0 ? (
              <p className="text-sm text-gray-500">Nuk ka historik statusi të regjistruar.</p>
            ) : (
              <ol className="relative border-l border-gray-200 pl-4">
                {detail.statusHistory.map((h) => (
                  <li key={h.id} className="mb-4 ml-2">
                    <span className="absolute -left-1.5 mt-1.5 h-3 w-3 rounded-full border-2 border-white bg-violet-600 ring-1 ring-violet-200" />
                    <p className="text-sm font-medium text-gray-900">{formatAdminOrderStatus(h.status)}</p>
                    <p className="text-xs text-gray-500">{formatDt(h.createdAtUtc)}</p>
                    {h.note?.trim() ? <p className="mt-0.5 text-xs text-gray-400">{h.note}</p> : null}
                  </li>
                ))}
              </ol>
            )
          ) : null}
        </div>

        <footer className="border-t border-gray-100 bg-gray-50/80 px-5 py-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Veprimet</p>
          <div className="space-y-3">
            <div className="flex flex-wrap items-end gap-2">
              <label className="block text-xs text-gray-500">
                Ndrysho status
                <select
                  value={statusDraft}
                  disabled={busy || !canAdminChangeOrderStatus(status)}
                  onChange={(e) => setStatusDraft(Number(e.target.value))}
                  className={`${customerSelect} ${adminFieldInline} ml-0 mt-1 min-w-[160px]`}
                >
                  {ADMIN_ORDER_STATUS_EDIT_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                disabled={busy || !canAdminChangeOrderStatus(status)}
                onClick={onSaveStatus}
                className={`${customerBtnPrimary} px-3 py-2 text-xs`}
              >
                Ruaj statusin
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={busy || !canAdminCancelOrder(status)}
                onClick={() => void runAction(adminCancelOrder)}
                className={`${customerBtnGhost} border-red-200 px-3 py-2 text-xs text-red-700 hover:bg-red-50`}
              >
                Anulo porosinë
              </button>
              <button
                type="button"
                disabled={busy || !canAdminRefundOrder(status, payments)}
                onClick={() => void runAction(adminRefundOrder)}
                className={`${customerBtnGhost} px-3 py-2 text-xs text-amber-800 hover:bg-amber-50`}
              >
                Rimburso porosinë
              </button>
            </div>
          </div>
        </footer>
      </aside>
    </div>
  )

  return createPortal(panel, document.body)
}
