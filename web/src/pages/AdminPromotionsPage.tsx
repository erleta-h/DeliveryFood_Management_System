import { useCallback, useEffect, useState } from 'react'
import {
  adminCreateCoupon,
  adminSetCouponActive,
  fetchAdminCoupons,
  type AdminCouponListResult,
} from '../lib/adminApi'
import { customerBtnGhost, customerBtnPrimary, customerCardMuted } from '../lib/customerTheme'
import { useAuthStore } from '../store/authStore'

export default function AdminPromotionsPage() {
  const token = useAuthStore((s) => s.token)
  const [page, setPage] = useState(1)
  const [couponSearch, setCouponSearch] = useState('')
  const [appliedCouponSearch, setAppliedCouponSearch] = useState('')
  const [sort, setSort] = useState('created_desc')
  const [data, setData] = useState<AdminCouponListResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const [code, setCode] = useState('')
  const [pct, setPct] = useState('10')
  const [busyId, setBusyId] = useState<number | null>(null)

  const load = useCallback(async () => {
    if (!token) return
    setError(null)
    const d = await fetchAdminCoupons(token, {
      search: appliedCouponSearch || undefined,
      sort,
      page,
      pageSize: 20,
    })
    setData(d)
  }, [token, page, appliedCouponSearch, sort])

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

  async function create(e: React.FormEvent) {
    e.preventDefault()
    if (!token) return
    setMsg(null)
    const discountPercent = Number(pct)
    if (!code.trim() || !Number.isFinite(discountPercent)) {
      setMsg('Plotëso kodin dhe përqindjen.')
      return
    }
    const r = await adminCreateCoupon(token, { code: code.trim(), discountPercent })
    if (!r.ok) {
      setMsg(r.message)
      return
    }
    setCode('')
    setMsg('Kuponi u krijua.')
    void load()
  }

  async function toggle(id: number, isActive: boolean) {
    if (!token) return
    setBusyId(id)
    const r = await adminSetCouponActive(token, id, isActive)
    setBusyId(null)
    if (!r.ok) setMsg(r.message)
    else void load()
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-100">Promocione</h1>
        <p className="mt-1 text-sm text-zinc-400">Kupona globale — kodi bëhet automatikisht me shkronja të mëdha.</p>
      </div>

      <div className={`${customerCardMuted} flex flex-wrap items-end gap-3 p-4`}>
        <label className="block text-xs text-zinc-500">
          Kërko kod
          <input
            value={couponSearch}
            onChange={(e) => setCouponSearch(e.target.value)}
            className="mt-1 block w-40 rounded-lg border border-white/10 bg-zinc-900/80 px-3 py-2 font-mono text-sm uppercase text-zinc-100"
            placeholder="VERE25"
          />
        </label>
        <label className="block text-xs text-zinc-500">
          Renditja
          <select
            value={sort}
            onChange={(e) => {
              setSort(e.target.value)
              setPage(1)
            }}
            className="mt-1 block w-44 rounded-lg border border-white/10 bg-zinc-900/80 px-3 py-2 text-sm text-zinc-100"
          >
            <option value="created_desc">Më i riu</option>
            <option value="created_asc">Më i vjetri</option>
            <option value="code_asc">Kodi A–Z</option>
            <option value="code_desc">Kodi Z–A</option>
            <option value="discount_desc">Zbritja më e lartë</option>
          </select>
        </label>
        <button
          type="button"
          className={customerBtnGhost}
          onClick={() => {
            setAppliedCouponSearch(couponSearch.trim())
            setPage(1)
          }}
        >
          Filtrimi
        </button>
      </div>

      <form onSubmit={create} className={`${customerCardMuted} max-w-xl space-y-3 p-4`}>
        <p className="text-sm font-medium text-violet-200/90">Kupon i ri</p>
        <div className="flex flex-wrap gap-3">
          <label className="block text-xs text-zinc-500">
            Kodi
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="mt-1 block w-40 rounded-lg border border-white/10 bg-zinc-900/80 px-3 py-2 text-sm uppercase text-zinc-100"
              placeholder="VERE25"
            />
          </label>
          <label className="block text-xs text-zinc-500">
            Zbritja %
            <input
              value={pct}
              onChange={(e) => setPct(e.target.value)}
              type="number"
              min={1}
              max={100}
              className="mt-1 block w-24 rounded-lg border border-white/10 bg-zinc-900/80 px-3 py-2 text-sm text-zinc-100"
            />
          </label>
        </div>
        <button type="submit" className={customerBtnPrimary}>
          Krijo kupon
        </button>
      </form>

      {msg ? <p className="text-sm text-amber-200">{msg}</p> : null}
      {error ? <p className="text-sm text-red-300">{error}</p> : null}
      {loading ? <p className="text-sm text-zinc-500">Duke ngarkuar…</p> : null}

      {data && !loading ? (
        <>
          <div className="overflow-x-auto rounded-xl border border-white/10">
            <table className="min-w-full text-left text-sm text-zinc-300">
              <thead className="border-b border-white/10 bg-zinc-900/50 text-xs uppercase text-zinc-500">
                <tr>
                  <th className="px-3 py-2">Kodi</th>
                  <th className="px-3 py-2">%</th>
                  <th className="px-3 py-2">Përdorime</th>
                  <th className="px-3 py-2">Aktiv</th>
                  <th className="px-3 py-2">Veprim</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((c) => (
                  <tr key={c.id} className="border-b border-white/5">
                    <td className="px-3 py-2 font-mono text-zinc-100">{c.code}</td>
                    <td className="px-3 py-2">{c.discountPercent}</td>
                    <td className="px-3 py-2">
                      {c.usesCount}
                      {c.maxUses != null ? ` / ${c.maxUses}` : ''}
                    </td>
                    <td className="px-3 py-2">{c.isActive ? 'Po' : 'Jo'}</td>
                    <td className="px-3 py-2">
                      <button
                        type="button"
                        disabled={busyId === c.id}
                        className={customerBtnGhost}
                        onClick={() => void toggle(c.id, !c.isActive)}
                      >
                        {c.isActive ? 'Çaktivizo' : 'Aktivizo'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex justify-between text-sm text-zinc-400">
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
        </>
      ) : null}
    </div>
  )
}
