// Prefers the device's native share sheet (Messages, WhatsApp, Mail, social
// apps, etc.) so "sharing" actually sends something to someone, not just
// copies text to a clipboard they then have to paste somewhere themselves.
// Falls back to clipboard copy on browsers that don't support it (mainly
// desktop Chrome/Firefox) — Safari and virtually all mobile browsers do.
//
// Returns 'shared' | 'cancelled' | 'copied' so the caller can decide
// whether a toast is needed (the native share sheet already gives its own
// feedback, so callers should only toast on 'copied').
export async function shareLink({ url, title, text }) {
  if (navigator.share) {
    try {
      await navigator.share({ title, text, url })
      return 'shared'
    } catch (err) {
      if (err.name === 'AbortError') return 'cancelled'
      throw err
    }
  }
  await navigator.clipboard.writeText(url)
  return 'copied'
}
