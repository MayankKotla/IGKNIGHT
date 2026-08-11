-- Enforce each group's max_members cap at the database level. Until now
-- the cap was only checked client-side (GroupDiscoveryCard hides the Join
-- button once memberCount >= max_members) — nothing stopped a user from
-- calling Supabase directly to insert themselves into group_members past
-- that limit, and even through the normal UI there's a race window between
-- two people joining the last open spot at the same time.
--
-- SECURITY DEFINER so the max_members lookup isn't itself subject to the
-- "Anyone can view public groups" RLS policy (is_public = true) — without
-- it, joining a private (is_public = false) group would silently read no
-- row, leave cap NULL, and skip the check entirely. Same pattern already
-- used by validate_ucf_email() in 001_schema.sql.
CREATE OR REPLACE FUNCTION public.enforce_group_member_cap()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  cap SMALLINT;
  member_count INTEGER;
BEGIN
  SELECT max_members INTO cap FROM public.groups WHERE id = NEW.group_id;

  IF cap IS NOT NULL THEN
    SELECT COUNT(*) INTO member_count FROM public.group_members WHERE group_id = NEW.group_id;
    IF member_count >= cap THEN
      RAISE EXCEPTION 'This group is full (%/% members).', member_count, cap;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER enforce_group_member_cap
  BEFORE INSERT ON public.group_members
  FOR EACH ROW EXECUTE FUNCTION public.enforce_group_member_cap();
