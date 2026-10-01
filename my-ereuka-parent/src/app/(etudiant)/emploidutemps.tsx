import React, { useEffect, useState } from 'react';
import {
  StyleSheet, Text, View, ScrollView, ActivityIndicator,
  StatusBar, RefreshControl, TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../../../lib/supabase';
import { Brand, Radius, Shadows, Spacing } from '@/constants/theme';

// Days of week in French
const JOURS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
const JOURS_SHORT = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];

interface TimeSlot {
  id: string;
  subject: string;
  teacher: string;
  day: number; // 0=Monday
  start_time: string;
  end_time: string;
  room: string;
}

const COLORS = [Brand.blue, Brand.violet, Brand.green, Brand.amber, Brand.rose, '#0EA5E9', '#8B5CF6'];

export default function EtudiantEmploiDuTemps() {
  const insets = useSafeAreaInsets();
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDay, setSelectedDay] = useState(new Date().getDay() === 0 ? 0 : (new Date().getDay() - 1));

  useEffect(() => { loadTimetable(); }, []);

  const loadTimetable = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data: studentData } = await supabase
        .from('students')
        .select('id, class_id')
        .eq('user_id', session.user.id)
        .single();

      if (!studentData?.class_id) { setLoading(false); setRefreshing(false); return; }

      const { data: timetableData } = await supabase
        .from('timetable_slots')
        .select(`
          id, day_of_week, start_time, end_time, room,
          subjects(name),
          profiles:teacher_id(full_name)
        `)
        .eq('class_id', studentData.class_id)
        .order('day_of_week', { ascending: true })
        .order('start_time', { ascending: true });

      setSlots(
        (timetableData || []).map((slot: any) => ({
          id: slot.id,
          subject: slot.subjects?.name || 'Cours',
          teacher: slot.profiles?.full_name || 'Enseignant',
          day: slot.day_of_week || 0,
          start_time: slot.start_time || '08:00',
          end_time: slot.end_time || '09:00',
          room: slot.room || '',
        }))
      );
    } catch (err) { console.error(err); }
    finally { setLoading(false); setRefreshing(false); }
  };

  const onRefresh = () => { setRefreshing(true); loadTimetable(); };

  const daySlots = slots.filter(s => s.day === selectedDay);
  const todaySlots = slots.filter(s => s.day === new Date().getDay() - 1);

  const subjectColorMap: Record<string, string> = {};
  let colorIndex = 0;
  slots.forEach(s => {
    if (!subjectColorMap[s.subject]) {
      subjectColorMap[s.subject] = COLORS[colorIndex % COLORS.length];
      colorIndex++;
    }
  });

  if (loading) {
    return <View style={styles.centered}><ActivityIndicator color={Brand.green} size="large" /></View>;
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>📆 Emploi du Temps</Text>
        {todaySlots.length > 0 && (
          <View style={styles.todayBadge}>
            <Text style={styles.todayBadgeText}>{todaySlots.length} cours aujourd'hui</Text>
          </View>
        )}
      </View>

      {/* Day selector */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.daySelector}>
        {JOURS_SHORT.map((j, i) => {
          const hasSlots = slots.some(s => s.day === i);
          const isToday = i === new Date().getDay() - 1;
          return (
            <TouchableOpacity
              key={j}
              style={[
                styles.dayChip,
                selectedDay === i && styles.dayChipActive,
                isToday && selectedDay !== i && styles.dayChipToday,
              ]}
              onPress={() => setSelectedDay(i)}
            >
              <Text style={[styles.dayChipText, selectedDay === i && styles.dayChipTextActive]}>
                {j}
              </Text>
              {hasSlots && <View style={[styles.daydot, { backgroundColor: selectedDay === i ? '#fff' : Brand.green }]} />}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <ScrollView
        contentContainerStyle={{ padding: Spacing.xl, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Brand.green} />}
      >
        <Text style={styles.dayTitle}>{JOURS[selectedDay]}</Text>

        {daySlots.length === 0 ? (
          <View style={[styles.emptyCard, Shadows.sm]}>
            <Text style={styles.emptyEmoji}>😌</Text>
            <Text style={styles.emptyText}>Pas de cours ce jour-là !</Text>
            <Text style={styles.emptyHint}>Profitez bien de votre journée libre.</Text>
          </View>
        ) : (
          daySlots.map(slot => {
            const color = subjectColorMap[slot.subject] || Brand.blue;
            return (
              <View key={slot.id} style={[styles.slotCard, Shadows.sm, { borderLeftColor: color }]}>
                <View style={styles.slotTime}>
                  <Text style={[styles.slotTimeText, { color }]}>{slot.start_time.slice(0, 5)}</Text>
                  <View style={[styles.slotTimeLine, { backgroundColor: color + '40' }]} />
                  <Text style={[styles.slotTimeText, { color, opacity: 0.6 }]}>{slot.end_time.slice(0, 5)}</Text>
                </View>
                <View style={styles.slotBody}>
                  <View style={[styles.slotColorDot, { backgroundColor: color }]} />
                  <View style={styles.slotInfo}>
                    <Text style={styles.slotSubject}>{slot.subject}</Text>
                    <Text style={styles.slotTeacher}>👩‍🏫 {slot.teacher}</Text>
                    {slot.room && <Text style={styles.slotRoom}>🏫 Salle {slot.room}</Text>}
                  </View>
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
  todayBadge: {
    backgroundColor: 'rgba(255,255,255,0.25)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.full,
  },
  todayBadgeText: { fontSize: 11, color: '#FFFFFF', fontWeight: '700' },
  daySelector: {
    backgroundColor: '#FFFFFF', paddingHorizontal: Spacing.base, paddingVertical: Spacing.sm,
    borderBottomWidth: 1, borderBottomColor: '#E2E8F0',
  },
  dayChip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: Radius.full,
    backgroundColor: '#F1F5F9', marginRight: Spacing.sm, alignItems: 'center',
  },
  dayChipActive: { backgroundColor: Brand.green },
  dayChipToday: { borderWidth: 2, borderColor: Brand.green },
  dayChipText: { fontSize: 13, color: '#64748B', fontWeight: '700' },
  dayChipTextActive: { color: '#FFFFFF' },
  daydot: { width: 4, height: 4, borderRadius: 2, marginTop: 3 },
  dayTitle: { fontSize: 22, fontWeight: '800', color: '#0F172A', marginBottom: Spacing.base },
  emptyCard: {
    backgroundColor: '#FFFFFF', borderRadius: Radius.xl, padding: Spacing.xxxl,
    alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0',
  },
  emptyEmoji: { fontSize: 48, marginBottom: Spacing.sm },
  emptyText: { fontSize: 16, fontWeight: '700', color: '#334155', textAlign: 'center' },
  emptyHint: { fontSize: 13, color: '#94A3B8', textAlign: 'center', marginTop: 6 },
  slotCard: {
    flexDirection: 'row', backgroundColor: '#FFFFFF', borderRadius: Radius.xl,
    padding: Spacing.base, marginBottom: Spacing.sm, borderWidth: 1, borderColor: '#E2E8F0',
    borderLeftWidth: 4,
  },
  slotTime: { width: 50, alignItems: 'center', marginRight: Spacing.base },
  slotTimeText: { fontSize: 12, fontWeight: '700' },
  slotTimeLine: { width: 2, flex: 1, marginVertical: 4, borderRadius: 1 },
  slotBody: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  slotColorDot: { width: 8, height: 8, borderRadius: 4, marginRight: Spacing.sm },
  slotInfo: { flex: 1 },
  slotSubject: { fontSize: 15, fontWeight: '700', color: '#0F172A' },
  slotTeacher: { fontSize: 12, color: '#64748B', marginTop: 3 },
  slotRoom: { fontSize: 12, color: '#94A3B8', marginTop: 2 },
});
