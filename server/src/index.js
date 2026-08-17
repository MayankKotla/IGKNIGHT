require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') })
const express = require('express')
const cors = require('cors')
const helmet = require('helmet')
const Sentry = require('@sentry/node')

// No-ops entirely if SENTRY_DSN isn't set (e.g. local dev) — everything
// below just runs normally without it.
if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    // Low sample rate — this is a small app; the point is error
    // visibility, not detailed performance tracing.
    tracesSampleRate: 0.1,
  })
}

const { router: coursesRouter } = require('./routes/courses')
const groupsRouter = require('./routes/groups')
const quizRouter = require('./routes/quiz')
const sessionsRouter = require('./routes/sessions')
const accountRouter = require('./routes/account')

const app = express()
const PORT = process.env.PORT || 3001

app.use(helmet({
  // This is a pure cross-origin JSON API — the client runs on a different
  // origin (Vercel) by design. Helmet's default Cross-Origin-Resource-Policy
  // is 'same-origin', which would make browsers block the client's own
  // fetch() responses even though CORS allows them.
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}))
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
}))
app.use(express.json())

// Safety net: if a request never gets a response (e.g. a Supabase or
// googleapis call hangs on a network issue that an async route handler
// didn't catch — Express 4 doesn't catch promise rejections in async
// handlers automatically, so an uncaught one just hangs forever), respond
// with 503 instead of leaving the client's fetch pending indefinitely. This
// doesn't cancel the underlying stuck call, but it stops the user-facing
// symptom: a button stuck on "Loading…" with no way to know something's
// wrong.
app.use((req, res, next) => {
  const timer = setTimeout(() => {
    if (!res.headersSent) res.status(503).json({ error: 'Request timed out — please try again.' })
  }, 20000)
  res.on('finish', () => clearTimeout(timer))
  res.on('close', () => clearTimeout(timer))
  next()
})

app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'IgKnight API' }))

app.use('/api/courses', coursesRouter)
app.use('/api/groups', groupsRouter)
app.use('/api/quiz', quizRouter)
app.use('/api/sessions', sessionsRouter)
app.use('/api/account', accountRouter)

// Must be registered after all routes (so it only catches what they didn't
// handle) and before any custom error-handling middleware. No-ops if
// SENTRY_DSN isn't set, same as the init above.
if (process.env.SENTRY_DSN) {
  Sentry.setupExpressErrorHandler(app)
}

// Fallback JSON error handler — without this, an uncaught error past
// Sentry's handler falls through to Express's default HTML error page,
// which is a bad response for an API client to receive.
app.use((err, _req, res, _next) => {
  console.error(err)
  res.status(err.status || 500).json({ error: 'Internal server error' })
})

const server = app.listen(PORT, () => {
  console.log(`IgKnight server running on port ${PORT}`)
})

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} already in use — exiting so nodemon can retry`)
    process.exit(1)
  } else {
    throw err
  }
})
