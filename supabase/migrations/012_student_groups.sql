-- Allow students (not just TAs) to create study groups, and split the
-- single "professor" text field into first/last name to reduce input
-- variability for the new (course, professor) duplicate-prevention check
-- enforced in the API layer (server/src/routes/groups.js).

-- ============================================================
-- Revert the TA-only INSERT policy from 008_ta_group_policy.sql —
-- any authenticated user can create a group again. Ownership is still
-- captured via created_by, set server-side from the authenticated user.
-- ============================================================
DROP POLICY IF EXISTS "Only TAs can create groups" ON public.groups;

CREATE POLICY "Authenticated users can create groups"
  ON public.groups FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================================
-- Split professor into first/last name
-- ============================================================
ALTER TABLE public.groups ADD COLUMN IF NOT EXISTS professor_first_name text;
ALTER TABLE public.groups ADD COLUMN IF NOT EXISTS professor_last_name text;

-- Backfill from the old free-text column: last space-separated token
-- becomes the last name, everything before it becomes the first name.
-- Single-word values (e.g. just "Smith") land entirely in last name.
UPDATE public.groups
SET
  professor_first_name = CASE
    WHEN professor IS NULL OR trim(professor) = '' THEN NULL
    WHEN position(' ' IN trim(professor)) = 0 THEN NULL
    ELSE trim(substring(trim(professor) FROM 1 FOR length(trim(professor)) - position(' ' IN reverse(trim(professor)))))
  END,
  professor_last_name = CASE
    WHEN professor IS NULL OR trim(professor) = '' THEN NULL
    WHEN position(' ' IN trim(professor)) = 0 THEN trim(professor)
    ELSE trim(substring(trim(professor) FROM length(trim(professor)) - position(' ' IN reverse(trim(professor))) + 2))
  END
WHERE professor_first_name IS NULL AND professor_last_name IS NULL;

ALTER TABLE public.groups DROP COLUMN IF EXISTS professor;
