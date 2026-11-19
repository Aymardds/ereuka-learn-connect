-- Migration 00037 : Contrainte UNIQUE sur grade_entries pour éviter les doublons
-- et permettre un vrai UPSERT (student + sujet + évaluation + période = unique)

-- Supprimer les doublons existants en gardant la version la plus récente
DELETE FROM public.grade_entries
WHERE id NOT IN (
  SELECT DISTINCT ON (tenant_id, student_id, subject_id, evaluation_name, term)
    id
  FROM public.grade_entries
  ORDER BY tenant_id, student_id, subject_id, evaluation_name, term, created_at DESC
);

-- Ajouter la contrainte UNIQUE
ALTER TABLE public.grade_entries
  ADD CONSTRAINT grade_entries_student_subject_eval_term_unique
  UNIQUE (tenant_id, student_id, subject_id, evaluation_name, term);

-- Commentaire
COMMENT ON CONSTRAINT grade_entries_student_subject_eval_term_unique ON public.grade_entries
  IS 'Un élève ne peut avoir qu''une seule note par évaluation (nom) et par matière et par période';
