-- Only TAs can create groups
DROP POLICY IF EXISTS "Authenticated users can create groups" ON public.groups;

CREATE POLICY "Only TAs can create groups"
  ON public.groups FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND ucf_role = 'ta'
    )
  );
