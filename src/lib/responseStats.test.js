import { describe, it, expect } from 'vitest'
import { formatResponseTime } from './responseStats'

describe('formatResponseTime', () => {
  it('shows "a few minutes" under an hour', () => {
    expect(formatResponseTime(0)).toBe('a few minutes')
    expect(formatResponseTime(45)).toBe('a few minutes')
    expect(formatResponseTime(59)).toBe('a few minutes')
  })

  it('shows whole hours, singular and plural', () => {
    expect(formatResponseTime(60)).toBe('1 hour')
    expect(formatResponseTime(150)).toBe('3 hours')
  })

  it('shows whole days once it rounds up to 24+ hours', () => {
    expect(formatResponseTime(60 * 24)).toBe('1 day')
    expect(formatResponseTime(60 * 24 * 3)).toBe('3 days')
  })
})
