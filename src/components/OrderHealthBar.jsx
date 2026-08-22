// Rolls every order status into the three that actually matter for a
// health check: did it finish well, is it still in flight, or did it fall
// through. Reuses the app's existing status colors (forest = good, mustard
// = in progress, plum = critical) so this reads consistently with the
// status badges everywhere else instead of introducing a new palette.
export default function OrderHealthBar({ completed, open, problem }) {
  const total = completed + open + problem
  const segments = [
    { key: 'completed', label: 'Completed', value: completed, color: 'var(--forest)' },
    { key: 'open', label: 'Open', value: open, color: 'var(--mustard)' },
    { key: 'problem', label: 'Cancelled / no-show', value: problem, color: 'var(--plum)' },
  ]

  if (total === 0) {
    return (
      <p className="text-xs" style={{ color: 'var(--ink-soft)' }}>
        No orders yet.
      </p>
    )
  }

  return (
    <div>
      <div className="flex w-full h-4 rounded-full overflow-hidden gap-[2px]" style={{ background: 'var(--paper-dim)' }}>
        {segments
          .filter((s) => s.value > 0)
          .map((s) => (
            <div key={s.key} style={{ width: `${(s.value / total) * 100}%`, background: s.color }} />
          ))}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2.5">
        {segments.map((s) => (
          <div key={s.key} className="flex items-center gap-1.5 text-xs">
            <span aria-hidden="true" className="w-2 h-2 rounded-full shrink-0" style={{ background: s.color }} />
            <span style={{ color: 'var(--ink-soft)' }}>{s.label}</span>
            <span className="font-bold">{s.value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
