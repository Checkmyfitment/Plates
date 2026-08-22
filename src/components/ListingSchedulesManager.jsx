import { useEffect, useState } from 'react'
import { fetchSchedules, createSchedule, deleteSchedule, formatWeekday, formatTimeRange } from '../lib/schedules'

const emptyForm = { weekday: '2', start: '', end: '', capacity: '' }

export default function ListingSchedulesManager({ listingId }) {
  const [schedules, setSchedules] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState(emptyForm)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const load = () => {
    fetchSchedules(listingId)
      .then(setSchedules)
      .catch((err) => console.error('Failed to load cook schedule', err))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listingId])

  const update = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }))

  const addSchedule = async (e) => {
    e.preventDefault()
    if (!form.start || !form.end) return
    if (form.end <= form.start) {
      setError('End time must be after start time.')
      return
    }
    setError('')
    setSaving(true)
    try {
      await createSchedule({
        listingId,
        weekday: Number(form.weekday),
        pickupStart: form.start,
        pickupEnd: form.end,
        capacity: form.capacity ? Number(form.capacity) : null,
      })
      setForm(emptyForm)
      load()
    } catch (err) {
      setError(err.message || 'Could not add that schedule. Try again.')
    } finally {
      setSaving(false)
    }
  }

  const removeSchedule = async (id) => {
    setError('')
    try {
      await deleteSchedule(id)
      setSchedules((prev) => prev.filter((s) => s.id !== id))
    } catch (err) {
      console.error('Failed to delete schedule', err)
      setError(err.message || 'Could not remove that schedule. Try again.')
    }
  }

  return (
    <div className="card-elevated p-3">
      <p className="text-xs font-medium" style={{ color: 'var(--ink)' }}>
        Cook schedule
      </p>
      <p className="text-xs mt-0.5" style={{ color: 'var(--ink-soft)' }}>
        Optional — for stuff you make on a standing schedule instead of always having ready.
        Buyers order ahead into an upcoming date instead of messaging you first.
      </p>

      {!loading && schedules.length > 0 && (
        <div className="flex flex-col gap-1.5 mt-2.5">
          {schedules.map((s) => (
            <div
              key={s.id}
              className="flex items-center justify-between gap-2 text-xs rounded-lg px-2.5 py-1.5"
              style={{ background: 'var(--paper-dim)' }}
            >
              <span>
                Every {formatWeekday(s.weekday)} · {formatTimeRange(s.pickupStart, s.pickupEnd)}
                {s.capacity != null && <span style={{ color: 'var(--ink-soft)' }}> · max {s.capacity}/week</span>}
              </span>
              <button
                type="button"
                onClick={() => removeSchedule(s.id)}
                className="pressable shrink-0"
                style={{ color: 'var(--plum)' }}
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-col gap-2 mt-3">
        <select value={form.weekday} onChange={update('weekday')} className="field text-xs">
          <option value="0">Every Sunday</option>
          <option value="1">Every Monday</option>
          <option value="2">Every Tuesday</option>
          <option value="3">Every Wednesday</option>
          <option value="4">Every Thursday</option>
          <option value="5">Every Friday</option>
          <option value="6">Every Saturday</option>
        </select>
        <div className="grid grid-cols-2 gap-2">
          <input type="time" value={form.start} onChange={update('start')} className="field text-xs" />
          <input type="time" value={form.end} onChange={update('end')} className="field text-xs" />
        </div>
        <input
          type="number"
          min="1"
          placeholder="Max orders per week (optional)"
          value={form.capacity}
          onChange={update('capacity')}
          className="field text-xs"
        />
        {error && (
          <p className="text-xs" style={{ color: 'var(--plum)' }}>
            {error}
          </p>
        )}
        <button
          type="button"
          onClick={addSchedule}
          disabled={saving}
          className="pressable text-xs px-3 py-1.5 rounded-full border font-medium self-start disabled:opacity-60"
          style={{ borderColor: 'var(--forest)', color: 'var(--forest-dark)' }}
        >
          {saving ? 'Adding…' : '+ Add to schedule'}
        </button>
      </div>
    </div>
  )
}
