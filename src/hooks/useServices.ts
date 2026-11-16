import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from './useAuth';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

// ─── TYPES CANTINE ───────────────────────────────────────────────────────────
export interface CantinePlan {
  id: string;
  name: string;
  code: string;
  description: string;
  price_cfa: number;
  period: 'monthly' | 'trimester' | 'annual' | 'ticket';
  meals_per_week: number;
}

export interface CantineSubscriber {
  id: string;
  student_id: string;
  student_name: string;
  student_code: string;
  class_name: string;
  parent_name: string;
  parent_phone: string;
  plan_id: string;
  plan_name: string;
  amount_due: number;
  amount_paid: number;
  remaining: number;
  status: 'paid' | 'partial' | 'pending';
  dietary_notes?: string;
  is_active: boolean;
  registered_at: string;
}

export interface DailyMenu {
  id: string;
  day: 'Lundi' | 'Mardi' | 'Mercredi' | 'Jeudi' | 'Vendredi';
  date_label: string;
  starter: string;
  main_dish: string;
  dessert: string;
  snack: string;
}

export interface MealAttendance {
  id: string;
  date: string;
  student_id: string;
  student_name: string;
  class_name: string;
  checked_in: boolean;
  check_in_time?: string;
}

// ─── TYPES TRANSPORT ─────────────────────────────────────────────────────────
export interface TransportRoute {
  id: string;
  name: string;
  code: string;
  driver_name: string;
  driver_phone: string;
  vehicle_plate: string;
  vehicle_capacity: number;
  stops_count: number;
  stops: { name: string; morning_time: string; evening_time: string }[];
  monthly_rate_cfa: number;
}

export interface TransportSubscriber {
  id: string;
  student_id: string;
  student_name: string;
  student_code: string;
  class_name: string;
  parent_name: string;
  parent_phone: string;
  route_id: string;
  route_name: string;
  pickup_stop: string;
  trip_type: 'round_trip' | 'morning_only' | 'evening_only';
  amount_due: number;
  amount_paid: number;
  remaining: number;
  status: 'paid' | 'partial' | 'pending';
  is_active: boolean;
  registered_at: string;
}

export interface Vehicle {
  id: string;
  plate_number: string;
  model: string;
  capacity: number;
  driver_name: string;
  driver_phone: string;
  insurance_expiry: string;
  status: 'operational' | 'maintenance' | 'standby';
}

// ─── DONNÉES PAR DÉFAUT (INITIALES) ──────────────────────────────────────────
const DEFAULT_CANTINE_PLANS: CantinePlan[] = [
  { id: 'cp_1', name: 'Forfait Mensuel Complet', code: 'MENS-FULL', description: 'Repas midi + goûter tous les jours scolaires', price_cfa: 25000, period: 'monthly', meals_per_week: 5 },
  { id: 'cp_2', name: 'Forfait Trimestriel', code: 'TRIM-FULL', description: 'Abonnement sur 3 mois avec réduction de 10%', price_cfa: 68000, period: 'trimester', meals_per_week: 5 },
  { id: 'cp_3', name: 'Demi-Forfait (3 jours/semaine)', code: 'DEMI-3J', description: 'Lundi, Mardi et Jeudi (cours intensifs)', price_cfa: 18000, period: 'monthly', meals_per_week: 3 },
  { id: 'cp_4', name: 'Carnet de 10 Tickets', code: 'TICK-10', description: 'Tickets repas rechargeables valables toute l\'année', price_cfa: 15000, period: 'ticket', meals_per_week: 0 },
];

const DEFAULT_WEEKLY_MENUS: DailyMenu[] = [
  { id: 'm_1', day: 'Lundi', date_label: 'Lundi', starter: 'Salade de crudités de saison', main_dish: 'Riz au gras sénégalais avec poulet braisé', dessert: 'Salade de fruits locaux (ananas & papaye)', snack: 'Pain au lait & Jus de bissap frais' },
  { id: 'm_2', day: 'Mardi', date_label: 'Mardi', starter: 'Potage velouté de potiron', main_dish: 'Foutou de banane / attiéké au poisson capitaine sauce claire', dessert: 'Yaourt doux vanille', snack: 'Beignets soufflés & yaourt' },
  { id: 'm_3', day: 'Mercredi', date_label: 'Mercredi', starter: 'Salade de tomates et concombres', main_dish: 'Spaghetti bolognaise à la viande de bœuf hachée', dessert: 'Banane flambée douce', snack: 'Gâteau marbré maison' },
  { id: 'm_4', day: 'Jeudi', date_label: 'Jeudi', starter: 'Avocats aux crevettes fraîches', main_dish: 'Riz blanc & sauce graine au poisson fumé', dessert: 'Mangue découpée fraîche', snack: 'Pain beurré & Lait chaud au chocolat' },
  { id: 'm_5', day: 'Vendredi', date_label: 'Vendredi', starter: 'Salade composée maïs & thon', main_dish: 'Plat de frites fraîches & brochettes de bœuf grillées', dessert: 'Crème caramel vanillée', snack: 'Crêpes au miel ou chocolat' },
];

const DEFAULT_CANTINE_SUBSCRIBERS: CantineSubscriber[] = [
  { id: 'cs_1', student_id: 'st_1', student_name: 'Kouassi Aïcha', student_code: 'ERK-2025-0142', class_name: 'Tle S', parent_name: 'M. Kouassi Jean', parent_phone: '+225 07 48 12 34 56', plan_id: 'cp_1', plan_name: 'Forfait Mensuel Complet', amount_due: 25000, amount_paid: 25000, remaining: 0, status: 'paid', dietary_notes: 'Sans arachide', is_active: true, registered_at: '2025-09-15' },
  { id: 'cs_2', student_id: 'st_2', student_name: 'Traoré Moussa', student_code: 'ERK-2025-0087', class_name: 'Tle S', parent_name: 'Mme Traoré Fatou', parent_phone: '+225 05 12 89 76 43', plan_id: 'cp_2', plan_name: 'Forfait Trimestriel', amount_due: 68000, amount_paid: 35000, remaining: 33000, status: 'partial', is_active: true, registered_at: '2025-09-16' },
  { id: 'cs_3', student_id: 'st_3', student_name: 'Diallo Fatoumata', student_code: 'ERK-2025-0231', class_name: '3ème 2', parent_name: 'Dr. Diallo Mamadou', parent_phone: '+225 01 77 44 22 11', plan_id: 'cp_1', plan_name: 'Forfait Mensuel Complet', amount_due: 25000, amount_paid: 25000, remaining: 0, status: 'paid', is_active: true, registered_at: '2025-09-20' },
  { id: 'cs_4', student_id: 'st_4', student_name: 'Ouédraogo Salimata', student_code: 'ERK-2025-0322', class_name: 'CM2 A', parent_name: 'Mme Ouédraogo Alice', parent_phone: '+225 07 88 55 33 22', plan_id: 'cp_1', plan_name: 'Forfait Mensuel Complet', amount_due: 25000, amount_paid: 0, remaining: 25000, status: 'pending', dietary_notes: 'Végétarienne le vendredi', is_active: true, registered_at: '2025-10-01' },
  { id: 'cs_5', student_id: 'st_5', student_name: 'Sy Awa', student_code: 'ERK-2025-0505', class_name: 'CP1 A', parent_name: 'M. Sy Ousmane', parent_phone: '+225 05 66 99 88 77', plan_id: 'cp_3', plan_name: 'Demi-Forfait (3 jours/semaine)', amount_due: 18000, amount_paid: 18000, remaining: 0, status: 'paid', is_active: true, registered_at: '2025-09-22' },
];

const DEFAULT_TRANSPORT_ROUTES: TransportRoute[] = [
  {
    id: 'tr_1',
    name: 'Circuit 1 — Riviera / Cocody / Faya',
    code: 'LIGNE-1',
    driver_name: 'Koffi Germain',
    driver_phone: '+225 07 09 88 77 66',
    vehicle_plate: '4589-KJ-01',
    vehicle_capacity: 32,
    stops_count: 5,
    stops: [
      { name: 'Palmeraie Rond-point Ado', morning_time: '06:40', evening_time: '17:15' },
      { name: 'Riviera 2 Sainte Famille', morning_time: '06:55', evening_time: '17:00' },
      { name: 'Carrefour Faya Nouveau Goudron', morning_time: '07:10', evening_time: '16:45' },
      { name: 'Abatta Village Cité Sir', morning_time: '07:25', evening_time: '16:30' },
      { name: 'Arrivée Établissement', morning_time: '07:45', evening_time: '16:15' },
    ],
    monthly_rate_cfa: 25000,
  },
  {
    id: 'tr_2',
    name: 'Circuit 2 — Yopougon / Niangon / Toit-Rouge',
    code: 'LIGNE-2',
    driver_name: 'Bamba Souleymane',
    driver_phone: '+225 05 44 33 22 11',
    vehicle_plate: '8912-HM-01',
    vehicle_capacity: 28,
    stops_count: 4,
    stops: [
      { name: 'Niangon Sud Pharmacie Concorde', morning_time: '06:30', evening_time: '17:30' },
      { name: 'Yopougon Siporex', morning_time: '06:50', evening_time: '17:10' },
      { name: 'Toit-Rouge Carrefour Lubafrique', morning_time: '07:10', evening_time: '16:50' },
      { name: 'Arrivée Établissement', morning_time: '07:40', evening_time: '16:20' },
    ],
    monthly_rate_cfa: 28000,
  },
  {
    id: 'tr_3',
    name: 'Circuit 3 — Marcory / Koumassi / Zone 4',
    code: 'LIGNE-3',
    driver_name: 'Diarra Moussa',
    driver_phone: '+225 01 22 33 44 55',
    vehicle_plate: '1245-LL-01',
    vehicle_capacity: 30,
    stops_count: 4,
    stops: [
      { name: 'Koumassi Grand Carrefour', morning_time: '06:45', evening_time: '17:20' },
      { name: 'Marcory Résidentiel Église Ste Thérèse', morning_time: '07:05', evening_time: '17:00' },
      { name: 'Zone 4 Rue du Canal', morning_time: '07:20', evening_time: '16:45' },
      { name: 'Arrivée Établissement', morning_time: '07:45', evening_time: '16:15' },
    ],
    monthly_rate_cfa: 25000,
  },
];

const DEFAULT_TRANSPORT_SUBSCRIBERS: TransportSubscriber[] = [
  { id: 'ts_1', student_id: 'st_1', student_name: 'Kouassi Aïcha', student_code: 'ERK-2025-0142', class_name: 'Tle S', parent_name: 'M. Kouassi Jean', parent_phone: '+225 07 48 12 34 56', route_id: 'tr_1', route_name: 'Circuit 1 — Riviera / Cocody / Faya', pickup_stop: 'Palmeraie Rond-point Ado', trip_type: 'round_trip', amount_due: 25000, amount_paid: 25000, remaining: 0, status: 'paid', is_active: true, registered_at: '2025-09-15' },
  { id: 'ts_2', student_id: 'st_3', student_name: 'Diallo Fatoumata', student_code: 'ERK-2025-0231', class_name: '3ème 2', parent_name: 'Dr. Diallo Mamadou', parent_phone: '+225 01 77 44 22 11', route_id: 'tr_1', route_name: 'Circuit 1 — Riviera / Cocody / Faya', pickup_stop: 'Carrefour Faya Nouveau Goudron', trip_type: 'round_trip', amount_due: 25000, amount_paid: 15000, remaining: 10000, status: 'partial', is_active: true, registered_at: '2025-09-20' },
  { id: 'ts_3', student_id: 'st_4', student_name: 'Ouédraogo Salimata', student_code: 'ERK-2025-0322', class_name: 'CM2 A', parent_name: 'Mme Ouédraogo Alice', parent_phone: '+225 07 88 55 33 22', route_id: 'tr_2', route_name: 'Circuit 2 — Yopougon / Niangon / Toit-Rouge', pickup_stop: 'Yopougon Siporex', trip_type: 'round_trip', amount_due: 28000, amount_paid: 0, remaining: 28000, status: 'pending', is_active: true, registered_at: '2025-10-01' },
  { id: 'ts_4', student_id: 'st_5', student_name: 'Sy Awa', student_code: 'ERK-2025-0505', class_name: 'CP1 A', parent_name: 'M. Sy Ousmane', parent_phone: '+225 05 66 99 88 77', route_id: 'tr_3', route_name: 'Circuit 3 — Marcory / Koumassi / Zone 4', pickup_stop: 'Marcory Résidentiel', trip_type: 'round_trip', amount_due: 25000, amount_paid: 25000, remaining: 0, status: 'paid', is_active: true, registered_at: '2025-09-22' },
];

const DEFAULT_VEHICLES: Vehicle[] = [
  { id: 'v_1', plate_number: '4589-KJ-01', model: 'Toyota Coaster (Climatisé)', capacity: 32, driver_name: 'Koffi Germain', driver_phone: '+225 07 09 88 77 66', insurance_expiry: '2026-08-30', status: 'operational' },
  { id: 'v_2', plate_number: '8912-HM-01', model: 'Hyundai County (Climatisé)', capacity: 28, driver_name: 'Bamba Souleymane', driver_phone: '+225 05 44 33 22 11', insurance_expiry: '2026-09-15', status: 'operational' },
  { id: 'v_3', plate_number: '1245-LL-01', model: 'Mercedes-Benz Sprinter 516', capacity: 30, driver_name: 'Diarra Moussa', driver_phone: '+225 01 22 33 44 55', insurance_expiry: '2026-11-20', status: 'operational' },
];

export function useServices() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const tenantId = profile?.tenant_id || 'default_tenant';

  // Clés de cache localisées par tenant
  const CANTINE_KEY = `eureka_cantine_${tenantId}`;
  const TRANSPORT_KEY = `eureka_transport_${tenantId}`;
  const MENUS_KEY = `eureka_menus_${tenantId}`;
  const VEHICLES_KEY = `eureka_vehicles_${tenantId}`;
  const ATTENDANCE_KEY = `eureka_cantine_attendance_${tenantId}`;

  // Récupérer depuis localStorage avec fallback
  const getStored = <T>(key: string, fallback: T): T => {
    if (typeof window === 'undefined') return fallback;
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : fallback;
    } catch {
      return fallback;
    }
  };

  const setStored = <T>(key: string, data: T) => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
      console.warn("Storage error", e);
    }
  };

  // ── 1. ÉTAT CANTINE ────────────────────────────────────────────────────────
  const [cantinePlans, setCantinePlans] = useState<CantinePlan[]>(() =>
    getStored(CANTINE_KEY + '_plans', DEFAULT_CANTINE_PLANS)
  );

  const [cantineSubscribers, setCantineSubscribers] = useState<CantineSubscriber[]>(() =>
    getStored(CANTINE_KEY + '_subscribers', DEFAULT_CANTINE_SUBSCRIBERS)
  );

  const [weeklyMenus, setWeeklyMenus] = useState<DailyMenu[]>(() =>
    getStored(MENUS_KEY, DEFAULT_WEEKLY_MENUS)
  );

  const [mealAttendance, setMealAttendance] = useState<Record<string, boolean>>(() =>
    getStored(ATTENDANCE_KEY, {
      'st_1': true,
      'st_2': true,
      'st_3': true,
      'st_5': true,
    })
  );

  // ── 2. ÉTAT TRANSPORT ──────────────────────────────────────────────────────
  const [transportRoutes, setTransportRoutes] = useState<TransportRoute[]>(() =>
    getStored(TRANSPORT_KEY + '_routes', DEFAULT_TRANSPORT_ROUTES)
  );

  const [transportSubscribers, setTransportSubscribers] = useState<TransportSubscriber[]>(() =>
    getStored(TRANSPORT_KEY + '_subscribers', DEFAULT_TRANSPORT_SUBSCRIBERS)
  );

  const [vehicles, setVehicles] = useState<Vehicle[]>(() =>
    getStored(VEHICLES_KEY, DEFAULT_VEHICLES)
  );

  // Synchronisation automatique dans localStorage
  useEffect(() => {
    setStored(CANTINE_KEY + '_subscribers', cantineSubscribers);
  }, [cantineSubscribers, CANTINE_KEY]);

  useEffect(() => {
    setStored(TRANSPORT_KEY + '_routes', transportRoutes);
  }, [transportRoutes, TRANSPORT_KEY]);

  useEffect(() => {
    setStored(TRANSPORT_KEY + '_subscribers', transportSubscribers);
  }, [transportSubscribers, TRANSPORT_KEY]);

  useEffect(() => {
    setStored(MENUS_KEY, weeklyMenus);
  }, [weeklyMenus, MENUS_KEY]);

  useEffect(() => {
    setStored(ATTENDANCE_KEY, mealAttendance);
  }, [mealAttendance, ATTENDANCE_KEY]);

  useEffect(() => {
    setStored(VEHICLES_KEY, vehicles);
  }, [vehicles, VEHICLES_KEY]);

  // ── 3. ACTIONS CANTINE ─────────────────────────────────────────────────────
  const registerCantineSubscriber = (newSub: Omit<CantineSubscriber, 'id' | 'amount_due' | 'amount_paid' | 'remaining' | 'status' | 'is_active' | 'registered_at'>) => {
    const plan = cantinePlans.find(p => p.id === newSub.plan_id) || cantinePlans[0];
    const sub: CantineSubscriber = {
      ...newSub,
      id: `cs_${Date.now()}`,
      plan_name: plan.name,
      amount_due: plan.price_cfa,
      amount_paid: 0,
      remaining: plan.price_cfa,
      status: 'pending',
      is_active: true,
      registered_at: new Date().toISOString().split('T')[0],
    };
    setCantineSubscribers(prev => [sub, ...prev]);
    toast.success(`Élève ${sub.student_name} inscrit à la cantine (${plan.name})`);
    return sub;
  };

  const recordCantinePayment = async (subscriberId: string, amount: number, method: string, notes?: string) => {
    setCantineSubscribers(prev => prev.map(s => {
      if (s.id !== subscriberId) return s;
      const newPaid = s.amount_paid + amount;
      const newRemaining = Math.max(0, s.amount_due - newPaid);
      const newStatus = newRemaining === 0 ? 'paid' : (newPaid > 0 ? 'partial' : 'pending');
      return {
        ...s,
        amount_paid: newPaid,
        remaining: newRemaining,
        status: newStatus,
      };
    }));

    // Inscription du paiement en caisse dans Supabase student_payments
    try {
      const sub = cantineSubscribers.find(s => s.id === subscriberId);
      if (sub && tenantId) {
        const receiptNumber = `REC-CANT-${Date.now().toString().slice(-5)}`;
        await supabase.from('student_payments').insert([{
          tenant_id: tenantId,
          student_id: sub.student_id,
          amount_paid: amount,
          payment_method: method,
          transaction_reference: `CANT-${Date.now().toString().slice(-6)}`,
          receipt_number: receiptNumber,
          parent_email: null,
          phone_number: sub.parent_phone,
          notes: notes ? `Cantine Scolaire : ${notes}` : `Règlement Cantine — Formule ${sub.plan_name}`,
          is_validated: true,
        }]);
        queryClient.invalidateQueries({ queryKey: ['accounting_payments'] });
      }
    } catch (e) {
      console.warn("Could not save to student_payments table", e);
    }

    toast.success(`Paiement cantine de ${amount.toLocaleString('fr-FR')} FCFA enregistré !`);
  };

  const toggleMealAttendance = (studentId: string) => {
    setMealAttendance(prev => {
      const next = { ...prev, [studentId]: !prev[studentId] };
      toast.success(next[studentId] ? "Élève pointé présent au réfectoire" : "Pointage retiré");
      return next;
    });
  };

  const updateMenu = (updatedMenu: DailyMenu) => {
    setWeeklyMenus(prev => prev.map(m => m.id === updatedMenu.id ? updatedMenu : m));
    toast.success(`Menu du ${updatedMenu.day} mis à jour`);
  };

  const addMenu = (newMenu: Omit<DailyMenu, 'id'>) => {
    const m: DailyMenu = {
      ...newMenu,
      id: `m_${Date.now()}`,
    };
    setWeeklyMenus(prev => [...prev, m]);
    toast.success(`Menu du ${m.day} ajouté au planning`);
    return m;
  };

  const deleteMenu = (menuId: string) => {
    setWeeklyMenus(prev => prev.filter(m => m.id !== menuId));
    toast.success("Journée retirée du menu");
  };

  const resetDefaultMenus = () => {
    setWeeklyMenus(DEFAULT_WEEKLY_MENUS);
    toast.success("Menu réinitialisé avec la semaine type");
  };

  // ── 4. ACTIONS TRANSPORT ───────────────────────────────────────────────────
  const registerTransportSubscriber = (newSub: Omit<TransportSubscriber, 'id' | 'amount_due' | 'amount_paid' | 'remaining' | 'status' | 'is_active' | 'registered_at'>) => {
    const route = transportRoutes.find(r => r.id === newSub.route_id) || transportRoutes[0];
    const sub: TransportSubscriber = {
      ...newSub,
      id: `ts_${Date.now()}`,
      route_name: route.name,
      amount_due: route.monthly_rate_cfa,
      amount_paid: 0,
      remaining: route.monthly_rate_cfa,
      status: 'pending',
      is_active: true,
      registered_at: new Date().toISOString().split('T')[0],
    };
    setTransportSubscribers(prev => [sub, ...prev]);
    toast.success(`Élève ${sub.student_name} inscrit au circuit ${route.name}`);
    return sub;
  };

  const recordTransportPayment = async (subscriberId: string, amount: number, method: string, notes?: string) => {
    setTransportSubscribers(prev => prev.map(s => {
      if (s.id !== subscriberId) return s;
      const newPaid = s.amount_paid + amount;
      const newRemaining = Math.max(0, s.amount_due - newPaid);
      const newStatus = newRemaining === 0 ? 'paid' : (newPaid > 0 ? 'partial' : 'pending');
      return {
        ...s,
        amount_paid: newPaid,
        remaining: newRemaining,
        status: newStatus,
      };
    }));

    // Inscription du paiement en caisse dans Supabase student_payments
    try {
      const sub = transportSubscribers.find(s => s.id === subscriberId);
      if (sub && tenantId) {
        const receiptNumber = `REC-TRAN-${Date.now().toString().slice(-5)}`;
        await supabase.from('student_payments').insert([{
          tenant_id: tenantId,
          student_id: sub.student_id,
          amount_paid: amount,
          payment_method: method,
          transaction_reference: `TRAN-${Date.now().toString().slice(-6)}`,
          receipt_number: receiptNumber,
          parent_email: null,
          phone_number: sub.parent_phone,
          notes: notes ? `Transport Scolaire : ${notes}` : `Règlement Transport — ${sub.route_name} (${sub.pickup_stop})`,
          is_validated: true,
        }]);
        queryClient.invalidateQueries({ queryKey: ['accounting_payments'] });
      }
    } catch (e) {
      console.warn("Could not save to student_payments table", e);
    }

    toast.success(`Paiement transport de ${amount.toLocaleString('fr-FR')} FCFA enregistré !`);
  };

  const addVehicle = (newVeh: Omit<Vehicle, 'id'>) => {
    const v: Vehicle = { ...newVeh, id: `v_${Date.now()}` };
    setVehicles(prev => [...prev, v]);
    toast.success(`Véhicule ${v.plate_number} ajouté à la flotte`);
  };

  const addTransportRoute = (newRoute: Omit<TransportRoute, 'id' | 'stops_count'>) => {
    const r: TransportRoute = {
      ...newRoute,
      id: `tr_${Date.now()}`,
      stops_count: newRoute.stops?.length || 0,
    };
    setTransportRoutes(prev => [...prev, r]);
    toast.success(`Circuit ${r.name} créé avec succès`);
    return r;
  };

  const updateTransportRoute = (updatedRoute: TransportRoute) => {
    const routeWithCount = {
      ...updatedRoute,
      stops_count: updatedRoute.stops?.length || 0,
    };
    setTransportRoutes(prev => prev.map(r => r.id === routeWithCount.id ? routeWithCount : r));
    toast.success(`Circuit ${updatedRoute.name} mis à jour`);
  };

  const deleteTransportRoute = (routeId: string) => {
    const hasSubscribers = transportSubscribers.some(s => s.route_id === routeId && s.is_active);
    if (hasSubscribers) {
      toast.error("Impossible de supprimer ce circuit : des élèves y sont encore inscrits.");
      return false;
    }
    setTransportRoutes(prev => prev.filter(r => r.id !== routeId));
    toast.success("Circuit supprimé avec succès");
    return true;
  };

  const addStopToRoute = (routeId: string, stop: { name: string; morning_time: string; evening_time: string }) => {
    setTransportRoutes(prev => prev.map(r => {
      if (r.id !== routeId) return r;
      const updatedStops = [...r.stops, stop];
      return {
        ...r,
        stops: updatedStops,
        stops_count: updatedStops.length,
      };
    }));
    toast.success(`Arrêt « ${stop.name} » ajouté au circuit`);
  };

  const removeStopFromRoute = (routeId: string, stopIndex: number) => {
    setTransportRoutes(prev => prev.map(r => {
      if (r.id !== routeId) return r;
      const updatedStops = r.stops.filter((_, idx) => idx !== stopIndex);
      return {
        ...r,
        stops: updatedStops,
        stops_count: updatedStops.length,
      };
    }));
    toast.success("Arrêt retiré du circuit");
  };

  // Statistiques calculées pour la cantine
  const cantineStats = {
    totalSubscribers: cantineSubscribers.filter(s => s.is_active).length,
    todayPresent: Object.values(mealAttendance).filter(Boolean).length,
    totalRevenue: cantineSubscribers.reduce((acc, s) => acc + s.amount_paid, 0),
    totalRemaining: cantineSubscribers.reduce((acc, s) => acc + s.remaining, 0),
    recoveryRate: Math.round(
      (cantineSubscribers.reduce((acc, s) => acc + s.amount_paid, 0) /
        Math.max(1, cantineSubscribers.reduce((acc, s) => acc + s.amount_due, 0))) * 100
    ),
  };

  // Statistiques calculées pour le transport
  const transportStats = {
    totalSubscribers: transportSubscribers.filter(s => s.is_active).length,
    activeRoutes: transportRoutes.length,
    operationalVehicles: vehicles.filter(v => v.status === 'operational').length,
    totalRevenue: transportSubscribers.reduce((acc, s) => acc + s.amount_paid, 0),
    totalRemaining: transportSubscribers.reduce((acc, s) => acc + s.remaining, 0),
    recoveryRate: Math.round(
      (transportSubscribers.reduce((acc, s) => acc + s.amount_paid, 0) /
        Math.max(1, transportSubscribers.reduce((acc, s) => acc + s.amount_due, 0))) * 100
    ),
  };

  return {
    // Cantine
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

    // Transport
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
  };
}
