const express = require('express')
const { createClient } = require('@supabase/supabase-js')
const { createMeetLink } = require('../services/googleMeet')
const { requireAuth } = require('../middleware/auth')

const router = express.Router()
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

// POST / — create session
router.post('/', async (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '')
  if (!token) return res.status(401).json({ error: 'Unauthorized' })

  const { data: { user }, error: authErr } = await supabase.auth.getUser(token)
  if (authErr || !user) return res.status(401).json({ error: 'Unauthorized' })

  const { group_id, title, description, start_time, end_time, session_type = 'in_person', location, topics } = req.body

  if (!group_id || !title?.trim() || !start_time) {
    return res.status(400).json({ error: 'group_id, title, and start_time are required' })
  }
  if (!['in_person', 'hybrid', 'online'].includes(session_type)) {
    return res.status(400).json({ error: 'Invalid session_type' })
  }

  // This route uses the service-role client (bypasses RLS), so membership
  // must be checked explicitly — otherwise any authenticated user could
  // create a session in a group they don't belong to.
  const { data: membership } = await supabase
    .from('group_members')
    .select('id')
    .eq('group_id', group_id)
    .eq('user_id', user.id)
    .maybeSingle()

  if (!membership) return res.status(403).json({ error: 'Not a group member' })

  let meeting_url = null
  let meet_link_failed = false

  if (session_type === 'hybrid' || session_type === 'online') {
    meeting_url = await createMeetLink({ title: title.trim(), startTime: start_time, endTime: end_time })
    if (!meeting_url) meet_link_failed = true
  }

  const { data, error: dbErr } = await supabase
    .from('sessions')
    .insert({
      group_id,
      title: title.trim(),
      description: description?.trim() || null,
      start_time,
      end_time: end_time || null,
      session_type,
      is_virtual: session_type === 'online' || session_type === 'hybrid',
      location: session_type !== 'online' ? (location?.trim() || null) : null,
      meeting_url,
      created_by: user.id,
      topics: topics || [],
    })
    .select('*, groups(id, name, courses(code))')
    .single()

  if (dbErr) return res.status(500).json({ error: dbErr.message })

  return res.json({ session: data, ...(meet_link_failed && { meet_link_failed: true }) })
})

// GET /:sessionId — full session details
router.get('/:sessionId', requireAuth, async (req, res) => {
  const { sessionId } = req.params

  const { data: session, error } = await supabase
    .from('sessions')
    .select('*, groups(id, name, courses(code, name))')
    .eq('id', sessionId)
    .single()

  if (error || !session) return res.status(404).json({ error: 'Session not found' })

  const { data: membership } = await supabase
    .from('group_members')
    .select('id')
    .eq('group_id', session.group_id)
    .eq('user_id', req.user.id)
    .single()

  if (!membership) return res.status(403).json({ error: 'Not a group member' })

  const [{ data: creator }, { data: attendees }] = await Promise.all([
    supabase.from('users').select('id, full_name, email').eq('id', session.created_by).single(),
    supabase.from('session_attendees').select('user_id, users(full_name, email)').eq('session_id', sessionId),
  ])

  return res.json({
    ...session,
    creator: creator || null,
    attendees: (attendees || []).map(a => ({ user_id: a.user_id, ...a.users })),
  })
})

// POST /:sessionId/rsvp
router.post('/:sessionId/rsvp', requireAuth, async (req, res) => {
  const { sessionId } = req.params

  const { data: session } = await supabase
    .from('sessions').select('group_id').eq('id', sessionId).single()

  if (!session) return res.status(404).json({ error: 'Session not found' })

  const { data: membership } = await supabase
    .from('group_members')
    .select('id')
    .eq('group_id', session.group_id)
    .eq('user_id', req.user.id)
    .single()

  if (!membership) return res.status(403).json({ error: 'Not a group member' })

  const { error } = await supabase
    .from('session_attendees')
    .insert({ session_id: sessionId, user_id: req.user.id })

  if (error && error.code !== '23505') return res.status(500).json({ error: error.message })

  return res.json({ success: true })
})

// DELETE /:sessionId/rsvp
router.delete('/:sessionId/rsvp', requireAuth, async (req, res) => {
  const { sessionId } = req.params

  const { error } = await supabase
    .from('session_attendees')
    .delete()
    .eq('session_id', sessionId)
    .eq('user_id', req.user.id)

  if (error) return res.status(500).json({ error: error.message })
  return res.json({ success: true })
})

// GET /:sessionId/notes
router.get('/:sessionId/notes', requireAuth, async (req, res) => {
  const { sessionId } = req.params

  const { data: session } = await supabase
    .from('sessions').select('group_id').eq('id', sessionId).single()

  if (!session) return res.status(404).json({ error: 'Session not found' })

  const { data: membership } = await supabase
    .from('group_members')
    .select('id')
    .eq('group_id', session.group_id)
    .eq('user_id', req.user.id)
    .single()

  if (!membership) return res.status(403).json({ error: 'Not a group member' })

  const { data: notes, error } = await supabase
    .from('session_notes')
    .select('*, users(full_name, email)')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: false })

  if (error) return res.status(500).json({ error: error.message })
  return res.json(notes || [])
})

// POST /:sessionId/notes
router.post('/:sessionId/notes', requireAuth, async (req, res) => {
  const { sessionId } = req.params
  const { content } = req.body

  if (!content?.trim() || content.trim().length < 10) {
    return res.status(400).json({ error: 'Note must be at least 10 characters' })
  }

  const { data: session } = await supabase
    .from('sessions').select('group_id').eq('id', sessionId).single()

  if (!session) return res.status(404).json({ error: 'Session not found' })

  const { data: membership } = await supabase
    .from('group_members')
    .select('id')
    .eq('group_id', session.group_id)
    .eq('user_id', req.user.id)
    .maybeSingle()

  if (!membership) return res.status(403).json({ error: 'Not a group member' })

  const { data: note, error } = await supabase
    .from('session_notes')
    .insert({ session_id: sessionId, user_id: req.user.id, content: content.trim() })
    .select('*, users(full_name, email)')
    .single()

  if (error) return res.status(500).json({ error: error.message })
  return res.json(note)
})

// DELETE /:sessionId/notes/:noteId
router.delete('/:sessionId/notes/:noteId', requireAuth, async (req, res) => {
  const { noteId } = req.params

  const { data: note } = await supabase
    .from('session_notes').select('user_id').eq('id', noteId).single()

  if (!note) return res.status(404).json({ error: 'Note not found' })
  if (note.user_id !== req.user.id) return res.status(403).json({ error: 'Not your note' })

  const { error } = await supabase
    .from('session_notes').delete().eq('id', noteId)

  if (error) return res.status(500).json({ error: error.message })
  return res.json({ success: true })
})

// GET /:sessionId/uploads
router.get('/:sessionId/uploads', requireAuth, async (req, res) => {
  const { sessionId } = req.params

  const { data: session } = await supabase
    .from('sessions').select('group_id').eq('id', sessionId).single()

  if (!session) return res.status(404).json({ error: 'Session not found' })

  const { data: membership } = await supabase
    .from('group_members')
    .select('id')
    .eq('group_id', session.group_id)
    .eq('user_id', req.user.id)
    .single()

  if (!membership) return res.status(403).json({ error: 'Not a group member' })

  const { data: uploads, error } = await supabase
    .from('session_uploads')
    .select('*, users(full_name, email)')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true })

  if (error) return res.status(500).json({ error: error.message })
  return res.json(uploads || [])
})

// POST /:sessionId/uploads — save metadata after Supabase Storage upload
router.post('/:sessionId/uploads', requireAuth, async (req, res) => {
  const { sessionId } = req.params
  const { file_name, file_size, file_type, storage_path } = req.body

  if (!file_name || !file_size || !file_type || !storage_path) {
    return res.status(400).json({ error: 'Missing required fields' })
  }

  const { data: session } = await supabase
    .from('sessions').select('group_id').eq('id', sessionId).single()

  if (!session) return res.status(404).json({ error: 'Session not found' })

  const { data: membership } = await supabase
    .from('group_members')
    .select('id')
    .eq('group_id', session.group_id)
    .eq('user_id', req.user.id)
    .maybeSingle()

  if (!membership) return res.status(403).json({ error: 'Not a group member' })

  // group_id is derived from the session itself, not trusted from the
  // client, so an upload can't be mis-tagged to a different group.
  const { data: upload, error } = await supabase
    .from('session_uploads')
    .insert({ session_id: sessionId, group_id: session.group_id, user_id: req.user.id, file_name, file_size, file_type, storage_path })
    .select('*, users(full_name, email)')
    .single()

  if (error) return res.status(500).json({ error: error.message })
  return res.json(upload)
})

// DELETE /:sessionId/uploads/:uploadId
router.delete('/:sessionId/uploads/:uploadId', requireAuth, async (req, res) => {
  const { uploadId } = req.params

  const { data: upload } = await supabase
    .from('session_uploads').select('user_id, storage_path').eq('id', uploadId).single()

  if (!upload) return res.status(404).json({ error: 'Upload not found' })
  if (upload.user_id !== req.user.id) return res.status(403).json({ error: 'Not your upload' })

  await supabase.storage.from('session-uploads').remove([upload.storage_path])

  const { error } = await supabase
    .from('session_uploads').delete().eq('id', uploadId)

  if (error) return res.status(500).json({ error: error.message })
  return res.json({ success: true })
})

module.exports = router
