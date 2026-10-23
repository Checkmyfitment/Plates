import { useState } from 'react'
import { Capacitor } from '@capacitor/core'
import { getProOffer, startProCheckout, purchasePro, restorePro } from '../lib/pro'
import { PRO_PRICE_LABEL, SUPPORT_EMAIL } from '../lib/siteInfo'
import { useToast } from '../context/ToastContext'

// The seller dashboard's "Plates Pro" card. Three states:
//   - already Pro: a thank-you card (plus how to manage it, when paid)
//   - not Pro: depends on getProOffer() -- a real buy button once payments
//     are live, the original "message us" link on the web until then, and
//     nothing at all inside the iOS/Android apps until then
export default function ProCard({ profile, userId, onProfileRefresh, offer = getProOffer() }) {
  const toast = useToast()
  const [busy, setBusy] = useState(false)
  const native = Capacitor.isNativePlatform()

  // the store tells RevenueCat, RevenueCat tells our webhook, the webhook
  // flips is_pro -- a few seconds, so re-check the profile shortly after
  const refreshSoon = () => {
    for (const ms of [2500, 7000, 15000]) setTimeout(() => onProfileRefresh?.(), ms)
  }

  const buy = async () => {
    setBusy(true)
    try {
      if (native) {
        await purchasePro(userId)
        toast.success('Welcome to Pro! Your badge will show up in a moment.')
        refreshSoon()
      } else {
        await startProCheckout() // leaves the page for Stripe Checkout
      }
    } catch (err) {
      console.error('Failed to buy Pro', err)
      if (!/cancel/i.test(err?.message || '')) toast.error(err?.message || 'Could not complete that — try again.')
    } finally {
      setBusy(false)
    }
  }

  const restore = async () => {
    setBusy(true)
    try {
      await restorePro(userId)
      toast.success('Checked your purchases.')
      refreshSoon()
    } catch (err) {
      console.error('Failed to restore purchases', err)
      toast.error('Could not restore purchases — try again.')
    } finally {
      setBusy(false)
    }
  }

  if (profile?.is_pro) {
    return (
      <div className="card-elevated p-4 mb-3 flex items-center gap-3" style={{ background: 'var(--mustard-soft)' }}>
        <div className="icon-badge" aria-hidden="true" style={{ background: 'rgba(255,255,255,0.5)' }}>
          🌟
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium" style={{ color: 'var(--mustard-deep)' }}>
            You're a Plates Pro seller
          </p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--mustard-deep)', opacity: 0.8 }}>
            Thanks for supporting Pass the Plates — your Pro badge is showing on your storefront.
            {profile?.pro_until && ` Paid through ${new Date(profile.pro_until).toLocaleDateString()}.`}
          </p>
        </div>
      </div>
    )
  }

  if (offer === 'hidden') return null

  if (offer === 'request') {
    return (
      <div className="card-elevated p-4 mb-3">
        <p className="text-sm font-medium flex items-center gap-1.5">🌟 Go Pro — {PRO_PRICE_LABEL}</p>
        <p className="text-xs mt-1 leading-relaxed" style={{ color: 'var(--ink-soft)' }}>
          A "Plates Pro" badge on your storefront and profile, plus priority support — billed
          manually for now, same as Featured listings.
        </p>
        <a
          href={`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent('Going Pro on Plates')}`}
          className="pressable inline-block mt-2 text-xs px-3 py-1.5 rounded-full font-medium"
          style={{ background: 'var(--forest)', color: 'white' }}
        >
          Message us to upgrade
        </a>
      </div>
    )
  }

  return (
    <div className="card-elevated p-4 mb-3">
      <p className="text-sm font-medium flex items-center gap-1.5">🌟 Plates Pro — {PRO_PRICE_LABEL}</p>
      <p className="text-xs mt-1 leading-relaxed" style={{ color: 'var(--ink-soft)' }}>
        A Pro badge on your storefront and profile, your listings featured in Browse, and priority support.
      </p>
      <button
        onClick={buy}
        disabled={busy}
        className="pressable mt-2 text-xs px-3 py-1.5 rounded-full font-medium disabled:opacity-60"
        style={{ background: 'var(--forest)', color: 'var(--paper)' }}
      >
        {busy ? 'Please wait…' : `Subscribe for ${PRO_PRICE_LABEL}`}
      </button>
      {/* Apple requires the price, renewal terms, and a restore option up front */}
      <p className="text-[11px] mt-2 leading-relaxed" style={{ color: 'var(--ink-soft)' }}>
        {native
          ? `Renews automatically every month until you cancel it in your ${
              Capacitor.getPlatform() === 'ios' ? 'App Store' : 'Google Play'
            } subscription settings.`
          : 'Renews monthly until you cancel. To cancel, message us and we will do it right away.'}
      </p>
      {native && (
        <button
          onClick={restore}
          disabled={busy}
          className="pressable mt-1 text-[11px] underline disabled:opacity-60"
          style={{ color: 'var(--ink-soft)' }}
        >
          Restore purchases
        </button>
      )}
    </div>
  )
}
