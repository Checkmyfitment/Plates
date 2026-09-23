import { useEffect, useRef, useState } from 'react'
import Logo from './Logo'

export default function TopBar({
  title,
  avatarUrl,
  initials = '?',
  onAvatarClick,
  unreadNotifications = 0,
  onBellClick,
  unreadChats = 0,
  onChatClick,
  isSeller = false,
  onAddListingClick,
  isGuest = false,
  onLogout,
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef(null)

  // logout used to live only inside the full Profile screen -- one tap
  // away from here, but easy to lose track of. A quick menu right on the
  // avatar means signing out doesn't require navigating anywhere first.
  useEffect(() => {
    if (!menuOpen) return
    const onClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    document.addEventListener('touchstart', onClickOutside)
    return () => {
      document.removeEventListener('mousedown', onClickOutside)
      document.removeEventListener('touchstart', onClickOutside)
    }
  }, [menuOpen])

  return (
    <div className="sticky top-0 z-10 bg-[var(--paper)]">
      <div className="flex items-center justify-between px-5 pt-6 pb-3">
        <div className="flex items-center gap-2">
          <Logo size={30} />
          <h1 className="font-display text-3xl" style={{ color: 'var(--forest-dark)' }}>
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
          {onChatClick && (
            <button
              onClick={onChatClick}
              aria-label="Chats"
              className="pressable relative w-9 h-9 rounded-full flex items-center justify-center text-base shrink-0 hover:bg-[var(--paper-dim)] transition-colors"
              style={{ color: 'var(--forest-dark)' }}
            >
              💬
              {unreadChats > 0 && (
                <span
                  className="absolute top-1 right-1 min-w-[16px] h-[16px] px-1 rounded-full text-[10px] leading-[16px] font-medium text-center"
                  style={{ background: 'var(--plum)', color: 'white' }}
                >
                  {unreadChats > 9 ? '9+' : unreadChats}
                </span>
              )}
            </button>
          )}
          {isSeller && onAddListingClick && (
            <button
              onClick={onAddListingClick}
              aria-label="Add listing"
              className="pressable w-9 h-9 rounded-full flex items-center justify-center text-lg font-bold shrink-0 hover:bg-[var(--paper-dim)] transition-colors"
              style={{ color: 'var(--forest-dark)' }}
            >
              ➕
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
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => (onLogout ? setMenuOpen((v) => !v) : onAvatarClick())}
                aria-label="Account menu"
                aria-expanded={menuOpen}
                className="pressable w-9 h-9 rounded-full flex items-center justify-center text-sm font-medium overflow-hidden shrink-0"
                style={{ background: 'var(--mustard)', color: 'var(--forest-dark)' }}
              >
                {avatarUrl ? <img src={avatarUrl} alt="" className="w-full h-full object-cover" /> : initials}
              </button>
              {menuOpen && (
                <div
                  className="absolute right-0 top-11 w-44 rounded-xl border py-1.5 z-30"
                  style={{ background: 'var(--card)', borderColor: 'var(--rule)', boxShadow: 'var(--shadow-float)' }}
                >
                  <button
                    onClick={() => {
                      setMenuOpen(false)
                      onAvatarClick()
                    }}
                    className="pressable w-full text-left text-sm px-3.5 py-2.5 hover:bg-[var(--paper-dim)] transition-colors"
                    style={{ color: 'var(--ink)' }}
                  >
                    👤 Profile
                  </button>
                  <button
                    onClick={() => {
                      setMenuOpen(false)
                      onLogout()
                    }}
                    className="pressable w-full text-left text-sm px-3.5 py-2.5 hover:bg-[var(--paper-dim)] transition-colors"
                    style={{ color: 'var(--plum)' }}
                  >
                    ⏻ Log out
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      <div className="plate-scallop" />
    </div>
  )
}
