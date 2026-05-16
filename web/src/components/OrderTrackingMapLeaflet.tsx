import { useEffect, useMemo } from 'react'
import { MapContainer, Marker, TileLayer, Tooltip, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

export type TrackingMapPoint = { lat: number; lng: number; title: string; label: string; color: string }

/** Blu paneli / klienti (përputhet me sky në UI). */
const PANEL_RING = '#38bdf8'

function divIcon(label: string, color: string, mini: boolean) {
  const s = mini ? 22 : 30
  const fs = mini ? 10 : 12
  const bw = mini ? 1.5 : 2
  return L.divIcon({
    className: 'fd-order-track-pin',
    html: `<div style="width:${s}px;height:${s}px;border-radius:9999px;background:${color};border:${bw}px solid #0f172a;box-shadow:0 2px 10px rgba(0,0,0,.4),0 1px 3px rgba(0,0,0,.25);display:flex;align-items:center;justify-content:center;font-size:${fs}px;font-weight:800;color:#fff;font-family:'Plus Jakarta Sans',system-ui,sans-serif">${label}</div>`,
    iconSize: [s, s],
    iconAnchor: [s / 2, s / 2],
  })
}

/** Pin Wolt-style: kroje e zezë, unazë blu si paneli, numër i bardhë + «MIN» gri. */
function driverEtaPinIcon(etaMinutes: number): L.DivIcon {
  const n = Math.max(1, Math.round(etaMinutes))
  const rr = 14.5
  const c = 2 * Math.PI * rr
  const pct = Math.min(0.92, Math.max(0.22, n / 48))
  const dash = pct * c
  const html = `<div class="fd-driver-eta-pin-inner" style="position:relative;width:56px;height:72px">
<svg width="56" height="72" viewBox="0 0 56 72" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
<path d="M28 4.5C15.02 4.5 5 14.02 5 25.2c0 10.8 15.8 35.6 22.2 41.3.45.4 1.1.4 1.55 0C35.2 60.8 51 36 51 25.2 51 14.02 40.98 4.5 28 4.5z" fill="#0a0a0b" stroke="#3f3f46" stroke-width="1"/>
<g transform="translate(28,22.5) rotate(-90)">
<circle cx="0" cy="0" r="${rr}" fill="none" stroke="#3f3f46" stroke-width="2.5"/>
<circle cx="0" cy="0" r="${rr}" fill="none" stroke="${PANEL_RING}" stroke-width="2.5" stroke-linecap="round" stroke-dasharray="${dash} ${c}"/>
</g>
<circle cx="28" cy="65.5" r="3.8" fill="${PANEL_RING}" stroke="rgba(255,255,255,.92)" stroke-width="1.2"/>
</svg>
<div style="position:absolute;left:0;right:0;top:11px;text-align:center;pointer-events:none;font-family:'Plus Jakarta Sans',system-ui,sans-serif">
<div style="font-size:19px;font-weight:700;color:#fff;line-height:1;letter-spacing:-0.03em">${n}</div>
<div style="font-size:8px;font-weight:600;color:#a1a1aa;text-transform:uppercase;letter-spacing:.14em;margin-top:3px">MIN</div>
</div>
</div>`
  return L.divIcon({
    className: 'fd-order-track-pin fd-driver-eta-pin',
    html,
    iconSize: [56, 72],
    iconAnchor: [28, 70],
  })
}

function FitAllMarkers({
  points,
  mini,
}: {
  points: L.LatLngExpression[]
  mini?: boolean
}) {
  const map = useMap()
  useEffect(() => {
    if (points.length === 0) return
    if (points.length === 1) {
      map.setView(points[0] as L.LatLngTuple, mini ? 17 : 15)
      return
    }
    map.fitBounds(L.latLngBounds(points as L.LatLngTuple[]), {
      padding: mini ? [10, 10] : [44, 44],
      maxZoom: mini ? 17 : 16,
    })
  }, [map, points, mini])
  return null
}

/** Përndjek korrierin kur përditësohet GPS (pa e rifilluar gjithë hartën). */
function PanToDriver({ driver }: { driver: { lat: number; lng: number } | null }) {
  const map = useMap()
  useEffect(() => {
    if (!driver) return
    map.panTo([driver.lat, driver.lng], { animate: true, duration: 0.35 })
  }, [map, driver?.lat, driver?.lng])
  return null
}

type Props = {
  restaurant: TrackingMapPoint | null
  customer: TrackingMapPoint | null
  driver: TrackingMapPoint | null
  className?: string
  /** Nëse true, harta përpiqet të mbajë korrierin në fokus kur lëviz. */
  followDriver?: boolean
  /**
   * Harta e vogël (widget): pa kontrolle, pa tërheqje — për prerje rrethore te klienti.
   * Attribution shfaqet si tekst minimal në wrapper nga prindi.
   */
  variant?: 'default' | 'mini'
  /** Minuta ETA — marker i korrierit bëhet pin me unazë blu (jo vetëm «D»). */
  driverEtaMinutes?: number | null
}

/**
 * Gjurmim porosie me OpenStreetMap — nuk kërkon GoogleMaps:BrowserApiKey.
 */
export function OrderTrackingMapLeaflet({
  restaurant,
  customer,
  driver,
  className,
  followDriver = true,
  variant = 'default',
  driverEtaMinutes = null,
}: Props) {
  const mini = variant === 'mini'
  const markers = useMemo(() => {
    const list: { key: string; pos: [number, number]; title: string; icon: L.Icon | L.DivIcon }[] = []
    if (restaurant) {
      list.push({
        key: 'r',
        pos: [restaurant.lat, restaurant.lng],
        title: restaurant.title,
        icon: divIcon('R', '#d97706', mini),
      })
    }
    if (customer) {
      list.push({
        key: 'k',
        pos: [customer.lat, customer.lng],
        title: customer.title,
        icon: divIcon('K', '#38bdf8', mini),
      })
    }
    if (driver) {
      const useEtaPin =
        !mini &&
        driverEtaMinutes != null &&
        Number.isFinite(driverEtaMinutes) &&
        driverEtaMinutes > 0
      list.push({
        key: 'd',
        pos: [driver.lat, driver.lng],
        title: driver.title,
        icon: useEtaPin
          ? driverEtaPinIcon(driverEtaMinutes)
          : divIcon('D', PANEL_RING, mini),
      })
    }
    return list
  }, [restaurant, customer, driver, mini, driverEtaMinutes])

  const center: [number, number] = markers[0]?.pos ?? [42.6629, 21.1655]
  const points = useMemo(() => markers.map((m) => m.pos as L.LatLngTuple), [markers])

  const wrap =
    className ??
    (mini
      ? 'h-full w-full overflow-hidden'
      : 'h-56 w-full overflow-hidden rounded-xl border border-white/[0.08] sm:h-[min(50vh,22rem)]')

  if (markers.length === 0) {
    return (
      <div
        className={`flex items-center justify-center rounded-xl border border-white/10 bg-zinc-900/50 p-8 text-center text-sm text-zinc-500 ${wrap}`}
      >
        Nuk ka koordinata për hartë (adresa pa GPS ose të dhëna të paplotë).
      </div>
    )
  }

  return (
    <div className={mini ? `fd-float-mini-leaflet ${wrap}`.trim() : wrap}>
      <MapContainer
        center={center}
        zoom={14}
        className={
          mini
            ? 'isolate z-0 h-full w-full [&_.leaflet-control-container]:hidden'
            : 'isolate z-0 h-full w-full [&_.leaflet-control-attribution]:text-[10px] [&_.leaflet-control-attribution]:opacity-80'
        }
        scrollWheelZoom={!mini}
        dragging={!mini}
        zoomControl={!mini}
        doubleClickZoom={!mini}
        boxZoom={!mini}
        keyboard={!mini}
        attributionControl={!mini}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitAllMarkers points={points} mini={mini} />
        {followDriver && driver ? <PanToDriver driver={driver} /> : null}
        {markers.map((m) => (
          <Marker key={m.key} position={m.pos} icon={m.icon}>
            {!mini ? (
              <Tooltip direction="top" offset={[0, -18]} opacity={1}>
                {m.title}
              </Tooltip>
            ) : null}
          </Marker>
        ))}
      </MapContainer>
    </div>
  )
}
