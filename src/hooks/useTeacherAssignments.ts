import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export type TeacherClassAssignment = {
  id: string;
  tenant_id: string;
  teacher_id: string;
  class_id: string;
  subject_id: string | null;
  role_in_class: 'titulaire' | 'intervenant' | 'surveillant';
  notes: string | null;
  created_at: string;
};

export type TeacherClassAssignmentWithDetails = TeacherClassAssignment & {
  classes: { id: string; name: string; level_type: string | null } | null;
  subjects: { id: string; name: string; code: string } | null;
  user_profiles: { id: string; full_name: string | null; email: string } | null;
};

/** Hook to manage all teacher-class assignments (admin view) */
export function useTeacherAssignments() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();
  const tenantId = profile?.tenant_id;

  // READ ALL assignments for the tenant
  const assignmentsQuery = useQuery({
    queryKey: ['teacher_class_assignments', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data, error } = await supabase
        .from('teacher_class_assignments')
        .select(
          '*, classes(id, name, level_type), subjects(id, name, code), user_profiles:teacher_id(id, full_name, email)'
        )
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });

      if (error) {
        // Table may not exist yet - return empty
        if (error.code === 'PGRST200' || error.code === 'PGRST205' || error.message?.includes('schema cache')) return [];
        throw error;
      }
      return data as TeacherClassAssignmentWithDetails[];
    },
    enabled: !!tenantId,
  });

  // READ assignments for a specific teacher
  const useTeacherAssignmentsForTeacher = (teacherId?: string) =>
    useQuery({
      queryKey: ['teacher_class_assignments', tenantId, 'teacher', teacherId],
      queryFn: async () => {
        if (!tenantId || !teacherId) return [];
        const { data, error } = await supabase
          .from('teacher_class_assignments')
          .select('*, classes(id, name, level_type), subjects(id, name, code)')
          .eq('tenant_id', tenantId)
          .eq('teacher_id', teacherId)
          .order('created_at', { ascending: false });

        if (error) {
          if (error.code === 'PGRST200' || error.code === 'PGRST205' || error.message?.includes('schema cache')) return [];
          throw error;
        }
        return data as TeacherClassAssignmentWithDetails[];
      },
      enabled: !!tenantId && !!teacherId,
    });

  // READ assignments for a specific class
  const useClassAssignments = (classId?: string) =>
    useQuery({
      queryKey: ['teacher_class_assignments', tenantId, 'class', classId],
      queryFn: async () => {
        if (!tenantId || !classId) return [];
        const { data, error } = await supabase
          .from('teacher_class_assignments')
          .select(
            '*, subjects(id, name, code), user_profiles:teacher_id(id, full_name, email)'
          )
          .eq('tenant_id', tenantId)
          .eq('class_id', classId)
          .order('created_at', { ascending: false });

        if (error) {
          if (error.code === 'PGRST200' || error.code === 'PGRST205' || error.message?.includes('schema cache')) return [];
          throw error;
        }
        return data as TeacherClassAssignmentWithDetails[];
      },
      enabled: !!tenantId && !!classId,
    });

  // CREATE assignment
  const createAssignmentMutation = useMutation({
    mutationFn: async ({
      teacherId,
      classId,
      subjectId,
      roleInClass,
      notes,
    }: {
      teacherId: string;
      classId: string;
      subjectId?: string | null;
      roleInClass?: TeacherClassAssignment['role_in_class'];
      notes?: string | null;
    }) => {
      if (!tenantId) throw new Error('No tenant ID');
      const { data, error } = await supabase
        .from('teacher_class_assignments')
        .insert([
          {
            tenant_id: tenantId,
            teacher_id: teacherId,
            class_id: classId,
            subject_id: subjectId || null,
            role_in_class: roleInClass || 'intervenant',
            notes: notes || null,
          },
        ])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teacher_class_assignments'] });
      toast.success('Enseignant assigné à la classe avec succès');
    },
    onError: (error: any) => {
      if (error.code === '23505') {
        toast.error('Cet enseignant est déjà assigné à cette classe pour cette matière');
      } else {
        toast.error("Erreur lors de l'assignation");
      }
      console.error(error);
    },
  });

  // DELETE assignment
  const deleteAssignmentMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('teacher_class_assignments')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teacher_class_assignments'] });
      toast.success('Assignation retirée');
    },
    onError: (error) => {
      toast.error("Erreur lors de la suppression de l'assignation");
      console.error(error);
    },
  });

  // UPDATE assignment (role/notes)
  const updateAssignmentMutation = useMutation({
    mutationFn: async ({
      id,
      roleInClass,
      notes,
    }: {
      id: string;
      roleInClass?: TeacherClassAssignment['role_in_class'];
      notes?: string | null;
    }) => {
      const { data, error } = await supabase
        .from('teacher_class_assignments')
        .update({ role_in_class: roleInClass, notes })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teacher_class_assignments'] });
      toast.success('Assignation mise à jour');
    },
    onError: (error) => {
      toast.error("Erreur lors de la modification");
      console.error(error);
    },
  });

  return {
    assignmentsQuery,
    useTeacherAssignmentsForTeacher,
    useClassAssignments,
    createAssignmentMutation,
    deleteAssignmentMutation,
    updateAssignmentMutation,
  };
}
