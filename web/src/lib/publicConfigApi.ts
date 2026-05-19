import { apiPath } from './apiBase'

export type ClientPublicConfig = {
  googleMapsBrowserApiKey: string | null
  stripePublishableKey: string | null
  webPushVapidPublicKey: string | null
}

export async function fetchClientPublicConfig(signal?: AbortSignal): Promise<ClientPublicConfig> {
  const res = await fetch(apiPath('/api/public/client-config'), { signal })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json() as Promise<ClientPublicConfig>
}
