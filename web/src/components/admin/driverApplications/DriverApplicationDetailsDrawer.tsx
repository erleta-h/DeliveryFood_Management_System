import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import {
  driverApplicationDocumentUrl,
  fetchDriverApplicationDetail,
  resendDriverActivationEmail,
  type DriverApplicationDetail,
  type DriverApplicationRow,
} from '../../../lib/adminApi'
import {
  DRIVER_APP_APPROVED_WAITING,
  DRIVER_APP_PENDING,
  auditEventLabel,
  driverApplicationStatusBadgeClass,
  driverApplicationStatusLabel,
  driverApplicationStatusSubtext,
} from '../../../lib/driverApplicationStatus'
import { customerBtnGhost } from '../../../lib/adminTheme'
import { useAuthStore } from '../../../store/authStore'

type Tab = 'details' | 'documents' | 'history'

type Props = {
  row: DriverApplicationRow
  onClose: () => void
  onUpdated: () => void
  onReject?: (row: DriverApplicationRow) => void
  initialDevActivationUrl?: string | null
}

function initials(first: string, last: string): string {
  return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase()
}

function docLabel(kind: string): string {
  switch (kind.toLowerCase()) {
    case 'identity':
      return 'Letërnjoftimi'
    case 'license':
      return 'Patenta'
    case 'vehiclephoto':
      return 'Foto e mjetit'
    default:
      return kind
  }
}

function formatDt(iso: string | null | undefined): string {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleString('sq-AL', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return iso
  }
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-3">
      <dt className="w-36 shrink-0 text-xs text-gray-500">{label}</dt>
      <dd className="text-sm font-medium text-gray-900">{value}</dd>
    </div>
  )
}

function SectionCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-gray-100 bg-gray-50/80 p-4">
      <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
      <dl className="mt-3 space-y-2.5">{children}</dl>
    </section>
  )
}

export function DriverApplicationDetailsDrawer({
  row,
  onClose,
  onUpdated,
  onReject,
  initialDevActivationUrl,
}: Props) {
  const token = useAuthStore((s) => s.token)
  const [tab, setTab] = useState<Tab>('details')
  const [detail, setDetail] = useState<DriverApplicationDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [resendBusy, setResendBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [devActivationUrl, setDevActivationUrl] = useState<string | null>(initialDevActivationUrl ?? null)
  const [copyOk, setCopyOk] = useState(false)

  const load = useCallback(async () => {
    if (!token) return
    setLoading(true)
    setError(null)
    try {
      const d = await fetchDriverApplicationDetail(token, row.id)
      setDetail(d)
      if (d.devActivationUrl) setDevActivationUrl(d.devActivationUrl)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gabim.')
    } finally {
      setLoading(false)
    }
  }, [token, row.id])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    if (initialDevActivationUrl) setDevActivationUrl(initialDevActivationUrl)
  }, [initialDevActivationUrl])

  async function onResend() {
    if (!token) return
    setResendBusy(true)
    setMsg(null)
    const r = await resendDriverActivationEmail(token, row.id)
    setResendBusy(false)
    if (r.ok) {
      setMsg('Email aktivizimi u ridërgua.')
      if (r.data.devActivationUrl) setDevActivationUrl(r.data.devActivationUrl)
      await load()
      onUpdated()
    } else setMsg(r.message)
  }

  const docCount = detail?.documents.length ?? 0
  const canReject = row.status === DRIVER_APP_PENDING && onReject
  const status = detail?.status ?? row.status
  const isWaitingActivation = status === DRIVER_APP_APPROVED_WAITING
  const isPending = status === DRIVER_APP_PENDING
  const activationLink = devActivationUrl ?? detail?.devActivationUrl ?? null
  const canResend = detail?.canResendActivationEmail ?? isWaitingActivation

  async function copyActivationLink() {
    if (!activationLink) return
    try {
      await navigator.clipboard.writeText(activationLink)
      setCopyOk(true)
      window.setTimeout(() => setCopyOk(false), 2000)
    } catch {
      /* ignore */
    }
  }

  const panel = (
    <div className="fixed inset-0 z-[70] flex justify-end bg-black/35" role="presentation" onClick={onClose}>
      <aside
        className="flex h-full w-full max-w-xl flex-col bg-white shadow-2xl"
        role="dialog"
        aria-label="Detajet e aplikimit"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="border-b border-gray-100 px-5 py-5">
          <div className="flex items-start gap-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-violet-100 text-sm font-bold text-violet-800">
              {initials(row.firstName, row.lastName)}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-bold text-gray-900">
                  {row.firstName} {row.lastName}
                </h2>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${driverApplicationStatusBadgeClass(row.status)}`}
                >
                  {driverApplicationStatusLabel(row.status)}
                </span>
              </div>
              <p className="mt-0.5 text-xs text-gray-500">{driverApplicationStatusSubtext(row.status)}</p>
              <p className="mt-1 text-xs text-violet-600">ID: APP-{String(row.id).padStart(5, '0')}</p>
              <p className="text-xs text-gray-400">Aplikuar: {formatDt(row.createdAtUtc)}</p>
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
        </header>

        <nav className="flex gap-0 border-b border-gray-100 px-5">
          {(
            [
              ['details', 'Detajet'],
              ['documents', `Dokumentet${docCount > 0 ? ` (${docCount})` : ''}`],
              ['history', 'Historiku'],
            ] as const
          ).map(([t, label]) => (
            <button
              key={t}
              type="button"
              className={
                'border-b-2 px-4 py-3 text-sm font-medium transition ' +
                (tab === t
                  ? 'border-violet-600 text-violet-700'
                  : 'border-transparent text-gray-500 hover:text-gray-800')
              }
              onClick={() => setTab(t)}
            >
              {label}
            </button>
          ))}
        </nav>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {loading ? <p className="text-sm text-gray-500">Duke ngarkuar…</p> : null}
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          {msg ? (
            <p className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
              {msg}
            </p>
          ) : null}

          {!loading && detail && tab === 'details' ? (
            <div className="space-y-4">
              <SectionCard title="Informacionet personale">
                <InfoRow label="Emri i plotë" value={`${detail.firstName} ${detail.lastName}`} />
                <InfoRow label="Email" value={detail.email} />
                <InfoRow label="Telefoni" value={detail.phone} />
                <InfoRow label="Data e lindjes" value="—" />
                <InfoRow label="Adresa" value="—" />
              </SectionCard>

              <SectionCard title="Informacionet e mjetit">
                <InfoRow label="Lloji i mjetit" value={detail.vehicleType} />
                <InfoRow label="Targa" value={detail.licensePlate ?? '—'} />
                <InfoRow label="Marka / Modeli" value="—" />
                <InfoRow label="Viti" value="—" />
                <InfoRow label="Ngjyra" value="—" />
              </SectionCard>

              {detail.message ? (
                <SectionCard title="Mesazhi i aplikantit">
                  <p className="text-sm text-gray-700">{detail.message}</p>
                </SectionCard>
              ) : null}

              <SectionCard title="Statusi i aplikimit">
                <InfoRow label="Statusi aktual" value={driverApplicationStatusLabel(detail.status)} />
                <InfoRow label="Aplikuar më" value={formatDt(detail.createdAtUtc)} />
                <InfoRow label="Miratuar më" value={formatDt(detail.approvedAtUtc)} />
                <InfoRow label="Miratuar nga" value={detail.approvedByName ?? '—'} />
                {detail.rejectionReason ? (
                  <InfoRow label="Arsye refuzimi" value={detail.rejectionReason} />
                ) : null}
                <InfoRow label="Aktivizuar më" value={formatDt(detail.activatedAtUtc)} />
              </SectionCard>

              <section className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                <h3 className="text-sm font-semibold text-emerald-950">Aktivizimi i llogarisë</h3>

                {isPending ? (
                  <p className="mt-3 text-sm leading-relaxed text-emerald-900/80">
                    Aplikimi është ende <strong>në pritje</strong>. Së pari kliko <strong>Mirato</strong> në listë —
                    pastaj këtu do të shfaqen email aktivizimi, linku dhe butoni për ridërgim.
                  </p>
                ) : null}

                {isWaitingActivation ? (
                  <>
                    <div className="mt-3 space-y-3 text-sm">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-emerald-900/70">Email aktivizimi</span>
                        <span
                          className={
                            detail.activationEmailSentAtUtc
                              ? 'font-semibold text-emerald-700'
                              : 'font-medium text-amber-700'
                          }
                        >
                          {detail.activationEmailSentAtUtc ? 'Dërguar' : 'Jo dërguar ende'}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-emerald-900/70">Dërguar më</span>
                        <span className="font-medium text-emerald-950">
                          {formatDt(detail.activationEmailSentAtUtc)}
                        </span>
                      </div>
                      <div>
                        <span className="text-emerald-900/70">Link aktivizimi</span>
                        {activationLink ? (
                          <div className="mt-1.5 flex gap-1">
                            <input
                              type="text"
                              readOnly
                              value={activationLink}
                              className="min-w-0 flex-1 rounded-lg border border-emerald-200 bg-white px-3 py-2 text-xs text-gray-800"
                              onFocus={(e) => e.target.select()}
                            />
                            <button
                              type="button"
                              title="Kopjo linkun"
                              className="shrink-0 rounded-lg border border-emerald-200 bg-white px-3 py-2 text-gray-600 hover:bg-emerald-100"
                              onClick={() => void copyActivationLink()}
                            >
                              {copyOk ? '✓' : '📋'}
                            </button>
                          </div>
                        ) : (
                          <p className="mt-1 text-xs text-emerald-800/80">
                            Linku nuk u gjet në disk (dev). Kliko <strong>Ridërgo email</strong> më poshtë për të
                            gjeneruar një link të ri.
                          </p>
                        )}
                      </div>
                    </div>
                    {canResend ? (
                      <button
                        type="button"
                        className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg border border-emerald-300 bg-white px-4 py-2.5 text-sm font-medium text-emerald-900 shadow-sm transition hover:bg-emerald-100/80"
                        disabled={resendBusy}
                        onClick={() => void onResend()}
                      >
                        <span aria-hidden>✉</span>
                        {resendBusy ? 'Duke dërguar…' : 'Ridërgo emailin e aktivizimit'}
                      </button>
                    ) : null}
                  </>
                ) : null}

                {!isPending && !isWaitingActivation ? (
                  <p className="mt-3 text-sm text-emerald-900/75">
                    {detail.activatedAtUtc
                      ? `Llogaria u aktivizua më ${formatDt(detail.activatedAtUtc)}.`
                      : 'Ky aplikim nuk pret më aktivizim (refuzuar ose i përfunduar).'}
                  </p>
                ) : null}
              </section>
            </div>
          ) : null}

          {!loading && detail && tab === 'documents' ? (
            <ul className="space-y-3">
              {detail.documents.length === 0 ? (
                <li className="rounded-xl border border-dashed border-gray-200 px-4 py-8 text-center text-sm text-gray-500">
                  Nuk ka dokumente të ngarkuara.
                </li>
              ) : (
                detail.documents.map((d) => (
                  <DocumentCard key={d.kind} appId={row.id} kind={d.kind} filename={d.filename} token={token} />
                ))
              )}
            </ul>
          ) : null}

          {!loading && detail && tab === 'history' ? (
            <ol className="relative space-y-0 border-l-2 border-violet-200 pl-5">
              {detail.history.map((h, i) => (
                <li key={`${h.eventType}-${h.createdAtUtc}-${i}`} className="relative pb-7 last:pb-0">
                  <span
                    className="absolute -left-[25px] top-1.5 h-3 w-3 rounded-full border-2 border-white bg-violet-500 shadow-sm"
                    aria-hidden
                  />
                  <p className="text-sm font-semibold text-gray-900">{auditEventLabel(h.eventType)}</p>
                  {h.detail ? <p className="mt-0.5 text-xs text-gray-600">{h.detail}</p> : null}
                  {h.actorName ? <p className="text-xs text-gray-400">{h.actorName}</p> : null}
                  <p className="mt-1 text-xs text-gray-400">{formatDt(h.createdAtUtc)}</p>
                </li>
              ))}
            </ol>
          ) : null}
        </div>

        <footer className="flex flex-wrap gap-2 border-t border-gray-100 bg-gray-50/80 px-5 py-4">
          <button type="button" className={customerBtnGhost + ' flex-1 sm:flex-none'} onClick={onClose}>
            Mbyll
          </button>
          {canReject ? (
            <button
              type="button"
              className="flex-1 rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 sm:flex-none"
              onClick={() => {
                onClose()
                onReject(row)
              }}
            >
              Refuzo aplikimin
            </button>
          ) : null}
        </footer>
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
    <li className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <p className="text-sm font-semibold text-gray-900">{docLabel(kind)}</p>
      <p className="text-xs text-gray-500">{filename}</p>
      {blobUrl && isImage ? (
        <img src={blobUrl} alt="" className="mt-3 max-h-48 w-full rounded-lg border object-contain bg-gray-50" />
      ) : null}
      {blobUrl ? (
        <a
          href={blobUrl}
          download={filename}
          target="_blank"
          rel="noreferrer"
          className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-violet-700 hover:underline"
        >
          Shiko / shkarko
        </a>
      ) : (
        <p className="mt-2 text-xs text-gray-400">Duke ngarkuar…</p>
      )}
    </li>
  )
}
