import React, { useState, useEffect, useRef } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { BookOpen, Users, Calendar, Plus, LogOut, MessageSquare, UserCheck, UserPlus, Compass, Search, X, Target, CheckCircle, Trophy, Clock, Video, ChevronDown, ChevronLeft, ChevronRight, List, LayoutGrid, Pencil, MapPin, Flame, AlertCircle, Trash2, Bell } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import CreateGroupModal from '../components/CreateGroupModal'
import ScheduleSessionModal from '../components/ScheduleSessionModal'
import EditNameModal from '../components/EditNameModal'
import { normalizeForSearch } from '../lib/courseCode'
import { SkeletonBlock, SkeletonLine, SkeletonCircle } from '../components/Skeleton'
import { useNowTick } from '../hooks/useNowTick'
import NumberTicker from '../components/NumberTicker'
import TypingAnimation from '../components/TypingAnimation'

const NAV = [
  { id: 'home', icon: BookOpen, label: 'Home' },
  { id: 'sessions', icon: Calendar, label: 'Sessions' },
  { id: 'discover', icon: Compass, label: 'Discover' },
  { id: 'profile', icon: Target, label: 'KnightCheck' },
]

function formatProfessor(g) {
  return [g?.professor_first_name, g?.professor_last_name].filter(Boolean).join(' ')
}

// Formats the countdown shown on the Home tab's "Next Up" session
// spotlight. `now` is passed in (from useNowTick) rather than read fresh
// here, so the caller controls when this recomputes.
function formatSessionCountdown(session, now) {
  const start = new Date(session.start_time)
  const end = new Date(session.end_time)
  if (now >= start && now < end) return { label: 'Happening now', ongoing: true }
  const diffMins = Math.round((start - now) / 60000)
  if (diffMins < 60) return { label: `Starts in ${Math.max(diffMins, 1)}m`, ongoing: false }
  const diffHrs = Math.floor(diffMins / 60)
  if (diffHrs < 24) return { label: `Starts in ${diffHrs}h ${diffMins % 60}m`, ongoing: false }
  return { label: `Starts in ${Math.floor(diffHrs / 24)}d`, ongoing: false }
}

function DashDivider() {
  return (
    <div
      className="my-8 -mx-8 h-px"
      style={{
        background: 'linear-gradient(to right, transparent, rgba(255,201,4,0.18) 30%, rgba(255,201,4,0.22) 50%, rgba(255,201,4,0.18) 70%, transparent)',
      }}
    />
  )
}

// ─── Motion helpers ─────────────────────────────────────────────────────────

const dashFadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0 },
}

const dashStagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.07, delayChildren: 0.03 } },
}

// ─── Group list — row and card variants ────────────────────────────────────

function computeGroupCardMeta(g, groupMeta, userId) {
  const memberCount = groupMeta.memberCounts?.[g.id] ?? '—'
  const lastMsg = groupMeta.lastMessages?.[g.id]
  const unreadCount = groupMeta.unreadCounts?.[g.id] ?? 0
  const isOwnMsg = lastMsg?.user_id === userId
  const senderLabel = isOwnMsg ? 'You' : (lastMsg?.users?.full_name?.split(' ')[0] ?? null)
  // Attachment-only messages have no content (content is nullable since the
  // chat-attachments migration), so fall back to a file/photo label instead
  // of calling string methods on null.
  const attachmentLabel = lastMsg?.storage_path
    ? (lastMsg.file_type?.startsWith('image/') ? '📷 Photo' : `📎 ${lastMsg.file_name || 'File'}`)
    : null
  const bodyPreview = lastMsg?.content
    ? (lastMsg.content.length > 48 ? lastMsg.content.slice(0, 48) + '…' : lastMsg.content)
    : attachmentLabel
  const preview = lastMsg
    ? `${senderLabel ? senderLabel + ': ' : ''}${bodyPreview ?? ''}`
    : null
  return { memberCount, lastMsg, preview, unreadCount }
}

// Bell + count, stacked — only rendered by callers when count > 0, so
// there's nothing to show once a group has been opened and its messages
// read (see the ks:lastRead: effects in GroupChat.jsx).
function UnreadIndicator({ count, iconClassName = 'w-4 h-4' }) {
  return (
    <div className="flex flex-col items-center gap-0.5 shrink-0">
      <Bell className={`${iconClassName} text-white`} />
      <span className="text-[11px] font-medium text-white leading-none">{count > 9 ? '9+' : count}</span>
    </div>
  )
}

function GroupRow({ g, userId, groupMeta }) {
  const { memberCount, lastMsg, preview, unreadCount } = computeGroupCardMeta(g, groupMeta, userId)
  return (
    <motion.div variants={dashFadeUp} transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }} whileHover={{ x: 3 }}>
      <Link
        to={`/groups/${g.id}`}
        className="card border border-app-border rounded-2xl p-4 flex items-center gap-3 hover:border-ucf-gold/40 hover:bg-app-surface-raised transition-colors duration-200 group"
      >
        <div className="w-9 h-9 bg-ucf-gold/10 rounded-xl flex items-center justify-center shrink-0 group-hover:bg-ucf-gold/15 transition-colors duration-200">
          <Users className="w-4 h-4 text-ucf-gold" />
        </div>

        <div className="flex-1 min-w-0">
          <p className="font-medium text-white text-sm tracking-tight truncate">{g.name}</p>

          {g.courses && (
            <p className="text-xs text-ucf-gold/80 mt-0.5 truncate">
              {g.courses.code}
              {g.courses.name && g.courses.name !== g.courses.code && (
                <span className="text-gray-600"> · {g.courses.name}</span>
              )}
              {formatProfessor(g) && <span className="text-gray-500"> · {formatProfessor(g)}</span>}
            </p>
          )}

          <p className="text-xs text-gray-600 truncate mt-1.5">
            {preview ? (
              <>
                {preview} <span className="text-gray-700">· {timeAgo(lastMsg.created_at)}</span>
              </>
            ) : (
              <span className="text-gray-700 italic">No messages yet</span>
            )}
          </p>
        </div>

        {/* Right-hand column — member count on top, unread bell+count
            stacked directly beneath it when there's anything unread. */}
        <div className="flex flex-col items-center gap-2 shrink-0">
          <span className="text-xs text-gray-600 whitespace-nowrap">{memberCount} / {g.max_members}</span>
          {unreadCount > 0 && <UnreadIndicator count={unreadCount} iconClassName="w-3.5 h-3.5" />}
        </div>
      </Link>
    </motion.div>
  )
}

function GroupCard({ g, userId, groupMeta }) {
  const { memberCount, lastMsg, preview, unreadCount } = computeGroupCardMeta(g, groupMeta, userId)
  return (
    <motion.div
      variants={dashFadeUp}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -4 }}
      className="h-full"
    >
      <Link
        to={`/groups/${g.id}`}
        className="card border border-app-border rounded-2xl p-5 flex flex-col h-full hover:border-ucf-gold/40 hover:bg-app-surface-raised transition-colors duration-200 group"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="w-9 h-9 bg-ucf-gold/10 rounded-xl flex items-center justify-center shrink-0 group-hover:bg-ucf-gold/15 transition-colors duration-200">
            <Users className="w-4 h-4 text-ucf-gold" />
          </div>
          <span className="text-xs text-gray-600">{memberCount} / {g.max_members}</span>
        </div>

        <p className="font-medium text-white text-sm tracking-tight truncate mb-1">{g.name}</p>

        {g.courses && (
          <div className="flex items-center justify-between gap-2 mb-1">
            <p className="text-xs text-ucf-gold/80 truncate">
              {g.courses.code}
              {g.courses.name && g.courses.name !== g.courses.code && (
                <span className="text-gray-600"> · {g.courses.name}</span>
              )}
            </p>
            {unreadCount > 0 && <UnreadIndicator count={unreadCount} />}
          </div>
        )}
        {formatProfessor(g) && <p className="text-xs text-gray-500 truncate mb-3">{formatProfessor(g)}</p>}

        <div className="mt-auto pt-3 border-t border-app-border/60">
          <p className="text-xs text-gray-600 truncate">
            {preview ? (
              <>
                {preview} <span className="text-gray-700">· {timeAgo(lastMsg.created_at)}</span>
              </>
            ) : (
              <span className="text-gray-700 italic">No messages yet</span>
            )}
          </p>
        </div>
      </Link>
    </motion.div>
  )
}

export default function Dashboard() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [activeTab, setActiveTab] = useState(location.state?.tab || 'home')
  const [pendingQuiz, setPendingQuiz] = useState(null) // { quizId, sessionTitle }
  const [sessionReminder, setSessionReminder] = useState(null)

  const [accountMenuOpen, setAccountMenuOpen] = useState(false)
  const [showEditName, setShowEditName] = useState(false)
  const [showDeleteAccountConfirm, setShowDeleteAccountConfirm] = useState(false)
  const [deletingAccount, setDeletingAccount] = useState(false)
  const [deleteAccountError, setDeleteAccountError] = useState('')
  const accountMenuRef = useRef(null)

  const handleSignOut = async () => {
    await signOut()
    navigate('/')
  }

  // Routed through the server (not a plain RLS delete) because any groups
  // this user owns need their Supabase Storage objects cleaned up before
  // the auth user itself is deleted — see the comment on DELETE /api/account
  // in server/src/routes/account.js.
  const handleDeleteAccount = async () => {
    setDeletingAccount(true)
    setDeleteAccountError('')
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/account`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${session?.access_token}` },
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || 'Failed to delete account')
      }
      await signOut()
      navigate('/')
    } catch (err) {
      setDeleteAccountError(err.message)
      setDeletingAccount(false)
    }
  }

  useEffect(() => {
    if (!accountMenuOpen) return
    function handler(e) {
      if (accountMenuRef.current && !accountMenuRef.current.contains(e.target)) setAccountMenuOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [accountMenuOpen])

  useEffect(() => {
    if (!user) return
    async function checkPendingQuizzes() {
      const cutoff = new Date(Date.now() - 30 * 60 * 1000).toISOString()

      const { data: attended } = await supabase
        .from('session_attendees')
        .select('session_id')
        .eq('user_id', user.id)

      if (!attended?.length) return
      const sessionIds = attended.map((a) => a.session_id)

      const { data: pastSessions } = await supabase
        .from('sessions')
        .select('id, title')
        .in('id', sessionIds)
        .lt('end_time', cutoff)
        .not('end_time', 'is', null)

      if (!pastSessions?.length) return

      const { data: quizzes } = await supabase
        .from('quizzes')
        .select('id, session_id')
        .in('session_id', pastSessions.map((s) => s.id))

      if (!quizzes?.length) return

      const { data: completed } = await supabase
        .from('quiz_results')
        .select('quiz_id')
        .eq('user_id', user.id)
        .in('quiz_id', quizzes.map((q) => q.id))

      const completedIds = new Set((completed || []).map((r) => r.quiz_id))
      const pending = quizzes.find((q) => !completedIds.has(q.id))
      if (pending) {
        const session = pastSessions.find((s) => s.id === pending.session_id)
        setPendingQuiz({ quizId: pending.id, sessionTitle: session?.title || 'a session' })
      }
    }
    checkPendingQuizzes()
  }, [user])

  useEffect(() => {
    if (!user) return
    async function checkUpcomingReminders() {
      const now = new Date()
      const thirtyMin = new Date(now.getTime() + 30 * 60 * 1000)
      const { data: memberships } = await supabase.from('group_members').select('group_id').eq('user_id', user.id)
      if (!memberships?.length) return
      const groupIds = memberships.map((m) => m.group_id)
      const { data: sessions } = await supabase
        .from('sessions')
        .select('*')
        .in('group_id', groupIds)
        .gte('start_time', now.toISOString())
        .lte('start_time', thirtyMin.toISOString())
        .order('start_time', { ascending: true })
        .limit(1)
      if (sessions?.length) setSessionReminder(sessions[0])
    }
    checkUpcomingReminders()
  }, [user])

  const [sidebarExpanded, setSidebarExpanded] = useState(false)
  const [sessionsViewMode, setSessionsViewMode] = useState('agenda')
  const firstName = user?.user_metadata?.full_name?.split(' ')[0] || 'Knight'

  return (
    <div className="h-screen bg-app-bg flex overflow-hidden">
      {/* Fixed glow */}
      <div
        className="fixed top-0 left-0 w-full pointer-events-none"
        style={{
          height: '500px',
          background: 'radial-gradient(ellipse 70% 50% at 60% -10%, rgba(255,201,4,0.08) 0%, transparent 70%)',
          zIndex: 0,
        }}
      />

      {/* Sidebar */}
      <aside
        onMouseEnter={() => setSidebarExpanded(true)}
        onMouseLeave={() => setSidebarExpanded(false)}
        className={`${sidebarExpanded ? 'w-60' : 'w-16'} transition-[width] duration-200 ease-in-out bg-app-surface border-r border-app-border flex flex-col shrink-0 overflow-hidden`}
      >
        <div className="px-4 py-5 border-b border-app-border flex items-center min-h-[64px]">
          <Link to="/" className="flex items-center gap-2.5 shrink-0">
            <div className="w-8 h-8 bg-ucf-gold/15 rounded-lg flex items-center justify-center shrink-0">
              <BookOpen className="h-4 w-4 text-ucf-gold" />
            </div>
            <span className={`font-bold text-base text-white tracking-tight uppercase whitespace-nowrap transition-all duration-200 overflow-hidden ${sidebarExpanded ? 'max-w-[140px] opacity-100' : 'max-w-0 opacity-0'}`}>
              IgKnight
            </span>
          </Link>
        </div>

        <nav className="flex-1 px-2 py-4 space-y-0.5">
          {NAV.map(({ id, icon: Icon, label }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`w-full flex items-center py-2.5 rounded-lg text-sm font-medium transition-all duration-200 relative
                ${sidebarExpanded ? 'px-3 gap-3 justify-start' : 'justify-center px-0'}
                ${activeTab === id ? 'bg-ucf-gold/10 text-ucf-gold' : 'text-gray-500 hover:text-[#e8e8e8] hover:bg-app-surface-raised'}
              `}
            >
              {activeTab === id && sidebarExpanded && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-0.5 bg-ucf-gold rounded-r-full" />
              )}
              <Icon className="w-4 h-4 shrink-0" />
              <span className={`whitespace-nowrap overflow-hidden uppercase tracking-wide transition-all duration-200 ${sidebarExpanded ? 'max-w-[140px] opacity-100' : 'max-w-0 opacity-0'}`}>
                {label}
              </span>
            </button>
          ))}
        </nav>

        <div className="p-2 border-t border-app-border relative" ref={accountMenuRef}>
          <button
            onClick={() => setAccountMenuOpen((o) => !o)}
            className={`w-full flex items-center p-2 rounded-xl transition-colors duration-200 ${sidebarExpanded ? 'gap-3' : 'justify-center'} ${accountMenuOpen ? 'bg-app-surface-raised' : 'hover:bg-app-surface-raised'}`}
          >
            <div className="w-8 h-8 bg-ucf-gold/20 rounded-full flex items-center justify-center shrink-0">
              <span className="text-ucf-gold text-sm font-bold">
                {firstName.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className={`min-w-0 overflow-hidden transition-all duration-200 text-left ${sidebarExpanded ? 'max-w-[140px] opacity-100' : 'max-w-0 opacity-0'}`}>
              <p className="text-sm font-semibold text-white truncate leading-tight whitespace-nowrap">
                {user?.user_metadata?.full_name || 'UCF Knight'}
              </p>
              <p className="text-xs text-gray-500 truncate whitespace-nowrap">{user?.email}</p>
            </div>
          </button>

          {accountMenuOpen && (
            <div className="fixed bottom-[72px] left-2 w-60 card-elevated border rounded-xl shadow-xl z-30 py-1 overflow-hidden">
              <button
                onClick={() => { setActiveTab('profile'); setAccountMenuOpen(false) }}
                className="w-full text-left px-4 py-2.5 text-sm text-gray-300 hover:text-white hover:bg-app-input transition-colors duration-150 flex items-center gap-2.5"
              >
                <Target className="w-3.5 h-3.5" />
                My KnightCheck Stats
              </button>
              <button
                onClick={() => { setShowEditName(true); setAccountMenuOpen(false) }}
                className="w-full text-left px-4 py-2.5 text-sm text-gray-300 hover:text-white hover:bg-app-input transition-colors duration-150 flex items-center gap-2.5"
              >
                <Pencil className="w-3.5 h-3.5" />
                Edit name
              </button>
              <div className="my-1 mx-3 h-px bg-app-border" />
              <button
                onClick={handleSignOut}
                className="w-full text-left px-4 py-2.5 text-sm text-red-400 hover:text-red-300 hover:bg-app-input transition-colors duration-150 flex items-center gap-2.5"
              >
                <LogOut className="w-3.5 h-3.5" />
                Sign out
              </button>
              <button
                onClick={() => { setShowDeleteAccountConfirm(true); setAccountMenuOpen(false) }}
                className="w-full text-left px-4 py-2.5 text-sm text-red-400 hover:text-red-300 hover:bg-app-input transition-colors duration-150 flex items-center gap-2.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete account
              </button>
            </div>
          )}
        </div>
      </aside>

      {showEditName && (
        <EditNameModal
          userId={user.id}
          currentName={user?.user_metadata?.full_name || ''}
          onClose={() => setShowEditName(false)}
          onSaved={() => {}}
        />
      )}

      {/* Delete account confirmation modal */}
      {showDeleteAccountConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="card-elevated border rounded-2xl w-full max-w-sm p-6 shadow-2xl">
            <h2 className="font-bold text-white mb-2">Delete your account?</h2>
            <p className="text-sm text-gray-400 mb-6">
              This permanently deletes your account. Any groups you own will be deleted for everyone —
              chat history, sessions, notes, and uploaded files included. This can't be undone.
            </p>
            {deleteAccountError && (
              <div className="flex items-start gap-2.5 bg-red-950/40 border border-red-800/40 rounded-xl p-3 mb-4">
                <AlertCircle className="w-3.5 h-3.5 text-red-400 mt-0.5 shrink-0" />
                <p className="text-red-400 text-xs">{deleteAccountError}</p>
              </div>
            )}
            <div className="flex gap-3">
              <button
                onClick={() => { setShowDeleteAccountConfirm(false); setDeleteAccountError('') }}
                disabled={deletingAccount}
                className="flex-1 py-2.5 rounded-xl border border-app-border text-gray-400 hover:text-white transition-colors duration-200 text-sm font-medium disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={deletingAccount}
                className="flex-1 py-2.5 rounded-xl bg-red-500/90 text-white font-bold hover:bg-red-500 transition-colors duration-200 disabled:opacity-50 text-sm"
              >
                {deletingAccount ? 'Deleting…' : 'Delete account'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main */}
      <main className="flex-1 overflow-y-auto flex flex-col">
        {(pendingQuiz || sessionReminder) && (
          <div className="sticky top-0 z-10 flex flex-col shrink-0">
            {pendingQuiz && (
              <div className="relative border-b border-ucf-gold/25 bg-app-surface">
                <div className="absolute inset-0 bg-ucf-gold/10 pointer-events-none" />
                <div className="relative px-8 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Target className="w-4 h-4 text-ucf-gold shrink-0" />
                    <p className="text-sm text-white">
                      Your KnightCheck is ready — see how much you retained from{' '}
                      <span className="text-ucf-gold font-medium">{pendingQuiz.sessionTitle}</span> 🎯
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-4">
                    <button
                      onClick={() => navigate(`/quiz/${pendingQuiz.quizId}`)}
                      className="text-xs bg-ucf-gold text-black font-bold px-3 py-1.5 rounded-xl hover:bg-yellow-400 transition-colors duration-200"
                    >
                      Take Quiz
                    </button>
                    <button onClick={() => setPendingQuiz(null)} className="text-gray-500 hover:text-gray-300 transition-colors">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            )}
            {sessionReminder && (() => {
              const sType = sessionReminder.session_type || (sessionReminder.is_virtual ? 'online' : 'in_person')
              return (
                <div className="relative border-b border-ucf-gold/25 bg-app-surface">
                  <div className="absolute inset-0 bg-ucf-gold/10 pointer-events-none" />
                  <div className="relative px-8 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Clock className="w-4 h-4 text-ucf-gold shrink-0" />
                      <p className="text-sm text-white">
                        <span className="font-medium text-ucf-gold">{sessionReminder.title}</span> is starting soon
                        {sType === 'in_person' && sessionReminder.location && (
                          <> 📍 {sessionReminder.location}</>
                        )}
                        {sType === 'hybrid' && sessionReminder.location && (
                          <> — 📍 {sessionReminder.location}</>
                        )}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-4">
                      {(sType === 'hybrid' || sType === 'online') && sessionReminder.meeting_url && (
                        <a
                          href={sessionReminder.meeting_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs bg-ucf-gold text-black font-bold px-3 py-1.5 rounded-xl hover:bg-yellow-400 transition-colors duration-200 flex items-center gap-1.5"
                        >
                          <Video className="w-3 h-3" />
                          {sType === 'hybrid' ? 'Join Online →' : 'Join Meeting →'}
                        </a>
                      )}
                      <button onClick={() => setSessionReminder(null)} className="text-gray-500 hover:text-gray-300 transition-colors">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              )
            })()}
          </div>
        )}
        <div
          className={`flex-1 w-full mx-auto px-8 py-10 transition-[max-width] duration-200 ${
            activeTab === 'sessions' && sessionsViewMode === 'calendar'
              ? 'max-w-[1400px]'
              : activeTab === 'home'
                ? 'max-w-6xl'
                : 'max-w-5xl'
          }`}
        >
          <div key={activeTab} className="tab-enter">
            {activeTab === 'home' && (
              <HomeTab
                firstName={firstName}
                onGoToDiscover={() => setActiveTab('discover')}
                onGoToKnightCheck={() => setActiveTab('profile')}
              />
            )}
            {activeTab === 'discover' && <DiscoveryTab />}
            {activeTab === 'sessions' && <SessionsTab viewMode={sessionsViewMode} onViewModeChange={setSessionsViewMode} />}
            {activeTab === 'profile' && <ProfileTab />}
          </div>
        </div>
      </main>
    </div>
  )
}

function HomeTab({ firstName, onGoToDiscover, onGoToKnightCheck }) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [stats, setStats] = useState({ groups: 0, sessionsThisWeek: 0, newMessages: 0 })
  const [groups, setGroups] = useState([])
  const [groupMeta, setGroupMeta] = useState({})
  const [loading, setLoading] = useState(true)
  // Right-rail data — a KnightCheck snapshot (streak/average/sparkline) and
  // a "Next Up" spotlight on the single soonest session across every
  // group, neither of which existed anywhere on Home before.
  const [quizResults, setQuizResults] = useState([])
  const [quizLoading, setQuizLoading] = useState(true)
  const [nextSession, setNextSession] = useState(null)
  const [nextSessionLoading, setNextSessionLoading] = useState(true)
  const nowTick = useNowTick()
  // Sender names for the group-card preview, keyed by user id. Populated by
  // fetchAll and read from the realtime handler below (a ref so the
  // handler's closure always sees the latest map without needing to
  // resubscribe every time it changes).
  const userNamesRef = useRef({})
  const [showModal, setShowModal] = useState(false)
  // Remembered across visits so the layout choice sticks.
  const [viewMode, setViewMode] = useState(() => localStorage.getItem('ks:groupViewMode') || 'rows')
  useEffect(() => {
    localStorage.setItem('ks:groupViewMode', viewMode)
  }, [viewMode])

  useEffect(() => {
    if (!user) return
    async function fetchAll() {
      const { data: memberships } = await supabase
        .from('group_members')
        .select('group_id, joined_at, groups(*, courses(code, name))')
        .eq('user_id', user.id)
        .order('joined_at', { ascending: false })

      if (!memberships || memberships.length === 0) {
        setLoading(false)
        setQuizLoading(false)
        setNextSessionLoading(false)
        return
      }

      const groupIds = memberships.map((m) => m.group_id)
      const groupList = memberships.map((m) => m.groups).filter(Boolean)
      setGroups(groupList)

      const weekStart = new Date()
      weekStart.setDate(weekStart.getDate() - weekStart.getDay())
      weekStart.setHours(0, 0, 0, 0)
      const nowIso = new Date().toISOString()

      const [
        { data: weekSessions },
        { data: statMessages },
        { data: allMembers },
        { data: recentMessages },
        { data: recentQuizResults },
        { data: upcoming },
      ] = await Promise.all([
        supabase.from('sessions').select('id').in('group_id', groupIds).gte('start_time', weekStart.toISOString()),
        supabase.from('messages').select('id, group_id, user_id, created_at').in('group_id', groupIds).neq('user_id', user.id),
        supabase.from('group_members').select('group_id, user_id, users(full_name)').in('group_id', groupIds),
        supabase.from('messages').select('id, group_id, content, user_id, created_at, file_name, file_type, storage_path, users(full_name)').in('group_id', groupIds).order('created_at', { ascending: false }).limit(50),
        supabase.from('quiz_results').select('id, score, completed_at').eq('user_id', user.id).order('completed_at', { ascending: false }).limit(12),
        // The soonest session that hasn't ended yet — covers both "not
        // started" and "in progress right now", same distinction
        // GroupChat's Ongoing/Upcoming split uses.
        supabase.from('sessions').select('*, groups(name, courses(code))').in('group_id', groupIds).gte('end_time', nowIso).order('start_time', { ascending: true }).limit(1),
      ])

      setQuizResults(recentQuizResults || [])
      setQuizLoading(false)
      setNextSession(upcoming?.[0] || null)
      setNextSessionLoading(false)

      // Per-group unread count — same lastRead/muted cutoff logic as the
      // "New Messages" stat below, just tallied per group instead of
      // summed, so each group card can show its own badge. A group drops
      // out of this map (and its badge disappears) the moment its lastRead
      // is bumped, which happens whenever the user opens that group's chat
      // — see the mount + "while actively viewing" effects in GroupChat.jsx.
      const unreadCounts = {}
      const unreadMessages = (statMessages || []).filter((msg) => {
        if (localStorage.getItem(`ks:muted:${msg.group_id}`)) return false
        const lastRead = localStorage.getItem(`ks:lastRead:${msg.group_id}`)
        const cutoff = lastRead || memberships.find((m) => m.group_id === msg.group_id)?.joined_at || new Date(0).toISOString()
        return msg.created_at > cutoff
      })
      for (const msg of unreadMessages) {
        unreadCounts[msg.group_id] = (unreadCounts[msg.group_id] || 0) + 1
      }

      setStats({ groups: memberships.length, sessionsThisWeek: weekSessions?.length ?? 0, newMessages: unreadMessages.length })

      // member counts, and a userId -> name lookup (used to label live
      // messages that arrive over realtime below, since those rows don't
      // come with the users(full_name) join).
      const memberCounts = {}
      const userNames = {}
      for (const m of allMembers || []) {
        memberCounts[m.group_id] = (memberCounts[m.group_id] || 0) + 1
        if (m.user_id && m.users?.full_name) userNames[m.user_id] = m.users.full_name
      }
      userNamesRef.current = userNames

      // last message per group (recentMessages is already desc by created_at)
      const lastMessages = {}
      for (const msg of recentMessages || []) {
        if (!lastMessages[msg.group_id]) lastMessages[msg.group_id] = msg
      }

      setGroupMeta({ memberCounts, lastMessages, unreadCounts })
      setLoading(false)
    }
    fetchAll()
  }, [user])

  // Live updates for group-card previews/unread badges and the "New
  // Messages" stat. Without this, the dashboard only reflects messages that
  // existed at the moment it loaded — someone else sending a message never
  // shows up until the page is reloaded. RLS on the messages table already
  // scopes SELECT (and therefore realtime delivery) to groups the current
  // user belongs to, so no group_id filter is needed here.
  useEffect(() => {
    if (!user) return
    const channel = supabase
      .channel(`dashboard:messages:${user.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
        const msg = payload.new
        if (msg.user_id === user.id) return

        const muted = !!localStorage.getItem(`ks:muted:${msg.group_id}`)

        setGroupMeta((prev) => {
          // Ignore messages for a group we don't have loaded yet (e.g. we
          // joined it after this page's initial fetch) rather than showing
          // a preview/badge for a card that isn't rendered.
          if (!prev.memberCounts || !(msg.group_id in prev.memberCounts)) return prev

          const senderName = userNamesRef.current[msg.user_id] || null
          const enriched = { ...msg, users: senderName ? { full_name: senderName } : null }

          return {
            ...prev,
            lastMessages: { ...prev.lastMessages, [msg.group_id]: enriched },
            unreadCounts: muted
              ? prev.unreadCounts
              : { ...prev.unreadCounts, [msg.group_id]: (prev.unreadCounts?.[msg.group_id] || 0) + 1 },
          }
        })

        if (!muted) setStats((prev) => ({ ...prev, newMessages: prev.newMessages + 1 }))
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [user])

  const handleGroupCreated = (group) => setGroups((prev) => [group, ...prev])

  const statCards = [
    { label: 'Groups Joined', value: stats.groups, icon: Users },
    { label: 'Sessions This Week', value: stats.sessionsThisWeek, icon: Calendar },
    { label: 'New Messages', value: stats.newMessages, icon: MessageSquare },
  ]

  // Same streak definition as KnightCheck's own stat card: consecutive
  // passing (>=3/5) quizzes counting back from the most recent.
  const quizAvg = quizResults.length > 0
    ? (quizResults.reduce((sum, r) => sum + r.score, 0) / quizResults.length).toFixed(1)
    : null
  let quizStreak = 0
  for (const r of quizResults) {
    if (r.score >= 3) quizStreak++
    else break
  }

  return (
    <div>
      {showModal && (
        <CreateGroupModal
          onClose={() => setShowModal(false)}
          onCreated={handleGroupCreated}
          onGoToDiscover={() => {
            setShowModal(false)
            onGoToDiscover()
          }}
        />
      )}

      <TypingAnimation as="h1" className="text-2xl font-semibold tracking-tight mb-1 text-white uppercase" duration={45}>
        {`Good to see you, ${firstName}!`}
      </TypingAnimation>
      <p className="text-sm text-gray-500 mb-6">Here's what's happening with your study groups.</p>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-6 items-start">
      <div className="min-w-0">

      <motion.div
        className="grid grid-cols-1 sm:grid-cols-3 gap-4"
        initial="hidden"
        animate="visible"
        variants={dashStagger}
      >
        {statCards.map(({ label, value, icon: Icon }) => (
          <motion.div
            key={label}
            variants={dashFadeUp}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            whileHover={{ y: -4 }}
            className="card border border-app-border rounded-2xl p-6 hover:border-ucf-gold/30 transition-colors duration-200"
          >
            <div className="mb-5">
              <div className="w-9 h-9 bg-ucf-gold/10 rounded-xl flex items-center justify-center">
                <Icon className="w-4 h-4 text-ucf-gold" />
              </div>
            </div>
            <p className="text-4xl font-bold tracking-tight text-white">
              <NumberTicker value={value} />
            </p>
            <p className="text-xs text-gray-600 mt-2 uppercase tracking-widest font-medium">{label}</p>
          </motion.div>
        ))}
      </motion.div>

      <DashDivider />

      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-base font-semibold tracking-tight text-white">My Study Groups</h2>
          <p className="text-xs text-gray-500 mt-0.5">Click a group to open the chat</p>
        </div>
        <div className="flex items-center gap-2">
          {!loading && groups.length > 0 && (
            <div className="flex items-center gap-0.5 bg-app-input border border-app-border rounded-lg p-0.5">
              <button
                onClick={() => setViewMode('rows')}
                aria-label="List view"
                aria-pressed={viewMode === 'rows'}
                className={`p-1.5 rounded-md transition-colors duration-150 ${
                  viewMode === 'rows' ? 'bg-ucf-gold/15 text-ucf-gold' : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                <List className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setViewMode('cards')}
                aria-label="Card view"
                aria-pressed={viewMode === 'cards'}
                className={`p-1.5 rounded-md transition-colors duration-150 ${
                  viewMode === 'cards' ? 'bg-ucf-gold/15 text-ucf-gold' : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-1.5 bg-ucf-gold text-black font-bold px-3.5 py-2 rounded-xl text-sm hover:bg-yellow-400 transition-colors duration-200"
          >
            <Plus className="w-3.5 h-3.5" /> New Group
          </button>
        </div>
      </div>

      {loading ? (
        <div className={viewMode === 'cards' ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4' : 'space-y-2'}>
          {[0, 1, 2].map((i) => (
            <SkeletonBlock key={i} className={viewMode === 'cards' ? 'h-40' : 'h-[76px]'} />
          ))}
        </div>
      ) : groups.length > 0 ? (
        <motion.div
          key={viewMode}
          initial="hidden"
          animate="visible"
          variants={dashStagger}
          className={viewMode === 'cards' ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4' : 'space-y-2'}
        >
          {groups.map((g) =>
            viewMode === 'cards' ? (
              <GroupCard key={g.id} g={g} userId={user.id} groupMeta={groupMeta} />
            ) : (
              <GroupRow key={g.id} g={g} userId={user.id} groupMeta={groupMeta} />
            )
          )}
        </motion.div>
      ) : (
        <div className="card border border-app-border rounded-2xl p-8 text-center">
          <div className="w-12 h-12 bg-ucf-gold/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Users className="w-6 h-6 text-ucf-gold/60" />
          </div>
          <p className="text-sm font-medium text-white mb-1">No groups yet</p>
          <p className="text-xs text-gray-600 mb-5">Enter any UCF course code to get started, or find one in Discover.</p>
          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-2 bg-ucf-gold text-black font-semibold px-4 py-2 rounded-xl text-sm hover:bg-yellow-400 transition-colors duration-200"
          >
            <Plus className="w-4 h-4" /> Create your first group
          </button>
        </div>
      )}

      </div>

      <motion.aside
        className="space-y-6 xl:sticky xl:top-10"
        initial="hidden"
        animate="visible"
        variants={dashStagger}
      >
        <motion.div
          variants={dashFadeUp}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="card border border-app-border rounded-2xl p-5"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-ucf-gold/10 rounded-lg flex items-center justify-center">
                <Target className="w-4 h-4 text-ucf-gold" />
              </div>
              <p className="text-sm font-semibold text-white">KnightCheck</p>
            </div>
            <button
              onClick={onGoToKnightCheck}
              className="text-xs text-ucf-gold hover:text-yellow-400 font-medium transition-colors duration-150"
            >
              View all
            </button>
          </div>

          {quizLoading ? (
            <div className="space-y-2">
              <SkeletonLine className="h-3.5 w-32" />
              <SkeletonLine className="h-3.5 w-24" />
            </div>
          ) : quizResults.length === 0 ? (
            <p className="text-xs text-gray-600">No quizzes taken yet. Complete a KnightCheck after a study session to see your stats here.</p>
          ) : (
            <>
              <div className="flex items-center gap-5 mb-4">
                <div>
                  <p className="text-2xl font-bold tracking-tight text-white">{quizAvg}<span className="text-sm text-gray-600">/5</span></p>
                  <p className="text-[10px] text-gray-600 uppercase tracking-widest font-medium mt-0.5">Avg Score</p>
                </div>
                <div className="flex items-center gap-1.5">
                  <Flame className={`w-4 h-4 ${quizStreak > 0 ? 'text-ucf-gold' : 'text-gray-700'}`} />
                  <div>
                    <p className="text-2xl font-bold tracking-tight text-white">{quizStreak}</p>
                    <p className="text-[10px] text-gray-600 uppercase tracking-widest font-medium -mt-0.5">Streak</p>
                  </div>
                </div>
              </div>
              <div className="flex items-end gap-1 h-10">
                {quizResults.slice(0, 8).slice().reverse().map((r) => (
                  <div
                    key={r.id}
                    title={`${r.score}/5`}
                    className={`flex-1 rounded-t-sm ${r.score >= 3 ? 'bg-green-500/60' : 'bg-red-500/60'}`}
                    style={{ height: `${Math.max(15, Math.round((r.score / 5) * 100))}%` }}
                  />
                ))}
              </div>
            </>
          )}
        </motion.div>

        <motion.div
          variants={dashFadeUp}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="card border border-app-border rounded-2xl p-5"
        >
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 bg-ucf-gold/10 rounded-lg flex items-center justify-center">
              <Clock className="w-4 h-4 text-ucf-gold" />
            </div>
            <p className="text-sm font-semibold text-white">Next Up</p>
          </div>

          {nextSessionLoading ? (
            <div className="space-y-2">
              <SkeletonLine className="h-4 w-3/4" />
              <SkeletonLine className="h-3 w-1/2" />
              <SkeletonLine className="h-8 w-full mt-3" />
            </div>
          ) : !nextSession ? (
            <p className="text-xs text-gray-600">No upcoming sessions. Schedule one from any group's Sessions tab.</p>
          ) : (
            (() => {
              const label = nextSession.groups
              const sType = nextSession.session_type || 'in_person'
              const { label: countdownLabel, ongoing } = formatSessionCountdown(nextSession, nowTick)
              const hasStarted = new Date(nextSession.start_time) <= nowTick

              return (
                <div>
                  <div className="flex items-center gap-1.5 mb-2">
                    {ongoing && <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse shrink-0" />}
                    <p className={`text-xs font-semibold uppercase tracking-wide ${ongoing ? 'text-red-400' : 'text-ucf-gold'}`}>
                      {countdownLabel}
                    </p>
                  </div>
                  <p className="text-sm font-semibold text-white leading-snug mb-1">{nextSession.title}</p>
                  <p className="text-xs text-gray-500 mb-3">
                    {label?.courses?.code || label?.name} · {new Date(nextSession.start_time).toLocaleString([], { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </p>

                  {(sType === 'in_person' || sType === 'hybrid') && nextSession.location && (
                    <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-3">
                      <MapPin className="w-3.5 h-3.5 text-gray-500 shrink-0" />
                      <span className="truncate">{nextSession.location}</span>
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    {(sType === 'hybrid' || sType === 'online') && nextSession.meeting_url && (
                      <a
                        href={hasStarted ? nextSession.meeting_url : undefined}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-colors duration-200 ${
                          hasStarted
                            ? 'bg-ucf-gold text-black hover:bg-yellow-400'
                            : 'bg-ucf-gold/15 text-ucf-gold/50 cursor-not-allowed pointer-events-none'
                        }`}
                      >
                        <Video className="w-3.5 h-3.5" /> Join
                      </a>
                    )}
                    <button
                      onClick={() => navigate(`/groups/${nextSession.group_id}/sessions/${nextSession.id}`, { state: { from: 'dashboard-home' } })}
                      className="text-xs text-gray-400 hover:text-white font-medium transition-colors duration-150"
                    >
                      View details
                    </button>
                  </div>
                </div>
              )
            })()
          )}
        </motion.div>
      </motion.aside>
      </div>
    </div>
  )
}

function ProfileTab() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(true)
  const [groupFilter, setGroupFilter] = useState('all')

  useEffect(() => {
    if (!user) return
    async function fetchResults() {
      const { data } = await supabase
        .from('quiz_results')
        .select('id, score, completed_at, quiz_id, quizzes(id, topics, session_id, sessions(title, group_id, groups(name, courses(code))))')
        .eq('user_id', user.id)
        .order('completed_at', { ascending: false })
      setResults(data || [])
      setLoading(false)
    }
    fetchResults()
  }, [user])

  const groupOptions = []
  const seenGroupIds = new Set()
  for (const r of results) {
    const session = r.quizzes?.sessions
    const group = session?.groups
    if (session?.group_id && group && !seenGroupIds.has(session.group_id)) {
      seenGroupIds.add(session.group_id)
      groupOptions.push({ id: session.group_id, name: group.name, code: group.courses?.code })
    }
  }

  const filteredResults = groupFilter === 'all'
    ? results
    : results.filter((r) => r.quizzes?.sessions?.group_id === groupFilter)

  const avgScore = filteredResults.length > 0
    ? (filteredResults.reduce((sum, r) => sum + r.score, 0) / filteredResults.length).toFixed(1)
    : '—'

  let streak = 0
  for (const r of filteredResults) {
    if (r.score >= 3) streak++
    else break
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight text-white mb-1 uppercase">KnightCheck Stats</h1>
      <p className="text-sm text-gray-500 mb-6">Your quiz performance across all study sessions</p>

      <motion.div
        className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6"
        initial="hidden"
        animate="visible"
        variants={dashStagger}
      >
        {[
          { label: 'Average Score', value: filteredResults.length > 0 ? Number(avgScore) : null, decimalPlaces: 1, suffix: '/5', icon: Trophy },
          { label: 'Retention Streak', value: streak, icon: Flame },
          { label: 'Quizzes Taken', value: filteredResults.length, icon: Target },
        ].map(({ label, value, decimalPlaces, suffix, icon: Icon }) => (
          <motion.div
            key={label}
            variants={dashFadeUp}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="card border border-app-border rounded-2xl p-6"
          >
            <div className="mb-4">
              <div className="w-9 h-9 bg-ucf-gold/10 rounded-xl flex items-center justify-center">
                <Icon className="w-4 h-4 text-ucf-gold" />
              </div>
            </div>
            {loading ? (
              <SkeletonLine className="h-7 w-14 mb-2" />
            ) : (
              <p className="text-3xl font-bold tracking-tight text-white">
                {value === null ? '—' : (
                  <>
                    <NumberTicker value={value} decimalPlaces={decimalPlaces || 0} />
                    {suffix}
                  </>
                )}
              </p>
            )}
            <p className="text-xs text-gray-600 mt-2 uppercase tracking-widest font-medium">{label}</p>
          </motion.div>
        ))}
      </motion.div>

      {!loading && filteredResults.length > 0 && <ScoreSparkline results={filteredResults} />}

      <DashDivider />

      <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
        <h2 className="text-base font-semibold text-white">Quiz History</h2>
        {!loading && groupOptions.length > 1 && (
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={() => setGroupFilter('all')}
              className={`text-xs px-2.5 py-1 rounded-full border transition-colors duration-150 ${
                groupFilter === 'all'
                  ? 'bg-ucf-gold text-black border-ucf-gold font-semibold'
                  : 'bg-app-input border-app-border text-gray-400 hover:text-white hover:border-gray-600'
              }`}
            >
              All
            </button>
            {groupOptions.map((g) => (
              <button
                key={g.id}
                onClick={() => setGroupFilter(g.id)}
                className={`text-xs px-2.5 py-1 rounded-full border transition-colors duration-150 ${
                  groupFilter === g.id
                    ? 'bg-ucf-gold text-black border-ucf-gold font-semibold'
                    : 'bg-app-input border-app-border text-gray-400 hover:text-white hover:border-gray-600'
                }`}
              >
                {g.code || g.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {loading ? (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="card border border-app-border rounded-2xl p-4 flex items-center gap-4">
              <SkeletonCircle className="w-12 h-12 rounded-xl" />
              <div className="flex-1 min-w-0 space-y-2">
                <SkeletonLine className="h-3.5 w-40" />
                <SkeletonLine className="h-2.5 w-24" />
              </div>
              <div className="shrink-0 space-y-2">
                <SkeletonLine className="h-3 w-8 ml-auto" />
                <SkeletonLine className="h-2.5 w-14" />
              </div>
            </div>
          ))}
        </div>
      ) : filteredResults.length === 0 ? (
        <div className="card border border-app-border rounded-2xl p-8 text-center">
          <Target className="w-10 h-10 text-gray-700 mx-auto mb-3" />
          <p className="text-gray-400 text-sm">No quizzes taken yet.</p>
          <p className="text-gray-600 text-xs mt-1">Complete a KnightCheck after a study session to see your stats here.</p>
        </div>
      ) : (
        <motion.div className="space-y-2" initial="hidden" animate="visible" variants={dashStagger}>
          {filteredResults.map((r) => {
            const quiz = r.quizzes
            const session = quiz?.sessions
            const group = session?.groups
            const passed = r.score >= 3
            const topics = quiz?.topics || []
            const visibleTopics = topics.slice(0, 3)
            const extraTopics = topics.length - visibleTopics.length

            return (
              <motion.div
                key={r.id}
                variants={dashFadeUp}
                transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                onClick={() => navigate(`/quiz/${r.quiz_id}`)}
                className="card border border-app-border rounded-2xl p-4 flex items-center gap-4 hover:border-ucf-gold/30 cursor-pointer transition-colors duration-200"
              >
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${passed ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
                  <span className={`text-lg font-bold ${passed ? 'text-green-400' : 'text-red-400'}`}>{r.score}/5</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{session?.title || 'Study Session'}</p>
                  <p className="text-xs text-ucf-gold/80 truncate">
                    {group?.courses?.code && `${group.courses.code} · `}{group?.name}
                  </p>
                  {visibleTopics.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {visibleTopics.map((t) => (
                        <span key={t} className="text-xs bg-app-input border border-app-border text-gray-500 px-1.5 py-0.5 rounded-full">{t}</span>
                      ))}
                      {extraTopics > 0 && (
                        <span className="text-xs text-gray-600 px-1.5 py-0.5">+{extraTopics} more</span>
                      )}
                    </div>
                  )}
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-xs text-gray-400 font-medium">{timeAgo(r.completed_at)}</p>
                </div>
              </motion.div>
            )
          })}
        </motion.div>
      )}
    </div>
  )
}

function ScoreSparkline({ results }) {
  const chronological = results.slice(0, 12).slice().reverse()
  if (chronological.length === 0) return null

  return (
    <div className="card border border-app-border rounded-2xl p-5 mb-6">
      <p className="text-xs text-gray-500 uppercase tracking-widest font-medium mb-4">Recent Trend</p>
      <div className="flex items-end gap-1.5 h-16">
        {chronological.map((r) => {
          const heightPct = Math.max(12, Math.round((r.score / 5) * 100))
          const passed = r.score >= 3
          return (
            <div
              key={r.id}
              title={`${r.score}/5 · ${new Date(r.completed_at).toLocaleDateString()}`}
              className={`flex-1 rounded-t-md transition-colors duration-200 ${
                passed ? 'bg-green-500/60 hover:bg-green-500/80' : 'bg-red-500/60 hover:bg-red-500/80'
              }`}
              style={{ height: `${heightPct}%` }}
            />
          )
        })}
      </div>
      {chronological.length > 1 && (
        <div className="flex items-center justify-between mt-2 text-[10px] text-gray-600">
          <span>Oldest</span>
          <span>Most recent</span>
        </div>
      )}
    </div>
  )
}

function GroupDiscoveryCard({ group, isJoined, isJoining, onJoin }) {
  const memberCount = group.group_members?.length ?? 0
  const maxMembers = group.max_members || 0
  const isFull = maxMembers > 0 && memberCount >= maxMembers
  const subjectPrefix = group.courses?.code?.split(' ')[0] || null

  return (
    <div
      className={`card border border-app-border rounded-2xl p-4 flex items-center gap-3.5 transition-colors duration-200 ${
        isFull && !isJoined ? 'opacity-60' : 'hover:border-ucf-gold/25'
      }`}
    >
      <div className="w-11 h-11 bg-ucf-gold/10 rounded-xl flex items-center justify-center shrink-0">
        {subjectPrefix ? (
          <span className="text-ucf-gold text-[11px] font-bold tracking-tight">{subjectPrefix}</span>
        ) : (
          <Users className="w-4 h-4 text-ucf-gold" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        {group.courses?.code && (
          <p className="text-[11px] text-ucf-gold/80 font-medium uppercase tracking-wide">{group.courses.code}</p>
        )}
        <p className="font-medium text-white text-sm tracking-tight truncate">{group.name}</p>
        <p className="text-xs text-gray-600 mt-0.5 truncate">
          {[formatProfessor(group), maxMembers ? `${memberCount}/${maxMembers} members` : null].filter(Boolean).join(' · ')}
        </p>
        {group.description && (
          <p className="text-xs text-gray-700 mt-1 truncate">{group.description}</p>
        )}
      </div>
      <div className="shrink-0">
        {isJoined ? (
          <span className="inline-flex items-center gap-1.5 text-xs bg-ucf-gold/10 text-ucf-gold border border-ucf-gold/20 px-3 py-1.5 rounded-xl font-medium">
            <UserCheck className="w-3.5 h-3.5" /> Joined
          </span>
        ) : isFull ? (
          <span className="text-xs text-gray-600 bg-app-input border border-app-border px-3 py-1.5 rounded-xl">
            Full
          </span>
        ) : (
          <button
            onClick={() => onJoin(group)}
            disabled={isJoining}
            className="inline-flex items-center gap-1.5 bg-ucf-gold text-black font-bold px-3 py-1.5 rounded-xl text-xs hover:bg-yellow-400 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <UserPlus className="w-3.5 h-3.5" />
            {isJoining ? 'Joining…' : 'Join'}
          </button>
        )}
      </div>
    </div>
  )
}

function DiscoveryTab() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [groups, setGroups] = useState([])
  const [myGroupIds, setMyGroupIds] = useState(new Set())
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [showAll, setShowAll] = useState(false)
  const [joiningId, setJoiningId] = useState(null)
  const [joinError, setJoinError] = useState('')

  useEffect(() => {
    if (!user) return
    async function fetchData() {
      const [{ data: allGroups }, { data: memberships }] = await Promise.all([
        supabase
          .from('groups')
          .select('*, courses(code, name), group_members(id)')
          .eq('is_public', true)
          .order('created_at', { ascending: false }),
        supabase
          .from('group_members')
          .select('group_id')
          .eq('user_id', user.id),
      ])
      setGroups(allGroups || [])
      setMyGroupIds(new Set((memberships || []).map((m) => m.group_id)))
      setLoading(false)
    }
    fetchData()
  }, [user])

  const handleJoin = async (group) => {
    if (joiningId) return
    setJoiningId(group.id)
    setJoinError('')
    const { error } = await supabase
      .from('group_members')
      .insert({ group_id: group.id, user_id: user.id, role: 'member' })
    if (!error) {
      setMyGroupIds((prev) => new Set([...prev, group.id]))
      navigate(`/groups/${group.id}`)
    } else {
      // The UI already hides the Join button once a group looks full (see
      // isFull in GroupDiscoveryCard), but that's a snapshot from whenever
      // this list last loaded — someone else could take the last spot in
      // between. The enforce_group_member_cap trigger (migration 017) is
      // the real backstop for that race, so this is what surfaces its
      // rejection instead of failing silently.
      setJoinError(
        error.message?.includes('full')
          ? error.message
          : `Couldn't join "${group.name}". It may have filled up — try refreshing.`
      )
    }
    setJoiningId(null)
  }

  const trimmed = searchQuery.trim()
  const isSearching = trimmed.length > 0
  const normalizedQuery = normalizeForSearch(trimmed)
  const filtered = isSearching
    ? groups.filter((g) =>
        normalizeForSearch(g.courses?.code ?? '').includes(normalizedQuery) ||
        normalizeForSearch(formatProfessor(g)).includes(normalizedQuery)
      )
    : groups

  const recent = filtered.slice(0, 5)
  const rest = filtered.slice(5)

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight text-white mb-1 uppercase">Discover Groups</h1>
      <p className="text-sm text-gray-500 mb-6">Find and join public study groups for your UCF courses</p>

      {joinError && (
        <div className="flex items-start gap-2.5 bg-red-950/40 border border-red-800/40 rounded-xl p-3 mb-5">
          <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
          <p className="text-red-400 text-sm flex-1">{joinError}</p>
          <button onClick={() => setJoinError('')} className="text-red-400/70 hover:text-red-300 transition-colors duration-150">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Search */}
      <div className="relative mb-8">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
        <input
          value={searchQuery}
          onChange={(e) => { setSearchQuery(e.target.value); setShowAll(false) }}
          placeholder="Search by course code or professor…"
          className="w-full bg-app-input border border-app-border rounded-xl pl-10 pr-10 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-ucf-gold focus:ring-1 focus:ring-ucf-gold/50 transition text-sm"
        />
        {searchQuery && (
          <button
            onClick={() => { setSearchQuery(''); setShowAll(false) }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {loading ? (
        <div className="space-y-2">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="card border border-app-border rounded-2xl p-4 flex items-center gap-3">
              <SkeletonCircle className="w-9 h-9 rounded-xl" />
              <div className="flex-1 min-w-0 space-y-2">
                <SkeletonLine className="h-3.5 w-32" />
                <SkeletonLine className="h-2.5 w-48" />
              </div>
              <SkeletonLine className="h-7 w-16 shrink-0" />
            </div>
          ))}
        </div>
      ) : isSearching ? (
        <div>
          <p className="text-sm font-semibold text-white mb-4">
            {filtered.length > 0
              ? `${filtered.length} group${filtered.length !== 1 ? 's' : ''} for "${normalizedQuery}"`
              : `No groups found for "${normalizedQuery}"`}
          </p>
          {filtered.length > 0 ? (
            <motion.div className="space-y-2" initial="hidden" animate="visible" variants={dashStagger}>
              {filtered.map((g) => (
                <motion.div key={g.id} variants={dashFadeUp} transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}>
                  <GroupDiscoveryCard
                    group={g}
                    isJoined={myGroupIds.has(g.id)}
                    isJoining={joiningId === g.id}
                    onJoin={handleJoin}
                  />
                </motion.div>
              ))}
            </motion.div>
          ) : (
            <div className="card border border-app-border rounded-2xl p-10 text-center">
              <Search className="w-10 h-10 text-gray-700 mx-auto mb-3" />
              <p className="text-gray-400 text-sm">No study groups found for that course code or professor.</p>
              <p className="text-gray-600 text-xs mt-1">Try a different search or create a new group from the Home tab.</p>
            </div>
          )}
        </div>
      ) : groups.length === 0 ? (
        <div className="card border border-app-border rounded-2xl p-10 text-center">
          <Compass className="w-10 h-10 text-gray-700 mx-auto mb-3" />
          <p className="text-gray-400 text-sm">No public groups yet.</p>
          <p className="text-gray-600 text-xs mt-1">Be the first — create a group from the Home tab.</p>
        </div>
      ) : (
        <div>
          <motion.div className="space-y-2" initial="hidden" animate="visible" variants={dashStagger}>
            {recent.map((g) => (
              <motion.div key={g.id} variants={dashFadeUp} transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}>
                <GroupDiscoveryCard
                  group={g}
                  isJoined={myGroupIds.has(g.id)}
                  isJoining={joiningId === g.id}
                  onJoin={handleJoin}
                />
              </motion.div>
            ))}
          </motion.div>

          {rest.length > 0 && (
            <div className="mt-3">
              <button
                onClick={() => setShowAll((v) => !v)}
                className="w-full flex items-center justify-center gap-2 py-3 text-sm text-gray-500 hover:text-gray-300 bg-app-surface-raised border border-app-border rounded-xl transition-colors duration-150"
              >
                <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${showAll ? 'rotate-180' : ''}`} />
                {showAll ? 'Show less' : `See ${rest.length} more group${rest.length !== 1 ? 's' : ''}`}
              </button>
              {showAll && (
                <motion.div className="space-y-2 mt-2" initial="hidden" animate="visible" variants={dashStagger}>
                  {rest.map((g) => (
                    <motion.div key={g.id} variants={dashFadeUp} transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}>
                      <GroupDiscoveryCard
                        group={g}
                        isJoined={myGroupIds.has(g.id)}
                        isJoining={joiningId === g.id}
                        onJoin={handleJoin}
                      />
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function timeAgo(iso) {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

function formatSessionTime(iso) {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

const SESSION_BUCKET_ORDER = ['Today', 'Tomorrow', 'This Week', 'Later']

const CALENDAR_TYPE_CHIP = {
  in_person: 'bg-ucf-gold/10 text-ucf-gold hover:bg-ucf-gold/20',
  hybrid: 'bg-purple-500/10 text-purple-400 hover:bg-purple-500/20',
  online: 'bg-blue-500/10 text-blue-400 hover:bg-blue-500/20',
}

function sessionDateBucket(iso) {
  const d = new Date(iso)
  const now = new Date()
  const startOfDay = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const diffDays = Math.round((startOfDay(d) - startOfDay(now)) / 86400000)
  if (diffDays <= 0) return 'Today'
  if (diffDays === 1) return 'Tomorrow'
  if (diffDays <= 6) return 'This Week'
  return 'Later'
}

function SessionsTab({ viewMode, onViewModeChange }) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [sessions, setSessions] = useState([])
  const [attendees, setAttendees] = useState({})
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  // group_id -> { id, name, courses } lookup, used to enrich sessions that
  // arrive over realtime below (the INSERT payload is a bare row with no
  // joins, unlike the initial fetch's groups(id, name, courses(code))).
  const groupInfoRef = useRef({})
  // Ticks every 30s so a session crossing its end_time (dropping out of
  // "Upcoming") or start_time (relevant to the calendar's isPast styling
  // below) updates on its own instead of needing a reload — see
  // useNowTick's own comment for why a plain `new Date()` doesn't do this.
  const now = useNowTick()

  useEffect(() => {
    if (!user) return
    async function fetchSessions() {
      const { data: memberships } = await supabase
        .from('group_members')
        .select('group_id, groups(id, name, courses(code))')
        .eq('user_id', user.id)

      if (!memberships || memberships.length === 0) { setLoading(false); return }

      const groupIds = memberships.map((m) => m.group_id)
      groupInfoRef.current = Object.fromEntries(
        memberships.filter((m) => m.groups).map((m) => [m.group_id, m.groups])
      )
      // Fetches every session, past and future — the agenda view below
      // filters down to non-ended ones itself, but the calendar view needs
      // past sessions too so browsing to a previous month isn't just empty.
      const { data } = await supabase
        .from('sessions')
        .select('*, groups(id, name, courses(code))')
        .in('group_id', groupIds)
        .order('start_time', { ascending: true })

      if (!data || data.length === 0) { setLoading(false); return }

      setSessions(data)

      const sessionIds = data.map((s) => s.id)
      const { data: rsvps } = await supabase
        .from('session_attendees')
        .select('session_id, user_id')
        .in('session_id', sessionIds)

      if (rsvps) {
        const bySession = {}
        for (const r of rsvps) {
          if (!bySession[r.session_id]) bySession[r.session_id] = []
          bySession[r.session_id].push(r.user_id)
        }
        setAttendees(bySession)
      }

      setLoading(false)
    }
    fetchSessions()
  }, [user])

  const handleSessionCreated = (session) => {
    setSessions((prev) =>
      [...prev, session].sort((a, b) => new Date(a.start_time) - new Date(b.start_time))
    )
  }

  // Sessions were never pushed live before — this tab only reflected
  // whatever existed at the moment it loaded, so a session someone else
  // scheduled in any of your groups wouldn't show up until you reloaded.
  // RLS on the sessions table ("Group members can view sessions") already
  // scopes realtime delivery to groups the current user belongs to.
  useEffect(() => {
    if (!user) return
    const channel = supabase
      .channel(`dashboard:sessions:${user.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'sessions' }, (payload) => {
        const s = payload.new
        if (new Date(s.end_time) <= new Date()) return // shouldn't happen, but don't show an already-ended session
        const groups = groupInfoRef.current[s.group_id]
        if (!groups) return // a group we don't know about yet — skip rather than show a card with no group name

        setSessions((prev) =>
          prev.find((x) => x.id === s.id)
            ? prev
            : [...prev, { ...s, groups }].sort((a, b) => new Date(a.start_time) - new Date(b.start_time))
        )
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [user])

  // The agenda/list view only ever showed upcoming sessions ("Upcoming
  // study sessions across your groups"), so it filters the now-broader
  // `sessions` list back down — only the calendar view (below) uses the
  // full list, since that's the one that needs past sessions visible.
  const upcomingSessions = sessions.filter((s) => new Date(s.end_time) >= now)

  const sessionBuckets = {}
  for (const s of upcomingSessions) {
    const bucket = sessionDateBucket(s.start_time)
    if (!sessionBuckets[bucket]) sessionBuckets[bucket] = []
    sessionBuckets[bucket].push(s)
  }

  return (
    <div>
      {showModal && (
        <ScheduleSessionModal
          onClose={() => setShowModal(false)}
          onCreated={handleSessionCreated}
        />
      )}

      <div className="flex items-center justify-between mb-8 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-white uppercase">Sessions</h1>
          <p className="text-sm text-gray-500 mt-1">Upcoming study sessions across your groups</p>
        </div>
        <div className="flex items-center gap-2">
          {!loading && sessions.length > 0 && (
            <div className="flex items-center gap-0.5 bg-app-input border border-app-border rounded-lg p-0.5">
              <button
                onClick={() => onViewModeChange('agenda')}
                aria-label="List view"
                aria-pressed={viewMode === 'agenda'}
                className={`p-1.5 rounded-md transition-colors duration-150 ${
                  viewMode === 'agenda' ? 'bg-ucf-gold/15 text-ucf-gold' : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                <List className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => onViewModeChange('calendar')}
                aria-label="Calendar view"
                aria-pressed={viewMode === 'calendar'}
                className={`p-1.5 rounded-md transition-colors duration-150 ${
                  viewMode === 'calendar' ? 'bg-ucf-gold/15 text-ucf-gold' : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                <Calendar className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-1.5 bg-ucf-gold text-black font-bold px-3.5 py-2 rounded-xl text-sm hover:bg-yellow-400 transition-colors duration-200"
          >
            <Plus className="w-3.5 h-3.5" /> Schedule
          </button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="card border border-app-border rounded-2xl p-4 flex gap-4">
              <div className="shrink-0 w-16 border-r border-app-border pr-4 flex flex-col items-center justify-center gap-1.5">
                <SkeletonLine className="h-3.5 w-10" />
                <SkeletonLine className="h-2 w-8" />
              </div>
              <div className="flex-1 min-w-0 space-y-2 py-1">
                <SkeletonLine className="h-4 w-40" />
                <SkeletonLine className="h-2.5 w-28" />
              </div>
            </div>
          ))}
        </div>
      ) : sessions.length === 0 ? (
        <div className="card border border-app-border rounded-2xl p-10 text-center">
          <Calendar className="w-12 h-12 text-gray-700 mx-auto mb-4" />
          <p className="text-gray-400">No sessions yet.</p>
          <p className="text-gray-500 text-sm mt-1 mb-6">Schedule your first session across any of your groups.</p>
          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-2 bg-ucf-gold text-black font-semibold px-4 py-2 rounded-xl text-sm hover:bg-yellow-400 transition-colors duration-200"
          >
            <Plus className="w-4 h-4" /> Schedule a session
          </button>
        </div>
      ) : viewMode === 'calendar' ? (
        // Unlike the agenda view below, the calendar gets every session
        // (past included) so browsing to a previous month isn't empty.
        <SessionsCalendarView
          sessions={sessions}
          navigate={navigate}
        />
      ) : upcomingSessions.length === 0 ? (
        <div className="card border border-app-border rounded-2xl p-10 text-center">
          <Calendar className="w-12 h-12 text-gray-700 mx-auto mb-4" />
          <p className="text-gray-400">No upcoming sessions.</p>
          <p className="text-gray-500 text-sm mt-1 mb-6">Schedule your next session across any of your groups.</p>
          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-2 bg-ucf-gold text-black font-semibold px-4 py-2 rounded-xl text-sm hover:bg-yellow-400 transition-colors duration-200"
          >
            <Plus className="w-4 h-4" /> Schedule a session
          </button>
        </div>
      ) : (
        <div className="space-y-7">
          {SESSION_BUCKET_ORDER.filter((bucket) => sessionBuckets[bucket]?.length).map((bucket) => (
            <section key={bucket}>
              <div className="flex items-center gap-3 mb-3">
                <p className="text-xs text-gray-500 uppercase tracking-widest font-semibold shrink-0">{bucket}</p>
                <div className="flex-1 h-px bg-app-border" />
              </div>
              <motion.div className="space-y-3" initial="hidden" animate="visible" variants={dashStagger}>
                {sessionBuckets[bucket].map((s) => (
                  <motion.div key={s.id} variants={dashFadeUp} transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}>
                    <DashboardSessionCard
                      session={s}
                      count={(attendees[s.id] || []).length}
                      isAttending={(attendees[s.id] || []).includes(user.id)}
                      userId={user.id}
                      showFullDate={bucket === 'This Week' || bucket === 'Later'}
                      onClick={() => navigate(`/groups/${s.groups?.id}/sessions/${s.id}`, { state: { from: 'dashboard-sessions' } })}
                    />
                  </motion.div>
                ))}
              </motion.div>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}

function SessionsCalendarView({ sessions, navigate }) {
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), 1)
  })

  const year = calendarMonth.getFullYear()
  const month = calendarMonth.getMonth()
  const firstDow = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const today = new Date()
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month

  const sessionsByDay = {}
  for (const s of sessions) {
    const d = new Date(s.start_time)
    if (d.getFullYear() === year && d.getMonth() === month) {
      const day = d.getDate()
      if (!sessionsByDay[day]) sessionsByDay[day] = []
      sessionsByDay[day].push(s)
    }
  }
  for (const day in sessionsByDay) {
    sessionsByDay[day].sort((a, b) => new Date(a.start_time) - new Date(b.start_time))
  }

  const cells = Array(firstDow).fill(null).concat(
    Array.from({ length: daysInMonth }, (_, i) => i + 1)
  )
  while (cells.length % 7 !== 0) cells.push(null)

  const isToday = (day) => isCurrentMonth && today.getDate() === day

  const goToday = () => {
    const now = new Date()
    setCalendarMonth(new Date(now.getFullYear(), now.getMonth(), 1))
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setCalendarMonth(new Date(year, month - 1, 1))}
            className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-app-input transition-colors duration-150"
            aria-label="Previous month"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <p className="text-lg font-semibold text-white tracking-tight min-w-[170px] text-center">
            {calendarMonth.toLocaleDateString([], { month: 'long', year: 'numeric' })}
          </p>
          <button
            onClick={() => setCalendarMonth(new Date(year, month + 1, 1))}
            className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-app-input transition-colors duration-150"
            aria-label="Next month"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          {!isCurrentMonth && (
            <button
              onClick={goToday}
              className="ml-2 text-xs font-medium text-ucf-gold hover:text-yellow-400 bg-ucf-gold/10 border border-ucf-gold/20 px-3 py-1.5 rounded-lg transition-colors duration-150"
            >
              Today
            </button>
          )}
        </div>

        <div className="flex items-center gap-4 text-xs text-gray-500">
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-ucf-gold" />In-person</span>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-purple-400" />Hybrid</span>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-blue-400" />Online</span>
        </div>
      </div>

      <div className="card border border-app-border rounded-2xl overflow-hidden">
        <div className="grid grid-cols-7 bg-app-input/60">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
            <div key={d} className="text-center text-[11px] text-white uppercase tracking-widest font-semibold py-2.5 border-b border-app-border">
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {cells.map((day, i) => {
            if (!day) {
              return <div key={i} className="h-[130px] border-r border-b border-app-border/60 bg-app-bg/40" />
            }
            const daySessions = sessionsByDay[day] || []
            const todayCell = isToday(day)
            const hiddenCount = Math.max(daySessions.length - 3, 0)
            return (
              <div
                key={i}
                className={`h-[130px] p-2 border-r border-b border-app-border/60 transition-colors duration-150 relative flex flex-col ${
                  todayCell ? 'bg-ucf-gold/[0.04]' : 'hover:bg-app-input/20'
                }`}
              >
                {todayCell ? (
                  <span className="w-6 h-6 rounded-full bg-ucf-gold text-black flex items-center justify-center text-xs font-bold mb-1.5 shrink-0">
                    {day}
                  </span>
                ) : (
                  // Same h-6 box as the "today" circle badge above, so the
                  // sessions list below starts at the same vertical offset
                  // in every cell instead of today's being pushed down by
                  // the taller circle.
                  <p className="h-6 flex items-center text-xs text-white font-medium mb-1.5 px-0.5 shrink-0">{day}</p>
                )}
                {/* All of the day's sessions live here, not just the first 3 —
                    scrollable so nothing is ever truly hidden, with a fading
                    "+N more" cue at the bottom (below, outside this scroll
                    container so it doesn't scroll away) that prompts you to
                    scroll when there's more than fits. */}
                <div className="flex-1 min-h-0 space-y-1 overflow-y-auto overscroll-contain pr-0.5">
                  {daySessions.map((s) => {
                    const sType = s.session_type || (s.is_virtual ? 'online' : 'in_person')
                    const isPast = new Date(s.end_time) < today
                    return (
                      <button
                        key={s.id}
                        onClick={() => navigate(`/groups/${s.groups?.id}/sessions/${s.id}`, { state: { from: 'dashboard-sessions' } })}
                        className={`w-full text-left text-[11px] leading-tight px-1.5 py-1 rounded-md truncate transition-colors duration-150 ${
                          CALENDAR_TYPE_CHIP[sType] || CALENDAR_TYPE_CHIP.in_person
                        } ${isPast ? 'opacity-50' : ''}`}
                        title={s.title}
                      >
                        <span className="font-medium">{formatSessionTime(s.start_time)}</span> {s.title}
                      </button>
                    )
                  })}
                </div>
                {hiddenCount > 0 && (
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 h-6 bg-gradient-to-t from-app-bg to-transparent flex items-end justify-center pb-0.5">
                    <span className="text-[9px] text-gray-400 font-medium">▾ {hiddenCount} more — scroll</span>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function DashboardSessionCard({ session: s, count, isAttending, userId, showFullDate, onClick }) {
  const sType = s.session_type || (s.is_virtual ? 'online' : 'in_person')
  const isHybridHost = sType === 'hybrid' && s.created_by === userId
  const typeBadge = {
    in_person: { label: 'In-Person', cls: 'text-ucf-gold/80 bg-ucf-gold/10 border-ucf-gold/20' },
    hybrid:    { label: 'Hybrid',    cls: 'text-purple-400 bg-purple-500/10 border-purple-500/20' },
    online:    { label: 'Online',    cls: 'text-blue-400 bg-blue-500/10 border-blue-500/20' },
  }[sType] || { label: 'In-Person', cls: 'text-ucf-gold/80 bg-ucf-gold/10 border-ucf-gold/20' }

  return (
    <div
      onClick={onClick}
      className="group card border border-app-border rounded-2xl p-4 cursor-pointer hover:border-ucf-gold/30 transition-colors duration-200 flex gap-4"
    >
      <div className="shrink-0 w-16 border-r border-app-border pr-4 flex flex-col items-center justify-center text-center">
        {showFullDate && (
          <p className="text-[10px] text-gray-500 uppercase tracking-wide">
            {new Date(s.start_time).toLocaleDateString([], { weekday: 'short' })}
          </p>
        )}
        <p className="text-sm font-bold text-white leading-tight mt-0.5">
          {formatSessionTime(s.start_time)}
        </p>
        {showFullDate && (
          <p className="text-[10px] text-gray-600 mt-0.5">
            {new Date(s.start_time).toLocaleDateString([], { month: 'short', day: 'numeric' })}
          </p>
        )}
      </div>

      <div className="flex-1 min-w-0 py-0.5">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-semibold text-white tracking-tight group-hover:text-ucf-gold transition-colors duration-200">{s.title}</p>
          {isAttending && (
            <span className="inline-flex items-center gap-1 text-xs bg-ucf-gold/10 text-ucf-gold border border-ucf-gold/20 px-2 py-0.5 rounded-full">
              <UserCheck className="w-3 h-3" /> Attending
            </span>
          )}
          <span className={`text-xs px-2 py-0.5 rounded-full border ${typeBadge.cls}`}>
            {typeBadge.label}
          </span>
        </div>
        {s.groups && (
          <p className="text-xs text-ucf-gold/80 mt-0.5">
            {s.groups.courses?.code && `${s.groups.courses.code} · `}
            {s.groups.name}
          </p>
        )}
        {s.location && (
          <div className="flex items-center gap-1 text-gray-500 text-xs mt-1.5">
            <MapPin className="w-3 h-3" />
            <span className="truncate">{s.location}</span>
          </div>
        )}
        {s.topics?.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1.5">
            {s.topics.map((t) => (
              <span key={t} className="text-xs bg-app-input border border-app-border text-gray-400 px-2 py-0.5 rounded-full">{t}</span>
            ))}
          </div>
        )}
        {isHybridHost && (
          <div className="mt-2.5 flex items-start gap-1.5 bg-ucf-gold/10 border border-ucf-gold/20 rounded-lg px-2.5 py-1.5 max-w-sm">
            <Video className="w-3.5 h-3.5 text-ucf-gold shrink-0 mt-0.5" />
            <p className="text-xs text-ucf-gold/90 leading-snug">
              You're hosting — join the Meet from your location so remote members can join too.
            </p>
          </div>
        )}
        {count > 0 && (
          <p className="text-xs text-gray-600 mt-1.5">{count} {count === 1 ? 'person' : 'people'} attending</p>
        )}
      </div>
    </div>
  )
}
