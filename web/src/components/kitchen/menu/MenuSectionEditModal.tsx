import { useEffect, useState, type FormEvent } from 'react'

type Props = {
  open: boolean
  categoryName: string
  sortOrder: number
  itemCount: number
  busy: boolean
  onClose: () => void
  onSave: (name: string, sortOrder: number) => void
  onDelete?: () => void
}

export function MenuSectionEditModal({
  open,
  categoryName,
  sortOrder,
  itemCount,
  busy,
  onClose,
  onSave,
  onDelete,
}: Props) {
  const [name, setName] = useState(categoryName)
  const [order, setOrder] = useState(String(sortOrder))

  useEffect(() => {
    if (!open) return
    setName(categoryName)
    setOrder(String(sortOrder))
  }, [open, categoryName, sortOrder])

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
    const sortNum = parseInt(order, 10)
    if (!name.trim() || !Number.isFinite(sortNum)) return
    onSave(name.trim(), sortNum)
  }

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/60 p-4" role="presentation">
      <button type="button" className="absolute inset-0" aria-label="Mbyll" onClick={onClose} />
      <div
        role="dialog"
        aria-modal
        aria-labelledby="edit-section-title"
        className="relative w-full max-w-md rounded-xl border border-[#30363d] bg-[#161b22] p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="edit-section-title" className="text-lg font-bold text-white">
          Ndrysho seksionin
        </h2>
        <form onSubmit={submit} className="mt-4 space-y-4">
          <div>
            <label htmlFor="section-name" className="text-xs font-medium text-zinc-500">
              Emri i seksionit
            </label>
            <input
              id="section-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={busy}
              className="mt-1.5 w-full rounded-lg border border-[#30363d] bg-[#0d1117] px-3 py-2.5 text-sm text-white outline-none focus:border-orange-500/50"
            />
          </div>
          <div>
            <label htmlFor="section-order" className="text-xs font-medium text-zinc-500">
              Renditja (numër më i vogël = më lart në menu)
            </label>
            <input
              id="section-order"
              type="number"
              value={order}
              onChange={(e) => setOrder(e.target.value)}
              disabled={busy}
              className="mt-1.5 w-full rounded-lg border border-[#30363d] bg-[#0d1117] px-3 py-2.5 text-sm text-white outline-none focus:border-orange-500/50"
            />
          </div>
          <div className="flex flex-wrap gap-2 pt-1">
            <button
              type="submit"
              disabled={busy || !name.trim()}
              className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-[#0d1117] hover:bg-orange-400 disabled:opacity-45"
            >
              Ruaj
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={busy}
              className="rounded-lg border border-[#30363d] px-4 py-2 text-sm text-zinc-300 hover:bg-[#21262d]"
            >
              Anulo
            </button>
            {onDelete && itemCount === 0 ? (
              <button
                type="button"
                disabled={busy}
                onClick={onDelete}
                className="ml-auto rounded-lg border border-red-500/40 px-4 py-2 text-sm font-medium text-red-300 hover:bg-red-500/10"
              >
                Fshij seksionin
              </button>
            ) : null}
          </div>
          {itemCount > 0 ? (
            <p className="text-xs text-zinc-500">Seksioni me artikuj nuk fshihet — zbraze artikujt së pari.</p>
          ) : null}
        </form>
      </div>
    </div>
  )
}
