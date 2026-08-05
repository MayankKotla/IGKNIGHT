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
  const { data: profile } = await supabaseAdmin
    .from('users')
    .select('ucf_role')
    .eq('id', req.user.id)
    .single()

  if (!profile || profile.ucf_role !== 'ta') {
    return res.status(403).json({ error: 'Only Teaching Assistants can create groups.' })
  }

  const { name, description, professor, course_code, course_id: rawCourseId, max_members, is_public } = req.body

  if (!name?.trim()) return res.status(400).json({ error: 'Group name is required' })

  let course_id = rawCourseId ?? null

  if (course_code && !course_id) {
    const result = await resolveCourseId(course_code)
    if (result.error) return res.status(400).json({ error: result.error })
    course_id = result.id
  }

  const { data: group, error: groupError } = await supabaseAdmin
    .from('groups')
    .insert({
      name: name.trim(),
      description,
      professor: professor?.trim() || null,
      course_id,
      max_members: max_members || 10,
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

module.exports = router
