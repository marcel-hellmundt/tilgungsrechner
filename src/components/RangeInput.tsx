import { useId, type CSSProperties } from 'react'

interface RangeInputProps {
  label: string
  value: number
  onChange: (value: number) => void
  /** Text shown right-aligned next to the label, e.g. the current value */
  valueLabel: string
  min?: number
  max?: number
  step?: number
}

/** Full-width slider with label and current value above it. */
export function RangeInput({ label, value, onChange, valueLabel, min = 0, max = 100, step = 1 }: RangeInputProps) {
  const id = useId()
  const fill = ((value - min) / (max - min)) * 100

  return (
    <div className="range">
      <div className="range__header">
        <label className="field__label" htmlFor={id}>
          {label}
        </label>
        <output className="range__value" htmlFor={id}>
          {valueLabel}
        </output>
      </div>
      <input
        id={id}
        className="range__input"
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ '--fill': `${fill}%` } as CSSProperties}
      />
    </div>
  )
}
