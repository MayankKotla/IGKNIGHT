-- Session Notes table
CREATE TABLE IF NOT EXISTS public.session_notes (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id  UUID        REFERENCES public.sessions(id) ON DELETE CASCADE NOT NULL,
  user_id     UUID        REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  content     TEXT        NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at  TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

ALTER TABLE public.session_notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Group members can view session notes" ON public.session_notes;
CREATE POLICY "Group members can view session notes"
  ON public.session_notes FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.sessions s
      JOIN public.group_members gm ON gm.group_id = s.group_id
      WHERE s.id = session_notes.session_id AND gm.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Group members can add session notes" ON public.session_notes;
CREATE POLICY "Group members can add session notes"
  ON public.session_notes FOR INSERT WITH CHECK (
    auth.uid() = user_id
  );

DROP POLICY IF EXISTS "Users can delete own notes" ON public.session_notes;
CREATE POLICY "Users can delete own notes"
  ON public.session_notes FOR DELETE USING (auth.uid() = user_id);

ALTER PUBLICATION supabase_realtime ADD TABLE public.session_notes;

-- Session Uploads table (tracks metadata)
CREATE TABLE IF NOT EXISTS public.session_uploads (
  id            UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id    UUID        REFERENCES public.sessions(id) ON DELETE CASCADE NOT NULL,
  group_id      UUID        REFERENCES public.groups(id) ON DELETE CASCADE NOT NULL,
  user_id       UUID        REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  file_name     TEXT        NOT NULL,
  file_size     BIGINT      NOT NULL,
  file_type     TEXT        NOT NULL,
  storage_path  TEXT        NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

ALTER TABLE public.session_uploads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Group members can view uploads" ON public.session_uploads;
CREATE POLICY "Group members can view uploads"
  ON public.session_uploads FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.group_members
      WHERE group_id = session_uploads.group_id AND user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Group members can add uploads" ON public.session_uploads;
CREATE POLICY "Group members can add uploads"
  ON public.session_uploads FOR INSERT WITH CHECK (
    auth.uid() = user_id
  );

DROP POLICY IF EXISTS "Users can delete own uploads" ON public.session_uploads;
CREATE POLICY "Users can delete own uploads"
  ON public.session_uploads FOR DELETE USING (auth.uid() = user_id);

ALTER PUBLICATION supabase_realtime ADD TABLE public.session_uploads;

-- Storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('session-uploads', 'session-uploads', false)
ON CONFLICT DO NOTHING;

DROP POLICY IF EXISTS "Authenticated users can upload" ON storage.objects;
CREATE POLICY "Authenticated users can upload"
  ON storage.objects FOR INSERT WITH CHECK (
    bucket_id = 'session-uploads' AND auth.uid() IS NOT NULL
  );

DROP POLICY IF EXISTS "Authenticated users can view uploads" ON storage.objects;
CREATE POLICY "Authenticated users can view uploads"
  ON storage.objects FOR SELECT USING (
    bucket_id = 'session-uploads' AND auth.uid() IS NOT NULL
  );

DROP POLICY IF EXISTS "Users can delete own uploads" ON storage.objects;
CREATE POLICY "Users can delete own uploads"
  ON storage.objects FOR DELETE USING (
    bucket_id = 'session-uploads' AND owner = auth.uid()
  );
