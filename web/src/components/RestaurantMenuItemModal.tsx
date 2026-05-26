import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { apiPath } from '../lib/apiBase'
import { imageUrlForFoodCategory } from '../lib/categoryBrowseImages'
import { rdYellow } from '../lib/restaurantDetailTheme'
import type { MenuItemWithMeta } from '../lib/restaurantDetailUi'
import { saucesForMenuItem, showSizeOptions } from '../lib/menuItemExtras'

export type MenuItemModalAddPayload = {
  quantity: number
  unitPrice: number
  lineName: string
}

type SizeId = 'small' | 'medium'

/** Vetëm dy porosi — pa «E madhe», si në mockup-in tënd. */
const SIZES: { id: SizeId; label: string; extra: number }[] = [
  { id: 'small', label: 'E vogël', extra: 0 },
  { id: 'medium', label: 'Mesatare', extra: 0.5 },
]

function money(n: number): string {
  return (Number.isFinite(n) ? n : 0).toFixed(2)
}

type Props = {
  item: MenuItemWithMeta
  categoryName: string
  averageRating: number
  reviewCount: number
  onClose: () => void
  onAdd: (payload: MenuItemModalAddPayload) => void
}

type ShellProps = {
  item: MenuItemWithMeta | null
  categoryName: string
  averageRating: number
  reviewCount: number
  onClose: () => void
  onAdd: (payload: MenuItemModalAddPayload) => void
}

export function RestaurantMenuItemModal({
  item,
  categoryName,
  averageRating,
  reviewCount,
  onClose,
  onAdd,
}: ShellProps) {
  if (!item) return null
  return createPortal(
    <RestaurantMenuItemModalContent
      item={item}
      categoryName={categoryName}
      averageRating={averageRating}
      reviewCount={reviewCount}
      onClose={onClose}
      onAdd={onAdd}
    />,
    document.body,
  )
}

function RestaurantMenuItemModalContent({
  item,
  categoryName,
  averageRating,
  reviewCount,
  onClose,
  onAdd,
}: Props) {
  const [size, setSize] = useState<SizeId>('medium')
  const [addonIds, setAddonIds] = useState<Set<string>>(new Set())
  const [qty, setQty] = useState(1)

  const basePrice = Number(item.price) || 0
  const hasSizes = showSizeOptions(item.name)
  const sauces = useMemo(
    () => saucesForMenuItem(item.name, categoryName),
    [item.name, categoryName],
  )

  useEffect(() => {
    setSize('medium')
    setAddonIds(new Set())
    setQty(1)
  }, [item.id])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [onClose])

  const sizeExtra = hasSizes ? (SIZES.find((s) => s.id === size)?.extra ?? 0) : 0
  const saucesTotal = sauces.filter((a) => addonIds.has(a.id)).reduce((s, a) => s + a.price, 0)
  const unitPrice = basePrice + sizeExtra + saucesTotal
  const lineTotal = unitPrice * qty

  const sizeLabel = SIZES.find((s) => s.id === size)?.label ?? ''
  const sauceLabels = sauces.filter((a) => addonIds.has(a.id)).map((a) => a.label)
  const modifierParts = [
    hasSizes && size !== 'medium' ? sizeLabel : null,
    ...sauceLabels,
  ].filter(Boolean)
  const lineName =
    modifierParts.length > 0 ? `${item.name} (${modifierParts.join(', ')})` : item.name

  const img = item.imageUrl ? apiPath(item.imageUrl) : imageUrlForFoodCategory(categoryName)
  const ratingLabel =
    averageRating > 0
      ? `★ ${averageRating.toFixed(1)}${reviewCount > 0 ? ` (${reviewCount}+ vlerësime)` : ''}`
      : null

  function toggleAddon(id: string) {
    setAddonIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center bg-black/75 p-3 backdrop-blur-sm sm:p-4"
      role="presentation"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal
        aria-labelledby="menu-item-modal-title"
        className="flex max-h-[min(94vh,900px)] w-full max-w-[400px] flex-col overflow-hidden rounded-2xl border border-white/[0.12] bg-[#141a28] shadow-[0_32px_80px_-20px_rgba(0,0,0,0.7)] sm:max-w-[420px]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative h-48 shrink-0 overflow-hidden bg-[#0c0e14] sm:h-56">
          <img src={img} alt="" className="h-full w-full object-cover" />
          <button
            type="button"
            onClick={onClose}
            className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-black/60 text-lg text-white backdrop-blur-sm hover:bg-black/75"
            aria-label="Mbyll"
          >
            ×
          </button>
        </div>

        {/* Trupi — scroll */}
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          <div className="border-b border-white/[0.06] px-4 py-4 sm:px-5">
            <h2 id="menu-item-modal-title" className="text-lg font-bold leading-snug text-white sm:text-xl">
              {item.name}
            </h2>
            <p className="mt-1 text-lg font-bold tabular-nums" style={{ color: rdYellow }}>
              {money(basePrice)} €
            </p>

            {item.displayDescription ? (
              <p className="mt-2 text-sm leading-relaxed text-zinc-400">{item.displayDescription}</p>
            ) : null}

            {ratingLabel ? (
              <p className="mt-2 text-sm font-medium" style={{ color: rdYellow }}>
                {ratingLabel}
              </p>
            ) : null}

            {!item.isAvailable ? (
              <p className="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                Ky artikull nuk është në dispozicion për momentin.
              </p>
            ) : null}
          </div>

          <div className="space-y-5 px-4 py-4 sm:px-5">
              {hasSizes ? (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Madhësia</p>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {SIZES.map((s) => {
                    const active = size === s.id
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => setSize(s.id)}
                        className={`flex w-full items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-semibold transition ${
                          active
                            ? 'border-[#F5B800]/60 bg-[#F5B800]/15 text-[#F5B800]'
                            : 'border-white/[0.1] bg-white/[0.04] text-zinc-300 hover:border-white/20'
                        }`}
                      >
                        {active ? (
                          <span
                            className="flex h-4 w-4 items-center justify-center rounded-full text-[10px] text-[#0c0e14]"
                            style={{ backgroundColor: rdYellow }}
                            aria-hidden
                          >
                            ✓
                          </span>
                        ) : (
                          <span className="h-4 w-4 rounded-full border border-white/20" aria-hidden />
                        )}
                        {s.label}
                        {s.extra > 0 ? (
                          <span className="text-xs font-normal text-zinc-500">+{money(s.extra)} €</span>
                        ) : null}
                      </button>
                    )
                  })}
                </div>
              </div>
              ) : null}

              {sauces.length > 0 ? (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                    Sosat (opsionale)
                  </p>
                  <ul className="mt-2 space-y-1.5">
                    {sauces.map((a) => (
                      <li key={a.id}>
                        <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2.5 transition hover:border-white/[0.14]">
                          <input
                            type="checkbox"
                            checked={addonIds.has(a.id)}
                            onChange={() => toggleAddon(a.id)}
                            className="h-4 w-4 rounded border-white/25 accent-[#F5B800]"
                          />
                          <span className="flex-1 text-sm text-zinc-200">{a.label}</span>
                          <span className="text-sm tabular-nums text-zinc-500">
                            {a.price > 0 ? `+${money(a.price)} €` : 'Falas'}
                          </span>
                        </label>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

            <aside className="rounded-xl border border-white/[0.08] bg-[#0f121c]/80 px-3 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Përmbledhje</p>
              <dl className="mt-2 space-y-1.5 text-sm">
                <div className="flex justify-between gap-2 text-zinc-400">
                  <dt className="truncate pr-2">{item.name}</dt>
                  <dd className="shrink-0 tabular-nums text-zinc-300">{money(basePrice)} €</dd>
                </div>
                {sizeExtra > 0 ? (
                  <div className="flex justify-between gap-2 text-zinc-500">
                    <dt>{sizeLabel}</dt>
                    <dd className="tabular-nums">+{money(sizeExtra)} €</dd>
                  </div>
                ) : null}
                {sauces
                  .filter((a) => addonIds.has(a.id))
                  .map((a) => (
                    <div key={a.id} className="flex justify-between gap-2 text-zinc-500">
                      <dt className="truncate pr-2">{a.label}</dt>
                      <dd className="shrink-0 tabular-nums">
                        {a.price > 0 ? `+${money(a.price)} €` : 'Falas'}
                      </dd>
                    </div>
                  ))}
                {qty > 1 ? (
                  <div className="flex justify-between gap-2 text-zinc-500">
                    <dt>Sasia ×{qty}</dt>
                    <dd className="tabular-nums">{money(unitPrice)} € / copë</dd>
                  </div>
                ) : null}
              </dl>
              <div className="mt-3 flex justify-between border-t border-white/[0.08] pt-2.5 text-sm font-bold text-white">
                <span>Gjithsej</span>
                <span className="tabular-nums" style={{ color: rdYellow }}>
                  {money(lineTotal)} €
                </span>
              </div>
            </aside>
          </div>
        </div>

        {/* Footer — gjithmonë i dukshëm */}
        <div className="shrink-0 space-y-3 border-t border-white/[0.08] bg-[#121820] px-4 py-4 sm:px-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Sasia</span>
            <div className="inline-flex items-center rounded-xl border border-white/[0.12] bg-[#0c0e14]">
              <button
                type="button"
                onClick={() => setQty((q) => Math.max(1, q - 1))}
                className="px-4 py-2 text-lg text-zinc-300 hover:text-white"
                aria-label="Zvogëlo sasinë"
              >
                −
              </button>
              <span className="min-w-[2.5rem] text-center text-sm font-bold text-white">{qty}</span>
              <button
                type="button"
                onClick={() => setQty((q) => q + 1)}
                className="px-4 py-2 text-lg text-zinc-300 hover:text-white"
                aria-label="Rrit sasinë"
              >
                +
              </button>
            </div>
          </div>

          <button
            type="button"
            disabled={!item.isAvailable}
            onClick={() => {
              onAdd({ quantity: qty, unitPrice, lineName })
              onClose()
            }}
            className="flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-bold text-[#0c0e14] transition hover:brightness-105 disabled:opacity-45"
            style={{ backgroundColor: rdYellow }}
          >
            Shto në shportë
            <span className="opacity-80">•</span>
            <span className="tabular-nums">{money(lineTotal)} €</span>
          </button>
        </div>
      </div>
    </div>
  )
}
