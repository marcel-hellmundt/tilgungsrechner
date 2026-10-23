export interface LoanInput {
  /** Kaufpreis in € */
  purchasePrice: number
  /** Grunderwerbsteuer in % vom Kaufpreis */
  landTransferTax: number
  /** Notar- und Grundbuchkosten in % vom Kaufpreis */
  notaryFees: number
  /** Maklerprovision in % vom Kaufpreis */
  brokerFee: number
  /** Modernisierungskosten in € */
  renovationCosts: number
  /** Eigenkapital in € */
  equity: number
  /** Darlehen auf den nächsten vollen 1.000er aufrunden */
  roundUpLoan: boolean
  /** Sollzins p. a. in % */
  interestRate: number
  /** Monatliche Rate in € (fix; die anfängliche Tilgung ergibt sich daraus) */
  monthlyRate: number
  /** Vertraglich mögliche Sondertilgung p. a. in % vom Darlehen */
  specialRepayment: number
  /** Genutzter Anteil der möglichen Sondertilgung in %, monatlich zusätzlich zur Rate gezahlt */
  specialRepaymentUsage: number
  /** Zinsbindung in Jahren */
  fixedRateYears: number
}

export interface LoanResult {
  landTransferTaxAmount: number
  notaryFeesAmount: number
  brokerFeeAmount: number
  /** Summe der Kaufnebenkosten in € */
  closingCosts: number
  /** Kaufpreis + Nebenkosten + Modernisierung */
  totalCosts: number
  /** Betrag, um den das Darlehen durch das Aufrunden erhöht wurde */
  roundingAmount: number
  loanAmount: number
  /** Beleihungsauslauf: Darlehen im Verhältnis zum Kaufpreis in % */
  loanToValue: number
  monthlyRate: number
  /** Anfängliche Tilgung p. a. in %, abgeleitet aus Rate, Zins und Darlehen */
  initialRepayment: number
  /** Maximal mögliche Sondertilgung pro Jahr in € */
  specialRepaymentAmount: number
  /** Genutzte Sondertilgung pro Monat in € */
  monthlySpecialRepayment: number
  /** Tatsächliche monatliche Zahlung: Rate + genutzte Sondertilgung */
  monthlyPayment: number
  /** Restschuld am Ende der Zinsbindung in € (inkl. genutzter Sondertilgung) */
  remainingDebt: number
  /** Restschuld im Verhältnis zum Darlehen in % */
  remainingDebtPercent: number
  /** Laufzeit bis zur vollständigen Tilgung in Monaten (Infinity, wenn nie getilgt) */
  termMonths: number
  totalInterest: number
  totalPaid: number
}

/** Klassisches Annuitätendarlehen mit konstanter Monatsrate. */
export function calculateLoan(input: LoanInput): LoanResult {
  const percentOfPrice = (percent: number) => (input.purchasePrice * percent) / 100
  const landTransferTaxAmount = percentOfPrice(input.landTransferTax)
  const notaryFeesAmount = percentOfPrice(input.notaryFees)
  const brokerFeeAmount = percentOfPrice(input.brokerFee)
  const closingCosts = landTransferTaxAmount + notaryFeesAmount + brokerFeeAmount
  const totalCosts = input.purchasePrice + closingCosts + input.renovationCosts

  const requiredLoan = Math.max(0, totalCosts - input.equity)
  const loanAmount = input.roundUpLoan ? Math.ceil(requiredLoan / 1000) * 1000 : requiredLoan
  const roundingAmount = loanAmount - requiredLoan
  const loanToValue = input.purchasePrice > 0 ? (loanAmount / input.purchasePrice) * 100 : 0
  const monthlyInterest = input.interestRate / 100 / 12
  const monthlyRate = input.monthlyRate
  const initialRepayment = loanAmount > 0 ? (monthlyRate * 12 * 100) / loanAmount - input.interestRate : 0
  const specialRepaymentAmount = (loanAmount * input.specialRepayment) / 100
  const monthlySpecialRepayment = (specialRepaymentAmount * input.specialRepaymentUsage) / 100 / 12
  const monthlyPayment = monthlyRate + monthlySpecialRepayment

  let termMonths: number
  if (loanAmount === 0) {
    termMonths = 0
  } else if (monthlyPayment <= loanAmount * monthlyInterest) {
    termMonths = Infinity
  } else if (monthlyInterest === 0) {
    termMonths = loanAmount / monthlyPayment
  } else {
    termMonths =
      -Math.log(1 - (monthlyInterest * loanAmount) / monthlyPayment) / Math.log(1 + monthlyInterest)
  }

  const remainingDebt = remainingDebtAfter(loanAmount, monthlyInterest, monthlyPayment, input.fixedRateYears * 12)

  const totalPaid = Number.isFinite(termMonths) ? monthlyPayment * termMonths : Infinity
  return {
    landTransferTaxAmount,
    notaryFeesAmount,
    brokerFeeAmount,
    closingCosts,
    totalCosts,
    roundingAmount,
    loanAmount,
    loanToValue,
    monthlyRate,
    initialRepayment,
    specialRepaymentAmount,
    monthlySpecialRepayment,
    monthlyPayment,
    remainingDebt,
    remainingDebtPercent: loanAmount > 0 ? (remainingDebt / loanAmount) * 100 : 0,
    termMonths,
    totalInterest: totalPaid - loanAmount,
    totalPaid,
  }
}

/** Annahmen für den Zins der Anschlussfinanzierung, relativ zum aktuellen Sollzins */
export const FOLLOW_UP_SCENARIOS = [
  { key: 'optimistic', label: 'Optimistisch', factor: 0.75 },
  { key: 'base', label: 'Gleichbleibend', factor: 1 },
  { key: 'pessimistic', label: 'Negativ', factor: 1.3 },
] as const

export type ScenarioKey = (typeof FOLLOW_UP_SCENARIOS)[number]['key']

export interface Scenario {
  key: ScenarioKey
  label: string
  /** Sollzins nach Ende der Zinsbindung in % */
  followUpRate: number
  schedule: ScheduleEntry[]
}

export function followUpScenarios(input: LoanInput, result: LoanResult): Scenario[] {
  return FOLLOW_UP_SCENARIOS.map(({ key, label, factor }) => ({
    key,
    label,
    followUpRate: input.interestRate * factor,
    schedule: amortizationSchedule(input, result, factor),
  }))
}

export interface ScheduleEntry {
  /** Laufende Nummer der Rate, beginnend bei 1 */
  month: number
  interest: number
  principal: number
  /** Restschuld nach dieser Rate */
  balance: number
}

const MAX_SCHEDULE_MONTHS = 100 * 12

/**
 * Monatlicher Tilgungsplan bis zur Volltilgung; die genutzte Sondertilgung wird monatlich mitgetilgt.
 * Nach Ende der Zinsbindung gilt der Sollzins × `followUpFactor`, die Zahlung bleibt gleich.
 */
export function amortizationSchedule(input: LoanInput, result: LoanResult, followUpFactor = 1): ScheduleEntry[] {
  const fixedMonths = input.fixedRateYears * 12
  const monthlyInterest = input.interestRate / 100 / 12
  const followUpInterest = monthlyInterest * followUpFactor
  const schedule: ScheduleEntry[] = []
  let balance = result.loanAmount

  for (let month = 1; balance > 0.005 && month <= MAX_SCHEDULE_MONTHS; month++) {
    const interest = balance * (month <= fixedMonths ? monthlyInterest : followUpInterest)
    const principal = Math.min(balance, result.monthlyPayment - interest)
    if (principal <= 0) break
    balance -= principal
    schedule.push({ month, interest, principal, balance })
  }
  return schedule
}

/** Restschuld eines Annuitätendarlehens nach `months` Monatsraten. */
function remainingDebtAfter(loan: number, monthlyInterest: number, monthlyRate: number, months: number) {
  if (monthlyInterest === 0) return Math.max(0, loan - monthlyRate * months)
  const growth = (1 + monthlyInterest) ** months
  return Math.max(0, loan * growth - (monthlyRate * (growth - 1)) / monthlyInterest)
}
