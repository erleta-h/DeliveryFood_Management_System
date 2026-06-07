import type { PublicLandingStats } from '../../lib/publicLandingApi'
import { formatStatPlus } from '../../lib/publicLandingApi'
import { landingGlassCard, landingTextGold } from '../../lib/landingTheme'

type Props = {
  stats: PublicLandingStats | null
}

const STAT_META = [
  {
    key: 'partnerRestaurantsCount' as const,
    label: 'Restorante partnere',
    iconBg: 'bg-[#ffc107]/15 text-[#ffc107]',
    icon: '🏪',
  },
  {
    key: 'completedOrdersCount' as const,
    label: 'Porosi të përfunduara',
    iconBg: 'bg-emerald-500/15 text-emerald-400',
    icon: '📦',
  },
  {
    key: 'satisfiedCustomersCount' as const,
    label: 'Klientë të kënaqur',
    iconBg: 'bg-violet-500/15 text-violet-400',
    icon: '😊',
  },
  {
    key: 'averageDeliveryMinutes' as const,
    label: 'Mesatarja e dorëzimit',
    suffix: ' min',
    iconBg: 'bg-sky-500/15 text-sky-400',
    icon: '⏱',
  },
]

export function StatsBar({ stats }: Props) {
  if (!stats) return null

  const hasAny =
    stats.partnerRestaurantsCount > 0 ||
    stats.completedOrdersCount > 0 ||
    stats.satisfiedCustomersCount > 0 ||
    stats.averageDeliveryMinutes > 0

  if (!hasAny) return null

  return (
    <section className="mx-auto max-w-7xl px-6 lg:px-10">
      <div className={`${landingGlassCard} grid gap-6 px-6 py-8 sm:grid-cols-2 lg:grid-cols-4 lg:px-10`}>
        {STAT_META.map((item) => {
          const raw = stats[item.key]
          const display =
            item.key === 'averageDeliveryMinutes'
              ? raw > 0
                ? `${raw}${item.suffix ?? ''}`
                : '—'
              : formatStatPlus(raw)
          if (display === '—') return null
          return (
            <div key={item.key} className="flex items-center gap-3">
              <span
                className={`flex h-11 w-11 items-center justify-center rounded-xl text-lg ${item.iconBg}`}
                aria-hidden
              >
                {item.icon}
              </span>
              <div>
                <p className={`text-lg font-bold ${item.key === 'averageDeliveryMinutes' ? landingTextGold : 'text-white'}`}>
                  {display}
                </p>
                <p className="text-xs text-zinc-500">{item.label}</p>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
