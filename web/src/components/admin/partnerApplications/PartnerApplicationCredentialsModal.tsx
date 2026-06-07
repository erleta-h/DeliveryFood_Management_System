import type { ApprovePartnerResult, ResetPartnerStaffPasswordResult } from '../../../lib/adminApi'
import { customerBtnGhost, customerBtnPrimary } from '../../../lib/adminTheme'
import { useState } from 'react'

type Props = {
  title: string
  subtitle: string
  data: ApprovePartnerResult | ResetPartnerStaffPasswordResult
  passwordKey: 'temporaryPassword' | 'newPassword'
  onClose: () => void
}

export function PartnerApplicationCredentialsModal({ title, subtitle, data, passwordKey, onClose }: Props) {
  const password =
    passwordKey === 'temporaryPassword'
      ? (data as ApprovePartnerResult).temporaryPassword
      : (data as ResetPartnerStaffPasswordResult).newPassword
  const [copied, setCopied] = useState<'email' | 'pw' | 'all' | null>(null)

  async function copy(text: string, kind: 'email' | 'pw' | 'all') {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(kind)
      window.setTimeout(() => setCopied(null), 2000)
    } catch {
      /* ignore */
    }
  }

  const restaurantInfo =
    passwordKey === 'temporaryPassword'
      ? (data as ApprovePartnerResult)
      : null

  return (
    <div className="fixed inset-0 z-[85] flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal>
      <div className="w-full max-w-lg rounded-2xl border border-emerald-200 bg-white p-6 shadow-xl">
        <h2 className="text-lg font-bold text-gray-900">{title}</h2>
        <p className="mt-1 text-sm text-gray-500">{subtitle}</p>

        <div className="mt-4 space-y-3 rounded-xl border border-emerald-100 bg-emerald-50/60 p-4 font-mono text-sm">
          <div>
            <p className="text-[10px] font-sans font-semibold uppercase tracking-wide text-emerald-700">Email staf</p>
            <p className="mt-0.5 break-all text-gray-900">{data.staffEmail}</p>
          </div>
          <div>
            <p className="text-[10px] font-sans font-semibold uppercase tracking-wide text-emerald-700">Fjalëkalim</p>
            <p className="mt-0.5 break-all text-gray-900">{password}</p>
          </div>
          {restaurantInfo ? (
            <div>
              <p className="text-[10px] font-sans font-semibold uppercase tracking-wide text-emerald-700">Restoranti</p>
              <p className="mt-0.5 text-gray-900">
                {restaurantInfo.restaurantName}{' '}
                <span className="text-gray-500">({restaurantInfo.restaurantSlug})</span>
              </p>
            </div>
          ) : null}
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            className={customerBtnGhost + ' text-xs'}
            onClick={() => void copy(data.staffEmail, 'email')}
          >
            {copied === 'email' ? 'U kopjua!' : 'Kopjo email'}
          </button>
          <button
            type="button"
            className={customerBtnGhost + ' text-xs'}
            onClick={() => void copy(password, 'pw')}
          >
            {copied === 'pw' ? 'U kopjua!' : 'Kopjo fjalëkalimin'}
          </button>
          <button
            type="button"
            className={customerBtnGhost + ' text-xs'}
            onClick={() =>
              void copy(`Email: ${data.staffEmail}\nFjalëkalim: ${password}`, 'all')
            }
          >
            {copied === 'all' ? 'U kopjua!' : 'Kopjo të dyja'}
          </button>
        </div>

        <div className="mt-6 flex justify-end">
          <button type="button" className={customerBtnPrimary} onClick={onClose}>
            Mbyll
          </button>
        </div>
      </div>
    </div>
  )
}
