-- Add session_type to sessions table for Google Meet auto-generation
ALTER TABLE public.sessions
  ADD COLUMN IF NOT EXISTS session_type text DEFAULT 'in_person'
    CHECK (session_type IN ('in_person', 'hybrid', 'online'));
