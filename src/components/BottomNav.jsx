const tabs = [
  { id: 'browse', label: 'Browse', icon: '🍽️' },
  { id: 'favorites', label: 'Saved', icon: '♡' },
  { id: 'post', label: 'Sell', icon: '+' },
  { id: 'messages', label: 'Chats', icon: '✉' },
  { id: 'profile', label: 'You', icon: null },
]

export default function BottomNav({ active, onChange, unreadCount = 0, avatarUrl, initials = '?' }) {
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
              {t.id === 'profile' ? (
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
              {t.id === 'messages' && unreadCount > 0 && (
                <span
                  className="absolute -top-1.5 -right-2.5 min-w-[16px] h-[16px] px-[3px] rounded-full text-[9px] font-bold flex items-center justify-center leading-none"
                  style={{ background: 'var(--plum)', color: 'white' }}
                >
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </span>
            {t.label}
          </button>
        )
      })}
    </div>
  )
}
