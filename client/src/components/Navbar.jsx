import React from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { BookOpen } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

export default function Navbar() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()

  const handleSignOut = async () => {
    await signOut()
    navigate('/')
  }

  return (
    <nav className="fixed top-0 w-full z-50 bg-app-bg/95 backdrop-blur-md border-b border-app-border">
      <div className="max-w-6xl mx-auto px-6">
        <div className="flex items-center justify-between h-16">
          <Link to={user ? '/dashboard' : '/'} className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-ucf-gold/15 rounded-lg flex items-center justify-center shrink-0">
              <BookOpen className="h-4 w-4 text-ucf-gold" />
            </div>
            <span className="text-white font-bold text-base tracking-tight uppercase">IgKnight</span>
          </Link>

          <div className="flex items-center gap-3">
            {user ? (
              <>
                <Link
                  to="/dashboard"
                  className="text-gray-400 hover:text-white text-sm font-medium uppercase tracking-wide transition-colors duration-200 px-3 py-1.5"
                >
                  Dashboard
                </Link>
                <button
                  onClick={handleSignOut}
                  className="text-sm bg-ucf-gold text-black px-4 py-2 rounded-lg font-semibold uppercase tracking-wide hover:bg-yellow-400 transition-colors duration-200"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="text-gray-400 hover:text-white text-sm font-medium uppercase tracking-wide transition-colors duration-200 px-3 py-1.5"
                >
                  Sign In
                </Link>
                <Link
                  to="/signup"
                  className="text-sm bg-ucf-gold text-black px-4 py-2 rounded-lg font-semibold uppercase tracking-wide hover:bg-yellow-400 transition-colors duration-200"
                >
                  Sign Up
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}
