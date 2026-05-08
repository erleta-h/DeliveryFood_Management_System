import * as signalR from '@microsoft/signalr'
import { apiPath } from './apiBase'

export function createOrdersHubConnection(accessToken: string) {
  const url = apiPath('/hubs/orders')
  const sep = url.includes('?') ? '&' : '?'
  return new signalR.HubConnectionBuilder()
    .withUrl(`${url}${sep}access_token=${encodeURIComponent(accessToken)}`, {
      skipNegotiation: false,
      transport:
        signalR.HttpTransportType.WebSockets |
        signalR.HttpTransportType.ServerSentEvents |
        signalR.HttpTransportType.LongPolling,
    })
    .withAutomaticReconnect()
    .build()
}
