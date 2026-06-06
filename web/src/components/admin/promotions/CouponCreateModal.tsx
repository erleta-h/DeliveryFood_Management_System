import { useEffect, useState, type FormEvent } from 'react'
import { createPortal } from 'react-dom'
import { adminCreateCoupon, adminUpdateCoupon, type AdminCouponDetail } from '../../../lib/adminApi'
import { customerBtnGhost, customerBtnPrimary, customerField, customerLabelForm, customerSelect } from '../../../lib/adminTheme'
import { useAuthStore } from '../../../store/authStore'
import { dateTimeLocalToIso, toDateTimeLocalValue } from './couponHelpers'

type Props =
  | { mode: 'create'; onClose: () => void; onSaved: () => void; onMessage: (m: string) => void }
  | {
      mode: 'edit'
      coupon: AdminCouponDetail
      onClose: () => void
      onSaved: () => void
      onMessage: (m: string) => void
    }

export function CouponCreateModal(props: Props) {
  const token = useAuthStore((s) => s.token)
  const isEdit = props.mode === 'edit'

  const [code, setCode] = useState(isEdit ? props.coupon.code : '')
  const [discountPercent, setDiscountPercent] = useState(
    isEdit ? String(props.coupon.discountPercent) : '10',
  )
  const [maxDiscountAmount, setMaxDiscountAmount] = useState(
    isEdit && props.coupon.maxDiscountAmount != null ? String(props.coupon.maxDiscountAmount) : '',
  )
  const [minOrderAmount, setMinOrderAmount] = useState(
    isEdit && props.coupon.minOrderAmount != null ? String(props.coupon.minOrderAmount) : '',
  )
  const [maxUses, setMaxUses] = useState(
    isEdit && props.coupon.maxUses != null ? String(props.coupon.maxUses) : '',
  )
  const [validFrom, setValidFrom] = useState(
    isEdit ? toDateTimeLocalValue(props.coupon.validFrom) : '',
  )
  const [validTo, setValidTo] = useState(isEdit ? toDateTimeLocalValue(props.coupon.validTo) : '')
  const [isActive, setIsActive] = useState(isEdit ? props.coupon.isActive : true)
  const [busy, setBusy] = useState(false)
  const [localErr, setLocalErr] = useState<string | null>(null)

  useEffect(() => {
    if (!isEdit) return
    setCode(props.coupon.code)
    setDiscountPercent(String(props.coupon.discountPercent))
    setMaxDiscountAmount(
      props.coupon.maxDiscountAmount != null ? String(props.coupon.maxDiscountAmount) : '',
    )
    setMinOrderAmount(props.coupon.minOrderAmount != null ? String(props.coupon.minOrderAmount) : '')
    setMaxUses(props.coupon.maxUses != null ? String(props.coupon.maxUses) : '')
    setValidFrom(toDateTimeLocalValue(props.coupon.validFrom))
    setValidTo(toDateTimeLocalValue(props.coupon.validTo))
    setIsActive(props.coupon.isActive)
  }, [isEdit, props.mode === 'edit' ? props.coupon.id : 0])

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!token) return
    const pct = Number(discountPercent)
    if ((!isEdit && !code.trim()) || !Number.isFinite(pct)) {
      setLocalErr('Plotëso kodin dhe përqindjen.')
      return
    }
    const maxDisc = maxDiscountAmount.trim() === '' ? null : Number(maxDiscountAmount)
    const minOrder = minOrderAmount.trim() === '' ? null : Number(minOrderAmount)
    const maxU = maxUses.trim() === '' ? null : Number(maxUses)
    if (maxDisc != null && !Number.isFinite(maxDisc)) {
      setLocalErr('Max. zbritja duhet të jetë numër.')
      return
    }
    if (minOrder != null && !Number.isFinite(minOrder)) {
      setLocalErr('Min. porosia duhet të jetë numër.')
      return
    }
    if (maxU != null && (!Number.isFinite(maxU) || maxU <= 0)) {
      setLocalErr('Max. përdorime duhet të jetë numër pozitiv.')
      return
    }

    setLocalErr(null)
    setBusy(true)

    const payload = {
      discountPercent: pct,
      maxDiscountAmount: maxDisc,
      minOrderAmount: minOrder,
      maxUses: maxU,
      validFrom: dateTimeLocalToIso(validFrom),
      validTo: dateTimeLocalToIso(validTo),
      isActive,
    }

    const r =
      isEdit ?
        await adminUpdateCoupon(token, props.coupon.id, payload)
      : await adminCreateCoupon(token, { code: code.trim(), ...payload })

    setBusy(false)
    if (!r.ok) {
      setLocalErr(r.message)
      return
    }
    props.onMessage(isEdit ? 'Kuponi u përditësua.' : 'Kuponi u krijua.')
    props.onSaved()
    props.onClose()
  }

  const modal = (
    <div className="fixed inset-0 z-[210] flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/40 backdrop-blur-[1px]"
        aria-label="Mbyll"
        onClick={props.onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="coupon-form-title"
        className="relative z-10 w-full max-w-lg rounded-2xl border border-gray-200 bg-white p-6 shadow-xl"
      >
        <h2 id="coupon-form-title" className="text-lg font-semibold text-gray-900">
          {isEdit ? 'Ndrysho kupon' : 'Kupon i ri'}
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          {isEdit ? 'Kodi nuk ndryshohet pas krijimit.' : 'Kupona globale — kodi bëhet automatikisht me shkronja të mëdha.'}
        </p>

        <form onSubmit={submit} className="mt-5 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className={customerLabelForm}>
              Kodi
              {isEdit ?
                <div className={`${customerField} mt-1 font-mono uppercase text-gray-600`}>{code}</div>
              : <input
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className={`${customerField} mt-1 font-mono uppercase`}
                  placeholder="VERE25"
                  autoFocus
                />
              }
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
              Min. porosia (€)
              <input
                value={minOrderAmount}
                onChange={(e) => setMinOrderAmount(e.target.value)}
                type="number"
                min={0}
                step="0.01"
                className={`${customerField} mt-1`}
                placeholder="15.00"
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
            <label className={`${customerLabelForm} sm:col-span-2`}>
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
            <button type="button" className={customerBtnGhost} onClick={props.onClose} disabled={busy}>
              Anulo
            </button>
            <button type="submit" className={customerBtnPrimary} disabled={busy}>
              {busy ? 'Duke ruajtur…' : isEdit ? 'Ruaj ndryshimet' : 'Krijo kupon'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )

  return createPortal(modal, document.body)
}
