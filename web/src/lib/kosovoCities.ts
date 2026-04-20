export type CityOption = {
  name: string
  lat: number
  lon: number
}

/** Qendra e përafërt e hartës për qytete në Kosovë / rajon. */
export const KOSOVO_CITIES: CityOption[] = [
  { name: 'Prishtinë', lat: 42.6629, lon: 21.1655 },
  { name: 'Prizren', lat: 42.2139, lon: 20.7397 },
  { name: 'Pejë', lat: 42.6593, lon: 20.2883 },
  { name: 'Gjakovë', lat: 42.3803, lon: 20.4308 },
  { name: 'Mitrovicë', lat: 42.8833, lon: 20.8667 },
  { name: 'Mitrovica', lat: 42.8833, lon: 20.8667 },
  { name: 'Ferizaj', lat: 42.3706, lon: 21.1553 },
  { name: 'Gjilan', lat: 42.4639, lon: 21.4694 },
]

/** Qendër e përafërt e hartës sipas emrit të qytetit (për modal harte). */
export function getApproxCoordsForCity(cityName: string): [number, number] {
  const n = cityName.trim().toLowerCase()
  if (!n) return [KOSOVO_CITIES[0]!.lat, KOSOVO_CITIES[0]!.lon]
  const hit = KOSOVO_CITIES.find((c) => {
    const cn = c.name.toLowerCase()
    return n.includes(cn.slice(0, 5)) || cn.includes(n.slice(0, 5))
  })
  return hit ? [hit.lat, hit.lon] : [KOSOVO_CITIES[0]!.lat, KOSOVO_CITIES[0]!.lon]
}
