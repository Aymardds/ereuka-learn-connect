-- Grant permissions to PostgREST roles for the kyc_applications table
GRANT ALL ON TABLE public.kyc_applications TO anon;
GRANT ALL ON TABLE public.kyc_applications TO authenticated;
GRANT ALL ON TABLE public.kyc_applications TO service_role;
