import React, { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom'
import {
  ArrowLeft, Send, Users, BookOpen, Calendar, Plus, Video, MapPin,
  MoreHorizontal, Crown, BellOff, Bell, Pin, PinOff, LogOut, Share2, Check, X,
  Target, Zap, BarChart2, AlertCircle,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import ScheduleSessionModal from '../components/ScheduleSessionModal'
import { SkeletonBlock, SkeletonLine, SkeletonCircle } from '../components/Skeleton'

function formatTime(iso) {
  const d = new Date(iso)
  const now = new Date()
  const isToday =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  if (isToday) return time
  return `${d.toLocaleDateString([], { month: 'short', day: 'numeric' })}, ${time}`
}

function formatSessionDate(iso) {
  return new Date(iso).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })
}

function formatSessionTime(iso) {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

export default function GroupChat() {
  const { id: groupId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuth()

  const [tab, setTab] = useState(location.state?.tab || 'chat')
  const [group, setGroup] = useState(null)
  const [members, setMembers] = useState({})
  const [messages, setMessages] = useState([])
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [isMember, setIsMember] = useState(null)

  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)

  const [showSessionModal, setShowSessionModal] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false)
  const [showShareModal, setShowShareModal] = useState(false)
  const [leaving, setLeaving] = useState(false)
  const [linkCopied, setLinkCopied] = useState(false)

  const [muted, setMuted] = useState(() => !!localStorage.getItem(`ks:muted:${groupId}`))
  const [pinnedMessage, setPinnedMessage] = useState(() => {
    const s = localStorage.getItem(`ks:pinned:${groupId}`)
    return s ? JSON.parse(s) : null
  })

  const bottomRef = useRef(null)
  const inputRef = useRef(null)
  const menuRef = useRef(null)

  useEffect(() => {
    if (!user) return
    let cancelled = false

    async function init() {
      const { data: memberData } = await supabase
        .from('group_members')
        .select('role, groups(*, courses(code, name))')
        .eq('group_id', groupId)
        .eq('user_id', user.id)
        .single()

      if (cancelled) return

      if (!memberData) { setIsMember(false); setLoading(false); return }

      setIsMember(true)
      setGroup(memberData.groups)
      localStorage.setItem(`ks:lastRead:${groupId}`, new Date().toISOString())

      const [{ data: allMembers }, { data: msgs }, { data: sess }] = await Promise.all([
        supabase.from('group_members').select('user_id, role, users(full_name, email)').eq('group_id', groupId),
        supabase.from('messages').select('*').eq('group_id', groupId).order('created_at', { ascending: true }),
        supabase.from('sessions').select('*').eq('group_id', groupId).order('start_time', { ascending: true }),
      ])

      if (cancelled) return
      if (allMembers) {
        const map = {}
        allMembers.forEach((m) => { map[m.user_id] = { ...m.users, role: m.role } })
        setMembers(map)
      }
      if (msgs) setMessages(msgs)
      if (sess) setSessions(sess)
      setLoading(false)
    }

    init()
    return () => { cancelled = true }
  }, [groupId, user])

  useEffect(() => {
    if (!isMember) return
    const channel = supabase
      .channel(`messages:group:${groupId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `group_id=eq.${groupId}` }, (payload) => {
        setMessages((prev) => prev.find((m) => m.id === payload.new.id) ? prev : [...prev, payload.new])
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [groupId, isMember])

  useEffect(() => {
    if (tab === 'chat') bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, tab])

  useEffect(() => {
    function handler(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleSend = async (e) => {
    e.preventDefault()
    const content = input.trim()
    if (!content || sending) return
    setInput('')
    setSending(true)
    const tempId = `temp-${Date.now()}`
    setMessages((prev) => [...prev, { id: tempId, group_id: groupId, user_id: user.id, content, type: 'text', created_at: new Date().toISOString() }])
    const { data, error } = await supabase.from('messages').insert({ group_id: groupId, user_id: user.id, content, type: 'text' }).select().single()
    if (!error && data) setMessages((prev) => prev.map((m) => m.id === tempId ? data : m))
    else setMessages((prev) => prev.filter((m) => m.id !== tempId))
    setSending(false)
    inputRef.current?.focus()
  }

  const handleSessionCreated = (session) => {
    setSessions((prev) => [...prev, session].sort((a, b) => new Date(a.start_time) - new Date(b.start_time)))
  }

  const getSenderName = (userId) => {
    if (userId === user.id) return null
    const u = members[userId]
    return u?.full_name || u?.email?.split('@')[0] || 'Unknown'
  }

  const toggleMute = () => {
    const next = !muted
    if (next) localStorage.setItem(`ks:muted:${groupId}`, '1')
    else localStorage.removeItem(`ks:muted:${groupId}`)
    setMuted(next)
    setMenuOpen(false)
  }

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href)
    setLinkCopied(true)
    setTimeout(() => setLinkCopied(false), 2000)
  }

  const handleLeave = async () => {
    setLeaving(true)
    await supabase.from('group_members').delete().eq('group_id', groupId).eq('user_id', user.id)
    navigate('/dashboard')
  }

  const handlePin = (msg) => {
    const pinData = { id: msg.id, content: msg.content, user_id: msg.user_id, created_at: msg.created_at }
    localStorage.setItem(`ks:pinned:${groupId}`, JSON.stringify(pinData))
    setPinnedMessage(pinData)
  }

  const handleUnpin = () => {
    localStorage.removeItem(`ks:pinned:${groupId}`)
    setPinnedMessage(null)
  }

  if (loading) return (
    <div className="h-screen bg-app-bg text-white flex flex-col overflow-x-hidden">
      <header className="border-b border-app-border px-4 py-3 flex items-center gap-4 shrink-0">
        <ArrowLeft className="w-5 h-5 text-gray-700" />
        <SkeletonCircle className="w-9 h-9 rounded-xl" />
        <div className="flex-1 min-w-0 space-y-2">
          <SkeletonLine className="h-3.5 w-32" />
          <SkeletonLine className="h-2.5 w-16" />
        </div>
      </header>
      <div className="border-b border-app-border flex items-center gap-6 px-5 py-3 shrink-0">
        {[0, 1, 2, 3].map((i) => (
          <SkeletonLine key={i} className="h-3.5 w-16" />
        ))}
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className={`flex ${i % 2 ? 'justify-end' : 'justify-start'}`}>
            <SkeletonBlock className={`h-10 ${i % 2 ? 'w-40' : 'w-56'}`} />
          </div>
        ))}
      </div>
    </div>
  )

  if (!isMember) return (
    <div className="h-screen bg-app-bg flex items-center justify-center">
      <div className="text-center">
        <p className="text-white font-semibold mb-2">You're not a member of this group.</p>
        <button onClick={() => navigate('/dashboard')} className="text-ucf-gold text-sm hover:underline">Back to dashboard</button>
      </div>
    </div>
  )

  const memberCount = Object.keys(members).length
  const isOwner = members[user.id]?.role === 'owner'
  const now = new Date()
  // A session counts as "past" once it has ENDED, not merely once it has
  // started — otherwise an in-progress session (start_time passed, end_time
  // still ahead) would incorrectly drop into the Past bucket.
  const hasEnded = (s) => new Date(s.end_time || s.start_time) < now
  const upcoming = sessions.filter((s) => !hasEnded(s))
  const past = sessions.filter((s) => hasEnded(s))

  return (
    <div className="h-screen bg-app-bg text-white flex flex-col overflow-x-hidden">
      {showSessionModal && (
        <ScheduleSessionModal groupId={groupId} onClose={() => setShowSessionModal(false)} onCreated={handleSessionCreated} />
      )}

      {/* Leave confirmation modal */}
      {showLeaveConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="card-elevated border rounded-2xl w-full max-w-sm p-6 shadow-2xl">
            <h2 className="font-bold text-white mb-2">Leave group?</h2>
            <p className="text-sm text-gray-400 mb-6">
              You'll lose access to this group's chat and sessions. You can rejoin if you have the link.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowLeaveConfirm(false)}
                className="flex-1 py-2.5 rounded-xl border border-app-border text-gray-400 hover:text-white transition-colors duration-200 text-sm font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleLeave}
                disabled={leaving}
                className="flex-1 py-2.5 rounded-xl bg-red-500/90 text-white font-bold hover:bg-red-500 transition-colors duration-200 disabled:opacity-50 text-sm"
              >
                {leaving ? 'Leaving…' : 'Leave group'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Share modal */}
      {showShareModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="card-elevated border rounded-2xl w-full max-w-sm p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-white">Share group</h2>
              <button onClick={() => setShowShareModal(false)} className="text-gray-500 hover:text-white transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-sm text-gray-400 mb-4">
              Share this link with anyone who has a UCF email to invite them.
            </p>
            <div className="flex gap-2">
              <div className="flex-1 bg-app-input border border-app-border rounded-xl px-3 py-2.5 text-xs text-gray-400 truncate">
                {window.location.href}
              </div>
              <button
                onClick={handleCopyLink}
                className={`shrink-0 px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors duration-200 flex items-center gap-1.5 ${
                  linkCopied ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-ucf-gold text-black hover:bg-yellow-400'
                }`}
              >
                {linkCopied ? <><Check className="w-3.5 h-3.5" /> Copied</> : <><Share2 className="w-3.5 h-3.5" /> Copy</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="border-b border-app-border px-4 py-3 flex items-center gap-4 shrink-0">
        <Link to="/dashboard" className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-app-input transition-colors duration-200">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="w-9 h-9 bg-ucf-gold/10 rounded-xl flex items-center justify-center shrink-0">
          <BookOpen className="w-4 h-4 text-ucf-gold" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-white truncate">{group?.name}</p>
          {group?.courses && <p className="text-xs text-ucf-gold">{group.courses.code}</p>}
        </div>
        <div className="flex items-center gap-2 text-gray-500 text-xs shrink-0">
          {muted && <BellOff className="w-3.5 h-3.5 text-gray-600" />}
          <Users className="w-3.5 h-3.5" />
          <span>{memberCount}</span>
        </div>
      </header>

      {/* Tab bar */}
      <div className="border-b border-app-border flex items-center shrink-0">
        <div className="flex flex-1">
          {[
            { id: 'chat', label: 'Chat' },
            { id: 'sessions', label: `Sessions${upcoming.length ? ` (${upcoming.length})` : ''}` },
            { id: 'participants', label: `Participants${memberCount ? ` (${memberCount})` : ''}` },
            { id: 'insights', label: 'Leaderboard' },
          ].map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`px-5 py-2.5 text-sm font-medium uppercase tracking-wide border-b-2 transition-colors duration-200 ${
                tab === id ? 'border-ucf-gold text-ucf-gold' : 'border-transparent text-gray-500 hover:text-white'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="relative pr-3" ref={menuRef}>
          <button
            onClick={() => setMenuOpen((o) => !o)}
            className={`p-1.5 rounded-lg transition-colors duration-200 ${menuOpen ? 'bg-app-input text-white' : 'text-gray-500 hover:text-white hover:bg-app-input'}`}
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-full mt-1.5 w-48 card-elevated border rounded-xl shadow-xl z-20 py-1 overflow-hidden">
              <button
                onClick={toggleMute}
                className="w-full text-left px-4 py-2.5 text-sm text-gray-300 hover:text-white hover:bg-app-input transition-colors duration-150 flex items-center gap-2.5"
              >
                {muted ? <Bell className="w-3.5 h-3.5" /> : <BellOff className="w-3.5 h-3.5" />}
                {muted ? 'Unmute notifications' : 'Mute notifications'}
              </button>
              <button
                onClick={() => { setShowShareModal(true); setMenuOpen(false) }}
                className="w-full text-left px-4 py-2.5 text-sm text-gray-300 hover:text-white hover:bg-app-input transition-colors duration-150 flex items-center gap-2.5"
              >
                <Share2 className="w-3.5 h-3.5" />
                Share invite link
              </button>
              <div className="my-1 mx-3 h-px bg-app-border" />
              <button
                onClick={() => { setShowLeaveConfirm(true); setMenuOpen(false) }}
                className="w-full text-left px-4 py-2.5 text-sm text-red-400 hover:text-red-300 hover:bg-app-input transition-colors duration-150 flex items-center gap-2.5"
              >
                <LogOut className="w-3.5 h-3.5" />
                Leave group
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Chat tab */}
      {tab === 'chat' && (
        <>
          {/* Pinned message banner */}
          {pinnedMessage && (
            <div className="border-b border-app-border bg-ucf-gold/5 px-4 py-2 flex items-start gap-2 shrink-0">
              <Pin className="w-3.5 h-3.5 text-ucf-gold mt-0.5 shrink-0" />
              <p className="flex-1 text-xs text-gray-300 truncate">{pinnedMessage.content}</p>
              {isOwner && (
                <button onClick={handleUnpin} className="text-gray-600 hover:text-gray-400 transition-colors shrink-0">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}

          <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
            {messages.length === 0 && (
              <div className="text-center text-gray-600 text-sm pt-12">No messages yet. Say hello!</div>
            )}
            {messages.map((msg) => {
              const isOwn = msg.user_id === user.id
              const senderName = getSenderName(msg.user_id)
              const isPinned = pinnedMessage?.id === msg.id

              return (
                <div key={msg.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'} group/msg`}>
                  <div className={`max-w-sm lg:max-w-lg flex flex-col gap-1 ${isOwn ? 'items-end' : 'items-start'}`}>
                    {!isOwn && senderName && (
                      <span className="text-xs text-gray-500 px-1">{senderName}</span>
                    )}
                    <div className="flex items-end gap-1.5">
                      {isOwn && isOwner && (
                        <button
                          onClick={() => isPinned ? handleUnpin() : handlePin(msg)}
                          className="opacity-0 group-hover/msg:opacity-100 transition-opacity duration-150 p-1 text-gray-600 hover:text-ucf-gold"
                          title={isPinned ? 'Unpin' : 'Pin message'}
                        >
                          {isPinned ? <PinOff className="w-3 h-3" /> : <Pin className="w-3 h-3" />}
                        </button>
                      )}
                      <div
                        className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                          msg.id?.toString().startsWith('temp-')
                            ? 'bg-ucf-gold/60 text-black'
                            : isOwn
                            ? 'bg-ucf-gold text-black font-medium'
                            : 'bg-app-input text-gray-100 border border-app-border'
                        } ${isPinned ? 'ring-1 ring-ucf-gold/40' : ''}`}
                      >
                        {msg.content}
                      </div>
                      {!isOwn && isOwner && (
                        <button
                          onClick={() => isPinned ? handleUnpin() : handlePin(msg)}
                          className="opacity-0 group-hover/msg:opacity-100 transition-opacity duration-150 p-1 text-gray-600 hover:text-ucf-gold"
                          title={isPinned ? 'Unpin' : 'Pin message'}
                        >
                          {isPinned ? <PinOff className="w-3 h-3" /> : <Pin className="w-3 h-3" />}
                        </button>
                      )}
                    </div>
                    <span className="text-xs text-gray-600 px-1">{formatTime(msg.created_at)}</span>
                  </div>
                </div>
              )
            })}
            <div ref={bottomRef} />
          </div>

          <form onSubmit={handleSend} className="border-t border-app-border px-4 py-3 flex gap-3 shrink-0">
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Message the group…"
              className="flex-1 bg-app-input border border-app-border rounded-xl px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-ucf-gold/60 focus:ring-1 focus:ring-ucf-gold/25 transition-all duration-200 text-sm"
            />
            <button
              type="submit"
              disabled={!input.trim() || sending}
              className="bg-ucf-gold text-black font-bold px-4 py-2.5 rounded-xl hover:bg-yellow-400 transition-colors duration-200 disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </>
      )}

      {/* Sessions tab */}
      {tab === 'sessions' && (
        <div className="flex-1 overflow-y-auto px-4 py-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-base font-semibold tracking-tight text-white uppercase">Study Sessions</h2>
            <button
              onClick={() => setShowSessionModal(true)}
              className="flex items-center gap-1.5 bg-ucf-gold text-black font-bold px-3 py-2 rounded-xl text-sm hover:bg-yellow-400 transition-colors duration-200"
            >
              <Plus className="w-4 h-4" /> Schedule
            </button>
          </div>

          {sessions.length === 0 ? (
            <div className="text-center pt-12">
              <Calendar className="w-12 h-12 text-gray-700 mx-auto mb-4" />
              <p className="text-gray-400 text-sm">No sessions scheduled yet.</p>
              <p className="text-gray-600 text-xs mt-1 mb-6">Schedule the first one and get studying!</p>
              <button onClick={() => setShowSessionModal(true)} className="inline-flex items-center gap-2 bg-ucf-gold text-black font-bold px-4 py-2.5 rounded-xl text-sm hover:bg-yellow-400 transition-colors duration-200">
                <Plus className="w-4 h-4" /> Schedule Session
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {upcoming.length > 0 && (
                <section>
                  <p className="text-xs text-gray-600 uppercase tracking-widest font-medium mb-3">Upcoming</p>
                  <div className="space-y-3">{upcoming.map((s) => <SessionCard key={s.id} session={s} groupId={groupId} />)}</div>
                </section>
              )}
              {past.length > 0 && (
                <section>
                  <p className="text-xs text-gray-600 uppercase tracking-widest font-medium mb-3">Past</p>
                  <div className="space-y-3 opacity-50">{past.slice().reverse().map((s) => <SessionCard key={s.id} session={s} groupId={groupId} />)}</div>
                </section>
              )}
            </div>
          )}
        </div>
      )}

      {/* Insights tab */}
      {tab === 'insights' && (
        <InsightsTab groupId={groupId} />
      )}

      {/* Participants tab */}
      {tab === 'participants' && (
        <div className="flex-1 overflow-y-auto px-4 py-6">
          <div className="mb-5">
            <h2 className="text-base font-semibold tracking-tight text-white uppercase">Participants</h2>
            <p className="text-xs text-gray-500 mt-0.5">{memberCount} {memberCount === 1 ? 'member' : 'members'}</p>
          </div>
          <div className="space-y-2">
            {Object.entries(members)
              .sort(([, a], [, b]) => (a.role === 'owner' ? -1 : b.role === 'owner' ? 1 : 0))
              .map(([userId, member]) => {
                const name = member.full_name || member.email?.split('@')[0] || 'Unknown'
                const isOwnerRow = member.role === 'owner'
                const isYou = userId === user.id
                return (
                  <div key={userId} className="card border border-app-border rounded-2xl px-4 py-3 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-ucf-gold/15 flex items-center justify-center shrink-0">
                      <span className="text-ucf-gold text-sm font-bold">{name.charAt(0).toUpperCase()}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-white truncate">{name}</p>
                        {isYou && <span className="text-xs text-gray-600 shrink-0">you</span>}
                      </div>
                      <p className="text-xs text-gray-600 truncate">{member.email}</p>
                    </div>
                    {isOwnerRow && (
                      <div className="flex items-center gap-1 shrink-0 bg-ucf-gold/10 border border-ucf-gold/20 px-2 py-0.5 rounded-full">
                        <Crown className="w-3 h-3 text-ucf-gold" />
                        <span className="text-xs text-ucf-gold font-medium">Owner</span>
                      </div>
                    )}
                  </div>
                )
              })}
          </div>
        </div>
      )}
    </div>
  )
}

function SessionCard({ session, groupId }) {
  const navigate = useNavigate()
  const sType = session.session_type || (session.is_virtual ? 'online' : 'in_person')

  const typeBadge = {
    in_person: { label: 'In-Person', cls: 'bg-ucf-gold/10 text-ucf-gold border-ucf-gold/20' },
    hybrid:    { label: 'Hybrid',    cls: 'bg-ucf-gold/20 text-ucf-gold border-ucf-gold/30' },
    online:    { label: 'Online',    cls: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
  }[sType] || { label: 'In-Person', cls: 'bg-ucf-gold/10 text-ucf-gold border-ucf-gold/20' }

  return (
    <div
      onClick={() => navigate(`/groups/${groupId}/sessions/${session.id}`)}
      className="card border border-app-border rounded-2xl p-4 cursor-pointer hover:border-ucf-gold/30 transition-colors duration-200"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-white text-sm">{session.title}</p>
          {session.description && <p className="text-gray-500 text-xs mt-0.5 truncate">{session.description}</p>}
          {session.topics?.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {session.topics.map((t) => (
                <span key={t} className="text-xs bg-ucf-gold/10 text-ucf-gold/80 border border-ucf-gold/15 px-2 py-0.5 rounded-full">{t}</span>
              ))}
            </div>
          )}
        </div>
        <span className={`shrink-0 text-xs px-2 py-0.5 rounded-full border ${typeBadge.cls}`}>{typeBadge.label}</span>
      </div>

      <div className="mt-3 flex flex-wrap gap-3 text-xs text-gray-400">
        <div className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /><span>{formatSessionDate(session.start_time)}</span></div>
        <div className="flex items-center gap-1">
          <span>{formatSessionTime(session.start_time)}{session.end_time && ` – ${formatSessionTime(session.end_time)}`}</span>
        </div>
        {session.location && (
          <div className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /><span>{session.location}</span></div>
        )}
        {(sType === 'hybrid' || sType === 'online') && (
          <div className="flex items-center gap-1 text-ucf-gold/70">
            <Video className="w-3.5 h-3.5" />
            <span>{sType === 'hybrid' ? 'Hybrid — has meeting link' : 'Online meeting'}</span>
          </div>
        )}
      </div>
    </div>
  )
}

function InsightsTab({ groupId }) {
  const { user } = useAuth()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!user || !groupId) return
    async function fetchInsights() {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        const token = session?.access_token
        const res = await fetch(`${import.meta.env.VITE_API_URL}/api/quiz/insights/${groupId}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        const json = await res.json()
        setData(json)
      } catch (err) {
        setError('Failed to load insights.')
      }
      setLoading(false)
    }
    fetchInsights()
  }, [user, groupId])

  if (loading) return (
    <div className="flex-1 overflow-y-auto px-4 py-6">
      <div className="mb-6 space-y-2">
        <SkeletonLine className="h-4 w-32" />
        <SkeletonLine className="h-2.5 w-72" />
      </div>
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="card border border-app-border rounded-xl p-4 text-center space-y-2">
              <SkeletonLine className="h-6 w-10 mx-auto" />
              <SkeletonLine className="h-2.5 w-14 mx-auto" />
            </div>
          ))}
        </div>
        <div className="card border border-app-border rounded-2xl p-4 space-y-3">
          <SkeletonLine className="h-3 w-32" />
          {[0, 1, 2].map((i) => (
            <div key={i} className="space-y-1.5">
              <SkeletonLine className="h-3.5 w-full" />
              <SkeletonLine className="h-1.5 w-full rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )

  return (
    <div className="flex-1 overflow-y-auto px-4 py-6">
      <div className="mb-6">
        <h2 className="text-base font-semibold text-white uppercase">Leaderboard</h2>
        <p className="text-xs text-gray-500 mt-0.5">Aggregate KnightCheck performance — individual scores are private</p>
      </div>

      {error ? (
        <div className="flex items-center gap-2 text-red-400 text-sm">
          <AlertCircle className="w-4 h-4" /> {error}
        </div>
      ) : !data?.hasData ? (
        <div className="card border border-app-border rounded-2xl p-8 text-center">
          <BarChart2 className="w-10 h-10 text-gray-700 mx-auto mb-3" />
          <p className="text-gray-400 text-sm">No KnightCheck data yet.</p>
          <p className="text-gray-600 text-xs mt-1">Complete quizzes after sessions to see the leaderboard here.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Summary stats */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Group Avg', value: `${data.avgScore}/5` },
              { label: 'Quizzes', value: data.quizCount },
              { label: 'Results', value: data.totalResults },
            ].map(({ label, value }) => (
              <div key={label} className="card border border-app-border rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-white">{value}</p>
                <p className="text-xs text-gray-600 mt-1 uppercase tracking-widest">{label}</p>
              </div>
            ))}
          </div>

          {/* Topic weakness */}
          {data.topicWeakness?.length > 0 && (
            <div className="card border border-app-border rounded-2xl p-4">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Struggled Topics</p>
              <div className="space-y-2.5">
                {data.topicWeakness.map(({ topic, membersStruggling, totalMembers }) => (
                  <div key={topic}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-white">{topic}</span>
                      <span className="text-xs text-gray-500">{membersStruggling} of {totalMembers} struggled</span>
                    </div>
                    <div className="h-1.5 bg-app-input rounded-full overflow-hidden">
                      <div
                        className="h-full bg-red-400/70 rounded-full"
                        style={{ width: `${(membersStruggling / totalMembers) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* AI suggestion */}
          {data.aiSuggestion && (
            <div className="card border border-ucf-gold/20 rounded-2xl p-4 bg-ucf-gold/5">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-ucf-gold/15 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
                  <Target className="w-4 h-4 text-ucf-gold" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-ucf-gold uppercase tracking-widest mb-1">Suggested Focus</p>
                  <p className="text-sm text-gray-300 leading-relaxed">{data.aiSuggestion}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
