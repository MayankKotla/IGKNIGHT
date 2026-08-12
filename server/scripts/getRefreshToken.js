require('dotenv').config({ path: require('path').join(__dirname, '../.env') })
const { google } = require('googleapis')
const express = require('express')

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  'http://localhost:3000'
)

const authUrl = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  prompt: 'consent',
  scope: [
    'https://www.googleapis.com/auth/calendar.events',
    // Needed to patch Meet spaces created via Calendar to accessType OPEN
    // (so group members can join without being let in one-by-one).
    'https://www.googleapis.com/auth/meetings.space.settings',
  ],
})

async function run() {
  const openModule = await import('open')
  const open = openModule.default

  const app = express()
  const server = app.listen(3000, () => {
    console.log('\nOpening browser for Google authorization...')
    open(authUrl)
  })

  app.get('/', async (req, res) => {
    const { code } = req.query
    if (!code) {
      res.send('No authorization code received.')
      return
    }
    try {
      const { tokens } = await oauth2Client.getToken(code)
      res.send('<h1 style="font-family:sans-serif;padding:2rem;color:#222">Authorization successful! You can close this window.</h1>')
      console.log('\n===============================================')
      console.log('✓ Authorization successful!')
      console.log('Copy your refresh token below and add it to ')
      console.log('server/.env as GOOGLE_REFRESH_TOKEN=\n')
      console.log('YOUR REFRESH TOKEN:')
      console.log(tokens.refresh_token)
      console.log('===============================================\n')
    } catch (err) {
      console.error('Failed to get tokens:', err.message)
      res.send('Error: ' + err.message)
    }
    server.close()
  })
}

run()
