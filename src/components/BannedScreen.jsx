import Logo from './Logo'
import { SUPPORT_EMAIL } from '../lib/siteInfo'

export default function BannedScreen({ onLogout }) {
  return (
    <div
      className="max-w-md mx-auto min-h-screen flex flex-col items-center justify-center px-8 text-center gap-3"
      style={{ background: 'var(--paper)' }}
    >
      <Logo size={44} />
      <h1 className="font-display text-xl mt-2" style={{ color: 'var(--forest-dark)' }}>
        Account suspended
      </h1>
      <p className="text-sm" style={{ color: 'var(--ink-soft)' }}>
        Your account has been suspended for violating our community guidelines. If you think this
        is a mistake, reach out to{' '}
        <a href={`mailto:${SUPPORT_EMAIL}`} style={{ color: 'var(--forest-dark)', textDecoration: 'underline' }}>
          {SUPPORT_EMAIL}
        </a>
        .
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
