// Accepts a social/website link typed with or without a protocol (e.g.
// "instagram.com/mariascocina" or "https://instagram.com/mariascocina")
// and normalizes it to a full https:// (or http://) URL for storage.
// Returns null for an empty input. Throws a user-facing message if what's
// left doesn't look like a real link, so a typo doesn't silently save as
// a broken, unclickable link -- or as something like "javascript:..." .
export function normalizeSocialLink(input) {
  const trimmed = (input ?? '').trim()
  if (!trimmed) return null

  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
  let url
  try {
    url = new URL(withProtocol)
  } catch {
    throw new Error("That doesn't look like a valid link.")
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    throw new Error("That doesn't look like a valid link.")
  }
  if (!url.hostname.includes('.')) {
    throw new Error("That doesn't look like a valid link.")
  }
  return url.toString()
}

// Short display text for a stored link -- drops the protocol and any
// trailing slash so "https://instagram.com/mariascocina/" reads as
// "instagram.com/mariascocina".
export function formatSocialLinkLabel(url) {
  if (!url) return ''
  return url.replace(/^https?:\/\//i, '').replace(/\/$/, '')
}
