import { describe, it, expect } from 'vitest'
import { parseBulkLeadLine, personalizedOutreachMessage, outreachMessageTemplate } from './outreach'

describe('parseBulkLeadLine', () => {
  it('parses name, dish, and contact info', () => {
    expect(parseBulkLeadLine('Maria - dumplings - fb.com/maria')).toEqual({
      contactName: 'Maria',
      listingNote: 'dumplings',
      contactInfo: 'fb.com/maria',
    })
  })

  it('defaults listingNote and contactInfo to empty when only a name is given', () => {
    expect(parseBulkLeadLine('Maria')).toEqual({
      contactName: 'Maria',
      listingNote: '',
      contactInfo: '',
    })
  })

  it('defaults contactInfo to empty when only name and dish are given', () => {
    expect(parseBulkLeadLine('Maria - dumplings')).toEqual({
      contactName: 'Maria',
      listingNote: 'dumplings',
      contactInfo: '',
    })
  })

  // regression test for a real bug: a blank middle field (e.g. pasted from
  // a spreadsheet with an empty "dish" cell) used to get silently dropped
  // instead of staying blank, shifting the contact info left into
  // listingNote and losing it from contactInfo entirely
  it('keeps a blank middle field blank instead of shifting later fields left', () => {
    expect(parseBulkLeadLine('Maria -  - (555) 123-4567')).toEqual({
      contactName: 'Maria',
      listingNote: '',
      contactInfo: '(555) 123-4567',
    })
  })

  it('rejoins extra dashes beyond the third field into contactInfo', () => {
    expect(parseBulkLeadLine('Maria - dumplings - fb.com/maria - also on IG')).toEqual({
      contactName: 'Maria',
      listingNote: 'dumplings',
      contactInfo: 'fb.com/maria - also on IG',
    })
  })

  it('returns null for a blank or whitespace-only line', () => {
    expect(parseBulkLeadLine('')).toBeNull()
    expect(parseBulkLeadLine('   ')).toBeNull()
  })

  it('returns null when the name field itself is blank', () => {
    expect(parseBulkLeadLine(' - dumplings - fb.com/maria')).toBeNull()
  })
})

describe('personalizedOutreachMessage', () => {
  it('swaps in the known dish', () => {
    const message = personalizedOutreachMessage({ listingNote: 'birria tacos' })
    expect(message).toContain('your birria tacos post')
    expect(message).not.toContain('[dish]')
  })

  it('falls back to the generic template when there is no listing note', () => {
    expect(personalizedOutreachMessage({ listingNote: null })).toBe(outreachMessageTemplate)
    expect(personalizedOutreachMessage({ listingNote: '   ' })).toBe(outreachMessageTemplate)
  })
})
