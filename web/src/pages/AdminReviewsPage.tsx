import { useCallback, useEffect, useState } from 'react'
import { adminDeleteReview, fetchAdminReviews, type AdminReviewListResult } from '../lib/adminApi'
import { customerBtnGhost, customerCardMuted } from '../lib/customerTheme'
import { useAuthStore } from '../store/authStore'

const SUB_SQ: Record<number, string> = {
  0: 'Restorant',
  1: 'Deliver',
}

export default function AdminReviewsPage() {
  const token = useAuthStore((s) => s.token)
  const [page, setPage] = useState(1)
  const [data, setData] = useState<AdminReviewListResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<number | null>(null)

  const load = useCallback(async () => {
    if (!token) return
    setError(null)
    const d = await fetchAdminReviews(token, { page, pageSize: 15 })
    setData(d)
  }, [token, page])

  useEffect(() => {
    if (!token) {
      setLoading(false)
      return
    }
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

  async function del(id: number) {
    if (!token || !window.confirm('Fshi vlerësimin?')) return
    setBusyId(id)
    setMsg(null)
    const r = await adminDeleteReview(token, id)
    setBusyId(null)
    if (!r.ok) setMsg(r.message)
    else void load()
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-100">Vlerësime</h1>
        <p className="mt-1 text-sm text-zinc-400">Moderim — fshirja është e përhershme.</p>
      </div>

      {msg ? <p className="text-sm text-amber-200">{msg}</p> : null}
      {error ? <p className="text-sm text-red-300">{error}</p> : null}
      {loading ? <p className="text-sm text-zinc-500">Duke ngarkuar…</p> : null}

      {data && !loading ? (
        <div className="space-y-3">
          {data.items.map((r) => (
            <div key={r.id} className={`${customerCardMuted} p-4`}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-zinc-100">
                    {r.rating}★ · {SUB_SQ[r.subject] ?? `Subj. ${r.subject}`}
                  </p>
                  <p className="text-xs text-zinc-500">
                    Porosia {r.orderNumber} · {r.authorEmail}
                    {r.restaurantName ? ` · ${r.restaurantName}` : ''}
                  </p>
                  {r.comment ? <p className="mt-2 text-sm text-zinc-300">{r.comment}</p> : null}
                </div>
                <button
                  type="button"
                  disabled={busyId === r.id}
                  className={customerBtnGhost}
                  onClick={() => void del(r.id)}
                >
                  Fshi
                </button>
              </div>
            </div>
          ))}
          <div className="flex justify-between text-sm text-zinc-400">
            <span>
              {data.total} vlerësime · faqja {data.page}
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                className={customerBtnGhost}
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                ←
              </button>
              <button
                type="button"
                className={customerBtnGhost}
                disabled={page * data.pageSize >= data.total}
                onClick={() => setPage((p) => p + 1)}
              >
                →
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
