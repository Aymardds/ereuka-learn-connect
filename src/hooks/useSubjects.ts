import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { Subject, ClassSubject } from '../types/database';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export type ClassSubjectWithDetails = ClassSubject & {
  subjects: { name: string; code: string; coefficient: number; color: string } | null;
  user_profiles: { full_name: string; email: string } | null;
};

export function useSubjects() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();
  const tenantId = profile?.tenant_id;

  // READ Subjects
  const subjectsQuery = useQuery({
    queryKey: ['subjects', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data, error } = await supabase
        .from('subjects')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('name', { ascending: true });

      if (error) throw error;
      return data as Subject[];
    },
    enabled: !!tenantId,
  });

  // CREATE Subject
  const createSubjectMutation = useMutation({
    mutationFn: async (newSubject: Omit<Subject, 'id' | 'created_at' | 'tenant_id'>) => {
      if (!tenantId) throw new Error("No tenant ID");
      const { data, error } = await supabase
        .from('subjects')
        .insert([{ ...newSubject, tenant_id: tenantId }])
        .select()
        .single();
        
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subjects', tenantId] });
      toast.success('Matière créée avec succès');
    },
    onError: (error) => {
      toast.error('Erreur lors de la création de la matière');
      console.error(error);
    }
  });

  // UPDATE Subject
  const updateSubjectMutation = useMutation({
    mutationFn: async ({ id, ...updateData }: Partial<Subject> & { id: string }) => {
      const { data, error } = await supabase
        .from('subjects')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subjects', tenantId] });
      toast.success('Matière modifiée avec succès');
    },
    onError: (error) => {
      toast.error('Erreur lors de la modification de la matière');
      console.error(error);
    }
  });

  // DELETE Subject
  const deleteSubjectMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('subjects')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subjects', tenantId] });
      toast.success('Matière supprimée avec succès');
    },
    onError: (error) => {
      toast.error('Erreur lors de la suppression de la matière');
      console.error(error);
    }
  });

  // SEED DEFAULT SUBJECTS
  const seedDefaultSubjectsMutation = useMutation({
    mutationFn: async (category?: 'maternelle' | 'primaire' | 'secondaire' | 'superieur') => {
      if (!tenantId) throw new Error("No tenant ID");

      const defaultList = category === 'maternelle'
        ? [
            { name: "Mobiliser le langage dans toutes ses dimensions", code: "LANG", coefficient: 1, color: "#3b82f6" },
            { name: "Agir, s'exprimer à travers l'activité physique", code: "MOTR", coefficient: 1, color: "#10b981" },
            { name: "Activités artistiques et créativité", code: "ARTS", coefficient: 1, color: "#f59e0b" },
            { name: "Premiers outils pour structurer sa pensée", code: "LOGI", coefficient: 1, color: "#8b5cf6" },
            { name: "Explorer le monde du vivant et des objets", code: "MOND", coefficient: 1, color: "#06b6d4" },
            { name: "Vivre ensemble et socialisation", code: "SOC", coefficient: 1, color: "#ec4899" },
          ]
        : category === 'primaire'
        ? [
            { name: "Français (Lecture, Écriture, Grammaire)", code: "FR", coefficient: 3, color: "#ef4444" },
            { name: "Mathématiques (Calcul, Géométrie)", code: "MATH", coefficient: 3, color: "#3b82f6" },
            { name: "Sciences d'Éveil & Technologies", code: "EVEIL", coefficient: 2, color: "#10b981" },
            { name: "Histoire & Géographie", code: "HG", coefficient: 1, color: "#f59e0b" },
            { name: "Éducation Physique et Sportive (EPS)", code: "EPS", coefficient: 1, color: "#06b6d4" },
            { name: "Éducation Civique et Morale", code: "CIV", coefficient: 1, color: "#84cc16" },
            { name: "Arts Plastiques & Musique", code: "ARTS", coefficient: 1, color: "#ec4899" },
          ]
        : category === 'superieur'
        ? [
            { name: "UE Fondamentale 1 (Majeure)", code: "UEF1", coefficient: 4, color: "#3b82f6" },
            { name: "UE Fondamentale 2", code: "UEF2", coefficient: 4, color: "#8b5cf6" },
            { name: "UE Méthodologie & Recherche", code: "UEM", coefficient: 2, color: "#10b981" },
            { name: "UE Découverte / Option", code: "UED", coefficient: 2, color: "#f59e0b" },
            { name: "Anglais Professionnel", code: "ANG", coefficient: 2, color: "#06b6d4" },
            { name: "Informatique & Outils Numériques", code: "INFO", coefficient: 2, color: "#ec4899" },
          ]
        : [
            { name: "Mathématiques", code: "MATH", coefficient: 4, color: "#3b82f6" },
            { name: "Français & Littérature", code: "FR", coefficient: 4, color: "#ef4444" },
            { name: "Anglais LV1", code: "ANG", coefficient: 3, color: "#10b981" },
            { name: "Histoire - Géographie", code: "HG", coefficient: 2, color: "#f59e0b" },
            { name: "Physique - Chimie", code: "PC", coefficient: 3, color: "#8b5cf6" },
            { name: "Sciences de la Vie et de la Terre (SVT)", code: "SVT", coefficient: 3, color: "#14b8a6" },
            { name: "Philosophie / Éthique", code: "PHILO", coefficient: 2, color: "#6366f1" },
            { name: "Éducation Physique et Sportive (EPS)", code: "EPS", coefficient: 1, color: "#06b6d4" },
            { name: "Informatique & Numérique", code: "INFO", coefficient: 2, color: "#ec4899" },
            { name: "Éducation aux Droits et à la Citoyenneté (EDHC)", code: "EDHC", coefficient: 1, color: "#84cc16" },
          ];

      const rows = defaultList.map(s => ({
        ...s,
        tenant_id: tenantId,
      }));

      const { data, error } = await supabase
        .from('subjects')
        .insert(rows)
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['subjects', tenantId] });
      toast.success(`${data.length} matières standard initialisées avec succès !`);
    },
    onError: (error: any) => {
      toast.error("Erreur lors de l'initialisation des matières : " + (error.message || ''));
      console.error(error);
    }
  });

  return {
    subjects: subjectsQuery.data || [],
    isLoading: subjectsQuery.isLoading,
    subjectsQuery,
    createSubjectMutation,
    updateSubjectMutation,
    deleteSubjectMutation,
    seedDefaultSubjectsMutation,
  };
}

export function useClassSubjects(classId?: string) {
  const queryClient = useQueryClient();
  const { profile } = useAuth();
  const tenantId = profile?.tenant_id;

  const classSubjectsQuery = useQuery({
    queryKey: ['class_subjects', classId, tenantId],
    queryFn: async () => {
      if (!tenantId || !classId) return [];
      const { data, error } = await supabase
        .from('class_subjects')
        .select('*, subjects(name, code, coefficient, color), user_profiles:teacher_id(full_name, email)')
        .eq('tenant_id', tenantId)
        .eq('class_id', classId);

      if (error) throw error;
      return data as ClassSubjectWithDetails[];
    },
    enabled: !!tenantId && !!classId,
  });

  const assignSubjectMutation = useMutation({
    mutationFn: async ({ subjectId, teacherId }: { subjectId: string, teacherId: string | null }) => {
      if (!tenantId || !classId) throw new Error("Missing info");
      const { data, error } = await supabase
        .from('class_subjects')
        .insert([{ class_id: classId, subject_id: subjectId, teacher_id: teacherId, tenant_id: tenantId }])
        .select()
        .single();
        
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['class_subjects', classId, tenantId] });
      toast.success('Matière assignée avec succès');
    },
    onError: (error: any) => {
      if (error.code === '23505') {
        toast.error('Cette matière est déjà assignée à cette classe');
      } else {
        toast.error('Erreur lors de l\'assignation');
      }
      console.error(error);
    }
  });

  const updateAssignmentMutation = useMutation({
    mutationFn: async ({ id, teacherId }: { id: string, teacherId: string | null }) => {
      const { data, error } = await supabase
        .from('class_subjects')
        .update({ teacher_id: teacherId })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['class_subjects', classId, tenantId] });
      toast.success('Enseignant mis à jour');
    },
    onError: (error) => {
      toast.error('Erreur lors de la modification');
      console.error(error);
    }
  });

  const removeSubjectMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('class_subjects')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['class_subjects', classId, tenantId] });
      toast.success('Assignation supprimée');
    },
    onError: (error) => {
      toast.error('Erreur lors de la suppression');
      console.error(error);
    }
  });

  return {
    classSubjectsQuery,
    assignSubjectMutation,
    updateAssignmentMutation,
    removeSubjectMutation
  };
}
