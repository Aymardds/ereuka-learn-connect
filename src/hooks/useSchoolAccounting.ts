import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export interface StudentScheduleStatus {
  schedule_id: string;
  title: string;
  amount: number;
  due_date: string;
  total_paid: number;
  remaining: number;
  status: 'paid' | 'partial' | 'pending';
  is_overdue: boolean;
  days_overdue: number; // positif si en retard, négatif si à venir
  is_registration: boolean; // frais d'inscription vs scolarité
}

export interface StudentLedgerItem {
  id: string;
  first_name: string;
  last_name: string;
  student_code: string | null;
  photo_url: string | null;
  class_id: string;
  class_name: string;
  responsible_id: string | null;
  parent_name: string;
  parent_phone: string;
  parent_email: string;
  status: 'active' | 'pending' | 'inactive';
  
  // Comptabilité globale de l'élève
  total_due: number;
  total_paid: number;
  remaining_balance: number;
  recovery_rate: number; // en %

  // Séparation Frais d'inscription vs Frais de scolarité
  registration_due: number;
  registration_paid: number;
  registration_remaining: number;
  registration_status: 'paid' | 'partial' | 'pending' | 'none';

  tuition_due: number;
  tuition_paid: number;
  tuition_remaining: number;
  tuition_status: 'paid' | 'partial' | 'pending' | 'none';

  overall_financial_status: 'up_to_date' | 'partial' | 'late' | 'not_configured';
  schedules: StudentScheduleStatus[];
  payments_count: number;
  last_payment_date: string | null;
}

export interface OverdueScheduleReminder {
  student_id: string;
  student_name: string;
  student_photo: string | null;
  class_id: string;
  class_name: string;
  responsible_id: string | null;
  parent_name: string;
  parent_phone: string;
  parent_email: string;

  schedule_id: string;
  schedule_title: string;
  schedule_amount: number;
  due_date: string;
  total_paid: number;
  remaining_amount: number;
  days_overdue: number; // >0 retard, <0 à venir
  urgency: 'critical' | 'warning' | 'upcoming';
  is_registration: boolean;
}

export interface CashTransaction {
  id: string;
  receipt_number: string;
  transaction_reference: string;
  amount_paid: number;
  payment_method: string;
  paid_at: string;
  notes: string | null;
  student_id: string;
  student_name: string;
  class_name: string;
  schedule_title: string | null;
  parent_email: string | null;
  phone_number: string | null;
}

export function useSchoolAccounting() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const tenantId = profile?.tenant_id;

  const isStaff = ['admin', 'director', 'accountant', 'cashier', 'superadmin'].includes(profile?.role || '');

  // ── 1. Fetch Students with Classes and Guardians ───────────────────────────
  const studentsQuery = useQuery({
    queryKey: ['accounting_students', tenantId],
    enabled: !!tenantId && isStaff,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('students')
        .select(`
          id, first_name, last_name, student_code, photo_url, status, class_id, responsible_id,
          guardian_name, guardian_phone, guardian_email,
          classes (id, name),
          user_profiles:responsible_id (id, full_name, email, phone)
        `)
        .eq('tenant_id', tenantId)
        .order('last_name', { ascending: true });

      if (error) throw error;
      return data || [];
    },
  });

  // ── 2. Fetch Payment Schedules ─────────────────────────────────────────────
  const schedulesQuery = useQuery({
    queryKey: ['accounting_schedules', tenantId],
    enabled: !!tenantId && isStaff,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payment_schedules')
        .select('id, title, amount, due_date, class_id, classes(name)')
        .eq('tenant_id', tenantId)
        .order('due_date', { ascending: true });

      if (error) throw error;
      return data || [];
    },
  });

  // ── 3. Fetch All Student Payments ──────────────────────────────────────────
  const paymentsQuery = useQuery({
    queryKey: ['accounting_payments', tenantId],
    enabled: !!tenantId && isStaff,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('student_payments')
        .select(`
          id, receipt_number, transaction_reference, amount_paid, payment_method,
          paid_at, notes, student_id, schedule_id, parent_email, phone_number,
          students (id, first_name, last_name, classes(name)),
          payment_schedules (id, title)
        `)
        .eq('tenant_id', tenantId)
        .order('paid_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
  });

  // ── 4. Calculate Ledger per Student (Dissociated Accounts) ───────────────────
  const studentsList = studentsQuery.data || [];
  const schedulesList = schedulesQuery.data || [];
  const paymentsList = paymentsQuery.data || [];

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const studentsLedger: StudentLedgerItem[] = studentsList.map((st: any) => {
    const className = st.classes?.name || 'Sans classe';
    const parentProfile = st.user_profiles;
    const parentName = st.guardian_name || parentProfile?.full_name || 'Non renseigné';
    const parentPhone = st.guardian_phone || parentProfile?.phone || '';
    const parentEmail = st.guardian_email || parentProfile?.email || '';

    // Échéances applicables à cet élève (spécifique classe ou globale pour l'école)
    const applicableSchedules = schedulesList.filter((sc: any) => 
      !sc.class_id || sc.class_id === st.class_id
    );

    // Paiements de cet élève
    const studentPayments = paymentsList.filter((p: any) => p.student_id === st.id);

    // Calcul par échéance
    const schedulesStatus: StudentScheduleStatus[] = applicableSchedules.map((sc: any) => {
      const schedulePayments = studentPayments.filter((p: any) => p.schedule_id === sc.id);
      const paid = schedulePayments.reduce((sum: number, p: any) => sum + Number(p.amount_paid || 0), 0);
      const totalAmount = Number(sc.amount || 0);
      const remaining = Math.max(0, totalAmount - paid);

      const dueDate = new Date(sc.due_date);
      dueDate.setHours(0, 0, 0, 0);
      const diffTime = today.getTime() - dueDate.getTime();
      const daysOverdue = Math.round(diffTime / (1000 * 60 * 60 * 24));
      const isOverdue = remaining > 0 && daysOverdue > 0;

      let status: 'paid' | 'partial' | 'pending' = 'pending';
      if (paid >= totalAmount && totalAmount > 0) status = 'paid';
      else if (paid > 0) status = 'partial';

      const isReg = /inscription|droit|entree|entrée/i.test(sc.title);

      return {
        schedule_id: sc.id,
        title: sc.title,
        amount: totalAmount,
        due_date: sc.due_date,
        total_paid: paid,
        remaining,
        status,
        is_overdue: isOverdue,
        days_overdue: daysOverdue,
        is_registration: isReg,
      };
    });

    // Totaux globaux
    const totalDue = schedulesStatus.reduce((sum, s) => sum + s.amount, 0);
    const totalPaid = studentPayments.reduce((sum, p) => sum + Number(p.amount_paid || 0), 0);
    const remainingBalance = Math.max(0, totalDue - totalPaid);
    const recoveryRate = totalDue > 0 ? Math.min(100, Math.round((totalPaid / totalDue) * 100)) : 100;

    // Totaux Inscription
    const regSchedules = schedulesStatus.filter(s => s.is_registration);
    const regDue = regSchedules.reduce((sum, s) => sum + s.amount, 0);
    const regPaid = regSchedules.reduce((sum, s) => sum + s.total_paid, 0);
    const regRemaining = Math.max(0, regDue - regPaid);
    let regStatus: 'paid' | 'partial' | 'pending' | 'none' = 'none';
    if (regDue > 0) {
      if (regPaid >= regDue) regStatus = 'paid';
      else if (regPaid > 0) regStatus = 'partial';
      else regStatus = 'pending';
    }

    // Totaux Scolarité
    const tuitSchedules = schedulesStatus.filter(s => !s.is_registration);
    const tuitDue = tuitSchedules.reduce((sum, s) => sum + s.amount, 0);
    const tuitPaid = tuitSchedules.reduce((sum, s) => sum + s.total_paid, 0);
    const tuitRemaining = Math.max(0, tuitDue - tuitPaid);
    let tuitStatus: 'paid' | 'partial' | 'pending' | 'none' = 'none';
    if (tuitDue > 0) {
      if (tuitPaid >= tuitDue) tuitStatus = 'paid';
      else if (tuitPaid > 0) tuitStatus = 'partial';
      else tuitStatus = 'pending';
    }

    // Statut général
    const hasOverdue = schedulesStatus.some(s => s.is_overdue);
    let overallFinancialStatus: 'up_to_date' | 'partial' | 'late' | 'not_configured' = 'not_configured';
    if (totalDue > 0) {
      if (remainingBalance === 0) overallFinancialStatus = 'up_to_date';
      else if (hasOverdue) overallFinancialStatus = 'late';
      else overallFinancialStatus = 'partial';
    }

    const lastPaymentDate = studentPayments.length > 0 ? studentPayments[0].paid_at : null;

    return {
      id: st.id,
      first_name: st.first_name,
      last_name: st.last_name,
      student_code: st.student_code,
      photo_url: st.photo_url,
      class_id: st.class_id,
      class_name: className,
      responsible_id: st.responsible_id,
      parent_name: parentName,
      parent_phone: parentPhone,
      parent_email: parentEmail,
      status: st.status,
      total_due: totalDue,
      total_paid: totalPaid,
      remaining_balance: remainingBalance,
      recovery_rate: recoveryRate,
      registration_due: regDue,
      registration_paid: regPaid,
      registration_remaining: regRemaining,
      registration_status: regStatus,
      tuition_due: tuitDue,
      tuition_paid: tuitPaid,
      tuition_remaining: tuitRemaining,
      tuition_status: tuitStatus,
      overall_financial_status: overallFinancialStatus,
      schedules: schedulesStatus,
      payments_count: studentPayments.length,
      last_payment_date: lastPaymentDate,
    };
  });

  // ── 5. Overdue / Due Soon Schedules List for Reminders ─────────────────────
  const overdueReminders: OverdueScheduleReminder[] = [];
  studentsLedger.forEach(st => {
    st.schedules.forEach(sc => {
      if (sc.remaining > 0) {
        let urgency: 'critical' | 'warning' | 'upcoming' = 'upcoming';
        if (sc.days_overdue > 15) urgency = 'critical';
        else if (sc.days_overdue > 0) urgency = 'warning';

        // Retenir si en retard OU si échéance dans les 7 prochains jours
        if (sc.days_overdue > -7) {
          overdueReminders.push({
            student_id: st.id,
            student_name: `${st.first_name} ${st.last_name}`,
            student_photo: st.photo_url,
            class_id: st.class_id,
            class_name: st.class_name,
            responsible_id: st.responsible_id,
            parent_name: st.parent_name,
            parent_phone: st.parent_phone,
            parent_email: st.parent_email,
            schedule_id: sc.schedule_id,
            schedule_title: sc.title,
            schedule_amount: sc.amount,
            due_date: sc.due_date,
            total_paid: sc.total_paid,
            remaining_amount: sc.remaining,
            days_overdue: sc.days_overdue,
            urgency,
            is_registration: sc.is_registration,
          });
        }
      }
    });
  });

  // Trier par nombre de jours de retard décroissant (les plus urgents en premier)
  overdueReminders.sort((a, b) => b.days_overdue - a.days_overdue);

  // ── 6. Transactions de Caisse Formatées ─────────────────────────────────────
  const cashTransactions: CashTransaction[] = paymentsList.map((p: any) => ({
    id: p.id,
    receipt_number: p.receipt_number,
    transaction_reference: p.transaction_reference,
    amount_paid: Number(p.amount_paid),
    payment_method: p.payment_method,
    paid_at: p.paid_at,
    notes: p.notes,
    student_id: p.student_id,
    student_name: p.students ? `${p.students.first_name} ${p.students.last_name}` : 'Élève inconnu',
    class_name: p.students?.classes?.name || '—',
    schedule_title: p.payment_schedules?.title || 'Frais divers',
    parent_email: p.parent_email,
    phone_number: p.phone_number,
  }));

  // Statistiques de caisse
  const todayStr = new Date().toISOString().split('T')[0];
  const todayPayments = cashTransactions.filter(t => t.paid_at.startsWith(todayStr));
  const todayTotal = todayPayments.reduce((sum, t) => sum + t.amount_paid, 0);

  const totalCollectedAllTime = cashTransactions.reduce((sum, t) => sum + t.amount_paid, 0);

  const totalDueGlobal = studentsLedger.reduce((sum, s) => sum + s.total_due, 0);
  const totalRemainingGlobal = studentsLedger.reduce((sum, s) => sum + s.remaining_balance, 0);
  const overallRecoveryRate = totalDueGlobal > 0 ? Math.round(((totalDueGlobal - totalRemainingGlobal) / totalDueGlobal) * 100) : 100;

  // ── 7. Mutation : Enregistrer un paiement guichet / caisse ─────────────────
  const recordPaymentMutation = useMutation({
    mutationFn: async ({
      studentId,
      scheduleId,
      amount,
      method,
      notes,
      payerName,
      payerPhone,
      payerEmail,
    }: {
      studentId: string;
      scheduleId?: string | null;
      amount: number;
      method: string;
      notes?: string;
      payerName?: string;
      payerPhone?: string;
      payerEmail?: string;
    }) => {
      if (!tenantId) throw new Error('Établissement non défini');
      if (amount <= 0) throw new Error('Le montant doit être supérieur à 0');

      const y = new Date().getFullYear();
      const receiptNumber = `REC-${y}-${Math.floor(10000 + Math.random() * 90000)}`;
      const prefix = method.substring(0, 3).toUpperCase();
      const txRef = `${prefix}-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;

      const { data, error } = await supabase.from('student_payments').insert([{
        tenant_id: tenantId,
        student_id: studentId,
        schedule_id: scheduleId || null,
        amount_paid: amount,
        payment_method: method,
        transaction_reference: txRef,
        receipt_number: receiptNumber,
        parent_email: payerEmail || null,
        phone_number: payerPhone || null,
        notes: notes ? `${notes} (Encaissé par: ${profile?.full_name || 'Guichet'})` : `Encaissé par: ${profile?.full_name || 'Guichet'}`,
        is_validated: true,
      }]).select().single();

      if (error) throw error;
      return { ...data, receiptNumber, txRef };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounting_payments'] });
      queryClient.invalidateQueries({ queryKey: ['v_student_payment_summary'] });
      queryClient.invalidateQueries({ queryKey: ['payment_summary'] });
      toast.success("Paiement enregistré avec succès en caisse !");
    },
    onError: (err: any) => {
      toast.error(err.message || "Erreur lors de l'enregistrement du paiement");
    },
  });

  // ── 8. Mutation : Envoyer une notification in-app de relance au parent ──────
  const sendInAppReminderMutation = useMutation({
    mutationFn: async ({
      responsibleId,
      studentName,
      className,
      scheduleTitle,
      remaining,
      dueDate,
    }: {
      responsibleId: string;
      studentName: string;
      className: string;
      scheduleTitle: string;
      remaining: number;
      dueDate: string;
    }) => {
      if (!tenantId) throw new Error('Établissement non défini');
      const formattedDate = new Date(dueDate).toLocaleDateString('fr-FR');

      const { data, error } = await supabase.from('notifications').insert([{
        tenant_id: tenantId,
        user_id: responsibleId,
        title: `Rappel d'échéance : ${scheduleTitle} (${studentName}) ⚠️`,
        body: `L'échéance pour votre enfant ${studentName} (${className}) présente un restant dû de ${remaining.toLocaleString('fr-FR')} FCFA (Date limite: ${formattedDate}). Merci de bien vouloir régulariser.`,
        type: 'payment',
        link_url: '/portail-parent',
      }]).select().single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Notification de rappel envoyée sur l'Espace Parent Eurêka !");
    },
    onError: (err: any) => {
      toast.error(err.message || "Erreur lors de l'envoi de la notification");
    },
  });

  return {
    isStaff,
    isLoading: studentsQuery.isLoading || schedulesQuery.isLoading || paymentsQuery.isLoading,
    studentsLedger,
    overdueReminders,
    cashTransactions,
    schedulesList,
    stats: {
      todayTotal,
      totalCollectedAllTime,
      totalDueGlobal,
      totalRemainingGlobal,
      overallRecoveryRate,
      overdueCount: overdueReminders.filter(r => r.days_overdue > 0).length,
      upcomingCount: overdueReminders.filter(r => r.days_overdue <= 0).length,
      studentsCount: studentsLedger.length,
      lateStudentsCount: studentsLedger.filter(s => s.overall_financial_status === 'late').length,
      upToDateCount: studentsLedger.filter(s => s.overall_financial_status === 'up_to_date').length,
    },
    recordPayment: recordPaymentMutation.mutateAsync,
    isRecordingPayment: recordPaymentMutation.isPending,
    sendInAppReminder: sendInAppReminderMutation.mutateAsync,
    isSendingReminder: sendInAppReminderMutation.isPending,
    refetchAll: () => {
      queryClient.invalidateQueries({ queryKey: ['accounting_students'] });
      queryClient.invalidateQueries({ queryKey: ['accounting_schedules'] });
      queryClient.invalidateQueries({ queryKey: ['accounting_payments'] });
    },
  };
}
