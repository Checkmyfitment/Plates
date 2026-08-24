import { supabase } from './supabaseClient'

function mapLead(row) {
  return {
    id: row.id,
    platform: row.platform,
    contactName: row.contact_name,
    contactInfo: row.contact_info,
    listingNote: row.listing_note,
    status: row.status,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export async function fetchOutreachLeads() {
  const { data, error } = await supabase
    .from('outreach_leads')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data.map(mapLead)
}

export async function createOutreachLead({ platform, contactName, contactInfo, listingNote, createdBy }) {
  const { data, error } = await supabase
    .from('outreach_leads')
    .insert({
      platform,
      contact_name: contactName,
      contact_info: contactInfo || null,
      listing_note: listingNote || null,
      created_by: createdBy,
    })
    .select()
    .single()
  if (error) throw error
  return mapLead(data)
}

// one insert for a whole pasted batch, instead of one round trip per lead
export async function createOutreachLeadsBulk(leads, createdBy) {
  const rows = leads.map((l) => ({
    platform: l.platform,
    contact_name: l.contactName,
    contact_info: l.contactInfo || null,
    listing_note: l.listingNote || null,
    created_by: createdBy,
  }))
  const { data, error } = await supabase.from('outreach_leads').insert(rows).select()
  if (error) throw error
  return data.map(mapLead)
}

export async function updateOutreachLead(id, { status, notes }) {
  const patch = { updated_at: new Date().toISOString() }
  if (status !== undefined) patch.status = status
  if (notes !== undefined) patch.notes = notes || null
  const { data, error } = await supabase.from('outreach_leads').update(patch).eq('id', id).select().single()
  if (error) throw error
  return mapLead(data)
}

export async function deleteOutreachLead(id) {
  const { error } = await supabase.from('outreach_leads').delete().eq('id', id)
  if (error) throw error
}

export const outreachMessageTemplate = `Hey! I saw your [dish] post — looks amazing. I run Plates, a marketplace just for home cooks like you (no furniture/electronics clutter, just food). It's free to list, buyers can order and message you directly, and you build reviews/a following instead of starting over on every post. Want me to send you the link to set up your kitchen? Takes like 2 minutes.`

export function personalizedOutreachMessage(lead) {
  const dish = lead.listingNote?.trim()
  return dish ? outreachMessageTemplate.replace('[dish]', dish) : outreachMessageTemplate
}

// "Name - what they're selling - contact info" pasted one per line — the
// fast-typing format for logging a bunch of marketplace finds in one go,
// contact info stays optional since you often don't have it yet.
//
// Deliberately does NOT filter out empty parts before assigning them —
// splitting "Maria -  - (555) 123-4567" (a blank middle field, e.g. from
// pasting a spreadsheet with an empty cell) and then dropping empty
// strings would shift every field after it left by one, silently landing
// the phone number in listingNote instead of contactInfo.
export function parseBulkLeadLine(line) {
  const parts = line.split(' - ').map((p) => p.trim())
  const contactName = parts[0] || ''
  if (!contactName) return null
  return {
    contactName,
    listingNote: parts[1] || '',
    contactInfo: parts.slice(2).join(' - '),
  }
}
