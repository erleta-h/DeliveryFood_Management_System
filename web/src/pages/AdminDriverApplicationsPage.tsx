import { useCallback, useEffect, useState } from 'react'
import {
  approveDriverApplication,
  fetchDriverApplications,
  rejectDriverApplication,
  type ApproveDriverResult,
  type DriverApplicationRow,
} from '../lib/adminApi'
import {
  customerBtnGhost,
  customerBtnPrimary,
  customerCard,
  customerPanelSubtitle,
} from '../lib/customerTheme'
import { useAuthStore } from '../store/authStore'

const S_PENDING = 0
const S_APPROVED = 2
const S_REJECTED = 9

function statusLabel(s: number): string {
  switch (s) {
    case S_PENDING:
      return 'Në pritje'
    case S_APPROVED:
      return 'Miratuar'
    case S_REJECTED:
      return 'Refuzuar'
    default:
      return `Status ${s}`
  }
}

export default function AdminDriverApplicationsPage() {
  const token = useAuthStore((s) => s.token)
  const [rows, setRows] = useState<DriverApplicationRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<number | null>(null)
  const [actionMsg, setActionMsg] = useState<string | null>(null)
  const [lastApprove, setLastApprove] = useState<ApproveDriverResult | null>(null)

  const load = useCallback(async () => {
    if (!token) return
    setError(null)
    const list = await fetchDriverApplications(token)
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
    setBusyId(id)
    const r = await approveDriverApplication(token, id)
    setBusyId(null)
    if (r.ok) {
      setLastApprove(r.data)
      setActionMsg(
        `U krijua llogaria për ${r.data.email}. Dërgo fjalëkalimin një herë në mënyrë të sigurt — nuk ruhet në sistem pas këtij ekrani.`,
      )
      await load()
    } else setActionMsg(r.message)
  }

  async function onReject(id: number) {
    if (!token) return
    setActionMsg(null)
    setLastApprove(null)
    setBusyId(id)
    const r = await rejectDriverApplication(token, id)
    setBusyId(null)
    if (r.ok) {
      setActionMsg('Aplikimi u shënua si refuzuar.')
      await load()
    } else setActionMsg(r.message)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-100">Aplikimet Deliver</h1>
        <p className={customerPanelSubtitle}>Miratimi krijon përdorues me rol Driver dhe profil mjeti.</p>
      </div>

      {loading ? <p className="text-sm text-zinc-500">Duke ngarkuar…</p> : null}
      {error ? <p className="text-sm text-red-300">{error}</p> : null}
      {actionMsg ? (
        <div className="rounded-lg border border-violet-500/25 bg-violet-500/10 px-3 py-2 text-sm text-violet-100">
          {actionMsg}
        </div>
      ) : null}
      {lastApprove ? (
        <div className={`${customerCard} border-emerald-500/25 bg-emerald-500/5`}>
          <p className="text-xs font-semibold uppercase text-emerald-400/90">Kredencialet (kopjo tani)</p>
          <p className="mt-2 font-mono text-sm text-zinc-200">
            Email: {lastApprove.email}
            <br />
            Fjalëkalim: {lastApprove.temporaryPassword}
          </p>
        </div>
      ) : null}

      <ul className="space-y-3">
        {rows.map((a) => (
          <li key={a.id} className={`${customerCard} border-white/[0.06]`}>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-medium text-zinc-100">
                  {a.firstName} {a.lastName}
                </p>
                <p className="text-xs text-zinc-500">{a.email}</p>
                <p className="mt-1 text-xs text-zinc-400">
                  {a.vehicleType}
                  {a.licensePlate ? ` · ${a.licensePlate}` : ''} · {a.phone}
                </p>
              </div>
              <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs text-zinc-300">
                {statusLabel(a.status)}
              </span>
            </div>
            <div className="mt-3 flex flex-wrap gap-2 border-t border-white/[0.06] pt-3">
              {a.status === S_PENDING ? (
                <>
                  <button
                    type="button"
                    disabled={busyId === a.id}
                    className={customerBtnPrimary + ' px-3 py-1.5 text-xs'}
                    onClick={() => void onApprove(a.id)}
                  >
                    Mirato
                  </button>
                  <button
                    type="button"
                    disabled={busyId === a.id}
                    className={customerBtnGhost + ' border-red-400/30 px-3 py-1.5 text-xs text-red-200'}
                    onClick={() => void onReject(a.id)}
                  >
                    Refuzo
                  </button>
                </>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
