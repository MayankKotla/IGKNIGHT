import React, { useState, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { BookOpen, Users, Brain, Calendar, Plus, LogOut, MessageSquare, UserCheck, UserPlus, Compass, Search, X, Target, Zap, CheckCircle, Trophy, Clock, Video, ChevronDown, List, LayoutGrid } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import CreateGroupModal from '../components/CreateGroupModal'
import ScheduleSessionModal from '../components/ScheduleSessionModal'
import { normalizeForSearch } from '../lib/courseCode'
import { SkeletonBlock, SkeletonLine, SkeletonCircle } from '../components/Skeleton'

const NAV = [
  { id: 'home', icon: BookOpen, label: 'Home' },
  { id: 'sessions', icon: Calendar, label: 'Sessions' },
  { id: 'discover', icon: Compass, label: 'Discover' },
  { id: 'tutor', icon: Brain, label: 'RetAIn' },
  { id: 'profile', icon: Target, label: 'KnightCheck' },
]

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
  const nextSession = groupMeta.nextSessions?.[g.id]
  const isOwnMsg = lastMsg?.user_id === userId
  const senderLabel = isOwnMsg ? 'You' : (lastMsg?.users?.full_name?.split(' ')[0] ?? null)
  const preview = lastMsg
    ? `${senderLabel ? senderLabel + ': ' : ''}${lastMsg.content.length > 48 ? lastMsg.content.slice(0, 48) + '…' : lastMsg.content}`
    : null
  return { memberCount, lastMsg, nextSession, preview }
}

function GroupRow({ g, userId, groupMeta }) {
  const { memberCount, lastMsg, nextSession, preview } = computeGroupCardMeta(g, groupMeta, userId)
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
          <div className="flex items-baseline justify-between gap-2">
            <p className="font-medium text-white text-sm tracking-tight truncate">{g.name}</p>
            <span className="text-xs text-gray-600 shrink-0">{memberCount} / {g.max_members}</span>
          </div>

          {g.courses && (
            <p className="text-xs text-ucf-gold/80 mt-0.5 truncate">
              {g.courses.code}
              {g.courses.name && g.courses.name !== g.courses.code && (
                <span className="text-gray-600"> · {g.courses.name}</span>
              )}
              {g.professor && <span className="text-gray-500"> · {g.professor}</span>}
            </p>
          )}

          <div className="flex items-center justify-between gap-3 mt-1.5">
            <p className="text-xs text-gray-600 truncate">
              {preview ? (
                <>
                  {preview} <span className="text-gray-700">· {timeAgo(lastMsg.created_at)}</span>
                </>
              ) : (
                <span className="text-gray-700 italic">No messages yet</span>
              )}
            </p>
            {nextSession && (
              <span className="text-xs text-gray-600 shrink-0 flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {formatSessionDate(nextSession.start_time)}
              </span>
            )}
          </div>
        </div>
      </Link>
    </motion.div>
  )
}

function GroupCard({ g, userId, groupMeta }) {
  const { memberCount, lastMsg, nextSession, preview } = computeGroupCardMeta(g, groupMeta, userId)
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
          <p className="text-xs text-ucf-gold/80 truncate mb-1">
            {g.courses.code}
            {g.courses.name && g.courses.name !== g.courses.code && (
              <span className="text-gray-600"> · {g.courses.name}</span>
            )}
          </p>
        )}
        {g.professor && <p className="text-xs text-gray-500 truncate mb-3">{g.professor}</p>}

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
          {nextSession && (
            <span className="text-xs text-gray-600 mt-1.5 flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {formatSessionDate(nextSession.start_time)}
            </span>
          )}
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
  const [isTA, setIsTA] = useState(false)

  const handleSignOut = async () => {
    await signOut()
    navigate('/')
  }

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

  useEffect(() => {
    if (!user) return
    supabase
      .from('users')
      .select('ucf_role')
      .eq('id', user.id)
      .single()
      .then(({ data }) => { if (data) setIsTA(data.ucf_role === 'ta') })
  }, [user])

  const [sidebarExpanded, setSidebarExpanded] = useState(false)
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
            <span className={`font-bold text-base text-white tracking-tight whitespace-nowrap transition-all duration-200 overflow-hidden ${sidebarExpanded ? 'max-w-[140px] opacity-100' : 'max-w-0 opacity-0'}`}>
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
              <span className={`whitespace-nowrap overflow-hidden transition-all duration-200 ${sidebarExpanded ? 'max-w-[140px] opacity-100' : 'max-w-0 opacity-0'}`}>
                {label}
              </span>
            </button>
          ))}
        </nav>

        <div className="p-2 border-t border-app-border">
          <div className={`flex items-center p-2 rounded-xl bg-app-surface-raised mb-1 ${sidebarExpanded ? 'gap-3' : 'justify-center'}`}>
            <div className="w-8 h-8 bg-ucf-gold/20 rounded-full flex items-center justify-center shrink-0">
              <span className="text-ucf-gold text-sm font-bold">
                {firstName.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className={`min-w-0 overflow-hidden transition-all duration-200 ${sidebarExpanded ? 'max-w-[140px] opacity-100' : 'max-w-0 opacity-0'}`}>
              <p className="text-sm font-semibold text-white truncate leading-tight whitespace-nowrap">
                {user?.user_metadata?.full_name || 'UCF Knight'}
              </p>
              <p className="text-xs text-gray-500 truncate whitespace-nowrap">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={handleSignOut}
            className={`w-full flex items-center py-2 rounded-lg text-sm text-gray-500 hover:text-[#e8e8e8] hover:bg-app-surface-raised transition-all duration-200 ${sidebarExpanded ? 'px-3 gap-2 justify-start' : 'justify-center px-0'}`}
          >
            <LogOut className="w-4 h-4 shrink-0" />
            <span className={`whitespace-nowrap overflow-hidden transition-all duration-200 ${sidebarExpanded ? 'max-w-[100px] opacity-100' : 'max-w-0 opacity-0'}`}>
              Sign out
            </span>
          </button>
        </div>
      </aside>

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
                        <span className="font-medium text-ucf-gold">{sessionReminder.title}</span> starts in 30 min
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
        <div className="flex-1 max-w-5xl w-full mx-auto px-8 py-10">
          <div key={activeTab} className="tab-enter">
            {activeTab === 'home' && <HomeTab firstName={firstName} isTA={isTA} />}
            {activeTab === 'discover' && <DiscoveryTab />}
            {activeTab === 'sessions' && <SessionsTab />}
            {activeTab === 'tutor' && <TutorTab />}
            {activeTab === 'profile' && <ProfileTab />}
          </div>
        </div>
      </main>
    </div>
  )
}

function HomeTab({ firstName, isTA }) {
  const { user } = useAuth()
  const [stats, setStats] = useState({ groups: 0, sessionsThisWeek: 0, newMessages: 0 })
  const [groups, setGroups] = useState([])
  const [groupMeta, setGroupMeta] = useState({})
  const [loading, setLoading] = useState(true)
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
        return
      }

      const groupIds = memberships.map((m) => m.group_id)
      setGroups(memberships.map((m) => m.groups).filter(Boolean))

      const weekStart = new Date()
      weekStart.setDate(weekStart.getDate() - weekStart.getDay())
      weekStart.setHours(0, 0, 0, 0)

      const [
        { data: weekSessions },
        { data: statMessages },
        { data: allMembers },
        { data: recentMessages },
        { data: upcomingSessions },
      ] = await Promise.all([
        supabase.from('sessions').select('id').in('group_id', groupIds).gte('start_time', weekStart.toISOString()),
        supabase.from('messages').select('id, group_id, user_id, created_at').in('group_id', groupIds).neq('user_id', user.id),
        supabase.from('group_members').select('group_id').in('group_id', groupIds),
        supabase.from('messages').select('group_id, content, user_id, created_at, users(full_name)').in('group_id', groupIds).order('created_at', { ascending: false }).limit(50),
        supabase.from('sessions').select('group_id, title, start_time').in('group_id', groupIds).gte('start_time', new Date().toISOString()).order('start_time', { ascending: true }),
      ])

      const newMessages = (statMessages || []).filter((msg) => {
        if (localStorage.getItem(`ks:muted:${msg.group_id}`)) return false
        const lastRead = localStorage.getItem(`ks:lastRead:${msg.group_id}`)
        const cutoff = lastRead || memberships.find((m) => m.group_id === msg.group_id)?.joined_at || new Date(0).toISOString()
        return msg.created_at > cutoff
      }).length

      setStats({ groups: memberships.length, sessionsThisWeek: weekSessions?.length ?? 0, newMessages })

      // member counts
      const memberCounts = {}
      for (const m of allMembers || []) {
        memberCounts[m.group_id] = (memberCounts[m.group_id] || 0) + 1
      }

      // last message per group (recentMessages is already desc by created_at)
      const lastMessages = {}
      for (const msg of recentMessages || []) {
        if (!lastMessages[msg.group_id]) lastMessages[msg.group_id] = msg
      }

      // next session per group
      const nextSessions = {}
      for (const s of upcomingSessions || []) {
        if (!nextSessions[s.group_id]) nextSessions[s.group_id] = s
      }

      setGroupMeta({ memberCounts, lastMessages, nextSessions })
      setLoading(false)
    }
    fetchAll()
  }, [user])

  const handleGroupCreated = (group) => setGroups((prev) => [group, ...prev])

  const statCards = [
    { label: 'Groups Joined', value: stats.groups, icon: Users },
    { label: 'Sessions This Week', value: stats.sessionsThisWeek, icon: Calendar },
    { label: 'New Messages', value: stats.newMessages, icon: MessageSquare },
  ]

  return (
    <div>
      {showModal && (
        <CreateGroupModal onClose={() => setShowModal(false)} onCreated={handleGroupCreated} />
      )}

      <h1 className="text-2xl font-semibold tracking-tight mb-1 text-white">Good to see you, {firstName}!</h1>
      <p className="text-sm text-gray-500 mb-6">Here's what's happening with your study groups.</p>

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
            <p className="text-4xl font-bold tracking-tight text-white">{value}</p>
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
          {isTA && (
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-1.5 bg-ucf-gold text-black font-bold px-3.5 py-2 rounded-xl text-sm hover:bg-yellow-400 transition-colors duration-200"
            >
              <Plus className="w-3.5 h-3.5" /> New Group
            </button>
          )}
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
          {isTA ? (
            <>
              <p className="text-xs text-gray-600 mb-5">Enter any UCF course code to get started.</p>
              <button
                onClick={() => setShowModal(true)}
                className="inline-flex items-center gap-2 bg-ucf-gold text-black font-semibold px-4 py-2 rounded-xl text-sm hover:bg-yellow-400 transition-colors duration-200"
              >
                <Plus className="w-4 h-4" /> Create your first group
              </button>
            </>
          ) : (
            <p className="text-xs text-gray-600">Use the Discover tab to find and join a study group.</p>
          )}
        </div>
      )}
    </div>
  )
}

function ProfileTab() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(true)

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

  const avgScore = results.length > 0
    ? (results.reduce((sum, r) => sum + r.score, 0) / results.length).toFixed(1)
    : '—'

  let streak = 0
  for (const r of results) {
    if (r.score >= 3) streak++
    else break
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight text-white mb-1">KnightCheck Stats</h1>
      <p className="text-sm text-gray-500 mb-6">Your quiz performance across all study sessions</p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {[
          { label: 'Average Score', value: avgScore === '—' ? '—' : `${avgScore}/5`, icon: Trophy },
          { label: 'Retention Streak', value: streak > 0 ? `${streak} 🔥` : '0', icon: Zap },
          { label: 'Quizzes Taken', value: results.length, icon: Target },
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} className="card border border-app-border rounded-2xl p-6">
            <div className="mb-4">
              <div className="w-9 h-9 bg-ucf-gold/10 rounded-xl flex items-center justify-center">
                <Icon className="w-4 h-4 text-ucf-gold" />
              </div>
            </div>
            {loading ? (
              <SkeletonLine className="h-7 w-14 mb-2" />
            ) : (
              <p className="text-3xl font-bold tracking-tight text-white">{value}</p>
            )}
            <p className="text-xs text-gray-600 mt-2 uppercase tracking-widest font-medium">{label}</p>
          </div>
        ))}
      </div>

      <DashDivider />

      <h2 className="text-base font-semibold text-white mb-4">Quiz History</h2>

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
      ) : results.length === 0 ? (
        <div className="card border border-app-border rounded-2xl p-8 text-center">
          <Target className="w-10 h-10 text-gray-700 mx-auto mb-3" />
          <p className="text-gray-400 text-sm">No quizzes taken yet.</p>
          <p className="text-gray-600 text-xs mt-1">Complete a KnightCheck after a study session to see your stats here.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {results.map((r) => {
            const quiz = r.quizzes
            const session = quiz?.sessions
            const group = session?.groups
            const pct = Math.round((r.score / 5) * 100)
            const passed = r.score >= 3

            return (
              <div
                key={r.id}
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
                  {quiz?.topics?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {quiz.topics.map((t) => (
                        <span key={t} className="text-xs bg-app-input border border-app-border text-gray-500 px-1.5 py-0.5 rounded-full">{t}</span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="shrink-0 text-right">
                  <div className={`text-xs font-semibold mb-1 ${passed ? 'text-green-400' : 'text-red-400'}`}>{pct}%</div>
                  <p className="text-xs text-gray-600">{timeAgo(r.completed_at)}</p>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function GroupDiscoveryCard({ group, isJoined, isJoining, onJoin }) {
  const memberCount = group.group_members?.length ?? 0
  const isFull = memberCount >= group.max_members

  return (
    <div className="card border border-app-border rounded-2xl p-4 flex items-center gap-3 hover:border-ucf-gold/20 transition-colors duration-200">
      <div className="w-9 h-9 bg-ucf-gold/10 rounded-xl flex items-center justify-center shrink-0">
        <Users className="w-4 h-4 text-ucf-gold" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline justify-between gap-2">
          <p className="font-medium text-white text-sm tracking-tight truncate">{group.name}</p>
          <span className="text-xs text-gray-600 shrink-0">{memberCount} / {group.max_members}</span>
        </div>
        {group.courses && (
          <p className="text-xs text-ucf-gold/80 mt-0.5 truncate">
            {group.courses.code}
            {group.courses.name && group.courses.name !== group.courses.code && (
              <span className="text-gray-600"> · {group.courses.name}</span>
            )}
            {group.professor && (
              <span className="text-gray-500"> · {group.professor}</span>
            )}
          </p>
        )}
        {group.description && (
          <p className="text-xs text-gray-600 mt-1 truncate">{group.description}</p>
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
    const { error } = await supabase
      .from('group_members')
      .insert({ group_id: group.id, user_id: user.id, role: 'member' })
    if (!error) {
      setMyGroupIds((prev) => new Set([...prev, group.id]))
      navigate(`/groups/${group.id}`)
    }
    setJoiningId(null)
  }

  const trimmed = searchQuery.trim()
  const isSearching = trimmed.length > 0
  const normalizedQuery = normalizeForSearch(trimmed)
  const filtered = isSearching
    ? groups.filter((g) =>
        normalizeForSearch(g.courses?.code ?? '').includes(normalizedQuery) ||
        normalizeForSearch(g.professor ?? '').includes(normalizedQuery)
      )
    : groups

  const recent = filtered.slice(0, 5)
  const rest = filtered.slice(5)

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight text-white mb-1">Discover Groups</h1>
      <p className="text-sm text-gray-500 mb-6">Find and join public study groups for your UCF courses</p>

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
            <div className="space-y-2">
              {filtered.map((g) => (
                <GroupDiscoveryCard
                  key={g.id}
                  group={g}
                  isJoined={myGroupIds.has(g.id)}
                  isJoining={joiningId === g.id}
                  onJoin={handleJoin}
                />
              ))}
            </div>
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
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-4">Recently Created</p>
          <div className="space-y-2">
            {recent.map((g) => (
              <GroupDiscoveryCard
                key={g.id}
                group={g}
                isJoined={myGroupIds.has(g.id)}
                isJoining={joiningId === g.id}
                onJoin={handleJoin}
              />
            ))}
          </div>

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
                <div className="space-y-2 mt-2">
                  {rest.map((g) => (
                    <GroupDiscoveryCard
                      key={g.id}
                      group={g}
                      isJoined={myGroupIds.has(g.id)}
                      isJoining={joiningId === g.id}
                      onJoin={handleJoin}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

const SUGGESTED_PROMPTS = [
  "Explain Big O notation with simple examples",
  "What's the difference between a stack and a queue?",
  "Walk me through integration by parts",
  "How do I solve a system of linear equations?",
  "Explain the time value of money",
  "What are the key differences between mitosis and meiosis?",
]

function TutorTab() {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: "Hi! I'm RetAIn, your AI study assistant. Ask me anything about your courses — I'm here to help you ace your classes!",
    },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const { user } = useAuth()

  const sendMessage = async (text) => {
    if (!text.trim() || loading) return
    setMessages((prev) => [...prev, { role: 'user', content: text }])
    setLoading(true)

    try {
      const session = await import('../lib/supabase').then(({ supabase }) =>
        supabase.auth.getSession()
      )
      const token = session.data.session?.access_token

      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/ai/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ message: text }),
      })
      const data = await res.json()
      setMessages((prev) => [...prev, { role: 'assistant', content: data.reply }])
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'Sorry, I ran into an error. Please try again.' },
      ])
    } finally {
      setLoading(false)
    }
  }

  const handleSend = (e) => {
    e.preventDefault()
    const text = input.trim()
    setInput('')
    sendMessage(text)
  }

  const isEmpty = messages.length === 1

  return (
    <div className="flex flex-col" style={{ height: 'calc(100vh - 64px)' }}>
      <div className="mb-6 shrink-0">
        <h1 className="text-2xl font-semibold tracking-tight text-white">RetAIn</h1>
        <p className="text-sm text-gray-500 mt-1">Powered by Claude — ask anything about your coursework</p>
      </div>

      <div className="flex-1 card border border-app-border rounded-2xl flex flex-col overflow-hidden min-h-0">
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-xl px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-ucf-gold text-black font-medium'
                    : 'bg-app-input text-gray-100 border border-app-border'
                }`}
              >
                {msg.content}
              </div>
            </div>
          ))}

          {isEmpty && (
            <div className="flex flex-wrap gap-2 pt-1">
              {SUGGESTED_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => sendMessage(prompt)}
                  disabled={loading}
                  className="text-xs text-gray-300 bg-app-input border border-app-border hover:border-ucf-gold/40 hover:text-white px-3 py-2 rounded-xl transition-colors duration-150 text-left disabled:opacity-40"
                >
                  {prompt}
                </button>
              ))}
            </div>
          )}

          {loading && (
            <div className="flex justify-start">
              <div className="bg-app-input border border-app-border px-4 py-3 rounded-2xl">
                <div className="flex gap-1 items-center">
                  {[0, 150, 300].map((delay) => (
                    <span
                      key={delay}
                      className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"
                      style={{ animationDelay: `${delay}ms` }}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        <form onSubmit={handleSend} className="p-4 border-t border-app-border flex gap-3 shrink-0">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask @RetAIn a question..."
            className="flex-1 bg-app-input border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-ucf-gold focus:ring-1 focus:ring-ucf-gold/50 transition text-sm"
          />
          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="bg-ucf-gold text-black font-bold px-5 py-3 rounded-xl hover:bg-yellow-400 transition disabled:opacity-40 disabled:cursor-not-allowed text-sm shrink-0"
          >
            Send
          </button>
        </form>
      </div>
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

function formatSessionDate(iso) {
  const d = new Date(iso)
  const now = new Date()
  const isToday =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  if (isToday) return 'Today'
  return d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })
}

function formatSessionTime(iso) {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function SessionsTab() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [sessions, setSessions] = useState([])
  const [attendees, setAttendees] = useState({})
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)

  useEffect(() => {
    if (!user) return
    async function fetchSessions() {
      const { data: memberships } = await supabase
        .from('group_members')
        .select('group_id')
        .eq('user_id', user.id)

      if (!memberships || memberships.length === 0) { setLoading(false); return }

      const groupIds = memberships.map((m) => m.group_id)
      const nowIso = new Date().toISOString()
      const { data } = await supabase
        .from('sessions')
        .select('*, groups(id, name, courses(code))')
        .in('group_id', groupIds)
        // "Upcoming" = hasn't ended yet — includes sessions already in
        // progress (start_time passed but end_time still ahead), not just
        // ones that haven't started.
        .or(`end_time.gte.${nowIso},and(end_time.is.null,start_time.gte.${nowIso})`)
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

  return (
    <div>
      {showModal && (
        <ScheduleSessionModal
          onClose={() => setShowModal(false)}
          onCreated={handleSessionCreated}
        />
      )}

      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-white">Sessions</h1>
          <p className="text-sm text-gray-500 mt-1">Upcoming study sessions across your groups</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-1.5 bg-ucf-gold text-black font-bold px-3.5 py-2 rounded-xl text-sm hover:bg-yellow-400 transition-colors duration-200"
        >
          <Plus className="w-3.5 h-3.5" /> Schedule
        </button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="card border border-app-border rounded-2xl p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0 space-y-2">
                  <SkeletonLine className="h-4 w-40" />
                  <SkeletonLine className="h-2.5 w-28" />
                </div>
                <div className="shrink-0 space-y-2 text-right">
                  <SkeletonLine className="h-3.5 w-20 ml-auto" />
                  <SkeletonLine className="h-2.5 w-16 ml-auto" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : sessions.length === 0 ? (
        <div className="card border border-app-border rounded-2xl p-10 text-center">
          <Calendar className="w-12 h-12 text-gray-700 mx-auto mb-4" />
          <p className="text-gray-400">No upcoming sessions.</p>
          <p className="text-gray-500 text-sm mt-1 mb-6">Schedule your first session across any of your groups.</p>
          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-2 bg-ucf-gold text-black font-semibold px-4 py-2 rounded-xl text-sm hover:bg-yellow-400 transition-colors duration-200"
          >
            <Plus className="w-4 h-4" /> Schedule a session
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {sessions.map((s) => {
            const count = (attendees[s.id] || []).length
            const isAttending = (attendees[s.id] || []).includes(user.id)
            const sType = s.session_type || (s.is_virtual ? 'online' : 'in_person')

            return (
              <div
                key={s.id}
                onClick={() => navigate(`/groups/${s.groups?.id}/sessions/${s.id}`, { state: { from: 'dashboard-sessions' } })}
                className="card border border-app-border rounded-2xl p-5 cursor-pointer hover:border-ucf-gold/30 transition-colors duration-200"
              >
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-white tracking-tight">{s.title}</p>
                      {isAttending && (
                        <span className="inline-flex items-center gap-1 text-xs bg-ucf-gold/10 text-ucf-gold border border-ucf-gold/20 px-2 py-0.5 rounded-full">
                          <UserCheck className="w-3 h-3" /> Attending
                        </span>
                      )}
                      {sType !== 'in_person' && (
                        <span className={`text-xs px-2 py-0.5 rounded-full border ${
                          sType === 'hybrid'
                            ? 'text-ucf-gold/80 bg-ucf-gold/10 border-ucf-gold/20'
                            : 'text-blue-400 bg-blue-500/10 border-blue-500/20'
                        }`}>
                          {sType === 'hybrid' ? 'Hybrid' : 'Online'}
                        </span>
                      )}
                    </div>
                    {s.groups && (
                      <p className="text-xs text-ucf-gold/80 mt-0.5">
                        {s.groups.courses?.code && `${s.groups.courses.code} · `}
                        {s.groups.name}
                      </p>
                    )}
                    {s.topics?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {s.topics.map((t) => (
                          <span key={t} className="text-xs bg-app-input border border-app-border text-gray-400 px-2 py-0.5 rounded-full">{t}</span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-semibold text-white tracking-tight">{formatSessionDate(s.start_time)}</p>
                    <p className="text-gray-500 text-xs mt-0.5">
                      {formatSessionTime(s.start_time)}
                      {s.end_time && ` – ${formatSessionTime(s.end_time)}`}
                    </p>
                    {count > 0 && (
                      <p className="text-xs text-gray-600 mt-1">{count} attending</p>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
