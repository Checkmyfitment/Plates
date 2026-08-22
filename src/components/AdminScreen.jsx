import { useEffect, useState } from 'react'
import Placeholder from './Placeholder'
import {
  fetchReports,
  setReportStatus,
  setUserBanned,
  adminDeleteListing,
  searchUsers,
  setUserAdmin,
  fetchUnclaimedStores,
  createUnclaimedStore,
  deleteUnclaimedStore,
  resolveBroadcastAudience,
  sendBroadcast,
} from '../lib/admin'
import {
  fetchAnalyticsSummary,
  fetchWeeklyGrowth,
  fetchTopSellers,
  fetchTopListings,
  fetchTopWaitlistNeighborhoods,
} from '../lib/analytics'
import { fetchPendingPromotionRequests, approvePromotionRequest, rejectPromotionRequest } from '../lib/promotions'
import {
  fetchOutreachLeads,
  createOutreachLead,
  createOutreachLeadsBulk,
  updateOutreachLead,
  deleteOutreachLead,
} from '../lib/outreach'
import WeeklyBarChart from './WeeklyBarChart'
import OrderHealthBar from './OrderHealthBar'
import { useToast } from '../context/ToastContext'

const reportFilters = ['open', 'resolved', 'dismissed', 'all']

const outreachPlatforms = {
  facebook_marketplace: '📘 FB Marketplace',
  craigslist: '📰 Craigslist',
  nextdoor: '🏘️ Nextdoor',
  instagram: '📸 Instagram',
  other: '🔗 Other',
}

const outreachStatuses = {
  not_contacted: { label: 'Not contacted', background: 'var(--paper-dim)', color: 'var(--ink-soft)' },
  contacted: { label: 'Contacted', background: 'var(--mustard-soft)', color: 'var(--mustard-deep)' },
  interested: { label: 'Interested', background: 'var(--forest-soft)', color: 'var(--forest-dark)' },
  declined: { label: 'Declined', background: 'var(--plum-soft)', color: 'var(--plum)' },
  joined: { label: 'Joined!', background: 'var(--forest)', color: 'white' },
}

const outreachMessageTemplate = `Hey! I saw your [dish] post — looks amazing. I run Plates, a marketplace just for home cooks like you (no furniture/electronics clutter, just food). It's free to list, buyers can order and message you directly, and you build reviews/a following instead of starting over on every post. Want me to send you the link to set up your kitchen? Takes like 2 minutes.`

// swaps in what they're actually selling when we know it, instead of the
// buyer having to hand-edit the placeholder before every single send
function personalizedOutreachMessage(lead) {
  const dish = lead.listingNote?.trim()
  return dish ? outreachMessageTemplate.replace('[dish]', dish) : outreachMessageTemplate
}

// "Name - what they're selling - contact info" pasted one per line — the
// fast-typing format for logging a bunch of marketplace finds in one go,
// contact info stays optional since you often don't have it yet
function parseBulkLeadLine(line) {
  const parts = line
    .split(' - ')
    .map((p) => p.trim())
    .filter(Boolean)
  if (parts.length === 0) return null
  return {
    contactName: parts[0],
    listingNote: parts[1] || '',
    contactInfo: parts.slice(2).join(' - '),
  }
}

function timeAgo(iso) {
  const diffMs = Date.now() - new Date(iso).getTime()
  const mins = Math.round(diffMs / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.round(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.round(hours / 24)
  return `${days}d ago`
}

const statusColors = {
  open: { background: 'var(--mustard-soft)', color: 'var(--mustard-deep)' },
  resolved: { background: 'var(--forest-soft)', color: 'var(--forest-dark)' },
  dismissed: { background: 'var(--paper-dim)', color: 'var(--ink-soft)' },
}

function useBusyIds() {
  const toast = useToast()
  const [busyIds, setBusyIds] = useState(new Set())

  const withBusy = async (id, fn) => {
    setBusyIds((prev) => new Set(prev).add(id))
    try {
      await fn()
    } catch (err) {
      console.error('Admin action failed', err)
      toast.error('That action failed — try again.')
    } finally {
      setBusyIds((prev) => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
    }
  }

  return { busyIds, withBusy }
}

function ReportsPanel({ adminId, onSelfProfileChanged }) {
  const toast = useToast()
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('open')
  const { busyIds, withBusy } = useBusyIds()

  const load = () => {
    setLoading(true)
    fetchReports()
      .then(setReports)
      .catch((err) => {
        console.error('Failed to load reports', err)
        toast.error('Could not load reports — try again.')
      })
      .finally(() => setLoading(false))
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(load, [])

  const resolveReport = (report, status) =>
    withBusy(report.id, async () => {
      await setReportStatus(report.id, status)
      setReports((prev) => prev.map((r) => (r.id === report.id ? { ...r, status } : r)))
      toast.success(status === 'resolved' ? 'Report marked resolved.' : 'Report dismissed.')
    })

  const toggleBan = (report) =>
    withBusy(report.id, async () => {
      const next = !report.reportedUserBanned
      await setUserBanned(report.reportedUserId, next)
      setReports((prev) =>
        prev.map((r) =>
          r.reportedUserId === report.reportedUserId ? { ...r, reportedUserBanned: next } : r,
        ),
      )
      if (report.reportedUserId === adminId) onSelfProfileChanged?.()
      toast.success(next ? 'User banned.' : 'User unbanned.')
    })

  const removeListing = (report) =>
    withBusy(report.id, async () => {
      await adminDeleteListing(report.listingId)
      setReports((prev) =>
        prev.map((r) => (r.listingId === report.listingId ? { ...r, listingId: null, listingTitle: null } : r)),
      )
      toast.success('Listing removed.')
    })

  const isSafetyReport = (r) => r.reason.startsWith('Safety incident')

  const visible = (filter === 'all' ? reports : reports.filter((r) => r.status === filter))
    .slice()
    .sort((a, b) => Number(isSafetyReport(b)) - Number(isSafetyReport(a)))

  return (
    <>
      <div className="flex gap-2 overflow-x-auto pb-3">
        {reportFilters.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className="pressable text-xs px-3 py-1.5 rounded-full whitespace-nowrap border capitalize"
            style={{
              background: filter === f ? 'var(--forest)' : 'transparent',
              color: filter === f ? 'white' : 'var(--ink-soft)',
              borderColor: filter === f ? 'var(--forest)' : 'var(--rule)',
            }}
          >
            {f}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="skeleton h-24 w-full" />
          ))}
        </div>
      ) : visible.length === 0 ? (
        <Placeholder compact icon="🛡️" title="Nothing here" body="No reports match this filter." />
      ) : (
        <div className="flex flex-col gap-2">
          {visible.map((r) => {
            const busy = busyIds.has(r.id)
            const safety = isSafetyReport(r)
            return (
              <div
                key={r.id}
                className="card-elevated p-3 text-sm"
                style={safety ? { border: '1.5px solid var(--plum)' } : undefined}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="font-medium">
                    {safety && <span aria-hidden="true">🚨 </span>}
                    {r.reason}
                  </p>
                  <span
                    className="shrink-0 text-[10px] px-2 py-0.5 rounded-full font-medium capitalize"
                    style={statusColors[r.status] ?? statusColors.open}
                  >
                    {r.status}
                  </span>
                </div>
                {r.details && (
                  <p className="text-xs mt-1" style={{ color: 'var(--ink-soft)' }}>
                    {r.details}
                  </p>
                )}
                <p className="text-[11px] mt-1.5" style={{ color: 'var(--ink-soft)' }}>
                  Reported by {r.reporterName} · {timeAgo(r.createdAt)}
                </p>
                {r.listingTitle && (
                  <p className="text-xs mt-1" style={{ color: 'var(--ink-soft)' }}>
                    Listing: <span className="font-medium">{r.listingTitle}</span>
                  </p>
                )}
                {r.reportedUserName && (
                  <p className="text-xs mt-0.5" style={{ color: 'var(--ink-soft)' }}>
                    User: <span className="font-medium">{r.reportedUserName}</span>
                    {r.reportedUserBanned && (
                      <span className="ml-1.5" style={{ color: 'var(--plum)' }}>
                        (banned)
                      </span>
                    )}
                  </p>
                )}

                <div className="flex flex-wrap gap-1.5 mt-2.5">
                  {r.status !== 'resolved' && (
                    <button
                      disabled={busy}
                      onClick={() => resolveReport(r, 'resolved')}
                      className="pressable text-xs px-2.5 py-1 rounded-full border disabled:opacity-50"
                      style={{ borderColor: 'var(--forest)', color: 'var(--forest-dark)' }}
                    >
                      Mark resolved
                    </button>
                  )}
                  {r.status !== 'dismissed' && (
                    <button
                      disabled={busy}
                      onClick={() => resolveReport(r, 'dismissed')}
                      className="pressable text-xs px-2.5 py-1 rounded-full border disabled:opacity-50"
                      style={{ borderColor: 'var(--rule)', color: 'var(--ink-soft)' }}
                    >
                      Dismiss
                    </button>
                  )}
                  {r.listingId && (
                    <button
                      disabled={busy}
                      onClick={() => removeListing(r)}
                      className="pressable text-xs px-2.5 py-1 rounded-full border disabled:opacity-50"
                      style={{ borderColor: 'var(--plum)', color: 'var(--plum)' }}
                    >
                      Remove listing
                    </button>
                  )}
                  {r.reportedUserId && (
                    <button
                      disabled={busy}
                      onClick={() => toggleBan(r)}
                      className="pressable text-xs px-2.5 py-1 rounded-full border disabled:opacity-50"
                      style={{
                        borderColor: 'var(--plum)',
                        background: r.reportedUserBanned ? 'transparent' : 'var(--plum)',
                        color: r.reportedUserBanned ? 'var(--plum)' : 'white',
                      }}
                    >
                      {r.reportedUserBanned ? 'Unban user' : 'Ban user'}
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </>
  )
}

function UsersPanel({ adminId, onSelfProfileChanged }) {
  const toast = useToast()
  const [query, setQuery] = useState('')
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const { busyIds, withBusy } = useBusyIds()

  const load = (q) => {
    setLoading(true)
    searchUsers(q)
      .then(setUsers)
      .catch((err) => {
        console.error('Failed to load users', err)
        toast.error('Could not load users — try again.')
      })
      .finally(() => setLoading(false))
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => load(''), [])

  const submitSearch = (e) => {
    e.preventDefault()
    load(query)
  }

  const toggleBan = (user) =>
    withBusy(user.id, async () => {
      const next = !user.banned
      await setUserBanned(user.id, next)
      setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, banned: next } : u)))
      if (user.id === adminId) onSelfProfileChanged?.()
      toast.success(next ? 'User banned.' : 'User unbanned.')
    })

  const toggleAdmin = (user) =>
    withBusy(user.id, async () => {
      const next = !user.isAdmin
      await setUserAdmin(user.id, next)
      setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, isAdmin: next } : u)))
      if (user.id === adminId) onSelfProfileChanged?.()
      toast.success(next ? 'Made admin.' : 'Admin removed.')
    })

  return (
    <>
      <form onSubmit={submitSearch} className="flex gap-2 mb-3">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name or email…"
          className="field flex-1"
        />
        <button type="submit" className="pressable text-xs px-3 py-1.5 rounded-full border shrink-0" style={{ borderColor: 'var(--rule)', color: 'var(--ink)' }}>
          Search
        </button>
      </form>

      {loading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="skeleton h-16 w-full" />
          ))}
        </div>
      ) : users.length === 0 ? (
        <Placeholder compact icon="🔍" title="No users found" body="Try a different name or email." />
      ) : (
        <div className="flex flex-col gap-2">
          {users.map((u) => {
            const busy = busyIds.has(u.id)
            return (
              <div key={u.id} className="card-elevated p-3 text-sm">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium truncate">{u.name}</p>
                    <p className="text-xs truncate" style={{ color: 'var(--ink-soft)' }}>
                      {u.email}
                    </p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    {u.isAdmin && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{ background: 'var(--forest-soft)', color: 'var(--forest-dark)' }}>
                        Admin
                      </span>
                    )}
                    {u.banned && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{ background: 'var(--plum-soft)', color: 'var(--plum)' }}>
                        Banned
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5 mt-2.5">
                  <button
                    disabled={busy}
                    onClick={() => toggleBan(u)}
                    className="pressable text-xs px-2.5 py-1 rounded-full border disabled:opacity-50"
                    style={{
                      borderColor: 'var(--plum)',
                      background: u.banned ? 'transparent' : 'var(--plum)',
                      color: u.banned ? 'var(--plum)' : 'white',
                    }}
                  >
                    {u.banned ? 'Unban' : 'Ban'}
                  </button>
                  <button
                    disabled={busy}
                    onClick={() => toggleAdmin(u)}
                    className="pressable text-xs px-2.5 py-1 rounded-full border disabled:opacity-50"
                    style={{ borderColor: 'var(--forest)', color: 'var(--forest-dark)' }}
                  >
                    {u.isAdmin ? 'Remove admin' : 'Make admin'}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </>
  )
}

const emptyStoreForm = { name: '', kitchen: '', neighborhood: '', contactNote: '' }

function StoresPanel({ adminId }) {
  const toast = useToast()
  const [stores, setStores] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState(emptyStoreForm)
  const [creating, setCreating] = useState(false)
  const { busyIds, withBusy } = useBusyIds()

  const load = () => {
    setLoading(true)
    fetchUnclaimedStores()
      .then(setStores)
      .catch((err) => {
        console.error('Failed to load stores', err)
        toast.error('Could not load stores — try again.')
      })
      .finally(() => setLoading(false))
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(load, [])

  const submit = async (e) => {
    e.preventDefault()
    if (!form.name.trim()) return
    setCreating(true)
    try {
      const store = await createUnclaimedStore({
        name: form.name.trim(),
        kitchen: form.kitchen.trim(),
        neighborhood: form.neighborhood.trim(),
        contactNote: form.contactNote.trim(),
        createdBy: adminId,
      })
      setStores((prev) => [store, ...prev])
      setForm(emptyStoreForm)
      toast.success('Store created — share its claim link with the owner.')
    } catch (err) {
      console.error('Failed to create store', err)
      toast.error('Could not create the store — try again.')
    } finally {
      setCreating(false)
    }
  }

  const copyClaimLink = async (store) => {
    const link = `${window.location.origin}${window.location.pathname}?claim=${store.claimCode}`
    try {
      await navigator.clipboard.writeText(link)
      toast.success('Claim link copied!')
    } catch (err) {
      console.error('Failed to copy claim link', err)
      toast.error('Could not copy the link — copy it manually.')
    }
  }

  const removeStore = (store) =>
    withBusy(store.id, async () => {
      await deleteUnclaimedStore(store.id)
      setStores((prev) => prev.filter((s) => s.id !== store.id))
      toast.success('Store deleted.')
    })

  return (
    <>
      <form onSubmit={submit} className="card-elevated p-3 mb-3 flex flex-col gap-2">
        <p className="text-xs font-medium" style={{ color: 'var(--forest-dark)' }}>
          + New store (posting on behalf of someone not on Plates yet)
        </p>
        <input
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          placeholder="Store or seller name (e.g. Maria's Tamales)"
          className="field"
          required
        />
        <input
          value={form.kitchen}
          onChange={(e) => setForm((f) => ({ ...f, kitchen: e.target.value }))}
          placeholder="Short description (optional)"
          className="field"
        />
        <input
          value={form.neighborhood}
          onChange={(e) => setForm((f) => ({ ...f, neighborhood: e.target.value }))}
          placeholder="Neighborhood (optional)"
          className="field"
        />
        <input
          value={form.contactNote}
          onChange={(e) => setForm((f) => ({ ...f, contactNote: e.target.value }))}
          placeholder="How buyers can reach them directly (e.g. Facebook link, phone)"
          className="field"
        />
        <button
          type="submit"
          disabled={creating}
          className="pressable text-xs px-3 py-2 rounded-full font-medium disabled:opacity-50"
          style={{ background: 'var(--mustard)', color: 'var(--forest-dark)' }}
        >
          {creating ? 'Creating…' : 'Create store'}
        </button>
      </form>

      {loading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="skeleton h-20 w-full" />
          ))}
        </div>
      ) : stores.length === 0 ? (
        <Placeholder compact icon="🏪" title="No stores yet" body="Create one above to start listing for someone." />
      ) : (
        <div className="flex flex-col gap-2">
          {stores.map((s) => {
            const busy = busyIds.has(s.id)
            return (
              <div key={s.id} className="card-elevated p-3 text-sm">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-medium">{s.name}</p>
                  <span
                    className="shrink-0 text-[10px] px-2 py-0.5 rounded-full font-medium"
                    style={
                      s.claimedBy
                        ? { background: 'var(--forest-soft)', color: 'var(--forest-dark)' }
                        : { background: 'var(--mustard-soft)', color: 'var(--mustard-deep)' }
                    }
                  >
                    {s.claimedBy ? 'Claimed' : 'Unclaimed'}
                  </span>
                </div>
                {s.kitchen && (
                  <p className="text-xs mt-1" style={{ color: 'var(--ink-soft)' }}>
                    {s.kitchen}
                  </p>
                )}
                {s.contactNote && (
                  <p className="text-xs mt-0.5" style={{ color: 'var(--ink-soft)' }}>
                    📇 {s.contactNote}
                  </p>
                )}
                {!s.claimedBy && (
                  <div className="flex flex-wrap gap-1.5 mt-2.5">
                    <button
                      onClick={() => copyClaimLink(s)}
                      className="pressable text-xs px-2.5 py-1 rounded-full border"
                      style={{ borderColor: 'var(--forest)', color: 'var(--forest-dark)' }}
                    >
                      Copy claim link
                    </button>
                    <button
                      disabled={busy}
                      onClick={() => removeStore(s)}
                      className="pressable text-xs px-2.5 py-1 rounded-full border disabled:opacity-50"
                      style={{ borderColor: 'var(--plum)', color: 'var(--plum)' }}
                    >
                      Delete store
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </>
  )
}

const emptyLeadForm = { platform: 'facebook_marketplace', contactName: '', contactInfo: '', listingNote: '' }
const outreachFilters = ['not_contacted', 'contacted', 'interested', 'declined', 'joined', 'all']

function OutreachPanel({ adminId }) {
  const toast = useToast()
  const [leads, setLeads] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState(emptyLeadForm)
  const [creating, setCreating] = useState(false)
  const [filter, setFilter] = useState('not_contacted')
  const [notesDraft, setNotesDraft] = useState({})
  const [bulkOpen, setBulkOpen] = useState(false)
  const [bulkPlatform, setBulkPlatform] = useState('facebook_marketplace')
  const [bulkText, setBulkText] = useState('')
  const [bulkAdding, setBulkAdding] = useState(false)
  const [queueOpen, setQueueOpen] = useState(false)
  const [skippedIds, setSkippedIds] = useState(() => new Set())
  const { busyIds, withBusy } = useBusyIds()

  const load = () => {
    setLoading(true)
    fetchOutreachLeads()
      .then(setLeads)
      .catch((err) => {
        console.error('Failed to load outreach leads', err)
        toast.error('Could not load leads — try again.')
      })
      .finally(() => setLoading(false))
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(load, [])

  const copyTemplate = async () => {
    try {
      await navigator.clipboard.writeText(outreachMessageTemplate)
      toast.success('Message copied — paste it into your DM.')
    } catch (err) {
      console.error('Failed to copy message template', err)
      toast.error('Could not copy — select and copy it manually.')
    }
  }

  const submit = async (e) => {
    e.preventDefault()
    if (!form.contactName.trim()) return
    setCreating(true)
    try {
      const lead = await createOutreachLead({
        platform: form.platform,
        contactName: form.contactName.trim(),
        contactInfo: form.contactInfo.trim(),
        listingNote: form.listingNote.trim(),
        createdBy: adminId,
      })
      setLeads((prev) => [lead, ...prev])
      setForm(emptyLeadForm)
      toast.success('Lead added.')
    } catch (err) {
      console.error('Failed to add lead', err)
      toast.error('Could not add that lead — try again.')
    } finally {
      setCreating(false)
    }
  }

  const changeStatus = (lead, status) =>
    withBusy(lead.id, async () => {
      const updated = await updateOutreachLead(lead.id, { status })
      setLeads((prev) => prev.map((l) => (l.id === lead.id ? updated : l)))
    })

  const saveNotes = (lead) =>
    withBusy(lead.id, async () => {
      const notes = notesDraft[lead.id] ?? lead.notes ?? ''
      const updated = await updateOutreachLead(lead.id, { notes })
      setLeads((prev) => prev.map((l) => (l.id === lead.id ? updated : l)))
      toast.success('Notes saved.')
    })

  const removeLead = (lead) =>
    withBusy(lead.id, async () => {
      await deleteOutreachLead(lead.id)
      setLeads((prev) => prev.filter((l) => l.id !== lead.id))
      toast.success('Lead removed.')
    })

  const submitBulk = async () => {
    const parsed = bulkText
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map(parseBulkLeadLine)
      .filter(Boolean)
    if (parsed.length === 0) return
    setBulkAdding(true)
    try {
      const created = await createOutreachLeadsBulk(
        parsed.map((p) => ({ ...p, platform: bulkPlatform })),
        adminId,
      )
      setLeads((prev) => [...created, ...prev])
      setBulkText('')
      toast.success(`Added ${created.length} lead${created.length === 1 ? '' : 's'}.`)
    } catch (err) {
      console.error('Failed to bulk-add leads', err)
      toast.error('Could not add those leads — try again.')
    } finally {
      setBulkAdding(false)
    }
  }

  const copyPersonalized = async (lead) => {
    try {
      await navigator.clipboard.writeText(personalizedOutreachMessage(lead))
      toast.success('Message copied — paste it into your DM.')
    } catch (err) {
      console.error('Failed to copy message', err)
      toast.error('Could not copy — select and copy it manually.')
    }
  }

  const skipInQueue = (lead) => setSkippedIds((prev) => new Set(prev).add(lead.id))

  const visible = filter === 'all' ? leads : leads.filter((l) => l.status === filter)
  const queue = leads.filter((l) => l.status === 'not_contacted' && !skippedIds.has(l.id))
  const queueTotal = leads.filter((l) => l.status === 'not_contacted').length
  const current = queue[0]

  return (
    <>
      <div className="card-elevated p-3 mb-3">
        <p className="text-xs font-medium mb-1.5" style={{ color: 'var(--forest-dark)' }}>
          📋 Outreach message template
        </p>
        <p className="text-xs leading-relaxed" style={{ color: 'var(--ink-soft)' }}>
          {outreachMessageTemplate}
        </p>
        <button
          onClick={copyTemplate}
          className="pressable text-xs px-3 py-1.5 rounded-full font-medium mt-2.5"
          style={{ background: 'var(--forest)', color: 'white' }}
        >
          Copy message
        </button>
      </div>

      <div className="flex items-center justify-between gap-2 mb-3">
        <p className="text-xs" style={{ color: 'var(--ink-soft)' }}>
          {queueTotal} lead{queueTotal === 1 ? '' : 's'} not contacted yet
        </p>
        <button
          onClick={() => setQueueOpen((v) => !v)}
          className="pressable text-xs px-3 py-1.5 rounded-full font-medium"
          style={
            queueOpen
              ? { borderColor: 'var(--rule)', color: 'var(--ink)', border: '1px solid var(--rule)' }
              : { background: 'var(--forest)', color: 'white' }
          }
        >
          {queueOpen ? '← Back to list' : '🎯 Work today’s queue'}
        </button>
      </div>

      {queueOpen ? (
        current ? (
          <div className="card-elevated p-4">
            <p className="text-xs" style={{ color: 'var(--ink-soft)' }}>
              {queue.length} left in today's queue
            </p>
            <p className="font-medium text-base mt-1">{current.contactName}</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--ink-soft)' }}>
              {outreachPlatforms[current.platform]}
            </p>
            {current.listingNote && (
              <p className="text-xs mt-1.5" style={{ color: 'var(--ink)' }}>
                🍽️ {current.listingNote}
              </p>
            )}
            {current.contactInfo && (
              <p className="text-xs mt-0.5" style={{ color: 'var(--ink-soft)' }}>
                📇 {current.contactInfo}
              </p>
            )}
            <div
              className="rounded-xl border p-2.5 mt-3 text-xs leading-relaxed"
              style={{ borderColor: 'var(--rule)', color: 'var(--ink)' }}
            >
              {personalizedOutreachMessage(current)}
            </div>
            <button
              onClick={() => copyPersonalized(current)}
              className="pressable w-full mt-2 py-2 rounded-full font-medium text-xs"
              style={{ background: 'var(--forest)', color: 'white' }}
            >
              📋 Copy message
            </button>
            <div className="flex gap-2 mt-3">
              <button
                onClick={() => changeStatus(current, 'contacted')}
                disabled={busyIds.has(current.id)}
                className="pressable flex-1 py-2 rounded-full font-medium text-xs disabled:opacity-50"
                style={{ background: 'var(--mustard)', color: 'var(--forest-dark)' }}
              >
                ✓ Marked contacted
              </button>
              <button
                onClick={() => skipInQueue(current)}
                className="pressable px-3 py-2 rounded-full border text-xs"
                style={{ borderColor: 'var(--rule)', color: 'var(--ink-soft)' }}
              >
                Skip
              </button>
              <button
                onClick={() => removeLead(current)}
                disabled={busyIds.has(current.id)}
                className="pressable px-3 py-2 rounded-full border text-xs disabled:opacity-50"
                style={{ borderColor: 'var(--plum)', color: 'var(--plum)' }}
              >
                Remove
              </button>
            </div>
          </div>
        ) : (
          <Placeholder
            compact
            icon="✅"
            title="Queue's empty"
            body="Everyone not-yet-contacted has been worked through — add more leads or check back later."
          />
        )
      ) : (
        <>
          <form onSubmit={submit} className="card-elevated p-3 mb-3 flex flex-col gap-2">
            <p className="text-xs font-medium" style={{ color: 'var(--forest-dark)' }}>
              + Log someone you found on marketplace
            </p>
            <select
              value={form.platform}
              onChange={(e) => setForm((f) => ({ ...f, platform: e.target.value }))}
              className="field"
            >
              {Object.entries(outreachPlatforms).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <input
              value={form.contactName}
              onChange={(e) => setForm((f) => ({ ...f, contactName: e.target.value }))}
              placeholder="Their name or handle"
              className="field"
              required
            />
            <input
              value={form.contactInfo}
              onChange={(e) => setForm((f) => ({ ...f, contactInfo: e.target.value }))}
              placeholder="How to reach them again (optional — profile link, phone)"
              className="field"
            />
            <input
              value={form.listingNote}
              onChange={(e) => setForm((f) => ({ ...f, listingNote: e.target.value }))}
              placeholder="What they're selling (optional)"
              className="field"
            />
            <button
              type="submit"
              disabled={creating}
              className="pressable text-xs px-3 py-2 rounded-full font-medium disabled:opacity-50"
              style={{ background: 'var(--mustard)', color: 'var(--forest-dark)' }}
            >
              {creating ? 'Adding…' : 'Add lead'}
            </button>
          </form>

          <div className="card-elevated p-3 mb-3">
            <button
              onClick={() => setBulkOpen((v) => !v)}
              className="pressable text-xs font-medium w-full text-left"
              style={{ color: 'var(--forest-dark)' }}
            >
              {bulkOpen ? '▾' : '▸'} Bulk add (paste a list)
            </button>
            {bulkOpen && (
              <div className="mt-2 flex flex-col gap-2">
                <p className="text-[11px]" style={{ color: 'var(--ink-soft)' }}>
                  One per line: <code>Name - what they're selling - contact info</code> — the last two
                  are optional.
                </p>
                <select
                  value={bulkPlatform}
                  onChange={(e) => setBulkPlatform(e.target.value)}
                  className="field text-xs"
                >
                  {Object.entries(outreachPlatforms).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
                <textarea
                  value={bulkText}
                  onChange={(e) => setBulkText(e.target.value)}
                  placeholder={'Maria Lopez - tamales\nJuan Diaz - birria tacos - fb.com/juan.diaz'}
                  rows={5}
                  className="field text-xs resize-none"
                />
                <button
                  onClick={submitBulk}
                  disabled={bulkAdding || !bulkText.trim()}
                  className="pressable text-xs px-3 py-2 rounded-full font-medium disabled:opacity-50 self-start"
                  style={{ background: 'var(--mustard)', color: 'var(--forest-dark)' }}
                >
                  {bulkAdding ? 'Adding…' : 'Add all'}
                </button>
              </div>
            )}
          </div>

          <div className="flex gap-1.5 overflow-x-auto pb-1 mb-3">
            {outreachFilters.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className="pressable shrink-0 text-xs px-3 py-1.5 rounded-full border font-medium capitalize"
            style={{
              background: filter === f ? 'var(--forest)' : 'transparent',
              color: filter === f ? 'white' : 'var(--ink-soft)',
              borderColor: filter === f ? 'var(--forest)' : 'var(--rule)',
            }}
          >
            {f === 'all' ? 'All' : outreachStatuses[f].label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="skeleton h-20 w-full" />
          ))}
        </div>
      ) : visible.length === 0 ? (
        <Placeholder compact icon="📋" title="No leads here" body="Add someone above once you've found them on marketplace." />
      ) : (
        <div className="flex flex-col gap-2">
          {visible.map((l) => {
            const busy = busyIds.has(l.id)
            const st = outreachStatuses[l.status]
            return (
              <div key={l.id} className="card-elevated p-3 text-sm">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium truncate">{l.contactName}</p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--ink-soft)' }}>
                      {outreachPlatforms[l.platform]} · {timeAgo(l.createdAt)}
                    </p>
                  </div>
                  <span
                    className="shrink-0 text-[10px] px-2 py-0.5 rounded-full font-medium"
                    style={{ background: st.background, color: st.color }}
                  >
                    {st.label}
                  </span>
                </div>
                {l.listingNote && (
                  <p className="text-xs mt-1.5" style={{ color: 'var(--ink)' }}>
                    🍽️ {l.listingNote}
                  </p>
                )}
                {l.contactInfo && (
                  <p className="text-xs mt-0.5" style={{ color: 'var(--ink-soft)' }}>
                    📇 {l.contactInfo}
                  </p>
                )}
                <textarea
                  value={notesDraft[l.id] ?? l.notes ?? ''}
                  onChange={(e) => setNotesDraft((prev) => ({ ...prev, [l.id]: e.target.value }))}
                  placeholder="Notes (optional)"
                  rows={2}
                  className="field mt-2 text-xs w-full resize-none"
                />
                <div className="flex flex-wrap items-center gap-1.5 mt-2">
                  <select
                    value={l.status}
                    disabled={busy}
                    onChange={(e) => changeStatus(l, e.target.value)}
                    className="field text-xs py-1.5 disabled:opacity-50"
                  >
                    {Object.entries(outreachStatuses).map(([value, { label }]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => saveNotes(l)}
                    disabled={busy}
                    className="pressable text-xs px-2.5 py-1.5 rounded-full border disabled:opacity-50"
                    style={{ borderColor: 'var(--rule)', color: 'var(--ink)' }}
                  >
                    Save notes
                  </button>
                  <button
                    onClick={() => removeLead(l)}
                    disabled={busy}
                    className="pressable text-xs px-2.5 py-1.5 rounded-full border disabled:opacity-50"
                    style={{ borderColor: 'var(--plum)', color: 'var(--plum)' }}
                  >
                    Remove
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
        </>
      )}
    </>
  )
}

function PromotionsPanel() {
  const toast = useToast()
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const { busyIds, withBusy } = useBusyIds()

  const load = () => {
    setLoading(true)
    fetchPendingPromotionRequests()
      .then(setRequests)
      .catch((err) => {
        console.error('Failed to load promotion requests', err)
        toast.error('Could not load promotion requests — try again.')
      })
      .finally(() => setLoading(false))
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(load, [])

  const approve = (r) =>
    withBusy(r.id, async () => {
      await approvePromotionRequest(r.id, r.listingId)
      setRequests((prev) => prev.filter((req) => req.id !== r.id))
      toast.success(`${r.listingTitle} is now featured.`)
    })

  const reject = (r) =>
    withBusy(r.id, async () => {
      await rejectPromotionRequest(r.id)
      setRequests((prev) => prev.filter((req) => req.id !== r.id))
      toast.success('Request rejected.')
    })

  return loading ? (
    <div className="flex flex-col gap-2">
      {Array.from({ length: 2 }).map((_, i) => (
        <div key={i} className="skeleton h-20 w-full" />
      ))}
    </div>
  ) : requests.length === 0 ? (
    <Placeholder compact icon="🌟" title="Nothing to review" body="Seller promotion requests will show up here." />
  ) : (
    <div className="flex flex-col gap-2">
      {requests.map((r) => {
        const busy = busyIds.has(r.id)
        return (
          <div key={r.id} className="card-elevated p-3 text-sm">
            <p className="font-medium">{r.listingTitle}</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--ink-soft)' }}>
              Requested by {r.sellerName} · {timeAgo(r.createdAt)}
            </p>
            <div className="flex flex-wrap gap-1.5 mt-2.5">
              <button
                disabled={busy}
                onClick={() => approve(r)}
                className="pressable text-xs px-2.5 py-1 rounded-full font-medium disabled:opacity-50"
                style={{ background: 'var(--forest)', color: 'white' }}
              >
                Approve
              </button>
              <button
                disabled={busy}
                onClick={() => reject(r)}
                className="pressable text-xs px-2.5 py-1 rounded-full border disabled:opacity-50"
                style={{ borderColor: 'var(--rule)', color: 'var(--ink-soft)' }}
              >
                Reject
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function StatCard({ label, value, sub }) {
  return (
    <div className="card-elevated p-3">
      <p className="font-display text-xl" style={{ color: 'var(--forest-dark)' }}>
        {value}
      </p>
      <p className="text-xs mt-0.5" style={{ color: 'var(--ink-soft)' }}>
        {label}
      </p>
      {sub && (
        <p className="text-[11px] mt-0.5" style={{ color: 'var(--ink-soft)' }}>
          {sub}
        </p>
      )}
    </div>
  )
}

const AUDIENCES = [
  { value: 'everyone', label: 'Everyone' },
  { value: 'sellers', label: 'Sellers only' },
  { value: 'buyers', label: 'Buyers only' },
  { value: 'neighborhood', label: 'One neighborhood' },
]

function BroadcastPanel() {
  const toast = useToast()
  const [audience, setAudience] = useState('everyone')
  const [neighborhood, setNeighborhood] = useState('')
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [lastSentCount, setLastSentCount] = useState(null)

  const send = async () => {
    if (!message.trim()) return
    setSending(true)
    try {
      const userIds = await resolveBroadcastAudience(audience, neighborhood)
      if (userIds.length === 0) {
        toast.error('No one matches that audience — nothing was sent.')
        return
      }
      const count = await sendBroadcast(userIds, message.trim())
      setLastSentCount(count)
      setMessage('')
      toast.success(`Sent to ${count} ${count === 1 ? 'person' : 'people'}.`)
    } catch (err) {
      console.error('Failed to send broadcast', err)
      toast.error(err.message || 'Could not send that — try again.')
    } finally {
      setSending(false)
      setConfirming(false)
    }
  }

  return (
    <div>
      <p className="text-xs mb-3" style={{ color: 'var(--ink-soft)' }}>
        Sends an in-app notification (the 🔔 bell) to everyone in the audience you pick. There's no email or push
        involved — anyone who isn't in the app when it's sent will see it next time they open it.
      </p>

      <p className="text-xs font-medium mb-1.5">Audience</p>
      <div className="flex flex-wrap gap-2 mb-3">
        {AUDIENCES.map((a) => (
          <button
            key={a.value}
            onClick={() => setAudience(a.value)}
            className="pressable text-xs px-3 py-1.5 rounded-full border font-medium"
            style={
              audience === a.value
                ? { background: 'var(--forest)', color: 'white', borderColor: 'var(--forest)' }
                : { borderColor: 'var(--rule)', color: 'var(--ink)' }
            }
          >
            {a.label}
          </button>
        ))}
      </div>

      {audience === 'neighborhood' && (
        <input
          value={neighborhood}
          onChange={(e) => setNeighborhood(e.target.value)}
          placeholder="e.g. Highland Park"
          maxLength={100}
          className="w-full mb-3 px-3 py-2 rounded-lg border text-sm"
          style={{ borderColor: 'var(--rule)' }}
        />
      )}

      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="What do you want to tell them?"
        rows={4}
        maxLength={500}
        className="w-full px-3 py-2 rounded-lg border text-sm resize-none"
        style={{ borderColor: 'var(--rule)' }}
      />
      <p className="text-[11px] mt-1 text-right" style={{ color: 'var(--ink-soft)' }}>
        {message.length}/500
      </p>

      {!confirming ? (
        <button
          onClick={() => setConfirming(true)}
          disabled={!message.trim() || (audience === 'neighborhood' && !neighborhood.trim())}
          className="pressable w-full mt-1 py-3 rounded-xl font-medium text-sm disabled:opacity-50"
          style={{ background: 'var(--forest)', color: 'white' }}
        >
          Review & send
        </button>
      ) : (
        <div className="rounded-xl border p-3 mt-1" style={{ borderColor: 'var(--plum)' }}>
          <p className="text-xs" style={{ color: 'var(--plum)' }}>
            This will message{' '}
            {audience === 'neighborhood'
              ? `every person in "${neighborhood}"`
              : audience === 'everyone'
                ? 'everyone'
                : `every ${audience === 'sellers' ? 'seller' : 'buyer'}`}{' '}
            right now. Send it?
          </p>
          <div className="flex gap-2 mt-2">
            <button
              onClick={send}
              disabled={sending}
              className="pressable text-xs px-3 py-1.5 rounded-full font-medium disabled:opacity-60"
              style={{ background: 'var(--plum)', color: 'white' }}
            >
              {sending ? 'Sending…' : 'Yes, send it'}
            </button>
            <button
              onClick={() => setConfirming(false)}
              disabled={sending}
              className="pressable text-xs px-3 py-1.5 rounded-full border disabled:opacity-60"
              style={{ borderColor: 'var(--rule)', color: 'var(--ink-soft)' }}
            >
              Never mind
            </button>
          </div>
        </div>
      )}

      {lastSentCount != null && (
        <p className="text-xs mt-3" style={{ color: 'var(--ink-soft)' }}>
          Last broadcast reached {lastSentCount} {lastSentCount === 1 ? 'person' : 'people'}.
        </p>
      )}
    </div>
  )
}

function pct(value) {
  return value == null ? '—' : `${value}%`
}

function money(value) {
  return `$${Number(value ?? 0).toFixed(2)}`
}

function StatsPanel() {
  const toast = useToast()
  const [summary, setSummary] = useState(null)
  const [weeklyGrowth, setWeeklyGrowth] = useState([])
  const [topSellers, setTopSellers] = useState([])
  const [topListings, setTopListings] = useState([])
  const [topWaitlist, setTopWaitlist] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetchAnalyticsSummary(),
      fetchWeeklyGrowth(),
      fetchTopSellers(),
      fetchTopListings(),
      fetchTopWaitlistNeighborhoods(),
    ])
      .then(([s, growth, sellers, listings, waitlist]) => {
        setSummary(s)
        setWeeklyGrowth(growth)
        setTopSellers(sellers)
        setTopListings(listings)
        setTopWaitlist(waitlist)
      })
      .catch((err) => {
        console.error('Failed to load analytics', err)
        toast.error('Could not load analytics — try again.')
      })
      .finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="skeleton h-16 w-full rounded-xl" />
        ))}
      </div>
    )
  }

  if (!summary) return <Placeholder compact icon="📊" title="Couldn't load analytics" body="Try again in a moment." />

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h3 className="font-display text-base mb-3" style={{ color: 'var(--forest-dark)' }}>
          Overview
        </h3>
        <div className="grid grid-cols-2 gap-3">
          <StatCard label="Total users" value={summary.totalUsers} sub={`+${summary.newUsers30d} last 30d`} />
          <StatCard label="Active sellers (30d)" value={summary.activeSellers30d} sub={`of ${summary.totalSellers} total`} />
          <StatCard label="Active buyers (30d)" value={summary.activeBuyers30d} sub={`of ${summary.totalBuyers} total`} />
          <StatCard label="GMV (30d)" value={money(summary.gmvLast30d)} sub={`${money(summary.gmvCompleted)} lifetime`} />
          <StatCard label="Avg order value" value={money(summary.avgOrderValue)} />
          <StatCard label="Completion rate" value={pct(summary.completionRate)} sub="completed vs. cancelled/no-show" />
          <StatCard label="Repeat buyer rate" value={pct(summary.repeatBuyerRate)} sub="2+ completed orders" />
          <StatCard label="Signup conversion" value={pct(summary.signupConversionRate)} sub={`${summary.signupScreenViews} signup views`} />
        </div>
      </div>

      <div>
        <h3 className="font-display text-base mb-3" style={{ color: 'var(--forest-dark)' }}>
          Growth (last 12 weeks)
        </h3>
        <div className="flex flex-col gap-4">
          <div className="card-elevated p-3">
            <WeeklyBarChart title="New users" data={weeklyGrowth} valueKey="newUsers" color="var(--forest)" />
          </div>
          <div className="card-elevated p-3">
            <WeeklyBarChart title="New listings" data={weeklyGrowth} valueKey="newListings" color="var(--mustard-deep)" />
          </div>
          <div className="card-elevated p-3">
            <WeeklyBarChart
              title="GMV (completed orders)"
              data={weeklyGrowth}
              valueKey="gmv"
              color="var(--forest)"
              formatValue={money}
            />
          </div>
        </div>
      </div>

      <div>
        <h3 className="font-display text-base mb-3" style={{ color: 'var(--forest-dark)' }}>
          Order health
        </h3>
        <div className="card-elevated p-4">
          <OrderHealthBar
            completed={summary.completedOrders}
            open={summary.openOrders}
            problem={summary.cancelledOrders + summary.noShowOrders}
          />
        </div>
      </div>

      {topSellers.length > 0 && (
        <div>
          <h3 className="font-display text-base mb-3" style={{ color: 'var(--forest-dark)' }}>
            Top sellers
          </h3>
          <div className="flex flex-col gap-2">
            {topSellers.map((s, i) => (
              <div key={s.sellerId} className="card-elevated p-3 flex items-center justify-between gap-2">
                <div className="min-w-0 flex items-center gap-2.5">
                  <span className="text-xs font-bold shrink-0" style={{ color: 'var(--ink-soft)' }}>
                    #{i + 1}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{s.sellerName}</p>
                    <p className="text-xs" style={{ color: 'var(--ink-soft)' }}>
                      {s.completedOrders} completed order{s.completedOrders === 1 ? '' : 's'}
                    </p>
                  </div>
                </div>
                <p className="text-sm font-bold shrink-0" style={{ fontVariantNumeric: 'tabular-nums' }}>
                  {money(s.gmv)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {topListings.length > 0 && (
        <div>
          <h3 className="font-display text-base mb-3" style={{ color: 'var(--forest-dark)' }}>
            Top listings by views
          </h3>
          <div className="flex flex-col gap-2">
            {topListings.map((l, i) => (
              <div key={l.listingId} className="card-elevated p-3 flex items-center justify-between gap-2">
                <div className="min-w-0 flex items-center gap-2.5">
                  <span className="text-xs font-bold shrink-0" style={{ color: 'var(--ink-soft)' }}>
                    #{i + 1}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{l.title}</p>
                    <p className="text-xs truncate" style={{ color: 'var(--ink-soft)' }}>
                      {l.sellerName}
                    </p>
                  </div>
                </div>
                <p className="text-sm font-bold shrink-0" style={{ fontVariantNumeric: 'tabular-nums' }}>
                  👁️ {l.views}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {topWaitlist.length > 0 && (
        <div>
          <h3 className="font-display text-base mb-1" style={{ color: 'var(--forest-dark)' }}>
            📍 Growth opportunities
          </h3>
          <p className="text-xs mb-3" style={{ color: 'var(--ink-soft)' }}>
            Neighborhoods with waitlist signups but no active seller yet — go recruit here first.
          </p>
          <div className="flex flex-col gap-2">
            {topWaitlist.map((w) => (
              <div key={w.neighborhood} className="card-elevated p-3 flex items-center justify-between gap-2">
                <p className="text-sm font-medium truncate">{w.neighborhood}</p>
                <p className="text-sm font-bold shrink-0" style={{ fontVariantNumeric: 'tabular-nums' }}>
                  {w.signups} signup{w.signups === 1 ? '' : 's'}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default function AdminScreen({ onBack, adminId, onSelfProfileChanged }) {
  const [section, setSection] = useState('reports')

  return (
    <div className="pb-4">
      <div className="px-5 pt-6 pb-3 flex items-center gap-3">
        <button
          onClick={onBack}
          aria-label="Back"
          className="pressable text-lg p-2 -m-2 rounded-full hover:bg-[var(--paper-dim)] transition-colors"
          style={{ color: 'var(--forest-dark)' }}
        >
          ←
        </button>
        <h2 className="font-display text-xl" style={{ color: 'var(--forest-dark)' }}>
          Admin
        </h2>
      </div>

      <div className="px-5 flex gap-2 mb-1 overflow-x-auto pb-1">
        {['reports', 'users', 'stores', 'promotions', 'outreach', 'broadcast', 'stats'].map((s) => (
          <button
            key={s}
            onClick={() => setSection(s)}
            className="pressable shrink-0 text-sm px-4 py-2 rounded-xl border capitalize font-medium"
            style={{
              background: section === s ? 'var(--forest)' : 'transparent',
              color: section === s ? 'white' : 'var(--ink-soft)',
              borderColor: section === s ? 'var(--forest)' : 'var(--rule)',
            }}
          >
            {s}
          </button>
        ))}
      </div>

      <div className="px-5 pt-3">
        {section === 'reports' && <ReportsPanel adminId={adminId} onSelfProfileChanged={onSelfProfileChanged} />}
        {section === 'users' && <UsersPanel adminId={adminId} onSelfProfileChanged={onSelfProfileChanged} />}
        {section === 'stores' && <StoresPanel adminId={adminId} />}
        {section === 'promotions' && <PromotionsPanel />}
        {section === 'outreach' && <OutreachPanel adminId={adminId} />}
        {section === 'broadcast' && <BroadcastPanel />}
        {section === 'stats' && <StatsPanel />}
      </div>
    </div>
  )
}
