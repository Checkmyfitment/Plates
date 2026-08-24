// Free machine translation via MyMemory (no API key, no signup — same
// free-public-API pattern as geocode.js). Good for the occasional
// cross-language chat message between neighbors; anonymous usage is capped
// around 5000 words/day, which is fine at Plates' current scale but isn't
// meant to carry heavy production translation volume.
export async function translateText(text, targetLang) {
  const trimmed = text.trim()
  if (!trimmed) return null

  try {
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(trimmed)}&langpair=autodetect|${targetLang}`
    const res = await fetch(url)
    if (!res.ok) return null
    const data = await res.json()
    // MyMemory returns HTTP 200 even on API-level failures (e.g. "PLEASE
    // SELECT TWO DISTINCT LANGUAGES" when the detected source language
    // matches the target — a real case here, since a message already in the
    // viewer's own language autodetects to the same language they're
    // translating into) — the real status lives in responseStatus, not the
    // HTTP status
    if (Number(data?.responseStatus) !== 200) return null
    const translated = data?.responseData?.translatedText
    if (!translated) return null
    // MyMemory hands back the original text (unchanged) when it can't
    // translate — e.g. the daily quota is exhausted, or source === target —
    // treat that as "no translation available" rather than showing a
    // "translation" that's just the same text again
    if (translated.trim().toLowerCase() === trimmed.toLowerCase()) return null
    return translated
  } catch {
    return null
  }
}

// the viewer's browser language, normalized to the 2-letter code MyMemory
// expects (e.g. "es-MX" -> "es") — falls back to English if undetectable
export function browserTargetLanguage() {
  const lang = typeof navigator !== 'undefined' ? navigator.language : 'en'
  return (lang || 'en').split('-')[0]
}

// a profile's explicit preferred_language wins over the browser's own
// locale when set — useful whenever the two don't match (e.g. an English
// browser but a Spanish-speaking user)
export function targetLanguageFor(profile) {
  return profile?.preferred_language || browserTargetLanguage()
}

export const LANGUAGE_OPTIONS = [
  { value: '', label: "Auto (use my browser's language)" },
  { value: 'en', label: 'English' },
  { value: 'es', label: 'Spanish' },
  { value: 'zh', label: 'Chinese' },
  { value: 'vi', label: 'Vietnamese' },
  { value: 'tl', label: 'Tagalog' },
  { value: 'ko', label: 'Korean' },
  { value: 'fr', label: 'French' },
  { value: 'pt', label: 'Portuguese' },
  { value: 'ar', label: 'Arabic' },
  { value: 'hi', label: 'Hindi' },
]
