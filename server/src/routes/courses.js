const express = require('express')
const { createClient } = require('@supabase/supabase-js')
const { requireAuth } = require('../middleware/auth')

const router = express.Router()

// anon client for public reads; admin client bypasses RLS for writes
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY)
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
)

const UCF_CODE_RE = /^[A-Z]{2,4}\s\d{4}[A-Z]?$/

function normalizeCourseCode(raw) {
  // Strip ALL whitespace first (not just collapse it) so any uneven spacing —
  // "COP  3502C", "COP 3502 C", "C OP3502C" — normalizes the same way, then
  // re-insert a single canonical space between the letter prefix and digits.
  const clean = raw.trim().toUpperCase().replace(/\s+/g, '')
  return clean.replace(/^([A-Z]{2,4})(\d{4}[A-Z]?)$/, '$1 $2')
}

// Public course listing with optional search/department filter
router.get('/', async (req, res) => {
  const { search, department } = req.query
  let query = supabase.from('courses').select('*').order('code')

  if (search) query = query.or(`code.ilike.%${search}%,name.ilike.%${search}%`)
  if (department) query = query.eq('department', department)

  const { data, error } = await query
  if (error) return res.status(500).json({ error: error.message })
  res.json(data)
})

// Preview endpoint — check if a course exists without creating it
// Used for live validation in the UI as the user types
router.get('/lookup', async (req, res) => {
  const raw = req.query.code
  if (!raw) return res.json({ course: null })

  const code = normalizeCourseCode(raw)
  if (!UCF_CODE_RE.test(code)) return res.json({ course: null, invalid: true })

  const { data } = await supabase
    .from('courses')
    .select('*')
    .eq('code', code)
    .maybeSingle()

  res.json({ course: data ?? null, normalizedCode: code })
})

// Find an existing course by code or create a minimal record — requires auth
router.post('/find-or-create', requireAuth, async (req, res) => {
  const raw = req.body.code
  if (!raw) return res.status(400).json({ error: 'Course code is required' })

  const code = normalizeCourseCode(raw)
  if (!UCF_CODE_RE.test(code)) {
    return res.status(400).json({
      error: 'Invalid UCF course code. Expected format: COP 3502C or MAC 2311',
    })
  }

  const { data: existing } = await supabase
    .from('courses')
    .select('*')
    .eq('code', code)
    .maybeSingle()

  if (existing) return res.json(existing)

  // Create minimal record — name and department will be enriched by the scraper later
  const prefix = code.split(' ')[0]
  const { data: created, error } = await supabaseAdmin
    .from('courses')
    .insert({ code, name: code, department: prefix })
    .select()
    .single()

  if (error) return res.status(500).json({ error: error.message })
  res.status(201).json(created)
})

router.get('/:id', async (req, res) => {
  const { data, error } = await supabase
    .from('courses')
    .select('*')
    .eq('id', req.params.id)
    .single()

  if (error) return res.status(404).json({ error: 'Course not found' })
  res.json(data)
})

module.exports = { router, normalizeCourseCode, UCF_CODE_RE }
