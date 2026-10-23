import { useId } from 'react'
import { formatCurrency } from '../lib/format'
import { RETIREMENT_AGE, type Person, type Retirement } from '../lib/persons'

interface PersonCardProps {
  person: Person
  index: number
  retirement: Retirement | null
  /** Restschuld zum Rentenbeginn (0 = bereits abbezahlt) */
  debtAtRetirement: number | null
  onChange: (person: Person) => void
  onRemove: () => void
}

const monthYear = new Intl.DateTimeFormat('de-DE', { month: 'short', year: 'numeric' })

export function PersonCard({ person, index, retirement, debtAtRetirement, onChange, onRemove }: PersonCardProps) {
  const birthId = useId()
  const fallbackName = `Person ${index + 1}`

  return (
    <section className="card person">
      <div className="person__header">
        <input
          className="person__name"
          type="text"
          autoComplete="off"
          placeholder={fallbackName}
          aria-label="Name"
          value={person.name}
          onChange={(e) => onChange({ ...person, name: e.target.value })}
        />
        <button
          type="button"
          className="icon-button icon-button--small"
          onClick={onRemove}
          aria-label={`${person.name.trim() || fallbackName} entfernen`}
          title="Entfernen"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="field">
        <label className="field__label" htmlFor={birthId}>
          Geburtsdatum
        </label>
        <div className="field__control field__control--wide">
          <input
            id={birthId}
            className="field__input field__input--text"
            type="date"
            value={person.birthDate}
            onChange={(e) => onChange({ ...person, birthDate: e.target.value })}
          />
        </div>
      </div>

      {retirement && (
        <p className="person__facts">
          <span>
            Rente mit {RETIREMENT_AGE}: <strong>{monthYear.format(retirement.start)}</strong>
          </span>
          {debtAtRetirement !== null && (
            <span>
              Restschuld: <strong>{debtAtRetirement > 0 ? formatCurrency(debtAtRetirement) : 'abbezahlt'}</strong>
            </span>
          )}
        </p>
      )}
    </section>
  )
}
