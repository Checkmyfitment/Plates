export default function Placeholder({ icon, title, body, compact = false }) {
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
    </div>
  )
}
