const STEPS = [
  { key: 'photo', label: 'Add a profile photo' },
  { key: 'neighborhood', label: 'Set your neighborhood' },
  { key: 'listing', label: 'Post your first listing' },
]

// Shown on Profile until a brand-new user has done all three — a simple
// nudge to get supply moving, since a two-sided marketplace lives or dies
// on new sellers actually finishing setup instead of drifting off.
export default function GettingStartedChecklist({ hasPhoto, hasNeighborhood, hasListing, onEditProfile, onGoToSell }) {
  const done = { photo: hasPhoto, neighborhood: hasNeighborhood, listing: hasListing }
  const doneCount = Object.values(done).filter(Boolean).length
  if (doneCount === STEPS.length) return null

  const actions = { photo: onEditProfile, neighborhood: onEditProfile, listing: onGoToSell }

  return (
    <div className="card-elevated p-4 mb-3">
      <p className="text-sm font-bold">🚀 Getting started</p>
      <p className="text-xs mb-3" style={{ color: 'var(--ink-soft)' }}>
        {doneCount}/{STEPS.length} done
      </p>
      <div className="flex flex-col gap-2">
        {STEPS.map((step) => (
          <button
            key={step.key}
            onClick={actions[step.key]}
            disabled={done[step.key]}
            className="pressable flex items-center gap-2.5 text-left disabled:opacity-60"
          >
            <span
              aria-hidden="true"
              className="shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold"
              style={
                done[step.key]
                  ? { background: 'var(--forest)', color: 'white' }
                  : { border: '1.5px solid var(--rule)', color: 'transparent' }
              }
            >
              ✓
            </span>
            <span
              className="text-sm"
              style={{
                color: done[step.key] ? 'var(--ink-soft)' : 'var(--ink)',
                textDecoration: done[step.key] ? 'line-through' : 'none',
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
