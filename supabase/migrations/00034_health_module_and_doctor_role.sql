-- ============================================================
-- MIGRATION 00034 : Module Santé, Rôle Médecin & Dossier Médical
-- ============================================================

-- 1. Ajout des rôles médecin à l'ENUM user_role
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'doctor';
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'medecin';

-- 2. Enrichissement des dossiers élèves avec les données de santé
ALTER TABLE public.students
    ADD COLUMN IF NOT EXISTS blood_group TEXT,
    ADD COLUMN IF NOT EXISTS allergies TEXT,
    ADD COLUMN IF NOT EXISTS medical_conditions TEXT,
    ADD COLUMN IF NOT EXISTS doctor_name TEXT,
    ADD COLUMN IF NOT EXISTS doctor_phone TEXT,
    ADD COLUMN IF NOT EXISTS emergency_contact TEXT,
    ADD COLUMN IF NOT EXISTS eps_aptitude TEXT DEFAULT 'Apte',
    ADD COLUMN IF NOT EXISTS vaccines_status TEXT DEFAULT 'À jour',
    ADD COLUMN IF NOT EXISTS medical_notes TEXT;

-- 3. Table des Visites et Consultations Médicales (Infirmerie Scolaire)
CREATE TABLE IF NOT EXISTS public.medical_visits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    doctor_id UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
    doctor_name TEXT,
    visit_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    reason TEXT NOT NULL,
    symptoms TEXT,
    diagnosis TEXT,
    treatment TEXT,
    prescription TEXT,
    eps_dispense BOOLEAN DEFAULT false,
    eps_dispense_days INT DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour accélérer les requêtes multi-tenant et par élève
CREATE INDEX IF NOT EXISTS idx_medical_visits_tenant ON public.medical_visits(tenant_id);
CREATE INDEX IF NOT EXISTS idx_medical_visits_student ON public.medical_visits(student_id);
CREATE INDEX IF NOT EXISTS idx_medical_visits_date ON public.medical_visits(visit_date DESC);

-- 4. Sécurité & Confidentialité stricte par Établissement (RLS)
ALTER TABLE public.medical_visits ENABLE ROW LEVEL SECURITY;

-- Les membres autorisés de l'établissement ne voient QUE les visites de leur établissement
DROP POLICY IF EXISTS "tenant_isolation_medical_visits" ON public.medical_visits;
CREATE POLICY "tenant_isolation_medical_visits" ON public.medical_visits
    FOR ALL
    TO authenticated
    USING (
        tenant_id = public.get_user_tenant_id()
    )
    WITH CHECK (
        tenant_id = public.get_user_tenant_id()
    );

-- 5. Permissions RBAC par défaut pour le module santé
INSERT INTO public.role_permissions (tenant_id, role, module, can_read, can_write, can_validate, can_delete)
SELECT id, 'doctor'::public.user_role, 'health', true, true, true, false
FROM public.tenants
ON CONFLICT DO NOTHING;

INSERT INTO public.role_permissions (tenant_id, role, module, can_read, can_write, can_validate, can_delete)
SELECT id, 'director'::public.user_role, 'health', true, true, true, true
FROM public.tenants
ON CONFLICT DO NOTHING;

INSERT INTO public.role_permissions (tenant_id, role, module, can_read, can_write, can_validate, can_delete)
SELECT id, 'admin'::public.user_role, 'health', true, true, true, true
FROM public.tenants
ON CONFLICT DO NOTHING;

-- Notifier PostgREST du changement de schéma
NOTIFY pgrst, 'reload schema';
