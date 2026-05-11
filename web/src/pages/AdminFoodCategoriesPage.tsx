import { useCallback, useEffect, useState } from 'react'
import {
  adminCreateFoodCategory,
  adminDeleteFoodCategory,
  adminUpdateFoodCategory,
  fetchAdminFoodCategories,
  type AdminFoodCategoryRow,
} from '../lib/adminApi'
import { customerBtnGhost, customerBtnPrimary, customerCardMuted } from '../lib/customerTheme'
import { useAuthStore } from '../store/authStore'

export default function AdminFoodCategoriesPage() {
  const token = useAuthStore((s) => s.token)
  const [rows, setRows] = useState<AdminFoodCategoryRow[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)

  const [newName, setNewName] = useState('')
  const [newSort, setNewSort] = useState('')
  const [newDesc, setNewDesc] = useState('')

  const [editing, setEditing] = useState<AdminFoodCategoryRow | null>(null)
  const [editName, setEditName] = useState('')
  const [editSort, setEditSort] = useState('')
  const [editDesc, setEditDesc] = useState('')
  const [busyId, setBusyId] = useState<number | null>(null)

  const load = useCallback(async () => {
    if (!token) return
    setError(null)
    const list = await fetchAdminFoodCategories(token)
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

  function startEdit(row: AdminFoodCategoryRow) {
    setMsg(null)
    setEditing(row)
    setEditName(row.name)
    setEditSort(String(row.sortOrder))
    setEditDesc(row.description ?? '')
  }

  function cancelEdit() {
    setEditing(null)
  }

  async function onCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!token) return
    setMsg(null)
    const name = newName.trim()
    if (!name) {
      setMsg('Shkruaj emrin e kategorisë.')
      return
    }
    const sortOrder =
      newSort.trim() === '' ? null : Number(newSort)
    if (newSort.trim() !== '' && !Number.isFinite(sortOrder)) {
      setMsg('Renditja duhet të jetë numër.')
      return
    }
    const r = await adminCreateFoodCategory(token, {
      name,
      sortOrder,
      description: newDesc.trim() || null,
    })
    if (!r.ok) {
      setMsg(r.message)
      return
    }
    setNewName('')
    setNewSort('')
    setNewDesc('')
    setMsg('Kategoria u krijua; lista publike e cache-uar përditësohet.')
    void load()
  }

  async function onSaveEdit(e: React.FormEvent) {
    e.preventDefault()
    if (!token || !editing) return
    setMsg(null)
    const name = editName.trim()
    if (!name) {
      setMsg('Emri nuk mund të jetë bosh.')
      return
    }
    const sortN = Number(editSort)
    if (!Number.isFinite(sortN)) {
      setMsg('Renditja duhet të jetë numër.')
      return
    }
    const body: {
      name: string
      sortOrder: number
      description: string | null
    } = {
      name,
      sortOrder: sortN,
      description: editDesc.trim() || null,
    }
    const r = await adminUpdateFoodCategory(token, editing.id, body)
    if (!r.ok) {
      setMsg(r.message)
      return
    }
    setEditing(null)
    setMsg('Kategoria u përditësua.')
    void load()
  }

  async function onDelete(row: AdminFoodCategoryRow) {
    if (!token) return
    if (
      !window.confirm(
        `Fshi kategorinë «${row.name}»? ${row.restaurantCount > 0 ? `Ka ${row.restaurantCount} restorant(e) — fshirja do të dështojë derisa të zhvendosen.` : ''}`,
      )
    )
      return
    setBusyId(row.id)
    setMsg(null)
    const r = await adminDeleteFoodCategory(token, row.id)
    setBusyId(null)
    if (!r.ok) setMsg(r.message)
    else {
      setMsg('Kategoria u fshi.')
      void load()
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-100">Kategoritë e ushqimit</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Këto kategori përdoren nga restorantet dhe lista publike; pas ruajtjes cache-i i kategorive
          pastrohet automatikisht.
        </p>
      </div>

      <form onSubmit={onCreate} className={`${customerCardMuted} max-w-xl space-y-3 p-4`}>
        <p className="text-sm font-medium text-violet-200/90">Kategori e re</p>
        <div className="flex flex-wrap gap-3">
          <label className="block text-xs text-zinc-500">
            Emri
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="mt-1 block w-56 rounded-lg border border-white/10 bg-zinc-900/80 px-3 py-2 text-sm text-zinc-100"
              placeholder="Pizza"
            />
          </label>
          <label className="block text-xs text-zinc-500">
            Renditja (opsionale)
            <input
              value={newSort}
              onChange={(e) => setNewSort(e.target.value)}
              type="number"
              className="mt-1 block w-28 rounded-lg border border-white/10 bg-zinc-900/80 px-3 py-2 text-sm text-zinc-100"
              placeholder="auto"
            />
          </label>
        </div>
        <label className="block text-xs text-zinc-500">
          Përshkrim (opsional)
          <textarea
            value={newDesc}
            onChange={(e) => setNewDesc(e.target.value)}
            rows={2}
            className="mt-1 block w-full max-w-lg rounded-lg border border-white/10 bg-zinc-900/80 px-3 py-2 text-sm text-zinc-100"
          />
        </label>
        <button type="submit" className={customerBtnPrimary}>
          Krijo
        </button>
      </form>

      {editing ? (
        <form onSubmit={onSaveEdit} className={`${customerCardMuted} max-w-xl space-y-3 p-4`}>
          <p className="text-sm font-medium text-amber-200/90">Përditëso: {editing.name}</p>
          <div className="flex flex-wrap gap-3">
            <label className="block text-xs text-zinc-500">
              Emri
              <input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="mt-1 block w-56 rounded-lg border border-white/10 bg-zinc-900/80 px-3 py-2 text-sm text-zinc-100"
              />
            </label>
            <label className="block text-xs text-zinc-500">
              Renditja
              <input
                value={editSort}
                onChange={(e) => setEditSort(e.target.value)}
                type="number"
                className="mt-1 block w-28 rounded-lg border border-white/10 bg-zinc-900/80 px-3 py-2 text-sm text-zinc-100"
              />
            </label>
          </div>
          <label className="block text-xs text-zinc-500">
            Përshkrim
            <textarea
              value={editDesc}
              onChange={(e) => setEditDesc(e.target.value)}
              rows={2}
              className="mt-1 block w-full max-w-lg rounded-lg border border-white/10 bg-zinc-900/80 px-3 py-2 text-sm text-zinc-100"
            />
          </label>
          <div className="flex flex-wrap gap-2">
            <button type="submit" className={customerBtnPrimary}>
              Ruaj
            </button>
            <button type="button" className={customerBtnGhost} onClick={cancelEdit}>
              Anulo
            </button>
          </div>
        </form>
      ) : null}

      {msg ? <p className="text-sm text-amber-200">{msg}</p> : null}
      {error ? <p className="text-sm text-red-300">{error}</p> : null}
      {loading ? <p className="text-sm text-zinc-500">Duke ngarkuar…</p> : null}

      {rows && !loading ? (
        <div className="overflow-x-auto rounded-xl border border-white/10">
          <table className="min-w-full text-left text-sm text-zinc-300">
            <thead className="border-b border-white/10 bg-zinc-900/50 text-xs uppercase text-zinc-500">
              <tr>
                <th className="px-3 py-2">Emri</th>
                <th className="px-3 py-2">Renditja</th>
                <th className="px-3 py-2">Restorante</th>
                <th className="px-3 py-2">Përshkrim</th>
                <th className="px-3 py-2">Veprim</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-white/5">
                  <td className="px-3 py-2 font-medium text-zinc-100">{r.name}</td>
                  <td className="px-3 py-2">{r.sortOrder}</td>
                  <td className="px-3 py-2">{r.restaurantCount}</td>
                  <td className="max-w-xs truncate px-3 py-2 text-zinc-400">{r.description ?? '—'}</td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-2">
                      <button type="button" className={customerBtnGhost} onClick={() => startEdit(r)}>
                        Ndrysho
                      </button>
                      <button
                        type="button"
                        disabled={busyId === r.id}
                        className={customerBtnGhost}
                        onClick={() => void onDelete(r)}
                      >
                        Fshi
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  )
}
