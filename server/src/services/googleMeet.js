const { v4: uuidv4 } = require('uuid')

const TIMEOUT_MS = 10000

async function createMeetLink({ title, startTime, endTime }) {
  const { google } = require('googleapis')
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    'http://localhost:3000'
  )
  oauth2Client.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN })

  try {
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client })

    const endTimeISO = endTime || new Date(new Date(startTime).getTime() + 60 * 60 * 1000).toISOString()

    const insertPromise = calendar.events.insert(
      {
        calendarId: 'primary',
        conferenceDataVersion: 1,
        requestBody: {
          summary: title,
          start: { dateTime: startTime },
          end: { dateTime: endTimeISO },
          conferenceData: {
            createRequest: {
              requestId: uuidv4(),
              conferenceSolutionKey: { type: 'hangoutsMeet' },
            },
          },
        },
      },
      { timeout: TIMEOUT_MS } // aborts the underlying HTTP request if Google doesn't respond in time
    )

    // Belt-and-suspenders: also race against a manual timeout, since the
    // implicit access-token refresh (a separate request google-auth-library
    // makes before the call above) doesn't respect the gaxios `timeout` option.
    const timeoutGuard = new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`Timed out after ${TIMEOUT_MS}ms — could not reach Google's servers (check network/firewall access to googleapis.com)`)), TIMEOUT_MS)
    )

    const response = await Promise.race([insertPromise, timeoutGuard])

    const uri = response.data.conferenceData?.entryPoints?.[0]?.uri
    if (!uri) throw new Error('No Meet URI in response')
    return uri
  } catch (err) {
    const details = err.response?.data?.error_description || err.response?.data?.error?.message || err.message
    console.error('[GoogleMeet] Failed to create Meet link:', details)
    if (err.response?.data) console.error('[GoogleMeet] Full error payload:', JSON.stringify(err.response.data))
    return null
  }
}

module.exports = { createMeetLink }
