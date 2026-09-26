import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { Class } from '../types/database';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export type ClassWithTeacher = Class & {
  user_profiles?: { full_name: string; email: string } | null;
};

export function useClasses() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();
  const tenantId = profile?.tenant_id;

  // READ
  const classesQuery = useQuery({
    queryKey: ['classes', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data, error } = await supabase
        .from('classes')
        .select('*, user_profiles:teacher_id(full_name, email)')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as ClassWithTeacher[];
    },
    enabled: !!tenantId,
  });

  // CREATE
  const createClassMutation = useMutation({
    mutationFn: async (newClass: Omit<Class, 'id' | 'created_at' | 'tenant_id'>) => {
      if (!tenantId) throw new Error("No tenant ID");
      const { data, error } = await supabase
        .from('classes')
        .insert([{ ...newClass, tenant_id: tenantId }])
        .select()
        .single();
        
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['classes', tenantId] });
      toast.success('Classe créée avec succès');
    },
    onError: (error) => {
      toast.error('Erreur lors de la création de la classe');
      console.error(error);
    }
  });

  // UPDATE
  const updateClassMutation = useMutation({
    mutationFn: async ({ id, ...updateData }: Partial<Class> & { id: string }) => {
      const { data, error } = await supabase
        .from('classes')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['classes', tenantId] });
      toast.success('Classe modifiée avec succès');
    },
    onError: (error) => {
      toast.error('Erreur lors de la modification de la classe');
      console.error(error);
    }
  });

  // DELETE
  const deleteClassMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('classes')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['classes', tenantId] });
      toast.success('Classe supprimée avec succès');
    },
    onError: (error) => {
      toast.error('Erreur lors de la suppression de la classe');
      console.error(error);
    }
  });

  return {
    classes: classesQuery.data || [],
    isLoading: classesQuery.isLoading,
    classesQuery,
    createClassMutation,
    updateClassMutation,
    deleteClassMutation,
  };
}
