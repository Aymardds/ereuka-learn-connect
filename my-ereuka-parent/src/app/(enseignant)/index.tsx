import React, { useEffect, useState } from 'react';
import {
  StyleSheet, Text, View, ScrollView, ActivityIndicator,
  StatusBar, RefreshControl, TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../../../lib/supabase';
import { Brand, Radius, Shadows, Spacing } from '@/constants/theme';

interface ClassInfo {
  id: string;
  name: string;
  student_count: number;
  subjects: string[];
}

export default function EnseignantHome() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [session, setSession] = useState<any>(null);
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({ totalStudents: 0, classesCount: 0 });

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) loadData(session.user.id);
    });
  }, []);

  const loadData = async (userId: string) => {
    try {
      // Get teacher's classes via class_teachers junction
      const { data: teacherClasses } = await supabase
        .from('class_teachers')
        .select(`
          classes(
            id, name,
            students(id),
            subjects(name)
          )
        `)
        .eq('user_id', userId);

      // If no class_teachers, try direct user assignment
      let classData: ClassInfo[] = [];
      if (teacherClasses && teacherClasses.length > 0) {
        classData = teacherClasses
          .map((tc: any) => tc.classes)
          .filter(Boolean)
          .map((c: any) => ({
            id: c.id,
            name: c.name,
            student_count: (c.students || []).length,
            subjects: (c.subjects || []).map((s: any) => s.name),
          }));
      } else {
        // Fallback: try to find classes by teacher name
        const { data: allClasses } = await supabase
          .from('classes')
          .select('id, name, students(id), subjects(name)')
          .limit(20);

        classData = (allClasses || []).map((c: any) => ({
          id: c.id,
          name: c.name,
          student_count: (c.students || []).length,
          subjects: (c.subjects || []).map((s: any) => s.name),
        }));
      }

      setClasses(classData);
      setStats({
        totalStudents: classData.reduce((a, c) => a + c.student_count, 0),
        classesCount: classData.length,
      });
    } catch (err) { console.error(err); }
    finally { setLoading(false); setRefreshing(false); }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.replace('/');
  };

  const onRefresh = () => { setRefreshing(true); if (session) loadData(session.user.id); };

  if (loading) {
    return <View style={styles.centered}><ActivityIndicator color={Brand.violet} size="large" /></View>;
  }

  const teacherName = session?.user?.user_metadata?.full_name?.split(' ')[0] || 'Enseignant';

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" />

      {/* Hero violet */}
      <View style={styles.hero}>
        <View>
          <Text style={styles.heroGreeting}>Bonjour, {teacherName} 👩‍🏫</Text>
          <Text style={styles.heroSub}>Espace Enseignant • MyEreuka</Text>
        </View>
        <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut}>
          <Text style={styles.signOutText}>Quitter</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ padding: Spacing.xl, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Brand.violet} />}
      >
        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: Brand.violetLight }]}>
            <Text style={styles.statEmoji}>🏫</Text>
            <Text style={[styles.statValue, { color: Brand.violet }]}>{stats.classesCount}</Text>
            <Text style={styles.statLabel}>Classes</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: Brand.blueLight }]}>
            <Text style={styles.statEmoji}>👤</Text>
            <Text style={[styles.statValue, { color: Brand.blue }]}>{stats.totalStudents}</Text>
            <Text style={styles.statLabel}>Élèves</Text>
          </View>
        </View>

        {/* My classes */}
        <Text style={styles.sectionTitle}>Mes Classes</Text>
        {classes.length === 0 ? (
          <View style={[styles.emptyCard, Shadows.sm]}>
            <Text style={styles.emptyEmoji}>🏫</Text>
            <Text style={styles.emptyText}>Aucune classe assignée pour le moment.</Text>
          </View>
        ) : (
          classes.map((cls, i) => (
            <TouchableOpacity key={cls.id} style={[styles.classCard, Shadows.sm]}>
              <View style={[styles.classIcon, { backgroundColor: Brand.violetLight }]}>
                <Text style={[styles.classIconText, { color: Brand.violet }]}>
                  {cls.name.substring(0, 2).toUpperCase()}
                </Text>
              </View>
              <View style={styles.classInfo}>
                <Text style={styles.className}>{cls.name}</Text>
                <Text style={styles.classStudents}>👥 {cls.student_count} élèves</Text>
                {cls.subjects.length > 0 && (
                  <Text style={styles.classSubjects} numberOfLines={1}>
                    📚 {cls.subjects.slice(0, 3).join(', ')}
                    {cls.subjects.length > 3 ? '...' : ''}
                  </Text>
                )}
              </View>
              <Text style={styles.chevron}>›</Text>
            </TouchableOpacity>
          ))
        )}

        {/* Quick actions */}
        <Text style={styles.sectionTitle}>Accès rapide</Text>
        <View style={styles.quickGrid}>
          {[
            { label: 'Présences', emoji: '📋', route: '/(enseignant)/presences' as any },
            { label: 'Saisir Notes', emoji: '📝', route: '/(enseignant)/notes' as any },
            { label: 'Mes Élèves', emoji: '👤', route: '/(enseignant)/eleves' as any },
            { label: 'Messagerie', emoji: '💬', route: '/(parent)/messages' as any },
          ].map(item => (
            <TouchableOpacity
              key={item.label}
              style={[styles.quickCard, Shadows.sm]}
              onPress={() => router.push(item.route as any)}
            >
              <Text style={styles.quickEmoji}>{item.emoji}</Text>
              <Text style={styles.quickLabel}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { flex: 1 },
  hero: {
    backgroundColor: Brand.violet, paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.base, paddingBottom: Spacing.xl,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  heroGreeting: { fontSize: 22, fontWeight: '800', color: '#FFFFFF' },
  heroSub: { fontSize: 13, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  signOutBtn: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: Radius.full,
  },
  signOutText: { fontSize: 12, color: '#FFFFFF', fontWeight: '600' },
  statsRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.xl },
  statCard: { flex: 1, borderRadius: Radius.lg, padding: Spacing.base, alignItems: 'center' },
  statEmoji: { fontSize: 24, marginBottom: 4 },
  statValue: { fontSize: 24, fontWeight: '800' },
  statLabel: { fontSize: 12, color: '#64748B', marginTop: 2 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#0F172A', marginBottom: Spacing.sm, marginTop: Spacing.sm },
  emptyCard: {
    backgroundColor: '#FFFFFF', borderRadius: Radius.xl, padding: Spacing.xxxl,
    alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0', marginBottom: Spacing.xl,
  },
  emptyEmoji: { fontSize: 40, marginBottom: Spacing.sm },
  emptyText: { fontSize: 15, fontWeight: '600', color: '#334155', textAlign: 'center' },
  classCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF',
    borderRadius: Radius.xl, padding: Spacing.base, marginBottom: Spacing.sm,
    borderWidth: 1, borderColor: '#E2E8F0',
  },
  classIcon: {
    width: 50, height: 50, borderRadius: Radius.lg,
    justifyContent: 'center', alignItems: 'center', marginRight: Spacing.base,
  },
  classIconText: { fontSize: 16, fontWeight: '800' },
  classInfo: { flex: 1 },
  className: { fontSize: 16, fontWeight: '700', color: '#0F172A' },
  classStudents: { fontSize: 13, color: '#64748B', marginTop: 2 },
  classSubjects: { fontSize: 12, color: '#94A3B8', marginTop: 2 },
  chevron: { fontSize: 22, color: '#CBD5E1' },
  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  quickCard: {
    width: '47%', backgroundColor: '#FFFFFF', borderRadius: Radius.lg,
    padding: Spacing.base, alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0',
  },
  quickEmoji: { fontSize: 28, marginBottom: 6 },
  quickLabel: { fontSize: 13, fontWeight: '600', color: '#334155' },
});
