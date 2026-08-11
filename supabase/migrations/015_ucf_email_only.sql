-- Narrow UCF email enforcement to @ucf.edu only — @knights.ucf.edu is no
-- longer accepted at signup (client-side regex in Signup.jsx/Login.jsx was
-- updated to match; this brings the database-level trigger in line so
-- signups can't bypass the client check).
CREATE OR REPLACE FUNCTION public.validate_ucf_email()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.email IS NOT NULL
    AND NEW.email NOT LIKE '%@ucf.edu'
  THEN
    RAISE EXCEPTION 'Only UCF email addresses (@ucf.edu) are allowed.';
  END IF;
  RETURN NEW;
END;
$$;
