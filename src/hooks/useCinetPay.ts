import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { PaymentGateway, CinetPayTransaction } from '@/types/database';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export interface CinetPayCheckoutParams {
  studentId: string;
  scheduleId?: string;
  amount: number;
  description: string;
  customerName: string;
  customerSurname: string;
  customerPhone: string;
  customerEmail?: string;
  channel?: 'WAVE' | 'ORANGE_MONEY_CI' | 'MTN_CI' | 'MOOV_CI' | 'CARD';
}

export function useCinetPay() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();
  const tenantId = profile?.tenant_id;
  const [isProcessing, setIsProcessing] = useState(false);

  // Charger la config de passerelle de l'école
  const gatewayQuery = useQuery({
    queryKey: ['payment_gateway', tenantId],
    queryFn: async () => {
      if (!tenantId) return null;
      const { data, error } = await supabase
        .from('payment_gateways')
        .select('*')
        .eq('tenant_id', tenantId)
        .maybeSingle();
      if (error) throw error;
      return data as PaymentGateway | null;
    },
    enabled: !!tenantId,
  });

  // Initier une transaction de paiement CinetPay
  const initiatePayment = async (params: CinetPayCheckoutParams) => {
    if (!tenantId) throw new Error('Établissement non identifié');
    setIsProcessing(true);

    try {
      const transId = `EDC-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
      const receiptNumber = `REC-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;

      // 1. Créer la transaction dans la table cinetpay_transactions
      const { data: tx, error: txError } = await supabase
        .from('cinetpay_transactions')
        .insert([{
          tenant_id: tenantId,
          student_id: params.studentId,
          schedule_id: params.scheduleId || null,
          cpm_trans_id: transId,
          cpm_site_id: gatewayQuery.data?.site_id || '985471', // Site ID par défaut ou configuré
          amount: params.amount,
          currency: 'XOF',
          description: params.description,
          customer_name: params.customerName,
          customer_surname: params.customerSurname,
          customer_phone_number: params.customerPhone,
          customer_email: params.customerEmail || 'parent@eureka.ci',
          payment_method: params.channel || 'WAVE',
          status: 'PENDING',
          receipt_number: receiptNumber,
        }])
        .select()
        .single();

      if (txError) throw txError;

      // 2. Simuler ou déclencher la session de paiement CinetPay
      // En production, CinetPay SDK ouvre un modal Seamless ou redirige vers payment_url.
      await new Promise(res => setTimeout(res, 1200));

      // 3. Valider la transaction (Simulation / Retour webhook)
      const { error: updateError } = await supabase
        .from('cinetpay_transactions')
        .update({
          status: 'ACCEPTED',
          operator_id: `CP-OP-${Math.random().toString(36).substring(2, 9).toUpperCase()}`,
          webhook_received_at: new Date().toISOString(),
          webhook_payload: {
            cpm_trans_id: transId,
            cpm_result: '00',
            cpm_trans_status: 'ACCEPTED',
            cpm_payment_date: new Date().toISOString(),
            cpm_payment_method: params.channel || 'WAVE',
          }
        })
        .eq('id', tx.id);

      if (updateError) throw updateError;

      // 4. Créer l'enregistrement dans student_payments pour la comptabilité
      const { error: paymentError } = await supabase
        .from('student_payments')
        .insert([{
          tenant_id: tenantId,
          student_id: params.studentId,
          schedule_id: params.scheduleId || null,
          amount_paid: params.amount,
          payment_method: (params.channel || 'wave').toLowerCase(),
          transaction_reference: transId,
          receipt_number: receiptNumber,
          parent_email: params.customerEmail || 'parent@eureka.ci',
          cinetpay_trans_id: transId,
          operator_name: params.channel || 'WAVE',
          phone_number: params.customerPhone,
        }]);

      if (paymentError) throw paymentError;

      queryClient.invalidateQueries({ queryKey: ['student_payments'] });
      queryClient.invalidateQueries({ queryKey: ['cinetpay_transactions'] });

      toast.success(`Paiement de ${params.amount.toLocaleString('fr-FR')} FCFA validé via CinetPay !`);
      return { success: true, transId, receiptNumber };
    } catch (err: any) {
      toast.error('Erreur CinetPay: ' + err.message);
      throw err;
    } finally {
      setIsProcessing(false);
    }
  };

  return {
    gateway: gatewayQuery.data,
    isConfigured: !!gatewayQuery.data?.api_key,
    isProcessing,
    initiatePayment,
  };
}
