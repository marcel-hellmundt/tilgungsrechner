import type { ScheduleEntry } from './calc'

export interface Person {
  id: string
  name: string
  /** ISO-Datum YYYY-MM-DD, leer wenn noch nicht eingetragen */
  birthDate: string
}

export const RETIREMENT_AGE = 67

export interface Retirement {
  /** Erster Monat der Rente (Monat nach dem 67. Geburtstag) */
  start: Date
  /**
   * Nummer der Rate, die in den Rentenbeginn fällt. Die erste Rate ist im nächsten Monat fällig,
   * daher entspricht die Nummer den Monaten ab heute.
   */
  rateNumber: number
}

export function retirementOf(person: Person, today = new Date()): Retirement | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(person.birthDate)
  if (!match) return null
  const [year, month] = [Number(match[1]), Number(match[2])]
  // Regelaltersrente beginnt im Monat nach Erreichen der Altersgrenze
  const start = new Date(year + RETIREMENT_AGE, month, 1)
  const rateNumber = (start.getFullYear() - today.getFullYear()) * 12 + (start.getMonth() - today.getMonth())
  return { start, rateNumber }
}

/** Restschuld zu Beginn des Monats mit Rate `rateNumber` (also nach der vorherigen Rate). */
export function balanceBeforeRate(schedule: ScheduleEntry[], loanAmount: number, rateNumber: number): number {
  if (rateNumber <= 1) return loanAmount
  return schedule[rateNumber - 2]?.balance ?? 0
}

export function createPerson(): Person {
  const id = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`
  return { id, name: '', birthDate: '' }
}

/** Accepts only well-formed person entries from untrusted storage. */
export function parsePersons(raw: unknown): Person[] | null {
  if (!Array.isArray(raw)) return null
  return raw
    .filter(
      (p): p is Person =>
        typeof p === 'object' &&
        p !== null &&
        typeof p.id === 'string' &&
        typeof p.name === 'string' &&
        typeof p.birthDate === 'string',
    )
    .map(({ id, name, birthDate }) => ({ id, name, birthDate }))
}
