import { Link } from 'react-router-dom'

export type PaymentResultKind = 'success' | 'confirming' | 'failed' | 'pending'

type Props = {
  kind: PaymentResultKind
  orderNumber?: string
  total?: number
  onDismiss?: () => void
  payHref?: string
}

export function OrderPaymentResultBanner({
  kind,
  orderNumber,
  total,
  onDismiss,
  payHref,
}: Props) {
  if (kind === 'confirming') {
    return (
      <div
        className="mb-6 overflow-hidden rounded-2xl border border-emerald-500/30 bg-emerald-500/[0.08]"
        role="status"
      >
        <div className="flex gap-4 p-5">
          <span
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-xl text-emerald-300"
            aria-hidden
          >
            …
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-lg font-bold text-emerald-100">Pagesa u dërgua</p>
            <p className="mt-1 text-sm text-emerald-100/80">
              Po konfirmojmë me bankën — zakonisht zgjat disa sekonda.
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (kind === 'success') {
    return (
      <div
        className="mb-6 overflow-hidden rounded-2xl border border-emerald-500/40 bg-emerald-500/10 shadow-[0_12px_40px_-12px_rgba(16,185,129,0.35)]"
        role="status"
      >
        <div className="flex gap-4 p-5">
          <span
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-2xl text-emerald-300"
            aria-hidden
          >
            ✓
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-lg font-bold text-emerald-100">Pagesa u krye me sukses!</p>
            <p className="mt-1 text-sm leading-relaxed text-emerald-100/85">
              {orderNumber ? (
                <>
                  Porosia <span className="font-mono font-semibold">{orderNumber}</span> është
                  konfirmuar.
                </>
              ) : (
                'Porosia juaj është konfirmuar.'
              )}
              {total != null ? (
                <>
                  {' '}
                  U paguan <span className="font-semibold tabular-nums">{total.toFixed(2)} €</span>.
                </>
              ) : null}
            </p>
            <p className="mt-2 text-xs text-emerald-200/70">
              Restoranti po e përgatit porosinë. Statusin e ndjek këtu më poshtë.
            </p>
            {onDismiss ? (
              <button
                type="button"
                onClick={onDismiss}
                className="mt-3 text-xs font-semibold text-emerald-300 underline hover:text-emerald-200"
              >
                Mbyll
              </button>
            ) : null}
          </div>
        </div>
      </div>
    )
  }

  if (kind === 'failed') {
    return (
      <div
        className="mb-6 overflow-hidden rounded-2xl border border-red-500/40 bg-red-500/10"
        role="alert"
      >
        <div className="flex gap-4 p-5">
          <span
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-red-500/20 text-2xl text-red-300"
            aria-hidden
          >
            ✕
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-lg font-bold text-red-100">Pagesa nuk u krye</p>
            <p className="mt-1 text-sm leading-relaxed text-red-100/85">
              Banka refuzoi ose pagesa u ndërpre. Porosia mund të jetë anuluar — provo përsëri nga
              shporta ose kontakto mbështetjen.
            </p>
            <div className="mt-3 flex flex-wrap gap-3">
              <Link
                to="/app/cart"
                className="inline-flex rounded-lg bg-red-600/80 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-500"
              >
                Kthehu te shporta
              </Link>
              {onDismiss ? (
                <button
                  type="button"
                  onClick={onDismiss}
                  className="text-xs font-semibold text-red-300 underline hover:text-red-200"
                >
                  Mbyll
                </button>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      className="mb-6 overflow-hidden rounded-2xl border border-amber-500/35 bg-amber-500/10"
      role="status"
    >
      <div className="flex gap-4 p-5">
        <span
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-amber-500/20 text-xl text-amber-300"
          aria-hidden
        >
          ⏳
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-lg font-bold text-amber-100">Pagesa në pritje</p>
          <p className="mt-1 text-sm text-amber-100/85">
            Porosia është krijuar por pagesa me kartë nuk është përfunduar ende.
          </p>
          {payHref ? (
            <Link
              to={payHref}
              className="mt-3 inline-flex rounded-lg bg-[#FF7A18] px-4 py-2 text-sm font-semibold text-white hover:bg-[#FF8F3A]"
            >
              Vazhdo pagesën
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  )
}
