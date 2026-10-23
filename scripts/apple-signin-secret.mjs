// Regenerates the Sign in with Apple client secret (a signed token) that
// Supabase needs under Authentication -> Sign In / Providers -> Apple.
// Apple limits it to 6 MONTHS, so run this and paste the output into Supabase
// about every 5 months (last generated 2026-10-13; expires ~2027-04-13).
//
// Usage:  node scripts/apple-signin-secret.mjs | pbcopy   (copies it, prints nothing)
// Needs the .p8 key at ~/Downloads/AuthKey_TUSNC3T8TB.p8 -- never commit that file.
import { readFileSync } from 'node:fs'
import { createPrivateKey, sign } from 'node:crypto'
import { homedir } from 'node:os'

const TEAM_ID = '39CUWB2S52'
const KEY_ID = 'TUSNC3T8TB'
const SERVICES_ID = 'com.platesapp.app.signin'
const KEY_FILE = `${homedir()}/Downloads/AuthKey_${KEY_ID}.p8`
const SIX_MONTHS = 15777000

const b64url = (input) => Buffer.from(input).toString('base64url')
const now = Math.floor(Date.now() / 1000)

const header = { alg: 'ES256', kid: KEY_ID }
const payload = {
  iss: TEAM_ID,
  iat: now,
  exp: now + SIX_MONTHS,
  aud: 'https://appleid.apple.com',
  sub: SERVICES_ID,
}

const unsigned = `${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(payload))}`
const key = createPrivateKey(readFileSync(KEY_FILE))
const signature = sign('sha256', Buffer.from(unsigned), { key, dsaEncoding: 'ieee-p1363' })

// the secret goes to stdout only (piped to the clipboard) -- never printed
process.stdout.write(`${unsigned}.${signature.toString('base64url')}`)
