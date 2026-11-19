-- Migration 00038 : Ajout de la colonne assigned_roles pour attribution multi-rôles par utilisateur
ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS assigned_roles TEXT[] DEFAULT '{}'::TEXT[];

-- Initialiser les profils existants avec leur rôle primaire
UPDATE public.user_profiles
SET assigned_roles = ARRAY[role::TEXT]
WHERE assigned_roles IS NULL OR cardinality(assigned_roles) = 0;
