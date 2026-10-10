-- Only trusted app_metadata may grant administrator privileges. User metadata
-- can be edited by the user and must never be used by RLS as authorization.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM auth.users AS au
    WHERE au.id = (SELECT auth.uid())
      AND au.raw_app_meta_data->>'role' = 'admin'
  );
$$;

-- Ensure profile-backed active users cannot elevate their role by changing
-- user-editable auth metadata. Admins remain authorized through is_admin().
DROP POLICY IF EXISTS "active_users_manage_products" ON public.products;
CREATE POLICY "active_users_manage_products"
ON public.products FOR ALL TO authenticated
USING (public.is_admin() OR public.is_active_user())
WITH CHECK (public.is_admin() OR public.is_active_user());

DROP POLICY IF EXISTS "admins_manage_categories" ON public.categories;
CREATE POLICY "admins_manage_categories"
ON public.categories FOR ALL TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "admins_manage_all_profiles" ON public.user_profiles;
CREATE POLICY "admins_manage_all_profiles"
ON public.user_profiles FOR ALL TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Users may update their own profile fields, but cannot change their own role.
CREATE OR REPLACE FUNCTION public.prevent_self_role_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role
     AND NOT public.is_admin()
     AND auth.uid() = OLD.id THEN
    RAISE EXCEPTION 'Users cannot change their own role';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_self_role_change ON public.user_profiles;
CREATE TRIGGER prevent_self_role_change
BEFORE UPDATE OF role ON public.user_profiles
FOR EACH ROW
EXECUTE FUNCTION public.prevent_self_role_change();

DROP POLICY IF EXISTS "admins_manage_transactions" ON public.inventory_transactions;
CREATE POLICY "admins_manage_transactions"
ON public.inventory_transactions FOR ALL TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "admins_manage_config" ON public.system_config;
CREATE POLICY "admins_manage_config"
ON public.system_config FOR ALL TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());