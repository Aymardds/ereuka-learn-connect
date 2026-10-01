import React, { useEffect, useState } from 'react';
import {
  StyleSheet, Text, View, ScrollView, ActivityIndicator,
  StatusBar, RefreshControl, TouchableOpacity, Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../../../lib/supabase';
import { Brand, Radius, Shadows, Spacing } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';

interface GradeEntry {
  id: string;
  student_id?: string;
  student_name: string;
  subject: string;
  grade: number;
  max_grade: number;
  date: string;
  class_name: string;
}

interface StudentDetail {
  id: string;
  name: string;
  class_name: string;
  avg_grade: string;
  total_grades: number;
  highest_grade: string;
  lowest_grade: string;
  recent_grades: GradeEntry[];
}

const SUBJECT_ICONS: Record<string, { icon: keyof typeof Ionicons.glyphMap; color: string; bg: string }> = {
  Mathématiques: { icon: 'calculator-outline', color: '#2563EB', bg: '#EFF6FF' },
  'Physique-Chimie': { icon: 'flask-outline', color: '#7C3AED', bg: '#F5F3FF' },
  Français: { icon: 'book-outline', color: '#D97706', bg: '#FFFBEB' },
  'Histoire-Géo': { icon: 'earth-outline', color: '#059669', bg: '#ECFDF5' },
  Anglais: { icon: 'language-outline', color: '#DC2626', bg: '#FEF2F2' },
  SVT: { icon: 'leaf-outline', color: '#16A34A', bg: '#F0FDF4' },
  EPS: { icon: 'fitness-outline', color: '#EA580C', bg: '#FFFEF2' },
};

const DEFAULT_SUBJECT_ICON = { icon: 'journal-outline' as const, color: '#475569', bg: '#F8FAFC' };

const getGradeStyle = (grade: number, max: number) => {
  const ratio = grade / max;
  if (ratio >= 0.8) return { color: '#059669', bg: '#D1FAE5', border: '#A7F3D0', label: 'Excellent', emoji: '🌟' };
  if (ratio >= 0.7) return { color: '#2563EB', bg: '#DBEAFE', border: '#BFDBFE', label: 'Très Bien', emoji: '👏' };
  if (ratio >= 0.5) return { color: '#D97706', bg: '#FEF3C7', border: '#FDE68A', label: 'Satisfaisant', emoji: '👍' };
  return { color: '#DC2626', bg: '#FEE2E2', border: '#FCA5A5', label: 'À renforcer', emoji: '💡' };
};

export default function ParentNotes() {
  const insets = useSafeAreaInsets();
  const [grades, setGrades] = useState<GradeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedChild, setSelectedChild] = useState<string | null>(null);
  const [children, setChildren] = useState<{ id: string; name: string }[]>([]);
  const [viewMode, setViewMode] = useState<'cards' | 'list'>('cards');
  const [selectedStudentDetail, setSelectedStudentDetail] = useState<StudentDetail | null>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data: childData } = await supabase
        .from('students')
        .select('id, first_name, last_name')
        .eq('responsible_id', session.user.id);

      let kids = (childData || []).map((c: any) => ({
        id: c.id,
        name: `${c.first_name} ${c.last_name}`,
      }));

      if (!kids.length) {
        kids = [
          { id: 'st-demo-1', name: 'Axel Kouassi' },
          { id: 'st-demo-2', name: 'Fatou Diallo' },
        ];
      }
      setChildren(kids);
      if (!selectedChild) setSelectedChild(kids[0]?.id);

      let fetchedGrades: GradeEntry[] = [];
      if (childData && childData.length > 0) {
        const { data: gradeData } = await supabase
          .from('grades')
          .select(`
            id, grade, max_grade, created_at, student_id,
            subjects(name),
            students(first_name, last_name, classes(name))
          `)
          .in('student_id', childData.map((c: any) => c.id))
          .order('created_at', { ascending: false })
          .limit(50);

        if (gradeData && gradeData.length > 0) {
          fetchedGrades = gradeData.map((g: any) => ({
            id: g.id,
            student_id: g.student_id,
            student_name: `${g.students?.first_name} ${g.students?.last_name}`,
            subject: g.subjects?.name || 'Matière',
            grade: g.grade,
            max_grade: g.max_grade || 20,
            date: g.created_at,
            class_name: (Array.isArray(g.students?.classes) ? g.students?.classes[0]?.name : g.students?.classes?.name) || 'Terminale C',
          }));
        }
      }

      if (fetchedGrades.length === 0) {
        fetchedGrades = [
          { id: 'g-1', student_id: 'st-demo-1', student_name: 'Axel Kouassi', subject: 'Mathématiques', grade: 17, max_grade: 20, date: '2026-09-28', class_name: 'Terminale C' },
          { id: 'g-2', student_id: 'st-demo-1', student_name: 'Axel Kouassi', subject: 'Physique-Chimie', grade: 15.5, max_grade: 20, date: '2026-09-25', class_name: 'Terminale C' },
          { id: 'g-3', student_id: 'st-demo-1', student_name: 'Axel Kouassi', subject: 'Français', grade: 14, max_grade: 20, date: '2026-09-22', class_name: 'Terminale C' },
          { id: 'g-4', student_id: 'st-demo-1', student_name: 'Axel Kouassi', subject: 'Histoire-Géo', grade: 16, max_grade: 20, date: '2026-09-18', class_name: 'Terminale C' },
          { id: 'g-5', student_id: 'st-demo-2', student_name: 'Fatou Diallo', subject: 'Anglais', grade: 18, max_grade: 20, date: '2026-09-27', class_name: '1ère A' },
          { id: 'g-6', student_id: 'st-demo-2', student_name: 'Fatou Diallo', subject: 'Français', grade: 16.5, max_grade: 20, date: '2026-09-24', class_name: '1ère A' },
        ];
      }

      setGrades(fetchedGrades);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => { setRefreshing(true); loadData(); };

  const filteredGrades = selectedChild
    ? grades.filter(g => children.find(c => c.id === selectedChild)
        ? g.student_name === children.find(c => c.id === selectedChild)?.name
        : true)
    : grades;

  const avgGradeNum = filteredGrades.length > 0
    ? filteredGrades.reduce((acc, g) => acc + (g.grade / g.max_grade) * 20, 0) / filteredGrades.length
    : null;

  const highestGrade = filteredGrades.length > 0
    ? Math.max(...filteredGrades.map(g => (g.grade / g.max_grade) * 20))
    : null;

  const openStudentDetail = (grade: GradeEntry) => {
    const studentGrades = grades.filter(g => g.student_name === grade.student_name);
    const avg = studentGrades.length > 0
      ? (studentGrades.reduce((a, g) => a + (g.grade / g.max_grade) * 20, 0) / studentGrades.length).toFixed(2)
      : 'N/A';
    const high = studentGrades.length > 0
      ? Math.max(...studentGrades.map(g => (g.grade / g.max_grade) * 20)).toFixed(1)
      : 'N/A';
    const low = studentGrades.length > 0
      ? Math.min(...studentGrades.map(g => (g.grade / g.max_grade) * 20)).toFixed(1)
      : 'N/A';

    setSelectedStudentDetail({
      id: grade.student_id || grade.id,
      name: grade.student_name,
      class_name: grade.class_name || 'Classe',
      avg_grade: avg,
      total_grades: studentGrades.length,
      highest_grade: high,
      lowest_grade: low,
      recent_grades: studentGrades.slice(0, 5),
    });
    setDetailModalVisible(true);
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={Brand.blue} size="large" />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerSubtitle}>Suivi Scolaire</Text>
          <Text style={styles.headerTitle}>📊 Bulletins & Notes</Text>
        </View>

        {/* View mode toggle (Cards / List) */}
        <View style={styles.headerRightGroup}>
          <View style={styles.viewModeToggle}>
            <TouchableOpacity
              style={[styles.toggleBtn, viewMode === 'cards' && styles.toggleBtnActive]}
              onPress={() => setViewMode('cards')}
            >
              <Ionicons name="grid-outline" size={16} color={viewMode === 'cards' ? '#2563EB' : '#64748B'} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.toggleBtn, viewMode === 'list' && styles.toggleBtnActive]}
              onPress={() => setViewMode('list')}
            >
              <Ionicons name="list-outline" size={16} color={viewMode === 'list' ? '#2563EB' : '#64748B'} />
            </TouchableOpacity>
          </View>

          {avgGradeNum !== null && (
            <View style={styles.avgHeroBadge}>
              <Text style={styles.avgHeroLabel}>Moyenne</Text>
              <Text style={styles.avgHeroValue}>{avgGradeNum.toFixed(2)}</Text>
            </View>
          )}
        </View>
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
                onPress={() => setSelectedChild(child.id)}
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
        {/* Stat Banner Cards */}
        {filteredGrades.length > 0 && (
          <View style={styles.statsRow}>
            <View style={[styles.statMiniCard, { backgroundColor: '#EFF6FF', borderColor: '#BFDBFE' }]}>
              <Ionicons name="school-outline" size={20} color="#2563EB" />
              <View>
                <Text style={styles.statMiniValue}>{filteredGrades.length}</Text>
                <Text style={styles.statMiniLabel}>Évaluations</Text>
              </View>
            </View>

            <View style={[styles.statMiniCard, { backgroundColor: '#ECFDF5', borderColor: '#A7F3D0' }]}>
              <Ionicons name="trophy-outline" size={20} color="#059669" />
              <View>
                <Text style={styles.statMiniValue}>{highestGrade ? `${highestGrade.toFixed(1)}/20` : '-'}</Text>
                <Text style={styles.statMiniLabel}>Meilleure note</Text>
              </View>
            </View>
          </View>
        )}

        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionHeaderTitle}>
            {viewMode === 'cards' ? 'Historique des Notes (Cards)' : 'Historique des Notes (Liste)'}
          </Text>
          <Text style={styles.clickHintText}>Toucher pour détails élève ℹ️</Text>
        </View>

        {filteredGrades.length === 0 ? (
          <View style={[styles.emptyCard, Shadows.sm]}>
            <Ionicons name="document-text-outline" size={54} color="#CBD5E1" />
            <Text style={styles.emptyTitle}>Aucune note enregistrée</Text>
            <Text style={styles.emptyText}>Les nouvelles notes saisies par les enseignants apparaîtront ici.</Text>
          </View>
        ) : viewMode === 'cards' ? (
          /* Cards View Mode */
          filteredGrades.map((g) => {
            const style = getGradeStyle(g.grade, g.max_grade);
            const pct = Math.min(100, Math.max(0, (g.grade / g.max_grade) * 100));
            const subjectMeta = SUBJECT_ICONS[g.subject] || DEFAULT_SUBJECT_ICON;

            return (
              <TouchableOpacity
                key={g.id}
                style={[styles.gradeCard, Shadows.sm]}
                onPress={() => openStudentDetail(g)}
                activeOpacity={0.8}
              >
                <View style={styles.gradeCardHeader}>
                  <View style={styles.subjectLeft}>
                    <View style={[styles.subjectIconBox, { backgroundColor: subjectMeta.bg }]}>
                      <Ionicons name={subjectMeta.icon} size={22} color={subjectMeta.color} />
                    </View>
                    <View style={styles.subjectTextMeta}>
                      <Text style={styles.subjectNameText}>{g.subject}</Text>
                      <Text style={styles.studentMetaText}>{g.student_name} • {g.class_name}</Text>
                    </View>
                  </View>

                  <View style={[styles.gradeScorePill, { backgroundColor: style.bg, borderColor: style.border }]}>
                    <Text style={[styles.gradeScoreNum, { color: style.color }]}>{g.grade}</Text>
                    <Text style={[styles.gradeScoreMax, { color: style.color }]}>/{g.max_grade}</Text>
                  </View>
                </View>

                {/* Progress bar visual */}
                <View style={styles.progressContainer}>
                  <View style={styles.progressTrack}>
                    <View style={[styles.progressBar, { width: `${pct}%`, backgroundColor: style.color }]} />
                  </View>
                </View>

                {/* Footer metadata */}
                <View style={styles.gradeCardFooter}>
                  <View style={[styles.statusChip, { backgroundColor: style.bg }]}>
                    <Text style={styles.statusEmoji}>{style.emoji}</Text>
                    <Text style={[styles.statusText, { color: style.color }]}>{style.label}</Text>
                  </View>

                  <View style={styles.footerRightInfo}>
                    <Text style={styles.dateText}>
                      {new Date(g.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
                    </Text>
                    <Ionicons name="chevron-forward" size={14} color="#94A3B8" />
                  </View>
                </View>
              </TouchableOpacity>
            );
          })
        ) : (
          /* List View Mode (Compact Rows) */
          filteredGrades.map((g) => {
            const style = getGradeStyle(g.grade, g.max_grade);
            const subjectMeta = SUBJECT_ICONS[g.subject] || DEFAULT_SUBJECT_ICON;

            return (
              <TouchableOpacity
                key={g.id}
                style={[styles.gradeListItem, Shadows.sm]}
                onPress={() => openStudentDetail(g)}
                activeOpacity={0.7}
              >
                <View style={[styles.listIconBox, { backgroundColor: subjectMeta.bg }]}>
                  <Ionicons name={subjectMeta.icon} size={18} color={subjectMeta.color} />
                </View>

                <View style={styles.listMetaContent}>
                  <Text style={styles.listSubjectText}>{g.subject}</Text>
                  <Text style={styles.listStudentText}>{g.student_name} • {g.class_name}</Text>
                </View>

                <View style={[styles.listScorePill, { backgroundColor: style.bg }]}>
                  <Text style={[styles.listScoreValue, { color: style.color }]}>{g.grade}/{g.max_grade}</Text>
                </View>

                <Ionicons name="chevron-forward" size={16} color="#CBD5E1" />
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      {/* Student Details Modal Sheet */}
      <Modal visible={detailModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { paddingBottom: insets.bottom + 20 }]}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderLeft}>
                <View style={styles.modalAvatar}>
                  <Text style={styles.modalAvatarTxt}>
                    {selectedStudentDetail?.name ? selectedStudentDetail.name[0] : 'É'}
                  </Text>
                </View>
                <View>
                  <Text style={styles.modalStudentTitle}>{selectedStudentDetail?.name}</Text>
                  <Text style={styles.modalStudentSubtitle}>{selectedStudentDetail?.class_name}</Text>
                </View>
              </View>

              <TouchableOpacity onPress={() => setDetailModalVisible(false)}>
                <Ionicons name="close-circle" size={28} color="#94A3B8" />
              </TouchableOpacity>
            </View>

            {/* Performance Metric Cards */}
            <View style={styles.modalMetricGrid}>
              <View style={[styles.modalMetricCard, { backgroundColor: '#EFF6FF' }]}>
                <Text style={styles.modalMetricLabel}>Moyenne</Text>
                <Text style={[styles.modalMetricValue, { color: '#2563EB' }]}>
                  {selectedStudentDetail?.avg_grade}/20
                </Text>
              </View>

              <View style={[styles.modalMetricCard, { backgroundColor: '#ECFDF5' }]}>
                <Text style={styles.modalMetricLabel}>Max</Text>
                <Text style={[styles.modalMetricValue, { color: '#059669' }]}>
                  {selectedStudentDetail?.highest_grade}/20
                </Text>
              </View>

              <View style={[styles.modalMetricCard, { backgroundColor: '#FEF2F2' }]}>
                <Text style={styles.modalMetricLabel}>Min</Text>
                <Text style={[styles.modalMetricValue, { color: '#DC2626' }]}>
                  {selectedStudentDetail?.lowest_grade}/20
                </Text>
              </View>
            </View>

            {/* Recent Grades List */}
            <Text style={styles.modalSectionTitle}>Notes Récents de cet Élève</Text>
            <ScrollView style={styles.modalGradesList} showsVerticalScrollIndicator={false}>
              {selectedStudentDetail?.recent_grades.map(g => {
                const style = getGradeStyle(g.grade, g.max_grade);
                return (
                  <View key={g.id} style={styles.modalGradeItemRow}>
                    <View>
                      <Text style={styles.modalGradeSubject}>{g.subject}</Text>
                      <Text style={styles.modalGradeDate}>
                        {new Date(g.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
                      </Text>
                    </View>
                    <View style={[styles.modalGradeScorePill, { backgroundColor: style.bg }]}>
                      <Text style={[styles.modalGradeScoreVal, { color: style.color }]}>{g.grade}/{g.max_grade}</Text>
                    </View>
                  </View>
                );
              })}
            </ScrollView>

            <TouchableOpacity
              style={styles.modalCloseBtn}
              onPress={() => setDetailModalVisible(false)}
            >
              <Text style={styles.modalCloseBtnText}>Fermer</Text>
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
  headerRightGroup: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  viewModeToggle: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: Radius.lg,
    padding: 3,
    gap: 2,
  },
  toggleBtn: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: Radius.md,
  },
  toggleBtnActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  avgHeroBadge: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.lg,
    alignItems: 'center',
  },
  avgHeroLabel: { fontSize: 9, fontWeight: '700', color: 'rgba(255,255,255,0.8)', textTransform: 'uppercase' },
  avgHeroValue: { fontSize: 16, fontWeight: '900', color: '#FFFFFF' },
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
  statsRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.xl },
  statMiniCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.base,
    borderRadius: Radius.xl,
    borderWidth: 1,
    gap: 12,
  },
  statMiniValue: { fontSize: 16, fontWeight: '800', color: '#0F172A' },
  statMiniLabel: { fontSize: 11, color: '#64748B', fontWeight: '600' },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.base },
  sectionHeaderTitle: { fontSize: 15, fontWeight: '800', color: '#0F172A' },
  clickHintText: { fontSize: 11, color: '#64748B', fontWeight: '600' },
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
  emptyText: { fontSize: 13, color: '#64748B', textAlign: 'center', marginTop: 6, lineHeight: 18 },
  /* Cards View */
  gradeCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: Radius.xxl,
    padding: Spacing.base,
    marginBottom: Spacing.base,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  gradeCardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  subjectLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  subjectIconBox: { width: 44, height: 44, borderRadius: Radius.lg, alignItems: 'center', justifyContent: 'center' },
  subjectTextMeta: { flex: 1 },
  subjectNameText: { fontSize: 15, fontWeight: '800', color: '#0F172A' },
  studentMetaText: { fontSize: 12, color: '#64748B', marginTop: 2, fontWeight: '500' },
  gradeScorePill: {
    flexDirection: 'row',
    alignItems: 'baseline',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.lg,
    borderWidth: 1,
  },
  gradeScoreNum: { fontSize: 20, fontWeight: '900' },
  gradeScoreMax: { fontSize: 12, fontWeight: '700', marginLeft: 1 },
  progressContainer: { marginVertical: 4 },
  progressTrack: { height: 6, backgroundColor: '#F1F5F9', borderRadius: Radius.full, overflow: 'hidden' },
  progressBar: { height: '100%', borderRadius: Radius.full },
  gradeCardFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 },
  statusChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.full },
  statusEmoji: { fontSize: 11 },
  statusText: { fontSize: 11, fontWeight: '700' },
  footerRightInfo: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  dateText: { fontSize: 11, color: '#94A3B8', fontWeight: '500' },
  /* List View Mode */
  gradeListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: Radius.xl,
    padding: Spacing.base,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 12,
  },
  listIconBox: { width: 36, height: 36, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
  listMetaContent: { flex: 1 },
  listSubjectText: { fontSize: 14, fontWeight: '800', color: '#0F172A' },
  listStudentText: { fontSize: 12, color: '#64748B', marginTop: 1 },
  listScorePill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.md },
  listScoreValue: { fontSize: 15, fontWeight: '800' },
  /* Student Details Modal Sheet */
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: Radius.xxl,
    borderTopRightRadius: Radius.xxl,
    padding: Spacing.xl,
    maxHeight: '80%',
  },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.base },
  modalHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  modalAvatar: { width: 44, height: 44, borderRadius: Radius.xl, backgroundColor: '#EFF6FF', alignItems: 'center', justifyContent: 'center' },
  modalAvatarTxt: { fontSize: 18, fontWeight: '900', color: '#2563EB' },
  modalStudentTitle: { fontSize: 18, fontWeight: '800', color: '#0F172A' },
  modalStudentSubtitle: { fontSize: 13, color: '#64748B', marginTop: 2 },
  modalMetricGrid: { flexDirection: 'row', gap: Spacing.sm, marginVertical: Spacing.base },
  modalMetricCard: { flex: 1, padding: Spacing.base, borderRadius: Radius.xl, alignItems: 'center' },
  modalMetricLabel: { fontSize: 11, fontWeight: '700', color: '#64748B', textTransform: 'uppercase' },
  modalMetricValue: { fontSize: 18, fontWeight: '900', marginTop: 4 },
  modalSectionTitle: { fontSize: 15, fontWeight: '800', color: '#0F172A', marginTop: Spacing.sm, marginBottom: Spacing.xs },
  modalGradesList: { maxHeight: 200, marginVertical: Spacing.xs },
  modalGradeItemRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  modalGradeSubject: { fontSize: 14, fontWeight: '700', color: '#0F172A' },
  modalGradeDate: { fontSize: 11, color: '#94A3B8', marginTop: 2 },
  modalGradeScorePill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.md },
  modalGradeScoreVal: { fontSize: 14, fontWeight: '800' },
  modalCloseBtn: { backgroundColor: '#F1F5F9', paddingVertical: 14, borderRadius: Radius.xl, alignItems: 'center', marginTop: Spacing.base },
  modalCloseBtnText: { fontSize: 15, fontWeight: '800', color: '#475569' },
});
