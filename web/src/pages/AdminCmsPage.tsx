import { useCallback, useEffect, useState } from 'react'
import { adminCmsUpsert, fetchAdminCms, type AdminCmsEntry } from '../lib/adminApi'
import { customerBtnPrimary, customerCardMuted } from '../lib/adminTheme'
import { useAuthStore } from '../store/authStore'

export default function AdminCmsPage() {
  const token = useAuthStore((s) => s.token)
  const [rows, setRows] = useState<AdminCmsEntry[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const [draft, setDraft] = useState<Record<string, string>>({})

  const load = useCallback(async () => {
    if (!token) return
    setError(null)
    const list = await fetchAdminCms(token)
    setRows(list)
    const d: Record<string, string> = {}
    for (const r of list) d[r.key] = r.value ?? ''
    setDraft(d)
  }, [token])

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

  async function save(key: string) {
    if (!token) return
    setMsg(null)
    const r = await adminCmsUpsert(token, { key, value: draft[key] ?? '' })
    if (!r.ok) setMsg(r.message)
    else {
      setMsg('U ruajt.')
      void load()
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">CMS — faqja kryesore</h1>
        <p className="mt-1 text-sm text-gray-500">
          Tekste statike (çelësat <span className="font-mono text-gray-500">cms.*</span>) — jo të dhëna biznesi.
        </p>
      </div>

      {msg ? <p className="text-sm text-amber-700">{msg}</p> : null}
      {error ? <p className="text-sm text-red-300">{error}</p> : null}
      {loading ? <p className="text-sm text-gray-500">Duke ngarkuar…</p> : null}

      {rows && !loading ? (
        <div className="space-y-4">
          {rows.map((r) => (
            <div key={r.key} className={`${customerCardMuted} space-y-2 p-4`}>
              <p className="font-mono text-xs text-violet-600/90">{r.key}</p>
              {r.description ? <p className="text-xs text-gray-500">{r.description}</p> : null}
              <textarea
                value={draft[r.key] ?? ''}
                onChange={(e) => setDraft((d) => ({ ...d, [r.key]: e.target.value }))}
                rows={r.key.includes('body') || r.key.includes('subtitle') ? 4 : 2}
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900"
              />
              <button type="button" className={customerBtnPrimary} onClick={() => void save(r.key)}>
                Ruaj
              </button>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  )
}
