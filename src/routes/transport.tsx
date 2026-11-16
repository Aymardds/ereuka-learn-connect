import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { useServices, TransportSubscriber, TransportRoute, Vehicle } from '@/hooks/useServices';
import { useStudents } from '@/hooks/useStudents';
import { useClasses } from '@/hooks/useClasses';
import { useAuth } from '@/hooks/useAuth';
import {
  Bus, Users, MapPin, Clock, ShieldCheck, Plus, Search, Filter,
  Phone, AlertCircle, CheckCircle2, DollarSign, Banknote, Receipt,
  Sparkles, Check, X, ArrowRight, Car, Wrench, ShieldAlert,
  Pencil, Trash2, Printer, MapPinPlus, Compass
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { toast } from 'sonner';

export const Route = createFileRoute('/transport')({
  head: () => ({
    meta: [
      { title: "Gestion du Transport Scolaire — Eurêka ERP" },
      { name: "description", content: "Gestion des circuits de ramassage scolaire, abonnements élèves, flotte et paiements." },
    ],
  }),
  component: TransportPage,
});

export function TransportPage() {
  const { profile } = useAuth();
  const {
    transportRoutes,
    transportSubscribers,
    vehicles,
    transportStats,
    registerTransportSubscriber,
    recordTransportPayment,
    addVehicle,
    addTransportRoute,
    updateTransportRoute,
    deleteTransportRoute,
    addStopToRoute,
    removeStopFromRoute,
  } = useServices();

  const { students } = useStudents();
  const { classes } = useClasses();

  // Filtres
  const [searchTerm, setSearchTerm] = useState('');
  const [routeFilter, setRouteFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'partial' | 'pending'>('all');
  const [activeTab, setActiveTab] = useState<'subscribers' | 'routes' | 'fleet' | 'pricing'>('subscribers');

  // Modals abonnés et caisse
  const [isNewSubscriberOpen, setIsNewSubscriberOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isNewVehicleOpen, setIsNewVehicleOpen] = useState(false);
  const [selectedSubForPayment, setSelectedSubForPayment] = useState<TransportSubscriber | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Espèces');
  const [paymentNotes, setPaymentNotes] = useState('');

  // Modals pour la gestion des circuits & arrêts
  const [isNewRouteModalOpen, setIsNewRouteModalOpen] = useState(false);
  const [editingRoute, setEditingRoute] = useState<TransportRoute | null>(null);
  const [selectedRouteForStops, setSelectedRouteForStops] = useState<TransportRoute | null>(null);
  const [isPrintRouteOpen, setIsPrintRouteOpen] = useState<TransportRoute | null>(null);

  // Formulaire nouveau circuit
  const [newRouteName, setNewRouteName] = useState('');
  const [newRouteCode, setNewRouteCode] = useState('');
  const [newRouteVehiclePlate, setNewRouteVehiclePlate] = useState(vehicles[0]?.plate_number || '');
  const [newRouteDriverName, setNewRouteDriverName] = useState('');
  const [newRouteDriverPhone, setNewRouteDriverPhone] = useState('');
  const [newRouteMonthlyRate, setNewRouteMonthlyRate] = useState('25000');

  // Formulaire arrêt
  const [newStopName, setNewStopName] = useState('');
  const [newStopMorningTime, setNewStopMorningTime] = useState('07:00');
  const [newStopEveningTime, setNewStopEveningTime] = useState('17:00');

  // Inscription élève form state
  const [newSubStudentId, setNewSubStudentId] = useState('');
  const [newSubRouteId, setNewSubRouteId] = useState(transportRoutes[0]?.id || '');
  const [newSubStop, setNewSubStop] = useState('');
  const [newSubTripType, setNewSubTripType] = useState<'round_trip' | 'morning_only' | 'evening_only'>('round_trip');

  // Nouveau véhicule form state
  const [newVehPlate, setNewVehPlate] = useState('');
  const [newVehModel, setNewVehModel] = useState('');
  const [newVehCapacity, setNewVehCapacity] = useState('30');
  const [newVehDriverName, setNewVehDriverName] = useState('');
  const [newVehDriverPhone, setNewVehDriverPhone] = useState('');
  const [newVehInsurance, setNewVehInsurance] = useState('');

  // Circuit sélectionné pour les arrêts
  const currentRouteObj = transportRoutes.find(r => r.id === newSubRouteId) || transportRoutes[0];

  // Filtrage des abonnés
  const filteredSubscribers = transportSubscribers.filter(sub => {
    const matchesSearch =
      sub.student_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sub.class_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sub.student_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sub.pickup_stop.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sub.parent_name.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesRoute = routeFilter === 'all' || sub.route_id === routeFilter;
    const matchesStatus = statusFilter === 'all' || sub.status === statusFilter;
    return matchesSearch && matchesRoute && matchesStatus;
  });

  const handleRegisterSubscriber = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubStudentId) {
      toast.error("Veuillez sélectionner un élève");
      return;
    }

    const st = students.find(s => s.id === newSubStudentId);
    if (!st) {
      toast.error("Élève introuvable");
      return;
    }

    const parentName = (st as any).user_profiles?.full_name || (st as any).guardian_name || 'Parent d\'élève';
    const parentPhone = (st as any).user_profiles?.phone || (st as any).guardian_phone || '';
    const className = (st as any).classes?.name || 'Sans classe';
    const route = transportRoutes.find(r => r.id === newSubRouteId) || transportRoutes[0];
    const pickupStop = newSubStop || route.stops[0]?.name || 'Arrêt principal';

    registerTransportSubscriber({
      student_id: st.id,
      student_name: `${st.first_name} ${st.last_name}`,
      student_code: st.student_code || 'ERK-MAT',
      class_name: className,
      parent_name: parentName,
      parent_phone: parentPhone,
      route_id: route.id,
      route_name: route.name,
      pickup_stop: pickupStop,
      trip_type: newSubTripType,
    });

    setIsNewSubscriberOpen(false);
    setNewSubStudentId('');
    setNewSubStop('');
  };

  const handlePaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSubForPayment) return;
    const amt = parseFloat(paymentAmount);
    if (isNaN(amt) || amt <= 0) {
      toast.error("Veuillez saisir un montant valide");
      return;
    }

    recordTransportPayment(selectedSubForPayment.id, amt, paymentMethod, paymentNotes);
    setIsPaymentModalOpen(false);
    setSelectedSubForPayment(null);
    setPaymentAmount('');
    setPaymentNotes('');
  };

  const handleAddVehicle = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVehPlate || !newVehModel || !newVehDriverName) {
      toast.error("Veuillez remplir les informations obligatoires du véhicule");
      return;
    }

    addVehicle({
      plate_number: newVehPlate,
      model: newVehModel,
      capacity: parseInt(newVehCapacity) || 30,
      driver_name: newVehDriverName,
      driver_phone: newVehDriverPhone,
      insurance_expiry: newVehInsurance || '2026-12-31',
      status: 'operational',
    });

    setIsNewVehicleOpen(false);
    setNewVehPlate('');
    setNewVehModel('');
    setNewVehDriverName('');
    setNewVehDriverPhone('');
  };

  const handleCreateRoute = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRouteName || !newRouteCode) {
      toast.error("Veuillez renseigner le nom et le code du circuit");
      return;
    }

    const selectedVeh = vehicles.find(v => v.plate_number === newRouteVehiclePlate) || vehicles[0];

    addTransportRoute({
      name: newRouteName,
      code: newRouteCode.toUpperCase(),
      driver_name: newRouteDriverName || selectedVeh?.driver_name || 'Chauffeur attitré',
      driver_phone: newRouteDriverPhone || selectedVeh?.driver_phone || '',
      vehicle_plate: newRouteVehiclePlate || selectedVeh?.plate_number || 'Minibus',
      vehicle_capacity: selectedVeh?.capacity || 30,
      stops: [
        { name: 'Départ Garage / Établissement', morning_time: '06:30', evening_time: '17:30' },
        { name: 'Arrivée Établissement', morning_time: '07:45', evening_time: '16:15' },
      ],
      monthly_rate_cfa: parseInt(newRouteMonthlyRate) || 25000,
    });

    setIsNewRouteModalOpen(false);
    setNewRouteName('');
    setNewRouteCode('');
    setNewRouteDriverName('');
    setNewRouteDriverPhone('');
  };

  const handleUpdateRoute = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRoute) return;
    updateTransportRoute(editingRoute);
    setEditingRoute(null);
  };

  const handleDeleteRoute = (routeId: string) => {
    if (confirm("Êtes-vous sûr de vouloir supprimer définitivement ce circuit de transport ?")) {
      deleteTransportRoute(routeId);
    }
  };

  const handleAddStop = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRouteForStops || !newStopName) {
      toast.error("Veuillez renseigner le nom de l'arrêt");
      return;
    }

    addStopToRoute(selectedRouteForStops.id, {
      name: newStopName,
      morning_time: newStopMorningTime,
      evening_time: newStopEveningTime,
    });

    setSelectedRouteForStops(prev => prev ? {
      ...prev,
      stops: [...prev.stops, { name: newStopName, morning_time: newStopMorningTime, evening_time: newStopEveningTime }],
      stops_count: prev.stops.length + 1,
    } : null);

    setNewStopName('');
  };

  const handleRemoveStop = (routeId: string, stopIndex: number) => {
    removeStopFromRoute(routeId, stopIndex);
    setSelectedRouteForStops(prev => prev ? {
      ...prev,
      stops: prev.stops.filter((_, idx) => idx !== stopIndex),
      stops_count: Math.max(0, prev.stops.length - 1),
    } : null);
  };

  return (
    <AppShell
      title="Transport Scolaire & Navettes"
      subtitle="Gestion des lignes de ramassage, arrêts, suivi des élèves et encaissement des abonnements"
      actions={
        <div className="flex items-center gap-2">
          <Button
            onClick={() => setIsNewSubscriberOpen(true)}
            className="gap-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-sm"
          >
            <Plus className="w-4 h-4" /> Inscrire au transport
          </Button>
        </div>
      }
    >
      <div className="space-y-6">

        {/* ── BANDEAU KPI ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="rounded-2xl border border-border bg-card p-4 sm:p-5 shadow-xs">
            <div className="flex items-center justify-between text-muted-foreground mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Circuits Actifs</span>
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-100 text-amber-800">
                <MapPin className="w-4 h-4" />
              </div>
            </div>
            <div className="font-display text-2xl sm:text-3xl font-black text-foreground">
              {transportStats.activeRoutes}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">Lignes de ramassage régulières</p>
          </div>

          <div className="rounded-2xl border border-border bg-card p-4 sm:p-5 shadow-xs">
            <div className="flex items-center justify-between text-muted-foreground mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Élèves Transportés</span>
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-100 text-blue-800">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div className="font-display text-2xl sm:text-3xl font-black text-blue-600">
              {transportStats.totalSubscribers}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">Abonnés actifs aux navettes</p>
          </div>

          <div className="rounded-2xl border border-border bg-card p-4 sm:p-5 shadow-xs">
            <div className="flex items-center justify-between text-muted-foreground mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Véhicules en Service</span>
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-100 text-emerald-800">
                <Bus className="w-4 h-4" />
              </div>
            </div>
            <div className="font-display text-2xl sm:text-3xl font-black text-emerald-600">
              {transportStats.operationalVehicles} / {vehicles.length}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">Minibus & autocars disponibles</p>
          </div>

          <div className="rounded-2xl border border-border bg-card p-4 sm:p-5 shadow-xs">
            <div className="flex items-center justify-between text-muted-foreground mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Recouvrement Transport</span>
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-purple-100 text-purple-800">
                <DollarSign className="w-4 h-4" />
              </div>
            </div>
            <div className="font-display text-2xl sm:text-3xl font-black text-amber-700">
              {transportStats.recoveryRate} %
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              Encaissé : {transportStats.totalRevenue.toLocaleString('fr-FR')} F CFA
            </p>
          </div>
        </div>

        {/* ── ONGLETS DE GESTION ── */}
        <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)}>
          <div className="flex items-center justify-between flex-wrap gap-4 border-b border-border pb-3">
            <TabsList className="bg-muted/70 p-1 rounded-xl">
              <TabsTrigger value="subscribers" className="gap-2 text-xs font-bold py-1.5 px-3">
                <Users className="w-3.5 h-3.5" /> Abonnés & Lignes ({transportSubscribers.length})
              </TabsTrigger>
              <TabsTrigger value="routes" className="gap-2 text-xs font-bold py-1.5 px-3">
                <MapPin className="w-3.5 h-3.5" /> Circuits & Arrêts ({transportRoutes.length})
              </TabsTrigger>
              <TabsTrigger value="fleet" className="gap-2 text-xs font-bold py-1.5 px-3">
                <Bus className="w-3.5 h-3.5" /> Flotte & Chauffeurs ({vehicles.length})
              </TabsTrigger>
              <TabsTrigger value="pricing" className="gap-2 text-xs font-bold py-1.5 px-3">
                <DollarSign className="w-3.5 h-3.5" /> Grille Tarifaire & Modalités
              </TabsTrigger>
            </TabsList>
          </div>

          {/* ── TAB 1 : ABONNÉS & LIGNES ── */}
          <TabsContent value="subscribers" className="mt-6 space-y-4">
            
            {/* Barre de recherche et filtre */}
            <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between bg-card p-3 rounded-2xl border border-border">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Rechercher par élève, arrêt, classe, matricule..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 h-9 text-xs"
                />
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <Select value={routeFilter} onValueChange={(v: any) => setRouteFilter(v)}>
                  <SelectTrigger className="text-xs h-9 w-48">
                    <SelectValue placeholder="Circuit" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les circuits</SelectItem>
                    {transportRoutes.map(r => (
                      <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={statusFilter} onValueChange={(v: any) => setStatusFilter(v)}>
                  <SelectTrigger className="text-xs h-9 w-40">
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

            {/* Table des abonnés au transport */}
            <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-border bg-muted/40 text-muted-foreground uppercase tracking-wider font-semibold">
                      <th className="py-3 px-4">Élève & Classe</th>
                      <th className="py-3 px-4">Circuit & Arrêt de ramassage</th>
                      <th className="py-3 px-4">Trajet</th>
                      <th className="py-3 px-4">Parent / Contact</th>
                      <th className="py-3 px-4 text-right">Tarif Mensuel</th>
                      <th className="py-3 px-4 text-right">Payé / Reste</th>
                      <th className="py-3 px-4 text-center">Statut</th>
                      <th className="py-3 px-4 text-right">Actions Caisse</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredSubscribers.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-12 text-center text-muted-foreground">
                          <Bus className="w-8 h-8 mx-auto mb-2 opacity-30" />
                          Aucun élève inscrit sur ce circuit avec ces critères.
                        </td>
                      </tr>
                    ) : (
                      filteredSubscribers.map(sub => {
                        const tripLabel =
                          sub.trip_type === 'round_trip' ? 'Aller-Retour' :
                          sub.trip_type === 'morning_only' ? 'Matin seul' : 'Soir seul';

                        return (
                          <tr key={sub.id} className="hover:bg-muted/30 transition-colors">
                            <td className="py-3.5 px-4">
                              <div className="font-bold text-foreground text-sm">{sub.student_name}</div>
                              <div className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                                <span className="inline-block bg-muted px-1.5 py-0.5 rounded font-mono text-[10px]">
                                  {sub.student_code}
                                </span>
                                <span>•</span>
                                <span className="font-medium text-amber-700">{sub.class_name}</span>
                              </div>
                            </td>

                            <td className="py-3.5 px-4">
                              <div className="font-medium text-foreground">{sub.route_name}</div>
                              <div className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                                <MapPin className="w-3 h-3 text-amber-600 shrink-0" />
                                <span className="font-semibold text-foreground/80">{sub.pickup_stop}</span>
                              </div>
                            </td>

                            <td className="py-3.5 px-4">
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-blue-50 text-blue-700 border border-blue-200">
                                {tripLabel}
                              </span>
                            </td>

                            <td className="py-3.5 px-4">
                              <div className="text-foreground font-medium">{sub.parent_name}</div>
                              <div className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                                <Phone className="w-3 h-3 text-muted-foreground" />
                                <span>{sub.parent_phone}</span>
                              </div>
                            </td>

                            <td className="py-3.5 px-4 text-right font-bold text-foreground">
                              {sub.amount_due.toLocaleString('fr-FR')} F
                            </td>

                            <td className="py-3.5 px-4 text-right">
                              <div className="font-bold text-emerald-600">
                                {sub.amount_paid.toLocaleString('fr-FR')} F
                              </div>
                              {sub.remaining > 0 ? (
                                <div className="text-[11px] text-rose-600 font-medium">
                                  Reste: {sub.remaining.toLocaleString('fr-FR')} F
                                </div>
                              ) : (
                                <div className="text-[10px] text-emerald-700 font-semibold">Soldé ✓</div>
                              )}
                            </td>

                            <td className="py-3.5 px-4 text-center">
                              {sub.status === 'paid' && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                  <CheckCircle2 className="w-3 h-3" /> À jour
                                </span>
                              )}
                              {sub.status === 'partial' && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                                  <Clock className="w-3 h-3" /> Partiel
                                </span>
                              )}
                              {sub.status === 'pending' && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">
                                  <AlertCircle className="w-3 h-3" /> En attente
                                </span>
                              )}
                            </td>

                            <td className="py-3.5 px-4 text-right">
                              <Button
                                size="sm"
                                variant={sub.remaining > 0 ? "default" : "outline"}
                                onClick={() => {
                                  setSelectedSubForPayment(sub);
                                  setPaymentAmount(sub.remaining.toString());
                                  setIsPaymentModalOpen(true);
                                }}
                                className={`text-[11px] h-7 px-2.5 font-bold ${
                                  sub.remaining > 0
                                    ? "bg-amber-600 hover:bg-amber-700 text-white"
                                    : "border-border text-muted-foreground"
                                }`}
                              >
                                <Banknote className="w-3 h-3 mr-1" />
                                {sub.remaining > 0 ? "Encaisser" : "Reçu / Historique"}
                              </Button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </TabsContent>

          {/* ── TAB 2 : CIRCUITS & ARRÊTS ── */}
          <TabsContent value="routes" className="mt-6 space-y-4">
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between bg-card p-4 rounded-2xl border border-border">
              <div>
                <h3 className="text-base font-bold text-foreground">Gestion des Circuits & Lignes de Ramassage</h3>
                <p className="text-xs text-muted-foreground">
                  L'établissement crée les lignes de bus, gère les arrêts horaires et assigne les minibus et conducteurs.
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <Button
                  size="sm"
                  onClick={() => setIsNewRouteModalOpen(true)}
                  className="gap-1.5 text-xs h-8 bg-amber-600 hover:bg-amber-700 text-white font-bold"
                >
                  <Plus className="w-3.5 h-3.5" /> Nouveau Circuit
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {transportRoutes.map(route => {
                const routeSubscribersCount = transportSubscribers.filter(s => s.route_id === route.id).length;
                return (
                  <div
                    key={route.id}
                    className="rounded-2xl border border-border bg-card p-5 shadow-xs flex flex-col justify-between hover:border-amber-400 transition-colors"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-200">
                          {route.code}
                        </span>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditingRoute(route)}
                            className="h-7 w-7 p-0 text-muted-foreground hover:text-amber-800 hover:bg-amber-100"
                            title="Modifier ce circuit"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteRoute(route.id)}
                            className="h-7 w-7 p-0 text-muted-foreground hover:text-rose-600 hover:bg-rose-50"
                            title="Supprimer ce circuit"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>

                      <div className="flex items-baseline justify-between mb-2">
                        <h3 className="font-bold text-base text-foreground">{route.name}</h3>
                      </div>
                      <div className="text-xs font-bold text-amber-700 mb-3">
                        {route.monthly_rate_cfa.toLocaleString('fr-FR')} F CFA / mois
                      </div>

                      <div className="bg-muted/40 p-3 rounded-xl space-y-1.5 text-xs mb-4">
                        <div className="flex items-center justify-between text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Car className="w-3.5 h-3.5 text-amber-600" /> Véhicule :
                          </span>
                          <span className="font-semibold text-foreground">{route.vehicle_plate} ({route.vehicle_capacity} places)</span>
                        </div>
                        <div className="flex items-center justify-between text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Phone className="w-3.5 h-3.5 text-amber-600" /> Chauffeur :
                          </span>
                          <span className="font-semibold text-foreground">{route.driver_name}</span>
                        </div>
                        <div className="text-[11px] text-muted-foreground text-right font-mono">
                          {route.driver_phone || 'Sans téléphone'}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                          <span>Arrêts & Horaires ({route.stops.length})</span>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setSelectedRouteForStops(route)}
                            className="h-6 text-[10px] text-amber-800 hover:bg-amber-100 px-2 font-bold"
                          >
                            Gérer les arrêts (+/-)
                          </Button>
                        </div>

                        <div className="space-y-1.5 relative pl-4 border-l-2 border-amber-300 max-h-48 overflow-y-auto">
                          {route.stops.map((stop, i) => (
                            <div key={i} className="text-xs relative">
                              <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-amber-500 border-2 border-card" />
                              <div className="font-semibold text-foreground">{stop.name}</div>
                              <div className="text-[10px] text-muted-foreground flex items-center gap-2">
                                <span>Matin: <b className="text-foreground">{stop.morning_time}</b></span>
                                <span>•</span>
                                <span>Soir: <b className="text-foreground">{stop.evening_time}</b></span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="pt-4 mt-4 border-t border-border flex items-center justify-between text-xs text-muted-foreground flex-wrap gap-2">
                      <span>{routeSubscribersCount} élève(s) inscrit(s)</span>
                      <div className="flex items-center gap-1.5">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setIsPrintRouteOpen(route)}
                          className="text-xs h-7 gap-1 border-border"
                          title="Imprimer la feuille de route pour le chauffeur"
                        >
                          <Printer className="w-3 h-3" /> Feuille
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setNewSubRouteId(route.id);
                            setIsNewSubscriberOpen(true);
                          }}
                          className="text-xs h-7 border-amber-300 text-amber-800 hover:bg-amber-50"
                        >
                          + Inscrire
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </TabsContent>

          {/* ── TAB 3 : FLOTTE & CHAUFFEURS ── */}
          <TabsContent value="fleet" className="mt-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-foreground">Parc Automobile de l'Établissement</h3>
                <p className="text-xs text-muted-foreground">Suivi technique, capacité, assurance et conducteurs attitrés</p>
              </div>
              <Button
                size="sm"
                onClick={() => setIsNewVehicleOpen(true)}
                className="gap-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs"
              >
                <Plus className="w-3.5 h-3.5" /> Nouveau Véhicule
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {vehicles.map(veh => (
                <div key={veh.id} className="rounded-2xl border border-border bg-card p-5 shadow-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-black px-2.5 py-1 rounded-md bg-foreground text-background">
                      {veh.plate_number}
                    </span>
                    <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      veh.status === 'operational'
                        ? 'bg-emerald-100 text-emerald-800'
                        : veh.status === 'maintenance'
                        ? 'bg-rose-100 text-rose-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}>
                      {veh.status === 'operational' ? '✓ Opérationnel' : veh.status === 'maintenance' ? '⚠ Maintenance' : 'Standby'}
                    </span>
                  </div>

                  <div>
                    <h4 className="font-bold text-sm text-foreground">{veh.model}</h4>
                    <p className="text-xs text-muted-foreground">Capacité : <b>{veh.capacity} places assises</b></p>
                  </div>

                  <div className="bg-muted/40 p-3 rounded-xl space-y-1.5 text-xs">
                    <div className="flex items-center justify-between text-muted-foreground">
                      <span>Conducteur attitré :</span>
                      <span className="font-semibold text-foreground">{veh.driver_name}</span>
                    </div>
                    <div className="flex items-center justify-between text-muted-foreground">
                      <span>Contact chauffeur :</span>
                      <span className="font-mono text-foreground font-semibold">{veh.driver_phone}</span>
                    </div>
                    <div className="flex items-center justify-between text-muted-foreground pt-1 border-t border-border/50">
                      <span>Validité Assurance :</span>
                      <span className="font-semibold text-emerald-700">{veh.insurance_expiry}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          {/* ── TAB 4 : GRILLE TARIFAIRE ── */}
          <TabsContent value="pricing" className="mt-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="rounded-2xl border border-border bg-card p-5 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-amber-700 mb-1">Formule Standard</div>
                  <h4 className="font-bold text-lg text-foreground">Circuit Zone 1 (Cocody / Riviera)</h4>
                  <div className="my-4">
                    <span className="text-3xl font-black text-foreground">25 000</span>
                    <span className="text-xs text-muted-foreground ml-1">FCFA / mois</span>
                  </div>
                  <ul className="space-y-2 text-xs text-muted-foreground">
                    <li className="flex items-center gap-2 text-foreground">
                      <Check className="w-4 h-4 text-emerald-600 shrink-0" /> Aller-retour quotidien du lundi au vendredi
                    </li>
                    <li className="flex items-center gap-2 text-foreground">
                      <Check className="w-4 h-4 text-emerald-600 shrink-0" /> Climatisation intégrale et ceinture individuelle
                    </li>
                    <li className="flex items-center gap-2 text-foreground">
                      <Check className="w-4 h-4 text-emerald-600 shrink-0" /> Accompagnateur adulte de bord
                    </li>
                    <li className="flex items-center gap-2 text-foreground">
                      <Check className="w-4 h-4 text-emerald-600 shrink-0" /> Notification SMS aux parents à l'arrivée
                    </li>
                  </ul>
                </div>
              </div>

              <div className="rounded-2xl border-2 border-amber-500 bg-card p-5 shadow-xs flex flex-col justify-between relative">
                <span className="absolute -top-3 right-4 bg-amber-600 text-white font-bold text-[10px] uppercase px-2.5 py-0.5 rounded-full shadow-sm">
                  Grand Circuit
                </span>
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-amber-700 mb-1">Formule Élargie</div>
                  <h4 className="font-bold text-lg text-foreground">Circuit Zone 2 (Yopougon / Niangon)</h4>
                  <div className="my-4">
                    <span className="text-3xl font-black text-foreground">28 000</span>
                    <span className="text-xs text-muted-foreground ml-1">FCFA / mois</span>
                  </div>
                  <ul className="space-y-2 text-xs text-muted-foreground">
                    <li className="flex items-center gap-2 text-foreground">
                      <Check className="w-4 h-4 text-emerald-600 shrink-0" /> Trajet express autoroute du Nord
                    </li>
                    <li className="flex items-center gap-2 text-foreground">
                      <Check className="w-4 h-4 text-emerald-600 shrink-0" /> Ramassage aux arrêts sécurisés
                    </li>
                    <li className="flex items-center gap-2 text-foreground">
                      <Check className="w-4 h-4 text-emerald-600 shrink-0" /> Prise en charge dès 06h30 le matin
                    </li>
                    <li className="flex items-center gap-2 text-foreground">
                      <Check className="w-4 h-4 text-emerald-600 shrink-0" /> Retour sécurisé dès la fin des cours
                    </li>
                  </ul>
                </div>
              </div>

              <div className="rounded-2xl border border-border bg-card p-5 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-amber-700 mb-1">Formule Sud</div>
                  <h4 className="font-bold text-lg text-foreground">Circuit Zone 3 (Marcory / Koumassi)</h4>
                  <div className="my-4">
                    <span className="text-3xl font-black text-foreground">25 000</span>
                    <span className="text-xs text-muted-foreground ml-1">FCFA / mois</span>
                  </div>
                  <ul className="space-y-2 text-xs text-muted-foreground">
                    <li className="flex items-center gap-2 text-foreground">
                      <Check className="w-4 h-4 text-emerald-600 shrink-0" /> Ligne rapide via Boulevard VGE
                    </li>
                    <li className="flex items-center gap-2 text-foreground">
                      <Check className="w-4 h-4 text-emerald-600 shrink-0" /> Arrêts au plus près des domiciles
                    </li>
                    <li className="flex items-center gap-2 text-foreground">
                      <Check className="w-4 h-4 text-emerald-600 shrink-0" /> Assurance responsabilité civile passagers
                    </li>
                    <li className="flex items-center gap-2 text-foreground">
                      <Check className="w-4 h-4 text-emerald-600 shrink-0" /> Règlements mensuels ou trimestriels
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* ── MODAL : INSCRIRE UN ÉLÈVE AU TRANSPORT ── */}
        <Dialog open={isNewSubscriberOpen} onOpenChange={setIsNewSubscriberOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base font-bold text-foreground">
                <Bus className="w-5 h-5 text-amber-600" />
                Inscrire un élève au Transport Scolaire
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Sélectionnez l'élève, la ligne de bus ainsi que l'arrêt de ramassage convenu.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleRegisterSubscriber} className="space-y-4 mt-2">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Élève à inscrire *</Label>
                <Select value={newSubStudentId} onValueChange={setNewSubStudentId}>
                  <SelectTrigger className="text-xs h-9">
                    <SelectValue placeholder="Choisir un élève..." />
                  </SelectTrigger>
                  <SelectContent className="max-h-56">
                    {students.map(st => (
                      <SelectItem key={st.id} value={st.id}>
                        {st.first_name} {st.last_name} — {(st as any).classes?.name || 'Sans classe'} ({st.student_code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Circuit / Ligne de Ramassage *</Label>
                <Select value={newSubRouteId} onValueChange={(val) => {
                  setNewSubRouteId(val);
                  setNewSubStop('');
                }}>
                  <SelectTrigger className="text-xs h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {transportRoutes.map(r => (
                      <SelectItem key={r.id} value={r.id}>
                        {r.name} ({r.monthly_rate_cfa.toLocaleString('fr-FR')} F)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Arrêt de montée / descente *</Label>
                <Select value={newSubStop} onValueChange={setNewSubStop}>
                  <SelectTrigger className="text-xs h-9">
                    <SelectValue placeholder="Choisir un arrêt..." />
                  </SelectTrigger>
                  <SelectContent>
                    {currentRouteObj.stops.map((stop, idx) => (
                      <SelectItem key={idx} value={stop.name}>
                        {stop.name} (Matin: {stop.morning_time} — Soir: {stop.evening_time})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Type de trajet</Label>
                <Select value={newSubTripType} onValueChange={(v: any) => setNewSubTripType(v)}>
                  <SelectTrigger className="text-xs h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="round_trip">Aller-Retour complet (Matin & Soir)</SelectItem>
                    <SelectItem value="morning_only">Aller simple Matin uniquement</SelectItem>
                    <SelectItem value="evening_only">Retour simple Soir uniquement</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <DialogFooter className="pt-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setIsNewSubscriberOpen(false)}>
                  Annuler
                </Button>
                <Button type="submit" size="sm" className="bg-amber-600 hover:bg-amber-700 text-white font-bold">
                  Valider l'inscription
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* ── MODAL : ENCAISSER UN PAIEMENT TRANSPORT ── */}
        <Dialog open={isPaymentModalOpen} onOpenChange={setIsPaymentModalOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base font-bold text-foreground">
                <Banknote className="w-5 h-5 text-emerald-600" />
                Règlement Abonnement Transport
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Enregistrement du versement en caisse avec édition automatique du reçu officiel.
              </DialogDescription>
            </DialogHeader>

            {selectedSubForPayment && (
              <form onSubmit={handlePaymentSubmit} className="space-y-3 mt-2">
                <div className="bg-muted/40 p-3 rounded-xl space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Élève :</span>
                    <span className="font-bold text-foreground">{selectedSubForPayment.student_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Circuit & Arrêt :</span>
                    <span className="font-medium text-foreground">{selectedSubForPayment.route_name} ({selectedSubForPayment.pickup_stop})</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total exigé :</span>
                    <span className="font-bold text-foreground">{selectedSubForPayment.amount_due.toLocaleString('fr-FR')} F CFA</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Déjà versé :</span>
                    <span className="font-semibold text-emerald-600">{selectedSubForPayment.amount_paid.toLocaleString('fr-FR')} F CFA</span>
                  </div>
                  <div className="flex justify-between pt-1 border-t border-border/50 text-rose-600 font-bold">
                    <span>Reste à payer :</span>
                    <span>{selectedSubForPayment.remaining.toLocaleString('fr-FR')} F CFA</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Montant à encaisser (F CFA) *</Label>
                  <Input
                    type="number"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    placeholder="Montant du versement..."
                    className="text-xs h-9 font-bold text-emerald-700"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Mode de paiement *</Label>
                  <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                    <SelectTrigger className="text-xs h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Espèces">Espèces (Caisse comptabilité)</SelectItem>
                      <SelectItem value="CinetPay / Mobile Money">CinetPay / Mobile Money (Wave, Orange, MTN)</SelectItem>
                      <SelectItem value="Virement Bancaire">Virement Bancaire</SelectItem>
                      <SelectItem value="Chèque">Chèque Certifié</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Note / Référence reçu (facultatif)</Label>
                  <Input
                    value={paymentNotes}
                    onChange={(e) => setPaymentNotes(e.target.value)}
                    placeholder="Ex: Reçu n° 2025-045, mois de Novembre"
                    className="text-xs h-8"
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
            )}
          </DialogContent>
        </Dialog>

        {/* ── MODAL : CRÉER UN NOUVEAU CIRCUIT ── */}
        <Dialog open={isNewRouteModalOpen} onOpenChange={setIsNewRouteModalOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base font-bold text-foreground">
                <Bus className="w-5 h-5 text-amber-600" />
                Créer une Nouvelle Ligne de Transport
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Définissez le circuit, la tarification mensuelle et le minibus assigné.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleCreateRoute} className="space-y-3 mt-2">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Nom du Circuit *</Label>
                <Input
                  value={newRouteName}
                  onChange={(e) => setNewRouteName(e.target.value)}
                  placeholder="Ex: Circuit 4 — Angré / Djibi / 8ème Tranche"
                  className="text-xs h-8"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Code Ligne *</Label>
                  <Input
                    value={newRouteCode}
                    onChange={(e) => setNewRouteCode(e.target.value)}
                    placeholder="Ex: LIGNE-4"
                    className="text-xs h-8 font-mono uppercase"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Tarif Mensuel (FCFA) *</Label>
                  <Input
                    type="number"
                    value={newRouteMonthlyRate}
                    onChange={(e) => setNewRouteMonthlyRate(e.target.value)}
                    className="text-xs h-8 font-bold text-amber-800"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Véhicule assigné</Label>
                <Select
                  value={newRouteVehiclePlate}
                  onValueChange={(plate) => {
                    setNewRouteVehiclePlate(plate);
                    const veh = vehicles.find(v => v.plate_number === plate);
                    if (veh) {
                      setNewRouteDriverName(veh.driver_name);
                      setNewRouteDriverPhone(veh.driver_phone);
                    }
                  }}
                >
                  <SelectTrigger className="text-xs h-8">
                    <SelectValue placeholder="Sélectionner un véhicule..." />
                  </SelectTrigger>
                  <SelectContent>
                    {vehicles.map(v => (
                      <SelectItem key={v.id} value={v.plate_number}>
                        {v.plate_number} — {v.model} ({v.capacity} pl.)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Nom du Chauffeur</Label>
                  <Input
                    value={newRouteDriverName}
                    onChange={(e) => setNewRouteDriverName(e.target.value)}
                    placeholder="Ex: Konan Jean"
                    className="text-xs h-8"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Téléphone Chauffeur</Label>
                  <Input
                    value={newRouteDriverPhone}
                    onChange={(e) => setNewRouteDriverPhone(e.target.value)}
                    placeholder="+225 07..."
                    className="text-xs h-8"
                  />
                </div>
              </div>

              <DialogFooter className="pt-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setIsNewRouteModalOpen(false)}>
                  Annuler
                </Button>
                <Button type="submit" size="sm" className="bg-amber-600 hover:bg-amber-700 text-white font-bold">
                  Créer le circuit
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* ── MODAL : MODIFIER UN CIRCUIT ── */}
        <Dialog open={!!editingRoute} onOpenChange={(open) => !open && setEditingRoute(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base font-bold text-foreground">
                <Pencil className="w-5 h-5 text-amber-600" />
                Modifier le Circuit de Transport
              </DialogTitle>
            </DialogHeader>

            {editingRoute && (
              <form onSubmit={handleUpdateRoute} className="space-y-3 mt-2">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Nom du Circuit *</Label>
                  <Input
                    value={editingRoute.name}
                    onChange={(e) => setEditingRoute({ ...editingRoute, name: e.target.value })}
                    className="text-xs h-8"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Code Ligne *</Label>
                    <Input
                      value={editingRoute.code}
                      onChange={(e) => setEditingRoute({ ...editingRoute, code: e.target.value.toUpperCase() })}
                      className="text-xs h-8 font-mono uppercase"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Tarif Mensuel (FCFA) *</Label>
                    <Input
                      type="number"
                      value={editingRoute.monthly_rate_cfa}
                      onChange={(e) => setEditingRoute({ ...editingRoute, monthly_rate_cfa: parseInt(e.target.value) || 0 })}
                      className="text-xs h-8 font-bold text-amber-800"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Immatriculation Véhicule</Label>
                    <Input
                      value={editingRoute.vehicle_plate}
                      onChange={(e) => setEditingRoute({ ...editingRoute, vehicle_plate: e.target.value })}
                      className="text-xs h-8 font-mono uppercase"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Capacité Minibus</Label>
                    <Input
                      type="number"
                      value={editingRoute.vehicle_capacity}
                      onChange={(e) => setEditingRoute({ ...editingRoute, vehicle_capacity: parseInt(e.target.value) || 30 })}
                      className="text-xs h-8"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Nom Chauffeur</Label>
                    <Input
                      value={editingRoute.driver_name}
                      onChange={(e) => setEditingRoute({ ...editingRoute, driver_name: e.target.value })}
                      className="text-xs h-8"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Téléphone Chauffeur</Label>
                    <Input
                      value={editingRoute.driver_phone}
                      onChange={(e) => setEditingRoute({ ...editingRoute, driver_phone: e.target.value })}
                      className="text-xs h-8"
                    />
                  </div>
                </div>

                <DialogFooter className="pt-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => setEditingRoute(null)}>
                    Annuler
                  </Button>
                  <Button type="submit" size="sm" className="bg-amber-600 hover:bg-amber-700 text-white font-bold">
                    Enregistrer les modifications
                  </Button>
                </DialogFooter>
              </form>
            )}
          </DialogContent>
        </Dialog>

        {/* ── MODAL : GÉRER LES ARRÊTS D'UN CIRCUIT ── */}
        <Dialog open={!!selectedRouteForStops} onOpenChange={(open) => !open && setSelectedRouteForStops(null)}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base font-bold text-foreground">
                <MapPin className="w-5 h-5 text-amber-600" />
                Arrêts & Horaires : {selectedRouteForStops?.name}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Consultez, ajoutez ou retirez des points de ramassage avec les horaires de passage matin et soir.
              </DialogDescription>
            </DialogHeader>

            {selectedRouteForStops && (
              <div className="space-y-4 my-2 text-xs">
                {/* Liste des arrêts actuels */}
                <div className="space-y-2">
                  <span className="font-bold text-foreground text-xs uppercase tracking-wider block">
                    Arrêts Définis ({selectedRouteForStops.stops.length})
                  </span>

                  <div className="border border-border rounded-xl divide-y divide-border overflow-hidden">
                    {selectedRouteForStops.stops.length === 0 ? (
                      <p className="p-4 text-center text-muted-foreground italic">
                        Aucun arrêt configuré pour cette ligne.
                      </p>
                    ) : (
                      selectedRouteForStops.stops.map((stop, idx) => (
                        <div key={idx} className="p-3 flex items-center justify-between gap-2 hover:bg-muted/30">
                          <div className="flex items-center gap-2.5">
                            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-100 text-amber-800 font-bold text-[11px] shrink-0">
                              {idx + 1}
                            </span>
                            <div>
                              <p className="font-bold text-foreground text-xs">{stop.name}</p>
                              <div className="text-[10px] text-muted-foreground flex items-center gap-2 mt-0.5">
                                <span>Matin : <strong className="text-foreground">{stop.morning_time}</strong></span>
                                <span>•</span>
                                <span>Soir : <strong className="text-foreground">{stop.evening_time}</strong></span>
                              </div>
                            </div>
                          </div>

                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveStop(selectedRouteForStops.id, idx)}
                            className="h-7 w-7 p-0 text-muted-foreground hover:text-rose-600 hover:bg-rose-50"
                            title="Retirer cet arrêt"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Formulaire ajout d'un arrêt */}
                <form onSubmit={handleAddStop} className="p-3.5 rounded-xl border border-amber-200 bg-amber-50/40 space-y-3">
                  <span className="font-bold text-amber-900 text-xs block">
                    + Ajouter un point de ramassage
                  </span>

                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Nom du lieu / Arrêt *</Label>
                    <Input
                      value={newStopName}
                      onChange={(e) => setNewStopName(e.target.value)}
                      placeholder="Ex: Pharmacie Sainte Cécile ou Carrefour Duncan"
                      className="text-xs h-8 bg-white"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold">Heure Matin *</Label>
                      <Input
                        type="time"
                        value={newStopMorningTime}
                        onChange={(e) => setNewStopMorningTime(e.target.value)}
                        className="text-xs h-8 bg-white"
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold">Heure Soir *</Label>
                      <Input
                        type="time"
                        value={newStopEveningTime}
                        onChange={(e) => setNewStopEveningTime(e.target.value)}
                        className="text-xs h-8 bg-white"
                        required
                      />
                    </div>
                  </div>

                  <Button type="submit" size="sm" className="w-full text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white">
                    Insérer cet arrêt
                  </Button>
                </form>

                <DialogFooter className="pt-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => setSelectedRouteForStops(null)}>
                    Fermer
                  </Button>
                </DialogFooter>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* ── MODAL : FEUILLE DE ROUTE DU CHAUFFEUR (IMPRIMABLE) ── */}
        <Dialog open={!!isPrintRouteOpen} onOpenChange={(open) => !open && setIsPrintRouteOpen(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base font-bold text-foreground">
                <Printer className="w-5 h-5 text-blue-600" />
                Feuille de Route & Manifeste Passagers
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Document de bord pour le chauffeur et l'accompagnateur de bus.
              </DialogDescription>
            </DialogHeader>

            {isPrintRouteOpen && (
              <div className="space-y-4 my-2 text-xs">
                {/* En-tête officiel de la feuille de route */}
                <div className="p-4 rounded-xl border border-border bg-slate-50 space-y-2">
                  <div className="flex justify-between items-start pb-2 border-b border-border">
                    <div>
                      <h4 className="font-bold text-sm text-foreground uppercase tracking-wide">
                        {isPrintRouteOpen.name}
                      </h4>
                      <p className="text-[11px] font-mono text-muted-foreground">Code : {isPrintRouteOpen.code}</p>
                    </div>
                    <span className="font-mono font-bold text-xs bg-foreground text-background px-2.5 py-1 rounded">
                      {isPrintRouteOpen.vehicle_plate}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px] pt-1">
                    <div>
                      <span className="text-muted-foreground block">Chauffeur attitré :</span>
                      <strong className="text-foreground">{isPrintRouteOpen.driver_name}</strong>
                    </div>
                    <div>
                      <span className="text-muted-foreground block">Téléphone chauffeur :</span>
                      <strong className="text-foreground">{isPrintRouteOpen.driver_phone || '—'}</strong>
                    </div>
                    <div>
                      <span className="text-muted-foreground block">Capacité véhicule :</span>
                      <strong className="text-foreground">{isPrintRouteOpen.vehicle_capacity} places assises</strong>
                    </div>
                  </div>
                </div>

                {/* Itinéraire des arrêts */}
                <div>
                  <h5 className="font-bold text-xs text-foreground uppercase tracking-wider mb-2">
                    Itinéraire & Horaires de passage ({isPrintRouteOpen.stops.length} étapes)
                  </h5>
                  <div className="border border-border rounded-xl divide-y divide-border overflow-hidden">
                    {isPrintRouteOpen.stops.map((st, i) => (
                      <div key={i} className="p-2.5 flex justify-between items-center bg-card">
                        <span className="font-semibold text-foreground">
                          {i + 1}. {st.name}
                        </span>
                        <div className="flex gap-4 font-mono text-[11px]">
                          <span>Matin : <b>{st.morning_time}</b></span>
                          <span>Soir : <b>{st.evening_time}</b></span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Liste des élèves transportés */}
                <div>
                  <h5 className="font-bold text-xs text-foreground uppercase tracking-wider mb-2">
                    Élèves Inscrits sur cette Ligne ({transportSubscribers.filter(s => s.route_id === isPrintRouteOpen.id).length})
                  </h5>
                  <div className="border border-border rounded-xl overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-muted/50 border-b border-border text-[10px] uppercase font-bold text-muted-foreground">
                        <tr>
                          <th className="p-2">Élève & Classe</th>
                          <th className="p-2">Arrêt</th>
                          <th className="p-2">Trajet</th>
                          <th className="p-2">Parent & Téléphone d'urgence</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {transportSubscribers
                          .filter(s => s.route_id === isPrintRouteOpen.id)
                          .map((sub, idx) => (
                            <tr key={idx} className="hover:bg-muted/20">
                              <td className="p-2 font-bold text-foreground">
                                {sub.student_name} <span className="text-[10px] font-normal text-muted-foreground">({sub.class_name})</span>
                              </td>
                              <td className="p-2 font-medium text-foreground">{sub.pickup_stop}</td>
                              <td className="p-2">
                                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-blue-100 text-blue-800">
                                  {sub.trip_type === 'round_trip' ? 'A/R' : sub.trip_type === 'morning_only' ? 'Matin' : 'Soir'}
                                </span>
                              </td>
                              <td className="p-2">
                                <div className="font-medium text-foreground">{sub.parent_name}</div>
                                <div className="font-mono text-[10px] text-muted-foreground">{sub.parent_phone}</div>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <DialogFooter className="pt-2 flex justify-between sm:justify-between items-center">
                  <Button type="button" variant="outline" size="sm" onClick={() => setIsPrintRouteOpen(null)}>
                    Fermer
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => window.print()}
                    className="gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold"
                  >
                    <Printer className="w-4 h-4" /> Imprimer la feuille de route
                  </Button>
                </DialogFooter>
              </div>
            )}
          </DialogContent>
        </Dialog>

      </div>
    </AppShell>
  );
}
