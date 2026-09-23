export default function BottomNav({ active, onChange, avatarUrl, initials = '?' }) {
  const searchActive = active === 'search'
  return (
    <div
      className="fixed left-1/2 -translate-x-1/2 w-[calc(100%-32px)] max-w-[416px] flex items-center gap-1 rounded-2xl border bg-[var(--card)] px-2 py-2 z-20"
      style={{
        borderColor: 'var(--rule)',
        boxShadow: 'var(--shadow-float)',
        bottom: 'calc(1rem + env(safe-area-inset-bottom))',
      }}
    >
      <button
        onClick={() => onChange('home')}
        className="pressable relative flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl text-[11px] transition-colors shrink-0"
        style={{
          color: active === 'home' ? 'var(--forest)' : 'var(--ink-soft)',
          fontWeight: active === 'home' ? 700 : 500,
        }}
      >
        <span className="text-base leading-none">🏠</span>
        Home
      </button>
      <button
        onClick={() => onChange('map')}
        className="pressable relative flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl text-[11px] transition-colors shrink-0"
        style={{
          color: active === 'map' ? 'var(--forest)' : 'var(--ink-soft)',
          fontWeight: active === 'map' ? 700 : 500,
        }}
      >
        <span className="text-base leading-none">📍</span>
        Map
      </button>
      <button
        onClick={() => onChange('search')}
        aria-label="Search"
        className="pressable flex items-center gap-1.5 flex-1 min-w-0 px-3.5 py-2.5 rounded-full text-sm font-medium transition-colors"
        style={{
          background: searchActive ? 'var(--forest-soft)' : 'var(--paper-dim)',
          color: searchActive ? 'var(--forest-dark)' : 'var(--ink-soft)',
          border: `1.5px solid ${searchActive ? 'var(--forest)' : 'var(--rule)'}`,
        }}
      >
        <span className="shrink-0">⌕</span>
        <span className="truncate">Search</span>
      </button>
      <button
        onClick={() => onChange('cart')}
        className="pressable relative flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl text-[11px] transition-colors shrink-0"
        style={{
          color: active === 'cart' ? 'var(--forest)' : 'var(--ink-soft)',
          fontWeight: active === 'cart' ? 700 : 500,
        }}
      >
        <span className="text-base leading-none">🛒</span>
        Cart
      </button>
      <button
        onClick={() => onChange('you')}
        className="pressable relative flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl text-[11px] transition-colors shrink-0"
        style={{
          color: active === 'you' ? 'var(--forest)' : 'var(--ink-soft)',
          fontWeight: active === 'you' ? 700 : 500,
        }}
      >
        <span
          className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold overflow-hidden"
          style={{
            background: active === 'you' ? 'var(--forest)' : 'var(--rule)',
            color: active === 'you' ? 'white' : 'var(--ink-soft)',
          }}
        >
          {avatarUrl ? <img src={avatarUrl} alt="" className="w-full h-full object-cover" /> : initials}
        </span>
        You
      </button>
    </div>
  )
}
