-- ============================================================
-- MIGRATION 00034 : Module Santé, Rôle Médecin & Dossier Médical
-- PARTIE 1 sur 2 — À exécuter EN PREMIER, seule dans sa propre transaction
-- ============================================================

-- ⚠️ IMPORTANT : PostgreSQL interdit d'utiliser une nouvelle valeur d'enum
-- dans la MÊME transaction que son ajout (erreur 55P04).
-- => Exécutez UNIQUEMENT ce bloc d'abord, puis exécutez la migration 00034b.

-- 1. Ajout des rôles médecin à l'ENUM user_role
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'doctor';
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'medecin';
