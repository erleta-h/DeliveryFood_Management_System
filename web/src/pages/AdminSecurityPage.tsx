import { useEffect, useState } from 'react'
import { fetchAdminAudit, type AdminAuditListResult } from '../lib/adminApi'
import { customerBtnGhost, customerCardMuted } from '../lib/adminTheme'
import { useAuthStore } from '../store/authStore'

export default function AdminSecurityPage() {
  const token = useAuthStore((s) => s.token)
  const [page, setPage] = useState(1)
  const [data, setData] = useState<AdminAuditListResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!token) {
      setLoading(false)
      return
    }
    let c = false
    setLoading(true)
    void fetchAdminAudit(token, { page, pageSize: 40 })
      .then((d) => {
        if (!c) setData(d)
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
  }, [token, page])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Siguria</h1>
        <p className="mt-1 text-sm text-gray-500">Regjistri i auditimit (lexim). Shtimi i event-eve bëhet nga shërbimet kur implementohet.</p>
      </div>

      {error ? <p className="text-sm text-red-300">{error}</p> : null}
      {loading ? <p className="text-sm text-gray-500">Duke ngarkuar…</p> : null}

      {data && !loading ? (
        <>
          <div className="overflow-x-auto rounded-xl border border-gray-200">
            <table className="min-w-full text-left text-sm text-gray-700">
              <thead className="border-b border-gray-200 bg-gray-50 text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-3 py-2">Koha</th>
                  <th className="px-3 py-2">Veprim</th>
                  <th className="px-3 py-2">Entiteti</th>
                  <th className="px-3 py-2">Përdoruesi</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((a) => (
                  <tr key={a.id} className="border-b border-gray-100">
                    <td className="whitespace-nowrap px-3 py-2 text-xs text-gray-500">
                      {new Date(a.createdAt).toLocaleString('sq-AL')}
                    </td>
                    <td className="px-3 py-2 text-gray-900">{a.action}</td>
                    <td className="px-3 py-2">
                      {a.entity}
                      {a.entityId ? ` #${a.entityId}` : ''}
                    </td>
                    <td className="px-3 py-2 text-gray-500">{a.userEmail ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex justify-between text-sm text-gray-500">
            <span>
              {data.total} hyra · faqja {data.page}
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

      {data && data.total === 0 && !loading ? (
        <p className={`${customerCardMuted} p-4 text-sm text-gray-500`}>Nuk ka rreshta audit ende.</p>
      ) : null}
    </div>
  )
}
