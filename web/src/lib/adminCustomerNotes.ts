const PREFIX = 'fd-admin-customer-note-'

export function loadCustomerAdminNote(customerId: number): string {
  try {
    return localStorage.getItem(`${PREFIX}${customerId}`) ?? ''
  } catch {
    return ''
  }
}

export function saveCustomerAdminNote(customerId: number, text: string): void {
  try {
    const trimmed = text.trim()
    if (!trimmed) {
      localStorage.removeItem(`${PREFIX}${customerId}`)
      return
    }
    localStorage.setItem(`${PREFIX}${customerId}`, trimmed)
  } catch {
    /* ignore */
  }
}
