import React, { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext({})

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  // Deliberately NOT using emailRedirectTo / a clickable confirmation link.
  // Enterprise mail security (Microsoft Safe Links and similar, which UCF's
  // Office 365 tenant runs) pre-fetches every link in an incoming email to
  // scan it for malware before delivery. Supabase's confirmation link
  // confirms the account the instant its URL is GET-requested — no click
  // intent required — so that pre-fetch alone was silently confirming
  // accounts before a human ever saw the email (confirmed by "Confirmed at"
  // matching "Confirmation sent at" to the same second in Supabase's user
  // table during testing). That defeats the purpose of email verification:
  // anyone could sign up with an email they don't own and have it
  // auto-confirmed by the scanner. A 6-digit OTP code the user has to
  // manually read and type can't be triggered by a link-scanning bot, so
  // Signup.jsx collects it via verifySignupOtp below instead of relying on
  // a redirect page. The Supabase "Confirm signup" email template must be
  // edited in the dashboard to display {{ .Token }} instead of
  // {{ .ConfirmationURL }} for this to actually take effect.
  const signUp = ({ email, password, fullName }) =>
    supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
      },
    })

  const verifySignupOtp = ({ email, token }) =>
    supabase.auth.verifyOtp({ email, token, type: 'signup' })

  const resendSignupOtp = (email) =>
    supabase.auth.resend({ type: 'signup', email })

  const signIn = ({ email, password }) =>
    supabase.auth.signInWithPassword({ email, password })

  const signOut = () => supabase.auth.signOut()

  if (loading) {
    return (
      <div className="min-h-screen bg-app-bg flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-app-border border-t-ucf-gold rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <AuthContext.Provider value={{ user, loading, signUp, verifySignupOtp, resendSignupOtp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
