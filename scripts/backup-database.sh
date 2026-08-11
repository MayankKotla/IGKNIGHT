#!/usr/bin/env bash
# Dumps the Supabase Postgres database to a timestamped file in backups/.
# See docs/DISASTER_RECOVERY.md for the full backup/recovery plan.
#
# Requires:
#   - pg_dump (Postgres client tools — `brew install libpq` on macOS,
#     `apt install postgresql-client` on Linux)
#   - SUPABASE_DB_URL set in your environment:
#     Supabase Dashboard > Project Settings > Database > Connection string (URI)
#
# Usage:
#   export SUPABASE_DB_URL="postgresql://postgres.xxxxx:[password]@xxxxx.supabase.com:5432/postgres"
#   ./scripts/backup-database.sh

set -euo pipefail

if [ -z "${SUPABASE_DB_URL:-}" ]; then
  echo "Error: SUPABASE_DB_URL is not set."
  echo "Get it from Supabase Dashboard > Project Settings > Database > Connection string (URI)."
  exit 1
fi

if ! command -v pg_dump >/dev/null 2>&1; then
  echo "Error: pg_dump not found. Install Postgres client tools first."
  exit 1
fi

cd "$(dirname "$0")/.."
mkdir -p backups

timestamp=$(date +%Y%m%d_%H%M%S)
output="backups/igknight_${timestamp}.dump"

pg_dump "$SUPABASE_DB_URL" --format=custom --file="$output"

echo "Backup written to $output"
echo "This file contains real student data — never commit it. backups/ is gitignored."
