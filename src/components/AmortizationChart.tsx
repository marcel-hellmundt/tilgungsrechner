import { useLayoutEffect, useMemo, useRef, useState, type PointerEvent, type RefObject } from 'react'
import type { Scenario, ScheduleEntry } from '../lib/calc'
import { formatCurrency, formatCurrencyExact, formatMonthYear, formatNumber, formatPercent } from '../lib/format'

interface AmortizationChartProps {
  /** Follow-up interest scenarios; the "base" scenario also provides the bars and the table */
  scenarios: Scenario[]
  /** Ende der Zinsbindung in Monaten, ab hier verzweigen die Szenarien */
  fixedRateMonths: number
  /** Additional vertical markers, e.g. retirement of a borrower */
  markers?: ChartMarker[]
}

export interface ChartMarker {
  key: string
  label: string
  /** Number of the rate in whose month the marker sits */
  rateNumber: number
}

const HEIGHT = 400
const MARGIN = { top: 28, right: 52, bottom: 24, left: 60 }

/**
 * Remaining debt (lines, left axis) overlaid on the monthly payment split into
 * principal and interest (stacked bars, right axis). Both axes share the same gridlines.
 * After the fixed-rate period the debt line branches into the follow-up scenarios.
 */
export function AmortizationChart({ scenarios, fixedRateMonths, markers = [] }: AmortizationChartProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const width = useElementWidth(containerRef)
  const [hoverIndex, setHoverIndex] = useState<number | null>(null)

  const base = scenarios.find((s) => s.key === 'base') ?? scenarios[0]
  const schedule = base.schedule
  const months = Math.max(...scenarios.map((s) => s.schedule.length))
  const hasBranches = fixedRateMonths > 0 && fixedRateMonths < schedule.length

  const plotLeft = MARGIN.left
  const plotRight = width - MARGIN.right
  const plotTop = MARGIN.top
  const plotBottom = HEIGHT - MARGIN.bottom
  const plotWidth = Math.max(0, plotRight - plotLeft)
  const plotHeight = plotBottom - plotTop

  const maxDebt = schedule.length > 0 ? schedule[0].balance + schedule[0].principal : 0
  const maxPayment = schedule.length > 0 ? schedule[0].interest + schedule[0].principal : 0

  // Left axis picks nice ticks; the right axis reuses the same number of gridlines
  const debtTicks = niceTicks(maxDebt, 4)
  const segments = Math.max(1, debtTicks.length - 1)
  const paymentStep = niceStep(maxPayment / segments)
  const debtMax = debtTicks[debtTicks.length - 1] || 1
  const paymentMax = paymentStep * segments || 1

  const slot = months > 0 ? plotWidth / months : 0
  const xCenter = (i: number) => plotLeft + (i + 0.5) * slot
  const yDebt = (v: number) => plotBottom - (v / debtMax) * plotHeight
  const yPayment = (v: number) => plotBottom - (v / paymentMax) * plotHeight

  // Shared part until the end of the fixed-rate period, then one branch per scenario
  const sharedEnd = hasBranches ? fixedRateMonths : schedule.length
  const sharedLine =
    `M${plotLeft},${yDebt(maxDebt)}` +
    schedule
      .slice(0, sharedEnd)
      .map((e, i) => `L${xCenter(i)},${yDebt(e.balance)}`)
      .join('')
  const branches = hasBranches
    ? scenarios.map((s) => ({
        scenario: s,
        path:
          `M${xCenter(sharedEnd - 1)},${yDebt(s.schedule[sharedEnd - 1].balance)}` +
          s.schedule
            .slice(sharedEnd)
            .map((e, j) => `L${xCenter(sharedEnd + j)},${yDebt(e.balance)}`)
            .join(''),
        endX: xCenter(s.schedule.length - 1),
      }))
    : []

  const yearTicks = useMemo(() => {
    const years = Math.ceil(months / 12)
    const step = years > 25 ? 10 : 5
    const ticks: number[] = []
    for (let y = 0; y <= years; y += step) ticks.push(y)
    return ticks
  }, [months])

  // Wide bars get a 1px gap; dense bars overlap slightly so anti-aliasing doesn't leave seams
  const barWidth = slot > 3 ? slot - 1 : slot + 0.6
  const fixedRateX = hasBranches ? plotLeft + fixedRateMonths * slot : null
  // Only markers that fall within the plotted time range; labels sit inside the plot, stacked from the top
  const visibleMarkers = markers
    .filter((m) => m.rateNumber >= 1 && m.rateNumber <= months)
    .map((m, k) => {
      const x = plotLeft + (m.rateNumber - 1) * slot
      return { ...m, x, labelY: plotTop + 14 + k * 16, anchorEnd: x > plotLeft + plotWidth * 0.75 }
    })

  const onPointerMove = (e: PointerEvent<SVGRectElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const index = Math.floor(((e.clientX - rect.left) / rect.width) * months)
    setHoverIndex(Math.min(months - 1, Math.max(0, index)))
  }

  const hoveredBase = hoverIndex !== null ? schedule[hoverIndex] : undefined
  const hoverBranched = hasBranches && hoverIndex !== null && hoverIndex >= sharedEnd
  // Lines visible at the hovered month: one before the branch point, all scenarios after
  const hoverLines = hoverIndex === null ? [] : hoverBranched ? scenarios : hoveredBase ? [base] : []
  const tooltipAnchorY = Math.min(
    ...hoverLines.map((s) => yDebt(s.schedule[hoverIndex ?? 0]?.balance ?? 0)),
    plotBottom,
  )
  const legendScenarios = hasBranches ? scenarios : [base]

  return (
    <div className="chart" ref={containerRef}>
      <div className="chart__legend">
        <span className="chart__key">
          <span className="chart__swatch chart__swatch--principal" /> Tilgung (rechts)
        </span>
        <span className="chart__key">
          <span className="chart__swatch chart__swatch--interest" /> Zinsen (rechts)
        </span>
        {legendScenarios.map((s) => (
          <span key={s.key} className="chart__key">
            <span className={`chart__swatch chart__swatch--line chart__swatch--${s.key}`} />
            {hasBranches ? `${s.label} ${formatPercent(s.followUpRate)}` : 'Restschuld'}
          </span>
        ))}
      </div>

      {width > 0 && months > 0 && (
        <svg
          className="chart__svg"
          width={width}
          height={HEIGHT}
          role="img"
          aria-label="Tilgungsverlauf: Restschuld je Zinsszenario und monatliche Aufteilung der Rate in Tilgung und Zinsen"
        >
          {/* Shared gridlines with labels for both axes */}
          {debtTicks.map((t, k) => (
            <g key={t}>
              <line className="chart__grid" x1={plotLeft} x2={plotRight} y1={yDebt(t)} y2={yDebt(t)} />
              <text className="chart__tick" x={plotLeft - 8} y={yDebt(t)} textAnchor="end" dominantBaseline="middle">
                {formatAxis(t)}
              </text>
              <text className="chart__tick" x={plotRight + 8} y={yDebt(t)} textAnchor="start" dominantBaseline="middle">
                {formatAxis(k * paymentStep)}
              </text>
            </g>
          ))}

          {/* Axis titles */}
          <text className="chart__axis-title" x={plotLeft - 8} y={plotTop - 14} textAnchor="end">
            Restschuld
          </text>
          <text className="chart__axis-title" x={plotRight + 8} y={plotTop - 14} textAnchor="start">
            Rate / Monat
          </text>

          {/* Monthly payment split (unchanged-rate scenario) */}
          {schedule.map((e, i) => {
            const x = plotLeft + i * slot
            const principalTop = yPayment(e.principal)
            const totalTop = yPayment(e.principal + e.interest)
            return (
              <g key={e.month} className={hoverIndex !== null && hoverIndex !== i ? 'chart__bar chart__bar--dim' : 'chart__bar'}>
                <rect className="chart__principal" x={x} width={barWidth} y={principalTop} height={plotBottom - principalTop} />
                <rect className="chart__interest" x={x} width={barWidth} y={totalTop} height={principalTop - totalTop} />
              </g>
            )
          })}

          <line className="chart__axis" x1={plotLeft} x2={plotRight} y1={plotBottom} y2={plotBottom} />

          {/* End of fixed interest period */}
          {fixedRateX !== null && (
            <g>
              <line className="chart__marker" x1={fixedRateX} x2={fixedRateX} y1={plotTop - 6} y2={plotBottom} />
              <text className="chart__marker-label" x={fixedRateX + 6} y={plotTop - 14}>
                Ende Zinsbindung
              </text>
            </g>
          )}

          {/* Custom markers (retirement) */}
          {visibleMarkers.map((m) => (
            <g key={m.key}>
              <line className="chart__marker chart__marker--person" x1={m.x} x2={m.x} y1={plotTop} y2={plotBottom} />
              <text
                className="chart__end-label"
                x={m.anchorEnd ? m.x - 6 : m.x + 6}
                y={m.labelY}
                textAnchor={m.anchorEnd ? 'end' : 'start'}
              >
                {m.label}
              </text>
            </g>
          ))}

          {/* Remaining debt on top, each line with a surface halo to separate it from the bars */}
          {branches.map((b) => (
            <path key={`h-${b.scenario.key}`} className="chart__line-halo" d={b.path} />
          ))}
          <path className="chart__line-halo" d={sharedLine} />
          {branches.map((b) => (
            <path key={b.scenario.key} className={`chart__line chart__line--${b.scenario.key}`} d={b.path} />
          ))}
          <path className="chart__line chart__line--base" d={sharedLine} />

          {/* Direct labels at the end of each branch, staggered so they don't collide */}
          {branches.map((b, k) => (
            <text
              key={`l-${b.scenario.key}`}
              className="chart__end-label"
              x={b.endX}
              y={plotBottom - 10 - k * 15}
              textAnchor="middle"
            >
              {formatPercent(b.scenario.followUpRate)}
            </text>
          ))}

          {/* X-axis: years */}
          {yearTicks.map((y) => (
            <text key={y} className="chart__tick" x={plotLeft + y * 12 * slot} y={HEIGHT - 6} textAnchor="middle">
              {y === 0 ? 'Start' : `${y} J.`}
            </text>
          ))}

          {/* Crosshair */}
          {hoverIndex !== null && (
            <g pointerEvents="none">
              <line className="chart__crosshair" x1={xCenter(hoverIndex)} x2={xCenter(hoverIndex)} y1={plotTop} y2={plotBottom} />
              {hoverLines.map((s) => {
                const entry = s.schedule[hoverIndex]
                return entry ? (
                  <circle
                    key={s.key}
                    className={`chart__dot chart__dot--${s.key}`}
                    cx={xCenter(hoverIndex)}
                    cy={yDebt(entry.balance)}
                    r={4.5}
                  />
                ) : null
              })}
            </g>
          )}

          {/* Hit area */}
          <rect
            x={plotLeft}
            y={plotTop}
            width={plotWidth}
            height={plotHeight}
            fill="transparent"
            onPointerMove={onPointerMove}
            onPointerLeave={() => setHoverIndex(null)}
          />
        </svg>
      )}

      {hoverIndex !== null && (
        <div
          className="chart__tooltip"
          style={{
            left: Math.min(Math.max(xCenter(hoverIndex), 110), width - 110),
            top: Math.max(tooltipAnchorY - 12, 140),
          }}
        >
          <div className="chart__tooltip-title">
            {formatMonthYear(hoverIndex + 1)} · Rate {hoverIndex + 1}
          </div>
          {hoverBranched ? (
            scenarios.map((s) => {
              const entry = s.schedule[hoverIndex]
              return (
                <div key={s.key} className="chart__tooltip-row">
                  <span className={`chart__swatch chart__swatch--line chart__swatch--${s.key}`} /> {s.label}
                  <strong>{entry ? formatCurrency(entry.balance) : 'abbezahlt'}</strong>
                </div>
              )
            })
          ) : (
            <div className="chart__tooltip-row">
              <span className="chart__swatch chart__swatch--line chart__swatch--base" /> Restschuld
              <strong>{hoveredBase ? formatCurrency(hoveredBase.balance) : 'abbezahlt'}</strong>
            </div>
          )}
          {hoveredBase && (
            <>
              <div className="chart__tooltip-row">
                <span className="chart__swatch chart__swatch--principal" /> Tilgung
                <strong>{formatCurrencyExact(hoveredBase.principal)}</strong>
              </div>
              <div className="chart__tooltip-row">
                <span className="chart__swatch chart__swatch--interest" /> Zinsen
                <strong>{formatCurrencyExact(hoveredBase.interest)}</strong>
              </div>
            </>
          )}
        </div>
      )}

      <YearlyTable schedule={schedule} />
    </div>
  )
}

/** Accessible table view with yearly totals. */
function YearlyTable({ schedule }: { schedule: ScheduleEntry[] }) {
  const years = useMemo(() => {
    const rows: { year: number; interest: number; principal: number; balance: number }[] = []
    for (const e of schedule) {
      const year = Math.ceil(e.month / 12)
      let row = rows[rows.length - 1]
      if (!row || row.year !== year) {
        row = { year, interest: 0, principal: 0, balance: 0 }
        rows.push(row)
      }
      row.interest += e.interest
      row.principal += e.principal
      row.balance = e.balance
    }
    return rows
  }, [schedule])

  return (
    <details className="chart__table">
      <summary>Tilgungsplan als Tabelle</summary>
      <table>
        <thead>
          <tr>
            <th>Jahr</th>
            <th>Zinsen</th>
            <th>Tilgung</th>
            <th>Restschuld</th>
          </tr>
        </thead>
        <tbody>
          {years.map((r) => (
            <tr key={r.year}>
              <td>{r.year}</td>
              <td>{formatCurrency(r.interest)}</td>
              <td>{formatCurrency(r.principal)}</td>
              <td>{formatCurrency(r.balance)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </details>
  )
}

function useElementWidth(ref: RefObject<HTMLElement | null>) {
  const [width, setWidth] = useState(0)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new ResizeObserver(([entry]) => setWidth(Math.floor(entry.contentRect.width)))
    observer.observe(el)
    return () => observer.disconnect()
  }, [ref])
  return width
}

/** Smallest "nice" step (1, 2, 2.5, 5 × 10^n) that is at least `rough`. */
function niceStep(rough: number): number {
  if (rough <= 0) return 1
  const magnitude = 10 ** Math.floor(Math.log10(rough))
  return [1, 2, 2.5, 5, 10].map((m) => m * magnitude).find((s) => s >= rough) ?? 10 * magnitude
}

/** Evenly spaced, rounded tick values from 0 to at least `max`. */
function niceTicks(max: number, count: number): number[] {
  if (max <= 0) return [0]
  const step = niceStep(max / count)
  const ticks: number[] = []
  for (let v = 0; v < max + step; v += step) {
    ticks.push(v)
    if (v >= max) break
  }
  return ticks
}

function formatAxis(value: number): string {
  if (value >= 10_000) return `${formatNumber(value / 1000)} Tsd.`
  return formatNumber(value)
}
