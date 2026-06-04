/** Pagesa online vetëm me kartë (Stripe). */

function CardBrandIcons() {
  return (
    <div className="flex shrink-0 items-center gap-1.5" aria-hidden>
      <span className="rounded bg-[#1a1f71] px-1.5 py-0.5 text-[9px] font-bold tracking-tight text-white">
        VISA
      </span>
      <span className="flex h-5 w-7 items-center justify-center rounded bg-zinc-800">
        <span className="h-3 w-3 rounded-full bg-red-500 opacity-90" />
        <span className="-ml-1.5 h-3 w-3 rounded-full bg-amber-400 opacity-90" />
      </span>
      <span className="rounded bg-[#006fcf] px-1 py-0.5 text-[8px] font-bold text-white">AMEX</span>
    </div>
  )
}

export function PaymentMethodSelector() {
  return (
    <div>
      <h2 className="mb-3 text-sm font-bold text-white">Mënyra e pagesës</h2>
      <div className="flex items-start gap-3 rounded-xl border border-[#FF7A18]/55 bg-[#FF7A18]/[0.05] px-4 py-4 shadow-[inset_0_0_0_1px_rgba(255,122,24,0.2)]">
        <span className="mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border-2 border-[#FF7A18]">
          <span className="h-2 w-2 rounded-full bg-[#FF7A18]" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-white">Kartë bankare</p>
          <p className="mt-0.5 text-xs text-zinc-500">Visa, Mastercard, American Express</p>
        </div>
        <CardBrandIcons />
      </div>
    </div>
  )
}
