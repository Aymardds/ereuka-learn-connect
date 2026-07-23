-- ============================================================
-- MIGRATION 00017 : Ajout du champ description sur payment_schedules
-- ============================================================

ALTER TABLE public.payment_schedules 
  ADD COLUMN IF NOT EXISTS description TEXT;

-- Forcer le rechargement du schéma
NOTIFY pgrst, 'reload schema';
