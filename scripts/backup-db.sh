#!/usr/bin/env bash
# Takes a full backup of the live Supabase database: schema + data
# (including real accounts in auth.users), written as two plain SQL files
# to ~/plates-backups/. See BACKUP_RESTORE.md for how to restore from these.
#
# Requires: the Supabase CLI already logged in and linked (one-time setup,
# already done for this project -- `npx supabase login` / `npx supabase
# link`), and Postgres.app (or any Postgres 17 client tools) installed for
# a real pg_dump binary, since `supabase db dump` itself needs Docker,
# which this project doesn't otherwise use.
#
# Usage: ./scripts/backup-db.sh

set -euo pipefail

# launchd runs jobs with a minimal PATH that may not include wherever
# Node/npx lives (e.g. /usr/local/bin, Homebrew's /opt/homebrew/bin, or an
# nvm install) -- an interactive Terminal shell has this already, but a
# scheduled background run doesn't, so make sure it's there explicitly
export PATH="/usr/local/bin:/opt/homebrew/bin:$PATH"

PG_BIN="/Applications/Postgres.app/Contents/Versions/17/bin"
if [ ! -x "$PG_BIN/pg_dump" ]; then
  echo "pg_dump not found at $PG_BIN — install Postgres.app (postgresapp.com), or edit PG_BIN in this script to point at your own pg_dump." >&2
  exit 1
fi
export PATH="$PG_BIN:$PATH"

BACKUP_DIR="$HOME/plates-backups"
mkdir -p "$BACKUP_DIR"
TS=$(date +%Y%m%d-%H%M%S)

# runs from its own linked copy outside the project directory, not the repo
# itself -- macOS blocks background launchd jobs (unlike an interactive
# Terminal session) from reading anything under ~/Downloads at all, which
# is where this repo happens to live
WORKDIR="$BACKUP_DIR/.cli-workdir"
mkdir -p "$WORKDIR"
cd "$WORKDIR"

echo "Fetching a fresh temporary DB connection from the Supabase CLI..."
CREDS="$(npx supabase db dump --linked --dry-run 2>&1 | grep '^export')"
if [ -z "$CREDS" ]; then
  echo "Could not get DB credentials from the Supabase CLI -- is it still logged in/linked? Run 'npx supabase login' from $WORKDIR to check." >&2
  exit 1
fi
eval "$CREDS"

echo "Dumping schema..."
pg_dump --schema-only --quote-all-identifier --role postgres \
  --exclude-schema "information_schema|pg_*|_analytics|_realtime|_supavisor|auth|etl|extensions|pgbouncer|realtime|storage|supabase_functions|supabase_migrations|cron|dbdev|graphql|graphql_public|net|pgmq|pgsodium|pgsodium_masks|pgtle|repack|tiger|tiger_data|timescaledb_*|_timescaledb_*|topology|vault" \
  -f "$BACKUP_DIR/schema-$TS.sql"

echo "Dumping data (including real accounts in auth.users)..."
pg_dump --data-only --quote-all-identifier --role postgres \
  --exclude-schema "information_schema|pg_*|graphql|graphql_public|pgsodium|pgsodium_masks|pgtle|repack|tiger|tiger_data|timescaledb_*|_timescaledb_*|topology|vault|etl|extensions|pgbouncer|realtime|supabase_migrations|_analytics|_realtime|_supavisor" \
  --exclude-table "auth.schema_migrations" \
  --exclude-table "storage.migrations" \
  --exclude-table "supabase_functions.migrations" \
  --schema "*" \
  --column-inserts --rows-per-insert 100000 \
  -f "$BACKUP_DIR/data-$TS.sql"

echo ""
echo "Done. Wrote:"
echo "  $BACKUP_DIR/schema-$TS.sql"
echo "  $BACKUP_DIR/data-$TS.sql"
echo ""
echo "These contain real user data (including hashed passwords in"
echo "auth.users) -- keep $BACKUP_DIR out of git and anywhere else that"
echo "isn't private to you."
