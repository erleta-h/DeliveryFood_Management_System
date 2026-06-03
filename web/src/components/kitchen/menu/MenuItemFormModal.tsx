import { useEffect, useState, type FormEvent } from 'react'
import { apiPath } from '../../../lib/apiBase'

export type MenuItemFormValues = {
  name: string
  price: string
  description: string
  isAvailable: boolean
  imageFile: File | null
}

type Props = {
  open: boolean
  title: string
  busy: boolean
  initial: MenuItemFormValues
  imageUrl?: string | null
  showRemoveImage?: boolean
  onClose: () => void
  onSave: (values: MenuItemFormValues) => void
  onRemoveImage?: () => void
}

const fieldClass =
  'w-full rounded-lg border border-[#30363d] bg-[#0d1117] px-3 py-2.5 text-sm text-white outline-none focus:border-orange-500/50'

export function MenuItemFormModal({
  open,
  title,
  busy,
  initial,
  imageUrl,
  showRemoveImage,
  onClose,
  onSave,
  onRemoveImage,
}: Props) {
  const [form, setForm] = useState<MenuItemFormValues>(initial)

  useEffect(() => {
    if (open) setForm(initial)
  }, [open, initial])

  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  function submit(e: FormEvent) {
    e.preventDefault()
    onSave(form)
  }

  const previewSrc = form.imageFile ? URL.createObjectURL(form.imageFile) : imageUrl ? apiPath(imageUrl) : null

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/60 p-4" role="presentation">
      <button type="button" className="absolute inset-0" aria-label="Mbyll" onClick={onClose} />
      <div
        role="dialog"
        aria-modal
        aria-labelledby="menu-item-form-title"
        className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-[#30363d] bg-[#161b22] p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="menu-item-form-title" className="text-lg font-bold text-white">
          {title}
        </h2>
        <form onSubmit={submit} className="mt-4 space-y-4">
          <div>
            <label htmlFor="item-name" className="text-xs font-medium text-zinc-500">
              Emri i artikullit
            </label>
            <input
              id="item-name"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              disabled={busy}
              className={`${fieldClass} mt-1.5`}
              placeholder="p.sh. Margherita"
            />
          </div>
          <div>
            <label htmlFor="item-price" className="text-xs font-medium text-zinc-500">
              Çmimi (€)
            </label>
            <input
              id="item-price"
              value={form.price}
              onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
              disabled={busy}
              className={`${fieldClass} mt-1.5`}
              placeholder="7.50"
            />
          </div>
          <div>
            <label htmlFor="item-desc" className="text-xs font-medium text-zinc-500">
              Përshkrim (opsional)
            </label>
            <textarea
              id="item-desc"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              disabled={busy}
              rows={3}
              className={`${fieldClass} mt-1.5 min-h-[4rem] resize-y`}
              placeholder="Salcë domate, mocarela…"
            />
          </div>
          <label className="flex cursor-pointer items-center gap-2.5 text-sm text-zinc-200">
            <input
              type="checkbox"
              checked={form.isAvailable}
              disabled={busy}
              onChange={(e) => setForm((f) => ({ ...f, isAvailable: e.target.checked }))}
              className="h-4 w-4 rounded border-[#30363d] accent-sky-500"
            />
            <span>
              Në ofertë{' '}
              <span className="text-zinc-500">(klienti e sheh në menu)</span>
            </span>
          </label>
          <div>
            <label className="text-xs font-medium text-zinc-500">Foto (opsionale)</label>
            {previewSrc ? (
              <img src={previewSrc} alt="" className="mt-2 h-20 w-20 rounded-lg border border-[#30363d] object-cover" />
            ) : null}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              disabled={busy}
              className="mt-2 block w-full text-xs text-zinc-400 file:mr-2 file:rounded-lg file:border-0 file:bg-[#21262d] file:px-3 file:py-1.5 file:text-zinc-100"
              onChange={(e) => {
                const f = e.target.files?.[0] ?? null
                setForm((x) => ({ ...x, imageFile: f }))
              }}
            />
            {showRemoveImage && imageUrl && !form.imageFile && onRemoveImage ? (
              <button
                type="button"
                disabled={busy}
                onClick={onRemoveImage}
                className="mt-2 text-xs text-red-300 hover:text-red-200"
              >
                Hiq foton aktuale
              </button>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-2 pt-1">
            <button
              type="submit"
              disabled={busy || !form.name.trim()}
              className="rounded-lg bg-orange-500 px-4 py-2.5 text-sm font-semibold text-[#0d1117] hover:bg-orange-400 disabled:opacity-45"
            >
              {busy ? 'Duke ruajtur…' : 'Ruaj'}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={busy}
              className="rounded-lg border border-[#30363d] px-4 py-2.5 text-sm text-zinc-300 hover:bg-[#21262d]"
            >
              Anulo
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
