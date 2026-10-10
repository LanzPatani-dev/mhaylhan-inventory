-- Public staff signup requests are stored without passwords or auth accounts.
CREATE TABLE IF NOT EXISTS public.staff_signup_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  username TEXT NOT NULL,
  email TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS staff_signup_requests_email_lower_unique
ON public.staff_signup_requests (lower(email)) WHERE status = 'pending';

CREATE UNIQUE INDEX IF NOT EXISTS staff_signup_requests_username_lower_unique
ON public.staff_signup_requests (lower(username)) WHERE status = 'pending';

ALTER TABLE public.staff_signup_requests ENABLE ROW LEVEL SECURITY;

GRANT INSERT ON public.staff_signup_requests TO anon, authenticated;
GRANT SELECT, UPDATE, DELETE ON public.staff_signup_requests TO authenticated;

DROP POLICY IF EXISTS "public_submit_staff_signup_request" ON public.staff_signup_requests;
CREATE POLICY "public_submit_staff_signup_request"
ON public.staff_signup_requests FOR INSERT TO anon, authenticated
WITH CHECK (
  status = 'pending'
  AND reviewed_at IS NULL
  AND reviewed_by IS NULL
);

DROP POLICY IF EXISTS "admins_manage_staff_signup_requests" ON public.staff_signup_requests;
DROP POLICY IF EXISTS "admins_read_staff_signup_requests" ON public.staff_signup_requests;
CREATE POLICY "admins_read_staff_signup_requests"
ON public.staff_signup_requests FOR SELECT TO authenticated
USING (public.is_admin());

DROP POLICY IF EXISTS "admins_update_staff_signup_requests" ON public.staff_signup_requests;
CREATE POLICY "admins_update_staff_signup_requests"
ON public.staff_signup_requests FOR UPDATE TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "admins_delete_staff_signup_requests" ON public.staff_signup_requests;
CREATE POLICY "admins_delete_staff_signup_requests"
ON public.staff_signup_requests FOR DELETE TO authenticated
USING (public.is_admin());

CREATE INDEX IF NOT EXISTS idx_staff_signup_requests_pending
ON public.staff_signup_requests (requested_at DESC)
WHERE status = 'pending';

-- New Auth users never receive active access or an admin role automatically.
-- Only the protected admin approval endpoint activates approved staff.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, full_name, username, role, is_active)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    'staff'::public.user_role,
    false
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Existing accounts that only got admin through editable user metadata are
-- demoted unless their trusted app_metadata or already-protected profile says admin.
DO $$
BEGIN
  UPDATE public.user_profiles AS up
  SET role = 'staff'::public.user_role
  FROM auth.users AS au
  WHERE au.id = up.id
    AND up.role = 'admin'::public.user_role
    AND au.raw_app_meta_data->>'role' IS DISTINCT FROM 'admin';
EXCEPTION WHEN insufficient_privilege THEN
  RAISE NOTICE 'Could not reconcile profile admin roles; verify admins have app_metadata.role=admin using Supabase Dashboard.';
END;
$$;

-- Enable realtime notifications for the admin header badge when available.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime')
     AND NOT EXISTS (
       SELECT 1 FROM pg_publication_tables
       WHERE pubname = 'supabase_realtime'
         AND schemaname = 'public'
         AND tablename = 'staff_signup_requests'
     ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.staff_signup_requests;
  END IF;
END;
$$;
