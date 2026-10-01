import React, { useEffect, useState } from 'react';
import {
  StyleSheet, Text, View, ScrollView, ActivityIndicator,
  StatusBar, TouchableOpacity, Alert, Switch,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../../../lib/supabase';
import { Brand, Radius, Shadows, Spacing } from '@/constants/theme';

interface Student {
  id: string;
  first_name: string;
  last_name: string;
  status: 'present' | 'absent' | 'late' | null;
}

interface ClassOption {
  id: string;
  name: string;
}

export default function EnseignantPresences() {
  const insets = useSafeAreaInsets();
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [selectedClass, setSelectedClass] = useState<ClassOption | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [date] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => { loadClasses(); }, []);

  const loadClasses = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // Try to get classes by teacher
      const { data: teacherClasses } = await supabase
        .from('class_teachers')
        .select('classes(id, name)')
        .eq('user_id', session.user.id);

      let classData: ClassOption[] = [];
      if (teacherClasses && teacherClasses.length > 0) {
        classData = teacherClasses
          .map((tc: any) => tc.classes)
          .filter(Boolean)
          .map((c: any) => ({ id: c.id, name: c.name }));
      } else {
        const { data } = await supabase.from('classes').select('id, name').limit(20);
        classData = (data || []).map((c: any) => ({ id: c.id, name: c.name }));
      }

      setClasses(classData);
      if (classData.length > 0) loadStudents(classData[0]);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const loadStudents = async (cls: ClassOption) => {
    setSelectedClass(cls);
    setLoading(true);
    try {
      const { data: studentData } = await supabase
        .from('students')
        .select('id, first_name, last_name')
        .eq('class_id', cls.id)
        .eq('status', 'active');

      // Load today's attendance
      const studentIds = (studentData || []).map((s: any) => s.id);
      const { data: attData } = await supabase
        .from('attendance_records')
        .select('student_id, status')
        .in('student_id', studentIds)
        .eq('date', date);

      const attMap: Record<string, string> = {};
      (attData || []).forEach((a: any) => { attMap[a.student_id] = a.status; });

      setStudents(
        (studentData || []).map((s: any) => ({
          id: s.id,
          first_name: s.first_name,
          last_name: s.last_name,
          status: (attMap[s.id] as Student['status']) || null,
        }))
      );
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const setStudentStatus = (studentId: string, status: Student['status']) => {
    setStudents(prev =>
      prev.map(s => s.id === studentId ? { ...s, status } : s)
    );
  };

  const saveAttendance = async () => {
    setSaving(true);
    try {
      const toSave = students.map(s => ({
        student_id: s.id,
        class_id: selectedClass?.id,
        date,
        status: s.status || 'present',
      }));

      const { error } = await supabase
        .from('attendance_records')
        .upsert(toSave, { onConflict: 'student_id,date' });

      if (error) throw error;
      Alert.alert('✅ Enregistré', 'Les présences ont été sauvegardées avec succès.');
    } catch (err: any) {
      Alert.alert('Erreur', err.message || 'Impossible de sauvegarder les présences.');
    } finally {
      setSaving(false);
    }
  };

  const presentCount = students.filter(s => s.status === 'present' || s.status === null).length;
  const absentCount = students.filter(s => s.status === 'absent').length;
  const lateCount = students.filter(s => s.status === 'late').length;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>📋 Saisie des Présences</Text>
        <Text style={styles.headerDate}>
          {new Date(date).toLocaleDateString('fr-FR', { weekday: 'long', day: '2-digit', month: 'long' })}
        </Text>
      </View>

      {/* Class selector */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.classSelector}>
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

      {/* Quick stats */}
      {students.length > 0 && (
        <View style={styles.quickStats}>
          <View style={[styles.qStat, { backgroundColor: Brand.greenLight }]}>
            <Text style={[styles.qStatNum, { color: Brand.green }]}>{presentCount}</Text>
            <Text style={[styles.qStatLabel, { color: Brand.green }]}>Présents</Text>
          </View>
          <View style={[styles.qStat, { backgroundColor: Brand.redLight }]}>
            <Text style={[styles.qStatNum, { color: Brand.red }]}>{absentCount}</Text>
            <Text style={[styles.qStatLabel, { color: Brand.red }]}>Absents</Text>
          </View>
          <View style={[styles.qStat, { backgroundColor: Brand.amberLight }]}>
            <Text style={[styles.qStatNum, { color: Brand.amber }]}>{lateCount}</Text>
            <Text style={[styles.qStatLabel, { color: Brand.amber }]}>Retards</Text>
          </View>
        </View>
      )}

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={Brand.violet} size="large" />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: Spacing.base, paddingBottom: 120 }}
          showsVerticalScrollIndicator={false}
        >
          {students.length === 0 ? (
            <View style={[styles.emptyCard, Shadows.sm]}>
              <Text style={styles.emptyEmoji}>👥</Text>
              <Text style={styles.emptyText}>Aucun élève dans cette classe.</Text>
            </View>
          ) : (
            students.map(student => (
              <View key={student.id} style={[styles.studentRow, Shadows.sm]}>
                <View style={[styles.avatar, {
                  backgroundColor: student.status === 'absent' ? Brand.redLight
                    : student.status === 'late' ? Brand.amberLight : Brand.violetLight
                }]}>
                  <Text style={[styles.avatarText, {
                    color: student.status === 'absent' ? Brand.red
                      : student.status === 'late' ? Brand.amber : Brand.violet
                  }]}>
                    {student.first_name[0]}{student.last_name[0]}
                  </Text>
                </View>
                <Text style={styles.studentName}>
                  {student.first_name} {student.last_name}
                </Text>
                <View style={styles.statusBtns}>
                  {(['present', 'late', 'absent'] as const).map(s => (
                    <TouchableOpacity
                      key={s}
                      style={[
                        styles.statusBtn,
                        student.status === s && {
                          backgroundColor: ACTIVE_COLORS[s].bg,
                          borderColor: ACTIVE_COLORS[s].border,
                        },
                      ]}
                      onPress={() => setStudentStatus(student.id, s)}
                    >
                      <Text style={styles.statusBtnEmoji}>
                        {s === 'present' ? '✅' : s === 'late' ? '⏰' : '❌'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            ))
          )}
        </ScrollView>
      )}

      {/* Save button */}
      {students.length > 0 && (
        <View style={[styles.saveBar, { paddingBottom: insets.bottom + 8 }]}>
          <TouchableOpacity
            style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
            onPress={saveAttendance}
            disabled={saving}
          >
            {saving
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.saveBtnText}>💾 Sauvegarder les présences ({students.length} élèves)</Text>
            }
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const ACTIVE_COLORS = {
  present: { bg: Brand.greenLight, border: Brand.green },
  late: { bg: Brand.amberLight, border: Brand.amber },
  absent: { bg: Brand.redLight, border: Brand.red },
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: Spacing.xxxl },
  header: { backgroundColor: Brand.violet, paddingHorizontal: Spacing.xl, paddingVertical: Spacing.base },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#FFFFFF' },
  headerDate: { fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 2, textTransform: 'capitalize' },
  classSelector: {
    backgroundColor: '#FFFFFF', paddingHorizontal: Spacing.base, paddingVertical: Spacing.sm,
    borderBottomWidth: 1, borderBottomColor: '#E2E8F0',
  },
  classChip: {
    paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: Radius.full, backgroundColor: '#F1F5F9', marginRight: Spacing.sm,
  },
  classChipActive: { backgroundColor: Brand.violetLight },
  classChipText: { fontSize: 13, color: '#64748B', fontWeight: '600' },
  classChipTextActive: { color: Brand.violet },
  quickStats: {
    flexDirection: 'row', gap: Spacing.sm, padding: Spacing.base,
    backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E2E8F0',
  },
  qStat: { flex: 1, borderRadius: Radius.md, padding: Spacing.sm, alignItems: 'center' },
  qStatNum: { fontSize: 20, fontWeight: '800' },
  qStatLabel: { fontSize: 11, fontWeight: '600' },
  emptyCard: {
    backgroundColor: '#FFFFFF', borderRadius: Radius.xl, padding: Spacing.xxxl,
    alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0',
  },
  emptyEmoji: { fontSize: 40, marginBottom: Spacing.sm },
  emptyText: { fontSize: 15, color: '#64748B', textAlign: 'center' },
  studentRow: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF',
    borderRadius: Radius.lg, padding: Spacing.sm, marginBottom: Spacing.xs,
    borderWidth: 1, borderColor: '#E2E8F0',
  },
  avatar: {
    width: 40, height: 40, borderRadius: Radius.full,
    justifyContent: 'center', alignItems: 'center', marginRight: Spacing.sm,
  },
  avatarText: { fontSize: 14, fontWeight: '800' },
  studentName: { flex: 1, fontSize: 14, fontWeight: '600', color: '#0F172A' },
  statusBtns: { flexDirection: 'row', gap: 6 },
  statusBtn: {
    width: 36, height: 36, borderRadius: Radius.full,
    backgroundColor: '#F8FAFC', justifyContent: 'center', alignItems: 'center',
    borderWidth: 1.5, borderColor: '#E2E8F0',
  },
  statusBtnEmoji: { fontSize: 16 },

  saveBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#FFFFFF', padding: Spacing.base,
    borderTopWidth: 1, borderTopColor: '#E2E8F0',
  },
  saveBtn: {
    backgroundColor: Brand.violet, paddingVertical: 14,
    borderRadius: Radius.lg, alignItems: 'center',
    ...Shadows.colored(Brand.violet),
  },
  saveBtnDisabled: { backgroundColor: '#CBD5E1' },
  saveBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 15 },
});
