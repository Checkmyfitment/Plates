import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useToast } from '../context/ToastContext'

// assumes a US number when no country code is typed — good enough for a
// neighborhood marketplace; anyone outside the US can type a leading "+"
function normalizePhone(raw) {
  const digits = raw.replace(/\D/g, '')
  if (raw.trim().startsWith('+')) return `+${digits}`
  return `+1${digits}`
}

export default function PhoneVerification({ phoneVerified, onVerified }) {
  const toast = useToast()
  const [step, setStep] = useState('idle') // 'idle' | 'code'
  const [phone, setPhone] = useState('')
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)

  const sendCode = async () => {
    const normalized = normalizePhone(phone)
    if (normalized.replace('+', '').length < 8) {
      toast.error('Enter a valid phone number.')
      return
    }
    setBusy(true)
    try {
      const { error } = await supabase.auth.updateUser({ phone: normalized })
      if (error) throw error
      setPhone(normalized)
      setStep('code')
      toast.success('Code sent — check your texts.')
    } catch (err) {
      console.error('Failed to send verification code', err)
      toast.error(err.message || 'Could not send a code — try again.')
    } finally {
      setBusy(false)
    }
  }

  const confirmCode = async () => {
    setBusy(true)
    try {
      const { error } = await supabase.auth.verifyOtp({ phone, token: code, type: 'phone_change' })
      if (error) throw error
      toast.success('Phone verified!')
      setStep('idle')
      setCode('')
      await onVerified?.()
    } catch (err) {
      console.error('Failed to verify code', err)
      toast.error(err.message || "That code didn't work — try again.")
    } finally {
      setBusy(false)
    }
  }

  if (phoneVerified) {
    return (
      <div className="card-elevated p-3 mb-3">
        <p className="text-sm font-medium" style={{ color: 'var(--forest-dark)' }}>
          ✓ Phone verified
        </p>
        <p className="text-xs mt-1" style={{ color: 'var(--ink-soft)' }}>
          Other neighbors can see your phone's verified — it's a small trust signal. No one else sees the number
          itself.
        </p>
      </div>
    )
  }

  return (
    <div className="card-elevated p-3 mb-3">
      <p className="text-sm font-medium" style={{ color: 'var(--forest-dark)' }}>
        📱 Verify your phone
      </p>
      <p className="text-xs mt-1" style={{ color: 'var(--ink-soft)' }}>
        Confirm your number to earn a "Phone verified" badge on your profile — it helps buyers and sellers trust who
        they're dealing with.
      </p>

      {step === 'idle' && (
        <div className="flex gap-2 mt-2.5">
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="(555) 123-4567"
            className="flex-1 px-3 py-1.5 rounded-lg border text-sm"
            style={{ borderColor: 'var(--rule)' }}
          />
          <button
            onClick={sendCode}
            disabled={busy || !phone.trim()}
            className="pressable text-xs px-3 py-1.5 rounded-full font-medium disabled:opacity-50 shrink-0"
            style={{ background: 'var(--forest)', color: 'white' }}
          >
            {busy ? 'Sending…' : 'Send code'}
          </button>
        </div>
      )}

      {step === 'code' && (
        <div className="mt-2.5">
          <div className="flex gap-2">
            <input
              type="text"
              inputMode="numeric"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              placeholder="6-digit code"
              maxLength={6}
              className="flex-1 px-3 py-1.5 rounded-lg border text-sm"
              style={{ borderColor: 'var(--rule)', letterSpacing: '0.2em' }}
            />
            <button
              onClick={confirmCode}
              disabled={busy || code.length < 4}
              className="pressable text-xs px-3 py-1.5 rounded-full font-medium disabled:opacity-50 shrink-0"
              style={{ background: 'var(--forest)', color: 'white' }}
            >
              {busy ? 'Checking…' : 'Confirm'}
            </button>
          </div>
          <button
            onClick={() => {
              setStep('idle')
              setCode('')
            }}
            disabled={busy}
            className="pressable text-xs mt-2"
            style={{ color: 'var(--ink-soft)' }}
          >
            Use a different number
          </button>
        </div>
      )}
    </div>
  )
}
