import type { RestaurantReviewsResult } from '../lib/restaurantReviewsApi'

function Stars({ rating }: { rating: number }) {
  return (
    <span className="inline-flex gap-0.5 text-[#F5B800]" aria-label={`${rating} nga 5 yje`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <span key={n} className={n <= rating ? 'opacity-100' : 'opacity-25'}>
          ★
        </span>
      ))}
    </span>
  )
}

function formatReviewDate(iso: string): string {
  try {
    const d = new Date(iso)
    return d.toLocaleDateString('sq-AL', { day: 'numeric', month: 'short', year: 'numeric' })
  } catch {
    return ''
  }
}

type Props = {
  data: RestaurantReviewsResult | null
  loading: boolean
  error: string | null
}

export function RestaurantReviewsPanel({ data, loading, error }: Props) {
  if (loading) {
    return <p className="mt-4 text-sm text-zinc-500">Duke ngarkuar vlerësimet…</p>
  }

  if (error) {
    return (
      <p className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
        {error}
      </p>
    )
  }

  if (!data || data.totalCount === 0) {
    return (
      <div className="mt-4 rounded-xl border border-white/[0.08] bg-[#0c0e14] p-8 text-center">
        <p className="text-lg font-semibold text-zinc-300">Ende pa vlerësime</p>
        <p className="mt-2 text-sm text-zinc-500">
          Bëhu i pari që vlerëson pas porosisë së përfunduar.
        </p>
      </div>
    )
  }

  return (
    <div className="mt-4 space-y-4">
      <div className="flex flex-wrap items-center gap-4 rounded-xl border border-white/[0.08] bg-[#0c0e14] px-5 py-4">
        <p className="text-4xl font-bold text-[#F5B800]">{data.averageRating.toFixed(1)}</p>
        <div>
          <Stars rating={Math.round(data.averageRating)} />
          <p className="mt-1 text-sm text-zinc-400">
            Bazuar në <span className="font-semibold text-zinc-200">{data.totalCount}</span>{' '}
            vlerësime nga klientët
          </p>
        </div>
      </div>

      <ul className="space-y-3">
        {data.items.map((r) => (
          <li
            key={r.id}
            className="rounded-xl border border-white/[0.08] bg-[#141a28] px-4 py-3.5 sm:px-5"
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-semibold text-zinc-100">{r.authorDisplayName}</p>
                <p className="mt-0.5 text-xs text-zinc-500">{formatReviewDate(r.createdAtUtc)}</p>
              </div>
              <Stars rating={r.rating} />
            </div>
            {r.comment ? (
              <p className="mt-2.5 text-sm leading-relaxed text-zinc-400">{r.comment}</p>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  )
}
