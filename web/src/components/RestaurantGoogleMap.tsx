import { useEffect, useRef } from 'react'
import { loadGoogleMapsJs } from '../lib/loadGoogleMaps'

type Props = {
  apiKey: string
  lat: number
  lng: number
  /** Klasa Tailwind për lartësi/gjerësi, p.sh. h-52 w-full rounded-xl */
  className?: string
}

export function RestaurantGoogleMap({ apiKey, lat, lng, className }: Props) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let cancelled = false

    ;(async () => {
      try {
        await loadGoogleMapsJs(apiKey)
        if (cancelled || !ref.current) return
        const center = { lat, lng }
        const map = new google.maps.Map(ref.current, {
          center,
          zoom: 16,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: true,
        })
        new google.maps.Marker({
          position: center,
          map,
          title: 'Restoranti',
        })
      } catch {
        /* UI prapa — faqja tregon adresë tekst */
      }
    })()

    return () => {
      cancelled = true
    }
  }, [apiKey, lat, lng])

  return (
    <div
      ref={ref}
      className={className ?? 'h-52 w-full overflow-hidden rounded-xl border border-white/[0.08]'}
      aria-label="Harta e restorantit"
    />
  )
}
