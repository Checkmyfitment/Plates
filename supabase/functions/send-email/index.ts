// Sends a real email for order-lifecycle events (new order, confirmed,
// ready for pickup, completed, cancelled, no-show) as a fallback for
// anyone who hasn't turned on push notifications — most people won't.
// Invoked directly by the order trigger functions in the database (see
// migration_email_notifications.sql), not a generic webhook on every
// notification, so it only fires for the events that actually matter.
//
// Uses Resend (resend.com) to actually send the email. Needs a
// RESEND_API_KEY secret — see CHECKLIST.md's "Email notifications setup"
// section for how to get one and set it.

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const FROM_EMAIL = Deno.env.get('FROM_EMAIL') || 'Plates <onboarding@resend.dev>'

Deno.serve(async (req) => {
  try {
    if (!RESEND_API_KEY) {
      // not configured yet — fail quietly so the database trigger that
      // called this doesn't error out just because email isn't set up
      return new Response('email not configured', { status: 200 })
    }

    const { to, subject, message } = await req.json()
    if (!to || !subject || !message) {
      return new Response('missing fields', { status: 400 })
    }

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to,
        subject,
        text: message,
      }),
    })

    if (!res.ok) {
      const detail = await res.text()
      console.error('Resend error', res.status, detail)
      return new Response('email send failed', { status: 502 })
    }

    return new Response('ok', { status: 200 })
  } catch (err) {
    console.error('send-email error', err)
    return new Response('error', { status: 500 })
  }
})
