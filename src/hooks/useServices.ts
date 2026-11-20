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

const DEFAULT_CANTINE_SUBSCRIBERS: CantineSubscriber[] = [];

const DEFAULT_TRANSPORT_ROUTES: TransportRoute[] = [
  {
    id: 'tr_1',
    name: 'Circuit 1 — Ligne Nord',
    code: 'LIGNE-1',
    driver_name: 'Chauffeur Établissement',
    driver_phone: '+225 07 00 00 00 00',
    vehicle_plate: 'CI-01-BUS',
    vehicle_capacity: 32,
    stops_count: 3,
    stops: [
      { name: 'Arrêt 1', morning_time: '06:40', evening_time: '17:15' },
      { name: 'Arrêt 2', morning_time: '07:00', evening_time: '17:00' },
      { name: 'Arrivée Établissement', morning_time: '07:30', evening_time: '16:30' },
    ],
    monthly_rate_cfa: 25000,
  },
];

const DEFAULT_TRANSPORT_SUBSCRIBERS: TransportSubscriber[] = [];

const DEFAULT_VEHICLES: Vehicle[] = [];

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
    getStored(ATTENDANCE_KEY, {})
  );

  // ── CHARGEMENT DEPUIS SUPABASE (SI DISPONIBLE) ─────────────
  useEffect(() => {
    if (!tenantId || tenantId === 'default_tenant') return;

    // Charger les abonnés réels depuis Supabase
    const fetchSupabaseData = async () => {
      try {
        const { data: dbSubs, error: subsErr } = await supabase
          .from('canteen_subscriptions')
          .select(`
            *,
            students (
              id,
              first_name,
              last_name,
              student_code,
              guardian_name,
              guardian_phone,
              classes (name)
            )
          `)
          .eq('tenant_id', tenantId);

        if (!subsErr && dbSubs && dbSubs.length > 0) {
          const formatted: CantineSubscriber[] = dbSubs.map((item: any) => ({
            id: item.id,
            student_id: item.student_id,
            student_name: item.students ? `${item.students.first_name} ${item.students.last_name}` : 'Élève',
            student_code: item.students?.student_code || 'ERK-MAT',
            class_name: item.students?.classes?.name || 'Sans classe',
            parent_name: item.students?.guardian_name || 'Parent d\'élève',
            parent_phone: item.students?.guardian_phone || '',
            plan_id: item.plan_id || '',
            plan_name: item.plan_name || 'Formule Cantine',
            amount_due: Number(item.amount_due) || 0,
            amount_paid: Number(item.amount_paid) || 0,
            remaining: Number(item.remaining) || 0,
            status: item.status || 'pending',
            dietary_notes: item.dietary_notes || '',
            is_active: item.is_active ?? true,
            registered_at: item.registered_at || new Date().toISOString().split('T')[0],
          }));
          setCantineSubscribers(formatted);
        }

        // Charger les menus depuis Supabase si configurés
        const { data: dbMenus, error: menuErr } = await supabase
          .from('canteen_menus')
          .select('*')
          .eq('tenant_id', tenantId);

        if (!menuErr && dbMenus && dbMenus.length > 0) {
          setWeeklyMenus(dbMenus as any);
        }

        // Charger le pointage repas du jour
        const todayStr = new Date().toISOString().split('T')[0];
        const { data: dbAtt, error: attErr } = await supabase
          .from('canteen_attendance')
          .select('student_id, checked_in')
          .eq('tenant_id', tenantId)
          .eq('date', todayStr);

        if (!attErr && dbAtt && dbAtt.length > 0) {
          const attMap: Record<string, boolean> = {};
          dbAtt.forEach((a: any) => {
            attMap[a.student_id] = !!a.checked_in;
          });
          setMealAttendance(attMap);
        }

        // Charger les circuits de transport depuis Supabase si disponibles
        const { data: dbRoutes, error: routesErr } = await supabase
          .from('transport_routes')
          .select('*')
          .eq('tenant_id', tenantId)
          .eq('is_active', true);

        if (!routesErr && dbRoutes && dbRoutes.length > 0) {
          setTransportRoutes(dbRoutes.map((r: any) => ({
            id: r.id,
            name: r.name,
            code: r.code,
            driver_name: r.driver_name || '',
            driver_phone: r.driver_phone || '',
            vehicle_plate: r.vehicle_plate || '',
            vehicle_capacity: r.vehicle_capacity || 30,
            stops_count: r.stops_count || (Array.isArray(r.stops) ? r.stops.length : 0),
            stops: Array.isArray(r.stops) ? r.stops : [],
            monthly_rate_cfa: Number(r.monthly_rate_cfa) || 25000,
          })));
        }

        // Charger les abonnés au transport depuis Supabase
        const { data: dbTrans, error: transErr } = await supabase
          .from('transport_subscriptions')
          .select(`
            *,
            students (
              id,
              first_name,
              last_name,
              student_code,
              guardian_name,
              guardian_phone,
              classes (name)
            )
          `)
          .eq('tenant_id', tenantId);

        if (!transErr && dbTrans && dbTrans.length > 0) {
          const formattedTrans: TransportSubscriber[] = dbTrans.map((item: any) => ({
            id: item.id,
            student_id: item.student_id,
            student_name: item.students ? `${item.students.first_name} ${item.students.last_name}` : 'Élève',
            student_code: item.students?.student_code || 'ERK-MAT',
            class_name: item.students?.classes?.name || 'Sans classe',
            parent_name: item.students?.guardian_name || 'Parent d\'élève',
            parent_phone: item.students?.guardian_phone || '',
            route_id: item.route_id || '',
            route_name: item.route_name || 'Circuit de ramassage',
            pickup_stop: item.pickup_stop || 'Arrêt principal',
            trip_type: item.trip_type || 'round_trip',
            amount_due: Number(item.amount_due) || 0,
            amount_paid: Number(item.amount_paid) || 0,
            remaining: Number(item.remaining) || 0,
            status: item.status || 'pending',
            is_active: item.is_active ?? true,
            registered_at: item.registered_at || new Date().toISOString().split('T')[0],
          }));
          setTransportSubscribers(formattedTrans);
        }
      } catch (err) {
        console.warn("Could not fetch canteen data from Supabase, using local fallback", err);
      }
    };

    fetchSupabaseData();
  }, [tenantId]);

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
    setCantineSubscribers(prev => [sub, ...prev.filter(s => s.student_id !== newSub.student_id)]);

    // Sauvegarde Supabase
    if (tenantId && tenantId !== 'default_tenant') {
      supabase.from('canteen_subscriptions').upsert([{
        tenant_id: tenantId,
        student_id: newSub.student_id,
        plan_name: plan.name,
        amount_due: plan.price_cfa,
        amount_paid: 0,
        remaining: plan.price_cfa,
        status: 'pending',
        dietary_notes: newSub.dietary_notes || null,
        is_active: true,
        registered_at: new Date().toISOString().split('T')[0],
      }], { onConflict: 'tenant_id,student_id' }).then(({ error }) => {
        if (error) console.warn("Could not save subscriber to Supabase", error);
      });
    }

    toast.success(`Élève ${sub.student_name} inscrit à la cantine (${plan.name})`);
    return sub;
  };

  const cancelCantineSubscriber = (studentId: string) => {
    setCantineSubscribers(prev => prev.filter(s => s.student_id !== studentId));
    if (tenantId && tenantId !== 'default_tenant') {
      supabase.from('canteen_subscriptions').delete().eq('tenant_id', tenantId).eq('student_id', studentId).then();
    }
    toast.success("Désinscription de la cantine effectuée");
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

    // Inscription du paiement en caisse dans Supabase student_payments et mise à jour de la souscription
    try {
      const sub = cantineSubscribers.find(s => s.id === subscriberId);
      if (sub && tenantId) {
        const newPaid = sub.amount_paid + amount;
        const newRemaining = Math.max(0, sub.amount_due - newPaid);
        const newStatus = newRemaining === 0 ? 'paid' : (newPaid > 0 ? 'partial' : 'pending');

        await supabase.from('canteen_subscriptions')
          .update({
            amount_paid: newPaid,
            remaining: newRemaining,
            status: newStatus,
          })
          .eq('tenant_id', tenantId)
          .eq('student_id', sub.student_id);

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
      const nextState = !prev[studentId];
      const next = { ...prev, [studentId]: nextState };

      if (tenantId && tenantId !== 'default_tenant') {
        const todayStr = new Date().toISOString().split('T')[0];
        supabase.from('canteen_attendance').upsert([{
          tenant_id: tenantId,
          student_id: studentId,
          date: todayStr,
          checked_in: nextState,
        }]).then(({ error }) => {
          if (error) console.warn("Could not save canteen attendance", error);
        });
      }

      toast.success(nextState ? "Élève pointé présent au réfectoire" : "Pointage retiré");
      return next;
    });
  };

  const updateMenu = (updatedMenu: DailyMenu) => {
    setWeeklyMenus(prev => prev.map(m => m.id === updatedMenu.id ? updatedMenu : m));

    if (tenantId && tenantId !== 'default_tenant') {
      supabase.from('canteen_menus').upsert([{
        tenant_id: tenantId,
        day: updatedMenu.day,
        date_label: updatedMenu.date_label,
        starter: updatedMenu.starter,
        main_dish: updatedMenu.main_dish,
        dessert: updatedMenu.dessert,
        snack: updatedMenu.snack,
      }]).then(({ error }) => {
        if (error) console.warn("Could not save canteen menu", error);
      });
    }

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
  const registerTransportSubscriber = (newSub: Omit<TransportSubscriber, 'id' | 'amount_due' | 'amount_paid' | 'remaining' | 'status' | 'is_active' | 'registered_at'> & { custom_amount?: number }) => {
    const route = transportRoutes.find(r => r.id === newSub.route_id) || transportRoutes[0];
    const baseRate = route.monthly_rate_cfa;
    // Si aller-retour: 100%, si matin seul ou soir seul: 60%
    const calculatedRate = newSub.custom_amount !== undefined 
      ? newSub.custom_amount 
      : (newSub.trip_type === 'round_trip' ? baseRate : Math.round(baseRate * 0.6));

    const sub: TransportSubscriber = {
      ...newSub,
      id: `ts_${Date.now()}`,
      route_name: route.name,
      amount_due: calculatedRate,
      amount_paid: 0,
      remaining: calculatedRate,
      status: 'pending',
      is_active: true,
      registered_at: new Date().toISOString().split('T')[0],
    };
    setTransportSubscribers(prev => [sub, ...prev.filter(s => s.student_id !== newSub.student_id)]);

    // Sauvegarde Supabase
    if (tenantId && tenantId !== 'default_tenant') {
      supabase.from('transport_subscriptions').upsert([{
        tenant_id: tenantId,
        student_id: newSub.student_id,
        route_id: newSub.route_id || null,
        route_name: route.name,
        pickup_stop: newSub.pickup_stop,
        trip_type: newSub.trip_type || 'round_trip',
        amount_due: calculatedRate,
        amount_paid: 0,
        remaining: calculatedRate,
        status: 'pending',
        is_active: true,
        registered_at: new Date().toISOString().split('T')[0],
      }], { onConflict: 'tenant_id,student_id' }).then(({ error }) => {
        if (error) console.warn("Could not save transport subscriber to Supabase", error);
      });
    }

    toast.success(`Élève ${sub.student_name} inscrit au circuit ${route.name}`);
    return sub;
  };

  const cancelTransportSubscriber = (studentId: string) => {
    setTransportSubscribers(prev => prev.filter(s => s.student_id !== studentId));
    if (tenantId && tenantId !== 'default_tenant') {
      supabase.from('transport_subscriptions').delete().eq('tenant_id', tenantId).eq('student_id', studentId).then();
    }
    toast.success("Désinscription du transport effectuée");
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
    cancelCantineSubscriber,
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
    cancelTransportSubscriber,
    recordTransportPayment,
    addVehicle,
    addTransportRoute,
    updateTransportRoute,
    deleteTransportRoute,
    addStopToRoute,
    removeStopFromRoute,
  };
}
