export type CustomerEmailChannel = 'gmail' | 'outlook-web' | 'outlook-office' | 'local-app'

export function gmailComposeUrl(to: string): string {
  return `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(to)}`
}

export function outlookWebComposeUrl(to: string): string {
  return `https://outlook.live.com/mail/0/deeplink/compose?to=${encodeURIComponent(to)}`
}

export function outlookOfficeComposeUrl(to: string): string {
  return `https://outlook.office.com/mail/deeplink/compose?to=${encodeURIComponent(to)}`
}

export function mailtoUrl(to: string): string {
  return `mailto:${to}`
}

export function openCustomerEmailChannel(channel: CustomerEmailChannel, to: string): void {
  const url =
    channel === 'gmail'
      ? gmailComposeUrl(to)
      : channel === 'outlook-web'
        ? outlookWebComposeUrl(to)
        : channel === 'outlook-office'
          ? outlookOfficeComposeUrl(to)
          : mailtoUrl(to)
  window.open(url, '_blank', 'noopener,noreferrer')
}

export async function copyCustomerEmail(to: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(to)
    return true
  } catch {
    return false
  }
}
