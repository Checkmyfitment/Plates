const SEEN_KEY = 'plates_onboarded'

export function hasSeenOnboarding() {
  try {
    return localStorage.getItem(SEEN_KEY) === 'true'
  } catch {
    return true
  }
}

export function markOnboardingSeen() {
  try {
    localStorage.setItem(SEEN_KEY, 'true')
  } catch {
    // ignore — worst case they see the walkthrough again next time
  }
}

// Separate, one-time "please review" screen for anyone who signed up
// intending to sell — the cottage food compliance map. Distinct from the
// general walkthrough above since it's only relevant to prospective
// sellers, not every visitor, and needs to survive independently of
// whether they've seen the general tour.
const COTTAGE_LAW_SEEN_KEY = 'plates_cottage_law_reviewed'

export function hasSeenCottageLawNotice() {
  try {
    return localStorage.getItem(COTTAGE_LAW_SEEN_KEY) === 'true'
  } catch {
    return true
  }
}

export function markCottageLawNoticeSeen() {
  try {
    localStorage.setItem(COTTAGE_LAW_SEEN_KEY, 'true')
  } catch {
    // ignore — worst case they see it again next time
  }
}

// One-time "Allow Notifications" prompt shown right after a brand-new
// signup — separate key so it survives independently of the general
// walkthrough/cottage-law flags and never reappears for that device once
// answered (Allow or Skip), even across sessions.
const NOTIF_PROMPT_SEEN_KEY = 'plates_notif_prompt_seen'

export function hasSeenNotifPrompt() {
  try {
    return localStorage.getItem(NOTIF_PROMPT_SEEN_KEY) === 'true'
  } catch {
    return true
  }
}

export function markNotifPromptSeen() {
  try {
    localStorage.setItem(NOTIF_PROMPT_SEEN_KEY, 'true')
  } catch {
    // ignore — worst case they see it again next time
  }
}
