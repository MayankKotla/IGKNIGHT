// Shared by Signup.jsx and ResetPassword.jsx (both render the same live
// checklist and re-check on submit). Pulled out of both files into one
// place so the two forms can't drift to different rules by accident, and
// so the rules themselves are unit-testable.
export const PASSWORD_RULES = [
  { label: 'At least 8 characters', test: (pw) => pw.length >= 8 },
  { label: 'One uppercase letter', test: (pw) => /[A-Z]/.test(pw) },
  { label: 'One lowercase letter', test: (pw) => /[a-z]/.test(pw) },
  { label: 'One number', test: (pw) => /[0-9]/.test(pw) },
  { label: 'One special character', test: (pw) => /[^A-Za-z0-9]/.test(pw) },
]

export function getFailedPasswordRules(password) {
  return PASSWORD_RULES.filter((rule) => !rule.test(password))
}
