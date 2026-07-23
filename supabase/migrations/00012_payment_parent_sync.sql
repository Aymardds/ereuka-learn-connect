-- ============================================================
-- MIGRATION 00012 : Synchronisation Paiements Parents
-- • Lien responsible → élève (responsible_id sur students)
-- • Support paiements partiels (amount_paid libre ≤ montant échéance)
-- • Notes / référence sur student_payments
-- • RLS : le parent (responsible) voit uniquement ses enfants
-- • Vue v_student_payment_summary pour l'espace parent
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- ÉTAPE 1 : Ajouter responsible_id sur students
-- ────────────────────────────────────────────────────────────
ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS responsible_id UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL;

-- ────────────────────────────────────────────────────────────
-- ÉTAPE 2 : Enrichir student_payments pour paiements partiels
-- ────────────────────────────────────────────────────────────
ALTER TABLE public.student_payments
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS phone_number TEXT,
  ADD COLUMN IF NOT EXISTS is_validated BOOLEAN DEFAULT TRUE;

-- ────────────────────────────────────────────────────────────
-- ÉTAPE 3 : Indexes performance
-- ────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_students_responsible_id       ON public.students(responsible_id);
CREATE INDEX IF NOT EXISTS idx_student_payments_student_id   ON public.student_payments(student_id);
CREATE INDEX IF NOT EXISTS idx_student_payments_schedule_id  ON public.student_payments(schedule_id);
CREATE INDEX IF NOT EXISTS idx_payment_schedules_tenant_id   ON public.payment_schedules(tenant_id);

-- ────────────────────────────────────────────────────────────
-- ÉTAPE 4 : RLS supplémentaires pour les parents (responsible)
-- ────────────────────────────────────────────────────────────

-- Les parents voient leurs propres enfants
DROP POLICY IF EXISTS "Responsibles view own children" ON public.students;
CREATE POLICY "Responsibles view own children" ON public.students
  FOR SELECT USING (responsible_id = auth.uid());

-- Les parents voient les paiements de leurs enfants
DROP POLICY IF EXISTS "Responsibles view own payments" ON public.student_payments;
CREATE POLICY "Responsibles view own payments" ON public.student_payments
  FOR SELECT USING (
    student_id IN (
      SELECT id FROM public.students WHERE responsible_id = auth.uid()
    )
  );

-- Les parents peuvent insérer des paiements pour leurs enfants
DROP POLICY IF EXISTS "Responsibles insert own payments" ON public.student_payments;
CREATE POLICY "Responsibles insert own payments" ON public.student_payments
  FOR INSERT WITH CHECK (
    tenant_id = public.get_user_tenant_id()
    AND student_id IN (
      SELECT id FROM public.students WHERE responsible_id = auth.uid()
    )
  );

-- Politique UPDATE manquante sur student_payments (pour admin)
DROP POLICY IF EXISTS "Admins update student payments" ON public.student_payments;
CREATE POLICY "Admins update student payments" ON public.student_payments
  FOR UPDATE USING (tenant_id = public.get_user_tenant_id());

-- Les parents voient les échéances de paiement de leur établissement
DROP POLICY IF EXISTS "Responsibles view payment schedules" ON public.payment_schedules;
CREATE POLICY "Responsibles view payment schedules" ON public.payment_schedules
  FOR SELECT USING (tenant_id = public.get_user_tenant_id());

-- ────────────────────────────────────────────────────────────
-- ÉTAPE 5 : Vue récapitulative par élève / échéance
-- DROP d'abord pour éviter l'erreur "cannot drop columns from view"
-- ────────────────────────────────────────────────────────────
DROP VIEW IF EXISTS public.v_student_payment_summary;

CREATE VIEW public.v_student_payment_summary AS
SELECT
  ps.id                                                       AS schedule_id,
  ps.tenant_id,
  ps.title                                                    AS schedule_title,
  ps.amount                                                   AS schedule_amount,
  ps.due_date,
  ps.class_id                                                 AS schedule_class_id,
  s.id                                                        AS student_id,
  s.first_name,
  s.last_name,
  s.responsible_id,
  s.class_id                                                  AS student_class_id,
  COALESCE(SUM(sp.amount_paid), 0)                            AS total_paid,
  ps.amount - COALESCE(SUM(sp.amount_paid), 0)                AS remaining,
  CASE
    WHEN COALESCE(SUM(sp.amount_paid), 0) = 0          THEN 'pending'
    WHEN COALESCE(SUM(sp.amount_paid), 0) < ps.amount  THEN 'partial'
    ELSE 'paid'
  END                                                         AS payment_status,
  MAX(sp.paid_at)                                             AS last_payment_at,
  MAX(sp.receipt_number)                                      AS last_receipt_number
FROM public.payment_schedules ps
JOIN public.students s
  ON s.tenant_id = ps.tenant_id
  AND (ps.class_id IS NULL OR ps.class_id = s.class_id)
LEFT JOIN public.student_payments sp
  ON sp.student_id = s.id AND sp.schedule_id = ps.id
GROUP BY
  ps.id, ps.tenant_id, ps.title, ps.amount, ps.due_date, ps.class_id,
  s.id, s.first_name, s.last_name, s.responsible_id, s.class_id;

-- Accès à la vue pour les rôles PostgREST
GRANT SELECT ON public.v_student_payment_summary TO anon, authenticated, service_role;

-- ────────────────────────────────────────────────────────────
-- ÉTAPE 6 : Forcer le rechargement du schéma PostgREST
-- ────────────────────────────────────────────────────────────
NOTIFY pgrst, 'reload schema';
