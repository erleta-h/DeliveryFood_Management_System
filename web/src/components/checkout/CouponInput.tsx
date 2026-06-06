import { useState } from 'react'
import { validateCoupon, type AppliedCoupon } from '../../lib/couponsApi'

type Props = {
  token: string
  subtotal: number
  applied: AppliedCoupon | null
  onApplied: (coupon: AppliedCoupon) => void
  onRemoved: () => void
}

export function CouponInput({ token, subtotal, applied, onApplied, onRemoved }: Props) {
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  async function apply() {
    const trimmed = code.trim()
    if (!trimmed) {
      setError('Shkruaj kodin e kuponit.')
      return
    }
    setBusy(true)
    setError(null)
    setSuccess(false)
    const r = await validateCoupon(token, { code: trimmed, subtotal })
    setBusy(false)
    if (!r.ok) {
      setError(r.message)
      return
    }
    setSuccess(true)
    onApplied(r.coupon)
  }

  function remove() {
    setCode('')
    setError(null)
    setSuccess(false)
    onRemoved()
  }

  if (applied) {
    const hint =
      applied.discountPercent > 0 ? `${applied.discountPercent}% zbritje` : ''
    return (
      <div className="space-y-2">
        {success ? (
          <p className="text-xs font-medium text-emerald-400">Kuponi u aplikua me sukses!</p>
        ) : null}
        <div className="flex items-center justify-between gap-2 rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-3 py-2.5">
          <div className="min-w-0">
            <p className="truncate font-mono text-sm font-semibold text-emerald-100">{applied.code}</p>
            {hint ? <p className="text-xs text-emerald-200/70">{hint}</p> : null}
          </div>
          <button
            type="button"
            onClick={remove}
            className="shrink-0 text-xs font-semibold text-zinc-300 underline-offset-2 hover:text-white hover:underline"
          >
            Hiq
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500">
        Kodi promocional
      </label>
      <div className="flex gap-2">
        <input
          value={code}
          onChange={(e) => {
            setCode(e.target.value)
            setError(null)
            setSuccess(false)
          }}
          placeholder="VERE25"
          className="min-w-0 flex-1 rounded-xl border border-white/[0.10] bg-[#0f1115] px-3 py-2.5 font-mono text-sm uppercase text-white placeholder:text-zinc-600 focus:border-[#009fe3]/50 focus:outline-none focus:ring-1 focus:ring-[#009fe3]/30"
          autoComplete="off"
          disabled={busy}
        />
        <button
          type="button"
          onClick={() => void apply()}
          disabled={busy || subtotal <= 0}
          className="shrink-0 rounded-xl border border-white/[0.12] bg-white/[0.06] px-4 py-2.5 text-sm font-semibold text-zinc-100 transition hover:bg-white/[0.10] disabled:cursor-not-allowed disabled:opacity-45"
        >
          {busy ? '…' : 'Apliko'}
        </button>
      </div>
      {error ? <p className="text-xs text-red-300">{error}</p> : null}
    </div>
  )
}
