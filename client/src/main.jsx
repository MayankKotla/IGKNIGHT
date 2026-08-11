import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { AuthProvider } from './context/AuthContext'
import { initSentry, SentryErrorBoundary } from './lib/sentry'
import '@fontsource-variable/geist'
import './index.css'

initSentry()

function CrashFallback() {
  return (
    <div className="min-h-screen bg-app-bg flex flex-col items-center justify-center px-4 text-center">
      <p className="text-white font-semibold mb-2">Something went wrong.</p>
      <p className="text-gray-500 text-sm mb-6">The error's been reported. Try reloading the page.</p>
      <button
        onClick={() => window.location.reload()}
        className="bg-ucf-gold text-black font-bold px-5 py-2.5 rounded-xl text-sm hover:bg-yellow-400 transition-colors duration-200"
      >
        Reload
      </button>
    </div>
  )
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {/* Catches render/lifecycle errors anywhere below it and reports them
        to Sentry (a no-op if VITE_SENTRY_DSN isn't set) instead of leaving
        the user staring at a blank white screen with no way back in. */}
    <SentryErrorBoundary fallback={<CrashFallback />}>
      <BrowserRouter>
        <AuthProvider>
          <App />
        </AuthProvider>
      </BrowserRouter>
    </SentryErrorBoundary>
  </React.StrictMode>
)
