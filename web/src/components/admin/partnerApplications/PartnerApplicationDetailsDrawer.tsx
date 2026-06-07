import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import {
  fetchPartnerApplicationDetail,
  markPartnerApplicationContacted,
  partnerContractUrl,
  resetPartnerStaffPassword,
  uploadPartnerContract,
  type PartnerApplicationDetail,
  type PartnerApplicationRow,
} from '../../../lib/adminApi'
import {
  PARTNER_APP_APPROVED,
  formatVenueLocations,
  partnerApplicationStatusBadgeClass,
  partnerApplicationStatusLabel,
  partnerApplicationStatusSubtext,
  partnerAuditEventLabel,
  partnerCanActOn,
  partnerCanMarkContacted,
} from '../../../lib/partnerApplicationStatus'
import { customerBtnGhost, customerBtnPrimary } from '../../../lib/adminTheme'
import { useAuthStore } from '../../../store/authStore'

type Tab = 'details' | 'documents' | 'history'

type Props = {
  row: PartnerApplicationRow
  onClose: () => void
  onApprove: (row: PartnerApplicationRow) => void
  onReject: (row: PartnerApplicationRow) => void
  onResetSuccess: (email: string, newPassword: string) => void
  onUpdated: () => void
  busy: boolean
}

function formatDt(iso: string): string {
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

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`
  return `${(n / (1024 * 1024)).toFixed(1)} MB`
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-3">
      <dt className="w-36 shrink-0 text-xs text-gray-500">{label}</dt>
      <dd className="text-sm font-medium text-gray-900">{value || '—'}</dd>
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

export function PartnerApplicationDetailsDrawer({
  row,
  onClose,
  onApprove,
  onReject,
  onResetSuccess,
  onUpdated,
  busy,
}: Props) {
  const token = useAuthStore((s) => s.token)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [tab, setTab] = useState<Tab>('details')
  const [detail, setDetail] = useState<PartnerApplicationDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const [uploadBusy, setUploadBusy] = useState(false)
  const [contactBusy, setContactBusy] = useState(false)
  const [resetPw, setResetPw] = useState('')
  const [resetAck, setResetAck] = useState(false)
  const [resetBusy, setResetBusy] = useState(false)
  const [dragOver, setDragOver] = useState(false)

  const load = useCallback(async () => {
    if (!token) return
    setLoading(true)
    setError(null)
    try {
      const d = await fetchPartnerApplicationDetail(token, row.id)
      setDetail(d)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gabim.')
    } finally {
      setLoading(false)
    }
  }, [token, row.id])

  useEffect(() => {
    void load()
  }, [load])

  const status = detail?.status ?? row.status
  const canAct = partnerCanActOn(status)
  const canMarkContacted = partnerCanMarkContacted(status)
  const isApproved = status === PARTNER_APP_APPROVED
  const hasContract = detail?.hasContract ?? false

  async function onMarkContacted() {
    if (!token) return
    setContactBusy(true)
    setMsg(null)
    const r = await markPartnerApplicationContacted(token, row.id)
    setContactBusy(false)
    if (r.ok) {
      setMsg('Aplikimi u shënua si kontaktuar.')
      onUpdated()
      await load()
    } else setMsg(r.message)
  }

  async function handleUpload(file: File) {
    if (!token) return
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      setMsg('Vetëm skedarë PDF lejohen.')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      setMsg('PDF duhet të jetë maksimum 10 MB.')
      return
    }
    setUploadBusy(true)
    setMsg(null)
    const r = await uploadPartnerContract(token, row.id, file)
    setUploadBusy(false)
    if (r.ok) {
      setMsg('Kontrata u ngarkua.')
      onUpdated()
      await load()
    } else setMsg(r.message)
  }

  async function openContract(view: boolean) {
    if (!token) return
    try {
      const res = await fetch(partnerContractUrl(row.id), { headers: { Authorization: `Bearer ${token}` } })
      if (!res.ok) throw new Error('Skedari nuk u hap.')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      if (view) {
        window.open(url, '_blank', 'noopener,noreferrer')
      } else {
        const a = document.createElement('a')
        a.href = url
        a.download = detail?.contract?.filename ?? 'kontrata-partner.pdf'
        a.click()
      }
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000)
    } catch {
      setMsg('Nuk u hap kontrata.')
    }
  }

  async function onResetPassword() {
    if (!token || !resetAck) return
    setResetBusy(true)
    setMsg(null)
    const r = await resetPartnerStaffPassword(token, row.id, resetPw.trim() || null)
    setResetBusy(false)
    if (r.ok) {
      setResetPw('')
      setResetAck(false)
      onResetSuccess(r.data.staffEmail, r.data.newPassword)
      onClose()
    } else setMsg(r.message)
  }

  const panel = (
    <div className="fixed inset-0 z-[70] flex justify-end bg-black/35" role="presentation" onClick={onClose}>
      <aside
        className="flex h-full w-full max-w-xl flex-col bg-white shadow-2xl"
        role="dialog"
        aria-label="Detajet e aplikimit partner"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="border-b border-gray-100 px-5 py-4">
          <div className="flex items-start gap-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-lg font-bold text-violet-800">
              {(row.venueName[0] ?? '?').toUpperCase()}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-bold text-gray-900">{row.venueName}</h2>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${partnerApplicationStatusBadgeClass(status)}`}
                >
                  {partnerApplicationStatusLabel(status)}
                </span>
              </div>
              <p className="mt-0.5 text-xs text-gray-500">{partnerApplicationStatusSubtext(status)}</p>
              <p className="mt-1 text-xs text-violet-600">ID: PART-{String(row.id).padStart(5, '0')}</p>
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
              ['documents', 'Dokumentet'],
              ['history', 'Historiku'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={[
                'border-b-2 px-4 py-3 text-sm font-medium transition',
                tab === id
                  ? 'border-violet-600 text-violet-700'
                  : 'border-transparent text-gray-500 hover:text-gray-800',
              ].join(' ')}
            >
              {label}
            </button>
          ))}
        </nav>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {loading ? <p className="text-sm text-gray-500">Duke ngarkuar…</p> : null}
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          {msg ? (
            <div className="mb-3 rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 text-sm text-violet-900">
              {msg}
            </div>
          ) : null}

          {!loading && tab === 'details' && detail ? (
            <div className="space-y-4">
              <SectionCard title="Restoranti">
                <InfoRow label="Emri" value={detail.venueName} />
                <InfoRow label="Lloji biznesit" value={detail.businessType} />
                <InfoRow label="Lokacione" value={formatVenueLocations(detail.venueCountLabel)} />
                <InfoRow label="Qyteti" value={detail.city} />
                <InfoRow label="Adresa" value={detail.streetAddress} />
                <InfoRow label="Vendi" value={detail.country} />
              </SectionCard>
              <SectionCard title="Kontakti">
                <InfoRow label="Pronari" value={`${detail.contactFirstName} ${detail.contactLastName}`} />
                <InfoRow label="Email" value={detail.email} />
                <InfoRow label="Telefoni" value={detail.phone} />
              </SectionCard>
              {detail.message?.trim() ? (
                <SectionCard title="Mesazhi">
                  <p className="text-sm leading-relaxed text-gray-700">{detail.message}</p>
                </SectionCard>
              ) : null}

              {isApproved ? (
                <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-amber-800">Mbështetje</p>
                  <p className="mt-1 text-xs text-gray-600">Rivendos fjalëkalimin e stafit kur partneri humb aksesin.</p>
                  <label className="mt-3 flex cursor-pointer items-start gap-2 rounded-md border border-amber-200 bg-white px-3 py-2.5">
                    <input
                      type="checkbox"
                      className="mt-0.5 h-3.5 w-3.5 rounded border-gray-300 text-violet-600"
                      checked={resetAck}
                      onChange={(e) => setResetAck(e.target.checked)}
                    />
                    <span className="text-xs text-gray-700">Konfirmoj kërkesën e dokumentuar për humbje aksesi.</span>
                  </label>
                  <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end">
                    <input
                      type="password"
                      value={resetPw}
                      onChange={(e) => setResetPw(e.target.value)}
                      disabled={!resetAck}
                      placeholder="Fjalëkalim i ri (opsional)"
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm disabled:opacity-45"
                    />
                    <button
                      type="button"
                      disabled={resetBusy || !resetAck}
                      onClick={() => void onResetPassword()}
                      className={`${customerBtnPrimary} shrink-0 px-3 py-2 text-xs disabled:opacity-40`}
                    >
                      {resetBusy ? '…' : 'Rivendos'}
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}

          {!loading && tab === 'documents' && detail ? (
            <div className="space-y-5">
              <div>
                <h3 className="text-sm font-semibold text-gray-900">Kontrata e partneritetit</h3>
                <p className="mt-0.5 text-xs text-gray-500">
                  Ngarko PDF-në e kontratës së nënshkruar me partnerin
                </p>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf,.pdf"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) void handleUpload(f)
                  e.target.value = ''
                }}
              />

              {canAct ? (
                <div
                  className={`rounded-xl border-2 border-dashed px-6 py-10 text-center transition ${
                    dragOver ? 'border-violet-400 bg-violet-50/40' : 'border-gray-200 bg-gray-50/30'
                  }`}
                  onDragOver={(e) => {
                    e.preventDefault()
                    setDragOver(true)
                  }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={(e) => {
                    e.preventDefault()
                    setDragOver(false)
                    const f = e.dataTransfer.files[0]
                    if (f) void handleUpload(f)
                  }}
                >
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-violet-100 text-violet-600">
                    <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                      <line x1="12" y1="18" x2="12" y2="12" />
                      <line x1="9" y1="15" x2="15" y2="15" />
                    </svg>
                  </div>
                  <p className="mt-4 text-sm text-gray-600">
                    Drag &amp; drop PDF këtu{' '}
                    <span className="text-gray-400">ose</span>
                  </p>
                  <button
                    type="button"
                    disabled={uploadBusy}
                    className={`${customerBtnPrimary} mt-3 px-5 py-2 text-sm`}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {uploadBusy ? 'Duke ngarkuar…' : 'Zgjidh PDF'}
                  </button>
                  <p className="mt-3 text-xs text-gray-400">Vetëm PDF · Max 10MB</p>
                </div>
              ) : null}

              <div>
                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Dokumente të ngarkuara
                </p>

                {detail.contract ? (
                  <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-red-50 text-red-500">
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                      </svg>
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-gray-900">{detail.contract.filename}</p>
                      <p className="mt-0.5 text-xs text-gray-500">
                        {formatDt(detail.contract.uploadedAtUtc)}
                        {detail.contract.uploadedByName ? (
                          <>
                            <span className="mx-1 text-gray-300">·</span>
                            {detail.contract.uploadedByName}
                          </>
                        ) : null}
                        <span className="mx-1 text-gray-300">·</span>
                        {formatBytes(detail.contract.fileSize)}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col gap-1">
                      <button
                        type="button"
                        title="Shiko"
                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-500 transition hover:border-violet-200 hover:bg-violet-50 hover:text-violet-700"
                        onClick={() => void openContract(true)}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        title="Shkarko"
                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-500 transition hover:border-violet-200 hover:bg-violet-50 hover:text-violet-700"
                        onClick={() => void openContract(false)}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                          <polyline points="7 10 12 15 17 10" />
                          <line x1="12" y1="15" x2="12" y2="3" />
                        </svg>
                      </button>
                      {canAct ? (
                        <button
                          type="button"
                          title="Zëvendëso"
                          disabled={uploadBusy}
                          className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-500 transition hover:border-violet-200 hover:bg-violet-50 hover:text-violet-700 disabled:opacity-40"
                          onClick={() => fileInputRef.current?.click()}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                            <polyline points="23 4 23 10 17 10" />
                            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
                          </svg>
                        </button>
                      ) : null}
                    </div>
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50/50 px-4 py-8 text-center">
                    <p className="text-sm text-gray-500">Ende nuk është ngarkuar kontrata.</p>
                  </div>
                )}
              </div>

              {canAct ? (
                <div className="flex gap-2.5 rounded-lg border border-sky-200 bg-sky-50 px-3.5 py-3">
                  <span className="mt-0.5 shrink-0 text-sky-600" aria-hidden>
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="16" x2="12" y2="12" />
                      <line x1="12" y1="8" x2="12.01" y2="8" />
                    </svg>
                  </span>
                  <p className="text-xs leading-relaxed text-sky-900">
                    Kontrata është e detyrueshme para miratimit të aplikimit.
                  </p>
                </div>
              ) : null}
            </div>
          ) : null}

          {!loading && tab === 'history' && detail ? (
            <ul className="space-y-0">
              {[...detail.history].reverse().map((h, i) => (
                <li key={`${h.eventType}-${h.createdAtUtc}-${i}`} className="relative flex gap-3 pb-6 last:pb-0">
                  <span className="relative z-10 mt-1 flex h-2.5 w-2.5 shrink-0 rounded-full bg-violet-500 ring-4 ring-violet-100" />
                  {i < detail.history.length - 1 ? (
                    <span className="absolute left-[4px] top-3 h-full w-px bg-gray-200" aria-hidden />
                  ) : null}
                  <div>
                    <p className="text-sm font-medium text-gray-900">{partnerAuditEventLabel(h.eventType)}</p>
                    {h.detail ? <p className="mt-0.5 text-xs text-gray-600">{h.detail}</p> : null}
                    <p className="mt-1 text-[11px] text-gray-400">
                      {formatDt(h.createdAtUtc)}
                      {h.actorName ? ` · ${h.actorName}` : ''}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        <footer className="shrink-0 space-y-2 border-t border-gray-100 px-5 py-4">
          {canAct && !hasContract ? (
            <p className="text-xs text-amber-700">Ngarko kontratën PDF para miratimit.</p>
          ) : null}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              {canMarkContacted ? (
                <button
                  type="button"
                  disabled={contactBusy || busy}
                  className={customerBtnGhost + ' text-sm'}
                  onClick={() => void onMarkContacted()}
                >
                  {contactBusy ? '…' : 'Shëno kontaktuar'}
                </button>
              ) : null}
            </div>
            <div className="flex flex-wrap gap-2">
              {canAct ? (
                <>
                  <button
                    type="button"
                    className="rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50"
                    disabled={busy}
                    onClick={() => onReject(row)}
                  >
                    Refuzo
                  </button>
                  <button
                    type="button"
                    className={`${customerBtnPrimary} disabled:opacity-50`}
                    disabled={busy || !hasContract}
                    title={!hasContract ? 'Ngarko kontratën para miratimit' : undefined}
                    onClick={() => onApprove(row)}
                  >
                    Mirato partnerin
                  </button>
                </>
              ) : null}
            </div>
          </div>
        </footer>
      </aside>
    </div>
  )

  return createPortal(panel, document.body)
}
