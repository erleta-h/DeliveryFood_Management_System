import { useCallback, useEffect, useState } from 'react'
import {
  adminPatchRestaurant,
  fetchAdminRestaurants,
  type AdminRestaurantListResult,
} from '../lib/adminApi'
import { customerBtnGhost, customerCardMuted } from '../lib/customerTheme'
import { useAuthStore } from '../store/authStore'

export default function AdminRestaurantsPage() {
  const token = useAuthStore((s) => s.token)
  const [search, setSearch] = useState('')
  const [appliedSearch, setAppliedSearch] = useState('')
  const [page, setPage] = useState(1)
  const [data, setData] = useState<AdminRestaurantListResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<number | null>(null)

  const load = useCallback(async () => {
    if (!token) return
    setError(null)
    const d = await fetchAdminRestaurants(token, { search: appliedSearch || undefined, page, pageSize: 20 })
    setData(d)
  }, [token, appliedSearch, page])

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

  async function patch(id: number, body: Parameters<typeof adminPatchRestaurant>[2]) {
    if (!token) return
    setBusyId(id)
    setMsg(null)
    const r = await adminPatchRestaurant(token, id, body)
    setBusyId(null)
    if (!r.ok) {
      setMsg(r.message)
      return
    }
    void load()
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-100">Restorantet</h1>
        <p className="mt-1 text-sm text-zinc-400">Aktiv / aprovuar, tarifa dërgese dhe porosi totale.</p>
      </div>

      <div className={`${customerCardMuted} flex flex-wrap items-end gap-3 p-4`}>
        <label className="block text-xs text-zinc-500">
          Kërko
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="mt-1 block w-56 rounded-lg border border-white/10 bg-zinc-900/80 px-3 py-2 text-sm text-zinc-100"
            placeholder="Emër ose qytet"
          />
        </label>
        <button
          type="button"
          className={customerBtnGhost}
          onClick={() => {
            setAppliedSearch(search.trim())
            setPage(1)
          }}
        >
          Filtrimi
        </button>
      </div>

      {msg ? <p className="text-sm text-amber-200">{msg}</p> : null}
      {error ? <p className="text-sm text-red-300">{error}</p> : null}
      {loading ? <p className="text-sm text-zinc-500">Duke ngarkuar…</p> : null}

      {data && !loading ? (
        <>
          <div className="overflow-x-auto rounded-xl border border-white/10">
            <table className="min-w-full text-left text-sm text-zinc-300">
              <thead className="border-b border-white/10 bg-zinc-900/50 text-xs uppercase text-zinc-500">
                <tr>
                  <th className="px-3 py-2">Restoranti</th>
                  <th className="px-3 py-2">Qyteti</th>
                  <th className="px-3 py-2">Porosi</th>
                  <th className="px-3 py-2">Dërgesë</th>
                  <th className="px-3 py-2">Opsione</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((r) => (
                  <tr key={r.id} className="border-b border-white/5">
                    <td className="px-3 py-2 font-medium text-zinc-100">{r.name}</td>
                    <td className="px-3 py-2">{r.city ?? '—'}</td>
                    <td className="px-3 py-2">{r.orderCount}</td>
                    <td className="px-3 py-2">{Number(r.deliveryFee).toFixed(2)} €</td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          disabled={busyId === r.id}
                          className={customerBtnGhost}
                          onClick={() => void patch(r.id, { isActive: !r.isActive })}
                        >
                          {r.isActive ? 'Çaktivizo' : 'Aktivizo'}
                        </button>
                        <button
                          type="button"
                          disabled={busyId === r.id}
                          className={customerBtnGhost}
                          onClick={() => void patch(r.id, { isApproved: !r.isApproved })}
                        >
                          {r.isApproved ? 'Hiq aprovim' : 'Aprovo'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between text-sm text-zinc-400">
            <span>
              {data.total} restorante · faqja {data.page}
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
        </>
      ) : null}
    </div>
  )
}
