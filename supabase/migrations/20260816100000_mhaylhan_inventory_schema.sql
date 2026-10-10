-- Migration: Full schema for MhayLhan Inventory System
-- Tables: user_profiles, products, categories, inventory_transactions, system_config

-- ============================================================
-- 1. TYPES
-- ============================================================
DROP TYPE IF EXISTS public.user_role CASCADE;
CREATE TYPE public.user_role AS ENUM ('admin', 'staff');

DROP TYPE IF EXISTS public.product_status CASCADE;
CREATE TYPE public.product_status AS ENUM ('Active', 'Inactive');

DROP TYPE IF EXISTS public.stock_status CASCADE;
CREATE TYPE public.stock_status AS ENUM ('Normal', 'Low Stock', 'Critical', 'Out of Stock');

DROP TYPE IF EXISTS public.expiry_status CASCADE;
CREATE TYPE public.expiry_status AS ENUM ('Valid', 'Expiring Soon', 'Expiring (7d)', 'Expired');

DROP TYPE IF EXISTS public.transaction_type CASCADE;
CREATE TYPE public.transaction_type AS ENUM ('STOCK-IN', 'STOCK-OUT', 'ADJUSTMENT');
  
DROP TYPE IF EXISTS public.category_status CASCADE;
CREATE TYPE public.category_status AS ENUM ('Active', 'Inactive');

-- ============================================================
-- 2. CORE TABLES
-- ============================================================

-- user_profiles (intermediary for auth.users)
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL DEFAULT '',
  username TEXT UNIQUE,
  role public.user_role DEFAULT 'staff'::public.user_role,
  is_active BOOLEAN DEFAULT true,
  last_login TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- categories
CREATE TABLE IF NOT EXISTS public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT DEFAULT '',
  status public.category_status DEFAULT 'Active'::public.category_status,
  sort_order INTEGER DEFAULT 0,
  created_by UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- products
CREATE TABLE IF NOT EXISTS public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  barcode TEXT NOT NULL UNIQUE,
  product_name TEXT NOT NULL,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  unit TEXT NOT NULL DEFAULT 'Pack',
  quantity INTEGER NOT NULL DEFAULT 0,
  minimum_stock INTEGER NOT NULL DEFAULT 0,
  expiration_date TEXT DEFAULT 'N/A',
  date_added TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  status public.product_status DEFAULT 'Active'::public.product_status,
  stock_status public.stock_status DEFAULT 'Normal'::public.stock_status,
  expiry_status public.expiry_status DEFAULT 'Valid'::public.expiry_status,
  created_by UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- inventory_transactions
CREATE TABLE IF NOT EXISTS public.inventory_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_ref TEXT NOT NULL UNIQUE,
  transaction_type public.transaction_type NOT NULL,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  barcode TEXT NOT NULL,
  product_name TEXT NOT NULL,
  category TEXT DEFAULT '',
  unit TEXT DEFAULT '',
  quantity INTEGER NOT NULL,
  previous_qty INTEGER NOT NULL DEFAULT 0,
  new_qty INTEGER NOT NULL DEFAULT 0,
  expiry_date TEXT DEFAULT 'N/A',
  remarks TEXT DEFAULT '',
  performed_by UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  performed_by_name TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- system_config
CREATE TABLE IF NOT EXISTS public.system_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config_key TEXT NOT NULL UNIQUE,
  config_value TEXT NOT NULL,
  description TEXT DEFAULT '',
  updated_by UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- 3. INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON public.user_profiles(email);
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON public.user_profiles(role);
CREATE INDEX IF NOT EXISTS idx_products_barcode ON public.products(barcode);
CREATE INDEX IF NOT EXISTS idx_products_category_id ON public.products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_status ON public.products(status);
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_product_id ON public.inventory_transactions(product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_type ON public.inventory_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_created_at ON public.inventory_transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_categories_status ON public.categories(status);

-- ============================================================
-- 4. FUNCTIONS (must be before RLS policies)
-- ============================================================

-- Auto-create user_profiles on auth signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, full_name, username, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'role', 'staff')::public.user_role
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$;

-- Check if user is admin (using auth metadata to avoid recursion)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
SELECT EXISTS (
  SELECT 1 FROM auth.users au
  WHERE au.id = auth.uid()
  AND au.raw_app_meta_data->>'role' = 'admin'
)
$$;

-- Check if user is active staff or admin
CREATE OR REPLACE FUNCTION public.is_active_user()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
SELECT EXISTS (
  SELECT 1 FROM public.user_profiles up
  WHERE up.id = auth.uid() AND up.is_active = true
)
$$;

-- ============================================================
-- 5. ENABLE RLS
-- ============================================================
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_config ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 6. RLS POLICIES
-- ============================================================

-- user_profiles: users manage own, admins manage all
DROP POLICY IF EXISTS "users_manage_own_profile" ON public.user_profiles;
CREATE POLICY "users_manage_own_profile"
ON public.user_profiles FOR ALL TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS "admins_manage_all_profiles" ON public.user_profiles;
CREATE POLICY "admins_manage_all_profiles"
ON public.user_profiles FOR ALL TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- categories: authenticated users can read, admins can write
DROP POLICY IF EXISTS "authenticated_read_categories" ON public.categories;
CREATE POLICY "authenticated_read_categories"
ON public.categories FOR SELECT TO authenticated
USING (true);

DROP POLICY IF EXISTS "admins_manage_categories" ON public.categories;
CREATE POLICY "admins_manage_categories"
ON public.categories FOR ALL TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- products: authenticated users can read, active users can write
DROP POLICY IF EXISTS "authenticated_read_products" ON public.products;
CREATE POLICY "authenticated_read_products"
ON public.products FOR SELECT TO authenticated
USING (true);

DROP POLICY IF EXISTS "active_users_manage_products" ON public.products;
CREATE POLICY "active_users_manage_products"
ON public.products FOR ALL TO authenticated
USING (public.is_active_user())
WITH CHECK (public.is_active_user());

-- inventory_transactions: authenticated users can read, active users can insert
DROP POLICY IF EXISTS "authenticated_read_transactions" ON public.inventory_transactions;
CREATE POLICY "authenticated_read_transactions"
ON public.inventory_transactions FOR SELECT TO authenticated
USING (true);

DROP POLICY IF EXISTS "active_users_insert_transactions" ON public.inventory_transactions;
CREATE POLICY "active_users_insert_transactions"
ON public.inventory_transactions FOR INSERT TO authenticated
WITH CHECK (public.is_active_user());

DROP POLICY IF EXISTS "admins_manage_transactions" ON public.inventory_transactions;
CREATE POLICY "admins_manage_transactions"
ON public.inventory_transactions FOR ALL TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- system_config: authenticated users can read, admins can write
DROP POLICY IF EXISTS "authenticated_read_config" ON public.system_config;
CREATE POLICY "authenticated_read_config"
ON public.system_config FOR SELECT TO authenticated
USING (true);

DROP POLICY IF EXISTS "admins_manage_config" ON public.system_config;
CREATE POLICY "admins_manage_config"
ON public.system_config FOR ALL TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- ============================================================
-- 7. TRIGGERS
-- ============================================================
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON public.user_profiles;
CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS update_products_updated_at ON public.products;
CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS update_categories_updated_at ON public.categories;
CREATE TRIGGER update_categories_updated_at
  BEFORE UPDATE ON public.categories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ============================================================
-- 8. MOCK DATA
-- ============================================================
DO $$
DECLARE
  admin_uuid UUID := gen_random_uuid();
  staff1_uuid UUID := gen_random_uuid();
  staff2_uuid UUID := gen_random_uuid();
  cat_rice UUID;
  cat_grocery UUID;
  cat_beverages UUID;
  cat_canned UUID;
  cat_plastic UUID;
  cat_styro UUID;
  cat_other UUID;
  prod1_uuid UUID;
  prod2_uuid UUID;
  prod3_uuid UUID;
  prod4_uuid UUID;
  prod5_uuid UUID;
  prod6_uuid UUID;
  prod7_uuid UUID;
  prod8_uuid UUID;
  prod9_uuid UUID;
  prod10_uuid UUID;
BEGIN
  -- Create auth users (trigger creates user_profiles automatically)
  INSERT INTO auth.users (
    id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
    created_at, updated_at, raw_user_meta_data, raw_app_meta_data,
    is_sso_user, is_anonymous, confirmation_token, confirmation_sent_at,
    recovery_token, recovery_sent_at, email_change_token_new, email_change,
    email_change_sent_at, email_change_token_current, email_change_confirm_status,
    reauthentication_token, reauthentication_sent_at, phone, phone_change,
    phone_change_token, phone_change_sent_at
  ) VALUES
    (admin_uuid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'maria.admin@mhaylhan.ph', crypt('MhayAdmin@2026', gen_salt('bf', 10)), now(), now(), now(),
     jsonb_build_object('full_name', 'Maria Santos', 'role', 'admin', 'username', 'maria.admin'),
     jsonb_build_object('provider', 'email', 'providers', ARRAY['email']::TEXT[]),
     false, false, '', null, '', null, '', '', null, '', 0, '', null, null, '', '', null),
    (staff1_uuid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'juan.staff@mhaylhan.ph', crypt('StaffPass@2026', gen_salt('bf', 10)), now(), now(), now(),
     jsonb_build_object('full_name', 'Juan Reyes', 'role', 'staff', 'username', 'juan.staff'),
     jsonb_build_object('provider', 'email', 'providers', ARRAY['email']::TEXT[]),
     false, false, '', null, '', null, '', '', null, '', 0, '', null, null, '', '', null),
    (staff2_uuid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'rosa.staff@mhaylhan.ph', crypt('StaffPass@2026', gen_salt('bf', 10)), now(), now(), now(),
     jsonb_build_object('full_name', 'Rosa Cruz', 'role', 'staff', 'username', 'rosa.staff'),
     jsonb_build_object('provider', 'email', 'providers', ARRAY['email']::TEXT[]),
     false, false, '', null, '', null, '', '', null, '', 0, '', null, null, '', '', null)
  ON CONFLICT (id) DO NOTHING;

  -- Wait for trigger to create user_profiles, then update roles in app_meta_data
  UPDATE auth.users SET raw_app_meta_data = jsonb_build_object('provider', 'email', 'providers', ARRAY['email']::TEXT[], 'role', 'admin')
  WHERE id = admin_uuid;

  -- Seed categories
  INSERT INTO public.categories (id, name, description, status, sort_order)
  VALUES
    (gen_random_uuid(), 'Rice', 'All rice varieties and rice products', 'Active'::public.category_status, 1),
    (gen_random_uuid(), 'Grocery', 'General grocery items and condiments', 'Active'::public.category_status, 2),
    (gen_random_uuid(), 'Beverages', 'Drinks, juices, water, and softdrinks', 'Active'::public.category_status, 3),
    (gen_random_uuid(), 'Canned Goods', 'Canned meats, fish, and vegetables', 'Active'::public.category_status, 4),
    (gen_random_uuid(), 'Plastic Products', 'Plastic bags, containers, and utensils', 'Active'::public.category_status, 5),
    (gen_random_uuid(), 'Styro Materials', 'Styrofoam cups, plates, and containers', 'Active'::public.category_status, 6),
    (gen_random_uuid(), 'Other Merchandise', 'Miscellaneous items and other products', 'Active'::public.category_status, 7)
  ON CONFLICT (name) DO NOTHING;

  -- Get category IDs
  SELECT id INTO cat_rice FROM public.categories WHERE name = 'Rice' LIMIT 1;
  SELECT id INTO cat_grocery FROM public.categories WHERE name = 'Grocery' LIMIT 1;
  SELECT id INTO cat_beverages FROM public.categories WHERE name = 'Beverages' LIMIT 1;
  SELECT id INTO cat_canned FROM public.categories WHERE name = 'Canned Goods' LIMIT 1;
  SELECT id INTO cat_plastic FROM public.categories WHERE name = 'Plastic Products' LIMIT 1;
  SELECT id INTO cat_styro FROM public.categories WHERE name = 'Styro Materials' LIMIT 1;
  SELECT id INTO cat_other FROM public.categories WHERE name = 'Other Merchandise' LIMIT 1;

  -- Seed system config
  INSERT INTO public.system_config (config_key, config_value, description)
  VALUES
    ('store_name', 'Mhay-Lhan Sari-Sari Store', 'Store display name'),
    ('store_address', 'Brgy. San Jose, Batangas City, Philippines', 'Store address'),
    ('store_contact', '+63 912 345 6789', 'Store contact number'),
    ('low_stock_threshold', '10', 'Minimum quantity before low stock alert triggers'),
    ('expiry_warning_days_7', '7', 'Days before expiry for 7-day warning'),
    ('expiry_warning_days_30', '30', 'Days before expiry for 30-day warning'),
    ('timezone', 'Asia/Manila', 'Store timezone for date/time display'),
    ('currency', 'PHP', 'Currency code for the store'),
    ('items_per_page', '25', 'Default number of items per page in lists')
  ON CONFLICT (config_key) DO NOTHING;

  -- Seed products
  prod1_uuid := gen_random_uuid();
  prod2_uuid := gen_random_uuid();
  prod3_uuid := gen_random_uuid();
  prod4_uuid := gen_random_uuid();
  prod5_uuid := gen_random_uuid();
  prod6_uuid := gen_random_uuid();
  prod7_uuid := gen_random_uuid();
  prod8_uuid := gen_random_uuid();
  prod9_uuid := gen_random_uuid();
  prod10_uuid := gen_random_uuid();

  INSERT INTO public.products (id, barcode, product_name, category_id, unit, quantity, minimum_stock, expiration_date, status, stock_status, expiry_status)
  VALUES
    (prod1_uuid, '4800888115657', 'Coca-Cola 1.5L', cat_beverages, 'Bottle', 60, 24, '12/31/2026', 'Active'::public.product_status, 'Normal'::public.stock_status, 'Valid'::public.expiry_status),
    (prod2_uuid, '4800016012351', 'Lucky Me Pancit Canton', cat_grocery, 'Pack', 56, 30, '06/30/2027', 'Active'::public.product_status, 'Normal'::public.stock_status, 'Valid'::public.expiry_status),
    (prod3_uuid, '4800057011126', 'Datu Puti Vinegar 1L', cat_grocery, 'Bottle', 44, 12, '09/15/2027', 'Active'::public.product_status, 'Normal'::public.stock_status, 'Valid'::public.expiry_status),
    (prod4_uuid, '4800888100500', 'Sprite 1L', cat_beverages, 'Bottle', 65, 24, '11/30/2026', 'Active'::public.product_status, 'Normal'::public.stock_status, 'Valid'::public.expiry_status),
    (prod5_uuid, '4800061007897', 'Milo 300g', cat_beverages, 'Pack', 2, 10, '03/31/2027', 'Active'::public.product_status, 'Critical'::public.stock_status, 'Valid'::public.expiry_status),
    (prod6_uuid, '7891000246893', 'Bear Brand Milk 300g', cat_grocery, 'Can', 0, 12, '05/31/2027', 'Active'::public.product_status, 'Out of Stock'::public.stock_status, 'Valid'::public.expiry_status),
    (prod7_uuid, '4800101000021', 'Marca Pina Pork Luncheon', cat_canned, 'Can', 8, 12, '08/10/2026', 'Active'::public.product_status, 'Low Stock'::public.stock_status, 'Expired'::public.expiry_status),
    (prod8_uuid, '4800016000013', 'Plastik Straw 100pcs', cat_plastic, 'Pack', 25, 10, 'N/A', 'Active'::public.product_status, 'Normal'::public.stock_status, 'Valid'::public.expiry_status),
    (prod9_uuid, '4800088100234', 'Styro Cup 8oz 50pcs', cat_styro, 'Pack', 15, 10, 'N/A', 'Active'::public.product_status, 'Normal'::public.stock_status, 'Valid'::public.expiry_status),
    (prod10_uuid, '4800016001010', 'Skyflakes Crackers 400g', cat_grocery, 'Pack', 33, 20, '08/20/2026', 'Active'::public.product_status, 'Normal'::public.stock_status, 'Expiring (7d)'::public.expiry_status)
  ON CONFLICT (barcode) DO NOTHING;

  -- Seed sample transactions
  INSERT INTO public.inventory_transactions (transaction_ref, transaction_type, product_id, barcode, product_name, category, unit, quantity, previous_qty, new_qty, remarks, performed_by_name, created_at)
  VALUES
    ('TXN-2026-0891', 'STOCK-IN'::public.transaction_type, prod1_uuid, '4800888115657', 'Coca-Cola 1.5L', 'Beverages', 'Bottle', 48, 12, 60, 'Weekly restock', 'M. Santos', now() - interval '2 hours'),
    ('TXN-2026-0890', 'STOCK-OUT'::public.transaction_type, prod2_uuid, '4800016012351', 'Lucky Me Pancit Canton', 'Grocery', 'Pack', 24, 80, 56, 'Store replenishment', 'J. Reyes', now() - interval '3 hours'),
    ('TXN-2026-0889', 'STOCK-IN'::public.transaction_type, prod3_uuid, '4800057011126', 'Datu Puti Vinegar 1L', 'Grocery', 'Bottle', 36, 8, 44, 'Supplier delivery', 'M. Santos', now() - interval '4 hours'),
    ('TXN-2026-0888', 'STOCK-OUT'::public.transaction_type, prod10_uuid, '4800016001010', 'Skyflakes Crackers 400g', 'Grocery', 'Pack', 12, 45, 33, '', 'J. Reyes', now() - interval '5 hours'),
    ('TXN-2026-0887', 'STOCK-IN'::public.transaction_type, prod4_uuid, '4800888100500', 'Sprite 1L', 'Beverages', 'Bottle', 60, 5, 65, 'Delivery batch #44', 'M. Santos', now() - interval '1 day'),
    ('TXN-2026-0879', 'ADJUSTMENT'::public.transaction_type, prod7_uuid, '4800101000021', 'Marca Pina Pork Luncheon', 'Canned Goods', 'Can', -3, 11, 8, 'Damaged goods write-off', 'M. Santos', now() - interval '4 days')
  ON CONFLICT (transaction_ref) DO NOTHING;

EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Mock data error: %', SQLERRM;
END $$;
