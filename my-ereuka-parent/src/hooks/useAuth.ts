import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import type { Session } from '@supabase/supabase-js';
import type { Role } from '@/constants/theme';

export interface UserProfile {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  role: Role | null;
}

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [role, setRole] = useState<Role | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async (userId: string) => {
    try {
      // Check if user is a teacher (has classes assigned)
      const { data: teacherData } = await supabase
        .from('class_teachers')
        .select('id')
        .eq('user_id', userId)
        .limit(1);

      // Check if user is a student
      const { data: studentData } = await supabase
        .from('students')
        .select('id')
        .eq('user_id', userId)
        .limit(1);

      // Check if user is a parent (responsible for a student)
      const { data: parentData } = await supabase
        .from('students')
        .select('id')
        .eq('responsible_id', userId)
        .limit(1);

      let detectedRole: Role | null = null;
      if (teacherData && teacherData.length > 0) {
        detectedRole = 'enseignant';
      } else if (studentData && studentData.length > 0) {
        detectedRole = 'etudiant';
      } else if (parentData && parentData.length > 0) {
        detectedRole = 'parent';
      }

      return detectedRole;
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      if (session) {
        const detectedRole = await fetchProfile(session.user.id);
        setRole(detectedRole);
        setProfile({
          id: session.user.id,
          email: session.user.email ?? '',
          full_name: session.user.user_metadata?.full_name,
          avatar_url: session.user.user_metadata?.avatar_url,
          role: detectedRole,
        });
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      if (session) {
        const detectedRole = await fetchProfile(session.user.id);
        setRole(detectedRole);
        setProfile({
          id: session.user.id,
          email: session.user.email ?? '',
          full_name: session.user.user_metadata?.full_name,
          avatar_url: session.user.user_metadata?.avatar_url,
          role: detectedRole,
        });
      } else {
        setProfile(null);
        setRole(null);
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchProfile]);

  const signOut = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setProfile(null);
    setRole(null);
  };

  const setManualRole = (r: Role) => {
    setRole(r);
    if (profile) setProfile({ ...profile, role: r });
  };

  return { session, profile, role, loading, signOut, setManualRole };
}
