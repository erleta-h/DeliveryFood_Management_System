import { useEffect, useState, type FormEvent } from 'react'
import { DeliveryMapPicker } from '../components/DeliveryMapPicker'
import { LocateIcon, PinIcon } from '../components/DeliveryAddressSection'
import { PhoneInputField, validatePhoneField } from '../components/PhoneInputField'
import {
  customerBtnGhost,
  customerBtnPrimary,
  customerCard,
  customerField,
  customerLabelSm,
  customerPanelSubtitle,
} from '../lib/customerTheme'
import { getApproxCoordsForCity } from '../lib/kosovoCities'
import { reverseGeocodeParts, searchAddress } from '../lib/nominatim'
import { useAuthStore } from '../store/authStore'

function IconCity() {
  return (
    <svg className="h-4 w-4 shrink-0 text-zinc-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path d="M3 21h18" />
      <path d="M6 21V7l6-4 6 4v14" />
      <path d="M9 21v-6h6v6" />
    </svg>
  )
}

function IconPostal() {
  return (
    <svg className="h-4 w-4 shrink-0 text-zinc-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path d="M4 6h16v12H4z" />
      <path d="m4 7 8 6 8-6" />
    </svg>
  )
}

function IconInfo() {
  return (
    <svg className="h-4 w-4 shrink-0 text-sky-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 16v-4M12 8h.01" />
    </svg>
  )
}

function IconCheck() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
      <path d="M20 6 9 17l-5-5" />
    </svg>
  )
}

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
    if (user.latitude != null && user.longitude != null) {
      setMapMarker([user.latitude, user.longitude])
    }
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
        setGeoHint('Lejo vendndodhjen ose zgjidh me hartë.')
      },
      { enableHighAccuracy: true, timeout: 12_000 },
    )
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (!line1.trim() || !city.trim()) return
    const phoneErr = validatePhoneField(phone)
    if (phoneErr) {
      setError(phoneErr)
      return
    }
    const r = await updateProfile({
      phone: phone.trim(),
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
    <div className="mx-auto max-w-2xl space-y-6 pb-4">
      <header className="flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-500/15 text-violet-300">
          <PinIcon className="h-5 w-5" />
        </span>
        <div>
          <h1 className="text-2xl font-bold text-zinc-50 sm:text-[1.65rem]">Adresa e dorëzimit</h1>
          <p className={customerPanelSubtitle}>
            Përditëso adresën ku dëshiron të pranosh porositë
          </p>
        </div>
      </header>

      <section className={customerCard}>
        <form onSubmit={onSubmit} className="space-y-5">
          <PhoneInputField
            id="addr-phone"
            variant="customer"
            label="Telefoni"
            required
            value={phone}
            onChange={setPhone}
          />

          <div>
            <label htmlFor="addr-line1" className={customerLabelSm}>
              Adresa
            </label>
            <div className="mt-1.5 flex flex-col gap-2 sm:flex-row sm:items-stretch">
              <input
                id="addr-line1"
                required
                value={line1}
                onChange={(e) => setLine1(e.target.value)}
                className={`${customerField} !mt-0 min-w-0 flex-1`}
                placeholder="p.sh. Rruga Dëshmorët e Kombit 15"
                autoComplete="street-address"
              />
              <button
                type="button"
                onClick={openMapPicker}
                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border border-violet-500/35 bg-violet-500/10 px-4 py-2.5 text-sm font-semibold text-violet-200 transition hover:border-violet-400/45 hover:bg-violet-500/15"
              >
                <PinIcon className="h-4 w-4" />
                Zgjidh nga harta
              </button>
            </div>
            <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs text-zinc-500">
                Zgjidh lokacionin nga harta ose shkruaje adresën manualisht
              </p>
              <button
                type="button"
                onClick={onLocate}
                disabled={mapBusy}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-sky-300/90 transition hover:text-sky-200 disabled:opacity-40"
              >
                <LocateIcon className="h-3.5 w-3.5" />
                Përdor GPS
              </button>
            </div>
            {geoHint && !mapOpen ? (
              <p className="mt-2 text-xs text-amber-200/90">{geoHint}</p>
            ) : null}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="addr-city" className={customerLabelSm}>
                Qyteti
              </label>
              <div className="relative mt-1.5">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2">
                  <IconCity />
                </span>
                <input
                  id="addr-city"
                  required
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className={`${customerField} !mt-0 pl-10`}
                  autoComplete="address-level2"
                />
              </div>
            </div>
            <div>
              <label htmlFor="addr-post" className={customerLabelSm}>
                Kodi postar
              </label>
              <div className="relative mt-1.5">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2">
                  <IconPostal />
                </span>
                <input
                  id="addr-post"
                  value={postalCode}
                  onChange={(e) => setPostalCode(e.target.value)}
                  className={`${customerField} !mt-0 pl-10`}
                  placeholder="10000"
                  autoComplete="postal-code"
                />
              </div>
            </div>
          </div>

          {error ? (
            <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
              {error}
            </p>
          ) : null}

          {saved ? (
            <p className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-100">
              Adresa u ruajt me sukses.
            </p>
          ) : null}

          <button
            type="submit"
            className={`${customerBtnPrimary} flex w-full items-center justify-center gap-2 py-3 text-base font-bold`}
          >
            <IconCheck />
            Ruaj ndryshimet
          </button>
        </form>
      </section>

      <div className="flex items-start gap-3 rounded-xl border border-white/[0.08] bg-[#1a1f2e]/60 px-4 py-3.5">
        <IconInfo />
        <p className="text-sm leading-relaxed text-zinc-400">
          Kjo është adresa kryesore e dorëzimit. Ajo do të përdoret për të gjitha porositë tuaja.
        </p>
      </div>

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
              Kliko në hartë ose zhvendos pin-in, pastaj «Përdor këtë adresë».
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
    </div>
  )
}
