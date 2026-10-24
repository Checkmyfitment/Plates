import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

vi.mock('../lib/supabaseClient', () => ({ supabase: {} }))
vi.mock('../context/ToastContext', () => ({
  useToast: () => ({ success: vi.fn(), error: vi.fn(), info: vi.fn() }),
}))
vi.mock('../lib/admin', () => ({ setUserBanned: vi.fn(() => Promise.resolve()) }))
vi.mock('../lib/safety', async () => {
  const actual = await vi.importActual('../lib/safety')
  return {
    ...actual,
    fetchRiskSenders: vi.fn(),
    fetchUserOverview: vi.fn(),
    fetchUserSessions: vi.fn(),
    fetchRelatedAccounts: vi.fn(),
  }
})

const safety = await import('../lib/safety')
const admin = await import('../lib/admin')
const { SafetyPanel, UserDetail } = await import('./AdminSafety')

const hoursAgo = (h) => new Date(Date.now() - h * 3_600_000).toISOString()

const sender = (over = {}) => ({
  userId: 'u1',
  name: 'Fresh Account',
  email: 'fresh@example.com',
  joinedAt: hoursAgo(5),
  accountAgeHours: 5,
  totalMessages: 7,
  flaggedMessages: 4,
  peopleMessaged: 4,
  flags: ['asks to move off-app', 'phone number'],
  lastFlaggedAt: hoursAgo(1),
  score: 7,
  level: 'high',
  ...over,
})

const overview = (over = {}) => ({
  id: 'u1',
  name: 'Fresh Account',
  email: 'fresh@example.com',
  signupIntent: 'buyer',
  neighborhood: null,
  isAdmin: false,
  isPro: false,
  banned: false,
  joinedAt: hoursAgo(5),
  lastSignInAt: hoursAgo(1),
  emailConfirmed: true,
  providers: ['google'],
  listingsCount: 0,
  ordersAsBuyer: 0,
  ordersAsSeller: 0,
  chatsStarted: 6,
  chatsReceived: 0,
  messagesSent: 9,
  firstMessageAt: new Date(Date.now() - 5 * 3_600_000 + 3 * 60_000).toISOString(),
  reportsAgainst: 1,
  reportsFiled: 0,
  lastSeenAt: new Date(Date.now() - 30_000).toISOString(),
  ...over,
})

describe('SafetyPanel', () => {
  beforeEach(() => vi.clearAllMocks())

  it('lists flagged people with the patterns that matched, and opens one', async () => {
    safety.fetchRiskSenders.mockResolvedValue([sender()])
    const onOpenUser = vi.fn()
    render(<SafetyPanel onOpenUser={onOpenUser} />)

    expect(await screen.findByText('Fresh Account')).toBeInTheDocument()
    expect(screen.getByText('asks to move off-app')).toBeInTheDocument()
    expect(screen.getByText('High')).toBeInTheDocument()
    expect(screen.getByText('new account')).toBeInTheDocument()

    fireEvent.click(screen.getByText('Fresh Account'))
    expect(onOpenUser).toHaveBeenCalledWith('u1')
  })

  it('says so when nobody is flagged', async () => {
    safety.fetchRiskSenders.mockResolvedValue([])
    render(<SafetyPanel onOpenUser={vi.fn()} />)
    expect(await screen.findByText('Nothing flagged')).toBeInTheDocument()
  })

  it('offers a way to retry when loading fails', async () => {
    safety.fetchRiskSenders.mockRejectedValueOnce(new Error('boom')).mockResolvedValueOnce([])
    render(<SafetyPanel onOpenUser={vi.fn()} />)
    fireEvent.click(await screen.findByText('Try again'))
    expect(await screen.findByText('Nothing flagged')).toBeInTheDocument()
  })
})

describe('UserDetail', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    safety.fetchUserOverview.mockResolvedValue(overview())
    safety.fetchUserSessions.mockResolvedValue([
      { startedAt: hoursAgo(2), lastSeenAt: hoursAgo(1.8) },
      { startedAt: hoursAgo(30), lastSeenAt: hoursAgo(29.5) },
    ])
    safety.fetchRelatedAccounts.mockResolvedValue([
      { id: 'u2', name: 'Same Person', email: 'f.resh@example.com', banned: true, joinedAt: hoursAgo(6), reasons: ['signed up within 15 minutes'] },
    ])
  })

  it('shows online status, warning signals, activity, and related accounts', async () => {
    render(<UserDetail userId="u1" adminId="a1" onBack={vi.fn()} onOpenUser={vi.fn()} />)

    expect(await screen.findByText('Fresh Account')).toBeInTheDocument()
    expect(screen.getAllByText('Online now').length).toBeGreaterThan(0)
    expect(screen.getByText(/New account — joined 5 hours ago/)).toBeInTheDocument()
    expect(screen.getByText('1 report filed against this person.')).toBeInTheDocument()
    expect(screen.getByText('Possibly linked to a banned account.')).toBeInTheDocument()
    expect(screen.getByText('Visits per day')).toBeInTheDocument()
    expect(screen.getByText('Same Person')).toBeInTheDocument()
  })

  it('opens a related account', async () => {
    const onOpenUser = vi.fn()
    render(<UserDetail userId="u1" adminId="a1" onBack={vi.fn()} onOpenUser={onOpenUser} />)
    fireEvent.click(await screen.findByText('Same Person'))
    expect(onOpenUser).toHaveBeenCalledWith('u2')
  })

  it('goes back to the list', async () => {
    const onBack = vi.fn()
    render(<UserDetail userId="u1" adminId="a1" onBack={onBack} onOpenUser={vi.fn()} />)
    fireEvent.click(await screen.findByText('← All users'))
    expect(onBack).toHaveBeenCalled()
  })

  it('bans the account from the detail page', async () => {
    render(<UserDetail userId="u1" adminId="a1" onBack={vi.fn()} onOpenUser={vi.fn()} />)
    fireEvent.click(await screen.findByText('Ban this account'))
    await waitFor(() => expect(admin.setUserBanned).toHaveBeenCalledWith('u1', true, 'Fresh Account'))
    expect(await screen.findByText('Unban')).toBeInTheDocument()
  })

  it('explains an empty activity history instead of showing blank charts', async () => {
    safety.fetchUserSessions.mockResolvedValue([])
    safety.fetchUserOverview.mockResolvedValue(overview({ lastSeenAt: null }))
    render(<UserDetail userId="u1" adminId="a1" onBack={vi.fn()} onOpenUser={vi.fn()} />)
    expect(await screen.findByText(/No visits recorded in the last 30 days/)).toBeInTheDocument()
    expect(screen.getByText('No activity recorded yet')).toBeInTheDocument()
  })

  it('shows a way out when the person cannot be loaded', async () => {
    safety.fetchUserOverview.mockRejectedValueOnce(new Error('nope'))
    render(<UserDetail userId="u1" adminId="a1" onBack={vi.fn()} onOpenUser={vi.fn()} />)
    expect(await screen.findByText("Couldn't load this person")).toBeInTheDocument()
    fireEvent.click(screen.getByText('Try again'))
    expect(await screen.findByText('Fresh Account')).toBeInTheDocument()
  })
})
