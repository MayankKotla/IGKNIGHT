-- ============================================================
-- Make end_time mandatory on sessions, and enable Realtime for the
-- table (it was never added to the supabase_realtime publication, so
-- session creation never pushed to other members' clients — they only
-- saw a newly scheduled session after a manual refresh).
--
-- end_time being mandatory lets the client reliably compute an
-- "Ongoing" bucket (start_time <= now < end_time) instead of a session
-- falling straight into "Past" the moment its start_time passes
-- because there was no end_time to compare against.
-- ============================================================

-- Backfill existing rows that predate this requirement. 1 hour matches
-- the fallback duration server/src/services/googleMeet.js already uses
-- when generating a Meet link for a session with no end_time.
UPDATE public.sessions
SET end_time = start_time + INTERVAL '1 hour'
WHERE end_time IS NULL;

ALTER TABLE public.sessions
  ALTER COLUMN end_time SET NOT NULL;

ALTER PUBLICATION supabase_realtime ADD TABLE public.sessions;
