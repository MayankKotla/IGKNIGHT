# Backup & Disaster Recovery

This documents what data IgKnight has, where it lives, what's backed up automatically today, and the steps to recover from the ways things can go wrong. Revisit this whenever the stack changes (new storage bucket, new hosting provider, etc.).

## 1. Where the data actually lives

| What | Where | Automatically backed up? |
| --- | --- | --- |
| Database (users, groups, messages, sessions, quizzes, etc.) | Supabase Postgres | **Only on Supabase's paid Pro plan.** The Free plan has no automatic backups at all. |
| Uploaded files (chat attachments, session materials, sample questions) | Supabase Storage (`chat-uploads`, `session-uploads` buckets) | **Never**, on any Supabase plan. Storage is not covered by Postgres backups or point-in-time recovery (PITR), Free or Pro. |
| Source code | GitHub (`MayankKotla/IGKNIGHT`) | Yes — full history, and it's what Vercel/Render deploy from. Low risk as long as the repo exists. |
| Client deployment | Vercel | Stateless — rebuilt from GitHub on every push. Nothing to back up. |
| Server deployment | Render | Stateless — rebuilt from GitHub on every push. Nothing to back up. |
| Secrets (Supabase keys, Anthropic key, Google OAuth credentials, Sentry DSNs) | Vercel/Render environment variable settings + your local `.env` files | **Not backed up anywhere by default** — losing dashboard access or your local `.env` files loses these. |

**The practical takeaway:** unless you're on Supabase's paid plan, the database has zero automatic backup coverage, and uploaded files have zero backup coverage regardless of plan. Everything below assumes you're on the Free plan; if you've since upgraded to Pro, the daily-backup step in the runbook is redundant but still fine to do.

## 2. Manual backup procedure

### Database

A `pg_dump` script is included at `scripts/backup-database.sh`. It requires `pg_dump` (part of the standard Postgres client tools — `brew install libpq` on macOS, or via `apt install postgresql-client` on Linux).

```bash
# One-time: get your connection string from
# Supabase Dashboard > Project Settings > Database > Connection string (URI)
export SUPABASE_DB_URL="postgresql://postgres.xxxxx:[password]@xxxxx.supabase.com:5432/postgres"

./scripts/backup-database.sh
```

This writes a timestamped dump to `backups/` (gitignored — **never commit a real dump**, it contains student names, emails, and message content). Run it periodically — monthly is reasonable for a project at this scale, more often if the user base grows.

Restore a dump into a fresh Postgres database with:

```bash
pg_restore --clean --if-exists -d "$SUPABASE_DB_URL" backups/igknight_TIMESTAMP.dump
```

### Storage (uploaded files)

There's no bulk-export tool built into this project. For the current scale, the practical approach is downloading the contents of both buckets from the Supabase Dashboard (Storage tab) periodically, alongside the database dump. If the volume of files grows enough that this becomes impractical, revisit this with the [Supabase CLI's storage commands](https://supabase.com/docs/guides/cli) or the Storage API for a scripted export.

### Secrets

Keep a copy of every production environment variable (everything in `server/.env` and `client/.env` in their production values, not the local-dev ones) somewhere durable and secure — a password manager entry is the simplest option. Losing access to the Vercel/Render dashboards without a copy of these means regenerating API keys and OAuth credentials from scratch.

## 3. Recovery runbook

**Database corrupted or data lost (e.g. a bad migration, accidental mass delete):**
1. Restore the most recent dump with `pg_restore` (above) into the existing Supabase project, or a new one.
2. Anything created after that dump's timestamp is gone — this is the real cost of the Free plan's no-backup default. If that gap is ever unacceptable, upgrading to Supabase Pro for daily backups (and optionally the PITR add-on, priced separately) is the fix.

**Supabase project deleted or otherwise unusable:**
1. Create a new Supabase project.
2. Run every file in `supabase/migrations/` **in order** (001 through the latest) via the SQL Editor — this is the same process already used for every migration in this project, so it's a known-good path.
3. Restore the latest database dump with `pg_restore`.
4. Recreate the `chat-uploads` and `session-uploads` storage buckets (migrations 013 and 009 create these, and 019 sets their size/type limits — running the full migration set in step 2 already handles this) and re-upload files from your latest manual Storage export.
5. Update `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` in both Vercel and Render's environment variables to point at the new project, and redeploy both.

**Vercel or Render account/project lost:**
1. Both are stateless — no data lives there. Create a new project on the same (or a different) provider, following the setup steps in this README's Deployment section, and redeploy from the GitHub repo.

**GitHub repository lost or corrupted:**
1. Recover from the most recent local clone (yours, or any collaborator's) and push it to a new remote.
2. This is why it's worth occasionally confirming you have at least one up-to-date local clone outside of GitHub itself.

**Secrets lost (no dashboard access, no saved copy):**
1. Regenerate everything from source: a new Supabase service role key (Dashboard > Settings > API), a new Anthropic API key (console.anthropic.com), new Google OAuth credentials (console.cloud.google.com), and a new Sentry DSN if used.
2. Update Vercel and Render's environment variables and redeploy.

## 4. If this app grows beyond a class project

The Free-plan gaps here (no DB backups, no storage backups) are a reasonable tradeoff for a small, no-budget student project — but they're real gaps. If IgKnight ends up with a meaningful number of active UCF students actually depending on it, the first upgrade worth paying for is Supabase Pro, specifically for its daily automatic backups.
