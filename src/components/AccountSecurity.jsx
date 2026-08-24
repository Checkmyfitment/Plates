import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { deleteMyAccount } from '../lib/profiles'
import { useToast } from '../context/ToastContext'

export default function AccountSecurity({ email, onAccountDeleted }) {
  const { updateEmail, updatePassword, signOut } = useAuth()
  const toast = useToast()

  const [newEmail, setNewEmail] = useState('')
  const [emailBusy, setEmailBusy] = useState(false)
  const [emailError, setEmailError] = useState('')

  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordBusy, setPasswordBusy] = useState(false)
  const [passwordError, setPasswordError] = useState('')

  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [deleteBusy, setDeleteBusy] = useState(false)

  const submitEmail = async (e) => {
    e.preventDefault()
    setEmailError('')
    const trimmed = newEmail.trim()
    if (!trimmed || trimmed === email) return
    setEmailBusy(true)
    const { error } = await updateEmail(trimmed)
    setEmailBusy(false)
    if (error) {
      setEmailError(error.message)
    } else {
      toast.success('Check your new email to confirm the change.')
      setNewEmail('')
    }
  }

  const submitPassword = async (e) => {
    e.preventDefault()
    setPasswordError('')
    if (newPassword.length < 6) {
      setPasswordError('Password must be at least 6 characters.')
      return
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match.')
      return
    }
    setPasswordBusy(true)
    const { error } = await updatePassword(newPassword)
    setPasswordBusy(false)
    if (error) {
      setPasswordError(error.message)
    } else {
      toast.success('Password updated.')
      setNewPassword('')
      setConfirmPassword('')
    }
  }

  const confirmDelete = async () => {
    setDeleteBusy(true)
    try {
      await deleteMyAccount()
      await signOut()
      onAccountDeleted?.()
    } catch (err) {
      console.error('Failed to delete account', err)
      toast.error('Could not delete your account — try again.')
      setDeleteBusy(false)
    }
  }

  return (
    <div className="card-elevated p-4 mb-3">
      <p className="text-sm font-medium mb-3">🔒 Account & security</p>

      <form onSubmit={submitEmail} className="flex flex-col gap-1.5 mb-4">
        <span className="text-xs" style={{ color: 'var(--ink-soft)' }}>
          Change email — currently {email}
        </span>
        <div className="flex gap-2">
          <input
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            type="email"
            placeholder="New email address"
            className="field flex-1"
          />
          <button
            type="submit"
            disabled={emailBusy || !newEmail.trim()}
            className="pressable shrink-0 text-xs px-3 py-2 rounded-full font-medium disabled:opacity-50"
            style={{ background: 'var(--card)', color: 'var(--ink)', border: '1px solid var(--rule)' }}
          >
            {emailBusy ? 'Saving…' : 'Update'}
          </button>
        </div>
        {emailError && (
          <p className="text-xs" style={{ color: 'var(--plum)' }}>
            {emailError}
          </p>
        )}
      </form>

      <form onSubmit={submitPassword} className="flex flex-col gap-1.5 mb-4">
        <span className="text-xs" style={{ color: 'var(--ink-soft)' }}>
          Change password
        </span>
        <input
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          type="password"
          placeholder="New password"
          className="field"
          minLength={6}
        />
        <input
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          type="password"
          placeholder="Confirm new password"
          className="field"
          minLength={6}
        />
        {passwordError && (
          <p className="text-xs" style={{ color: 'var(--plum)' }}>
            {passwordError}
          </p>
        )}
        <button
          type="submit"
          disabled={passwordBusy}
          className="pressable self-start text-xs px-3 py-2 rounded-full font-medium disabled:opacity-50"
          style={{ background: 'var(--card)', color: 'var(--ink)', border: '1px solid var(--rule)' }}
        >
          {passwordBusy ? 'Saving…' : 'Update password'}
        </button>
      </form>

      <div className="pt-3 border-t" style={{ borderColor: 'var(--rule)' }}>
        <p className="text-xs font-medium mb-1" style={{ color: 'var(--plum)' }}>
          Delete account
        </p>
        <p className="text-[11px] mb-2" style={{ color: 'var(--ink-soft)' }}>
          Removes your name, photo, and location from Plates and takes your listings down. Past orders and
          reviews stay in place for the other party, just without your personal info attached.
        </p>
        {!confirmingDelete ? (
          <button
            onClick={() => setConfirmingDelete(true)}
            className="pressable text-xs px-3 py-2 rounded-full font-medium"
            style={{ border: '1px solid var(--plum)', color: 'var(--plum)' }}
          >
            Delete my account
          </button>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={confirmDelete}
              disabled={deleteBusy}
              className="pressable text-xs px-3 py-2 rounded-full font-medium disabled:opacity-50"
              style={{ background: 'var(--plum)', color: 'white' }}
            >
              {deleteBusy ? 'Deleting…' : 'Yes, delete my account'}
            </button>
            <button
              onClick={() => setConfirmingDelete(false)}
              disabled={deleteBusy}
              className="pressable text-xs px-3 py-2 rounded-full font-medium"
              style={{ border: '1px solid var(--rule)', color: 'var(--ink)' }}
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
