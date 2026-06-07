import type { PartnerApplicationRow } from '../../../lib/adminApi'
import { customerBtnGhost, customerBtnPrimary, customerField } from '../../../lib/adminTheme'
import { useState } from 'react'

type Props = {
  row: PartnerApplicationRow
  busy: boolean
  onClose: () => void
  onConfirm: (initialPassword?: string) => void
}

export function PartnerApplicationApproveModal({ row, busy, onClose, onConfirm }: Props) {
  const [initialPassword, setInitialPassword] = useState('')

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal>
      <div className="w-full max-w-lg rounded-2xl border border-violet-200 bg-white p-6 shadow-xl">
        <h2 className="text-lg font-bold text-gray-900">Mirato aplikimin partner</h2>
        <p className="mt-1 text-sm text-gray-500">Konfirmo pas kontratës — krijohen restoranti dhe kredencialet e stafit.</p>

        <dl className="mt-4 space-y-2 rounded-xl bg-gray-50 px-4 py-3 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-gray-500">Restoranti</dt>
            <dd className="font-medium text-gray-900">{row.venueName}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-gray-500">Kontakti</dt>
            <dd className="font-medium text-gray-900">
              {row.contactFirstName} {row.contactLastName}
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-gray-500">Email</dt>
            <dd className="font-medium text-gray-900">{row.email}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-gray-500">Qyteti</dt>
            <dd className="font-medium text-gray-900">{row.city}</dd>
          </div>
        </dl>

        <label className="mt-4 block text-xs font-medium text-gray-500">
          Fjalëkalim fillestar staf (opsional)
          <input
            type="password"
            autoComplete="new-password"
            value={initialPassword}
            onChange={(e) => setInitialPassword(e.target.value)}
            placeholder="Bosh = gjenero automatikisht"
            className={customerField + ' mt-1.5'}
          />
        </label>

        <p className="mt-4 rounded-lg border border-violet-100 bg-violet-50 px-3 py-2 text-sm text-violet-900">
          Kredencialet shfaqen një herë pas miratimit — dërgoji partnerit përmes kanalit të sigurt.
        </p>

        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <button type="button" className={customerBtnGhost} disabled={busy} onClick={onClose}>
            Anulo
          </button>
          <button
            type="button"
            className={customerBtnPrimary}
            disabled={busy}
            onClick={() => onConfirm(initialPassword.trim() || undefined)}
          >
            {busy ? 'Duke miratuar…' : 'Mirato aplikimin'}
          </button>
        </div>
      </div>
    </div>
  )
}
