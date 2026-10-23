import { useMemo } from 'react'
import { Card } from './components/Card'
import { Header } from './components/Header'
import { NumberInput } from './components/NumberInput'
import { RangeInput } from './components/RangeInput'
import { PersonCard } from './components/PersonCard'
import { usePersons } from './hooks/usePersons'
import { useStoredInput } from './hooks/useStoredInput'
import { balanceBeforeRate, createPerson, retirementOf } from './lib/persons'
import { AmortizationChart } from './components/AmortizationChart'
import { calculateLoan, followUpScenarios, type LoanInput } from './lib/calc'
import { formatCurrency, formatDuration, formatMonthYear, formatNumber, formatPercent } from './lib/format'

const DEFAULT_INPUT: LoanInput = {
  purchasePrice: 400_000,
  landTransferTax: 5,
  notaryFees: 2,
  brokerFee: 3.57,
  renovationCosts: 0,
  equity: 80_000,
  roundUpLoan: false,
  interestRate: 3.5,
  // 2 % anfängliche Tilgung bei 3,5 % Zins auf das Standarddarlehen von 362.280 €
  monthlyRate: 1660.45,
  specialRepayment: 5,
  specialRepaymentUsage: 0,
  fixedRateYears: 10,
}

/** Color level for the loan-to-value bar */
function loanToValueLevel(percent: number) {
  if (percent < 60) return 'low'
  if (percent < 80) return 'medium'
  if (percent < 100) return 'high'
  return 'full'
}

export default function App() {
  const [input, setInput] = useStoredInput<LoanInput>('loan-input', DEFAULT_INPUT)
  const result = useMemo(() => calculateLoan(input), [input])
  const [persons, setPersons] = usePersons()
  const retirements = useMemo(() => persons.map((p) => retirementOf(p)), [persons])

  const scenarios = useMemo(() => followUpScenarios(input, result), [input, result])
  // Key figures assume the interest rate stays the same after the fixed-rate period
  const schedule = useMemo(() => scenarios.find((s) => s.key === 'base')?.schedule ?? [], [scenarios])
  const summary = useMemo(() => {
    const last = schedule[schedule.length - 1]
    return {
      months: schedule.length,
      repaid: result.loanAmount === 0 || (last !== undefined && last.balance <= 0.005),
      totalInterest: schedule.reduce((sum, e) => sum + e.interest, 0),
    }
  }, [schedule, result.loanAmount])

  const update = <K extends keyof LoanInput>(key: K) => (value: LoanInput[K]) =>
    setInput((prev) => ({ ...prev, [key]: value }))

  // The monthly rate is stored and stays fixed; entering a repayment rate sets the matching monthly rate
  const setInitialRepayment = (initialRepayment: number) =>
    setInput((prev) => {
      const { loanAmount } = calculateLoan(prev)
      return { ...prev, monthlyRate: (loanAmount * (prev.interestRate + initialRepayment)) / 100 / 12 }
    })

  return (
    <>
      <Header
        onReset={() => {
          setInput(DEFAULT_INPUT)
          setPersons([])
        }}
      />
      <div className="layout">
        <aside className="sidebar" aria-label="Eingaben">
          <Card>
            <div className="fields">
              <NumberInput label="Kaufpreis" unit="€" value={input.purchasePrice} onChange={update('purchasePrice')} />

              <div className="subfields">
                <NumberInput
                  label="Grunderwerbsteuer"
                  unit="%"
                  value={input.landTransferTax}
                  onChange={update('landTransferTax')}
                  max={20}
                  aside={formatCurrency(result.landTransferTaxAmount)}
                />
                <NumberInput
                  label="Notar & Grundbuch"
                  unit="%"
                  value={input.notaryFees}
                  onChange={update('notaryFees')}
                  max={20}
                  aside={formatCurrency(result.notaryFeesAmount)}
                />
                <NumberInput
                  label="Maklerprovision"
                  unit="%"
                  value={input.brokerFee}
                  onChange={update('brokerFee')}
                  max={20}
                  aside={formatCurrency(result.brokerFeeAmount)}
                />
                <NumberInput
                  label="Modernisierung"
                  unit="€"
                  value={input.renovationCosts}
                  onChange={update('renovationCosts')}
                />
              </div>
            </div>

            <div className="fields fields--section">
              <NumberInput label="Eigenkapital" unit="€" value={input.equity} onChange={update('equity')} />
            </div>
          </Card>

          <Card
            title="Darlehensbedarf"
            action={
              <label className="checkbox">
                <input
                  type="checkbox"
                  checked={input.roundUpLoan}
                  onChange={(e) => update('roundUpLoan')(e.target.checked)}
                />
                Auf 1.000 € aufrunden
              </label>
            }
          >
            <div className="total">
              {input.roundUpLoan && result.roundingAmount > 0 && (
                <p className="total__note">inkl. {formatCurrency(result.roundingAmount)} Aufrundung</p>
              )}
              <p className="total__value">{formatCurrency(result.loanAmount)}</p>
            </div>
            <div className="progress">
              <div className="progress__label">
                <span>Anteil am Kaufpreis</span>
                <span className="progress__value">{formatPercent(result.loanToValue)}</span>
              </div>
              <div
                className={`progress__track progress__track--${loanToValueLevel(result.loanToValue)}`}
                role="progressbar"
                aria-label="Anteil des Darlehens am Kaufpreis"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(result.loanToValue)}
              >
                <div className="progress__bar" style={{ width: `${Math.min(100, result.loanToValue)}%` }} />
              </div>
            </div>
          </Card>

          {persons.map((person, index) => {
            const retirement = retirements[index]
            return (
              <PersonCard
                key={person.id}
                person={person}
                index={index}
                retirement={retirement}
                debtAtRetirement={
                  retirement && retirement.rateNumber > 0
                    ? balanceBeforeRate(schedule, result.loanAmount, retirement.rateNumber)
                    : null
                }
                onChange={(next) => setPersons((prev) => prev.map((p) => (p.id === next.id ? next : p)))}
                onRemove={() => setPersons((prev) => prev.filter((p) => p.id !== person.id))}
              />
            )
          })}
          <button type="button" className="add-button" onClick={() => setPersons((prev) => [...prev, createPerson()])}>
            + Kreditnehmer hinzufügen
          </button>
        </aside>

        <main className="content">
          <div className="content__grid">
            <Card title="Bankkonditionen">
              <div className="fields">
                <NumberInput label="Sollzins p. a." unit="%" value={input.interestRate} onChange={update('interestRate')} max={20} />
                <NumberInput
                  label="Anfängliche Tilgung"
                  unit="%"
                  value={result.initialRepayment}
                  onChange={setInitialRepayment}
                  max={20}
                />
                <NumberInput label="Monatliche Rate" unit="€" value={input.monthlyRate} onChange={update('monthlyRate')} />
                <NumberInput
                  label="Sondertilgung p. a."
                  unit="%"
                  value={input.specialRepayment}
                  onChange={update('specialRepayment')}
                  max={100}
                  aside={formatCurrency(result.specialRepaymentAmount)}
                />
                <RangeInput
                  label="Davon nutzen"
                  value={input.specialRepaymentUsage}
                  onChange={update('specialRepaymentUsage')}
                  step={5}
                  valueLabel={`${formatNumber(input.specialRepaymentUsage)} % · ${formatCurrency(result.monthlySpecialRepayment)} / Monat`}
                />
                <NumberInput
                  label="Zinsbindung"
                  unit="Jahre"
                  value={input.fixedRateYears}
                  onChange={update('fixedRateYears')}
                  max={40}
                />
              </div>

              <div className="subfields subfields--result">
                <div className="field">
                  <span className="field__label">Restschuld nach {formatNumber(input.fixedRateYears)} Jahren</span>
                  <output className="field__readonly">{formatCurrency(result.remainingDebt)}</output>
                  <span className="field__aside">{formatPercent(result.remainingDebtPercent)}</span>
                </div>
              </div>
            </Card>

            <div className="content__stack">
              <Card title="Überblick">
                <div className="stats-grid">
                  <div className="stat">
                    <div className="stat__label">Laufzeit</div>
                    <div className="stat__value">{summary.repaid ? formatDuration(summary.months) : '–'}</div>
                    <div className="stat__sub">
                      {summary.repaid ? `abbezahlt ca. ${formatMonthYear(summary.months)}` : 'Rate deckt nicht einmal die Zinsen'}
                    </div>
                  </div>
                  <div className="stat">
                    <div className="stat__label">Zinsen gesamt</div>
                    <div className="stat__value">{summary.repaid ? formatCurrency(summary.totalInterest) : '–'}</div>
                    <div className="stat__sub">
                      {summary.repaid && result.loanAmount > 0
                        ? `${formatPercent((summary.totalInterest / result.loanAmount) * 100)} des Darlehens`
                        : ' '}
                    </div>
                  </div>
                  <div className="stat">
                    <div className="stat__label">Gesamtkosten</div>
                    <div className="stat__value">
                      {summary.repaid ? formatCurrency(result.totalCosts + summary.totalInterest) : '–'}
                    </div>
                    <div className="stat__sub">Kaufpreis, Nebenkosten, Modernisierung und Zinsen</div>
                  </div>
                </div>
              </Card>

              <Card title="Tilgungsverlauf">
                <AmortizationChart
                  scenarios={scenarios}
                  fixedRateMonths={input.fixedRateYears * 12}
                  markers={persons.flatMap((p, i) => {
                    const r = retirements[i]
                    return r ? [{ key: p.id, label: `Rente ${p.name.trim() || `Person ${i + 1}`}`, rateNumber: r.rateNumber }] : []
                  })}
                />
              </Card>
            </div>
          </div>
        </main>
      </div>
    </>
  )
}
