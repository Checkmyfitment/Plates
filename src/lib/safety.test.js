import { describe, it, expect, vi } from 'vitest'

vi.mock('./supabaseClient', () => ({ supabase: {} }))

const { isOnline, lastSeenText, ageText, summarizeSessions, hourLabel, userSignals } = await import('./safety')

// built from local-time parts so the tests pass in any time zone
const at = (y, m, d, h = 0, min = 0) => new Date(y, m - 1, d, h, min).getTime()
const iso = (ms) => new Date(ms).toISOString()

describe('isOnline / lastSeenText', () => {
  const now = at(2026, 10, 24, 12, 0)

  it('counts someone as online if heard from in the last couple of minutes', () => {
    expect(isOnline(iso(now - 60_000), now)).toBe(true)
    expect(isOnline(iso(now - 140_000), now)).toBe(true)
    expect(isOnline(iso(now - 200_000), now)).toBe(false)
    expect(isOnline(null, now)).toBe(false)
  })

  it('describes how long ago they were seen', () => {
    expect(lastSeenText(null, now)).toBe('No activity recorded yet')
    expect(lastSeenText(iso(now - 30_000), now)).toBe('Online now')
    expect(lastSeenText(iso(now - 12 * 60_000), now)).toBe('Last seen 12m ago')
    expect(lastSeenText(iso(now - 3 * 3_600_000), now)).toBe('Last seen 3h ago')
    expect(lastSeenText(iso(now - 5 * 86_400_000), now)).toBe('Last seen 5d ago')
  })
})

describe('ageText', () => {
  const now = at(2026, 10, 24, 12, 0)
  it('picks a readable unit', () => {
    expect(ageText(iso(now - 60_000), now)).toBe('1 minute')
    expect(ageText(iso(now - 5 * 3_600_000), now)).toBe('5 hours')
    expect(ageText(iso(now - 4 * 86_400_000), now)).toBe('4 days')
  })
})

describe('summarizeSessions', () => {
  const now = at(2026, 10, 24, 15, 0)

  it('counts visits per day, per hour, and averages', () => {
    const sessions = [
      { startedAt: iso(at(2026, 10, 24, 9, 0)), lastSeenAt: iso(at(2026, 10, 24, 9, 20)) },
      { startedAt: iso(at(2026, 10, 24, 21, 0)), lastSeenAt: iso(at(2026, 10, 24, 21, 10)) },
      { startedAt: iso(at(2026, 10, 22, 21, 30)), lastSeenAt: iso(at(2026, 10, 22, 21, 30)) },
    ]
    const s = summarizeSessions(sessions, { days: 30, now })

    expect(s.total).toBe(3)
    expect(s.daily).toHaveLength(30)
    expect(s.daily[29].count).toBe(2) // today is last
    expect(s.daily[27].count).toBe(1) // two days ago
    expect(s.activeDays).toBe(2)
    expect(s.avgPerActiveDay).toBe(1.5)
    expect(s.hours[9]).toBe(1)
    expect(s.hours[21]).toBe(2)
    expect(s.peakHour).toBe(21)
    expect(s.avgMinutes).toBe(10) // (20 + 10 + 0) / 3
  })

  it('handles someone with no visits', () => {
    const s = summarizeSessions([], { days: 7, now })
    expect(s.total).toBe(0)
    expect(s.peakHour).toBeNull()
    expect(s.avgMinutes).toBe(0)
    expect(s.daily).toHaveLength(7)
  })
})

describe('hourLabel', () => {
  it('formats a 12-hour clock', () => {
    expect(hourLabel(0)).toBe('12 AM')
    expect(hourLabel(9)).toBe('9 AM')
    expect(hourLabel(12)).toBe('12 PM')
    expect(hourLabel(21)).toBe('9 PM')
  })
})

describe('userSignals', () => {
  const now = at(2026, 10, 24, 12, 0)
  const base = {
    joinedAt: iso(now - 30 * 86_400_000),
    banned: false,
    firstMessageAt: null,
    chatsStarted: 0,
    reportsAgainst: 0,
  }

  it('says nothing about an ordinary established account', () => {
    expect(userSignals(base, [], now)).toEqual([])
  })

  it('flags a brand-new account that messaged within minutes of signing up', () => {
    const o = { ...base, joinedAt: iso(now - 3_600_000), firstMessageAt: iso(now - 3_600_000 + 4 * 60_000) }
    const texts = userSignals(o, [], now).map((s) => s.text)
    expect(texts.some((t) => t.startsWith('New account'))).toBe(true)
    expect(texts.some((t) => t.includes('4 minutes after signing up'))).toBe(true)
  })

  it('flags reports, bans and links to banned accounts', () => {
    const o = { ...base, banned: true, reportsAgainst: 2 }
    const related = [{ id: 'x', banned: true }, { id: 'y', banned: false }]
    const texts = userSignals(o, related, now).map((s) => s.text)
    expect(texts).toContain('This account is banned.')
    expect(texts).toContain('2 reports filed against this person.')
    expect(texts).toContain('Possibly linked to a banned account.')
    expect(texts).toContain('2 possibly related accounts (see below).')
  })

  it('flags a burst of new conversations in the first week', () => {
    const o = { ...base, joinedAt: iso(now - 2 * 86_400_000), chatsStarted: 6 }
    expect(userSignals(o, [], now).map((s) => s.text)).toContain('Started 6 conversations in its first week.')
  })
})
