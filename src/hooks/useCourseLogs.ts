import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { CourseLog } from '@/types/database';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export function useCourseLogs(classId?: string) {
  const queryClient = useQueryClient();
  const { profile } = useAuth();
  const tenantId = profile?.tenant_id;

  const courseLogsQuery = useQuery({
    queryKey: ['course_logs', tenantId, classId],
    queryFn: async () => {
      if (!tenantId) return [];
      let query = supabase
        .from('course_logs')
        .select(`
          *,
          subject:subjects(*),
          teacher:user_profiles(*),
          class:classes(*)
        `)
        .eq('tenant_id', tenantId);

      if (classId && classId !== 'all') {
        query = query.eq('class_id', classId);
      }

      const { data, error } = await query.order('session_date', { ascending: false });
      if (error) throw error;
      return (data || []) as CourseLog[];
    },
    enabled: !!tenantId,
  });

  const createCourseLogMutation = useMutation({
    mutationFn: async (log: Partial<CourseLog>) => {
      if (!tenantId) throw new Error('Tenant ID manquant');
      const { data, error } = await supabase
        .from('course_logs')
        .insert([{ 
          ...log, 
          tenant_id: tenantId, 
          teacher_id: profile?.id 
        }])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['course_logs', tenantId] });
      toast.success('Séance enregistrée dans le cahier de texte');
    },
    onError: (err: any) => {
      toast.error('Erreur: ' + err.message);
    }
  });

  return {
    courseLogs: courseLogsQuery.data || [],
    isLoading: courseLogsQuery.isLoading,
    createCourseLog: createCourseLogMutation.mutateAsync,
  };
}
