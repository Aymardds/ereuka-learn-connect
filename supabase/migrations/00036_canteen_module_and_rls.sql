-- ============================================================
-- MIGRATION 00036 : Module Cantine Scolaire, RLS & Rôles
-- Accès strictement réservé : Admin, Comptable et Parents d'élèves
-- ============================================================

-- 1. Table des Formules de Cantine
CREATE TABLE IF NOT EXISTS public.canteen_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    code TEXT NOT NULL,
    description TEXT,
    price_cfa NUMERIC NOT NULL DEFAULT 0,
    period TEXT NOT NULL DEFAULT 'monthly', -- 'monthly', 'trimester', 'annual', 'ticket'
    meals_per_week INT NOT NULL DEFAULT 5,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour multi-tenant
CREATE INDEX IF NOT EXISTS idx_canteen_plans_tenant ON public.canteen_plans(tenant_id);

-- 2. Table des Abonnements Cantine par Élève
CREATE TABLE IF NOT EXISTS public.canteen_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    plan_id UUID REFERENCES public.canteen_plans(id) ON DELETE SET NULL,
    plan_name TEXT,
    amount_due NUMERIC NOT NULL DEFAULT 0,
    amount_paid NUMERIC NOT NULL DEFAULT 0,
    remaining NUMERIC NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'pending', -- 'paid', 'partial', 'pending'
    dietary_notes TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    registered_at DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_canteen_student_tenant UNIQUE(tenant_id, student_id)
);

-- Index pour accélérer les requêtes
CREATE INDEX IF NOT EXISTS idx_canteen_sub_tenant ON public.canteen_subscriptions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_canteen_sub_student ON public.canteen_subscriptions(student_id);
CREATE INDEX IF NOT EXISTS idx_canteen_sub_status ON public.canteen_subscriptions(status);

-- 3. Table des Menus Hebdomadaires de la Cantine
CREATE TABLE IF NOT EXISTS public.canteen_menus (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    day TEXT NOT NULL, -- 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'
    date_label TEXT,
    starter TEXT,
    main_dish TEXT NOT NULL,
    dessert TEXT,
    snack TEXT,
    week_number INT DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_canteen_menu_day_tenant UNIQUE(tenant_id, day)
);

CREATE INDEX IF NOT EXISTS idx_canteen_menus_tenant ON public.canteen_menus(tenant_id);

-- 4. Table des Pointages de Repas (Présence au réfectoire)
CREATE TABLE IF NOT EXISTS public.canteen_attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    checked_in BOOLEAN NOT NULL DEFAULT true,
    check_in_time TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_canteen_attendance_daily UNIQUE(tenant_id, student_id, date)
);

CREATE INDEX IF NOT EXISTS idx_canteen_att_tenant ON public.canteen_attendance(tenant_id);
CREATE INDEX IF NOT EXISTS idx_canteen_att_student ON public.canteen_attendance(student_id);
CREATE INDEX IF NOT EXISTS idx_canteen_att_date ON public.canteen_attendance(date DESC);

-- ============================================================
-- SÉCURITÉ, ISOLATION PAR ÉTABLISSEMENT & ACCÈS PAR RÔLE (RLS)
-- Les données sont strictement limitées à :
-- - Admin / Directeur (Gestion complète)
-- - Comptable / Caissier (Gestion financière et abonnements)
-- - Parent d'élève (Consultation de leurs enfants uniquement + menus)
-- Enseignants, élèves et autres rôles : AUCUN ACCÈS
-- ============================================================

ALTER TABLE public.canteen_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.canteen_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.canteen_menus ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.canteen_attendance ENABLE ROW LEVEL SECURITY;

-- ── 1. Politiques pour CANTEEN_PLANS ─────────────────────────
DROP POLICY IF EXISTS "canteen_plans_admin_accountant_all" ON public.canteen_plans;
CREATE POLICY "canteen_plans_admin_accountant_all" ON public.canteen_plans
    FOR ALL
    TO authenticated
    USING (
        tenant_id = public.get_user_tenant_id()
        AND (
            public.get_user_role() IN ('admin', 'director', 'superadmin', 'accountant', 'cashier')
        )
    )
    WITH CHECK (
        tenant_id = public.get_user_tenant_id()
        AND (
            public.get_user_role() IN ('admin', 'director', 'superadmin', 'accountant', 'cashier')
        )
    );

DROP POLICY IF EXISTS "canteen_plans_parent_read" ON public.canteen_plans;
CREATE POLICY "canteen_plans_parent_read" ON public.canteen_plans
    FOR SELECT
    TO authenticated
    USING (
        tenant_id = public.get_user_tenant_id()
        AND public.get_user_role() IN ('parent', 'responsible')
    );

-- ── 2. Politiques pour CANTEEN_MENUS ─────────────────────────
DROP POLICY IF EXISTS "canteen_menus_admin_all" ON public.canteen_menus;
CREATE POLICY "canteen_menus_admin_all" ON public.canteen_menus
    FOR ALL
    TO authenticated
    USING (
        tenant_id = public.get_user_tenant_id()
        AND public.get_user_role() IN ('admin', 'director', 'superadmin')
    )
    WITH CHECK (
        tenant_id = public.get_user_tenant_id()
        AND public.get_user_role() IN ('admin', 'director', 'superadmin')
    );

DROP POLICY IF EXISTS "canteen_menus_read_authorized" ON public.canteen_menus;
CREATE POLICY "canteen_menus_read_authorized" ON public.canteen_menus
    FOR SELECT
    TO authenticated
    USING (
        tenant_id = public.get_user_tenant_id()
        AND public.get_user_role() IN ('admin', 'director', 'superadmin', 'accountant', 'cashier', 'parent', 'responsible')
    );

-- ── 3. Politiques pour CANTEEN_SUBSCRIPTIONS ──────────────────
DROP POLICY IF EXISTS "canteen_sub_admin_accountant_all" ON public.canteen_subscriptions;
CREATE POLICY "canteen_sub_admin_accountant_all" ON public.canteen_subscriptions
    FOR ALL
    TO authenticated
    USING (
        tenant_id = public.get_user_tenant_id()
        AND public.get_user_role() IN ('admin', 'director', 'superadmin', 'accountant', 'cashier')
    )
    WITH CHECK (
        tenant_id = public.get_user_tenant_id()
        AND public.get_user_role() IN ('admin', 'director', 'superadmin', 'accountant', 'cashier')
    );

-- Les parents voient STRICTEMENT ET UNIQUEMENT les abonnements de leurs propres enfants
DROP POLICY IF EXISTS "canteen_sub_parent_own_children" ON public.canteen_subscriptions;
CREATE POLICY "canteen_sub_parent_own_children" ON public.canteen_subscriptions
    FOR SELECT
    TO authenticated
    USING (
        tenant_id = public.get_user_tenant_id()
        AND public.get_user_role() IN ('parent', 'responsible')
        AND student_id IN (
            SELECT s.id FROM public.students s
            WHERE s.tenant_id = public.get_user_tenant_id()
            AND (
                s.guardian_email = (auth.jwt() ->> 'email')
                OR s.guardian_phone = (SELECT phone FROM public.user_profiles WHERE id = auth.uid())
                OR s.user_id = auth.uid()
            )
        )
    );

-- ── 4. Politiques pour CANTEEN_ATTENDANCE ─────────────────────
DROP POLICY IF EXISTS "canteen_att_admin_accountant_all" ON public.canteen_attendance;
CREATE POLICY "canteen_att_admin_accountant_all" ON public.canteen_attendance
    FOR ALL
    TO authenticated
    USING (
        tenant_id = public.get_user_tenant_id()
        AND public.get_user_role() IN ('admin', 'director', 'superadmin', 'accountant', 'cashier')
    )
    WITH CHECK (
        tenant_id = public.get_user_tenant_id()
        AND public.get_user_role() IN ('admin', 'director', 'superadmin', 'accountant', 'cashier')
    );

-- Les parents voient STRICTEMENT ET UNIQUEMENT le pointage repas de leurs propres enfants
DROP POLICY IF EXISTS "canteen_att_parent_own_children" ON public.canteen_attendance;
CREATE POLICY "canteen_att_parent_own_children" ON public.canteen_attendance
    FOR SELECT
    TO authenticated
    USING (
        tenant_id = public.get_user_tenant_id()
        AND public.get_user_role() IN ('parent', 'responsible')
        AND student_id IN (
            SELECT s.id FROM public.students s
            WHERE s.tenant_id = public.get_user_tenant_id()
            AND (
                s.guardian_email = (auth.jwt() ->> 'email')
                OR s.guardian_phone = (SELECT phone FROM public.user_profiles WHERE id = auth.uid())
                OR s.user_id = auth.uid()
            )
        )
    );

-- 5. Permissions RBAC
INSERT INTO public.role_permissions (tenant_id, role, module, can_read, can_write, can_validate, can_delete)
SELECT id, 'admin'::public.user_role, 'canteen', true, true, true, true
FROM public.tenants
ON CONFLICT DO NOTHING;

INSERT INTO public.role_permissions (tenant_id, role, module, can_read, can_write, can_validate, can_delete)
SELECT id, 'director'::public.user_role, 'canteen', true, true, true, true
FROM public.tenants
ON CONFLICT DO NOTHING;

INSERT INTO public.role_permissions (tenant_id, role, module, can_read, can_write, can_validate, can_delete)
SELECT id, 'accountant'::public.user_role, 'canteen', true, true, true, false
FROM public.tenants
ON CONFLICT DO NOTHING;

INSERT INTO public.role_permissions (tenant_id, role, module, can_read, can_write, can_validate, can_delete)
SELECT id, 'cashier'::public.user_role, 'canteen', true, true, false, false
FROM public.tenants
ON CONFLICT DO NOTHING;

INSERT INTO public.role_permissions (tenant_id, role, module, can_read, can_write, can_validate, can_delete)
SELECT id, 'parent'::public.user_role, 'canteen', true, false, false, false
FROM public.tenants
ON CONFLICT DO NOTHING;

-- Notifier PostgREST du rechargement du schéma
NOTIFY pgrst, 'reload schema';
