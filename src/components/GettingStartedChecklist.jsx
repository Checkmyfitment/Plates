// Generic checklist card — a step is { key, label, done, action }. Used
// twice on Profile (buyer track and seller track, since Plates doesn't
// have a fixed role and most people are both), but kept reusable rather
// than hard-coded to either.
export default function GettingStartedChecklist({ title, steps }) {
  const doneCount = steps.filter((s) => s.done).length
  if (doneCount === steps.length) return null

  return (
    <div className="card-elevated p-4 mb-3">
      <p className="text-sm font-bold">{title}</p>
      <p className="text-xs mb-3" style={{ color: 'var(--ink-soft)' }}>
        {doneCount}/{steps.length} done
      </p>
      <div className="flex flex-col gap-2">
        {steps.map((step) => (
          <button
            key={step.key}
            onClick={step.action}
            disabled={step.done}
            className="pressable flex items-center gap-2.5 text-left disabled:opacity-60"
          >
            <span
              aria-hidden="true"
              className="shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold"
              style={
                step.done
                  ? { background: 'var(--forest)', color: 'white' }
                  : { border: '1.5px solid var(--rule)', color: 'transparent' }
              }
            >
              ✓
            </span>
            <span
              className="text-sm"
              style={{
                color: step.done ? 'var(--ink-soft)' : 'var(--ink)',
                textDecoration: step.done ? 'line-through' : 'none',
              }}
            >
              {step.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
