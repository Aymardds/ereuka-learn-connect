import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Modal,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Brand, Radius, Shadows, Spacing } from '@/constants/theme';
import { supabase } from '../../lib/supabase';

export interface ChildOption {
  id: string;
  name: string;
  class_name?: string;
}

export interface CantinePlanOption {
  id: string;
  name: string;
  description: string;
  price_cfa: number;
  period: string;
  meals_info: string;
}

export interface TransportRouteOption {
  id: string;
  name: string;
  code: string;
  driver_name: string;
  driver_phone: string;
  vehicle_plate: string;
  stops: string[];
  monthly_rate_cfa: number;
}

const CANTINE_PLANS: CantinePlanOption[] = [
  {
    id: 'plan_mensuel',
    name: 'Forfait Mensuel Déjeuners',
    description: '4 repas / semaine (Lun, Mar, Jeu, Ven)',
    price_cfa: 25000,
    period: 'mois',
    meals_info: 'Entrée + Plat chaud + Dessert + Eau minérale',
  },
  {
    id: 'plan_trimestriel',
    name: 'Forfait Trimestriel (Éco -10%)',
    description: 'Trimestre complet • Économisez 7 000 FCFA',
    price_cfa: 68000,
    period: 'trimestre',
    meals_info: 'Accès prioritaire + Goûter offert le vendredi',
  },
  {
    id: 'plan_demi',
    name: 'Demi-Forfait Hebdomadaire',
    description: '2 repas au choix / semaine',
    price_cfa: 18000,
    period: 'mois',
    meals_info: 'Idéal pour les élèves en temps partiel',
  },
  {
    id: 'plan_tickets',
    name: 'Carnet 10 Tickets Déjeuners',
    description: 'Validité 3 mois • Repas occasionnels',
    price_cfa: 15000,
    period: 'carnet',
    meals_info: 'Utilisable à la demande selon l’emploi du temps',
  },
];

const DIETARY_TAGS = [
  'Sans porc',
  'Sans arachides',
  'Végétarien',
  'Sans lactose',
  'Sans gluten',
  'Sans fruits de mer',
  'Régime Standard',
];

const TRANSPORT_ROUTES: TransportRouteOption[] = [
  {
    id: 'route_1',
    name: 'Circuit 01 — Riviera Palmeraie ↔ Campus',
    code: 'LIGNE-01',
    driver_name: 'Koffi Germain',
    driver_phone: '+225 07 09 88 77 66',
    vehicle_plate: 'Bus N°02 (Toyota Coaster • 4589-KJ-01)',
    monthly_rate_cfa: 25000,
    stops: [
      'Arrêt Carrefour Duncan (06h45 / 17h15)',
      'Arrêt Pharmacie Palmeraie (07h00 / 17h00)',
      'Arrêt Rond-point Akwaba (07h15 / 16h45)',
      'Arrêt Église Bon Pasteur (07h25 / 16h35)',
    ],
  },
  {
    id: 'route_2',
    name: 'Circuit 02 — Angré 8ème Tranche / Mahou ↔ Campus',
    code: 'LIGNE-02',
    driver_name: 'Bamba Seydou',
    driver_phone: '+225 05 44 22 11 00',
    vehicle_plate: 'Bus N°05 (Mercedes Sprinter • 7812-LT-01)',
    monthly_rate_cfa: 28000,
    stops: [
      'Arrêt Résidence Les Palmes (06h40 / 17h20)',
      'Arrêt CHU de Angré (06h55 / 17h05)',
      'Arrêt Carrefour Mahou (07h10 / 16h50)',
      'Arrêt Petroci Nouveau Goudron (07h20 / 16h40)',
    ],
  },
  {
    id: 'route_3',
    name: 'Circuit 03 — Deux-Plateaux Vallons ↔ Campus',
    code: 'LIGNE-03',
    driver_name: 'Touré Ibrahim',
    driver_phone: '+225 07 88 55 44 33',
    vehicle_plate: 'Bus N°04 (Toyota HiAce • 3456-HZ-01)',
    monthly_rate_cfa: 22000,
    stops: [
      'Arrêt Rue des Jardins (06h50 / 17h10)',
      'Arrêt Pharmacie Sainte-Cécile (07h05 / 16h55)',
      'Arrêt Carrefour Duncan / ENA (07h15 / 16h45)',
    ],
  },
  {
    id: 'route_4',
    name: 'Circuit 04 — Marcory Remblais / Koumassi ↔ Campus',
    code: 'LIGNE-04',
    driver_name: 'Diomandé Moussa',
    driver_phone: '+225 01 23 45 67 89',
    vehicle_plate: 'Bus N°01 (Hyundai County • 1290-KM-01)',
    monthly_rate_cfa: 32000,
    stops: [
      'Arrêt Grand Carrefour Koumassi (06h30 / 17h30)',
      'Arrêt Église Sainte-Thérèse (06h45 / 17h15)',
      'Arrêt Remblais Pharmacie (07h00 / 17h00)',
    ],
  },
  {
    id: 'route_5',
    name: 'Circuit 05 — Yopougon Maroc / Niangon ↔ Campus',
    code: 'LIGNE-05',
    driver_name: 'Ouattara Adama',
    driver_phone: '+225 07 11 22 33 44',
    vehicle_plate: 'Bus N°03 (Toyota Coaster • 9945-KG-01)',
    monthly_rate_cfa: 35000,
    stops: [
      'Arrêt Carrefour Académie (06h25 / 17h35)',
      'Arrêt Complexe Jesse Jackson (06h40 / 17h20)',
      'Arrêt Pharmacie Maroc (06h55 / 17h05)',
    ],
  },
];

interface Props {
  visible: boolean;
  initialTab?: 'cantine' | 'transport';
  initialChildId?: string;
  childrenList: ChildOption[];
  onClose: () => void;
  onSuccess: (
    serviceType: 'cantine' | 'transport',
    subscription: any,
    payNow: boolean
  ) => void;
}

export function ServicesSubscriptionModal({
  visible,
  initialTab = 'cantine',
  initialChildId,
  childrenList,
  onClose,
  onSuccess,
}: Props) {
  const [activeTab, setActiveTab] = useState<'cantine' | 'transport'>(initialTab);
  const [selectedChildId, setSelectedChildId] = useState<string>(
    initialChildId || childrenList[0]?.id || ''
  );

  // Cantine State
  const [selectedPlan, setSelectedPlan] = useState<CantinePlanOption>(CANTINE_PLANS[0]);
  const [selectedDietTags, setSelectedDietTags] = useState<string[]>(['Sans porc']);
  const [dietaryNotes, setDietaryNotes] = useState('');

  // Transport State
  const [selectedRoute, setSelectedRoute] = useState<TransportRouteOption>(TRANSPORT_ROUTES[0]);
  const [selectedStop, setSelectedStop] = useState<string>(TRANSPORT_ROUTES[0].stops[0]);
  const [tripType, setTripType] = useState<'round_trip' | 'morning_only' | 'evening_only'>('round_trip');

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      setActiveTab(initialTab);
      if (initialChildId) {
        setSelectedChildId(initialChildId);
      } else if (childrenList.length > 0 && !selectedChildId) {
        setSelectedChildId(childrenList[0].id);
      }
    }
  }, [visible, initialTab, initialChildId, childrenList]);

  // Update stop when route changes
  useEffect(() => {
    if (selectedRoute && selectedRoute.stops.length > 0) {
      if (!selectedRoute.stops.includes(selectedStop)) {
        setSelectedStop(selectedRoute.stops[0]);
      }
    }
  }, [selectedRoute]);

  const toggleDietTag = (tag: string) => {
    if (selectedDietTags.includes(tag)) {
      setSelectedDietTags(selectedDietTags.filter((t) => t !== tag));
    } else {
      setSelectedDietTags([...selectedDietTags, tag]);
    }
  };

  // Pricing calculation
  const getTransportPrice = () => {
    const base = selectedRoute.monthly_rate_cfa;
    if (tripType === 'round_trip') return base;
    return Math.round((base * 0.6) / 500) * 500; // 60% rounded to 500
  };

  const currentPrice = activeTab === 'cantine' ? selectedPlan.price_cfa : getTransportPrice();
  const currentChild = childrenList.find((c) => c.id === selectedChildId) || childrenList[0];

  const handleConfirm = async (payNow: boolean) => {
    if (!currentChild) {
      Alert.alert('Erreur', 'Veuillez sélectionner un élève.');
      return;
    }

    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const tenantId = (session?.user?.user_metadata?.tenant_id as string) || 'default_tenant';

      if (activeTab === 'cantine') {
        const fullDietary = [
          ...selectedDietTags,
          dietaryNotes.trim() ? `Note: ${dietaryNotes.trim()}` : '',
        ]
          .filter(Boolean)
          .join(', ');

        const subscriptionPayload = {
          tenant_id: tenantId,
          student_id: currentChild.id,
          plan_name: selectedPlan.name,
          amount_due: selectedPlan.price_cfa,
          amount_paid: 0,
          remaining: selectedPlan.price_cfa,
          status: 'pending',
          dietary_notes: fullDietary,
          is_active: true,
          registered_at: new Date().toISOString().split('T')[0],
        };

        // 1. Supabase attempt
        try {
          await supabase
            .from('canteen_subscriptions')
            .upsert([subscriptionPayload], { onConflict: 'tenant_id,student_id' });
        } catch (dbErr) {
          console.warn('Supabase canteen sub sync fallback:', dbErr);
        }

        // 2. Local storage cache
        const localKey = `@ereuka_canteen_sub_${currentChild.id}`;
        await AsyncStorage.setItem(localKey, JSON.stringify(subscriptionPayload));

        setSaving(false);
        onClose();
        onSuccess(
          'cantine',
          {
            ...subscriptionPayload,
            student_name: currentChild.name,
            class_name: currentChild.class_name,
            plan_info: selectedPlan,
          },
          payNow
        );
      } else {
        // Transport
        const price = getTransportPrice();
        const transportPayload = {
          tenant_id: tenantId,
          student_id: currentChild.id,
          route_id: selectedRoute.id,
          route_name: selectedRoute.name,
          pickup_stop: selectedStop,
          trip_type: tripType,
          amount_due: price,
          amount_paid: 0,
          remaining: price,
          status: 'pending',
          is_active: true,
          registered_at: new Date().toISOString().split('T')[0],
        };

        // 1. Supabase attempt
        try {
          await supabase
            .from('transport_subscriptions')
            .upsert([transportPayload], { onConflict: 'tenant_id,student_id' });
        } catch (dbErr) {
          console.warn('Supabase transport sub sync fallback:', dbErr);
        }

        // 2. Local storage cache
        const localKey = `@ereuka_transport_sub_${currentChild.id}`;
        await AsyncStorage.setItem(localKey, JSON.stringify(transportPayload));

        setSaving(false);
        onClose();
        onSuccess(
          'transport',
          {
            ...transportPayload,
            student_name: currentChild.name,
            class_name: currentChild.class_name,
            route_info: selectedRoute,
          },
          payNow
        );
      }
    } catch (err) {
      console.error(err);
      setSaving(false);
      Alert.alert('Erreur', 'Impossible d’enregistrer la souscription. Veuillez réessayer.');
    }
  };

  const fmt = (n: number) => n.toLocaleString('fr-FR') + ' FCFA';

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        {/* Top backdrop touchable: ONLY captures taps outside the sheet */}
        <TouchableOpacity
          style={styles.modalBackdropTop}
          activeOpacity={1}
          onPress={() => {
            Keyboard.dismiss();
            onClose();
          }}
        />

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 12 : 0}
          style={styles.modalKeyboardAvoid}
        >
          <View style={styles.modalSheet}>
            {/* Drag Handle */}
            <View style={styles.dragHandle} />

            {/* Header */}
            <View style={styles.headerRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.headerSubtitle}>Services Périscolaires</Text>
                <Text style={styles.headerTitle}>Nouvelle Souscription</Text>
              </View>
              <TouchableOpacity
                onPress={() => {
                  Keyboard.dismiss();
                  onClose();
                }}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <Ionicons name="close-circle" size={26} color="#94A3B8" />
              </TouchableOpacity>
            </View>

            {/* Tab Selector: Cantine vs Transport */}
            <View style={styles.tabBar}>
              <TouchableOpacity
                style={[styles.tabBtn, activeTab === 'cantine' && styles.tabBtnActive]}
                onPress={() => setActiveTab('cantine')}
                activeOpacity={0.8}
              >
                <Ionicons
                  name="restaurant"
                  size={16}
                  color={activeTab === 'cantine' ? '#FFFFFF' : '#64748B'}
                />
                <Text style={[styles.tabTxt, activeTab === 'cantine' && styles.tabTxtActive]}>
                  Cantine Scolaire
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.tabBtn, activeTab === 'transport' && styles.tabBtnActive]}
                onPress={() => setActiveTab('transport')}
                activeOpacity={0.8}
              >
                <Ionicons
                  name="bus"
                  size={16}
                  color={activeTab === 'transport' ? '#FFFFFF' : '#64748B'}
                />
                <Text style={[styles.tabTxt, activeTab === 'transport' && styles.tabTxtActive]}>
                  Transport Scolaire
                </Text>
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.scrollBody}
            >
              {/* 1. Sélection de l'enfant si plusieurs */}
              {childrenList.length > 1 && (
                <View style={styles.sectionWrap}>
                  <Text style={styles.sectionHeading}>1. Choisir l’enfant bénéficiaire</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll}>
                    {childrenList.map((kid) => {
                      const isSel = kid.id === selectedChildId;
                      return (
                        <TouchableOpacity
                          key={kid.id}
                          style={[styles.childChip, isSel && styles.childChipActive]}
                          onPress={() => setSelectedChildId(kid.id)}
                          activeOpacity={0.8}
                        >
                          <Ionicons
                            name="person"
                            size={14}
                            color={isSel ? '#FFFFFF' : Brand.blue}
                          />
                          <Text style={[styles.childChipTxt, isSel && styles.childChipTxtActive]}>
                            {kid.name}
                          </Text>
                          {kid.class_name && (
                            <Text
                              style={[
                                styles.childChipClass,
                                isSel && styles.childChipClassActive,
                              ]}
                            >
                              ({kid.class_name})
                            </Text>
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>
              )}

              {/* ══════════ CONTENU CANTINE ══════════ */}
              {activeTab === 'cantine' && (
                <View>
                  <View style={styles.sectionWrap}>
                    <Text style={styles.sectionHeading}>
                      {childrenList.length > 1 ? '2.' : '1.'} Choisissez votre formule de cantine
                    </Text>
                    {CANTINE_PLANS.map((plan) => {
                      const isSel = plan.id === selectedPlan.id;
                      return (
                        <TouchableOpacity
                          key={plan.id}
                          style={[styles.planCard, isSel && styles.planCardActive]}
                          onPress={() => setSelectedPlan(plan)}
                          activeOpacity={0.8}
                        >
                          <View style={styles.planCardHeader}>
                            <View style={{ flex: 1 }}>
                              <Text style={[styles.planTitle, isSel && styles.planTitleActive]}>
                                {plan.name}
                              </Text>
                              <Text style={styles.planDesc}>{plan.description}</Text>
                              <Text style={styles.planMeals}>{plan.meals_info}</Text>
                            </View>
                            <View style={styles.planPriceBox}>
                              <Text style={[styles.planPriceVal, isSel && styles.planPriceValActive]}>
                                {fmt(plan.price_cfa)}
                              </Text>
                              <Text style={styles.planPricePeriod}>/{plan.period}</Text>
                            </View>
                          </View>
                          <View style={styles.planRadioRow}>
                            <View style={[styles.radioCircle, isSel && styles.radioCircleActive]}>
                              {isSel && <View style={styles.radioInner} />}
                            </View>
                            <Text style={[styles.radioLabel, isSel && styles.radioLabelActive]}>
                              {isSel ? 'Formule sélectionnée' : 'Sélectionner'}
                            </Text>
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  {/* Régime alimentaire & Allergies */}
                  <View style={styles.sectionWrap}>
                    <Text style={styles.sectionHeading}>
                      {childrenList.length > 1 ? '3.' : '2.'} Préférences & Allergies Alimentaires
                    </Text>
                    <Text style={styles.sectionHint}>
                      Touchez pour activer ou désactiver les régimes et intolérances :
                    </Text>

                    <View style={styles.tagsContainer}>
                      {DIETARY_TAGS.map((tag) => {
                        const active = selectedDietTags.includes(tag);
                        return (
                          <TouchableOpacity
                            key={tag}
                            style={[styles.tagChip, active && styles.tagChipActive]}
                            onPress={() => toggleDietTag(tag)}
                            activeOpacity={0.7}
                          >
                            <Ionicons
                              name={active ? 'checkmark-circle' : 'add-circle-outline'}
                              size={14}
                              color={active ? '#FFFFFF' : '#475569'}
                            />
                            <Text style={[styles.tagChipTxt, active && styles.tagChipTxtActive]}>
                              {tag}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>

                    <View style={styles.textInputBox}>
                      <Text style={styles.inputLabel}>Autre allergie ou consigne médicale (optionnel)</Text>
                      <TextInput
                        style={styles.textInput}
                        value={dietaryNotes}
                        onChangeText={setDietaryNotes}
                        placeholder="Ex: Asthme d’effort, intolérance au poisson chat..."
                        placeholderTextColor="#94A3B8"
                        multiline
                      />
                    </View>
                  </View>
                </View>
              )}

              {/* ══════════ CONTENU TRANSPORT ══════════ */}
              {activeTab === 'transport' && (
                <View>
                  <View style={styles.sectionWrap}>
                    <Text style={styles.sectionHeading}>
                      {childrenList.length > 1 ? '2.' : '1.'} Circuit de Ramassage Scolaire
                    </Text>
                    {TRANSPORT_ROUTES.map((route) => {
                      const isSel = route.id === selectedRoute.id;
                      return (
                        <TouchableOpacity
                          key={route.id}
                          style={[styles.planCard, isSel && styles.planCardActive]}
                          onPress={() => setSelectedRoute(route)}
                          activeOpacity={0.8}
                        >
                          <View style={styles.planCardHeader}>
                            <View style={{ flex: 1 }}>
                              <View style={styles.badgeCode}>
                                <Text style={styles.badgeCodeTxt}>{route.code}</Text>
                              </View>
                              <Text style={[styles.planTitle, isSel && styles.planTitleActive]}>
                                {route.name}
                              </Text>
                              <Text style={styles.planDesc}>
                                🚌 {route.vehicle_plate} • Chauffeur : {route.driver_name} ({route.driver_phone})
                              </Text>
                            </View>
                            <View style={styles.planPriceBox}>
                              <Text style={[styles.planPriceVal, isSel && styles.planPriceValActive]}>
                                {fmt(route.monthly_rate_cfa)}
                              </Text>
                              <Text style={styles.planPricePeriod}>/mois (A/R)</Text>
                            </View>
                          </View>
                          <View style={styles.planRadioRow}>
                            <View style={[styles.radioCircle, isSel && styles.radioCircleActive]}>
                              {isSel && <View style={styles.radioInner} />}
                            </View>
                            <Text style={[styles.radioLabel, isSel && styles.radioLabelActive]}>
                              {isSel ? 'Circuit sélectionné' : 'Sélectionner ce circuit'}
                            </Text>
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  {/* Type de Trajet */}
                  <View style={styles.sectionWrap}>
                    <Text style={styles.sectionHeading}>
                      {childrenList.length > 1 ? '3.' : '2.'} Type de Déplacement
                    </Text>
                    <View style={styles.tripTypeRow}>
                      <TouchableOpacity
                        style={[styles.tripTypeBtn, tripType === 'round_trip' && styles.tripTypeBtnActive]}
                        onPress={() => setTripType('round_trip')}
                        activeOpacity={0.8}
                      >
                        <Ionicons
                          name="repeat"
                          size={16}
                          color={tripType === 'round_trip' ? '#FFFFFF' : '#475569'}
                        />
                        <Text style={[styles.tripTypeTxt, tripType === 'round_trip' && styles.tripTypeTxtActive]}>
                          Aller-Retour (100%)
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.tripTypeBtn, tripType === 'morning_only' && styles.tripTypeBtnActive]}
                        onPress={() => setTripType('morning_only')}
                        activeOpacity={0.8}
                      >
                        <Ionicons
                          name="sunny"
                          size={16}
                          color={tripType === 'morning_only' ? '#FFFFFF' : '#475569'}
                        />
                        <Text style={[styles.tripTypeTxt, tripType === 'morning_only' && styles.tripTypeTxtActive]}>
                          Matin (60%)
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.tripTypeBtn, tripType === 'evening_only' && styles.tripTypeBtnActive]}
                        onPress={() => setTripType('evening_only')}
                        activeOpacity={0.8}
                      >
                        <Ionicons
                          name="moon"
                          size={16}
                          color={tripType === 'evening_only' ? '#FFFFFF' : '#475569'}
                        />
                        <Text style={[styles.tripTypeTxt, tripType === 'evening_only' && styles.tripTypeTxtActive]}>
                          Soir (60%)
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Point de Ramassage */}
                  <View style={styles.sectionWrap}>
                    <Text style={styles.sectionHeading}>
                      {childrenList.length > 1 ? '4.' : '3.'} Point d’Arrêt / Ramassage
                    </Text>
                    <Text style={styles.sectionHint}>
                      Arrêts desservis par {selectedRoute.name} :
                    </Text>
                    {selectedRoute.stops.map((stop) => {
                      const isSel = stop === selectedStop;
                      return (
                        <TouchableOpacity
                          key={stop}
                          style={[styles.stopItem, isSel && styles.stopItemActive]}
                          onPress={() => setSelectedStop(stop)}
                          activeOpacity={0.8}
                        >
                          <Ionicons
                            name={isSel ? 'location' : 'location-outline'}
                            size={18}
                            color={isSel ? Brand.blue : '#64748B'}
                          />
                          <Text style={[styles.stopItemTxt, isSel && styles.stopItemTxtActive]}>
                            {stop}
                          </Text>
                          {isSel && (
                            <Ionicons name="checkmark-circle" size={18} color={Brand.blue} />
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              )}

              {/* ══════════ RÉCAPITULATIF & BOUTONS D'ACTION ══════════ */}
              <View style={styles.recapBanner}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.recapLabel}>Montant de la souscription</Text>
                  <Text style={styles.recapPrice}>{fmt(currentPrice)}</Text>
                  <Text style={styles.recapStudent}>
                    Pour : <Text style={{ fontWeight: '800' }}>{currentChild?.name}</Text>
                  </Text>
                </View>
                <View style={styles.recapIconBox}>
                  <Ionicons
                    name={activeTab === 'cantine' ? 'restaurant' : 'bus'}
                    size={28}
                    color={activeTab === 'cantine' ? Brand.green : Brand.blue}
                  />
                </View>
              </View>

              {/* Bouton 1: Payer en ligne immédiatement */}
              <TouchableOpacity
                style={[styles.payOnlineBtn, saving && { opacity: 0.7 }]}
                onPress={() => handleConfirm(true)}
                disabled={saving}
                activeOpacity={0.8}
              >
                {saving ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <>
                    <Ionicons name="wallet-outline" size={18} color="#FFFFFF" />
                    <Text style={styles.payOnlineBtnTxt}>
                      Payer en ligne ({fmt(currentPrice)})
                    </Text>
                  </>
                )}
              </TouchableOpacity>

              {/* Bouton 2: Valider sans paiement immédiat */}
              <TouchableOpacity
                style={[styles.payLaterBtn, saving && { opacity: 0.7 }]}
                onPress={() => handleConfirm(false)}
                disabled={saving}
                activeOpacity={0.8}
              >
                <Ionicons name="receipt-outline" size={18} color="#475569" />
                <Text style={styles.payLaterBtnTxt}>
                  Valider la souscription (Règlement à la caisse)
                </Text>
              </TouchableOpacity>

              <Text style={styles.securityNote}>
                🔒 Souscription officielle certifiée Eurêka ERP • Notification envoyée à l’établissement
              </Text>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalBackdropTop: {
    flex: 1,
  },
  modalKeyboardAvoid: {
    width: '100%',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '92%',
    overflow: 'hidden',
  },
  dragHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#CBD5E1',
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 4,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingTop: 6,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#F1F5F9',
  },
  headerSubtitle: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0F172A',
    marginTop: 2,
  },
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.xl,
    paddingVertical: 10,
    gap: 8,
    backgroundColor: '#F8FAFC',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    borderRadius: Radius.lg,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  tabBtnActive: {
    backgroundColor: Brand.blue,
    borderColor: Brand.blue,
  },
  tabTxt: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
  },
  tabTxtActive: {
    color: '#FFFFFF',
  },
  scrollBody: {
    paddingHorizontal: Spacing.xl,
    paddingTop: 14,
    paddingBottom: 40,
  },
  sectionWrap: {
    marginBottom: 16,
  },
  sectionHeading: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 8,
  },
  sectionHint: {
    fontSize: 11,
    color: '#64748B',
    marginBottom: 8,
  },
  chipsScroll: {
    flexDirection: 'row',
  },
  childChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: Radius.full,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    marginRight: 8,
  },
  childChipActive: {
    backgroundColor: Brand.blue,
    borderColor: Brand.blue,
  },
  childChipTxt: {
    fontSize: 12,
    fontWeight: '800',
    color: Brand.blue,
  },
  childChipTxtActive: {
    color: '#FFFFFF',
  },
  childChipClass: {
    fontSize: 11,
    color: '#3B82F6',
    fontWeight: '600',
  },
  childChipClassActive: {
    color: '#DBEAFE',
  },
  planCard: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: Radius.xl,
    padding: 12,
    marginBottom: 10,
  },
  planCardActive: {
    backgroundColor: '#EFF6FF',
    borderColor: Brand.blue,
  },
  planCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  planTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  planTitleActive: {
    color: Brand.blue,
  },
  planDesc: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
    fontWeight: '600',
  },
  planMeals: {
    fontSize: 10,
    color: '#475569',
    marginTop: 4,
  },
  planPriceBox: {
    alignItems: 'flex-end',
    marginLeft: 8,
  },
  planPriceVal: {
    fontSize: 14,
    fontWeight: '900',
    color: '#0F172A',
  },
  planPriceValActive: {
    color: Brand.blue,
  },
  planPricePeriod: {
    fontSize: 10,
    color: '#64748B',
  },
  planRadioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E2E8F0',
  },
  radioCircle: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#94A3B8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioCircleActive: {
    borderColor: Brand.blue,
  },
  radioInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Brand.blue,
  },
  radioLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  radioLabelActive: {
    color: Brand.blue,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 10,
  },
  tagChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: Radius.full,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  tagChipActive: {
    backgroundColor: Brand.green,
    borderColor: Brand.green,
  },
  tagChipTxt: {
    fontSize: 11,
    fontWeight: '700',
    color: '#334155',
  },
  tagChipTxtActive: {
    color: '#FFFFFF',
  },
  textInputBox: {
    marginTop: 6,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 4,
  },
  textInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: Radius.md,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 12,
    color: '#0F172A',
    minHeight: 44,
  },
  badgeCode: {
    backgroundColor: '#E0E7FF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginBottom: 4,
  },
  badgeCodeTxt: {
    fontSize: 9,
    fontWeight: '800',
    color: '#3730A3',
  },
  tripTypeRow: {
    flexDirection: 'row',
    gap: 6,
  },
  tripTypeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 8,
    borderRadius: Radius.md,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  tripTypeBtnActive: {
    backgroundColor: Brand.blue,
    borderColor: Brand.blue,
  },
  tripTypeTxt: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  tripTypeTxtActive: {
    color: '#FFFFFF',
  },
  stopItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: Radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 6,
  },
  stopItemActive: {
    backgroundColor: '#EFF6FF',
    borderColor: Brand.blue,
  },
  stopItemTxt: {
    flex: 1,
    fontSize: 12,
    color: '#334155',
    fontWeight: '600',
  },
  stopItemTxtActive: {
    color: Brand.blue,
    fontWeight: '800',
  },
  recapBanner: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: Radius.xl,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    marginTop: 6,
  },
  recapLabel: {
    fontSize: 11,
    color: Brand.green,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  recapPrice: {
    fontSize: 22,
    fontWeight: '900',
    color: '#166534',
    marginTop: 2,
  },
  recapStudent: {
    fontSize: 12,
    color: '#14532D',
    marginTop: 2,
  },
  recapIconBox: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  payOnlineBtn: {
    backgroundColor: Brand.blue,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: Radius.lg,
    marginBottom: 8,
  },
  payOnlineBtnTxt: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  payLaterBtn: {
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: Radius.lg,
    marginBottom: 10,
  },
  payLaterBtnTxt: {
    color: '#334155',
    fontSize: 12,
    fontWeight: '700',
  },
  securityNote: {
    fontSize: 10,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 2,
  },
});
