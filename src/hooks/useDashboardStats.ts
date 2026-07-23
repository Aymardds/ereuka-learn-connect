import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';

export interface DashboardStats {
  total_students: number;
  total_classes: number;
  payments_total: number;
  payments_today: number;
  unpaid_total: number;
  classes_stats: { name: string; students_count: number }[];
  recent_activities: { type: string; detail: string; time: string }[];
}

export function useDashboardStats() {
  const { profile } = useAuth();
  const tenantId = profile?.tenant_id;

  return useQuery({
    queryKey: ['dashboard_stats', tenantId],
    queryFn: async () => {
      if (!tenantId) return null;
      
      const { data, error } = await supabase.rpc('get_dashboard_stats');
      
      if (error) throw error;
      return data as DashboardStats;
    },
    enabled: !!tenantId,
  });
}
