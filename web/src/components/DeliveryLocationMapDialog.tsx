import { useCallback, useEffect, useRef, useState } from 'react'
import { DeliveryMapPicker } from './DeliveryMapPicker'
import { KOSOVO_CITIES } from '../lib/kosovoCities'
import {
  loadDeliveryLocation,
  saveDeliveryLocation,
  type StoredDeliveryLocation,
} from '../lib/deliveryLocationStorage'
import { reverseGeocode } from '../lib/nominatim'

const defaultCity = KOSOVO_CITIES[0]!

export type DeliveryLocationMapDialogProps = {
  open: boolean
  onClose: () => void
  /** Qyteti i ruajtur në storage (p.sh. Prishtinë). */
  city?: string
  /** Pozicion fillestar kur hapet (p.sh. nga shiriti i adresës në landing). */
  seedPosition?: [number, number]
  /** Pas ruajtjes — p.sh. për të përditësuar input-in e jashtëm. */
  onAfterSave?: (loc: StoredDeliveryLocation) => void
  /** Gjatë zhvendosjes së pin-it në hartë (debounced). */
  onPreviewAddress?: (address: string | null) => void
  title?: string
  description?: string
}

/**
 * Modal me hartë OSM për zgjedhjen e vendit të dorëzimit; ruan te `fd_delivery_location`.
 */
export function DeliveryLocationMapDialog({
  open,
  onClose,
  city = defaultCity.name,
  seedPosition,
  onAfterSave,
  onPreviewAddress,
  title = 'Zgjedh vendin në hartë',
  description = 'Kliko ose zhvendos pikën për vendin ku dërgohet porosia. Ruaj — adresa ruhet në këtë pajisje.',
}: DeliveryLocationMapDialogProps) {
  const [marker, setMarker] = useState<[number, number]>([defaultCity.lat, defaultCity.lon])
  const [resolving, setResolving] = useState(false)
  const [saving, setSaving] = useState(false)
  const reverseTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const prevOpen = useRef(false)
  const seedRef = useRef(seedPosition)
  seedRef.current = seedPosition

  useEffect(() => () => clearTimeout(reverseTimer.current), [])

  useEffect(() => {
    if (open && !prevOpen.current) {
      const saved = loadDeliveryLocation()
      const seed = seedRef.current
      if (seed != null) setMarker([seed[0], seed[1]])
      else if (saved) setMarker([saved.lat, saved.lng])
      else setMarker([defaultCity.lat, defaultCity.lon])
    }
    prevOpen.current = open
  }, [open])

  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  const onPositionChange = useCallback(
    (lat: number, lng: number) => {
      setMarker([lat, lng])
      if (!onPreviewAddress) return
      clearTimeout(reverseTimer.current)
      reverseTimer.current = setTimeout(async () => {
        setResolving(true)
        const name = await reverseGeocode(lat, lng)
        setResolving(false)
        onPreviewAddress(name)
      }, 450)
    },
    [onPreviewAddress],
  )

  const simplePositionChange = useCallback((lat: number, lng: number) => {
    setMarker([lat, lng])
  }, [])

  const confirmMapSelection = async () => {
    setSaving(true)
    const [lat, lng] = marker
    const name = await reverseGeocode(lat, lng)
    setSaving(false)
    const address = name || `${lat.toFixed(5)}, ${lng.toFixed(5)}`
    const loc: StoredDeliveryLocation = { address, lat, lng, city }
    saveDeliveryLocation(loc)
    onAfterSave?.(loc)
    onClose()
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/55 p-0 backdrop-blur-[2px] sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="delivery-map-dialog-title"
    >
      <div className="flex max-h-[min(90vh,640px)] w-full max-w-2xl flex-col rounded-t-3xl border border-white/10 bg-[#1a1d2b] p-4 shadow-2xl sm:rounded-3xl sm:p-5">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 id="delivery-map-dialog-title" className="text-lg font-semibold text-zinc-100">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full px-3 py-1.5 text-sm font-medium text-zinc-400 transition hover:bg-white/10 hover:text-zinc-200"
          >
            Mbyll
          </button>
        </div>
        <p className="mb-2 text-xs text-zinc-500">{description}</p>
        <div className="min-h-[240px] flex-1 overflow-hidden rounded-2xl sm:min-h-[320px]">
          <DeliveryMapPicker
            position={marker}
            onPositionChange={onPreviewAddress ? onPositionChange : simplePositionChange}
            className="h-[min(50vh,360px)] w-full sm:h-[360px]"
          />
        </div>
        {resolving || saving ? (
          <p className="mt-2 text-xs text-zinc-400">
            {saving ? 'Duke ruajtur…' : 'Duke lexuar adresën…'}
          </p>
        ) : null}
        <div className="mt-4 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-white/15 bg-white/5 px-5 py-2.5 text-sm font-medium text-zinc-200 hover:bg-white/10"
          >
            Anulo
          </button>
          <button
            type="button"
            onClick={() => void confirmMapSelection()}
            disabled={saving}
            className="rounded-full bg-gradient-to-b from-amber-500 to-amber-700 px-5 py-2.5 text-sm font-semibold text-zinc-950 shadow-md disabled:opacity-50"
          >
            Ruaj adresën
          </button>
        </div>
      </div>
    </div>
  )
}
