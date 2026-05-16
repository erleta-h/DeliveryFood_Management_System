import { apiPath } from './apiBase'

export type DrivingPreview = {
  serverKeyConfigured: boolean
  coordinatesAvailable: boolean
  distanceMeters: number | null
  durationSeconds: number | null
  message: string | null
}

function authHeader(token: string) {
  return { Authorization: `Bearer ${token}` }
}

export async function fetchDrivingPreview(
  token: string,
  restaurantId: number,
  signal?: AbortSignal,
): Promise<DrivingPreview> {
  const res = await fetch(apiPath(`/api/customer/maps/driving-to-restaurant/${restaurantId}`), {
    headers: { ...authHeader(token) },
    signal,
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json() as Promise<DrivingPreview>
}
