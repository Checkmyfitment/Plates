import { useState } from 'react'
import { updateProfile } from '../lib/profiles'
import { geocodeArea } from '../lib/geocode'
import { uploadAvatarPhoto, validatePhotoFile } from '../lib/storage'
import { LANGUAGE_OPTIONS } from '../lib/translate'

export default function EditProfile({ userId, profile, onBack, onSaved }) {
  const [name, setName] = useState(profile?.name ?? '')
  const [kitchen, setKitchen] = useState(profile?.kitchen ?? '')
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url ?? '')
  const [neighborhood, setNeighborhood] = useState(profile?.neighborhood ?? '')
  const [defaultPickupNote, setDefaultPickupNote] = useState(profile?.default_pickup_note ?? '')
  const [preferredLanguage, setPreferredLanguage] = useState(profile?.preferred_language ?? '')
  const [photoError, setPhotoError] = useState('')
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [saving, setSaving] = useState(false)
  const [locating, setLocating] = useState(false)

  const handlePhoto = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setPhotoError('')
    try {
      validatePhotoFile(file)
    } catch (err) {
      setPhotoError(err.message)
      return
    }
    setUploadingPhoto(true)
    try {
      const url = await uploadAvatarPhoto(userId, file)
      setAvatarUrl(url)
    } catch (err) {
      console.error('Failed to upload photo', err)
      setPhotoError(err.message || 'Could not upload photo. Try again.')
    } finally {
      setUploadingPhoto(false)
    }
  }

  const submit = async (e) => {
    e.preventDefault()
    if (!name.trim()) return
    setSubmitError('')
    setSaving(true)
    try {
      const trimmedNeighborhood = neighborhood.trim()
      let lat = profile?.lat ?? null
      let lng = profile?.lng ?? null

      if (!trimmedNeighborhood) {
        lat = null
        lng = null
      } else if (trimmedNeighborhood !== (profile?.neighborhood ?? '')) {
        setLocating(true)
        const coords = await geocodeArea(trimmedNeighborhood)
        setLocating(false)
        lat = coords?.lat ?? null
        lng = coords?.lng ?? null
      }

      const updated = await updateProfile(userId, {
        name: name.trim(),
        kitchen: kitchen.trim() || null,
        avatarUrl: avatarUrl || null,
        neighborhood: trimmedNeighborhood || null,
        lat,
        lng,
        defaultPickupNote: defaultPickupNote.trim() || null,
        preferredLanguage: preferredLanguage || null,
      })
      onSaved(updated)
    } catch (err) {
      setSubmitError(err.message || 'Could not save your profile. Try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="pb-6">
      <div className="px-5 pt-6 pb-3 flex items-center gap-3">
        <button
          onClick={onBack}
          aria-label="Back"
          className="pressable text-lg p-2 -m-2 rounded-full hover:bg-[var(--paper-dim)] transition-colors"
          style={{ color: 'var(--forest-dark)' }}
        >
          ←
        </button>
        <h2 className="font-display text-xl" style={{ color: 'var(--forest-dark)' }}>
          Edit profile
        </h2>
      </div>

      <form className="px-5 flex flex-col gap-3" onSubmit={submit}>
        <div className="flex flex-col gap-1 text-xs" style={{ color: 'var(--ink-soft)' }}>
          Photo
          <div className="flex items-center gap-3">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center text-xl font-medium overflow-hidden shrink-0"
              style={{ background: 'var(--mustard)', color: 'var(--forest-dark)' }}
            >
              {avatarUrl ? (
                <img src={avatarUrl} alt="Preview" className="w-full h-full object-cover" />
              ) : (
                name.charAt(0).toUpperCase() || '🍽️'
              )}
            </div>
            <label
              className="text-xs px-3 py-2 rounded-xl border cursor-pointer"
              style={{ borderColor: 'var(--rule)', color: 'var(--ink)', opacity: uploadingPhoto ? 0.6 : 1 }}
            >
              {uploadingPhoto ? 'Uploading…' : avatarUrl ? 'Change photo' : 'Add a photo'}
              <input type="file" accept="image/*" onChange={handlePhoto} disabled={uploadingPhoto} className="hidden" />
            </label>
          </div>
          {photoError && (
            <span className="text-xs" style={{ color: 'var(--plum)' }}>
              {photoError}
            </span>
          )}
        </div>

        <label className="flex flex-col gap-1 text-xs" style={{ color: 'var(--ink-soft)' }}>
          Your name
          <input value={name} onChange={(e) => setName(e.target.value)} className="field" required />
        </label>

        <label className="flex flex-col gap-1 text-xs" style={{ color: 'var(--ink-soft)' }}>
          Neighborhood or zip code
          <input
            value={neighborhood}
            onChange={(e) => setNeighborhood(e.target.value)}
            placeholder="e.g. Highland Park, 90042"
            className="field"
            maxLength={100}
          />
          <span>We'll show your general area on the map — never your exact address.</span>
        </label>

        <label className="flex flex-col gap-1 text-xs" style={{ color: 'var(--ink-soft)' }}>
          Usual pickup note (optional)
          <input
            value={defaultPickupNote}
            onChange={(e) => setDefaultPickupNote(e.target.value)}
            placeholder="e.g. 710 Elm St, ring the doorbell"
            className="field"
            maxLength={150}
          />
          <span>Pre-fills the pickup note on every new listing you post — you can still change it per listing.</span>
        </label>

        <label className="flex flex-col gap-1 text-xs" style={{ color: 'var(--ink-soft)' }}>
          Preferred language for chat translation
          <select
            value={preferredLanguage}
            onChange={(e) => setPreferredLanguage(e.target.value)}
            className="field"
          >
            {LANGUAGE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <span>Used when you tap "Translate" on a chat message — leave on Auto to use your browser's language.</span>
        </label>

        <label className="flex flex-col gap-1 text-xs" style={{ color: 'var(--ink-soft)' }}>
          Kitchen name / bio
          <textarea
            rows={3}
            value={kitchen}
            onChange={(e) => setKitchen(e.target.value)}
            placeholder="e.g. Maria's Cocina — family recipes from Oaxaca, baking since 2019"
            className="field resize-none"
            maxLength={300}
          />
        </label>

        {submitError && (
          <p className="text-xs" style={{ color: 'var(--plum)' }}>
            {submitError}
          </p>
        )}

        <button
          type="submit"
          disabled={saving || uploadingPhoto}
          className="pressable w-full mt-2 py-3 rounded-xl font-medium text-sm disabled:opacity-60 hover:opacity-90 active:opacity-80 transition-opacity"
          style={{ background: 'var(--mustard)', color: 'var(--forest-dark)' }}
        >
          {locating ? 'Finding your area…' : saving ? 'Saving…' : 'Save profile'}
        </button>
      </form>
    </div>
  )
}
