import { useCallback, useEffect, useMemo, useState } from 'react'
import { AdminEmptyState } from '../components/admin/AdminEmptyState'
import { AdminIcon } from '../components/admin/adminIcons'
import { AdminTableSkeleton } from '../components/admin/AdminSkeleton'
import {
  adminCreateFoodCategory,
  adminDeleteFoodCategory,
  adminUpdateFoodCategory,
  fetchAdminFoodCategories,
  type AdminFoodCategoryRow,
} from '../lib/adminApi'
import {
  adminSuccessBanner,
  customerBtnGhost,
  customerBtnPrimary,
  customerField,
  customerLabelForm,
  customerPanelSubtitle,
} from '../lib/adminTheme'
import { useAuthStore } from '../store/authStore'

const PAGE_SIZE = 10

function categoryEmoji(name: string): string {
  const n = name.toLowerCase()
  if (n.includes('pizza')) return '🍕'
  if (n.includes('burger') || n.includes('grill')) return '🍔'
  if (n.includes('sushi')) return '🍣'
  if (n.includes('aziat') || n.includes('asian')) return '🥡'
  if (n.includes('kafe') || n.includes('mëngjes') || n.includes('mengjes')) return '☕'
  if (n.includes('desert') || n.includes('ëmbëls')) return '🍰'
  if (n.includes('healthy') || n.includes('salad')) return '🥗'
  if (n.includes('mexican') || n.includes('taco')) return '🌮'
  return '🍽️'
}

type ModalMode = { kind: 'create' } | { kind: 'edit'; row: AdminFoodCategoryRow }

function FoodCategoryModal({
  mode,
  busy,
  onClose,
  onSave,
}: {
  mode: ModalMode
  busy: boolean
  onClose: () => void
  onSave: (data: { name: string; sortOrder: number | null; description: string | null }) => void
}) {
  const isEdit = mode.kind === 'edit'
  const [name, setName] = useState(isEdit ? mode.row.name : '')
  const [sort, setSort] = useState(isEdit ? String(mode.row.sortOrder) : '')
  const [desc, setDesc] = useState(isEdit ? mode.row.description ?? '' : '')
  const [localErr, setLocalErr] = useState<string | null>(null)

  function submit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) {
      setLocalErr('Shkruaj emrin e kategorisë.')
      return
    }
    let sortOrder: number | null = null
    if (sort.trim() !== '') {
      const n = Number(sort)
      if (!Number.isFinite(n)) {
        setLocalErr('Renditja duhet të jetë numër.')
        return
      }
      sortOrder = n
    } else if (isEdit) {
      setLocalErr('Renditja është e detyrueshme.')
      return
    }
    setLocalErr(null)
    onSave({ name: trimmed, sortOrder, description: desc.trim() || null })
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal>
      <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <h2 className="text-lg font-semibold text-gray-900">
            {isEdit ? 'Ndrysho kategorinë' : 'Kategori e re'}
          </h2>
          <button
            type="button"
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
            onClick={onClose}
            aria-label="Mbyll"
          >
            ✕
          </button>
        </div>
        <form onSubmit={submit} className="space-y-4 px-5 py-4">
          {localErr ? <p className="text-sm text-red-600">{localErr}</p> : null}
          <label className={customerLabelForm}>
            Emri <span className="text-red-500">*</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={customerField}
              placeholder="Pizza"
              autoFocus
            />
          </label>
          <label className={customerLabelForm}>
            Renditja {!isEdit ? <span className="font-normal normal-case text-gray-400">(bosh = auto)</span> : null}{' '}
            {isEdit ? <span className="text-red-500">*</span> : null}
            <input
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              type="number"
              className={customerField}
              placeholder={isEdit ? undefined : 'auto'}
            />
          </label>
          <label className={customerLabelForm}>
            Përshkrimi <span className="font-normal normal-case text-gray-400">(opsionale)</span>
            <textarea
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              rows={3}
              className={customerField + ' resize-none'}
              placeholder="P.sh. Pica tradicionale dhe moderne"
            />
          </label>
          <div className="flex justify-end gap-2 border-t border-gray-100 pt-4">
            <button type="button" className={customerBtnGhost} disabled={busy} onClick={onClose}>
              Anulo
            </button>
            <button type="submit" className={customerBtnPrimary} disabled={busy}>
              {busy ? 'Duke ruajtur…' : 'Ruaj'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function AdminFoodCategoriesPage() {
  const token = useAuthStore((s) => s.token)
  const [rows, setRows] = useState<AdminFoodCategoryRow[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [modal, setModal] = useState<ModalMode | null>(null)
  const [modalBusy, setModalBusy] = useState(false)
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

  useEffect(() => {
    setPage(1)
  }, [search])

  const filtered = useMemo(() => {
    if (!rows) return []
    const q = search.trim().toLowerCase()
    if (!q) return rows
    return rows.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        (r.description?.toLowerCase().includes(q) ?? false),
    )
  }, [rows, search])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const pageRows = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE
    return filtered.slice(start, start + PAGE_SIZE)
  }, [filtered, page])

  const pageNumbers = useMemo(() => {
    const max = 5
    let start = Math.max(1, page - Math.floor(max / 2))
    const end = Math.min(totalPages, start + max - 1)
    start = Math.max(1, end - max + 1)
    const nums: number[] = []
    for (let i = start; i <= end; i++) nums.push(i)
    return nums
  }, [page, totalPages])

  async function handleModalSave(data: {
    name: string
    sortOrder: number | null
    description: string | null
  }) {
    if (!token || !modal) return
    setModalBusy(true)
    setMsg(null)
    if (modal.kind === 'create') {
      const r = await adminCreateFoodCategory(token, data)
      setModalBusy(false)
      if (!r.ok) {
        setMsg(r.message)
        return
      }
      setModal(null)
      setMsg('Kategoria u krijua; cache-i publik u pastrua.')
      void load()
    } else {
      const sortN = data.sortOrder
      if (sortN === null) {
        setModalBusy(false)
        setMsg('Renditja është e detyrueshme.')
        return
      }
      const r = await adminUpdateFoodCategory(token, modal.row.id, {
        name: data.name,
        sortOrder: sortN,
        description: data.description,
      })
      setModalBusy(false)
      if (!r.ok) {
        setMsg(r.message)
        return
      }
      setModal(null)
      setMsg('Kategoria u përditësua.')
      void load()
    }
  }

  async function onDelete(row: AdminFoodCategoryRow) {
    if (!token) return
    if (
      !window.confirm(
        `Fshi kategorinë «${row.name}»?${row.restaurantCount > 0 ? ` Ka ${row.restaurantCount} restorant(e) — fshirja do të dështojë derisa të zhvendosen.` : ''}`,
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
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-gray-900 sm:text-2xl">
            Kategoritë e ushqimit
          </h1>
          <p className={customerPanelSubtitle}>
            Këto kategori përdoren nga restorantet dhe lista publike; pas ruajtjes cache-i i kategorive
            pastrohet automatikisht.
          </p>
        </div>
        <button type="button" className={customerBtnPrimary + ' shrink-0'} onClick={() => setModal({ kind: 'create' })}>
          + Kategori e re
        </button>
      </div>

      <div className="relative max-w-md">
        <AdminIcon
          name="search"
          size={16}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
        />
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Kërko kategori…"
          className={customerField + ' pl-9'}
        />
      </div>

      {msg ? <p className={adminSuccessBanner}>{msg}</p> : null}
      {error ? <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}

      {loading ? <AdminTableSkeleton rows={6} /> : null}

      {!loading && filtered.length === 0 ? (
        <AdminEmptyState
          icon="🍽️"
          title={search ? 'Nuk u gjet asnjë kategori' : 'Nuk ka kategori'}
          description={
            search
              ? 'Provo një term tjetër kërkimi.'
              : 'Krijo kategorinë e parë për filtrat e restoranteve.'
          }
        />
      ) : null}

      {!loading && filtered.length > 0 ? (
        <>
          <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-gray-100 bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-4 py-3">Kategoria</th>
                  <th className="px-4 py-3">Përshkrimi</th>
                  <th className="px-4 py-3">Restorante</th>
                  <th className="px-4 py-3">Renditja</th>
                  <th className="px-4 py-3 text-right">Veprime</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {pageRows.map((r) => (
                  <tr key={r.id} className="transition hover:bg-gray-50/80">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-lg">
                          {categoryEmoji(r.name)}
                        </span>
                        <span className="font-medium text-gray-900">{r.name}</span>
                      </div>
                    </td>
                    <td className="max-w-xs px-4 py-3 text-gray-600">
                      {r.description?.trim() ? (
                        <span className="line-clamp-2">{r.description}</span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 tabular-nums text-gray-700">{r.restaurantCount}</td>
                    <td className="px-4 py-3 tabular-nums text-gray-700">{r.sortOrder}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          title="Ndrysho"
                          className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-500 transition hover:border-violet-200 hover:bg-violet-50 hover:text-violet-700"
                          onClick={() => setModal({ kind: 'edit', row: r })}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                          </svg>
                        </button>
                        <button
                          type="button"
                          title="Fshi"
                          disabled={busyId === r.id}
                          className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-red-500 transition hover:border-red-200 hover:bg-red-50 disabled:opacity-40"
                          onClick={() => void onDelete(r)}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 ? (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-gray-500">
                Duke shfaqur {(page - 1) * PAGE_SIZE + 1} deri {Math.min(page * PAGE_SIZE, filtered.length)} nga{' '}
                {filtered.length}
              </p>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  className={customerBtnGhost + ' px-2.5 py-1.5 text-xs'}
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  ←
                </button>
                {pageNumbers.map((n) => (
                  <button
                    key={n}
                    type="button"
                    className={
                      n === page
                        ? 'flex h-8 min-w-8 items-center justify-center rounded-lg bg-violet-600 px-2 text-xs font-semibold text-white'
                        : customerBtnGhost + ' h-8 min-w-8 px-2 py-1.5 text-xs'
                    }
                    onClick={() => setPage(n)}
                  >
                    {n}
                  </button>
                ))}
                <button
                  type="button"
                  className={customerBtnGhost + ' px-2.5 py-1.5 text-xs'}
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  →
                </button>
              </div>
            </div>
          ) : null}
        </>
      ) : null}

      {modal ? (
        <FoodCategoryModal
          mode={modal}
          busy={modalBusy}
          onClose={() => setModal(null)}
          onSave={(data) => void handleModalSave(data)}
        />
      ) : null}
    </div>
  )
}
