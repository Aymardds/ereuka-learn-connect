import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { Student } from '../types/database';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export type StudentWithClass = Student & { 
  classes?: { name: string },
  user_profiles?: { email: string, full_name: string } 
};

export function useStudents() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();
  const tenantId = profile?.tenant_id;

  // READ
  const studentsQuery = useQuery({
    queryKey: ['students', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data, error } = await supabase
        .from('students')
        .select('*, classes(name), user_profiles(email, full_name)')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as StudentWithClass[];
    },
    enabled: !!tenantId,
  });

  // CREATE
  const createStudentMutation = useMutation({
    mutationFn: async (newStudent: Omit<Student, 'id' | 'created_at' | 'tenant_id'>) => {
      if (!tenantId) throw new Error("No tenant ID");
      const { data, error } = await supabase
        .from('students')
        .insert([{ ...newStudent, tenant_id: tenantId }])
        .select()
        .single();
        
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students', tenantId] });
      toast.success('Élève inscrit avec succès');
    },
    onError: (error) => {
      toast.error('Erreur lors de l\'inscription de l\'élève');
      console.error(error);
    }
  });

  // VALIDATE STUDENT INSCRIPTION (Accountant/Admin)
  const validateStudentMutation = useMutation({
    mutationFn: async (studentId: string) => {
      const { data, error } = await supabase
        .from('students')
        .update({ status: 'active' })
        .eq('id', studentId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students', tenantId] });
      toast.success("Inscription de l'élève validée avec succès");
    },
    onError: (err: any) => {
      toast.error(err.message || "Erreur lors de la validation");
    }
  });

  // UPDATE
  const updateStudentMutation = useMutation({
    mutationFn: async ({ id, ...updateData }: Partial<Student> & { id: string }) => {
      const { data, error } = await supabase
        .from('students')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students', tenantId] });
      toast.success('Informations modifiées avec succès');
    },
    onError: (error) => {
      toast.error('Erreur lors de la modification des informations');
      console.error(error);
    }
  });

  // DELETE
  const deleteStudentMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('students')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students', tenantId] });
      toast.success('Élève supprimé avec succès');
    },
    onError: (error) => {
      toast.error('Erreur lors de la suppression de l\'élève');
      console.error(error);
    }
  });

  // INVITATIONS
  const invitationsQuery = useQuery({
    queryKey: ['parent_invitations', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data, error } = await supabase
        .from('parent_invitations')
        .select('*')
        .eq('tenant_id', tenantId);
      if (error) throw error;
      return data;
    },
    enabled: !!tenantId,
  });

  const createInvitationMutation = useMutation({
    mutationFn: async ({ studentId, email }: { studentId: string, email: string }) => {
      if (!tenantId) throw new Error("No tenant ID");
      const { data, error } = await supabase
        .from('parent_invitations')
        .insert([{ tenant_id: tenantId, student_id: studentId, email }])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['parent_invitations', tenantId] });
      toast.success('Invitation créée avec succès');
    },
    onError: (error) => {
      toast.error('Erreur lors de la création de l\'invitation');
      console.error(error);
    }
  });

  return {
    studentsQuery,
    createStudent: createStudentMutation.mutateAsync,
    updateStudent: updateStudentMutation.mutateAsync,
    deleteStudent: deleteStudentMutation.mutateAsync,
    validateStudent: validateStudentMutation.mutateAsync,
    invitations: invitationsQuery.data || [],
    createInvitation: createInvitationMutation.mutateAsync,
  };
}
