-- Add UCF role (student / ta) to user profiles
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS ucf_role text DEFAULT 'student'
    CHECK (ucf_role IN ('student', 'ta'));

-- Update the new-user trigger to capture ucf_role from signup metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, ucf_role)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    COALESCE(NEW.raw_user_meta_data->>'ucf_role', 'student')
  );
  RETURN NEW;
END;
$$;
