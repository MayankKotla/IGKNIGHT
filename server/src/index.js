require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') })
const express = require('express')
const cors = require('cors')
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

app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
}))
app.use(express.json())

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
