import type { KitchenAssignableDriver, KitchenOrder } from '../../lib/kitchenApi'
import { driverWorkloadPercent, formatDriverKm, driverKmToRestaurant } from '../../lib/kitchenDriverSort'
import type { LatLng } from '../../lib/geo'
import { kitchenDriverStatusAtUtc, minutesAgoLabel } from './MerchantKitchenUi'

type Props = {
  driver: KitchenAssignableDriver
  activeOrders: KitchenOrder[]
  restaurantPos: LatLng | null
  readyOrderNeedingDriver: KitchenOrder | null
  busy?: boolean
  onClose: () => void
  onAssign: (orderId: number, driverUserId: number) => void
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return 'D'
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase()
  return `${parts[0]![0] ?? ''}${parts[parts.length - 1]![0] ?? ''}`.toUpperCase()
}

export function KitchenDriverDetailsModal({
  driver,
  activeOrders,
  restaurantPos,
  readyOrderNeedingDriver,
  busy,
  onClose,
  onAssign,
}: Props) {
  const activeCount = activeOrders.length
  const load = driverWorkloadPercent(activeCount)
  const km = driverKmToRestaurant(driver, restaurantPos)
  const primaryOrder = activeOrders[0] ?? null
  const phone = driver.phone?.trim()
  const canAssign = readyOrderNeedingDriver != null

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/70 p-4 backdrop-blur-sm sm:items-center"
      role="presentation"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border border-white/[0.1] bg-[#1a1f28] shadow-2xl"
        role="dialog"
        aria-modal
        aria-labelledby="kitchen-driver-detail-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-white/[0.08] px-5 py-4">
          <h2 id="kitchen-driver-detail-title" className="text-lg font-bold text-white">
            Detaje driveri
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-zinc-400 hover:bg-white/[0.06] hover:text-white"
            aria-label="Mbyll"
          >
            ×
          </button>
        </div>

        <div className="space-y-5 px-5 py-5">
          <div className="flex items-center gap-4">
            <div
              className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-violet-600/30 text-lg font-bold text-violet-100"
              aria-hidden
            >
              {initials(driver.displayName)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-lg font-semibold text-white">{driver.displayName}</p>
              <span
                className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                  driver.isOnline
                    ? 'bg-emerald-500/20 text-emerald-300'
                    : 'bg-zinc-500/20 text-zinc-400'
                }`}
              >
                {driver.isOnline ? 'Online' : 'Offline'}
              </span>
            </div>
          </div>

          <dl className="space-y-2 text-sm">
            <div className="flex justify-between gap-3 border-b border-white/[0.06] py-2">
              <dt className="text-zinc-500">Telefoni</dt>
              <dd className="font-medium text-zinc-100">{phone || '—'}</dd>
            </div>
            <div className="flex justify-between gap-3 border-b border-white/[0.06] py-2">
              <dt className="text-zinc-500">Vetura</dt>
              <dd className="text-right font-medium text-zinc-100">
                {driver.vehicleType?.trim() || '—'}
              </dd>
            </div>
            <div className="flex justify-between gap-3 border-b border-white/[0.06] py-2">
              <dt className="text-zinc-500">Targa</dt>
              <dd className="font-mono font-medium text-zinc-100">
                {driver.licensePlate?.trim() || '—'}
              </dd>
            </div>
            <div className="flex justify-between gap-3 py-2">
              <dt className="text-zinc-500">Distanca</dt>
              <dd className="font-medium text-zinc-100">{formatDriverKm(km)}</dd>
            </div>
          </dl>

          <div>
            <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-zinc-500">
              Gjendja aktuale
            </p>
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-xl border border-white/[0.08] bg-[#12161e] px-2 py-3 text-center">
                <p className="text-xl font-bold text-white">{activeCount}</p>
                <p className="mt-0.5 text-[10px] text-zinc-500">Porosi aktive</p>
              </div>
              <div className="rounded-xl border border-white/[0.08] bg-[#12161e] px-2 py-3 text-center">
                <p className="text-xl font-bold text-white">{load}%</p>
                <p className="mt-0.5 text-[10px] text-zinc-500">Ngarkesa</p>
              </div>
              <div className="rounded-xl border border-white/[0.08] bg-[#12161e] px-2 py-3 text-center">
                <p className="text-xl font-bold text-white">{formatDriverKm(km)}</p>
                <p className="mt-0.5 text-[10px] text-zinc-500">Afërsia</p>
              </div>
            </div>
          </div>

          {primaryOrder ? (
            <div>
              <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-zinc-500">
                Porosia që po e dërgon
              </p>
              <div className="rounded-xl border border-white/[0.08] bg-[#12161e] p-4">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-mono text-sm font-semibold text-white">
                    #{primaryOrder.orderNumber.replace(/^FD-/, '')}
                  </p>
                  <span className="rounded bg-sky-500/20 px-1.5 py-0.5 text-[9px] font-bold uppercase text-sky-300">
                    Delivery
                  </span>
                </div>
                <p className="mt-2 text-sm text-zinc-300">
                  {primaryOrder.customerFirstName} {primaryOrder.customerLastName}
                </p>
                <p className="mt-1 text-xs text-zinc-500">
                  {primaryOrder.addressLine1}, {primaryOrder.city}
                </p>
                <p className="mt-2 flex items-center gap-1.5 text-xs text-emerald-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" aria-hidden />
                  Në rrugë për te klienti
                  <span className="text-zinc-500">
                    · {minutesAgoLabel(kitchenDriverStatusAtUtc(primaryOrder))}
                  </span>
                </p>
              </div>
            </div>
          ) : null}

          <div className="space-y-2 pt-1">
            {phone ? (
              <a
                href={`tel:${phone.replace(/\s/g, '')}`}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/[0.12] bg-[#1e2430] py-3 text-sm font-semibold text-zinc-100 transition hover:bg-[#252b38]"
              >
                <PhoneIcon />
                Telefono driverin
              </a>
            ) : (
              <p className="text-center text-xs text-zinc-500">Numri i telefonit nuk është i regjistruar.</p>
            )}

            {canAssign ? (
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  onAssign(readyOrderNeedingDriver!.id, driver.userId)
                  onClose()
                }}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 py-3.5 text-sm font-bold text-[#0d1117] transition hover:bg-emerald-400 disabled:opacity-45"
              >
                <UserPlusIcon />
                Cakto këtë driver
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}

function PhoneIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  )
}

function UserPlusIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M19 8v6M22 11h-6" />
    </svg>
  )
}
