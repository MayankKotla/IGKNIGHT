-- ============================================================
-- KnightCheck: AI post-session quiz system
-- ============================================================

-- Topics array on sessions (what will be covered)
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS topics text[] DEFAULT '{}';

-- One quiz per session, shared by all members
CREATE TABLE IF NOT EXISTS public.quizzes (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id  UUID        REFERENCES public.sessions(id) ON DELETE CASCADE NOT NULL UNIQUE,
  group_id    UUID        REFERENCES public.groups(id) ON DELETE CASCADE NOT NULL,
  topics      text[]      NOT NULL DEFAULT '{}',
  questions   JSONB       NOT NULL DEFAULT '[]',
  created_at  TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Group members can view quizzes"
  ON public.quizzes FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.group_members
      WHERE group_id = quizzes.group_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Authenticated users can create quizzes"
  ON public.quizzes FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Individual member quiz results
CREATE TABLE IF NOT EXISTS public.quiz_results (
  id           UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  quiz_id      UUID        REFERENCES public.quizzes(id) ON DELETE CASCADE NOT NULL,
  user_id      UUID        REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  answers      JSONB       NOT NULL DEFAULT '[]',
  score        SMALLINT    NOT NULL DEFAULT 0,
  completed_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(quiz_id, user_id)
);

ALTER TABLE public.quiz_results ENABLE ROW LEVEL SECURITY;

-- Group members can view results for their group's quizzes (for insights + own history)
CREATE POLICY "Group members can view quiz results"
  ON public.quiz_results FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.quizzes q
      JOIN public.group_members gm ON gm.group_id = q.group_id
      WHERE q.id = quiz_results.quiz_id AND gm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own results"
  ON public.quiz_results FOR INSERT WITH CHECK (auth.uid() = user_id);
