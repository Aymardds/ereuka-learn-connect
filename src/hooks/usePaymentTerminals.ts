import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export interface PaymentTerminal {
  id: string;
  tenant_id: string;
  label: string;
  location: string | null;
  is_active: boolean;
  created_at: string;
}

export interface PaymentTerminalSession {
  id: string;
  tenant_id: string;
  terminal_id: string | null;
  student_id: string;
  schedule_id: string | null;
  amount: number;
  description: string;
  token: string;
  status: 'pending' | 'paid' | 'expired' | 'cancelled';
  payment_method: string | null;
  paid_at: string | null;
  expires_at: string;
  created_at: string;
  // Joined
  students?: { first_name: string; last_name: string; classes?: { name: string } | null } | null;
}

export interface CreateSessionParams {
  studentId: string;
  amount: number;
  description?: string;
  scheduleId?: string;
  terminalId?: string;
}

export function usePaymentTerminals() {
  const { profile } = useAuth();
  const tenantId = profile?.tenant_id;
  const queryClient = useQueryClient();

  // Fetch terminals
  const terminalsQuery = useQuery({
    queryKey: ['payment_terminals', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data, error } = await supabase
        .from('payment_terminals')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('is_active', true)
        .order('created_at');
      if (error) throw error;
      return (data || []) as PaymentTerminal[];
    },
    enabled: !!tenantId,
  });

  // Fetch recent terminal sessions (last 50)
  const sessionsQuery = useQuery({
    queryKey: ['terminal_sessions', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data, error } = await supabase
        .from('payment_terminal_sessions')
        .select('*, students(first_name, last_name, classes(name))')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data || []) as PaymentTerminalSession[];
    },
    enabled: !!tenantId,
  });

  // Create a new terminal session
  const createSessionMutation = useMutation({
    mutationFn: async (params: CreateSessionParams) => {
      const { data, error } = await supabase.rpc('create_terminal_session', {
        p_student_id:  params.studentId,
        p_amount:      params.amount,
        p_description: params.description || 'Frais de scolarité',
        p_schedule_id: params.scheduleId || null,
        p_terminal_id: params.terminalId || null,
      });
      if (error) throw error;
      return data as { session_id: string; token: string; amount: number; expires_at: string };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['terminal_sessions', tenantId] });
    },
    onError: (err: any) => {
      toast.error('Erreur création session : ' + err.message);
    },
  });

  // Cancel a session
  const cancelSessionMutation = useMutation({
    mutationFn: async (sessionId: string) => {
      const { error } = await supabase
        .from('payment_terminal_sessions')
        .update({ status: 'cancelled' })
        .eq('id', sessionId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['terminal_sessions', tenantId] });
      toast.success('Session annulée');
    },
  });

  return {
    terminals: terminalsQuery.data || [],
    sessions: sessionsQuery.data || [],
    isLoading: terminalsQuery.isLoading || sessionsQuery.isLoading,
    createSession: createSessionMutation.mutateAsync,
    isCreating: createSessionMutation.isPending,
    cancelSession: cancelSessionMutation.mutateAsync,
  };
}

/**
 * Charge une session par token (lecture publique, sans auth).
 * Utilisée par la page /pay/:token accessible au parent qui scanne le QR.
 */
export function useTerminalSessionByToken(token: string | undefined) {
  const query = useQuery({
    queryKey: ['terminal_session_public', token],
    queryFn: async () => {
      if (!token) return null;
      const { data, error } = await supabase
        .from('payment_terminal_sessions')
        .select('*, students(first_name, last_name, classes(name))')
        .eq('token', token)
        .single();
      if (error) throw error;
      return data as PaymentTerminalSession | null;
    },
    enabled: !!token,
    refetchInterval: 10000, // actualise toutes les 10s pour détecter expiration
  });

  return {
    session: query.data,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}
