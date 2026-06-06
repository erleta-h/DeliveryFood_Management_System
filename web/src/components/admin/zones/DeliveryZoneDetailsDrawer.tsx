import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import {
  createDeliveryZone,
  fetchDeliveryZoneDetail,
  updateDeliveryZone,
  type DeliveryZoneDetail,
  type DeliveryZoneRow,
} from '../../../lib/adminApi'
import { KOSOVO_CITIES } from '../../../lib/kosovoCities'
import {
  customerBtnGhost,
  customerBtnPrimary,
  customerField,
  customerLabelForm,
  customerSelect,
} from '../../../lib/adminTheme'
import { useAuthStore } from '../../../store/authStore'

type Tab = 'details' | 'restaurants' | 'history'

type Props =
  | { mode: 'create'; onClose: () => void; onSaved: () => void; onMessage: (m: string) => void }
  | {
      mode: 'edit'
      row: DeliveryZoneRow
      onClose: () => void
      onSaved: () => void
      onMessage: (m: string) => void
    }

const TABS: { id: Tab; label: string }[] = [
  { id: 'details', label: 'Detajet' },
  { id: 'restaurants', label: 'Restorantet' },
  { id: 'history', label: 'Histori' },
]

const CITY_OPTIONS = KOSOVO_CITIES.filter(
  (c, i, arr) => arr.findIndex((x) => x.name === c.name) === i,
)

function citySelectOptions(current: string) {
  const cur = current.trim()
  if (cur && !CITY_OPTIONS.some((c) => c.name === cur)) {
    return [{ name: cur }, ...CITY_OPTIONS]
  }
  return CITY_OPTIONS
}

export function DeliveryZoneDetailsDrawer(props: Props) {
  const token = useAuthStore((s) => s.token)
  const isCreate = props.mode === 'create'
  const [tab, setTab] = useState<Tab>('details')
  const [detail, setDetail] = useState<DeliveryZoneDetail | null>(null)
  const [loading, setLoading] = useState(!isCreate)
  const [busy, setBusy] = useState(false)
  const [localErr, setLocalErr] = useState<string | null>(null)

  const [name, setName] = useState(isCreate ? '' : props.row.name)
  const [city, setCity] = useState(isCreate ? (CITY_OPTIONS[0]?.name ?? 'Prishtinë') : props.row.city)
  const [fee, setFee] = useState(isCreate ? '1.50' : String(props.row.deliveryFee))
  const [minOrder, setMinOrder] = useState(isCreate ? '5.00' : String(props.row.minOrderAmount))
  const [minutes, setMinutes] = useState(isCreate ? '25' : String(props.row.estimatedDeliveryMinutes))
  const [description, setDescription] = useState('')
  const [isActive, setIsActive] = useState(isCreate ? true : props.row.isActive)
  const [sortOrder, setSortOrder] = useState(isCreate ? '' : String(props.row.sortOrder))

  const load = useCallback(async () => {
    if (isCreate || !token) return
    setLoading(true)
    try {
      const d = await fetchDeliveryZoneDetail(token, props.row.id)
      setDetail(d)
      setName(d.name)
      setCity(d.city)
      setFee(String(d.deliveryFee))
      setMinOrder(String(d.minOrderAmount))
      setMinutes(String(d.estimatedDeliveryMinutes))
      setDescription(d.description ?? '')
      setIsActive(d.isActive)
      setSortOrder(String(d.sortOrder))
    } catch (e) {
      props.onMessage(e instanceof Error ? e.message : 'Gabim.')
    } finally {
      setLoading(false)
    }
  }, [isCreate, token, props.mode === 'edit' ? props.row.id : 0, props.onMessage])

  useEffect(() => {
    void load()
  }, [load])

  async function save() {
    if (!token) return
    const feeN = Number(fee)
    const minN = Number(minOrder)
    const minEta = Number(minutes)
    if (!name.trim() || !city.trim()) {
      setLocalErr('Emri dhe qyteti janë të detyrueshëm.')
      return
    }
    if (!Number.isFinite(feeN) || !Number.isFinite(minN) || !Number.isFinite(minEta)) {
      setLocalErr('Tarifat dhe koha duhet të jenë numra.')
      return
    }
    setLocalErr(null)
    setBusy(true)
    const body = {
      name: name.trim(),
      city: city.trim(),
      deliveryFee: feeN,
      minOrderAmount: minN,
      estimatedDeliveryMinutes: minEta,
      description: description.trim() || null,
      isActive,
      sortOrder: sortOrder.trim() === '' ? undefined : Number(sortOrder),
    }
    if (isCreate) {
      const r = await createDeliveryZone(token, { ...body, sortOrder: body.sortOrder ?? null })
      setBusy(false)
      if (!r.ok) {
        props.onMessage(r.message)
        return
      }
      props.onMessage('Zona u krijua.')
      props.onSaved()
      props.onClose()
    } else {
      const r = await updateDeliveryZone(token, props.row.id, body)
      setBusy(false)
      if (!r.ok) {
        props.onMessage(r.message)
        return
      }
      props.onMessage('Zona u përditësua.')
      props.onSaved()
      await load()
    }
  }

  async function deactivate() {
    if (isCreate || !token) return
    if (!window.confirm(`Çaktivizo zonën «${name}»?`)) return
    setBusy(true)
    const r = await updateDeliveryZone(token, props.row.id, { isActive: false })
    setBusy(false)
    if (!r.ok) props.onMessage(r.message)
    else {
      props.onMessage('Zona u çaktivizua.')
      props.onSaved()
      await load()
    }
  }

  const restaurantCount = detail?.restaurantCount ?? (isCreate ? 0 : props.row.restaurantCount)

  const panel = (
    <div className="fixed inset-0 z-[70] flex justify-end bg-black/35" role="presentation" onClick={props.onClose}>
      <aside
        className="flex h-full w-full max-w-xl flex-col bg-white shadow-2xl"
        role="dialog"
        aria-label={isCreate ? 'Zonë e re' : `Zona ${name}`}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="border-b border-gray-100 px-5 py-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">{isCreate ? 'Shto zonë' : name}</h2>
              {!isCreate ? (
                <span
                  className={
                    isActive
                      ? 'mt-1 inline-flex rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-200'
                      : 'mt-1 inline-flex rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600 ring-1 ring-inset ring-gray-200'
                  }
                >
                  {isActive ? 'Aktiv' : 'Jo aktiv'}
                </span>
              ) : null}
            </div>
            <button type="button" className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100" onClick={props.onClose}>
              ✕
            </button>
          </div>
        </header>

        {!isCreate ? (
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
                {t.id === 'restaurants' ? ` (${restaurantCount})` : ''}
              </button>
            ))}
          </nav>
        ) : null}

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {loading ? <p className="text-sm text-gray-500">Duke ngarkuar…</p> : null}
          {localErr ? <p className="mb-3 text-sm text-red-600">{localErr}</p> : null}

          {(isCreate || tab === 'details') && !loading ? (
            <div className="space-y-4">
              <label className={customerLabelForm}>
                Emri i zonës
                <input value={name} onChange={(e) => setName(e.target.value)} className={customerField} />
              </label>
              <label className={customerLabelForm}>
                Qyteti
                <select value={city} onChange={(e) => setCity(e.target.value)} className={customerSelect}>
                  {citySelectOptions(city).map((c) => (
                    <option key={c.name} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className={customerLabelForm}>
                  Tarifa bazë (€)
                  <input value={fee} onChange={(e) => setFee(e.target.value)} type="number" step="0.01" className={customerField} />
                </label>
                <label className={customerLabelForm}>
                  Minimumi i porosisë (€)
                  <input value={minOrder} onChange={(e) => setMinOrder(e.target.value)} type="number" step="0.01" className={customerField} />
                </label>
              </div>
              <label className={customerLabelForm}>
                Koha mesatare e dorëzimit (min)
                <input value={minutes} onChange={(e) => setMinutes(e.target.value)} type="number" className={customerField} />
              </label>
              <label className={customerLabelForm}>
                Renditja
                <input value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} type="number" className={customerField} placeholder="auto" />
              </label>
              <label className={customerLabelForm}>
                Përshkrimi (opsionale)
                <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className={customerField + ' resize-none'} />
              </label>
              <label className={customerLabelForm}>
                Statusi
                <select value={isActive ? '1' : '0'} onChange={(e) => setIsActive(e.target.value === '1')} className={customerSelect}>
                  <option value="1">Aktiv</option>
                  <option value="0">Jo aktiv</option>
                </select>
              </label>
              <div className="rounded-xl border border-sky-100 bg-sky-50/80 px-4 py-3 text-xs text-sky-900">
                Kjo është tarifa bazë e platformës për këtë zonë. Restorantet mund të kenë tarifa specifike (override) te
                moduli Restorantet.
              </div>
            </div>
          ) : null}

          {!isCreate && tab === 'restaurants' && !loading ? (
            detail && detail.restaurants.length > 0 ? (
              <ul className="divide-y divide-gray-100 rounded-xl border border-gray-200">
                {detail.restaurants.map((r) => (
                  <li key={r.id} className="flex items-center justify-between px-4 py-3 text-sm">
                    <span className="font-medium text-gray-900">{r.name}</span>
                    <span className="text-xs text-gray-500">{r.isActive && r.isApproved ? 'Aktiv' : 'Jo aktiv'}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-gray-500">Asnjë restorant nuk është lidhur me këtë zonë ende.</p>
            )
          ) : null}

          {!isCreate && tab === 'history' ? (
            <p className="text-sm text-gray-500">Historiku i ndryshimeve do të shtohet në një fazë tjetër.</p>
          ) : null}
        </div>

        <footer className="space-y-2 border-t border-gray-100 bg-gray-50/80 px-5 py-4">
          <div className="flex justify-end gap-2">
            <button type="button" className={customerBtnGhost} disabled={busy} onClick={props.onClose}>
              Anulo
            </button>
            <button type="button" className={customerBtnPrimary} disabled={busy || loading} onClick={() => void save()}>
              {busy ? 'Duke ruajtur…' : isCreate ? 'Krijo zonën' : 'Ruaj ndryshimet'}
            </button>
          </div>
          {!isCreate && isActive ? (
            <button type="button" className="text-sm text-red-600 hover:underline" disabled={busy} onClick={() => void deactivate()}>
              Çaktivizo zonën
            </button>
          ) : null}
        </footer>
      </aside>
    </div>
  )

  return createPortal(panel, document.body)
}
