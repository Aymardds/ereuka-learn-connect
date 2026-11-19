-- ============================================================
-- MIGRATION 00040 : Souscriptions Cantine & Transport par les Parents
-- Permet aux parents de souscrire leurs enfants à la cantine
-- et au transport scolaire depuis leur portail, avec synchronisation Supabase & RLS.
-- ============================================================

-- 1. Autoriser les parents à INSÉRER et MODIFIER les souscriptions cantine de leurs enfants
DROP POLICY IF EXISTS "canteen_sub_parent_insert" ON public.canteen_subscriptions;
CREATE POLICY "canteen_sub_parent_insert" ON public.canteen_subscriptions
    FOR INSERT
    TO authenticated
    WITH CHECK (
        tenant_id = public.get_user_tenant_id()
        AND public.get_user_role() IN ('parent', 'responsible')
        AND student_id IN (
            SELECT s.id FROM public.students s
            WHERE s.tenant_id = public.get_user_tenant_id()
            AND (
                s.responsible_id = auth.uid()
                OR (s.guardian_email IS NOT NULL AND s.guardian_email = (auth.jwt() ->> 'email'))
                OR (s.guardian_phone IS NOT NULL AND s.guardian_phone = (SELECT phone FROM public.user_profiles WHERE id = auth.uid()))
            )
        )
    );

DROP POLICY IF EXISTS "canteen_sub_parent_update" ON public.canteen_subscriptions;
CREATE POLICY "canteen_sub_parent_update" ON public.canteen_subscriptions
    FOR UPDATE
    TO authenticated
    USING (
        tenant_id = public.get_user_tenant_id()
        AND public.get_user_role() IN ('parent', 'responsible')
        AND student_id IN (
            SELECT s.id FROM public.students s
            WHERE s.tenant_id = public.get_user_tenant_id()
            AND (
                s.responsible_id = auth.uid()
                OR (s.guardian_email IS NOT NULL AND s.guardian_email = (auth.jwt() ->> 'email'))
                OR (s.guardian_phone IS NOT NULL AND s.guardian_phone = (SELECT phone FROM public.user_profiles WHERE id = auth.uid()))
            )
        )
    )
    WITH CHECK (
        tenant_id = public.get_user_tenant_id()
        AND public.get_user_role() IN ('parent', 'responsible')
        AND student_id IN (
            SELECT s.id FROM public.students s
            WHERE s.tenant_id = public.get_user_tenant_id()
            AND (
                s.responsible_id = auth.uid()
                OR (s.guardian_email IS NOT NULL AND s.guardian_email = (auth.jwt() ->> 'email'))
                OR (s.guardian_phone IS NOT NULL AND s.guardian_phone = (SELECT phone FROM public.user_profiles WHERE id = auth.uid()))
            )
        )
    );

-- 2. Table des Circuits de Transport Scolaire
CREATE TABLE IF NOT EXISTS public.transport_routes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    code TEXT NOT NULL,
    driver_name TEXT,
    driver_phone TEXT,
    vehicle_plate TEXT,
    vehicle_capacity INT DEFAULT 30,
    stops_count INT DEFAULT 0,
    stops JSONB DEFAULT '[]'::jsonb,
    monthly_rate_cfa NUMERIC NOT NULL DEFAULT 25000,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transport_routes_tenant ON public.transport_routes(tenant_id);

-- 3. Table des Abonnements de Transport Scolaire
CREATE TABLE IF NOT EXISTS public.transport_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    route_id UUID REFERENCES public.transport_routes(id) ON DELETE SET NULL,
    route_name TEXT,
    pickup_stop TEXT,
    trip_type TEXT NOT NULL DEFAULT 'round_trip', -- 'round_trip', 'morning_only', 'evening_only'
    amount_due NUMERIC NOT NULL DEFAULT 0,
    amount_paid NUMERIC NOT NULL DEFAULT 0,
    remaining NUMERIC NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'pending', -- 'paid', 'partial', 'pending'
    is_active BOOLEAN NOT NULL DEFAULT true,
    registered_at DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_transport_student_tenant UNIQUE(tenant_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_transport_sub_tenant ON public.transport_subscriptions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_transport_sub_student ON public.transport_subscriptions(student_id);

-- 4. Sécurité RLS pour Transport
ALTER TABLE public.transport_routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transport_subscriptions ENABLE ROW LEVEL SECURITY;

-- Politiques Transport Routes (Admin gère tout, parents peuvent lire les circuits actifs)
DROP POLICY IF EXISTS "transport_routes_admin_all" ON public.transport_routes;
CREATE POLICY "transport_routes_admin_all" ON public.transport_routes
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

DROP POLICY IF EXISTS "transport_routes_read_all_authorized" ON public.transport_routes;
CREATE POLICY "transport_routes_read_all_authorized" ON public.transport_routes
    FOR SELECT
    TO authenticated
    USING (
        tenant_id = public.get_user_tenant_id()
        AND public.get_user_role() IN ('admin', 'director', 'superadmin', 'accountant', 'cashier', 'parent', 'responsible')
    );

-- Politiques Transport Subscriptions
DROP POLICY IF EXISTS "transport_sub_admin_all" ON public.transport_subscriptions;
CREATE POLICY "transport_sub_admin_all" ON public.transport_subscriptions
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
DROP POLICY IF EXISTS "transport_sub_parent_select" ON public.transport_subscriptions;
CREATE POLICY "transport_sub_parent_select" ON public.transport_subscriptions
    FOR SELECT
    TO authenticated
    USING (
        tenant_id = public.get_user_tenant_id()
        AND public.get_user_role() IN ('parent', 'responsible')
        AND student_id IN (
            SELECT s.id FROM public.students s
            WHERE s.tenant_id = public.get_user_tenant_id()
            AND (
                s.responsible_id = auth.uid()
                OR (s.guardian_email IS NOT NULL AND s.guardian_email = (auth.jwt() ->> 'email'))
                OR (s.guardian_phone IS NOT NULL AND s.guardian_phone = (SELECT phone FROM public.user_profiles WHERE id = auth.uid()))
            )
        )
    );

-- Les parents peuvent souscrire leurs propres enfants au transport
DROP POLICY IF EXISTS "transport_sub_parent_insert" ON public.transport_subscriptions;
CREATE POLICY "transport_sub_parent_insert" ON public.transport_subscriptions
    FOR INSERT
    TO authenticated
    WITH CHECK (
        tenant_id = public.get_user_tenant_id()
        AND public.get_user_role() IN ('parent', 'responsible')
        AND student_id IN (
            SELECT s.id FROM public.students s
            WHERE s.tenant_id = public.get_user_tenant_id()
            AND (
                s.responsible_id = auth.uid()
                OR (s.guardian_email IS NOT NULL AND s.guardian_email = (auth.jwt() ->> 'email'))
                OR (s.guardian_phone IS NOT NULL AND s.guardian_phone = (SELECT phone FROM public.user_profiles WHERE id = auth.uid()))
            )
        )
    );

DROP POLICY IF EXISTS "transport_sub_parent_update" ON public.transport_subscriptions;
CREATE POLICY "transport_sub_parent_update" ON public.transport_subscriptions
    FOR UPDATE
    TO authenticated
    USING (
        tenant_id = public.get_user_tenant_id()
        AND public.get_user_role() IN ('parent', 'responsible')
        AND student_id IN (
            SELECT s.id FROM public.students s
            WHERE s.tenant_id = public.get_user_tenant_id()
            AND (
                s.responsible_id = auth.uid()
                OR (s.guardian_email IS NOT NULL AND s.guardian_email = (auth.jwt() ->> 'email'))
                OR (s.guardian_phone IS NOT NULL AND s.guardian_phone = (SELECT phone FROM public.user_profiles WHERE id = auth.uid()))
            )
        )
    )
    WITH CHECK (
        tenant_id = public.get_user_tenant_id()
        AND public.get_user_role() IN ('parent', 'responsible')
        AND student_id IN (
            SELECT s.id FROM public.students s
            WHERE s.tenant_id = public.get_user_tenant_id()
            AND (
                s.responsible_id = auth.uid()
                OR (s.guardian_email IS NOT NULL AND s.guardian_email = (auth.jwt() ->> 'email'))
                OR (s.guardian_phone IS NOT NULL AND s.guardian_phone = (SELECT phone FROM public.user_profiles WHERE id = auth.uid()))
            )
        )
    );
