-- Let admins manage products based on their auth metadata, even if their
-- user_profiles row is missing. Non-admin staff must still be active.
DROP POLICY IF EXISTS "active_users_manage_products" ON public.products;

CREATE POLICY "active_users_manage_products"
ON public.products FOR ALL TO authenticated
USING (public.is_admin() OR public.is_active_user())
WITH CHECK (public.is_admin() OR public.is_active_user());
