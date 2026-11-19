import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { useDisbursement, PAYOUT_METHODS, DisbursementRequest, PayoutMethod } from '@/hooks/useDisbursement';
import { useAuth } from '@/hooks/useAuth';
import { useSettings } from '@/hooks/useSettings';
import {
  ArrowDownToLine, Wallet, TrendingUp, Clock, CheckCircle2, XCircle,
  Loader2, ChevronDown, AlertCircle, Info, Building2, Phone, Shield,
  Banknote, RefreshCw, Settings, Send, Calendar, FileText, Eye, Ban
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

export const Route = createFileRoute('/decaissement')({
  component: DecaissementPage,
});

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  pending:    { label: 'En attente',  color: 'bg-amber-100 text-amber-800 border-amber-200',    icon: Clock },
  processing: { label: 'En cours',    color: 'bg-blue-100 text-blue-800 border-blue-200',       icon: RefreshCw },
  completed:  { label: 'Versé',       color: 'bg-emerald-100 text-emerald-800 border-emerald-200', icon: CheckCircle2 },
  rejected:   { label: 'Refusé',      color: 'bg-red-100 text-red-800 border-red-200',          icon: XCircle },
  cancelled:  { label: 'Annulé',      color: 'bg-gray-100 text-gray-600 border-gray-300',       icon: Ban },
};

function StatCard({ icon: Icon, label, value, sub, color = 'emerald' }: {
  icon: any; label: string; value: string | number; sub?: string; color?: string;
}) {
  const colorMap: Record<string, string> = {
    emerald: 'bg-emerald-50 border-emerald-200 text-emerald-700',
    blue:    'bg-blue-50 border-blue-200 text-blue-700',
    amber:   'bg-amber-50 border-amber-200 text-amber-700',
    purple:  'bg-purple-50 border-purple-200 text-purple-700',
    slate:   'bg-slate-50 border-slate-200 text-slate-700',
  };
  return (
    <div className={`rounded-xl border p-4 ${colorMap[color] || colorMap.slate}`}>
      <div className="flex items-center gap-2 mb-2">
        <Icon className="w-4 h-4 opacity-70" />
        <span className="text-[11px] font-bold uppercase tracking-wide opacity-80">{label}</span>
      </div>
      <p className="text-2xl font-black">{typeof value === 'number' ? value.toLocaleString('fr-FR') : value}</p>
      {sub && <p className="text-[10px] opacity-60 mt-0.5">{sub}</p>}
    </div>
  );
}

function DecaissementPage() {
  const { profile } = useAuth();
  const { tenantQuery } = useSettings();
  const tenant = tenantQuery.data;
  const {
    isFinance, gateway, isLoadingGateway,
    summary, isLoadingSummary,
    disbursements, isLoadingDisbursements,
    createDisbursement, isCreatingDisbursement,
    cancelDisbursement,
    saveGatewayConfig, isSavingConfig,
  } = useDisbursement();

  const [isNewRequestOpen, setIsNewRequestOpen] = useState(false);
  const [isConfigOpen, setIsConfigOpen] = useState(false);

  // Formulaire de demande de décaissement
  const [form, setForm] = useState({
    amount: '',
    payoutMethod: 'wave' as PayoutMethod,
    payoutNumber: '',
    notesSchool: '',
    periodFrom: '',
    periodTo: '',
  });

  // Formulaire de configuration
  const [configForm, setConfigForm] = useState({
    school_wave_number: gateway?.school_wave_number || '',
    school_orange_number: gateway?.school_orange_number || '',
    school_mtn_number: gateway?.school_mtn_number || '',
    school_moov_number: gateway?.school_moov_number || '',
    disbursement_bank: gateway?.disbursement_bank || '',
    disbursement_iban: gateway?.disbursement_iban || '',
  });

  const getPhoneForMethod = (method: PayoutMethod): string => {
    if (!gateway) return form.payoutNumber;
    const map: Record<PayoutMethod, string | null> = {
      wave:          gateway.school_wave_number,
      orange_money:  gateway.school_orange_number,
      mtn_momo:      gateway.school_mtn_number,
      moov_money:    gateway.school_moov_number,
      bank_transfer: gateway.disbursement_iban,
    };
    return map[method] || form.payoutNumber;
  };

  if (!isFinance) {
    return (
      <AppShell title="Décaissements">
        <div className="p-8 text-center text-red-500 flex flex-col items-center gap-3">
          <Shield className="w-10 h-10 text-red-400" />
          <p>Accès réservé aux administrateurs, directeurs et comptables.</p>
        </div>
      </AppShell>
    );
  }

  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(form.amount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Veuillez saisir un montant valide.');
      return;
    }
    if (summary && amount > summary.availableBalance) {
      toast.error(`Le montant demandé dépasse le solde disponible (${summary.availableBalance.toLocaleString('fr-FR')} FCFA).`);
      return;
    }
    const payoutNum = form.payoutNumber || getPhoneForMethod(form.payoutMethod);
    if (!payoutNum && form.payoutMethod !== 'bank_transfer') {
      toast.error('Veuillez indiquer un numéro de compte destinataire.');
      return;
    }
    try {
      await createDisbursement({
        amountRequested: amount,
        payoutMethod: form.payoutMethod,
        payoutNumber: payoutNum,
        notesSchool: form.notesSchool || undefined,
        periodFrom: form.periodFrom || undefined,
        periodTo: form.periodTo || undefined,
      });
      setIsNewRequestOpen(false);
      setForm({ amount: '', payoutMethod: 'wave', payoutNumber: '', notesSchool: '', periodFrom: '', periodTo: '' });
    } catch {
      // géré dans le hook
    }
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    await saveGatewayConfig(configForm);
    setIsConfigOpen(false);
  };

  const feePercent = gateway?.platform_fee_percent ?? 2.5;
  const previewAmount = parseFloat(form.amount) || 0;
  const previewFee = Math.round((previewAmount * feePercent) / 100);
  const previewNet = previewAmount - previewFee;

  return (
    <AppShell
      title="Décaissements"
      subtitle="Gérez vos demandes de transfert des fonds collectés vers votre compte"
    >
      <div className="max-w-5xl space-y-6 pb-12">

        {/* ── Bandeau informatif ───────────────────────────────────────────── */}
        <div className="flex items-start gap-3 bg-cyan-50 border border-cyan-200 rounded-xl p-4 text-sm text-cyan-900">
          <Info className="w-5 h-5 text-cyan-500 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Comment fonctionne le circuit de paiement Eurêka ?</p>
            <p className="text-xs text-cyan-800 mt-1 leading-relaxed">
              Tous les paiements effectués par les parents (Wave, Orange Money, MTN, Moov, Carte) sont collectés
              sur le compte Business <strong>INEXIUMUS</strong>. Votre établissement peut à tout moment soumettre
              une demande de décaissement pour recevoir les fonds collectés en déduction de la commission de
              service de <strong>{feePercent}%</strong>. Les demandes sont traitées sous <strong>24 à 48 heures ouvrables</strong>.
            </p>
          </div>
        </div>

        {/* ── Statistiques ─────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {isLoadingSummary ? (
            <div className="col-span-4 py-8 flex justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              <StatCard
                icon={TrendingUp} color="emerald"
                label="Total collecté"
                value={`${(summary?.totalCollected || 0).toLocaleString('fr-FR')} F`}
                sub="Depuis l'ouverture du compte"
              />
              <StatCard
                icon={Calendar} color="blue"
                label="30 derniers jours"
                value={`${(summary?.collected30d || 0).toLocaleString('fr-FR')} F`}
                sub="Paiements récents"
              />
              <StatCard
                icon={Clock} color="amber"
                label="En attente"
                value={`${(summary?.pendingDisbursements || 0).toLocaleString('fr-FR')} F`}
                sub="Demandes en cours"
              />
              <StatCard
                icon={Wallet} color="purple"
                label="Solde disponible"
                value={`${(summary?.availableBalance || 0).toLocaleString('fr-FR')} F`}
                sub="Décaissable maintenant"
              />
            </>
          )}
        </div>

        {/* ── Actions principales ───────────────────────────────────────────── */}
        <div className="flex flex-wrap gap-3">
          <Button
            onClick={() => setIsNewRequestOpen(true)}
            className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
            disabled={!summary || summary.availableBalance <= 0}
          >
            <ArrowDownToLine className="w-4 h-4" />
            Demander un décaissement
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              setConfigForm({
                school_wave_number: gateway?.school_wave_number || '',
                school_orange_number: gateway?.school_orange_number || '',
                school_mtn_number: gateway?.school_mtn_number || '',
                school_moov_number: gateway?.school_moov_number || '',
                disbursement_bank: gateway?.disbursement_bank || '',
                disbursement_iban: gateway?.disbursement_iban || '',
              });
              setIsConfigOpen(true);
            }}
            className="gap-2"
          >
            <Settings className="w-4 h-4" />
            Mes coordonnées de paiement
          </Button>
        </div>

        {/* ── Coordonnées configurées ───────────────────────────────────────── */}
        {gateway && (gateway.school_wave_number || gateway.school_orange_number || gateway.school_mtn_number) && (
          <div className="bg-slate-50 border border-border rounded-xl p-4">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3">
              <Phone className="w-4 h-4 text-muted-foreground" />
              Coordonnées de remboursement enregistrées
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              {gateway.school_wave_number && (
                <div className="flex items-center gap-2 bg-cyan-50 border border-cyan-200 rounded-lg p-2.5">
                  <span className="text-lg">🌊</span>
                  <div>
                    <p className="font-bold text-cyan-900">Wave</p>
                    <p className="text-cyan-700 font-mono">{gateway.school_wave_number}</p>
                  </div>
                </div>
              )}
              {gateway.school_orange_number && (
                <div className="flex items-center gap-2 bg-orange-50 border border-orange-200 rounded-lg p-2.5">
                  <span className="text-lg">🍊</span>
                  <div>
                    <p className="font-bold text-orange-900">Orange Money</p>
                    <p className="text-orange-700 font-mono">{gateway.school_orange_number}</p>
                  </div>
                </div>
              )}
              {gateway.school_mtn_number && (
                <div className="flex items-center gap-2 bg-yellow-50 border border-yellow-200 rounded-lg p-2.5">
                  <span className="text-lg">🟡</span>
                  <div>
                    <p className="font-bold text-yellow-900">MTN MoMo</p>
                    <p className="text-yellow-700 font-mono">{gateway.school_mtn_number}</p>
                  </div>
                </div>
              )}
              {gateway.school_moov_number && (
                <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-lg p-2.5">
                  <span className="text-lg">🔹</span>
                  <div>
                    <p className="font-bold text-blue-900">Moov Money</p>
                    <p className="text-blue-700 font-mono">{gateway.school_moov_number}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Historique des demandes ───────────────────────────────────────── */}
        <section className="bg-white border border-border rounded-xl overflow-hidden shadow-sm">
          <div className="border-b bg-slate-50/60 px-5 py-3.5 flex items-center gap-2">
            <FileText className="w-4 h-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold text-foreground">Historique des demandes de décaissement</h2>
          </div>

          {isLoadingDisbursements ? (
            <div className="py-12 flex justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : disbursements.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <Banknote className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm font-medium">Aucune demande de décaissement</p>
              <p className="text-xs mt-1">Cliquez sur "Demander un décaissement" pour soumettre votre première demande.</p>
            </div>
          ) : (
            <div className="divide-y divide-border text-sm">
              {disbursements.map((d) => {
                const sc = STATUS_CONFIG[d.status] || STATUS_CONFIG.pending;
                const Icon = sc.icon;
                const method = PAYOUT_METHODS.find(m => m.id === d.payout_method);
                return (
                  <div key={d.id} className="px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                        <span className="text-lg">{method?.icon || '💰'}</span>
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-foreground">
                            {d.amount_requested.toLocaleString('fr-FR')} FCFA
                          </span>
                          {d.platform_fee > 0 && (
                            <span className="text-[10px] text-muted-foreground">
                              (net : {d.amount_net.toLocaleString('fr-FR')} F après commission)
                            </span>
                          )}
                          <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${sc.color}`}>
                            <Icon className="w-3 h-3" />
                            {sc.label}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          <span className="font-mono">{d.reference}</span>
                          {' · '}{method?.label || d.payout_method}
                          {d.payout_number && ` · ${d.payout_number}`}
                          {' · '}{new Date(d.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </p>
                        {d.notes_school && (
                          <p className="text-[11px] text-slate-500 mt-1 italic">📝 {d.notes_school}</p>
                        )}
                        {d.rejected_reason && (
                          <p className="text-[11px] text-red-600 mt-1 font-medium">
                            ⚠️ Motif de refus : {d.rejected_reason}
                          </p>
                        )}
                        {d.processed_at && d.status === 'completed' && (
                          <p className="text-[11px] text-emerald-700 mt-1 font-medium">
                            ✅ Versé le {new Date(d.processed_at).toLocaleDateString('fr-FR')}
                          </p>
                        )}
                      </div>
                    </div>
                    {d.status === 'pending' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => cancelDisbursement(d.id)}
                        className="h-7 text-[10px] text-red-600 border-red-200 hover:bg-red-50 gap-1 shrink-0"
                      >
                        <Ban className="w-3 h-3" /> Annuler
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>

      </div>

      {/* ═══════════════════════════════════════════════════════════════
          MODAL : NOUVELLE DEMANDE DE DÉCAISSEMENT
          ═══════════════════════════════════════════════════════════════ */}
      <Dialog open={isNewRequestOpen} onOpenChange={setIsNewRequestOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold">
              <ArrowDownToLine className="w-5 h-5 text-emerald-600" />
              Nouvelle demande de décaissement
            </DialogTitle>
            <DialogDescription className="text-xs">
              Les fonds seront transférés depuis le compte Business INEXIUMUS vers votre compte.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmitRequest} className="space-y-4 mt-2">
            {/* Solde disponible */}
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-center">
              <p className="text-xs text-emerald-700 font-semibold uppercase tracking-wide">Solde disponible</p>
              <p className="text-2xl font-black text-emerald-700 mt-0.5">
                {(summary?.availableBalance || 0).toLocaleString('fr-FR')} <span className="text-sm">FCFA</span>
              </p>
            </div>

            {/* Montant */}
            <div className="grid gap-1.5">
              <Label htmlFor="d-amount" className="text-xs font-semibold">Montant à décaisser (FCFA)</Label>
              <Input
                id="d-amount"
                type="number"
                min="1000"
                max={summary?.availableBalance || undefined}
                step="100"
                value={form.amount}
                onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                placeholder="ex. 500 000"
                required
              />
              {previewAmount > 0 && (
                <div className="bg-slate-50 border border-border rounded-lg p-2.5 text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Montant brut</span>
                    <span className="font-bold">{previewAmount.toLocaleString('fr-FR')} FCFA</span>
                  </div>
                  <div className="flex justify-between text-amber-700">
                    <span>Commission Eurêka ({feePercent}%)</span>
                    <span>- {previewFee.toLocaleString('fr-FR')} FCFA</span>
                  </div>
                  <div className="flex justify-between font-bold text-emerald-700 border-t border-border pt-1">
                    <span>Montant net reçu</span>
                    <span>{previewNet.toLocaleString('fr-FR')} FCFA</span>
                  </div>
                </div>
              )}
            </div>

            {/* Mode de paiement */}
            <div className="grid gap-1.5">
              <Label className="text-xs font-semibold">Mode de réception</Label>
              <div className="grid grid-cols-2 gap-2">
                {PAYOUT_METHODS.map(m => (
                  <label
                    key={m.id}
                    className={`flex items-center gap-2 p-2.5 rounded-lg border text-xs cursor-pointer transition-all ${
                      form.payoutMethod === m.id
                        ? 'border-primary bg-primary/5 font-semibold'
                        : 'border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="payoutMethod"
                      value={m.id}
                      checked={form.payoutMethod === m.id}
                      onChange={() => setForm(f => ({
                        ...f,
                        payoutMethod: m.id,
                        payoutNumber: getPhoneForMethod(m.id),
                      }))}
                      className="hidden"
                    />
                    <span className="text-base">{m.icon}</span>
                    <span>{m.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Numéro destinataire */}
            <div className="grid gap-1.5">
              <Label htmlFor="d-phone" className="text-xs font-semibold">
                {form.payoutMethod === 'bank_transfer' ? 'IBAN / RIB' : 'Numéro de réception'}
              </Label>
              <Input
                id="d-phone"
                value={form.payoutNumber || getPhoneForMethod(form.payoutMethod)}
                onChange={e => setForm(f => ({ ...f, payoutNumber: e.target.value }))}
                placeholder={form.payoutMethod === 'bank_transfer' ? 'CI...' : '+225 00 00 00 00'}
                className="font-mono"
              />
            </div>

            {/* Période */}
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="d-from" className="text-xs font-semibold">Période du</Label>
                <Input id="d-from" type="date" value={form.periodFrom} onChange={e => setForm(f => ({ ...f, periodFrom: e.target.value }))} />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="d-to" className="text-xs font-semibold">Au</Label>
                <Input id="d-to" type="date" value={form.periodTo} onChange={e => setForm(f => ({ ...f, periodTo: e.target.value }))} />
              </div>
            </div>

            {/* Notes */}
            <div className="grid gap-1.5">
              <Label htmlFor="d-notes" className="text-xs font-semibold">Notes (optionnel)</Label>
              <Input
                id="d-notes"
                value={form.notesSchool}
                onChange={e => setForm(f => ({ ...f, notesSchool: e.target.value }))}
                placeholder="ex. Paiements du mois de novembre..."
              />
            </div>

            <DialogFooter className="pt-2 gap-2">
              <Button type="button" variant="outline" onClick={() => setIsNewRequestOpen(false)}>
                Annuler
              </Button>
              <Button
                type="submit"
                disabled={isCreatingDisbursement || !form.amount}
                className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {isCreatingDisbursement ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                Soumettre la demande
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ═══════════════════════════════════════════════════════════════
          MODAL : CONFIGURATION DES COORDONNÉES
          ═══════════════════════════════════════════════════════════════ */}
      <Dialog open={isConfigOpen} onOpenChange={setIsConfigOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold">
              <Settings className="w-5 h-5 text-muted-foreground" />
              Coordonnées de réception des fonds
            </DialogTitle>
            <DialogDescription className="text-xs">
              Ces numéros seront pré-remplis lors de vos demandes de décaissement.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveConfig} className="space-y-4 mt-2">
            {[
              { key: 'school_wave_number', label: 'Wave Mobile Money', icon: '🌊', placeholder: '+225 07 ...' },
              { key: 'school_orange_number', label: 'Orange Money', icon: '🍊', placeholder: '+225 07 ...' },
              { key: 'school_mtn_number', label: 'MTN MoMo', icon: '🟡', placeholder: '+225 05 ...' },
              { key: 'school_moov_number', label: 'Moov Money', icon: '🔹', placeholder: '+225 01 ...' },
            ].map(field => (
              <div key={field.key} className="grid gap-1.5">
                <Label htmlFor={field.key} className="text-xs font-semibold flex items-center gap-1.5">
                  <span>{field.icon}</span> {field.label}
                </Label>
                <Input
                  id={field.key}
                  value={(configForm as any)[field.key]}
                  onChange={e => setConfigForm(f => ({ ...f, [field.key]: e.target.value }))}
                  placeholder={field.placeholder}
                  className="font-mono"
                />
              </div>
            ))}

            <div className="grid gap-1.5">
              <Label htmlFor="config-bank" className="text-xs font-semibold flex items-center gap-1.5">
                🏦 Banque (virement)
              </Label>
              <Input
                id="config-bank"
                value={configForm.disbursement_bank}
                onChange={e => setConfigForm(f => ({ ...f, disbursement_bank: e.target.value }))}
                placeholder="ex. Société Générale CI"
              />
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="config-iban" className="text-xs font-semibold">IBAN / RIB</Label>
              <Input
                id="config-iban"
                value={configForm.disbursement_iban}
                onChange={e => setConfigForm(f => ({ ...f, disbursement_iban: e.target.value }))}
                placeholder="CI86 XXXX XXXX XXXX"
                className="font-mono"
              />
            </div>

            <DialogFooter className="pt-2 gap-2">
              <Button type="button" variant="outline" onClick={() => setIsConfigOpen(false)}>Annuler</Button>
              <Button type="submit" disabled={isSavingConfig} className="gap-2">
                {isSavingConfig ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                Enregistrer
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
