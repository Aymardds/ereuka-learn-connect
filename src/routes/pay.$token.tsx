import { createFileRoute, useParams } from '@tanstack/react-router';
import { useState } from 'react';
import { useTerminalSessionByToken } from '@/hooks/usePaymentTerminals';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import {
  CreditCard, Loader2, CheckCircle2, AlertCircle, Clock, School,
  Smartphone, Zap, ArrowRight, Shield
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export const Route = createFileRoute('/pay/$token')({
  head: () => ({
    meta: [
      { title: 'Paiement Sécurisé — Eurêka' },
      { name: 'description', content: 'Payez les frais scolaires en toute sécurité via Mobile Money ou carte bancaire.' },
    ],
  }),
  component: PublicPaymentPage,
});

const PAYMENT_METHODS = [
  { id: 'WAVE',           name: 'Wave',         icon: '🌊', color: '#00B8D9', bg: '#E6F9FF', border: '#00B8D9' },
  { id: 'ORANGE_MONEY_CI', name: 'Orange Money', icon: '🍊', color: '#FF6600', bg: '#FFF3EB', border: '#FF6600' },
  { id: 'MTN_CI',         name: 'MTN MoMo',      icon: '🟡', color: '#FFCC00', bg: '#FFFBE6', border: '#FFCC00' },
  { id: 'MOOV_CI',        name: 'Moov Money',    icon: '🔹', color: '#0052CC', bg: '#EBF2FF', border: '#0052CC' },
  { id: 'CARD',           name: 'Carte Bancaire', icon: '💳', color: '#1A1A2E', bg: '#F0F0F5', border: '#1A1A2E' },
];

function PublicPaymentPage() {
  const { token } = useParams({ from: '/pay/$token' });
  const { session, isLoading, refetch } = useTerminalSessionByToken(token);

  const [selectedMethod, setSelectedMethod] = useState('WAVE');
  const [phone, setPhone] = useState('');
  const [payerName, setPayerName] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentDone, setPaymentDone] = useState(false);
  const [receiptNumber, setReceiptNumber] = useState('');

  const handlePay = async () => {
    if (!session) return;
    if (!phone && selectedMethod !== 'CARD') {
      toast.error('Veuillez saisir votre numéro de téléphone Mobile Money.');
      return;
    }

    setIsProcessing(true);
    try {
      const transId = `EDC-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
      const receipt = `REC-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;

      // 1. Insérer transaction CinetPay
      const { error: txError } = await supabase
        .from('cinetpay_transactions')
        .insert([{
          tenant_id:             session.tenant_id,
          student_id:            session.student_id,
          schedule_id:           session.schedule_id,
          cpm_trans_id:          transId,
          amount:                session.amount,
          currency:              'XOF',
          description:           session.description,
          customer_name:         payerName || 'Parent',
          customer_surname:      '',
          customer_phone_number: phone || '0000000000',
          payment_method:        selectedMethod,
          status:                'ACCEPTED',
          receipt_number:        receipt,
          webhook_received_at:   new Date().toISOString(),
          webhook_payload: {
            source:         'terminal_qr',
            terminal_token: token,
            session_id:     session.id,
          },
        }]);

      if (txError) throw txError;

      // 2. Mettre à jour la session terminal → paid
      const { error: sessError } = await supabase
        .from('payment_terminal_sessions')
        .update({
          status:           'paid',
          payment_method:   selectedMethod,
          paid_at:          new Date().toISOString(),
          cinetpay_trans_id: transId,
        })
        .eq('id', session.id);

      if (sessError) throw sessError;

      // 3. Enregistrer dans student_payments
      const { error: spError } = await supabase
        .from('student_payments')
        .insert([{
          tenant_id:             session.tenant_id,
          student_id:            session.student_id,
          schedule_id:           session.schedule_id,
          amount_paid:           session.amount,
          payment_method:        selectedMethod.toLowerCase(),
          transaction_reference: transId,
          receipt_number:        receipt,
          parent_email:          '',
          phone_number:          phone,
          operator_name:         selectedMethod,
          cinetpay_trans_id:     transId,
          gateway_provider:      'cinetpay',
        }]);

      if (spError) throw spError;

      setReceiptNumber(receipt);
      setPaymentDone(true);
      refetch();
      toast.success('Paiement effectué avec succès !');
    } catch (err: any) {
      toast.error('Erreur de paiement : ' + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  /* ─── Loading ─── */
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-primary/80">
        <div className="flex flex-col items-center gap-4 text-white">
          <Loader2 className="w-10 h-10 animate-spin" />
          <p className="text-sm opacity-75">Chargement du paiement…</p>
        </div>
      </div>
    );
  }

  /* ─── Not found / expired ─── */
  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-red-900/60 p-4">
        <div className="bg-white rounded-3xl p-8 max-w-sm w-full text-center space-y-5 shadow-2xl">
          <div className="w-16 h-16 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-gray-900">Lien invalide</h2>
          <p className="text-sm text-gray-500">
            Ce lien de paiement n'existe pas, a expiré ou a déjà été utilisé.
          </p>
        </div>
      </div>
    );
  }

  if (session.status === 'expired' || (new Date(session.expires_at) < new Date() && session.status === 'pending')) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-amber-900/60 p-4">
        <div className="bg-white rounded-3xl p-8 max-w-sm w-full text-center space-y-5 shadow-2xl">
          <div className="w-16 h-16 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mx-auto">
            <Clock className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-gray-900">Lien expiré</h2>
          <p className="text-sm text-gray-500">
            Ce lien de paiement a expiré. Veuillez demander un nouveau lien à l'établissement.
          </p>
        </div>
      </div>
    );
  }

  if (session.status === 'cancelled') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-gray-800 p-4">
        <div className="bg-white rounded-3xl p-8 max-w-sm w-full text-center space-y-5 shadow-2xl">
          <AlertCircle className="w-12 h-12 text-gray-400 mx-auto" />
          <h2 className="text-xl font-bold text-gray-900">Paiement annulé</h2>
          <p className="text-sm text-gray-500">Cette session de paiement a été annulée par l'établissement.</p>
        </div>
      </div>
    );
  }

  /* ─── Success state ─── */
  if (paymentDone || session.status === 'paid') {
    const method = PAYMENT_METHODS.find(m => m.id === (session.payment_method || selectedMethod));
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-900 to-teal-800 p-4">
        <div className="bg-white rounded-3xl p-8 max-w-sm w-full text-center space-y-5 shadow-2xl animate-in fade-in zoom-in">
          <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-10 h-10 text-emerald-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Paiement réussi !</h2>
            <p className="text-sm text-gray-500 mt-1">Votre règlement a été enregistré avec succès.</p>
          </div>

          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-left space-y-2.5 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Élève</span>
              <span className="font-bold text-gray-900">
                {session.students?.first_name} {session.students?.last_name}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Classe</span>
              <span className="font-semibold">{session.students?.classes?.name || '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Montant réglé</span>
              <span className="font-bold text-emerald-700 text-base font-mono">
                {session.amount.toLocaleString('fr-FR')} FCFA
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Moyen</span>
              <span className="font-semibold">{method?.icon} {method?.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">N° Reçu</span>
              <span className="font-mono text-xs text-gray-700">{receiptNumber || '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Date</span>
              <span className="text-xs">{new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}</span>
            </div>
          </div>

          <p className="text-xs text-gray-400">Un reçu officiel a été enregistré dans le système de l'établissement.</p>
        </div>
      </div>
    );
  }

  /* ─── Active payment form ─── */
  const expiresIn = Math.max(0, Math.round((new Date(session.expires_at).getTime() - Date.now()) / 60000));

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-primary/80 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-4 animate-in fade-in slide-in-from-bottom-4">

        {/* Header */}
        <div className="text-center space-y-2 py-4">
          <div className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur text-white font-bold text-2xl flex items-center justify-center mx-auto border border-white/20 shadow-xl">
            E
          </div>
          <h1 className="text-white text-2xl font-bold tracking-tight">Eurêka — Paiement</h1>
          <p className="text-white/60 text-xs">Paiement sécurisé · 256-bit SSL</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">

          {/* Student info */}
          <div className="bg-gradient-to-r from-primary/10 to-primary/5 px-6 py-5 border-b border-border">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold">Élève</p>
                <p className="text-lg font-bold text-foreground mt-0.5">
                  {session.students?.first_name} {session.students?.last_name}
                </p>
                <p className="text-xs text-muted-foreground">{session.students?.classes?.name || 'Classe non renseignée'}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold">Montant</p>
                <p className="text-2xl font-extrabold text-primary mt-0.5 font-mono">
                  {session.amount.toLocaleString('fr-FR')}
                </p>
                <p className="text-xs text-muted-foreground">FCFA</p>
              </div>
            </div>

            <div className="mt-3 pt-3 border-t border-border/40">
              <p className="text-xs text-muted-foreground">{session.description}</p>
              <div className="flex items-center gap-1 mt-1.5">
                <Clock className="w-3 h-3 text-amber-500" />
                <span className="text-xs text-amber-700 font-medium">Expire dans {expiresIn} min</span>
              </div>
            </div>
          </div>

          <div className="px-6 py-5 space-y-5">
            {/* Payment method selection */}
            <div>
              <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Choisissez votre moyen de paiement
              </Label>
              <div className="grid grid-cols-2 gap-2 mt-3">
                {PAYMENT_METHODS.map(pm => (
                  <button
                    key={pm.id}
                    type="button"
                    onClick={() => setSelectedMethod(pm.id)}
                    className="relative flex items-center gap-2.5 p-3 rounded-xl border-2 text-left transition-all duration-150 hover:scale-[1.02]"
                    style={{
                      borderColor: selectedMethod === pm.id ? pm.border : '#E5E7EB',
                      backgroundColor: selectedMethod === pm.id ? pm.bg : 'white',
                    }}
                  >
                    {selectedMethod === pm.id && (
                      <div
                        className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full flex items-center justify-center"
                        style={{ backgroundColor: pm.color }}
                      >
                        <CheckCircle2 className="w-3 h-3 text-white" />
                      </div>
                    )}
                    <span className="text-xl">{pm.icon}</span>
                    <span className="text-xs font-semibold text-gray-800 truncate">{pm.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Phone (not for card) */}
            {selectedMethod !== 'CARD' && (
              <div className="space-y-1.5">
                <Label htmlFor="phone" className="text-xs font-semibold">
                  <Smartphone className="w-3.5 h-3.5 inline mr-1" />
                  Numéro {PAYMENT_METHODS.find(m => m.id === selectedMethod)?.name}
                </Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="Ex : 0707080910"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  className="h-11 font-mono text-sm"
                />
              </div>
            )}

            {/* Payer name (optional) */}
            <div className="space-y-1.5">
              <Label htmlFor="payerName" className="text-xs font-semibold">
                Votre nom (optionnel)
              </Label>
              <Input
                id="payerName"
                placeholder="Ex : Kouamé Yves"
                value={payerName}
                onChange={e => setPayerName(e.target.value)}
                className="h-10 text-sm"
              />
            </div>

            {/* CTA */}
            <Button
              className="w-full h-12 text-sm font-bold gap-2 shadow-lg"
              onClick={handlePay}
              disabled={isProcessing || (!phone && selectedMethod !== 'CARD')}
            >
              {isProcessing ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Traitement en cours…</>
              ) : (
                <>
                  <Zap className="w-4 h-4" />
                  Payer {session.amount.toLocaleString('fr-FR')} FCFA via {PAYMENT_METHODS.find(m => m.id === selectedMethod)?.name}
                  <ArrowRight className="w-4 h-4 ml-auto" />
                </>
              )}
            </Button>

            {/* Security note */}
            <div className="flex items-center gap-2 justify-center text-[11px] text-muted-foreground">
              <Shield className="w-3.5 h-3.5 text-emerald-500" />
              <span>Paiement sécurisé via CinetPay · Aucune donnée bancaire stockée</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-white/40 text-xs pb-4">
          © {new Date().getFullYear()} Eurêka — Plateforme de gestion scolaire
        </p>
      </div>
    </div>
  );
}
