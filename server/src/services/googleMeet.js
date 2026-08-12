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

    // A Meet created this way defaults to requiring the host to manually let
    // each guest in ("knocking"), since group members aren't added as
    // calendar attendees. Patch the space to accessType OPEN so anyone with
    // the link can join directly once the session starts. This is
    // best-effort: if it fails (missing OAuth scope, Meet API not enabled,
    // etc.) the Meet link itself still works fine — guests just have to be
    // let in manually — so a failure here must not fail session creation.
    try {
      const withTimeout = (promise, label) => Promise.race([
        promise,
        new Promise((_, reject) => setTimeout(() => reject(new Error(`Timed out ${label}`)), TIMEOUT_MS)),
      ])

      const meetingCode = new URL(uri).pathname.replace(/^\//, '')

      // The Meet API's PATCH method only accepts the canonical
      // spaces/{space} resource name — the meetingCode alias (which is all
      // we get back from the Calendar API) works for GET but is rejected by
      // PATCH with a "Permission denied" error. So resolve the real name
      // via GET first.
      const spaceRes = await withTimeout(
        oauth2Client.request({ url: `https://meet.googleapis.com/v2/spaces/${meetingCode}`, method: 'GET' }),
        'looking up Meet space'
      )
      const spaceName = spaceRes.data.name
      if (!spaceName) throw new Error('Meet space lookup returned no name')

      await withTimeout(
        oauth2Client.request({
          url: `https://meet.googleapis.com/v2/${spaceName}?updateMask=config.accessType`,
          method: 'PATCH',
          data: { config: { accessType: 'OPEN' } },
        }),
        'setting Meet access type'
      )
    } catch (patchErr) {
      const details = patchErr.response?.data?.error?.message || patchErr.message
      console.error('[GoogleMeet] Could not set open access on Meet space (link still works, but guests may need to be let in manually):', details)
    }

    return uri
  } catch (err) {
    const details = err.response?.data?.error_description || err.response?.data?.error?.message || err.message
    console.error('[GoogleMeet] Failed to create Meet link:', details)
    if (err.response?.data) console.error('[GoogleMeet] Full error payload:', JSON.stringify(err.response.data))
    return null
  }
}

module.exports = { createMeetLink }
