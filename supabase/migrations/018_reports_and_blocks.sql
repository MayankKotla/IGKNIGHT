-- Content moderation, scoped down deliberately: there's no admin/moderator
-- account concept anywhere in this app yet, so reports have nowhere to be
-- reviewed in-app. This adds the two things that don't require inventing
-- an admin system: reports get written to a table you can check directly
-- in the Supabase Table Editor, and blocking is fully self-service (a user
-- hiding another user's messages from their own view, no review needed).

-- ============================================================
-- reports — write-only from the client's perspective. No SELECT policy is
-- added on purpose: nobody (including the reporter) can read reports back
-- through the API, only via the Supabase dashboard with the service role.
-- That keeps report contents from being usable as a way to see who
-- reported whom.
-- ============================================================
CREATE TABLE IF NOT EXISTS public.reports (
  id                UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  reporter_id       UUID        REFERENCES public.users(id) ON DELETE SET NULL,
  reported_user_id  UUID        REFERENCES public.users(id) ON DELETE SET NULL,
  group_id          UUID        REFERENCES public.groups(id) ON DELETE CASCADE,
  message_id        UUID        REFERENCES public.messages(id) ON DELETE SET NULL,
  reason            TEXT        NOT NULL,
  details           TEXT,
  status            TEXT        DEFAULT 'open' CHECK (status IN ('open', 'reviewed', 'dismissed')) NOT NULL,
  created_at        TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Group members can file reports"
  ON public.reports FOR INSERT WITH CHECK (
    auth.uid() = reporter_id AND
    EXISTS (
      SELECT 1 FROM public.group_members
      WHERE group_id = reports.group_id AND user_id = auth.uid()
    )
  );

-- ============================================================
-- user_blocks — fully self-service; a user only ever manages their own
-- block list.
-- ============================================================
CREATE TABLE IF NOT EXISTS public.user_blocks (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  blocker_id  UUID        REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  blocked_id  UUID        REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(blocker_id, blocked_id),
  CHECK (blocker_id <> blocked_id)
);

ALTER TABLE public.user_blocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own block list"
  ON public.user_blocks FOR SELECT USING (auth.uid() = blocker_id);

CREATE POLICY "Users can block others"
  ON public.user_blocks FOR INSERT WITH CHECK (auth.uid() = blocker_id);

CREATE POLICY "Users can unblock"
  ON public.user_blocks FOR DELETE USING (auth.uid() = blocker_id);
