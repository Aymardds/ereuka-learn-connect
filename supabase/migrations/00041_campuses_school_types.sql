-- Migration: Ajout du champ school_types sur la table campuses
-- Permet à chaque campus de déclarer ses propres niveaux d'enseignement (Maternelle, Primaire, Secondaire, Supérieur)
-- Utile pour les établissements mixtes avec plusieurs sous-établissements

ALTER TABLE public.campuses
  ADD COLUMN IF NOT EXISTS school_types TEXT[] DEFAULT '{}';

COMMENT ON COLUMN public.campuses.school_types IS 
  'Niveaux d''enseignement dispensés dans ce campus. Valeurs possibles: Maternelle, Primaire, Secondaire, Supérieur. Tableau vide = hérite des niveaux du tenant parent.';

-- Index pour optimiser les requêtes de filtrage par niveau
CREATE INDEX IF NOT EXISTS idx_campuses_school_types 
  ON public.campuses USING gin(school_types);
