import { useEffect, useMemo, useRef, useState } from 'react'
import { loadGoogleMapsJs } from '../lib/loadGoogleMaps'

export type MapPoint = { lat: number; lng: number; title: string }

type Props = {
  apiKey: string
  restaurant: MapPoint | null
  customer: MapPoint | null
  driver: MapPoint | null
  className?: string
}

function circleIcon(color: string): google.maps.Symbol {
  return {
    path: google.maps.SymbolPath.CIRCLE,
    scale: 10,
    fillColor: color,
    fillOpacity: 0.95,
    strokeColor: '#0f172a',
    strokeWeight: 2,
  }
}

/** Harta me R/K fiks; korrieri D përditësohet me setPosition (live GPS). */
export function OrderTrackingMap({ apiKey, restaurant, customer, driver, className }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<google.maps.Map | null>(null)
  const rMarkerRef = useRef<google.maps.Marker | null>(null)
  const cMarkerRef = useRef<google.maps.Marker | null>(null)
  const dMarkerRef = useRef<google.maps.Marker | null>(null)
  const [mapReady, setMapReady] = useState(false)

  const staticKey = useMemo(
    () =>
      `${restaurant?.lat ?? ''},${restaurant?.lng ?? ''}|${customer?.lat ?? ''},${customer?.lng ?? ''}`,
    [restaurant?.lat, restaurant?.lng, customer?.lat, customer?.lng],
  )

  useEffect(() => {
    if (!restaurant && !customer && !driver) return

    let cancelled = false
    setMapReady(false)
    dMarkerRef.current?.setMap(null)
    dMarkerRef.current = null
    rMarkerRef.current?.setMap(null)
    cMarkerRef.current?.setMap(null)
    rMarkerRef.current = null
    cMarkerRef.current = null
    mapRef.current = null

    ;(async () => {
      try {
        await loadGoogleMapsJs(apiKey)
        if (cancelled || !containerRef.current) return

        const map = new google.maps.Map(containerRef.current, {
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: true,
        })
        mapRef.current = map

        const bounds = new google.maps.LatLngBounds()
        if (restaurant) {
          bounds.extend(restaurant)
          rMarkerRef.current = new google.maps.Marker({
            map,
            position: restaurant,
            title: restaurant.title,
            label: 'R',
            icon: circleIcon('#f59e0b'),
          })
        }
        if (customer) {
          bounds.extend(customer)
          cMarkerRef.current = new google.maps.Marker({
            map,
            position: customer,
            title: customer.title,
            label: 'K',
            icon: circleIcon('#38bdf8'),
          })
        }
        if (driver) {
          bounds.extend(driver)
          dMarkerRef.current = new google.maps.Marker({
            map,
            position: driver,
            title: driver.title,
            label: 'D',
            icon: circleIcon('#34d399'),
          })
        }

        const count = (restaurant ? 1 : 0) + (customer ? 1 : 0) + (driver ? 1 : 0)
        if (count === 1) {
          const p = restaurant ?? customer ?? driver!
          map.setCenter(p)
          map.setZoom(15)
        } else if (count > 1) {
          map.fitBounds(bounds, 48)
        }

        if (!cancelled) setMapReady(true)
      } catch {
        if (!cancelled) setMapReady(false)
      }
    })()

    return () => {
      cancelled = true
      setMapReady(false)
    }
    // staticKey = R/K; `driver != null` rifillon hartën vetëm kur D shfaqet/zhduket, jo në çdo GPS tick.
  }, [apiKey, staticKey, driver != null])

  useEffect(() => {
    if (!mapReady) return
    const map = mapRef.current
    if (!map) return

    if (driver) {
      if (dMarkerRef.current) {
        dMarkerRef.current.setPosition({ lat: driver.lat, lng: driver.lng })
        dMarkerRef.current.setTitle(driver.title)
        dMarkerRef.current.setMap(map)
        map.panTo({ lat: driver.lat, lng: driver.lng })
      } else {
        dMarkerRef.current = new google.maps.Marker({
          map,
          position: driver,
          title: driver.title,
          label: 'D',
          icon: circleIcon('#34d399'),
        })
      }
    } else {
      dMarkerRef.current?.setMap(null)
      dMarkerRef.current = null
    }
  }, [mapReady, driver?.lat, driver?.lng, driver?.title])

  return (
    <div
      ref={containerRef}
      className={
        className ?? 'h-56 w-full overflow-hidden rounded-xl border border-white/[0.08] sm:h-64'
      }
      aria-label="Gjurmimi në hartë"
    />
  )
}
