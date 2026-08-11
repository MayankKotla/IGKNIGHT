import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import Landing from './pages/Landing'
import Login from './pages/Login'
import Signup from './pages/Signup'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
import Dashboard from './pages/Dashboard'
import GroupChat from './pages/GroupChat'
import SessionDetail from './pages/SessionDetail'
import Quiz from './pages/Quiz'
import PrivacyPolicy from './pages/PrivacyPolicy'
import TermsOfService from './pages/TermsOfService'
import ProtectedRoute from './components/ProtectedRoute'
import PublicRoute from './components/PublicRoute'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<PublicRoute><Landing /></PublicRoute>} />
      <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
      <Route path="/signup" element={<PublicRoute><Signup /></PublicRoute>} />
      <Route path="/forgot-password" element={<PublicRoute><ForgotPassword /></PublicRoute>} />
      {/* Not wrapped in PublicRoute: clicking the emailed reset link
          establishes a real (if narrowly-scoped) Supabase session, which
          would make PublicRoute think the user is fully logged in and
          bounce them straight to /dashboard before they can set a new
          password. ResetPassword handles its own recovery-session check. */}
      <Route path="/reset-password" element={<ResetPassword />} />
      {/* Plain routes, not wrapped in PublicRoute or ProtectedRoute — these
          are content pages that should render the same whether you're
          logged in or not, so neither the "kick logged-in users to
          /dashboard" nor the "require auth" behavior applies here. */}
      <Route path="/privacy" element={<PrivacyPolicy />} />
      <Route path="/terms" element={<TermsOfService />} />
      <Route path="/dashboard" element={
        <ProtectedRoute>
          <Dashboard />
        </ProtectedRoute>
      } />
      <Route path="/groups/:id" element={
        <ProtectedRoute>
          <GroupChat />
        </ProtectedRoute>
      } />
      <Route path="/groups/:groupId/sessions/:sessionId" element={
        <ProtectedRoute>
          <SessionDetail />
        </ProtectedRoute>
      } />
      <Route path="/quiz/:quizId" element={
        <ProtectedRoute>
          <Quiz />
        </ProtectedRoute>
      } />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
