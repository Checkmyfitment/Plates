import { useEffect, useRef, useState } from 'react'
import Logo from './Logo'
import Icon from './Icon'

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
    <div
      className="sticky top-0 z-10"
      style={{ background: 'color-mix(in srgb, var(--paper) 82%, transparent)', backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)' }}
    >
      <div className="flex items-center justify-between px-5 pt-6 pb-3">
        <div className="flex items-center gap-2">
          <Logo size={30} />
          <h1 className="font-display text-3xl" style={{ color: 'var(--forest-dark)', fontWeight: 800, letterSpacing: '-0.035em' }}>
            {title}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          {onBellClick && (
            <button
              onClick={onBellClick}
              aria-label="Notifications"
              className="pressable relative w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors"
              style={{ color: 'var(--forest-dark)', background: 'var(--paper-dim)', boxShadow: 'inset 0 0 0 1px var(--rule)' }}
            >
              <Icon name="bell" size={19} />
              {unreadNotifications > 0 && (
                <span
                  className="absolute top-1 right-1 min-w-[16px] h-[16px] px-1 rounded-full text-[10px] leading-[16px] font-medium text-center"
                  style={{ background: 'var(--plum)', color: 'white', boxShadow: '0 0 0 2px var(--paper)' }}
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
              className="pressable relative w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors"
              style={{ color: 'var(--forest-dark)', background: 'var(--paper-dim)', boxShadow: 'inset 0 0 0 1px var(--rule)' }}
            >
              <Icon name="chat" size={19} />
              {unreadChats > 0 && (
                <span
                  className="absolute top-1 right-1 min-w-[16px] h-[16px] px-1 rounded-full text-[10px] leading-[16px] font-medium text-center"
                  style={{ background: 'var(--plum)', color: 'white', boxShadow: '0 0 0 2px var(--paper)' }}
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
              className="pressable w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors"
              style={{ color: 'var(--on-forest)', background: 'var(--forest)', boxShadow: '0 0 16px -3px var(--forest)' }}
            >
              <Icon name="plus" size={20} strokeWidth={2.6} />
            </button>
          )}
          {isGuest ? (
            <button
              onClick={onAvatarClick}
              className="pressable text-xs font-bold uppercase tracking-wider px-4 py-2.5 rounded-xl shrink-0"
              style={{ background: 'var(--forest)', color: 'var(--on-forest)', boxShadow: '0 0 16px -4px var(--forest)' }}
            >
              Log in
            </button>
          ) : (
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => (onLogout ? setMenuOpen((v) => !v) : onAvatarClick())}
                aria-label="Account menu"
                aria-expanded={menuOpen}
                className="pressable w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold overflow-hidden shrink-0"
                style={{ background: 'var(--mustard)', color: '#1B1815', boxShadow: '0 0 0 2px var(--paper), 0 0 0 3.5px var(--mustard)' }}
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
                    className="pressable w-full text-left text-sm px-3.5 py-2.5 hover:bg-[var(--paper-dim)] transition-colors flex items-center gap-2.5"
                    style={{ color: 'var(--ink)' }}
                  >
                    <Icon name="user" size={16} /> Profile
                  </button>
                  <button
                    onClick={() => {
                      setMenuOpen(false)
                      onLogout()
                    }}
                    className="pressable w-full text-left text-sm px-3.5 py-2.5 hover:bg-[var(--paper-dim)] transition-colors flex items-center gap-2.5"
                    style={{ color: 'var(--plum)' }}
                  >
                    <Icon name="logout" size={16} /> Log out
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
