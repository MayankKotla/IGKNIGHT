-- Sample questions: group members can contribute reference questions to a
-- session, which KnightCheck's AI generator uses as grounding material when
-- writing the actual quiz (in addition to the session's topics).
CREATE TABLE IF NOT EXISTS public.session_sample_questions (
  id            UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id    UUID        REFERENCES public.sessions(id) ON DELETE CASCADE NOT NULL,
  user_id       UUID        REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  content       TEXT,
  file_name     TEXT,
  file_size     BIGINT,
  file_type     TEXT,
  storage_path  TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  CONSTRAINT session_sample_questions_has_content CHECK (
    (content IS NOT NULL AND btrim(content) <> '') OR storage_path IS NOT NULL
  )
);

ALTER TABLE public.session_sample_questions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Group members can view sample questions" ON public.session_sample_questions;
CREATE POLICY "Group members can view sample questions"
  ON public.session_sample_questions FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.sessions s
      JOIN public.group_members gm ON gm.group_id = s.group_id
      WHERE s.id = session_sample_questions.session_id AND gm.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Group members can add sample questions" ON public.session_sample_questions;
CREATE POLICY "Group members can add sample questions"
  ON public.session_sample_questions FOR INSERT WITH CHECK (
    auth.uid() = user_id
  );

DROP POLICY IF EXISTS "Users can delete own sample questions" ON public.session_sample_questions;
CREATE POLICY "Users can delete own sample questions"
  ON public.session_sample_questions FOR DELETE USING (auth.uid() = user_id);

ALTER PUBLICATION supabase_realtime ADD TABLE public.session_sample_questions;
