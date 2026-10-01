import React, { useEffect, useState } from 'react';
import {
  StyleSheet, Text, View, ScrollView, ActivityIndicator,
  StatusBar, RefreshControl, TouchableOpacity, Modal, TextInput, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../../../lib/supabase';
import { Brand, Radius, Shadows, Spacing } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';

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
  id: 'orange' | 'wave' | 'mtn' | 'card' | 'bank' | 'applepay';
  name: string;
  category: 'mobile' | 'card' | 'bank';
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  bg: string;
}

const PAYMENT_METHODS: PaymentMethod[] = [
  { id: 'wave', name: 'Wave Mobile', category: 'mobile', icon: 'water-outline', color: '#10B981', bg: '#ECFDF5' },
  { id: 'orange', name: 'Orange Money', category: 'mobile', icon: 'phone-portrait-outline', color: '#F97316', bg: '#FFF7ED' },
  { id: 'mtn', name: 'MTN Mobile Money', category: 'mobile', icon: 'flash-outline', color: '#EAB308', bg: '#FEFCE8' },
  { id: 'card', name: 'Carte Bancaire (Visa/MC)', category: 'card', icon: 'card-outline', color: '#2563EB', bg: '#EFF6FF' },
  { id: 'applepay', name: 'Apple Pay', category: 'card', icon: 'logo-apple', color: '#0F172A', bg: '#F8FAFC' },
  { id: 'bank', name: 'Virement Bancaire', category: 'bank', icon: 'business-outline', color: '#7C3AED', bg: '#F5F3FF' },
];

export default function ParentPaiements() {
  const insets = useSafeAreaInsets();
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [totals, setTotals] = useState({ due: 0, paid: 0, remaining: 0 });
  const [selectedChild, setSelectedChild] = useState<string | null>(null);
  const [children, setChildren] = useState<{ id: string; name: string }[]>([]);

  // Checkout Modal State
  const [checkoutModalVisible, setCheckoutModalVisible] = useState(false);
  const [activePaymentRecord, setActivePaymentRecord] = useState<PaymentRecord | null>(null);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>(PAYMENT_METHODS[0]);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvc, setCardCvc] = useState('');
  const [processingPayment, setProcessingPayment] = useState(false);

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

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data: kidsData } = await supabase
        .from('students')
        .select('id, first_name, last_name')
        .eq('responsible_id', session.user.id);

      if (!kidsData?.length) { setLoading(false); setRefreshing(false); return; }

      const kids = kidsData.map((c: any) => ({
        id: c.id,
        name: `${c.first_name} ${c.last_name}`,
      }));
      setChildren(kids);
      if (!selectedChild) setSelectedChild(kids[0]?.id);

      const { data: payData } = await supabase
        .from('payment_records')
        .select(`
          id, label, amount_due, amount_paid, due_date, student_id,
          students(first_name, last_name, classes(name))
        `)
        .in('student_id', kidsData.map((c: any) => c.id))
        .order('due_date', { ascending: true });

      const records: PaymentRecord[] = (payData || []).map((p: any, idx: number) => {
        const due = p.amount_due || 100000;
        const paid = p.amount_paid || 0;
        let status: PaymentRecord['status'] = 'unpaid';
        if (paid >= due) status = 'paid';
        else if (paid > 0) status = 'partial';
        return {
          id: p.id,
          student_id: p.student_id,
          label: p.label || `Échéance Tranche ${idx + 1}`,
          amount_due: due,
          amount_paid: paid,
          due_date: p.due_date || '2026-10-15',
          student_name: `${p.students?.first_name} ${p.students?.last_name}`,
          class_name: p.students?.classes?.name || '',
          status,
          installment_num: idx + 1,
        };
      });

      setPayments(records);
      calculateTotals(records, selectedChild || kids[0]?.id);
    } catch (err) { console.error(err); }
    finally { setLoading(false); setRefreshing(false); }
  };

  const calculateTotals = (records: PaymentRecord[], childId: string | null) => {
    const targetChild = children.find(c => c.id === childId);
    const filtered = childId && targetChild
      ? records.filter(r => r.student_name === targetChild.name)
      : records;

    const totalDue = filtered.reduce((s, r) => s + r.amount_due, 0);
    const totalPaid = filtered.reduce((s, r) => s + r.amount_paid, 0);
    setTotals({ due: totalDue, paid: totalPaid, remaining: totalDue - totalPaid });
  };

  const handleSelectChild = (childId: string) => {
    setSelectedChild(childId);
    calculateTotals(payments, childId);
  };

  const onRefresh = () => { setRefreshing(true); loadData(); };

  const fmt = (n: number) => n.toLocaleString('fr-FR') + ' FCFA';

  const filteredPayments = selectedChild
    ? payments.filter(p => children.find(c => c.id === selectedChild)
        ? p.student_name === children.find(c => c.id === selectedChild)?.name
        : true)
    : payments;

  const openCheckout = (record: PaymentRecord) => {
    setActivePaymentRecord(record);
    setPhoneNumber('');
    setCardNumber('');
    setCardExpiry('');
    setCardCvc('');
    setCheckoutModalVisible(true);
  };

  const processPaymentSubmission = () => {
    if (!activePaymentRecord) return;

    if (selectedMethod.category === 'mobile' && !phoneNumber) {
      Alert.alert('Numéro requis', 'Veuillez saisir le numéro de téléphone pour la transaction.');
      return;
    }
    if (selectedMethod.id === 'card' && (!cardNumber || !cardExpiry || !cardCvc)) {
      Alert.alert('Informations de carte requis', 'Veuillez compléter les coordonnées de votre carte bancaire.');
      return;
    }

    setProcessingPayment(true);

    // Simulate payment processing delay (1.5 seconds)
    setTimeout(async () => {
      const remainingAmount = activePaymentRecord.amount_due - activePaymentRecord.amount_paid;
      const newPaidAmount = activePaymentRecord.amount_due;

      // Update local state
      const updatedPayments = payments.map(p => {
        if (p.id === activePaymentRecord.id) {
          return { ...p, amount_paid: newPaidAmount, status: 'paid' as const };
        }
        return p;
      });

      setPayments(updatedPayments);
      calculateTotals(updatedPayments, selectedChild);

      // Try updating Supabase database if connected
      try {
        await supabase
          .from('payment_records')
          .update({ amount_paid: newPaidAmount })
          .eq('id', activePaymentRecord.id);
      } catch (e) {
        console.log('Supabase sync mock:', e);
      }

      const receiptNo = `REC-2026-${Math.floor(1000 + Math.random() * 9000)}`;
      setCompletedTransaction({
        receipt_no: receiptNo,
        amount: remainingAmount,
        label: activePaymentRecord.label,
        student_name: activePaymentRecord.student_name,
        method: selectedMethod.name,
        date: new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
      });

      setProcessingPayment(false);
      setCheckoutModalVisible(false);
      setReceiptModalVisible(true);
    }, 1500);
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={Brand.blue} size="large" />
      </View>
    );
  }

  const overallPct = totals.due > 0 ? Math.min(100, (totals.paid / totals.due) * 100) : 0;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerSubtitle}>Scolarité & Facturation</Text>
          <Text style={styles.headerTitle}>💳 Échéancier de Paiement</Text>
        </View>

        <TouchableOpacity
          style={styles.historyBtn}
          onPress={() => Alert.alert('Historique', 'Tous vos reçus électroniques sont archivés et sécurisés.')}
        >
          <Ionicons name="receipt-outline" size={18} color="#2563EB" />
          <Text style={styles.historyBtnText}>Reçus</Text>
        </TouchableOpacity>
      </View>

      {/* Children Filter Selector */}
      {children.length > 1 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.childFilterBar}
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
                  {child.name.split(' ')[0]}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Brand.blue} />}
      >
        {/* Financial Overview Card */}
        <View style={[styles.heroSummaryCard, Shadows.md]}>
          <View style={styles.heroSummaryTop}>
            <View>
              <Text style={styles.heroLabel}>Statut de Règlement</Text>
              <Text style={styles.heroValuePaid}>{fmt(totals.paid)}</Text>
              <Text style={styles.heroTotalDueTxt}>sur total de {fmt(totals.due)}</Text>
            </View>

            <View style={styles.heroRemainingBadge}>
              <Text style={styles.heroRemainingLabel}>Restant à payer</Text>
              <Text style={styles.heroRemainingValue}>{fmt(totals.remaining)}</Text>
            </View>
          </View>

          {/* Overall Progress Bar */}
          <View style={styles.heroProgressContainer}>
            <View style={styles.heroProgressHeader}>
              <Text style={styles.heroProgressTitle}>Progression Globale</Text>
              <Text style={styles.heroProgressPct}>{overallPct.toFixed(0)}%</Text>
            </View>
            <View style={styles.heroProgressTrack}>
              <View style={[styles.heroProgressBar, { width: `${overallPct}%` }]} />
            </View>
          </View>
        </View>

        {/* Installment List Header */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionHeaderTitle}>Échéances & Tranches de Scolarité</Text>
          <Text style={styles.paymentSecurityTag}>🔒 Paiement Sécurisé</Text>
        </View>

        {filteredPayments.length === 0 ? (
          <View style={[styles.emptyCard, Shadows.sm]}>
            <Ionicons name="card-outline" size={54} color="#CBD5E1" />
            <Text style={styles.emptyTitle}>Aucune échéance en attente</Text>
            <Text style={styles.emptyText}>Toutes les tranches de scolarité sont à jour.</Text>
          </View>
        ) : (
          filteredPayments.map((pay, idx) => {
            const isPaid = pay.status === 'paid';
            const isPartial = pay.status === 'partial';
            const remaining = pay.amount_due - pay.amount_paid;
            const dueDateFormatted = new Date(pay.due_date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });

            return (
              <View key={pay.id} style={[styles.installmentCard, Shadows.sm, isPaid && styles.installmentCardPaid]}>
                <View style={styles.installmentHeader}>
                  <View style={styles.installmentTitleBox}>
                    <View style={[styles.trancheBadge, isPaid ? styles.trancheBadgePaid : styles.trancheBadgePending]}>
                      <Text style={[styles.trancheBadgeText, isPaid ? styles.trancheBadgeTextPaid : styles.trancheBadgeTextPending]}>
                        T{pay.installment_num || idx + 1}
                      </Text>
                    </View>
                    <View>
                      <Text style={styles.installmentLabel}>{pay.label}</Text>
                      <Text style={styles.installmentStudentText}>{pay.student_name} • {pay.class_name}</Text>
                    </View>
                  </View>

                  {/* Status Badge */}
                  {isPaid ? (
                    <View style={styles.statusBadgePaid}>
                      <Ionicons name="checkmark-circle" size={16} color="#059669" />
                      <Text style={styles.statusBadgePaidTxt}>Payé</Text>
                    </View>
                  ) : isPartial ? (
                    <View style={styles.statusBadgePartial}>
                      <Ionicons name="alert-circle" size={16} color="#D97706" />
                      <Text style={styles.statusBadgePartialTxt}>Partiel</Text>
                    </View>
                  ) : (
                    <View style={styles.statusBadgeUnpaid}>
                      <Ionicons name="time-outline" size={16} color="#DC2626" />
                      <Text style={styles.statusBadgeUnpaidTxt}>À Payé</Text>
                    </View>
                  )}
                </View>

                {/* Amount breakdown */}
                <View style={styles.installmentAmountRow}>
                  <View>
                    <Text style={styles.amountLabelText}>Montant Total</Text>
                    <Text style={styles.amountValueText}>{fmt(pay.amount_due)}</Text>
                  </View>

                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.amountLabelText}>Échéance</Text>
                    <Text style={styles.dueDateText}>{dueDateFormatted}</Text>
                  </View>
                </View>

                {/* Action button if unpaid */}
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
      <Modal visible={checkoutModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { paddingBottom: insets.bottom + 20 }]}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalHeaderSubtitle}>Guichet de Paiement</Text>
                <Text style={styles.modalHeaderTitle}>{activePaymentRecord?.label}</Text>
              </View>
              <TouchableOpacity onPress={() => setCheckoutModalVisible(false)}>
                <Ionicons name="close-circle" size={28} color="#94A3B8" />
              </TouchableOpacity>
            </View>

            {/* Total to pay banner */}
            <View style={styles.checkoutTotalBanner}>
              <Text style={styles.checkoutTotalLabel}>Montant à débiter</Text>
              <Text style={styles.checkoutTotalVal}>
                {fmt((activePaymentRecord?.amount_due || 0) - (activePaymentRecord?.amount_paid || 0))}
              </Text>
              <Text style={styles.checkoutStudentMeta}>Pour {activePaymentRecord?.student_name}</Text>
            </View>

            {/* Select Payment Method */}
            <Text style={styles.fieldSectionLabel}>Mode de Paiement</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.methodsRow}>
              {PAYMENT_METHODS.map(method => {
                const isSelected = selectedMethod.id === method.id;
                return (
                  <TouchableOpacity
                    key={method.id}
                    style={[styles.methodCardChip, isSelected && styles.methodCardChipActive]}
                    onPress={() => setSelectedMethod(method)}
                    activeOpacity={0.8}
                  >
                    <View style={[styles.methodIconBox, { backgroundColor: method.bg }]}>
                      <Ionicons name={method.icon} size={20} color={method.color} />
                    </View>
                    <Text style={[styles.methodChipName, isSelected && styles.methodChipNameActive]}>
                      {method.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Conditional Input Fields */}
            {selectedMethod.category === 'mobile' && (
              <View style={styles.inputFormGroup}>
                <Text style={styles.inputFieldLabel}>Numéro Mobile Money ({selectedMethod.name})</Text>
                <View style={styles.inputPhoneWrapper}>
                  <Text style={styles.phoneCountryCode}>+225</Text>
                  <TextInput
                    style={styles.phoneInputField}
                    value={phoneNumber}
                    onChangeText={setPhoneNumber}
                    placeholder="07 00 00 00 00"
                    keyboardType="phone-pad"
                    placeholderTextColor="#94A3B8"
                  />
                </View>
                <Text style={styles.inputHelperTxt}>Une demande d'autorisation Push USSD sera envoyée sur votre téléphone.</Text>
              </View>
            )}

            {selectedMethod.id === 'card' && (
              <View style={styles.inputFormGroup}>
                <Text style={styles.inputFieldLabel}>Numéro de Carte Bancaire</Text>
                <TextInput
                  style={styles.cardInputField}
                  value={cardNumber}
                  onChangeText={setCardNumber}
                  placeholder="4000 1234 5678 9010"
                  keyboardType="numeric"
                  placeholderTextColor="#94A3B8"
                />

                <View style={styles.cardRowTwo}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.inputFieldLabel}>Exp (MM/AA)</Text>
                    <TextInput
                      style={styles.cardInputHalf}
                      value={cardExpiry}
                      onChangeText={setCardExpiry}
                      placeholder="12/28"
                      placeholderTextColor="#94A3B8"
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.inputFieldLabel}>CVC / CVV</Text>
                    <TextInput
                      style={styles.cardInputHalf}
                      value={cardCvc}
                      onChangeText={setCardCvc}
                      placeholder="123"
                      keyboardType="numeric"
                      secureTextEntry
                      placeholderTextColor="#94A3B8"
                    />
                  </View>
                </View>
              </View>
            )}

            {selectedMethod.id === 'bank' && (
              <View style={styles.bankInstructionBox}>
                <Ionicons name="information-circle-outline" size={24} color="#7C3AED" />
                <Text style={styles.bankInstructionTxt}>
                  Veuillez effectuer le virement sur le compte IBAN Ereuka : CI93 0100 1234 5678 9000 avec le libellé <Text style={{ fontWeight: '800' }}>"{activePaymentRecord?.student_name}"</Text>.
                </Text>
              </View>
            )}

            {/* Confirm Payment Action Button */}
            <TouchableOpacity
              style={styles.confirmPayBtn}
              onPress={processPaymentSubmission}
              disabled={processingPayment}
              activeOpacity={0.8}
            >
              {processingPayment ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <>
                  <Ionicons name="lock-closed" size={18} color="#FFFFFF" />
                  <Text style={styles.confirmPayBtnTxt}>
                    Confirmer le Règlement
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
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
              <Text style={styles.receiptSuccessTitle}>Paiement Réussi !</Text>
              <Text style={styles.receiptSuccessSubtitle}>Reçu de règlement électronique généré</Text>
            </View>

            <View style={styles.receiptTicketDetails}>
              <View style={styles.receiptRow}>
                <Text style={styles.receiptRowLabel}>N° de Reçu</Text>
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
                <Text style={styles.receiptRowLabel}>Moyen</Text>
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

            <TouchableOpacity
              style={styles.closeReceiptBtn}
              onPress={() => setReceiptModalVisible(false)}
            >
              <Text style={styles.closeReceiptBtnTxt}>Fermer & Imprimer Reçu</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8FAFC' },
  header: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.base,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerSubtitle: { fontSize: 12, fontWeight: '700', color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.5 },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#0F172A', marginTop: 2 },
  historyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: Radius.full,
    gap: 4,
  },
  historyBtnText: { fontSize: 12, fontWeight: '800', color: '#2563EB' },
  childFilterBar: { backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  childFilterContent: { paddingHorizontal: Spacing.xl, paddingVertical: Spacing.sm },
  childCardChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: Radius.full,
    backgroundColor: '#F1F5F9',
    marginRight: Spacing.sm,
    gap: 8,
  },
  childCardChipActive: { backgroundColor: '#2563EB' },
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
  childChipText: { fontSize: 13, color: '#475569', fontWeight: '600' },
  childChipTextActive: { color: '#FFFFFF', fontWeight: '700' },
  scrollContent: { padding: Spacing.xl, paddingBottom: 110 },
  /* Hero Summary Card */
  heroSummaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: Radius.xxl,
    padding: Spacing.xl,
    marginBottom: Spacing.xl,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  heroSummaryTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: Spacing.base },
  heroLabel: { fontSize: 12, color: '#64748B', fontWeight: '700', textTransform: 'uppercase' },
  heroValuePaid: { fontSize: 24, fontWeight: '900', color: '#059669', marginTop: 2 },
  heroTotalDueTxt: { fontSize: 12, color: '#94A3B8', marginTop: 2 },
  heroRemainingBadge: { backgroundColor: '#FEF2F2', paddingHorizontal: 12, paddingVertical: 8, borderRadius: Radius.xl, alignItems: 'flex-end' },
  heroRemainingLabel: { fontSize: 10, fontWeight: '700', color: '#DC2626', textTransform: 'uppercase' },
  heroRemainingValue: { fontSize: 15, fontWeight: '900', color: '#DC2626', marginTop: 2 },
  heroProgressContainer: { marginTop: Spacing.xs },
  heroProgressHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  heroProgressTitle: { fontSize: 12, fontWeight: '700', color: '#475569' },
  heroProgressPct: { fontSize: 12, fontWeight: '800', color: '#2563EB' },
  heroProgressTrack: { height: 8, backgroundColor: '#F1F5F9', borderRadius: Radius.full, overflow: 'hidden' },
  heroProgressBar: { height: '100%', backgroundColor: '#2563EB', borderRadius: Radius.full },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.base },
  sectionHeaderTitle: { fontSize: 16, fontWeight: '800', color: '#0F172A' },
  paymentSecurityTag: { fontSize: 11, fontWeight: '700', color: '#059669' },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: Radius.xxl,
    padding: Spacing.xxxl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginVertical: Spacing.xl,
  },
  emptyTitle: { fontSize: 17, fontWeight: '800', color: '#1E293B', marginTop: Spacing.base },
  emptyText: { fontSize: 13, color: '#64748B', textAlign: 'center', marginTop: 6 },
  /* Installment Cards */
  installmentCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: Radius.xxl,
    padding: Spacing.base,
    marginBottom: Spacing.base,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  installmentCardPaid: { backgroundColor: '#F8FAFC', borderColor: '#E2E8F0' },
  installmentHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  installmentTitleBox: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  trancheBadge: { width: 34, height: 34, borderRadius: Radius.lg, alignItems: 'center', justifyContent: 'center' },
  trancheBadgePending: { backgroundColor: '#EFF6FF' },
  trancheBadgePaid: { backgroundColor: '#ECFDF5' },
  trancheBadgeText: { fontSize: 14, fontWeight: '800' },
  trancheBadgeTextPending: { color: '#2563EB' },
  trancheBadgeTextPaid: { color: '#059669' },
  installmentLabel: { fontSize: 15, fontWeight: '800', color: '#0F172A' },
  installmentStudentText: { fontSize: 12, color: '#64748B', marginTop: 2 },
  statusBadgePaid: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#ECFDF5', paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.full },
  statusBadgePaidTxt: { fontSize: 11, fontWeight: '800', color: '#059669' },
  statusBadgePartial: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#FEF3C7', paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.full },
  statusBadgePartialTxt: { fontSize: 11, fontWeight: '800', color: '#D97706' },
  statusBadgeUnpaid: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#FEE2E2', paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.full },
  statusBadgeUnpaidTxt: { fontSize: 11, fontWeight: '800', color: '#DC2626' },
  installmentAmountRow: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#F8FAFC', padding: 12, borderRadius: Radius.xl, marginVertical: 8 },
  amountLabelText: { fontSize: 11, color: '#64748B', fontWeight: '600' },
  amountValueText: { fontSize: 16, fontWeight: '900', color: '#0F172A', marginTop: 2 },
  dueDateText: { fontSize: 13, fontWeight: '700', color: '#475569', marginTop: 2 },
  payNowActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563EB',
    paddingVertical: 13,
    borderRadius: Radius.xl,
    marginTop: 8,
    gap: 8,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  payNowActionText: { color: '#FFFFFF', fontWeight: '800', fontSize: 14 },
  /* Checkout Modal Sheet */
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: Radius.xxl,
    borderTopRightRadius: Radius.xxl,
    padding: Spacing.xl,
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.base },
  modalHeaderSubtitle: { fontSize: 11, color: '#64748B', fontWeight: '700', textTransform: 'uppercase' },
  modalHeaderTitle: { fontSize: 18, fontWeight: '800', color: '#0F172A', marginTop: 2 },
  checkoutTotalBanner: { backgroundColor: '#EFF6FF', padding: Spacing.base, borderRadius: Radius.xl, alignItems: 'center', marginBottom: Spacing.base },
  checkoutTotalLabel: { fontSize: 11, color: '#2563EB', fontWeight: '700', textTransform: 'uppercase' },
  checkoutTotalVal: { fontSize: 24, fontWeight: '900', color: '#2563EB', marginTop: 2 },
  checkoutStudentMeta: { fontSize: 12, color: '#475569', marginTop: 4 },
  fieldSectionLabel: { fontSize: 13, fontWeight: '800', color: '#0F172A', marginBottom: 10 },
  methodsRow: { marginBottom: Spacing.base },
  methodCardChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: Radius.xl,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginRight: Spacing.sm,
    gap: 8,
  },
  methodCardChipActive: { backgroundColor: '#FFFFFF', borderColor: '#2563EB', borderWidth: 2 },
  methodIconBox: { width: 32, height: 32, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
  methodChipName: { fontSize: 13, fontWeight: '700', color: '#475569' },
  methodChipNameActive: { color: '#2563EB' },
  inputFormGroup: { marginBottom: Spacing.base },
  inputFieldLabel: { fontSize: 12, fontWeight: '700', color: '#334155', marginBottom: 6 },
  inputPhoneWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', borderWidth: 1.5, borderColor: '#E2E8F0', borderRadius: Radius.xl, paddingHorizontal: 14 },
  phoneCountryCode: { fontSize: 16, fontWeight: '800', color: '#0F172A', paddingRight: 10 },
  phoneInputField: { flex: 1, paddingVertical: 14, fontSize: 16, fontWeight: '700', color: '#0F172A' },
  inputHelperTxt: { fontSize: 11, color: '#64748B', marginTop: 6 },
  cardInputField: { backgroundColor: '#F8FAFC', borderWidth: 1.5, borderColor: '#E2E8F0', borderRadius: Radius.xl, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, fontWeight: '700', color: '#0F172A', marginBottom: 12 },
  cardRowTwo: { flexDirection: 'row', gap: 12 },
  cardInputHalf: { backgroundColor: '#F8FAFC', borderWidth: 1.5, borderColor: '#E2E8F0', borderRadius: Radius.xl, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, fontWeight: '700', color: '#0F172A' },
  bankInstructionBox: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#F5F3FF', padding: Spacing.base, borderRadius: Radius.xl, marginBottom: Spacing.base },
  bankInstructionTxt: { flex: 1, fontSize: 12, color: '#6B21A8', lineHeight: 18 },
  confirmPayBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#059669',
    paddingVertical: 16,
    borderRadius: Radius.xl,
    gap: 8,
    marginTop: Spacing.sm,
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  confirmPayBtnTxt: { color: '#FFFFFF', fontWeight: '900', fontSize: 16 },
  /* Digital Receipt Modal */
  modalOverlayCenter: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: Spacing.xl },
  receiptTicketCard: { backgroundColor: '#FFFFFF', borderRadius: Radius.xxl, padding: Spacing.xl, width: '100%', maxWidth: 360, alignItems: 'center' },
  receiptSuccessHeader: { alignItems: 'center', marginBottom: Spacing.base },
  receiptSuccessIconCircle: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#059669', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  receiptSuccessTitle: { fontSize: 20, fontWeight: '900', color: '#0F172A' },
  receiptSuccessSubtitle: { fontSize: 12, color: '#64748B', marginTop: 2 },
  receiptTicketDetails: { width: '100%', backgroundColor: '#F8FAFC', padding: Spacing.base, borderRadius: Radius.xl, marginVertical: Spacing.sm },
  receiptRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  receiptRowLabel: { fontSize: 12, color: '#64748B', fontWeight: '600' },
  receiptRowVal: { fontSize: 12, color: '#0F172A', fontWeight: '700' },
  receiptRowValBold: { fontSize: 12, color: '#2563EB', fontWeight: '800' },
  receiptDivider: { height: 1, backgroundColor: '#E2E8F0', marginVertical: 10 },
  receiptTotalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  receiptTotalLabel: { fontSize: 13, fontWeight: '800', color: '#0F172A' },
  receiptTotalVal: { fontSize: 18, fontWeight: '900', color: '#059669' },
  closeReceiptBtn: { backgroundColor: '#0F172A', paddingVertical: 14, paddingHorizontal: 20, borderRadius: Radius.xl, marginTop: Spacing.base, width: '100%', alignItems: 'center' },
  closeReceiptBtnTxt: { color: '#FFFFFF', fontWeight: '800', fontSize: 14 },
});
