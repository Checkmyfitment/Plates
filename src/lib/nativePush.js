import { Capacitor } from '@capacitor/core'
import { PushNotifications } from '@capacitor/push-notifications'
import { supabase } from './supabaseClient'

// Real device push (APNs on iOS, FCM on Android) for the installed app —
// separate from lib/push.js, which is the browser Web Push path and doesn't
// work reliably inside Capacitor's native WebView. This one only does
// anything at all when actually running as the wrapped native app.
export function isNativePushSupported() {
  return Capacitor.isNativePlatform()
}

export async function getNativePushPermissionStatus() {
  if (!isNativePushSupported()) return 'unsupported'
  const { receive } = await PushNotifications.checkPermissions()
  return receive // 'granted' | 'denied' | 'prompt' | 'prompt-with-rationale'
}

// Requests permission (if needed), registers with APNs/FCM, and saves the
// resulting device token to Supabase against this user. Resolves with the
// token once saved.
export function registerNativePush(userId) {
  return new Promise((resolve, reject) => {
    if (!isNativePushSupported()) {
      reject(new Error('Native push is only available in the installed app.'))
      return
    }

    let settled = false
    let registrationHandle
    let errorHandle

    const cleanup = () => {
      registrationHandle?.remove()
      errorHandle?.remove()
    }

    PushNotifications.addListener('registration', async (token) => {
      if (settled) return
      settled = true
      cleanup()
      try {
        const { error } = await supabase.from('native_push_tokens').upsert(
          {
            user_id: userId,
            platform: Capacitor.getPlatform(),
            token: token.value,
          },
          { onConflict: 'token' },
        )
        if (error) throw error
        resolve(token.value)
      } catch (err) {
        reject(err)
      }
    }).then((handle) => {
      registrationHandle = handle
    })

    PushNotifications.addListener('registrationError', (err) => {
      if (settled) return
      settled = true
      cleanup()
      reject(new Error(err?.error || 'Push registration failed.'))
    }).then((handle) => {
      errorHandle = handle
    })
    ;(async () => {
      try {
        let { receive } = await PushNotifications.checkPermissions()
        if (receive !== 'granted') {
          ;({ receive } = await PushNotifications.requestPermissions())
        }
        if (receive !== 'granted') {
          if (settled) return
          settled = true
          cleanup()
          reject(new Error('Notifications are blocked — enable them for Plates in your device Settings.'))
          return
        }
        await PushNotifications.register()
      } catch (err) {
        if (settled) return
        settled = true
        cleanup()
        reject(err)
      }
    })()
  })
}

// There's no true cross-platform "unregister" — the best a device can do is
// stop being a send target. This removes every stored token for this user
// on this platform (a per-device token id isn't available from the plugin,
// so a user with push on two iPhones would clear both by turning it off on
// either — an acceptable simplification for now, not a security issue since
// RLS already scopes every row to auth.uid()).
export async function unregisterNativePush(userId) {
  if (!isNativePushSupported()) return
  const platform = Capacitor.getPlatform()
  const { error } = await supabase.from('native_push_tokens').delete().eq('user_id', userId).eq('platform', platform)
  if (error) throw error
}
