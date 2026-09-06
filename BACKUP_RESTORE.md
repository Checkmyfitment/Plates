# Backups & restore

## Taking a backup

```bash
./scripts/backup-db.sh
```

Writes two files to `~/plates-backups/` (outside this repo, never committed —
they contain real user data, including hashed passwords in `auth.users`):

- `schema-<timestamp>.sql` — every table, function, trigger, policy
- `data-<timestamp>.sql` — every row, across all schemas (`public`, `auth`,
  `storage`, etc.)

Needs the Supabase CLI already logged in and linked (already done for this
project) and [Postgres.app](https://postgresapp.com) installed for a real
`pg_dump` — `supabase db dump` itself needs Docker, which nothing else in
this project uses, so the script calls `pg_dump` directly instead using a
short-lived connection the Supabase CLI generates.

**Set up a recurring schedule** (do this once): see "Automatic weekly
backups" below. A backup you have to remember to run by hand is a backup
that quietly stops happening.

## Restoring

You'll only ever do this in a real emergency (a botched migration, deleted
data, etc.) — read this whole section before running anything, and if
there's *any* real user data on the platform at the time, back up the
*current* (possibly-broken) state first anyway, before restoring over it —
`./scripts/backup-db.sh` again. Restoring is not undoable.

1. Get a fresh DB connection the same way the backup script does:
   ```bash
   eval "$(npx supabase db dump --linked --dry-run 2>&1 | grep '^export')"
   export PATH="/Applications/Postgres.app/Contents/Versions/17/bin:$PATH"
   ```
2. Restore the schema first:
   ```bash
   psql -f ~/plates-backups/schema-<timestamp>.sql
   ```
3. Then the data. The `profiles` table has a circular foreign key
   (`referred_by` points back at `profiles` itself), which `pg_dump` warns
   about — disable triggers during the load so row order doesn't matter,
   then re-enable them:
   ```bash
   psql -c "SET session_replication_role = replica;" -f ~/plates-backups/data-<timestamp>.sql
   ```
   (`session_replication_role = replica` disables triggers/FK checks for
   the session — safe here since it's a one-shot restore, not a
   permanent setting.)
4. Spot-check: log in as a real account, confirm listings/orders/profile
   data all look right. Then verify the app itself still works end to end
   before considering this done — a restore that "ran with no errors" isn't
   the same as one that actually worked.

## What this does and doesn't cover

This is a **manual, DIY** backup — genuinely useful as a real safety net
(and free), but worth knowing its limits honestly:

- Point-in-time recovery (restoring to "5 minutes before the bad thing
  happened", not just "whenever the last scheduled dump ran") is **not**
  covered by this — that needs Supabase's own paid-tier backups (Pro plan
  and up), which handle it automatically with no DIY scripting at all. Once
  there's real money and real users on the platform, that's worth paying
  for instead of leaning on this script as the only safety net.
- These files are plain, unencrypted SQL containing real personal data —
  they're already kept out of git by living in `~/plates-backups/`
  (outside the repo entirely), but if you ever copy them anywhere else
  (a shared drive, a cloud folder that syncs to other devices, etc.),
  treat them with the same care as the production database itself.

## Automatic weekly backups — tried, hit a real macOS wall

A `launchd` (macOS's built-in scheduler) job to run `backup-db.sh`
automatically every week was attempted and **does not currently work**,
for a genuine, structural reason worth understanding rather than a bug to
just retry:

1. This repo lives under `~/Downloads`, which macOS treats as a protected
   folder — a background `launchd` job (unlike an interactive Terminal
   session) can't read anything under it at all. Worked around by giving
   the automation its own copy of the script and its own Supabase CLI
   link state entirely outside `~/Downloads` (in `~/plates-backups/`).
2. That got further, but hit a second wall: the Supabase CLI stores its
   login token in the macOS Keychain, and a `launchd`-spawned process
   doesn't inherit the same Keychain access an interactive shell has — it
   silently sits waiting on a permission prompt with no one there to
   click it, hanging forever.

Both of those need real interactive one-time steps from you to fully
solve (granting Keychain access to a specific background process isn't
something scriptable without your own click-through), so for now:

- **The manual script is the real, verified way to back this up** — run
  `./scripts/backup-db.sh` yourself whenever, it works perfectly and
  takes a few seconds. A recurring calendar reminder is a fine way to
  make sure it actually happens.
- **If true unattended automation matters enough to build properly**, the
  right fix is to stop depending on the CLI's Keychain-gated login token
  for the scheduled job, and instead use a persistent direct database
  connection string (the normal way any automated DB backup does this).
  That needs your actual database password once — from the Supabase
  dashboard → Project Settings → Database → Connection string — pasted
  into a local file only you ever touch (never typed in or seen by
  Claude). Worth doing once there's real, growing data worth losing
  sleep over; ask to set this up when you want it.
