import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Campus, Cycle, Department, Program } from '@/types/database';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export function useCampuses() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();
  const tenantId = profile?.tenant_id;

  const campusesQuery = useQuery({
    queryKey: ['campuses', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data, error } = await supabase
        .from('campuses')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('is_main', { ascending: false });
      if (error) throw error;
      return (data || []) as Campus[];
    },
    enabled: !!tenantId,
  });

  const createCampusMutation = useMutation({
    mutationFn: async (campus: Partial<Campus>) => {
      if (!tenantId) throw new Error('Tenant ID manquant');
      const { data, error } = await supabase
        .from('campuses')
        .insert([{ ...campus, tenant_id: tenantId }])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campuses', tenantId] });
      toast.success('Campus créé avec succès');
    },
    onError: (err: any) => {
      toast.error('Erreur lors de la création du campus: ' + err.message);
    }
  });

  const cyclesQuery = useQuery({
    queryKey: ['cycles', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data, error } = await supabase
        .from('cycles')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('ordering', { ascending: true });
      if (error) throw error;
      return (data || []) as Cycle[];
    },
    enabled: !!tenantId,
  });

  const departmentsQuery = useQuery({
    queryKey: ['departments', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data, error } = await supabase
        .from('departments')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('name');
      if (error) throw error;
      return (data || []) as Department[];
    },
    enabled: !!tenantId,
  });

  const programsQuery = useQuery({
    queryKey: ['programs', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data, error } = await supabase
        .from('programs')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('name');
      if (error) throw error;
      return (data || []) as Program[];
    },
    enabled: !!tenantId,
  });

  return {
    campuses: campusesQuery.data || [],
    isLoadingCampuses: campusesQuery.isLoading,
    createCampus: createCampusMutation.mutateAsync,
    cycles: cyclesQuery.data || [],
    departments: departmentsQuery.data || [],
    programs: programsQuery.data || [],
  };
}
