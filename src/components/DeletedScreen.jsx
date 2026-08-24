import Logo from './Logo'

export default function DeletedScreen({ onLogout }) {
  return (
    <div
      className="max-w-md mx-auto min-h-screen flex flex-col items-center justify-center px-8 text-center gap-3"
      style={{ background: 'var(--paper)' }}
    >
      <Logo size={44} />
      <h1 className="font-display text-xl mt-2" style={{ color: 'var(--forest-dark)' }}>
        Account deleted
      </h1>
      <p className="text-sm" style={{ color: 'var(--ink-soft)' }}>
        This account's profile and listings have been removed from Plates. Thanks for being part of the
        community.
      </p>
      <button
        onClick={onLogout}
        className="pressable mt-2 px-5 py-2.5 rounded-xl text-sm font-medium hover:opacity-90 active:opacity-80 transition-opacity"
        style={{ background: 'var(--mustard)', color: 'var(--forest-dark)' }}
      >
        Log out
      </button>
    </div>
  )
}
