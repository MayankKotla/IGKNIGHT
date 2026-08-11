-- Group owners can remove other members (not just leave themselves, which
-- "Users can leave groups" already covers). Postgres OR's multiple
-- permissive policies for the same command together, so this adds an
-- owner-scoped path alongside the existing self-only one.
CREATE POLICY "Owners can remove members"
  ON public.group_members FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.groups
      WHERE groups.id = group_members.group_id AND groups.created_by = auth.uid()
    )
  );

-- No DELETE policy is added for public.groups here, deliberately. Deleting
-- a group needs to also clean up its Supabase Storage objects (chat
-- attachments, session uploads, sample-question attachments), which live
-- outside Postgres and RLS can't reach — so group deletion is only exposed
-- through the server's DELETE /api/groups/:id route (service-role,
-- verifies ownership itself, cleans up storage, then deletes the row).
-- Leaving groups without a client-permissive DELETE policy means a direct
-- Supabase call can't bypass that cleanup.
