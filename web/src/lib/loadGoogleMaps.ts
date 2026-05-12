/** Ngarkon Maps JavaScript API një herë për faqe (referrer-restricted key). */
let mapsLoadPromise: Promise<void> | null = null

export function loadGoogleMapsJs(apiKey: string): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve()
  if (window.google?.maps) return Promise.resolve()

  if (mapsLoadPromise) return mapsLoadPromise

  const existing = document.getElementById('fd-google-maps-js') as HTMLScriptElement | null
  if (existing?.dataset.loaded === '1') return Promise.resolve()
  if (existing && existing.dataset.loaded !== '1') {
    mapsLoadPromise = new Promise((resolve, reject) => {
      existing.addEventListener('load', () => resolve(), { once: true })
      existing.addEventListener('error', () => reject(new Error('Google Maps')), { once: true })
    })
    return mapsLoadPromise
  }

  mapsLoadPromise = new Promise((resolve, reject) => {
    const s = document.createElement('script')
    s.id = 'fd-google-maps-js'
    s.async = true
    s.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}`
    s.onload = () => {
      s.dataset.loaded = '1'
      resolve()
    }
    s.onerror = () => {
      mapsLoadPromise = null
      reject(new Error('Nuk u ngarkua Google Maps.'))
    }
    document.head.appendChild(s)
  })
  return mapsLoadPromise
}
