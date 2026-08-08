import React, { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import {
  ArrowLeft, Video, MapPin, ExternalLink, Copy, Check, UserPlus,
  Trash2, Download, ChevronLeft, ChevronRight, X, FileText,
  Image as ImageIcon, Upload, Calendar, BookOpen, CheckCircle, Target,
  Paperclip,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { SkeletonBlock, SkeletonLine, SkeletonCircle } from '../components/Skeleton'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function timeAgo(iso) {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins} minute${mins !== 1 ? 's' : ''} ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs} hour${hrs !== 1 ? 's' : ''} ago`
  return `${Math.floor(hrs / 24)} day${Math.floor(hrs / 24) !== 1 ? 's' : ''} ago`
}

function formatFullDate(startIso, endIso) {
  const start = new Date(startIso)
  const datePart = start.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })
  const startTime = start.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
  if (!endIso) return `${datePart} · ${startTime}`
  const endTime = new Date(endIso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
  return `${datePart} · ${startTime} – ${endTime}`
}

function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function isImageType(mimeType) {
  if (!mimeType) return false
  return ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/heic', 'image/heif', 'image/webp'].includes(mimeType.toLowerCase())
}

function isAllowedType(file) {
  const allowed = [
    'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/heic', 'image/heif', 'image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain',
  ]
  return allowed.includes((file.type || '').toLowerCase())
}

function initials(name) {
  return (name || '?').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionDivider() {
  return (
    <div
      className="h-px"
      style={{
        background: 'linear-gradient(to right, transparent, rgba(255,201,4,0.15) 30%, rgba(255,201,4,0.20) 50%, rgba(255,201,4,0.15) 70%, transparent)',
      }}
    />
  )
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

// ─── Main component ───────────────────────────────────────────────────────────

export default function SessionDetail() {
  const { groupId, sessionId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuth()

  const backToSessions = () =>
    location.state?.from === 'dashboard-sessions'
      ? navigate('/dashboard', { state: { tab: 'sessions' } })
      : navigate(`/groups/${groupId}`, { state: { tab: 'sessions' } })

  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [pageError, setPageError] = useState(null)

  const [attendees, setAttendees] = useState([])
  const [rsvpLoading, setRsvpLoading] = useState(false)

  const [notes, setNotes] = useState([])
  const [noteInput, setNoteInput] = useState('')
  const [notePosting, setNotePosting] = useState(false)
  const [confirmDeleteNoteId, setConfirmDeleteNoteId] = useState(null)

  const [uploads, setUploads] = useState([])
  const [uploadQueue, setUploadQueue] = useState([])
  const [isDragOver, setIsDragOver] = useState(false)
  const [confirmDeleteUploadId, setConfirmDeleteUploadId] = useState(null)
  const [signedUrls, setSignedUrls] = useState({})
  const [lightboxIndex, setLightboxIndex] = useState(null)

  const [toasts, setToasts] = useState([])
  const [copiedLink, setCopiedLink] = useState(false)

  const [quizId, setQuizId] = useState(null)
  const [generatingQuiz, setGeneratingQuiz] = useState(false)

  const [sampleQuestions, setSampleQuestions] = useState([])
  const [sampleInput, setSampleInput] = useState('')
  const [samplePosting, setSamplePosting] = useState(false)
  const [sampleFile, setSampleFile] = useState(null)
  const [sampleDragOver, setSampleDragOver] = useState(false)
  const sampleFileInputRef = useRef(null)

  const fileInputRef = useRef(null)

  const getToken = async () => {
    const { data: { session: s } } = await supabase.auth.getSession()
    return s?.access_token
  }

  const showToast = (message, type = 'success') => {
    const id = Date.now() + Math.random()
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000)
  }

  // ── Initial load ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user) return
    let cancelled = false

    async function load() {
      try {
        const token = await getToken()
        const headers = { Authorization: `Bearer ${token}` }
        const base = import.meta.env.VITE_API_URL

        const [sessionRes, notesRes, uploadsRes, sampleRes] = await Promise.all([
          fetch(`${base}/api/sessions/${sessionId}`, { headers }),
          fetch(`${base}/api/sessions/${sessionId}/notes`, { headers }),
          fetch(`${base}/api/sessions/${sessionId}/uploads`, { headers }),
          fetch(`${base}/api/sessions/${sessionId}/sample-questions`, { headers }),
        ])

        if (!sessionRes.ok) {
          const err = await sessionRes.json().catch(() => ({}))
          if (!cancelled) { setPageError(err.error || 'Session not found'); setLoading(false) }
          return
        }

        const [sessionData, notesData, uploadsData, sampleData] = await Promise.all([
          sessionRes.json(),
          notesRes.ok ? notesRes.json() : [],
          uploadsRes.ok ? uploadsRes.json() : [],
          sampleRes.ok ? sampleRes.json() : [],
        ])

        if (cancelled) return

        setSession(sessionData)
        setAttendees(sessionData.attendees || [])
        setNotes(notesData || [])
        setUploads(uploadsData || [])
        setSampleQuestions(sampleData || [])

        for (const up of uploadsData || []) generateSignedUrl(up)
        for (const q of sampleData || []) { if (q.storage_path) generateSignedUrl(q) }

        const { data: existingQuiz } = await supabase
          .from('quizzes')
          .select('id')
          .eq('session_id', sessionId)
          .maybeSingle()
        if (!cancelled && existingQuiz) setQuizId(existingQuiz.id)

        setLoading(false)
      } catch {
        if (!cancelled) { setPageError('Failed to load session'); setLoading(false) }
      }
    }

    load()
    return () => { cancelled = true }
  }, [sessionId, user])

  // ── Signed URLs ─────────────────────────────────────────────────────────────
  const generateSignedUrl = async (upload) => {
    const { data } = await supabase.storage
      .from('session-uploads')
      .createSignedUrl(upload.storage_path, 3600)
    if (data?.signedUrl) {
      setSignedUrls(prev => ({ ...prev, [upload.id]: data.signedUrl }))
    }
  }

  // ── Lightbox keyboard ───────────────────────────────────────────────────────
  const imageUploads = uploads.filter(u => isImageType(u.file_type))

  useEffect(() => {
    const handler = (e) => {
      if (lightboxIndex === null) return
      if (e.key === 'Escape') setLightboxIndex(null)
      if (e.key === 'ArrowLeft' && lightboxIndex > 0) setLightboxIndex(i => i - 1)
      if (e.key === 'ArrowRight' && lightboxIndex < imageUploads.length - 1) setLightboxIndex(i => i + 1)
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [lightboxIndex, imageUploads.length])

  // ── Realtime: notes ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user || !sessionId) return
    const channel = supabase
      .channel(`session-notes:${sessionId}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'session_notes',
        filter: `session_id=eq.${sessionId}`,
      }, async (payload) => {
        const { data } = await supabase
          .from('session_notes')
          .select('*, users(full_name, email)')
          .eq('id', payload.new.id)
          .single()
        if (data) setNotes(prev => prev.some(n => n.id === data.id) ? prev : [data, ...prev])
      })
      .on('postgres_changes', {
        event: 'DELETE', schema: 'public', table: 'session_notes',
        filter: `session_id=eq.${sessionId}`,
      }, (payload) => {
        setNotes(prev => prev.filter(n => n.id !== payload.old.id))
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [sessionId, user])

  // ── Realtime: sample questions ──────────────────────────────────────────────
  useEffect(() => {
    if (!user || !sessionId) return
    const channel = supabase
      .channel(`session-sample-questions:${sessionId}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'session_sample_questions',
        filter: `session_id=eq.${sessionId}`,
      }, (payload) => {
        setSampleQuestions(prev => prev.some(q => q.id === payload.new.id) ? prev : [...prev, payload.new])
        if (payload.new.storage_path) generateSignedUrl(payload.new)
      })
      .on('postgres_changes', {
        event: 'DELETE', schema: 'public', table: 'session_sample_questions',
        filter: `session_id=eq.${sessionId}`,
      }, (payload) => {
        setSampleQuestions(prev => prev.filter(q => q.id !== payload.old.id))
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [sessionId, user])

  // ── Realtime: uploads ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!user || !sessionId) return
    const channel = supabase
      .channel(`session-uploads:${sessionId}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'session_uploads',
        filter: `session_id=eq.${sessionId}`,
      }, async (payload) => {
        const { data } = await supabase
          .from('session_uploads')
          .select('*, users(full_name, email)')
          .eq('id', payload.new.id)
          .single()
        if (data) {
          setUploads(prev => prev.some(u => u.id === data.id) ? prev : [...prev, data])
          generateSignedUrl(data)
        }
      })
      .on('postgres_changes', {
        event: 'DELETE', schema: 'public', table: 'session_uploads',
        filter: `session_id=eq.${sessionId}`,
      }, (payload) => {
        setUploads(prev => prev.filter(u => u.id !== payload.old.id))
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [sessionId, user])

  // ── RSVP ────────────────────────────────────────────────────────────────────
  const handleRsvp = async () => {
    if (rsvpLoading) return
    setRsvpLoading(true)
    const token = await getToken()
    const isAttending = attendees.some(a => a.user_id === user.id)
    const res = await fetch(`${import.meta.env.VITE_API_URL}/api/sessions/${sessionId}/rsvp`, {
      method: isAttending ? 'DELETE' : 'POST',
      headers: { Authorization: `Bearer ${token}` },
    })
    if (res.ok) {
      if (isAttending) {
        setAttendees(prev => prev.filter(a => a.user_id !== user.id))
      } else {
        const name = user.user_metadata?.full_name || user.email || ''
        setAttendees(prev => [...prev, { user_id: user.id, full_name: name, email: user.email }])
      }
    }
    setRsvpLoading(false)
  }

  // ── KnightCheck quiz ────────────────────────────────────────────────────────
  const handleGenerateQuiz = async () => {
    if (generatingQuiz || quizId) return
    setGeneratingQuiz(true)
    try {
      const token = await getToken()
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/quiz/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ session_id: sessionId }),
      })
      const data = await res.json()
      if (res.ok && data.quiz) {
        setQuizId(data.quiz.id)
        navigate(`/quiz/${data.quiz.id}`)
      } else {
        showToast(data.error || 'Failed to generate quiz', 'error')
      }
    } catch {
      showToast('Failed to generate quiz', 'error')
    } finally {
      setGeneratingQuiz(false)
    }
  }

  const handlePostSample = async () => {
    const content = sampleInput.trim()
    if (samplePosting || (!content && !sampleFile)) return
    setSamplePosting(true)

    let attachment = null
    if (sampleFile) {
      if (sampleFile.size > 10 * 1024 * 1024) {
        showToast(`${sampleFile.name}: exceeds 10MB limit`, 'error')
        setSamplePosting(false)
        return
      }
      if (!isAllowedType(sampleFile)) {
        showToast(`${sampleFile.name}: file type not allowed`, 'error')
        setSamplePosting(false)
        return
      }
      const timestamp = Date.now()
      const safeName = sampleFile.name.replace(/[^a-zA-Z0-9._-]/g, '_')
      const storagePath = `${groupId}/${sessionId}/sample-questions/${timestamp}_${safeName}`
      const { error: storageError } = await supabase.storage
        .from('session-uploads')
        .upload(storagePath, sampleFile, { upsert: false })
      if (storageError) {
        showToast(`${sampleFile.name}: upload failed`, 'error')
        setSamplePosting(false)
        return
      }
      attachment = { file_name: sampleFile.name, file_size: sampleFile.size, file_type: sampleFile.type, storage_path: storagePath }
    }

    const token = await getToken()
    const res = await fetch(`${import.meta.env.VITE_API_URL}/api/sessions/${sessionId}/sample-questions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ content, ...attachment }),
    })
    const data = await res.json()
    if (res.ok) {
      setSampleQuestions(prev => prev.some(q => q.id === data.id) ? prev : [...prev, data])
      if (data.storage_path) generateSignedUrl(data)
      setSampleInput('')
      setSampleFile(null)
    } else {
      showToast(data.error || 'Failed to add sample question', 'error')
    }
    setSamplePosting(false)
  }

  const handleDeleteSample = async (id) => {
    const token = await getToken()
    const res = await fetch(`${import.meta.env.VITE_API_URL}/api/sessions/${sessionId}/sample-questions/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })
    if (res.ok) setSampleQuestions(prev => prev.filter(q => q.id !== id))
  }

  // ── Notes ───────────────────────────────────────────────────────────────────
  const handlePostNote = async () => {
    if (notePosting || noteInput.trim().length < 10) return
    setNotePosting(true)
    const token = await getToken()
    const res = await fetch(`${import.meta.env.VITE_API_URL}/api/sessions/${sessionId}/notes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ content: noteInput.trim() }),
    })
    const data = await res.json()
    if (res.ok) {
      setNotes(prev => prev.some(n => n.id === data.id) ? prev : [data, ...prev])
      setNoteInput('')
    } else {
      showToast(data.error || 'Failed to post note', 'error')
    }
    setNotePosting(false)
  }

  const handleDeleteNote = async (noteId) => {
    const token = await getToken()
    const res = await fetch(`${import.meta.env.VITE_API_URL}/api/sessions/${sessionId}/notes/${noteId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })
    if (res.ok) {
      setNotes(prev => prev.filter(n => n.id !== noteId))
      setConfirmDeleteNoteId(null)
    }
  }

  // ── File upload ──────────────────────────────────────────────────────────────
  const handleFiles = async (files) => {
    const fileArray = Array.from(files)

    await Promise.all(fileArray.map(async (file) => {
      if (file.size > 10 * 1024 * 1024) {
        showToast(`${file.name}: exceeds 10MB limit`, 'error')
        return
      }
      if (!isAllowedType(file)) {
        showToast(`${file.name}: file type not allowed`, 'error')
        return
      }

      const queueId = `${Date.now()}-${Math.random()}`
      setUploadQueue(prev => [...prev, { id: queueId, name: file.name, progress: 0, status: 'uploading' }])

      let fakeProgress = 0
      const interval = setInterval(() => {
        fakeProgress = Math.min(fakeProgress + 6, 80)
        setUploadQueue(prev => prev.map(q => q.id === queueId ? { ...q, progress: fakeProgress } : q))
      }, 120)

      try {
        const timestamp = Date.now()
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
        const storagePath = `${groupId}/${sessionId}/${timestamp}_${safeName}`

        const { error: storageError } = await supabase.storage
          .from('session-uploads')
          .upload(storagePath, file, { upsert: false })

        clearInterval(interval)

        if (storageError) {
          setUploadQueue(prev => prev.map(q => q.id === queueId ? { ...q, status: 'error', error: storageError.message, progress: 100 } : q))
          setTimeout(() => setUploadQueue(prev => prev.filter(q => q.id !== queueId)), 5000)
          return
        }

        const token = await getToken()
        const metaRes = await fetch(`${import.meta.env.VITE_API_URL}/api/sessions/${sessionId}/uploads`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            group_id: groupId,
            file_name: file.name,
            file_size: file.size,
            file_type: file.type,
            storage_path: storagePath,
          }),
        })

        setUploadQueue(prev => prev.map(q => q.id === queueId ? { ...q, progress: 100, status: 'done' } : q))
        showToast(`✓ ${file.name} uploaded successfully`)

        if (metaRes.ok) {
          const upload = await metaRes.json()
          setUploads(prev => prev.some(u => u.id === upload.id) ? prev : [...prev, upload])
          generateSignedUrl(upload)
        }

        setTimeout(() => setUploadQueue(prev => prev.filter(q => q.id !== queueId)), 3000)
      } catch {
        clearInterval(interval)
        setUploadQueue(prev => prev.map(q => q.id === queueId ? { ...q, status: 'error', error: 'Upload failed', progress: 100 } : q))
        setTimeout(() => setUploadQueue(prev => prev.filter(q => q.id !== queueId)), 5000)
      }
    }))
  }

  const handleDeleteUpload = async (uploadId) => {
    const token = await getToken()
    const res = await fetch(`${import.meta.env.VITE_API_URL}/api/sessions/${sessionId}/uploads/${uploadId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })
    if (res.ok) {
      setUploads(prev => prev.filter(u => u.id !== uploadId))
      setConfirmDeleteUploadId(null)
    }
  }

  const handleDownload = async (upload) => {
    const { data } = await supabase.storage
      .from('session-uploads')
      .createSignedUrl(upload.storage_path, 60, { download: true })
    if (data?.signedUrl) {
      const a = document.createElement('a')
      a.href = data.signedUrl
      a.download = upload.file_name
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
    }
  }

  const handleCopyMeetingLink = () => {
    navigator.clipboard.writeText(session.meeting_url)
    setCopiedLink(true)
    setTimeout(() => setCopiedLink(false), 2000)
  }

  // ── Drag & drop ──────────────────────────────────────────────────────────────
  const handleDragOver = (e) => { e.preventDefault(); setIsDragOver(true) }
  const handleDragLeave = (e) => { e.preventDefault(); setIsDragOver(false) }
  const handleDrop = (e) => {
    e.preventDefault()
    setIsDragOver(false)
    if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files)
  }

  // ── Drag & drop — sample questions ──────────────────────────────────────────
  const handleSampleDragOver = (e) => { e.preventDefault(); setSampleDragOver(true) }
  const handleSampleDragLeave = (e) => { e.preventDefault(); setSampleDragOver(false) }
  const handleSampleDrop = (e) => {
    e.preventDefault()
    setSampleDragOver(false)
    const dropped = e.dataTransfer.files
    if (!dropped.length) return
    if (dropped.length > 1) showToast('Only one attachment at a time — using the first file', 'error')
    setSampleFile(dropped[0])
  }

  // ── Loading / error states ───────────────────────────────────────────────────
  if (loading) return (
    <div className="min-h-screen bg-app-bg text-white">
      <header className="border-b border-app-border bg-app-surface sticky top-0 z-10 px-4 py-3">
        <SkeletonLine className="h-4 w-32" />
      </header>
      <main className="max-w-[800px] mx-auto px-6 py-8 space-y-10">
        <section>
          <div className="card border border-app-border rounded-2xl p-6 space-y-5">
            <div className="flex items-start justify-between gap-4">
              <SkeletonLine className="h-7 w-2/3" />
              <SkeletonLine className="h-6 w-20 rounded-full shrink-0" />
            </div>
            <SkeletonLine className="h-4 w-40" />
            <SkeletonLine className="h-4 w-56" />
            <SkeletonLine className="h-3.5 w-full" />
            <SkeletonLine className="h-3.5 w-4/5" />
            <div className="flex gap-2">
              <SkeletonLine className="h-6 w-16 rounded-full" />
              <SkeletonLine className="h-6 w-20 rounded-full" />
            </div>
            <div className="flex items-center gap-2.5">
              <SkeletonCircle className="w-7 h-7" />
              <SkeletonLine className="h-3.5 w-32" />
            </div>
            <div className="border-t border-app-border" />
            <div>
              <SkeletonLine className="h-3 w-36 mb-3" />
              <div className="flex gap-2">
                <SkeletonLine className="h-7 w-20 rounded-full" />
                <SkeletonLine className="h-7 w-20 rounded-full" />
              </div>
            </div>
          </div>
        </section>
        <section>
          <SkeletonLine className="h-5 w-40 mb-5" />
          <SkeletonBlock className="h-24" />
          <div className="space-y-3 mt-5">
            {[0, 1].map((i) => (
              <div key={i} className="card border border-app-border rounded-2xl p-4 flex items-start gap-3">
                <SkeletonCircle className="w-7 h-7" />
                <div className="flex-1 space-y-2">
                  <SkeletonLine className="h-3.5 w-3/4" />
                  <SkeletonLine className="h-3.5 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  )

  if (pageError) return (
    <div className="min-h-screen bg-app-bg flex items-center justify-center">
      <div className="text-center">
        <p className="text-white font-semibold mb-2">{pageError}</p>
        <button onClick={backToSessions} className="text-ucf-gold text-sm hover:underline">
          ← Back to sessions
        </button>
      </div>
    </div>
  )

  if (!session) return null

  const sType = session.session_type || (session.is_virtual ? 'online' : 'in_person')
  const isAttending = attendees.some(a => a.user_id === user.id)
  const hasStarted = new Date(session.start_time) <= new Date()

  const TYPE_BADGE = {
    in_person: { label: 'In-Person', cls: 'bg-ucf-gold/10 text-ucf-gold border-ucf-gold/20' },
    hybrid:    { label: 'Hybrid',    cls: 'bg-ucf-gold/20 text-ucf-gold border-ucf-gold/30' },
    online:    { label: 'Online',    cls: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
  }
  const badge = TYPE_BADGE[sType] || TYPE_BADGE.in_person

  const docUploads = uploads.filter(u => !isImageType(u.file_type))

  return (
    <div className="min-h-screen bg-app-bg text-white">

      {/* ── Lightbox ── */}
      {lightboxIndex !== null && (
        <div
          className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center"
          onClick={() => setLightboxIndex(null)}
        >
          <button
            onClick={() => setLightboxIndex(null)}
            className="absolute top-5 right-5 p-2 rounded-xl bg-white/10 text-gray-300 hover:text-white hover:bg-white/20 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          {lightboxIndex > 0 && (
            <button
              onClick={(e) => { e.stopPropagation(); setLightboxIndex(i => i - 1) }}
              className="absolute left-5 p-3 rounded-xl bg-white/10 text-gray-300 hover:text-white hover:bg-white/20 transition-colors"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
          )}

          {signedUrls[imageUploads[lightboxIndex]?.id] ? (
            <img
              src={signedUrls[imageUploads[lightboxIndex].id]}
              alt={imageUploads[lightboxIndex]?.file_name}
              className="max-h-[90vh] max-w-[90vw] object-contain rounded-xl shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <div className="w-64 h-64 flex items-center justify-center">
              <ImageIcon className="w-12 h-12 text-gray-600" />
            </div>
          )}

          {lightboxIndex < imageUploads.length - 1 && (
            <button
              onClick={(e) => { e.stopPropagation(); setLightboxIndex(i => i + 1) }}
              className="absolute right-5 p-3 rounded-xl bg-white/10 text-gray-300 hover:text-white hover:bg-white/20 transition-colors"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          )}

          <div className="absolute bottom-6 text-xs text-gray-500">
            {lightboxIndex + 1} / {imageUploads.length}
            {imageUploads[lightboxIndex]?.file_name && (
              <span className="ml-3">{imageUploads[lightboxIndex].file_name}</span>
            )}
          </div>
        </div>
      )}

      {/* ── Toast notifications ── */}
      <div className="fixed bottom-6 right-6 space-y-2 z-40 pointer-events-none">
        {toasts.map(t => (
          <div
            key={t.id}
            className={`px-4 py-3 rounded-xl text-sm shadow-xl border note-enter ${
              t.type === 'error'
                ? 'bg-red-500/20 border-red-500/30 text-red-200'
                : 'bg-green-500/20 border-green-500/30 text-green-200'
            }`}
          >
            {t.message}
          </div>
        ))}
      </div>

      {/* ── Header ── */}
      <header className="border-b border-app-border bg-app-surface sticky top-0 z-10 px-4 py-3">
        <button
          onClick={backToSessions}
          className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Sessions
        </button>
      </header>

      {/* ── Page body ── */}
      <main className="max-w-[800px] mx-auto px-6 py-8 space-y-10">

        {/* ════════════════════════════════════════════
            Section 1 — Session Info
        ════════════════════════════════════════════ */}
        <section>
          <div className="card border border-app-border rounded-2xl p-6 space-y-5">

            {/* Title + type badge */}
            <div className="flex items-start justify-between gap-4">
              <h1 className="text-2xl font-bold tracking-tight text-white leading-tight">{session.title}</h1>
              <span className={`shrink-0 text-xs font-semibold px-3 py-1.5 rounded-full border ${badge.cls}`}>
                {badge.label}
              </span>
            </div>

            {/* Course */}
            {session.groups?.courses && (
              <div className="flex items-center gap-2 text-sm">
                <BookOpen className="w-4 h-4 text-ucf-gold shrink-0" />
                <span className="text-ucf-gold font-medium">{session.groups.courses.code}</span>
                {session.groups.courses.name && session.groups.courses.name !== session.groups.courses.code && (
                  <span className="text-gray-400">— {session.groups.courses.name}</span>
                )}
              </div>
            )}

            {/* Date/time */}
            <div className="flex items-center gap-2 text-sm text-gray-300">
              <Calendar className="w-4 h-4 text-gray-500 shrink-0" />
              <span>{formatFullDate(session.start_time, session.end_time)}</span>
            </div>

            {/* Description */}
            {session.description && (
              <p className="text-sm text-gray-400 leading-relaxed">{session.description}</p>
            )}

            {/* Topics */}
            {session.topics?.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {session.topics.map(t => (
                  <span key={t} className="text-xs bg-ucf-gold/10 text-ucf-gold border border-ucf-gold/20 px-3 py-1 rounded-full font-medium">
                    {t}
                  </span>
                ))}
              </div>
            )}

            {/* Created by */}
            {session.creator && (
              <div className="flex items-center gap-2.5 text-sm">
                <div className="w-7 h-7 rounded-full bg-ucf-gold/20 flex items-center justify-center shrink-0">
                  <span className="text-ucf-gold text-xs font-bold">
                    {initials(session.creator.full_name || session.creator.email)}
                  </span>
                </div>
                <span className="text-gray-400">
                  Created by{' '}
                  <span className="text-white font-medium">
                    {session.creator.full_name || session.creator.email?.split('@')[0]}
                  </span>
                </span>
              </div>
            )}

            {/* Location */}
            {(sType === 'in_person' || sType === 'hybrid') && session.location && (
              <div className="flex items-center gap-2 text-sm text-gray-300">
                <MapPin className="w-4 h-4 text-gray-500 shrink-0" />
                <span>{session.location}</span>
              </div>
            )}

            {/* Meeting link */}
            {(sType === 'hybrid' || sType === 'online') && (
              <div className="border border-app-border rounded-xl p-4 space-y-3">
                {session.meeting_url ? (
                  <>
                    <div className="flex items-center gap-3 flex-wrap">
                      <a
                        href={hasStarted ? session.meeting_url : undefined}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-colors duration-200 ${
                          hasStarted
                            ? 'bg-ucf-gold text-black hover:bg-yellow-400'
                            : 'bg-ucf-gold/20 text-ucf-gold/50 cursor-not-allowed pointer-events-none'
                        }`}
                      >
                        <Video className="w-4 h-4" />
                        {sType === 'hybrid' ? 'Join Online' : 'Join Meeting'}
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                      {!hasStarted && (
                        <span className="text-xs text-gray-600">Meeting opens at session time</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 text-xs text-gray-400 bg-app-input border border-app-border rounded-lg px-3 py-2 truncate font-mono">
                        {session.meeting_url}
                      </code>
                      <button
                        onClick={handleCopyMeetingLink}
                        title="Copy link"
                        className={`shrink-0 p-2 rounded-lg border transition-colors duration-200 ${
                          copiedLink
                            ? 'border-green-500/30 bg-green-500/10 text-green-400'
                            : 'border-app-border hover:border-ucf-gold/40 text-gray-400 hover:text-white'
                        }`}
                      >
                        {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-gray-600">Meet link unavailable — contact the session host</p>
                )}
              </div>
            )}

            {/* Divider */}
            <div className="border-t border-app-border" />

            {/* RSVP section */}
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3">
                {attendees.length === 0
                  ? 'No attendees yet'
                  : `${attendees.length} member${attendees.length !== 1 ? 's' : ''} attending`}
              </p>

              {attendees.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {attendees.map(a => {
                    const name = a.full_name || a.email || '?'
                    const isYou = a.user_id === user.id
                    return (
                      <div key={a.user_id} className="flex items-center gap-2 bg-app-input border border-app-border rounded-full pl-1 pr-3 py-1">
                        <div className="w-6 h-6 rounded-full bg-ucf-gold/20 flex items-center justify-center shrink-0">
                          <span className="text-ucf-gold text-[10px] font-bold">{initials(name)}</span>
                        </div>
                        <span className="text-xs text-gray-300">{isYou ? 'You' : name}</span>
                      </div>
                    )
                  })}
                </div>
              )}

              {isAttending ? (
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 text-green-400 text-sm">
                    <CheckCircle className="w-4 h-4" />
                    <span className="font-medium">You're attending</span>
                  </div>
                  <button
                    onClick={handleRsvp}
                    disabled={rsvpLoading}
                    className="text-xs text-gray-500 hover:text-red-400 transition-colors duration-200 disabled:opacity-50"
                  >
                    Cancel RSVP
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleRsvp}
                  disabled={rsvpLoading}
                  className="inline-flex items-center gap-2 bg-ucf-gold text-black font-bold px-4 py-2.5 rounded-xl text-sm hover:bg-yellow-400 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <UserPlus className="w-4 h-4" />
                  {rsvpLoading ? 'Updating…' : 'RSVP to this session'}
                </button>
              )}
            </div>
          </div>
        </section>

        <SectionDivider />

        {/* ════════════════════════════════════════════
            Section 1.5 — KnightCheck
        ════════════════════════════════════════════ */}
        {hasStarted && (
          <section>
            <div className="card border border-ucf-gold/20 rounded-2xl p-6 bg-ucf-gold/5">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 bg-ucf-gold/15 rounded-xl flex items-center justify-center shrink-0">
                  <Target className="w-4 h-4 text-ucf-gold" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white mb-1">KnightCheck</p>
                  {quizId ? (
                    <>
                      <p className="text-xs text-gray-400 mb-3">Test your retention with a quick 5-question quiz on this session's topics.</p>
                      <button
                        onClick={() => navigate(`/quiz/${quizId}`)}
                        className="inline-flex items-center gap-2 bg-ucf-gold text-black font-bold px-4 py-2 rounded-xl text-sm hover:bg-yellow-400 transition-colors duration-200"
                      >
                        Take KnightCheck Quiz →
                      </button>
                    </>
                  ) : (
                    <>
                      <p className="text-xs text-gray-400 mb-3">Generate a 5-question AI quiz from this session's topics to test the group's retention.</p>
                      <button
                        onClick={handleGenerateQuiz}
                        disabled={generatingQuiz}
                        className="inline-flex items-center gap-2 bg-ucf-gold text-black font-bold px-4 py-2 rounded-xl text-sm hover:bg-yellow-400 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {generatingQuiz ? 'Generating…' : 'Generate KnightCheck Quiz'}
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Sample questions — optional grounding material for the AI generator */}
              {!quizId && (
                <div
                  onDragOver={handleSampleDragOver}
                  onDragLeave={handleSampleDragLeave}
                  onDrop={handleSampleDrop}
                  className={`relative mt-5 pt-5 border-t rounded-b-xl transition-colors duration-150 ${
                    sampleDragOver ? 'border-ucf-gold/40 bg-ucf-gold/5' : 'border-ucf-gold/10'
                  }`}
                >
                  {sampleDragOver && (
                    <div className="absolute inset-0 top-5 rounded-xl border-2 border-dashed border-ucf-gold/50 bg-app-surface/90 flex items-center justify-center z-10 pointer-events-none">
                      <p className="text-sm font-medium text-ucf-gold flex items-center gap-2">
                        <Paperclip className="w-4 h-4" /> Drop to attach
                      </p>
                    </div>
                  )}
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1">Sample Questions (optional)</p>
                  <p className="text-xs text-gray-500 mb-1">
                    Add reference questions, or a photo/file from the session — KnightCheck uses them to write a more accurate quiz. Works fine without any too.
                  </p>
                  <p className="text-xs text-gray-600 mb-3">
                    Drag & drop a file anywhere in this box, or click <Paperclip className="w-3 h-3 inline -mt-0.5" /> to browse. KnightCheck actually reads JPG/PNG/GIF/WEBP photos and PDF/DOCX/PPTX/TXT documents. HEIC photos and legacy .doc/.ppt files can be attached too, just won't be scanned by the AI. Max 10MB.
                  </p>

                  {sampleFile && (
                    <div className="flex items-center gap-2 bg-app-input border border-app-border rounded-lg px-3 py-2 mb-2 text-xs">
                      <Paperclip className="w-3.5 h-3.5 text-ucf-gold shrink-0" />
                      <span className="flex-1 text-gray-300 truncate">{sampleFile.name}</span>
                      <button onClick={() => setSampleFile(null)} className="shrink-0 text-gray-500 hover:text-gray-300 transition-colors">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}

                  <div className="flex gap-2 mb-3">
                    <input
                      value={sampleInput}
                      onChange={e => setSampleInput(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') handlePostSample() }}
                      placeholder="e.g. What is the time complexity of binary search?"
                      className="flex-1 bg-app-input border border-app-border rounded-xl px-3.5 py-2.5 text-white placeholder-gray-600 text-sm focus:outline-none focus:border-ucf-gold/60 focus:ring-1 focus:ring-ucf-gold/25 transition-all duration-200"
                    />
                    <input
                      ref={sampleFileInputRef}
                      type="file"
                      accept="image/*,.pdf,.doc,.docx,.ppt,.pptx,.txt"
                      onChange={e => { if (e.target.files[0]) setSampleFile(e.target.files[0]); e.target.value = '' }}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => sampleFileInputRef.current?.click()}
                      title="Attach a photo or file"
                      className="shrink-0 bg-app-input border border-app-border text-gray-400 px-3 py-2.5 rounded-xl hover:border-ucf-gold/40 hover:text-white transition-colors duration-200"
                    >
                      <Paperclip className="w-4 h-4" />
                    </button>
                    <button
                      onClick={handlePostSample}
                      disabled={samplePosting || (!sampleInput.trim() && !sampleFile)}
                      className="shrink-0 bg-app-input border border-app-border text-gray-300 font-medium px-4 py-2.5 rounded-xl text-sm hover:border-ucf-gold/40 hover:text-white transition-colors duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {samplePosting ? 'Adding…' : 'Add'}
                    </button>
                  </div>

                  {sampleQuestions.length > 0 && (
                    <div className="space-y-2">
                      {sampleQuestions.map(q => {
                        const isImage = q.file_type && isImageType(q.file_type)
                        return (
                          <div key={q.id} className="flex items-start gap-2 group/sample">
                            <div className="flex-1 min-w-0 space-y-1.5">
                              {q.content && <p className="text-xs text-gray-400 leading-relaxed">{q.content}</p>}
                              {q.storage_path && (
                                isImage ? (
                                  signedUrls[q.id] ? (
                                    <img
                                      src={signedUrls[q.id]}
                                      alt={q.file_name}
                                      className="max-h-28 rounded-lg border border-app-border cursor-pointer"
                                      onClick={() => window.open(signedUrls[q.id], '_blank')}
                                    />
                                  ) : (
                                    <div className="w-20 h-20 rounded-lg bg-app-input border border-app-border flex items-center justify-center">
                                      <ImageIcon className="w-5 h-5 text-gray-600" />
                                    </div>
                                  )
                                ) : (
                                  <a
                                    href={signedUrls[q.id] || undefined}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1.5 text-xs text-gray-400 bg-app-input border border-app-border rounded-lg px-2.5 py-1.5 hover:text-white hover:border-ucf-gold/40 transition-colors"
                                  >
                                    <FileText className="w-3.5 h-3.5" /> {q.file_name}
                                  </a>
                                )
                              )}
                            </div>
                            {q.user_id === user.id && (
                              <button
                                onClick={() => handleDeleteSample(q.id)}
                                className="shrink-0 opacity-0 group-hover/sample:opacity-100 transition-opacity duration-150 text-gray-600 hover:text-red-400"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          </section>
        )}

        <SectionDivider />

        {/* ════════════════════════════════════════════
            Section 2 — Session Notes
        ════════════════════════════════════════════ */}
        <section>
          <div className="flex items-center gap-3 mb-5">
            <h2 className="text-lg font-semibold text-white">📝 Session Notes</h2>
            {notes.length > 0 && (
              <span className="text-xs bg-app-input border border-app-border text-gray-400 px-2.5 py-0.5 rounded-full">
                {notes.length}
              </span>
            )}
          </div>

          {/* Note input */}
          <div className="card border border-app-border rounded-2xl p-4 mb-5">
            <textarea
              value={noteInput}
              onChange={e => setNoteInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handlePostNote() }}
              placeholder="Share something important from this session — key concepts, reminders, resources..."
              rows={3}
              className="w-full bg-transparent text-white placeholder-gray-600 text-sm resize-none focus:outline-none leading-relaxed"
            />
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-app-border">
              <span className={`text-xs transition-colors ${
                noteInput.trim().length > 0 && noteInput.trim().length < 10
                  ? 'text-red-400'
                  : 'text-gray-600'
              }`}>
                {noteInput.trim().length > 0 && noteInput.trim().length < 10
                  ? `${noteInput.trim().length} / 10 minimum`
                  : `${noteInput.trim().length} characters`}
              </span>
              <button
                onClick={handlePostNote}
                disabled={notePosting || noteInput.trim().length < 10}
                className="inline-flex items-center gap-2 bg-ucf-gold text-black font-bold px-4 py-2 rounded-xl text-sm hover:bg-yellow-400 transition-colors duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {notePosting ? 'Posting…' : 'Post Note'}
              </button>
            </div>
          </div>

          {/* Notes list */}
          {notes.length === 0 ? (
            <div className="card border border-app-border rounded-2xl p-8 text-center">
              <p className="text-gray-500 text-sm">No notes yet — be the first to share something from this session</p>
            </div>
          ) : (
            <div className="space-y-3">
              {notes.map(note => {
                const authorName = note.users?.full_name || note.users?.email?.split('@')[0] || 'Unknown'
                const isOwn = note.user_id === user.id

                return (
                  <div key={note.id} className="card border border-app-border rounded-2xl p-4 group/note note-enter">
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-full bg-ucf-gold/15 flex items-center justify-center shrink-0">
                        <span className="text-ucf-gold text-sm font-bold">{initials(authorName)}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-sm font-semibold text-white truncate">{authorName}</span>
                            <span className="text-xs text-gray-600 shrink-0">{timeAgo(note.created_at)}</span>
                          </div>
                          {isOwn && (
                            <div className="shrink-0">
                              {confirmDeleteNoteId === note.id ? (
                                <div className="flex items-center gap-2 text-xs">
                                  <span className="text-gray-400">Delete this note?</span>
                                  <button
                                    onClick={() => handleDeleteNote(note.id)}
                                    className="text-red-400 hover:text-red-300 font-medium transition-colors"
                                  >
                                    Delete
                                  </button>
                                  <button
                                    onClick={() => setConfirmDeleteNoteId(null)}
                                    className="text-gray-500 hover:text-gray-300 transition-colors"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => setConfirmDeleteNoteId(note.id)}
                                  className="opacity-0 group-hover/note:opacity-100 transition-opacity duration-150 text-gray-600 hover:text-red-400"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                        <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">{note.content}</p>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>

        <SectionDivider />

        {/* ════════════════════════════════════════════
            Section 3 — Shared Files & Photos
        ════════════════════════════════════════════ */}
        <section className="pb-16">
          <div className="flex items-center gap-3 mb-5">
            <h2 className="text-lg font-semibold text-white">📎 Shared Files & Photos</h2>
            {uploads.length > 0 && (
              <span className="text-xs bg-app-input border border-app-border text-gray-400 px-2.5 py-0.5 rounded-full">
                {uploads.length} file{uploads.length !== 1 ? 's' : ''} shared
              </span>
            )}
          </div>

          {/* Drop zone */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all duration-200 mb-5 ${
              isDragOver
                ? 'border-ucf-gold bg-ucf-gold/5 scale-[1.01]'
                : 'border-app-border hover:border-ucf-gold/50 hover:bg-white/[0.02]'
            }`}
          >
            <Upload className={`w-7 h-7 mx-auto mb-3 transition-colors ${isDragOver ? 'text-ucf-gold' : 'text-gray-600'}`} />
            <p className={`text-sm font-medium transition-colors ${isDragOver ? 'text-ucf-gold' : 'text-gray-400'}`}>
              {isDragOver ? 'Drop files here' : 'Drag & drop files here, or click to browse'}
            </p>
            <p className="text-xs text-gray-600 mt-1.5">
              Images (JPG, PNG, GIF, HEIC) · Documents (PDF, DOC, DOCX, PPT, PPTX, TXT) · Max 10MB per file
            </p>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".jpg,.jpeg,.png,.gif,.heic,.pdf,.doc,.docx,.ppt,.pptx,.txt,image/*"
            onChange={e => { handleFiles(e.target.files); e.target.value = '' }}
            className="hidden"
          />

          {/* Upload queue */}
          {uploadQueue.length > 0 && (
            <div className="space-y-2 mb-5">
              {uploadQueue.map(q => (
                <div key={q.id} className="card border border-app-border rounded-xl px-4 py-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm text-gray-300 truncate max-w-xs">{q.name}</span>
                    <span className={`text-xs shrink-0 ml-3 ${q.status === 'error' ? 'text-red-400' : q.status === 'done' ? 'text-green-400' : 'text-gray-500'}`}>
                      {q.status === 'error' ? '✗ Failed' : q.status === 'done' ? '✓ Done' : `${q.progress}%`}
                    </span>
                  </div>
                  <div className="h-1 bg-app-input rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${q.status === 'error' ? 'bg-red-400' : q.status === 'done' ? 'bg-green-400' : 'bg-ucf-gold'}`}
                      style={{ width: `${q.progress}%` }}
                    />
                  </div>
                  {q.error && <p className="text-xs text-red-400 mt-1.5">{q.error}</p>}
                </div>
              ))}
            </div>
          )}

          {/* Empty state */}
          {uploads.length === 0 && uploadQueue.length === 0 && (
            <div className="card border border-app-border rounded-2xl p-8 text-center">
              <p className="text-gray-500 text-sm">No files shared yet — upload notes, slides, or photos from the session</p>
            </div>
          )}

          {/* Files display */}
          {uploads.length > 0 && (
            <div className="space-y-6">

              {/* Images grid */}
              {imageUploads.length > 0 && (
                <div>
                  <p className="text-xs text-gray-600 uppercase tracking-widest font-medium mb-3">Photos</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {imageUploads.map((upload, imgIdx) => {
                      const uploader = upload.users?.full_name || upload.users?.email?.split('@')[0] || 'Unknown'
                      const isOwn = upload.user_id === user.id

                      return (
                        <div key={upload.id} className="group/img">
                          <div
                            onClick={() => setLightboxIndex(imgIdx)}
                            className="w-full aspect-square bg-app-input border border-app-border rounded-xl overflow-hidden cursor-pointer hover:border-ucf-gold/40 transition-colors duration-200"
                          >
                            {signedUrls[upload.id] ? (
                              <img
                                src={signedUrls[upload.id]}
                                alt={upload.file_name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <ImageIcon className="w-6 h-6 text-gray-600" />
                              </div>
                            )}
                          </div>
                          <div className="mt-1.5 flex items-start justify-between gap-1">
                            <div className="min-w-0">
                              <p className="text-xs text-gray-500 truncate">{uploader}</p>
                              <p className="text-xs text-gray-700">{timeAgo(upload.created_at)}</p>
                            </div>
                            <div className="flex items-center gap-0.5 shrink-0">
                              <button
                                onClick={() => handleDownload(upload)}
                                title="Download"
                                className="p-1.5 text-gray-600 hover:text-white transition-colors"
                              >
                                <Download className="w-3 h-3" />
                              </button>
                              {isOwn && (
                                confirmDeleteUploadId === upload.id ? (
                                  <div className="flex items-center gap-1">
                                    <button onClick={() => handleDeleteUpload(upload.id)} className="text-red-400 hover:text-red-300 text-[10px] font-medium transition-colors">Del</button>
                                    <button onClick={() => setConfirmDeleteUploadId(null)} className="text-gray-600 hover:text-gray-400 text-[10px] transition-colors">✕</button>
                                  </div>
                                ) : (
                                  <button
                                    onClick={() => setConfirmDeleteUploadId(upload.id)}
                                    title="Delete"
                                    className="p-1.5 text-gray-600 hover:text-red-400 transition-colors"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                )
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Documents list */}
              {docUploads.length > 0 && (
                <div>
                  <p className="text-xs text-gray-600 uppercase tracking-widest font-medium mb-3">Documents</p>
                  <div className="space-y-2">
                    {docUploads.map(upload => {
                      const uploader = upload.users?.full_name || upload.users?.email?.split('@')[0] || 'Unknown'
                      const isOwn = upload.user_id === user.id
                      const truncName = upload.file_name.length > 30
                        ? upload.file_name.slice(0, 30) + '…'
                        : upload.file_name

                      return (
                        <div key={upload.id} className="card border border-app-border rounded-xl px-4 py-3 flex items-center gap-3">
                          <FileTypeIcon mimeType={upload.file_type} />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-white font-medium truncate" title={upload.file_name}>
                              {truncName}
                            </p>
                            <div className="flex items-center gap-1.5 text-xs text-gray-500 mt-0.5">
                              <span>{formatFileSize(upload.file_size)}</span>
                              <span>·</span>
                              <span>{uploader}</span>
                              <span>·</span>
                              <span>{timeAgo(upload.created_at)}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              onClick={() => handleDownload(upload)}
                              title="Download"
                              className="p-1.5 rounded-lg border border-app-border text-gray-500 hover:text-white hover:border-app-border/80 transition-colors duration-200"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </button>
                            {isOwn && (
                              confirmDeleteUploadId === upload.id ? (
                                <div className="flex items-center gap-2 text-xs">
                                  <span className="text-gray-400">Delete?</span>
                                  <button onClick={() => handleDeleteUpload(upload.id)} className="text-red-400 hover:text-red-300 font-medium transition-colors">Yes</button>
                                  <button onClick={() => setConfirmDeleteUploadId(null)} className="text-gray-600 hover:text-gray-400 transition-colors">No</button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => setConfirmDeleteUploadId(upload.id)}
                                  title="Delete"
                                  className="p-1.5 rounded-lg border border-app-border text-gray-500 hover:text-red-400 hover:border-red-500/30 transition-colors duration-200"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
