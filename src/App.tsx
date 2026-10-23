import { useMemo, useState } from 'react'
import { Card } from './components/Card'
import { Header } from './components/Header'
import { NumberInput } from './components/NumberInput'
import { calculateLoan, type LoanInput } from './lib/calc'
import { formatCurrency, formatCurrencyExact, formatDuration } from './lib/format'

const DEFAULT_INPUT: LoanInput = {
  purchasePrice: 400_000,
  equity: 80_000,
  interestRate: 3.5,
  initialRepayment: 2,
}

export default function App() {
  const [input, setInput] = useState<LoanInput>(DEFAULT_INPUT)
  const result = useMemo(() => calculateLoan(input), [input])

  const update = (key: keyof LoanInput) => (value: number) =>
    setInput((prev) => ({ ...prev, [key]: value }))

  const neverRepaid = !Number.isFinite(result.termMonths)

  return (
    <>
      <Header />
      <main className="main">
        <div className="container">
          <div className="intro">
            <h1>Baufinanzierung durchrechnen</h1>
            <p>Werte anpassen – Rate, Laufzeit und Zinskosten werden sofort berechnet.</p>
          </div>

          <div className="grid">
            <Card title="Eingaben">
              <div className="fields">
                <NumberInput label="Kaufpreis" unit="€" value={input.purchasePrice} onChange={update('purchasePrice')} />
                <NumberInput label="Eigenkapital" unit="€" value={input.equity} onChange={update('equity')} />
                <NumberInput label="Sollzins p. a." unit="%" value={input.interestRate} onChange={update('interestRate')} max={20} />
                <NumberInput
                  label="Anfängliche Tilgung p. a."
                  unit="%"
                  value={input.initialRepayment}
                  onChange={update('initialRepayment')}
                  max={20}
                />
              </div>
            </Card>

            <Card title="Ergebnis">
              <div className="kpi">
                <div className="kpi__label">Monatliche Rate</div>
                <div className="kpi__value">{formatCurrencyExact(result.monthlyRate)}</div>
              </div>
              <dl className="stats">
                <div className="stats__row">
                  <dt>Darlehensbetrag</dt>
                  <dd>{formatCurrency(result.loanAmount)}</dd>
                </div>
                <div className="stats__row">
                  <dt>Laufzeit bis Volltilgung</dt>
                  <dd>{neverRepaid ? '–' : formatDuration(result.termMonths)}</dd>
                </div>
                <div className="stats__row">
                  <dt>Zinskosten gesamt</dt>
                  <dd>{neverRepaid ? '–' : formatCurrency(result.totalInterest)}</dd>
                </div>
                <div className="stats__row">
                  <dt>Gesamtbetrag</dt>
                  <dd>{neverRepaid ? '–' : formatCurrency(result.totalPaid)}</dd>
                </div>
              </dl>
              {neverRepaid && (
                <p className="notice">Mit dieser Tilgung wird das Darlehen nie vollständig zurückgezahlt.</p>
              )}
            </Card>
          </div>
        </div>
      </main>
      <footer className="footer">
        <div className="container">Alle Angaben ohne Gewähr. Die Berechnung erfolgt ausschließlich im Browser.</div>
      </footer>
    </>
  )
}
