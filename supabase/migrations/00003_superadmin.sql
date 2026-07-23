-- 1. Add 'superadmin' to the user_role ENUM
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'superadmin';
COMMIT;

-- 2. Update RLS on tenants to allow superadmins to see everything
DROP POLICY IF EXISTS "Users view own tenant" ON tenants;
CREATE POLICY "Users view own tenant or superadmin" ON tenants
  FOR SELECT USING (
    id = public.get_user_tenant_id() OR 
    (SELECT role FROM public.user_profiles WHERE id = auth.uid()) = 'superadmin'
  );

CREATE POLICY "Superadmins can insert tenants" ON tenants
  FOR INSERT WITH CHECK (
    (SELECT role FROM public.user_profiles WHERE id = auth.uid()) = 'superadmin'
  );

-- 3. Update RLS on user_profiles to allow superadmins to see all profiles
DROP POLICY IF EXISTS "Users view tenant profiles" ON user_profiles;
CREATE POLICY "Users view tenant profiles or superadmin" ON user_profiles
  FOR SELECT USING (
    tenant_id = public.get_user_tenant_id() OR 
    (SELECT role FROM public.user_profiles WHERE id = auth.uid()) = 'superadmin'
  );

CREATE POLICY "Superadmins can insert user_profiles" ON user_profiles
  FOR INSERT WITH CHECK (
    (SELECT role FROM public.user_profiles WHERE id = auth.uid()) = 'superadmin'
  );

-- 4. Utility snippet to upgrade your current user to superadmin
-- Replace the email with your test email if you want to run this manually
DO $$
DECLARE
  target_user_id UUID;
BEGIN
  -- We assume you already ran the 00002_seed script, so your profile exists.
  SELECT id INTO target_user_id FROM public.user_profiles LIMIT 1;
  
  IF target_user_id IS NOT NULL THEN
    UPDATE public.user_profiles SET role = 'superadmin' WHERE id = target_user_id;
  END IF;
END $$;
