import Logo from './Logo'

export default function TopBar({ title, avatarUrl, initials = '?', onAvatarClick, unreadNotifications = 0, onBellClick, isGuest = false }) {
  return (
    <div className="sticky top-0 z-10 bg-[var(--paper)]">
      <div className="flex items-center justify-between px-5 pt-6 pb-3">
        <div className="flex items-center gap-2">
          <Logo size={26} />
          <h1 className="font-display text-2xl" style={{ color: 'var(--forest-dark)' }}>
            {title}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          {onBellClick && (
            <button
              onClick={onBellClick}
              aria-label="Notifications"
              className="pressable relative w-9 h-9 rounded-full flex items-center justify-center text-base shrink-0 hover:bg-[var(--paper-dim)] transition-colors"
              style={{ color: 'var(--forest-dark)' }}
            >
              🔔
              {unreadNotifications > 0 && (
                <span
                  className="absolute top-1 right-1 min-w-[16px] h-[16px] px-1 rounded-full text-[10px] leading-[16px] font-medium text-center"
                  style={{ background: 'var(--plum)', color: 'white' }}
                >
                  {unreadNotifications > 9 ? '9+' : unreadNotifications}
                </span>
              )}
            </button>
          )}
          {isGuest ? (
            <button
              onClick={onAvatarClick}
              className="pressable text-xs font-bold px-3.5 py-2 rounded-full shrink-0"
              style={{ background: 'var(--forest)', color: 'white' }}
            >
              Log in
            </button>
          ) : (
            <button
              onClick={onAvatarClick}
              aria-label="Open profile"
              className="pressable w-9 h-9 rounded-full flex items-center justify-center text-sm font-medium overflow-hidden shrink-0"
              style={{ background: 'var(--mustard)', color: 'var(--forest-dark)' }}
            >
              {avatarUrl ? (
                <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                initials
              )}
            </button>
          )}
        </div>
      </div>
      <div className="plate-scallop" />
    </div>
  )
}
