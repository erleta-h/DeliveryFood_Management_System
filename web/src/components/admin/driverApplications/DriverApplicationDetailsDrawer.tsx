import { useCallback, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  driverApplicationDocumentUrl,
  fetchDriverApplicationDetail,
  resendDriverActivationEmail,
  type DriverApplicationDetail,
  type DriverApplicationRow,
} from '../../../lib/adminApi'
import {
  auditEventLabel,
  driverApplicationStatusBadgeClass,
  driverApplicationStatusLabel,
  driverApplicationStatusSubtext,
} from '../../../lib/driverApplicationStatus'
import { customerBtnGhost, customerBtnPrimary } from '../../../lib/adminTheme'
import { useAuthStore } from '../../../store/authStore'

type Tab = 'details' | 'documents' | 'history'

type Props = {
  row: DriverApplicationRow
  onClose: () => void
  onUpdated: () => void
}

function docLabel(kind: string): string {
  switch (kind.toLowerCase()) {
    case 'identity':
      return 'ID Card'
    case 'license':
      return 'Driver License'
    case 'vehiclephoto':
      return 'Vehicle Photo'
    default:
      return kind
  }
}

function formatDt(iso: string | null | undefined): string {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleString('sq-AL')
  } catch {
    return iso
  }
}

export function DriverApplicationDetailsDrawer({ row, onClose, onUpdated }: Props) {
  const token = useAuthStore((s) => s.token)
  const [tab, setTab] = useState<Tab>('details')
  const [detail, setDetail] = useState<DriverApplicationDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [resendBusy, setResendBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!token) return
    setLoading(true)
    setError(null)
    try {
      setDetail(await fetchDriverApplicationDetail(token, row.id))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gabim.')
    } finally {
      setLoading(false)
    }
  }, [token, row.id])

  useEffect(() => {
    void load()
  }, [load])

  async function onResend() {
    if (!token) return
    setResendBusy(true)
    setMsg(null)
    const r = await resendDriverActivationEmail(token, row.id)
    setResendBusy(false)
    if (r.ok) {
      setMsg('Email aktivizimi u ridërgua.')
      await load()
      onUpdated()
    } else setMsg(r.message)
  }

  const panel = (
    <div className="fixed inset-0 z-[70] flex justify-end bg-black/30" role="presentation" onClick={onClose}>
      <aside
        className="flex h-full w-full max-w-lg flex-col border-l border-gray-200 bg-white shadow-2xl"
        role="dialog"
        aria-label="Detajet e aplikimit"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-start justify-between gap-3 border-b border-gray-100 px-5 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-violet-600">APP-{String(row.id).padStart(5, '0')}</p>
            <h2 className="text-lg font-bold text-gray-900">
              {row.firstName} {row.lastName}
            </h2>
            <span
              className={`mt-1 inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${driverApplicationStatusBadgeClass(row.status)}`}
            >
              {driverApplicationStatusLabel(row.status)}
            </span>
            <p className="text-xs text-gray-500">{driverApplicationStatusSubtext(row.status)}</p>
          </div>
          <button type="button" className={customerBtnGhost + ' shrink-0'} onClick={onClose} aria-label="Mbyll">
            ✕
          </button>
        </header>

        <nav className="flex gap-1 border-b border-gray-100 px-5">
          {(['details', 'documents', 'history'] as const).map((t) => (
            <button
              key={t}
              type="button"
              className={
                'border-b-2 px-3 py-2.5 text-sm font-medium capitalize ' +
                (tab === t ? 'border-violet-600 text-violet-700' : 'border-transparent text-gray-500 hover:text-gray-800')
              }
              onClick={() => setTab(t)}
            >
              {t === 'details' ? 'Details' : t === 'documents' ? 'Documents' : 'History'}
            </button>
          ))}
        </nav>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {loading ? <p className="text-sm text-gray-500">Duke ngarkuar…</p> : null}
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          {msg ? <p className="mb-3 rounded-lg bg-violet-50 px-3 py-2 text-sm text-violet-900">{msg}</p> : null}

          {!loading && detail && tab === 'details' ? (
            <div className="space-y-6 text-sm">
              <section>
                <h3 className="font-semibold text-gray-900">Personal Information</h3>
                <dl className="mt-2 grid gap-1 text-gray-600">
                  <div>
                    <span className="text-gray-400">Full Name · </span>
                    {detail.firstName} {detail.lastName}
                  </div>
                  <div>
                    <span className="text-gray-400">Email · </span>
                    {detail.email}
                  </div>
                  <div>
                    <span className="text-gray-400">Phone · </span>
                    {detail.phone}
                  </div>
                  <div>
                    <span className="text-gray-400">Address · </span>—
                  </div>
                  <div>
                    <span className="text-gray-400">Date of Birth · </span>—
                  </div>
                </dl>
              </section>
              <section>
                <h3 className="font-semibold text-gray-900">Vehicle Information</h3>
                <dl className="mt-2 grid gap-1 text-gray-600">
                  <div>
                    <span className="text-gray-400">Vehicle Type · </span>
                    {detail.vehicleType}
                  </div>
                  <div>
                    <span className="text-gray-400">Plate · </span>
                    {detail.licensePlate ?? '—'}
                  </div>
                  <div>
                    <span className="text-gray-400">Brand / Model / Year · </span>—
                  </div>
                </dl>
              </section>
              <section>
                <h3 className="font-semibold text-gray-900">Application Status</h3>
                <dl className="mt-2 grid gap-1 text-gray-600">
                  <div>
                    <span className="text-gray-400">Applied At · </span>
                    {formatDt(detail.createdAtUtc)}
                  </div>
                  <div>
                    <span className="text-gray-400">Approved At · </span>
                    {formatDt(detail.approvedAtUtc)}
                  </div>
                  <div>
                    <span className="text-gray-400">Approved By · </span>
                    {detail.approvedByName ?? '—'}
                  </div>
                  {detail.rejectionReason ? (
                    <div>
                      <span className="text-gray-400">Rejection · </span>
                      {detail.rejectionReason}
                    </div>
                  ) : null}
                </dl>
              </section>
              <section>
                <h3 className="font-semibold text-gray-900">Activation Information</h3>
                <dl className="mt-2 grid gap-1 text-gray-600">
                  <div>
                    <span className="text-gray-400">Email Sent · </span>
                    {detail.activationEmailSentAtUtc ? 'Po' : 'Jo'}
                  </div>
                  <div>
                    <span className="text-gray-400">Sent Date · </span>
                    {formatDt(detail.activationEmailSentAtUtc)}
                  </div>
                  <div>
                    <span className="text-gray-400">Activated At · </span>
                    {formatDt(detail.activatedAtUtc)}
                  </div>
                </dl>
                {detail.canResendActivationEmail ? (
                  <button
                    type="button"
                    className={customerBtnPrimary + ' mt-3 text-xs'}
                    disabled={resendBusy}
                    onClick={() => void onResend()}
                  >
                    {resendBusy ? 'Duke dërguar…' : 'Resend Activation Email'}
                  </button>
                ) : null}
              </section>
            </div>
          ) : null}

          {!loading && detail && tab === 'documents' ? (
            <ul className="space-y-3">
              {detail.documents.length === 0 ? (
                <li className="text-sm text-gray-500">Nuk ka dokumente të ngarkuara.</li>
              ) : (
                detail.documents.map((d) => (
                  <DocumentCard key={d.kind} appId={row.id} kind={d.kind} filename={d.filename} token={token} />
                ))
              )}
            </ul>
          ) : null}

          {!loading && detail && tab === 'history' ? (
            <ol className="relative space-y-0 border-l border-violet-200 pl-4">
              {detail.history.map((h, i) => (
                <li key={`${h.eventType}-${h.createdAtUtc}-${i}`} className="relative pb-6 last:pb-0">
                  <span className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full bg-violet-500" aria-hidden />
                  <p className="text-sm font-medium text-gray-900">{auditEventLabel(h.eventType)}</p>
                  {h.detail ? <p className="text-xs text-gray-500">{h.detail}</p> : null}
                  {h.actorName ? <p className="text-xs text-gray-400">{h.actorName}</p> : null}
                  <p className="text-xs text-gray-400">{formatDt(h.createdAtUtc)}</p>
                </li>
              ))}
            </ol>
          ) : null}
        </div>
      </aside>
    </div>
  )

  return createPortal(panel, document.body)
}

function DocumentCard({
  appId,
  kind,
  filename,
  token,
}: {
  appId: number
  kind: string
  filename: string
  token: string | null
}) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null)
  const isImage = /\.(jpe?g|png|gif|webp)$/i.test(filename)

  useEffect(() => {
    if (!token) return
    let revoked: string | null = null
    void fetch(driverApplicationDocumentUrl(appId, kind), {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => (r.ok ? r.blob() : null))
      .then((b) => {
        if (b) {
          revoked = URL.createObjectURL(b)
          setBlobUrl(revoked)
        }
      })
    return () => {
      if (revoked) URL.revokeObjectURL(revoked)
    }
  }, [appId, kind, token, filename])

  return (
    <li className="rounded-xl border border-gray-200 p-3">
      <p className="text-sm font-medium text-gray-900">{docLabel(kind)}</p>
      <p className="text-xs text-gray-500">{filename}</p>
      {blobUrl && isImage ? (
        <img src={blobUrl} alt="" className="mt-2 max-h-40 rounded-lg border object-contain" />
      ) : null}
      {blobUrl ? (
        <a
          href={blobUrl}
          download={filename}
          className="mt-2 inline-block text-xs font-medium text-violet-700 hover:underline"
        >
          Shkarko
        </a>
      ) : (
        <p className="mt-2 text-xs text-gray-400">Duke ngarkuar…</p>
      )}
    </li>
  )
}
