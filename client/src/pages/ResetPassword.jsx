import React, { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { BookOpen, AlertCircle, CheckCircle, Eye, EyeOff } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { PASSWORD_RULES, getFailedPasswordRules } from '../lib/passwordRules'

export default function ResetPassword() {
  // Clicking the emailed reset link redirects here with a recovery session
  // already established (supabase-js parses it from the URL fragment on
  // load) — 'checking' covers that brief window before we know whether a
  // session actually came through, so we don't flash "invalid link" for a
  // legitimate link that just hasn't finished parsing yet.
  const [status, setStatus] = useState('checking') // 'checking' | 'ready' | 'invalid'
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [passwordFocused, setPasswordFocused] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    let cancelled = false

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY' && !cancelled) setStatus('ready')
    })

    // The PASSWORD_RECOVERY event can fire before this listener attaches
    // (it comes from parsing the URL during client init, which may finish
    // first), so also check for an already-established session directly.
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (cancelled) return
      setStatus((current) => (current === 'checking' ? (session ? 'ready' : 'invalid') : current))
    })

    return () => {
      cancelled = true
      subscription.unsubscribe()
    }
  }, [])

  const failedRules = getFailedPasswordRules(password)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (failedRules.length > 0) {
      setError(`Password must have: ${failedRules.map((r) => r.label.toLowerCase()).join(', ')}.`)
      return
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)
    const { error: updateError } = await supabase.auth.updateUser({ password })
    setLoading(false)

    if (updateError) {
      setError(updateError.message)
      return
    }

    // Sign out of the recovery session and send them to a normal sign-in
    // with the new password, rather than dropping them straight into the
    // app on a session that started as a password-reset link.
    await supabase.auth.signOut()
    setDone(true)
    setTimeout(() => navigate('/login'), 2500)
  }

  const Shell = ({ children }) => (
    <div className="min-h-screen bg-app-bg flex flex-col items-center justify-center px-4 relative overflow-x-hidden">
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 60% 50% at 50% 0%, rgba(255,201,4,0.08) 0%, transparent 70%)',
        }}
      />
      <div className="w-full max-w-sm relative">
        <Link to="/" className="flex items-center gap-2.5 justify-center mb-8">
          <div className="w-9 h-9 bg-ucf-gold/15 rounded-xl flex items-center justify-center shrink-0">
            <BookOpen style={{ width: '18px', height: '18px' }} className="text-ucf-gold" />
          </div>
          <span className="text-white font-bold text-xl tracking-tight uppercase">IgKnight</span>
        </Link>
        {children}
      </div>
    </div>
  )

  if (status === 'checking') {
    return (
      <Shell>
        <div className="flex justify-center py-10">
          <div className="w-8 h-8 border-2 border-app-border border-t-ucf-gold rounded-full animate-spin" />
        </div>
      </Shell>
    )
  }

  if (status === 'invalid') {
    return (
      <Shell>
        <div className="card-elevated border rounded-2xl p-8 text-center">
          <div className="w-16 h-16 bg-red-950/40 rounded-2xl flex items-center justify-center mx-auto mb-5">
            <AlertCircle className="w-8 h-8 text-red-400" />
          </div>
          <h1 className="text-xl font-bold text-white mb-2">Link expired</h1>
          <p className="text-gray-400 text-sm mb-6 leading-relaxed">
            This password reset link is invalid or has expired. Request a new one to continue.
          </p>
          <Link
            to="/forgot-password"
            className="inline-block w-full bg-ucf-gold text-black font-bold py-2.5 rounded-xl hover:bg-yellow-400 transition-colors duration-200 text-sm"
          >
            Request New Link
          </Link>
        </div>
      </Shell>
    )
  }

  if (done) {
    return (
      <Shell>
        <div className="card-elevated border rounded-2xl p-8 text-center">
          <div className="w-16 h-16 bg-ucf-gold/10 rounded-2xl flex items-center justify-center mx-auto mb-5">
            <CheckCircle className="w-8 h-8 text-ucf-gold" />
          </div>
          <h1 className="text-xl font-bold text-white mb-2">Password updated</h1>
          <p className="text-gray-400 text-sm leading-relaxed">
            Taking you to sign in…
          </p>
        </div>
      </Shell>
    )
  }

  return (
    <Shell>
      <div className="card-elevated border rounded-2xl p-8">
        <div className="mb-6">
          <h1 className="text-xl font-bold text-white mb-1">Set a new password</h1>
          <p className="text-gray-500 text-sm">Choose something you haven't used before</p>
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
              New Password
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
              Confirm New Password
            </label>
            <input
              type={showPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="w-full bg-app-input border border-app-border rounded-xl px-4 py-2.5 text-[#e8e8e8] placeholder-gray-600 focus:outline-none focus:border-ucf-gold/60 focus:ring-1 focus:ring-ucf-gold/25 transition-all duration-200 text-sm"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-ucf-gold text-black font-bold py-2.5 rounded-xl hover:bg-yellow-400 transition-colors duration-200 disabled:opacity-60 disabled:cursor-not-allowed text-sm mt-1"
          >
            {loading ? 'Updating…' : 'Update Password'}
          </button>
        </form>
      </div>
    </Shell>
  )
}
