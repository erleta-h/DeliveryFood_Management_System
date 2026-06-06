import { useCallback, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import {
  adminSetCouponActive,
  fetchAdminCouponDetail,
  fetchAdminCouponHistory,
  fetchAdminCouponUses,
  type AdminCouponDetail,
  type AdminCouponHistoryRow,
  type AdminCouponRow,
  type AdminCouponUseRow,
} from '../../../lib/adminApi'
import { customerBtnGhost, customerBtnPrimary } from '../../../lib/adminTheme'
import { useAuthStore } from '../../../store/authStore'
import { CouponCreateModal } from './CouponCreateModal'
import { CouponStatusBadge } from './CouponStatusBadge'
import { CouponUsesProgress } from './CouponUsesProgress'
import {
  formatCouponValidity,
  formatDateTime,
  historyEventLabel,
} from './couponHelpers'

type Tab = 'summary' | 'uses' | 'history'

type Props = {
  row: AdminCouponRow
  onClose: () => void
  onUpdated: () => void
  onMessage: (m: string) => void
}

const TABS: { id: Tab; label: string }[] = [
  { id: 'summary', label: 'Përmbledhje' },
  { id: 'uses', label: 'Përdorime' },
  { id: 'history', label: 'Historiku' },
]

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-gray-100 py-2.5 text-sm last:border-0">
      <dt className="text-gray-500">{label}</dt>
      <dd className="text-right font-medium text-gray-900">{value}</dd>
    </div>
  )
}

export function CouponDetailsDrawer({ row, onClose, onUpdated, onMessage }: Props) {
  const token = useAuthStore((s) => s.token)
  const [tab, setTab] = useState<Tab>('summary')
  const [detail, setDetail] = useState<AdminCouponDetail | null>(null)
  const [uses, setUses] = useState<AdminCouponUseRow[]>([])
  const [usesTotal, setUsesTotal] = useState(0)
  const [history, setHistory] = useState<AdminCouponHistoryRow[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [editOpen, setEditOpen] = useState(false)

  const loadDetail = useCallback(async () => {
    if (!token) return
    setDetail(await fetchAdminCouponDetail(token, row.id))
  }, [token, row.id])

  const loadUses = useCallback(async () => {
    if (!token) return
    const r = await fetchAdminCouponUses(token, row.id, 1, 50)
    setUses(r.items)
    setUsesTotal(r.total)
  }, [token, row.id])

  const loadHistory = useCallback(async () => {
    if (!token) return
    const r = await fetchAdminCouponHistory(token, row.id)
    setHistory(r.items)
  }, [token, row.id])

  const load = useCallback(async () => {
    if (!token) return
    setLoading(true)
    try {
      await loadDetail()
      if (tab === 'uses') await loadUses()
      if (tab === 'history') await loadHistory()
    } catch (e) {
      onMessage(e instanceof Error ? e.message : 'Gabim.')
    } finally {
      setLoading(false)
    }
  }, [token, tab, loadDetail, loadUses, loadHistory, onMessage])

  useEffect(() => {
    void load()
  }, [load])

  async function toggleActive() {
    if (!token || !detail) return
    setBusy(true)
    const r = await adminSetCouponActive(token, detail.id, !detail.isActive)
    setBusy(false)
    if (!r.ok) {
      onMessage(r.message)
      return
    }
    onMessage(detail.isActive ? 'Kuponi u çaktivizua.' : 'Kuponi u aktivizua.')
    onUpdated()
    void loadDetail()
  }

  const d = detail ?? row

  const drawer = (
    <div className="fixed inset-0 z-[190] flex justify-end">
      <button type="button" className="absolute inset-0 bg-black/30" aria-label="Mbyll" onClick={onClose} />
      <aside className="relative flex h-full w-full max-w-md flex-col bg-white shadow-2xl">
        <div className="border-b border-gray-100 px-5 py-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-violet-600">Kupon</p>
              <h2 className="mt-1 font-mono text-xl font-bold text-gray-900">{d.code}</h2>
              <div className="mt-2">
                <CouponStatusBadge {...d} />
              </div>
            </div>
            <button type="button" className={customerBtnGhost} onClick={onClose}>
              Mbyll
            </button>
          </div>
          <div className="mt-4 flex gap-1 border-b border-gray-100">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={
                  tab === t.id ?
                    'border-b-2 border-violet-600 px-3 py-2 text-sm font-semibold text-violet-700'
                  : 'px-3 py-2 text-sm text-gray-500 hover:text-gray-800'
                }
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {loading && !detail && tab === 'summary' ?
            <p className="text-sm text-gray-500">Duke ngarkuar…</p>
          : tab === 'summary' ?
            <dl>
              <InfoRow label="Zbritja" value={`${d.discountPercent}%`} />
              <InfoRow
                label="Max. zbritja"
                value={d.maxDiscountAmount != null ? `${d.maxDiscountAmount.toFixed(2)} €` : '—'}
              />
              <InfoRow
                label="Min. porosia"
                value={d.minOrderAmount != null ? `${d.minOrderAmount.toFixed(2)} €` : '—'}
              />
              <InfoRow
                label="Përdorime"
                value={d.maxUses != null ? `${d.usesCount} / ${d.maxUses}` : String(d.usesCount)}
              />
              <div className="py-3">
                <CouponUsesProgress usesCount={d.usesCount} maxUses={d.maxUses} />
              </div>
              <InfoRow label="Periudha" value={formatCouponValidity(d)} />
              {detail ?
                <InfoRow label="Zbritje totale dhënë" value={`${detail.totalDiscountGiven.toFixed(2)} €`} />
              : null}
              {detail?.createdByName ?
                <InfoRow label="Krijuar nga" value={detail.createdByName} />
              : null}
              <InfoRow label="Krijuar më" value={formatDateTime(d.createdAt)} />
            </dl>
          : tab === 'uses' ?
            uses.length === 0 ?
              <p className="text-sm text-gray-500">Ende pa përdorime në porosi.</p>
            : <ul className="space-y-3">
                {uses.map((u) => (
                  <li key={u.orderId} className="rounded-xl border border-gray-200 p-3 text-sm">
                    <div className="flex items-start justify-between gap-2">
                      <Link
                        to={`/admin/orders?orderId=${u.orderId}`}
                        className="font-mono font-semibold text-violet-700 hover:underline"
                      >
                        {u.orderNumber}
                      </Link>
                      <span className="text-emerald-700">−{u.discountAmount.toFixed(2)} €</span>
                    </div>
                    <p className="mt-1 text-xs text-gray-500">{formatDateTime(u.placedAtUtc)}</p>
                    <p className="mt-0.5 text-xs text-gray-500">{u.customerEmail}</p>
                    <p className="mt-1 text-xs text-gray-600">Totali: {u.orderTotal.toFixed(2)} €</p>
                  </li>
                ))}
                {usesTotal > uses.length ?
                  <p className="text-xs text-gray-400">+ {usesTotal - uses.length} të tjera…</p>
                : null}
              </ul>
          : history.length === 0 ?
            <p className="text-sm text-gray-500">Nuk ka histori auditimi ende.</p>
          : <ul className="space-y-3">
              {history.map((h, i) => (
                <li key={`${h.createdAtUtc}-${i}`} className="rounded-xl border border-gray-200 p-3 text-sm">
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-semibold text-gray-900">{historyEventLabel(h.eventType)}</span>
                    <span className="text-xs text-gray-400">{formatDateTime(h.createdAtUtc)}</span>
                  </div>
                  {h.detail ? <p className="mt-1 text-gray-600">{h.detail}</p> : null}
                  {h.actorName ?
                    <p className="mt-1 text-xs text-gray-500">{h.actorName}</p>
                  : null}
                </li>
              ))}
            </ul>
          }
        </div>

        <div className="flex gap-2 border-t border-gray-100 px-5 py-4">
          <button
            type="button"
            className={customerBtnPrimary}
            disabled={!detail}
            onClick={() => setEditOpen(true)}
          >
            Ndrysho
          </button>
          <button
            type="button"
            disabled={busy || loading}
            className={
              d.isActive ?
                `${customerBtnGhost} flex-1 border-red-200 text-red-700`
              : `${customerBtnGhost} flex-1`
            }
            onClick={() => void toggleActive()}
          >
            {busy ? '…' : d.isActive ? 'Çaktivizo' : 'Aktivizo'}
          </button>
        </div>
      </aside>

      {editOpen && detail ?
        <CouponCreateModal
          mode="edit"
          coupon={detail}
          onClose={() => setEditOpen(false)}
          onSaved={() => {
            onUpdated()
            void loadDetail()
            if (tab === 'history') void loadHistory()
          }}
          onMessage={onMessage}
        />
      : null}
    </div>
  )

  return createPortal(drawer, document.body)
}
