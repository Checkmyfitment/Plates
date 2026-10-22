import { describe, it, expect } from 'vitest'
import { getRateAppUrl, APP_STORE_REVIEW_URL, PLAY_STORE_URL } from './rateApp'

describe('getRateAppUrl', () => {
  it('opens the App Store review page on iOS', () => {
    expect(getRateAppUrl('ios')).toBe(APP_STORE_REVIEW_URL)
    expect(APP_STORE_REVIEW_URL).toContain('id6809894925')
  })
  it('opens the Play Store listing on Android', () => {
    expect(getRateAppUrl('android')).toBe(PLAY_STORE_URL)
    expect(PLAY_STORE_URL).toContain('com.platesapp.app')
  })
  it('offers nothing on the web', () => {
    expect(getRateAppUrl('web')).toBeNull()
  })
})
