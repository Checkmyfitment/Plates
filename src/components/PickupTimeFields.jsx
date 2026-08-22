export default function PickupTimeFields({ date, start, end, onChange }) {
  return (
    <div className="flex flex-col gap-1 text-xs" style={{ color: 'var(--ink-soft)' }}>
      Pickup time (optional — more precise than the note above)
      <div className="grid grid-cols-3 gap-2">
        <input
          type="date"
          value={date}
          onChange={(e) => onChange({ date: e.target.value, start, end })}
          className="field"
          aria-label="Pickup date"
        />
        <input
          type="time"
          value={start}
          onChange={(e) => onChange({ date, start: e.target.value, end })}
          className="field"
          aria-label="Pickup start time"
        />
        <input
          type="time"
          value={end}
          onChange={(e) => onChange({ date, start, end: e.target.value })}
          className="field"
          aria-label="Pickup end time"
        />
      </div>
    </div>
  )
}
