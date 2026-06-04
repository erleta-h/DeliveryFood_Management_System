import { useState } from 'react'
import type { DriverApplicationRow } from '../../../lib/adminApi'
import { REJECT_REASON_PRESETS } from '../../../lib/driverApplicationStatus'
import { customerBtnGhost, customerBtnPrimary, customerField } from '../../../lib/adminTheme'

type Props = {
  row: DriverApplicationRow
  busy: boolean
  onClose: () => void
  onConfirm: (reason: string) => void
}

export function DriverApplicationRejectModal({ row, busy, onClose, onConfirm }: Props) {
  const [preset, setPreset] = useState<string>(REJECT_REASON_PRESETS[0])
  const [other, setOther] = useState('')

  const reason = preset === 'Other' ? other.trim() : preset

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal>
      <div className="w-full max-w-md rounded-2xl border border-red-200 bg-white p-6 shadow-xl">
        <h2 className="text-lg font-bold text-gray-900">Refuzo aplikimin</h2>
        <p className="mt-1 text-sm text-gray-500">
          {row.firstName} {row.lastName} · {row.email}
        </p>

        <label className="mt-4 block text-sm font-medium text-gray-700">Reason</label>
        <select
          className={customerField + ' mt-1'}
          value={preset}
          onChange={(e) => setPreset(e.target.value)}
        >
          {REJECT_REASON_PRESETS.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>

        {preset === 'Other' ? (
          <textarea
            className={customerField + ' mt-2 min-h-[4rem]'}
            value={other}
            onChange={(e) => setOther(e.target.value)}
            placeholder="Shkruaj arsyen…"
          />
        ) : null}

        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <button type="button" className={customerBtnGhost} disabled={busy} onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className={customerBtnPrimary + ' !bg-red-600 hover:!bg-red-700'}
            disabled={busy || !reason}
            onClick={() => onConfirm(reason)}
          >
            {busy ? 'Duke refuzuar…' : 'Refuzo'}
          </button>
        </div>
      </div>
    </div>
  )
}
