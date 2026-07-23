-- ============================================================
-- MIGRATION 00016 : Système de Rôles & Validation Inscriptions
-- ============================================================

-- 1. Ajout des nouveaux rôles à l'ENUM
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'director';
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'accountant';
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'cashier';

-- 2. Ajout du statut de validation sur les élèves
ALTER TABLE public.students 
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending' 
  CHECK (status IN ('pending', 'active', 'inactive'));

-- Marquer les élèves existants comme "active"
UPDATE public.students SET status = 'active' WHERE status = 'pending' AND created_at < NOW() - INTERVAL '1 hour';

-- 3. Ajout de l'enseignant titulaire sur les classes
ALTER TABLE public.classes 
  ADD COLUMN IF NOT EXISTS teacher_id UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL;

-- 4. Ajout des politiques RLS pour permettre aux admins/directeurs de gérer l'équipe
-- Note: On caste get_user_role() en ::text pour éviter l'erreur 55P04 lors de l'utilisation de nouveaux ENUMs dans la même transaction.

DROP POLICY IF EXISTS "Admins can insert tenant profiles" ON public.user_profiles;
CREATE POLICY "Admins can insert tenant profiles" ON public.user_profiles
  FOR INSERT WITH CHECK (
    tenant_id = public.get_user_tenant_id()
    AND (public.get_user_role()::text IN ('admin', 'director', 'superadmin'))
  );

DROP POLICY IF EXISTS "Admins can update tenant profiles" ON public.user_profiles;
CREATE POLICY "Admins can update tenant profiles" ON public.user_profiles
  FOR UPDATE USING (
    tenant_id = public.get_user_tenant_id()
    AND (public.get_user_role()::text IN ('admin', 'director', 'superadmin'))
  );

-- 5. Politique pour le comptable de modifier (valider) les élèves
DROP POLICY IF EXISTS "Accountants and Admins update students" ON public.students;
CREATE POLICY "Accountants and Admins update students" ON public.students
  FOR UPDATE USING (
    tenant_id = public.get_user_tenant_id()
    AND (public.get_user_role()::text IN ('admin', 'director', 'accountant', 'superadmin'))
  );

-- 6. Forcer le rechargement du schéma
NOTIFY pgrst, 'reload schema';
