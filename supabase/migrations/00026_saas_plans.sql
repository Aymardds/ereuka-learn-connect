-- ============================================================
-- MIGRATION 00026 : Modèle SaaS Multi-Tenant & Forfaits d'Abonnement
-- ============================================================

-- 1. Table des Plans d'Abonnement
CREATE TABLE IF NOT EXISTS public.subscription_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL UNIQUE, -- 'starter', 'pro', 'enterprise'
    name TEXT NOT NULL,
    description TEXT,
    price_cfa NUMERIC(12,2) NOT NULL,
    max_students INTEGER NOT NULL,
    max_campuses INTEGER NOT NULL DEFAULT 1,
    max_staff INTEGER NOT NULL,
    max_storage_gb INTEGER NOT NULL DEFAULT 5,
    features JSONB NOT NULL DEFAULT '[]'::jsonb,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Seed des plans SaaS de référence
INSERT INTO public.subscription_plans (code, name, description, price_cfa, max_students, max_campuses, max_staff, max_storage_gb, features)
VALUES 
    ('starter', 'EDUCORE Starter', 'Idéal pour petites écoles privées (Maternelle / Primaire)', 45000, 250, 1, 20, 5, '["administration", "eleves", "classes", "presences", "paiements_mobile"]'::jsonb),
    ('pro', 'EDUCORE Pro', 'Pour collèges et lycées en pleine expansion avec besoins pédagogiques', 95000, 1000, 3, 75, 25, '["administration", "eleves", "classes", "presences", "paiements_mobile", "emploi_du_temps", "cahier_texte", "notes_bulletins", "communication"]'::jsonb),
    ('enterprise', 'EDUCORE Enterprise', 'Universités, Grandes Écoles et groupes multi-campus', 195000, 99999, 99, 999, 100, '["administration", "eleves", "classes", "presences", "paiements_mobile", "emploi_du_temps", "cahier_texte", "notes_bulletins", "communication", "rh_personnel", "statistiques_avancees", "multi_campus", "api_acces"]'::jsonb)
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    price_cfa = EXCLUDED.price_cfa,
    max_students = EXCLUDED.max_students,
    max_campuses = EXCLUDED.max_campuses,
    max_staff = EXCLUDED.max_staff,
    features = EXCLUDED.features;

-- 2. Enrichir la table tenants avec les données d'abonnement
ALTER TABLE public.tenants
    ADD COLUMN IF NOT EXISTS subscription_plan_id UUID REFERENCES public.subscription_plans(id),
    ADD COLUMN IF NOT EXISTS plan_code TEXT DEFAULT 'starter',
    ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'active' CHECK (subscription_status IN ('trial', 'active', 'past_due', 'cancelled')),
    ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '30 days'),
    ADD COLUMN IF NOT EXISTS subscription_renews_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '1 year'),
    ADD COLUMN IF NOT EXISTS custom_modules JSONB DEFAULT '{}'::jsonb;

-- RLS
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view subscription plans" ON public.subscription_plans
    FOR SELECT USING (true);

CREATE POLICY "Superadmin manages subscription plans" ON public.subscription_plans
    FOR ALL USING (public.get_user_role()::text = 'superadmin');

GRANT ALL ON TABLE public.subscription_plans TO anon, authenticated, service_role;

NOTIFY pgrst, 'reload schema';
