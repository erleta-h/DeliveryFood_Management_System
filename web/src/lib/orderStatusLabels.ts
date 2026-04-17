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
