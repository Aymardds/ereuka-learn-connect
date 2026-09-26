-- ============================================================
-- MIGRATION 00021 : Hiérarchie Organisationnelle Multi-Campus & Cycles
-- ============================================================

-- 1. Table des Campus (multi-sites par établissement)
CREATE TABLE IF NOT EXISTS public.campuses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    code TEXT,
    city TEXT,
    address TEXT,
    phone TEXT,
    email TEXT,
    is_main BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Cycles d'enseignement (Maternelle, Primaire, Collège, Lycée, Supérieur, Formation Pro)
CREATE TABLE IF NOT EXISTS public.cycles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL, -- e.g. "Primaire", "Collège", "Lycée", "Enseignement Supérieur"
    code TEXT NOT NULL, -- "MAT", "PRI", "COL", "LYC", "SUP", "PRO"
    description TEXT,
    ordering INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Départements ou Facultés
CREATE TABLE IF NOT EXISTS public.departments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    campus_id UUID REFERENCES public.campuses(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    code TEXT,
    head_user_id UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Filières et Programmes académiques
CREATE TABLE IF NOT EXISTS public.programs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
    cycle_id UUID REFERENCES public.cycles(id) ON DELETE SET NULL,
    name TEXT NOT NULL, -- e.g. "Sciences Économiques", "Bac Scientifique", "Génie Logiciel"
    code TEXT,
    duration_years INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Enrichir la table classes avec campus, cycle, programme, et capacité
ALTER TABLE public.classes
    ADD COLUMN IF NOT EXISTS campus_id UUID REFERENCES public.campuses(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS cycle_id UUID REFERENCES public.cycles(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS program_id UUID REFERENCES public.programs(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS level TEXT, -- e.g. "6ème", "Terminale", "Licence 1"
    ADD COLUMN IF NOT EXISTS room_number TEXT,
    ADD COLUMN IF NOT EXISTS max_capacity INTEGER DEFAULT 45;

-- 6. Enrichir la table students avec données d'état civil, tuteur et matricule
ALTER TABLE public.students
    ADD COLUMN IF NOT EXISTS student_code TEXT, -- Matricule unique
    ADD COLUMN IF NOT EXISTS date_of_birth DATE,
    ADD COLUMN IF NOT EXISTS gender TEXT CHECK (gender IN ('M', 'F', 'other')),
    ADD COLUMN IF NOT EXISTS place_of_birth TEXT,
    ADD COLUMN IF NOT EXISTS nationality TEXT DEFAULT 'Ivoirienne',
    ADD COLUMN IF NOT EXISTS address TEXT,
    ADD COLUMN IF NOT EXISTS photo_url TEXT,
    ADD COLUMN IF NOT EXISTS guardian_name TEXT,
    ADD COLUMN IF NOT EXISTS guardian_phone TEXT,
    ADD COLUMN IF NOT EXISTS guardian_email TEXT,
    ADD COLUMN IF NOT EXISTS guardian_relationship TEXT DEFAULT 'Parent',
    ADD COLUMN IF NOT EXISTS blood_group TEXT,
    ADD COLUMN IF NOT EXISTS medical_notes TEXT;

-- 7. Enrichir la table user_profiles avec données professionnelles
ALTER TABLE public.user_profiles
    ADD COLUMN IF NOT EXISTS phone TEXT,
    ADD COLUMN IF NOT EXISTS campus_id UUID REFERENCES public.campuses(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS employee_code TEXT,
    ADD COLUMN IF NOT EXISTS qualification TEXT,
    ADD COLUMN IF NOT EXISTS hire_date DATE,
    ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- 8. Politiques RLS
ALTER TABLE public.campuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cycles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.programs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view tenant campuses" ON public.campuses
    FOR SELECT USING (tenant_id = public.get_user_tenant_id());
CREATE POLICY "Admins manage tenant campuses" ON public.campuses
    FOR ALL USING (tenant_id = public.get_user_tenant_id());

CREATE POLICY "Users view tenant cycles" ON public.cycles
    FOR SELECT USING (tenant_id = public.get_user_tenant_id());
CREATE POLICY "Admins manage tenant cycles" ON public.cycles
    FOR ALL USING (tenant_id = public.get_user_tenant_id());

CREATE POLICY "Users view tenant departments" ON public.departments
    FOR SELECT USING (tenant_id = public.get_user_tenant_id());
CREATE POLICY "Admins manage tenant departments" ON public.departments
    FOR ALL USING (tenant_id = public.get_user_tenant_id());

CREATE POLICY "Users view tenant programs" ON public.programs
    FOR SELECT USING (tenant_id = public.get_user_tenant_id());
CREATE POLICY "Admins manage tenant programs" ON public.programs
    FOR ALL USING (tenant_id = public.get_user_tenant_id());

-- Privilèges
GRANT ALL ON TABLE public.campuses TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.cycles TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.departments TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.programs TO anon, authenticated, service_role;

NOTIFY pgrst, 'reload schema';
