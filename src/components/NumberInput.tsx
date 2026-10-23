import { useId, useState } from 'react'
import { formatNumber, parseNumber } from '../lib/format'

interface NumberInputProps {
  label: string
  value: number
  onChange: (value: number) => void
  unit: string
  hint?: string
  min?: number
  max?: number
}

/** Text input for German-formatted numbers; reformats on blur. */
export function NumberInput({ label, value, onChange, unit, hint, min = 0, max = Infinity }: NumberInputProps) {
  const id = useId()
  const hintId = `${id}-hint`
  const [draft, setDraft] = useState<string | null>(null)

  return (
    <div className="field">
      <label className="field__label" htmlFor={id}>
        {label}
      </label>
      <div className="field__control">
        <input
          id={id}
          className="field__input"
          type="text"
          inputMode="decimal"
          autoComplete="off"
          value={draft ?? formatNumber(value)}
          onFocus={(e) => {
            setDraft(formatNumber(value))
            e.currentTarget.select()
          }}
          onChange={(e) => {
            setDraft(e.target.value)
            const parsed = parseNumber(e.target.value)
            if (Number.isFinite(parsed)) onChange(Math.min(max, Math.max(min, parsed)))
          }}
          onBlur={() => setDraft(null)}
          aria-describedby={hint ? hintId : undefined}
        />
        <span className="field__unit">{unit}</span>
      </div>
      {hint && (
        <p className="field__hint" id={hintId}>
          {hint}
        </p>
      )}
    </div>
  )
}
