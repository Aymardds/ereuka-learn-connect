import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { StaffContract, LeaveRequest, TeachingHours, UserProfile } from '@/types/database';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export function useHR() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();
  const tenantId = profile?.tenant_id;

  const staffQuery = useQuery({
    queryKey: ['staff_profiles', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('role');
      if (error) throw error;
      return (data || []) as UserProfile[];
    },
    enabled: !!tenantId,
  });

  const contractsQuery = useQuery({
    queryKey: ['staff_contracts', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data, error } = await supabase
        .from('staff_contracts')
        .select(`
          *,
          user:user_profiles(*)
        `)
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as StaffContract[];
    },
    enabled: !!tenantId,
  });

  const leavesQuery = useQuery({
    queryKey: ['leave_requests', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data, error } = await supabase
        .from('leave_requests')
        .select(`
          *,
          user:user_profiles(*)
        `)
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as LeaveRequest[];
    },
    enabled: !!tenantId,
  });

  const createContractMutation = useMutation({
    mutationFn: async (contract: Partial<StaffContract>) => {
      if (!tenantId) throw new Error('Tenant ID manquant');
      const { data, error } = await supabase
        .from('staff_contracts')
        .insert([{ ...contract, tenant_id: tenantId }])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff_contracts', tenantId] });
      toast.success('Contrat créé avec succès');
    },
    onError: (err: any) => {
      toast.error('Erreur: ' + err.message);
    }
  });

  const updateLeaveStatusMutation = useMutation({
    mutationFn: async ({ leaveId, status, reviewNotes }: { leaveId: string; status: 'approved' | 'rejected'; reviewNotes?: string }) => {
      const { data, error } = await supabase
        .from('leave_requests')
        .update({
          status,
          review_notes: reviewNotes,
          reviewed_by: profile?.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', leaveId)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leave_requests', tenantId] });
      toast.success('Statut du congé mis à jour');
    },
    onError: (err: any) => {
      toast.error('Erreur: ' + err.message);
    }
  });

  return {
    staff: staffQuery.data || [],
    contracts: contractsQuery.data || [],
    leaves: leavesQuery.data || [],
    isLoading: staffQuery.isLoading || contractsQuery.isLoading,
    createContract: createContractMutation.mutateAsync,
    updateLeaveStatus: updateLeaveStatusMutation.mutateAsync,
  };
}
