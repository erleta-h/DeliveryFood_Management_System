/**
 * Tema e çelët vetëm për /admin — sfond i bardhë / gri i lehtë, karta të bardha.
 * Emrat e eksporteve përputhen me customerTheme që faqet admin të importojnë këtu.
 */

export const customerShellBg = 'min-h-screen bg-[#f5f6f8] text-gray-900 antialiased font-sans'

export const customerCard =
  'rounded-2xl border border-gray-200 bg-white p-6 text-gray-900 shadow-sm sm:rounded-2xl sm:p-8'

export const customerCardMuted =
  'rounded-xl border border-gray-200 bg-white p-4 text-gray-800 shadow-sm sm:p-5'

export const customerPanelSubtitle = 'mt-1 text-sm leading-relaxed text-gray-500'

export const customerLabelSm =
  'text-[11px] font-semibold uppercase tracking-[0.08em] text-gray-500'

export const customerValueLg = 'mt-0.5 text-base font-semibold text-gray-900'

export const customerInfoRow = 'border-b border-gray-200 py-2.5 text-sm text-gray-800 last:border-0'

export const customerField =
  'mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 [color-scheme:light]'

export const customerSelect =
  'mt-1 w-full cursor-pointer rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 [color-scheme:light]'

/** Select/input brenda rreshtit të listës (pa margin-top) */
export const adminFieldInline =
  'rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-sm text-gray-900 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 [color-scheme:light]'

export const customerLabelForm =
  'mb-1.5 block text-[11px] font-semibold uppercase leading-snug tracking-[0.06em] text-gray-500'

export const customerFieldPartner =
  'mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20'

export const customerBtnPrimary =
  'rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-violet-700 disabled:opacity-40'

export const customerBtnGhost =
  'rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:border-gray-400 hover:bg-gray-50 disabled:opacity-40'

export const customerBtnGhostSm =
  'rounded-lg border border-gray-300 bg-white px-2 py-1 text-xs font-medium text-gray-600 transition hover:bg-gray-50 disabled:opacity-40'

export const customerTextMuted = 'text-gray-500'

/** Titull faqeje admin */
export const adminPageTitle = 'text-2xl font-semibold text-gray-900'

/** Tabelë / listë */
export const adminTableWrap = 'overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm'

export const adminTableHead = 'bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500'

export const adminTableRow = 'border-t border-gray-100 text-sm text-gray-800 hover:bg-gray-50/80'

export const adminErrorBanner =
  'rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800'

export const adminSuccessBanner =
  'rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800'

/** Buton filtri (Të gjithë / Aktiv / …) — si te faqja Delivera */
export function adminFilterBtn(active: boolean) {
  return [
    'rounded-lg px-3 py-2 text-sm font-medium transition',
    active
      ? 'bg-violet-600 text-white shadow-sm'
      : 'border border-gray-300 bg-white text-gray-600 hover:border-gray-400 hover:bg-gray-50',
  ].join(' ')
}
