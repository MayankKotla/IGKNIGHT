import React, { useState } from 'react'
import { X } from 'lucide-react'
import { supabase } from '../lib/supabase'

export default function EditNameModal({ userId, currentName, onClose, onSaved }) {
  const [name, setName] = useState(currentName || '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) {
      setError('Name is required.')
      return
    }
    if (trimmed === currentName) {
      onClose()
      return
    }

    setSaving(true)
    setError('')

    const { error: authError } = await supabase.auth.updateUser({ data: { full_name: trimmed } })
    if (authError) {
      setError(authError.message)
      setSaving(false)
      return
    }

    // public.users.full_name is only populated once at signup — it isn't
    // kept in sync with auth metadata automatically, and it's what group
    // members, messages, and notes actually join against elsewhere in the
    // app, so it needs updating too.
    const { error: dbError } = await supabase
      .from('users')
      .update({ full_name: trimmed })
      .eq('id', userId)

    setSaving(false)

    if (dbError) {
      setError(dbError.message)
      return
    }

    onSaved(trimmed)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="card-elevated border rounded-2xl w-full max-w-sm shadow-2xl">
        <div className="flex items-center justify-between p-6 border-b border-app-border">
          <h2 className="text-lg font-bold text-white">Edit Name</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition p-1 rounded-lg hover:bg-app-input"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <p className="text-red-400 text-sm">{error}</p>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">Display Name</label>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={80}
              placeholder="Your name"
              className="w-full bg-app-input border border-app-border rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-ucf-gold focus:ring-1 focus:ring-ucf-gold/50 transition"
            />
          </div>

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
              disabled={saving || !name.trim()}
              className="flex-1 bg-ucf-gold text-black font-bold py-3 rounded-xl hover:bg-yellow-400 transition disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
