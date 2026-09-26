import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { AcademicYear, TimetableSlot } from '@/types/database';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export function useTimetable(classId?: string) {
  const queryClient = useQueryClient();
  const { profile } = useAuth();
  const tenantId = profile?.tenant_id;

  const academicYearsQuery = useQuery({
    queryKey: ['academic_years', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data, error } = await supabase
        .from('academic_years')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('start_date', { ascending: false });
      if (error) throw error;
      return (data || []) as AcademicYear[];
    },
    enabled: !!tenantId,
  });

  const slotsQuery = useQuery({
    queryKey: ['timetable_slots', tenantId, classId],
    queryFn: async () => {
      if (!tenantId) return [];
      let query = supabase
        .from('timetable_slots')
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

      const { data, error } = await query.order('day_of_week').order('start_time');
      if (error) throw error;
      return (data || []) as TimetableSlot[];
    },
    enabled: !!tenantId,
  });

  const createSlotMutation = useMutation({
    mutationFn: async (slot: Partial<TimetableSlot>) => {
      if (!tenantId) throw new Error('Tenant ID manquant');
      const { data, error } = await supabase
        .from('timetable_slots')
        .insert([{ ...slot, tenant_id: tenantId }])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timetable_slots', tenantId] });
      toast.success('Créneau ajouté à l\'emploi du temps');
    },
    onError: (err: any) => {
      toast.error('Erreur: ' + err.message);
    }
  });

  const deleteSlotMutation = useMutation({
    mutationFn: async (slotId: string) => {
      const { error } = await supabase
        .from('timetable_slots')
        .delete()
        .eq('id', slotId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timetable_slots', tenantId] });
      toast.success('Créneau supprimé');
    },
    onError: (err: any) => {
      toast.error('Erreur: ' + err.message);
    }
  });

  return {
    slots: slotsQuery.data || [],
    isLoadingSlots: slotsQuery.isLoading,
    academicYears: academicYearsQuery.data || [],
    createSlot: createSlotMutation.mutateAsync,
    deleteSlot: deleteSlotMutation.mutateAsync,
  };
}
