import { type FormEvent, useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
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
import { apiPath } from '../lib/apiBase'
import { isKitchenHttpUnauthorized } from '../lib/kitchenApi'
import {
  customerBtnGhost,
  customerBtnPrimary,
  customerCard,
  customerCardMuted,
  customerField,
  customerLabelSm,
  customerPanelSubtitle,
} from '../lib/customerTheme'
import { useAuthStore } from '../store/authStore'

export default function KitchenMenuPage() {
  const token = useAuthStore((s) => s.token)
  const [categories, setCategories] = useState<KitchenMenuCategoryRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sessionExpired, setSessionExpired] = useState(false)
  const [flash, setFlash] = useState<string | null>(null)
  const [mutating, setMutating] = useState(false)

  const [newCatName, setNewCatName] = useState('')
  const [catDraft, setCatDraft] = useState<Record<number, { name: string; sortOrder: string }>>({})
  const [itemDraft, setItemDraft] = useState<
    Record<
      number,
      { name: string; price: string; description: string; expanded: boolean; newImageFile?: File }
    >
  >({})
  const [newItem, setNewItem] = useState<
    Record<number, { name: string; price: string; description: string; imageFile: File | null }>
  >({})

  const load = useCallback(async () => {
    if (!token) return
    setError(null)
    setSessionExpired(false)
    try {
      const data = await fetchKitchenMenu(token)
      setCategories(data)
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

  async function onCreateCategory(e: FormEvent) {
    e.preventDefault()
    if (!token || !newCatName.trim()) return
    const r = await run(async () => {
      const x = await createKitchenCategory(token, { name: newCatName.trim() })
      if (!x.ok) return x
      setNewCatName('')
      setFlash('Kategoria u shtua.')
      await load()
      return x
    })
    if (r && 'ok' in r && !r.ok) setError(r.message)
  }

  async function saveCategory(catId: number) {
    if (!token) return
    const orig = categories.find((c) => c.id === catId)
    if (!orig) return
    const d = catDraft[catId] ?? { name: orig.name, sortOrder: String(orig.sortOrder) }
    const sortNum = parseInt(d.sortOrder, 10)
    const body: { name?: string; sortOrder?: number } = {}
    if (d.name.trim() !== orig.name) body.name = d.name.trim()
    if (Number.isFinite(sortNum) && sortNum !== orig.sortOrder) body.sortOrder = sortNum
    if (Object.keys(body).length === 0) {
      setFlash('Nuk ka ndryshime.')
      return
    }
    const r = await run(async () => updateKitchenCategory(token, catId, body))
    if (r && !r.ok) setError(r.message)
    else {
      setFlash('Kategoria u përditësua.')
      await load()
    }
  }

  async function removeCategory(catId: number, itemCount: number) {
    if (!token || itemCount > 0) return
    if (!window.confirm('Fshi kategorinë bosh?')) return
    const r = await run(async () => deleteKitchenCategory(token, catId))
    if (r && !r.ok) setError(r.message)
    else {
      setFlash('Kategoria u fshi.')
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

  async function saveItem(itemId: number) {
    if (!token) return
    const d = itemDraft[itemId]
    if (!d) return
    const price = parseFloat(d.price.replace(',', '.'))
    const body: { name?: string; description?: string | null; price?: number } = {}
    const orig = categories.flatMap((c) => c.items).find((i) => i.id === itemId)
    if (!orig) return
    if (d.name.trim() !== orig.name) body.name = d.name.trim()
    if (d.description !== (orig.description ?? ''))
      body.description = d.description.trim() === '' ? null : d.description.trim()
    if (Number.isFinite(price) && price !== orig.price) body.price = price
    const hasNewImage = d.newImageFile instanceof File
    if (Object.keys(body).length === 0 && !hasNewImage) {
      setFlash('Nuk ka ndryshime te artikulli.')
      return
    }
    const r = await run(async () => {
      if (Object.keys(body).length > 0) {
        const up = await updateKitchenMenuItem(token, itemId, body)
        if (!up.ok) return up
      }
      if (hasNewImage) {
        const im = await uploadKitchenMenuItemImage(token, itemId, d.newImageFile!)
        if (!im.ok) return im
      }
      return { ok: true as const }
    })
    if (r && !r.ok) setError(r.message)
    else {
      setFlash('Artikulli u përditësua.')
      setItemDraft((x) => {
        const n = { ...x }
        delete n[itemId]
        return n
      })
      await load()
    }
  }

  async function clearItemImage(itemId: number) {
    if (!token) return
    if (!window.confirm('Hiq foton e artikullit?')) return
    const r = await run(async () => deleteKitchenMenuItemImage(token, itemId))
    if (r && !r.ok) setError(r.message)
    else {
      setFlash('Fotoja u hoq.')
      await load()
    }
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

  async function onCreateItem(catId: number) {
    if (!token) return
    const raw = newItem[catId] ?? { name: '', price: '', description: '', imageFile: null }
    const name = raw.name.trim()
    const price = parseFloat(raw.price.replace(',', '.'))
    const file = raw.imageFile
    if (!name || !Number.isFinite(price) || price < 0) {
      setError('Për artikull të ri: emër dhe çmim të vlefshëm.')
      return
    }
    try {
      const r = await run(async () => {
        const created = await createKitchenMenuItem(token, {
          menuCategoryId: catId,
          name,
          price,
          description: raw.description.trim() || null,
          isAvailable: true,
        })
        if (!created.ok) return created
        if (file) {
          const im = await uploadKitchenMenuItemImage(token, created.id, file)
          if (!im.ok) return { ok: false as const, message: im.message, itemCreated: true as const, itemId: created.id }
        }
        return { ok: true as const }
      })
      if (r && !r.ok) {
        if ('itemCreated' in r && r.itemCreated) {
          setNewItem((n) => ({ ...n, [catId]: { name: '', price: '', description: '', imageFile: null } }))
          setFlash('Artikulli u shtua, por fotoja nuk u ngarkua.')
          setError(`Foto: ${r.message}. Mund ta ngarkosh te «Ndrysho» te artikulli.`)
          await load()
          return
        }
        setError(r.message)
        return
      }
      setNewItem((n) => ({ ...n, [catId]: { name: '', price: '', description: '', imageFile: null } }))
      setFlash('Artikulli u shtua.')
      await load()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Gabim gjatë shtimit të artikullit.')
    }
  }

  if (!token) {
    return (
      <section className={customerCard}>
        <p className="text-zinc-400">Duhet të jesh i kyçur.</p>
      </section>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link to="/kitchen/orders" className="text-sm text-amber-400/90 hover:text-amber-300">
            ← Porositë
          </Link>
          <h1 className="mt-2 text-2xl font-bold text-zinc-100">Menuja e restorantit</h1>
          <p className={customerPanelSubtitle}>
            Kategoritë dhe artikujt shfaqen te klientët sipas renditjes. Artikulli me histori porosish nuk fshihet —
            vetëm çaktivizohet.
          </p>
        </div>
        <button
          type="button"
          disabled={mutating || loading || sessionExpired}
          className={`${customerBtnGhost} text-sm`}
          onClick={() => void load().catch((e) => setError(e instanceof Error ? e.message : 'Gabim'))}
        >
          Rifresko listën
        </button>
      </div>

      {sessionExpired ? (
        <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-100">
          Sesioni skadoi — dil dhe hyr përsëri për të vazhuar me menunë.
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

      <section className={customerCardMuted}>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-amber-200/90">Kategori e re</h2>
        <form onSubmit={onCreateCategory} className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end">
          <div className="min-w-0 flex-1">
            <label htmlFor="new-cat" className={customerLabelSm}>
              Emri
            </label>
            <input
              id="new-cat"
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
              className={customerField}
              placeholder="p.sh. Pjata të nxehta"
              disabled={mutating || sessionExpired}
            />
          </div>
          <button
            type="submit"
            disabled={mutating || sessionExpired || !newCatName.trim()}
            className={`${customerBtnPrimary} shrink-0`}
          >
            Shto kategorinë
          </button>
        </form>
      </section>

      {loading ? <p className="text-sm text-zinc-500">Duke ngarkuar menunë…</p> : null}

      {!loading && !sessionExpired && categories.length === 0 ? (
        <p className="text-sm text-zinc-500">Nuk ka kategori ende — krijo një më sipër.</p>
      ) : null}

      <ul className="space-y-5">
        {categories.map((cat) => (
          <li key={cat.id} className={customerCardMuted}>
            <div className="flex flex-col gap-3 border-b border-white/[0.06] pb-3 sm:flex-row sm:items-end sm:justify-between">
              <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-end">
                <div className="min-w-0 flex-1">
                  <label className={customerLabelSm}>Emri i kategorisë</label>
                  <input
                    value={(catDraft[cat.id] ?? { name: cat.name, sortOrder: String(cat.sortOrder) }).name}
                    onChange={(e) =>
                      setCatDraft((d) => ({
                        ...d,
                        [cat.id]: {
                          name: e.target.value,
                          sortOrder: (d[cat.id] ?? { name: cat.name, sortOrder: String(cat.sortOrder) }).sortOrder,
                        },
                      }))
                    }
                    className={customerField}
                    disabled={mutating || sessionExpired}
                  />
                </div>
                <div className="w-full sm:w-24">
                  <label className={customerLabelSm}>Renditja</label>
                  <input
                    type="number"
                    value={(catDraft[cat.id] ?? { name: cat.name, sortOrder: String(cat.sortOrder) }).sortOrder}
                    onChange={(e) =>
                      setCatDraft((d) => ({
                        ...d,
                        [cat.id]: {
                          name: (d[cat.id] ?? { name: cat.name, sortOrder: String(cat.sortOrder) }).name,
                          sortOrder: e.target.value,
                        },
                      }))
                    }
                    className={customerField}
                    disabled={mutating || sessionExpired}
                  />
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={mutating || sessionExpired}
                  className={`${customerBtnPrimary} px-3 py-1.5 text-xs`}
                  onClick={() => void saveCategory(cat.id)}
                >
                  Ruaj kategorinë
                </button>
                <button
                  type="button"
                  disabled={mutating || sessionExpired || cat.items.length > 0}
                  className={`${customerBtnGhost} px-3 py-1.5 text-xs text-red-200 hover:border-red-400/30`}
                  onClick={() => void removeCategory(cat.id, cat.items.length)}
                  title={cat.items.length > 0 ? 'Fshihi artikujt së pari' : ''}
                >
                  Fshi kategorinë
                </button>
              </div>
            </div>

            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[28rem] text-left text-sm text-zinc-300">
                <thead>
                  <tr className="border-b border-white/10 text-xs uppercase text-zinc-500">
                    <th className="w-14 py-2 pr-2">Foto</th>
                    <th className="py-2 pr-2">Artikulli</th>
                    <th className="py-2 pr-2">Çmimi (€)</th>
                    <th className="py-2 pr-2">Në ofertë</th>
                    <th className="py-2 text-right">Veprime</th>
                  </tr>
                </thead>
                <tbody>
                  {cat.items.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-xs text-zinc-600">
                        Nuk ka artikuj — shto më poshtë.
                      </td>
                    </tr>
                  ) : (
                    cat.items.map((it) => {
                      const exp = itemDraft[it.id]?.expanded
                      const d = itemDraft[it.id]
                      return (
                        <tr key={it.id} className="border-b border-white/[0.04] align-top">
                          <td className="py-2 pr-2 align-middle">
                            {it.imageUrl ? (
                              <img
                                src={apiPath(it.imageUrl)}
                                alt=""
                                className="h-12 w-12 rounded-md border border-white/10 object-cover"
                              />
                            ) : (
                              <div
                                className="h-12 w-12 rounded-md border border-dashed border-white/15 bg-black/30"
                                aria-hidden
                              />
                            )}
                          </td>
                          <td className="py-2 pr-2">
                            <p className="font-medium text-zinc-100">{it.name}</p>
                            {it.description ? (
                              <p className="mt-0.5 text-xs text-zinc-500">{it.description}</p>
                            ) : null}
                            {exp ? (
                              <div className="mt-2 space-y-2 rounded-lg border border-white/10 bg-black/20 p-2">
                                <input
                                  value={d?.name ?? it.name}
                                  onChange={(e) =>
                                    setItemDraft((x) => ({
                                      ...x,
                                      [it.id]: {
                                        name: e.target.value,
                                        price: x[it.id]?.price ?? String(it.price),
                                        description: x[it.id]?.description ?? (it.description ?? ''),
                                        expanded: true,
                                        newImageFile: x[it.id]?.newImageFile,
                                      },
                                    }))
                                  }
                                  className={customerField + ' text-xs'}
                                  placeholder="Emri"
                                />
                                <input
                                  value={d?.price ?? String(it.price)}
                                  onChange={(e) =>
                                    setItemDraft((x) => ({
                                      ...x,
                                      [it.id]: {
                                        name: x[it.id]?.name ?? it.name,
                                        price: e.target.value,
                                        description: x[it.id]?.description ?? (it.description ?? ''),
                                        expanded: true,
                                        newImageFile: x[it.id]?.newImageFile,
                                      },
                                    }))
                                  }
                                  className={customerField + ' text-xs'}
                                  placeholder="Çmimi"
                                />
                                <textarea
                                  value={d?.description ?? (it.description ?? '')}
                                  onChange={(e) =>
                                    setItemDraft((x) => ({
                                      ...x,
                                      [it.id]: {
                                        name: x[it.id]?.name ?? it.name,
                                        price: x[it.id]?.price ?? String(it.price),
                                        description: e.target.value,
                                        expanded: true,
                                        newImageFile: x[it.id]?.newImageFile,
                                      },
                                    }))
                                  }
                                  className={customerField + ' min-h-[3rem] text-xs'}
                                  placeholder="Përshkrim (opsional)"
                                  rows={2}
                                />
                                <div>
                                  <label className={customerLabelSm}>Foto (opsionale)</label>
                                  <input
                                    type="file"
                                    accept="image/jpeg,image/png,image/webp,image/gif"
                                    disabled={mutating || sessionExpired}
                                    className="mt-1 block w-full text-[11px] text-zinc-400 file:mr-2 file:rounded file:border-0 file:bg-zinc-700 file:px-2 file:py-1 file:text-zinc-100"
                                    onChange={(e) => {
                                      const f = e.target.files?.[0]
                                      setItemDraft((x) => ({
                                        ...x,
                                        [it.id]: {
                                          name: x[it.id]?.name ?? it.name,
                                          price: x[it.id]?.price ?? String(it.price),
                                          description: x[it.id]?.description ?? (it.description ?? ''),
                                          expanded: true,
                                          newImageFile: f,
                                        },
                                      }))
                                    }}
                                  />
                                  {d?.newImageFile ? (
                                    <p className="mt-1 text-[10px] text-amber-200/80">
                                      E zgjedhur: {d.newImageFile.name}
                                    </p>
                                  ) : null}
                                  {it.imageUrl && !d?.newImageFile ? (
                                    <button
                                      type="button"
                                      className={`${customerBtnGhost} mt-2 px-2 py-1 text-[10px]`}
                                      disabled={mutating || sessionExpired}
                                      onClick={() => void clearItemImage(it.id)}
                                    >
                                      Hiq foton
                                    </button>
                                  ) : null}
                                </div>
                              </div>
                            ) : null}
                          </td>
                          <td className="py-2 pr-2 whitespace-nowrap">{it.price.toFixed(2)}</td>
                          <td className="py-2 pr-2">
                            <label className="inline-flex cursor-pointer items-center gap-2 text-xs">
                              <input
                                type="checkbox"
                                checked={it.isAvailable}
                                disabled={mutating || sessionExpired}
                                onChange={() => void toggleItemAvailable(it)}
                              />
                              {it.isAvailable ? 'Po' : 'Jo'}
                            </label>
                          </td>
                          <td className="py-2 text-right">
                            <div className="flex flex-wrap justify-end gap-1">
                              <button
                                type="button"
                                className={`${customerBtnGhost} px-2 py-1 text-[11px]`}
                                disabled={mutating || sessionExpired}
                                onClick={() =>
                                  setItemDraft((x) => ({
                                    ...x,
                                    [it.id]: {
                                      name: it.name,
                                      price: String(it.price),
                                      description: it.description ?? '',
                                      expanded: !exp,
                                      newImageFile: undefined,
                                    },
                                  }))
                                }
                              >
                                {exp ? 'Mbyll' : 'Ndrysho'}
                              </button>
                              {exp ? (
                                <button
                                  type="button"
                                  className={`${customerBtnPrimary} px-2 py-1 text-[11px]`}
                                  disabled={mutating || sessionExpired}
                                  onClick={() => void saveItem(it.id)}
                                >
                                  Ruaj
                                </button>
                              ) : null}
                              <button
                                type="button"
                                className={`${customerBtnGhost} px-2 py-1 text-[11px] text-red-200`}
                                disabled={mutating || sessionExpired}
                                onClick={() => void removeItem(it.id)}
                              >
                                Fshi
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>

            <div className="mt-4 rounded-lg border border-amber-500/15 bg-amber-500/[0.04] p-3">
              <p className="text-xs font-medium text-amber-200/90">Artikull i ri në «{cat.name}»</p>
              <div className="mt-2 grid gap-2 sm:grid-cols-3">
                <input
                  value={newItem[cat.id]?.name ?? ''}
                  onChange={(e) =>
                    setNewItem((n) => ({
                      ...n,
                      [cat.id]: {
                        name: e.target.value,
                        price: n[cat.id]?.price ?? '',
                        description: n[cat.id]?.description ?? '',
                        imageFile: n[cat.id]?.imageFile ?? null,
                      },
                    }))
                  }
                  className={customerField + ' text-sm'}
                  placeholder="Emri"
                  disabled={mutating || sessionExpired}
                />
                <input
                  value={newItem[cat.id]?.price ?? ''}
                  onChange={(e) =>
                    setNewItem((n) => ({
                      ...n,
                      [cat.id]: {
                        name: n[cat.id]?.name ?? '',
                        price: e.target.value,
                        description: n[cat.id]?.description ?? '',
                        imageFile: n[cat.id]?.imageFile ?? null,
                      },
                    }))
                  }
                  className={customerField + ' text-sm'}
                  placeholder="Çmimi €"
                  disabled={mutating || sessionExpired}
                />
                <button
                  type="button"
                  disabled={mutating || sessionExpired || !(newItem[cat.id]?.name ?? '').trim()}
                  className={`${customerBtnPrimary} text-sm`}
                  onClick={() => void onCreateItem(cat.id)}
                >
                  {mutating ? 'Duke ruajtur…' : 'Shto artikullin'}
                </button>
              </div>
              <textarea
                value={newItem[cat.id]?.description ?? ''}
                onChange={(e) =>
                  setNewItem((n) => ({
                    ...n,
                    [cat.id]: {
                      name: n[cat.id]?.name ?? '',
                      price: n[cat.id]?.price ?? '',
                      description: e.target.value,
                      imageFile: n[cat.id]?.imageFile ?? null,
                    },
                  }))
                }
                className={`${customerField} mt-2 min-h-[2.5rem] text-sm`}
                placeholder="Përshkrim (opsional)"
                rows={2}
                disabled={mutating || sessionExpired}
              />
              <div className="mt-2">
                <label className={customerLabelSm}>Foto e ushqimit (opsionale)</label>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  disabled={mutating || sessionExpired}
                  className="mt-1 block w-full text-xs text-zinc-400 file:mr-2 file:rounded file:border-0 file:bg-zinc-700 file:px-2 file:py-1 file:text-zinc-100"
                  onChange={(e) => {
                    const f = e.target.files?.[0] ?? null
                    setNewItem((n) => ({
                      ...n,
                      [cat.id]: {
                        name: n[cat.id]?.name ?? '',
                        price: n[cat.id]?.price ?? '',
                        description: n[cat.id]?.description ?? '',
                        imageFile: f,
                      },
                    }))
                  }}
                />
                {newItem[cat.id]?.imageFile ? (
                  <p className="mt-1 text-[11px] text-amber-200/80">
                    {newItem[cat.id]!.imageFile!.name}
                  </p>
                ) : null}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
