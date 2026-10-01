-- ============================================================
-- MIGRATION 00022 : Rôles Étoffés, Permissions & Journal d'Audit
-- ============================================================

-- 1. Ajout des nouveaux rôles à l'ENUM user_role
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'dean';
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'department_head';
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'secretary';
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'surveillance';
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'student';
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'parent';

-- 2. Table des Permissions Granulaires (RBAC configurable)
CREATE TABLE IF NOT EXISTS public.role_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    role public.user_role NOT NULL,
    module TEXT NOT NULL, -- 'academics', 'finance', 'attendance', 'students', 'hr', 'communication', 'settings'
    can_read BOOLEAN DEFAULT true,
    can_write BOOLEAN DEFAULT false,
    can_validate BOOLEAN DEFAULT false,
    can_delete BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(tenant_id, role, module)
);

-- 3. Journal d'Audit des Actions Sensibles (Notes, paiements, inscriptions, validations)
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
    action TEXT NOT NULL, -- e.g. 'CREATE_PAYMENT', 'UPDATE_GRADE', 'VALIDATE_STUDENT', 'EXPORT_REPORT'
    entity_name TEXT NOT NULL, -- 'student_payments', 'grades', 'students', etc.
    entity_id UUID,
    details JSONB,
    ip_address TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Délégations Temporaires de Rôle (ex: enseignant remplaçant ou suppléant de direction)
CREATE TABLE IF NOT EXISTS public.role_delegations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    from_user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    to_user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    role public.user_role NOT NULL,
    start_date TIMESTAMP WITH TIME ZONE NOT NULL,
    end_date TIMESTAMP WITH TIME ZONE NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_delegations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view tenant role permissions" ON public.role_permissions
    FOR SELECT USING (tenant_id = public.get_user_tenant_id());
CREATE POLICY "Admins manage role permissions" ON public.role_permissions
    FOR ALL USING (tenant_id = public.get_user_tenant_id());

CREATE POLICY "Admins and Directors view audit logs" ON public.audit_logs
    FOR SELECT USING (
        tenant_id = public.get_user_tenant_id()
        AND (public.get_user_role()::text IN ('admin', 'director', 'superadmin'))
    );
CREATE POLICY "Authenticated users insert audit logs" ON public.audit_logs
    FOR INSERT WITH CHECK (tenant_id = public.get_user_tenant_id());

CREATE POLICY "Users view tenant delegations" ON public.role_delegations
    FOR SELECT USING (tenant_id = public.get_user_tenant_id());
CREATE POLICY "Admins manage delegations" ON public.role_delegations
    FOR ALL USING (tenant_id = public.get_user_tenant_id());

GRANT ALL ON TABLE public.role_permissions TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.audit_logs TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.role_delegations TO anon, authenticated, service_role;

NOTIFY pgrst, 'reload schema';
