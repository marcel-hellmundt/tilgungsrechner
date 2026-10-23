import type { ReactNode } from 'react'

interface CardProps {
  title?: string
  /** Rendered right-aligned next to the title */
  action?: ReactNode
  children: ReactNode
}

export function Card({ title, action, children }: CardProps) {
  return (
    <section className="card">
      {(title || action) && (
        <div className="card__header">
          {title && <h2 className="card__title">{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  )
}
