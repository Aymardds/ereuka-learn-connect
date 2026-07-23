-- ============================================================
-- SCRIPT TOUT-EN-UN : Correction CRUD Modalités de Paiement
-- Exécutez ce script ENTIER dans le SQL Editor de Supabase
-- ============================================================

-- ÉTAPE 1 : Créer les tables (IF NOT EXISTS = sans risque)
CREATE TABLE IF NOT EXISTS public.payment_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    class_id UUID REFERENCES public.classes(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    amount NUMERIC(12, 2) NOT NULL,
    due_date DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.student_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    schedule_id UUID REFERENCES public.payment_schedules(id) ON DELETE SET NULL,
    amount_paid NUMERIC(12, 2) NOT NULL,
    payment_method TEXT NOT NULL,
    transaction_reference TEXT NOT NULL,
    receipt_number TEXT NOT NULL UNIQUE,
    parent_email TEXT,
    paid_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ÉTAPE 2 : Activer RLS
ALTER TABLE public.payment_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_payments ENABLE ROW LEVEL SECURITY;

-- ÉTAPE 3 : Supprimer les anciennes policies si elles existent déjà (pour éviter les erreurs de doublons)
DROP POLICY IF EXISTS "Users view tenant payment schedules" ON public.payment_schedules;
DROP POLICY IF EXISTS "Admins insert payment schedules" ON public.payment_schedules;
DROP POLICY IF EXISTS "Admins update payment schedules" ON public.payment_schedules;
DROP POLICY IF EXISTS "Admins delete payment schedules" ON public.payment_schedules;
DROP POLICY IF EXISTS "Users view tenant student payments" ON public.student_payments;
DROP POLICY IF EXISTS "Users insert student payments" ON public.student_payments;

-- ÉTAPE 4 : Recréer toutes les policies proprement
CREATE POLICY "Users view tenant payment schedules" ON public.payment_schedules
  FOR SELECT USING (tenant_id = public.get_user_tenant_id());

CREATE POLICY "Admins insert payment schedules" ON public.payment_schedules
  FOR INSERT WITH CHECK (tenant_id = public.get_user_tenant_id());

CREATE POLICY "Admins update payment schedules" ON public.payment_schedules
  FOR UPDATE USING (tenant_id = public.get_user_tenant_id());

CREATE POLICY "Admins delete payment schedules" ON public.payment_schedules
  FOR DELETE USING (tenant_id = public.get_user_tenant_id());

CREATE POLICY "Users view tenant student payments" ON public.student_payments
  FOR SELECT USING (tenant_id = public.get_user_tenant_id());

CREATE POLICY "Users insert student payments" ON public.student_payments
  FOR INSERT WITH CHECK (tenant_id = public.get_user_tenant_id());

-- ÉTAPE 5 : Accorder les droits d'accès à l'API Supabase
GRANT ALL ON TABLE public.payment_schedules TO anon;
GRANT ALL ON TABLE public.payment_schedules TO authenticated;
GRANT ALL ON TABLE public.payment_schedules TO service_role;

GRANT ALL ON TABLE public.student_payments TO anon;
GRANT ALL ON TABLE public.student_payments TO authenticated;
GRANT ALL ON TABLE public.student_payments TO service_role;

-- ÉTAPE 6 : Forcer le rechargement du schéma (corrige les 404)
NOTIFY pgrst, 'reload schema';
