import { useState } from 'react'
import { getStoredTheme, setTheme } from '../lib/theme'

const OPTIONS = [
  { value: null, label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
]

export default function ThemeToggle() {
  const [theme, setThemeState] = useState(() => getStoredTheme())

  const choose = (value) => {
    setTheme(value)
    setThemeState(value)
  }

  return (
    <div className="card-elevated p-3 mb-3">
      <p className="text-sm font-medium">🌓 Appearance</p>
      <div className="flex gap-2 mt-2">
        {OPTIONS.map((opt) => (
          <button
            key={opt.label}
            type="button"
            onClick={() => choose(opt.value)}
            className="pressable flex-1 text-xs px-3 py-2 rounded-xl border font-medium"
            style={
              theme === opt.value
                ? { background: 'var(--forest)', color: 'white', borderColor: 'var(--forest)' }
                : { borderColor: 'var(--rule)', color: 'var(--ink)' }
            }
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  )
}
