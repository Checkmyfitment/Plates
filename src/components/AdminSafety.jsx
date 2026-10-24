import { useEffect, useState } from 'react'
import Placeholder from './Placeholder'
import { setUserBanned } from '../lib/admin'
import {
  fetchUserOverview,
  fetchUserSessions,
  fetchRelatedAccounts,
  fetchRiskSenders,
  isOnline,
  lastSeenText,
  ageText,
  summarizeSessions,
  hourLabel,
  userSignals,
} from '../lib/safety'
import { useToast } from '../context/ToastContext'

const REFRESH_MS = 30_000

// small dot + label for "online now"
export function OnlineBadge({ lastSeenAt }) {
  if (!isOnline(lastSeenAt)) return null
  return (
    <span
      className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-medium"
      style={{ background: 'var(--forest-soft)', color: 'var(--forest-dark)' }}
    >
      <span aria-hidden="true" className="inline-block w-1.5 h-1.5 rounded-full" style={{ background: 'var(--forest)' }} />
      Online
    </span>
  )
}

function Pill({ children, background, color }) {
  return (
    <span className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{ background, color }}>
      {children}
    </span>
  )
}

function Section({ title, hint, children }) {
  return (
    <section className="card-elevated p-4 mb-3">
      <h3 className="font-display text-base" style={{ color: 'var(--forest-dark)' }}>
        {title}
      </h3>
      {hint && (
        <p className="text-xs mt-0.5" style={{ color: 'var(--ink-soft)' }}>
          {hint}
        </p>
      )}
      <div className="mt-3">{children}</div>
    </section>
  )
}

function Stat({ label, value }) {
  return (
    <div className="rounded-xl p-2.5 text-center" style={{ background: 'var(--paper-dim)' }}>
      <p className="font-display text-lg leading-tight" style={{ color: 'var(--forest-dark)' }}>
        {value}
      </p>
      <p className="text-[10px] mt-0.5" style={{ color: 'var(--ink-soft)' }}>
        {label}
      </p>
    </div>
  )
}

function Row({ label, value }) {
  return (
    <div className="flex justify-between gap-3 py-1.5 text-sm border-b last:border-b-0" style={{ borderColor: 'var(--rule)' }}>
      <dt style={{ color: 'var(--ink-soft)' }}>{label}</dt>
      <dd className="text-right min-w-0 break-words">{value}</dd>
    </div>
  )
}

// a row of thin bars; `ticks` are [index, text] pairs shown underneath
export function MiniBars({ values, ticks = [], ariaLabel }) {
  const max = Math.max(1, ...values)
  return (
    <div role="img" aria-label={ariaLabel}>
      <div className="flex items-end gap-[2px] h-14">
        {values.map((v, i) => (
          <div
            key={i}
            className="flex-1 rounded-sm"
            style={{
              height: v > 0 ? `${Math.max(10, (v / max) * 100)}%` : '3px',
              background: v > 0 ? 'var(--forest)' : 'var(--rule)',
            }}
          />
        ))}
      </div>
      <div className="relative h-4 mt-1">
        {ticks.map(([index, text]) => (
          <span
            key={text}
            className="absolute text-[10px]"
            style={{
              left: `${(index / values.length) * 100}%`,
              color: 'var(--ink-soft)',
              transform: index === 0 ? 'none' : index >= values.length - 1 ? 'translateX(-100%)' : 'translateX(-50%)',
            }}
          >
            {text}
          </span>
        ))}
      </div>
    </div>
  )
}

function shortDate(date) {
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function ActivitySection({ sessions, lastSeenAt }) {
  const s = summarizeSessions(sessions, { days: 30 })

  return (
    <Section title="Activity" hint="Visits to the app over the last 30 days, in your local time.">
      <p className="text-sm mb-3 font-medium" style={{ color: isOnline(lastSeenAt) ? 'var(--forest-dark)' : 'var(--ink)' }}>
        {lastSeenText(lastSeenAt)}
      </p>

      {s.total === 0 ? (
        <p className="text-xs" style={{ color: 'var(--ink-soft)' }}>
          No visits recorded in the last 30 days. Visit history only starts from when this feature was turned on, so people
          who haven&apos;t opened the app since then will show nothing yet.
        </p>
      ) : (
        <>
          <div className="grid grid-cols-4 gap-2 mb-4">
            <Stat label="Visits" value={s.total} />
            <Stat label="Active days" value={s.activeDays} />
            <Stat label="Visits / day" value={s.avgPerActiveDay} />
            <Stat label="Avg visit" value={s.avgMinutes < 1 ? '<1m' : `${s.avgMinutes}m`} />
          </div>

          <p className="text-xs font-semibold mb-1.5">Visits per day</p>
          <MiniBars
            values={s.daily.map((d) => d.count)}
            ticks={[
              [0, shortDate(s.daily[0].date)],
              [s.daily.length - 1, 'Today'],
            ]}
            ariaLabel={`Visits per day over the last 30 days: ${s.total} visits across ${s.activeDays} days`}
          />

          <p className="text-xs font-semibold mt-4 mb-1.5">
            Time of day{s.peakHour !== null ? ` · busiest around ${hourLabel(s.peakHour)}` : ''}
          </p>
          <MiniBars
            values={s.hours}
            ticks={[
              [0, '12 AM'],
              [6, '6 AM'],
              [12, '12 PM'],
              [18, '6 PM'],
            ]}
            ariaLabel={s.peakHour !== null ? `Visits by hour of day, busiest around ${hourLabel(s.peakHour)}` : 'Visits by hour of day'}
          />
        </>
      )}
    </Section>
  )
}

const intentLabels = { buyer: 'Buy', seller: 'Sell', both: 'Buy & sell' }

export function UserDetail({ userId, adminId, onBack, onOpenUser, onSelfProfileChanged }) {
  const toast = useToast()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)
  const [busy, setBusy] = useState(false)

  const load = (quiet = false) => {
    if (!quiet) {
      setLoading(true)
      setFailed(false)
    }
    Promise.all([
      fetchUserOverview(userId),
      fetchUserSessions(userId, 30),
      fetchRelatedAccounts(userId),
    ])
      .then(([overview, sessions, related]) => setData({ overview, sessions, related }))
      .catch((err) => {
        console.error('Failed to load user detail', err)
        if (!quiet) setFailed(true)
      })
      .finally(() => {
        if (!quiet) setLoading(false)
      })
  }

  useEffect(() => {
    load()
    // keeps "online now" honest while the page stays open
    const timer = setInterval(() => load(true), REFRESH_MS)
    return () => clearInterval(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId])

  const toggleBan = async () => {
    const user = data.overview
    const next = !user.banned
    setBusy(true)
    try {
      await setUserBanned(user.id, next, user.name)
      setData((prev) => ({ ...prev, overview: { ...prev.overview, banned: next } }))
      if (user.id === adminId) onSelfProfileChanged?.()
      toast.success(next ? 'User banned.' : 'User unbanned.')
    } catch (err) {
      console.error('Failed to update ban', err)
      toast.error('Could not update that account — try again.')
    } finally {
      setBusy(false)
    }
  }

  const backButton = (
    <button
      onClick={onBack}
      className="pressable text-xs font-semibold mb-3 inline-flex items-center gap-1"
      style={{ color: 'var(--forest-dark)' }}
    >
      ← All users
    </button>
  )

  if (loading) {
    return (
      <>
        {backButton}
        <div className="flex flex-col gap-3">
          <div className="skeleton h-24 w-full" />
          <div className="skeleton h-40 w-full" />
        </div>
      </>
    )
  }

  if (failed || !data?.overview) {
    return (
      <>
        {backButton}
        <Placeholder
          compact
          icon="👤"
          title={failed ? "Couldn't load this person" : 'Account not found'}
          body={failed ? 'Check your connection and try again.' : 'It may have been deleted.'}
          action={failed ? { label: 'Try again', onClick: () => load() } : undefined}
        />
      </>
    )
  }

  const { overview: u, sessions, related } = data
  const signals = userSignals(u, related)
  const messagedAfter =
    u.firstMessageAt && u.joinedAt
      ? ageText(u.joinedAt, new Date(u.firstMessageAt).getTime()) + ' after joining'
      : null

  return (
    <>
      {backButton}

      <div className="card-elevated p-4 mb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h2 className="font-display text-xl truncate" style={{ color: 'var(--forest-dark)' }}>
              {u.name}
            </h2>
            <p className="text-xs truncate" style={{ color: 'var(--ink-soft)' }}>
              {u.email}
            </p>
          </div>
          <div className="flex flex-wrap justify-end gap-1 shrink-0">
            <OnlineBadge lastSeenAt={u.lastSeenAt} />
            {u.isPro && <Pill background="var(--mustard)" color="var(--forest-dark)">🌟 Pro</Pill>}
            {u.isAdmin && <Pill background="var(--forest-soft)" color="var(--forest-dark)">Admin</Pill>}
            {u.banned && <Pill background="var(--plum-soft)" color="var(--plum)">Banned</Pill>}
          </div>
        </div>
        <button
          disabled={busy}
          onClick={toggleBan}
          className="pressable text-xs px-3 py-1.5 rounded-full border mt-3 disabled:opacity-50"
          style={{
            borderColor: 'var(--plum)',
            background: u.banned ? 'transparent' : 'var(--plum)',
            color: u.banned ? 'var(--plum)' : 'white',
          }}
        >
          {u.banned ? 'Unban' : 'Ban this account'}
        </button>
      </div>

      <Section title="Worth a second look" hint="Hints only — none of these prove anything on their own.">
        {signals.length === 0 ? (
          <p className="text-sm" style={{ color: 'var(--ink-soft)' }}>
            Nothing unusual spotted.
          </p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {signals.map((sig) => (
              <li
                key={sig.text}
                className="text-sm rounded-lg px-3 py-2"
                style={{
                  background: sig.tone === 'warn' ? 'var(--plum-soft)' : 'var(--paper-dim)',
                  color: sig.tone === 'warn' ? 'var(--plum)' : 'var(--ink)',
                }}
              >
                {sig.text}
              </li>
            ))}
          </ul>
        )}
      </Section>

      <ActivitySection sessions={sessions} lastSeenAt={u.lastSeenAt} />

      <Section title="Account">
        <dl>
          <Row label="Joined" value={`${new Date(u.joinedAt).toLocaleDateString()} (${ageText(u.joinedAt)} ago)`} />
          <Row label="Last signed in" value={u.lastSignInAt ? new Date(u.lastSignInAt).toLocaleString() : '—'} />
          <Row label="Signed up with" value={u.providers.length ? u.providers.join(', ') : '—'} />
          <Row label="Email confirmed" value={u.emailConfirmed ? 'Yes' : 'No'} />
          <Row label="Here to" value={intentLabels[u.signupIntent] ?? '—'} />
          <Row label="Neighborhood" value={u.neighborhood || '—'} />
        </dl>
      </Section>

      <Section title="What they've done">
        <dl>
          <Row label="Listings posted" value={u.listingsCount} />
          <Row label="Orders as buyer" value={u.ordersAsBuyer} />
          <Row label="Orders as seller" value={u.ordersAsSeller} />
          <Row label="Conversations started" value={u.chatsStarted} />
          <Row label="Conversations received" value={u.chatsReceived} />
          <Row label="Messages sent" value={u.messagesSent} />
          {messagedAfter && <Row label="First message" value={messagedAfter} />}
          <Row label="Reports against them" value={u.reportsAgainst} />
          <Row label="Reports they filed" value={u.reportsFiled} />
        </dl>
      </Section>

      <Section
        title="Possibly related accounts"
        hint="Same email once dots and + tags are ignored, same display name, or signed up within 15 minutes."
      >
        {related.length === 0 ? (
          <p className="text-sm" style={{ color: 'var(--ink-soft)' }}>
            None found.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {related.map((r) => (
              <li key={r.id}>
                <button
                  onClick={() => onOpenUser(r.id)}
                  className="pressable w-full text-left rounded-xl border p-3"
                  style={{ borderColor: 'var(--rule)' }}
                >
                  <span className="flex items-center justify-between gap-2">
                    <span className="font-medium text-sm truncate">{r.name}</span>
                    {r.banned && <Pill background="var(--plum-soft)" color="var(--plum)">Banned</Pill>}
                  </span>
                  <span className="block text-xs truncate" style={{ color: 'var(--ink-soft)' }}>
                    {r.email}
                  </span>
                  <span className="block text-xs mt-1" style={{ color: 'var(--ink-soft)' }}>
                    {r.reasons.join(' · ')}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </>
  )
}

const levelStyles = {
  high: { background: 'var(--plum)', color: 'white', label: 'High' },
  medium: { background: 'var(--mustard-soft)', color: 'var(--mustard-deep)', label: 'Medium' },
}

// people whose recent messages match scam patterns (computed by the database;
// message text is never shown here)
export function SafetyPanel({ onOpenUser }) {
  const [senders, setSenders] = useState([])
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)

  const load = () => {
    setLoading(true)
    setFailed(false)
    fetchRiskSenders(14)
      .then(setSenders)
      .catch((err) => {
        console.error('Failed to load safety flags', err)
        setFailed(true)
      })
      .finally(() => setLoading(false))
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => load(), [])

  return (
    <>
      <p className="text-xs mb-3" style={{ color: 'var(--ink-soft)' }}>
        People whose messages in the last 14 days match common scam patterns — asking to move off the app, gift cards or
        wire transfers, phone numbers, links — or who are brand new and messaging lots of people. Checked automatically; no
        message text is shown here, and a match isn&apos;t proof of anything.
      </p>

      {loading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="skeleton h-24 w-full" />
          ))}
        </div>
      ) : failed ? (
        <Placeholder
          compact
          icon="🛡️"
          title="Couldn't load safety flags"
          body="Try again in a moment."
          action={{ label: 'Try again', onClick: load }}
        />
      ) : senders.length === 0 ? (
        <Placeholder compact icon="✅" title="Nothing flagged" body="No one has tripped the scam checks in the last 14 days." />
      ) : (
        <div className="flex flex-col gap-2">
          {senders.map((s) => {
            const level = levelStyles[s.level] ?? levelStyles.medium
            return (
              <button
                key={s.userId}
                onClick={() => onOpenUser(s.userId)}
                className="pressable card-elevated p-3 text-left text-sm"
              >
                <span className="flex items-start justify-between gap-2">
                  <span className="min-w-0">
                    <span className="block font-medium truncate">{s.name}</span>
                    <span className="block text-xs truncate" style={{ color: 'var(--ink-soft)' }}>
                      {s.email}
                    </span>
                  </span>
                  <span
                    className="text-[10px] px-2 py-0.5 rounded-full font-bold shrink-0"
                    style={{ background: level.background, color: level.color }}
                  >
                    {level.label}
                  </span>
                </span>
                <span className="flex flex-wrap gap-1 mt-2">
                  {s.flags.map((f) => (
                    <span
                      key={f}
                      className="text-[10px] px-2 py-0.5 rounded-full"
                      style={{ background: 'var(--paper-dim)', color: 'var(--ink)' }}
                    >
                      {f}
                    </span>
                  ))}
                  {s.accountAgeHours < 72 && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: 'var(--plum-soft)', color: 'var(--plum)' }}>
                      new account
                    </span>
                  )}
                </span>
                <span className="block text-xs mt-2" style={{ color: 'var(--ink-soft)' }}>
                  Joined {ageText(s.joinedAt)} ago · {s.flaggedMessages} flagged of {s.totalMessages} message
                  {s.totalMessages === 1 ? '' : 's'} · messaged {s.peopleMessaged} {s.peopleMessaged === 1 ? 'person' : 'people'}
                </span>
              </button>
            )
          })}
        </div>
      )}
    </>
  )
}
