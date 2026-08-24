import { describe, it, expect, vi, afterEach } from 'vitest'
import { translateText, browserTargetLanguage, targetLanguageFor } from './translate'

function mockFetchOnce(body) {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => body }))
}

describe('translateText', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('returns the translated text on success', async () => {
    mockFetchOnce({ responseStatus: 200, responseData: { translatedText: '¿Tienes tamales hoy?' } })
    expect(await translateText('Do you have tamales today?', 'es')).toBe('¿Tienes tamales hoy?')
  })

  // regression test for a real bug found live: MyMemory returns HTTP 200
  // even when it fails at the API level (e.g. source and target language
  // are the same, which happens whenever a message is already in the
  // viewer's own language) — the failure only shows up in responseStatus,
  // and the "translatedText" field is literally the error message in caps
  it('treats an API-level failure (responseStatus !== 200) as no translation, not as text to show', async () => {
    mockFetchOnce({
      responseStatus: '403',
      responseData: { translatedText: 'PLEASE SELECT TWO DISTINCT LANGUAGES' },
    })
    expect(await translateText('Hello there', 'en')).toBeNull()
  })

  it('treats an unchanged echo of the original text as no real translation', async () => {
    mockFetchOnce({ responseStatus: 200, responseData: { translatedText: 'Hello there' } })
    expect(await translateText('Hello there', 'en')).toBeNull()
  })

  it('returns null on a network failure instead of throwing', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')))
    expect(await translateText('Hello', 'es')).toBeNull()
  })

  it('does not call the API for empty/whitespace-only text', async () => {
    const fetchSpy = vi.fn()
    vi.stubGlobal('fetch', fetchSpy)
    expect(await translateText('   ', 'es')).toBeNull()
    expect(fetchSpy).not.toHaveBeenCalled()
  })
})

describe('browserTargetLanguage', () => {
  it('reduces a region-specific locale to its base language code', () => {
    vi.stubGlobal('navigator', { language: 'es-MX' })
    expect(browserTargetLanguage()).toBe('es')
  })
})

describe('targetLanguageFor', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("prefers the profile's explicit preferred_language over the browser's own", () => {
    vi.stubGlobal('navigator', { language: 'en-US' })
    expect(targetLanguageFor({ preferred_language: 'es' })).toBe('es')
  })

  it("falls back to the browser's language when no profile preference is set", () => {
    vi.stubGlobal('navigator', { language: 'fr-CA' })
    expect(targetLanguageFor(null)).toBe('fr')
    expect(targetLanguageFor({ preferred_language: null })).toBe('fr')
  })
})
