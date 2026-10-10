-- Treat the database-managed user_profiles role as a trusted admin source.
-- A trigger in the previous security migration prevents users from changing
-- their own role, and profile writes are admin-only through RLS.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT
    EXISTS (
      SELECT 1
      FROM auth.users AS au
      WHERE au.id = (SELECT auth.uid())
        AND au.raw_app_meta_data->>'role' = 'admin'
    )
    OR EXISTS (
      SELECT 1
      FROM public.user_profiles AS up
      WHERE up.id = (SELECT auth.uid())
        AND up.role = 'admin'::public.user_role
    );
$$;

-- Admins can manage products even if their active flag is false; staff still
-- need an active profile. is_admin() only trusts app metadata or the protected
-- database profile role.
DROP POLICY IF EXISTS "active_users_manage_products" ON public.products;
CREATE POLICY "active_users_manage_products"
ON public.products FOR ALL TO authenticated
USING (public.is_admin() OR public.is_active_user())
WITH CHECK (public.is_admin() OR public.is_active_user());