/** Stafi me rol edhe Customer: lejo /app vetëm pas hyrjes me ?next=app|customer ose nga paneli. */
const KEY = 'fd_staff_customer_app'

export function enableStaffCustomerAppMode(): void {
  sessionStorage.setItem(KEY, '1')
}

export function clearStaffCustomerAppMode(): void {
  sessionStorage.removeItem(KEY)
}

export function isStaffCustomerAppModeEnabled(): boolean {
  return sessionStorage.getItem(KEY) === '1'
}
