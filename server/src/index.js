require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') })
const express = require('express')
const cors = require('cors')

const aiRouter = require('./routes/ai')
const { router: coursesRouter } = require('./routes/courses')
const groupsRouter = require('./routes/groups')
const quizRouter = require('./routes/quiz')
const sessionsRouter = require('./routes/sessions')

const app = express()
const PORT = process.env.PORT || 3001

app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
}))
app.use(express.json())

app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'IgKnight API' }))

app.use('/api/ai', aiRouter)
app.use('/api/courses', coursesRouter)
app.use('/api/groups', groupsRouter)
app.use('/api/quiz', quizRouter)
app.use('/api/sessions', sessionsRouter)

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
