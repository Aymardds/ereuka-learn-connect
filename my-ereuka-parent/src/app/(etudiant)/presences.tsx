import React, { useEffect, useState } from 'react';
import {
  StyleSheet, Text, View, ScrollView, ActivityIndicator,
  StatusBar, RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../../../lib/supabase';
import { Brand, Radius, Shadows, Spacing } from '@/constants/theme';

interface AttendanceRecord {
  id: string;
  date: string;
  status: 'present' | 'absent' | 'late' | 'excused';
  subject: string;
}

const STATUS_CFG = {
  present: { label: 'Présent', color: Brand.green, bg: Brand.greenLight, emoji: '✅' },
  absent: { label: 'Absent', color: Brand.red, bg: Brand.redLight, emoji: '❌' },
  late: { label: 'En retard', color: Brand.amber, bg: Brand.amberLight, emoji: '⏰' },
  excused: { label: 'Excusé', color: Brand.violet, bg: Brand.violetLight, emoji: '📋' },
};

export default function EtudiantPresences() {
  const insets = useSafeAreaInsets();
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({ present: 0, absent: 0, late: 0, excused: 0 });

  useEffect(() => { loadRecords(); }, []);

  const loadRecords = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data: studentData } = await supabase
        .from('students')
        .select('id')
        .eq('user_id', session.user.id)
        .single();

      if (!studentData) return;

      const { data: attData } = await supabase
        .from('attendance_records')
        .select('id, date, status, subjects(name)')
        .eq('student_id', studentData.id)
        .order('date', { ascending: false })
        .limit(60);

      const recs: AttendanceRecord[] = (attData || []).map((a: any) => ({
        id: a.id,
        date: a.date,
        status: a.status,
        subject: a.subjects?.name || 'Cours',
      }));

      setRecords(recs);

      // Stats
      const s = { present: 0, absent: 0, late: 0, excused: 0 };
      recs.forEach(r => { s[r.status] = (s[r.status] || 0) + 1; });
      setStats(s);
    } catch (err) { console.error(err); }
    finally { setLoading(false); setRefreshing(false); }
  };

  const onRefresh = () => { setRefreshing(true); loadRecords(); };

  const total = records.length;
  const presenceRate = total > 0 ? Math.round((stats.present / total) * 100) : 100;

  if (loading) {
    return <View style={styles.centered}><ActivityIndicator color={Brand.green} size="large" /></View>;
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>📋 Mes Présences</Text>
        <View style={[styles.rateBadge, { backgroundColor: presenceRate >= 90 ? Brand.greenLight : presenceRate >= 75 ? Brand.amberLight : Brand.redLight }]}>
          <Text style={[styles.rateText, { color: presenceRate >= 90 ? Brand.green : presenceRate >= 75 ? Brand.amber : Brand.red }]}>
            {presenceRate}% présent
          </Text>
        </View>
      </View>

      {/* Summary stats */}
      <View style={styles.summaryGrid}>
        {(Object.keys(STATUS_CFG) as Array<keyof typeof STATUS_CFG>).map(key => {
          const cfg = STATUS_CFG[key];
          return (
            <View key={key} style={[styles.summaryCard, { backgroundColor: cfg.bg }]}>
              <Text style={styles.summaryEmoji}>{cfg.emoji}</Text>
              <Text style={[styles.summaryNum, { color: cfg.color }]}>{stats[key]}</Text>
              <Text style={[styles.summaryLabel, { color: cfg.color }]}>{cfg.label}</Text>
            </View>
          );
        })}
      </View>

      {/* Presence rate bar */}
      <View style={styles.rateBar}>
        <View style={styles.rateBarBg}>
          <View style={[styles.rateBarFill, {
            width: `${presenceRate}%` as any,
            backgroundColor: presenceRate >= 90 ? Brand.green : presenceRate >= 75 ? Brand.amber : Brand.red,
          }]} />
        </View>
        <Text style={styles.rateBarLabel}>Taux de présence : {presenceRate}%</Text>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: Spacing.xl, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Brand.green} />}
      >
        {records.length === 0 ? (
          <View style={[styles.emptyCard, Shadows.sm]}>
            <Text style={styles.emptyEmoji}>📋</Text>
            <Text style={styles.emptyText}>Aucun enregistrement de présence.</Text>
          </View>
        ) : (
          records.map(r => {
            const cfg = STATUS_CFG[r.status] || STATUS_CFG.present;
            return (
              <View key={r.id} style={[styles.record, Shadows.sm]}>
                <View style={[styles.recordIcon, { backgroundColor: cfg.bg }]}>
                  <Text style={styles.recordEmoji}>{cfg.emoji}</Text>
                </View>
                <View style={styles.recordBody}>
                  <Text style={styles.recordSubject}>{r.subject}</Text>
                  <Text style={styles.recordDate}>
                    {new Date(r.date).toLocaleDateString('fr-FR', {
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
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    backgroundColor: Brand.green, paddingHorizontal: Spacing.xl, paddingVertical: Spacing.base,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#FFFFFF' },
  rateBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: Radius.full },
  rateText: { fontSize: 12, fontWeight: '800' },
  summaryGrid: {
    flexDirection: 'row', gap: Spacing.xs, padding: Spacing.base,
    backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E2E8F0',
  },
  summaryCard: { flex: 1, borderRadius: Radius.md, padding: Spacing.xs, alignItems: 'center' },
  summaryEmoji: { fontSize: 18 },
  summaryNum: { fontSize: 18, fontWeight: '800' },
  summaryLabel: { fontSize: 9, fontWeight: '700', textAlign: 'center' },
  rateBar: {
    backgroundColor: '#FFFFFF', paddingHorizontal: Spacing.xl, paddingVertical: Spacing.sm,
    borderBottomWidth: 1, borderBottomColor: '#E2E8F0',
  },
  rateBarBg: { height: 8, backgroundColor: '#F1F5F9', borderRadius: Radius.full, marginBottom: 6 },
  rateBarFill: { height: 8, borderRadius: Radius.full },
  rateBarLabel: { fontSize: 12, color: '#64748B', fontWeight: '600' },
  emptyCard: {
    backgroundColor: '#FFFFFF', borderRadius: Radius.xl, padding: Spacing.xxxl,
    alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0',
  },
  emptyEmoji: { fontSize: 40, marginBottom: Spacing.sm },
  emptyText: { fontSize: 15, color: '#64748B', textAlign: 'center' },
  record: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF',
    borderRadius: Radius.xl, padding: Spacing.base, marginBottom: Spacing.sm,
    borderWidth: 1, borderColor: '#E2E8F0',
  },
  recordIcon: { width: 44, height: 44, borderRadius: Radius.full, justifyContent: 'center', alignItems: 'center', marginRight: Spacing.base },
  recordEmoji: { fontSize: 22 },
  recordBody: { flex: 1 },
  recordSubject: { fontSize: 15, fontWeight: '700', color: '#0F172A' },
  recordDate: { fontSize: 12, color: '#64748B', marginTop: 3, textTransform: 'capitalize' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: Radius.full },
  statusBadgeText: { fontSize: 11, fontWeight: '700' },
});
