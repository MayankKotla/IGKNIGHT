import { describe, it, expect } from 'vitest'
import { PASSWORD_RULES, getFailedPasswordRules } from '../passwordRules'

describe('getFailedPasswordRules', () => {
  it('flags every rule for an empty password', () => {
    expect(getFailedPasswordRules('')).toHaveLength(PASSWORD_RULES.length)
  })

  it('passes a password meeting every rule', () => {
    expect(getFailedPasswordRules('Knight$123')).toHaveLength(0)
  })

  it('flags a missing uppercase letter', () => {
    const failed = getFailedPasswordRules('knight$123')
    expect(failed.map((r) => r.label)).toContain('One uppercase letter')
  })

  it('flags a missing lowercase letter', () => {
    const failed = getFailedPasswordRules('KNIGHT$123')
    expect(failed.map((r) => r.label)).toContain('One lowercase letter')
  })

  it('flags a missing number', () => {
    const failed = getFailedPasswordRules('Knight$$$')
    expect(failed.map((r) => r.label)).toContain('One number')
  })

  it('flags a missing special character', () => {
    const failed = getFailedPasswordRules('Knight123')
    expect(failed.map((r) => r.label)).toContain('One special character')
  })

  it('flags a too-short password', () => {
    const failed = getFailedPasswordRules('K1$a')
    expect(failed.map((r) => r.label)).toContain('At least 8 characters')
  })
})
