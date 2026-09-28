import { useState, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';

export type GlobalParentResult = {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  role: string;
  tenant_id: string;
  tenant_name: string | null;
  already_in_school: boolean;
  children_count: number;
};

export function useParentSearch() {
  const { profile } = useAuth();
  const [results, setResults] = useState<GlobalParentResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const search = useCallback(
    (query: string) => {
      // Clear previous timer
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }

      if (!query || query.trim().length < 2) {
        setResults([]);
        setIsSearching(false);
        setError(null);
        return;
      }

      setIsSearching(true);
      setError(null);

      debounceTimer.current = setTimeout(async () => {
        try {
          const { data, error: rpcError } = await supabase.rpc('search_parents_globally', {
            search_query: query.trim(),
            calling_tenant_id: profile?.tenant_id ?? null,
          });

          if (rpcError) throw rpcError;

          setResults((data as GlobalParentResult[]) || []);
        } catch (err: any) {
          setError(err.message || 'Erreur lors de la recherche');
          setResults([]);
        } finally {
          setIsSearching(false);
        }
      }, 350);
    },
    [profile?.tenant_id]
  );

  const clear = useCallback(() => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }
    setResults([]);
    setIsSearching(false);
    setError(null);
  }, []);

  /**
   * Invite an existing parent (already on the platform) to this school for a specific student.
   * Uses the invite_existing_parent_to_school RPC.
   */
  const inviteExistingParent = useCallback(
    async (parentUserId: string, studentId: string): Promise<{ 
      token: string; 
      email: string; 
      studentName?: string; 
      schoolName?: string; 
    }> => {
      const { data, error: rpcError } = await supabase.rpc('invite_existing_parent_to_school', {
        p_parent_user_id: parentUserId,
        p_student_id: studentId,
        p_tenant_id: profile?.tenant_id ?? null,
      });

      if (rpcError) throw rpcError;

      const row = Array.isArray(data) ? data[0] : data;
      if (!row) throw new Error("Aucun résultat retourné par l'invitation");

      return {
        token: row.invitation_token,
        email: row.parent_email,
        studentName: row.student_name,
        schoolName: row.school_name,
      };
    },
    [profile?.tenant_id]
  );

  /**
   * Link an existing Eurêka parent directly to a student without an invitation step
   * (e.g., in-person enrollment at the administration desk).
   */
  const linkExistingParentDirectly = useCallback(
    async (parentUserId: string, studentId: string): Promise<{
      studentName?: string;
      schoolName?: string;
    }> => {
      const { data, error: rpcError } = await supabase.rpc('link_existing_parent_directly', {
        p_parent_user_id: parentUserId,
        p_student_id: studentId,
        p_tenant_id: profile?.tenant_id ?? null,
      });

      if (rpcError) throw rpcError;
      return {
        studentName: (data as any)?.student_name,
        schoolName: (data as any)?.school_name,
      };
    },
    [profile?.tenant_id]
  );

  return {
    results,
    isSearching,
    error,
    search,
    clear,
    inviteExistingParent,
    linkExistingParentDirectly,
  };
}

