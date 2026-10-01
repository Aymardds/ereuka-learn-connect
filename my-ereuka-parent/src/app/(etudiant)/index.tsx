import React, { useEffect, useState } from 'react';
import {
  StyleSheet, Text, View, ScrollView, ActivityIndicator,
  StatusBar, RefreshControl, TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../../../lib/supabase';
import { Brand, Radius, Shadows, Spacing } from '@/constants/theme';

interface StudentProfile {
  id: string;
  first_name: string;
  last_name: string;
  class_name: string;
  status: string;
  avg_grade: number | null;
  absences: number;
  total_grades: number;
}

export default function EtudiantHome() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [session, setSession] = useState<any>(null);
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [recentGrades, setRecentGrades] = useState<any[]>([]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) loadData(session.user.id);
    });
  }, []);

  const loadData = async (userId: string) => {
    try {
      // Get student profile
      const { data: studentData } = await supabase
        .from('students')
        .select('id, first_name, last_name, status, classes(name)')
        .eq('user_id', userId)
        .single();

      if (!studentData) { setLoading(false); setRefreshing(false); return; }

      // Get grades
      const { data: gradeData } = await supabase
        .from('grades')
        .select('grade, max_grade, subjects(name), created_at')
        .eq('student_id', studentData.id)
        .order('created_at', { ascending: false })
        .limit(5);

      const grades = gradeData || [];
      const allGrades = await supabase
        .from('grades')
        .select('grade, max_grade')
        .eq('student_id', studentData.id);

      const gradeList = allGrades.data || [];
      const avg = gradeList.length > 0
        ? gradeList.reduce((a: number, g: any) => a + (g.grade / (g.max_grade || 20)) * 20, 0) / gradeList.length
        : null;

      // Get absences
      const { data: attData } = await supabase
        .from('attendance_records')
        .select('id')
        .eq('student_id', studentData.id)
        .eq('status', 'absent');

      setProfile({
        id: studentData.id,
        first_name: studentData.first_name,
        last_name: studentData.last_name,
        class_name: (Array.isArray(studentData.classes) ? (studentData.classes[0] as any)?.name : (studentData.classes as any)?.name) || 'Non assigné',
        status: studentData.status,
        avg_grade: avg,
        absences: (attData || []).length,
        total_grades: gradeList.length,
      });

      setRecentGrades(
        grades.map((g: any) => ({
          subject: g.subjects?.name || 'Matière',
          grade: g.grade,
          max_grade: g.max_grade || 20,
          date: g.created_at,
        }))
      );
    } catch (err) { console.error(err); }
    finally { setLoading(false); setRefreshing(false); }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.replace('/');
  };

  const onRefresh = () => { setRefreshing(true); if (session) loadData(session.user.id); };

  if (loading) {
    return <View style={styles.centered}><ActivityIndicator color={Brand.green} size="large" /></View>;
  }

  if (!session) {
    router.replace('/auth/login?role=etudiant' as any);
    return null;
  }

  const avgColor = profile?.avg_grade !== null && profile?.avg_grade !== undefined
    ? profile.avg_grade >= 16 ? Brand.green
    : profile.avg_grade >= 12 ? Brand.blue
    : profile.avg_grade >= 10 ? Brand.amber
    : Brand.red
    : '#94A3B8';

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" />

      {/* Hero vert */}
      <View style={styles.hero}>
        <View>
          <Text style={styles.heroGreeting}>
            Bonjour, {profile?.first_name || session.user?.user_metadata?.full_name?.split(' ')[0] || 'Étudiant'} 🎓
          </Text>
          <Text style={styles.heroSub}>
            {profile ? `${profile.class_name} • MyEreuka` : 'Espace Étudiant • MyEreuka'}
          </Text>
        </View>
        <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut}>
          <Text style={styles.signOutText}>Quitter</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ padding: Spacing.xl, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Brand.green} />}
      >
        {/* Profile card */}
        {profile && (
          <View style={[styles.profileCard, Shadows.md]}>
            <View style={styles.profileAvatar}>
              <Text style={styles.profileAvatarText}>
                {profile.first_name[0]}{profile.last_name[0]}
              </Text>
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>{profile.first_name} {profile.last_name}</Text>
              <Text style={styles.profileClass}>📚 {profile.class_name}</Text>
              <View style={[styles.badge, { backgroundColor: Brand.greenLight }]}>
                <Text style={[styles.badgeText, { color: Brand.green }]}>
                  {profile.status === 'active' ? '✓ Inscrit(e)' : '⏳ En attente'}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: avgColor + '20' }]}>
            <Text style={styles.statEmoji}>📊</Text>
            <Text style={[styles.statValue, { color: avgColor }]}>
              {profile?.avg_grade !== null && profile?.avg_grade !== undefined
                ? profile.avg_grade.toFixed(1) + '/20' : '—'}
            </Text>
            <Text style={styles.statLabel}>Moyenne générale</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: Brand.redLight }]}>
            <Text style={styles.statEmoji}>📅</Text>
            <Text style={[styles.statValue, { color: Brand.red }]}>{profile?.absences || 0}</Text>
            <Text style={styles.statLabel}>Absences</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: Brand.blueLight }]}>
            <Text style={styles.statEmoji}>📝</Text>
            <Text style={[styles.statValue, { color: Brand.blue }]}>{profile?.total_grades || 0}</Text>
            <Text style={styles.statLabel}>Notes</Text>
          </View>
        </View>

        {/* Recent grades */}
        {recentGrades.length > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Dernières notes</Text>
              <TouchableOpacity onPress={() => router.push('/(etudiant)/notes' as any)}>
                <Text style={[styles.seeAll, { color: Brand.green }]}>Voir tout →</Text>
              </TouchableOpacity>
            </View>
            {recentGrades.map((g, i) => {
              const pct = g.grade / g.max_grade;
              const c = pct >= 0.8 ? Brand.green : pct >= 0.6 ? Brand.blue : pct >= 0.5 ? Brand.amber : Brand.red;
              return (
                <View key={i} style={[styles.gradeItem, Shadows.sm]}>
                  <View style={[styles.gradeCircle, { backgroundColor: c + '20' }]}>
                    <Text style={[styles.gradeNum, { color: c }]}>{g.grade}</Text>
                    <Text style={[styles.gradeMax, { color: c }]}>/{g.max_grade}</Text>
                  </View>
                  <View style={styles.gradeInfo}>
                    <Text style={styles.gradeSubject}>{g.subject}</Text>
                    <Text style={styles.gradeDate}>
                      {new Date(g.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
                    </Text>
                  </View>
                </View>
              );
            })}
          </>
        )}

        {/* Quick actions */}
        <Text style={[styles.sectionTitle, { marginTop: Spacing.xl }]}>Accès rapide</Text>
        <View style={styles.quickGrid}>
          {[
            { label: 'Mes Notes', emoji: '📊', route: '/(etudiant)/notes' as any },
            { label: 'Emploi du temps', emoji: '📆', route: '/(etudiant)/emploidutemps' as any },
            { label: 'Mes Présences', emoji: '📋', route: '/(etudiant)/presences' as any },
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
    backgroundColor: Brand.green, paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.base, paddingBottom: Spacing.xl,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  heroGreeting: { fontSize: 20, fontWeight: '800', color: '#FFFFFF' },
  heroSub: { fontSize: 13, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  signOutBtn: { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: Radius.full },
  signOutText: { fontSize: 12, color: '#FFFFFF', fontWeight: '600' },
  profileCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF',
    borderRadius: Radius.xl, padding: Spacing.base, marginBottom: Spacing.xl,
    borderWidth: 1, borderColor: '#E2E8F0',
  },
  profileAvatar: {
    width: 56, height: 56, borderRadius: Radius.full,
    backgroundColor: Brand.greenLight, justifyContent: 'center', alignItems: 'center',
    marginRight: Spacing.base,
  },
  profileAvatarText: { fontSize: 20, fontWeight: '800', color: Brand.green },
  profileInfo: { flex: 1 },
  profileName: { fontSize: 18, fontWeight: '800', color: '#0F172A' },
  profileClass: { fontSize: 14, color: '#64748B', marginTop: 2 },
  badge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 3, borderRadius: Radius.full, marginTop: 6 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  statsRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.xl },
  statCard: { flex: 1, borderRadius: Radius.lg, padding: Spacing.sm, alignItems: 'center' },
  statEmoji: { fontSize: 20, marginBottom: 3 },
  statValue: { fontSize: 16, fontWeight: '800' },
  statLabel: { fontSize: 10, color: '#64748B', fontWeight: '500', textAlign: 'center', marginTop: 2 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#0F172A' },
  seeAll: { fontSize: 13, fontWeight: '600' },
  gradeItem: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF',
    borderRadius: Radius.lg, padding: Spacing.sm, marginBottom: Spacing.xs,
    borderWidth: 1, borderColor: '#E2E8F0',
  },
  gradeCircle: {
    width: 50, height: 50, borderRadius: Radius.full,
    justifyContent: 'center', alignItems: 'center', marginRight: Spacing.sm,
    flexDirection: 'row',
  },
  gradeNum: { fontSize: 18, fontWeight: '800' },
  gradeMax: { fontSize: 11, fontWeight: '600', marginTop: 4 },
  gradeInfo: { flex: 1 },
  gradeSubject: { fontSize: 14, fontWeight: '600', color: '#0F172A' },
  gradeDate: { fontSize: 12, color: '#94A3B8', marginTop: 2 },
  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  quickCard: { width: '47%', backgroundColor: '#FFFFFF', borderRadius: Radius.lg, padding: Spacing.base, alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0' },
  quickEmoji: { fontSize: 28, marginBottom: 6 },
  quickLabel: { fontSize: 12, fontWeight: '600', color: '#334155', textAlign: 'center' },
});
