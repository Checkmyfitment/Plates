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
