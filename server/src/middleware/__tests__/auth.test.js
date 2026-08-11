const mockGetUser = jest.fn()

// auth.js builds its own internal Supabase client at require-time
// (`createClient(...)` inside the module, never exported), so the only way
// to control what it sees is mocking the whole '@supabase/supabase-js'
// module before requiring auth.js below.
jest.mock('@supabase/supabase-js', () => ({
  createClient: () => ({ auth: { getUser: mockGetUser } }),
}))

const { requireAuth } = require('../auth')

function mockRes() {
  const res = {}
  res.status = jest.fn().mockReturnValue(res)
  res.json = jest.fn().mockReturnValue(res)
  return res
}

describe('requireAuth', () => {
  beforeEach(() => {
    mockGetUser.mockReset()
  })

  it('rejects a request with no Authorization header', async () => {
    const req = { headers: {} }
    const res = mockRes()
    const next = jest.fn()

    await requireAuth(req, res, next)

    expect(res.status).toHaveBeenCalledWith(401)
    expect(next).not.toHaveBeenCalled()
    expect(mockGetUser).not.toHaveBeenCalled()
  })

  it('rejects a header missing the "Bearer " prefix', async () => {
    const req = { headers: { authorization: 'Token abc123' } }
    const res = mockRes()
    const next = jest.fn()

    await requireAuth(req, res, next)

    expect(res.status).toHaveBeenCalledWith(401)
    expect(next).not.toHaveBeenCalled()
  })

  it('rejects an invalid or expired token', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: new Error('invalid') })
    const req = { headers: { authorization: 'Bearer bad-token' } }
    const res = mockRes()
    const next = jest.fn()

    await requireAuth(req, res, next)

    expect(mockGetUser).toHaveBeenCalledWith('bad-token')
    expect(res.status).toHaveBeenCalledWith(401)
    expect(next).not.toHaveBeenCalled()
  })

  it('attaches the user to req and calls next() for a valid token', async () => {
    const fakeUser = { id: 'user-123', email: 'knight@ucf.edu' }
    mockGetUser.mockResolvedValue({ data: { user: fakeUser }, error: null })
    const req = { headers: { authorization: 'Bearer good-token' } }
    const res = mockRes()
    const next = jest.fn()

    await requireAuth(req, res, next)

    expect(req.user).toEqual(fakeUser)
    expect(req.token).toBe('good-token')
    expect(next).toHaveBeenCalledTimes(1)
    expect(res.status).not.toHaveBeenCalled()
  })
})
