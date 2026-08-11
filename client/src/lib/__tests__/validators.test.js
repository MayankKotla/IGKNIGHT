import { describe, it, expect } from 'vitest'
import { isUcfEmail } from '../validators'

describe('isUcfEmail', () => {
  it('accepts a plain @ucf.edu address', () => {
    expect(isUcfEmail('knight123@ucf.edu')).toBe(true)
  })

  it('accepts dots, plus tags, and hyphens in the local part', () => {
    expect(isUcfEmail('first.last+study-group@ucf.edu')).toBe(true)
  })

  it('rejects @knights.ucf.edu — no longer allowed since the signup/login restriction', () => {
    expect(isUcfEmail('knight123@knights.ucf.edu')).toBe(false)
  })

  it('rejects non-UCF domains', () => {
    expect(isUcfEmail('someone@gmail.com')).toBe(false)
  })

  it('rejects malformed input', () => {
    expect(isUcfEmail('not-an-email')).toBe(false)
    expect(isUcfEmail('')).toBe(false)
    expect(isUcfEmail('@ucf.edu')).toBe(false)
  })
})
