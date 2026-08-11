// Shared by Login/Signup/ForgotPassword/ResetPassword — previously each
// page kept its own duplicate copy of this regex, which is exactly the
// kind of thing that quietly drifts out of sync (see: the @knights.ucf.edu
// cleanup, which had to touch four separate copies by hand). Pulled out
// here mainly so it has one definition and is actually testable.
export const UCF_EMAIL_RE = /^[a-zA-Z0-9._%+-]+@ucf\.edu$/

export function isUcfEmail(email) {
  return UCF_EMAIL_RE.test(email)
}
