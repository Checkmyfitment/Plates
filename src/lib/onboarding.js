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
