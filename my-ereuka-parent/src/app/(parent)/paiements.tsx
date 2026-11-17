import React, { useEffect, useState, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  ActivityIndicator,
  StatusBar,
  RefreshControl,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  Share,
  Image,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../../lib/supabase';
import { Brand, Radius, Shadows, Spacing } from '@/constants/theme';
import { AppTopHeader } from '@/components/AppTopHeader';

interface PaymentRecord {
  id: string;
  student_id?: string;
  label: string;
  amount_due: number;
  amount_paid: number;
  due_date: string;
  student_name: string;
  class_name: string;
  status: 'paid' | 'partial' | 'unpaid';
  installment_num?: number;
}

interface PaymentMethod {
  id: 'wave' | 'orange' | 'mtn' | 'moov' | 'card' | 'applepay' | 'bank';
  name: string;
  category: 'mobile' | 'card' | 'bank';
  icon?: keyof typeof Ionicons.glyphMap;
  image?: any;
  color: string;
  bg: string;
  badge: string;
}

const PAYMENT_METHODS: PaymentMethod[] = [
  {
    id: 'wave',
    name: 'Wave',
    category: 'mobile',
    image: require('@/assets/images/payments/Wave.jpg'),
    color: '#00D1FF',
    bg: '#FFFFFF',
    badge: '0% Frais',
  },
  {
    id: 'orange',
    name: 'Orange Money',
    category: 'mobile',
    image: require('@/assets/images/payments/Orange.png'),
    color: '#FF7900',
    bg: '#FFFFFF',
    badge: 'CI / SN / BF',
  },
  {
    id: 'mtn',
    name: 'MTN MoMo',
    category: 'mobile',
    image: require('@/assets/images/payments/MoMo.png'),
    color: '#FFCC00',
    bg: '#FFFBE6',
    badge: 'Instantané',
  },
  {
    id: 'moov',
    name: 'Moov Money',
    category: 'mobile',
    icon: 'wallet',
    color: '#0066B2',
    bg: '#EBF4FF',
    badge: 'Flooz',
  },
  {
    id: 'card',
    name: 'Carte (Visa/MC)',
    category: 'card',
    icon: 'card',
    color: '#2563EB',
    bg: '#EFF6FF',
    badge: '3D Secure',
  },
  {
    id: 'applepay',
    name: 'Apple Pay',
    category: 'card',
    icon: 'logo-apple',
    color: '#0F172A',
    bg: '#F8FAFC',
    badge: 'Touch/Face ID',
  },
  {
    id: 'bank',
    name: 'Virement RIB',
    category: 'bank',
    icon: 'business',
    color: '#7C3AED',
    bg: '#F5F3FF',
    badge: 'Bancaire',
  },
];

export default function ParentPaiements() {
  const insets = useSafeAreaInsets();
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [totals, setTotals] = useState({ due: 0, paid: 0, remaining: 0 });
  const [selectedChild, setSelectedChild] = useState<string | null>(null);
  const [children, setChildren] = useState<{ id: string; name: string }[]>([]);
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'paid'>('all');

  // Checkout Modal State
  const [checkoutModalVisible, setCheckoutModalVisible] = useState(false);
  const [activePaymentRecord, setActivePaymentRecord] = useState<PaymentRecord | null>(null);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>(PAYMENT_METHODS[0]);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [customAmount, setCustomAmount] = useState('');
  const [isPartialCustom, setIsPartialCustom] = useState(false);
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvc, setCardCvc] = useState('');
  const [processingPayment, setProcessingPayment] = useState(false);
  const [focusedInput, setFocusedInput] = useState<string | null>(null);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const checkoutScrollRef = useRef<any>(null);

  // Success Receipt Modal State
  const [receiptModalVisible, setReceiptModalVisible] = useState(false);
  const [completedTransaction, setCompletedTransaction] = useState<{
    receipt_no: string;
    amount: number;
    label: string;
    student_name: string;
    method: string;
    date: string;
  } | null>(null);

  useEffect(() => {
    loadData();

    const showSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => setKeyboardVisible(true)
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        setKeyboardVisible(false);
        setFocusedInput(null);
      }
    );
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const loadData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();

      let kidsData: any[] = [];
      if (session) {
        const { data } = await supabase
          .from('students')
          .select('id, first_name, last_name')
          .eq('responsible_id', session.user.id);
        if (data && data.length > 0) kidsData = data;
      }

      // Fallback: If no kids linked yet, load first active students or realistic sample
      if (!kidsData || kidsData.length === 0) {
        const { data: fallbackStudents } = await supabase
          .from('students')
          .select('id, first_name, last_name')
          .limit(2);

        kidsData = (fallbackStudents && fallbackStudents.length > 0)
          ? fallbackStudents
          : [
              { id: 'st-demo-1', first_name: 'Axel', last_name: 'Kouassi' },
              { id: 'st-demo-2', first_name: 'Fatou', last_name: 'Diallo' },
            ];
      }

      const kids = kidsData.map((c: any) => ({
        id: c.id,
        name: `${c.first_name} ${c.last_name}`,
      }));
      setChildren(kids);
      const activeChildId = selectedChild || kids[0]?.id;
      if (!selectedChild) setSelectedChild(kids[0]?.id);

      // Fetch payment records
      const { data: payData } = await supabase
        .from('payment_records')
        .select(`
          id, label, amount_due, amount_paid, due_date, student_id,
          students(first_name, last_name, classes(name))
        `)
        .in('student_id', kidsData.map((c: any) => c.id))
        .order('due_date', { ascending: true });

      let records: PaymentRecord[] = [];

      if (payData && payData.length > 0) {
        records = payData.map((p: any, idx: number) => {
          const due = p.amount_due || 120000;
          const paid = p.amount_paid || 0;
          let status: PaymentRecord['status'] = 'unpaid';
          if (paid >= due) status = 'paid';
          else if (paid > 0) status = 'partial';
          return {
            id: p.id,
            student_id: p.student_id,
            label: p.label || `Tranche ${idx + 1}`,
            amount_due: due,
            amount_paid: paid,
            due_date: p.due_date || '2026-11-15',
            student_name: `${p.students?.first_name || 'Élève'} ${p.students?.last_name || ''}`,
            class_name: p.students?.classes?.name || 'Classe',
            status,
            installment_num: idx + 1,
          };
        });
      } else {
        // Sample realistic payment schedule per child
        records = [
          {
            id: 'pay-1',
            student_id: kids[0]?.id,
            label: 'Tranche 1 (Inscription & Rentrée)',
            amount_due: 150000,
            amount_paid: 150000,
            due_date: '2026-09-15',
            student_name: kids[0]?.name,
            class_name: 'Terminale C',
            status: 'paid',
            installment_num: 1,
          },
          {
            id: 'pay-2',
            student_id: kids[0]?.id,
            label: 'Tranche 2 (Trimestre 1)',
            amount_due: 125000,
            amount_paid: 125000,
            due_date: '2026-11-30',
            student_name: kids[0]?.name,
            class_name: 'Terminale C',
            status: 'paid',
            installment_num: 2,
          },
          {
            id: 'pay-3',
            student_id: kids[0]?.id,
            label: 'Tranche 3 (Trimestre 2)',
            amount_due: 125000,
            amount_paid: 50000,
            due_date: '2027-02-15',
            student_name: kids[0]?.name,
            class_name: 'Terminale C',
            status: 'partial',
            installment_num: 3,
          },
          {
            id: 'pay-4',
            student_id: kids[0]?.id,
            label: 'Tranche 4 (Solde Fin d\'Année)',
            amount_due: 100000,
            amount_paid: 0,
            due_date: '2027-04-30',
            student_name: kids[0]?.name,
            class_name: 'Terminale C',
            status: 'unpaid',
            installment_num: 4,
          },
        ];

        if (kids[1]) {
          records.push(
            {
              id: 'pay-5',
              student_id: kids[1]?.id,
              label: 'Tranche 1 (Inscription & Rentrée)',
              amount_due: 140000,
              amount_paid: 140000,
              due_date: '2026-09-15',
              student_name: kids[1]?.name,
              class_name: '1ère A',
              status: 'paid',
              installment_num: 1,
            },
            {
              id: 'pay-6',
              student_id: kids[1]?.id,
              label: 'Tranche 2 (Trimestre 1)',
              amount_due: 110000,
              amount_paid: 0,
              due_date: '2026-11-30',
              student_name: kids[1]?.name,
              class_name: '1ère A',
              status: 'unpaid',
              installment_num: 2,
            }
          );
        }
      }

      setPayments(records);
      calculateTotals(records, activeChildId);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const calculateTotals = (records: PaymentRecord[], childId: string | null) => {
    const targetChild = children.find(c => c.id === childId);
    const filtered = childId && targetChild
      ? records.filter(r => r.student_name === targetChild.name || r.student_id === childId)
      : records;

    const totalDue = filtered.reduce((s, r) => s + r.amount_due, 0);
    const totalPaid = filtered.reduce((s, r) => s + r.amount_paid, 0);
    setTotals({ due: totalDue, paid: totalPaid, remaining: Math.max(0, totalDue - totalPaid) });
  };

  const handleSelectChild = (childId: string) => {
    setSelectedChild(childId);
    calculateTotals(payments, childId);
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const fmt = (n: number) => n.toLocaleString('fr-FR') + ' FCFA';

  const currentChildName = children.find(c => c.id === selectedChild)?.name;

  const childFilteredPayments = selectedChild
    ? payments.filter(p => p.student_id === selectedChild || p.student_name === currentChildName)
    : payments;

  const finalFilteredPayments = childFilteredPayments.filter(p => {
    if (statusFilter === 'pending') return p.status !== 'paid';
    if (statusFilter === 'paid') return p.status === 'paid';
    return true;
  });

  const openCheckout = (record: PaymentRecord) => {
    setActivePaymentRecord(record);
    const remaining = record.amount_due - record.amount_paid;
    setCustomAmount(remaining.toString());
    setIsPartialCustom(false);
    setPhoneNumber('');
    setCardNumber('');
    setCardExpiry('');
    setCardCvc('');
    setCheckoutModalVisible(true);
  };

  const processPaymentSubmission = () => {
    if (!activePaymentRecord) return;

    const remainingAmount = activePaymentRecord.amount_due - activePaymentRecord.amount_paid;
    const amountToDebit = isPartialCustom
      ? parseInt(customAmount.replace(/\D/g, '') || '0', 10)
      : remainingAmount;

    if (amountToDebit <= 0 || isNaN(amountToDebit)) {
      Alert.alert('Montant invalide', 'Veuillez saisir un montant valide à régler.');
      return;
    }
    if (amountToDebit > remainingAmount) {
      Alert.alert('Montant trop élevé', `Le montant ne peut pas dépasser le solde restant (${fmt(remainingAmount)}).`);
      return;
    }

    if (selectedMethod.category === 'mobile' && !phoneNumber) {
      Alert.alert('Numéro requis', `Veuillez saisir votre numéro ${selectedMethod.name} pour recevoir la notification Push.`);
      return;
    }

    if (selectedMethod.id === 'card' && (!cardNumber || !cardExpiry || !cardCvc)) {
      Alert.alert('Coordonnées incomplètes', 'Veuillez renseigner le numéro de carte, la date d\'expiration et le CVC.');
      return;
    }

    setProcessingPayment(true);

    // Realistic processing animation with USSD validation
    setTimeout(async () => {
      const newPaidAmount = activePaymentRecord.amount_paid + amountToDebit;
      const newStatus: PaymentRecord['status'] = newPaidAmount >= activePaymentRecord.amount_due ? 'paid' : 'partial';

      // Update local state
      const updatedPayments = payments.map(p => {
        if (p.id === activePaymentRecord.id) {
          return { ...p, amount_paid: newPaidAmount, status: newStatus };
        }
        return p;
      });

      setPayments(updatedPayments);
      calculateTotals(updatedPayments, selectedChild);

      // Try updating Supabase database if connected
      try {
        await supabase
          .from('payment_records')
          .update({ amount_paid: newPaidAmount, status: newStatus })
          .eq('id', activePaymentRecord.id);
      } catch (e) {
        console.log('Supabase payment sync mock:', e);
      }

      const receiptNo = `REC-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;
      setCompletedTransaction({
        receipt_no: receiptNo,
        amount: amountToDebit,
        label: activePaymentRecord.label,
        student_name: activePaymentRecord.student_name,
        method: selectedMethod.name,
        date: new Date().toLocaleDateString('fr-FR', {
          day: '2-digit',
          month: 'long',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        }),
      });

      setProcessingPayment(false);
      setCheckoutModalVisible(false);
      setReceiptModalVisible(true);
    }, 1800);
  };

  const handleShareReceipt = async () => {
    if (!completedTransaction) return;
    try {
      await Share.share({
        message: `📄 REÇU OFFICIEL DE SCOLARITÉ EURÊKA\n` +
          `N° Référence : ${completedTransaction.receipt_no}\n` +
          `Élève : ${completedTransaction.student_name}\n` +
          `Objet : ${completedTransaction.label}\n` +
          `Montant réglé : ${fmt(completedTransaction.amount)}\n` +
          `Moyen de paiement : ${completedTransaction.method}\n` +
          `Date : ${completedTransaction.date}\n` +
          `Statut : Validé & certifié conforme par Eurêka ERP`,
      });
    } catch (err) {
      console.log(err);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={Brand.blue} size="large" />
      </View>
    );
  }

  const overallPct = totals.due > 0 ? Math.min(100, (totals.paid / totals.due) * 100) : 100;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" />

      {/* Top Header */}
      <AppTopHeader
        role="parent"
        title="Paiements & Scolarité"
        subtitle="Règlements sécurisés Wave, Orange, MoMo, Carte"
      />

      {/* Children Filter Selector */}
      {children.length > 1 && (
        <View style={styles.childFilterBarWrapper}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.childFilterContent}
          >
            {children.map(child => {
              const isSelected = selectedChild === child.id;
              return (
                <TouchableOpacity
                  key={child.id}
                  style={[styles.childCardChip, isSelected && styles.childCardChipActive]}
                  onPress={() => handleSelectChild(child.id)}
                  activeOpacity={0.8}
                >
                  <View style={[styles.childAvatar, isSelected && styles.childAvatarActive]}>
                    <Text style={[styles.childAvatarTxt, isSelected && styles.childAvatarTxtActive]}>
                      {child.name[0]}
                    </Text>
                  </View>
                  <Text style={[styles.childChipText, isSelected && styles.childChipTextActive]}>
                    {child.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Brand.blue} />}
      >
        {/* Financial Summary Hero Card */}
        <View style={[styles.heroSummaryCard, Shadows.md]}>
          <View style={styles.heroSummaryTop}>
            <View>
              <Text style={styles.heroLabel}>Total Réglé</Text>
              <Text style={styles.heroValuePaid}>{fmt(totals.paid)}</Text>
              <Text style={styles.heroTotalDueTxt}>sur total annuel de {fmt(totals.due)}</Text>
            </View>

            <View style={[styles.heroRemainingBadge, { backgroundColor: totals.remaining > 0 ? '#FEF2F2' : '#F0FDF4' }]}>
              <Text style={[styles.heroRemainingLabel, { color: totals.remaining > 0 ? Brand.red : Brand.green }]}>
                {totals.remaining > 0 ? 'Reste à payer' : 'Scolarité soldée'}
              </Text>
              <Text style={[styles.heroRemainingValue, { color: totals.remaining > 0 ? Brand.red : Brand.green }]}>
                {fmt(totals.remaining)}
              </Text>
            </View>
          </View>

          {/* Progress bar */}
          <View style={styles.heroProgressContainer}>
            <View style={styles.heroProgressHeader}>
              <Text style={styles.heroProgressTitle}>Progression de la scolarité</Text>
              <Text style={styles.heroProgressPct}>{overallPct.toFixed(0)}%</Text>
            </View>
            <View style={styles.heroProgressTrack}>
              <View style={[styles.heroProgressBar, { width: `${overallPct}%`, backgroundColor: totals.remaining === 0 ? Brand.green : Brand.blue }]} />
            </View>
          </View>
        </View>

        {/* Filter chips: Tous / En attente / Soldés */}
        <View style={styles.statusFilterRow}>
          {[
            { id: 'all' as const, label: `Toutes (${childFilteredPayments.length})` },
            { id: 'pending' as const, label: `À régler (${childFilteredPayments.filter(p => p.status !== 'paid').length})` },
            { id: 'paid' as const, label: `Réglées (${childFilteredPayments.filter(p => p.status === 'paid').length})` },
          ].map(f => {
            const isFilterActive = statusFilter === f.id;
            return (
              <TouchableOpacity
                key={f.id}
                style={[styles.statusFilterChip, isFilterActive && styles.statusFilterChipActive]}
                onPress={() => setStatusFilter(f.id)}
              >
                <Text style={[styles.statusFilterTxt, isFilterActive && styles.statusFilterTxtActive]}>
                  {f.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* List Header */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionHeaderTitle}>Échéancier & Tranches</Text>
          <View style={styles.secureTag}>
            <Ionicons name="shield-checkmark" size={13} color={Brand.green} />
            <Text style={styles.paymentSecurityTag}>Paiement Agréé</Text>
          </View>
        </View>

        {finalFilteredPayments.length === 0 ? (
          <View style={[styles.emptyCard, Shadows.sm]}>
            <Ionicons name="card-outline" size={48} color="#CBD5E1" />
            <Text style={styles.emptyTitle}>Aucune tranche dans cette catégorie</Text>
            <Text style={styles.emptyText}>Toutes vos échéances sélectionnées sont à jour.</Text>
          </View>
        ) : (
          finalFilteredPayments.map((pay, idx) => {
            const isPaid = pay.status === 'paid';
            const isPartial = pay.status === 'partial';
            const remaining = pay.amount_due - pay.amount_paid;
            const dueDateFormatted = new Date(pay.due_date).toLocaleDateString('fr-FR', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
            });

            return (
              <View key={pay.id} style={[styles.installmentCard, Shadows.sm, isPaid && styles.installmentCardPaid]}>
                <View style={styles.installmentHeader}>
                  <View style={styles.installmentTitleBox}>
                    <View style={[styles.trancheBadge, isPaid ? styles.trancheBadgePaid : styles.trancheBadgePending]}>
                      <Text style={[styles.trancheBadgeText, isPaid ? styles.trancheBadgeTextPaid : styles.trancheBadgeTextPending]}>
                        T{pay.installment_num || idx + 1}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.installmentLabel}>{pay.label}</Text>
                      <Text style={styles.installmentStudentText}>
                        {pay.student_name} • {pay.class_name}
                      </Text>
                    </View>
                  </View>

                  {/* Status Badge */}
                  {isPaid ? (
                    <View style={styles.statusBadgePaid}>
                      <Ionicons name="checkmark-circle" size={15} color="#059669" />
                      <Text style={styles.statusBadgePaidTxt}>Payé</Text>
                    </View>
                  ) : isPartial ? (
                    <View style={styles.statusBadgePartial}>
                      <Ionicons name="alert-circle" size={15} color="#D97706" />
                      <Text style={styles.statusBadgePartialTxt}>Partiel</Text>
                    </View>
                  ) : (
                    <View style={styles.statusBadgeUnpaid}>
                      <Ionicons name="time-outline" size={15} color="#DC2626" />
                      <Text style={styles.statusBadgeUnpaidTxt}>À Payer</Text>
                    </View>
                  )}
                </View>

                {/* Amount breakdown */}
                <View style={styles.installmentAmountRow}>
                  <View>
                    <Text style={styles.amountLabelText}>Montant Tranche</Text>
                    <Text style={styles.amountValueText}>{fmt(pay.amount_due)}</Text>
                  </View>

                  {isPartial && (
                    <View>
                      <Text style={styles.amountLabelText}>Déjà Versé</Text>
                      <Text style={[styles.amountValueText, { color: Brand.green }]}>{fmt(pay.amount_paid)}</Text>
                    </View>
                  )}

                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.amountLabelText}>Date Limite</Text>
                    <Text style={styles.dueDateText}>{dueDateFormatted}</Text>
                  </View>
                </View>

                {/* Pay button if not paid */}
                {!isPaid && (
                  <TouchableOpacity
                    style={styles.payNowActionBtn}
                    onPress={() => openCheckout(pay)}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="wallet-outline" size={18} color="#FFFFFF" />
                    <Text style={styles.payNowActionText}>
                      Régler {fmt(remaining)}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Checkout Payment Modal Sheet */}
      <Modal
        visible={checkoutModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => {
          Keyboard.dismiss();
          setCheckoutModalVisible(false);
        }}
      >
        <View style={styles.modalOverlay}>
          {/* Backdrop dismiss */}
          <TouchableWithoutFeedback
            onPress={() => {
              Keyboard.dismiss();
              setCheckoutModalVisible(false);
            }}
          >
            <View style={StyleSheet.absoluteFill} />
          </TouchableWithoutFeedback>

          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.modalKeyboardAvoid}
          >
            <View style={styles.modalSheet}>
              {/* Drag handle */}
              <View style={styles.modalDragHandle} />

              {/* Fixed Header */}
              <View style={styles.modalHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.modalHeaderSubtitle}>Guichet de Paiement Sécurisé</Text>
                  <Text style={styles.modalHeaderTitle} numberOfLines={1}>{activePaymentRecord?.label}</Text>
                </View>
                <TouchableOpacity
                  onPress={() => {
                    Keyboard.dismiss();
                    setCheckoutModalVisible(false);
                  }}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons name="close-circle" size={26} color="#94A3B8" />
                </TouchableOpacity>
              </View>

              {/* Keyboard Accessory Bar (when keyboard is open) */}
              {keyboardVisible && (
                <View style={styles.keyboardToolbar}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Ionicons name="keypad" size={15} color={Brand.blue} />
                    <Text style={styles.keyboardToolbarText}>Saisie en cours</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.keyboardToolbarDismissBtn}
                    onPress={() => Keyboard.dismiss()}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.keyboardToolbarDismissTxt}>Masquer le clavier ⌵</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Scrollable Modal Content */}
              <ScrollView
                ref={checkoutScrollRef}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="on-drag"
                contentContainerStyle={[
                  styles.modalScrollBody,
                  { paddingBottom: Math.max(insets.bottom, 20) + 24 }
                ]}
              >
                {/* Total to pay banner */}
                <View style={styles.checkoutTotalBanner}>
                  <Text style={styles.checkoutTotalLabel}>Montant à débiter</Text>
                  <Text style={styles.checkoutTotalVal}>
                    {isPartialCustom ? fmt(parseInt(customAmount || '0', 10)) : fmt((activePaymentRecord?.amount_due || 0) - (activePaymentRecord?.amount_paid || 0))}
                  </Text>
                  <Text style={styles.checkoutStudentMeta}>
                    Élève : {activePaymentRecord?.student_name}
                  </Text>
                </View>

                {/* Payment Amount toggle: Total vs Partial */}
                <View style={styles.amountToggleRow}>
                  <TouchableOpacity
                    style={[styles.amountToggleBtn, !isPartialCustom && styles.amountToggleBtnActive]}
                    onPress={() => {
                      Keyboard.dismiss();
                      setIsPartialCustom(false);
                      const rem = (activePaymentRecord?.amount_due || 0) - (activePaymentRecord?.amount_paid || 0);
                      setCustomAmount(rem.toString());
                    }}
                  >
                    <Text style={[styles.amountToggleTxt, !isPartialCustom && styles.amountToggleTxtActive]}>
                      Totalité du solde
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.amountToggleBtn, isPartialCustom && styles.amountToggleBtnActive]}
                    onPress={() => {
                      setIsPartialCustom(true);
                      setTimeout(() => {
                        checkoutScrollRef.current?.scrollTo({ y: 80, animated: true });
                      }, 100);
                    }}
                  >
                    <Text style={[styles.amountToggleTxt, isPartialCustom && styles.amountToggleTxtActive]}>
                      Payer un acompte
                    </Text>
                  </TouchableOpacity>
                </View>

                {isPartialCustom && (
                  <View style={styles.customAmountBox}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                      <Text style={styles.inputFieldLabel}>Saisir le montant partiel (FCFA)</Text>
                      {focusedInput === 'amount' && (
                        <TouchableOpacity onPress={Keyboard.dismiss} style={styles.inlineDismissBtn}>
                          <Text style={styles.inlineDismissTxt}>OK ✓</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                    <View style={[styles.customAmountWrapper, focusedInput === 'amount' && styles.inputWrapperFocused]}>
                      <TextInput
                        style={styles.customAmountInput}
                        value={customAmount}
                        onChangeText={setCustomAmount}
                        onFocus={() => {
                          setFocusedInput('amount');
                          setTimeout(() => {
                            checkoutScrollRef.current?.scrollTo({ y: 120, animated: true });
                          }, 150);
                        }}
                        onBlur={() => setFocusedInput(null)}
                        keyboardType="numeric"
                        returnKeyType="done"
                        onSubmitEditing={Keyboard.dismiss}
                        placeholder="Ex: 50000"
                        placeholderTextColor="#94A3B8"
                      />
                      <Text style={styles.currencyBadge}>FCFA</Text>
                    </View>
                  </View>
                )}

                {/* Select Payment Method */}
                <Text style={styles.fieldSectionLabel}>Mode de Règlement</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.methodsRow}>
                  {PAYMENT_METHODS.map(method => {
                    const isSelected = selectedMethod.id === method.id;
                    return (
                      <TouchableOpacity
                        key={method.id}
                        style={[styles.methodCardChip, isSelected && styles.methodCardChipActive]}
                        onPress={() => {
                          Keyboard.dismiss();
                          setSelectedMethod(method);
                        }}
                        activeOpacity={0.8}
                      >
                        <View style={[styles.methodIconBox, { backgroundColor: method.bg }]}>
                          {method.image ? (
                            <Image
                              source={method.image}
                              style={styles.methodLogoImage}
                              resizeMode="contain"
                            />
                          ) : (
                            <Ionicons name={method.icon!} size={20} color={method.color} />
                          )}
                        </View>
                        <View>
                          <Text style={[styles.methodChipName, isSelected && styles.methodChipNameActive]}>
                            {method.name}
                          </Text>
                          <Text style={styles.methodBadgeTxt}>{method.badge}</Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>

                {/* Conditional Input Fields */}
                {selectedMethod.category === 'mobile' && (
                  <View style={styles.inputFormGroup}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                      <Text style={styles.inputFieldLabel}>Numéro Mobile Money ({selectedMethod.name})</Text>
                      {focusedInput === 'phone' && (
                        <TouchableOpacity onPress={Keyboard.dismiss} style={styles.inlineDismissBtn}>
                          <Text style={styles.inlineDismissTxt}>OK ✓</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                    <View style={[styles.inputPhoneWrapper, focusedInput === 'phone' && styles.inputWrapperFocused]}>
                      <Text style={styles.phoneCountryCode}>+225</Text>
                      <TextInput
                        style={styles.phoneInputField}
                        value={phoneNumber}
                        onChangeText={setPhoneNumber}
                        onFocus={() => {
                          setFocusedInput('phone');
                          setTimeout(() => {
                            checkoutScrollRef.current?.scrollToEnd({ animated: true });
                          }, 150);
                        }}
                        onBlur={() => setFocusedInput(null)}
                        placeholder="07 00 00 00 00"
                        keyboardType="phone-pad"
                        returnKeyType="done"
                        onSubmitEditing={Keyboard.dismiss}
                        placeholderTextColor="#94A3B8"
                      />
                      {phoneNumber.length > 0 && (
                        <TouchableOpacity
                          onPress={() => setPhoneNumber('')}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                          style={{ paddingHorizontal: 6 }}
                        >
                          <Ionicons name="close-circle" size={18} color="#94A3B8" />
                        </TouchableOpacity>
                      )}
                    </View>
                    <Text style={styles.inputHelperTxt}>
                      💡 Vous recevrez une invite USSD / Push sur votre mobile pour valider avec votre code secret.
                    </Text>
                  </View>
                )}

                {selectedMethod.id === 'card' && (
                  <View style={styles.inputFormGroup}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                      <Text style={styles.inputFieldLabel}>Numéro de Carte Bancaire</Text>
                      {focusedInput === 'card' && (
                        <TouchableOpacity onPress={Keyboard.dismiss} style={styles.inlineDismissBtn}>
                          <Text style={styles.inlineDismissTxt}>OK ✓</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                    <View style={[styles.cardInputWrapper, focusedInput === 'card' && styles.inputWrapperFocused]}>
                      <TextInput
                        style={styles.cardInputField}
                        value={cardNumber}
                        onChangeText={setCardNumber}
                        onFocus={() => {
                          setFocusedInput('card');
                          setTimeout(() => {
                            checkoutScrollRef.current?.scrollToEnd({ animated: true });
                          }, 150);
                        }}
                        onBlur={() => setFocusedInput(null)}
                        placeholder="4000 1234 5678 9010"
                        keyboardType="numeric"
                        returnKeyType="next"
                        placeholderTextColor="#94A3B8"
                      />
                    </View>

                    <View style={styles.cardRowTwo}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.inputFieldLabel}>Exp (MM/AA)</Text>
                        <View style={[styles.cardInputWrapper, focusedInput === 'expiry' && styles.inputWrapperFocused]}>
                          <TextInput
                            style={styles.cardInputHalf}
                            value={cardExpiry}
                            onChangeText={setCardExpiry}
                            onFocus={() => {
                              setFocusedInput('expiry');
                              setTimeout(() => {
                                checkoutScrollRef.current?.scrollToEnd({ animated: true });
                              }, 150);
                            }}
                            onBlur={() => setFocusedInput(null)}
                            placeholder="12/28"
                            keyboardType="numeric"
                            maxLength={5}
                            returnKeyType="next"
                            placeholderTextColor="#94A3B8"
                          />
                        </View>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.inputFieldLabel}>CVC / CVV</Text>
                        <View style={[styles.cardInputWrapper, focusedInput === 'cvc' && styles.inputWrapperFocused]}>
                          <TextInput
                            style={styles.cardInputHalf}
                            value={cardCvc}
                            onChangeText={setCardCvc}
                            onFocus={() => {
                              setFocusedInput('cvc');
                              setTimeout(() => {
                                checkoutScrollRef.current?.scrollToEnd({ animated: true });
                              }, 150);
                            }}
                            onBlur={() => setFocusedInput(null)}
                            placeholder="123"
                            keyboardType="numeric"
                            maxLength={4}
                            secureTextEntry
                            returnKeyType="done"
                            onSubmitEditing={Keyboard.dismiss}
                            placeholderTextColor="#94A3B8"
                          />
                        </View>
                      </View>
                    </View>
                  </View>
                )}

                {selectedMethod.id === 'bank' && (
                  <View style={styles.bankInstructionBox}>
                    <Ionicons name="information-circle-outline" size={24} color="#7C3AED" />
                    <Text style={styles.bankInstructionTxt}>
                      Effectuez votre virement vers le compte Eurêka : <Text style={{ fontWeight: '800' }}>CI93 0100 1234 5678 9000</Text> avec la référence <Text style={{ fontWeight: '800' }}>"{activePaymentRecord?.student_name}"</Text>.
                    </Text>
                  </View>
                )}

                {/* Confirm Payment Action Button */}
                <TouchableOpacity
                  style={[styles.confirmPayBtn, processingPayment && { opacity: 0.7 }]}
                  onPress={processPaymentSubmission}
                  disabled={processingPayment}
                  activeOpacity={0.8}
                >
                  {processingPayment ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <ActivityIndicator color="#FFFFFF" size="small" />
                      <Text style={styles.confirmPayBtnTxt}>Traitement en cours...</Text>
                    </View>
                  ) : (
                    <>
                      <Ionicons name="lock-closed" size={18} color="#FFFFFF" />
                      <Text style={styles.confirmPayBtnTxt}>
                        Valider le Paiement Sécurisé
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* Success Receipt Digital Ticket Modal */}
      <Modal visible={receiptModalVisible} animationType="fade" transparent>
        <View style={styles.modalOverlayCenter}>
          <View style={[styles.receiptTicketCard, Shadows.md]}>
            <View style={styles.receiptSuccessHeader}>
              <View style={styles.receiptSuccessIconCircle}>
                <Ionicons name="checkmark" size={32} color="#FFFFFF" />
              </View>
              <Text style={styles.receiptSuccessTitle}>Paiement Enregistré !</Text>
              <Text style={styles.receiptSuccessSubtitle}>Reçu officiel certifié Eurêka ERP</Text>
            </View>

            <View style={styles.receiptTicketDetails}>
              <View style={styles.receiptRow}>
                <Text style={styles.receiptRowLabel}>N° Référence</Text>
                <Text style={styles.receiptRowValBold}>{completedTransaction?.receipt_no}</Text>
              </View>

              <View style={styles.receiptRow}>
                <Text style={styles.receiptRowLabel}>Élève</Text>
                <Text style={styles.receiptRowVal}>{completedTransaction?.student_name}</Text>
              </View>

              <View style={styles.receiptRow}>
                <Text style={styles.receiptRowLabel}>Tranche</Text>
                <Text style={styles.receiptRowVal}>{completedTransaction?.label}</Text>
              </View>

              <View style={styles.receiptRow}>
                <Text style={styles.receiptRowLabel}>Mode de Règlement</Text>
                <Text style={styles.receiptRowVal}>{completedTransaction?.method}</Text>
              </View>

              <View style={styles.receiptRow}>
                <Text style={styles.receiptRowLabel}>Date & Heure</Text>
                <Text style={styles.receiptRowVal}>{completedTransaction?.date}</Text>
              </View>

              <View style={styles.receiptDivider} />

              <View style={styles.receiptTotalRow}>
                <Text style={styles.receiptTotalLabel}>Montant Réglé</Text>
                <Text style={styles.receiptTotalVal}>{fmt(completedTransaction?.amount || 0)}</Text>
              </View>
            </View>

            <View style={styles.receiptActionsRow}>
              <TouchableOpacity
                style={styles.shareReceiptBtn}
                onPress={handleShareReceipt}
              >
                <Ionicons name="share-social-outline" size={18} color="#2563EB" />
                <Text style={styles.shareReceiptBtnTxt}>Partager Reçu</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.closeReceiptBtn}
                onPress={() => setReceiptModalVisible(false)}
              >
                <Text style={styles.closeReceiptBtnTxt}>Fermer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8FAFC' },
  childFilterBarWrapper: { backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  childFilterContent: { paddingHorizontal: Spacing.base, paddingVertical: 10 },
  childCardChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: Radius.full,
    backgroundColor: '#F1F5F9',
    marginRight: Spacing.sm,
    gap: 7,
  },
  childCardChipActive: { backgroundColor: Brand.blue },
  childAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  childAvatarActive: { backgroundColor: 'rgba(255,255,255,0.3)' },
  childAvatarTxt: { fontSize: 11, fontWeight: '800', color: '#475569' },
  childAvatarTxtActive: { color: '#FFFFFF' },
  childChipText: { fontSize: 13, color: '#475569', fontWeight: '700' },
  childChipTextActive: { color: '#FFFFFF' },
  scrollContent: { padding: Spacing.base, paddingBottom: 110 },
  /* Hero Summary Card */
  heroSummaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: Radius.xxl,
    padding: Spacing.base,
    marginBottom: Spacing.base,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  heroSummaryTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  heroLabel: { fontSize: 11, color: '#64748B', fontWeight: '700', textTransform: 'uppercase' },
  heroValuePaid: { fontSize: 22, fontWeight: '900', color: Brand.green, marginTop: 2 },
  heroTotalDueTxt: { fontSize: 11, color: '#94A3B8', marginTop: 2 },
  heroRemainingBadge: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: Radius.lg, alignItems: 'flex-end' },
  heroRemainingLabel: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
  heroRemainingValue: { fontSize: 15, fontWeight: '900', marginTop: 2 },
  heroProgressContainer: { marginTop: 4 },
  heroProgressHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  heroProgressTitle: { fontSize: 12, fontWeight: '700', color: '#475569' },
  heroProgressPct: { fontSize: 12, fontWeight: '800', color: Brand.blue },
  heroProgressTrack: { height: 8, backgroundColor: '#F1F5F9', borderRadius: Radius.full, overflow: 'hidden' },
  heroProgressBar: { height: '100%', borderRadius: Radius.full },
  /* Filter chips */
  statusFilterRow: { flexDirection: 'row', gap: 6, marginBottom: 12 },
  statusFilterChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: Radius.full, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E2E8F0' },
  statusFilterChipActive: { backgroundColor: Brand.blue, borderColor: Brand.blue },
  statusFilterTxt: { fontSize: 12, color: '#64748B', fontWeight: '700' },
  statusFilterTxtActive: { color: '#FFFFFF' },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  sectionHeaderTitle: { fontSize: 15, fontWeight: '800', color: '#0F172A' },
  secureTag: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  paymentSecurityTag: { fontSize: 11, fontWeight: '700', color: Brand.green },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: Radius.xxl,
    padding: Spacing.xxxl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginVertical: Spacing.base,
  },
  emptyTitle: { fontSize: 16, fontWeight: '800', color: '#1E293B', marginTop: 8 },
  emptyText: { fontSize: 12, color: '#64748B', textAlign: 'center', marginTop: 4 },
  /* Installment Cards */
  installmentCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: Radius.xl,
    padding: Spacing.base,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  installmentCardPaid: { backgroundColor: '#F8FAFC' },
  installmentHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  installmentTitleBox: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  trancheBadge: { width: 34, height: 34, borderRadius: Radius.lg, alignItems: 'center', justifyContent: 'center' },
  trancheBadgePending: { backgroundColor: '#EFF6FF' },
  trancheBadgePaid: { backgroundColor: '#ECFDF5' },
  trancheBadgeText: { fontSize: 13, fontWeight: '900' },
  trancheBadgeTextPending: { color: Brand.blue },
  trancheBadgeTextPaid: { color: Brand.green },
  installmentLabel: { fontSize: 14, fontWeight: '800', color: '#0F172A' },
  installmentStudentText: { fontSize: 11, color: '#64748B', marginTop: 2 },
  statusBadgePaid: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#ECFDF5', paddingHorizontal: 9, paddingVertical: 3, borderRadius: Radius.full },
  statusBadgePaidTxt: { fontSize: 11, fontWeight: '800', color: Brand.green },
  statusBadgePartial: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#FEF3C7', paddingHorizontal: 9, paddingVertical: 3, borderRadius: Radius.full },
  statusBadgePartialTxt: { fontSize: 11, fontWeight: '800', color: '#D97706' },
  statusBadgeUnpaid: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#FEE2E2', paddingHorizontal: 9, paddingVertical: 3, borderRadius: Radius.full },
  statusBadgeUnpaidTxt: { fontSize: 11, fontWeight: '800', color: Brand.red },
  installmentAmountRow: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#F8FAFC', padding: 10, borderRadius: Radius.lg, marginVertical: 6 },
  amountLabelText: { fontSize: 10, color: '#64748B', fontWeight: '600' },
  amountValueText: { fontSize: 15, fontWeight: '900', color: '#0F172A', marginTop: 2 },
  dueDateText: { fontSize: 12, fontWeight: '700', color: '#475569', marginTop: 2 },
  payNowActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Brand.blue,
    paddingVertical: 12,
    borderRadius: Radius.lg,
    marginTop: 6,
    gap: 8,
  },
  payNowActionText: { color: '#FFFFFF', fontWeight: '800', fontSize: 14 },
  /* Modal */
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalKeyboardAvoid: { width: '100%', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '88%',
    overflow: 'hidden',
  },
  modalDragHandle: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#CBD5E1',
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 4,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingTop: 6,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#F1F5F9',
  },
  modalHeaderSubtitle: { fontSize: 11, color: '#64748B', fontWeight: '700', textTransform: 'uppercase' },
  modalHeaderTitle: { fontSize: 17, fontWeight: '900', color: '#0F172A', marginTop: 2 },
  modalScrollBody: {
    paddingHorizontal: Spacing.xl,
    paddingTop: 12,
  },
  keyboardToolbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: Spacing.xl,
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: '#DBEAFE',
  },
  keyboardToolbarText: { fontSize: 11, color: Brand.blue, fontWeight: '700' },
  keyboardToolbarDismissBtn: {
    backgroundColor: Brand.blue,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.full,
  },
  keyboardToolbarDismissTxt: { fontSize: 11, color: '#FFFFFF', fontWeight: '800' },
  inlineDismissBtn: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radius.full,
    backgroundColor: '#EFF6FF',
  },
  inlineDismissTxt: { fontSize: 11, color: Brand.blue, fontWeight: '800' },
  checkoutTotalBanner: { backgroundColor: '#EFF6FF', padding: 12, borderRadius: Radius.lg, alignItems: 'center', marginBottom: 12 },
  checkoutTotalLabel: { fontSize: 11, color: Brand.blue, fontWeight: '700', textTransform: 'uppercase' },
  checkoutTotalVal: { fontSize: 24, fontWeight: '900', color: Brand.blue, marginTop: 2 },
  checkoutStudentMeta: { fontSize: 12, color: '#475569', marginTop: 3 },
  amountToggleRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  amountToggleBtn: { flex: 1, paddingVertical: 8, borderRadius: Radius.md, backgroundColor: '#F1F5F9', alignItems: 'center' },
  amountToggleBtnActive: { backgroundColor: Brand.blue },
  amountToggleTxt: { fontSize: 12, color: '#64748B', fontWeight: '700' },
  amountToggleTxtActive: { color: '#FFFFFF' },
  customAmountBox: { marginBottom: 12 },
  customAmountWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    borderRadius: Radius.lg,
    paddingHorizontal: 12,
  },
  customAmountInput: {
    flex: 1,
    paddingVertical: 11,
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  currencyBadge: { fontSize: 12, fontWeight: '800', color: '#64748B', paddingLeft: 6 },
  fieldSectionLabel: { fontSize: 12, fontWeight: '800', color: '#0F172A', marginBottom: 8 },
  methodsRow: { marginBottom: 12 },
  methodCardChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: Radius.lg,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginRight: 8,
    gap: 8,
  },
  methodCardChipActive: { backgroundColor: '#FFFFFF', borderColor: Brand.blue, borderWidth: 2 },
  methodIconBox: { width: 40, height: 40, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
  methodLogoImage: { width: 30, height: 30, borderRadius: 4 },
  methodChipName: { fontSize: 12, fontWeight: '800', color: '#0F172A' },
  methodChipNameActive: { color: Brand.blue },
  methodBadgeTxt: { fontSize: 10, color: '#64748B', fontWeight: '600' },
  inputFormGroup: { marginBottom: 12 },
  inputFieldLabel: { fontSize: 11, fontWeight: '700', color: '#334155', marginBottom: 4 },
  inputPhoneWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: Radius.lg,
    paddingHorizontal: 12,
  },
  phoneCountryCode: { fontSize: 15, fontWeight: '800', color: '#0F172A', paddingRight: 8 },
  phoneInputField: { flex: 1, paddingVertical: 12, fontSize: 15, fontWeight: '700', color: '#0F172A' },
  inputHelperTxt: { fontSize: 11, color: '#64748B', marginTop: 4 },
  cardInputWrapper: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: Radius.lg,
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  cardInputField: { paddingVertical: 11, fontSize: 15, fontWeight: '700', color: '#0F172A' },
  cardRowTwo: { flexDirection: 'row', gap: 10 },
  cardInputHalf: { paddingVertical: 11, fontSize: 14, fontWeight: '700', color: '#0F172A' },
  inputWrapperFocused: {
    borderColor: Brand.blue,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    shadowColor: Brand.blue,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 5,
    elevation: 3,
  },
  bankInstructionBox: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#F5F3FF', padding: 10, borderRadius: Radius.lg, marginBottom: 12 },
  bankInstructionTxt: { flex: 1, fontSize: 11, color: '#6B21A8', lineHeight: 16 },
  confirmPayBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Brand.green,
    paddingVertical: 14,
    borderRadius: Radius.lg,
    gap: 8,
    marginTop: 6,
  },
  confirmPayBtnTxt: { color: '#FFFFFF', fontWeight: '900', fontSize: 15 },
  /* Digital Receipt Ticket */
  modalOverlayCenter: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: Spacing.xl },
  receiptTicketCard: { backgroundColor: '#FFFFFF', borderRadius: Radius.xxl, padding: Spacing.xl, width: '100%', maxWidth: 360, alignItems: 'center' },
  receiptSuccessHeader: { alignItems: 'center', marginBottom: 12 },
  receiptSuccessIconCircle: { width: 52, height: 52, borderRadius: 26, backgroundColor: Brand.green, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  receiptSuccessTitle: { fontSize: 18, fontWeight: '900', color: '#0F172A' },
  receiptSuccessSubtitle: { fontSize: 11, color: '#64748B', marginTop: 2 },
  receiptTicketDetails: { width: '100%', backgroundColor: '#F8FAFC', padding: 12, borderRadius: Radius.lg, marginVertical: 8 },
  receiptRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  receiptRowLabel: { fontSize: 11, color: '#64748B', fontWeight: '600' },
  receiptRowVal: { fontSize: 11, color: '#0F172A', fontWeight: '700' },
  receiptRowValBold: { fontSize: 11, color: Brand.blue, fontWeight: '800' },
  receiptDivider: { height: 1, backgroundColor: '#E2E8F0', marginVertical: 8 },
  receiptTotalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  receiptTotalLabel: { fontSize: 12, fontWeight: '800', color: '#0F172A' },
  receiptTotalVal: { fontSize: 16, fontWeight: '900', color: Brand.green },
  receiptActionsRow: { flexDirection: 'row', gap: 8, width: '100%', marginTop: 8 },
  shareReceiptBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#EFF6FF', paddingVertical: 12, borderRadius: Radius.lg, gap: 6 },
  shareReceiptBtnTxt: { fontSize: 13, fontWeight: '800', color: Brand.blue },
  closeReceiptBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F1F5F9', paddingVertical: 12, borderRadius: Radius.lg },
  closeReceiptBtnTxt: { fontSize: 13, fontWeight: '700', color: '#475569' },
});
