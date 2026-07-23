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

  return {
    subjectsQuery,
    createSubjectMutation,
    updateSubjectMutation,
    deleteSubjectMutation
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
