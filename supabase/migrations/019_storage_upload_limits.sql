-- ============================================================
-- Enforce file type and size limits at the Storage layer itself,
-- not just in client-side JS.
--
-- Uploads go straight from the browser to Supabase Storage using the
-- user's own session (client.storage.from(...).upload(...)) — they
-- never pass through the Express server. Until now, the only checks
-- were plain JS constants (ALLOWED_ATTACHMENT_TYPES/MAX_ATTACHMENT_SIZE
-- in GroupChat.jsx, isAllowedType()/10MB in SessionDetail.jsx) checked
-- before the upload call, which do nothing to stop a request sent
-- directly via devtools or curl with the user's own auth token.
--
-- Setting file_size_limit and allowed_mime_types on the bucket itself
-- moves the real enforcement to Supabase's storage-api server, which
-- rejects a disallowed upload before it's ever stored — independent of
-- whatever the client claims. The client-side checks stay in place too,
-- purely for instant UX feedback without a round trip.
-- ============================================================

UPDATE storage.buckets
SET
  file_size_limit = 26214400, -- 25 MB, matches GroupChat.jsx's MAX_ATTACHMENT_SIZE
  allowed_mime_types = ARRAY[
    'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/heic', 'image/heif', 'image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain'
  ]
WHERE id = 'chat-uploads';

-- Also holds session_uploads AND session_sample_questions attachments
-- (both are cleaned up from this same bucket in groups.js's
-- deleteGroupWithCleanup) — 10 MB matches SessionDetail.jsx's client
-- cap, same allowed type list as chat uploads.
UPDATE storage.buckets
SET
  file_size_limit = 10485760, -- 10 MB
  allowed_mime_types = ARRAY[
    'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/heic', 'image/heif', 'image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain'
  ]
WHERE id = 'session-uploads';
