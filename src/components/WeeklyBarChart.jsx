import { useState } from 'react'

// square baseline, 4px-rounded top only — a plain rx on <rect> would round
// every corner, which reads as "bubbles" rather than columns rising from
// a floor
function roundedTopRectPath(x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, Math.max(height, 0))
  if (height <= 0) return ''
  return `M${x},${y + height} L${x},${y + r} Q${x},${y} ${x + r},${y} L${x + width - r},${y} Q${x + width},${y} ${x + width},${y + r} L${x + width},${y + height} Z`
}

// A single-series weekly bar chart — no legend (one color needs none), a
// hover tooltip carries exact values, gridlines are hairline and recessive.
export default function WeeklyBarChart({ title, data, valueKey, formatValue = (v) => v.toLocaleString(), color = 'var(--forest)' }) {
  const [hoverIndex, setHoverIndex] = useState(null)
  const width = 320
  const height = 110
  const padding = { top: 8, right: 2, bottom: 4, left: 2 }
  const chartWidth = width - padding.left - padding.right
  const chartHeight = height - padding.top - padding.bottom
  const maxValue = Math.max(1, ...data.map((d) => d[valueKey]))
  const barSlot = chartWidth / data.length
  const barWidth = Math.min(20, barSlot - 4)
  const gridLines = [0, 0.5, 1].map((t) => Math.round(maxValue * t))

  return (
    <div>
      <p className="text-xs font-medium mb-1.5" style={{ color: 'var(--ink-soft)' }}>
        {title}
      </p>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full" style={{ overflow: 'visible' }}>
        {gridLines.map((g, i) => {
          // keyed by position (i), not value (g) -- with low data volume
          // maxValue clamps to 1 and rounding can collapse two of the three
          // fixed 0%/50%/100% gridlines to the same value (e.g. [0, 1, 1])
          const y = padding.top + chartHeight - (g / maxValue) * chartHeight
          return <line key={i} x1={padding.left} x2={width - padding.right} y1={y} y2={y} stroke="var(--rule)" strokeWidth="1" />
        })}
        {data.map((d, i) => {
          const value = d[valueKey]
          const barHeight = maxValue > 0 ? (value / maxValue) * chartHeight : 0
          const x = padding.left + i * barSlot + (barSlot - barWidth) / 2
          const y = padding.top + chartHeight - barHeight
          const dimmed = hoverIndex != null && hoverIndex !== i
          return (
            // eslint-disable-next-line jsx-a11y/no-static-element-interactions
            <g key={d.weekStart} onMouseEnter={() => setHoverIndex(i)} onMouseLeave={() => setHoverIndex(null)}>
              <rect x={padding.left + i * barSlot} y={padding.top} width={barSlot} height={chartHeight} fill="transparent" />
              <path d={roundedTopRectPath(x, y, barWidth, Math.max(barHeight, 1), 3)} fill={color} opacity={dimmed ? 0.45 : 1} />
            </g>
          )
        })}
      </svg>
      <div className="h-5 mt-1">
        {hoverIndex != null && (
          <p className="text-xs" style={{ color: 'var(--ink)' }}>
            Week of{' '}
            {new Date(data[hoverIndex].weekStart).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
            {' — '}
            <span className="font-bold">{formatValue(data[hoverIndex][valueKey])}</span>
          </p>
        )}
      </div>
    </div>
  )
}
