import React, { useState, useEffect } from 'react'
import { X, Calendar, ChevronLeft, ChevronRight, Plus, Check, Video, ExternalLink } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']
const DAYS = ['Su','Mo','Tu','We','Th','Fr','Sa']

function MiniCalendar({ selected, onChange }) {
  const today = new Date()
  const [view, setView] = useState(() => selected || new Date())

  const year = view.getFullYear()
  const month = view.getMonth()

  const firstDow = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells = Array(firstDow).fill(null).concat(
    Array.from({ length: daysInMonth }, (_, i) => i + 1)
  )

  const isSelected = (day) =>
    selected &&
    selected.getDate() === day &&
    selected.getMonth() === month &&
    selected.getFullYear() === year

  const isToday = (day) =>
    today.getDate() === day &&
    today.getMonth() === month &&
    today.getFullYear() === year

  return (
    <div className="bg-app-input border border-app-border rounded-xl p-3 select-none">
      <div className="flex items-center justify-between mb-2">
        <button
          type="button"
          onClick={() => setView(new Date(year, month - 1, 1))}
          className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-app-surface-raised transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="text-sm font-semibold text-white">{MONTHS[month]} {year}</span>
        <button
          type="button"
          onClick={() => setView(new Date(year, month + 1, 1))}
          className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-app-surface-raised transition-colors"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-7 mb-1">
        {DAYS.map((d) => (
          <div key={d} className="text-center text-xs text-gray-600 py-1">{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-y-0.5">
        {cells.map((day, i) => (
          <div key={i} className="flex items-center justify-center">
            {day ? (
              <button
                type="button"
                onClick={() => onChange(new Date(year, month, day))}
                className={`w-7 h-7 rounded-full text-xs font-medium transition-colors duration-150 ${
                  isSelected(day)
                    ? 'bg-ucf-gold text-black font-bold'
                    : isToday(day)
                    ? 'border border-ucf-gold/50 text-ucf-gold'
                    : 'text-gray-300 hover:bg-app-surface-raised'
                }`}
              >
                {day}
              </button>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  )
}

function TimeInputs({ hour, minute, ampm, onChange }) {
  const inputCls = 'bg-app-input border border-app-border rounded-lg text-[#e8e8e8] text-sm text-center focus:outline-none focus:border-ucf-gold/60 focus:ring-1 focus:ring-ucf-gold/25 transition-all duration-200 py-2'
  const selCls = 'bg-app-input border border-app-border rounded-lg text-[#e8e8e8] text-sm text-center focus:outline-none focus:border-ucf-gold/60 transition-colors duration-200 py-2 px-2 cursor-pointer'

  return (
    <div className="flex items-center gap-2">
      <input
        type="text"
        value={hour}
        onChange={(e) => onChange('hour', e.target.value.replace(/\D/g, '').slice(0, 2))}
        placeholder="12"
        maxLength={2}
        className={`${inputCls} w-12`}
      />
      <span className="text-gray-500 text-sm font-medium">:</span>
      <input
        type="text"
        value={minute}
        onChange={(e) => onChange('minute', e.target.value.replace(/\D/g, '').slice(0, 2))}
        placeholder="00"
        maxLength={2}
        className={`${inputCls} w-12`}
      />
      <select value={ampm} onChange={(e) => onChange('ampm', e.target.value)} className={`${selCls} w-16`}>
        <option value="AM">AM</option>
        <option value="PM">PM</option>
      </select>
    </div>
  )
}

function toISO(dateObj, hour, minute, ampm) {
  let h = parseInt(hour)
  if (ampm === 'PM' && h !== 12) h += 12
  if (ampm === 'AM' && h === 12) h = 0
  const d = dateObj
  const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  return new Date(`${dateStr}T${String(h).padStart(2, '0')}:${minute}:00`).toISOString()
}

function formatSelectedDate(d) {
  if (!d) return null
  return `${MONTHS[d.getMonth()]} ${d.getDate()}`
}

const SESSION_TYPES = [
  { value: 'in_person', label: '📍 In-Person' },
  { value: 'hybrid', label: '🔀 Hybrid' },
  { value: 'online', label: '💻 Online' },
]

export default function ScheduleSessionModal({ groupId = null, onClose, onCreated }) {
  const { user } = useAuth()
  const [form, setForm] = useState({
    title: '',
    description: '',
    selectedDate: null,
    startHour: '9',
    startMinute: '00',
    startAmpm: 'AM',
    hasEndTime: false,
    endHour: '10',
    endMinute: '00',
    endAmpm: 'AM',
    session_type: 'in_person',
    location: '',
  })
  const [topics, setTopics] = useState([])
  const [topicInput, setTopicInput] = useState('')
  const [calendarOpen, setCalendarOpen] = useState(true)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [createdSession, setCreatedSession] = useState(null)
  const [meetLinkFailed, setMeetLinkFailed] = useState(false)
  const [linkCopied, setLinkCopied] = useState(false)

  const addTopic = () => {
    const t = topicInput.trim()
    if (t && !topics.includes(t)) setTopics((prev) => [...prev, t])
    setTopicInput('')
  }

  const removeTopic = (i) => setTopics((prev) => prev.filter((_, idx) => idx !== i))

  const [availableGroups, setAvailableGroups] = useState([])
  const [selectedGroupId, setSelectedGroupId] = useState('')

  useEffect(() => {
    if (groupId || !user) return
    supabase
      .from('group_members')
      .select('group_id, groups(id, name, courses(code))')
      .eq('user_id', user.id)
      .then(({ data }) => {
        if (data) setAvailableGroups(data.map((m) => m.groups).filter(Boolean))
      })
  }, [groupId, user])

  const set = (field, value) => setForm((f) => ({ ...f, [field]: value }))
  const setTime = (prefix, key, value) => setForm((f) => ({ ...f, [`${prefix}${key.charAt(0).toUpperCase()}${key.slice(1)}`]: value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    const resolvedGroupId = groupId || selectedGroupId
    if (!groupId && !selectedGroupId) return setError('Please select a group.')
    if (!form.title.trim()) return setError('Title is required.')
    if (!form.selectedDate) return setError('Date is required.')
    if (topics.length === 0) return setError('Add at least one topic for KnightCheck.')
    if (form.session_type !== 'online' && !form.location.trim()) {
      return setError('Location is required for in-person and hybrid sessions.')
    }

    const startISO = toISO(form.selectedDate, form.startHour, form.startMinute, form.startAmpm)
    const endISO = form.hasEndTime
      ? toISO(form.selectedDate, form.endHour, form.endMinute, form.endAmpm)
      : null

    if (endISO && endISO <= startISO) return setError('End time must be after start time.')

    setSaving(true)
    const { data: { session: authSession } } = await supabase.auth.getSession()
    const token = authSession?.access_token

    const res = await fetch(`${import.meta.env.VITE_API_URL}/api/sessions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        group_id: resolvedGroupId,
        title: form.title.trim(),
        description: form.description.trim() || null,
        start_time: startISO,
        end_time: endISO,
        session_type: form.session_type,
        location: form.session_type !== 'online' ? (form.location.trim() || null) : null,
        topics,
      }),
    })

    const result = await res.json()
    setSaving(false)

    if (!res.ok) return setError(result.error || 'Failed to schedule session.')

    const created = result.session

    if (form.session_type !== 'in_person') {
      setCreatedSession(created)
      setMeetLinkFailed(!!result.meet_link_failed)
    } else {
      onCreated(created)
      onClose()
    }
  }

  const inputClass = 'w-full bg-app-input border border-app-border rounded-xl px-4 py-2.5 text-[#e8e8e8] placeholder-gray-600 focus:outline-none focus:border-ucf-gold/60 focus:ring-1 focus:ring-ucf-gold/25 transition-all duration-200 text-sm'

  if (createdSession) {
    const isHybrid = createdSession.session_type === 'hybrid'
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
        <div className="card-elevated border rounded-2xl w-full max-w-md shadow-2xl">
          <div className="flex items-center justify-between px-6 py-4 border-b border-app-border">
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-green-400" />
              <h2 className="font-bold text-white text-sm">Session scheduled!</h2>
            </div>
            <button type="button" onClick={() => { onCreated(createdSession); onClose() }} className="text-gray-500 hover:text-white transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-5 space-y-4">
            {createdSession.meeting_url ? (
              <div className="bg-ucf-gold/10 border border-ucf-gold/30 rounded-xl p-4">
                <p className="text-xs font-semibold text-ucf-gold uppercase tracking-widest mb-3">
                  {isHybrid ? '🎥 Meet Link (share with remote attendees)' : '🎥 Your Meeting Link'}
                </p>
                <div className="flex gap-2 mb-3">
                  <div className="flex-1 bg-app-input border border-app-border rounded-lg px-3 py-2 text-xs text-gray-300 truncate">
                    {createdSession.meeting_url}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(createdSession.meeting_url)
                      setLinkCopied(true)
                      setTimeout(() => setLinkCopied(false), 2000)
                    }}
                    className={`shrink-0 px-3 py-2 rounded-lg text-xs font-semibold transition-colors duration-200 flex items-center gap-1.5 ${
                      linkCopied
                        ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                        : 'bg-ucf-gold text-black hover:bg-yellow-400'
                    }`}
                  >
                    {linkCopied ? <><Check className="w-3.5 h-3.5" /> Copied</> : 'Copy'}
                  </button>
                  {!isHybrid && (
                    <a
                      href={createdSession.meeting_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0 px-3 py-2 rounded-lg text-xs font-semibold bg-app-input border border-app-border text-gray-300 hover:text-white transition-colors flex items-center gap-1"
                    >
                      <ExternalLink className="w-3.5 h-3.5" /> Join
                    </a>
                  )}
                </div>
                <p className="text-xs text-gray-500 leading-relaxed">
                  {isHybrid
                    ? 'As the session host, join this Meet from your physical location so remote members can participate.'
                    : 'Share this link with your group members so they can join online.'}
                </p>
              </div>
            ) : meetLinkFailed ? (
              <div className="bg-app-input border border-app-border rounded-xl p-4">
                <p className="text-sm text-gray-400">
                  Session created successfully. The Google Meet link could not be generated — contact the session host if you need to join online.
                </p>
              </div>
            ) : null}

            <button
              type="button"
              onClick={() => { onCreated(createdSession); onClose() }}
              className="w-full py-2.5 rounded-xl bg-ucf-gold text-black font-bold hover:bg-yellow-400 transition-colors duration-200 text-sm"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="card-elevated border rounded-2xl w-full max-w-md shadow-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-app-border shrink-0">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-ucf-gold" />
            <h2 className="font-bold text-white text-sm">Schedule a Session</h2>
          </div>
          <button type="button" onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto">
          {!groupId && (
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wide">Group *</label>
              <select
                value={selectedGroupId}
                onChange={(e) => setSelectedGroupId(e.target.value)}
                className="w-full bg-app-input border border-app-border rounded-xl px-4 py-2.5 text-[#e8e8e8] focus:outline-none focus:border-ucf-gold/60 focus:ring-1 focus:ring-ucf-gold/25 transition-all duration-200 text-sm cursor-pointer"
              >
                <option value="">Select a group…</option>
                {availableGroups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.courses?.code ? `${g.courses.code} · ` : ''}{g.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wide">Title *</label>
            <input
              value={form.title}
              onChange={(e) => set('title', e.target.value)}
              placeholder="e.g. Midterm review"
              className={inputClass}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wide">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
              placeholder="What will you cover?"
              rows={2}
              className={`${inputClass} resize-none`}
            />
          </div>

          {/* Session type pill selector */}
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wide">Session Type *</label>
            <div className="flex gap-2">
              {SESSION_TYPES.map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => set('session_type', value)}
                  className={`flex-1 py-2 px-2 rounded-xl text-xs font-medium border transition-all duration-200 ${
                    form.session_type === value
                      ? 'bg-ucf-gold text-black border-ucf-gold'
                      : 'bg-app-input border-app-border text-gray-400 hover:text-white hover:border-gray-600'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Location field — in_person and hybrid */}
          {form.session_type !== 'online' && (
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wide">Location *</label>
              <input
                value={form.location}
                onChange={(e) => set('location', e.target.value)}
                placeholder="e.g. Library Room 214, Memory Mall Starbucks"
                className={inputClass}
              />
              {form.session_type === 'hybrid' && (
                <p className="text-xs text-ucf-gold/80 mt-1.5">
                  A Google Meet link will be auto-generated so remote attendees can join 🎥
                </p>
              )}
            </div>
          )}

          {/* Online info note */}
          {form.session_type === 'online' && (
            <div className="bg-ucf-gold/8 border border-ucf-gold/20 rounded-xl px-4 py-3">
              <p className="text-xs text-ucf-gold/90">
                A Google Meet link will be auto-generated for your session 🎥
              </p>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wide">
              Topics * <span className="normal-case text-gray-600 font-normal">(for KnightCheck quiz)</span>
            </label>
            <p className="text-xs text-gray-600 mb-2">
              Add each topic separately so KnightCheck can generate questions per topic.
            </p>
            <div className="flex gap-2">
              <input
                id="topic-input"
                value={topicInput}
                onChange={(e) => setTopicInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') { e.preventDefault(); addTopic() }
                }}
                placeholder="e.g. Recursion"
                className={`${inputClass} flex-1`}
              />
              <button
                type="button"
                onClick={addTopic}
                disabled={!topicInput.trim()}
                title="Add topic"
                className="shrink-0 w-11 rounded-xl bg-ucf-gold/15 text-ucf-gold border border-ucf-gold/30 hover:bg-ucf-gold/25 disabled:opacity-40 disabled:cursor-not-allowed transition-colors duration-200 flex items-center justify-center"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            {topics.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2.5">
                {topics.map((t, i) => (
                  <span key={i} className="flex items-center gap-1 bg-ucf-gold/15 text-ucf-gold text-xs px-2.5 py-1 rounded-full">
                    {t}
                    <button
                      type="button"
                      onClick={() => removeTopic(i)}
                      className="text-ucf-gold/60 hover:text-ucf-gold transition-colors"
                    >
                      <X className="w-2.5 h-2.5" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-medium text-gray-400 uppercase tracking-wide">Date *</label>
              {form.selectedDate && !calendarOpen && (
                <button
                  type="button"
                  onClick={() => setCalendarOpen(true)}
                  className="text-xs text-gray-500 hover:text-ucf-gold transition-colors duration-200"
                >
                  Change
                </button>
              )}
            </div>
            {!calendarOpen && form.selectedDate ? (
              <div className="bg-app-input border border-app-border rounded-xl px-4 py-2.5 text-[#e8e8e8] text-sm">
                {formatSelectedDate(form.selectedDate)}
              </div>
            ) : (
              <MiniCalendar
                selected={form.selectedDate}
                onChange={(d) => {
                  set('selectedDate', d)
                  setCalendarOpen(false)
                }}
              />
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-400 mb-2 uppercase tracking-wide">Start Time *</label>
            <TimeInputs
              hour={form.startHour}
              minute={form.startMinute}
              ampm={form.startAmpm}
              onChange={(key, val) => setTime('start', key, val)}
            />
          </div>

          <div>
            {!form.hasEndTime ? (
              <button
                type="button"
                onClick={() => set('hasEndTime', true)}
                className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-300 transition-colors duration-200"
              >
                <Plus className="w-3 h-3" /> Add end time
              </button>
            ) : (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-medium text-gray-400 uppercase tracking-wide">End Time</label>
                  <button
                    type="button"
                    onClick={() => set('hasEndTime', false)}
                    className="text-xs text-gray-600 hover:text-gray-400 transition-colors duration-200"
                  >
                    Remove
                  </button>
                </div>
                <TimeInputs
                  hour={form.endHour}
                  minute={form.endMinute}
                  ampm={form.endAmpm}
                  onChange={(key, val) => setTime('end', key, val)}
                />
              </div>
            )}
          </div>

          {error && <p className="text-red-400 text-xs">{error}</p>}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-app-border text-gray-400 hover:text-white hover:border-gray-600 transition-colors duration-200 text-sm font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-2.5 rounded-xl bg-ucf-gold text-black font-bold hover:bg-yellow-400 transition-colors duration-200 disabled:opacity-40 disabled:cursor-not-allowed text-sm"
            >
              {saving
                ? (form.session_type !== 'in_person' ? 'Generating Meet…' : 'Scheduling…')
                : 'Schedule'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
