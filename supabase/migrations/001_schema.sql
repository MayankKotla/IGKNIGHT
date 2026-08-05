-- ============================================================
-- IgKnight — Initial Schema
-- Run this in the Supabase SQL Editor (Dashboard > SQL Editor)
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- UCF email domain enforcement
-- Blocks signups from non-UCF addresses at the database level
-- ============================================================
CREATE OR REPLACE FUNCTION public.validate_ucf_email()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.email IS NOT NULL
    AND NEW.email NOT LIKE '%@ucf.edu'
    AND NEW.email NOT LIKE '%@knights.ucf.edu'
  THEN
    RAISE EXCEPTION 'Only UCF email addresses (@ucf.edu or @knights.ucf.edu) are allowed.';
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER enforce_ucf_email
  BEFORE INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.validate_ucf_email();

-- ============================================================
-- users (public profile, mirrors auth.users)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.users (
  id            UUID        REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email         TEXT        NOT NULL,
  full_name     TEXT,
  avatar_url    TEXT,
  major         TEXT,
  graduation_year SMALLINT,
  created_at    TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at    TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all profiles"
  ON public.users FOR SELECT USING (true);

CREATE POLICY "Users can update own profile"
  ON public.users FOR UPDATE USING (auth.uid() = id);

-- Auto-create profile row when a new auth user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- courses
-- ============================================================
CREATE TABLE IF NOT EXISTS public.courses (
  id          SERIAL      PRIMARY KEY,
  code        TEXT        NOT NULL UNIQUE,
  name        TEXT        NOT NULL,
  department  TEXT        NOT NULL,
  credits     SMALLINT    DEFAULT 3,
  created_at  TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view courses"
  ON public.courses FOR SELECT USING (true);

-- ============================================================
-- groups
-- ============================================================
CREATE TABLE IF NOT EXISTS public.groups (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  name        TEXT        NOT NULL,
  description TEXT,
  course_id   INTEGER     REFERENCES public.courses(id) ON DELETE SET NULL,
  created_by  UUID        REFERENCES public.users(id) ON DELETE SET NULL,
  max_members SMALLINT    DEFAULT 10,
  is_public   BOOLEAN     DEFAULT true NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at  TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view public groups"
  ON public.groups FOR SELECT USING (is_public = true);

CREATE POLICY "Authenticated users can create groups"
  ON public.groups FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Group owner can update group"
  ON public.groups FOR UPDATE USING (auth.uid() = created_by);

-- ============================================================
-- group_members
-- ============================================================
CREATE TABLE IF NOT EXISTS public.group_members (
  id        UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id  UUID        REFERENCES public.groups(id) ON DELETE CASCADE NOT NULL,
  user_id   UUID        REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  role      TEXT        DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')) NOT NULL,
  joined_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(group_id, user_id)
);

ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view group members"
  ON public.group_members FOR SELECT USING (true);

CREATE POLICY "Authenticated users can join groups"
  ON public.group_members FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can leave groups"
  ON public.group_members FOR DELETE USING (auth.uid() = user_id);

-- ============================================================
-- messages
-- ============================================================
CREATE TABLE IF NOT EXISTS public.messages (
  id        UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id  UUID        REFERENCES public.groups(id) ON DELETE CASCADE NOT NULL,
  user_id   UUID        REFERENCES public.users(id) ON DELETE SET NULL,
  content   TEXT        NOT NULL,
  type      TEXT        DEFAULT 'text' CHECK (type IN ('text', 'ai', 'system')) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Group members can read messages"
  ON public.messages FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.group_members
      WHERE group_id = messages.group_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Group members can send messages"
  ON public.messages FOR INSERT WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM public.group_members
      WHERE group_id = messages.group_id AND user_id = auth.uid()
    )
  );

-- ============================================================
-- sessions (study sessions)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.sessions (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id    UUID        REFERENCES public.groups(id) ON DELETE CASCADE NOT NULL,
  title       TEXT        NOT NULL,
  description TEXT,
  start_time  TIMESTAMPTZ NOT NULL,
  end_time    TIMESTAMPTZ,
  location    TEXT,
  is_virtual  BOOLEAN     DEFAULT false NOT NULL,
  meeting_url TEXT,
  created_by  UUID        REFERENCES public.users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Group members can view sessions"
  ON public.sessions FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.group_members
      WHERE group_id = sessions.group_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Group members can create sessions"
  ON public.sessions FOR INSERT WITH CHECK (
    auth.uid() = created_by AND
    EXISTS (
      SELECT 1 FROM public.group_members
      WHERE group_id = sessions.group_id AND user_id = auth.uid()
    )
  );

-- ============================================================
-- Enable Realtime for live chat and membership updates
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.group_members;
