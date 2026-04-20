import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { adminSetCustomerActive, fetchAdminCustomers, type AdminCustomerListResult } from '../lib/adminApi'
import { customerBtnGhost, customerCardMuted } from '../lib/customerTheme'
import { useAuthStore } from '../store/authStore'

export default function AdminCustomersPage() {
  const token = useAuthStore((s) => s.token)
  const [search, setSearch] = useState('')
  const [appliedSearch, setAppliedSearch] = useState('')
  const [page, setPage] = useState(1)
  const [data, setData] = useState<AdminCustomerListResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<number | null>(null)

  const load = useCallback(async () => {
    if (!token) return
    setError(null)
    const d = await fetchAdminCustomers(token, { search: appliedSearch || undefined, page, pageSize: 20 })
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

  async function toggleActive(id: number, next: boolean) {
    if (!token) return
    setBusyId(id)
    setMsg(null)
    const r = await adminSetCustomerActive(token, id, next)
    setBusyId(null)
    if (!r.ok) setMsg(r.message)
    else void load()
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-100">Klientët</h1>
        <p className="mt-1 text-sm text-zinc-400">Përdoruesit me rol Customer — adresat dhe porositë.</p>
      </div>

      <div className={`${customerCardMuted} flex flex-wrap items-end gap-3 p-4`}>
        <label className="block text-xs text-zinc-500">
          Kërko
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="mt-1 block w-56 rounded-lg border border-white/10 bg-zinc-900/80 px-3 py-2 text-sm text-zinc-100"
            placeholder="Email, emër, telefon"
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
                  <th className="px-3 py-2">Klienti</th>
                  <th className="px-3 py-2">Adr.</th>
                  <th className="px-3 py-2">Porosi</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Porositë</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((u) => (
                  <tr key={u.id} className="border-b border-white/5">
                    <td className="px-3 py-2">
                      <div className="font-medium text-zinc-100">{u.email}</div>
                      <div className="text-xs text-zinc-500">
                        {u.firstName} {u.lastName}
                      </div>
                    </td>
                    <td className="px-3 py-2">{u.addressCount}</td>
                    <td className="px-3 py-2">{u.orderCount}</td>
                    <td className="px-3 py-2">{u.isActive ? 'Aktiv' : 'I bllokuar'}</td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          disabled={busyId === u.id}
                          className={customerBtnGhost}
                          onClick={() => void toggleActive(u.id, !u.isActive)}
                        >
                          {u.isActive ? 'Blloko' : 'Aktivizo'}
                        </button>
                        <Link to={`/admin/orders?customer=${u.id}`} className={`${customerBtnGhost} inline-block`}>
                          Porositë
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between text-sm text-zinc-400">
            <span>
              {data.total} klientë · faqja {data.page}
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
