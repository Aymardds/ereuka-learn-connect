import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export type DisbursementStatus = 'pending' | 'processing' | 'completed' | 'rejected' | 'cancelled';
export type PayoutMethod = 'wave' | 'orange_money' | 'mtn_momo' | 'moov_money' | 'bank_transfer';

export interface DisbursementRequest {
  id: string;
  tenant_id: string;
  requested_by: string;
  amount_requested: number;
  platform_fee: number;
  amount_net: number;
  currency: string;
  payout_method: PayoutMethod;
  payout_number: string | null;
  payout_bank: string | null;
  payout_iban: string | null;
  status: DisbursementStatus;
  reference: string | null;
  notes_school: string | null;
  notes_admin: string | null;
  processed_at: string | null;
  rejected_reason: string | null;
  period_from: string | null;
  period_to: string | null;
  created_at: string;
}

export interface PaymentGatewayConfig {
  id: string;
  tenant_id: string;
  provider: string;
  site_id: string | null;
  api_key: string | null;
  is_live: boolean;
  currency: string;
  business_wave_number: string | null;
  business_account_name: string | null;
  school_wave_number: string | null;
  school_orange_number: string | null;
  school_mtn_number: string | null;
  school_moov_number: string | null;
  platform_fee_percent: number;
  disbursement_iban: string | null;
  disbursement_bank: string | null;
}

export interface CollectionSummary {
  tenant_id: string;
  school_name: string;
  total_collected: number;
  collected_last_30d: number;
  pending_disbursements: number;
  total_disbursed: number;
  available_balance: number;
}

const PAYOUT_METHODS: { id: PayoutMethod; label: string; icon: string; color: string }[] = [
  { id: 'wave',          label: 'Wave Mobile Money',  icon: '🌊', color: 'bg-cyan-500' },
  { id: 'orange_money',  label: 'Orange Money',       icon: '🍊', color: 'bg-orange-500' },
  { id: 'mtn_momo',      label: 'MTN MoMo',           icon: '🟡', color: 'bg-yellow-400' },
  { id: 'moov_money',    label: 'Moov Money',         icon: '🔹', color: 'bg-blue-600' },
  { id: 'bank_transfer', label: 'Virement Bancaire',  icon: '🏦', color: 'bg-purple-700' },
];

export { PAYOUT_METHODS };

export function useDisbursement() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const tenantId = profile?.tenant_id;

  const isFinance = ['admin', 'director', 'accountant', 'superadmin'].includes(profile?.role || '');

  // ── 1. Config passerelle (Wave Business Number, etc.) ──────────────────────
  const gatewayQuery = useQuery({
    queryKey: ['payment_gateway_full', tenantId],
    enabled: !!tenantId && isFinance,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payment_gateways')
        .select('*')
        .eq('tenant_id', tenantId!)
        .maybeSingle();
      if (error) throw error;
      return data as PaymentGatewayConfig | null;
    },
  });

  // ── 2. Résumé des encaissements disponibles ────────────────────────────────
  const summaryQuery = useQuery({
    queryKey: ['collection_summary', tenantId],
    enabled: !!tenantId && isFinance,
    queryFn: async () => {
      // Calcul manuel car la vue peut ne pas exister encore
      const [paymentsRes, disbRes] = await Promise.all([
        supabase
          .from('student_payments')
          .select('amount_paid, paid_at')
          .eq('tenant_id', tenantId!),
        supabase
          .from('disbursement_requests')
          .select('amount_requested, amount_net, status')
          .eq('tenant_id', tenantId!),
      ]);

      const payments = paymentsRes.data || [];
      const disbs = disbRes.data || [];
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

      const totalCollected = payments.reduce((s, p) => s + (p.amount_paid || 0), 0);
      const collected30d = payments
        .filter(p => p.paid_at >= thirtyDaysAgo)
        .reduce((s, p) => s + (p.amount_paid || 0), 0);
      const pendingDisbursements = disbs
        .filter(d => ['pending', 'processing'].includes(d.status))
        .reduce((s, d) => s + (d.amount_requested || 0), 0);
      const totalDisbursed = disbs
        .filter(d => d.status === 'completed')
        .reduce((s, d) => s + (d.amount_net || 0), 0);

      return {
        totalCollected,
        collected30d,
        pendingDisbursements,
        totalDisbursed,
        availableBalance: totalCollected - pendingDisbursements - totalDisbursed,
      };
    },
  });

  // ── 3. Liste des demandes de décaissement de l'école ──────────────────────
  const disbursementsQuery = useQuery({
    queryKey: ['disbursement_requests', tenantId],
    enabled: !!tenantId && isFinance,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('disbursement_requests')
        .select('*')
        .eq('tenant_id', tenantId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as DisbursementRequest[];
    },
  });

  // ── 4. Créer une demande de décaissement ──────────────────────────────────
  const createDisbursementMutation = useMutation({
    mutationFn: async ({
      amountRequested,
      payoutMethod,
      payoutNumber,
      payoutBank,
      payoutIban,
      notesSchool,
      periodFrom,
      periodTo,
    }: {
      amountRequested: number;
      payoutMethod: PayoutMethod;
      payoutNumber?: string;
      payoutBank?: string;
      payoutIban?: string;
      notesSchool?: string;
      periodFrom?: string;
      periodTo?: string;
    }) => {
      if (!tenantId || !profile?.id) throw new Error('Session invalide');
      if (amountRequested <= 0) throw new Error('Le montant doit être supérieur à 0');

      // Modèle économique INEXIUMUS : Gestion 100% gratuite pour les écoles
      // Les frais de service de 500 FCFA sont pris en charge par le parent lors de son paiement (non inclus dans la scolarité)
      const platformFee = 0;
      const amountNet = amountRequested;

      const year = new Date().getFullYear();
      const ref = `DCM-${year}-${Math.floor(10000 + Math.random() * 90000)}`;

      const { data, error } = await supabase
        .from('disbursement_requests')
        .insert([{
          tenant_id: tenantId,
          requested_by: profile.id,
          amount_requested: amountRequested,
          platform_fee: platformFee,
          amount_net: amountNet,
          currency: 'XOF',
          payout_method: payoutMethod,
          payout_number: payoutNumber || null,
          payout_bank: payoutBank || null,
          payout_iban: payoutIban || null,
          status: 'pending',
          reference: ref,
          notes_school: notesSchool || null,
          period_from: periodFrom || null,
          period_to: periodTo || null,
        }])
        .select()
        .single();

      if (error) throw error;
      return data as DisbursementRequest;
    },
    onSuccess: (data) => {
      toast.success(`Demande de décaissement ${data.reference} soumise avec succès !`);
      queryClient.invalidateQueries({ queryKey: ['disbursement_requests'] });
      queryClient.invalidateQueries({ queryKey: ['collection_summary'] });
    },
    onError: (err: any) => {
      toast.error(err.message || 'Erreur lors de la soumission de la demande');
    },
  });

  // ── 5. Annuler une demande en attente ─────────────────────────────────────
  const cancelDisbursementMutation = useMutation({
    mutationFn: async (disbursementId: string) => {
      const { error } = await supabase
        .from('disbursement_requests')
        .update({ status: 'cancelled' })
        .eq('id', disbursementId)
        .eq('status', 'pending')
        .eq('tenant_id', tenantId!);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Demande de décaissement annulée.');
      queryClient.invalidateQueries({ queryKey: ['disbursement_requests'] });
      queryClient.invalidateQueries({ queryKey: ['collection_summary'] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Erreur lors de l'annulation");
    },
  });

  // ── 6. Sauvegarder la config passerelle (numéros de compte) ───────────────
  const saveGatewayConfigMutation = useMutation({
    mutationFn: async (config: Partial<PaymentGatewayConfig>) => {
      if (!tenantId) throw new Error('Établissement non identifié');
      const { data: existing } = await supabase
        .from('payment_gateways')
        .select('id')
        .eq('tenant_id', tenantId)
        .maybeSingle();

      if (existing?.id) {
        const { data, error } = await supabase
          .from('payment_gateways')
          .update(config)
          .eq('id', existing.id)
          .select()
          .single();
        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase
          .from('payment_gateways')
          .insert([{ tenant_id: tenantId, provider: 'direct_wave', currency: 'XOF', ...config }])
          .select()
          .single();
        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      toast.success('Configuration de paiement sauvegardée');
      queryClient.invalidateQueries({ queryKey: ['payment_gateway_full'] });
    },
    onError: (err: any) => {
      toast.error(err.message || 'Erreur lors de la sauvegarde');
    },
  });

  return {
    isFinance,
    gateway: gatewayQuery.data,
    isLoadingGateway: gatewayQuery.isLoading,
    summary: summaryQuery.data,
    isLoadingSummary: summaryQuery.isLoading,
    disbursements: disbursementsQuery.data || [],
    isLoadingDisbursements: disbursementsQuery.isLoading,
    createDisbursement: createDisbursementMutation.mutateAsync,
    isCreatingDisbursement: createDisbursementMutation.isPending,
    cancelDisbursement: cancelDisbursementMutation.mutateAsync,
    isCancellingDisbursement: cancelDisbursementMutation.isPending,
    saveGatewayConfig: saveGatewayConfigMutation.mutateAsync,
    isSavingConfig: saveGatewayConfigMutation.isPending,
  };
}
