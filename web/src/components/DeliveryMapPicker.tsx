import { useEffect, useRef } from 'react'
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'
import 'leaflet/dist/leaflet.css'



const pinIcon = L.icon({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
})

type Props = {
  position: [number, number]
  onPositionChange: (lat: number, lng: number) => void
  className?: string
}

function MapClickPlace({ onClick }: { onClick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onClick(e.latlng.lat, e.latlng.lng)
    },
  })
  return null
}

/** Ruan qendrimin fillestar; fluturon te pika e re vetëm pas ndryshimeve (jo në mount). */
function FlyToPosition({ position, zoom }: { position: [number, number]; zoom: number }) {
  const map = useMap()
  const skip = useRef(true)
  useEffect(() => {
    if (skip.current) {
      skip.current = false
      return
    }
    map.flyTo(position, zoom, { duration: 0.45 })
  }, [position[0], position[1], zoom, map])
  return null
}

export function DeliveryMapPicker({ position, onPositionChange, className }: Props) {
  return (
    <div
      className={
        className ??
        'h-[280px] w-full overflow-hidden rounded-2xl shadow-[0_12px_40px_-8px_rgba(0,0,0,0.35)] ring-1 ring-black/10 sm:h-[360px]'
      }
    >
      <MapContainer
        center={position}
        zoom={15}
        className="isolate h-full w-full [&_.leaflet-control-attribution]:text-[10px] [&_.leaflet-control-attribution]:opacity-80"
        scrollWheelZoom
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FlyToPosition position={position} zoom={15} />
        <MapClickPlace onClick={onPositionChange} />
        <Marker
          position={position}
          icon={pinIcon}
          draggable
          eventHandlers={{
            dragend: (e : any) => {
              const ll = e.target.getLatLng()
              onPositionChange(ll.lat, ll.lng)
            },
          }}
        />
      </MapContainer>
    </div>
  )
}
