import { useEffect, useState } from 'react'
import { fetchAdminCityZones, type AdminCityZone } from '../lib/adminApi'
import { customerCardMuted } from '../lib/adminTheme'
import { useAuthStore } from '../store/authStore'

export default function AdminZonesPage() {
  const token = useAuthStore((s) => s.token)
  const [rows, setRows] = useState<AdminCityZone[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!token) {
      setLoading(false)
      return
    }
    let c = false
    setLoading(true)
    void fetchAdminCityZones(token)
      .then((d) => {
        if (!c) setRows(d)
      })
      .catch((e: unknown) => {
        if (!c) setError(e instanceof Error ? e.message : 'Gabim.')
      })
      .finally(() => {
        if (!c) setLoading(false)
      })
    return () => {
      c = true
    }
  }, [token])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Zonat & tarifat</h1>
        <p className="mt-1 text-sm text-gray-500">
          Përmbledhje sipas qytetit (nga adresa e restorantit). Për tarifa për-restorant përdor modulin Restorantet.
        </p>
      </div>

      {error ? <p className="text-sm text-red-300">{error}</p> : null}
      {loading ? <p className="text-sm text-gray-500">Duke ngarkuar…</p> : null}

      {rows ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((z) => (
            <div key={z.city} className={`${customerCardMuted} p-4`}>
              <p className="text-lg font-semibold text-gray-900">{z.city}</p>
              <p className="mt-2 text-sm text-gray-500">
                {z.activeApprovedCount} aktivë & aprovuar / {z.restaurantCount} gjithsej
              </p>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  )
}
