-- ============================================================
-- Fix overly permissive courses RLS policy
-- ============================================================
-- The "Service role can manage courses" policy added in
-- 002_course_policies.sql used USING (true) / WITH CHECK (true)
-- with no role restriction. In Postgres, a policy with no `TO <role>`
-- clause applies to every role — including anon and authenticated —
-- not just the service role. That meant any client (even
-- unauthenticated) could INSERT/UPDATE/DELETE rows in public.courses
-- directly via the Supabase REST API.
--
-- This was never actually needed: the backend already writes to
-- courses using the SUPABASE_SERVICE_ROLE_KEY, and Supabase's
-- service_role Postgres role bypasses RLS entirely by default. So
-- dropping this policy removes the security hole with zero impact
-- on the app — reads still work via "Anyone can view courses", and
-- backend writes still work because the service role ignores RLS.
-- ============================================================

DROP POLICY IF EXISTS "Service role can manage courses" ON public.courses;
