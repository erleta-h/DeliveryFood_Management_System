import { useCallback, useEffect, useMemo, useState } from 'react'
import { AdminDriversMap } from '../components/AdminDriversMap'
import { adminPatchDriver, fetchAdminDrivers, type AdminDriverListResult } from '../lib/adminApi'
import { customerBtnGhost, customerCardMuted } from '../lib/customerTheme'
import { useAuthStore } from '../store/authStore'

export default function AdminRidersPage() {
  const token = useAuthStore((s) => s.token)
  const [page, setPage] = useState(1)
  const [data, setData] = useState<AdminDriverListResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<number | null>(null)

  const mapDrivers = useMemo(() => {
    if (!data) return []
    return data.items
      .filter((d) => d.lastLatitude != null && d.lastLongitude != null)
      .map((d) => ({
        userId: d.userId,
        lat: d.lastLatitude as number,
        lng: d.lastLongitude as number,
        label: `${d.firstName} ${d.lastName}`.trim() || d.email,
      }))
  }, [data])

  const load = useCallback(async () => {
    if (!token) return
    setError(null)
    const d = await fetchAdminDrivers(token, { page, pageSize: 20 })
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

  async function patch(userId: number, body: { userIsActive?: boolean; isOnline?: boolean }) {
    if (!token) return
    setBusyId(userId)
    setMsg(null)
    const r = await adminPatchDriver(token, userId, body)
    setBusyId(null)
    if (!r.ok) setMsg(r.message)
    else void load()
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-100">Delivera</h1>
        <p className="mt-1 text-sm text-zinc-400">Profilin Deliver e krijon backend-i; lista bazohet në DriverProfiles.</p>
      </div>

      {msg ? <p className="text-sm text-amber-200">{msg}</p> : null}
      {error ? <p className="text-sm text-red-300">{error}</p> : null}
      {loading ? <p className="text-sm text-zinc-500">Duke ngarkuar…</p> : null}

      {data && !loading && data.total === 0 ? (
        <p className={`${customerCardMuted} p-4 text-sm text-zinc-400`}>
          Nuk ka delivera të regjistruar ende.
        </p>
      ) : null}

      {data && !loading && data.total > 0 ? (
        <>
          {mapDrivers.length > 0 ? (
            <section className={`${customerCardMuted} p-4`}>
              <h2 className="text-sm font-semibold text-zinc-200">Harta — GPS i fundit (faqja {page})</h2>
              <p className="mt-1 text-xs text-zinc-500">
                OpenStreetMap + Leaflet (falas, si zgjedhësi i adresës). Vetëm deliverat me lokacion të raportuar nga
                aplikacioni.
              </p>
              <AdminDriversMap drivers={mapDrivers} className="mt-3" />
            </section>
          ) : (
            <p className="text-xs text-zinc-500">
              Asnjë deliver në këtë faqe nuk ka GPS të fundit — harta shfaqet kur ata janë online dhe dërgojnë lokacion.
            </p>
          )}
          <div className="overflow-x-auto rounded-xl border border-white/10">
            <table className="min-w-full text-left text-sm text-zinc-300">
              <thead className="border-b border-white/10 bg-zinc-900/50 text-xs uppercase text-zinc-500">
                <tr>
                  <th className="px-3 py-2">Deliveri</th>
                  <th className="px-3 py-2">Mjeti</th>
                  <th className="px-3 py-2">Online</th>
                  <th className="px-3 py-2">GPS</th>
                  <th className="px-3 py-2">Llogaria</th>
                  <th className="px-3 py-2">Veprime</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((d) => (
                  <tr key={d.userId} className="border-b border-white/5">
                    <td className="px-3 py-2">
                      <div className="text-zinc-100">{d.email}</div>
                      <div className="text-xs text-zinc-500">
                        {d.firstName} {d.lastName}
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      {d.vehicleType}
                      {d.licensePlate ? ` · ${d.licensePlate}` : ''}
                    </td>
                    <td className="px-3 py-2">{d.isOnline ? 'Po' : 'Jo'}</td>
                    <td className="px-3 py-2 font-mono text-[11px] text-zinc-500">
                      {d.lastLatitude != null && d.lastLongitude != null
                        ? `${d.lastLatitude.toFixed(4)}, ${d.lastLongitude.toFixed(4)}`
                        : '—'}
                    </td>
                    <td className="px-3 py-2">{d.userIsActive ? 'Aktiv' : 'I bllokuar'}</td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          disabled={busyId === d.userId}
                          className={customerBtnGhost}
                          onClick={() => void patch(d.userId, { userIsActive: !d.userIsActive })}
                        >
                          {d.userIsActive ? 'Blloko' : 'Aktivizo'}
                        </button>
                        <button
                          type="button"
                          disabled={busyId === d.userId}
                          className={customerBtnGhost}
                          onClick={() => void patch(d.userId, { isOnline: !d.isOnline })}
                        >
                          {d.isOnline ? 'Offline' : 'Online'}
                        </button>
                      </div>
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
