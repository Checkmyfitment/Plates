import { useState } from 'react'
import { CUISINES, DIET_TAGS } from '../lib/listingOptions'
import PickupSlotsManager from './PickupSlotsManager'
import ListingSchedulesManager from './ListingSchedulesManager'
import PhotoGalleryPicker from './PhotoGalleryPicker'
import PickupTimeFields from './PickupTimeFields'
import { uploadListingPhoto, validatePhotoFile } from '../lib/storage'

export default function EditListing({ listing, onBack, onSave, onDelete, onToggleAvailability, onDuplicate, currentUserId }) {
  const [duplicating, setDuplicating] = useState(false)
  const [form, setForm] = useState({
    title: listing.title ?? '',
    price: listing.price ?? '',
    unit: listing.unit ?? '',
    description: listing.description ?? '',
    allergens: (listing.allergens ?? []).join(', '),
    allergensConfirmed: listing.allergensConfirmed ?? false,
    minOrderAmount: listing.minOrderAmount ?? '',
    pickup: listing.pickup ?? '',
    pickupDate: listing.pickupDate ?? '',
    pickupStart: listing.pickupStart ?? '',
    pickupEnd: listing.pickupEnd ?? '',
    quantityAvailable: listing.quantityAvailable ?? '',
    orderCutoffHours: listing.orderCutoffHours ?? '',
    photoUrl: listing.photoUrl ?? '',
    photoUrls: listing.photoUrls ?? [],
    deliveryAvailable: listing.deliveryAvailable ?? false,
    deliveryNotes: listing.deliveryNotes ?? '',
    cuisine: listing.cuisine || CUISINES[0],
    diet: listing.diet ?? [],
  })
  const [photoError, setPhotoError] = useState('')
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [togglingAvailability, setTogglingAvailability] = useState(false)
  const available = listing.available ?? true

  const handleToggleAvailability = async () => {
    setSubmitError('')
    setTogglingAvailability(true)
    try {
      await onToggleAvailability(listing.id, !available)
    } catch (err) {
      setSubmitError(err.message || 'Could not update availability. Try again.')
    } finally {
      setTogglingAvailability(false)
    }
  }

  const update = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }))

  const toggleDiet = (tag) =>
    setForm((f) => ({
      ...f,
      diet: f.diet.includes(tag) ? f.diet.filter((d) => d !== tag) : [...f.diet, tag],
    }))

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
      const url = await uploadListingPhoto(currentUserId, file)
      setForm((f) => ({ ...f, photoUrl: url }))
    } catch (err) {
      console.error('Failed to upload photo', err)
      setPhotoError(err.message || 'Could not upload photo. Try again.')
    } finally {
      setUploadingPhoto(false)
    }
  }

  const submit = async (e) => {
    e.preventDefault()
    if (!form.title.trim() || !form.price) return
    setSubmitError('')
    setSaving(true)
    try {
      await onSave(listing.id, {
        title: form.title.trim(),
        price: Number(form.price) || 0,
        unit: form.unit.trim() || 'each',
        photoUrl: form.photoUrl || null,
        photoUrls: form.photoUrls,
        allergens: form.allergens
          .split(',')
          .map((a) => a.trim())
          .filter(Boolean),
        allergensConfirmed: form.allergensConfirmed,
        minOrderAmount: form.minOrderAmount === '' ? null : Number(form.minOrderAmount),
        pickup: form.pickup.trim() || 'TBD',
        pickupDate: form.pickupDate,
        pickupStart: form.pickupStart,
        pickupEnd: form.pickupEnd,
        quantityAvailable: form.quantityAvailable === '' ? null : Number(form.quantityAvailable),
        orderCutoffHours: form.orderCutoffHours === '' ? null : Number(form.orderCutoffHours),
        description: form.description.trim(),
        deliveryAvailable: form.deliveryAvailable,
        deliveryNotes: form.deliveryAvailable ? form.deliveryNotes.trim() : '',
        cuisine: form.cuisine,
        diet: form.diet,
      })
    } catch (err) {
      setSubmitError(err.message || 'Could not save changes. Try again.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    setDeleting(true)
    setSubmitError('')
    try {
      await onDelete(listing.id)
    } catch (err) {
      setSubmitError(err.message || 'Could not delete this listing. Try again.')
      setDeleting(false)
    }
  }

  const handleDuplicate = async () => {
    setDuplicating(true)
    try {
      await onDuplicate(listing)
    } finally {
      setDuplicating(false)
    }
  }

  return (
    <div className="pb-6">
      <div className="px-5 pt-6 pb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            aria-label="Back"
            className="pressable text-lg p-2 -m-2 rounded-full hover:bg-[var(--paper-dim)] transition-colors"
            style={{ color: 'var(--forest-dark)' }}
          >
            ←
          </button>
          <h2 className="font-display text-xl" style={{ color: 'var(--forest-dark)' }}>
            Edit listing
          </h2>
        </div>
        {onDuplicate && (
          <button
            onClick={handleDuplicate}
            disabled={duplicating}
            className="pressable shrink-0 text-xs px-3 py-1.5 rounded-full border font-medium disabled:opacity-60"
            style={{ borderColor: 'var(--rule)', color: 'var(--ink)' }}
          >
            {duplicating ? 'Reposting…' : '🔁 Repost'}
          </button>
        )}
      </div>

      <div className="px-5 mb-3">
        <div
          className="flex items-center justify-between rounded-xl border p-3"
          style={{ borderColor: available ? 'var(--rule)' : 'var(--plum)' }}
        >
          <div>
            <p className="text-sm font-medium">{available ? 'Available' : 'Sold out'}</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--ink-soft)' }}>
              {available ? 'Buyers can see and message you about this.' : 'Hidden from buyers as sold.'}
            </p>
          </div>
          <button
            type="button"
            onClick={handleToggleAvailability}
            disabled={togglingAvailability}
            className="pressable text-xs px-3 py-2 rounded-xl border font-medium shrink-0 disabled:opacity-60"
            style={{ borderColor: 'var(--forest)', color: 'var(--forest-dark)' }}
          >
            {togglingAvailability ? 'Updating…' : available ? 'Mark as sold' : 'Mark as available'}
          </button>
        </div>
      </div>

      <div className="px-5 mb-3">
        <PickupSlotsManager listingId={listing.id} />
      </div>

      <div className="px-5 mb-3">
        <ListingSchedulesManager listingId={listing.id} />
      </div>

      <form className="px-5 flex flex-col gap-3" onSubmit={submit}>
        <div className="flex flex-col gap-1 text-xs" style={{ color: 'var(--ink-soft)' }}>
          Photo
          <div className="flex items-center gap-3">
            <div
              className="w-16 h-16 rounded-xl flex items-center justify-center text-2xl overflow-hidden shrink-0"
              style={{ background: 'var(--paper-dim)', border: '1px solid var(--rule)' }}
            >
              {form.photoUrl ? (
                <img src={form.photoUrl} alt="Preview" className="w-full h-full object-cover" />
              ) : (
                '🍽️'
              )}
            </div>
            <label
              className="text-xs px-3 py-2 rounded-xl border cursor-pointer"
              style={{ borderColor: 'var(--rule)', color: 'var(--ink)', opacity: uploadingPhoto ? 0.6 : 1 }}
            >
              {uploadingPhoto ? 'Uploading…' : form.photoUrl ? 'Change photo' : 'Add a photo'}
              <input type="file" accept="image/*" onChange={handlePhoto} disabled={uploadingPhoto} className="hidden" />
            </label>
          </div>
          {photoError && (
            <span className="text-xs" style={{ color: 'var(--plum)' }}>
              {photoError}
            </span>
          )}
        </div>

        <PhotoGalleryPicker
          photoUrls={form.photoUrls}
          onChange={(next) => setForm((f) => ({ ...f, photoUrls: next }))}
          currentUserId={currentUserId}
        />

        <Field label="What are you selling?">
          <input value={form.title} onChange={update('title')} className="field" maxLength={100} required />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Price">
            <input
              value={form.price}
              onChange={update('price')}
              type="number"
              min="0"
              max="10000"
              step="0.01"
              className="field"
              required
            />
          </Field>
          <Field label="Per">
            <input value={form.unit} onChange={update('unit')} className="field" maxLength={30} />
          </Field>
        </div>

        <Field label="Cuisine">
          <select value={form.cuisine} onChange={update('cuisine')} className="field">
            {CUISINES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </Field>

        <div className="flex flex-col gap-1 text-xs" style={{ color: 'var(--ink-soft)' }}>
          Diet
          <div className="flex flex-wrap gap-1.5">
            {DIET_TAGS.map((tag) => {
              const active = form.diet.includes(tag)
              return (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleDiet(tag)}
                  className="pressable text-xs px-2.5 py-1 rounded-full border"
                  style={{
                    background: active ? 'var(--forest)' : 'transparent',
                    color: active ? 'white' : 'var(--ink-soft)',
                    borderColor: active ? 'var(--forest)' : 'var(--rule)',
                  }}
                >
                  {tag}
                </button>
              )
            })}
          </div>
        </div>

        <Field label="Description">
          <textarea
            rows={3}
            value={form.description}
            onChange={update('description')}
            className="field resize-none"
            maxLength={1000}
          />
        </Field>

        <Field label="Allergens (comma separated)">
          <input value={form.allergens} onChange={update('allergens')} className="field" maxLength={200} />
        </Field>

        <label className="flex items-start gap-2 text-xs -mt-1" style={{ color: 'var(--ink-soft)' }}>
          <input
            type="checkbox"
            checked={form.allergensConfirmed}
            onChange={(e) => setForm((f) => ({ ...f, allergensConfirmed: e.target.checked }))}
            className="mt-0.5"
          />
          <span>
            I've double-checked this allergen list is accurate for what's actually in this dish
          </span>
        </label>

        <Field label="Minimum order amount (optional)">
          <input
            value={form.minOrderAmount}
            onChange={update('minOrderAmount')}
            type="number"
            min="0"
            max="10000"
            step="0.01"
            placeholder="e.g. 15"
            className="field"
          />
        </Field>

        <Field label="Pickup note">
          <input value={form.pickup} onChange={update('pickup')} className="field" maxLength={150} />
        </Field>

        <PickupTimeFields
          date={form.pickupDate}
          start={form.pickupStart}
          end={form.pickupEnd}
          onChange={({ date, start, end }) => setForm((f) => ({ ...f, pickupDate: date, pickupStart: start, pickupEnd: end }))}
        />

        <Field label="How many available? (optional — leave blank to toggle sold out manually)">
          <input
            value={form.quantityAvailable}
            onChange={update('quantityAvailable')}
            type="number"
            min="0"
            step="1"
            placeholder="e.g. 12"
            className="field"
          />
        </Field>

        {form.pickupDate && form.pickupStart && (
          <Field label="Stop taking orders __ hours before pickup (optional)">
            <input
              value={form.orderCutoffHours}
              onChange={update('orderCutoffHours')}
              type="number"
              min="0"
              step="1"
              placeholder="e.g. 3"
              className="field"
            />
          </Field>
        )}

        <label className="flex items-center gap-2 text-xs" style={{ color: 'var(--ink)' }}>
          <input
            type="checkbox"
            checked={form.deliveryAvailable}
            onChange={(e) => setForm((f) => ({ ...f, deliveryAvailable: e.target.checked }))}
            className="w-4 h-4"
          />
          I can also deliver this
        </label>

        {form.deliveryAvailable && (
          <Field label="Delivery notes (area, fee, timing)">
            <input value={form.deliveryNotes} onChange={update('deliveryNotes')} className="field" />
          </Field>
        )}

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
          {saving ? 'Saving…' : 'Save changes'}
        </button>

        {!confirmingDelete ? (
          <button
            type="button"
            onClick={() => setConfirmingDelete(true)}
            className="pressable w-full py-3 rounded-xl font-medium text-sm border"
            style={{ borderColor: 'var(--plum)', color: 'var(--plum)' }}
          >
            Delete listing
          </button>
        ) : (
          <div className="rounded-xl border p-3" style={{ borderColor: 'var(--plum)' }}>
            <p className="text-xs" style={{ color: 'var(--plum)' }}>
              Delete this listing for good? This can't be undone.
            </p>
            <div className="flex gap-2 mt-2">
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="pressable flex-1 py-2 rounded-xl text-xs font-medium disabled:opacity-60"
                style={{ background: 'var(--plum)', color: 'white' }}
              >
                {deleting ? 'Deleting…' : 'Yes, delete it'}
              </button>
              <button
                type="button"
                onClick={() => setConfirmingDelete(false)}
                className="pressable flex-1 py-2 rounded-xl text-xs font-medium border"
                style={{ borderColor: 'var(--rule)' }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </form>
    </div>
  )
}

function Field({ label, children }) {
  return (
    <label className="flex flex-col gap-1 text-xs" style={{ color: 'var(--ink-soft)' }}>
      {label}
      {children}
    </label>
  )
}
