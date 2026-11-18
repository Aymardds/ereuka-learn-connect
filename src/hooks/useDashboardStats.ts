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
  /** Taux de réussite calculé depuis les vraies notes (null = aucune note saisie encore) */
  success_rate: number | null;
  /** Nombre d'absences aujourd'hui */
  absent_today: number;
}

const DEFAULT_STATS: DashboardStats = {
  total_students: 0,
  total_classes: 0,
  payments_total: 0,
  payments_today: 0,
  unpaid_total: 0,
  classes_stats: [],
  recent_activities: [],
  success_rate: null,
  absent_today: 0,
};

export function useDashboardStats() {
  const { profile, user } = useAuth();
  const tenantId = profile?.tenant_id;

  return useQuery<DashboardStats>({
    queryKey: ['dashboard_stats', tenantId, user?.id],
    queryFn: async (): Promise<DashboardStats> => {
      if (!tenantId) {
        return DEFAULT_STATS;
      }

      // 1. Tenter l'appel RPC Supabase get_dashboard_stats
      try {
        const { data, error } = await supabase.rpc('get_dashboard_stats');
        if (!error && data && typeof data === 'object') {
          return {
            total_students: Number(data.total_students) || 0,
            total_classes: Number(data.total_classes) || 0,
            payments_total: Number(data.payments_total) || 0,
            payments_today: Number(data.payments_today) || 0,
            unpaid_total: Number(data.unpaid_total) || 0,
            classes_stats: Array.isArray(data.classes_stats) ? data.classes_stats : [],
            recent_activities: Array.isArray(data.recent_activities) ? data.recent_activities : [],
            success_rate: data.success_rate !== null && data.success_rate !== undefined ? Number(data.success_rate) : null,
            absent_today: Number(data.absent_today) || 0,
          };
        }
        if (error) {
          console.warn('RPC get_dashboard_stats non disponible ou erreur, bascule vers requêtes directes:', error.message);
        }
      } catch (err) {
        console.warn('Exception lors de get_dashboard_stats RPC, bascule vers requêtes directes:', err);
      }

      // 2. Repli direct et robuste sur les tables de l'établissement
      try {
        const [
          studentsRes,
          classesRes,
          paymentsRes,
          gradesRes,
          attendancesRes,
        ] = await Promise.all([
          supabase.from('students').select('id, class_id').eq('tenant_id', tenantId),
          supabase.from('classes').select('id, name').eq('tenant_id', tenantId),
          supabase.from('student_payments').select('amount_paid, paid_at').eq('tenant_id', tenantId),
          supabase.from('grade_entries').select('score, max_score').eq('tenant_id', tenantId),
          supabase.from('attendances')
            .select('id')
            .eq('tenant_id', tenantId)
            .eq('date', new Date().toISOString().split('T')[0])
            .eq('status', 'absent'),
        ]);

        const students = studentsRes.data || [];
        const classes = classesRes.data || [];
        const payments = paymentsRes.data || [];
        const grades = gradesRes.data || [];
        const absentCount = attendancesRes.data?.length || 0;

        const totalPayments = payments.reduce((acc, p) => acc + (Number(p.amount_paid) || 0), 0);
        const todayStr = new Date().toISOString().split('T')[0];
        const paymentsToday = payments
          .filter(p => p.paid_at && p.paid_at.startsWith(todayStr))
          .reduce((acc, p) => acc + (Number(p.amount_paid) || 0), 0);

        // Répartition par classe
        const classMap: Record<string, number> = {};
        classes.forEach(c => { classMap[c.id] = 0; });
        students.forEach(s => {
          if (s.class_id && classMap[s.class_id] !== undefined) {
            classMap[s.class_id]++;
          }
        });
        const classesStats = classes.map(c => ({
          name: c.name,
          students_count: classMap[c.id] || 0,
        }));

        // Calcul du taux de réussite sur les vraies notes
        let successRate: number | null = null;
        if (grades.length > 0) {
          const passing = grades.filter(g => {
            const max = Number(g.max_score) || 20;
            const sc = Number(g.score) || 0;
            return (sc / max) >= 0.5;
          }).length;
          successRate = Math.round((passing / grades.length) * 1000) / 10;
        }

        const recentActivities = payments.slice(0, 5).map(p => ({
          type: 'Paiement',
          detail: `Versement de ${(Number(p.amount_paid) || 0).toLocaleString('fr-FR')} FCFA enregistré`,
          time: p.paid_at || new Date().toISOString(),
        }));

        return {
          total_students: students.length,
          total_classes: classes.length,
          payments_total: totalPayments,
          payments_today: paymentsToday,
          unpaid_total: 0,
          classes_stats: classesStats,
          recent_activities: recentActivities,
          success_rate: successRate,
          absent_today: absentCount,
        };
      } catch (directErr) {
        console.error('Erreur requêtes directes dashboard:', directErr);
        return DEFAULT_STATS;
      }
    },
    // Toujours disponible même si tenant_id se charge en asynchrone
    enabled: true,
    refetchInterval: 2 * 60 * 1000,
    staleTime: 60 * 1000,
  });
}
