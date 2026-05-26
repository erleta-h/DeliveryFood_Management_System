/**
 * ============================================================================
 * STILI I MODULIT TË KLIENTIT (/app) — çfarë është ky skedar?
 * ============================================================================
 * • Faqja e parë (/) përdor sfond gradient të errët dhe karta me “xham” (p.sh. forma e adresës).
 * • Këtu përcaktohet E NJËJTA logjikë për /app: sfondi përputhet me landing, ndërsa
 *   panelet (Shporta, Adresat, Llogaria, …) janë karta të errëta, gjysmë-tejdukshme
 *   me blur — NUK janë më kuti të mëdha të bardha ose kreme.
 *
 * SI PËRDORET (në komponentët e tua):
 * 1) CustomerLayout — vendos `customerShellBg` te div-i më i jashtëm i faqes /app.
 * 2) Çdo faqe (p.sh. CartPage) — seksioni kryesor: `className={customerCard}`.
 * 3) Lista ose përmbledhje brenda kartës: `className={customerCardMuted}`.
 * 4) Buton kryesor (Vazhdo, Ruaj): `customerBtnPrimary`.
 *    Buton dytësor (Anulo, Kthehu): `customerBtnGhost` ose `customerBtnGhostSm`.
 * 5) Input / textarea / select: `className={customerField}`.
 * 6) Titull nëntitull: `customerPanelSubtitle`. Etiketa të vogla: `customerLabelSm`.
 *
 * RËNDËSISHME: Mos përdor tekst me ngjyra të errëta për “letër” (#1e2836, #2c323c)
 * mbi këto panele — ato ishin për kuti të bardha. Përdor `text-zinc-100`, `zinc-300`,
 * ose klasat `customer*` më poshtë.
 * ============================================================================
 */

/** Sfondi i plotë i faqes /app — i njëjti gradient si te LandingPage (faqja e parë). */
export const customerShellBg =
  'min-h-screen antialiased font-sans text-zinc-200/95 [background-image:radial-gradient(ellipse_120%_80%_at_50%_-15%,rgba(251,146,60,0.14)_0%,transparent_50%),radial-gradient(ellipse_90%_70%_at_100%_90%,rgba(234,88,12,0.08)_0%,transparent_45%),radial-gradient(ellipse_70%_50%_at_0%_80%,rgba(95,115,165,0.12)_0%,transparent_48%),linear-gradient(168deg,#1e2233_0%,#1a1d2b_42%,#171820_100%)]'

/**
 * Karta kryesore e faqes (p.sh. “Shporta”, “Adresat”) — xham i errët si karta “Ku ta dërgojmë”.
 * Vendos tekst të çelët (zinc) brenda; default `text-zinc-100` për trashëgiminë nga Tailwind.
 */
export const customerCard =
  'rounded-2xl border border-white/[0.1] bg-[#222636]/80 p-6 text-zinc-100 shadow-[0_20px_56px_-12px_rgba(15,18,30,0.55)] backdrop-blur-md sm:rounded-3xl sm:p-8'

/** Panel i dytë brenda kartës: lista artikujsh, përmbledhje çmimesh, forma e ndarë. */
export const customerCardMuted =
  'rounded-xl border border-white/[0.08] bg-[#1a1f2e]/70 p-4 text-zinc-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] backdrop-blur-sm sm:p-5'

/** Nëntitull poshtë titullit të faqes (p.sh. “Menaxho adresat…”). */
export const customerPanelSubtitle = 'mt-1 text-sm leading-relaxed text-zinc-400'

/** Etiketa të vogla uppercase (PRODUKT, SASIA, …). */
export const customerLabelSm =
  'text-[11px] font-semibold uppercase tracking-[0.08em] text-zinc-500'

/** Vlerë e theksuar (emër produkti, çmim në listë). */
export const customerValueLg = 'mt-0.5 text-base font-semibold text-zinc-100'

/** Rreshta në listën e profilit (Emri, Email, …) me vijë ndarëse. */
export const customerInfoRow = 'border-b border-white/[0.08] py-2.5 text-sm last:border-0'

/** Fushë forme — stili i ngjashëm me inputet e errëta në landing. */
export const customerField =
  'mt-1 w-full rounded-lg border border-white/[0.12] bg-white/[0.06] px-3 py-2 text-sm text-zinc-100 outline-none transition placeholder:text-zinc-500 focus:border-amber-400/40 focus:ring-2 focus:ring-amber-400/15'

/**
 * <select> për tema të errët: sfond i plotë, shigjeta custom, `scheme-dark` për listën e sistemit ku përkrahet.
 * Përdor bashkë me rregullat `.partner-form-select option` në index.css.
 */
export const customerSelect =
  'partner-form-select mt-1 w-full cursor-pointer rounded-lg border border-white/[0.14] px-3 py-2 text-sm text-zinc-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] outline-none transition scheme-dark ' +
  'hover:border-white/20 focus:border-amber-400/45 focus:ring-2 focus:ring-amber-400/18 ' +
  'appearance-none ' +
  '[:disabled]:cursor-not-allowed [:disabled]:opacity-45'

/** Etiketë forme partner — bllok, pa prerje të tekstit në grid. */
export const customerLabelForm =
  'mb-1.5 block text-[11px] font-semibold uppercase leading-snug tracking-[0.06em] text-zinc-400 [overflow-wrap:anywhere]'

/** Input / textarea në të njëjtën famjeje si `customerSelect` (formular partner). */
export const customerFieldPartner =
  'mt-1 w-full rounded-lg border border-white/[0.14] bg-[#1b2233] px-3 py-2 text-sm text-zinc-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] outline-none transition placeholder:text-zinc-500 focus:border-amber-400/45 focus:ring-2 focus:ring-amber-400/18'

/** Veprim kryesor (Vazhdo te pagesa, Ruaj, Konfirmo). */
export const customerBtnPrimary =
  'rounded-lg bg-gradient-to-b from-amber-500 to-amber-700 px-4 py-2 text-sm font-semibold text-zinc-950 shadow-[0_4px_22px_rgba(217,119,6,0.28)] transition hover:from-amber-400 hover:to-amber-600 disabled:opacity-40'

/** Veprim dytësor (Zbraz, Kthehu, Ndrysho në madhësi të madhe). */
export const customerBtnGhost =
  'rounded-lg border border-white/[0.14] bg-white/[0.05] px-4 py-2 text-sm font-medium text-zinc-200 transition hover:border-amber-400/25 hover:bg-amber-500/10 hover:text-amber-50 disabled:opacity-40'

/** Buton i vogël në lista (Ndrysho, Hiq të vogël). */
export const customerBtnGhostSm =
  'rounded-lg border border-white/[0.12] bg-white/[0.04] px-2 py-1 text-xs font-medium text-zinc-300 transition hover:bg-white/[0.08] disabled:opacity-40'

/** Tekst ndihmës / i zbehtë. */
export const customerTextMuted = 'text-zinc-500'
