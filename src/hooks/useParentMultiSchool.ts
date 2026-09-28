import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from './useAuth';

export interface ParentSchool {
  tenant_id: string;
  school_name: string;
  linked_at: string;
  child_count: number;
}

export interface ParentChildAllSchools {
  student_id: string;
  first_name: string;
  last_name: string;
  class_name: string | null;
  tenant_id: string;
  school_name: string;
  status: string;
}

export interface ParentPendingInvitation {
  invitation_id: string;
  invitation_token: string;
  school_name: string;
  tenant_id: string;
  student_id: string;
  student_name: string;
  student_photo: string | null;
  class_name: string;
  created_at: string;
  expires_at: string | null;
}

/**
 * Retourne les établissements liés au compte du parent connecté
 * (peut en avoir plusieurs grâce à parent_school_links).
 */
export function useParentSchools() {
  const { user, profile } = useAuth();

  const schoolsQuery = useQuery({
    queryKey: ['parent_schools', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_parent_schools');
      if (error) throw error;
      return (data || []) as ParentSchool[];
    },
    enabled: !!user?.id && (profile?.role === 'responsible' || profile?.role === 'parent'),
  });

  return {
    schools: schoolsQuery.data || [],
    isLoading: schoolsQuery.isLoading,
    schoolsQuery,
  };
}

/**
 * Retourne TOUS les enfants du parent connecté,
 * tous établissements confondus.
 */
export function useParentChildrenAllSchools() {
  const { user, profile } = useAuth();

  const childrenQuery = useQuery({
    queryKey: ['parent_children_all', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_parent_children_all_schools');
      if (error) throw error;
      return (data || []) as ParentChildAllSchools[];
    },
    enabled: !!user?.id && (profile?.role === 'responsible' || profile?.role === 'parent'),
  });

  return {
    children: childrenQuery.data || [],
    isLoading: childrenQuery.isLoading,
    childrenQuery,
  };
}

/**
 * Récupère les invitations en attente envoyées par des établissements
 * pour lier des enfants au compte du parent connecté.
 */
export function useParentPendingInvitations() {
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();

  const invitationsQuery = useQuery({
    queryKey: ['parent_pending_invitations', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_parent_pending_invitations');
      if (error) {
        console.warn("Erreur chargement invitations en attente:", error.message);
        return [];
      }
      return (data || []) as ParentPendingInvitation[];
    },
    enabled: !!user?.id && (profile?.role === 'responsible' || profile?.role === 'parent'),
  });

  const acceptInvitation = async (token: string) => {
    const { data, error } = await supabase.rpc('accept_parent_invitation', {
      invitation_token: token,
      parent_full_name: profile?.full_name || '',
    });
    if (error) throw error;

    await queryClient.invalidateQueries({ queryKey: ['parent_pending_invitations'] });
    await queryClient.invalidateQueries({ queryKey: ['parent_schools'] });
    await queryClient.invalidateQueries({ queryKey: ['parent_children_all'] });
    await queryClient.invalidateQueries({ queryKey: ['students'] });
    await queryClient.invalidateQueries({ queryKey: ['notifications'] });
    return data;
  };

  const declineInvitation = async (token: string) => {
    const { data, error } = await supabase.rpc('decline_parent_invitation', {
      invitation_token: token,
    });
    if (error) throw error;

    await queryClient.invalidateQueries({ queryKey: ['parent_pending_invitations'] });
    return data;
  };

  return {
    invitations: invitationsQuery.data || [],
    isLoading: invitationsQuery.isLoading,
    refetch: invitationsQuery.refetch,
    acceptInvitation,
    declineInvitation,
  };
}
