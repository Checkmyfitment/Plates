import { Capacitor } from '@capacitor/core'

// Where "Rate Pass the Plates" sends people. Apple doesn't allow a custom
// "please review us" pop-up, but a permanent link in Settings that opens the
// store's own review page is fine. Web visitors have no store to rate on.
export const APP_STORE_REVIEW_URL = 'https://apps.apple.com/app/id6809894925?action=write-review'
export const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.platesapp.app'

export function getRateAppUrl(platform = Capacitor.getPlatform()) {
  if (platform === 'ios') return APP_STORE_REVIEW_URL
  if (platform === 'android') return PLAY_STORE_URL
  return null
}
