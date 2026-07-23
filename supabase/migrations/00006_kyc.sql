-- 1. Create KYC Application Status ENUM
CREATE TYPE kyc_status AS ENUM ('pending', 'under_review', 'approved', 'rejected');

-- 2. Create KYC Applications Table
CREATE TABLE public.kyc_applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    status kyc_status NOT NULL DEFAULT 'pending',
    
    -- School Information
    school_name TEXT NOT NULL,
    address TEXT NOT NULL,
    city TEXT NOT NULL,
    country TEXT NOT NULL,
    school_phone TEXT NOT NULL,
    
    -- Director Information
    director_name TEXT NOT NULL,
    director_email TEXT NOT NULL,
    director_phone TEXT NOT NULL,
    
    -- Document URLs (Stored in Supabase Storage)
    logo_url TEXT,
    document_registration_url TEXT,
    document_id_url TEXT,
    
    -- Review Details
    rejection_reason TEXT,
    reviewer_id UUID REFERENCES auth.users(id),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    
    -- Link to created tenant (if approved)
    tenant_id UUID REFERENCES public.tenants(id),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Custom function to update timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to update updated_at
CREATE TRIGGER handle_kyc_applications_updated_at 
  BEFORE UPDATE ON public.kyc_applications
  FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();

-- 3. RLS for kyc_applications
ALTER TABLE public.kyc_applications ENABLE ROW LEVEL SECURITY;

-- Anyone can insert a new application (public submission)
CREATE POLICY "Anyone can submit KYC application" ON public.kyc_applications
  FOR INSERT WITH CHECK (true);

-- Superadmins can view all applications
CREATE POLICY "Superadmins can view all KYC applications" ON public.kyc_applications
  FOR SELECT USING (public.get_user_role() = 'superadmin');

-- Superadmins can update all applications
CREATE POLICY "Superadmins can update all KYC applications" ON public.kyc_applications
  FOR UPDATE USING (public.get_user_role() = 'superadmin');

-- 4. Setup Storage for KYC Documents
INSERT INTO storage.buckets (id, name, public) VALUES ('kyc-documents', 'kyc-documents', false) ON CONFLICT (id) DO NOTHING;

-- Storage RLS: Public can upload
CREATE POLICY "Public can upload kyc documents" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'kyc-documents');

-- Storage RLS: Superadmins can view and download
CREATE POLICY "Superadmins can view kyc documents" ON storage.objects
  FOR SELECT USING (bucket_id = 'kyc-documents' AND public.get_user_role() = 'superadmin');
