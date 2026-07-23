-- 1. Ajouter school_types sur kyc_applications et tenants
ALTER TABLE public.kyc_applications ADD COLUMN IF NOT EXISTS school_types TEXT[] DEFAULT '{}'::TEXT[];
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS school_types TEXT[] DEFAULT '{}'::TEXT[];

-- 2. Ajouter level_type sur classes
ALTER TABLE public.classes ADD COLUMN IF NOT EXISTS level_type TEXT;

-- 3. Créer la table subjects (Matières)
CREATE TABLE IF NOT EXISTS public.subjects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    code TEXT,
    coefficient INTEGER DEFAULT 1,
    color TEXT,
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Créer la table class_subjects (Liaison Classe ↔ Matière)
CREATE TABLE IF NOT EXISTS public.class_subjects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
    teacher_id UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(class_id, subject_id)
);

-- 5. RLS Policies
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_subjects ENABLE ROW LEVEL SECURITY;

-- Subjects Policy
CREATE POLICY "Users view tenant subjects" ON public.subjects
  FOR SELECT USING (tenant_id = public.get_user_tenant_id());

CREATE POLICY "Admins manage subjects" ON public.subjects
  FOR ALL USING (
    tenant_id = public.get_user_tenant_id() AND
    (public.get_user_role() = 'admin' OR public.get_user_role() = 'accountant' OR public.get_user_role() = 'director')
  );

-- Class Subjects Policy
CREATE POLICY "Users view tenant class_subjects" ON public.class_subjects
  FOR SELECT USING (tenant_id = public.get_user_tenant_id());

CREATE POLICY "Admins manage class_subjects" ON public.class_subjects
  FOR ALL USING (
    tenant_id = public.get_user_tenant_id() AND
    (public.get_user_role() = 'admin' OR public.get_user_role() = 'accountant' OR public.get_user_role() = 'director')
  );
