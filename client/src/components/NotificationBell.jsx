import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, MessageSquare, Calendar } from 'lucide-react'
import { supabase } from '../lib/supabase'

function timeAgo(iso) {
  const diffMs = Date.now() - new Date(iso).getTime()
  const min = Math.floor(diffMs / 60000)
  if (min < 1) return 'just now'
  if (min < 60) return `${min}m ago`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}h ago`
  return `${Math.floor(hr / 24)}d ago`
}

function formatSessionWhen(iso) {
  const d = new Date(iso)
  const now = new Date()
  const startOfDay = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const diffDays = Math.round((startOfDay(d) - startOfDay(now)) / 86400000)
  const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  if (diffDays === 0) return `Today, ${time}`
  if (diffDays === 1) return `Tomorrow, ${time}`
  return `${d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}, ${time}`
}

// In-app notification bell — unread group messages + upcoming sessions,
// both scoped to groups the user belongs to (via RLS, no group_id filter
// needed on the realtime subscription below — same trick GroupChat.jsx's
// per-group subscription relies on, just without the filter).
//
// No new DB table: reuses the ks:lastRead:/ks:muted: localStorage keys
// Dashboard.jsx's "New Messages" stat card already established, so a
// group's read state here matches what marks it read when you open its
// chat. That does mean read state is per-browser, not synced across
// devices — an acceptable v1 limitation given the existing convention.
//
// currentGroupId lets a page (GroupChat) exclude the group it's already
// showing, since the user is actively seeing those messages live there.
export default function NotificationBell({ userId, currentGroupId = null }) {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [unreadGroups, setUnreadGroups] = useState([])
  const [upcomingSessions, setUpcomingSessions] = useState([])
  const ref = useRef(null)

  const load = useCallback(async () => {
    if (!userId) return
    const { data: memberships } = await supabase
      .from('group_members')
      .select('group_id, joined_at, groups(name)')
      .eq('user_id', userId)

    if (!memberships?.length) {
      setUnreadGroups([])
      setUpcomingSessions([])
      return
    }

    const groupIds = memberships.map((m) => m.group_id)
    const groupNameById = {}
    memberships.forEach((m) => { groupNameById[m.group_id] = m.groups?.name || 'Group' })

    const now = new Date()
    const weekOut = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

    const [{ data: recentMessages }, { data: sessions }] = await Promise.all([
      supabase
        .from('messages')
        .select('group_id, content, user_id, created_at, file_name, users(full_name)')
        .in('group_id', groupIds)
        .neq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(100),
      supabase
        .from('sessions')
        .select('id, group_id, title, start_time')
        .in('group_id', groupIds)
        .gte('start_time', now.toISOString())
        .lte('start_time', weekOut.toISOString())
        .order('start_time', { ascending: true })
        .limit(10),
    ])

    const unread = []
    const seenGroups = new Set()
    for (const msg of recentMessages || []) {
      if (msg.group_id === currentGroupId) continue
      if (seenGroups.has(msg.group_id)) continue
      if (localStorage.getItem(`ks:muted:${msg.group_id}`)) continue
      const lastRead = localStorage.getItem(`ks:lastRead:${msg.group_id}`)
      const cutoff = lastRead || memberships.find((m) => m.group_id === msg.group_id)?.joined_at || new Date(0).toISOString()
      if (msg.created_at > cutoff) {
        seenGroups.add(msg.group_id)
        unread.push({
          groupId: msg.group_id,
          groupName: groupNameById[msg.group_id],
          preview: msg.content || (msg.file_name ? `📎 ${msg.file_name}` : 'New message'),
          senderName: msg.users?.full_name?.split(' ')[0] || 'Someone',
          createdAt: msg.created_at,
        })
      }
    }
    unread.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))

    setUnreadGroups(unread)
    setUpcomingSessions((sessions || []).map((s) => ({ ...s, groupName: groupNameById[s.group_id] })))
  }, [userId, currentGroupId])

  useEffect(() => { load() }, [load])

  // Live updates: a new message from someone else in any of the user's
  // groups bumps the badge without waiting for a manual refresh or full
  // reload of the page the bell happens to be mounted on.
  useEffect(() => {
    if (!userId) return
    const channel = supabase
      .channel(`notifications:${userId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
        if (payload.new.user_id === userId) return
        load()
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [userId, load])

  useEffect(() => {
    if (!open) return
    function handler(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const markGroupRead = (groupId) => {
    localStorage.setItem(`ks:lastRead:${groupId}`, new Date().toISOString())
    setUnreadGroups((prev) => prev.filter((g) => g.groupId !== groupId))
  }

  const goToGroup = (groupId, tab) => {
    markGroupRead(groupId)
    setOpen(false)
    navigate(`/groups/${groupId}`, tab ? { state: { tab } } : undefined)
  }

  const soonCount = upcomingSessions.filter(
    (s) => new Date(s.start_time) - Date.now() < 24 * 60 * 60 * 1000
  ).length
  const badgeCount = unreadGroups.length + soonCount

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Notifications"
        className={`relative p-2 rounded-lg transition-colors duration-200 ${open ? 'bg-app-surface-raised text-white' : 'text-gray-500 hover:text-white hover:bg-app-surface-raised'}`}
      >
        <Bell className="w-4 h-4" />
        {badgeCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center leading-none">
            {badgeCount > 9 ? '9+' : badgeCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 card-elevated border rounded-xl shadow-xl z-30 overflow-hidden">
          <div className="max-h-[420px] overflow-y-auto">
            <div className="px-4 py-2.5 border-b border-app-border">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide flex items-center gap-1.5">
                <MessageSquare className="w-3 h-3" />
                Messages
              </p>
            </div>
            {unreadGroups.length === 0 ? (
              <p className="px-4 py-4 text-xs text-gray-600">You're all caught up.</p>
            ) : (
              unreadGroups.map((g) => (
                <button
                  key={g.groupId}
                  onClick={() => goToGroup(g.groupId, 'chat')}
                  className="w-full text-left px-4 py-2.5 hover:bg-app-input transition-colors duration-150 border-b border-app-border/60"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium text-white truncate">{g.groupName}</p>
                    <span className="text-[10px] text-gray-600 shrink-0">{timeAgo(g.createdAt)}</span>
                  </div>
                  <p className="text-xs text-gray-500 truncate mt-0.5">
                    <span className="text-gray-400">{g.senderName}:</span> {g.preview}
                  </p>
                </button>
              ))
            )}

            <div className="px-4 py-2.5 border-b border-t border-app-border">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide flex items-center gap-1.5">
                <Calendar className="w-3 h-3" />
                Upcoming Sessions
              </p>
            </div>
            {upcomingSessions.length === 0 ? (
              <p className="px-4 py-4 text-xs text-gray-600">No sessions in the next 7 days.</p>
            ) : (
              upcomingSessions.map((s) => (
                <button
                  key={s.id}
                  onClick={() => { setOpen(false); navigate(`/groups/${s.group_id}`, { state: { tab: 'sessions' } }) }}
                  className="w-full text-left px-4 py-2.5 hover:bg-app-input transition-colors duration-150 border-b border-app-border/60 last:border-b-0"
                >
                  <p className="text-sm font-medium text-white truncate">{s.title}</p>
                  <p className="text-xs text-gray-500 truncate mt-0.5">
                    {s.groupName} · {formatSessionWhen(s.start_time)}
                  </p>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
