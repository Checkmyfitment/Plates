import { describe, expect, it } from 'vitest'
import { normalizeSocialLink, formatSocialLinkLabel } from './socialLink'

describe('normalizeSocialLink', () => {
  it('returns null for empty input', () => {
    expect(normalizeSocialLink('')).toBeNull()
    expect(normalizeSocialLink('   ')).toBeNull()
    expect(normalizeSocialLink(undefined)).toBeNull()
  })

  it('adds https:// when no protocol is given', () => {
    expect(normalizeSocialLink('instagram.com/mariascocina')).toBe('https://instagram.com/mariascocina')
  })

  it('keeps an explicit http:// or https:// protocol', () => {
    expect(normalizeSocialLink('http://mariascocina.com')).toBe('http://mariascocina.com/')
    expect(normalizeSocialLink('https://mariascocina.com')).toBe('https://mariascocina.com/')
  })

  it('trims surrounding whitespace', () => {
    expect(normalizeSocialLink('  instagram.com/mariascocina  ')).toBe('https://instagram.com/mariascocina')
  })

  it('rejects a non-http(s) protocol, e.g. javascript:', () => {
    expect(() => normalizeSocialLink('javascript:alert(1)')).toThrow()
  })

  it('rejects text with no domain', () => {
    expect(() => normalizeSocialLink('not a link')).toThrow()
    expect(() => normalizeSocialLink('justtext')).toThrow()
  })
})

describe('formatSocialLinkLabel', () => {
  it('strips the protocol and a trailing slash', () => {
    expect(formatSocialLinkLabel('https://instagram.com/mariascocina/')).toBe('instagram.com/mariascocina')
    expect(formatSocialLinkLabel('http://mariascocina.com/')).toBe('mariascocina.com')
  })

  it('returns empty string for a falsy input', () => {
    expect(formatSocialLinkLabel(null)).toBe('')
    expect(formatSocialLinkLabel('')).toBe('')
  })
})
