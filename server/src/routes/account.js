const express = require('express')
const { requireAuth } = require('../middleware/auth')
const { deleteGroupWithCleanup, supabaseAdmin } = require('./groups')

const router = express.Router()

// DELETE /api/account — self-service account deletion.
//
// groups.created_by is ON DELETE SET NULL (not CASCADE), while
// group_members.user_id is ON DELETE CASCADE. That mismatch means if we
// called supabaseAdmin.auth.admin.deleteUser() first, any group this user
// owns would lose its only 'owner' member row (cascaded away) while the
// group row itself survives with created_by wiped to null — a permanently
// ownerless, undeletable group (nothing matches created_by for the existing
// DELETE /api/groups/:id check or the "owners can remove members" RLS
// policy). So owned groups must be fully deleted, storage included, BEFORE
// the auth user is deleted.
//
// Everything else the user is attached to (messages, group_members rows for
// groups they don't own, quiz_results, reports, blocks, etc.) either
// cascades or anonymizes via existing FK rules once auth.users(id) is gone.
router.delete('/', requireAuth, async (req, res) => {
  const userId = req.user.id

  try {
    const { data: ownedGroups, error: ownedErr } = await supabaseAdmin
      .from('groups')
      .select('id')
      .eq('created_by', userId)

    if (ownedErr) return res.status(500).json({ error: ownedErr.message })

    for (const group of ownedGroups || []) {
      const { error: deleteErr } = await deleteGroupWithCleanup(group.id)
      if (deleteErr) {
        console.error(`Account deletion: failed to delete owned group ${group.id}`, deleteErr)
        return res.status(500).json({ error: 'Failed to delete a group you own. Please try again.' })
      }
    }

    const { error: authDeleteErr } = await supabaseAdmin.auth.admin.deleteUser(userId)
    if (authDeleteErr) return res.status(500).json({ error: authDeleteErr.message })

    res.json({ success: true })
  } catch (err) {
    console.error('Account deletion failed', err)
    res.status(500).json({ error: 'Failed to delete account' })
  }
})

module.exports = router
