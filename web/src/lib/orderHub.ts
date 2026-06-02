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
    .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
    .build()
}

export type OrdersHubJoin =
  | { kind: 'order'; orderId: number }
  | { kind: 'driver' }
  | { kind: 'customer' }
  | { kind: 'restaurant'; restaurantId: number }
  | { kind: 'admin' }
  | { kind: 'kitchen' }

async function invokeHubJoins(conn: signalR.HubConnection, joins: OrdersHubJoin[]): Promise<void> {
  for (const j of joins) {
    switch (j.kind) {
      case 'order':
        await conn.invoke('JoinOrder', j.orderId)
        break
      case 'driver':
        await conn.invoke('JoinDriver')
        break
      case 'customer':
        await conn.invoke('JoinCustomer')
        break
      case 'restaurant':
        await conn.invoke('JoinRestaurant', j.restaurantId)
        break
      case 'admin':
        await conn.invoke('JoinAdmin')
        break
      case 'kitchen':
        await conn.invoke('JoinKitchen')
        break
    }
  }
}

/** Pas reconnect, SignalR nuk rikthen grupet — duhet JoinOrder/JoinDriver përsëri. */
export function wireOrdersHubReconnect(conn: signalR.HubConnection, joins: OrdersHubJoin[]): void {
  conn.onreconnected(() => {
    void invokeHubJoins(conn, joins).catch((err) => {
      console.warn('[SignalR] re-join pas reconnect dështoi:', err)
    })
  })
}

/** Nis hub-in dhe fut lidhjen në grupet e nevojshme. */
export async function startOrdersHub(
  conn: signalR.HubConnection,
  joins: OrdersHubJoin[],
): Promise<void> {
  wireOrdersHubReconnect(conn, joins)
  await conn.start()
  await invokeHubJoins(conn, joins)
}
