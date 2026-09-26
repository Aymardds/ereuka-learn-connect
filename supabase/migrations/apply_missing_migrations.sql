-- ============================================================
-- SCRIPT CONSOLIDÉ : Migrations 00021 → 00027
-- À exécuter dans l'éditeur SQL Supabase :
-- https://supabase.com/dashboard/project/dzgegvueamcmjgxinrnj/sql/new
-- ============================================================

-- ============================================================
-- MIGRATION 00021 : Hiérarchie Organisationnelle Multi-Campus
-- ============================================================
CREATE TABLE IF NOT EXISTS public.campuses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL, code TEXT, city TEXT, address TEXT, phone TEXT, email TEXT,
    is_main BOOLEAN DEFAULT false, created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS public.cycles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL, code TEXT NOT NULL, description TEXT, ordering INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS public.departments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    campus_id UUID REFERENCES public.campuses(id) ON DELETE SET NULL,
    name TEXT NOT NULL, code TEXT,
    head_user_id UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS public.programs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
    cycle_id UUID REFERENCES public.cycles(id) ON DELETE SET NULL,
    name TEXT NOT NULL, code TEXT, duration_years INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE public.classes
    ADD COLUMN IF NOT EXISTS campus_id UUID REFERENCES public.campuses(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS cycle_id UUID REFERENCES public.cycles(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS program_id UUID REFERENCES public.programs(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS level TEXT, ADD COLUMN IF NOT EXISTS room_number TEXT,
    ADD COLUMN IF NOT EXISTS max_capacity INTEGER DEFAULT 45;
ALTER TABLE public.students
    ADD COLUMN IF NOT EXISTS student_code TEXT, ADD COLUMN IF NOT EXISTS date_of_birth DATE,
    ADD COLUMN IF NOT EXISTS gender TEXT CHECK (gender IN ('M', 'F', 'other')),
    ADD COLUMN IF NOT EXISTS place_of_birth TEXT, ADD COLUMN IF NOT EXISTS nationality TEXT DEFAULT 'Ivoirienne',
    ADD COLUMN IF NOT EXISTS address TEXT, ADD COLUMN IF NOT EXISTS photo_url TEXT,
    ADD COLUMN IF NOT EXISTS guardian_name TEXT, ADD COLUMN IF NOT EXISTS guardian_phone TEXT,
    ADD COLUMN IF NOT EXISTS guardian_email TEXT, ADD COLUMN IF NOT EXISTS guardian_relationship TEXT DEFAULT 'Parent',
    ADD COLUMN IF NOT EXISTS blood_group TEXT, ADD COLUMN IF NOT EXISTS medical_notes TEXT;
ALTER TABLE public.user_profiles
    ADD COLUMN IF NOT EXISTS phone TEXT,
    ADD COLUMN IF NOT EXISTS campus_id UUID REFERENCES public.campuses(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS employee_code TEXT, ADD COLUMN IF NOT EXISTS qualification TEXT,
    ADD COLUMN IF NOT EXISTS hire_date DATE, ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

ALTER TABLE public.campuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cycles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.programs ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='campuses' AND policyname='Users view tenant campuses') THEN
    CREATE POLICY "Users view tenant campuses" ON public.campuses FOR SELECT USING (tenant_id = public.get_user_tenant_id()); END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='campuses' AND policyname='Admins manage tenant campuses') THEN
    CREATE POLICY "Admins manage tenant campuses" ON public.campuses FOR ALL USING (tenant_id = public.get_user_tenant_id()); END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='cycles' AND policyname='Users view tenant cycles') THEN
    CREATE POLICY "Users view tenant cycles" ON public.cycles FOR SELECT USING (tenant_id = public.get_user_tenant_id()); END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='cycles' AND policyname='Admins manage tenant cycles') THEN
    CREATE POLICY "Admins manage tenant cycles" ON public.cycles FOR ALL USING (tenant_id = public.get_user_tenant_id()); END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='departments' AND policyname='Users view tenant departments') THEN
    CREATE POLICY "Users view tenant departments" ON public.departments FOR SELECT USING (tenant_id = public.get_user_tenant_id()); END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='departments' AND policyname='Admins manage tenant departments') THEN
    CREATE POLICY "Admins manage tenant departments" ON public.departments FOR ALL USING (tenant_id = public.get_user_tenant_id()); END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='programs' AND policyname='Users view tenant programs') THEN
    CREATE POLICY "Users view tenant programs" ON public.programs FOR SELECT USING (tenant_id = public.get_user_tenant_id()); END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='programs' AND policyname='Admins manage tenant programs') THEN
    CREATE POLICY "Admins manage tenant programs" ON public.programs FOR ALL USING (tenant_id = public.get_user_tenant_id()); END IF;
END $$;
GRANT ALL ON TABLE public.campuses TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.cycles TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.departments TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.programs TO anon, authenticated, service_role;

-- ============================================================
-- MIGRATION 00022 : Rôles Étoffés, Permissions & Audit
-- ============================================================
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'dean';
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'department_head';
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'secretary';
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'surveillance';
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'student';
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'parent';

CREATE TABLE IF NOT EXISTS public.role_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    role public.user_role NOT NULL, module TEXT NOT NULL,
    can_read BOOLEAN DEFAULT true, can_write BOOLEAN DEFAULT false,
    can_validate BOOLEAN DEFAULT false, can_delete BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(tenant_id, role, module)
);
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
    action TEXT NOT NULL, entity_name TEXT NOT NULL, entity_id UUID, details JSONB, ip_address TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS public.role_delegations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    from_user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    to_user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    role public.user_role NOT NULL,
    start_date TIMESTAMP WITH TIME ZONE NOT NULL, end_date TIMESTAMP WITH TIME ZONE NOT NULL,
    is_active BOOLEAN DEFAULT true, created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_delegations ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='role_permissions' AND policyname='Users view tenant role permissions') THEN
    CREATE POLICY "Users view tenant role permissions" ON public.role_permissions FOR SELECT USING (tenant_id = public.get_user_tenant_id()); END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='role_permissions' AND policyname='Admins manage role permissions') THEN
    CREATE POLICY "Admins manage role permissions" ON public.role_permissions FOR ALL USING (tenant_id = public.get_user_tenant_id()); END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='audit_logs' AND policyname='Admins and Directors view audit logs') THEN
    CREATE POLICY "Admins and Directors view audit logs" ON public.audit_logs FOR SELECT USING (tenant_id = public.get_user_tenant_id() AND public.get_user_role()::text IN ('admin','director','superadmin')); END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='audit_logs' AND policyname='Authenticated users insert audit logs') THEN
    CREATE POLICY "Authenticated users insert audit logs" ON public.audit_logs FOR INSERT WITH CHECK (tenant_id = public.get_user_tenant_id()); END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='role_delegations' AND policyname='Users view tenant delegations') THEN
    CREATE POLICY "Users view tenant delegations" ON public.role_delegations FOR SELECT USING (tenant_id = public.get_user_tenant_id()); END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='role_delegations' AND policyname='Admins manage delegations') THEN
    CREATE POLICY "Admins manage delegations" ON public.role_delegations FOR ALL USING (tenant_id = public.get_user_tenant_id()); END IF;
END $$;
GRANT ALL ON TABLE public.role_permissions TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.audit_logs TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.role_delegations TO anon, authenticated, service_role;

-- ============================================================
-- MIGRATION 00023 : Système Pédagogique & Académique Avancé
-- ============================================================
CREATE TABLE IF NOT EXISTS public.academic_years (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL, start_date DATE NOT NULL, end_date DATE NOT NULL,
    is_current BOOLEAN DEFAULT false, created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS public.grading_systems (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL, system_type TEXT NOT NULL CHECK (system_type IN ('out_of_20','gpa_4','ects','percentage')),
    passing_grade NUMERIC(5,2) DEFAULT 10.0, max_grade NUMERIC(5,2) DEFAULT 20.0,
    scale_config JSONB, is_default BOOLEAN DEFAULT false, created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS public.timetable_slots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
    teacher_id UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
    academic_year_id UUID REFERENCES public.academic_years(id) ON DELETE CASCADE,
    day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 1 AND 7),
    start_time TIME NOT NULL, end_time TIME NOT NULL, room_name TEXT,
    recurrence TEXT DEFAULT 'weekly', created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS public.course_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
    teacher_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    session_date DATE NOT NULL DEFAULT CURRENT_DATE, title TEXT NOT NULL, chapter_title TEXT,
    content_summary TEXT NOT NULL, homework_assigned TEXT, homework_due_date DATE,
    documents_url TEXT, is_validated_by_inspection BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS public.grade_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
    evaluation_name TEXT NOT NULL,
    evaluation_type TEXT NOT NULL DEFAULT 'devoir' CHECK (evaluation_type IN ('interro','devoir','tp','partiel','examen')),
    term TEXT NOT NULL DEFAULT 'T1', score NUMERIC(5,2) NOT NULL,
    max_score NUMERIC(5,2) DEFAULT 20.0, coefficient NUMERIC(4,2) DEFAULT 1.0,
    evaluation_date DATE NOT NULL DEFAULT CURRENT_DATE, teacher_comment TEXT,
    recorded_by UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS public.bulletins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
    academic_year_id UUID REFERENCES public.academic_years(id) ON DELETE SET NULL,
    term TEXT NOT NULL, general_average NUMERIC(5,2) NOT NULL,
    class_average NUMERIC(5,2), min_average NUMERIC(5,2), max_average NUMERIC(5,2),
    rank INTEGER, total_students INTEGER, appraisal TEXT, conduct_remarks TEXT,
    is_published BOOLEAN DEFAULT false, published_at TIMESTAMP WITH TIME ZONE,
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.academic_years ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grading_systems ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timetable_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grade_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bulletins ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='academic_years' AND policyname='Users view tenant academic years') THEN
    CREATE POLICY "Users view tenant academic years" ON public.academic_years FOR SELECT USING (tenant_id = public.get_user_tenant_id()); END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='academic_years' AND policyname='Admins manage academic years') THEN
    CREATE POLICY "Admins manage academic years" ON public.academic_years FOR ALL USING (tenant_id = public.get_user_tenant_id()); END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='grading_systems' AND policyname='Users view tenant grading systems') THEN
    CREATE POLICY "Users view tenant grading systems" ON public.grading_systems FOR SELECT USING (tenant_id = public.get_user_tenant_id()); END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='grading_systems' AND policyname='Admins manage grading systems') THEN
    CREATE POLICY "Admins manage grading systems" ON public.grading_systems FOR ALL USING (tenant_id = public.get_user_tenant_id()); END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='timetable_slots' AND policyname='Users view tenant timetable slots') THEN
    CREATE POLICY "Users view tenant timetable slots" ON public.timetable_slots FOR SELECT USING (tenant_id = public.get_user_tenant_id()); END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='timetable_slots' AND policyname='Admins and teachers manage timetable slots') THEN
    CREATE POLICY "Admins and teachers manage timetable slots" ON public.timetable_slots FOR ALL USING (tenant_id = public.get_user_tenant_id()); END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='course_logs' AND policyname='Users view tenant course logs') THEN
    CREATE POLICY "Users view tenant course logs" ON public.course_logs FOR SELECT USING (tenant_id = public.get_user_tenant_id()); END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='course_logs' AND policyname='Teachers and admins manage course logs') THEN
    CREATE POLICY "Teachers and admins manage course logs" ON public.course_logs FOR ALL USING (tenant_id = public.get_user_tenant_id()); END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='grade_entries' AND policyname='Users view tenant grade entries') THEN
    CREATE POLICY "Users view tenant grade entries" ON public.grade_entries FOR SELECT USING (tenant_id = public.get_user_tenant_id()); END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='grade_entries' AND policyname='Teachers and admins manage grade entries') THEN
    CREATE POLICY "Teachers and admins manage grade entries" ON public.grade_entries FOR ALL USING (tenant_id = public.get_user_tenant_id()); END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='bulletins' AND policyname='Users view tenant bulletins') THEN
    CREATE POLICY "Users view tenant bulletins" ON public.bulletins FOR SELECT USING (tenant_id = public.get_user_tenant_id()); END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='bulletins' AND policyname='Admins manage bulletins') THEN
    CREATE POLICY "Admins manage bulletins" ON public.bulletins FOR ALL USING (tenant_id = public.get_user_tenant_id()); END IF;
END $$;
GRANT ALL ON TABLE public.academic_years TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.grading_systems TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.timetable_slots TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.course_logs TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.grade_entries TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.bulletins TO anon, authenticated, service_role;

-- ============================================================
-- MIGRATION 00024 : Module RH & Gestion du Personnel
-- ============================================================
CREATE TABLE IF NOT EXISTS public.staff_contracts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    contract_type TEXT NOT NULL CHECK (contract_type IN ('cdi','cdd','vacataire','stage','prestataire')),
    title TEXT NOT NULL, start_date DATE NOT NULL, end_date DATE,
    base_salary NUMERIC(12,2) DEFAULT 0, hourly_rate NUMERIC(10,2) DEFAULT 0,
    weekly_hours INTEGER DEFAULT 18,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','terminated','suspended','draft')),
    documents_url TEXT, created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS public.leave_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    leave_type TEXT NOT NULL CHECK (leave_type IN ('annual','sick','maternity','special','unpaid')),
    start_date DATE NOT NULL, end_date DATE NOT NULL, days_count INTEGER NOT NULL DEFAULT 1,
    reason TEXT, attachment_url TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
    reviewed_by UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMP WITH TIME ZONE, review_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS public.teaching_hours (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    teacher_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    academic_year_id UUID REFERENCES public.academic_years(id) ON DELETE CASCADE,
    subject_id UUID REFERENCES public.subjects(id) ON DELETE SET NULL,
    class_id UUID REFERENCES public.classes(id) ON DELETE SET NULL,
    month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12), year INTEGER NOT NULL,
    contracted_hours NUMERIC(6,2) DEFAULT 0, performed_hours NUMERIC(6,2) DEFAULT 0,
    overtime_hours NUMERIC(6,2) DEFAULT 0,
    validated_by UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
    is_paid BOOLEAN DEFAULT false, created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE public.staff_contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teaching_hours ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='staff_contracts' AND policyname='Users view own contract or admin views all') THEN
    CREATE POLICY "Users view own contract or admin views all" ON public.staff_contracts FOR SELECT USING (tenant_id=public.get_user_tenant_id() AND (user_id=auth.uid() OR public.get_user_role()::text IN ('admin','director','accountant','superadmin'))); END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='staff_contracts' AND policyname='Admins manage contracts') THEN
    CREATE POLICY "Admins manage contracts" ON public.staff_contracts FOR ALL USING (tenant_id=public.get_user_tenant_id() AND public.get_user_role()::text IN ('admin','director','superadmin')); END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='leave_requests' AND policyname='Users view and create own leaves') THEN
    CREATE POLICY "Users view and create own leaves" ON public.leave_requests FOR SELECT USING (tenant_id=public.get_user_tenant_id() AND (user_id=auth.uid() OR public.get_user_role()::text IN ('admin','director','superadmin'))); END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='leave_requests' AND policyname='Users insert own leaves') THEN
    CREATE POLICY "Users insert own leaves" ON public.leave_requests FOR INSERT WITH CHECK (tenant_id=public.get_user_tenant_id() AND user_id=auth.uid()); END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='leave_requests' AND policyname='Admins update leaves') THEN
    CREATE POLICY "Admins update leaves" ON public.leave_requests FOR UPDATE USING (tenant_id=public.get_user_tenant_id() AND public.get_user_role()::text IN ('admin','director','superadmin')); END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='teaching_hours' AND policyname='Users view teaching hours') THEN
    CREATE POLICY "Users view teaching hours" ON public.teaching_hours FOR SELECT USING (tenant_id=public.get_user_tenant_id() AND (teacher_id=auth.uid() OR public.get_user_role()::text IN ('admin','director','accountant','superadmin'))); END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='teaching_hours' AND policyname='Admins manage teaching hours') THEN
    CREATE POLICY "Admins manage teaching hours" ON public.teaching_hours FOR ALL USING (tenant_id=public.get_user_tenant_id() AND public.get_user_role()::text IN ('admin','director','superadmin')); END IF;
END $$;
GRANT ALL ON TABLE public.staff_contracts TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.leave_requests TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.teaching_hours TO anon, authenticated, service_role;

-- ============================================================
-- MIGRATION 00025 : Communication & Notifications Multi-Canal
-- ============================================================
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    recipient_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    subject TEXT NOT NULL, body TEXT NOT NULL, attachment_url TEXT,
    is_read BOOLEAN DEFAULT false, read_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS public.announcements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    title TEXT NOT NULL, content TEXT NOT NULL,
    category TEXT DEFAULT 'general' CHECK (category IN ('general','academic','event','urgent','administrative')),
    target_role TEXT DEFAULT 'all',
    campus_id UUID REFERENCES public.campuses(id) ON DELETE SET NULL,
    class_id UUID REFERENCES public.classes(id) ON DELETE SET NULL,
    priority TEXT DEFAULT 'normal' CHECK (priority IN ('low','normal','high','urgent')),
    author_id UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
    published_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(), expires_at TIMESTAMP WITH TIME ZONE
);
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL, body TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'system' CHECK (type IN ('payment','grade','attendance','message','announcement','system')),
    link_url TEXT, is_read BOOLEAN DEFAULT false, read_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='messages' AND policyname='Users access own messages') THEN
    CREATE POLICY "Users access own messages" ON public.messages FOR SELECT USING (tenant_id=public.get_user_tenant_id() AND (sender_id=auth.uid() OR recipient_id=auth.uid())); END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='messages' AND policyname='Users can send messages') THEN
    CREATE POLICY "Users can send messages" ON public.messages FOR INSERT WITH CHECK (tenant_id=public.get_user_tenant_id() AND sender_id=auth.uid()); END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='messages' AND policyname='Recipients update read state') THEN
    CREATE POLICY "Recipients update read state" ON public.messages FOR UPDATE USING (tenant_id=public.get_user_tenant_id() AND recipient_id=auth.uid()); END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='announcements' AND policyname='Users view relevant announcements') THEN
    CREATE POLICY "Users view relevant announcements" ON public.announcements FOR SELECT USING (tenant_id=public.get_user_tenant_id()); END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='announcements' AND policyname='Admins manage announcements') THEN
    CREATE POLICY "Admins manage announcements" ON public.announcements FOR ALL USING (tenant_id=public.get_user_tenant_id() AND public.get_user_role()::text IN ('admin','director','superadmin')); END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='notifications' AND policyname='Users view own notifications') THEN
    CREATE POLICY "Users view own notifications" ON public.notifications FOR SELECT USING (tenant_id=public.get_user_tenant_id() AND user_id=auth.uid()); END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='notifications' AND policyname='Users update own notifications') THEN
    CREATE POLICY "Users update own notifications" ON public.notifications FOR UPDATE USING (tenant_id=public.get_user_tenant_id() AND user_id=auth.uid()); END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='notifications' AND policyname='Authenticated users insert notifications') THEN
    CREATE POLICY "Authenticated users insert notifications" ON public.notifications FOR INSERT WITH CHECK (tenant_id=public.get_user_tenant_id()); END IF;
END $$;
GRANT ALL ON TABLE public.messages TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.announcements TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.notifications TO anon, authenticated, service_role;

-- ============================================================
-- MIGRATION 00026 : Modèle SaaS Multi-Tenant & Abonnements
-- ============================================================
CREATE TABLE IF NOT EXISTS public.subscription_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL UNIQUE, name TEXT NOT NULL, description TEXT,
    price_cfa NUMERIC(12,2) NOT NULL, max_students INTEGER NOT NULL,
    max_campuses INTEGER NOT NULL DEFAULT 1, max_staff INTEGER NOT NULL,
    max_storage_gb INTEGER NOT NULL DEFAULT 5, features JSONB NOT NULL DEFAULT '[]'::jsonb,
    is_active BOOLEAN DEFAULT true, created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
INSERT INTO public.subscription_plans (code, name, description, price_cfa, max_students, max_campuses, max_staff, max_storage_gb, features) VALUES
    ('starter', 'Eurêka Starter', 'Idéal pour petites écoles privées', 45000, 250, 1, 20, 5, '["administration","eleves","classes","presences","paiements_mobile"]'::jsonb),
    ('pro', 'Eurêka Pro', 'Pour collèges et lycées en expansion', 95000, 1000, 3, 75, 25, '["administration","eleves","classes","presences","paiements_mobile","emploi_du_temps","cahier_texte","notes_bulletins","communication"]'::jsonb),
    ('enterprise', 'Eurêka Enterprise', 'Universités et groupes multi-campus', 195000, 99999, 99, 999, 100, '["administration","eleves","classes","presences","paiements_mobile","emploi_du_temps","cahier_texte","notes_bulletins","communication","rh_personnel","statistiques_avancees","multi_campus","api_acces"]'::jsonb)
ON CONFLICT (code) DO UPDATE SET name=EXCLUDED.name, price_cfa=EXCLUDED.price_cfa, features=EXCLUDED.features;

ALTER TABLE public.tenants
    ADD COLUMN IF NOT EXISTS subscription_plan_id UUID REFERENCES public.subscription_plans(id),
    ADD COLUMN IF NOT EXISTS plan_code TEXT DEFAULT 'starter',
    ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'active' CHECK (subscription_status IN ('trial','active','past_due','cancelled')),
    ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '30 days'),
    ADD COLUMN IF NOT EXISTS subscription_renews_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '1 year'),
    ADD COLUMN IF NOT EXISTS custom_modules JSONB DEFAULT '{}'::jsonb;

ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='subscription_plans' AND policyname='Anyone can view subscription plans') THEN
    CREATE POLICY "Anyone can view subscription plans" ON public.subscription_plans FOR SELECT USING (true); END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='subscription_plans' AND policyname='Superadmin manages subscription plans') THEN
    CREATE POLICY "Superadmin manages subscription plans" ON public.subscription_plans FOR ALL USING (public.get_user_role()::text='superadmin'); END IF;
END $$;
GRANT ALL ON TABLE public.subscription_plans TO anon, authenticated, service_role;

-- ============================================================
-- MIGRATION 00027 : Passerelle CinetPay & Mobile Money
-- ============================================================
CREATE TABLE IF NOT EXISTS public.payment_gateways (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE UNIQUE,
    provider TEXT NOT NULL DEFAULT 'cinetpay' CHECK (provider IN ('cinetpay','paydunya','direct_wave')),
    site_id TEXT, api_key TEXT, secret_key TEXT, is_live BOOLEAN DEFAULT false,
    currency TEXT DEFAULT 'XOF',
    supported_channels JSONB DEFAULT '["WAVE","ORANGE_MONEY_CI","MTN_CI","MOOV_CI","CARD"]'::jsonb,
    webhook_url TEXT, created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS public.cinetpay_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    schedule_id UUID REFERENCES public.payment_schedules(id) ON DELETE SET NULL,
    cpm_trans_id TEXT NOT NULL UNIQUE, cpm_site_id TEXT,
    amount NUMERIC(12,2) NOT NULL, currency TEXT NOT NULL DEFAULT 'XOF',
    description TEXT NOT NULL, customer_name TEXT, customer_surname TEXT,
    customer_phone_number TEXT, customer_email TEXT, payment_method TEXT, operator_id TEXT,
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','ACCEPTED','REFUSED','CANCELLED','FAILED')),
    payment_token TEXT, payment_url TEXT, webhook_received_at TIMESTAMP WITH TIME ZONE,
    webhook_payload JSONB, receipt_number TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(), updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE public.student_payments
    ADD COLUMN IF NOT EXISTS cinetpay_trans_id TEXT,
    ADD COLUMN IF NOT EXISTS operator_name TEXT,
    ADD COLUMN IF NOT EXISTS phone_number TEXT,
    ADD COLUMN IF NOT EXISTS gateway_provider TEXT DEFAULT 'cinetpay';

ALTER TABLE public.payment_gateways ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cinetpay_transactions ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='payment_gateways' AND policyname='Admins view and manage gateway configs') THEN
    CREATE POLICY "Admins view and manage gateway configs" ON public.payment_gateways FOR ALL USING (tenant_id=public.get_user_tenant_id() AND public.get_user_role()::text IN ('admin','director','superadmin')); END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='cinetpay_transactions' AND policyname='Users view tenant cinetpay transactions') THEN
    CREATE POLICY "Users view tenant cinetpay transactions" ON public.cinetpay_transactions FOR SELECT USING (tenant_id=public.get_user_tenant_id()); END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='cinetpay_transactions' AND policyname='Users insert cinetpay transactions') THEN
    CREATE POLICY "Users insert cinetpay transactions" ON public.cinetpay_transactions FOR INSERT WITH CHECK (tenant_id=public.get_user_tenant_id()); END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='cinetpay_transactions' AND policyname='Admins update cinetpay transactions') THEN
    CREATE POLICY "Admins update cinetpay transactions" ON public.cinetpay_transactions FOR UPDATE USING (tenant_id=public.get_user_tenant_id()); END IF;
END $$;
GRANT ALL ON TABLE public.payment_gateways TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.cinetpay_transactions TO anon, authenticated, service_role;

-- Recharger le cache PostgREST (résout l'erreur "schema cache")
NOTIFY pgrst, 'reload schema';
