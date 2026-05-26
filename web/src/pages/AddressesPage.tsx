import { useEffect, useState, type FormEvent } from 'react'
import { DeliveryMapPicker } from '../components/DeliveryMapPicker'
import { LocateIcon, PinIcon } from '../components/DeliveryAddressSection'
import {
  customerBtnGhost,
  customerBtnPrimary,
  customerCard,
  customerCardMuted,
  customerField,
  customerLabelSm,
  customerPanelSubtitle,
} from '../lib/customerTheme'
import { getApproxCoordsForCity } from '../lib/kosovoCities'
import { reverseGeocodeParts, searchAddress } from '../lib/nominatim'
import { useAuthStore } from '../store/authStore'

export default function AddressesPage() {
  const user = useAuthStore((s) => s.user)
  const updateProfile = useAuthStore((s) => s.updateProfile)
  const [phone, setPhone] = useState('')
  const [line1, setLine1] = useState('')
  const [city, setCity] = useState('')
  const [postalCode, setPostalCode] = useState('')
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [mapOpen, setMapOpen] = useState(false)
  const [mapMarker, setMapMarker] = useState<[number, number]>([42.6629, 21.1655])
  const [mapBusy, setMapBusy] = useState(false)
  const [geoHint, setGeoHint] = useState<string | null>(null)

  useEffect(() => {
    if (!user) return
    setPhone(user.phone ?? '')
    setLine1(user.line1)
    setCity(user.city)
    setPostalCode(user.postalCode ?? '')
  }, [user])

  useEffect(() => {
    if (!mapOpen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [mapOpen])

  function openMapPicker() {
    setGeoHint(null)
    const center = getApproxCoordsForCity(city)
    setMapMarker(center)
    setMapOpen(true)
    void (async () => {
      const q = `${line1.trim()}, ${city.trim()}, Kosovo`
      if (line1.trim().length > 2) {
        const hit = await searchAddress(q)
        if (hit) setMapMarker([hit.lat, hit.lon])
      }
    })()
  }

  async function confirmMapSelection() {
    setMapBusy(true)
    setGeoHint(null)
    const [lat, lng] = mapMarker
    const parts = await reverseGeocodeParts(lat, lng)
    setMapBusy(false)
    if (!parts) {
      setGeoHint('Nuk u lexua adresa nga harta. Provo pikë tjetër ose plotëso manualisht.')
      return
    }
    setLine1(parts.line1)
    if (parts.city.trim()) setCity(parts.city.trim())
    if (parts.postalCode) setPostalCode(parts.postalCode)
    setMapOpen(false)
  }

  function onLocate() {
    if (!navigator.geolocation) {
      setGeoHint('Shfletuesi nuk mbështet vendndodhjen GPS.')
      return
    }
    setGeoHint(null)
    setMapBusy(true)
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords
        setMapMarker([latitude, longitude])
        const parts = await reverseGeocodeParts(latitude, longitude)
        setMapBusy(false)
        if (parts) {
          setLine1(parts.line1)
          if (parts.city.trim()) setCity(parts.city.trim())
          if (parts.postalCode) setPostalCode(parts.postalCode)
        } else {
          setGeoHint('GPS u lexua, por adresa nuk u gjet. Hap hartën me pin.')
        }
      },
      () => {
        setMapBusy(false)
        setGeoHint('Lejo vendndodhjen ose zgjidh me hartë (ikona pin).')
      },
      { enableHighAccuracy: true, timeout: 12_000 },
    )
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (!line1.trim() || !city.trim()) return
    const phoneTrim = phone.trim()
    if (phoneTrim.replace(/\D/g, '').length < 8) {
      setError('Numri i telefonit duhet të ketë të paktën 8 shifra.')
      return
    }
    const r = await updateProfile({
      phone: phoneTrim,
      line1: line1.trim(),
      city: city.trim(),
      postalCode: postalCode.trim() || undefined,
      latitude: mapMarker[0],
      longitude: mapMarker[1],
    })
    if (!r.ok) {
      setError(r.error ?? 'Ruajtja dështoi.')
      return
    }
    setSaved(true)
    window.setTimeout(() => setSaved(false), 2500)
  }

  if (!user) {
    return (
      <section className={customerCard}>
        <p className="text-zinc-400">Nuk je i kyçur.</p>
      </section>
    )
  }

  return (
    <section className={customerCard}>
      <h1 className="text-2xl font-bold text-zinc-100">Adresa e dorëzimit</h1>
      <p className={customerPanelSubtitle}>
        Adresa kryesore nga regjistrimi; ndryshimet ruhen në bazë përmes API-së. Pin hap hartën për
        zgjedhje vendi (OpenStreetMap / Nominatim).
      </p>

      <div className={`${customerCardMuted} mt-6`}>
        <p className={customerLabelSm}>Profili</p>
        <p className="mt-1 text-sm text-zinc-200">
          {user.firstName} {user.lastName} · {user.email}
        </p>
      </div>

      <form onSubmit={onSubmit} className="mt-8 max-w-xl space-y-5">
        <div>
          <label htmlFor="addr-phone" className={customerLabelSm}>
            Numri i telefonit
          </label>
          <input
            id="addr-phone"
            type="tel"
            required
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className={customerField}
            autoComplete="tel"
            placeholder="p.sh. +383 44 123 456"
          />
          <p className="mt-1.5 text-xs text-zinc-500">
            Për t’ju thirrur kur porosia është gati ose për pyetje nga restoranti.
          </p>
        </div>
        <div>
          <label htmlFor="addr-line1" className={customerLabelSm}>
            Adresa (rruga, numri)
          </label>
          <div className="mt-1 flex items-stretch gap-2">
            <button
              type="button"
              onClick={openMapPicker}
              className="flex shrink-0 items-center justify-center rounded-lg border border-white/[0.12] bg-white/[0.06] px-3 text-zinc-400 transition hover:border-amber-400/30 hover:bg-amber-500/10 hover:text-amber-200"
              title="Hap hartën dhe zgjedh vendin"
              aria-label="Hap hartën dhe zgjedh vendin"
            >
              <PinIcon className="h-5 w-5" />
            </button>
            <input
              id="addr-line1"
              required
              value={line1}
              onChange={(e) => setLine1(e.target.value)}
              className={`${customerField} !mt-0 min-w-0 flex-1`}
              placeholder="p.sh. Rruga Dëshmorët e Kombit 15"
            />
            <button
              type="button"
              onClick={onLocate}
              disabled={mapBusy}
              className="flex shrink-0 items-center justify-center rounded-lg border border-sky-500/35 bg-sky-500/15 px-3 text-sky-200 transition hover:bg-sky-500/25 disabled:opacity-40"
              title="Përdor vendndodhjen time (GPS)"
              aria-label="Përdor vendndodhjen time"
            >
              <LocateIcon className="h-5 w-5" />
            </button>
          </div>
          <p className="mt-1.5 text-xs text-zinc-500">
            Prek pin-in për hartë; GPS për vendndodhjen tënde. Mund të ndryshosh tekstin manualisht.
          </p>
          {geoHint && !mapOpen ? (
            <p className="mt-2 text-xs text-amber-200/90">{geoHint}</p>
          ) : null}
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="addr-city" className={customerLabelSm}>
              Qyteti
            </label>
            <input
              id="addr-city"
              required
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className={customerField}
            />
          </div>
          <div>
            <label htmlFor="addr-post" className={customerLabelSm}>
              Kodi postar (opsional)
            </label>
            <input
              id="addr-post"
              value={postalCode}
              onChange={(e) => setPostalCode(e.target.value)}
              className={customerField}
            />
          </div>
        </div>

        {error ? (
          <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
            {error}
          </p>
        ) : null}

        {saved ? (
          <p className="text-sm font-medium text-emerald-400/90">Adresa u ruajt.</p>
        ) : null}

        <button type="submit" className={customerBtnPrimary}>
          Ruaj ndryshimet
        </button>
      </form>

      {mapOpen ? (
        <div
          className="fixed inset-0 z-[100] flex items-end justify-center bg-black/55 p-0 backdrop-blur-[2px] sm:items-center sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="addr-map-title"
        >
          <div className="flex max-h-[min(92vh,680px)] w-full max-w-2xl flex-col rounded-t-3xl border border-white/10 bg-[#1a1f2e] p-4 shadow-2xl sm:rounded-3xl sm:p-5">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 id="addr-map-title" className="text-lg font-semibold text-zinc-100">
                Zgjedh vendin në hartë
              </h2>
              <button
                type="button"
                onClick={() => setMapOpen(false)}
                className={`${customerBtnGhost} shrink-0 px-3 py-1.5 text-sm`}
              >
                Mbyll
              </button>
            </div>
            <p className="mb-2 text-xs text-zinc-500">
              Kliko në hartë ose zhvendos pin-in. Pastaj «Përdor këtë adresë» — fushat e formës
              përditësohen; ruaj me «Ruaj ndryshimet» për ta dërguar në server.
            </p>
            <div className="min-h-[220px] flex-1 overflow-hidden rounded-2xl ring-1 ring-white/[0.08] sm:min-h-[300px]">
              <DeliveryMapPicker
                position={mapMarker}
                onPositionChange={(lat, lng) => setMapMarker([lat, lng])}
                className="h-[min(48vh,340px)] w-full sm:h-[360px]"
              />
            </div>
            {mapBusy ? (
              <p className="mt-2 text-xs text-zinc-400">Duke lexuar adresën…</p>
            ) : null}
            {geoHint && mapOpen ? (
              <p className="mt-2 text-xs text-amber-200/90">{geoHint}</p>
            ) : null}
            <div className="mt-4 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setGeoHint(null)
                  setMapOpen(false)
                }}
                className={`${customerBtnGhost} rounded-full px-5 py-2.5`}
              >
                Anulo
              </button>
              <button
                type="button"
                onClick={() => void confirmMapSelection()}
                disabled={mapBusy}
                className={`${customerBtnPrimary} rounded-full px-5 py-2.5 disabled:opacity-50`}
              >
                Përdor këtë adresë
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  )
}
