import { useEffect, useState } from 'react'
import { fetchSlots, createSlot, deleteSlot, formatSlotRange } from '../lib/slots'

const emptyForm = { date: '', start: '', end: '', capacity: '' }

export default function PickupSlotsManager({ listingId }) {
  const [slots, setSlots] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState(emptyForm)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const load = () => {
    fetchSlots(listingId)
      .then(setSlots)
      .catch((err) => console.error('Failed to load pickup slots', err))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listingId])

  const update = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }))

  const addSlot = async (e) => {
    e.preventDefault()
    if (!form.date || !form.start || !form.end) return
    const startsAt = new Date(`${form.date}T${form.start}`)
    const endsAt = new Date(`${form.date}T${form.end}`)
    if (endsAt <= startsAt) {
      setError('End time must be after start time.')
      return
    }
    setError('')
    setSaving(true)
    try {
      await createSlot({
        listingId,
        startsAt: startsAt.toISOString(),
        endsAt: endsAt.toISOString(),
        capacity: form.capacity ? Number(form.capacity) : null,
      })
      setForm(emptyForm)
      load()
    } catch (err) {
      setError(err.message || 'Could not add that slot. Try again.')
    } finally {
      setSaving(false)
    }
  }

  const removeSlot = async (id) => {
    setError('')
    try {
      await deleteSlot(id)
      setSlots((prev) => prev.filter((s) => s.id !== id))
    } catch (err) {
      console.error('Failed to delete pickup slot', err)
      setError(err.message || 'Could not remove that slot. Try again.')
    }
  }

  return (
    <div className="card-elevated p-3">
      <p className="text-xs font-medium" style={{ color: 'var(--ink)' }}>
        Pickup slots
      </p>
      <p className="text-xs mt-0.5" style={{ color: 'var(--ink-soft)' }}>
        Optional — let buyers reserve a specific pickup time instead of just messaging you.
      </p>

      {!loading && slots.length > 0 && (
        <div className="flex flex-col gap-1.5 mt-2.5">
          {slots.map((s) => (
            <div key={s.id} className="flex items-center justify-between gap-2 text-xs rounded-lg px-2.5 py-1.5" style={{ background: 'var(--paper-dim)' }}>
              <span>
                {formatSlotRange(s.startsAt, s.endsAt)}
                {s.capacity != null && (
                  <span style={{ color: 'var(--ink-soft)' }}>
                    {' '}
                    · {s.reservedCount}/{s.capacity} reserved
                  </span>
                )}
                {s.capacity == null && s.reservedCount > 0 && (
                  <span style={{ color: 'var(--ink-soft)' }}> · {s.reservedCount} coming</span>
                )}
              </span>
              <button type="button" onClick={() => removeSlot(s.id)} className="pressable shrink-0" style={{ color: 'var(--plum)' }}>
                Remove
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-col gap-2 mt-3">
        <div className="grid grid-cols-2 gap-2">
          <input type="date" value={form.date} onChange={update('date')} className="field text-xs" />
          <input type="number" min="1" placeholder="Max spots (optional)" value={form.capacity} onChange={update('capacity')} className="field text-xs" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <input type="time" value={form.start} onChange={update('start')} className="field text-xs" />
          <input type="time" value={form.end} onChange={update('end')} className="field text-xs" />
        </div>
        {error && (
          <p className="text-xs" style={{ color: 'var(--plum)' }}>
            {error}
          </p>
        )}
        <button
          type="button"
          onClick={addSlot}
          disabled={saving}
          className="pressable text-xs px-3 py-1.5 rounded-full border font-medium self-start disabled:opacity-60"
          style={{ borderColor: 'var(--forest)', color: 'var(--forest-dark)' }}
        >
          {saving ? 'Adding…' : '+ Add pickup slot'}
        </button>
      </div>
    </div>
  )
}
