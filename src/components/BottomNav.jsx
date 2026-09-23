const tabs = [
  { id: 'home', label: 'Home', icon: '🏠' },
  { id: 'map', label: 'Map', icon: '📍' },
  { id: 'search', label: 'Search', icon: '🔍' },
  { id: 'cart', label: 'Cart', icon: '🛒' },
  { id: 'you', label: 'You', icon: null },
]

export default function BottomNav({ active, onChange, avatarUrl, initials = '?' }) {
  return (
    <div
      className="fixed left-1/2 -translate-x-1/2 w-[calc(100%-32px)] max-w-[416px] flex justify-around rounded-2xl border bg-[var(--card)] py-2 z-20"
      style={{
        borderColor: 'var(--rule)',
        boxShadow: 'var(--shadow-float)',
        bottom: 'calc(1rem + env(safe-area-inset-bottom))',
      }}
    >
      {tabs.map((t) => {
        const isActive = active === t.id
        return (
          <button
            key={t.id}
            onClick={() => onChange(t.id)}
            className="pressable relative flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl text-[11px] transition-colors"
            style={{
              color: isActive ? 'var(--forest)' : 'var(--ink-soft)',
              fontWeight: isActive ? 700 : 500,
            }}
          >
            <span className="relative text-base leading-none">
              {t.id === 'you' ? (
                <span
                  className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold overflow-hidden"
                  style={{
                    background: isActive ? 'var(--forest)' : 'var(--rule)',
                    color: isActive ? 'white' : 'var(--ink-soft)',
                  }}
                >
                  {avatarUrl ? <img src={avatarUrl} alt="" className="w-full h-full object-cover" /> : initials}
                </span>
              ) : (
                t.icon
              )}
            </span>
            {t.label}
          </button>
        )
      })}
    </div>
  )
}
