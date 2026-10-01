import React, { useEffect, useState } from 'react';
import {
  StyleSheet, Text, View, ScrollView, ActivityIndicator,
  StatusBar, TouchableOpacity, TextInput, Alert, Modal, RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../../../lib/supabase';
import { Brand, Radius, Shadows, Spacing } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';

interface Student { id: string; first_name: string; last_name: string; }
interface Subject { id: string; name: string; }
interface ClassOption { id: string; name: string; }
interface GradeEntry {
  id: string;
  student_id?: string;
  student_name: string;
  subject: string;
  grade: number;
  max_grade: number;
  date: string;
}

interface StudentDetail {
  id: string;
  name: string;
  class_name: string;
  avg_grade: string;
  total_grades: number;
  recent_grades: GradeEntry[];
}

export default function EnseignantNotes() {
  const insets = useSafeAreaInsets();
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [selectedClass, setSelectedClass] = useState<ClassOption | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [recentGrades, setRecentGrades] = useState<GradeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState<'cards' | 'list'>('cards');
  
  // Grade Input Modal state
  const [showInputModal, setShowInputModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [gradeValue, setGradeValue] = useState('');
  const [maxGrade, setMaxGrade] = useState('20');
  const [saving, setSaving] = useState(false);

  // Student Detail Modal state
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedStudentDetail, setSelectedStudentDetail] = useState<StudentDetail | null>(null);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const { data: classData } = await supabase.from('classes').select('id, name').limit(20);
      const { data: subjectData } = await supabase.from('subjects').select('id, name').limit(30);
      setClasses((classData || []).map((c: any) => ({ id: c.id, name: c.name })));
      setSubjects((subjectData || []).map((s: any) => ({ id: s.id, name: s.name })));

      if (classData && classData.length > 0) {
        const firstClass = { id: classData[0].id, name: classData[0].name };
        setSelectedClass(firstClass);
        await loadStudents(firstClass);
      }

      const { data: gradeData } = await supabase
        .from('grades')
        .select('id, grade, max_grade, created_at, student_id, subjects(name), students(first_name, last_name)')
        .order('created_at', { ascending: false })
        .limit(30);

      setRecentGrades(
        (gradeData || []).map((g: any) => ({
          id: g.id,
          student_id: g.student_id,
          student_name: `${g.students?.first_name} ${g.students?.last_name}`,
          subject: g.subjects?.name || 'Matière',
          grade: g.grade,
          max_grade: g.max_grade || 20,
          date: g.created_at,
        }))
      );
    } catch (err) { console.error(err); }
    finally { setLoading(false); setRefreshing(false); }
  };

  const loadStudents = async (cls: ClassOption) => {
    setSelectedClass(cls);
    const { data } = await supabase
      .from('students')
      .select('id, first_name, last_name')
      .eq('class_id', cls.id)
      .eq('status', 'active');
    setStudents((data || []).map((s: any) => ({ id: s.id, first_name: s.first_name, last_name: s.last_name })));
  };

  const openStudentDetailModal = (student: Student) => {
    const name = `${student.first_name} ${student.last_name}`;
    const studentGrades = recentGrades.filter(g => g.student_name === name);
    const avg = studentGrades.length > 0
      ? (studentGrades.reduce((a, g) => a + (g.grade / g.max_grade) * 20, 0) / studentGrades.length).toFixed(2)
      : 'N/A';

    setSelectedStudentDetail({
      id: student.id,
      name,
      class_name: selectedClass?.name || 'Classe',
      avg_grade: avg,
      total_grades: studentGrades.length,
      recent_grades: studentGrades,
    });
    setSelectedStudent(student);
    setShowDetailModal(true);
  };

  const openGradeModalFromDetail = () => {
    setShowDetailModal(false);
    setGradeValue('');
    setMaxGrade('20');
    if (!selectedSubject && subjects.length > 0) setSelectedSubject(subjects[0]);
    setShowInputModal(true);
  };

  const openGradeModal = (student: Student) => {
    setSelectedStudent(student);
    setGradeValue('');
    setMaxGrade('20');
    if (!selectedSubject && subjects.length > 0) setSelectedSubject(subjects[0]);
    setShowInputModal(true);
  };

  const saveGrade = async () => {
    if (!selectedStudent || !selectedSubject || !gradeValue) {
      Alert.alert('Champs requis', 'Veuillez sélectionner un élève, une matière et saisir une note.');
      return;
    }
    const grade = parseFloat(gradeValue);
    const max = parseFloat(maxGrade);
    if (isNaN(grade) || grade < 0 || grade > max) {
      Alert.alert('Note invalide', `La note doit être entre 0 et ${max}.`);
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.from('grades').insert({
        student_id: selectedStudent.id,
        subject_id: selectedSubject.id,
        grade,
        max_grade: max,
      });
      if (error) throw error;
      Alert.alert('✅ Note enregistrée !', `${grade}/${max} pour ${selectedStudent.first_name}`);
      setShowInputModal(false);
      loadData();
    } catch (err: any) {
      Alert.alert('Erreur', err.message);
    } finally {
      setSaving(false);
    }
  };

  const onRefresh = () => { setRefreshing(true); loadData(); };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={Brand.violet} size="large" />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerSubtitle}>Évaluations</Text>
          <Text style={styles.headerTitle}>📝 Saisie des Notes</Text>
        </View>

        <View style={styles.headerRightGroup}>
          <View style={styles.viewModeToggle}>
            <TouchableOpacity
              style={[styles.toggleBtn, viewMode === 'cards' && styles.toggleBtnActive]}
              onPress={() => setViewMode('cards')}
            >
              <Ionicons name="grid-outline" size={16} color={viewMode === 'cards' ? '#7C3AED' : '#64748B'} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.toggleBtn, viewMode === 'list' && styles.toggleBtnActive]}
              onPress={() => setViewMode('list')}
            >
              <Ionicons name="list-outline" size={16} color={viewMode === 'list' ? '#7C3AED' : '#64748B'} />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.addNoteCardBtn}
            onPress={() => { setSelectedStudent(null); setShowInputModal(true); }}
            activeOpacity={0.8}
          >
            <Ionicons name="add" size={18} color="#FFFFFF" />
            <Text style={styles.addNoteCardBtnText}>Saisir</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Class Horizontal Selector */}
      <View style={styles.classBarContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.classBarContent}>
          {classes.map(cls => {
            const isSelected = selectedClass?.id === cls.id;
            return (
              <TouchableOpacity
                key={cls.id}
                style={[styles.classChipCard, isSelected && styles.classChipCardActive]}
                onPress={() => loadStudents(cls)}
                activeOpacity={0.8}
              >
                <Ionicons
                  name="school-outline"
                  size={16}
                  color={isSelected ? '#7C3AED' : '#64748B'}
                />
                <Text style={[styles.classChipText, isSelected && styles.classChipTextActive]}>
                  {cls.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Brand.violet} />}
      >
        {/* Roster Cards Section */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>
            Élèves de {selectedClass?.name || 'la classe'} ({students.length})
          </Text>
          <Text style={styles.clickHintText}>Cliquer pour détails ℹ️</Text>
        </View>

        {students.length === 0 ? (
          <View style={[styles.emptyCard, Shadows.sm]}>
            <Ionicons name="people-outline" size={48} color="#CBD5E1" />
            <Text style={styles.emptyTitle}>Aucun élève dans cette classe</Text>
          </View>
        ) : viewMode === 'cards' ? (
          /* Cards View Mode */
          students.map(student => (
            <TouchableOpacity
              key={student.id}
              style={[styles.studentCard, Shadows.sm]}
              onPress={() => openStudentDetailModal(student)}
              activeOpacity={0.8}
            >
              <View style={styles.studentCardLeft}>
                <View style={styles.avatarCircle}>
                  <Text style={styles.avatarTxt}>
                    {student.first_name[0]}{student.last_name[0]}
                  </Text>
                </View>
                <View style={styles.studentTextMeta}>
                  <Text style={styles.studentName}>{student.first_name} {student.last_name}</Text>
                  <Text style={styles.studentClassMeta}>Voir dossier & notes récentes</Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.addActionPill}
                onPress={() => openGradeModal(student)}
                activeOpacity={0.8}
              >
                <Ionicons name="create-outline" size={16} color="#7C3AED" />
                <Text style={styles.addActionText}>+ Note</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          ))
        ) : (
          /* List View Mode */
          students.map(student => (
            <TouchableOpacity
              key={student.id}
              style={[styles.studentListItem, Shadows.sm]}
              onPress={() => openStudentDetailModal(student)}
              activeOpacity={0.7}
            >
              <View style={styles.listAvatar}>
                <Text style={styles.listAvatarTxt}>{student.first_name[0]}</Text>
              </View>
              <Text style={styles.listStudentName}>{student.first_name} {student.last_name}</Text>
              <Ionicons name="information-circle-outline" size={20} color="#7C3AED" />
            </TouchableOpacity>
          ))
        )}

        {/* Recent Evaluations Section */}
        {recentGrades.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, { marginTop: Spacing.xl }]}>
              Dernières Notes Attribuées ({recentGrades.length})
            </Text>

            {recentGrades.map(g => {
              const ratio = g.grade / g.max_grade;
              const color = ratio >= 0.8 ? '#059669' : ratio >= 0.6 ? '#2563EB' : ratio >= 0.5 ? '#D97706' : '#DC2626';
              const bg = ratio >= 0.8 ? '#D1FAE5' : ratio >= 0.6 ? '#DBEAFE' : ratio >= 0.5 ? '#FEF3C7' : '#FEE2E2';

              return (
                <View key={g.id} style={[styles.recentGradeCard, Shadows.sm]}>
                  <View style={styles.recentGradeLeft}>
                    <View style={styles.recentGradeIconBox}>
                      <Ionicons name="document-text-outline" size={20} color="#7C3AED" />
                    </View>
                    <View style={styles.recentGradeMeta}>
                      <Text style={styles.recentStudentName}>{g.student_name}</Text>
                      <Text style={styles.recentSubjectName}>{g.subject}</Text>
                    </View>
                  </View>

                  <View style={[styles.gradePillBadge, { backgroundColor: bg }]}>
                    <Text style={[styles.gradePillValue, { color }]}>{g.grade}</Text>
                    <Text style={[styles.gradePillMax, { color }]}>/{g.max_grade}</Text>
                  </View>
                </View>
              );
            })}
          </>
        )}
      </ScrollView>

      {/* Student Detail Modal Sheet */}
      <Modal visible={showDetailModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { paddingBottom: insets.bottom + 20 }]}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderLeft}>
                <View style={[styles.avatarCircle, { backgroundColor: '#F5F3FF' }]}>
                  <Text style={[styles.avatarTxt, { color: '#7C3AED' }]}>
                    {selectedStudentDetail?.name[0]}
                  </Text>
                </View>
                <View>
                  <Text style={styles.modalStudentTitle}>{selectedStudentDetail?.name}</Text>
                  <Text style={styles.modalStudentSubtitle}>{selectedStudentDetail?.class_name}</Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => setShowDetailModal(false)}>
                <Ionicons name="close-circle" size={26} color="#94A3B8" />
              </TouchableOpacity>
            </View>

            <View style={styles.studentDetailCardRow}>
              <View style={[styles.detailMetricCard, { backgroundColor: '#F5F3FF' }]}>
                <Text style={styles.detailMetricLabel}>Moyenne Saisie</Text>
                <Text style={[styles.detailMetricVal, { color: '#7C3AED' }]}>
                  {selectedStudentDetail?.avg_grade}/20
                </Text>
              </View>

              <View style={[styles.detailMetricCard, { backgroundColor: '#EFF6FF' }]}>
                <Text style={styles.detailMetricLabel}>Évaluations</Text>
                <Text style={[styles.detailMetricVal, { color: '#2563EB' }]}>
                  {selectedStudentDetail?.total_grades}
                </Text>
              </View>
            </View>

            <Text style={styles.detailSectionTitle}>Historique des Notes</Text>
            <ScrollView style={{ maxHeight: 180 }} showsVerticalScrollIndicator={false}>
              {selectedStudentDetail?.recent_grades.length === 0 ? (
                <Text style={styles.noGradesTxt}>Aucune note récente pour cet élève.</Text>
              ) : (
                selectedStudentDetail?.recent_grades.map(g => (
                  <View key={g.id} style={styles.historyRow}>
                    <Text style={styles.historySubject}>{g.subject}</Text>
                    <Text style={styles.historyScore}>{g.grade}/{g.max_grade}</Text>
                  </View>
                ))
              )}
            </ScrollView>

            <TouchableOpacity style={styles.actionModalAddBtn} onPress={openGradeModalFromDetail}>
              <Ionicons name="add-circle" size={20} color="#FFFFFF" />
              <Text style={styles.actionModalAddBtnTxt}>Ajouter une Note à {selectedStudentDetail?.name.split(' ')[0]}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Grade Input Bottom Sheet Modal */}
      <Modal visible={showInputModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { paddingBottom: insets.bottom + 20 }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>📝 Nouvelle Note</Text>
              <TouchableOpacity onPress={() => setShowInputModal(false)}>
                <Ionicons name="close-circle" size={26} color="#94A3B8" />
              </TouchableOpacity>
            </View>

            {/* Student selector */}
            <Text style={styles.fieldLabel}>Élève concerné</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.modalScrollRow}>
              {students.map(s => {
                const isSel = selectedStudent?.id === s.id;
                return (
                  <TouchableOpacity
                    key={s.id}
                    style={[styles.modalChip, isSel && styles.modalChipActive]}
                    onPress={() => setSelectedStudent(s)}
                  >
                    <Text style={[styles.modalChipTxt, isSel && styles.modalChipTxtActive]}>
                      {s.first_name} {s.last_name[0]}.
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Subject selector */}
            <Text style={styles.fieldLabel}>Matière</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.modalScrollRow}>
              {subjects.map(s => {
                const isSel = selectedSubject?.id === s.id;
                return (
                  <TouchableOpacity
                    key={s.id}
                    style={[styles.modalChip, isSel && styles.modalChipActive]}
                    onPress={() => setSelectedSubject(s)}
                  >
                    <Text style={[styles.modalChipTxt, isSel && styles.modalChipTxtActive]}>
                      {s.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Score Inputs */}
            <View style={styles.scoreInputRow}>
              <View style={styles.scoreBox}>
                <Text style={styles.fieldLabel}>Note obtenue</Text>
                <TextInput
                  style={styles.scoreInputField}
                  value={gradeValue}
                  onChangeText={setGradeValue}
                  keyboardType="decimal-pad"
                  placeholder="16"
                  placeholderTextColor="#94A3B8"
                />
              </View>

              <Text style={styles.slashDivider}>/</Text>

              <View style={styles.scoreBox}>
                <Text style={styles.fieldLabel}>Bareme Max</Text>
                <TextInput
                  style={styles.scoreInputField}
                  value={maxGrade}
                  onChangeText={setMaxGrade}
                  keyboardType="decimal-pad"
                  placeholder="20"
                  placeholderTextColor="#94A3B8"
                />
              </View>
            </View>

            {/* Modal Actions */}
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.saveSubmitBtn}
                onPress={saveGrade}
                disabled={saving}
                activeOpacity={0.8}
              >
                {saving ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                    <Text style={styles.saveSubmitBtnText}>Valider la Note</Text>
                  </>
                )}
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
  addNoteCardBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#7C3AED',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: Radius.full,
    gap: 4,
  },
  addNoteCardBtnText: { color: '#FFFFFF', fontWeight: '800', fontSize: 13 },
  classBarContainer: { backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  classBarContent: { paddingHorizontal: Spacing.xl, paddingVertical: Spacing.sm },
  classChipCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: Radius.full,
    backgroundColor: '#F1F5F9',
    marginRight: Spacing.sm,
    gap: 6,
  },
  classChipCardActive: { backgroundColor: '#F5F3FF', borderWidth: 1, borderColor: '#DDD6FE' },
  classChipText: { fontSize: 13, color: '#64748B', fontWeight: '600' },
  classChipTextActive: { color: '#7C3AED', fontWeight: '800' },
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
  },
  emptyTitle: { fontSize: 15, fontWeight: '700', color: '#64748B', marginTop: 10 },
  studentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: Radius.xxl,
    padding: Spacing.base,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  studentCardLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: Radius.lg,
    backgroundColor: '#F5F3FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarTxt: { fontSize: 15, fontWeight: '800', color: '#7C3AED' },
  studentTextMeta: { flex: 1 },
  studentName: { fontSize: 15, fontWeight: '800', color: '#0F172A' },
  studentClassMeta: { fontSize: 12, color: '#64748B', marginTop: 2 },
  addActionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.full,
    backgroundColor: '#F5F3FF',
    gap: 4,
  },
  addActionText: { fontSize: 12, fontWeight: '800', color: '#7C3AED' },
  studentListItem: {
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
  listAvatar: { width: 34, height: 34, borderRadius: Radius.md, backgroundColor: '#F5F3FF', alignItems: 'center', justifyContent: 'center' },
  listAvatarTxt: { fontSize: 14, fontWeight: '800', color: '#7C3AED' },
  listStudentName: { flex: 1, fontSize: 14, fontWeight: '700', color: '#0F172A' },
  recentGradeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: Radius.xl,
    padding: Spacing.base,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  recentGradeLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  recentGradeIconBox: { width: 38, height: 38, borderRadius: Radius.lg, backgroundColor: '#F5F3FF', alignItems: 'center', justifyContent: 'center' },
  recentGradeMeta: { flex: 1 },
  recentStudentName: { fontSize: 14, fontWeight: '800', color: '#0F172A' },
  recentSubjectName: { fontSize: 12, color: '#64748B', marginTop: 1 },
  gradePillBadge: { flexDirection: 'row', alignItems: 'baseline', paddingHorizontal: 12, paddingVertical: 6, borderRadius: Radius.lg },
  gradePillValue: { fontSize: 17, fontWeight: '900' },
  gradePillMax: { fontSize: 11, fontWeight: '700', marginLeft: 1 },
  /* Modals */
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: Radius.xxl,
    borderTopRightRadius: Radius.xxl,
    padding: Spacing.xl,
  },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.base },
  modalHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  modalStudentTitle: { fontSize: 18, fontWeight: '800', color: '#0F172A' },
  modalStudentSubtitle: { fontSize: 12, color: '#64748B', marginTop: 2 },
  modalTitle: { fontSize: 20, fontWeight: '800', color: '#0F172A' },
  studentDetailCardRow: { flexDirection: 'row', gap: Spacing.sm, marginVertical: Spacing.base },
  detailMetricCard: { flex: 1, padding: Spacing.base, borderRadius: Radius.xl, alignItems: 'center' },
  detailMetricLabel: { fontSize: 11, fontWeight: '700', color: '#64748B', textTransform: 'uppercase' },
  detailMetricVal: { fontSize: 18, fontWeight: '900', marginTop: 4 },
  detailSectionTitle: { fontSize: 14, fontWeight: '800', color: '#0F172A', marginTop: Spacing.xs, marginBottom: Spacing.xs },
  noGradesTxt: { fontSize: 13, color: '#94A3B8', fontStyle: 'italic', marginVertical: 10 },
  historyRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  historySubject: { fontSize: 14, fontWeight: '600', color: '#0F172A' },
  historyScore: { fontSize: 14, fontWeight: '800', color: '#7C3AED' },
  actionModalAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#7C3AED',
    paddingVertical: 14,
    borderRadius: Radius.xl,
    marginTop: Spacing.base,
    gap: 6,
  },
  actionModalAddBtnTxt: { color: '#FFFFFF', fontWeight: '800', fontSize: 14 },
  fieldLabel: { fontSize: 13, fontWeight: '700', color: '#334155', marginBottom: 8, marginTop: Spacing.xs },
  modalScrollRow: { marginBottom: Spacing.sm },
  modalChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: Radius.full,
    backgroundColor: '#F1F5F9',
    marginRight: Spacing.sm,
  },
  modalChipActive: { backgroundColor: '#7C3AED' },
  modalChipTxt: { fontSize: 13, color: '#64748B', fontWeight: '600' },
  modalChipTxtActive: { color: '#FFFFFF', fontWeight: '700' },
  scoreInputRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.base, marginVertical: Spacing.base },
  scoreBox: { flex: 1 },
  scoreInputField: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: Radius.xl,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 22,
    fontWeight: '900',
    color: '#0F172A',
    textAlign: 'center',
  },
  slashDivider: { fontSize: 32, color: '#CBD5E1', fontWeight: '800', paddingTop: 24 },
  modalActions: { marginTop: Spacing.base },
  saveSubmitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#7C3AED',
    paddingVertical: 16,
    borderRadius: Radius.xl,
    gap: 8,
  },
  saveSubmitBtnText: { color: '#FFFFFF', fontWeight: '800', fontSize: 16 },
});
