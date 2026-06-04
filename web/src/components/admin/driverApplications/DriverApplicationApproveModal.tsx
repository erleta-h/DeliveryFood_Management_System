import type { DriverApplicationRow } from '../../../lib/adminApi'
import { customerBtnGhost, customerBtnPrimary } from '../../../lib/adminTheme'

type Props = {
  row: DriverApplicationRow
  busy: boolean
  onClose: () => void
  onConfirm: () => void
}

export function DriverApplicationApproveModal({ row, busy, onClose, onConfirm }: Props) {
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal>
      <div className="w-full max-w-lg rounded-2xl border border-violet-200 bg-white p-6 shadow-xl">
        <h2 className="text-lg font-bold text-gray-900">Approve Driver Application</h2>
        <p className="mt-1 text-sm text-gray-500">Konfirmo miratimin e aplikimit.</p>

        <dl className="mt-4 space-y-2 rounded-xl bg-gray-50 px-4 py-3 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-gray-500">Driver Name</dt>
            <dd className="font-medium text-gray-900">
              {row.firstName} {row.lastName}
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-gray-500">Email</dt>
            <dd className="font-medium text-gray-900">{row.email}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-gray-500">Phone</dt>
            <dd className="font-medium text-gray-900">{row.phone}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-gray-500">Vehicle</dt>
            <dd className="font-medium text-gray-900">
              {row.vehicleType}
              {row.licensePlate ? ` · ${row.licensePlate}` : ''}
            </dd>
          </div>
        </dl>

        <p className="mt-4 rounded-lg border border-violet-100 bg-violet-50 px-3 py-2 text-sm text-violet-900">
          This action will create a Driver account and send an activation email. The account will remain inactive
          until the applicant activates it.
        </p>

        <ul className="mt-3 space-y-1 text-sm text-gray-700">
          {[
            'Create Driver Account',
            'Assign Driver Role',
            'Generate Activation Token',
            'Send Activation Email',
          ].map((item) => (
            <li key={item} className="flex items-center gap-2">
              <span className="text-emerald-600" aria-hidden>
                ✓
              </span>
              {item}
            </li>
          ))}
        </ul>

        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <button type="button" className={customerBtnGhost} disabled={busy} onClick={onClose}>
            Cancel
          </button>
          <button type="button" className={customerBtnPrimary} disabled={busy} onClick={onConfirm}>
            {busy ? 'Duke miratuar…' : 'Approve Application'}
          </button>
        </div>
      </div>
    </div>
  )
}
