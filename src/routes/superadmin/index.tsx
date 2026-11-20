import { createFileRoute, Link } from '@tanstack/react-router'
import { 
  Building2, Users, FileCheck, Clock, CheckCircle2, XCircle, 
  TrendingUp, DollarSign, Percent, ArrowUpRight, ShieldCheck, Eye, RefreshCw, CreditCard,
  GraduationCap, ArrowDownToLine, Phone, Copy, Check, AlertCircle, Send, CheckCheck, 
  ArrowRight, School, Sparkles, AlertTriangle, Globe
} from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { createClient } from '@supabase/supabase-js'
import { useState } from 'react'
import { 
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, 
  Tooltip, CartesianGrid, Legend 
} from 'recharts'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/useAuth'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog"
import { SUPPORTED_CURRENCIES, getCurrencyConfig } from '@/lib/platformFee'

export const Route = createFileRoute('/superadmin/')({
  component: SuperAdminDashboard,
})

// Client administrateur avec clé service_role pour requêtes globales multi-établissements
function getAdminClient() {
  const url = import.meta.env.VITE_SUPABASE_URL || 'https://dzgegvueamcmjgxinrnj.supabase.co';
  const key = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error('VITE_SUPABASE_SERVICE_ROLE_KEY is not set');
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

interface EstablishmentStat {
  id: string;
  name: string;
  school_types: string[];
  created_at: string;
  students_count: number;
  users_count: number;
  classes_count: number;
  schedules_count: number;
  fee_per_schedule: number;
  annual_potential: number;
  payments_count: number;
  total_collected: number;
  commission_generated: number;
  pending_disbursements: number;
  total_disbursed: number;
  available_balance: number;
  kyc_status: string;
}

interface DisbursementItem {
  id: string;
  tenant_id: string;
  requested_by: string;
  amount_requested: number;
  platform_fee: number;
  amount_net: number;
  currency: string;
  payout_method: string;
  payout_number: string | null;
  payout_bank: string | null;
  payout_iban: string | null;
  status: 'pending' | 'processing' | 'completed' | 'rejected' | 'cancelled';
  reference: string | null;
  notes_school: string | null;
  notes_admin: string | null;
  processed_by: string | null;
  processed_at: string | null;
  rejected_reason: string | null;
  created_at: string;
  tenant?: {
    id: string;
    name: string;
    school_types: string[];
  };
  requester?: {
    full_name: string;
    email: string;
  };
}

const PAYOUT_ICONS: Record<string, { label: string; badge: string; icon: string }> = {
  wave: { label: 'Wave Mobile Money', badge: 'bg-cyan-100 text-cyan-800 border-cyan-300', icon: '🌊' },
  orange_money: { label: 'Orange Money', badge: 'bg-orange-100 text-orange-800 border-orange-300', icon: '🍊' },
  mtn_momo: { label: 'MTN MoMo', badge: 'bg-yellow-100 text-yellow-800 border-yellow-300', icon: '🟡' },
  moov_money: { label: 'Moov Money', badge: 'bg-blue-100 text-blue-800 border-blue-300', icon: '🔹' },
  bank_transfer: { label: 'Virement Bancaire', badge: 'bg-purple-100 text-purple-800 border-purple-300', icon: '🏦' },
};

function SuperAdminDashboard() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const [selectedCurrency, setSelectedCurrency] = useState<string>('XOF');
  const [disbursementFilter, setDisbursementFilter] = useState<string>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const currConfig = getCurrencyConfig(selectedCurrency);

  // Modals de validation / rejet de décaissement
  const [selectedDisbursement, setSelectedDisbursement] = useState<DisbursementItem | null>(null);
  const [validationModalOpen, setValidationModalOpen] = useState(false);
  const [rejectionModalOpen, setRejectionModalOpen] = useState(false);
  const [transactionRef, setTransactionRef] = useState('');
  const [adminNote, setAdminNote] = useState('');
  const [rejectReason, setRejectReason] = useState('');

  // ── 1. Fetch Global Real Stats & Disbursements ─────────────────────────────
  const dashboardQuery = useQuery({
    queryKey: ['superadmin_full_dashboard'],
    refetchInterval: 30000,
    queryFn: async () => {
      const adminClient = getAdminClient();

      const [
        tenantsRes,
        studentsRes,
        usersRes,
        classesRes,
        schedulesRes,
        paymentsRes,
        disbursementsRes,
        kycRes,
      ] = await Promise.all([
        adminClient.from('tenants').select('id, name, school_types, created_at').order('created_at', { ascending: false }),
        adminClient.from('students').select('id, tenant_id'),
        adminClient.from('user_profiles').select('id, tenant_id, role, full_name, email'),
        adminClient.from('classes').select('id, tenant_id'),
        adminClient.from('payment_schedules').select('id, tenant_id'),
        adminClient.from('student_payments').select('id, tenant_id, amount_paid, paid_at'),
        adminClient
          .from('disbursement_requests')
          .select('*, tenant:tenants(id, name, school_types), requester:user_profiles!disbursement_requests_requested_by_fkey(full_name, email)')
          .order('created_at', { ascending: false }),
        adminClient.from('kyc_applications').select('*').order('created_at', { ascending: false }),
      ]);

      const tenants = tenantsRes.data || [];
      const students = studentsRes.data || [];
      const users = usersRes.data || [];
      const classes = classesRes.data || [];
      const schedules = schedulesRes.data || [];
      const payments = paymentsRes.data || [];
      const disbursements = (disbursementsRes.data || []) as DisbursementItem[];
      const kycs = kycRes.data || [];

      // Agrégations par établissement
      const establishments: EstablishmentStat[] = tenants.map((t) => {
        const tStudents = students.filter((s) => s.tenant_id === t.id);
        const tUsers = users.filter((u) => u.tenant_id === t.id);
        const tClasses = classes.filter((c) => c.tenant_id === t.id);
        const tSchedules = schedules.filter((s) => s.tenant_id === t.id);
        const tPayments = payments.filter((p) => p.tenant_id === t.id);
        const tDisb = disbursements.filter((d) => d.tenant_id === t.id);
        const tKyc = kycs.find((k) => k.tenant_id === t.id || k.school_name?.toLowerCase() === t.name?.toLowerCase());

        const paymentsCount = tPayments.length;
        const totalCollected = tPayments.reduce((acc, p) => acc + (Number(p.amount_paid) || 0), 0);
        
        // Modèle INEXIUMUS : 5 000 FCFA / an par élève réglé par le parent, dispatché selon les échéances
        // Nombre d'échéances de paiement de l'établissement (3 par défaut si non configuré)
        const schedulesCount = tSchedules.length > 0 ? tSchedules.length : 3;
        // Quote-part de frais de service par échéance
        const feePerSchedule = Math.round(5000 / schedulesCount);
        // Potentiel annuel total pour cet établissement
        const annualPotential = tStudents.length * 5000;
        // Commissions perçues à ce jour sur les règlements réalisés
        const commissionGenerated = paymentsCount * feePerSchedule;

        const pendingDisb = tDisb
          .filter((d) => ['pending', 'processing'].includes(d.status))
          .reduce((acc, d) => acc + (Number(d.amount_requested) || 0), 0);
        const totalDisbursed = tDisb
          .filter((d) => d.status === 'completed')
          .reduce((acc, d) => acc + (Number(d.amount_net) || 0), 0);

        return {
          id: t.id,
          name: t.name,
          school_types: Array.isArray(t.school_types) ? t.school_types : [],
          created_at: t.created_at,
          students_count: tStudents.length,
          users_count: tUsers.length,
          classes_count: tClasses.length,
          schedules_count: schedulesCount,
          fee_per_schedule: feePerSchedule,
          annual_potential: annualPotential,
          payments_count: paymentsCount,
          total_collected: totalCollected,
          commission_generated: commissionGenerated,
          pending_disbursements: pendingDisb,
          total_disbursed: totalDisbursed,
          available_balance: Math.max(0, totalCollected - pendingDisb - totalDisbursed),
          kyc_status: tKyc?.status || 'approved',
        };
      });

      // Statistiques globales
      const totalStudents = students.length;
      const totalUsers = users.length;
      const totalClasses = classes.length;
      const totalPaymentsCount = payments.length;
      const totalPaymentsSum = payments.reduce((acc, p) => acc + (Number(p.amount_paid) || 0), 0);
      const totalDisbursedSum = disbursements
        .filter((d) => d.status === 'completed')
        .reduce((acc, d) => acc + (Number(d.amount_net) || 0), 0);
      const pendingDisbursementsSum = disbursements
        .filter((d) => ['pending', 'processing'].includes(d.status))
        .reduce((acc, d) => acc + (Number(d.amount_requested) || 0), 0);
      const pendingCount = disbursements.filter((d) => d.status === 'pending').length;

      // Calculs réels des commissions INEXIUMUS : 5 000 FCFA/an par élève dispatché par échéance
      const totalAnnualPotential = totalStudents * 5000;
      const totalCommissionsEarned = establishments.reduce((acc, e) => acc + e.commission_generated, 0);

      // KYC stats
      const pendingKyc = kycs.filter((k) => k.status === 'pending').length;
      const underReviewKyc = kycs.filter((k) => k.status === 'under_review').length;
      const approvedKyc = kycs.filter((k) => k.status === 'approved').length;
      const rejectedKyc = kycs.filter((k) => k.status === 'rejected').length;

      return {
        tenantsCount: tenants.length,
        totalStudents,
        totalUsers,
        totalClasses,
        totalPaymentsCount,
        totalPaymentsSum,
        totalDisbursedSum,
        pendingDisbursementsSum,
        pendingCount,
        totalAnnualPotential,
        totalCommissionsEarned,
        establishments,
        disbursements,
        kycStats: {
          pending: pendingKyc,
          underReview: underReviewKyc,
          approved: approvedKyc,
          rejected: rejectedKyc,
          total: kycs.length,
        },
        recentKyc: kycs.slice(0, 5),
      };
    },
  });

  // ── 2. Mutations SuperAdmin pour les Décaissements ─────────────────────────
  const processDisbursementMutation = useMutation({
    mutationFn: async ({
      id,
      status,
      adminNote,
      txRef,
      reason,
    }: {
      id: string;
      status: 'processing' | 'completed' | 'rejected';
      adminNote?: string;
      txRef?: string;
      reason?: string;
    }) => {
      const adminClient = getAdminClient();
      const updates: any = {
        status,
        processed_by: profile?.email || 'SuperAdmin INEXIUMUS',
        updated_at: new Date().toISOString(),
      };

      if (status === 'completed') {
        updates.processed_at = new Date().toISOString();
        updates.notes_admin = [txRef ? `Réf Wave/MoMo: ${txRef}` : '', adminNote].filter(Boolean).join(' · ');
      } else if (status === 'rejected') {
        updates.rejected_reason = reason || 'Non spécifié';
        updates.notes_admin = reason || 'Demande rejetée par l\'administrateur';
      } else if (status === 'processing') {
        updates.notes_admin = adminNote || 'En cours de transfert auprès de l\'opérateur';
      }

      const { data, error } = await adminClient
        .from('disbursement_requests')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => {
      if (vars.status === 'completed') toast.success('Décaissement validé et marqué comme payé !');
      else if (vars.status === 'rejected') toast.error('Demande de décaissement rejetée.');
      else toast.info('Demande marquée en cours de transfert.');
      queryClient.invalidateQueries({ queryKey: ['superadmin_full_dashboard'] });
      setValidationModalOpen(false);
      setRejectionModalOpen(false);
      setSelectedDisbursement(null);
      setTransactionRef('');
      setAdminNote('');
      setRejectReason('');
    },
    onError: (err: any) => {
      toast.error(err.message || 'Erreur lors de la mise à jour de la demande');
    },
  });

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success(`Copié : ${text}`);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const data = dashboardQuery.data;

  // Filtrage des demandes de décaissement
  const filteredDisbursements = (data?.disbursements || []).filter((d) => {
    if (disbursementFilter === 'all') return true;
    return d.status === disbursementFilter;
  });

  // Données graphiques de comparaison par établissement
  const barChartData = (data?.establishments || []).map((e) => ({
    name: e.name,
    encaisse: e.total_collected,
    decaisse: e.total_disbursed,
    solde: e.available_balance,
  }));

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      
      {/* ── HEADER SUPERADMIN ── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-6 rounded-2xl border shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider">
              Compte Central INEXIUMUS
            </span>
            <span className="text-xs text-gray-400 font-medium">· ERP Éducatif & Universitaire</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-gray-900">
            Tableau de bord Global SuperAdmin
          </h1>
          <p className="text-gray-500 text-xs sm:text-sm mt-0.5">
            Supervision multi-établissements en direct, suivi des élèves & gestion des reversements Wave/MoMo.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => dashboardQuery.refetch()} 
            disabled={dashboardQuery.isFetching}
            className="text-xs gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${dashboardQuery.isFetching ? 'animate-spin' : ''}`} />
            Actualiser
          </Button>

          <Link to={'/superadmin/etablissements' as any}>
            <Button variant="outline" size="sm" className="text-xs gap-1.5 border-blue-300 text-blue-700 hover:bg-blue-50">
              <Building2 className="w-3.5 h-3.5" /> Établissements ({data?.tenantsCount ?? '...'})
            </Button>
          </Link>

          <Link to={'/superadmin/abonnements' as any}>
            <Button variant="outline" size="sm" className="text-xs gap-1.5 border-purple-300 text-purple-700 hover:bg-purple-50">
              <CreditCard className="w-3.5 h-3.5" /> Forfaits SaaS
            </Button>
          </Link>

          {/* Sélecteur de Devise et Modèle Économique */}
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-2.5 py-1.5 rounded-xl">
            <Globe className="w-3.5 h-3.5 text-slate-500" />
            <select
              value={selectedCurrency}
              onChange={(e) => setSelectedCurrency(e.target.value)}
              className="text-xs bg-transparent font-bold text-gray-800 border-none outline-none cursor-pointer"
            >
              {Object.values(SUPPORTED_CURRENCIES).map((c) => (
                <option key={c.code} value={c.code}>
                  {c.flag} {c.code} ({c.annualFee.toLocaleString('fr-FR')} {c.symbol}/an)
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2.5 bg-emerald-50 px-3.5 py-1.5 rounded-xl border border-emerald-200">
            <span className="text-base">🎉</span>
            <div className="text-xs">
              <span className="font-bold text-emerald-950">
                {currConfig.annualFee.toLocaleString('fr-FR')} {currConfig.symbol} / an / élève
              </span>
              <div className="text-[10px] text-emerald-800">
                Dispatché selon échéances · 100% Gratuit écoles
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── BANNIÈRE D'ALERTE DÉCAISSEMENTS EN ATTENTE (Si demande présente) ── */}
      {data && data.pendingCount > 0 && (
        <div className="bg-gradient-to-r from-amber-500 via-amber-600 to-orange-600 text-white p-4 sm:p-5 rounded-2xl shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-in fade-in">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 bg-white/20 rounded-xl flex items-center justify-center shrink-0">
              <ArrowDownToLine className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="bg-white text-amber-900 font-extrabold text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Action Requise
                </span>
                <span className="font-semibold text-sm">
                  {data.pendingCount} demande{data.pendingCount > 1 ? 's' : ''} de décaissement en attente
                </span>
              </div>
              <p className="text-amber-100 text-xs mt-0.5">
                Total à reverser vers les écoles : <strong className="text-white text-sm">{data.pendingDisbursementsSum.toLocaleString('fr-FR')} FCFA</strong>. Aucun frais n'est déduit aux écoles.
              </p>
            </div>
          </div>
          <a href="#section-decaissements">
            <Button size="sm" className="bg-white text-amber-900 hover:bg-amber-100 font-bold text-xs gap-1.5 shadow-sm">
              Traiter les demandes <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </a>
        </div>
      )}

      {/* ── KPIS GLOBAUX RÉELS DU SYSTÈME AVEC CUMUL COMMISSIONS ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        
        {/* Total Établissements */}
        <div className="bg-white p-5 rounded-2xl border shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Écoles & Universités</span>
            <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
              <School className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-gray-900">{data?.tenantsCount ?? '...'}</span>
            <span className="text-xs text-blue-600 font-medium bg-blue-50 px-2 py-0.5 rounded-md">
              Partenaires
            </span>
          </div>
          <p className="text-xs text-gray-400">Établissements actifs sur Eurêka</p>
        </div>

        {/* Total Élèves Inscrits */}
        <div className="bg-white p-5 rounded-2xl border shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Élèves & Étudiants</span>
            <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
              <GraduationCap className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-gray-900">{data?.totalStudents ?? '...'}</span>
            <span className="text-xs text-emerald-700 font-medium bg-emerald-50 px-2 py-0.5 rounded-md">
              Inscrits
            </span>
          </div>
          <p className="text-xs text-gray-400">Effectif total dans les établissements</p>
        </div>

        {/* Total Utilisateurs dans le système */}
        <div className="bg-white p-5 rounded-2xl border shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Utilisateurs Système</span>
            <div className="w-10 h-10 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-gray-900">{data?.totalUsers ?? '...'}</span>
            <span className="text-xs text-purple-700 font-medium bg-purple-50 px-2 py-0.5 rounded-md">
              Comptes actifs
            </span>
          </div>
          <p className="text-xs text-gray-400">Admins, comptables, enseignants</p>
        </div>

        {/* Total Encaissé sur le compte INEXIUMUS */}
        <div className="bg-gradient-to-br from-emerald-950 via-emerald-900 to-stone-900 text-white p-5 rounded-2xl shadow-sm space-y-2 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-emerald-300 uppercase tracking-wider">Encaissé INEXIUMUS</span>
            <div className="w-10 h-10 bg-emerald-800/80 text-emerald-300 rounded-xl flex items-center justify-center">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-emerald-400">
              {(data?.totalPaymentsSum || 0).toLocaleString('fr-FR')}
            </span>
            <span className="text-xs font-bold text-emerald-200">FCFA</span>
          </div>
          <p className="text-xs text-emerald-300/80">
            Reversé aux écoles (100%) : <strong className="text-white">{(data?.totalDisbursedSum || 0).toLocaleString('fr-FR')} FCFA</strong>
          </p>
        </div>

        {/* Potentiel Annuel & Cumul des Commissions INEXIUMUS */}
        <div className="bg-gradient-to-br from-amber-950 via-stone-900 to-amber-900 text-white p-5 rounded-2xl shadow-sm space-y-2 relative overflow-hidden border border-amber-500/30">
          <div className="absolute -right-4 -bottom-4 w-20 h-20 bg-amber-500/10 rounded-full blur-xl pointer-events-none" />
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-amber-300 uppercase tracking-wider">Potentiel Annuel</span>
            <div className="w-10 h-10 bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-xl flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-amber-400">
              {((data?.totalStudents || 0) * currConfig.annualFee).toLocaleString('fr-FR')}
            </span>
            <span className="text-xs font-bold text-amber-200">{currConfig.symbol}</span>
          </div>
          <div className="text-[11px] text-amber-200/80 space-y-0.5 pt-0.5">
            <div className="flex justify-between">
              <span>Encaissé à ce jour :</span>
              <span className="font-bold text-white">
                {(data?.totalCommissionsEarned || 0).toLocaleString('fr-FR')} FCFA
              </span>
            </div>
            <div className="flex justify-between">
              <span>Tarif annuel parent :</span>
              <span className="font-semibold text-amber-300">
                {currConfig.annualFee.toLocaleString('fr-FR')} {currConfig.symbol}/an (dispatché)
              </span>
            </div>
          </div>
        </div>

      </div>

      {/* ── BANDEAU SYNTHÈSE DES COMMISSIONS INEXIUMUS & CHIFFRE D'AFFAIRES ── */}
      <div className="bg-white rounded-2xl border shadow-sm p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
              <Percent className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-base text-gray-900 flex items-center gap-2">
                Bilan & Cumul des Commissions Plateforme INEXIUMUS
                <span className="text-xs bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold">
                  Gestion 100% Gratuite pour les Écoles
                </span>
              </h3>
              <p className="text-xs text-gray-500">
                Abonnement annuel de {currConfig.annualFee.toLocaleString('fr-FR')} {currConfig.symbol} par élève réglé par le parent, dispatché selon les échéances de l'établissement. L'établissement perçoit 100% de sa scolarité.
              </p>
            </div>
          </div>
          <div className="text-xs text-right">
            <span className="text-gray-400">Scolarités Écoles Encaissées : </span>
            <strong className="text-gray-900 font-extrabold text-sm">
              {(data?.totalPaymentsSum || 0).toLocaleString('fr-FR')} FCFA
            </strong>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-1">
          {/* Potentiel Annuel Global */}
          <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200/80 space-y-1">
            <div className="text-[10px] font-bold text-amber-800 uppercase tracking-wider">Potentiel Annuel Global</div>
            <div className="text-xl font-black text-amber-900">
              {((data?.totalStudents || 0) * currConfig.annualFee).toLocaleString('fr-FR')} {currConfig.symbol}
            </div>
            <p className="text-[11px] text-amber-700/80">{currConfig.annualFee.toLocaleString('fr-FR')} {currConfig.symbol} × {data?.totalStudents ?? 0} élèves inscrits</p>
          </div>

          {/* Frais annuel parent */}
          <div className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-200/80 space-y-1">
            <div className="text-[10px] font-bold text-blue-800 uppercase tracking-wider">Frais Annuel par Élève</div>
            <div className="text-xl font-black text-blue-900">
              {currConfig.annualFee.toLocaleString('fr-FR')} {currConfig.symbol} / an
            </div>
            <p className="text-[11px] text-blue-700/80">Dispatché sur les échéances de chaque école</p>
          </div>

          {/* Part retenue sur l'école */}
          <div className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200/80 space-y-1">
            <div className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">Retenue sur l'Établissement</div>
            <div className="text-xl font-black text-emerald-900">
              0 FCFA (0%)
            </div>
            <p className="text-[11px] text-emerald-700/80">La gestion est 100% gratuite pour les écoles</p>
          </div>

          {/* Commissions perçues à ce jour */}
          <div className="p-3.5 rounded-xl bg-purple-50/70 border border-purple-200/80 space-y-1">
            <div className="text-[10px] font-bold text-purple-800 uppercase tracking-wider">Commissions Encaissées</div>
            <div className="text-xl font-black text-purple-900">
              {(data?.totalCommissionsEarned || 0).toLocaleString('fr-FR')} FCFA
            </div>
            <p className="text-[11px] text-purple-700/80">Sur {data?.totalPaymentsCount ?? 0} paiements parents reçus</p>
          </div>
        </div>
      </div>

      {/* ── SECTION DÉDIÉE : DEMANDES DE DÉCAISSEMENT DES ÉCOLES ── */}
      <div id="section-decaissements" className="bg-white rounded-2xl border shadow-sm p-6 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-5">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 bg-cyan-100 text-cyan-800 rounded-xl flex items-center justify-center">
                <ArrowDownToLine className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-extrabold text-xl text-gray-900 flex items-center gap-2">
                  Demandes de Décaissement des Établissements
                  {data && data.pendingCount > 0 && (
                    <span className="bg-amber-100 text-amber-800 text-xs font-bold px-2.5 py-0.5 rounded-full border border-amber-300">
                      {data.pendingCount} en attente
                    </span>
                  )}
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Reversement des fonds collectés via le compte Wave/Mobile Money Business d'INEXIUMUS vers les comptes des écoles.
                </p>
              </div>
            </div>
          </div>

          {/* Filtres par statut */}
          <div className="flex items-center gap-1.5 bg-gray-100 p-1 rounded-xl text-xs font-semibold overflow-x-auto">
            {[
              { id: 'all', label: 'Toutes' },
              { id: 'pending', label: `En attente (${data?.pendingCount || 0})` },
              { id: 'processing', label: 'En cours' },
              { id: 'completed', label: 'Effectuées' },
              { id: 'rejected', label: 'Rejetées' },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setDisbursementFilter(f.id)}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  disbursementFilter === f.id
                    ? 'bg-white text-gray-900 shadow-xs'
                    : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tableau des demandes */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-gray-50 text-gray-500 uppercase text-[10px] tracking-wider border-b">
              <tr>
                <th className="px-4 py-3 font-bold">Réf & Date</th>
                <th className="px-4 py-3 font-bold">Établissement</th>
                <th className="px-4 py-3 font-bold">Demandé par</th>
                <th className="px-4 py-3 font-bold">Montant Brut</th>
                <th className="px-4 py-3 font-bold">Retenue École</th>
                <th className="px-4 py-3 font-bold">Net à reverser</th>
                <th className="px-4 py-3 font-bold">Canal & Numéro de Réception</th>
                <th className="px-4 py-3 font-bold">Statut</th>
                <th className="px-4 py-3 font-bold text-right">Actions SuperAdmin</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-gray-700">
              {dashboardQuery.isLoading ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-gray-400">
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin text-primary" />
                      Chargement des demandes de décaissement…
                    </div>
                  </td>
                </tr>
              ) : filteredDisbursements.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-gray-400">
                    Aucune demande de décaissement dans cette vue.
                  </td>
                </tr>
              ) : (
                filteredDisbursements.map((req) => {
                  const payoutMeta = PAYOUT_ICONS[req.payout_method] || { label: req.payout_method, badge: 'bg-gray-100 text-gray-700', icon: '💳' };
                  const isPending = req.status === 'pending';
                  const isProcessing = req.status === 'processing';

                  return (
                    <tr key={req.id} className="hover:bg-gray-50/80 transition-colors">
                      {/* Réf & Date */}
                      <td className="px-4 py-3.5">
                        <div className="font-mono font-bold text-gray-900 text-xs">{req.reference || req.id.slice(0, 8)}</div>
                        <div className="text-[11px] text-gray-400 mt-0.5">
                          {new Date(req.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </td>

                      {/* Établissement */}
                      <td className="px-4 py-3.5">
                        <div className="font-bold text-gray-900">{req.tenant?.name || 'Établissement'}</div>
                        <div className="flex items-center gap-1 mt-0.5">
                          {(req.tenant?.school_types || []).map((t) => (
                            <span key={t} className="text-[9px] bg-gray-100 text-gray-600 px-1.5 py-0.2 rounded">
                              {t}
                            </span>
                          ))}
                        </div>
                      </td>

                      {/* Demandeur */}
                      <td className="px-4 py-3.5">
                        <div className="font-medium text-gray-900 text-xs">{req.requester?.full_name || 'Service Financier'}</div>
                        <div className="text-[11px] text-gray-400">{req.requester?.email || '—'}</div>
                      </td>

                      {/* Montant Brut */}
                      <td className="px-4 py-3.5 font-semibold text-gray-900">
                        {Number(req.amount_requested).toLocaleString('fr-FR')} FCFA
                      </td>

                      {/* Retenue École */}
                      <td className="px-4 py-3.5 text-xs font-medium">
                        {Number(req.platform_fee) > 0 ? (
                          <span className="text-amber-700">-{Number(req.platform_fee).toLocaleString('fr-FR')} FCFA</span>
                        ) : (
                          <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                            0 FCFA · Gratuit
                          </span>
                        )}
                      </td>

                      {/* Net à reverser */}
                      <td className="px-4 py-3.5 font-extrabold text-emerald-700 text-sm">
                        {Number(req.amount_net).toLocaleString('fr-FR')} FCFA
                      </td>

                      {/* Canal & Coordonnées */}
                      <td className="px-4 py-3.5">
                        <div className="space-y-1">
                          <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md border ${payoutMeta.badge}`}>
                            <span>{payoutMeta.icon}</span> {payoutMeta.label}
                          </span>
                          {req.payout_number && (
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono text-xs font-bold text-gray-900">
                                {req.payout_number}
                              </span>
                              <button
                                onClick={() => handleCopy(req.payout_number!, req.id)}
                                title="Copier le numéro"
                                className="text-gray-400 hover:text-gray-700 p-0.5 rounded"
                              >
                                {copiedId === req.id ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                              </button>
                            </div>
                          )}
                          {req.payout_bank && (
                            <div className="text-[10px] text-gray-500 font-mono">
                              {req.payout_bank} {req.payout_iban ? `· ${req.payout_iban}` : ''}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Statut */}
                      <td className="px-4 py-3.5">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${
                          req.status === 'pending'
                            ? 'bg-amber-100 text-amber-900 border border-amber-300 animate-pulse'
                            : req.status === 'processing'
                            ? 'bg-blue-100 text-blue-900 border border-blue-300'
                            : req.status === 'completed'
                            ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                            : 'bg-red-100 text-red-900 border border-red-300'
                        }`}>
                          {req.status === 'pending' && <Clock className="w-3 h-3" />}
                          {req.status === 'processing' && <RefreshCw className="w-3 h-3 animate-spin" />}
                          {req.status === 'completed' && <CheckCircle2 className="w-3 h-3" />}
                          {req.status === 'rejected' && <XCircle className="w-3 h-3" />}
                          {req.status === 'pending' ? 'En attente' :
                           req.status === 'processing' ? 'En virement' :
                           req.status === 'completed' ? 'Payé / Reversé' : 'Rejeté'}
                        </span>
                        {req.processed_at && (
                          <div className="text-[10px] text-gray-400 mt-0.5">
                            Payé le {new Date(req.processed_at).toLocaleDateString('fr-FR')}
                          </div>
                        )}
                        {req.rejected_reason && (
                          <div className="text-[10px] text-red-600 mt-0.5 font-medium line-clamp-1" title={req.rejected_reason}>
                            Motif : {req.rejected_reason}
                          </div>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {isPending && (
                            <>
                              <Button
                                size="sm"
                                onClick={() => {
                                  setSelectedDisbursement(req);
                                  setValidationModalOpen(true);
                                }}
                                className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-1 px-2.5 shadow-xs"
                              >
                                <CheckCheck className="w-3.5 h-3.5" /> Valider & Payer
                              </Button>

                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => processDisbursementMutation.mutate({ id: req.id, status: 'processing' })}
                                disabled={processDisbursementMutation.isPending}
                                className="h-7 text-xs border-blue-300 text-blue-700 hover:bg-blue-50 px-2"
                              >
                                En cours
                              </Button>

                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setSelectedDisbursement(req);
                                  setRejectionModalOpen(true);
                                }}
                                className="h-7 text-xs border-red-300 text-red-700 hover:bg-red-50 px-2"
                              >
                                Rejeter
                              </Button>
                            </>
                          )}

                          {isProcessing && (
                            <>
                              <Button
                                size="sm"
                                onClick={() => {
                                  setSelectedDisbursement(req);
                                  setValidationModalOpen(true);
                                }}
                                className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-1 px-2.5"
                              >
                                <CheckCheck className="w-3.5 h-3.5" /> Confirmer Paiement
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setSelectedDisbursement(req);
                                  setRejectionModalOpen(true);
                                }}
                                className="h-7 text-xs border-red-300 text-red-700 hover:bg-red-50 px-2"
                              >
                                Rejeter
                              </Button>
                            </>
                          )}

                          {req.status === 'completed' && (
                            <span className="text-xs text-emerald-700 font-bold flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Reversé
                            </span>
                          )}

                          {req.status === 'rejected' && (
                            <span className="text-xs text-red-600 font-medium">Rejeté</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── SECTION : STATISTIQUES DÉTAILLÉES PAR ÉTABLISSEMENT ── */}
      <div className="bg-white rounded-2xl border shadow-sm p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
          <div>
            <h2 className="font-bold text-xl text-gray-900 flex items-center gap-2">
              <School className="w-5 h-5 text-primary" />
              Statistiques Détaillées par Établissement
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Élèves inscrits, effectifs collaborateurs, encaissements et soldes à reverser par école.
            </p>
          </div>
          <Link to={'/superadmin/etablissements' as any}>
            <Button variant="outline" size="sm" className="text-xs gap-1.5">
              Gérer les écoles <ArrowUpRight className="w-3.5 h-3.5" />
            </Button>
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-gray-50 text-gray-500 uppercase text-[10px] tracking-wider border-b">
              <tr>
                <th className="px-4 py-3 font-bold">Établissement</th>
                <th className="px-4 py-3 font-bold">Niveaux / Types</th>
                <th className="px-4 py-3 font-bold text-center">Élèves</th>
                <th className="px-4 py-3 font-bold text-center">Classes</th>
                <th className="px-4 py-3 font-bold text-center">Échéances</th>
                <th className="px-4 py-3 font-bold">Frais / Échéance</th>
                <th className="px-4 py-3 font-bold">Total Encaissé</th>
                <th className="px-4 py-3 font-bold text-amber-700">Potentiel Annuel</th>
                <th className="px-4 py-3 font-bold text-emerald-700">Commissions Encaissées</th>
                <th className="px-4 py-3 font-bold">Décaissements En Cours</th>
                <th className="px-4 py-3 font-bold">Solde Disponible École</th>
                <th className="px-4 py-3 font-bold text-right">Statut KYC</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-gray-700">
              {dashboardQuery.isLoading ? (
                <tr>
                  <td colSpan={12} className="px-4 py-6 text-center text-gray-400">
                    Chargement des statistiques établissements…
                  </td>
                </tr>
              ) : (data?.establishments || []).length === 0 ? (
                <tr>
                  <td colSpan={12} className="px-4 py-6 text-center text-gray-400">
                    Aucun établissement configuré.
                  </td>
                </tr>
              ) : (
                data?.establishments.map((est) => (
                  <tr key={est.id} className="hover:bg-gray-50/70 transition-colors">
                    {/* Nom école */}
                    <td className="px-4 py-3.5 font-bold text-gray-900">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs">
                          {est.name.charAt(0)}
                        </div>
                        <div>
                          <div>{est.name}</div>
                          <div className="text-[10px] text-gray-400 font-mono font-normal">ID: {est.id.slice(0, 8)}…</div>
                        </div>
                      </div>
                    </td>

                    {/* Niveaux */}
                    <td className="px-4 py-3.5">
                      <div className="flex flex-wrap gap-1">
                        {est.school_types.length > 0 ? (
                          est.school_types.map((t) => (
                            <span key={t} className="text-[10px] font-semibold bg-gray-100 text-gray-700 px-2 py-0.5 rounded-md border">
                              {t}
                            </span>
                          ))
                        ) : (
                          <span className="text-gray-400 text-xs">Général</span>
                        )}
                      </div>
                    </td>

                    {/* Nb Élèves */}
                    <td className="px-4 py-3.5 text-center">
                      <span className="inline-flex items-center gap-1 font-extrabold text-gray-900 bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded-full text-xs">
                        <GraduationCap className="w-3 h-3" /> {est.students_count}
                      </span>
                    </td>

                    {/* Nb Classes */}
                    <td className="px-4 py-3.5 text-center font-semibold text-gray-700">
                      {est.classes_count}
                    </td>

                    {/* Échéances configurées */}
                    <td className="px-4 py-3.5 text-center">
                      <span className="inline-flex items-center gap-1 font-bold text-blue-800 bg-blue-50 px-2 py-0.5 rounded-full text-xs">
                        {est.schedules_count} tranche{est.schedules_count > 1 ? 's' : ''}
                      </span>
                    </td>

                    {/* Quote-part par échéance */}
                    <td className="px-4 py-3.5 text-xs font-semibold text-gray-700">
                      {est.fee_per_schedule.toLocaleString('fr-FR')} FCFA
                    </td>

                    {/* Total Encaissé */}
                    <td className="px-4 py-3.5 font-bold text-gray-900">
                      {est.total_collected.toLocaleString('fr-FR')} FCFA
                    </td>

                    {/* Potentiel Annuel */}
                    <td className="px-4 py-3.5 font-bold text-amber-900 text-xs">
                      {est.annual_potential.toLocaleString('fr-FR')} FCFA
                    </td>

                    {/* Commission générée */}
                    <td className="px-4 py-3.5 font-extrabold text-emerald-800">
                      {est.commission_generated.toLocaleString('fr-FR')} FCFA
                    </td>

                    {/* En attente */}
                    <td className="px-4 py-3.5 text-xs text-amber-700 font-semibold">
                      {est.pending_disbursements > 0 ? (
                        <span className="bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                          {est.pending_disbursements.toLocaleString('fr-FR')} FCFA
                        </span>
                      ) : (
                        <span className="text-gray-400">0 FCFA</span>
                      )}
                    </td>

                    {/* Solde restant disponible */}
                    <td className="px-4 py-3.5 font-extrabold text-emerald-700 text-xs sm:text-sm">
                      {est.available_balance.toLocaleString('fr-FR')} FCFA
                    </td>

                    {/* KYC */}
                    <td className="px-4 py-3.5 text-right">
                      <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        est.kyc_status === 'approved' ? 'bg-emerald-100 text-emerald-800' :
                        est.kyc_status === 'under_review' ? 'bg-blue-100 text-blue-800' :
                        est.kyc_status === 'pending' ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {est.kyc_status === 'approved' ? 'Vérifié' : est.kyc_status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {data && data.establishments.length > 0 && (
              <tfoot className="bg-gray-100/90 font-bold border-t-2 border-gray-300 text-xs">
                <tr>
                  <td className="px-4 py-3 text-gray-900">TOTAL CONSOLIDÉ ({data.tenantsCount} écoles)</td>
                  <td className="px-4 py-3 text-gray-400">—</td>
                  <td className="px-4 py-3 text-center text-emerald-800 font-extrabold">{data.totalStudents}</td>
                  <td className="px-4 py-3 text-center text-gray-800">{data.totalClasses}</td>
                  <td className="px-4 py-3 text-center text-gray-400">—</td>
                  <td className="px-4 py-3 text-gray-400">—</td>
                  <td className="px-4 py-3 text-gray-900 font-black">{data.totalPaymentsSum.toLocaleString('fr-FR')} FCFA</td>
                  <td className="px-4 py-3 text-amber-900 font-black">{(data.totalAnnualPotential || 0).toLocaleString('fr-FR')} FCFA</td>
                  <td className="px-4 py-3 text-emerald-900 font-black">{(data.totalCommissionsEarned || 0).toLocaleString('fr-FR')} FCFA</td>
                  <td className="px-4 py-3 text-amber-700">{data.pendingDisbursementsSum.toLocaleString('fr-FR')} FCFA</td>
                  <td className="px-4 py-3 text-emerald-800 font-black">
                    {(data.totalPaymentsSum - data.pendingDisbursementsSum - data.totalDisbursedSum).toLocaleString('fr-FR')} FCFA
                  </td>
                  <td className="px-4 py-3 text-right text-gray-400">—</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* ── SECTION : GRAPHIQUE DES VOLUMES FINANCIERS PAR ÉCOLE ── */}
      {barChartData.length > 0 && (
        <div className="bg-white p-6 rounded-2xl border shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b pb-4">
            <div>
              <h3 className="font-bold text-lg text-gray-900">Volumes Encaissés vs Décaissés par École</h3>
              <p className="text-xs text-gray-500">Comparatif des flux financiers reçus sur INEXIUMUS et des montants reversés.</p>
            </div>
            <div className="flex items-center gap-1 text-xs text-emerald-700 font-semibold bg-emerald-50 px-2.5 py-1 rounded-lg">
              <ShieldCheck className="w-3.5 h-3.5" /> Flux Réels
            </div>
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barChartData} margin={{ top: 10, right: 30, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" stroke="#888888" fontSize={12} />
                <YAxis stroke="#888888" fontSize={12} tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', borderColor: '#e5e7eb' }}
                  formatter={(value: any, name: any) => [
                    `${Number(value).toLocaleString('fr-FR')} FCFA`,
                    name === 'encaisse' ? 'Total Encaissé' : name === 'decaisse' ? 'Total Reversé' : 'Solde Disponible'
                  ]}
                />
                <Legend formatter={(val) => val === 'encaisse' ? 'Encaissé INEXIUMUS' : val === 'decaisse' ? 'Reversé à l\'école' : 'Solde restant'} />
                <Bar dataKey="encaisse" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="decaisse" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="solde" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* ── SECTION : DOSSIERS KYC RÉCENTS ── */}
      <div className="bg-white rounded-2xl border shadow-sm p-6 space-y-4">
        <div className="flex items-center justify-between border-b pb-4">
          <div>
            <h3 className="font-bold text-lg text-gray-900">Dossiers d'Agrément KYC Établissements</h3>
            <p className="text-xs text-gray-500">Contrôle de conformité et validation légale des nouveaux établissements.</p>
          </div>
          <Link to="/superadmin/kyc" className="text-xs font-semibold text-primary hover:underline flex items-center gap-1">
            Voir tous les dossiers <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-gray-500 border-b text-xs">
              <tr>
                <th className="px-4 py-3 font-medium">Établissement</th>
                <th className="px-4 py-3 font-medium">Directeur</th>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Statut</th>
                <th className="px-4 py-3 font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y text-gray-700 text-xs">
              {dashboardQuery.isLoading ? (
                <tr><td colSpan={5} className="px-4 py-6 text-center text-gray-400">Chargement...</td></tr>
              ) : (data?.recentKyc || []).length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-6 text-center text-gray-400">Aucun dossier KYC soumis récemment.</td></tr>
              ) : (
                data?.recentKyc.map((app: any) => (
                  <tr key={app.id} className="hover:bg-gray-50/80 transition-colors">
                    <td className="px-4 py-3 font-bold text-gray-900">{app.school_name}</td>
                    <td className="px-4 py-3">{app.director_name} ({app.director_email})</td>
                    <td className="px-4 py-3 text-gray-500">{new Date(app.created_at).toLocaleDateString('fr-FR')}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        app.status === 'pending' ? 'bg-amber-100 text-amber-800' :
                        app.status === 'under_review' ? 'bg-blue-100 text-blue-800' :
                        app.status === 'approved' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {app.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link 
                        to="/superadmin/kyc/$id" 
                        params={{ id: app.id }}
                        className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                      >
                        <Eye className="w-3.5 h-3.5" /> Examiner
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── MODAL : CONFIRMER ET VALIDER LE PAIEMENT (DÉCAISSEMENT) ── */}
      <Dialog open={validationModalOpen} onOpenChange={setValidationModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-emerald-700">
              <CheckCheck className="w-5 h-5" />
              Confirmer le Paiement du Décaissement
            </DialogTitle>
            <DialogDescription className="text-xs">
              Vous vous apprêtez à marquer cette demande comme reversée depuis le compte Business INEXIUMUS vers l'école.
            </DialogDescription>
          </DialogHeader>

          {selectedDisbursement && (
            <div className="space-y-4 py-2 text-xs">
              {/* Carte récapitulative */}
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 space-y-2">
                <div className="flex justify-between items-center text-emerald-950 font-bold">
                  <span>École :</span>
                  <span>{selectedDisbursement.tenant?.name}</span>
                </div>
                <div className="flex justify-between items-center text-gray-600">
                  <span>Montant Brut demandé :</span>
                  <span>{Number(selectedDisbursement.amount_requested).toLocaleString('fr-FR')} FCFA</span>
                </div>
                <div className="flex justify-between items-center text-emerald-800 font-medium">
                  <span>Frais retenus sur l'école :</span>
                  <span className="font-bold text-emerald-700">
                    {Number(selectedDisbursement.platform_fee) > 0
                      ? `-${Number(selectedDisbursement.platform_fee).toLocaleString('fr-FR')} FCFA`
                      : '0 FCFA · 100% Gratuit 🎉'}
                  </span>
                </div>
                <div className="border-t border-emerald-200 pt-2 flex justify-between items-center text-emerald-900 font-black text-sm">
                  <span>Net à envoyer :</span>
                  <span className="text-base text-emerald-700">{Number(selectedDisbursement.amount_net).toLocaleString('fr-FR')} FCFA</span>
                </div>
              </div>

              {/* Coordonnées destinataire */}
              <div className="bg-gray-50 border rounded-xl p-3 space-y-1.5">
                <div className="text-[11px] font-bold text-gray-500 uppercase">Coordonnées du bénéficiaire</div>
                <div className="flex items-center justify-between">
                  <span className="font-medium text-gray-700">Canal :</span>
                  <span className="font-bold text-gray-900">{PAYOUT_ICONS[selectedDisbursement.payout_method]?.label || selectedDisbursement.payout_method}</span>
                </div>
                {selectedDisbursement.payout_number && (
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-gray-700">Numéro destinataire :</span>
                    <div className="flex items-center gap-1.5 font-mono font-bold text-sm text-gray-900">
                      <span>{selectedDisbursement.payout_number}</span>
                      <button
                        type="button"
                        onClick={() => handleCopy(selectedDisbursement.payout_number!, 'modal')}
                        className="text-gray-400 hover:text-gray-700"
                        title="Copier"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Formulaire référence */}
              <div className="space-y-2">
                <label className="font-semibold text-gray-700 block">
                  Réf. de Transaction Wave / Mobile Money <span className="text-red-500">*</span>
                </label>
                <Input
                  placeholder="Ex: WV-2026-981248 ou ID transfert"
                  value={transactionRef}
                  onChange={(e) => setTransactionRef(e.target.value)}
                  className="text-xs"
                />
              </div>

              <div className="space-y-2">
                <label className="font-semibold text-gray-700 block">Note administrative (optionnel)</label>
                <Input
                  placeholder="Ex: Virement Wave Business effectué par Marie"
                  value={adminNote}
                  onChange={(e) => setAdminNote(e.target.value)}
                  className="text-xs"
                />
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setValidationModalOpen(false)}
              disabled={processDisbursementMutation.isPending}
              className="text-xs"
            >
              Annuler
            </Button>
            <Button
              size="sm"
              onClick={() => {
                if (!selectedDisbursement) return;
                processDisbursementMutation.mutate({
                  id: selectedDisbursement.id,
                  status: 'completed',
                  txRef: transactionRef.trim(),
                  adminNote: adminNote.trim(),
                });
              }}
              disabled={processDisbursementMutation.isPending}
              className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-1"
            >
              {processDisbursementMutation.isPending ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              Confirmer & Marquer Payé
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── MODAL : REJETER UNE DEMANDE DE DÉCAISSEMENT ── */}
      <Dialog open={rejectionModalOpen} onOpenChange={setRejectionModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <XCircle className="w-5 h-5" />
              Rejeter la Demande de Décaissement
            </DialogTitle>
            <DialogDescription className="text-xs">
              Veuillez indiquer le motif du rejet qui sera transmis à l'école ({selectedDisbursement?.tenant?.name}).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div className="space-y-1.5">
              <label className="font-semibold text-gray-700 block">Motif du rejet <span className="text-red-500">*</span></label>
              <textarea
                rows={3}
                placeholder="Ex: Numéro Wave invalide, montant supérieur au solde disponible, coordonnées non conformes..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="w-full border rounded-lg p-2.5 text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-red-500/20"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setRejectionModalOpen(false)}
              disabled={processDisbursementMutation.isPending}
              className="text-xs"
            >
              Annuler
            </Button>
            <Button
              size="sm"
              onClick={() => {
                if (!selectedDisbursement) return;
                if (!rejectReason.trim()) {
                  toast.error('Veuillez renseigner un motif de rejet');
                  return;
                }
                processDisbursementMutation.mutate({
                  id: selectedDisbursement.id,
                  status: 'rejected',
                  reason: rejectReason.trim(),
                });
              }}
              disabled={processDisbursementMutation.isPending || !rejectReason.trim()}
              className="text-xs bg-red-600 hover:bg-red-700 text-white font-bold"
            >
              Confirmer le rejet
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  )
}
