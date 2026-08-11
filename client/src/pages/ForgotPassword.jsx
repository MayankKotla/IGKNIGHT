import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { BookOpen, AlertCircle, CheckCircle, ArrowLeft } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { isUcfEmail } from '../lib/validators'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!isUcfEmail(email)) {
      setError('Please use your UCF email address (@ucf.edu).')
      return
    }

    setLoading(true)
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    setLoading(false)

    // Always show the same success state regardless of whether the email
    // is actually registered — confirming/denying an account exists here
    // would let anyone probe which UCF emails have signed up.
    setSent(true)
  }

  if (sent) {
    return (
      <div className="min-h-screen bg-app-bg flex flex-col items-center justify-center px-4 relative overflow-x-hidden">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse 60% 50% at 50% 0%, rgba(255,201,4,0.08) 0%, transparent 70%)',
          }}
        />
        <Link
          to="/login"
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
            If an account exists for{' '}
            <span className="text-white font-medium">{email}</span>,
            we sent a link to reset your password.
          </p>
          <Link to="/login" className="text-ucf-gold hover:text-yellow-400 font-medium transition-colors duration-200 text-sm">
            Back to Sign In
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-app-bg flex flex-col items-center justify-center px-4 relative overflow-x-hidden">
      {/* Background glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 60% 50% at 50% 0%, rgba(255,201,4,0.08) 0%, transparent 70%)',
        }}
      />

      <Link
        to="/login"
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
            <h1 className="text-xl font-bold text-white mb-1">Reset your password</h1>
            <p className="text-gray-500 text-sm">We'll email you a link to set a new one</p>
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
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-ucf-gold text-black font-bold py-2.5 rounded-xl hover:bg-yellow-400 transition-colors duration-200 disabled:opacity-60 disabled:cursor-not-allowed text-sm mt-1"
            >
              {loading ? 'Sending…' : 'Send Reset Link'}
            </button>
          </form>
        </div>

        <p className="text-center text-gray-600 text-sm mt-5">
          Remembered it?{' '}
          <Link to="/login" className="text-ucf-gold hover:text-yellow-400 font-medium transition-colors duration-200">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
