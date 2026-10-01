import React, { useEffect, useState } from 'react';
import {
  StyleSheet, Text, View, ScrollView, ActivityIndicator,
  StatusBar, TouchableOpacity, TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../../../lib/supabase';
import { Brand, Radius, Shadows, Spacing } from '@/constants/theme';

interface Student {
  id: string;
  first_name: string;
  last_name: string;
  class_name: string;
  status: string;
  absences: number;
  avg_grade: number | null;
}

interface ClassOption { id: string; name: string; }

export default function EnseignantEleves() {
  const insets = useSafeAreaInsets();
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [selectedClass, setSelectedClass] = useState<ClassOption | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => { loadClasses(); }, []);

  const loadClasses = async () => {
    const { data } = await supabase.from('classes').select('id, name').limit(20);
    const classData = (data || []).map((c: any) => ({ id: c.id, name: c.name }));
    setClasses(classData);
    if (classData.length > 0) loadStudents(classData[0]);
  };

  const loadStudents = async (cls: ClassOption) => {
    setSelectedClass(cls);
    setLoading(true);
    try {
      const { data: studentData } = await supabase
        .from('students')
        .select('id, first_name, last_name, status, classes(name)')
        .eq('class_id', cls.id);

      const students = studentData || [];
      const ids = students.map((s: any) => s.id);

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
        students.map((s: any) => {
          const grades = gradeMap[s.id];
          const avg = grades && grades.length > 0
            ? grades.reduce((a, b) => a + b, 0) / grades.length
            : null;
          return {
            id: s.id,
            first_name: s.first_name,
            last_name: s.last_name,
            class_name: s.classes?.name || cls.name,
            status: s.status,
            absences: absenceMap[s.id] || 0,
            avg_grade: avg,
          };
        })
      );
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const filtered = students.filter(s =>
    `${s.first_name} ${s.last_name}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>👤 Mes Élèves</Text>
        <Text style={styles.headerCount}>{filtered.length} élève{filtered.length !== 1 ? 's' : ''}</Text>
      </View>

      {/* Class selector */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.classBar}>
        {classes.map(cls => (
          <TouchableOpacity
            key={cls.id}
            style={[styles.classChip, selectedClass?.id === cls.id && styles.classChipActive]}
            onPress={() => loadStudents(cls)}
          >
            <Text style={[styles.classChipText, selectedClass?.id === cls.id && styles.classChipTextActive]}>
              {cls.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Search */}
      <View style={styles.searchBar}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Rechercher un élève..."
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {loading ? (
        <View style={styles.centered}><ActivityIndicator color={Brand.violet} size="large" /></View>
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: Spacing.base, paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
        >
          {filtered.length === 0 ? (
            <View style={[styles.emptyCard, Shadows.sm]}>
              <Text style={styles.emptyEmoji}>👥</Text>
              <Text style={styles.emptyText}>Aucun élève trouvé.</Text>
            </View>
          ) : (
            filtered.map(student => {
              const avgColor = student.avg_grade !== null
                ? student.avg_grade >= 16 ? Brand.green
                : student.avg_grade >= 12 ? Brand.blue
                : student.avg_grade >= 10 ? Brand.amber
                : Brand.red
                : '#94A3B8';

              return (
                <View key={student.id} style={[styles.studentCard, Shadows.sm]}>
                  <View style={[styles.avatar, { backgroundColor: Brand.violetLight }]}>
                    <Text style={[styles.avatarText, { color: Brand.violet }]}>
                      {student.first_name[0]}{student.last_name[0]}
                    </Text>
                  </View>
                  <View style={styles.studentInfo}>
                    <Text style={styles.studentName}>{student.first_name} {student.last_name}</Text>
                    <Text style={styles.studentClass}>📚 {student.class_name}</Text>
                    <View style={styles.studentStats}>
                      <View style={[styles.miniStat, { backgroundColor: Brand.redLight }]}>
                        <Text style={[styles.miniStatVal, { color: Brand.red }]}>{student.absences}</Text>
                        <Text style={[styles.miniStatLabel, { color: Brand.red }]}>abs.</Text>
                      </View>
                      <View style={[styles.miniStat, { backgroundColor: avgColor + '20' }]}>
                        <Text style={[styles.miniStatVal, { color: avgColor }]}>
                          {student.avg_grade !== null ? student.avg_grade.toFixed(1) : '—'}
                        </Text>
                        <Text style={[styles.miniStatLabel, { color: avgColor }]}>moy.</Text>
                      </View>
                    </View>
                  </View>
                  <View style={[
                    styles.statusDot,
                    { backgroundColor: student.status === 'active' ? Brand.greenLight : Brand.amberLight }
                  ]}>
                    <Text style={{ fontSize: 10, color: student.status === 'active' ? Brand.green : Brand.amber, fontWeight: '700' }}>
                      {student.status === 'active' ? 'Actif' : 'Attente'}
                    </Text>
                  </View>
                </View>
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
  header: {
    backgroundColor: Brand.violet, paddingHorizontal: Spacing.xl, paddingVertical: Spacing.base,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#FFFFFF' },
  headerCount: { fontSize: 13, color: 'rgba(255,255,255,0.7)' },
  classBar: { backgroundColor: '#FFFFFF', paddingHorizontal: Spacing.base, paddingVertical: Spacing.sm, borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  classChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: Radius.full, backgroundColor: '#F1F5F9', marginRight: Spacing.sm },
  classChipActive: { backgroundColor: Brand.violetLight },
  classChipText: { fontSize: 13, color: '#64748B', fontWeight: '600' },
  classChipTextActive: { color: Brand.violet },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF',
    paddingHorizontal: Spacing.base, paddingVertical: Spacing.sm,
    borderBottomWidth: 1, borderBottomColor: '#E2E8F0',
  },
  searchIcon: { fontSize: 16, marginRight: Spacing.sm },
  searchInput: { flex: 1, fontSize: 14, color: '#0F172A' },
  emptyCard: {
    backgroundColor: '#FFFFFF', borderRadius: Radius.xl, padding: Spacing.xxxl,
    alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0',
  },
  emptyEmoji: { fontSize: 40, marginBottom: Spacing.sm },
  emptyText: { fontSize: 15, color: '#64748B', textAlign: 'center' },
  studentCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF',
    borderRadius: Radius.xl, padding: Spacing.base, marginBottom: Spacing.sm,
    borderWidth: 1, borderColor: '#E2E8F0',
  },
  avatar: { width: 46, height: 46, borderRadius: Radius.full, justifyContent: 'center', alignItems: 'center', marginRight: Spacing.sm },
  avatarText: { fontSize: 15, fontWeight: '800' },
  studentInfo: { flex: 1 },
  studentName: { fontSize: 15, fontWeight: '700', color: '#0F172A' },
  studentClass: { fontSize: 12, color: '#64748B', marginTop: 2 },
  studentStats: { flexDirection: 'row', gap: Spacing.sm, marginTop: 6 },
  miniStat: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.full },
  miniStatVal: { fontSize: 12, fontWeight: '800' },
  miniStatLabel: { fontSize: 10, fontWeight: '600' },
  statusDot: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: Radius.full },
});
