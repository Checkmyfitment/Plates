import ThemeToggle from './ThemeToggle'
import PhoneVerification from './PhoneVerification'
import PushToggle from './PushToggle'
import ListingAlerts from './ListingAlerts'
import AccountSecurity from './AccountSecurity'

// Everything that configures the account rather than being profile
// content — pulled out of the main Profile screen (which was getting
// crowded) into its own screen, the same way Admin/Orders/Dashboard
// already work.
export default function SettingsScreen({ userId, email, phoneVerified, onProfileRefresh, onBack, onLogout, onOpenLegal }) {
  return (
    <div className="px-5 pt-6 pb-8">
      <div className="flex items-center gap-3 mb-5">
        <button
          onClick={onBack}
          aria-label="Back"
          className="pressable text-lg p-2 -m-2 rounded-full hover:bg-[var(--paper-dim)] transition-colors"
          style={{ color: 'var(--forest-dark)' }}
        >
          ←
        </button>
        <h2 className="font-display text-xl" style={{ color: 'var(--forest-dark)' }}>
          Settings
        </h2>
      </div>

      <ThemeToggle />

      {userId && <PhoneVerification phoneVerified={phoneVerified} onVerified={onProfileRefresh} />}

      {userId && <PushToggle userId={userId} />}

      {userId && <ListingAlerts userId={userId} />}

      {userId && <AccountSecurity email={email} />}

      {onOpenLegal && (
        <div className="flex flex-wrap gap-x-3 gap-y-1 mt-6 pt-4 border-t" style={{ borderColor: 'var(--rule)' }}>
          <button onClick={() => onOpenLegal('terms')} className="text-xs" style={{ color: 'var(--ink-soft)' }}>
            Terms of Service
          </button>
          <button onClick={() => onOpenLegal('privacy')} className="text-xs" style={{ color: 'var(--ink-soft)' }}>
            Privacy Policy
          </button>
          <button onClick={() => onOpenLegal('guidelines')} className="text-xs" style={{ color: 'var(--ink-soft)' }}>
            Community Guidelines
          </button>
          <button onClick={() => onOpenLegal('states')} className="text-xs" style={{ color: 'var(--ink-soft)' }}>
            Cottage Food Laws by State
          </button>
        </div>
      )}

      {onLogout && (
        <button
          onClick={onLogout}
          className="pressable w-full mt-6 py-3 rounded-xl text-sm font-medium border"
          style={{ borderColor: 'var(--rule)', color: 'var(--ink-soft)' }}
        >
          Log out
        </button>
      )}
    </div>
  )
}
