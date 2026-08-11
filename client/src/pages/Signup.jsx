import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { BookOpen, AlertCircle, CheckCircle, Eye, EyeOff, ArrowLeft } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

const UCF_EMAIL_RE = /^[a-zA-Z0-9._%+-]+@ucf\.edu$/

export default function Signup() {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const { signUp } = useAuth()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!UCF_EMAIL_RE.test(email)) {
      setError('Only UCF email addresses are allowed (@ucf.edu).')
      return
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)
    const { error: authError } = await signUp({ email, password, fullName })
    setLoading(false)

    if (authError) {
      setError(authError.message)
    } else {
      setSuccess(true)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-app-bg flex flex-col items-center justify-center px-4 relative overflow-x-hidden">
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
        <div className="w-full max-w-sm text-center relative">
          <div className="w-16 h-16 bg-ucf-gold/10 rounded-2xl flex items-center justify-center mx-auto mb-5">
            <CheckCircle className="w-8 h-8 text-ucf-gold" />
          </div>
          <h1 className="text-xl font-bold text-white mb-2">Check your email</h1>
          <p className="text-gray-400 text-sm mb-6 leading-relaxed">
            We sent a confirmation link to{' '}
            <span className="text-white font-medium">{email}</span>.
            Click it to activate your account.
          </p>
          <Link to="/login" className="text-ucf-gold hover:text-yellow-400 font-medium transition-colors duration-200 text-sm">
            Back to Sign In
          </Link>
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
              <button
                type="submit"
                disabled={loading}
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
