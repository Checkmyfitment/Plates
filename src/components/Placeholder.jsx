// action: optional { label, onClick } -- a way out of an error state
export default function Placeholder({ icon, title, body, compact = false, action }) {
  const button = action && (
    <button
      type="button"
      onClick={action.onClick}
      className="mt-4 px-4 py-2 rounded-full text-sm font-semibold text-white"
      style={{ background: 'var(--forest)' }}
    >
      {action.label}
    </button>
  )
  if (compact) {
    return (
      <div className="rounded-2xl border border-dashed py-8 px-5 text-center" style={{ borderColor: 'var(--rule)' }}>
        <div className="text-3xl mb-2">{icon}</div>
        <h2 className="font-display text-base" style={{ color: 'var(--forest-dark)' }}>
          {title}
        </h2>
        {body && (
          <p className="text-xs mt-1" style={{ color: 'var(--ink-soft)' }}>
            {body}
          </p>
        )}
        {button}
      </div>
    )
  }
  return (
    <div className="px-5 pt-16 text-center">
      <div className="text-4xl mb-3">{icon}</div>
      <h2 className="font-display text-xl" style={{ color: 'var(--forest-dark)' }}>
        {title}
      </h2>
      <p className="text-sm mt-1" style={{ color: 'var(--ink-soft)' }}>
        {body}
      </p>
      {button}
    </div>
  )
}
