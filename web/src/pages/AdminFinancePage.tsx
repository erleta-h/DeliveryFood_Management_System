import { useCallback, useEffect, useState } from 'react'
import { fetchAdminPayments, type AdminPaymentListResult } from '../lib/adminApi'
import { customerBtnGhost, customerCardMuted } from '../lib/customerTheme'
import { useAuthStore } from '../store/authStore'

const PAY_SQ: Record<number, string> = {
  0: 'Në pritje',
  1: 'E kapur',
  2: 'E rimbursuar',
  3: 'Dështoi',
}

function fmtMoney(n: number) {
  return new Intl.NumberFormat('sq-XK', { style: 'currency', currency: 'EUR' }).format(n)
}

export default function AdminFinancePage() {
  const token = useAuthStore((s) => s.token)
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [page, setPage] = useState(1)
  const [data, setData] = useState<AdminPaymentListResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!token) return
    setError(null)
    const q: Parameters<typeof fetchAdminPayments>[1] = { page, pageSize: 25 }
    if (fromDate) q.fromUtc = `${fromDate}T00:00:00.000Z`
    if (toDate) q.toUtc = `${toDate}T23:59:59.999Z`
    const d = await fetchAdminPayments(token, q)
    setData(d)
  }, [token, fromDate, toDate, page])

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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-100">Financa</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Pagesat e regjistruara (filtër sipas datës UTC). Shuma “e kapur” për të njëjtin interval.
        </p>
      </div>

      <div className={`${customerCardMuted} flex flex-wrap items-end gap-3 p-4`}>
        <label className="block text-xs text-zinc-500">
          Prej
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="mt-1 block rounded-lg border border-white/10 bg-zinc-900/80 px-3 py-2 text-sm text-zinc-100"
          />
        </label>
        <label className="block text-xs text-zinc-500">
          Deri
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="mt-1 block rounded-lg border border-white/10 bg-zinc-900/80 px-3 py-2 text-sm text-zinc-100"
          />
        </label>
        <button
          type="button"
          className={customerBtnGhost}
          onClick={() => {
            setPage(1)
            void load()
          }}
        >
          Fresko
        </button>
      </div>

      {data && !loading ? (
        <p className="text-sm text-violet-200/90">
          Shuma e pagesave të kapura në interval: <strong>{fmtMoney(data.sumCapturedAmount)}</strong>
        </p>
      ) : null}

      {error ? <p className="text-sm text-red-300">{error}</p> : null}
      {loading ? <p className="text-sm text-zinc-500">Duke ngarkuar…</p> : null}

      {data && !loading ? (
        <>
          <div className="overflow-x-auto rounded-xl border border-white/10">
            <table className="min-w-full text-left text-sm text-zinc-300">
              <thead className="border-b border-white/10 bg-zinc-900/50 text-xs uppercase text-zinc-500">
                <tr>
                  <th className="px-3 py-2">Porosia</th>
                  <th className="px-3 py-2">Shuma</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Ofruesi</th>
                  <th className="px-3 py-2">Koha</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((p) => (
                  <tr key={p.id} className="border-b border-white/5">
                    <td className="px-3 py-2 font-mono text-zinc-100">{p.orderNumber}</td>
                    <td className="px-3 py-2">
                      {fmtMoney(p.amount)} {p.currency}
                    </td>
                    <td className="px-3 py-2">{PAY_SQ[p.status] ?? p.status}</td>
                    <td className="px-3 py-2 text-zinc-400">{p.provider}</td>
                    <td className="px-3 py-2 text-xs text-zinc-500">
                      {new Date(p.createdAt).toLocaleString('sq-AL')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between text-sm text-zinc-400">
            <span>
              {data.total} pagesa · faqja {data.page}
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                className={customerBtnGhost}
                disabled={page <= 1}
                onClick={() => setPage((x) => Math.max(1, x - 1))}
              >
                ←
              </button>
              <button
                type="button"
                className={customerBtnGhost}
                disabled={page * data.pageSize >= data.total}
                onClick={() => setPage((x) => x + 1)}
              >
                →
              </button>
            </div>
          </div>
        </>
      ) : null}
    </div>
  )
}
