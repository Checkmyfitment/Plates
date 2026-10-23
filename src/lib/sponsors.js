import { supabase } from './supabaseClient'

// Sponsored placements ("ads"): a local business pays to show a clearly
// labeled card in Browse/Search. Rows live in the sponsors table
// (supabase/migration_sponsors.sql); the database itself only returns ones
// that are live right now, so everything here is just shaping and choosing.

export function mapSponsor(row) {
  return {
    id: row.id,
    name: row.name,
    tagline: row.tagline ?? null,
    imageUrl: row.image_url ?? null,
    linkUrl: row.link_url,
    ctaLabel: row.cta_label || 'Learn more',
    placement: row.placement,
    neighborhood: row.neighborhood ?? null,
  }
}

// a sponsor with a neighborhood only shows to people in that neighborhood;
// one without shows to everyone
export function eligibleSponsors(sponsors, neighborhood) {
  const mine = (neighborhood || '').trim().toLowerCase()
  return sponsors.filter((s) => !s.neighborhood || s.neighborhood.trim().toLowerCase() === mine)
}

// picks one sponsor, rotating fairly: `seed` is any number that changes per
// session/visit (e.g. a timestamp), so different people (and the same person
// on different days) see different sponsors instead of always the first
export function pickSponsor(sponsors, seed = Date.now()) {
  if (!sponsors.length) return null
  return sponsors[Math.abs(Math.floor(seed)) % sponsors.length]
}

export async function fetchLiveSponsors(placement) {
  const { data, error } = await supabase
    .from('sponsors')
    .select('id, name, tagline, image_url, link_url, cta_label, placement, neighborhood')
    .eq('placement', placement)
  if (error) throw error
  return (data ?? []).map(mapSponsor)
}

// anonymous +1 on the sponsor's own counters; never throws -- a counting
// hiccup must not break the screen or the tap
export async function recordSponsorEvent(sponsorId, event) {
  try {
    await supabase.rpc('record_sponsor_event', { p_sponsor_id: sponsorId, p_event: event })
  } catch (err) {
    console.error('Failed to record sponsor event', err)
  }
}
