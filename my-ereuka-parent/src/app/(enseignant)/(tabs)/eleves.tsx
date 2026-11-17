import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  ActivityIndicator,
  StatusBar,
  TouchableOpacity,
  TextInput,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../../../lib/supabase';
import { Brand, Radius, Shadows, Spacing } from '@/constants/theme';
import { AppTopHeader } from '@/components/AppTopHeader';

interface Student {
  id: string;
  first_name: string;
  last_name: string;
  matricule?: string;
  class_name: string;
  status: string;
  absences: number;
  avg_grade: number | null;
}

interface ClassOption {
  id: string;
  name: string;
}

type FilterTag = 'all' | 'warning' | 'top' | 'absent';

export default function EnseignantEleves() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [selectedClass, setSelectedClass] = useState<ClassOption | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterTag>('all');

  useEffect(() => { loadClasses(); }, []);

  const loadClasses = async () => {
    try {
      const { data } = await supabase.from('classes').select('id, name').limit(20);
      const classData = (data || []).map((c: any) => ({ id: c.id, name: c.name }));
      setClasses(classData);
      if (classData.length > 0) loadStudents(classData[0]);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  const loadStudents = async (cls: ClassOption) => {
    setSelectedClass(cls);
    setLoading(true);
    try {
      const { data: studentData } = await supabase
        .from('students')
        .select('id, first_name, last_name, status, classes(name)')
        .eq('class_id', cls.id);

      const fetched = studentData || [];
      const ids = fetched.map((s: any) => s.id);

      // Get absences count
      const { data: attData } = await supabase
        .from('attendance_records')
        .select('student_id')
        .in('student_id', ids)
        .eq('status', 'absent');

      // Get average grades
      const { data: gradeData } = await supabase
        .from('grades')
        .select('student_id, grade, max_grade')
        .in('student_id', ids);

      const absenceMap: Record<string, number> = {};
      (attData || []).forEach((a: any) => {
        absenceMap[a.student_id] = (absenceMap[a.student_id] || 0) + 1;
      });

      const gradeMap: Record<string, number[]> = {};
      (gradeData || []).forEach((g: any) => {
        if (!gradeMap[g.student_id]) gradeMap[g.student_id] = [];
        gradeMap[g.student_id].push((g.grade / (g.max_grade || 20)) * 20);
      });

      setStudents(
        fetched.map((s: any, idx: number) => {
          const grades = gradeMap[s.id];
          const avg = grades && grades.length > 0
            ? grades.reduce((a, b) => a + b, 0) / grades.length
            : null;
          return {
            id: s.id,
            first_name: s.first_name,
            last_name: s.last_name,
            matricule: `EUR-${1000 + idx}`,
            class_name: s.classes?.name || cls.name,
            status: s.status,
            absences: absenceMap[s.id] || 0,
            avg_grade: avg,
          };
        })
      );
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    if (selectedClass) loadStudents(selectedClass);
    else loadClasses();
  };

  // Filter students by search & category tag
  const filtered = students.filter(s => {
    const matchesSearch = `${s.first_name} ${s.last_name} ${s.matricule || ''}`
      .toLowerCase()
      .includes(search.toLowerCase());

    if (!matchesSearch) return false;

    if (activeFilter === 'warning') return s.avg_grade !== null && s.avg_grade < 10;
    if (activeFilter === 'top') return s.avg_grade !== null && s.avg_grade >= 14;
    if (activeFilter === 'absent') return s.absences > 0;
    return true;
  });

  // Class stats
  const validGrades = students.filter(s => s.avg_grade !== null).map(s => s.avg_grade as number);
  const classAvg = validGrades.length > 0 ? (validGrades.reduce((a, b) => a + b, 0) / validGrades.length) : null;
  const totalAbsences = students.reduce((sum, s) => sum + s.absences, 0);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" />

      {/* Top Header */}
      <AppTopHeader
        role="enseignant"
        title="Dossiers Élèves"
        subtitle={`${selectedClass?.name || 'Classes'} • ${students.length} inscrits`}
      />

      {/* Class Selector horizontal list */}
      <View style={styles.classBarWrapper}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.classBar}>
          {classes.map(cls => {
            const isSelected = selectedClass?.id === cls.id;
            return (
              <TouchableOpacity
                key={cls.id}
                style={[styles.classChip, isSelected && styles.classChipActive]}
                onPress={() => loadStudents(cls)}
                activeOpacity={0.8}
              >
                <Text style={[styles.classChipText, isSelected && styles.classChipTextActive]}>
                  {cls.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Quick Class Stats Banner */}
      {students.length > 0 && (
        <View style={styles.summaryBar}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{students.length}</Text>
            <Text style={styles.summaryLabel}>Élèves</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryValue, { color: Brand.violet }]}>
              {classAvg !== null ? classAvg.toFixed(1) : '—'}/20
            </Text>
            <Text style={styles.summaryLabel}>Moyenne Classe</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryValue, { color: totalAbsences > 0 ? Brand.red : Brand.green }]}>
              {totalAbsences}
            </Text>
            <Text style={styles.summaryLabel}>Absences Cumulées</Text>
          </View>
        </View>
      )}

      {/* Search Bar */}
      <View style={styles.searchSection}>
        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={18} color="#94A3B8" />
          <TextInput
            style={styles.searchInput}
            placeholder="Rechercher par nom, prénom ou matricule..."
            placeholderTextColor="#94A3B8"
            value={search}
            onChangeText={setSearch}
          />
          {search ? (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={18} color="#94A3B8" />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Filter tags row */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterTagsRow}>
          {[
            { id: 'all' as const, label: 'Tous', icon: 'people-outline' },
            { id: 'top' as const, label: 'Excellents (≥14)', icon: 'trophy-outline' },
            { id: 'warning' as const, label: 'En soutien (<10)', icon: 'alert-circle-outline' },
            { id: 'absent' as const, label: 'Absents récents', icon: 'calendar-outline' },
          ].map(tag => {
            const isTagActive = activeFilter === tag.id;
            return (
              <TouchableOpacity
                key={tag.id}
                style={[styles.filterTagChip, isTagActive && styles.filterTagChipActive]}
                onPress={() => setActiveFilter(tag.id)}
              >
                <Ionicons
                  name={tag.icon as any}
                  size={13}
                  color={isTagActive ? '#FFFFFF' : '#64748B'}
                />
                <Text style={[styles.filterTagTxt, isTagActive && styles.filterTagTxtActive]}>
                  {tag.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Students List */}
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={Brand.violet} size="large" />
          <Text style={{ color: '#64748B', fontSize: 13, marginTop: 8 }}>Chargement des dossiers...</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: Spacing.base, paddingBottom: 110 }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Brand.violet} />}
        >
          {filtered.length === 0 ? (
            <View style={[styles.emptyCard, Shadows.sm]}>
              <Ionicons name="people-outline" size={48} color="#CBD5E1" />
              <Text style={styles.emptyTitle}>Aucun élève trouvé</Text>
              <Text style={styles.emptyText}>Aucun dossier ne correspond à vos critères de recherche.</Text>
            </View>
          ) : (
            filtered.map((student) => {
              const avgColor =
                student.avg_grade !== null
                  ? student.avg_grade >= 14 ? Brand.green
                  : student.avg_grade >= 10 ? Brand.blue
                  : Brand.red
                  : '#94A3B8';

              return (
                <TouchableOpacity
                  key={student.id}
                  style={[styles.studentCard, Shadows.sm]}
                  onPress={() => router.push(`/(enseignant)/eleve/${student.id}` as any)}
                  activeOpacity={0.75}
                >
                  <View style={[styles.avatar, { backgroundColor: Brand.violetLight }]}>
                    <Text style={[styles.avatarText, { color: Brand.violet }]}>
                      {student.first_name[0]}{student.last_name[0]}
                    </Text>
                  </View>

                  <View style={styles.studentInfo}>
                    <View style={styles.nameRow}>
                      <Text style={styles.studentName}>
                        {student.first_name} {student.last_name}
                      </Text>
                    </View>
                    <Text style={styles.studentMeta}>
                      📚 {student.class_name} • Matricule {student.matricule || 'EUR-2026'}
                    </Text>

                    <View style={styles.studentStats}>
                      <View style={[styles.miniStat, { backgroundColor: Brand.redLight }]}>
                        <Ionicons name="close-circle-outline" size={11} color={Brand.red} />
                        <Text style={[styles.miniStatVal, { color: Brand.red }]}>{student.absences}</Text>
                        <Text style={[styles.miniStatLabel, { color: Brand.red }]}>abs.</Text>
                      </View>

                      <View style={[styles.miniStat, { backgroundColor: `${avgColor}18` }]}>
                        <Ionicons name="star-outline" size={11} color={avgColor} />
                        <Text style={[styles.miniStatVal, { color: avgColor }]}>
                          {student.avg_grade !== null ? student.avg_grade.toFixed(1) : '—'}
                        </Text>
                        <Text style={[styles.miniStatLabel, { color: avgColor }]}>/20</Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.cardRightCol}>
                    <View style={[styles.dossierPill, { backgroundColor: `${Brand.violet}12` }]}>
                      <Text style={[styles.dossierPillTxt, { color: Brand.violet }]}>Dossier</Text>
                      <Ionicons name="chevron-forward" size={13} color={Brand.violet} />
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  classBarWrapper: { backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  classBar: { paddingHorizontal: Spacing.base, paddingVertical: 10 },
  classChip: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: Radius.full,
    backgroundColor: '#F1F5F9',
    marginRight: Spacing.sm,
  },
  classChipActive: { backgroundColor: Brand.violet },
  classChipText: { fontSize: 13, color: '#64748B', fontWeight: '700' },
  classChipTextActive: { color: '#FFFFFF' },
  summaryBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 10,
    paddingHorizontal: Spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  summaryItem: { flex: 1, alignItems: 'center' },
  summaryValue: { fontSize: 16, fontWeight: '900', color: '#0F172A' },
  summaryLabel: { fontSize: 10, fontWeight: '600', color: '#64748B', marginTop: 1 },
  summaryDivider: { width: 1, height: 24, backgroundColor: '#E2E8F0' },
  searchSection: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: Spacing.base,
    paddingTop: 10,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: Radius.lg,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 8,
  },
  searchInput: { flex: 1, paddingVertical: 9, fontSize: 13, color: '#0F172A' },
  filterTagsRow: { marginTop: 8, marginBottom: 2 },
  filterTagChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radius.full,
    backgroundColor: '#F1F5F9',
    marginRight: 6,
    gap: 4,
  },
  filterTagChipActive: { backgroundColor: Brand.violet },
  filterTagTxt: { fontSize: 11, color: '#475569', fontWeight: '600' },
  filterTagTxtActive: { color: '#FFFFFF', fontWeight: '800' },
  studentCard: {
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
    width: 46,
    height: 46,
    borderRadius: 23,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.sm,
  },
  avatarText: { fontSize: 15, fontWeight: '900' },
  studentInfo: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  studentName: { fontSize: 15, fontWeight: '800', color: '#0F172A' },
  studentMeta: { fontSize: 11, color: '#64748B', marginTop: 2 },
  studentStats: { flexDirection: 'row', gap: Spacing.sm, marginTop: 6 },
  miniStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.full,
  },
  miniStatVal: { fontSize: 11, fontWeight: '800' },
  miniStatLabel: { fontSize: 10, fontWeight: '600' },
  cardRightCol: { alignItems: 'flex-end', marginLeft: 6 },
  dossierPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: Radius.md,
    gap: 2,
  },
  dossierPillTxt: { fontSize: 11, fontWeight: '800' },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: Radius.xl,
    padding: Spacing.xxxl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: 20,
    gap: 8,
  },
  emptyTitle: { fontSize: 16, fontWeight: '800', color: '#0F172A' },
  emptyText: { fontSize: 13, color: '#64748B', textAlign: 'center' },
});
