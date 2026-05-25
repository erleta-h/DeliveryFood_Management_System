import { rdYellow } from '../../lib/restaurantDetailTheme'

export function PaymentSecurityBanner() {
  return (
    <div className="flex gap-3 rounded-xl border border-white/[0.08] bg-[#1a1f2e]/80 px-4 py-3.5">
      <span className="text-xl" style={{ color: rdYellow }} aria-hidden>
        🔒
      </span>
      <div>
        <p className="text-sm font-bold" style={{ color: rdYellow }}>
          Pagesa e sigurt
        </p>
        <p className="mt-0.5 text-xs leading-relaxed text-zinc-500">
          Të dhënat tuaja janë të mbrojtura me enkriptim SSL.
        </p>
      </div>
    </div>
  )
}
