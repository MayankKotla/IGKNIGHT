const rateLimit = require('express-rate-limit')

// Keys by authenticated user id (falls back to IP if somehow unauthenticated)
// so limits track a person, not a shared campus/NAT IP. In-memory store is
// fine for a single server instance — if this ever scales to multiple
// instances, swap in a shared store (e.g. rate-limit-redis).
function keyByUser(req) {
  return req.user?.id || req.ip
}

// RetAIn chat — the highest-traffic AI feature. Generous enough for real
// studying, tight enough to bound Anthropic API cost per person.
const chatLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  limit: 20,
  keyGenerator: keyByUser,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many messages to RetAIn — please wait a few minutes and try again.' },
})

// KnightCheck quiz generation — more expensive per call (longer prompt,
// bigger response), and each session only needs to generate one quiz.
const quizGenerateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  limit: 10,
  keyGenerator: keyByUser,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many quiz generation requests — please wait a while and try again.' },
})

// Study tips / group insights — small, cheap completions, but still real
// API calls worth capping.
const aiUtilityLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  limit: 40,
  keyGenerator: keyByUser,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests — please wait a while and try again.' },
})

module.exports = { chatLimiter, quizGenerateLimiter, aiUtilityLimiter }
