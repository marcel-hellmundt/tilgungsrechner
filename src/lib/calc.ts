export interface LoanInput {
  /** Kaufpreis in € */
  purchasePrice: number
  /** Eigenkapital in € */
  equity: number
  /** Sollzins p. a. in % */
  interestRate: number
  /** Anfängliche Tilgung p. a. in % */
  initialRepayment: number
}

export interface LoanResult {
  loanAmount: number
  monthlyRate: number
  /** Laufzeit bis zur vollständigen Tilgung in Monaten (Infinity, wenn nie getilgt) */
  termMonths: number
  totalInterest: number
  totalPaid: number
}

/** Klassisches Annuitätendarlehen mit konstanter Monatsrate. */
export function calculateLoan(input: LoanInput): LoanResult {
  const loanAmount = Math.max(0, input.purchasePrice - input.equity)
  const monthlyInterest = input.interestRate / 100 / 12
  const monthlyRate = (loanAmount * (input.interestRate + input.initialRepayment)) / 100 / 12

  let termMonths: number
  if (loanAmount === 0) {
    termMonths = 0
  } else if (monthlyRate <= loanAmount * monthlyInterest) {
    termMonths = Infinity
  } else if (monthlyInterest === 0) {
    termMonths = loanAmount / monthlyRate
  } else {
    termMonths =
      -Math.log(1 - (monthlyInterest * loanAmount) / monthlyRate) / Math.log(1 + monthlyInterest)
  }

  const totalPaid = Number.isFinite(termMonths) ? monthlyRate * termMonths : Infinity
  return {
    loanAmount,
    monthlyRate,
    termMonths,
    totalInterest: totalPaid - loanAmount,
    totalPaid,
  }
}
