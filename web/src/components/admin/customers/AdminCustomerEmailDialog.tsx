import { useState } from 'react'
import { createPortal } from 'react-dom'
import {
  copyCustomerEmail,
  openCustomerEmailChannel,
  type CustomerEmailChannel,
} from '../../../lib/customerEmailLinks'
import { customerBtnGhost, customerBtnPrimary } from '../../../lib/adminTheme'
import { EmailChannelIcon, CopyIcon } from './EmailChannelIcon'

type Props = {
  email: string
  name: string
  onClose: () => void
}

const CHANNELS: { id: CustomerEmailChannel; label: string; hint: string }[] = [
  { id: 'gmail', label: 'Gmail (në browser)', hint: 'Hap Gmail për të shkruar emailin' },
  { id: 'outlook-web', label: 'Outlook.com (në browser)', hint: 'Outlook personal — pa aplikacionin e Windows' },
  { id: 'outlook-office', label: 'Outlook Office (në browser)', hint: 'Për llogari punë / Microsoft 365' },
  { id: 'local-app', label: 'Aplikacion lokal (Outlook/Mail)', hint: 'Hap programin e emailit në PC' },
]

export function AdminCustomerEmailDialog({ email, name, onClose }: Props) {
  const [copied, setCopied] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  async function onCopy() {
    const ok = await copyCustomerEmail(email)
    if (ok) {
      setCopied(true)
      setMsg('Emaili u kopjua.')
      window.setTimeout(() => setCopied(false), 2000)
    } else {
      setMsg('Nuk u kopjua. Kopjoje manualisht nga fusha më poshtë.')
    }
  }

  function onChoose(channel: CustomerEmailChannel) {
    openCustomerEmailChannel(channel, email)
    onClose()
  }

  const panel = (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-black/40 p-4"
      role="presentation"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-xl"
        role="dialog"
        aria-modal
        aria-labelledby="customer-email-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id="customer-email-title" className="text-lg font-bold text-gray-900">
              Dërgo email
            </h2>
            <p className="mt-1 text-sm text-gray-500">Zgjidh si do ta hapësh emailin për klientin.</p>
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

        <div className="mt-4 rounded-xl border border-violet-100 bg-violet-50/60 px-4 py-3">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Klienti</p>
          <p className="mt-1 font-semibold text-gray-900">{name}</p>
          <p className="mt-2 break-all font-mono text-sm text-violet-800">{email}</p>
        </div>

        <ul className="mt-4 space-y-2">
          {CHANNELS.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                className="flex w-full items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 text-left transition hover:border-violet-300 hover:bg-violet-50/40"
                onClick={() => onChoose(c.id)}
              >
                <span className="flex h-12 w-12 shrink-0 items-center justify-center">
                  <EmailChannelIcon channel={c.id} className="h-12 w-12" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-gray-900">{c.label}</span>
                  <span className="block text-xs text-gray-500">{c.hint}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>

        {msg ? <p className="mt-3 text-sm text-emerald-700">{msg}</p> : null}

        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            className={`${customerBtnGhost} inline-flex items-center gap-2`}
            onClick={() => void onCopy()}
          >
            <CopyIcon />
            {copied ? 'U kopjua' : 'Kopjo emailin'}
          </button>
          <button type="button" className={customerBtnPrimary} onClick={onClose}>
            Mbyll
          </button>
        </div>
      </div>
    </div>
  )

  return createPortal(panel, document.body)
}
