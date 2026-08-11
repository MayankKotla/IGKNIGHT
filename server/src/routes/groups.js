const express = require('express')
const { createClient } = require('@supabase/supabase-js')
const { requireAuth } = require('../middleware/auth')
const { normalizeCourseCode, UCF_CODE_RE } = require('./courses')

const router = express.Router()
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY)
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
)

async function resolveCourseId(courseCode) {
  const code = normalizeCourseCode(courseCode)
  if (!UCF_CODE_RE.test(code)) return { error: 'Invalid UCF course code format' }

  const { data: existing } = await supabase
    .from('courses')
    .select('id')
    .eq('code', code)
    .maybeSingle()

  if (existing) return { id: existing.id }

  const prefix = code.split(' ')[0]
  const { data: created, error } = await supabaseAdmin
    .from('courses')
    .insert({ code, name: code, department: prefix })
    .select('id')
    .single()

  if (error) return { error: error.message }
  return { id: created.id }
}

router.get('/', async (req, res) => {
  const { course_id } = req.query
  let query = supabase
    .from('groups')
    .select('*, courses(code, name)')
    .eq('is_public', true)
    .order('created_at', { ascending: false })

  if (course_id) query = query.eq('course_id', course_id)

  const { data, error } = await query
  if (error) return res.status(500).json({ error: error.message })
  res.json(data)
})

router.post('/', requireAuth, async (req, res) => {
  const {
    name,
    description,
    professor_first_name,
    professor_last_name,
    course_code,
    course_id: rawCourseId,
    is_public,
  } = req.body
  const MAX_MEMBERS = 200

  if (!name?.trim()) return res.status(400).json({ error: 'Group name is required' })
  if (!professor_first_name?.trim() || !professor_last_name?.trim()) {
    return res.status(400).json({ error: "Professor's first and last name are required" })
  }
  if (!course_code?.trim() && !rawCourseId) return res.status(400).json({ error: 'Course code is required' })

  let course_id = rawCourseId ?? null

  if (course_code && !course_id) {
    const result = await resolveCourseId(course_code)
    if (result.error) return res.status(400).json({ error: result.error })
    course_id = result.id
  }

  const firstName = professor_first_name.trim()
  const lastName = professor_last_name.trim()

  // Duplicate-prevention: block only if a group already exists for the same
  // course AND the same professor (matched case-insensitively). A group with
  // the same course but a different professor, or the same professor but a
  // different course, is allowed.
  const { data: duplicate } = await supabaseAdmin
    .from('groups')
    .select('id')
    .eq('course_id', course_id)
    .ilike('professor_first_name', firstName)
    .ilike('professor_last_name', lastName)
    .limit(1)
    .maybeSingle()

  if (duplicate) {
    return res.status(409).json({
      error: 'A group already exists for this course and professor. Head to Discover to join it instead.',
      code: 'DUPLICATE_GROUP',
    })
  }

  const { data: group, error: groupError } = await supabaseAdmin
    .from('groups')
    .insert({
      name: name.trim(),
      description,
      professor_first_name: firstName,
      professor_last_name: lastName,
      course_id,
      max_members: MAX_MEMBERS,
      is_public: is_public ?? true,
      created_by: req.user.id,
    })
    .select('*, courses(code, name)')
    .single()

  if (groupError) return res.status(500).json({ error: groupError.message })

  await supabaseAdmin
    .from('group_members')
    .insert({ group_id: group.id, user_id: req.user.id, role: 'owner' })

  res.status(201).json(group)
})

router.get('/:id', async (req, res) => {
  const { data, error } = await supabase
    .from('groups')
    .select('*, courses(code, name), group_members(user_id, role)')
    .eq('id', req.params.id)
    .single()

  if (error) return res.status(404).json({ error: 'Group not found' })
  res.json(data)
})

// Cleans up a group's Supabase Storage objects — chat attachments, session
// uploads, and sample-question attachments — then deletes the group row.
// Storage lives outside Postgres and would otherwise be orphaned once the
// DB rows cascade-delete, since every other table referencing groups(id)
// or sessions(id) already has ON DELETE CASCADE. Exported so both DELETE
// /:id below and the account-deletion route (which deletes any groups the
// account owns before deleting the account itself) share one code path
// instead of two copies of the same cleanup logic.
async function deleteGroupWithCleanup(groupId) {
  const { data: sessionRows } = await supabaseAdmin
    .from('sessions')
    .select('id')
    .eq('group_id', groupId)
  const sessionIds = (sessionRows || []).map((s) => s.id)

  const [{ data: chatFiles }, { data: uploadFiles }, { data: sampleQuestionFiles }] = await Promise.all([
    supabaseAdmin.from('messages').select('storage_path').eq('group_id', groupId).not('storage_path', 'is', null),
    supabaseAdmin.from('session_uploads').select('storage_path').eq('group_id', groupId).not('storage_path', 'is', null),
    sessionIds.length
      ? supabaseAdmin.from('session_sample_questions').select('storage_path').in('session_id', sessionIds).not('storage_path', 'is', null)
      : Promise.resolve({ data: [] }),
  ])

  const chatPaths = (chatFiles || []).map((r) => r.storage_path)
  const sessionUploadPaths = [
    ...(uploadFiles || []).map((r) => r.storage_path),
    ...(sampleQuestionFiles || []).map((r) => r.storage_path),
  ]

  // Storage cleanup happens before the row delete, but isn't allowed to
  // block it — a failed remove() here (e.g. a path already gone) shouldn't
  // leave the group stuck and undeletable. Errors are logged, not thrown.
  await Promise.all([
    chatPaths.length ? supabaseAdmin.storage.from('chat-uploads').remove(chatPaths) : Promise.resolve(),
    sessionUploadPaths.length ? supabaseAdmin.storage.from('session-uploads').remove(sessionUploadPaths) : Promise.resolve(),
  ]).catch((err) => console.error(`Group ${groupId} deletion: storage cleanup failed`, err))

  return supabaseAdmin.from('groups').delete().eq('id', groupId)
}

// DELETE /:id — owner deletes the group entirely. Done as a server route
// (rather than a plain RLS-gated client delete, the way "leave group" and
// "kick member" work) specifically so deleteGroupWithCleanup's storage
// cleanup always runs.
router.delete('/:id', requireAuth, async (req, res) => {
  const { id: groupId } = req.params

  const { data: group, error: groupErr } = await supabaseAdmin
    .from('groups')
    .select('id, created_by')
    .eq('id', groupId)
    .single()

  if (groupErr || !group) return res.status(404).json({ error: 'Group not found' })
  if (group.created_by !== req.user.id) {
    return res.status(403).json({ error: 'Only the group owner can delete this group' })
  }

  const { error: deleteErr } = await deleteGroupWithCleanup(groupId)
  if (deleteErr) return res.status(500).json({ error: deleteErr.message })

  res.json({ success: true })
})

module.exports = router
module.exports.deleteGroupWithCleanup = deleteGroupWithCleanup
module.exports.supabaseAdmin = supabaseAdmin
