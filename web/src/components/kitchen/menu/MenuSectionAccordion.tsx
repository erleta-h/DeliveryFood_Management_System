import type { KitchenMenuCategoryRow, KitchenMenuItemRow } from '../../../lib/kitchenMenuApi'
import { apiPath } from '../../../lib/apiBase'
import { MenuSectionIcon } from './menuSectionIcon'

type Props = {
  category: KitchenMenuCategoryRow
  expanded: boolean
  busy: boolean
  onToggle: () => void
  onEditSection: () => void
  onDeleteSection: () => void
  onAddItem: () => void
  onEditItem: (item: KitchenMenuItemRow) => void
  onDeleteItem: (itemId: number) => void
  onToggleAvailable: (item: KitchenMenuItemRow) => void
  onToggleFeatured: (item: KitchenMenuItemRow) => void
}

const ghostBtn =
  'inline-flex items-center gap-1.5 rounded-lg border border-[#30363d] bg-[#21262d] px-2.5 py-1.5 text-xs font-medium text-zinc-200 transition hover:bg-[#30363d] disabled:opacity-45'

export function MenuSectionAccordion({
  category,
  expanded,
  busy,
  onToggle,
  onEditSection,
  onDeleteSection,
  onAddItem,
  onEditItem,
  onDeleteItem,
  onToggleAvailable,
  onToggleFeatured,
}: Props) {
  const count = category.items.length

  return (
    <section className="overflow-hidden rounded-xl border border-[#30363d] bg-[#161b22] ring-1 ring-[#21262d]">
      <div className="flex flex-wrap items-center gap-2 border-b border-[#30363d] px-4 py-3">
        <button
          type="button"
          onClick={onToggle}
          className="flex min-w-0 flex-1 items-center gap-3 text-left"
          aria-expanded={expanded}
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#21262d] text-orange-400/90">
            <MenuSectionIcon name={category.name} />
          </span>
          <span className="min-w-0 truncate text-[15px] font-semibold text-white">
            {category.name}{' '}
            <span className="font-normal text-zinc-500">
              ({count} {count === 1 ? 'artikull' : 'artikuj'})
            </span>
          </span>
          <svg
            className={`ml-auto h-5 w-5 shrink-0 text-zinc-500 transition ${expanded ? 'rotate-180' : ''}`}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        </button>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" disabled={busy} onClick={onEditSection} className={ghostBtn}>
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
            </svg>
            Ndrysho seksionin
          </button>
          <button
            type="button"
            disabled={busy || count > 0}
            onClick={onDeleteSection}
            title={count > 0 ? 'Zbraze artikujt së pari' : 'Fshi seksionin'}
            className="inline-flex items-center gap-1.5 rounded-lg border border-red-500/30 bg-red-500/10 px-2.5 py-1.5 text-xs font-medium text-red-300 transition hover:bg-red-500/15 disabled:opacity-35"
          >
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />
            </svg>
            Fshij seksionin
          </button>
        </div>
      </div>

      {expanded ? (
        <div className="px-4 pb-4">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[40rem] text-left text-sm">
              <thead>
                <tr className="border-b border-[#30363d] text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                  <th className="w-14 py-3 pr-2" aria-hidden />
                  <th className="py-3 pr-2">Artikulli</th>
                  <th className="w-24 py-3 pr-2">Çmimi (€)</th>
                  <th className="w-28 py-3 pr-2">Në ofertë</th>
                  <th className="w-32 py-3 pr-2">Preferuar</th>
                  <th className="w-36 py-3 text-right">Veprime</th>
                </tr>
              </thead>
              <tbody>
                {count === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-sm text-zinc-500">
                      Nuk ka artikuj — shto artikullin më poshtë.
                    </td>
                  </tr>
                ) : (
                  category.items.map((it) => (
                    <tr key={it.id} className="border-b border-[#21262d] last:border-0">
                      <td className="py-3 pr-2 align-middle">
                        {it.imageUrl ? (
                          <img
                            src={apiPath(it.imageUrl)}
                            alt=""
                            className="h-11 w-11 rounded-full border border-[#30363d] object-cover"
                          />
                        ) : (
                          <div
                            className="h-11 w-11 rounded-full border border-dashed border-[#30363d] bg-[#0d1117]"
                            aria-hidden
                          />
                        )}
                      </td>
                      <td className="py-3 pr-2">
                        <p className="font-medium text-white">{it.name}</p>
                        {it.description ? (
                          <p className="mt-0.5 line-clamp-2 text-xs text-zinc-500">{it.description}</p>
                        ) : null}
                      </td>
                      <td className="py-3 pr-2 tabular-nums text-zinc-200">{it.price.toFixed(2)}</td>
                      <td className="py-3 pr-2">
                        <label className="inline-flex cursor-pointer items-center gap-2 text-xs text-zinc-300">
                          <input
                            type="checkbox"
                            checked={it.isAvailable}
                            disabled={busy}
                            onChange={() => onToggleAvailable(it)}
                            className="h-4 w-4 rounded accent-sky-500"
                            title="Po = klienti e sheh në menu"
                          />
                          <span className={it.isAvailable ? 'text-sky-300' : 'text-zinc-500'}>
                            {it.isAvailable ? 'Po' : 'Jo'}
                          </span>
                        </label>
                      </td>
                      <td className="py-3 pr-2">
                        <label className="inline-flex cursor-pointer items-center gap-2 text-xs text-zinc-300">
                          <input
                            type="checkbox"
                            checked={it.isFeatured}
                            disabled={busy}
                            onChange={() => onToggleFeatured(it)}
                            className="h-4 w-4 rounded accent-violet-500"
                            title="Po = shfaqet te «Të preferuarat» për klientin"
                          />
                          <span className={it.isFeatured ? 'text-violet-300' : 'text-zinc-500'}>
                            {it.isFeatured ? 'Po' : 'Jo'}
                          </span>
                        </label>
                      </td>
                      <td className="py-3 text-right">
                        <div className="flex justify-end gap-1.5">
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => onEditItem(it)}
                            className={ghostBtn}
                          >
                            Ndrysho
                          </button>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => onDeleteItem(it.id)}
                            className="inline-flex items-center gap-1 rounded-lg border border-red-500/30 bg-red-500/10 px-2.5 py-1.5 text-xs font-medium text-red-300 hover:bg-red-500/15 disabled:opacity-45"
                          >
                            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                              <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />
                            </svg>
                            Fshij
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={onAddItem}
            className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-orange-500/50 bg-orange-500/10 py-2.5 text-sm font-semibold text-orange-300 transition hover:bg-orange-500/15 disabled:opacity-45 sm:w-auto sm:px-5"
          >
            <span className="text-lg leading-none" aria-hidden>
              +
            </span>
            Shto artikull
          </button>
        </div>
      ) : null}
    </section>
  )
}
