import { SUPPORT_EMAIL } from '../lib/siteInfo'

const LAST_UPDATED = 'August 19, 2026'

function Section({ title, children }) {
  return (
    <div className="mt-4">
      <h3 className="font-display text-base" style={{ color: 'var(--forest-dark)' }}>
        {title}
      </h3>
      <div className="text-sm mt-1 leading-relaxed" style={{ color: 'var(--ink)' }}>
        {children}
      </div>
    </div>
  )
}

function Terms() {
  return (
    <>
      <Section title="1. Agreement">
        <p>
          By creating an account or using Plates, you agree to these Terms of Service. If you don't
          agree, please don't use the app.
        </p>
      </Section>
      <Section title="2. What Plates is">
        <p>
          Plates is a listing and discovery platform that connects home cooks ("sellers") with
          neighbors who want to buy homemade food ("buyers"). Plates does not cook, prepare,
          package, price, inspect, take possession of, deliver, or sell any food itself, and does
          not currently process payments — buyers and sellers set their own prices, and arrange
          payment, pickup, and (if offered) delivery directly with each other, entirely outside of
          Plates. Plates is not a party to, and never takes title to any food involved in, any
          sale between a buyer and a seller. Plates' role begins and ends with letting people list
          food for sale and find listings nearby.
        </p>
      </Section>
      <Section title="3. Eligibility">
        <p>
          You must be at least 18 years old and able to form a binding contract to use Plates.
        </p>
      </Section>
      <Section title="4. Seller responsibilities">
        <p>
          If you list food for sale, you are solely responsible for: complying with all food
          safety, health department, and cottage food laws that apply in your city, county, and
          state (these vary widely and it is your responsibility to know and follow them);
          accurately describing your food, including ingredients and known allergens; preparing and
          handling food safely; setting your own price and honoring the listings you post; and
          including whatever disclosure label or statement your state's cottage food law requires
          on the food itself or at hand-off. Most states require a specific, exact sentence (not a
          paraphrase) disclosing that the food was made in a home kitchen not subject to standard
          health inspection — the required wording is different in every state, it is your
          responsibility to look up and use your own state's exact required wording, and Plates'
          own generic "made in a home kitchen" language elsewhere in the app does not substitute
          for it. See "Cottage Food Laws by State" (linked at the bottom of your profile) for where
          to start looking. Plates does not inspect home kitchens, verify food handler
          certifications, or guarantee that any listing complies with local law. Plates strongly
          recommends carrying your own general liability insurance (some cottage food and
          homeowners/renters policies can be extended to cover home food sales — ask your insurer)
          — Plates does not provide or arrange insurance for sellers, and the indemnification
          section below means you, not Plates, are financially responsible if something goes wrong.
        </p>
      </Section>
      <Section title="5. Buyer responsibilities and assumption of risk">
        <p>
          Food you buy through Plates is prepared by an individual in a private home kitchen, not a
          licensed commercial kitchen, and has not been inspected by any health department. By
          buying food through Plates, you knowingly and voluntarily assume all risks of doing so,
          including the risk of foodborne illness, allergic reaction, or other injury. Ask the
          seller about ingredients and allergens before buying if you have any dietary restriction
          or allergy — Plates does not verify what any seller tells you. You are solely responsible
          for deciding whether to purchase, accept, and eat any listing.
        </p>
      </Section>
      <Section title="6. Payments & refunds">
        <p>
          Plates does not currently process any payment. Buyers and sellers arrange and complete
          payment (cash, a payment app, etc.) directly with each other, outside of Plates, and
          Plates is not a party to that payment. Because of that, Plates cannot issue a refund on
          your behalf — if there's a problem with an order (wrong item, no-show, a food-safety
          concern), work it out directly with the other person first. If that doesn't resolve it,
          or if you believe someone violated these Terms or our Community Guidelines, use "🚩
          Report this listing" so we can review the account — but reporting is for enforcement, not
          a way to get your money back for a transaction Plates never touched. If Plates adds
          in-app payments in the future, this section will be updated with a real refund and
          dispute process at that time.
        </p>
      </Section>
      <Section title="7. Prohibited conduct">
        <p>
          Don't use Plates to: harass, threaten, or abuse other users; post spam, scams, or
          fraudulent listings; misrepresent what a listing contains; sell anything illegal to sell;
          or attempt to circumvent moderation, reporting, or account suspension.
        </p>
      </Section>
      <Section title="8. Content you post">
        <p>
          You keep ownership of the photos, descriptions, reviews, and messages you post, but you
          grant Plates a license to display them within the app so the marketplace can function.
          You're responsible for the content you post and confirm you have the right to post it.
        </p>
      </Section>
      <Section title="9. Reports & enforcement">
        <p>
          We rely on users reporting problems. We may remove a listing, resolve or dismiss a
          report, or suspend an account that violates these terms or our Community Guidelines, at
          our discretion.
        </p>
      </Section>
      <Section title="10. No warranty">
        <p>
          Plates is provided "as is," without any warranty of any kind. We don't guarantee the
          quality, safety, legality, or accuracy of any listing, and we don't guarantee the app
          will be uninterrupted or error-free.
        </p>
      </Section>
      <Section title="11. Limitation of liability">
        <p>
          To the fullest extent permitted by law, Plates and its operators are not liable for any
          harm arising from food purchased through the app, from interactions or meetups between
          buyers and sellers, or from your use of the app — including illness, injury, theft,
          assault, harassment, financial loss, or any other dispute or incident between users,
          whether it happens during a pickup, delivery, or any other in-person interaction arranged
          through Plates. Plates does not screen, verify, or run background checks on any user, does
          not supervise or participate in any pickup or delivery, and is not responsible for the
          conduct of any user, online or in person. You use Plates, meet other users through it, and
          obtain any food through it, entirely at your own risk.
        </p>
      </Section>
      <Section title="12. Indemnification">
        <p>
          You agree to defend, indemnify, and hold harmless Plates and its operators from any
          claim, damage, loss, or expense (including reasonable attorneys' fees) arising out of or
          related to: food you listed, sold, bought, or ate through Plates; your violation of these
          Terms or our Community Guidelines; your violation of any food safety, health, or cottage
          food law; or your interactions with another user. This applies whether the claim is
          brought by another user or by anyone else (for example, a third party who becomes ill).
        </p>
      </Section>
      <Section title="13. Dispute resolution">
        <p>
          <em>[Placeholder — many platforms require individual arbitration and a class-action
          waiver here specifically to limit litigation exposure. That language has to be drafted
          precisely to be enforceable in your state, so it's intentionally left out of this
          starting draft rather than guessed at — ask your attorney whether to add it before a real
          launch.]</em>
        </p>
      </Section>
      <Section title="14. Governing law">
        <p>
          These terms are governed by the laws of your local jurisdiction unless stated otherwise.
          <em> [Placeholder — update this once you've decided which state's law should govern, and
          have a lawyer confirm it works with your cottage food setup.]</em>
        </p>
      </Section>
      <Section title="15. Changes">
        <p>
          We may update these terms from time to time. Continuing to use Plates after a change
          means you accept the updated terms.
        </p>
      </Section>
      <Section title="16. Contact">
        <p>
          Questions about these terms? Email{' '}
          <a href={`mailto:${SUPPORT_EMAIL}`} style={{ color: 'var(--forest-dark)', textDecoration: 'underline' }}>
            {SUPPORT_EMAIL}
          </a>
          .
        </p>
      </Section>
    </>
  )
}

function Privacy() {
  return (
    <>
      <Section title="1. What we collect">
        <p>
          Account info you give us (name, email, kitchen name, profile photo), your approximate
          location if you set a neighborhood or map pin, the listings, messages, ratings, and
          reports you create, and basic usage info needed to run the app.
        </p>
      </Section>
      <Section title="2. How we use it">
        <p>
          To run the marketplace: showing your listings to nearby buyers, connecting buyers and
          sellers through chat, computing distance/neighborhood matches, sending you alerts for
          cuisines you follow, and enforcing our Terms of Service and Community Guidelines.
        </p>
      </Section>
      <Section title="3. Who we share it with">
        <p>
          We don't sell your personal data. Your name, listings, and public profile info are
          visible to other users of the app, since that's how a marketplace works. We use Supabase
          to host our database and handle login — they process data on our behalf under their own
          privacy and security practices.
        </p>
      </Section>
      <Section title="4. Location data">
        <p>
          If you add a neighborhood or map location to your profile, it's used to sort and display
          nearby listings and to show your approximate pin on the map. You can remove it at any
          time by editing your profile.
        </p>
      </Section>
      <Section title="5. Data retention & deletion">
        <p>
          We keep your data as long as your account is active. To delete your account and personal
          data, email{' '}
          <a href={`mailto:${SUPPORT_EMAIL}`} style={{ color: 'var(--forest-dark)', textDecoration: 'underline' }}>
            {SUPPORT_EMAIL}
          </a>
          .
        </p>
      </Section>
      <Section title="6. Children">
        <p>Plates is not intended for anyone under 18, and we don't knowingly collect data from minors.</p>
      </Section>
      <Section title="7. Security">
        <p>
          We use industry-standard practices (like row-level access controls on our database) to
          protect your data, but no system is 100% secure.
        </p>
      </Section>
      <Section title="8. Changes">
        <p>We may update this policy from time to time; we'll update the date below when we do.</p>
      </Section>
      <Section title="9. Contact">
        <p>
          Questions about your data? Email{' '}
          <a href={`mailto:${SUPPORT_EMAIL}`} style={{ color: 'var(--forest-dark)', textDecoration: 'underline' }}>
            {SUPPORT_EMAIL}
          </a>
          .
        </p>
      </Section>
    </>
  )
}

function Guidelines() {
  return (
    <>
      <Section title="Plates is neighbor-to-neighbor, not a restaurant">
        <p>
          Every listing on Plates comes from someone's home kitchen, not a licensed commercial
          kitchen. That's the whole point — but it also means the usual health-department
          inspections and certifications a restaurant has don't apply here. Buy and eat with that in
          mind.
        </p>
      </Section>
      <Section title="If you're selling">
        <p>
          Know and follow your local cottage food / home kitchen laws — these limit what you can
          legally sell, how much, and almost always require a specific disclosure statement (exact
          wording set by your state, not something you can paraphrase) somewhere the buyer sees it.
          These rules vary a lot by state and county — see "Cottage Food Laws by State" below to
          start looking up your own state's requirements. List allergens and ingredients honestly
          and completely. Keep your kitchen clean and don't sell if you're sick. Don't sell
          anything that isn't safe or legal to sell from home. Consider carrying general liability
          insurance — ask your insurer whether a cottage food policy or a rider on your existing
          homeowners/renters policy covers selling food from home.
        </p>
      </Section>
      <Section title="If you're buying">
        <p>
          Ask the seller directly about ingredients or allergens if you have any dietary restriction
          — don't assume. Use your own judgment about a listing before buying. If something seems
          off about a listing or a seller, report it.
        </p>
      </Section>
      <Section title="Be a decent neighbor">
        <p>
          No harassment, scams, spam, or fake listings. Show up for pickups you've confirmed, or
          message the seller if your plans change. Treat this like the neighborhood it's meant to
          be.
        </p>
      </Section>
      <Section title="Meeting up safely">
        <p>
          Plates connects you with a listing — it doesn't arrange, supervise, or take any part in
          the actual pickup or delivery, so treat it the way you would any meetup with someone you
          only know online. A few basics: meet in a public, well-lit spot if you're not comfortable
          with your home address being shared (a driveway, porch, or a nearby public spot all work);
          bring a friend or let someone know where you're going and when you expect to be back; trust
          your gut — if a listing, a message, or a person feels off, don't go through with it, cancel
          the order, and report it; and don't share financial information (bank details, card
          numbers, full account numbers) with another user under any circumstances — nothing about a
          Plates transaction should ever require that.
        </p>
        <p className="mt-2">
          If you are ever in immediate danger, call 911 (or your local emergency number) first —
          don't wait on a report to us. Reporting an account to Plates is how we handle it on our
          end (reviewing, warning, or banning), it isn't a way to get help in the moment and doesn't
          notify police.
        </p>
      </Section>
      <Section title="Reporting a problem">
        <p>
          Tap "🚩 Report" on any listing, chat, or seller's storefront that isn't yours to flag a
          food-safety concern, a safety incident, a scam, bad behavior, or a payment dispute. Our
          team reviews every report — note that since Plates doesn't process payments today, we can
          act on the account but can't refund a transaction that happened outside the app. For
          anything urgent or in-progress, contact local authorities directly rather than waiting on
          us to respond.
        </p>
      </Section>
    </>
  )
}

const STATES = [
  'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut', 'Delaware',
  'District of Columbia', 'Florida', 'Georgia', 'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa',
  'Kansas', 'Kentucky', 'Louisiana', 'Maine', 'Maryland', 'Massachusetts', 'Michigan', 'Minnesota',
  'Mississippi', 'Missouri', 'Montana', 'Nebraska', 'Nevada', 'New Hampshire',
  'New Mexico', 'New York', 'North Carolina', 'North Dakota', 'Ohio', 'Oklahoma', 'Oregon',
  'Pennsylvania', 'Rhode Island', 'South Carolina', 'South Dakota', 'Tennessee', 'Texas', 'Utah',
  'Vermont', 'Virginia', 'Washington', 'West Virginia', 'Wisconsin', 'Wyoming',
]

function StateLaws() {
  return (
    <>
      <Section title="Why this page exists">
        <p>
          Every state (except New Jersey, which currently has no cottage food program) has its own
          cottage food law — and they're genuinely different from each other, not just a copy of
          one federal rule. What you're allowed to sell, how much you can sell in a year, whether
          you need a permit, and the exact wording you're required to disclose to buyers all vary
          by state, and sometimes by county on top of that.
        </p>
      </Section>
      <Section title="What this page is (and isn't)">
        <p>
          This is a checklist, not a legal reference — it lists every state so you can confirm
          cottage food sales are (almost certainly) legal where you live, and points you at a real
          source instead of guessing. Plates intentionally does not try to state each state's exact
          rules or required disclosure wording here: that wording is usually set word-for-word in
          the statute, changes over time (Texas's changed as recently as 2025), and a wrong
          paraphrase can itself be a compliance problem. Look up your own state's current
          requirements directly rather than relying on any summary, including this one.
        </p>
      </Section>
      <Section title="Where to look">
        <p>
          The{' '}
          <a
            href="https://nationalaglawcenter.org/state-compilations/cottagefood/"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: 'var(--forest-dark)', textDecoration: 'underline' }}
          >
            National Agricultural Law Center's cottage food law compilation
          </a>{' '}
          (University of Arkansas, done in partnership with USDA) is a good starting point — it
          links out to the actual current statute or regulation for each state. From there, your
          state's Department of Agriculture or Department of Health will have the specifics
          (permit requirements, sales caps, and the exact disclosure statement you're required to
          use).
        </p>
      </Section>
      <Section title="States with a cottage food program">
        <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
          {STATES.map((s) => (
            <p key={s}>{s}</p>
          ))}
        </div>
        <p className="mt-3" style={{ color: 'var(--ink-soft)' }}>
          New Jersey isn't listed above — it does not currently have a cottage food program, and as
          of this writing homemade food generally can't be sold there outside a licensed commercial
          kitchen. Laws change; if you're in New Jersey, confirm this directly before listing
          anything.
        </p>
      </Section>
    </>
  )
}

const docs = {
  terms: { title: 'Terms of Service', body: Terms },
  privacy: { title: 'Privacy Policy', body: Privacy },
  guidelines: { title: 'Community Guidelines', body: Guidelines },
  states: { title: 'Cottage Food Laws by State', body: StateLaws },
}

export default function LegalScreen({ doc, onBack }) {
  const entry = docs[doc] ?? docs.terms
  const Body = entry.body
  return (
    <div className="pb-8">
      <div className="px-5 pt-6 pb-3 flex items-center gap-3">
        <button
          onClick={onBack}
          aria-label="Back"
          className="pressable text-lg p-2 -m-2 rounded-full hover:bg-[var(--paper-dim)] transition-colors"
          style={{ color: 'var(--forest-dark)' }}
        >
          ←
        </button>
        <h2 className="font-display text-xl" style={{ color: 'var(--forest-dark)' }}>
          {entry.title}
        </h2>
      </div>
      <div className="px-5">
        <p className="text-xs" style={{ color: 'var(--ink-soft)' }}>Last updated {LAST_UPDATED}</p>
        <div
          className="mt-3 rounded-xl border p-3 text-xs leading-relaxed"
          style={{ borderColor: 'var(--rule)', background: 'var(--paper-dim)', color: 'var(--ink-soft)' }}
        >
          This is a starting-point draft, not legal advice, and hasn't been reviewed by a lawyer.
          Cottage food and home-kitchen laws vary by state and county — have an attorney review
          this before you rely on it for a real launch.
        </div>
        <Body />
      </div>
    </div>
  )
}
