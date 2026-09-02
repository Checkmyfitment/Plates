import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import { AuthProvider } from './context/AuthContext.jsx'
import { ToastProvider } from './context/ToastContext.jsx'
import { applyTheme, getStoredTheme } from './lib/theme.js'
import { logClientError } from './lib/errorLog.js'

applyTheme(getStoredTheme())

// ErrorBoundary only catches errors thrown while React is rendering — an
// exception inside a click handler or a rejected promise (a failed fetch
// with no .catch, say) never reaches it. These two catch everything else.
window.addEventListener('error', (event) => {
  logClientError({ message: event.message, stack: event.error?.stack, context: 'window-error' })
})
window.addEventListener('unhandledrejection', (event) => {
  const reason = event.reason
  logClientError({
    message: reason?.message ?? String(reason),
    stack: reason?.stack,
    context: 'unhandled-rejection',
  })
})

// registered unconditionally (not just when a user opts into push) so the
// browser's "Add to Home Screen" install prompt is available to everyone —
// most browsers require an active service worker registration for that
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((err) => console.error('SW registration failed', err))
  })
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <ToastProvider>
        <AuthProvider>
          <App />
        </AuthProvider>
      </ToastProvider>
    </ErrorBoundary>
  </StrictMode>,
)
