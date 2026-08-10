import React, { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom'
import {
  ArrowLeft, Send, Users, BookOpen, Calendar, Plus, Video, MapPin,
  MoreHorizontal, Crown, BellOff, Bell, Pin, PinOff, LogOut, Share2, Check, X,
  Target, Zap, BarChart2, AlertCircle, Paperclip, FileText, Download, Image as ImageIcon,
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

function formatDateSeparator(iso) {
  const d = new Date(iso)
  const now = new Date()
  const startOfDay = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const diffDays = Math.round((startOfDay(now) - startOfDay(d)) / 86400000)
  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  return d.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })
}

function isSameDay(isoA, isoB) {
  const a = new Date(isoA)
  const b = new Date(isoB)
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

function formatFileSize(bytes) {
  if (!bytes && bytes !== 0) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function isImageType(mimeType) {
  if (!mimeType) return false
  return ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/heic', 'image/heif', 'image/webp'].includes(mimeType.toLowerCase())
}

const ALLOWED_ATTACHMENT_TYPES = [
  'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/heic', 'image/heif', 'image/webp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
]

const MAX_ATTACHMENT_SIZE = 25 * 1024 * 1024

function initialsFor(name) {
  return (name || '?').charAt(0).toUpperCase()
}

function FileTypeIcon({ mimeType }) {
  const isPdf = mimeType === 'application/pdf'
  const isDoc = mimeType?.includes('word') || mimeType?.includes('document')
  const isPpt = mimeType?.includes('powerpoint') || mimeType?.includes('presentation')

  const [bg, border, color] = isPdf
    ? ['bg-red-500/10', 'border-red-500/20', 'text-red-400']
    : isDoc
    ? ['bg-blue-500/10', 'border-blue-500/20', 'text-blue-400']
    : isPpt
    ? ['bg-orange-500/10', 'border-orange-500/20', 'text-orange-400']
    : ['bg-gray-500/10', 'border-gray-500/20', 'text-gray-400']

  return (
    <div className={`w-9 h-9 rounded-lg border flex items-center justify-center shrink-0 ${bg} ${border}`}>
      <FileText className={`w-4 h-4 ${color}`} />
    </div>
  )
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
  const [participantsOpen, setParticipantsOpen] = useState(false)
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false)
  const [showShareModal, setShowShareModal] = useState(false)
  const [leaving, setLeaving] = useState(false)
  const [linkCopied, setLinkCopied] = useState(false)

  const [signedUrls, setSignedUrls] = useState({})
  const [uploadingFile, setUploadingFile] = useState(null)
  const [attachError, setAttachError] = useState('')

  const [muted, setMuted] = useState(() => !!localStorage.getItem(`ks:muted:${groupId}`))
  const [pinnedMessage, setPinnedMessage] = useState(() => {
    const s = localStorage.getItem(`ks:pinned:${groupId}`)
    return s ? JSON.parse(s) : null
  })

  const bottomRef = useRef(null)
  const inputRef = useRef(null)
  const menuRef = useRef(null)
  const participantsRef = useRef(null)
  const fileInputRef = useRef(null)

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
      if (msgs) {
        setMessages(msgs)
        msgs.forEach((m) => { if (m.storage_path) generateSignedUrl(m) })
      }
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
        if (payload.new.storage_path) generateSignedUrl(payload.new)
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [groupId, isMember])

  const generateSignedUrl = async (msg) => {
    if (!msg.storage_path) return
    const { data } = await supabase.storage.from('chat-uploads').createSignedUrl(msg.storage_path, 3600)
    if (data?.signedUrl) setSignedUrls((prev) => ({ ...prev, [msg.id]: data.signedUrl }))
  }

  useEffect(() => {
    if (tab === 'chat') bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, tab])

  useEffect(() => {
    function handler(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false)
      if (participantsRef.current && !participantsRef.current.contains(e.target)) setParticipantsOpen(false)
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

  const handleAttachClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setAttachError('')

    if (!ALLOWED_ATTACHMENT_TYPES.includes(file.type)) {
      setAttachError('That file type isn\'t supported.')
      setTimeout(() => setAttachError(''), 4000)
      return
    }
    if (file.size > MAX_ATTACHMENT_SIZE) {
      setAttachError('File is too large (25MB max).')
      setTimeout(() => setAttachError(''), 4000)
      return
    }

    setUploadingFile({ name: file.name })
    const timestamp = Date.now()
    const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_')
    const storagePath = `${groupId}/${timestamp}_${safeName}`

    const { error: storageError } = await supabase.storage
      .from('chat-uploads')
      .upload(storagePath, file, { upsert: false })

    if (storageError) {
      setUploadingFile(null)
      setAttachError('Upload failed. Try again.')
      setTimeout(() => setAttachError(''), 4000)
      return
    }

    const tempId = `temp-${timestamp}`
    const attachmentFields = {
      file_name: file.name,
      file_size: file.size,
      file_type: file.type,
      storage_path: storagePath,
    }
    setMessages((prev) => [...prev, {
      id: tempId, group_id: groupId, user_id: user.id, content: null, type: 'text',
      created_at: new Date().toISOString(), ...attachmentFields,
    }])
    setUploadingFile(null)

    const { data, error } = await supabase
      .from('messages')
      .insert({ group_id: groupId, user_id: user.id, content: null, type: 'text', ...attachmentFields })
      .select()
      .single()

    if (!error && data) {
      setMessages((prev) => prev.map((m) => m.id === tempId ? data : m))
      generateSignedUrl(data)
    } else {
      setMessages((prev) => prev.filter((m) => m.id !== tempId))
    }
  }

  const handleDownloadFile = async (msg) => {
    const { data } = await supabase.storage
      .from('chat-uploads')
      .createSignedUrl(msg.storage_path, 60, { download: true })
    if (data?.signedUrl) {
      const a = document.createElement('a')
      a.href = data.signedUrl
      a.download = msg.file_name
      document.body.appendChild(a)
      a.click()
      a.remove()
    }
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
      <header className="border-b border-app-border px-4 py-3 flex items-center gap-4 shrink-0 relative">
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
        {muted && <BellOff className="w-3.5 h-3.5 text-gray-600 shrink-0" />}

        <div className="relative shrink-0" ref={menuRef}>
          <button
            onClick={() => { setMenuOpen((o) => !o); setParticipantsOpen(false) }}
            className={`p-1.5 rounded-lg transition-colors duration-200 ${menuOpen ? 'bg-app-input text-white' : 'text-gray-500 hover:text-white hover:bg-app-input'}`}
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-full mt-1.5 w-52 card-elevated border rounded-xl shadow-xl z-30 py-1 overflow-hidden">
              <button
                onClick={() => { setParticipantsOpen(true); setMenuOpen(false) }}
                className="w-full text-left px-4 py-2.5 text-sm text-gray-300 hover:text-white hover:bg-app-input transition-colors duration-150 flex items-center gap-2.5"
              >
                <Users className="w-3.5 h-3.5" />
                Participants{memberCount ? ` (${memberCount})` : ''}
              </button>
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

        {participantsOpen && (
          <div ref={participantsRef} className="absolute right-4 top-full mt-1.5 w-72 card-elevated border rounded-xl shadow-xl z-30 overflow-hidden">
            <div className="px-4 py-3 border-b border-app-border flex items-center justify-between">
              <p className="text-sm font-semibold text-white">Participants</p>
              <p className="text-xs text-gray-500">{memberCount} {memberCount === 1 ? 'member' : 'members'}</p>
            </div>
            <div className="max-h-72 overflow-y-auto py-1">
              {Object.entries(members)
                .sort(([, a], [, b]) => (a.role === 'owner' ? -1 : b.role === 'owner' ? 1 : 0))
                .map(([userId, member]) => {
                  const name = member.full_name || member.email?.split('@')[0] || 'Unknown'
                  const isOwnerRow = member.role === 'owner'
                  const isYou = userId === user.id
                  return (
                    <div key={userId} className="px-4 py-2 flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-ucf-gold/15 flex items-center justify-center shrink-0">
                        <span className="text-ucf-gold text-xs font-bold">{initialsFor(name)}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-xs font-medium text-white truncate">{name}</p>
                          {isYou && <span className="text-[10px] text-gray-600 shrink-0">you</span>}
                        </div>
                        <p className="text-[11px] text-gray-600 truncate">{member.email}</p>
                      </div>
                      {isOwnerRow && <Crown className="w-3 h-3 text-ucf-gold shrink-0" />}
                    </div>
                  )
                })}
            </div>
          </div>
        )}
      </header>

      {/* Tab bar */}
      <div className="border-b border-app-border flex items-center shrink-0">
        {[
          { id: 'chat', label: 'Chat' },
          { id: 'sessions', label: `Sessions${upcoming.length ? ` (${upcoming.length})` : ''}` },
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

      {/* Chat tab */}
      {tab === 'chat' && (
        <div className="flex-1 flex flex-col min-h-0 relative overflow-hidden">
          {/* Subtle ambient glow — contained to this tab, doesn't bleed elsewhere */}
          <div
            className="absolute inset-x-0 top-0 pointer-events-none"
            style={{
              height: '320px',
              background: 'radial-gradient(ellipse 70% 100% at 50% 0%, rgba(255,201,4,0.05) 0%, transparent 72%)',
              zIndex: 0,
            }}
            aria-hidden="true"
          />

          {/* Pinned message banner */}
          {pinnedMessage && (
            <div className="border-b border-app-border bg-ucf-gold/5 px-4 py-2 flex items-start gap-2 shrink-0 relative z-10">
              <Pin className="w-3.5 h-3.5 text-ucf-gold mt-0.5 shrink-0" />
              <p className="flex-1 text-xs text-gray-300 truncate">{pinnedMessage.content}</p>
              {isOwner && (
                <button onClick={handleUnpin} className="text-gray-600 hover:text-gray-400 transition-colors shrink-0">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}

          <div className="flex-1 overflow-y-auto px-4 py-6 relative z-10">
            {messages.length === 0 && (
              <div className="text-center pt-16">
                <div className="w-12 h-12 rounded-2xl bg-ucf-gold/10 flex items-center justify-center mx-auto mb-3">
                  <Send className="w-5 h-5 text-ucf-gold/70" />
                </div>
                <p className="text-gray-400 text-sm font-medium">No messages yet</p>
                <p className="text-gray-600 text-xs mt-1">Say hello to the group!</p>
              </div>
            )}
            {messages.map((msg, idx) => {
              const isOwn = msg.user_id === user.id
              const senderName = getSenderName(msg.user_id)
              const isPinned = pinnedMessage?.id === msg.id
              const prev = messages[idx - 1]
              const next = messages[idx + 1]
              const GROUP_GAP_MS = 5 * 60 * 1000
              const showDateSeparator = !prev || !isSameDay(prev.created_at, msg.created_at)
              const isFirstInGroup =
                showDateSeparator ||
                prev.user_id !== msg.user_id ||
                (new Date(msg.created_at) - new Date(prev.created_at)) > GROUP_GAP_MS
              const isLastInGroup =
                !next ||
                !isSameDay(next.created_at, msg.created_at) ||
                next.user_id !== msg.user_id ||
                (new Date(next.created_at) - new Date(msg.created_at)) > GROUP_GAP_MS
              const hasAttachment = !!msg.storage_path
              const isImage = hasAttachment && isImageType(msg.file_type)
              const signedUrl = signedUrls[msg.id]

              return (
                <React.Fragment key={msg.id}>
                  {showDateSeparator && (
                    <div className="flex items-center gap-3 py-3">
                      <div className="flex-1 h-px bg-app-border" />
                      <span className="text-[11px] text-gray-600 uppercase tracking-wide shrink-0">{formatDateSeparator(msg.created_at)}</span>
                      <div className="flex-1 h-px bg-app-border" />
                    </div>
                  )}
                  <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} ${isFirstInGroup ? 'mt-3' : 'mt-0.5'} group/msg`}>
                    {!isOwn && (
                      <div className="w-7 shrink-0 mr-2 self-end mb-0.5">
                        {isFirstInGroup && (
                          <div className="w-7 h-7 rounded-full bg-ucf-gold/15 flex items-center justify-center">
                            <span className="text-ucf-gold text-[11px] font-bold">{initialsFor(senderName)}</span>
                          </div>
                        )}
                      </div>
                    )}
                    <div className={`max-w-sm lg:max-w-lg flex flex-col gap-1 ${isOwn ? 'items-end' : 'items-start'}`}>
                      {!isOwn && isFirstInGroup && senderName && (
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

                        {hasAttachment ? (
                          isImage ? (
                            <a
                              href={signedUrl || undefined}
                              target="_blank"
                              rel="noreferrer"
                              className={`block rounded-2xl overflow-hidden border max-w-[240px] ${
                                isOwn ? 'border-ucf-gold/30' : 'border-app-border'
                              } ${isPinned ? 'ring-1 ring-ucf-gold/40' : ''}`}
                            >
                              {signedUrl ? (
                                <img src={signedUrl} alt={msg.file_name || 'attachment'} className="w-full h-auto block" />
                              ) : (
                                <div className="w-[240px] h-[160px] bg-app-input flex items-center justify-center">
                                  <ImageIcon className="w-6 h-6 text-gray-600" />
                                </div>
                              )}
                              {msg.content && (
                                <div className={`px-3 py-2 text-sm leading-relaxed ${isOwn ? 'bg-ucf-gold text-black font-medium' : 'bg-app-input text-gray-100'}`}>
                                  {msg.content}
                                </div>
                              )}
                            </a>
                          ) : (
                            <div
                              className={`px-3 py-2.5 rounded-2xl border flex items-center gap-3 min-w-[220px] ${
                                isOwn ? 'bg-ucf-gold/10 border-ucf-gold/30' : 'bg-app-input border-app-border'
                              } ${isPinned ? 'ring-1 ring-ucf-gold/40' : ''}`}
                            >
                              <FileTypeIcon mimeType={msg.file_type} />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm text-white font-medium truncate">{msg.file_name}</p>
                                <p className="text-xs text-gray-500">{formatFileSize(msg.file_size)}</p>
                              </div>
                              <button
                                onClick={() => handleDownloadFile(msg)}
                                className="p-1.5 rounded-lg text-gray-400 hover:text-ucf-gold hover:bg-app-bg transition-colors duration-150 shrink-0"
                                title="Download"
                              >
                                <Download className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )
                        ) : (
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
                        )}

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
                      {isLastInGroup && <span className="text-xs text-gray-600 px-1">{formatTime(msg.created_at)}</span>}
                    </div>
                  </div>
                </React.Fragment>
              )
            })}
            <div ref={bottomRef} />
          </div>

          <div className="border-t border-app-border px-4 py-3 shrink-0 relative z-10">
            {uploadingFile && (
              <div className="flex items-center gap-2 text-xs text-gray-500 mb-2 px-1">
                <div className="w-3 h-3 border-2 border-gray-600 border-t-ucf-gold rounded-full animate-spin" />
                Uploading {uploadingFile.name}…
              </div>
            )}
            {attachError && (
              <div className="flex items-center gap-1.5 text-xs text-red-400 mb-2 px-1">
                <AlertCircle className="w-3.5 h-3.5" /> {attachError}
              </div>
            )}
            <form
              onSubmit={handleSend}
              className="flex items-center gap-1 bg-app-input border border-app-border rounded-2xl pl-1.5 pr-1.5 py-1.5 focus-within:border-ucf-gold/60 focus-within:ring-1 focus-within:ring-ucf-gold/25 transition-all duration-200"
            >
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={handleFileSelect}
                accept={ALLOWED_ATTACHMENT_TYPES.join(',')}
              />
              <button
                type="button"
                onClick={handleAttachClick}
                className="p-2 rounded-xl text-gray-500 hover:text-ucf-gold hover:bg-app-bg transition-colors duration-150 shrink-0"
                title="Attach a file or image"
              >
                <Paperclip className="w-4 h-4" />
              </button>
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Message the group…"
                className="flex-1 bg-transparent text-white placeholder-gray-500 focus:outline-none text-sm py-1.5"
              />
              <button
                type="submit"
                disabled={!input.trim() || sending}
                className="bg-ucf-gold text-black font-bold p-2.5 rounded-xl hover:bg-yellow-400 transition-colors duration-200 disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
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
