-- Fix infinite recursion in user_profiles RLS

-- 1. Create a SECURITY DEFINER function to safely get the user's role without triggering RLS
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS user_role AS $$
  SELECT role FROM public.user_profiles WHERE id = auth.uid() LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER;

-- 2. Drop the faulty policies
DROP POLICY IF EXISTS "Users view own tenant or superadmin" ON tenants;
DROP POLICY IF EXISTS "Superadmins can insert tenants" ON tenants;
DROP POLICY IF EXISTS "Users view tenant profiles or superadmin" ON user_profiles;
DROP POLICY IF EXISTS "Superadmins can insert user_profiles" ON user_profiles;

-- 3. Recreate policies using the secure function
CREATE POLICY "Users view own tenant or superadmin" ON tenants
  FOR SELECT USING (
    id = public.get_user_tenant_id() OR 
    public.get_user_role() = 'superadmin'
  );

CREATE POLICY "Superadmins can insert tenants" ON tenants
  FOR INSERT WITH CHECK (
    public.get_user_role() = 'superadmin'
  );

CREATE POLICY "Users view tenant profiles or superadmin" ON user_profiles
  FOR SELECT USING (
    tenant_id = public.get_user_tenant_id() OR 
    public.get_user_role() = 'superadmin'
  );

CREATE POLICY "Superadmins can insert user_profiles" ON user_profiles
  FOR INSERT WITH CHECK (
    public.get_user_role() = 'superadmin'
  );
