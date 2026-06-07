import * as signalR from '@microsoft/signalr'
import { apiPath } from './apiBase'

/** StrictMode cleanup ndalon negotiation — mos e loguar si gabim real. */
function isHubNegotiationAbortLog(message: string): boolean {
  const m = message.toLowerCase()
  return m.includes('stopped during negotiation') || m.includes('connection was stopped')
}

/** Event-e që serveri dërgon — noop paraprakisht që mos të dalin warning-e kur faqja dëgjon vetëm një pjesë. */
const ORDERS_HUB_CLIENT_EVENTS = [
  'driverLocation',
  'deliveryChatMessage',
  'deliveryChatSeen',
  'orderStatus',
  'customerOrderStatus',
  'newOrder',
  'deliveryOffer',
  'kitchenNotification',
  'adminNotification',
  'customerNotification',
  'supportTicketMessageReceived',
] as const

function isUnhandledHubMethodLog(message: string): boolean {
  return /no client method with the name/i.test(message)
}

const hubLogger: signalR.ILogger = {
  log(logLevel, message) {
    if (isHubNegotiationAbortLog(message)) return
    if (isUnhandledHubMethodLog(message)) return
    if (logLevel >= signalR.LogLevel.Error) console.error(message)
    else if (logLevel >= signalR.LogLevel.Warning) console.warn(message)
  },
}

function wireOrdersHubNoopHandlers(conn: signalR.HubConnection): void {
  for (const name of ORDERS_HUB_CLIENT_EVENTS) {
    conn.on(name, () => {})
  }
}

export function createOrdersHubConnection(accessToken: string) {
  const url = apiPath('/hubs/orders')
  const sep = url.includes('?') ? '&' : '?'
  const conn = new signalR.HubConnectionBuilder()
    .withUrl(`${url}${sep}access_token=${encodeURIComponent(accessToken)}`, {
      skipNegotiation: false,
      transport:
        signalR.HttpTransportType.WebSockets |
        signalR.HttpTransportType.ServerSentEvents |
        signalR.HttpTransportType.LongPolling,
    })
    .configureLogging(hubLogger)
    .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
    .build()
  wireOrdersHubNoopHandlers(conn)
  return conn
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
const reconnectWired = new WeakSet<signalR.HubConnection>()

export function wireOrdersHubReconnect(conn: signalR.HubConnection, joins: OrdersHubJoin[]): void {
  if (reconnectWired.has(conn)) return
  reconnectWired.add(conn)
  conn.onreconnected(() => {
    void invokeHubJoins(conn, joins).catch((err) => {
      console.warn('[SignalR] re-join pas reconnect dështoi:', err)
    })
  })
}

/** Polling vetëm kur hub-i nuk është i lidhur (disconnected / reconnecting / connecting). */
export function isOrdersHubRealtimeActive(state: signalR.HubConnectionState): boolean {
  return state === signalR.HubConnectionState.Connected
}

/** Sinkronizon state-in e lidhjes për fallback polling. */
export function wireOrdersHubConnectionState(
  conn: signalR.HubConnection,
  setState: (state: signalR.HubConnectionState) => void,
): void {
  const sync = () => setState(conn.state)
  conn.onclose(sync)
  conn.onreconnecting(sync)
  conn.onreconnected(() => {
    sync()
  })
  sync()
}

/** Nis hub-in dhe fut lidhjen në grupet e nevojshme. */
export async function startOrdersHub(
  conn: signalR.HubConnection,
  joins: OrdersHubJoin[],
  opts?: { isCancelled?: () => boolean },
): Promise<void> {
  wireOrdersHubReconnect(conn, joins)
  if (conn.state === signalR.HubConnectionState.Disconnected) {
    await conn.start()
  }
  if (opts?.isCancelled?.()) return
  if (conn.state === signalR.HubConnectionState.Connected) {
    await invokeHubJoins(conn, joins)
  }
}

/** Mos loguar gabime kur cleanup (StrictMode / unmount) ndalon start-in gjatë negotiation. */
export function isHubStartAbortError(err: unknown): boolean {
  if (!(err instanceof Error)) return false
  const msg = err.message.toLowerCase()
  return err.name === 'AbortError' || msg.includes('stopped during negotiation') || msg.includes('connection was stopped')
}
