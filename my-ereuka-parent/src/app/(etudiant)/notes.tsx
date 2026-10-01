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
  subject: string;
  grade: number;
  max_grade: number;
  date: string;
}

interface SubjectAvg {
  subject: string;
  avg: number;
  count: number;
}

const SUBJECT_META: Record<string, { icon: keyof typeof Ionicons.glyphMap; color: string; bg: string }> = {
  Mathématiques: { icon: 'calculator-outline', color: '#2563EB', bg: '#EFF6FF' },
  'Physique-Chimie': { icon: 'flask-outline', color: '#7C3AED', bg: '#F5F3FF' },
  Français: { icon: 'book-outline', color: '#D97706', bg: '#FFFBEB' },
  'Histoire-Géo': { icon: 'earth-outline', color: '#059669', bg: '#ECFDF5' },
  Anglais: { icon: 'language-outline', color: '#DC2626', bg: '#FEF2F2' },
  SVT: { icon: 'leaf-outline', color: '#16A34A', bg: '#F0FDF4' },
  EPS: { icon: 'fitness-outline', color: '#EA580C', bg: '#FFFEF2' },
};

const DEFAULT_META = { icon: 'journal-outline' as const, color: '#10B981', bg: '#ECFDF5' };

export default function EtudiantNotes() {
  const insets = useSafeAreaInsets();
  const [grades, setGrades] = useState<GradeEntry[]>([]);
  const [subjectAvgs, setSubjectAvgs] = useState<SubjectAvg[]>([]);
  const [overallAvg, setOverallAvg] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState<'cards' | 'list'>('cards');
  const [selectedSubjectDetail, setSelectedSubjectDetail] = useState<{
    subject: string;
    avg: number;
    count: number;
    grades: GradeEntry[];
  } | null>(null);

  useEffect(() => { loadGrades(); }, []);

  const loadGrades = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data: studentData } = await supabase
        .from('students')
        .select('id')
        .eq('user_id', session.user.id)
        .single();

      if (!studentData) return;

      const { data: gradeData } = await supabase
        .from('grades')
        .select('id, grade, max_grade, created_at, subjects(name)')
        .eq('student_id', studentData.id)
        .order('created_at', { ascending: false });

      const entries: GradeEntry[] = (gradeData || []).map((g: any) => ({
        id: g.id,
        subject: g.subjects?.name || 'Matière',
        grade: g.grade,
        max_grade: g.max_grade || 20,
        date: g.created_at,
      }));

      setGrades(entries);

      const bySubject: Record<string, number[]> = {};
      entries.forEach(e => {
        if (!bySubject[e.subject]) bySubject[e.subject] = [];
        bySubject[e.subject].push((e.grade / e.max_grade) * 20);
      });

      const avgs = Object.entries(bySubject).map(([subject, vals]) => ({
        subject,
        avg: vals.reduce((a, b) => a + b, 0) / vals.length,
        count: vals.length,
      })).sort((a, b) => b.avg - a.avg);

      setSubjectAvgs(avgs);

      const all = entries.map(e => (e.grade / e.max_grade) * 20);
      setOverallAvg(all.length > 0 ? all.reduce((a, b) => a + b, 0) / all.length : null);
    } catch (err) { console.error(err); }
    finally { setLoading(false); setRefreshing(false); }
  };

  const onRefresh = () => { setRefreshing(true); loadGrades(); };

  const getAvgBadgeColor = (avg: number) => {
    if (avg >= 16) return { color: '#059669', bg: '#D1FAE5', border: '#A7F3D0', text: 'Très bien' };
    if (avg >= 14) return { color: '#2563EB', bg: '#DBEAFE', border: '#BFDBFE', text: 'Bien' };
    if (avg >= 10) return { color: '#D97706', bg: '#FEF3C7', border: '#FDE68A', text: 'Moyen' };
    return { color: '#DC2626', bg: '#FEE2E2', border: '#FCA5A5', text: 'Insuffisant' };
  };

  const openSubjectDetail = (sa: SubjectAvg) => {
    const list = grades.filter(g => g.subject === sa.subject);
    setSelectedSubjectDetail({
      subject: sa.subject,
      avg: sa.avg,
      count: sa.count,
      grades: list,
    });
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={Brand.green} size="large" />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerSubtitle}>Mon Carnet</Text>
          <Text style={styles.headerTitle}>🎓 Relevé de Notes</Text>
        </View>

        <View style={styles.headerRightGroup}>
          <View style={styles.viewModeToggle}>
            <TouchableOpacity
              style={[styles.toggleBtn, viewMode === 'cards' && styles.toggleBtnActive]}
              onPress={() => setViewMode('cards')}
            >
              <Ionicons name="grid-outline" size={16} color={viewMode === 'cards' ? '#10B981' : '#64748B'} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.toggleBtn, viewMode === 'list' && styles.toggleBtnActive]}
              onPress={() => setViewMode('list')}
            >
              <Ionicons name="list-outline" size={16} color={viewMode === 'list' ? '#10B981' : '#64748B'} />
            </TouchableOpacity>
          </View>

          {overallAvg !== null && (
            <View style={styles.overallHeroCard}>
              <Text style={styles.overallHeroLabel}>Moyenne</Text>
              <Text style={styles.overallHeroValue}>{overallAvg.toFixed(2)}</Text>
            </View>
          )}
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Brand.green} />}
      >
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>
            {viewMode === 'cards' ? 'Moyennes par Matière (Cards)' : 'Moyennes par Matière (Liste)'}
          </Text>
          <Text style={styles.clickHintText}>Toucher pour détails ℹ️</Text>
        </View>

        {subjectAvgs.length === 0 ? (
          <View style={[styles.emptyCard, Shadows.sm]}>
            <Ionicons name="bar-chart-outline" size={54} color="#CBD5E1" />
            <Text style={styles.emptyTitle}>Aucune matière évaluée</Text>
            <Text style={styles.emptyText}>Vos moyennes par discipline apparaîtront ici.</Text>
          </View>
        ) : viewMode === 'cards' ? (
          /* Cards View Mode */
          subjectAvgs.map(sa => {
            const meta = SUBJECT_META[sa.subject] || DEFAULT_META;
            const badge = getAvgBadgeColor(sa.avg);
            const pct = (sa.avg / 20) * 100;

            return (
              <TouchableOpacity
                key={sa.subject}
                style={[styles.subjectCard, Shadows.sm]}
                onPress={() => openSubjectDetail(sa)}
                activeOpacity={0.8}
              >
                <View style={styles.subjectCardHeader}>
                  <View style={styles.subjectCardLeft}>
                    <View style={[styles.iconBox, { backgroundColor: meta.bg }]}>
                      <Ionicons name={meta.icon} size={22} color={meta.color} />
                    </View>
                    <View>
                      <Text style={styles.subjectName}>{sa.subject}</Text>
                      <Text style={styles.subjectEvaluations}>{sa.count} évaluation{sa.count > 1 ? 's' : ''}</Text>
                    </View>
                  </View>

                  <View style={[styles.scoreBadgePill, { backgroundColor: badge.bg, borderColor: badge.border }]}>
                    <Text style={[styles.scoreBadgeVal, { color: badge.color }]}>{sa.avg.toFixed(1)}</Text>
                    <Text style={[styles.scoreBadgeMax, { color: badge.color }]}>/20</Text>
                  </View>
                </View>

                {/* Progress bar */}
                <View style={styles.progressTrack}>
                  <View style={[styles.progressBar, { width: `${pct}%`, backgroundColor: badge.color }]} />
                </View>

                <View style={styles.subjectCardFooter}>
                  <View style={[styles.statusChip, { backgroundColor: badge.bg }]}>
                    <Text style={[styles.statusText, { color: badge.color }]}>{badge.text}</Text>
                  </View>
                  <View style={styles.footerDetailLink}>
                    <Text style={styles.detailsText}>Détails notes</Text>
                    <Ionicons name="chevron-forward" size={14} color="#94A3B8" />
                  </View>
                </View>
              </TouchableOpacity>
            );
          })
        ) : (
          /* List View Mode */
          subjectAvgs.map(sa => {
            const meta = SUBJECT_META[sa.subject] || DEFAULT_META;
            const badge = getAvgBadgeColor(sa.avg);

            return (
              <TouchableOpacity
                key={sa.subject}
                style={[styles.subjectListItem, Shadows.sm]}
                onPress={() => openSubjectDetail(sa)}
                activeOpacity={0.7}
              >
                <View style={[styles.listIconBox, { backgroundColor: meta.bg }]}>
                  <Ionicons name={meta.icon} size={18} color={meta.color} />
                </View>

                <View style={styles.listMetaContent}>
                  <Text style={styles.listSubjectText}>{sa.subject}</Text>
                  <Text style={styles.listEvalCountText}>{sa.count} évaluation{sa.count > 1 ? 's' : ''}</Text>
                </View>

                <View style={[styles.listScoreBadge, { backgroundColor: badge.bg }]}>
                  <Text style={[styles.listScoreValue, { color: badge.color }]}>{sa.avg.toFixed(1)}/20</Text>
                </View>

                <Ionicons name="chevron-forward" size={16} color="#CBD5E1" />
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      {/* Subject Detail Modal */}
      <Modal visible={selectedSubjectDetail !== null} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { paddingBottom: insets.bottom + 20 }]}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderLeft}>
                <View style={[styles.modalIconBox, { backgroundColor: '#ECFDF5' }]}>
                  <Ionicons name="school-outline" size={24} color="#10B981" />
                </View>
                <View>
                  <Text style={styles.modalSubjectTitle}>{selectedSubjectDetail?.subject}</Text>
                  <Text style={styles.modalSubjectSubtitle}>Moyenne : {selectedSubjectDetail?.avg.toFixed(2)}/20</Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => setSelectedSubjectDetail(null)}>
                <Ionicons name="close-circle" size={26} color="#94A3B8" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalDetailHeader}>Toutes les notes en {selectedSubjectDetail?.subject}</Text>
            <ScrollView style={{ maxHeight: 220 }} showsVerticalScrollIndicator={false}>
              {selectedSubjectDetail?.grades.map(g => {
                const ratio = g.grade / g.max_grade;
                const c = ratio >= 0.8 ? '#059669' : ratio >= 0.6 ? '#2563EB' : ratio >= 0.5 ? '#D97706' : '#DC2626';
                const bg = ratio >= 0.8 ? '#D1FAE5' : ratio >= 0.6 ? '#DBEAFE' : ratio >= 0.5 ? '#FEF3C7' : '#FEE2E2';

                return (
                  <View key={g.id} style={styles.modalGradeItemRow}>
                    <View>
                      <Text style={styles.modalGradeDate}>
                        {new Date(g.date).toLocaleDateString('fr-FR', { weekday: 'short', day: '2-digit', month: 'short' })}
                      </Text>
                    </View>
                    <View style={[styles.modalGradeScorePill, { backgroundColor: bg }]}>
                      <Text style={[styles.modalGradeScoreVal, { color: c }]}>{g.grade}/{g.max_grade}</Text>
                    </View>
                  </View>
                );
              })}
            </ScrollView>

            <TouchableOpacity
              style={styles.modalCloseBtn}
              onPress={() => setSelectedSubjectDetail(null)}
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
  toggleBtn: { paddingHorizontal: 8, paddingVertical: 6, borderRadius: Radius.md },
  toggleBtnActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  overallHeroCard: {
    backgroundColor: '#10B981',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.lg,
    alignItems: 'center',
  },
  overallHeroLabel: { fontSize: 9, fontWeight: '700', color: 'rgba(255,255,255,0.85)', textTransform: 'uppercase' },
  overallHeroValue: { fontSize: 16, fontWeight: '900', color: '#FFFFFF' },
  scrollContent: { padding: Spacing.xl, paddingBottom: 110 },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.base },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: '#0F172A' },
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
  emptyText: { fontSize: 13, color: '#64748B', textAlign: 'center', marginTop: 6 },
  /* Cards View */
  subjectCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: Radius.xxl,
    padding: Spacing.base,
    marginBottom: Spacing.base,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  subjectCardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  subjectCardLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  iconBox: { width: 44, height: 44, borderRadius: Radius.lg, alignItems: 'center', justifyContent: 'center' },
  subjectName: { fontSize: 16, fontWeight: '800', color: '#0F172A' },
  subjectEvaluations: { fontSize: 12, color: '#64748B', marginTop: 2 },
  scoreBadgePill: {
    flexDirection: 'row',
    alignItems: 'baseline',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.lg,
    borderWidth: 1,
  },
  scoreBadgeVal: { fontSize: 20, fontWeight: '900' },
  scoreBadgeMax: { fontSize: 12, fontWeight: '700', marginLeft: 1 },
  progressTrack: { height: 6, backgroundColor: '#F1F5F9', borderRadius: Radius.full, overflow: 'hidden', marginVertical: 4 },
  progressBar: { height: '100%', borderRadius: Radius.full },
  subjectCardFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 },
  statusChip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.full },
  statusText: { fontSize: 11, fontWeight: '700' },
  footerDetailLink: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  detailsText: { fontSize: 11, color: '#94A3B8', fontWeight: '500' },
  /* List View Mode */
  subjectListItem: {
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
  listEvalCountText: { fontSize: 12, color: '#64748B', marginTop: 1 },
  listScoreBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.md },
  listScoreValue: { fontSize: 14, fontWeight: '800' },
  /* Modal */
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: Radius.xxl,
    borderTopRightRadius: Radius.xxl,
    padding: Spacing.xl,
    maxHeight: '75%',
  },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.base },
  modalHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  modalIconBox: { width: 44, height: 44, borderRadius: Radius.xl, alignItems: 'center', justifyContent: 'center' },
  modalSubjectTitle: { fontSize: 18, fontWeight: '800', color: '#0F172A' },
  modalSubjectSubtitle: { fontSize: 12, color: '#10B981', fontWeight: '700', marginTop: 2 },
  modalDetailHeader: { fontSize: 14, fontWeight: '800', color: '#0F172A', marginTop: Spacing.xs, marginBottom: Spacing.xs },
  modalGradeItemRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  modalGradeDate: { fontSize: 13, color: '#475569', fontWeight: '600' },
  modalGradeScorePill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.md },
  modalGradeScoreVal: { fontSize: 15, fontWeight: '800' },
  modalCloseBtn: { backgroundColor: '#F1F5F9', paddingVertical: 14, borderRadius: Radius.xl, alignItems: 'center', marginTop: Spacing.base },
  modalCloseBtnText: { fontSize: 15, fontWeight: '800', color: '#475569' },
});
