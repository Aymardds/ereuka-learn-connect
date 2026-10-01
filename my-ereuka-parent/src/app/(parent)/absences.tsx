import React, { useEffect, useState } from 'react';
import {
  StyleSheet, Text, View, ScrollView, ActivityIndicator,
  StatusBar, RefreshControl, TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../../../lib/supabase';
import { Brand, Radius, Shadows, Spacing } from '@/constants/theme';

interface AttendanceRecord {
  id: string;
  date: string;
  status: 'present' | 'absent' | 'late' | 'excused';
  subject: string;
  student_name: string;
}

const STATUS_CONFIG = {
  present: { label: 'Présent', color: Brand.green, bg: Brand.greenLight, emoji: '✅' },
  absent: { label: 'Absent', color: Brand.red, bg: Brand.redLight, emoji: '❌' },
  late: { label: 'En retard', color: Brand.amber, bg: Brand.amberLight, emoji: '⏰' },
  excused: { label: 'Excusé', color: Brand.violet, bg: Brand.violetLight, emoji: '📋' },
};

export default function ParentAbsences() {
  const insets = useSafeAreaInsets();
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'absent' | 'late'>('all');

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data: children } = await supabase
        .from('students')
        .select('id, first_name, last_name')
        .eq('responsible_id', session.user.id);

      if (!children?.length) { setLoading(false); setRefreshing(false); return; }

      const { data: attData } = await supabase
        .from('attendance_records')
        .select(`
          id, date, status,
          subjects(name),
          students(first_name, last_name)
        `)
        .in('student_id', children.map((c: any) => c.id))
        .order('date', { ascending: false })
        .limit(60);

      setRecords(
        (attData || []).map((a: any) => ({
          id: a.id,
          date: a.date,
          status: a.status,
          subject: a.subjects?.name || 'Cours',
          student_name: `${a.students?.first_name} ${a.students?.last_name}`,
        }))
      );
    } catch (err) { console.error(err); }
    finally { setLoading(false); setRefreshing(false); }
  };

  const onRefresh = () => { setRefreshing(true); loadData(); };

  const filteredRecords = filter === 'all'
    ? records
    : records.filter(r => r.status === filter);

  const absentCount = records.filter(r => r.status === 'absent').length;
  const lateCount = records.filter(r => r.status === 'late').length;

  if (loading) {
    return <View style={styles.centered}><ActivityIndicator color={Brand.blue} size="large" /></View>;
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>📅 Présences & Absences</Text>
      </View>

      {/* Summary pills */}
      <View style={styles.summaryRow}>
        <View style={[styles.summaryPill, { backgroundColor: Brand.redLight }]}>
          <Text style={[styles.summaryNum, { color: Brand.red }]}>{absentCount}</Text>
          <Text style={[styles.summaryLabel, { color: Brand.red }]}>Absences</Text>
        </View>
        <View style={[styles.summaryPill, { backgroundColor: Brand.amberLight }]}>
          <Text style={[styles.summaryNum, { color: Brand.amber }]}>{lateCount}</Text>
          <Text style={[styles.summaryLabel, { color: Brand.amber }]}>Retards</Text>
        </View>
        <View style={[styles.summaryPill, { backgroundColor: Brand.greenLight }]}>
          <Text style={[styles.summaryNum, { color: Brand.green }]}>{records.length - absentCount - lateCount}</Text>
          <Text style={[styles.summaryLabel, { color: Brand.green }]}>Présences</Text>
        </View>
      </View>

      {/* Filter tabs */}
      <View style={styles.filters}>
        {(['all', 'absent', 'late'] as const).map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.filterTab, filter === f && styles.filterTabActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.filterTabText, filter === f && styles.filterTabTextActive]}>
              {f === 'all' ? 'Tout' : f === 'absent' ? 'Absences' : 'Retards'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        contentContainerStyle={{ padding: Spacing.xl, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Brand.blue} />}
      >
        {filteredRecords.length === 0 ? (
          <View style={[styles.emptyCard, Shadows.sm]}>
            <Text style={styles.emptyEmoji}>🎉</Text>
            <Text style={styles.emptyText}>Aucune absence enregistrée !</Text>
          </View>
        ) : (
          filteredRecords.map(record => {
            const cfg = STATUS_CONFIG[record.status] || STATUS_CONFIG.present;
            return (
              <View key={record.id} style={[styles.record, Shadows.sm]}>
                <View style={[styles.statusDot, { backgroundColor: cfg.bg }]}>
                  <Text style={styles.statusEmoji}>{cfg.emoji}</Text>
                </View>
                <View style={styles.recordBody}>
                  <Text style={styles.recordSubject}>{record.subject}</Text>
                  <Text style={styles.recordStudent}>{record.student_name}</Text>
                  <Text style={styles.recordDate}>
                    {new Date(record.date).toLocaleDateString('fr-FR', {
                      weekday: 'long', day: '2-digit', month: 'long',
                    })}
                  </Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: cfg.bg }]}>
                  <Text style={[styles.statusBadgeText, { color: cfg.color }]}>{cfg.label}</Text>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8FAFC' },
  header: {
    backgroundColor: Brand.blue, paddingHorizontal: Spacing.xl, paddingVertical: Spacing.base,
  },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#FFFFFF' },
  summaryRow: {
    flexDirection: 'row', gap: Spacing.sm, padding: Spacing.xl,
    backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E2E8F0',
  },
  summaryPill: {
    flex: 1, borderRadius: Radius.lg, padding: Spacing.sm, alignItems: 'center',
  },
  summaryNum: { fontSize: 22, fontWeight: '800' },
  summaryLabel: { fontSize: 11, fontWeight: '600', marginTop: 2 },
  filters: {
    flexDirection: 'row', backgroundColor: '#FFFFFF', paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.sm, borderBottomWidth: 1, borderBottomColor: '#E2E8F0',
  },
  filterTab: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: Radius.full, marginRight: Spacing.sm },
  filterTabActive: { backgroundColor: Brand.blueLight },
  filterTabText: { fontSize: 13, color: '#64748B', fontWeight: '600' },
  filterTabTextActive: { color: Brand.blue },
  emptyCard: {
    backgroundColor: '#FFFFFF', borderRadius: Radius.xl, padding: Spacing.xxxl,
    alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0',
  },
  emptyEmoji: { fontSize: 48, marginBottom: Spacing.sm },
  emptyText: { fontSize: 15, color: '#64748B', textAlign: 'center' },
  record: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF',
    borderRadius: Radius.xl, padding: Spacing.base, marginBottom: Spacing.sm,
    borderWidth: 1, borderColor: '#E2E8F0',
  },
  statusDot: {
    width: 44, height: 44, borderRadius: Radius.full,
    justifyContent: 'center', alignItems: 'center', marginRight: Spacing.base,
  },
  statusEmoji: { fontSize: 22 },
  recordBody: { flex: 1 },
  recordSubject: { fontSize: 15, fontWeight: '700', color: '#0F172A' },
  recordStudent: { fontSize: 12, color: '#94A3B8', marginTop: 2 },
  recordDate: { fontSize: 12, color: '#64748B', marginTop: 3, textTransform: 'capitalize' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: Radius.full },
  statusBadgeText: { fontSize: 11, fontWeight: '700' },
});
