// Small text helpers shared by the messages and the screens.

export const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

// $5,471 and $21.50, not $5471 and $21.5
export const usd = (n: number) =>
  '$' + n.toLocaleString('en-US', { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 })
