-- 1. Add fields to tenants table
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS country TEXT;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS logo_url TEXT;

-- 2. Update RLS on tenants to allow admin/director updates
-- The existing policy is: "Users view own tenant" ON tenants FOR SELECT
-- We need to add an UPDATE policy
CREATE POLICY "Admins update own tenant" ON public.tenants
  FOR UPDATE USING (
    id = public.get_user_tenant_id() AND
    (public.get_user_role() = 'admin' OR public.get_user_role() = 'director')
  );

-- 3. Setup Storage for School Assets
INSERT INTO storage.buckets (id, name, public) 
VALUES ('school-assets', 'school-assets', true) 
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: Public can view school assets
CREATE POLICY "Public can view school assets" ON storage.objects
  FOR SELECT USING (bucket_id = 'school-assets');

-- Storage RLS: Admins and Directors can upload school assets
CREATE POLICY "Admins can upload school assets" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'school-assets' AND
    (public.get_user_role() = 'admin' OR public.get_user_role() = 'director')
  );

CREATE POLICY "Admins can update school assets" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'school-assets' AND
    (public.get_user_role() = 'admin' OR public.get_user_role() = 'director')
  );

CREATE POLICY "Admins can delete school assets" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'school-assets' AND
    (public.get_user_role() = 'admin' OR public.get_user_role() = 'director')
  );
