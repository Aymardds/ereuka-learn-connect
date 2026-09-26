-- ============================================================
-- MIGRATION 00023 : Système Pédagogique & Académique Avancé
-- ============================================================

-- 1. Années Académiques
CREATE TABLE IF NOT EXISTS public.academic_years (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL, -- e.g. "2025-2026"
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_current BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Système de Notation Paramétrable (sur 20, GPA 4.0, ECTS A-F)
CREATE TABLE IF NOT EXISTS public.grading_systems (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL, -- "Système National Francophone", "Système LMD Universitaire"
    system_type TEXT NOT NULL CHECK (system_type IN ('out_of_20', 'gpa_4', 'ects', 'percentage')),
    passing_grade NUMERIC(5,2) DEFAULT 10.0,
    max_grade NUMERIC(5,2) DEFAULT 20.0,
    scale_config JSONB,
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Emplois du Temps (Créneaux horaires par classe, matière et enseignant)
CREATE TABLE IF NOT EXISTS public.timetable_slots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
    teacher_id UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
    academic_year_id UUID REFERENCES public.academic_years(id) ON DELETE CASCADE,
    day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 1 AND 7), -- 1=Lundi, 6=Samedi
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    room_name TEXT,
    recurrence TEXT DEFAULT 'weekly',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Cahier de Texte / Suivi de Progression Pédagogique
CREATE TABLE IF NOT EXISTS public.course_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
    teacher_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    session_date DATE NOT NULL DEFAULT CURRENT_DATE,
    title TEXT NOT NULL,
    chapter_title TEXT,
    content_summary TEXT NOT NULL,
    homework_assigned TEXT,
    homework_due_date DATE,
    documents_url TEXT,
    is_validated_by_inspection BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Saisie des Évaluations & Notes Granulaires
CREATE TABLE IF NOT EXISTS public.grade_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
    evaluation_name TEXT NOT NULL, -- e.g. "Interrogation 1", "Devoir sur table N°2", "Examen Partiel"
    evaluation_type TEXT NOT NULL DEFAULT 'devoir' CHECK (evaluation_type IN ('interro', 'devoir', 'tp', 'partiel', 'examen')),
    term TEXT NOT NULL DEFAULT 'T1', -- 'T1', 'T2', 'T3', 'S1', 'S2'
    score NUMERIC(5,2) NOT NULL,
    max_score NUMERIC(5,2) DEFAULT 20.0,
    coefficient NUMERIC(4,2) DEFAULT 1.0,
    evaluation_date DATE NOT NULL DEFAULT CURRENT_DATE,
    teacher_comment TEXT,
    recorded_by UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Bulletins Trimestriels / Semestriels & Délibérations
CREATE TABLE IF NOT EXISTS public.bulletins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
    academic_year_id UUID REFERENCES public.academic_years(id) ON DELETE SET NULL,
    term TEXT NOT NULL, -- 'T1', 'T2', 'T3', 'S1', 'S2'
    general_average NUMERIC(5,2) NOT NULL,
    class_average NUMERIC(5,2),
    min_average NUMERIC(5,2),
    max_average NUMERIC(5,2),
    rank INTEGER,
    total_students INTEGER,
    appraisal TEXT, -- Mention du conseil de classe
    conduct_remarks TEXT, -- Assiduité & discipline
    is_published BOOLEAN DEFAULT false,
    published_at TIMESTAMP WITH TIME ZONE,
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS
ALTER TABLE public.academic_years ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grading_systems ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timetable_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grade_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bulletins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view tenant academic years" ON public.academic_years
    FOR SELECT USING (tenant_id = public.get_user_tenant_id());
CREATE POLICY "Admins manage academic years" ON public.academic_years
    FOR ALL USING (tenant_id = public.get_user_tenant_id());

CREATE POLICY "Users view tenant grading systems" ON public.grading_systems
    FOR SELECT USING (tenant_id = public.get_user_tenant_id());
CREATE POLICY "Admins manage grading systems" ON public.grading_systems
    FOR ALL USING (tenant_id = public.get_user_tenant_id());

CREATE POLICY "Users view tenant timetable slots" ON public.timetable_slots
    FOR SELECT USING (tenant_id = public.get_user_tenant_id());
CREATE POLICY "Admins and teachers manage timetable slots" ON public.timetable_slots
    FOR ALL USING (tenant_id = public.get_user_tenant_id());

CREATE POLICY "Users view tenant course logs" ON public.course_logs
    FOR SELECT USING (tenant_id = public.get_user_tenant_id());
CREATE POLICY "Teachers and admins manage course logs" ON public.course_logs
    FOR ALL USING (tenant_id = public.get_user_tenant_id());

CREATE POLICY "Users view tenant grade entries" ON public.grade_entries
    FOR SELECT USING (tenant_id = public.get_user_tenant_id());
CREATE POLICY "Teachers and admins manage grade entries" ON public.grade_entries
    FOR ALL USING (tenant_id = public.get_user_tenant_id());

CREATE POLICY "Users view tenant bulletins" ON public.bulletins
    FOR SELECT USING (tenant_id = public.get_user_tenant_id());
CREATE POLICY "Admins manage bulletins" ON public.bulletins
    FOR ALL USING (tenant_id = public.get_user_tenant_id());

GRANT ALL ON TABLE public.academic_years TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.grading_systems TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.timetable_slots TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.course_logs TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.grade_entries TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.bulletins TO anon, authenticated, service_role;

NOTIFY pgrst, 'reload schema';
