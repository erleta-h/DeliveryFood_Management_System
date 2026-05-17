import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchKitchenOrderHistory, type KitchenOrder } from '../lib/kitchenApi'
import { formatOrderStatus } from '../lib/orderStatusLabels'
import { useAuthStore } from '../store/authStore'

const S = { Cancelled: 9 } as const

export default function KitchenHistoryPage() {
  const token = useAuthStore((s) => s.token)
  const [page, setPage] = useState(1)
  const pageSize = 20
  const [data, setData] = useState<{
    items: KitchenOrder[]
    totalCount: number
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!token) return
    setError(null)
    const r = await fetchKitchenOrderHistory(token, page, pageSize)
    setData({ items: r.items, totalCount: r.totalCount })
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

  const totalPages = data ? Math.max(1, Math.ceil(data.totalCount / pageSize)) : 1

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-white sm:text-2xl">Historiku i porosive</h1>
          <p className="mt-0.5 text-[13px] text-zinc-500">Të përfunduara dhe të anuluara · faqezim</p>
        </div>
        <Link
          to="/kitchen/orders"
          className="rounded-xl border border-white/[0.1] bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-zinc-200 transition hover:bg-white/[0.08]"
        >
          ← Porosi aktive
        </Link>
      </div>

      {error ? (
        <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">{error}</p>
      ) : null}

      {loading ? (
        <p className="text-sm text-zinc-500">Duke ngarkuar…</p>
      ) : data && data.items.length === 0 ? (
        <p className="text-sm text-zinc-500">Nuk ka rreshta në historik.</p>
      ) : data ? (
        <>
          <div className="overflow-x-auto rounded-2xl border border-white/[0.06] bg-[#14161c]">
            <table className="w-full min-w-[520px] text-left text-sm">
              <thead>
                <tr className="border-b border-white/[0.06] text-[11px] font-bold uppercase tracking-[0.12em] text-zinc-500">
                  <th className="px-3 py-2.5">Porosi</th>
                  <th className="px-3 py-2.5">Data</th>
                  <th className="px-3 py-2.5">Statusi</th>
                  <th className="px-3 py-2.5 text-right">Totali</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((o) => (
                  <tr key={o.id} className="border-b border-white/[0.04] text-zinc-300 last:border-0">
                    <td className="px-3 py-2.5 font-medium tabular-nums text-zinc-100">{o.orderNumber}</td>
                    <td className="px-3 py-2.5 text-xs text-zinc-500">
                      {new Date(o.placedAtUtc).toLocaleString('sq-AL', {
                        day: '2-digit',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="px-3 py-2.5 text-xs">
                      {o.status === S.Cancelled ? (
                        <span className="text-red-400/90">Anuluar</span>
                      ) : (
                        <span className="text-[#3ddc84]/90">{formatOrderStatus(o.status)}</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-right font-medium tabular-nums text-white">
                      {o.total.toFixed(2)} €
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-zinc-500">
            <span>
              {data.totalCount} porosi gjithsej · faqja {page} / {totalPages}
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={page <= 1}
                className="rounded-lg border border-white/[0.1] bg-white/[0.04] px-3 py-1.5 font-medium text-zinc-200 disabled:opacity-40"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Para
              </button>
              <button
                type="button"
                disabled={page >= totalPages}
                className="rounded-lg border border-white/[0.1] bg-white/[0.04] px-3 py-1.5 font-medium text-zinc-200 disabled:opacity-40"
                onClick={() => setPage((p) => p + 1)}
              >
                Pas
              </button>
            </div>
          </div>
        </>
      ) : null}
    </div>
  )
}
