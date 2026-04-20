import { useCallback, useEffect, useState } from 'react'
import { adminUpsertSetting, fetchAdminSettings, type AdminSettingRow } from '../lib/adminApi'
import { customerBtnPrimary, customerCardMuted } from '../lib/customerTheme'
import { useAuthStore } from '../store/authStore'

export default function AdminSettingsPage() {
  const token = useAuthStore((s) => s.token)
  const [rows, setRows] = useState<AdminSettingRow[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const [key, setKey] = useState('')
  const [value, setValue] = useState('')
  const [desc, setDesc] = useState('')

  const load = useCallback(async () => {
    if (!token) return
    setError(null)
    const list = await fetchAdminSettings(token)
    setRows(list)
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

  async function save(e: React.FormEvent) {
    e.preventDefault()
    if (!token || !key.trim()) return
    setMsg(null)
    const r = await adminUpsertSetting(token, {
      key: key.trim(),
      value: value || null,
      description: desc.trim() || null,
    })
    if (!r.ok) {
      setMsg(r.message)
      return
    }
    setKey('')
    setValue('')
    setDesc('')
    setMsg('U ruajt.')
    void load()
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-100">Konfigurime</h1>
        <p className="mt-1 text-sm text-zinc-400">Çelësa globalë në tabelën Settings (key/value).</p>
      </div>

      <form onSubmit={save} className={`${customerCardMuted} max-w-xl space-y-3 p-4`}>
        <p className="text-sm font-medium text-violet-200/90">Shto / përditëso</p>
        <label className="block text-xs text-zinc-500">
          Çelësi
          <input
            value={key}
            onChange={(e) => setKey(e.target.value)}
            className="mt-1 block w-full rounded-lg border border-white/10 bg-zinc-900/80 px-3 py-2 text-sm text-zinc-100"
            placeholder="platform.support_email"
          />
        </label>
        <label className="block text-xs text-zinc-500">
          Vlera
          <textarea
            value={value}
            onChange={(e) => setValue(e.target.value)}
            rows={2}
            className="mt-1 block w-full rounded-lg border border-white/10 bg-zinc-900/80 px-3 py-2 text-sm text-zinc-100"
          />
        </label>
        <label className="block text-xs text-zinc-500">
          Përshkrim (opsional)
          <input
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            className="mt-1 block w-full rounded-lg border border-white/10 bg-zinc-900/80 px-3 py-2 text-sm text-zinc-100"
          />
        </label>
        <button type="submit" className={customerBtnPrimary}>
          Ruaj
        </button>
      </form>

      {msg ? <p className="text-sm text-amber-200">{msg}</p> : null}
      {error ? <p className="text-sm text-red-300">{error}</p> : null}
      {loading ? <p className="text-sm text-zinc-500">Duke ngarkuar…</p> : null}

      {rows && !loading ? (
        <div className="overflow-x-auto rounded-xl border border-white/10">
          <table className="min-w-full text-left text-sm text-zinc-300">
            <thead className="border-b border-white/10 bg-zinc-900/50 text-xs uppercase text-zinc-500">
              <tr>
                <th className="px-3 py-2">Çelësi</th>
                <th className="px-3 py-2">Vlera</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((s) => (
                <tr key={s.id} className="border-b border-white/5">
                  <td className="px-3 py-2 font-mono text-xs text-violet-200/90">{s.key}</td>
                  <td className="max-w-md truncate px-3 py-2">{s.value ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  )
}
