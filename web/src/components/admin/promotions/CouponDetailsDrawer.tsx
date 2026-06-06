import { useCallback, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  adminSetCouponActive,
  fetchAdminCouponDetail,
  type AdminCouponDetail,
  type AdminCouponRow,
} from '../../../lib/adminApi'
import { customerBtnGhost, customerBtnPrimary } from '../../../lib/adminTheme'
import { useAuthStore } from '../../../store/authStore'
import { CouponStatusBadge } from './CouponStatusBadge'
import { CouponUsesProgress } from './CouponUsesProgress'
import { formatCouponValidity, formatDateTime } from './couponHelpers'

type Props = {
  row: AdminCouponRow
  onClose: () => void
  onUpdated: () => void
  onMessage: (m: string) => void
}

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
  const [detail, setDetail] = useState<AdminCouponDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    if (!token) return
    setLoading(true)
    try {
      setDetail(await fetchAdminCouponDetail(token, row.id))
    } catch (e) {
      onMessage(e instanceof Error ? e.message : 'Gabim.')
    } finally {
      setLoading(false)
    }
  }, [token, row.id, onMessage])

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
    void load()
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
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {loading && !detail ? (
            <p className="text-sm text-gray-500">Duke ngarkuar…</p>
          ) : (
            <dl>
              <InfoRow label="Zbritja" value={`${d.discountPercent}%`} />
              <InfoRow
                label="Max. zbritja"
                value={d.maxDiscountAmount != null ? `${d.maxDiscountAmount.toFixed(2)} €` : '—'}
              />
              <InfoRow
                label="Përdorime"
                value={
                  d.maxUses != null ? `${d.usesCount} / ${d.maxUses}` : String(d.usesCount)
                }
              />
              <div className="py-3">
                <CouponUsesProgress usesCount={d.usesCount} maxUses={d.maxUses} />
              </div>
              <InfoRow label="Periudha" value={formatCouponValidity(d)} />
              {'totalDiscountGiven' in d && detail ? (
                <InfoRow label="Zbritje totale dhënë" value={`${detail.totalDiscountGiven.toFixed(2)} €`} />
              ) : null}
              {detail?.createdByName ? (
                <InfoRow label="Krijuar nga" value={detail.createdByName} />
              ) : null}
              <InfoRow label="Krijuar më" value={formatDateTime(d.createdAt)} />
            </dl>
          )}
        </div>

        <div className="border-t border-gray-100 px-5 py-4">
          <button
            type="button"
            disabled={busy || loading}
            className={d.isActive ? `${customerBtnGhost} w-full border-red-200 text-red-700` : `${customerBtnPrimary} w-full`}
            onClick={() => void toggleActive()}
          >
            {busy ? '…' : d.isActive ? 'Çaktivizo' : 'Aktivizo'}
          </button>
        </div>
      </aside>
    </div>
  )

  return createPortal(drawer, document.body)
}
