import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { CourseLog } from '@/types/database';
import { useAuth } from './useAuth';
import { toast } from 'sonner';
import { offlineSyncManager } from '@/lib/offline-sync';

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
      const payload = { 
        ...log, 
        tenant_id: tenantId, 
        teacher_id: profile?.id 
      };

      if (!navigator.onLine) {
        await offlineSyncManager.enqueue({
          table: 'course_logs',
          action: 'insert',
          data: [payload],
          description: `Séance cahier de texte (${log.title || 'Nouvelle séance'})`
        });
        toast.success('Mode Hors-ligne : Séance enregistrée localement.');
        return payload as any;
      }

      try {
        const { data, error } = await supabase
          .from('course_logs')
          .insert([payload])
          .select()
          .single();
        if (error) throw error;
        return data;
      } catch (netErr: any) {
        console.warn('Direct upload failed, saving to offline queue:', netErr);
        await offlineSyncManager.enqueue({
          table: 'course_logs',
          action: 'insert',
          data: [payload],
          description: `Séance cahier de texte (${log.title || 'Nouvelle séance'})`
        });
        toast.info('Séance enregistrée localement dans la file de synchronisation.');
        return payload as any;
      }
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
