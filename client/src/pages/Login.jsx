import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { BookOpen, AlertCircle } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

const UCF_EMAIL_RE = /^[a-zA-Z0-9._%+-]+@(ucf\.edu|knights\.ucf\.edu)$/

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { signIn } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!UCF_EMAIL_RE.test(email)) {
      setError('Please use your UCF email address (@ucf.edu or @knights.ucf.edu).')
      return
    }

    setLoading(true)
    const { error: authError } = await signIn({ email, password })
    setLoading(false)

    if (authError) {
      setError(authError.message)
    } else {
      navigate('/dashboard')
    }
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

      <div className="w-full max-w-sm relative">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5 justify-center mb-8">
          <div className="w-9 h-9 bg-ucf-gold/15 rounded-xl flex items-center justify-center shrink-0">
            <BookOpen className="h-4.5 w-4.5 text-ucf-gold" style={{ width: '18px', height: '18px' }} />
          </div>
          <span className="text-white font-bold text-xl tracking-tight">IgKnight</span>
        </Link>

        {/* Card */}
        <div className="card-elevated border rounded-2xl p-8">
          <div className="mb-6">
            <h1 className="text-xl font-bold text-white mb-1">Welcome back</h1>
            <p className="text-gray-500 text-sm">Sign in to your IgKnight account</p>
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
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wide">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
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
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>
        </div>

        <p className="text-center text-gray-600 text-sm mt-5">
          Don&apos;t have an account?{' '}
          <Link to="/signup" className="text-ucf-gold hover:text-yellow-400 font-medium transition-colors duration-200">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  )
}
