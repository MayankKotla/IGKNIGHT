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

  const signUp = ({ email, password, fullName }) =>
    supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        // Without this, Supabase sends the confirmation link to whatever
        // the project's default Site URL is, which isn't a page this app
        // ever renders meaningfully. Requires this exact URL to be added
        // to Supabase's Authentication > URL Configuration > Redirect URLs
        // allow-list, or Supabase silently falls back to the Site URL
        // instead.
        emailRedirectTo: `${window.location.origin}/verify-email`,
      },
    })

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
    <AuthContext.Provider value={{ user, loading, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
