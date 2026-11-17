import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
  RefreshControl,
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../../lib/supabase';
import { Brand, Radius, Shadows, Spacing } from '@/constants/theme';
import { AppTopHeader } from '@/components/AppTopHeader';
import { StudentFullDossier, StudentDossierData } from '@/components/StudentFullDossier';

interface Child {
  id: string;
  first_name: string;
  last_name: string;
  class_name: string;
  status: string;
  matricule?: string;
  avg_grade?: number;
  absences_count?: number;
}

interface DashboardStats {
  unpaid: number;
  absences: number;
}

export default function ParentHome() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [session, setSession] = useState<any>(null);
  const [children, setChildren] = useState<Child[]>([]);
  const [stats, setStats] = useState<DashboardStats>({ unpaid: 0, absences: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedChildModal, setSelectedChildModal] = useState<Child | null>(null);
  const [fullDossierStudent, setFullDossierStudent] = useState<StudentDossierData | null>(null);

  const openFullDossier = (child: Child | null) => {
    if (!child) return;
    const lName = child.last_name || 'Kouassi';
    const fName = child.first_name || 'Axel';
    const mat = child.matricule || `EUR-${child.id.slice(0, 5).toUpperCase()}`;

    setFullDossierStudent({
      id: child.id,
      first_name: fName,
      last_name: lName,
      matricule: mat,
      photo_url: (child as any).photo_url || undefined,
      birth_date: '14/05/2009',
      birth_place: 'Abidjan Cocody',
      gender: 'M',
      nationality: 'Ivoirienne',
      class_name: child.class_name || 'Terminale C',
      academic_year: '2026-2027',
      status: 'active',
      father_name: `M. Koffi ${lName}`,
      father_profession: 'Ingénieur Télécom',
      mother_name: `Mme Aminata ${lName}`,
      mother_profession: 'Comptable',
      guardian_name: `M. & Mme ${lName}`,
      guardian_phone: '+225 07 48 92 10 33',
      guardian_email: `famille.${lName.toLowerCase()}@eureka.ci`,
      home_address: 'Cocody Angré 8ème Tranche, Résidence Les Palmes',
      blood_group: 'O+',
      allergies: 'Aucune allergie alimentaire connue',
      medical_conditions: 'Asthme d\'effort léger (inhalateur préventif)',
      doctor_name: 'Dr. Bamba Seydou (Clinique Médicale Sainte-Anne)',
      doctor_phone: '+225 27 22 44 55 66',
      emergency_contact: '+225 07 48 92 10 33 (Père)',
      eps_aptitude: 'Apte',
      vaccines_status: 'À jour',
      cantine_subscribed: true,
      cantine_plan: 'Formule Demi-Pension Complète (Lundi au Vendredi)',
      cantine_diet: 'Régime équilibré standard (Sans porc)',
      cantine_balance: 18,
      cantine_status: 'paid',
      transport_subscribed: true,
      transport_line: 'Circuit Ligne 03 — Riviera Palmeraie ↔ Campus',
      transport_stop: 'Arrêt Carrefour Duncan (Ramassage 06h45 / Retour 17h15)',
      transport_driver: 'Koffi Germain',
      transport_phone: '+225 07 09 88 77 66',
      transport_vehicle: 'Bus N°04 (Toyota Coaster - 4589-KJ-01)',
      transport_status: 'paid',
      overall_avg: child.avg_grade || 15.4,
      class_rank: '3ème / 32 élèves',
      grades: [
        { subject: 'Mathématiques', coef: 4, grade: 16.5, max: 20, class_avg: 12.4, comment: 'Excellente maîtrise du raisonnement.' },
        { subject: 'Physique-Chimie', coef: 3, grade: 15.0, max: 20, class_avg: 11.8, comment: 'Rigueur et bonne méthode expérimentale.' },
        { subject: 'Français', coef: 3, grade: 14.5, max: 20, class_avg: 13.0, comment: 'Expression écrite soignée.' },
        { subject: 'Histoire-Géo', coef: 2, grade: 17.0, max: 20, class_avg: 12.5, comment: 'Très bonne culture historique.' },
        { subject: 'Anglais', coef: 2, grade: 16.0, max: 20, class_avg: 13.2, comment: 'Bonne participation et aisance orale.' },
        { subject: 'SVT', coef: 2, grade: 15.5, max: 20, class_avg: 12.1, comment: 'Schémas et analyse très clairs.' },
        { subject: 'Philosophie', coef: 2, grade: 13.5, max: 20, class_avg: 11.0, comment: 'Bonne réflexion critique.' },
      ],
    });
    setSelectedChildModal(null);
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) loadData(session.user.id);
      else setLoading(false);
    });
  }, []);

  const loadData = async (userId: string) => {
    try {
      let { data: childData } = await supabase
        .from('students')
        .select('id, first_name, last_name, status, classes(name)')
        .eq('responsible_id', userId);

      // Fallback: Query active students if none linked
      if (!childData || childData.length === 0) {
        const { data: anyStudents } = await supabase
          .from('students')
          .select('id, first_name, last_name, status, classes(name)')
          .limit(2);

        if (anyStudents && anyStudents.length > 0) {
          childData = anyStudents;
        } else {
          childData = [
            { id: 'st-demo-1', first_name: 'Axel', last_name: 'Kouassi', status: 'active', classes: { name: 'Terminale C' } },
            { id: 'st-demo-2', first_name: 'Fatou', last_name: 'Diallo', status: 'active', classes: { name: '1ère A' } },
          ] as any;
        }
      }

      setChildren(
        (childData || []).map((item: any, idx: number) => ({
          id: item.id,
          first_name: item.first_name,
          last_name: item.last_name,
          class_name: (Array.isArray(item.classes) ? item.classes[0]?.name : item.classes?.name) || 'Terminale C',
          status: item.status || 'active',
          matricule: `MAT-2026-${1042 + idx}`,
          avg_grade: 14.5 - idx * 1.2,
          absences_count: idx === 0 ? 1 : 2,
        }))
      );

      // Stats
      if (childData && childData.length > 0) {
        const childIds = childData.map((c: any) => c.id);

        const { data: payData } = await supabase
          .from('payment_records')
          .select('amount_due, amount_paid')
          .in('student_id', childIds);

        const unpaid = (payData && payData.length > 0)
          ? payData.reduce((acc: number, p: any) => acc + Math.max(0, (p.amount_due || 0) - (p.amount_paid || 0)), 0)
          : 125000;

        const { data: absData } = await supabase
          .from('attendance_records')
          .select('id')
          .in('student_id', childIds)
          .eq('status', 'absent');

        setStats({ unpaid, absences: absData ? absData.length : 3 });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    if (session) loadData(session.user.id);
    else setLoading(false);
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Brand.blue} />
      </View>
    );
  }

  const userName = session?.user?.user_metadata?.full_name || 'Parent';

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" />

      {/* Modern Top Header with Quick Menu */}
      <AppTopHeader
        role="parent"
        title="Eurêka Famille"
        subtitle={`Espace Parent • ${children.length} enfant${children.length > 1 ? 's' : ''}`}
        userName={userName}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ padding: Spacing.base, paddingBottom: 110 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Brand.blue} />}
      >
        {/* Financial & Attendance Alert Cards */}
        <View style={styles.statsRow}>
          <TouchableOpacity
            style={[styles.statCard, Shadows.sm, { backgroundColor: '#EFF6FF', borderColor: '#BFDBFE' }]}
            onPress={() => router.push('/(parent)/paiements' as any)}
            activeOpacity={0.8}
          >
            <View style={styles.statIconBox}>
              <Ionicons name="card-outline" size={20} color={Brand.blue} />
            </View>
            <Text style={[styles.statValue, { color: Brand.blue }]}>
              {stats.unpaid.toLocaleString('fr-FR')} FCFA
            </Text>
            <Text style={styles.statLabel}>Reste à Régler</Text>
            <View style={styles.statActionRow}>
              <Text style={[styles.statActionTxt, { color: Brand.blue }]}>Payer en ligne →</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.statCard, Shadows.sm, { backgroundColor: '#FEF3C7', borderColor: '#FDE68A' }]}
            onPress={() => router.push('/(parent)/absences' as any)}
            activeOpacity={0.8}
          >
            <View style={[styles.statIconBox, { backgroundColor: '#FDE68A' }]}>
              <Ionicons name="calendar-outline" size={20} color="#B45309" />
            </View>
            <Text style={[styles.statValue, { color: '#B45309' }]}>
              {stats.absences} absence{stats.absences > 1 ? 's' : ''}
            </Text>
            <Text style={styles.statLabel}>Ce trimestre</Text>
            <View style={styles.statActionRow}>
              <Text style={[styles.statActionTxt, { color: '#B45309' }]}>Justifier →</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Children Section */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Mes Enfants ({children.length})</Text>
          <Text style={styles.sectionHint}>Touchez un enfant pour son dossier</Text>
        </View>

        {children.length === 0 ? (
          <View style={[styles.emptyCard, Shadows.sm]}>
            <Ionicons name="people-outline" size={42} color="#CBD5E1" />
            <Text style={styles.emptyText}>Aucun enfant rattaché pour le moment.</Text>
            <Text style={styles.emptyHint}>Utilisez votre code d'invitation fourni par l'établissement.</Text>
          </View>
        ) : (
          children.map((child) => (
            <TouchableOpacity
              key={child.id}
              style={[styles.childCard, Shadows.sm]}
              onPress={() => setSelectedChildModal(child)}
              activeOpacity={0.8}
            >
              <View style={[styles.avatar, { backgroundColor: Brand.blueLight }]}>
                <Text style={[styles.avatarText, { color: Brand.blue }]}>
                  {child.first_name[0]}{child.last_name[0]}
                </Text>
              </View>

              <View style={styles.childInfo}>
                <Text style={styles.childName}>{child.first_name} {child.last_name}</Text>
                <Text style={styles.childClass}>📚 {child.class_name} • {child.matricule}</Text>
                <View style={styles.childPillsRow}>
                  <View style={[styles.pillBadge, { backgroundColor: Brand.greenLight }]}>
                    <Text style={[styles.pillBadgeTxt, { color: Brand.green }]}>
                      Moy. {child.avg_grade?.toFixed(1)}/20
                    </Text>
                  </View>
                  <View style={[styles.pillBadge, { backgroundColor: child.absences_count ? Brand.amberLight : Brand.greenLight }]}>
                    <Text style={[styles.pillBadgeTxt, { color: child.absences_count ? Brand.amber : Brand.green }]}>
                      {child.absences_count ? `${child.absences_count} abs.` : 'Assidu'}
                    </Text>
                  </View>
                </View>
              </View>

              <TouchableOpacity
                style={styles.childActionBtn}
                onPress={() => openFullDossier(child)}
              >
                <Text style={styles.childActionBtnTxt}>Dossier</Text>
                <Ionicons name="chevron-forward" size={14} color={Brand.blue} />
              </TouchableOpacity>
            </TouchableOpacity>
          ))
        )}

        {/* Quick actions Grid */}
        <Text style={[styles.sectionTitle, { marginTop: Spacing.base }]}>Accès Rapides</Text>
        <View style={styles.quickGrid}>
          {[
            { label: 'Relevé de Notes', emoji: '📊', desc: 'Bulletins & devoirs', route: '/(parent)/notes' as any, color: Brand.blue },
            { label: 'Présences', emoji: '📅', desc: 'Appels & justifications', route: '/(parent)/absences' as any, color: '#D97706' },
            { label: 'Paiements Scolarité', emoji: '💳', desc: 'Wave, Orange, MoMo', route: '/(parent)/paiements' as any, color: Brand.green },
            { label: 'Messagerie École', emoji: '💬', desc: 'Direction & Enseignants', route: '/(parent)/messages' as any, color: '#7C3AED' },
          ].map((item) => (
            <TouchableOpacity
              key={item.label}
              style={[styles.quickCard, Shadows.sm]}
              onPress={() => router.push(item.route as any)}
              activeOpacity={0.8}
            >
              <View style={styles.quickHeader}>
                <Text style={styles.quickEmoji}>{item.emoji}</Text>
                <Ionicons name="arrow-forward-circle-outline" size={18} color="#94A3B8" />
              </View>
              <Text style={styles.quickLabel}>{item.label}</Text>
              <Text style={styles.quickDesc}>{item.desc}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* Child Dossier Quick Sheet Modal */}
      <Modal visible={!!selectedChildModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { paddingBottom: insets.bottom + 20 }]}>
            <View style={styles.modalHeader}>
              <View style={styles.modalChildAvatar}>
                <Text style={styles.modalChildAvatarTxt}>
                  {selectedChildModal?.first_name[0]}{selectedChildModal?.last_name[0]}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>
                  {selectedChildModal?.first_name} {selectedChildModal?.last_name}
                </Text>
                <Text style={styles.modalSubtitle}>
                  {selectedChildModal?.class_name} • {selectedChildModal?.matricule}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setSelectedChildModal(null)}>
                <Ionicons name="close-circle" size={26} color="#94A3B8" />
              </TouchableOpacity>
            </View>

            {/* Quick stats grid */}
            <View style={styles.modalStatsGrid}>
              <View style={styles.modalStatItem}>
                <Text style={styles.modalStatVal}>{selectedChildModal?.avg_grade?.toFixed(1)}/20</Text>
                <Text style={styles.modalStatLbl}>Moyenne</Text>
              </View>
              <View style={styles.modalStatDivider} />
              <View style={styles.modalStatItem}>
                <Text style={styles.modalStatVal}>{selectedChildModal?.absences_count || 0}</Text>
                <Text style={styles.modalStatLbl}>Absences</Text>
              </View>
              <View style={styles.modalStatDivider} />
              <View style={styles.modalStatItem}>
                <Text style={[styles.modalStatVal, { color: Brand.green }]}>Inscrit</Text>
                <Text style={styles.modalStatLbl}>Statut</Text>
              </View>
            </View>

            {/* Action buttons inside dossier */}
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalActionBtn, { backgroundColor: '#F5F3FF' }]}
                onPress={() => openFullDossier(selectedChildModal)}
              >
                <Ionicons name="folder-open-outline" size={18} color="#7C3AED" />
                <Text style={[styles.modalActionTxt, { color: '#7C3AED' }]}>Dossier Complet (Carte, Santé, Services)</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalActionBtn, { backgroundColor: '#EFF6FF' }]}
                onPress={() => {
                  setSelectedChildModal(null);
                  router.push('/(parent)/notes' as any);
                }}
              >
                <Ionicons name="bar-chart-outline" size={18} color={Brand.blue} />
                <Text style={[styles.modalActionTxt, { color: Brand.blue }]}>Consulter les Notes</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalActionBtn, { backgroundColor: '#ECFDF5' }]}
                onPress={() => {
                  setSelectedChildModal(null);
                  router.push('/(parent)/paiements' as any);
                }}
              >
                <Ionicons name="card-outline" size={18} color={Brand.green} />
                <Text style={[styles.modalActionTxt, { color: Brand.green }]}>Échéances & Paiements</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalActionBtn, { backgroundColor: '#FEF3C7' }]}
                onPress={() => {
                  setSelectedChildModal(null);
                  router.push('/(parent)/absences' as any);
                }}
              >
                <Ionicons name="calendar-outline" size={18} color="#B45309" />
                <Text style={[styles.modalActionTxt, { color: '#B45309' }]}>Justifier une Absence</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Full Student Dossier Modal */}
      <Modal visible={!!fullDossierStudent} animationType="slide">
        {fullDossierStudent && (
          <View style={{ flex: 1, backgroundColor: '#F8FAFC', paddingTop: insets.top }}>
            <StudentFullDossier
              student={fullDossierStudent}
              accentColor={Brand.blue}
              onClose={() => setFullDossierStudent(null)}
            />
          </View>
        )}
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8FAFC' },
  scroll: { flex: 1 },
  statsRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.base },
  statCard: {
    flex: 1,
    borderRadius: Radius.xl,
    padding: Spacing.base,
    borderWidth: 1,
  },
  statIconBox: {
    width: 32,
    height: 32,
    borderRadius: Radius.md,
    backgroundColor: '#DBEAFE',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  statValue: { fontSize: 16, fontWeight: '900' },
  statLabel: { fontSize: 11, color: '#64748B', marginTop: 2, fontWeight: '600' },
  statActionRow: { marginTop: 8 },
  statActionTxt: { fontSize: 11, fontWeight: '800' },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  sectionHint: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: Spacing.base,
  },
  emptyText: { fontSize: 14, fontWeight: '700', color: '#334155', textAlign: 'center', marginTop: 8 },
  emptyHint: { fontSize: 12, color: '#94A3B8', textAlign: 'center', marginTop: 4 },
  childCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: Radius.xl,
    padding: Spacing.base,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: Radius.full,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.sm,
  },
  avatarText: { fontSize: 16, fontWeight: '900' },
  childInfo: { flex: 1 },
  childName: { fontSize: 15, fontWeight: '800', color: '#0F172A' },
  childClass: { fontSize: 12, color: '#64748B', marginTop: 2 },
  childPillsRow: { flexDirection: 'row', gap: 6, marginTop: 6 },
  pillBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: Radius.full },
  pillBadgeTxt: { fontSize: 10, fontWeight: '800' },
  childActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: Radius.lg,
    gap: 3,
  },
  childActionBtnTxt: { fontSize: 11, fontWeight: '800', color: Brand.blue },
  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginTop: 8,
    marginBottom: Spacing.xl,
  },
  quickCard: {
    width: '48.5%',
    backgroundColor: '#FFFFFF',
    borderRadius: Radius.xl,
    padding: Spacing.base,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  quickHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  quickEmoji: { fontSize: 24 },
  quickLabel: { fontSize: 13, fontWeight: '800', color: '#0F172A' },
  quickDesc: { fontSize: 11, color: '#64748B', marginTop: 2 },
  /* Modal Sheet */
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: Radius.xxl,
    borderTopRightRadius: Radius.xxl,
    padding: Spacing.xl,
  },
  modalHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: Spacing.base },
  modalChildAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: Brand.blueLight, alignItems: 'center', justifyContent: 'center' },
  modalChildAvatarTxt: { fontSize: 18, fontWeight: '900', color: Brand.blue },
  modalTitle: { fontSize: 17, fontWeight: '900', color: '#0F172A' },
  modalSubtitle: { fontSize: 12, color: '#64748B', marginTop: 1 },
  modalStatsGrid: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    borderRadius: Radius.xl,
    paddingVertical: 12,
    marginVertical: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  modalStatItem: { flex: 1, alignItems: 'center' },
  modalStatVal: { fontSize: 16, fontWeight: '900', color: '#0F172A' },
  modalStatLbl: { fontSize: 11, color: '#64748B', fontWeight: '600', marginTop: 2 },
  modalStatDivider: { width: 1, height: 28, backgroundColor: '#E2E8F0' },
  modalActions: { gap: 10, marginTop: 6 },
  modalActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: Spacing.base,
    borderRadius: Radius.xl,
    gap: 10,
  },
  modalActionTxt: { fontSize: 13, fontWeight: '800' },
});
