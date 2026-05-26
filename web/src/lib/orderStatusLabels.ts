/** Përputhet me `OrderStatus` në backend (`FoodDelivery.Application.Orders.OrderStatus`). */
export const ORDER_STATUS_PENDING = 0
export const ORDER_STATUS_CONFIRMED = 1
export const ORDER_STATUS_PREPARING = 2
export const ORDER_STATUS_OUT_FOR_DELIVERY = 3
export const ORDER_STATUS_DELIVERED = 4
export const ORDER_STATUS_READY_FOR_PICKUP = 5
export const ORDER_STATUS_CANCELLED = 9

/** Faza Deliver: korrieri niset te klienti (`DeliveryDriverLeg.EnRouteToCustomer`). */
export const DELIVERY_LEG_EN_ROUTE_TO_CUSTOMER = 3

export function isTerminalOrderStatus(status: number): boolean {
  return status === ORDER_STATUS_DELIVERED || status === ORDER_STATUS_CANCELLED
}

type OrderRouteHint = {
  status: number
  fulfillmentType?: number
  deliveryLegStatus?: number | null
}

/** Dërgesë aktive — korrieri në rrugë drejt klientit. */
export function isCourierEnRouteToCustomer(order: OrderRouteHint): boolean {
  if (order.fulfillmentType === 1) return false
  if (order.deliveryLegStatus === DELIVERY_LEG_EN_ROUTE_TO_CUSTOMER) return true
  return order.status === ORDER_STATUS_OUT_FOR_DELIVERY
}


/** Përputhet me `OrderStatus` në backend. */
export const orderStatusLabelSq: Record<number, string> = {
  0: 'Në pritje',
  1: 'Konfirmuar',
  2: 'Në përgatitje',
  3: 'Në dërgesë',
  4: 'Dorëzuar',
  5: 'Gati për marrje (driver)',
  9: 'Anuluar',
}

export function formatOrderStatus(status: number): string {
  return orderStatusLabelSq[status] ?? `Status ${status}`
}
