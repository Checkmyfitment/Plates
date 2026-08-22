import { useEffect, useState } from 'react'
import { CUISINES, DIET_TAGS } from '../lib/listingOptions'
import { fetchUnclaimedStores } from '../lib/admin'
import { uploadListingPhoto, validatePhotoFile } from '../lib/storage'
import PhotoGalleryPicker from './PhotoGalleryPicker'
import PickupTimeFields from './PickupTimeFields'

const emptyForm = {
  title: '',
  price: '',
  unit: '',
  description: '',
  allergens: '',
  allergensConfirmed: false,
  minOrderAmount: '',
  pickup: '',
  pickupDate: '',
  pickupStart: '',
  pickupEnd: '',
  quantityAvailable: '',
  orderCutoffHours: '',
  photoUrl: '',
  photoUrls: [],
  deliveryAvailable: false,
  deliveryNotes: '',
  cuisine: CUISINES[0],
  diet: [],
  unclaimedStoreId: '',
}

export default function PostListing({ onAddListing, onEditListing, isAdmin, currentUserId, defaultPickupNote }) {
  const [posted, setPosted] = useState(false)
  const [postedListing, setPostedListing] = useState(null)
  const [form, setForm] = useState(() => ({ ...emptyForm, pickup: defaultPickupNote || '' }))
  const [photoError, setPhotoError] = useState('')
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [saving, setSaving] = useState(false)
  const [stores, setStores] = useState([])

  useEffect(() => {
    if (!isAdmin) return
    fetchUnclaimedStores()
      .then((all) => setStores(all.filter((s) => !s.claimedBy)))
      .catch((err) => console.error('Failed to load stores', err))
  }, [isAdmin])

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

  if (posted) {
    return (
      <div className="px-5 pt-16 text-center">
        <div className="text-4xl mb-3">✓</div>
        <h2 className="font-display text-xl" style={{ color: 'var(--forest-dark)' }}>
          Listing posted
        </h2>
        <p className="text-sm mt-1" style={{ color: 'var(--ink-soft)' }}>
          Buyers nearby can see it now.
        </p>
        {postedListing && onEditListing && (
          <div className="card-elevated p-4 mt-6 text-left">
            <p className="text-sm font-medium">Make something on a schedule?</p>
            <p className="text-xs mt-1" style={{ color: 'var(--ink-soft)' }}>
              Add specific pickup time slots, or a standing weekly schedule for stuff you make
              regularly — both are optional and live on the listing's edit page.
            </p>
            <button
              onClick={() => onEditListing(postedListing)}
              className="pressable text-xs px-3 py-1.5 rounded-full font-medium mt-3"
              style={{ background: 'var(--forest)', color: 'white' }}
            >
              Add pickup times or a schedule
            </button>
          </div>
        )}
        <button
          onClick={() => {
            setForm({ ...emptyForm, pickup: defaultPickupNote || '' })
            setPhotoError('')
            setPosted(false)
            setPostedListing(null)
          }}
          className="pressable mt-6 text-sm px-4 py-2 rounded-xl border"
          style={{ borderColor: 'var(--rule)' }}
        >
          Post another
        </button>
      </div>
    )
  }

  return (
    <form
      className="px-5 pb-6 flex flex-col gap-3"
      onSubmit={async (e) => {
        e.preventDefault()
        if (!form.title.trim() || !form.price) return
        setSubmitError('')
        setSaving(true)
        try {
          const listing = await onAddListing({
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
            unclaimedStoreId: form.unclaimedStoreId || null,
          })
          setPostedListing(listing ?? null)
          setPosted(true)
        } catch (err) {
          setSubmitError(err.message || 'Could not post your listing. Try again.')
        } finally {
          setSaving(false)
        }
      }}
    >
      <h2 className="font-display text-xl mb-1" style={{ color: 'var(--forest-dark)' }}>
        Sell something
      </h2>

      {isAdmin && stores.length > 0 && (
        <Field label="Posting for (admin)">
          <select value={form.unclaimedStoreId} onChange={update('unclaimedStoreId')} className="field">
            <option value="">Myself</option>
            {stores.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          {form.unclaimedStoreId && (
            <span className="text-[11px] mt-0.5" style={{ color: 'var(--ink-soft)' }}>
              This listing will show as unclaimed until they sign up with the claim link.
            </span>
          )}
        </Field>
      )}

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
        <input
          value={form.title}
          onChange={update('title')}
          placeholder="e.g. Chicken tamales"
          className="field"
          maxLength={100}
          required
        />
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
            placeholder="18"
            className="field"
            required
          />
        </Field>
        <Field label="Per">
          <input value={form.unit} onChange={update('unit')} placeholder="dozen" className="field" maxLength={30} />
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
          placeholder="Ingredients, what makes it special…"
          className="field resize-none"
          maxLength={1000}
        />
      </Field>

      <Field label="Allergens (comma separated)">
        <input
          value={form.allergens}
          onChange={update('allergens')}
          placeholder="e.g. Gluten, Dairy"
          className="field"
          maxLength={200}
        />
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
        <input
          value={form.pickup}
          onChange={update('pickup')}
          placeholder="Today 4–7 PM · Your neighborhood"
          className="field"
          maxLength={150}
        />
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
          <input
            value={form.deliveryNotes}
            onChange={update('deliveryNotes')}
            placeholder="e.g. Free within 2 miles, $5 beyond that"
            className="field"
          />
        </Field>
      )}

      <p className="text-xs mt-1" style={{ color: 'var(--ink-soft)' }}>
        By posting you confirm this food is made in a home kitchen that meets your state's
        cottage food rules.
      </p>

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
        {saving ? 'Posting…' : 'Post listing'}
      </button>
    </form>
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
