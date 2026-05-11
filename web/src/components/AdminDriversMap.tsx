import { useEffect } from 'react'
import { MapContainer, Marker, TileLayer, Tooltip, useMap } from 'react-leaflet'
import L from 'leaflet'
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'
import 'leaflet/dist/leaflet.css'

export type AdminDriverMapPoint = {
  userId: number
  lat: number
  lng: number
  label: string
}

const pinIcon = L.icon({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
})

function FitDeliverBounds({ drivers }: { drivers: AdminDriverMapPoint[] }) {
  const map = useMap()
  useEffect(() => {
    if (drivers.length === 0) return
    const pts = drivers.map((d) => L.latLng(d.lat, d.lng))
    if (pts.length === 1) {
      map.setView(pts[0], 13)
      return
    }
    map.fitBounds(L.latLngBounds(pts), { padding: [48, 48], maxZoom: 15 })
  }, [map, drivers])
  return null
}

type Props = {
  drivers: AdminDriverMapPoint[]
  className?: string
}

export function AdminDriversMap({ drivers, className }: Props) {
  if (drivers.length === 0) return null

  const center: [number, number] = [drivers[0].lat, drivers[0].lng]

  const wrapper =
    'h-72 w-full overflow-hidden rounded-xl border border-white/[0.08]' +
    (className ? ` ${className}` : '')

  return (
    <div className={wrapper}>
      <MapContainer
        center={center}
        zoom={13}
        className="isolate z-0 h-full w-full [&_.leaflet-control-attribution]:text-[10px] [&_.leaflet-control-attribution]:opacity-80"
        scrollWheelZoom
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitDeliverBounds drivers={drivers} />
        {drivers.map((d) => (
          <Marker key={d.userId} position={[d.lat, d.lng]} icon={pinIcon}>
            <Tooltip direction="top" offset={[0, -36]} opacity={1} permanent={false}>
              {d.label}
            </Tooltip>
          </Marker>
        ))}
      </MapContainer>
    </div>
  )
}
