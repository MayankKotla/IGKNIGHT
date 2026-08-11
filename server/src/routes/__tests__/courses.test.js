// courses.js requires middleware/auth.js, which builds a real Supabase
// client (createClient(...)) at require-time. That client's Realtime piece
// needs a native WebSocket, which isn't available on Node 20 (only Node 22+)
// — passed locally here because dev machines/sandboxes commonly run newer
// Node, but broke in CI where the workflow pins Node 20. This test only
// exercises the two pure string-handling exports below, so it doesn't need
// a real client at all — mock it the same way auth.test.js does.
jest.mock('@supabase/supabase-js', () => ({
  createClient: () => ({}),
}))

const { normalizeCourseCode, UCF_CODE_RE } = require('../courses')

describe('normalizeCourseCode', () => {
  it('uppercases and inserts a single canonical space', () => {
    expect(normalizeCourseCode('cop3502c')).toBe('COP 3502C')
  })

  it('collapses uneven internal spacing', () => {
    expect(normalizeCourseCode('COP  3502C')).toBe('COP 3502C')
    expect(normalizeCourseCode('COP 3502 C')).toBe('COP 3502C')
    expect(normalizeCourseCode('C OP3502C')).toBe('COP 3502C')
  })

  it('trims leading/trailing whitespace', () => {
    expect(normalizeCourseCode('  mac2311  ')).toBe('MAC 2311')
  })

  it('handles codes with no trailing letter suffix', () => {
    expect(normalizeCourseCode('enc1101')).toBe('ENC 1101')
  })
})

describe('UCF_CODE_RE', () => {
  it.each([
    'COP 3502C',
    'MAC 2311',
    'ENC 1101',
    'CDA 3103H',
  ])('accepts a well-formed code: %s', (code) => {
    expect(UCF_CODE_RE.test(code)).toBe(true)
  })

  it.each([
    'COP3502C',      // missing the space
    'COP 350',       // only 3 digits
    'COPPS 3502C',   // 5-letter prefix, over the 2-4 limit
    'cop 3502c',     // must be uppercase — normalizeCourseCode is expected to run first
    '',
  ])('rejects a malformed code: %s', (code) => {
    expect(UCF_CODE_RE.test(code)).toBe(false)
  })
})
