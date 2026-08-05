-- Run this in the Supabase SQL Editor after 001_schema.sql
-- Allows the backend (using the service role key) to upsert courses,
-- and allows authenticated users to add courses directly if needed.

CREATE POLICY "Service role can manage courses"
  ON public.courses FOR ALL
  USING (true)
  WITH CHECK (true);
