import { useMemo, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { AdminDriversMap } from '../../AdminDriversMap'
import { adminPatchDriver, type AdminDriverRow } from '../../../lib/adminApi'
import {
  driverDisplayName,
  driverInitial,
  driverStatusBadgeClass,
  driverStatusInfo,
  formatDriverDate,
  formatDriverDateTime,
  formatGpsAgo,
  vehicleLabel,
} from '../../../lib/adminDriverStatus'
import { customerBtnGhost, customerBtnPrimary } from '../../../lib/adminTheme'
import { useAuthStore } from '../../../store/authStore'

type Tab = 'details' | 'gps' | 'activity' | 'actions'

type Props = {
  driver: AdminDriverRow
  onClose: () => void
  onUpdated: () => void
  onMessage: (msg: string) => void
}

function InfoRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-3">
      <dt className="w-36 shrink-0 text-xs text-gray-500">{label}</dt>
      <dd className="text-sm font-medium text-gray-900">{value}</dd>
    </div>
  )
}

function SectionCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-gray-100 bg-gray-50/80 p-4">
      <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
      <dl className="mt-3 space-y-2.5">{children}</dl>
    </section>
  )
}

const TABS: { id: Tab; label: string }[] = [
  { id: 'details', label: 'Detajet' },
  { id: 'gps', label: 'GPS' },
  { id: 'activity', label: 'Aktiviteti' },
  { id: 'actions', label: 'Veprime' },
]

export function AdminDriverDetailsDrawer({ driver, onClose, onUpdated, onMessage }: Props) {
  const token = useAuthStore((s) => s.token)
  const [tab, setTab] = useState<Tab>('details')
  const [busy, setBusy] = useState(false)

  const name = driverDisplayName(driver)
  const status = driverStatusInfo(driver)

  const mapPoint = useMemo(() => {
    if (driver.lastLatitude == null || driver.lastLongitude == null) return []
    return [
      {
        userId: driver.userId,
        lat: driver.lastLatitude,
        lng: driver.lastLongitude,
        label: name,
      },
    ]
  }, [driver, name])

  async function patch(body: { userIsActive?: boolean; isOnline?: boolean }) {
    if (!token) return
    setBusy(true)
    const r = await adminPatchDriver(token, driver.userId, body)
    setBusy(false)
    if (r.ok) {
      onMessage('U përditësua.')
      onUpdated()
    } else onMessage(r.message)
  }

  const panel = (
    <div className="fixed inset-0 z-[70] flex justify-end bg-black/35" role="presentation" onClick={onClose}>
      <aside
        className="flex h-full w-full max-w-xl flex-col bg-white shadow-2xl"
        role="dialog"
        aria-label={`Deliver ${name}`}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="border-b border-gray-100 px-5 py-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-violet-100 text-lg font-semibold text-violet-700">
                {driverInitial(driver)}
              </span>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">{name}</h2>
                <p className="text-sm text-gray-500">{driver.email}</p>
                <span className={`mt-1.5 ${driverStatusBadgeClass(driver)}`}>{status.text}</span>
              </div>
            </div>
            <button
              type="button"
              className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
              onClick={onClose}
              aria-label="Mbyll"
            >
              ✕
            </button>
          </div>
        </header>

        <nav className="flex gap-1 border-b border-gray-100 px-5">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              className={
                tab === t.id
                  ? 'border-b-2 border-violet-600 px-3 py-2.5 text-sm font-medium text-violet-700'
                  : 'px-3 py-2.5 text-sm text-gray-500 hover:text-gray-800'
              }
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </nav>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {tab === 'details' ? (
            <div className="space-y-4">
              <SectionCard title="Profili">
                <InfoRow label="Emri" value={name} />
                <InfoRow label="Email" value={driver.email} />
                <InfoRow label="User ID" value={`#${driver.userId}`} />
              </SectionCard>
              <SectionCard title="Mjeti">
                <InfoRow label="Lloji" value={driver.vehicleType} />
                <InfoRow label="Targa" value={driver.licensePlate ?? '—'} />
              </SectionCard>
              <SectionCard title="Llogaria">
                <InfoRow
                  label="Statusi"
                  value={<span className={driverStatusBadgeClass(driver)}>{status.text}</span>}
                />
                <InfoRow label="Anëtar që nga" value={formatDriverDate(driver.createdAt)} />
              </SectionCard>
            </div>
          ) : null}

          {tab === 'gps' ? (
            <div className="space-y-4">
              <SectionCard title="Pozicioni i fundit">
                <InfoRow
                  label="Koordinata"
                  value={
                    driver.lastLatitude != null
                      ? `${driver.lastLatitude.toFixed(5)}, ${driver.lastLongitude?.toFixed(5)}`
                      : '—'
                  }
                />
                <InfoRow
                  label="Përditësuar"
                  value={
                    driver.lastLocationAtUtc
                      ? `${formatDriverDateTime(driver.lastLocationAtUtc)} (${formatGpsAgo(driver.lastLocationAtUtc)})`
                      : '—'
                  }
                />
              </SectionCard>
              {mapPoint.length > 0 ? (
                <AdminDriversMap drivers={mapPoint} className="h-56 border-gray-200" />
              ) : (
                <p className="text-sm text-gray-500">Deliveri nuk ka raportuar GPS ende.</p>
              )}
            </div>
          ) : null}

          {tab === 'activity' ? (
            <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 px-4 py-10 text-center">
              <p className="text-sm font-medium text-gray-700">Historiku i aktivitetit</p>
              <p className="mt-1 text-xs text-gray-500">
                Dërgesat dhe veprimet e deliverit do të shfaqen kur të shtohet endpoint i detajit në backend.
              </p>
            </div>
          ) : null}

          {tab === 'actions' ? (
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Menaxho llogarinë dhe disponueshmërinë e deliverit. Pezullimi e bllokon hyrjen në sistem.
              </p>
              <div className="flex flex-wrap gap-2">
                {driver.userIsActive ? (
                  <button
                    type="button"
                    disabled={busy}
                    className={`${customerBtnGhost} border-red-200 text-red-700 hover:bg-red-50`}
                    onClick={() => void patch({ userIsActive: false })}
                  >
                    Pezullo deliverin
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={busy}
                    className={customerBtnPrimary}
                    onClick={() => void patch({ userIsActive: true })}
                  >
                    Aktivizo deliverin
                  </button>
                )}
              </div>
              {driver.userIsActive ? (
                <div className="rounded-xl border border-gray-100 bg-gray-50/80 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Disponueshmëria</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={busy || driver.isOnline}
                      className={customerBtnGhost}
                      onClick={() => void patch({ isOnline: true })}
                    >
                      Vendos online
                    </button>
                    <button
                      type="button"
                      disabled={busy || !driver.isOnline}
                      className={customerBtnGhost}
                      onClick={() => void patch({ isOnline: false })}
                    >
                      Vendos offline
                    </button>
                  </div>
                  <p className="mt-2 text-xs text-gray-400">
                    Në prodhim statusi online zakonisht vendoset nga app-i i deliverit; këto butona janë për
                    override admin.
                  </p>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>

        {tab !== 'actions' ? (
          <footer className="border-t border-gray-100 bg-gray-50/80 px-5 py-4">
            <button
              type="button"
              className="text-sm font-medium text-violet-600 hover:underline"
              onClick={() => setTab('actions')}
            >
              Shko te veprimet →
            </button>
          </footer>
        ) : null}
      </aside>
    </div>
  )

  return createPortal(panel, document.body)
}
