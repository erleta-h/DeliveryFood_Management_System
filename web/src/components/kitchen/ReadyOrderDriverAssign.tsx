import { useMemo, useState } from 'react'
import type { KitchenAssignableDriver, KitchenOrder } from '../../lib/kitchenApi'
import {
  bestKmDriverToOrder,
  driversSortedForKitchenOrder,
  formatDriverKm,
  kitchenLatLng,
  pickNearestAssignableDriverUserId,
  shortDriverLabel,
} from '../../lib/kitchenDriverSort'
import { MerchantAssignDriverBtn } from './MerchantKitchenUi'

function DriverRow({
  name,
  km,
  onClick,
  interactive,
}: {
  name: string
  km: number | null
  onClick?: () => void
  interactive?: boolean
}) {
  const row = (
    <>
      <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-500" aria-hidden />
      <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-zinc-100">{name}</span>
      <span className="shrink-0 text-[12px] tabular-nums text-zinc-400">{formatDriverKm(km)}</span>
    </>
  )
  if (interactive && onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="flex w-full items-center gap-2 rounded-lg px-1 py-1.5 text-left hover:bg-white/[0.04]"
      >
        {row}
      </button>
    )
  }
  return <div className="flex items-center gap-2 px-1 py-1">{row}</div>
}

export function ReadyOrderDriverAssign({
  order,
  assignableDrivers,
  busy,
  onAssign,
}: {
  order: KitchenOrder
  assignableDrivers: KitchenAssignableDriver[]
  busy?: boolean
  onAssign: (driverUserId: number) => void
}) {
  const [showAlternatives, setShowAlternatives] = useState(false)

  const restaurantPos = useMemo(
    () => kitchenLatLng(order.restaurantLatitude, order.restaurantLongitude),
    [order.restaurantLatitude, order.restaurantLongitude],
  )
  const deliveryDestPos = useMemo(
    () => kitchenLatLng(order.deliveryDestinationLatitude, order.deliveryDestinationLongitude),
    [order.deliveryDestinationLatitude, order.deliveryDestinationLongitude],
  )

  const sorted = useMemo(
    () => driversSortedForKitchenOrder(order, assignableDrivers),
    [order, assignableDrivers],
  )

  const suggested = sorted[0] ?? null
  const suggestedKm = suggested
    ? bestKmDriverToOrder(suggested, restaurantPos, deliveryDestPos)
    : null

  if (sorted.length === 0) {
    return (
      <p className="text-[11px] leading-snug text-amber-200/90">
        Nuk ka shofer «Online». Ndez Online te /driver, pastaj Rifresko.
      </p>
    )
  }

  const nearestId = pickNearestAssignableDriverUserId(order, assignableDrivers)

  return (
    <div className="space-y-3">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-zinc-500">Driver i sugjeruar</p>
        <div className="mt-2 flex items-center gap-2">
          <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-500" aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[14px] font-semibold text-white">
              {shortDriverLabel(suggested?.displayName)}
            </p>
            <p className="text-[11px] text-zinc-500">
              {suggestedKm != null ? `${formatDriverKm(suggestedKm)} larg` : 'GPS ende mungon'}
            </p>
          </div>
        </div>

        {showAlternatives && sorted.length > 1 ? (
          <ul className="mt-2 space-y-0.5 border-t border-white/[0.06] pt-2" role="list">
            {sorted.map((d) => {
              const km = bestKmDriverToOrder(d, restaurantPos, deliveryDestPos)
              return (
                <li key={d.userId}>
                  <DriverRow
                    name={shortDriverLabel(d.displayName)}
                    km={km}
                    interactive
                    onClick={() => onAssign(d.userId)}
                  />
                </li>
              )
            })}
          </ul>
        ) : null}

        {sorted.length > 1 ? (
          <button
            type="button"
            onClick={() => setShowAlternatives((v) => !v)}
            className="mt-2 text-[11px] font-medium text-violet-300/90 hover:text-violet-200"
          >
            {showAlternatives ? 'Fshih alternativat' : `Shfaq alternativat (${sorted.length})`}
          </button>
        ) : null}
      </div>

      <MerchantAssignDriverBtn
        busy={busy}
        onClick={() => {
          if (nearestId != null) onAssign(nearestId)
        }}
      />
    </div>
  )
}
