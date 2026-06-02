/**
 * Tipet minimale për Google Maps JS API (OrderTrackingMap, RestaurantGoogleMap).
 * Për tipet e plota: npm install në web/ (@types/google.maps).
 */
declare namespace google.maps {
  enum SymbolPath {
    CIRCLE = 0,
  }

  interface Symbol {
    path?: SymbolPath | string
    scale?: number
    fillColor?: string
    fillOpacity?: number
    strokeColor?: string
    strokeWeight?: number
  }

  interface LatLngLiteral {
    lat: number
    lng: number
  }

  interface MapOptions {
    center?: LatLngLiteral
    zoom?: number
    mapTypeControl?: boolean
    streetViewControl?: boolean
    fullscreenControl?: boolean
  }

  class LatLngBounds {
    extend(point: LatLngLiteral): void
  }

  class Map {
    constructor(mapDiv: HTMLElement, opts?: MapOptions)
    setCenter(center: LatLngLiteral): void
    setZoom(zoom: number): void
    fitBounds(bounds: LatLngBounds, padding?: number): void
    panTo(latLng: LatLngLiteral): void
  }

  interface MarkerOptions {
    map?: Map | null
    position?: LatLngLiteral
    title?: string
    label?: string
    icon?: Symbol | string
  }

  class Marker {
    constructor(opts?: MarkerOptions)
    setMap(map: Map | null): void
    setPosition(position: LatLngLiteral): void
    setTitle(title: string): void
  }
}
