import Icon from './Icon'

// Frosted-glass floating bar. The active tab gets a neon underline and a soft
// glow instead of just a color change, so the current screen is obvious.
function Tab({ id, label, icon, active, onChange }) {
  const on = active === id
  return (
    <button
      onClick={() => onChange(id)}
      aria-current={on ? 'page' : undefined}
      className="pressable relative flex flex-col items-center gap-1 px-3 pt-2 pb-1.5 rounded-xl text-[10px] uppercase tracking-wider transition-colors shrink-0"
      style={{ color: on ? 'var(--forest)' : 'var(--ink-soft)', fontWeight: on ? 700 : 600 }}
    >
      <Icon name={icon} size={21} strokeWidth={on ? 2.2 : 1.8} style={on ? { filter: 'drop-shadow(0 0 6px var(--forest))' } : undefined} />
      {label}
      {on && (
        <span
          className="absolute -top-px left-1/2 -translate-x-1/2 h-[3px] w-6 rounded-full"
          style={{ background: 'var(--forest)', boxShadow: '0 0 10px var(--forest)' }}
        />
      )}
    </button>
  )
}

export default function BottomNav({ active, onChange, avatarUrl, initials = '?' }) {
  const searchActive = active === 'search'
  return (
    <div
      className="fixed left-1/2 -translate-x-1/2 w-[calc(100%-32px)] max-w-[416px] flex items-center gap-1 rounded-[22px] px-2 py-1.5 z-20"
      style={{
        background: 'color-mix(in srgb, var(--card) 72%, transparent)',
        backdropFilter: 'blur(18px) saturate(1.5)',
        WebkitBackdropFilter: 'blur(18px) saturate(1.5)',
        boxShadow: 'var(--shadow-float), inset 0 0 0 1px var(--rule), inset 0 1px 0 rgba(255,255,255,0.06)',
        bottom: 'calc(1rem + env(safe-area-inset-bottom))',
      }}
    >
      <Tab id="home" label="Home" icon="home" active={active} onChange={onChange} />
      <Tab id="map" label="Map" icon="map" active={active} onChange={onChange} />
      <button
        onClick={() => onChange('search')}
        aria-label="Search"
        aria-current={searchActive ? 'page' : undefined}
        className="pressable flex items-center gap-2 flex-1 min-w-0 px-3.5 py-2.5 rounded-full text-sm font-semibold transition-colors"
        style={{
          background: searchActive ? 'var(--forest-soft)' : 'var(--paper-dim)',
          color: searchActive ? 'var(--forest-dark)' : 'var(--ink-soft)',
          border: `1.5px solid ${searchActive ? 'var(--forest)' : 'var(--rule)'}`,
          boxShadow: searchActive ? '0 0 14px -2px var(--forest)' : 'none',
        }}
      >
        <Icon name="search" size={16} strokeWidth={2.2} />
        <span className="truncate">Search</span>
      </button>
      <Tab id="cart" label="Cart" icon="cart" active={active} onChange={onChange} />
      <button
        onClick={() => onChange('you')}
        aria-current={active === 'you' ? 'page' : undefined}
        className="pressable relative flex flex-col items-center gap-1 px-3 pt-2 pb-1.5 rounded-xl text-[10px] uppercase tracking-wider transition-colors shrink-0"
        style={{ color: active === 'you' ? 'var(--forest)' : 'var(--ink-soft)', fontWeight: active === 'you' ? 700 : 600 }}
      >
        <span
          className="w-[21px] h-[21px] rounded-full flex items-center justify-center text-[9px] font-bold overflow-hidden"
          style={{
            background: active === 'you' ? 'var(--forest)' : 'var(--rule)',
            color: active === 'you' ? 'var(--on-forest)' : 'var(--ink-soft)',
            boxShadow: active === 'you' ? '0 0 8px var(--forest)' : 'none',
          }}
        >
          {avatarUrl ? <img src={avatarUrl} alt="" className="w-full h-full object-cover" /> : initials}
        </span>
        You
        {active === 'you' && (
          <span
            className="absolute -top-px left-1/2 -translate-x-1/2 h-[3px] w-6 rounded-full"
            style={{ background: 'var(--forest)', boxShadow: '0 0 10px var(--forest)' }}
          />
        )}
      </button>
    </div>
  )
}
