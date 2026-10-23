const currency = new Intl.NumberFormat('de-DE', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
})

const currencyExact = new Intl.NumberFormat('de-DE', {
  style: 'currency',
  currency: 'EUR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

const number = new Intl.NumberFormat('de-DE', { maximumFractionDigits: 2 })

export const formatCurrency = (value: number) => currency.format(value)
export const formatCurrencyExact = (value: number) => currencyExact.format(value)
export const formatNumber = (value: number) => number.format(value)
export const formatPercent = (value: number) => `${number.format(value)} %`

/** Parses German-formatted input like "400.000" or "3,5". Returns NaN if invalid. */
export function parseNumber(input: string): number {
  const normalized = input.trim().replace(/\s|€|%/g, '').replace(/\./g, '').replace(',', '.')
  if (normalized === '') return NaN
  return Number(normalized)
}

const monthYear = new Intl.DateTimeFormat('de-DE', { month: 'long', year: 'numeric' })

/**
 * Month in which rate number `monthsFromNow` is due. The loan starts on the 1st of next month,
 * so rate 1 falls into next month (today 15.10.2026 → rate 1 = November 2026).
 */
export function formatMonthYear(monthsFromNow: number): string {
  const now = new Date()
  return monthYear.format(new Date(now.getFullYear(), now.getMonth() + monthsFromNow, 1))
}

export function formatDuration(months: number): string {
  let years = Math.floor(months / 12)
  let rest = Math.round(months % 12)
  if (rest === 12) {
    years += 1
    rest = 0
  }
  const y = `${years} ${years === 1 ? 'Jahr' : 'Jahre'}`
  return rest === 0 ? y : `${y}, ${rest} ${rest === 1 ? 'Monat' : 'Monate'}`
}
