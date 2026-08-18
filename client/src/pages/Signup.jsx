import React, { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { BookOpen, AlertCircle, CheckCircle, Eye, EyeOff, ArrowLeft } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { isUcfEmail } from '../lib/validators'
import { PASSWORD_RULES, getFailedPasswordRules } from '../lib/passwordRules'

// How long the emailed OTP code is valid for, purely for the countdown
// display below the code inputs. This is display-only — the real
// expiration is enforced server-side by Supabase's "Email OTP Expiration"
// setting (Dashboard > Authentication > Emails), which must be set to the
// same value (300s / 5 min) or this countdown will lie about when the code
// actually stops working.
const OTP_EXPIRY_SECONDS = 300

function formatCountdown(totalSeconds) {
  const m = Math.floor(totalSeconds / 60)
  const s = totalSeconds % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

export default function Signup() {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [passwordFocused, setPasswordFocused] = useState(false)
  const [error, setError] = useState('')
  // Signup itself doesn't get a static "success" screen anymore — it moves
  // straight into the OTP-entry step, since that's what actually finishes
  // account creation now (see verifySignupOtp comment in AuthContext.jsx
  // for why this replaced the clickable confirmation link).
  const [otpStep, setOtpStep] = useState(false)
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', ''])
  const [otpError, setOtpError] = useState('')
  const [otpLoading, setOtpLoading] = useState(false)
  const [resendState, setResendState] = useState('idle') // 'idle' | 'sending' | 'sent'
  const [secondsLeft, setSecondsLeft] = useState(OTP_EXPIRY_SECONDS)
  const [loading, setLoading] = useState(false)
  // Requires an explicit, affirmative checkbox rather than just linking the
  // policies near the submit button — "by clicking Create Account you
  // agree..." (browsewrap) is easy to skim past and weaker to point to
  // later if it ever matters; an unchecked box that blocks submission
  // (clickwrap) means every account actually clicked something that says
  // "I agree" before it was created.
  const [agreedToTerms, setAgreedToTerms] = useState(false)
  const { signUp, verifySignupOtp, resendSignupOtp } = useAuth()
  const otpInputRefs = useRef([])
  const otpCode = otpDigits.join('')

  // Countdown ticks only while the OTP step is showing, and resets to the
  // full duration each time we (re-)enter that step — see handleSubmit and
  // handleResend.
  useEffect(() => {
    if (!otpStep) return
    const interval = setInterval(() => {
      setSecondsLeft((s) => (s > 0 ? s - 1 : 0))
    }, 1000)
    return () => clearInterval(interval)
  }, [otpStep])

  const focusOtpBox = (index) => {
    const el = otpInputRefs.current[index]
    if (el) el.focus()
  }

  const handleOtpDigitChange = (index, rawValue) => {
    const digit = rawValue.replace(/\D/g, '').slice(-1)
    setOtpDigits((prev) => {
      const next = [...prev]
      next[index] = digit
      return next
    })
    if (digit && index < 5) focusOtpBox(index + 1)
  }

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      focusOtpBox(index - 1)
    } else if (e.key === 'ArrowLeft' && index > 0) {
      focusOtpBox(index - 1)
    } else if (e.key === 'ArrowRight' && index < 5) {
      focusOtpBox(index + 1)
    }
  }

  const handleOtpPaste = (e) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (!pasted) return
    e.preventDefault()
    const next = ['', '', '', '', '', '']
    for (let i = 0; i < pasted.length; i++) next[i] = pasted[i]
    setOtpDigits(next)
    focusOtpBox(Math.min(pasted.length, 5))
  }

  // Checked live as the user types (see the checklist rendered under the
  // password field) and re-checked on submit — the live version is UX, the
  // submit-time version is the actual gate, so someone can't bypass it by
  // never triggering onChange (e.g. pasting then submitting fast).
  const failedRules = getFailedPasswordRules(password)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!isUcfEmail(email)) {
      setError('Only UCF email addresses are allowed (@ucf.edu).')
      return
    }
    if (failedRules.length > 0) {
      setError(`Password must have: ${failedRules.map((r) => r.label.toLowerCase()).join(', ')}.`)
      return
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }
    if (!agreedToTerms) {
      setError('Please agree to the Terms of Service and Privacy Policy to continue.')
      return
    }

    setLoading(true)
    const { error: authError } = await signUp({ email, password, fullName })
    setLoading(false)

    if (authError) {
      setError(authError.message)
    } else {
      setSecondsLeft(OTP_EXPIRY_SECONDS)
      setOtpStep(true)
    }
  }

  const handleVerifyOtp = async (e) => {
    e.preventDefault()
    setOtpError('')

    if (otpCode.trim().length !== 6) {
      setOtpError('Enter the 6-digit code from your email.')
      return
    }

    setOtpLoading(true)
    const { error: verifyError } = await verifySignupOtp({ email, token: otpCode.trim() })
    setOtpLoading(false)

    if (verifyError) {
      setOtpError(verifyError.message)
      return
    }
    // On success, onAuthStateChange fires SIGNED_IN, AuthContext's `user`
    // updates, and PublicRoute (wrapping /signup) redirects to /dashboard
    // automatically — no manual navigate() needed here.
  }

  const handleResend = async () => {
    setOtpError('')
    setResendState('sending')
    const { error: resendError } = await resendSignupOtp(email)
    if (resendError) {
      setOtpError(resendError.message)
      setResendState('idle')
    } else {
      setResendState('sent')
      // The old code is invalidated once a new one is sent, so clear
      // whatever's typed and restart the countdown against the fresh code.
      setOtpDigits(['', '', '', '', '', ''])
      setSecondsLeft(OTP_EXPIRY_SECONDS)
      focusOtpBox(0)
    }
  }

  if (otpStep) {
    return (
      <div className="min-h-screen bg-app-bg flex flex-col items-center justify-center px-4 relative overflow-x-hidden">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse 60% 50% at 50% 0%, rgba(255,201,4,0.08) 0%, transparent 70%)',
          }}
        />
        <button
          type="button"
          onClick={() => { setOtpStep(false); setOtpDigits(['', '', '', '', '', '']); setOtpError(''); setResendState('idle') }}
          className="absolute top-6 left-6 flex items-center gap-1.5 text-gray-500 hover:text-white transition-colors duration-200 text-sm font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>

        <div className="w-full max-w-sm relative">
          <Link to="/" className="flex items-center gap-2.5 justify-center mb-8">
            <div className="w-9 h-9 bg-ucf-gold/15 rounded-xl flex items-center justify-center shrink-0">
              <BookOpen style={{ width: '18px', height: '18px' }} className="text-ucf-gold" />
            </div>
            <span className="text-white font-bold text-xl tracking-tight uppercase">IgKnight</span>
          </Link>

          <div className="card-elevated border rounded-2xl p-8">
            <div className="mb-6 text-center">
              <div className="w-14 h-14 bg-ucf-gold/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-7 h-7 text-ucf-gold" />
              </div>
              <h1 className="text-xl font-bold text-white mb-1">Check your email</h1>
              <p className="text-gray-500 text-sm leading-relaxed">
                Enter the 6-digit code we sent to{' '}
                <span className="text-white font-medium">{email}</span>
              </p>
            </div>

            {otpError && (
              <div className="flex items-start gap-3 bg-red-950/40 border border-red-800/40 rounded-xl p-3 mb-5">
                <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
                <p className="text-red-400 text-sm">{otpError}</p>
              </div>
            )}

            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-2 uppercase tracking-wide text-center">
                  Verification Code
                </label>
                <div className="flex justify-center gap-2" onPaste={handleOtpPaste}>
                  {otpDigits.map((digit, index) => (
                    <input
                      key={index}
                      ref={(el) => { otpInputRefs.current[index] = el }}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOtpDigitChange(index, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(index, e)}
                      autoFocus={index === 0}
                      className="w-11 h-12 bg-app-input border border-app-border rounded-xl text-center text-lg font-semibold text-[#e8e8e8] focus:outline-none focus:border-ucf-gold/60 focus:ring-1 focus:ring-ucf-gold/25 transition-all duration-200"
                    />
                  ))}
                </div>
                <p className="text-center text-xs mt-2.5">
                  {secondsLeft > 0 ? (
                    <span className="text-gray-600">Code expires in <span className="text-gray-400 font-medium">{formatCountdown(secondsLeft)}</span></span>
                  ) : (
                    <span className="text-red-400 font-medium">Code expired — request a new one below</span>
                  )}
                </p>
              </div>

              <button
                type="submit"
                disabled={otpLoading || secondsLeft === 0}
                className="w-full bg-ucf-gold text-black font-bold py-2.5 rounded-xl hover:bg-yellow-400 transition-colors duration-200 disabled:opacity-60 disabled:cursor-not-allowed text-sm"
              >
                {otpLoading ? 'Verifying…' : 'Verify Email'}
              </button>
            </form>

            <p className="text-center text-gray-600 text-xs mt-4">
              Didn't get a code?{' '}
              <button
                type="button"
                onClick={handleResend}
                disabled={resendState === 'sending'}
                className="text-ucf-gold hover:text-yellow-400 font-medium transition-colors duration-200 disabled:opacity-60"
              >
                {resendState === 'sending' ? 'Sending…' : resendState === 'sent' ? 'Sent!' : 'Resend code'}
              </button>
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-app-bg flex flex-col items-center justify-center px-4 py-12 relative overflow-x-hidden">
      {/* Background glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 60% 50% at 50% 0%, rgba(255,201,4,0.08) 0%, transparent 70%)',
        }}
      />

      <Link
        to="/"
        className="absolute top-6 left-6 flex items-center gap-1.5 text-gray-500 hover:text-white transition-colors duration-200 text-sm font-medium"
      >
        <ArrowLeft className="w-4 h-4" />
        Back
      </Link>

      <div className="w-full max-w-sm relative">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5 justify-center mb-8">
          <div className="w-9 h-9 bg-ucf-gold/15 rounded-xl flex items-center justify-center shrink-0">
            <BookOpen style={{ width: '18px', height: '18px' }} className="text-ucf-gold" />
          </div>
          <span className="text-white font-bold text-xl tracking-tight uppercase">IgKnight</span>
        </Link>

        {/* Card */}
        <div className="card-elevated border rounded-2xl p-8">
          <div className="mb-6">
            <h1 className="text-xl font-bold text-white mb-1">Create your account</h1>
            <p className="text-gray-500 text-sm">UCF email address required to join</p>
          </div>

          {error && (
            <div className="flex items-start gap-3 bg-red-950/40 border border-red-800/40 rounded-xl p-3 mb-5">
              <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wide">
                Full Name
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Your Name"
                required
                className="w-full bg-app-input border border-app-border rounded-xl px-4 py-2.5 text-[#e8e8e8] placeholder-gray-600 focus:outline-none focus:border-ucf-gold/60 focus:ring-1 focus:ring-ucf-gold/25 transition-all duration-200 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wide">
                UCF Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@ucf.edu"
                required
                className="w-full bg-app-input border border-app-border rounded-xl px-4 py-2.5 text-[#e8e8e8] placeholder-gray-600 focus:outline-none focus:border-ucf-gold/60 focus:ring-1 focus:ring-ucf-gold/25 transition-all duration-200 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wide">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={() => setPasswordFocused(true)}
                  onBlur={() => setPasswordFocused(false)}
                  placeholder="••••••••"
                  required
                  className="w-full bg-app-input border border-app-border rounded-xl px-4 py-2.5 pr-10 text-[#e8e8e8] placeholder-gray-600 focus:outline-none focus:border-ucf-gold/60 focus:ring-1 focus:ring-ucf-gold/25 transition-all duration-200 text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors duration-150"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {/* Live checklist — visible while the field is focused, and
                  stays visible once they've started typing even after
                  blurring (e.g. tabbing to Confirm Password) so an unmet
                  rule doesn't just silently disappear. Hides once the field
                  is empty and unfocused, so it doesn't clutter the form for
                  someone who hasn't gotten there yet. */}
              {(passwordFocused || password.length > 0) && (
                <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1">
                  {PASSWORD_RULES.map((rule) => {
                    const met = rule.test(password)
                    return (
                      <div key={rule.label} className="flex items-center gap-1.5">
                        <CheckCircle className={`w-3 h-3 shrink-0 ${met ? 'text-green-500' : 'text-gray-700'}`} />
                        <span className={`text-xs ${met ? 'text-gray-400' : 'text-gray-600'}`}>{rule.label}</span>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wide">
                Confirm Password
              </label>
              <div className="relative">
                <input
                  type={showConfirm ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full bg-app-input border border-app-border rounded-xl px-4 py-2.5 pr-10 text-[#e8e8e8] placeholder-gray-600 focus:outline-none focus:border-ucf-gold/60 focus:ring-1 focus:ring-ucf-gold/25 transition-all duration-200 text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors duration-150"
                  tabIndex={-1}
                >
                  {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="pt-1">
              <label className="flex items-start gap-2.5 mb-4 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={agreedToTerms}
                  onChange={(e) => setAgreedToTerms(e.target.checked)}
                  className="mt-0.5 w-4 h-4 shrink-0 rounded border-app-border bg-app-input text-ucf-gold focus:ring-1 focus:ring-ucf-gold/50 focus:ring-offset-0 cursor-pointer"
                />
                <span className="text-xs text-gray-500 leading-relaxed">
                  I agree to the{' '}
                  <Link to="/terms" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-ucf-gold transition-colors duration-150 underline underline-offset-2">
                    Terms of Service
                  </Link>{' '}
                  and{' '}
                  <Link to="/privacy" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-ucf-gold transition-colors duration-150 underline underline-offset-2">
                    Privacy Policy
                  </Link>.
                </span>
              </label>
              <button
                type="submit"
                disabled={loading || !agreedToTerms}
                className="w-full bg-ucf-gold text-black font-bold py-2.5 rounded-xl hover:bg-yellow-400 transition-colors duration-200 disabled:opacity-60 disabled:cursor-not-allowed text-sm"
              >
                {loading ? 'Creating account…' : 'Create Account'}
              </button>
            </div>
          </form>
        </div>

        <p className="text-center text-gray-600 text-sm mt-5">
          Already have an account?{' '}
          <Link to="/login" className="text-ucf-gold hover:text-yellow-400 font-medium transition-colors duration-200">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
