import { createFileRoute, Link } from '@tanstack/react-router';
import { useState, useMemo } from 'react';
import { AppShell } from '@/components/AppShell';
import { useServices, CantineSubscriber, DailyMenu } from '@/hooks/useServices';
import { useStudents } from '@/hooks/useStudents';
import { useClasses } from '@/hooks/useClasses';
import { useAuth } from '@/hooks/useAuth';
import {
  UtensilsCrossed, Calendar, CheckCircle2, Clock, Users,
  Plus, Search, Filter, DollarSign, AlertCircle, ChefHat,
  Sparkles, Check, X, ArrowRight, Printer, Download, Banknote,
  Receipt, Coffee, Salad, Apple, Trash2, RefreshCw, CalendarDays,
  ShieldAlert, ExternalLink
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { toast } from 'sonner';

export const Route = createFileRoute('/cantine')({
  head: () => ({
    meta: [
      { title: "Gestion de la Cantine — Eurêka ERP" },
      { name: "description", content: "Gestion de la restauration scolaire, menus, abonnements élèves et facturation." },
    ],
  }),
  component: CantinePage,
});

export function CantinePage() {
  const { profile } = useAuth();
  const {
    cantinePlans,
    cantineSubscribers,
    weeklyMenus,
    mealAttendance,
    cantineStats,
    registerCantineSubscriber,
    recordCantinePayment,
    toggleMealAttendance,
    updateMenu,
    addMenu,
    deleteMenu,
    resetDefaultMenus,
  } = useServices();

  const { students } = useStudents();
  const { classes } = useClasses();

  // ── SÉCURITÉ & RESTRICTION PAR RÔLE ────────────────────────
  // Seuls les Admins, Comptables et Parents d'élèves ont accès à la cantine
  const userRole = profile?.role || '';
  const isAdmin = ['admin', 'director', 'superadmin'].includes(userRole);
  const isAccountant = ['accountant', 'cashier'].includes(userRole);
  const isParent = ['parent', 'responsible'].includes(userRole);
  const isAuthorized = isAdmin || isAccountant || isParent;

  // Filtrage des enfants rattachés pour le rôle parent
  const myChildren = useMemo(() => {
    if (!isParent) return [];
    return students.filter((s: any) => {
      const emailMatch = profile?.email && s.guardian_email && s.guardian_email.toLowerCase() === profile.email.toLowerCase();
      const phoneMatch = profile?.phone && s.guardian_phone && s.guardian_phone.replace(/\s+/g, '').includes(profile.phone.replace(/\s+/g, ''));
      const userMatch = s.user_id === profile?.id;
      const nameMatch = profile?.full_name && s.guardian_name && s.guardian_name.toLowerCase().includes(profile.full_name.toLowerCase());
      return emailMatch || phoneMatch || userMatch || nameMatch;
    });
  }, [students, profile, isParent]);

  const myChildrenIds = useMemo(() => new Set(myChildren.map((c: any) => c.id)), [myChildren]);

  // Filtres
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'partial' | 'pending'>('all');
  const [activeTab, setActiveTab] = useState<'subscribers' | 'menus' | 'attendance' | 'plans'>('subscribers');

  // Modals
  const [isNewSubscriberOpen, setIsNewSubscriberOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedSubForPayment, setSelectedSubForPayment] = useState<CantineSubscriber | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Espèces');
  const [paymentNotes, setPaymentNotes] = useState('');

  // Nouveau souscripteur form state
  const [newSubStudentId, setNewSubStudentId] = useState('');
  const [newSubPlanId, setNewSubPlanId] = useState(cantinePlans[0]?.id || '');
  const [newSubDietary, setNewSubDietary] = useState('');

  // Gestion des menus
  const [editingMenu, setEditingMenu] = useState<DailyMenu | null>(null);
  const [isNewMenuOpen, setIsNewMenuOpen] = useState(false);
  const [newMenuDay, setNewMenuDay] = useState('Samedi');
  const [newMenuStarter, setNewMenuStarter] = useState('');
  const [newMenuMainDish, setNewMenuMainDish] = useState('');
  const [newMenuDessert, setNewMenuDessert] = useState('');
  const [newMenuSnack, setNewMenuSnack] = useState('');
  const [isPrintMenuOpen, setIsPrintMenuOpen] = useState(false);

  // Filtrage des abonnés
  const filteredSubscribers = cantineSubscribers.filter(sub => {
    // Si c'est un parent, filtrer UNIQUEMENT ses propres enfants
    if (isParent && !myChildrenIds.has(sub.student_id)) {
      return false;
    }

    const matchesSearch =
      sub.student_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sub.class_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sub.student_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sub.parent_name.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || sub.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Si l'utilisateur n'est pas autorisé (ex: enseignant, médecin, élève)
  if (!isAuthorized) {
    return (
      <AppShell
        title="Restauration & Cantine Scolaire"
        subtitle="Accès réservé"
      >
        <div className="max-w-xl mx-auto my-16 p-8 bg-card border border-border rounded-2xl shadow-sm text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center mx-auto shadow-inner">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-foreground">Accès Restreint</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Les données et la gestion de la restauration scolaire sont confidentielles et strictement réservées à la <strong>direction</strong>, au <strong>service comptabilité / intendance</strong> et aux <strong>parents d'élèves</strong>.
          </p>
          <div className="pt-2">
            <Link
              to="/"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground font-bold text-xs hover:bg-primary/90 transition-colors"
            >
              Retour au tableau de bord
            </Link>
          </div>
        </div>
      </AppShell>
    );
  }

  const handleRegisterSubscriber = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubStudentId) {
      toast.error("Veuillez sélectionner un élève");
      return;
    }

    const st = students.find((s: any) => s.id === newSubStudentId);
    if (!st) {
      toast.error("Élève introuvable");
      return;
    }

    const parentName = (st as any).user_profiles?.full_name || (st as any).guardian_name || 'Parent d\'élève';
    const parentPhone = (st as any).user_profiles?.phone || (st as any).guardian_phone || '';
    const className = (st as any).classes?.name || 'Sans classe';

    registerCantineSubscriber({
      student_id: st.id,
      student_name: `${st.first_name} ${st.last_name}`,
      student_code: st.student_code || 'ERK-MAT',
      class_name: className,
      parent_name: parentName,
      parent_phone: parentPhone,
      plan_id: newSubPlanId,
      plan_name: cantinePlans.find(p => p.id === newSubPlanId)?.name || 'Forfait Cantine',
      dietary_notes: newSubDietary,
    });

    setIsNewSubscriberOpen(false);
    setNewSubStudentId('');
    setNewSubDietary('');
  };

  const handlePaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSubForPayment) return;
    const amt = parseFloat(paymentAmount);
    if (isNaN(amt) || amt <= 0) {
      toast.error("Veuillez saisir un montant valide");
      return;
    }

    recordCantinePayment(selectedSubForPayment.id, amt, paymentMethod, paymentNotes);
    setIsPaymentModalOpen(false);
    setSelectedSubForPayment(null);
    setPaymentAmount('');
    setPaymentNotes('');
  };

  const handleCreateMenu = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMenuDay || !newMenuMainDish) {
      toast.error("Veuillez renseigner au minimum le jour et le plat principal");
      return;
    }

    addMenu({
      day: newMenuDay as any,
      date_label: newMenuDay,
      starter: newMenuStarter || 'Salade fraîche ou potage',
      main_dish: newMenuMainDish,
      dessert: newMenuDessert || 'Fruits locaux ou yaourt',
      snack: newMenuSnack || 'Pain au chocolat ou jus de fruit',
    });

    setIsNewMenuOpen(false);
    setNewMenuStarter('');
    setNewMenuMainDish('');
    setNewMenuDessert('');
    setNewMenuSnack('');
  };

  return (
    <AppShell
      title={isParent ? "Restauration & Cantine • Espace Famille" : "Restauration & Cantine Scolaire"}
      subtitle={
        isParent
          ? "Menus de la semaine, forfaits repas et pointage réfectoire de vos enfants"
          : isAccountant
          ? "Gestion comptable, encaissements cantine et suivi financier des abonnés"
          : "Gestion des forfaits repas, menus hebdomadaires, abonnements élèves et encaissements"
      }
      actions={
        <div className="flex items-center gap-2">
          {isParent ? (
            <Button
              onClick={() => setIsPrintMenuOpen(true)}
              variant="outline"
              className="gap-2 text-xs font-bold border-amber-300 text-amber-900 hover:bg-amber-50"
            >
              <Printer className="w-4 h-4" /> Imprimer les menus
            </Button>
          ) : (
            <Button
              onClick={() => setIsNewSubscriberOpen(true)}
              className="gap-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-sm"
            >
              <Plus className="w-4 h-4" /> Inscrire à la cantine
            </Button>
          )}
        </div>
      }
    >
      <div className="space-y-6">

        {/* ── BANDEAU KPI ADAPTÉ AU RÔLE ── */}
        {isParent ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-2xl border border-border bg-card p-4 sm:p-5 shadow-xs">
              <div className="flex items-center justify-between text-muted-foreground mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider">Mes Enfants Inscrits</span>
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-100 text-amber-800">
                  <Users className="w-4 h-4" />
                </div>
              </div>
              <div className="font-display text-2xl sm:text-3xl font-black text-foreground">
                {cantineSubscribers.filter(s => myChildrenIds.has(s.student_id)).length}
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">
                Sur {myChildren.length} enfant{myChildren.length > 1 ? 's' : ''} rattaché{myChildren.length > 1 ? 's' : ''}
              </p>
            </div>

            <div className="rounded-2xl border border-border bg-card p-4 sm:p-5 shadow-xs">
              <div className="flex items-center justify-between text-muted-foreground mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider">Repas Aujourd'hui</span>
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-100 text-emerald-800">
                  <ChefHat className="w-4 h-4" />
                </div>
              </div>
              <div className="font-display text-2xl sm:text-3xl font-black text-emerald-600">
                {cantineSubscribers.filter(s => myChildrenIds.has(s.student_id) && mealAttendance[s.student_id]).length}
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">Pointage réfectoire ce midi</p>
            </div>

            <div className="rounded-2xl border border-border bg-card p-4 sm:p-5 shadow-xs">
              <div className="flex items-center justify-between text-muted-foreground mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider">Reste à Régler</span>
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-purple-100 text-purple-800">
                  <DollarSign className="w-4 h-4" />
                </div>
              </div>
              <div className="font-display text-2xl sm:text-3xl font-black text-amber-700">
                {cantineSubscribers.filter(s => myChildrenIds.has(s.student_id)).reduce((acc, s) => acc + s.remaining, 0).toLocaleString('fr-FR')} <span className="text-xs text-muted-foreground font-normal">FCFA</span>
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">Solde cantine famille</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="rounded-2xl border border-border bg-card p-4 sm:p-5 shadow-xs">
              <div className="flex items-center justify-between text-muted-foreground mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider">Abonnés Actifs</span>
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-100 text-amber-800">
                  <Users className="w-4 h-4" />
                </div>
              </div>
              <div className="font-display text-2xl sm:text-3xl font-black text-foreground">
                {cantineStats.totalSubscribers}
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">Élèves inscrits au réfectoire</p>
            </div>

            <div className="rounded-2xl border border-border bg-card p-4 sm:p-5 shadow-xs">
              <div className="flex items-center justify-between text-muted-foreground mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider">Repas Servis Aujourd'hui</span>
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-100 text-emerald-800">
                  <ChefHat className="w-4 h-4" />
                </div>
              </div>
              <div className="font-display text-2xl sm:text-3xl font-black text-emerald-600">
                {cantineStats.todayPresent}
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">Pointages réfectoire validés</p>
            </div>

            <div className="rounded-2xl border border-border bg-card p-4 sm:p-5 shadow-xs">
              <div className="flex items-center justify-between text-muted-foreground mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider">Recettes Encaissées</span>
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-cyan-100 text-cyan-800">
                  <Banknote className="w-4 h-4" />
                </div>
              </div>
              <div className="font-display text-2xl sm:text-3xl font-black text-foreground">
                {cantineStats.totalRevenue.toLocaleString('fr-FR')} <span className="text-xs text-muted-foreground font-normal">FCFA</span>
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">Total payé par les familles</p>
            </div>

            <div className="rounded-2xl border border-border bg-card p-4 sm:p-5 shadow-xs">
              <div className="flex items-center justify-between text-muted-foreground mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider">Taux de Recouvrement</span>
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-purple-100 text-purple-800">
                  <DollarSign className="w-4 h-4" />
                </div>
              </div>
              <div className="font-display text-2xl sm:text-3xl font-black text-amber-700">
                {cantineStats.recoveryRate} %
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">
                Reste à recouvrer : {cantineStats.totalRemaining.toLocaleString('fr-FR')} F
              </p>
            </div>
          </div>
        )}

        {/* ── ONGLETS DE GESTION ── */}
        <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)}>
          <div className="flex items-center justify-between flex-wrap gap-4 border-b border-border pb-3">
            <TabsList className="bg-muted/70 p-1 rounded-xl">
              <TabsTrigger value="subscribers" className="gap-2 text-xs font-bold py-1.5 px-3">
                <Users className="w-3.5 h-3.5" />
                {isParent
                  ? `Mes Enfants (${cantineSubscribers.filter(s => myChildrenIds.has(s.student_id)).length})`
                  : `Abonnés & Facturation (${cantineSubscribers.length})`
                }
              </TabsTrigger>
              <TabsTrigger value="menus" className="gap-2 text-xs font-bold py-1.5 px-3">
                <UtensilsCrossed className="w-3.5 h-3.5" /> Menus de la Semaine
              </TabsTrigger>
              {isAdmin && (
                <TabsTrigger value="attendance" className="gap-2 text-xs font-bold py-1.5 px-3">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Pointage du Jour ({cantineStats.todayPresent}/{cantineStats.totalSubscribers})
                </TabsTrigger>
              )}
              {!isParent && (
                <TabsTrigger value="plans" className="gap-2 text-xs font-bold py-1.5 px-3">
                  <DollarSign className="w-3.5 h-3.5" /> Formules & Tarifs
                </TabsTrigger>
              )}
            </TabsList>
          </div>

          {/* ── TAB 1 : ABONNÉS & FACTURATION / VUE FAMILLE ── */}
          <TabsContent value="subscribers" className="mt-6 space-y-4">
            
            {isParent ? (
              /* VUE FAMILLE POUR LES PARENTS D'ÉLÈVES */
              <div className="space-y-4">
                {filteredSubscribers.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center space-y-3">
                    <div className="w-16 h-16 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center mx-auto">
                      <UtensilsCrossed className="w-8 h-8" />
                    </div>
                    <h4 className="font-bold text-foreground text-base">Aucun forfait cantine actif</h4>
                    <p className="text-xs text-muted-foreground max-w-md mx-auto leading-relaxed">
                      Aucun de vos enfants n'a pour le moment de forfait repas enregistré. Contactez l'administration ou le service intendance de l'établissement pour inscrire votre enfant à la demi-pension.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filteredSubscribers.map((sub) => {
                      const isPresentToday = !!mealAttendance[sub.student_id];
                      return (
                        <div key={sub.id} className="rounded-2xl border border-border bg-card p-5 shadow-xs space-y-4">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-lg shrink-0">
                                {sub.student_name.charAt(0)}
                              </div>
                              <div>
                                <h4 className="font-bold text-base text-foreground">{sub.student_name}</h4>
                                <p className="text-xs text-muted-foreground">{sub.class_name} · Matricule {sub.student_code}</p>
                              </div>
                            </div>
                            <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
                              sub.status === 'paid' ? 'bg-emerald-100 text-emerald-800' :
                              sub.status === 'partial' ? 'bg-blue-100 text-blue-800' :
                              'bg-rose-100 text-rose-800'
                            }`}>
                              {sub.status === 'paid' ? 'Soldé ✓' : sub.status === 'partial' ? 'Partiel' : 'En attente'}
                            </span>
                          </div>

                          <div className="grid grid-cols-2 gap-3 text-xs bg-muted/40 p-3 rounded-xl">
                            <div>
                              <span className="text-muted-foreground text-[10px] block uppercase font-semibold">Formule souscrite</span>
                              <span className="font-bold text-foreground">{sub.plan_name}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground text-[10px] block uppercase font-semibold">Pointage ce midi</span>
                              <span className={`font-bold ${isPresentToday ? 'text-emerald-700' : 'text-stone-500'}`}>
                                {isPresentToday ? '✓ Servi au réfectoire' : 'Non pointé'}
                              </span>
                            </div>
                            <div>
                              <span className="text-muted-foreground text-[10px] block uppercase font-semibold">Montant Réglé</span>
                              <span className="font-mono font-bold text-emerald-600">{sub.amount_paid.toLocaleString('fr-FR')} F</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground text-[10px] block uppercase font-semibold">Reste à Payer</span>
                              <span className="font-mono font-bold text-amber-700">{sub.remaining.toLocaleString('fr-FR')} F</span>
                            </div>
                          </div>

                          {sub.dietary_notes && (
                            <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs">
                              <strong>Régime / Allergies :</strong> {sub.dietary_notes}
                            </div>
                          )}

                          {sub.remaining > 0 && (
                            <Link
                              to="/paiement"
                              className="w-full inline-flex items-center justify-center gap-2 py-2 px-4 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-sm transition-colors"
                            >
                              <Banknote className="w-4 h-4" /> Régler la cantine ({sub.remaining.toLocaleString('fr-FR')} FCFA)
                            </Link>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : (
              /* VUE ADMINISTRATIVE / COMPTABLE */
              <>
                {/* Barre de recherche et filtre */}
                <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between bg-card p-3 rounded-2xl border border-border">
                  <div className="relative flex-1 max-w-md">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Rechercher par élève, classe, matricule, parent..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-9 h-9 text-xs"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <Select value={statusFilter} onValueChange={(v: any) => setStatusFilter(v)}>
                      <SelectTrigger className="text-xs h-9 w-44">
                        <SelectValue placeholder="Statut paiement" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Tous les statuts</SelectItem>
                        <SelectItem value="paid">Payé en totalité</SelectItem>
                        <SelectItem value="partial">Paiement partiel</SelectItem>
                        <SelectItem value="pending">En attente / Impayé</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Table des abonnés */}
                <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-xs">
                  <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-muted/50 border-b border-border text-muted-foreground font-semibold uppercase text-[10px] tracking-wider">
                    <tr>
                      <th className="py-3 px-4">Élève & Classe</th>
                      <th className="py-3 px-4">Formule Choisie</th>
                      <th className="py-3 px-4">Parent / Contact</th>
                      <th className="py-3 px-4">Montant Dû</th>
                      <th className="py-3 px-4">Déjà Payé</th>
                      <th className="py-3 px-4">Reste</th>
                      <th className="py-3 px-4">Statut</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredSubscribers.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-10 text-center text-muted-foreground">
                          Aucun abonné cantine trouvé. Cliquez sur "Inscrire à la cantine" pour ajouter un élève.
                        </td>
                      </tr>
                    ) : (
                      filteredSubscribers.map((sub) => (
                        <tr key={sub.id} className="hover:bg-muted/30 transition-colors">
                          <td className="py-3.5 px-4 font-semibold text-foreground">
                            <div className="flex items-center gap-2.5">
                              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-100 text-amber-800 font-bold shrink-0">
                                {sub.student_name.charAt(0)}
                              </div>
                              <div>
                                <div className="font-bold text-foreground">{sub.student_name}</div>
                                <div className="text-[11px] text-muted-foreground font-mono">
                                  {sub.student_code} · <span className="font-bold text-amber-700">{sub.class_name}</span>
                                </div>
                                {sub.dietary_notes && (
                                  <span className="inline-block mt-0.5 text-[10px] font-medium text-rose-700 bg-rose-50 border border-rose-200 px-1.5 py-0.2 rounded">
                                    ⚠️ {sub.dietary_notes}
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="font-semibold text-foreground">{sub.plan_name}</div>
                            <div className="text-[10px] text-muted-foreground">Inscrit le {sub.registered_at}</div>
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="font-medium text-foreground">{sub.parent_name}</div>
                            <div className="text-[11px] text-muted-foreground">{sub.parent_phone}</div>
                          </td>
                          <td className="py-3.5 px-4 font-mono font-bold text-foreground">
                            {sub.amount_due.toLocaleString('fr-FR')} F
                          </td>
                          <td className="py-3.5 px-4 font-mono font-bold text-emerald-600">
                            {sub.amount_paid.toLocaleString('fr-FR')} F
                          </td>
                          <td className="py-3.5 px-4 font-mono font-bold text-amber-800">
                            {sub.remaining > 0 ? `${sub.remaining.toLocaleString('fr-FR')} F` : '0 F'}
                          </td>
                          <td className="py-3.5 px-4">
                            {sub.status === 'paid' && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800">
                                <CheckCircle2 className="w-3 h-3" /> Réglé
                              </span>
                            )}
                            {sub.status === 'partial' && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-0.5 text-[11px] font-bold text-blue-800">
                                <Clock className="w-3 h-3" /> Partiel
                              </span>
                            )}
                            {sub.status === 'pending' && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-0.5 text-[11px] font-bold text-rose-800">
                                <AlertCircle className="w-3 h-3" /> Impayé
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            {sub.remaining > 0 ? (
                              <Button
                                size="sm"
                                onClick={() => {
                                  setSelectedSubForPayment(sub);
                                  setPaymentAmount(String(sub.remaining));
                                  setIsPaymentModalOpen(true);
                                }}
                                className="h-8 gap-1 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                              >
                                <Banknote className="w-3.5 h-3.5" /> Encaisser
                              </Button>
                            ) : (
                              <span className="text-[11px] text-muted-foreground italic">En règle</span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </TabsContent>

      {/* ── TAB 2 : MENUS DE LA SEMAINE ── */}
      <TabsContent value="menus" className="mt-6 space-y-4">
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between bg-card p-4 rounded-2xl border border-border">
          <div>
            <h3 className="text-base font-bold text-foreground">
              {isParent ? "Menus Équilibrés de la Semaine" : "Gestion des Menus & Planification de la Cantine"}
            </h3>
            <p className="text-xs text-muted-foreground">
              {isParent
                ? "Découvrez la composition des repas sains et équilibrés servis à vos enfants du lundi au vendredi."
                : "L'établissement définit les repas équilibrés servis aux élèves tout au long de la semaine."}
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsPrintMenuOpen(true)}
              className="gap-1.5 text-xs h-8 border-border"
            >
              <Printer className="w-3.5 h-3.5" /> Imprimer le Menu
            </Button>

            {isAdmin && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    if (confirm("Réinitialiser le menu de la semaine avec les repas types par défaut ?")) {
                      resetDefaultMenus();
                    }
                  }}
                  className="gap-1.5 text-xs h-8 text-muted-foreground hover:text-foreground"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Semaine Type
                </Button>

                <Button
                  size="sm"
                  onClick={() => setIsNewMenuOpen(true)}
                  className="gap-1.5 text-xs h-8 bg-amber-600 hover:bg-amber-700 text-white font-bold"
                >
                  <Plus className="w-3.5 h-3.5" /> Nouveau Jour
                </Button>
              </>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {weeklyMenus.map((menu) => (
            <div
              key={menu.id}
              className="rounded-2xl border border-border bg-card p-4 shadow-xs flex flex-col justify-between hover:border-amber-400 transition-colors"
            >
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-border">
                  <span className="font-display font-black text-base text-amber-800">{menu.day}</span>
                  <div className="flex items-center gap-1">
                    {isAdmin && weeklyMenus.length > 1 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if (confirm(`Supprimer la journée du ${menu.day} ?`)) {
                            deleteMenu(menu.id);
                          }
                        }}
                        className="h-7 w-7 p-0 text-muted-foreground hover:text-rose-600 hover:bg-rose-50"
                        title="Supprimer cette journée"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    )}
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-100 text-amber-800">
                      <UtensilsCrossed className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>

                <div className="mt-3 space-y-3 text-xs">
                  <div className="bg-muted/30 p-2 rounded-lg">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground flex items-center gap-1">
                      <Salad className="w-3 h-3 text-emerald-600" /> Entrée
                    </span>
                    <p className="mt-0.5 text-foreground font-medium">{menu.starter || "—"}</p>
                  </div>

                  <div className="bg-amber-50/50 border border-amber-100 p-2 rounded-lg">
                    <span className="text-[10px] uppercase font-bold text-amber-900 flex items-center gap-1">
                      <ChefHat className="w-3 h-3 text-amber-600" /> Plat Principal
                    </span>
                    <p className="mt-0.5 text-foreground font-bold">{menu.main_dish}</p>
                  </div>

                  <div className="bg-muted/30 p-2 rounded-lg">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground flex items-center gap-1">
                      <Apple className="w-3 h-3 text-rose-500" /> Dessert
                    </span>
                    <p className="mt-0.5 text-foreground font-medium">{menu.dessert || "—"}</p>
                  </div>

                  <div className="bg-muted/30 p-2 rounded-lg">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground flex items-center gap-1">
                      <Coffee className="w-3 h-3 text-purple-600" /> Goûter de 16h
                    </span>
                    <p className="mt-0.5 text-foreground font-medium">{menu.snack || "—"}</p>
                  </div>
                </div>
              </div>

              {isAdmin && (
                <div className="mt-4 pt-3 border-t border-border">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEditingMenu(menu)}
                    className="w-full text-xs h-7 gap-1 border-amber-300 text-amber-900 hover:bg-amber-50"
                  >
                    Modifier le menu
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      </TabsContent>

      {/* ── TAB 3 : POINTAGE DU JOUR (ADMIN UNIQUEMENT) ── */}
      {isAdmin && (
        <TabsContent value="attendance" className="mt-6 space-y-4">
          <div className="flex items-center justify-between bg-card p-4 rounded-2xl border border-border">
            <div>
              <h3 className="text-base font-bold text-foreground">Pointage du Réfectoire — Aujourd'hui</h3>
              <p className="text-xs text-muted-foreground">
                Cochez les élèves présents pour le service du midi pour ajuster le nombre exact de portions
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-3 py-1.5 rounded-xl border border-emerald-200">
                {cantineStats.todayPresent} / {cantineStats.totalSubscribers} élèves présents
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {cantineSubscribers.map((sub) => {
              const isPresent = !!mealAttendance[sub.student_id];
              return (
                <div
                  key={sub.id}
                  onClick={() => toggleMealAttendance(sub.student_id)}
                  className={`cursor-pointer p-4 rounded-2xl border transition-all flex items-center justify-between ${
                    isPresent
                      ? 'bg-emerald-50/70 border-emerald-300 shadow-xs'
                      : 'bg-card border-border hover:border-amber-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-xl font-bold transition-colors ${
                        isPresent
                          ? 'bg-emerald-600 text-white'
                          : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {isPresent ? <Check className="w-5 h-5" /> : sub.student_name.charAt(0)}
                    </div>
                    <div>
                      <div className="font-bold text-xs text-foreground">{sub.student_name}</div>
                      <div className="text-[11px] text-muted-foreground">
                        {sub.class_name} · <span className="font-medium text-amber-800">{sub.plan_name}</span>
                      </div>
                      {sub.dietary_notes && (
                        <div className="text-[10px] text-rose-700 font-semibold">⚠️ {sub.dietary_notes}</div>
                      )}
                    </div>
                  </div>

                  <div>
                    {isPresent ? (
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                        Présent
                      </span>
                    ) : (
                      <span className="text-[10px] font-semibold text-stone-500 bg-stone-100 px-2 py-0.5 rounded-full">
                        Non pointé
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </TabsContent>
      )}

      {/* ── TAB 4 : FORMULES & TARIFS (ADMIN & COMPTABLE) ── */}
      {!isParent && (
        <TabsContent value="plans" className="mt-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {cantinePlans.map((plan) => (
              <div key={plan.id} className="rounded-2xl border border-border bg-card p-5 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-amber-800 uppercase tracking-wider">{plan.code}</span>
                    <UtensilsCrossed className="w-4 h-4 text-amber-700" />
                  </div>
                  <h4 className="font-bold text-foreground text-base">{plan.name}</h4>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{plan.description}</p>
                  <div className="mt-4 font-display text-2xl font-black text-amber-800">
                    {plan.price_cfa.toLocaleString('fr-FR')} <span className="text-xs font-normal text-muted-foreground">FCFA</span>
                  </div>
                </div>
                <div className="mt-4 pt-3 border-t border-border text-[11px] text-stone-600">
                  {plan.meals_per_week > 0 ? `${plan.meals_per_week} repas / semaine` : 'Tickets unitaires'}
                </div>
              </div>
            ))}
          </div>
        </TabsContent>
      )}

        </Tabs>

        {/* ── MODAL : INSCRIRE UN NOUVEL ÉLÈVE À LA CANTINE ── */}
        <Dialog open={isNewSubscriberOpen} onOpenChange={setIsNewSubscriberOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base font-bold text-foreground">
                <UtensilsCrossed className="w-5 h-5 text-amber-700" />
                Inscrire un élève à la Cantine
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Associez un élève de l'établissement à une formule de restauration scolaire.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleRegisterSubscriber} className="space-y-4 mt-2">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Choisir l'élève *</Label>
                <Select value={newSubStudentId} onValueChange={setNewSubStudentId}>
                  <SelectTrigger className="text-xs h-9">
                    <SelectValue placeholder="Sélectionner l'élève" />
                  </SelectTrigger>
                  <SelectContent>
                    {students.map((st: any) => (
                      <SelectItem key={st.id} value={st.id}>
                        {st.first_name} {st.last_name} ({(st as any).classes?.name || 'Sans classe'})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Formule de cantine *</Label>
                <Select value={newSubPlanId} onValueChange={setNewSubPlanId}>
                  <SelectTrigger className="text-xs h-9">
                    <SelectValue placeholder="Choisir la formule" />
                  </SelectTrigger>
                  <SelectContent>
                    {cantinePlans.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name} — {p.price_cfa.toLocaleString('fr-FR')} FCFA
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Régime ou allergies alimentaires (optionnel)</Label>
                <Input
                  value={newSubDietary}
                  onChange={(e) => setNewSubDietary(e.target.value)}
                  placeholder="Ex: Sans porc, allergie aux arachides, végétarien..."
                  className="text-xs h-9"
                />
              </div>

              <DialogFooter className="pt-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setIsNewSubscriberOpen(false)}>
                  Annuler
                </Button>
                <Button type="submit" size="sm" className="bg-amber-600 hover:bg-amber-700 text-white font-bold">
                  Confirmer l'inscription
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* ── MODAL : ENCAISSER LE PAIEMENT DE CANTINE (COMPTABILITÉ) ── */}
        <Dialog open={isPaymentModalOpen} onOpenChange={setIsPaymentModalOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base font-bold text-foreground">
                <Banknote className="w-5 h-5 text-emerald-600" />
                Encaisser la Cantine Scolaire
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Élève : <strong>{selectedSubForPayment?.student_name}</strong> ({selectedSubForPayment?.class_name})
                <br />
                Formule : {selectedSubForPayment?.plan_name} · Restant dû : {selectedSubForPayment?.remaining.toLocaleString('fr-FR')} FCFA
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handlePaymentSubmit} className="space-y-4 mt-2">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Montant à encaisser (FCFA) *</Label>
                <Input
                  type="number"
                  min="500"
                  required
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  className="text-sm font-bold text-emerald-700 h-9"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Mode de règlement *</Label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger className="text-xs h-9">
                    <SelectValue placeholder="Mode de paiement" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Espèces">Espèces (Guichet)</SelectItem>
                    <SelectItem value="Wave">Wave Mobile Money</SelectItem>
                    <SelectItem value="Orange Money">Orange Money</SelectItem>
                    <SelectItem value="MTN Mobile Money">MTN MoMo</SelectItem>
                    <SelectItem value="Moov Money">Moov Money</SelectItem>
                    <SelectItem value="Chèque">Chèque bancaire</SelectItem>
                    <SelectItem value="Virement bancaire">Virement bancaire</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Référence ou notes</Label>
                <Input
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  placeholder="Ex: Reçu N° 45892 ou payé par Wave"
                  className="text-xs h-9"
                />
              </div>

              <DialogFooter className="pt-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setIsPaymentModalOpen(false)}>
                  Annuler
                </Button>
                <Button type="submit" size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold">
                  Valider l'encaissement
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* ── MODAL : MODIFIER UN MENU DU JOUR ── */}
        <Dialog open={!!editingMenu} onOpenChange={(open) => !open && setEditingMenu(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base font-bold text-foreground">
                <ChefHat className="w-5 h-5 text-amber-700" />
                Modifier le menu du {editingMenu?.day}
              </DialogTitle>
            </DialogHeader>

            {editingMenu && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  updateMenu(editingMenu);
                  setEditingMenu(null);
                }}
                className="space-y-3 mt-2"
              >
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Entrée</Label>
                  <Input
                    value={editingMenu.starter}
                    onChange={(e) => setEditingMenu({ ...editingMenu, starter: e.target.value })}
                    className="text-xs h-8"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Plat Principal</Label>
                  <Input
                    value={editingMenu.main_dish}
                    onChange={(e) => setEditingMenu({ ...editingMenu, main_dish: e.target.value })}
                    className="text-xs h-8"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Dessert</Label>
                  <Input
                    value={editingMenu.dessert}
                    onChange={(e) => setEditingMenu({ ...editingMenu, dessert: e.target.value })}
                    className="text-xs h-8"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Goûter</Label>
                  <Input
                    value={editingMenu.snack}
                    onChange={(e) => setEditingMenu({ ...editingMenu, snack: e.target.value })}
                    className="text-xs h-8"
                  />
                </div>

                <DialogFooter className="pt-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => setEditingMenu(null)}>
                    Annuler
                  </Button>
                  <Button type="submit" size="sm" className="bg-amber-600 hover:bg-amber-700 text-white font-bold">
                    Enregistrer le menu
                  </Button>
                </DialogFooter>
              </form>
            )}
          </DialogContent>
        </Dialog>

        {/* ── MODAL : AJOUTER UN NOUVEAU JOUR / MENU ── */}
        <Dialog open={isNewMenuOpen} onOpenChange={setIsNewMenuOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base font-bold text-foreground">
                <ChefHat className="w-5 h-5 text-amber-600" />
                Ajouter une Journée de Menu
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Définissez la composition des repas pour cette journée de cantine.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleCreateMenu} className="space-y-3 mt-2">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Jour de la semaine *</Label>
                <Select value={newMenuDay} onValueChange={setNewMenuDay}>
                  <SelectTrigger className="text-xs h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Lundi">Lundi</SelectItem>
                    <SelectItem value="Mardi">Mardi</SelectItem>
                    <SelectItem value="Mercredi">Mercredi</SelectItem>
                    <SelectItem value="Jeudi">Jeudi</SelectItem>
                    <SelectItem value="Vendredi">Vendredi</SelectItem>
                    <SelectItem value="Samedi">Samedi</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Entrée</Label>
                <Input
                  value={newMenuStarter}
                  onChange={(e) => setNewMenuStarter(e.target.value)}
                  placeholder="Ex: Salade de crudités de saison"
                  className="text-xs h-8"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Plat Principal *</Label>
                <Input
                  value={newMenuMainDish}
                  onChange={(e) => setNewMenuMainDish(e.target.value)}
                  placeholder="Ex: Riz au gras & Poulet braisé"
                  className="text-xs h-8"
                  required
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Dessert</Label>
                <Input
                  value={newMenuDessert}
                  onChange={(e) => setNewMenuDessert(e.target.value)}
                  placeholder="Ex: Ananas découpé ou Yaourt vanille"
                  className="text-xs h-8"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Goûter (16h)</Label>
                <Input
                  value={newMenuSnack}
                  onChange={(e) => setNewMenuSnack(e.target.value)}
                  placeholder="Ex: Pain au lait & Jus de bissap"
                  className="text-xs h-8"
                />
              </div>

              <DialogFooter className="pt-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setIsNewMenuOpen(false)}>
                  Annuler
                </Button>
                <Button type="submit" size="sm" className="bg-amber-600 hover:bg-amber-700 text-white font-bold">
                  Ajouter au planning
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* ── MODAL : IMPRIMER LE MENU DE LA SEMAINE ── */}
        <Dialog open={isPrintMenuOpen} onOpenChange={setIsPrintMenuOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base font-bold text-foreground">
                <Printer className="w-5 h-5 text-amber-700" />
                Fiche Officielle des Menus de la Semaine
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Document prêt pour l'affichage au réfectoire et l'envoi aux familles.
              </DialogDescription>
            </DialogHeader>

            <div className="p-4 rounded-xl border border-border bg-amber-50/20 space-y-4 my-2 text-xs">
              <div className="text-center pb-3 border-b border-border">
                <h4 className="font-bold text-base text-foreground uppercase tracking-wider">
                  Menu Hebdomadaire de la Restauration Scolaire
                </h4>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Eurêka Éducation · Année Scolaire 2025-2026
                </p>
              </div>

              <div className="space-y-3">
                {weeklyMenus.map((m) => (
                  <div key={m.id} className="p-3 rounded-lg border border-border bg-card">
                    <div className="font-bold text-sm text-amber-800 mb-1.5 flex items-center justify-between">
                      <span>{m.day}</span>
                      <span className="text-[10px] text-muted-foreground font-normal">Service du midi & Goûter</span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                      <div>
                        <span className="font-bold text-muted-foreground block text-[10px] uppercase">Entrée</span>
                        <span className="text-foreground">{m.starter || '—'}</span>
                      </div>
                      <div>
                        <span className="font-bold text-amber-900 block text-[10px] uppercase">Plat Chaud</span>
                        <span className="text-foreground font-bold">{m.main_dish}</span>
                      </div>
                      <div>
                        <span className="font-bold text-muted-foreground block text-[10px] uppercase">Dessert</span>
                        <span className="text-foreground">{m.dessert || '—'}</span>
                      </div>
                      <div>
                        <span className="font-bold text-muted-foreground block text-[10px] uppercase">Goûter</span>
                        <span className="text-foreground">{m.snack || '—'}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <DialogFooter className="pt-2 flex justify-between sm:justify-between items-center">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsPrintMenuOpen(false)}>
                Fermer
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={() => window.print()}
                className="gap-2 bg-amber-600 hover:bg-amber-700 text-white font-bold"
              >
                <Printer className="w-4 h-4" /> Imprimer cette fiche
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      </div>
    </AppShell>
  );
}
