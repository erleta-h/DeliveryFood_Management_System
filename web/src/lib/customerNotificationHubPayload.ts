/** Payload nga hub `customerOrderStatus` (camelCase ose PascalCase). */
export function parseCustomerOrderStatusPayload(raw: unknown): {
  orderId: number
  status: number
  orderNumber: string
  title: string
  message: string
} | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  const orderId = Number(r.orderId ?? r.OrderId)
  const status = Number(r.status ?? r.Status)
  const orderNumber = String(r.orderNumber ?? r.OrderNumber ?? '')
  const title = String(r.title ?? r.Title ?? 'Porosia')
  const message = String(r.message ?? r.Message ?? '')
  if (!Number.isFinite(orderId) || !Number.isFinite(status)) return null
  return { orderId, status, orderNumber, title, message }
}
