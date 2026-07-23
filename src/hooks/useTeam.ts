import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { createClient } from '@supabase/supabase-js';
import { UserProfile, UserRole } from '../types/database';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

function getAdminClient() {
  const url = import.meta.env.VITE_SUPABASE_URL as string;
  const key = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY as string;
  if (!key) throw new Error('VITE_SUPABASE_SERVICE_ROLE_KEY n\'est pas configuré.');
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

export function useTeam() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const tenantId = profile?.tenant_id;

  // 1. READ Staff List
  const staffQuery = useQuery({
    queryKey: ['team_staff', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];

      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('tenant_id', tenantId)
        .neq('role', 'responsible')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as UserProfile[];
    },
    enabled: !!tenantId,
  });

  // 2. CREATE Staff Member via Admin API
  const createStaffMutation = useMutation({
    mutationFn: async ({ email, fullName, role }: { email: string; fullName: string; role: UserRole }) => {
      if (!tenantId) throw new Error("Établissement non trouvé");

      const adminClient = getAdminClient();
      const tempPassword = Math.random().toString(36).slice(-8) + 'A1!';

      // Create Auth user securely via GoTrue Admin API
      const { data: authUser, error: authError } = await adminClient.auth.admin.createUser({
        email,
        password: tempPassword,
        email_confirm: true,
        user_metadata: { full_name: fullName }
      });

      if (authError) throw new Error(`Erreur création compte: ${authError.message}`);

      // Create profile in user_profiles
      const { error: profileError } = await adminClient
        .from('user_profiles')
        .insert([{
          id: authUser.user.id,
          email,
          full_name: fullName,
          role,
          tenant_id: tenantId
        }]);

      if (profileError) throw new Error(`Erreur profil: ${profileError.message}`);

      return { email, tempPassword };
    },
    onSuccess: () => {
      toast.success("Collaborateur créé avec succès");
      queryClient.invalidateQueries({ queryKey: ['team_staff'] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Erreur lors de la création du membre");
    }
  });

  // 3. UPDATE Staff Member
  const updateStaffMutation = useMutation({
    mutationFn: async ({ userId, fullName, role }: { userId: string; fullName: string; role: UserRole }) => {
      const { data, error } = await supabase
        .from('user_profiles')
        .update({ full_name: fullName, role: role })
        .eq('id', userId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Profil du membre mis à jour");
      queryClient.invalidateQueries({ queryKey: ['team_staff'] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Erreur lors de la modification");
    }
  });

  // 4. DELETE Staff Member
  const deleteStaffMutation = useMutation({
    mutationFn: async (userId: string) => {
      const adminClient = getAdminClient();

      // Delete from Auth users as well
      await adminClient.auth.admin.deleteUser(userId);

      const { error } = await supabase
        .from('user_profiles')
        .delete()
        .eq('id', userId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Membre supprimé de l'établissement");
      queryClient.invalidateQueries({ queryKey: ['team_staff'] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Erreur lors de la suppression");
    }
  });

  return {
    staff: staffQuery.data || [],
    isLoading: staffQuery.isLoading,
    createStaffMutation,
    updateStaffMutation,
    deleteStaffMutation,
  };
}
