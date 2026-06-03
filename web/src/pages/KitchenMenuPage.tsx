import { type FormEvent, useCallback, useEffect, useMemo, useState } from 'react'
import {
  createKitchenCategory,
  createKitchenMenuItem,
  deleteKitchenCategory,
  deleteKitchenMenuItem,
  deleteKitchenMenuItemImage,
  fetchKitchenMenu,
  updateKitchenCategory,
  updateKitchenMenuItem,
  uploadKitchenMenuItemImage,
  type KitchenMenuCategoryRow,
  type KitchenMenuItemRow,
} from '../lib/kitchenMenuApi'
import { isKitchenHttpUnauthorized } from '../lib/kitchenApi'
import { useAuthStore } from '../store/authStore'
import { MenuHelpBox } from '../components/kitchen/menu/MenuHelpBox'
import { MenuItemFormModal, type MenuItemFormValues } from '../components/kitchen/menu/MenuItemFormModal'
import { MenuSectionAccordion } from '../components/kitchen/menu/MenuSectionAccordion'
import { MenuSectionEditModal } from '../components/kitchen/menu/MenuSectionEditModal'

const EXPANDED_KEY = 'kitchen-menu-expanded-cat'

const emptyItemForm = (): MenuItemFormValues => ({
  name: '',
  price: '',
  description: '',
  isAvailable: true,
  isFeatured: false,
  imageFile: null,
})

type ItemModalState =
  | { mode: 'create'; categoryId: number }
  | { mode: 'edit'; item: KitchenMenuItemRow }
  | null

export default function KitchenMenuPage() {
  const token = useAuthStore((s) => s.token)
  const [categories, setCategories] = useState<KitchenMenuCategoryRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sessionExpired, setSessionExpired] = useState(false)
  const [flash, setFlash] = useState<string | null>(null)
  const [mutating, setMutating] = useState(false)

  const [newCatName, setNewCatName] = useState('')
  const [expandedIds, setExpandedIds] = useState<Set<number>>(() => new Set())
  const [editSectionId, setEditSectionId] = useState<number | null>(null)
  const [itemModal, setItemModal] = useState<ItemModalState>(null)

  const load = useCallback(async () => {
    if (!token) return
    setError(null)
    setSessionExpired(false)
    try {
      const data = await fetchKitchenMenu(token)
      setCategories(data)
      setExpandedIds((prev) => {
        const kept = new Set([...prev].filter((id) => data.some((c) => c.id === id)))
        if (kept.size > 0) return kept
        if (data.length === 0) return kept
        const stored = readExpandedStorage()
        if (stored != null && data.some((c) => c.id === stored)) kept.add(stored)
        else kept.add(data[0]!.id)
        return kept
      })
    } catch (e: unknown) {
      if (isKitchenHttpUnauthorized(e)) {
        setSessionExpired(true)
        setCategories([])
        return
      }
      throw e
    }
  }, [token])

  useEffect(() => {
    if (!token) return
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

  const editSection = useMemo(
    () => (editSectionId == null ? null : categories.find((c) => c.id === editSectionId) ?? null),
    [editSectionId, categories],
  )

  const itemModalMeta = useMemo(() => {
    if (!itemModal) return null
    if (itemModal.mode === 'create') {
      const cat = categories.find((c) => c.id === itemModal.categoryId)
      return {
        title: cat ? `Shto artikull në «${cat.name}»` : 'Shto artikull',
        initial: emptyItemForm(),
        imageUrl: null as string | null,
        showRemoveImage: false,
      }
    }
    const it = itemModal.item
    return {
      title: `Ndrysho «${it.name}»`,
      initial: {
        name: it.name,
        price: String(it.price),
        description: it.description ?? '',
        isAvailable: it.isAvailable,
        isFeatured: it.isFeatured,
        imageFile: null,
      },
      imageUrl: it.imageUrl,
      showRemoveImage: true,
    }
  }, [itemModal, categories])

  async function run<T>(fn: () => Promise<T>): Promise<T | undefined> {
    setFlash(null)
    setError(null)
    setMutating(true)
    try {
      return await fn()
    } finally {
      setMutating(false)
    }
  }

  function toggleExpanded(catId: number) {
    setExpandedIds((prev) => {
      const next = new Set<number>()
      if (!prev.has(catId)) {
        next.add(catId)
        writeExpandedStorage(catId)
      }
      return next
    })
  }

  function expandCategory(catId: number) {
    setExpandedIds(new Set([catId]))
    writeExpandedStorage(catId)
  }

  async function onCreateCategory(e: FormEvent) {
    e.preventDefault()
    if (!token || !newCatName.trim()) return
    const sectionName = newCatName.trim()
    const r = await run(async () => {
      const x = await createKitchenCategory(token, { name: sectionName })
      if (!x.ok) return x
      setNewCatName('')
      setFlash('Seksioni u shtua.')
      const fresh = await fetchKitchenMenu(token)
      setCategories(fresh)
      const created = fresh.find((c) => c.name === sectionName) ?? fresh[fresh.length - 1]
      if (created) expandCategory(created.id)
      return x
    })
    if (r && 'ok' in r && !r.ok) setError(r.message)
  }

  async function saveSection(name: string, sortOrder: number) {
    if (!token || editSectionId == null) return
    const orig = categories.find((c) => c.id === editSectionId)
    if (!orig) return
    const body: { name?: string; sortOrder?: number } = {}
    if (name !== orig.name) body.name = name
    if (sortOrder !== orig.sortOrder) body.sortOrder = sortOrder
    if (Object.keys(body).length === 0) {
      setEditSectionId(null)
      setFlash('Nuk ka ndryshime.')
      return
    }
    const r = await run(async () => updateKitchenCategory(token, editSectionId, body))
    if (r && !r.ok) setError(r.message)
    else {
      setEditSectionId(null)
      setFlash('Seksioni u përditësua.')
      await load()
    }
  }

  async function removeSection(catId: number) {
    if (!token) return
    const cat = categories.find((c) => c.id === catId)
    if (!cat || cat.items.length > 0) return
    if (!window.confirm(`Fshi seksionin «${cat.name}»?`)) return
    const r = await run(async () => deleteKitchenCategory(token, catId))
    if (r && !r.ok) setError(r.message)
    else {
      setEditSectionId(null)
      setFlash('Seksioni u fshi.')
      await load()
    }
  }

  async function toggleItemAvailable(item: KitchenMenuItemRow) {
    if (!token) return
    const r = await run(async () =>
      updateKitchenMenuItem(token, item.id, { isAvailable: !item.isAvailable }),
    )
    if (r && !r.ok) setError(r.message)
    else await load()
  }

  async function toggleItemFeatured(item: KitchenMenuItemRow) {
    if (!token) return
    const r = await run(async () =>
      updateKitchenMenuItem(token, item.id, { isFeatured: !item.isFeatured }),
    )
    if (r && !r.ok) setError(r.message)
    else await load()
  }

  async function removeItem(itemId: number) {
    if (!token) return
    if (!window.confirm('Fshi artikullin? Nëse ka pasur porosi, operacioni dështon.')) return
    const r = await run(async () => deleteKitchenMenuItem(token, itemId))
    if (r && !r.ok) setError(r.message)
    else {
      setFlash('Artikulli u fshi.')
      await load()
    }
  }

  async function saveItemFromModal(values: MenuItemFormValues) {
    if (!token || !itemModal) return
    const name = values.name.trim()
    const price = parseFloat(values.price.replace(',', '.'))
    if (!name || !Number.isFinite(price) || price < 0) {
      setError('Emër dhe çmim të vlefshëm.')
      return
    }

    if (itemModal.mode === 'create') {
      const catId = itemModal.categoryId
      const r = await run(async () => {
        const created = await createKitchenMenuItem(token, {
          menuCategoryId: catId,
          name,
          price,
          description: values.description.trim() || null,
          isAvailable: values.isAvailable,
          isFeatured: values.isFeatured,
        })
        if (!created.ok) return created
        if (values.imageFile) {
          const im = await uploadKitchenMenuItemImage(token, created.id, values.imageFile)
          if (!im.ok) {
            return {
              ok: false as const,
              message: im.message,
              itemCreated: true as const,
            }
          }
        }
        return { ok: true as const }
      })
      if (r && !r.ok) {
        if ('itemCreated' in r && r.itemCreated) {
          setItemModal(null)
          setFlash('Artikulli u shtua, por fotoja nuk u ngarkua.')
          setError(`Foto: ${r.message}`)
          expandCategory(catId)
          await load()
          return
        }
        setError(r.message)
        return
      }
      setItemModal(null)
      setFlash('Artikulli u shtua.')
      expandCategory(catId)
      await load()
      return
    }

    const it = itemModal.item
    const body: {
      name?: string
      description?: string | null
      price?: number
      isAvailable?: boolean
      isFeatured?: boolean
    } = {}
    if (name !== it.name) body.name = name
    if (values.description.trim() !== (it.description ?? ''))
      body.description = values.description.trim() === '' ? null : values.description.trim()
    if (price !== it.price) body.price = price
    if (values.isAvailable !== it.isAvailable) body.isAvailable = values.isAvailable
    if (values.isFeatured !== it.isFeatured) body.isFeatured = values.isFeatured
    const hasImage = values.imageFile instanceof File

    const r = await run(async () => {
      if (Object.keys(body).length > 0) {
        const up = await updateKitchenMenuItem(token, it.id, body)
        if (!up.ok) return up
      }
      if (hasImage) {
        const im = await uploadKitchenMenuItemImage(token, it.id, values.imageFile!)
        if (!im.ok) return im
      }
      return { ok: true as const }
    })
    if (r && !r.ok) setError(r.message)
    else {
      setItemModal(null)
      setFlash('Artikulli u përditësua.')
      await load()
    }
  }

  async function removeItemImageFromModal() {
    if (!token || itemModal?.mode !== 'edit') return
    if (!window.confirm('Hiq foton e artikullit?')) return
    const r = await run(async () => deleteKitchenMenuItemImage(token, itemModal.item.id))
    if (r && !r.ok) setError(r.message)
    else {
      setFlash('Fotoja u hoq.')
      setItemModal(null)
      await load()
    }
  }

  if (!token) {
    return (
      <section className="rounded-xl border border-[#30363d] bg-[#161b22] p-6">
        <p className="text-zinc-400">Duhet të jesh i kyçur.</p>
      </section>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white sm:text-[1.65rem]">Menaxhimi i menusë</h1>
        <p className="mt-1.5 text-sm text-zinc-500">
          Krijo dhe menaxho seksionet dhe artikujt e menusë.
        </p>
      </div>

      {sessionExpired ? (
        <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-100">
          Sesioni skadoi — dil dhe hyr përsëri.
        </p>
      ) : null}

      {flash ? (
        <p className="rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-100">
          {flash}
        </p>
      ) : null}

      {error ? (
        <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">{error}</p>
      ) : null}

      <section className="rounded-xl border border-[#30363d] bg-[#161b22] p-4 ring-1 ring-[#21262d] sm:p-5">
        <div className="flex items-center gap-2 text-sm font-semibold text-white">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#21262d] text-orange-400" aria-hidden>
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
              <path d="M4 6h16v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6z" />
              <path d="M4 10h16" />
            </svg>
          </span>
          Shto seksion të menusë
        </div>
        <form onSubmit={onCreateCategory} className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
          <input
            value={newCatName}
            onChange={(e) => setNewCatName(e.target.value)}
            disabled={mutating || sessionExpired}
            placeholder="p.sh. Pizza, Pije, Ëmbëlsira…"
            className="min-w-0 flex-1 rounded-lg border border-[#30363d] bg-[#0d1117] px-4 py-2.5 text-sm text-white placeholder:text-zinc-600 outline-none focus:border-orange-500/50"
          />
          <button
            type="submit"
            disabled={mutating || sessionExpired || !newCatName.trim()}
            className="shrink-0 rounded-lg bg-orange-500 px-5 py-2.5 text-sm font-semibold text-[#0d1117] transition hover:bg-orange-400 disabled:opacity-45"
          >
            Shto seksionin
          </button>
        </form>
      </section>

      {loading ? <p className="text-sm text-zinc-500">Duke ngarkuar menunë…</p> : null}

      {!loading && !sessionExpired && categories.length === 0 ? (
        <p className="rounded-xl border border-dashed border-[#30363d] px-4 py-10 text-center text-sm text-zinc-500">
          Nuk ka seksione ende — shto një më sipër.
        </p>
      ) : null}

      <div className="space-y-3">
        {categories.map((cat) => (
          <MenuSectionAccordion
            key={cat.id}
            category={cat}
            expanded={expandedIds.has(cat.id)}
            busy={mutating || sessionExpired}
            onToggle={() => toggleExpanded(cat.id)}
            onEditSection={() => setEditSectionId(cat.id)}
            onDeleteSection={() => void removeSection(cat.id)}
            onAddItem={() => setItemModal({ mode: 'create', categoryId: cat.id })}
            onEditItem={(it) => setItemModal({ mode: 'edit', item: it })}
            onDeleteItem={(id) => void removeItem(id)}
            onToggleAvailable={(it) => void toggleItemAvailable(it)}
            onToggleFeatured={(it) => void toggleItemFeatured(it)}
          />
        ))}
      </div>

      <MenuHelpBox />

      {editSection ? (
        <MenuSectionEditModal
          open
          categoryName={editSection.name}
          sortOrder={editSection.sortOrder}
          itemCount={editSection.items.length}
          busy={mutating}
          onClose={() => setEditSectionId(null)}
          onSave={(name, order) => void saveSection(name, order)}
          onDelete={
            editSection.items.length === 0
              ? () => void removeSection(editSection.id)
              : undefined
          }
        />
      ) : null}

      {itemModal && itemModalMeta ? (
        <MenuItemFormModal
          open
          title={itemModalMeta.title}
          busy={mutating}
          initial={itemModalMeta.initial}
          imageUrl={itemModalMeta.imageUrl}
          showRemoveImage={itemModalMeta.showRemoveImage}
          onClose={() => setItemModal(null)}
          onSave={(v) => void saveItemFromModal(v)}
          onRemoveImage={
            itemModal.mode === 'edit' ? () => void removeItemImageFromModal() : undefined
          }
        />
      ) : null}
    </div>
  )
}

function readExpandedStorage(): number | null {
  try {
    const v = localStorage.getItem(EXPANDED_KEY)
    if (!v) return null
    const n = parseInt(v, 10)
    return Number.isFinite(n) ? n : null
  } catch {
    return null
  }
}

function writeExpandedStorage(catId: number) {
  try {
    localStorage.setItem(EXPANDED_KEY, String(catId))
  } catch {
    /* ignore */
  }
}
