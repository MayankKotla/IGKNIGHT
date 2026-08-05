const express = require('express')
const Anthropic = require('@anthropic-ai/sdk')
const { requireAuth } = require('../middleware/auth')

const router = express.Router()
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const SYSTEM_PROMPT = `You are RetAIn, IgKnight's AI study assistant, helping UCF (University of Central Florida) students understand their course material.
You are knowledgeable, encouraging, and concise. Stick to academic topics — if asked something unrelated to coursework, politely redirect.
Help students understand concepts, work through problems, and prepare for exams.
Keep responses clear and well-structured. You are speaking to UCF college students.
When introducing yourself, say: "I'm RetAIn, your AI study assistant."`

router.post('/chat', requireAuth, async (req, res) => {
  const { message, history = [] } = req.body

  if (!message?.trim()) {
    return res.status(400).json({ error: 'Message is required' })
  }

  try {
    const messages = [
      ...history.slice(-10).map(({ role, content }) => ({ role, content })),
      { role: 'user', content: message },
    ]

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages,
    })

    res.json({ reply: response.content[0].text })
  } catch (err) {
    console.error('Claude API error:', err.message)
    res.status(500).json({ error: 'Failed to get AI response' })
  }
})

module.exports = router
