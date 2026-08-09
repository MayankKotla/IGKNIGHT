import React, { useState, useEffect, useRef } from 'react'
import { X, CheckCircle, AlertCircle, Loader, Sparkles } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { normalizeCourseCode, UCF_CODE_RE } from '../lib/courseCode'

const API = import.meta.env.VITE_API_URL
const MAX_MEMBERS = 200

export default function CreateGroupModal({ onClose, onCreated, onGoToDiscover }) {
  const [courseCode, setCourseCode] = useState('')
  const [coursePreview, setCoursePreview] = useState(null) // { code, name, isNew? }
  const [codeStatus, setCodeStatus] = useState('idle') // idle | checking | valid | invalid
  const [groupName, setGroupName] = useState('')
  const [professorFirstName, setProfessorFirstName] = useState('')
  const [professorLastName, setProfessorLastName] = useState('')
  const [description, setDescription] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [isDuplicate, setIsDuplicate] = useState(false)
  const debounceRef = useRef(null)

  // Live course lookup as user types
  useEffect(() => {
    const normalized = normalizeCourseCode(courseCode)
    clearTimeout(debounceRef.current)
    setCoursePreview(null)

    if (!courseCode.trim()) {
      setCodeStatus('idle')
      return
    }
    if (!UCF_CODE_RE.test(normalized)) {
      setCodeStatus(courseCode.length >= 8 ? 'invalid' : 'idle')
      return
    }

    setCodeStatus('checking')
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`${API}/api/courses/lookup?code=${encodeURIComponent(normalized)}`)
        const data = await res.json()
        if (data.invalid) {
          setCodeStatus('invalid')
          return
        }
        setCoursePreview(
          data.course
            ? { ...data.course, isNew: false }
            : { code: normalized, name: null, isNew: true }
        )
        // Auto-fill group name if blank
        if (!groupName) {
          setGroupName(`${normalized} Study Group`)
        }
        setCodeStatus('valid')
      } catch {
        setCodeStatus('idle')
      }
    }, 350)
  }, [courseCode])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setIsDuplicate(false)

    const normalized = normalizeCourseCode(courseCode)
    if (!UCF_CODE_RE.test(normalized)) {
      setError('Enter a valid UCF course code (e.g. COP 3502C or MAC 2311).')
      return
    }
    if (!groupName.trim()) {
      setError('Group name is required.')
      return
    }
    if (!professorFirstName.trim() || !professorLastName.trim()) {
      setError("Professor's first and last name are required.")
      return
    }

    setSubmitting(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token

      const res = await fetch(`${API}/api/groups`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          course_code: normalized,
          name: groupName.trim(),
          professor_first_name: professorFirstName.trim(),
          professor_last_name: professorLastName.trim(),
          description: description.trim() || null,
          max_members: MAX_MEMBERS,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        if (data.code === 'DUPLICATE_GROUP') {
          setIsDuplicate(true)
          setError(data.error)
        } else {
          throw new Error(data.error || 'Failed to create group')
        }
        return
      }
      onCreated(data)
      onClose()
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="card-elevated border rounded-2xl w-full max-w-md shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-app-border">
          <h2 className="text-lg font-bold text-white">Create a Study Group</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition p-1 rounded-lg hover:bg-app-input"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="flex items-start gap-2 bg-red-950/50 border border-red-800/50 rounded-xl p-3">
              <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
              <div className="text-sm">
                <p className="text-red-400">{error}</p>
                {isDuplicate && onGoToDiscover && (
                  <button
                    type="button"
                    onClick={onGoToDiscover}
                    className="text-ucf-gold hover:underline font-medium mt-1"
                  >
                    Go to Discover →
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Course code input */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">
              Course Code
            </label>
            <div className="relative">
              <input
                value={courseCode}
                onChange={(e) => setCourseCode(e.target.value)}
                placeholder="e.g. COP 3502C or MAC2311"
                maxLength={10}
                className="w-full bg-app-input border border-app-border rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-ucf-gold focus:ring-1 focus:ring-ucf-gold/50 transition pr-10"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                {codeStatus === 'checking' && (
                  <Loader className="w-4 h-4 text-gray-400 animate-spin" />
                )}
                {codeStatus === 'valid' && (
                  <CheckCircle className="w-4 h-4 text-green-400" />
                )}
                {codeStatus === 'invalid' && (
                  <AlertCircle className="w-4 h-4 text-red-400" />
                )}
              </div>
            </div>

            {/* Course preview badge */}
            {coursePreview && (
              <div
                className={`mt-2 flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${
                  coursePreview.isNew
                    ? 'bg-ucf-gold/10 border border-ucf-gold/20 text-ucf-gold'
                    : 'bg-green-950/40 border border-green-800/40 text-green-400'
                }`}
              >
                {coursePreview.isNew ? (
                  <>
                    <Sparkles className="w-3.5 h-3.5 shrink-0" />
                    <span>
                      <strong>{coursePreview.code}</strong> — new course, will be added automatically
                    </span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>
                      <strong>{coursePreview.code}</strong>
                      {coursePreview.name && coursePreview.name !== coursePreview.code && (
                        <> — {coursePreview.name}</>
                      )}
                    </span>
                  </>
                )}
              </div>
            )}
            {codeStatus === 'invalid' && (
              <p className="mt-1.5 text-red-400 text-xs">
                Format: 2–4 letters + 4 digits + optional letter (e.g. COP 3502C, ENC 1101)
              </p>
            )}
          </div>

          {/* Professor */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">
              Professor
            </label>
            <div className="grid grid-cols-2 gap-3">
              <input
                value={professorFirstName}
                onChange={(e) => setProfessorFirstName(e.target.value)}
                placeholder="First name"
                maxLength={40}
                required
                className="w-full bg-app-input border border-app-border rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-ucf-gold focus:ring-1 focus:ring-ucf-gold/50 transition"
              />
              <input
                value={professorLastName}
                onChange={(e) => setProfessorLastName(e.target.value)}
                placeholder="Last name"
                maxLength={40}
                required
                className="w-full bg-app-input border border-app-border rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-ucf-gold focus:ring-1 focus:ring-ucf-gold/50 transition"
              />
            </div>
          </div>

          {/* Group name */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">Group Name</label>
            <input
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="e.g. COP 3502C Morning Squad"
              maxLength={60}
              className="w-full bg-app-input border border-app-border rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-ucf-gold focus:ring-1 focus:ring-ucf-gold/50 transition"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">
              Description <span className="text-gray-500">(optional)</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What will this group focus on?"
              rows={2}
              maxLength={200}
              className="w-full bg-app-input border border-app-border rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-ucf-gold focus:ring-1 focus:ring-ucf-gold/50 transition resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 border border-app-border text-gray-300 font-medium py-3 rounded-xl hover:border-gray-500 hover:text-white transition text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || codeStatus === 'invalid' || !courseCode.trim() || !professorFirstName.trim() || !professorLastName.trim()}
              className="flex-1 bg-ucf-gold text-black font-bold py-3 rounded-xl hover:bg-yellow-400 transition disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              {submitting ? 'Creating…' : 'Create Group'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
