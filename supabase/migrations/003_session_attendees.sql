-- ============================================================
-- session_attendees — tracks who RSVPs to a study session
-- ============================================================
CREATE TABLE IF NOT EXISTS public.session_attendees (
  id         UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID        REFERENCES public.sessions(id) ON DELETE CASCADE NOT NULL,
  user_id    UUID        REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(session_id, user_id)
);

ALTER TABLE public.session_attendees ENABLE ROW LEVEL SECURITY;

-- Group members can view attendees for sessions in their groups
CREATE POLICY "Group members can view session attendees"
  ON public.session_attendees FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.sessions s
      JOIN public.group_members gm ON gm.group_id = s.group_id
      WHERE s.id = session_attendees.session_id AND gm.user_id = auth.uid()
    )
  );

-- Authenticated users can RSVP to sessions in groups they belong to
CREATE POLICY "Users can RSVP to sessions"
  ON public.session_attendees FOR INSERT WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM public.sessions s
      JOIN public.group_members gm ON gm.group_id = s.group_id
      WHERE s.id = session_attendees.session_id AND gm.user_id = auth.uid()
    )
  );

-- Users can remove their own RSVP
CREATE POLICY "Users can remove own RSVP"
  ON public.session_attendees FOR DELETE USING (auth.uid() = user_id);
