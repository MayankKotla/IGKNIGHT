-- Chat attachments: let group members send a file or image alongside (or
-- instead of) text in group chat messages.
ALTER TABLE public.messages ALTER COLUMN content DROP NOT NULL;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS file_name TEXT;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS file_size BIGINT;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS file_type TEXT;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS storage_path TEXT;

ALTER TABLE public.messages
  DROP CONSTRAINT IF EXISTS messages_has_content;
ALTER TABLE public.messages
  ADD CONSTRAINT messages_has_content CHECK (
    (content IS NOT NULL AND btrim(content) <> '') OR storage_path IS NOT NULL
  );

-- Storage bucket for chat attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('chat-uploads', 'chat-uploads', false)
ON CONFLICT DO NOTHING;

DROP POLICY IF EXISTS "Authenticated users can upload chat files" ON storage.objects;
CREATE POLICY "Authenticated users can upload chat files"
  ON storage.objects FOR INSERT WITH CHECK (
    bucket_id = 'chat-uploads' AND auth.uid() IS NOT NULL
  );

DROP POLICY IF EXISTS "Authenticated users can view chat files" ON storage.objects;
CREATE POLICY "Authenticated users can view chat files"
  ON storage.objects FOR SELECT USING (
    bucket_id = 'chat-uploads' AND auth.uid() IS NOT NULL
  );

DROP POLICY IF EXISTS "Users can delete own chat files" ON storage.objects;
CREATE POLICY "Users can delete own chat files"
  ON storage.objects FOR DELETE USING (
    bucket_id = 'chat-uploads' AND owner = auth.uid()
  );
