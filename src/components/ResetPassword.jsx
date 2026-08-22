import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import Logo from './Logo'

export default function ResetPassword() {
  const { updatePassword } = useAuth()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }
    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }
    setBusy(true)
    const { error } = await updatePassword(password)
    setBusy(false)
    if (error) setError(error.message)
  }

  return (
    <div className="max-w-md mx-auto min-h-screen flex flex-col justify-center px-6" style={{ background: 'var(--paper)' }}>
      <div className="flex justify-center mb-3">
        <Logo size={52} />
      </div>
      <h1 className="font-display text-2xl text-center mb-1" style={{ color: 'var(--forest-dark)' }}>
        Set a new password
      </h1>
      <p className="text-sm text-center mb-6" style={{ color: 'var(--ink-soft)' }}>
        You clicked a password reset link — choose a new password below.
      </p>

      <form onSubmit={submit} className="flex flex-col gap-3">
        <input
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          type="password"
          placeholder="New password"
          className="field"
          required
          minLength={6}
        />
        <input
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          type="password"
          placeholder="Confirm new password"
          className="field"
          required
          minLength={6}
        />

        {error && (
          <p className="text-xs" style={{ color: 'var(--plum)' }}>
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={busy}
          className="pressable w-full mt-2 py-3 rounded-xl font-medium text-sm disabled:opacity-60 hover:opacity-90 active:opacity-80 transition-opacity"
          style={{ background: 'var(--mustard)', color: 'var(--forest-dark)' }}
        >
          {busy ? 'Saving…' : 'Save new password'}
        </button>
      </form>
    </div>
  )
}
