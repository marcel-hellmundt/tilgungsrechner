import { ThemeToggle } from './ThemeToggle'

export function Header() {
  return (
    <header className="header">
      <div className="container header__inner">
        <div className="brand">
          <span className="brand__mark" aria-hidden="true">
            <svg width="16" height="16" viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 24 L13 16 L18 20 L26 9" />
            </svg>
          </span>
          <span className="brand__title">Tilgungsrechner</span>
        </div>
        <ThemeToggle />
      </div>
    </header>
  )
}
