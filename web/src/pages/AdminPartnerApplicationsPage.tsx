import { useCallback, useEffect, useState } from 'react'
import {
  approvePartnerApplication,
  fetchPartnerApplications,
  rejectPartnerApplication,
  resetPartnerStaffPassword,
  type ApprovePartnerResult,
  type PartnerApplicationRow,
  type ResetPartnerStaffPasswordResult,
} from '../lib/adminApi'
import {
  customerBtnGhost,
  customerBtnPrimary,
  customerCard,
  customerCardMuted,
  customerPanelSubtitle,
} from '../lib/customerTheme'
import { useAuthStore } from '../store/authStore'

const S_PENDING = 0
const S_CONTACTED = 1
const S_APPROVED = 2
const S_REJECTED = 9

function statusLabel(s: number): string {
  switch (s) {
    case S_PENDING:
      return 'Në pritje'
    case S_CONTACTED:
      return 'Kontaktuar'
    case S_APPROVED:
      return 'Miratuar'
    case S_REJECTED:
      return 'Refuzuar'
    default:
      return `Status ${s}`
  }
}

export default function AdminPartnerApplicationsPage() {
  const token = useAuthStore((s) => s.token)
  const [rows, setRows] = useState<PartnerApplicationRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<number | null>(null)
  const [actionMsg, setActionMsg] = useState<string | null>(null)
  const [lastApprove, setLastApprove] = useState<ApprovePartnerResult | null>(null)
  const [lastReset, setLastReset] = useState<ResetPartnerStaffPasswordResult | null>(null)
  const [resetPwDraft, setResetPwDraft] = useState<Record<number, string>>({})
  /** Panel i rivendosjes i hapur vetëm për rast mbështetjeje (harresë fjalëkalimi). */
  const [resetPanelOpen, setResetPanelOpen] = useState<Record<number, boolean>>({})
  const [resetAcknowledged, setResetAcknowledged] = useState<Record<number, boolean>>({})

  const load = useCallback(async () => {
    if (!token) return
    setError(null)
    const list = await fetchPartnerApplications(token)
    setRows(list)
  }, [token])

  useEffect(() => {
    if (!token) return
    let c = false
    setLoading(true)
    void load()
      .catch((e: unknown) => {
        if (!c) setError(e instanceof Error ? e.message : 'Gabim.')
      })
      .finally(() => {
        if (!c) setLoading(false)
      })
    return () => {
      c = true
    }
  }, [token, load])

  async function onApprove(id: number) {
    if (!token) return
    setActionMsg(null)
    setLastApprove(null)
    setLastReset(null)
    setBusyId(id)
    const r = await approvePartnerApplication(token, id)
    setBusyId(null)
    if (r.ok) {
      setLastApprove(r.data)
      setActionMsg(
        `U krijua restoranti «${r.data.restaurantName}». Dërgo partnerit kredencialet një herë në mënyrë të sigurt. Rivendosja bëhet vetëm nëse partneri e humb aksesin dhe e kërkon zyrtarisht.`,
      )
      await load()
    } else setActionMsg(r.message)
  }

  async function onResetStaffPassword(id: number) {
    if (!token) return
    setActionMsg(null)
    setLastApprove(null)
    setLastReset(null)
    setBusyId(id)
    const custom = resetPwDraft[id]?.trim()
    const r = await resetPartnerStaffPassword(token, id, custom ? custom : null)
    setBusyId(null)
    if (r.ok) {
      setLastReset(r.data)
      setResetPwDraft((d) => {
        const next = { ...d }
        delete next[id]
        return next
      })
      setResetPanelOpen((p) => {
        const next = { ...p }
        delete next[id]
        return next
      })
      setResetAcknowledged((a) => {
        const next = { ...a }
        delete next[id]
        return next
      })
      setActionMsg(
        'Fjalëkalimi u rivendos (rast mbështetjeje). Dërgo vlerën e kopjuar partnerit në mënyrë të sigurt. Të gjitha sesionet e vjetra u anuluan.',
      )
    } else setActionMsg(r.message)
  }

  async function onReject(id: number) {
    if (!token) return
    if (!window.confirm('Të refuzohet ky aplikim?')) return
    setActionMsg(null)
    setBusyId(id)
    const r = await rejectPartnerApplication(token, id)
    setBusyId(null)
    if (r.ok) {
      setActionMsg('Aplikimi u shënua si refuzuar.')
      await load()
    } else setActionMsg(r.message)
  }

  return (
    <div className="space-y-6">
      <section className={customerCard}>
        <h1 className="text-2xl font-bold text-zinc-100">Aplikimet e partnerëve</h1>
        <p className={customerPanelSubtitle}>
          Pas kontratës fizike / juridike, kliko <strong className="text-zinc-300">Mirato</strong> për të
          krijuar restorantin, përdoruesin me rol <code className="rounded bg-white/5 px-1">RestaurantStaff</code>,
          menunë minimale demo dhe fjalëkalim të përkohshëm — dërgoje partnerit vetëm përmes kanalit të sigurt.
          Rivendosja e fjalëkalimit nga admin është{' '}
          <strong className="text-zinc-300">veprim mbështetjeje</strong>: përdore vetëm kur restoranti nuk mund të
          kyçet dhe e konfirmon se e ka harruar fjalëkalimin; të gjitha sesionet ekzistuese çaktivizohen.
        </p>
      </section>

      {loading ? <p className="text-sm text-zinc-500">Duke ngarkuar…</p> : null}
      {error ? (
        <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          {error}
        </p>
      ) : null}
      {actionMsg ? (
        <p className="rounded-lg border border-violet-500/30 bg-violet-500/10 px-3 py-2 text-sm text-violet-100">
          {actionMsg}
        </p>
      ) : null}
      {lastApprove ? (
        <div
          className={`${customerCardMuted} space-y-2 border border-emerald-500/25 font-mono text-sm text-zinc-200`}
        >
          <p className="text-xs font-sans uppercase tracking-wide text-emerald-400/90">
            Të dhënat për partnerin (kopjo një herë)
          </p>
          <p>
            <span className="text-zinc-500">Email:</span> {lastApprove.staffEmail}
          </p>
          <p>
            <span className="text-zinc-500">Fjalëkalim i përkohshëm:</span> {lastApprove.temporaryPassword}
          </p>
          <p>
            <span className="text-zinc-500">Restoranti:</span> {lastApprove.restaurantName} (slug:{' '}
            {lastApprove.restaurantSlug})
          </p>
        </div>
      ) : null}
      {lastReset ? (
        <div
          className={`${customerCardMuted} space-y-2 border border-sky-500/25 font-mono text-sm text-zinc-200`}
        >
          <p className="text-xs font-sans uppercase tracking-wide text-sky-400/90">
            Fjalëkalimi i ri (kopjo dhe dërgo te partneri)
          </p>
          <p>
            <span className="text-zinc-500">Email:</span> {lastReset.staffEmail}
          </p>
          <p>
            <span className="text-zinc-500">Fjalëkalim:</span> {lastReset.newPassword}
          </p>
        </div>
      ) : null}

      {!loading && !error && rows.length === 0 ? (
        <p className="text-sm text-zinc-500">Nuk ka aplikime ende.</p>
      ) : null}

      <ul className="space-y-3">
        {rows.map((r) => {
          const canAct = r.status !== S_APPROVED && r.status !== S_REJECTED
          const busy = busyId === r.id
          return (
            <li key={r.id} className={customerCardMuted}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-zinc-100">{r.venueName}</p>
                  <p className="text-xs text-zinc-500">
                    {r.city} · {r.contactFirstName} {r.contactLastName} · {r.email}
                  </p>
                  <p className="mt-1 text-xs text-zinc-400">
                    {new Date(r.createdAtUtc).toLocaleString('sq-AL')} ·{' '}
                    <span className="text-amber-200/90">{statusLabel(r.status)}</span>
                  </p>
                </div>
                {canAct ? (
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => onApprove(r.id)}
                      className={`${customerBtnPrimary} px-3 py-1.5 text-xs`}
                    >
                      {busy ? '…' : 'Mirato'}
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => onReject(r.id)}
                      className={`${customerBtnGhost} px-3 py-1.5 text-xs text-red-200 hover:border-red-400/30`}
                    >
                      Refuzo
                    </button>
                  </div>
                ) : null}
              </div>
              {r.status === S_APPROVED ? (
                <div className="mt-3 border-t border-white/[0.06] pt-3">
                  {!resetPanelOpen[r.id] ? (
                    <button
                      type="button"
                      onClick={() =>
                        setResetPanelOpen((p) => ({
                          ...p,
                          [r.id]: true,
                        }))
                      }
                      className={`${customerBtnGhost} flex w-full items-center justify-center px-3 py-2 text-xs text-zinc-400 hover:text-amber-100/95 sm:inline-flex sm:w-auto sm:justify-start`}
                    >
                      Mbështetje: partneri nuk mund të kyçet (harresë fjalëkalimi)…
                    </button>
                  ) : (
                    <div className="rounded-lg border border-amber-500/20 bg-amber-500/[0.06] p-3 sm:p-4">
                      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-amber-200/90">
                            Rivendosje për humbje aksesi
                          </p>
                          <p className="mt-1 max-w-prose text-xs leading-relaxed text-zinc-400">
                            Përdore kur ka kërkesë të dokumentuar nga restoranti (email, tiketë ose telefonatë) dhe
                            nuk ka rrugë tjetër të sigurt. Pas rivendosjes, partneri duhet të marrë fjalëkalimin e ri
                            përmes jush — mos e lër në chat publik.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setResetPanelOpen((p) => {
                              const next = { ...p }
                              delete next[r.id]
                              return next
                            })
                            setResetAcknowledged((a) => {
                              const next = { ...a }
                              delete next[r.id]
                              return next
                            })
                          }}
                          className={`${customerBtnGhost} shrink-0 px-2 py-1 text-[11px] text-zinc-500`}
                        >
                          Mbyll
                        </button>
                      </div>
                      <label className="flex cursor-pointer items-start gap-2 rounded-md border border-white/[0.06] bg-black/15 px-3 py-2.5">
                        <input
                          type="checkbox"
                          className="mt-0.5 h-3.5 w-3.5 shrink-0 rounded border-zinc-600 text-amber-500 focus:ring-amber-500/40"
                          checked={resetAcknowledged[r.id] ?? false}
                          onChange={(e) =>
                            setResetAcknowledged((a) => ({
                              ...a,
                              [r.id]: e.target.checked,
                            }))
                          }
                        />
                        <span className="text-xs text-zinc-300">
                          Konfirmoj se restoranti ka kërkuar rivendosje sepse{' '}
                          <strong className="font-medium text-zinc-200">nuk arrin të kyçet</strong> (harresë ose
                          problem aksesi), jo për preferencë të përgjithshme.
                        </span>
                      </label>
                      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end">
                        <div className="min-w-0 flex-1">
                          <label
                            htmlFor={`rpw-${r.id}`}
                            className="mb-0.5 block text-[10px] font-medium uppercase tracking-wide text-zinc-500"
                          >
                            Fjalëkalim i ri (opsional — bosh = gjenero automatikisht)
                          </label>
                          <input
                            id={`rpw-${r.id}`}
                            type="password"
                            autoComplete="new-password"
                            value={resetPwDraft[r.id] ?? ''}
                            onChange={(e) =>
                              setResetPwDraft((d) => ({
                                ...d,
                                [r.id]: e.target.value,
                              }))
                            }
                            disabled={!resetAcknowledged[r.id]}
                            className="w-full rounded-lg border border-white/10 bg-zinc-900/80 px-3 py-2 text-sm text-zinc-100 disabled:cursor-not-allowed disabled:opacity-45"
                            placeholder="Min. 6 karaktere ose bosh"
                          />
                        </div>
                        <button
                          type="button"
                          disabled={busy || !resetAcknowledged[r.id]}
                          onClick={() => void onResetStaffPassword(r.id)}
                          className={`${customerBtnGhost} shrink-0 px-3 py-2 text-xs text-amber-100 hover:border-amber-400/35 disabled:opacity-40`}
                        >
                          {busy ? '…' : 'Rivendos dhe shfaq fjalëkalimin'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : null}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
