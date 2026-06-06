import { useState, type FormEvent } from 'react'
import { createPortal } from 'react-dom'
import { adminCreateCoupon } from '../../../lib/adminApi'
import { customerBtnGhost, customerBtnPrimary, customerField, customerLabelForm, customerSelect } from '../../../lib/adminTheme'
import { useAuthStore } from '../../../store/authStore'
import { dateTimeLocalToIso } from './couponHelpers'

type Props = {
  onClose: () => void
  onCreated: () => void
  onMessage: (m: string) => void
}

export function CouponCreateModal({ onClose, onCreated, onMessage }: Props) {
  const token = useAuthStore((s) => s.token)
  const [code, setCode] = useState('')
  const [discountPercent, setDiscountPercent] = useState('10')
  const [maxDiscountAmount, setMaxDiscountAmount] = useState('')
  const [maxUses, setMaxUses] = useState('')
  const [validFrom, setValidFrom] = useState('')
  const [validTo, setValidTo] = useState('')
  const [isActive, setIsActive] = useState(true)
  const [busy, setBusy] = useState(false)
  const [localErr, setLocalErr] = useState<string | null>(null)

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!token) return
    const pct = Number(discountPercent)
    if (!code.trim() || !Number.isFinite(pct)) {
      setLocalErr('Plotëso kodin dhe përqindjen.')
      return
    }
    const maxDisc = maxDiscountAmount.trim() === '' ? null : Number(maxDiscountAmount)
    const maxU = maxUses.trim() === '' ? null : Number(maxUses)
    if (maxDisc != null && !Number.isFinite(maxDisc)) {
      setLocalErr('Max. zbritja duhet të jetë numër.')
      return
    }
    if (maxU != null && (!Number.isFinite(maxU) || maxU <= 0)) {
      setLocalErr('Max. përdorime duhet të jetë numër pozitiv.')
      return
    }

    setLocalErr(null)
    setBusy(true)
    const r = await adminCreateCoupon(token, {
      code: code.trim(),
      discountPercent: pct,
      maxDiscountAmount: maxDisc,
      maxUses: maxU,
      validFrom: dateTimeLocalToIso(validFrom),
      validTo: dateTimeLocalToIso(validTo),
      isActive,
    })
    setBusy(false)
    if (!r.ok) {
      setLocalErr(r.message)
      return
    }
    onMessage('Kuponi u krijua.')
    onCreated()
    onClose()
  }

  const modal = (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/40 backdrop-blur-[1px]"
        aria-label="Mbyll"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="coupon-create-title"
        className="relative z-10 w-full max-w-lg rounded-2xl border border-gray-200 bg-white p-6 shadow-xl"
      >
        <h2 id="coupon-create-title" className="text-lg font-semibold text-gray-900">
          Kupon i ri
        </h2>
        <p className="mt-1 text-sm text-gray-500">Kupona globale — kodi bëhet automatikisht me shkronja të mëdha.</p>

        <form onSubmit={submit} className="mt-5 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className={customerLabelForm}>
              Kodi
              <input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className={`${customerField} mt-1 font-mono uppercase`}
                placeholder="VERE25"
                autoFocus
              />
            </label>
            <label className={customerLabelForm}>
              Zbritja (%)
              <input
                value={discountPercent}
                onChange={(e) => setDiscountPercent(e.target.value)}
                type="number"
                min={1}
                max={100}
                className={`${customerField} mt-1`}
              />
            </label>
            <label className={customerLabelForm}>
              Max. zbritja (€)
              <input
                value={maxDiscountAmount}
                onChange={(e) => setMaxDiscountAmount(e.target.value)}
                type="number"
                min={0}
                step="0.01"
                className={`${customerField} mt-1`}
                placeholder="5.00"
              />
            </label>
            <label className={customerLabelForm}>
              Max. përdorime
              <input
                value={maxUses}
                onChange={(e) => setMaxUses(e.target.value)}
                type="number"
                min={1}
                className={`${customerField} mt-1`}
                placeholder="100"
              />
            </label>
            <label className={customerLabelForm}>
              Data e fillimit
              <input
                value={validFrom}
                onChange={(e) => setValidFrom(e.target.value)}
                type="datetime-local"
                className={`${customerField} mt-1`}
              />
            </label>
            <label className={customerLabelForm}>
              Data e skadimit
              <input
                value={validTo}
                onChange={(e) => setValidTo(e.target.value)}
                type="datetime-local"
                className={`${customerField} mt-1`}
              />
            </label>
          </div>
          <label className={customerLabelForm}>
            Statusi
            <select
              value={isActive ? 'active' : 'inactive'}
              onChange={(e) => setIsActive(e.target.value === 'active')}
              className={`${customerSelect} mt-1`}
            >
              <option value="active">Aktiv</option>
              <option value="inactive">Jo aktiv</option>
            </select>
          </label>

          {localErr ? <p className="text-sm text-red-600">{localErr}</p> : null}

          <div className="flex justify-end gap-2 border-t border-gray-100 pt-4">
            <button type="button" className={customerBtnGhost} onClick={onClose} disabled={busy}>
              Anulo
            </button>
            <button type="submit" className={customerBtnPrimary} disabled={busy}>
              {busy ? 'Duke krijuar…' : 'Krijo kupon'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )

  return createPortal(modal, document.body)
}
