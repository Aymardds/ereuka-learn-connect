import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { GradeEntry, Bulletin, GradingSystem } from '@/types/database';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export function useGrades(classId?: string, subjectId?: string) {
  const queryClient = useQueryClient();
  const { profile } = useAuth();
  const tenantId = profile?.tenant_id;

  const gradesQuery = useQuery({
    queryKey: ['grades', tenantId, classId, subjectId],
    queryFn: async () => {
      if (!tenantId) return [];
      let query = supabase
        .from('grade_entries')
        .select(`
          *,
          student:students(*),
          subject:subjects(*)
        `)
        .eq('tenant_id', tenantId);

      if (classId && classId !== 'all') {
        query = query.eq('class_id', classId);
      }
      if (subjectId && subjectId !== 'all') {
        query = query.eq('subject_id', subjectId);
      }

      const { data, error } = await query.order('evaluation_date', { ascending: false });
      if (error) throw error;
      return (data || []) as GradeEntry[];
    },
    enabled: !!tenantId,
  });

  const recordGradeMutation = useMutation({
    mutationFn: async (grade: Partial<GradeEntry>) => {
      if (!tenantId) throw new Error('Tenant ID manquant');
      const { data, error } = await supabase
        .from('grade_entries')
        .insert([{ 
          ...grade, 
          tenant_id: tenantId, 
          recorded_by: profile?.id 
        }])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['grades', tenantId] });
      toast.success('Note enregistrée avec succès');
    },
    onError: (err: any) => {
      toast.error('Erreur: ' + err.message);
    }
  });

  const bulletinsQuery = useQuery({
    queryKey: ['bulletins', tenantId, classId],
    queryFn: async () => {
      if (!tenantId) return [];
      let query = supabase
        .from('bulletins')
        .select(`
          *,
          student:students(*),
          class:classes(*)
        `)
        .eq('tenant_id', tenantId);

      if (classId && classId !== 'all') {
        query = query.eq('class_id', classId);
      }

      const { data, error } = await query.order('rank', { ascending: true });
      if (error) throw error;
      return (data || []) as Bulletin[];
    },
    enabled: !!tenantId,
  });

  const gradingSystemsQuery = useQuery({
    queryKey: ['grading_systems', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data, error } = await supabase
        .from('grading_systems')
        .select('*')
        .eq('tenant_id', tenantId);
      if (error) throw error;
      return (data || []) as GradingSystem[];
    },
    enabled: !!tenantId,
  });

  return {
    grades: gradesQuery.data || [],
    isLoadingGrades: gradesQuery.isLoading,
    recordGrade: recordGradeMutation.mutateAsync,
    bulletins: bulletinsQuery.data || [],
    isLoadingBulletins: bulletinsQuery.isLoading,
    gradingSystems: gradingSystemsQuery.data || [],
  };
}
