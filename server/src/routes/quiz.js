const express = require('express')
const Anthropic = require('@anthropic-ai/sdk')
const { createClient } = require('@supabase/supabase-js')
const { requireAuth } = require('../middleware/auth')
const { quizGenerateLimiter, aiUtilityLimiter } = require('../middleware/rateLimit')
const { extractTextFromFile } = require('../services/extractText')

const router = express.Router()
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// Claude's vision input only accepts these image formats — HEIC/HEIF get
// referenced by filename instead, since they can't be read as either an
// image or a text document.
const VISION_MEDIA_TYPES = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'])
const MAX_VISION_IMAGES = 4

// Document types extractText.js can actually read. Legacy binary .doc/.ppt
// (application/msword, application/vnd.ms-powerpoint) aren't in this list —
// they fall back to filename-only reference.
const EXTRACTABLE_DOC_TYPES = new Set([
  'text/plain',
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
])
const MAX_DOCUMENT_EXTRACTS = 3

function makeClient(token) {
  return createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  )
}

async function downloadFile(db, storagePath) {
  const { data, error } = await db.storage.from('session-uploads').download(storagePath)
  if (error || !data) return null
  return Buffer.from(await data.arrayBuffer())
}

// POST /api/quiz/generate — generate (or return existing) quiz for a session
router.post('/generate', requireAuth, quizGenerateLimiter, async (req, res) => {
  const { session_id } = req.body
  if (!session_id) return res.status(400).json({ error: 'session_id required' })

  const db = makeClient(req.token)

  // Return existing quiz if already generated
  const { data: existing } = await db
    .from('quizzes')
    .select('*')
    .eq('session_id', session_id)
    .maybeSingle()

  if (existing) return res.json({ quiz: existing })

  // Fetch session with course info
  const { data: session, error: sessionErr } = await db
    .from('sessions')
    .select('*, group_id, topics, groups(id, courses(code, name))')
    .eq('id', session_id)
    .single()

  if (sessionErr || !session) return res.status(404).json({ error: 'Session not found' })

  // Verify group membership
  const { data: membership } = await db
    .from('group_members')
    .select('id')
    .eq('group_id', session.group_id)
    .eq('user_id', req.user.id)
    .maybeSingle()

  if (!membership) return res.status(403).json({ error: 'Not a member of this group' })

  const topics = session.topics || []
  if (topics.length === 0) return res.status(400).json({ error: 'Session has no topics defined' })

  const courseName = session.groups?.courses?.name || session.groups?.courses?.code || 'the course'

  // Sample questions/material group members contributed for this session, if
  // any — used as grounding so generated quizzes reflect what was actually
  // covered rather than generic topic trivia. Can be text, an attached photo
  // or file, or both.
  const { data: sampleQuestions } = await db
    .from('session_sample_questions')
    .select('content, file_name, file_type, storage_path')
    .eq('session_id', session_id)
    .order('created_at', { ascending: true })

  const textSamples = (sampleQuestions || []).filter(q => q.content)
  const imageSamples = (sampleQuestions || [])
    .filter(q => q.storage_path && VISION_MEDIA_TYPES.has((q.file_type || '').toLowerCase()))
    .slice(0, MAX_VISION_IMAGES)
  const extractableSamples = (sampleQuestions || [])
    .filter(q =>
      q.storage_path &&
      !VISION_MEDIA_TYPES.has((q.file_type || '').toLowerCase()) &&
      EXTRACTABLE_DOC_TYPES.has((q.file_type || '').toLowerCase())
    )
    .slice(0, MAX_DOCUMENT_EXTRACTS)
  const unreadableFileSamples = (sampleQuestions || [])
    .filter(q =>
      q.storage_path &&
      !VISION_MEDIA_TYPES.has((q.file_type || '').toLowerCase()) &&
      !EXTRACTABLE_DOC_TYPES.has((q.file_type || '').toLowerCase())
    )

  // Actually read the text out of attached PDFs/DOCX/PPTX/TXT files, rather
  // than just naming them — this is what makes them real grounding material.
  const documentTexts = []
  for (const doc of extractableSamples) {
    const buffer = await downloadFile(db, doc.storage_path)
    const text = buffer
      ? await extractTextFromFile({ buffer, fileType: doc.file_type, fileName: doc.file_name })
      : null
    if (text) {
      documentTexts.push({ fileName: doc.file_name, text })
    } else {
      unreadableFileSamples.push(doc)
    }
  }

  const referenceParts = []
  if (textSamples.length > 0) {
    referenceParts.push(textSamples.map((q, i) => `${i + 1}. ${q.content}`).join('\n'))
  }
  if (imageSamples.length > 0) {
    referenceParts.push(`${imageSamples.length} photo(s) of session material are attached below as images.`)
  }
  for (const doc of documentTexts) {
    referenceParts.push(`Document "${doc.fileName}":\n${doc.text}`)
  }
  if (unreadableFileSamples.length > 0) {
    referenceParts.push(`Group members also attached these files as reference (content not readable, but named for context): ${unreadableFileSamples.map(q => q.file_name).join(', ')}.`)
  }

  const referenceBlock = referenceParts.length > 0
    ? `\n\nGroup members submitted this reference material from the actual session:\n${referenceParts.join('\n\n')}\n\nUse this material to calibrate the accuracy, style, and difficulty of your questions — ground them in what was actually covered, including anything shown in attached images or documents. Do not simply copy or lightly reword the reference questions; write original multiple-choice questions inspired by them.`
    : ''

  try {
    const prompt = `You are an expert academic quiz writer creating a "KnightCheck" retention quiz for college students at UCF.

Course: ${courseName}
Topics covered in this study session: ${topics.join(', ')}${referenceBlock}

Write exactly 5 multiple-choice questions that test genuine conceptual understanding of these topics — not trivial recall, wording tricks, or ambiguous phrasing. Requirements for every question:
- Exactly 4 answer options, with exactly one unambiguously correct answer
- No "all of the above" / "none of the above" options
- Plausible, non-silly distractors (wrong options should reflect common misconceptions, not be obviously wrong)
- A concise, accurate explanation of why the correct answer is right
- Tagged with the specific topic (from the list above) it tests

Return valid JSON only, no markdown formatting or commentary, in this exact structure:
{ "questions": [ { "question": "string", "topic": "string (one of the topics listed above)", "options": ["string", "string", "string", "string"], "correct": 0, "explanation": "string" } ] }`

    // Attach any sample-question photos as vision input alongside the prompt.
    const imageBlocks = []
    for (const img of imageSamples) {
      const buffer = await downloadFile(db, img.storage_path)
      if (buffer) {
        const mediaType = img.file_type.toLowerCase() === 'image/jpg' ? 'image/jpeg' : img.file_type.toLowerCase()
        imageBlocks.push({ type: 'image', source: { type: 'base64', media_type: mediaType, data: buffer.toString('base64') } })
      }
    }

    const messageContent = imageBlocks.length > 0
      ? [...imageBlocks, { type: 'text', text: prompt }]
      : prompt

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2048,
      messages: [{ role: 'user', content: messageContent }],
    })

    let parsed
    try {
      parsed = JSON.parse(response.content[0].text.trim())
    } catch {
      return res.status(500).json({ error: 'AI returned invalid JSON' })
    }

    if (!Array.isArray(parsed.questions) || parsed.questions.length === 0) {
      return res.status(500).json({ error: 'AI returned unexpected quiz format' })
    }

    const { data: quiz, error: insertErr } = await db
      .from('quizzes')
      .insert({
        session_id,
        group_id: session.group_id,
        topics,
        questions: parsed.questions,
      })
      .select()
      .single()

    if (insertErr) return res.status(500).json({ error: insertErr.message })

    res.json({ quiz })
  } catch (err) {
    console.error('Quiz generation error:', err.message)
    res.status(500).json({ error: 'Failed to generate quiz' })
  }
})

// POST /api/quiz/study-tip — personalized AI tip after completing a quiz
router.post('/study-tip', requireAuth, aiUtilityLimiter, async (req, res) => {
  const { score, wrong_topics, course_name } = req.body

  if (!wrong_topics || wrong_topics.length === 0) {
    return res.json({ tip: "Perfect score! Keep reviewing to stay sharp — great retention comes from spaced repetition." })
  }

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 200,
      messages: [{
        role: 'user',
        content: `A UCF student scored ${score}/5 on a ${course_name || 'course'} quiz and struggled with: ${wrong_topics.join(', ')}. Give them one specific, actionable study tip in 1-2 sentences. Be encouraging and practical. No bullet points.`
      }],
    })
    res.json({ tip: response.content[0].text.trim() })
  } catch (err) {
    console.error('Study tip error:', err.message)
    res.status(500).json({ error: 'Failed to generate tip' })
  }
})

// GET /api/quiz/insights/:groupId — aggregated group KnightCheck stats + AI suggestion
router.get('/insights/:groupId', requireAuth, aiUtilityLimiter, async (req, res) => {
  const { groupId } = req.params
  const db = makeClient(req.token)

  // Verify membership
  const { data: membership } = await db
    .from('group_members')
    .select('id')
    .eq('group_id', groupId)
    .eq('user_id', req.user.id)
    .maybeSingle()

  if (!membership) return res.status(403).json({ error: 'Not a member' })

  const { data: quizzes } = await db
    .from('quizzes')
    .select('id, topics, questions')
    .eq('group_id', groupId)

  if (!quizzes || quizzes.length === 0) return res.json({ hasData: false })

  const quizIds = quizzes.map((q) => q.id)

  const { data: results } = await db
    .from('quiz_results')
    .select('quiz_id, user_id, score, answers')
    .in('quiz_id', quizIds)

  if (!results || results.length === 0) return res.json({ hasData: false })

  // Build quiz lookup
  const quizMap = {}
  for (const q of quizzes) quizMap[q.id] = q

  // Aggregate topic miss data (user_id sets for unique member counts)
  const topicMissByUser = {} // topic -> Set<user_id>
  const topicAttemptsByUser = {} // topic -> Set<user_id>

  for (const result of results) {
    const quiz = quizMap[result.quiz_id]
    if (!quiz) continue
    const answers = result.answers || []
    for (let i = 0; i < quiz.questions.length; i++) {
      const q = quiz.questions[i]
      const topic = q.topic || quiz.topics[i % quiz.topics.length] || 'Unknown'
      if (!topicAttemptsByUser[topic]) topicAttemptsByUser[topic] = new Set()
      topicAttemptsByUser[topic].add(result.user_id)
      if (answers[i] !== q.correct) {
        if (!topicMissByUser[topic]) topicMissByUser[topic] = new Set()
        topicMissByUser[topic].add(result.user_id)
      }
    }
  }

  // Format topic weakness list
  const totalUniqueMembers = new Set(results.map((r) => r.user_id)).size
  const topicWeakness = Object.entries(topicMissByUser).map(([topic, users]) => ({
    topic,
    membersStruggling: users.size,
    totalMembers: totalUniqueMembers,
  })).sort((a, b) => b.membersStruggling - a.membersStruggling)

  const avgScore = results.reduce((sum, r) => sum + r.score, 0) / results.length

  // AI-suggested focus topic based on weak areas
  const weakTopics = topicWeakness.slice(0, 3).map((t) => t.topic)
  let aiSuggestion = null
  if (weakTopics.length > 0) {
    try {
      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 200,
        messages: [{
          role: 'user',
          content: `A UCF study group (${totalUniqueMembers} members) has been struggling with: ${weakTopics.join(', ')}. Their group average KnightCheck score is ${avgScore.toFixed(1)}/5. Suggest one specific focus topic for their next session in 1-2 sentences. Be direct and actionable.`
        }],
      })
      aiSuggestion = response.content[0].text.trim()
    } catch (err) {
      console.error('Insights AI error:', err.message)
    }
  }

  res.json({
    hasData: true,
    avgScore: Math.round(avgScore * 10) / 10,
    totalResults: results.length,
    totalUniqueMembers,
    quizCount: quizzes.length,
    topicWeakness: topicWeakness.slice(0, 5),
    mostMissedTopic: topicWeakness[0]?.topic || null,
    aiSuggestion,
  })
})

module.exports = router
