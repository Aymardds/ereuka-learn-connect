-- ============================================================
-- MIGRATION 00024 : Module Ressources Humaines & Gestion du Personnel
-- ============================================================

-- 1. Contrats du Personnel (Enseignants, Administration, Surveillants)
CREATE TABLE IF NOT EXISTS public.staff_contracts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    contract_type TEXT NOT NULL CHECK (contract_type IN ('cdi', 'cdd', 'vacataire', 'stage', 'prestataire')),
    title TEXT NOT NULL, -- e.g. "Professeur de Mathématiques Titulaire"
    start_date DATE NOT NULL,
    end_date DATE,
    base_salary NUMERIC(12,2) DEFAULT 0,
    hourly_rate NUMERIC(10,2) DEFAULT 0,
    weekly_hours INTEGER DEFAULT 18,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'terminated', 'suspended', 'draft')),
    documents_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Demandes de Congés & Absences du Personnel
CREATE TABLE IF NOT EXISTS public.leave_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    leave_type TEXT NOT NULL CHECK (leave_type IN ('annual', 'sick', 'maternity', 'special', 'unpaid')),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    days_count INTEGER NOT NULL DEFAULT 1,
    reason TEXT,
    attachment_url TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    reviewed_by UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMP WITH TIME ZONE,
    review_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Suivi des Volumes Horaires & Vacations
CREATE TABLE IF NOT EXISTS public.teaching_hours (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    teacher_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    academic_year_id UUID REFERENCES public.academic_years(id) ON DELETE CASCADE,
    subject_id UUID REFERENCES public.subjects(id) ON DELETE SET NULL,
    class_id UUID REFERENCES public.classes(id) ON DELETE SET NULL,
    month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
    year INTEGER NOT NULL,
    contracted_hours NUMERIC(6,2) DEFAULT 0,
    performed_hours NUMERIC(6,2) DEFAULT 0,
    overtime_hours NUMERIC(6,2) DEFAULT 0,
    validated_by UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
    is_paid BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS
ALTER TABLE public.staff_contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teaching_hours ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own contract or admin views all" ON public.staff_contracts
    FOR SELECT USING (
        tenant_id = public.get_user_tenant_id()
        AND (user_id = auth.uid() OR public.get_user_role()::text IN ('admin', 'director', 'accountant', 'superadmin'))
    );
CREATE POLICY "Admins manage contracts" ON public.staff_contracts
    FOR ALL USING (
        tenant_id = public.get_user_tenant_id()
        AND public.get_user_role()::text IN ('admin', 'director', 'superadmin')
    );

CREATE POLICY "Users view and create own leaves" ON public.leave_requests
    FOR SELECT USING (
        tenant_id = public.get_user_tenant_id()
        AND (user_id = auth.uid() OR public.get_user_role()::text IN ('admin', 'director', 'superadmin'))
    );
CREATE POLICY "Users insert own leaves" ON public.leave_requests
    FOR INSERT WITH CHECK (tenant_id = public.get_user_tenant_id() AND user_id = auth.uid());
CREATE POLICY "Admins update leaves" ON public.leave_requests
    FOR UPDATE USING (
        tenant_id = public.get_user_tenant_id()
        AND public.get_user_role()::text IN ('admin', 'director', 'superadmin')
    );

CREATE POLICY "Users view teaching hours" ON public.teaching_hours
    FOR SELECT USING (
        tenant_id = public.get_user_tenant_id()
        AND (teacher_id = auth.uid() OR public.get_user_role()::text IN ('admin', 'director', 'accountant', 'superadmin'))
    );
CREATE POLICY "Admins manage teaching hours" ON public.teaching_hours
    FOR ALL USING (
        tenant_id = public.get_user_tenant_id()
        AND public.get_user_role()::text IN ('admin', 'director', 'superadmin')
    );

GRANT ALL ON TABLE public.staff_contracts TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.leave_requests TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.teaching_hours TO anon, authenticated, service_role;

NOTIFY pgrst, 'reload schema';
