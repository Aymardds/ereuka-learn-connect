-- ============================================================
-- SCRIPT DE DIAGNOSTIC ET CONFIGURATION RAPIDE
-- ⚠️  PRÉ-REQUIS : Exécutez d'abord la migration 00012 !
--     (qui ajoute la colonne responsible_id sur students)
-- ============================================================

-- ── DIAGNOSTIC 1 : Voir votre compte et tenant ───────────────
SELECT
  up.id,
  up.email,
  up.full_name,
  up.role,
  t.id   AS tenant_id,
  t.name AS school_name
FROM public.user_profiles up
JOIN public.tenants t ON t.id = up.tenant_id
ORDER BY up.created_at DESC
LIMIT 20;

-- ── DIAGNOSTIC 2 : Voir les élèves (sans responsible_id) ─────
-- Utilisez cette requête si la migration 00012 n'est pas encore appliquée
SELECT
  s.id,
  s.first_name,
  s.last_name,
  c.name AS class_name,
  s.tenant_id
FROM public.students s
LEFT JOIN public.classes c ON c.id = s.class_id
ORDER BY s.last_name;

-- ── DIAGNOSTIC 3 : Voir les élèves AVEC leurs parents ────────
-- ⚠️  Ne fonctionne QU'APRÈS avoir exécuté la migration 00012
SELECT
  s.id,
  s.first_name,
  s.last_name,
  c.name         AS class_name,
  s.responsible_id,
  up.email       AS parent_email,
  up.full_name   AS parent_name
FROM public.students s
LEFT JOIN public.classes c  ON c.id  = s.class_id
LEFT JOIN public.user_profiles up ON up.id = s.responsible_id
ORDER BY s.last_name;

-- ── ACTION : Lier un parent à un élève ───────────────────────
-- Remplacez les valeurs ci-dessous par les vrais IDs/emails

-- UPDATE public.students
-- SET responsible_id = (
--   SELECT id FROM public.user_profiles WHERE email = 'parent@example.com' LIMIT 1
-- )
-- WHERE id = 'UUID-DE-L-ELEVE-ICI';

-- ── ACTION : Lier tous les élèves à un parent (pour test) ────
-- UPDATE public.students
-- SET responsible_id = (
--   SELECT id FROM public.user_profiles WHERE email = 'VOTRE_EMAIL@example.com' LIMIT 1
-- )
-- WHERE tenant_id = (
--   SELECT id FROM public.tenants LIMIT 1
-- );

-- ── VERIFICATION : Voir les paiements enregistrés ────────────
SELECT
  sp.id,
  s.first_name || ' ' || s.last_name AS student_name,
  ps.title         AS schedule_title,
  sp.amount_paid,
  sp.payment_method,
  sp.receipt_number,
  sp.paid_at
FROM public.student_payments sp
JOIN public.students s          ON s.id  = sp.student_id
LEFT JOIN public.payment_schedules ps ON ps.id = sp.schedule_id
ORDER BY sp.paid_at DESC
LIMIT 50;
