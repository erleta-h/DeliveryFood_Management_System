import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { DeliveryLocationMapDialog } from './DeliveryLocationMapDialog'
import { KOSOVO_CITIES } from '../lib/kosovoCities'
import { loadDeliveryLocation, saveDeliveryLocation } from '../lib/deliveryLocationStorage'
import { reverseGeocode, searchAddress } from '../lib/nominatim'

export function PinIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 11.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5z"
        stroke="currentColor"
        strokeWidth="1.75"
      />
      <path
        d="M12 22s7-4.35 7-11a7 7 0 10-14 0c0 6.65 7 11 7 11z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function LocateIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.75" />
      <path
        d="M12 5V2M12 22v-3M5 12H2M22 12h-3M7.05 7.05 4.93 4.93M19.07 19.07l-2.12-2.12M7.05 16.95l-2.12 2.12M19.07 4.93l-2.12 2.12"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  )
}

const defaultCity = KOSOVO_CITIES[0]!

/**
 * Vetëm shiriti i adresës (si Wolt) — i njëjti sfond i errët si pjesa e sipërme.
 * Pin majtas hap hartën; GPS djathtas; shkrimi + Enter kërkon adresën. Të gjitha ruhen lokalisht.
 */
export function DeliveryAddressSection() {
  const [city] = useState(defaultCity.name)
  const [address, setAddress] = useState('')
  const [marker, setMarker] = useState<[number, number]>([defaultCity.lat, defaultCity.lon])
  const [busy, setBusy] = useState(false)
  const [geoHint, setGeoHint] = useState<string | null>(null)
  const [mapOpen, setMapOpen] = useState(false)

  useEffect(() => {
    const saved = loadDeliveryLocation()
    if (saved) {
      setAddress(saved.address)
      setMarker([saved.lat, saved.lng])
    }
  }, [])

  const persist = useCallback((addr: string, lat: number, lng: number) => {
    saveDeliveryLocation({ address: addr, lat, lng, city })
  }, [city])

  const onSearchSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!address.trim()) return
    setBusy(true)
    setGeoHint(null)
    const q = `${address.trim()}, ${city}, Kosovo`
    const hit = await searchAddress(q)
    setBusy(false)
    if (!hit) {
      setGeoHint('Nuk u gjet adresë. Provo përsëri ose hap hartën me pin.')
      return
    }
    setAddress(hit.displayName)
    setMarker([hit.lat, hit.lon])
    persist(hit.displayName, hit.lat, hit.lon)
    setGeoHint(null)
  }

  const onLocate = () => {
    if (!navigator.geolocation) {
      setGeoHint('Shfletuesi nuk mbështet vendndodhjen.')
      return
    }
    setGeoHint(null)
    setBusy(true)
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords
        setMarker([latitude, longitude])
        const name = await reverseGeocode(latitude, longitude)
        setBusy(false)
        if (name) {
          setAddress(name)
          persist(name, latitude, longitude)
        }
      },
      () => {
        setBusy(false)
        setGeoHint('Lejo vendndodhjen ose zgjedh me hartë (pin majtas).')
      },
      { enableHighAccuracy: true, timeout: 12_000 },
    )
  }

  return (
    <>
      <div className="flex w-full flex-col gap-1.5">
        <form onSubmit={onSearchSubmit} className="flex w-full flex-col gap-1.5">
          <div className="flex h-11 w-full items-center gap-1.5 rounded-full bg-white py-1 pl-2 pr-1 shadow-[0_6px_24px_-8px_rgba(0,0,0,0.4)] ring-1 ring-black/[0.06] sm:h-12 sm:gap-2 sm:pl-3 sm:pr-1.5">
            <button
              type="button"
              onClick={() => {
                setGeoHint(null)
                setMapOpen(true)
              }}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 sm:h-9 sm:w-9"
              title="Hap hartën dhe zgjedh vendin"
              aria-label="Hap hartën dhe zgjedh vendin"
            >
              <PinIcon className="h-[18px] w-[18px] sm:h-5 sm:w-5" />
            </button>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Shkruaj adresën e dorëzimit"
              className="min-w-0 flex-1 border-0 bg-transparent py-0 text-sm text-slate-800 outline-none placeholder:text-slate-400 sm:text-[15px]"
              autoComplete="street-address"
            />
            <button
              type="button"
              onClick={onLocate}
              disabled={busy}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sky-100 text-sky-600 shadow-sm transition hover:bg-sky-200 disabled:opacity-50 sm:h-9 sm:w-9"
              title="Përdor vendndodhjen time"
              aria-label="Përdor vendndodhjen time"
            >
              <LocateIcon className="h-[18px] w-[18px] sm:h-5 sm:w-5" />
            </button>
          </div>
          {geoHint ? (
            <p className="text-xs text-amber-200/90 sm:text-sm sm:text-left">{geoHint}</p>
          ) : (
            <p className="text-center text-[11px] leading-snug text-zinc-500 sm:text-left sm:text-xs">
              Shtyp Enter për të kërkuar adresën. Të dhënat ruhen në këtë pajisje.
            </p>
          )}
        </form>
      </div>

      <DeliveryLocationMapDialog
        open={mapOpen}
        onClose={() => {
          setMapOpen(false)
          setGeoHint(null)
        }}
        city={city}
        seedPosition={marker}
        onPreviewAddress={(name) => {
          if (name) setAddress(name)
        }}
        onAfterSave={(loc) => {
          setAddress(loc.address)
          setMarker([loc.lat, loc.lng])
        }}
        description="Kliko ose zhvendos pikën. Pastaj ruaj — adresa shfaqet te shiriti dhe ruhet lokalisht."
      />
    </>
  )
}
