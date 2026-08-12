import React, { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { BookOpen, AlertCircle, CheckCircle } from 'lucide-react'
import { supabase } from '../lib/supabase'

export default function VerifyEmail() {
  // Clicking the "Confirm your email" link in the signup email redirects
  // here (see emailRedirectTo in AuthContext.jsx). supabase-js parses the
  // token from the URL fragment on load and establishes a session
  // automatically — 'checking' covers that brief window before we know
  // whether it actually went through. An expired or already-used link
  // comes back as an #error=... fragment instead of a session, which we
  // check for directly since it doesn't fire a normal auth event.
  const [status, setStatus] = useState('checking') // 'checking' | 'verified' | 'invalid'
  const navigate = useNavigate()

  useEffect(() => {
    let cancelled = false

    if (window.location.hash.includes('error=')) {
      setStatus('invalid')
      return
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' && !cancelled) setStatus('verified')
    })

    // The SIGNED_IN event can fire before this listener attaches (it comes
    // from parsing the URL during client init, which may finish first), so
    // also check for an already-established session directly.
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (cancelled) return
      setStatus((current) => (current === 'checking' ? (session ? 'verified' : 'invalid') : current))
    })

    return () => {
      cancelled = true
      subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (status !== 'verified') return
    // Sign out of the session the link created and send them to a normal
    // sign-in, rather than silently dropping them into the app on a
    // session that started from an email link.
    let cancelled = false
    supabase.auth.signOut().then(() => {
      if (cancelled) return
      setTimeout(() => { if (!cancelled) navigate('/login') }, 2500)
    })
    return () => { cancelled = true }
  }, [status, navigate])

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
            This verification link is invalid or has expired. Try signing in — if you've already
            clicked a valid link before, your account may already be verified.
          </p>
          <Link
            to="/login"
            className="inline-block w-full bg-ucf-gold text-black font-bold py-2.5 rounded-xl hover:bg-yellow-400 transition-colors duration-200 text-sm"
          >
            Go to Sign In
          </Link>
        </div>
      </Shell>
    )
  }

  return (
    <Shell>
      <div className="card-elevated border rounded-2xl p-8 text-center">
        <div className="w-16 h-16 bg-ucf-gold/10 rounded-2xl flex items-center justify-center mx-auto mb-5">
          <CheckCircle className="w-8 h-8 text-ucf-gold" />
        </div>
        <h1 className="text-xl font-bold text-white mb-2">Email verified!</h1>
        <p className="text-gray-400 text-sm leading-relaxed">
          Your account is ready. Taking you to sign in…
        </p>
      </div>
    </Shell>
  )
}
