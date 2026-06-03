import type { FormEvent } from 'react'
import { SupportAttachmentList } from '../../support/SupportAttachmentImage'
import { SupportPhotoPicker } from '../../support/SupportPhotoPicker'
import {
  CATEGORY_LABELS,
  PRIORITY_LABELS,
  STATUS_LABELS,
  type SupportTicketThread,
} from '../../../lib/supportApi'

const fieldClass =
  'w-full rounded-lg border border-[#30363d] bg-[#0d1117] px-3 py-2.5 text-sm text-white outline-none focus:border-violet-500/50'

export function formatKitchenTicketId(id: number): string {
  return `TKT-${String(id).padStart(5, '0')}`
}

type Props = {
  token: string
  thread: SupportTicketThread | null
  loading: boolean
  busy: boolean
  replyDraft: string
  replyPhotos: File[]
  onReplyPhotosChange: (files: File[]) => void
  onReplyDraftChange: (v: string) => void
  onClose: () => void
  onSendReply: (e: FormEvent) => void
}

export function KitchenSupportThreadPanel({
  token,
  thread,
  loading,
  busy,
  replyDraft,
  replyPhotos,
  onReplyPhotosChange,
  onReplyDraftChange,
  onClose,
  onSendReply,
}: Props) {
  return (
    <div className="fixed inset-0 z-[85] flex justify-end bg-black/55 lg:bg-black/40" role="presentation">
      <button type="button" className="absolute inset-0" aria-label="Mbyll" onClick={onClose} />
      <aside
        role="dialog"
        aria-modal
        className="relative flex h-full w-full max-w-lg flex-col border-l border-[#30363d] bg-[#161b22] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex shrink-0 items-center justify-between border-b border-[#30363d] px-5 py-4">
          <div className="min-w-0">
            <p className="truncate text-base font-bold text-white">
              {thread ? thread.subject : 'Detajet e tiketës'}
            </p>
            {thread ? (
              <p className="text-xs text-zinc-500">{formatKitchenTicketId(thread.id)}</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-md text-xl text-zinc-500 hover:bg-[#21262d] hover:text-white"
            aria-label="Mbyll"
          >
            ×
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {loading ? (
            <p className="text-sm text-zinc-500">Duke ngarkuar bisedën…</p>
          ) : !thread ? (
            <p className="text-sm text-zinc-500">Tiketa nuk u gjet.</p>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2 text-xs text-zinc-500">
                <span>{STATUS_LABELS[thread.status] ?? thread.status}</span>
                <span>·</span>
                <span>{CATEGORY_LABELS[thread.category] ?? 'Tjetër'}</span>
                <span>·</span>
                <span>{PRIORITY_LABELS[thread.priority] ?? thread.priority}</span>
              </div>
              {thread.orderNumber ? (
                <p className="text-sm text-zinc-400">
                  Porosia: <span className="font-mono text-zinc-200">{thread.orderNumber}</span>
                </p>
              ) : null}
              <div className="rounded-xl border border-violet-500/25 bg-violet-950/20 p-3">
                <p className="text-[10px] font-bold uppercase tracking-wide text-violet-300/80">
                  Mesazhi fillestar
                </p>
                <p className="mt-1 whitespace-pre-wrap text-sm text-zinc-200">{thread.initialBody}</p>
                <SupportAttachmentList
                  token={token}
                  ticketId={thread.id}
                  attachments={thread.initialAttachments}
                />
              </div>
              {thread.messages.map((m) => (
                <div
                  key={m.id}
                  className={`rounded-xl border p-3 ${
                    m.isStaffReply
                      ? 'border-violet-500/30 bg-violet-950/25'
                      : 'border-[#30363d] bg-[#0d1117]'
                  }`}
                >
                  <p className="text-xs text-zinc-500">
                    {m.isStaffReply ? 'Support' : 'Ti'} · {m.authorEmail} ·{' '}
                    {new Date(m.createdAtUtc).toLocaleString('sq-AL')}
                  </p>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-zinc-200">{m.body}</p>
                  <SupportAttachmentList
                    token={token}
                    ticketId={thread.id}
                    attachments={m.attachments}
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {thread && thread.status !== 3 ? (
          <footer className="shrink-0 border-t border-[#30363d] px-5 py-4">
            <form onSubmit={onSendReply} className="space-y-2">
              <label className="block text-xs text-zinc-500">
                Shto përgjigje
                <textarea
                  value={replyDraft}
                  onChange={(e) => onReplyDraftChange(e.target.value)}
                  required
                  minLength={1}
                  maxLength={4000}
                  rows={3}
                  disabled={busy}
                  className={`${fieldClass} mt-1.5`}
                />
              </label>
              <SupportPhotoPicker
                files={replyPhotos}
                onChange={onReplyPhotosChange}
                disabled={busy}
              />
              <button
                type="submit"
                disabled={busy || !replyDraft.trim()}
                className="w-full rounded-lg bg-violet-600 py-2.5 text-sm font-semibold text-white hover:bg-violet-500 disabled:opacity-45"
              >
                {busy ? 'Duke dërguar…' : 'Dërgo'}
              </button>
            </form>
          </footer>
        ) : thread ? (
          <footer className="shrink-0 border-t border-[#30363d] px-5 py-4">
            <p className="text-sm text-zinc-500">Tiketa është e mbyllur.</p>
          </footer>
        ) : null}
      </aside>
    </div>
  )
}
