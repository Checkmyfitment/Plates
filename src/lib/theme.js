const KEY = 'plates_theme'

// theme is 'light' | 'dark' | null (null = follow the system setting)
export function getStoredTheme() {
  try {
    return localStorage.getItem(KEY)
  } catch {
    return null
  }
}

export function applyTheme(theme) {
  const root = document.documentElement
  if (theme === 'dark' || theme === 'light') {
    root.setAttribute('data-theme', theme)
  } else {
    root.removeAttribute('data-theme')
  }
}

export function setTheme(theme) {
  try {
    if (theme) localStorage.setItem(KEY, theme)
    else localStorage.removeItem(KEY)
  } catch {
    // ignore — worst case the choice doesn't persist across reloads
  }
  applyTheme(theme)
}
