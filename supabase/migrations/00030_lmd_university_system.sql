-- ============================================================
-- MIGRATION 00030 : Système Universitaire LMD (Licence - Master - Doctorat)
-- ============================================================

-- 1. Unités d'Enseignement (UE) du Système LMD
CREATE TABLE IF NOT EXISTS public.lmd_teaching_units (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    program_id UUID REFERENCES public.programs(id) ON DELETE CASCADE,
    code TEXT NOT NULL, -- e.g. "INF1101", "MGT2104"
    name TEXT NOT NULL, -- e.g. "Algorithmique & Structures de Données"
    ue_type TEXT NOT NULL DEFAULT 'fondamentale' CHECK (ue_type IN ('fondamentale', 'complementaire', 'transversale', 'optionnelle')),
    semester TEXT NOT NULL, -- 'S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7', 'S8', 'S9', 'S10'
    credits NUMERIC(4,1) NOT NULL DEFAULT 6.0, -- Crédits ECTS / CAMES (ex: 6.0, total 30 par semestre)
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Éléments Constitutifs d'UE (EC / ECUE / Matières)
CREATE TABLE IF NOT EXISTS public.lmd_ecue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    ue_id UUID NOT NULL REFERENCES public.lmd_teaching_units(id) ON DELETE CASCADE,
    code TEXT NOT NULL, -- e.g. "INF1101-1"
    name TEXT NOT NULL, -- e.g. "Algorithmique avancée"
    credits NUMERIC(4,1) DEFAULT 3.0,
    coefficient NUMERIC(4,2) DEFAULT 1.0,
    hours_cm INTEGER DEFAULT 20, -- Cours Magistral (heures)
    hours_td INTEGER DEFAULT 15, -- Travaux Dirigés (heures)
    hours_tp INTEGER DEFAULT 10, -- Travaux Pratiques (heures)
    hours_tpe INTEGER DEFAULT 15, -- Travail Personnel Étudiant
    teacher_id UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Évaluations et Notes LMD (Contrôle Continu, Session Normale, Session Rattrapage)
CREATE TABLE IF NOT EXISTS public.lmd_student_grades (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    ecue_id UUID NOT NULL REFERENCES public.lmd_ecue(id) ON DELETE CASCADE,
    academic_year TEXT NOT NULL DEFAULT '2025-2026',
    semester TEXT NOT NULL, -- 'S1', 'S2', 'S3', 'S4', 'S5', 'S6'...
    cc_score NUMERIC(5,2), -- Note Contrôle Continu /20 (généralement 40%)
    exam_score NUMERIC(5,2), -- Note Examen Session Normale /20 (généralement 60%)
    resit_score NUMERIC(5,2), -- Note Examen Session Rattrapage /20
    final_score NUMERIC(5,2), -- Note finale calculée retenue
    is_validated BOOLEAN DEFAULT false,
    recorded_by UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(student_id, ecue_id, semester, academic_year)
);

-- 4. Procès-Verbal de Délibération Semestrielle LMD (Jury de Faculté)
CREATE TABLE IF NOT EXISTS public.lmd_deliberations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    program_id UUID REFERENCES public.programs(id) ON DELETE SET NULL,
    class_id UUID REFERENCES public.classes(id) ON DELETE SET NULL,
    semester TEXT NOT NULL, -- 'S1', 'S2'...
    academic_year TEXT NOT NULL DEFAULT '2025-2026',
    total_credits_enrolled NUMERIC(5,1) DEFAULT 30.0,
    total_credits_validated NUMERIC(5,1) DEFAULT 0.0,
    semester_average NUMERIC(5,2) NOT NULL,
    gpa NUMERIC(4,2), -- GPA sur 4.0
    status TEXT NOT NULL DEFAULT 'en_cours' CHECK (status IN ('admis', 'admis_compensation', 'dettes', 'ajourne', 'en_cours')),
    mention TEXT, -- 'Très Bien', 'Bien', 'Assez Bien', 'Passable', 'Insuffisant'
    jury_president TEXT,
    deliberation_date DATE DEFAULT CURRENT_DATE,
    is_closed BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(student_id, semester, academic_year)
);

-- 5. RLS Policies
ALTER TABLE public.lmd_teaching_units ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lmd_ecue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lmd_student_grades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lmd_deliberations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view tenant lmd_teaching_units" ON public.lmd_teaching_units
    FOR SELECT USING (tenant_id = public.get_user_tenant_id());
CREATE POLICY "Admins manage tenant lmd_teaching_units" ON public.lmd_teaching_units
    FOR ALL USING (tenant_id = public.get_user_tenant_id());

CREATE POLICY "Users view tenant lmd_ecue" ON public.lmd_ecue
    FOR SELECT USING (tenant_id = public.get_user_tenant_id());
CREATE POLICY "Admins manage tenant lmd_ecue" ON public.lmd_ecue
    FOR ALL USING (tenant_id = public.get_user_tenant_id());

CREATE POLICY "Users view tenant lmd_student_grades" ON public.lmd_student_grades
    FOR SELECT USING (tenant_id = public.get_user_tenant_id());
CREATE POLICY "Teachers and admins manage tenant lmd_student_grades" ON public.lmd_student_grades
    FOR ALL USING (tenant_id = public.get_user_tenant_id());

CREATE POLICY "Users view tenant lmd_deliberations" ON public.lmd_deliberations
    FOR SELECT USING (tenant_id = public.get_user_tenant_id());
CREATE POLICY "Admins manage tenant lmd_deliberations" ON public.lmd_deliberations
    FOR ALL USING (tenant_id = public.get_user_tenant_id());

-- 6. Permissions
GRANT ALL ON TABLE public.lmd_teaching_units TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.lmd_ecue TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.lmd_student_grades TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.lmd_deliberations TO anon, authenticated, service_role;

NOTIFY pgrst, 'reload schema';
