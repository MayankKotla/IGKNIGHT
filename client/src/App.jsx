import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import Landing from './pages/Landing'
import Login from './pages/Login'
import Signup from './pages/Signup'
import Dashboard from './pages/Dashboard'
import GroupChat from './pages/GroupChat'
import SessionDetail from './pages/SessionDetail'
import Quiz from './pages/Quiz'
import ProtectedRoute from './components/ProtectedRoute'
import PublicRoute from './components/PublicRoute'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<PublicRoute><Landing /></PublicRoute>} />
      <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
      <Route path="/signup" element={<PublicRoute><Signup /></PublicRoute>} />
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
