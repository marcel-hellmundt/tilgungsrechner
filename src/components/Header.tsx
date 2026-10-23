import { ThemeToggle } from './ThemeToggle'

interface HeaderProps {
  /** Resets all inputs to their defaults */
  onReset: () => void
}

export function Header({ onReset }: HeaderProps) {
  const handleReset = () => {
    if (window.confirm('Alle Eingaben auf die Standardwerte zurücksetzen?')) onReset()
  }

  return (
    <header className="header">
      <div className="header__inner">
        <div className="brand">
          <span className="brand__mark" aria-hidden="true">
            <svg width="16" height="16" viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 24 L13 16 L18 20 L26 9" />
            </svg>
          </span>
          <span className="brand__title">Tilgungsrechner</span>
        </div>
        <div className="header__actions">
          <button
            type="button"
            className="icon-button"
            onClick={handleReset}
            aria-label="Eingaben zurücksetzen"
            title="Eingaben zurücksetzen"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
              <path d="M3 3v5h5" />
            </svg>
          </button>
          <ThemeToggle />
        </div>
      </div>
    </header>
  )
}
