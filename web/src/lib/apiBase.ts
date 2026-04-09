/** Bazë URL për API: bosh = rrugë relative (Vite proxy në dev). */
export function apiPath(path: string): string {
  const raw = import.meta.env.VITE_API_URL
  const base =
    typeof raw === 'string'
      ? raw.trim().replace(/\/$/, '')
      : ''
  const p = path.startsWith('/') ? path : `/${path}`
  return base ? `${base}${p}` : p
}
