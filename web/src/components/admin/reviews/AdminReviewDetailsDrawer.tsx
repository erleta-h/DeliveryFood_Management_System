import { useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import {
  adminDeleteReview,
  adminSetReviewStatus,
  REVIEW_STATUS_HIDDEN,
  REVIEW_STATUS_PUBLIC,
  REVIEW_SUBJECT_DRIVER,
  type AdminReviewRow,
} from '../../../lib/adminApi'
import {
  canHideReview,
  canRestoreReview,
  formatReviewId,
  reviewStatusBadge,
  reviewStatusLabel,
  reviewSubjectLabel,
  reviewTargetLabel,
  StarRating,
} from '../../../lib/adminReviewStatus'
import { customerBtnGhost } from '../../../lib/adminTheme'
import { useAuthStore } from '../../../store/authStore'

type Props = {
  row: AdminReviewRow
  onClose: () => void
  onUpdated: () => void
  onMessage: (msg: string | null) => void
}

function formatDateTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString('sq-AL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return iso
  }
}

function RowIcon({ children }: { children: ReactNode }) {
  return (
    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-500">
      {children}
    </span>
  )
}

function InfoRow({
  icon,
  label,
  value,
  valueNode,
}: {
  icon: ReactNode
  label: string
  value?: string
  valueNode?: ReactNode
}) {
  return (
    <div className="flex items-center gap-3 py-2.5">
      <RowIcon>{icon}</RowIcon>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-gray-500">{label}</p>
        <div className="text-sm font-semibold text-gray-900">{valueNode ?? value}</div>
      </div>
    </div>
  )
}

export function AdminReviewDetailsDrawer({ row, onClose, onUpdated, onMessage }: Props) {
  const token = useAuthStore((s) => s.token)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  async function hideReview() {
    if (!token) return
    if (!window.confirm('Fsheh këtë vlerësim? Nuk do të shfaqet publikisht.')) return
    setBusy(true)
    setMsg(null)
    onMessage(null)
    const r = await adminSetReviewStatus(token, row.id, REVIEW_STATUS_HIDDEN)
    setBusy(false)
    if (!r.ok) {
      setMsg(r.message)
      return
    }
    onMessage('Vlerësimi u fsheh.')
    onUpdated()
    onClose()
  }

  async function restoreReview() {
    if (!token) return
    setBusy(true)
    setMsg(null)
    onMessage(null)
    const r = await adminSetReviewStatus(token, row.id, REVIEW_STATUS_PUBLIC)
    setBusy(false)
    if (!r.ok) {
      setMsg(r.message)
      return
    }
    onMessage('Vlerësimi u bë publik.')
    onUpdated()
    onClose()
  }

  async function deleteReview() {
    if (!token) return
    if (!window.confirm('Fshi përgjithmonë këtë vlerësim? Ky veprim nuk kthehet mbrapsht.')) return
    setBusy(true)
    setMsg(null)
    onMessage(null)
    const r = await adminDeleteReview(token, row.id)
    setBusy(false)
    if (!r.ok) {
      setMsg(r.message)
      return
    }
    onMessage('Vlerësimi u fshi përgjithmonë.')
    onUpdated()
    onClose()
  }

  const panel = (
    <div className="fixed inset-0 z-[70] flex justify-end bg-black/35" role="presentation" onClick={onClose}>
      <aside
        className="flex h-full w-full max-w-md flex-col bg-white shadow-2xl"
        role="dialog"
        aria-label="Detajet e vlerësimit"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="border-b border-gray-100 px-6 py-5">
          <div className="flex items-start justify-between gap-4">
            <h2 className="text-lg font-bold text-gray-900">Detajet e vlerësimit</h2>
            <button
              type="button"
              className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
              onClick={onClose}
              aria-label="Mbyll"
            >
              ✕
            </button>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <StarRating rating={row.rating} />
            <span className={reviewStatusBadge(row.status)}>{reviewStatusLabel(row.status)}</span>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-2">
          {msg ? (
            <div className="mb-4 rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 text-sm text-violet-900">
              {msg}
            </div>
          ) : null}

          <div className="divide-y divide-gray-100">
            <InfoRow
              icon={
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                  <path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z" />
                </svg>
              }
              label="Subjekti"
              value={reviewSubjectLabel(row.subject)}
            />
            <InfoRow
              icon={
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                  <path d="M3 9l9-6 9 6v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z" />
                  <path d="M9 21V12h6v9" />
                </svg>
              }
              label={row.subject === REVIEW_SUBJECT_DRIVER ? 'Deliveri' : 'Restoranti'}
              value={reviewTargetLabel(row)}
            />
            <InfoRow
              icon={
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                  <circle cx="12" cy="8" r="4" />
                  <path d="M4 20c1.5-4 6-6 8-6s6.5 2 8 6" />
                </svg>
              }
              label="Klienti"
              value={row.authorEmail}
            />
            <InfoRow
              icon={
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <path d="M14 2v6h6M8 13h8M8 17h8" />
                </svg>
              }
              label="Porosia"
              value={row.orderNumber}
            />
            <InfoRow
              icon={
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                  <rect x="3" y="4" width="18" height="18" rx="2" />
                  <path d="M16 2v4M8 2v4M3 10h18" />
                </svg>
              }
              label="Data"
              value={formatDateTime(row.createdAt)}
            />
          </div>

          <section className="mt-5 rounded-xl border border-gray-100 bg-gray-50/80 p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z" />
              </svg>
              Komenti
            </div>
            <p className="mt-3 text-sm leading-relaxed text-gray-700">
              {row.comment?.trim()
                ? row.comment.trim()
                : 'Pa koment — klienti nuk la tekst.'}
            </p>
          </section>

          <div className="mt-6 border-t border-gray-100 pt-4">
            <dl className="space-y-3 text-sm">
              <div className="flex items-center justify-between gap-3">
                <dt className="text-gray-500">ID e vlerësimit</dt>
                <dd className="font-mono text-xs font-medium text-gray-800">{formatReviewId(row.id)}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-gray-500">Statusi aktual</dt>
                <dd>
                  <span className={reviewStatusBadge(row.status)}>{reviewStatusLabel(row.status)}</span>
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-gray-500">Raportime</dt>
                <dd className="font-semibold text-gray-900">{row.reportCount}</dd>
              </div>
            </dl>
          </div>
        </div>

        <footer className="border-t border-gray-100 px-6 py-5">
          <div className="flex flex-col gap-2.5">
            {canHideReview(row.status) ? (
              <button
                type="button"
                disabled={busy}
                className="w-full rounded-xl bg-orange-500 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-orange-600 disabled:opacity-40"
                onClick={() => void hideReview()}
              >
                Fsheh vlerësimin
              </button>
            ) : null}
            {canRestoreReview(row.status) ? (
              <button
                type="button"
                disabled={busy}
                className="w-full rounded-xl bg-violet-600 px-4 py-3 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-40"
                onClick={() => void restoreReview()}
              >
                Vendos publik
              </button>
            ) : null}
            <button
              type="button"
              disabled={busy}
              className="w-full rounded-xl border-2 border-red-200 bg-white px-4 py-3 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-40"
              onClick={() => void deleteReview()}
            >
              Fshi përgjithmonë
            </button>
            <button type="button" className={customerBtnGhost + ' w-full py-3'} onClick={onClose}>
              Mbyll
            </button>
          </div>
        </footer>
      </aside>
    </div>
  )

  return createPortal(panel, document.body)
}
