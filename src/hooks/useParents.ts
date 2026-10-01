import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { createClient } from '@supabase/supabase-js';
import { UserProfile } from '../types/database';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export type ParentWithChildren = UserProfile & {
  students?: Array<{
    id: string;
    first_name: string;
    last_name: string;
    class_id: string;
    classes?: { name: string } | null;
  }>;
};

function getAdminClient() {
  const url = import.meta.env.VITE_SUPABASE_URL as string;
  const key = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY as string;
  if (!key) throw new Error("Clé de service Supabase non configurée.");
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

export function useParents() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const tenantId = profile?.tenant_id;

  // 1. Fetch all parents in this school
  const parentsQuery = useQuery({
    queryKey: ['parents', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];

      const { data, error } = await supabase
        .from('user_profiles')
        .select('*, students(id, first_name, last_name, class_id, classes(name))')
        .eq('tenant_id', tenantId)
        .in('role', ['responsible', 'parent'])
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as ParentWithChildren[];
    },
    enabled: !!tenantId,
  });

  // 2. Register/Create a new Parent (Admin API)
  const createParentMutation = useMutation({
    mutationFn: async ({
      fullName,
      email,
      phone,
      password,
      studentId
    }: {
      fullName: string;
      email: string;
      phone?: string;
      password?: string;
      studentId?: string;
    }) => {
      if (!tenantId) throw new Error("Établissement non trouvé");

      const adminClient = getAdminClient();
      const generatedPassword = password || `Parent${Math.floor(1000 + Math.random() * 9000)}!`;

      // A. Create Auth User
      const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
        email: email.trim(),
        password: generatedPassword,
        email_confirm: true,
        user_metadata: { full_name: fullName, phone: phone || '' }
      });

      let userId = authData?.user?.id;

      if (authError) {
        // If user already exists in auth, find existing profile
        if (authError.message.includes('already registered') || authError.message.includes('already exists')) {
          const { data: existingProfile, error: profileErr } = await adminClient
            .from('user_profiles')
            .select('id')
            .eq('email', email.trim())
            .maybeSingle();

          if (existingProfile) {
            userId = existingProfile.id;
          } else {
            throw new Error(`Ce compte existe déjà mais n'est pas lié : ${authError.message}`);
          }
        } else {
          throw new Error(`Erreur lors de la création du compte : ${authError.message}`);
        }
      }

      // B. Create/Update Profile in user_profiles
      if (userId) {
        const { error: upsertErr } = await adminClient
          .from('user_profiles')
          .upsert({
            id: userId,
            email: email.trim(),
            full_name: fullName,
            phone: phone || null,
            role: 'responsible',
            tenant_id: tenantId
          });

        if (upsertErr) throw upsertErr;

        // C. If studentId provided, immediately associate the student
        if (studentId) {
          const { error: studentErr } = await adminClient
            .from('students')
            .update({
              responsible_id: userId,
              guardian_name: fullName,
              guardian_phone: phone || null,
              guardian_email: email.trim()
            })
            .eq('id', studentId);

          if (studentErr) console.error("Erreur liaison élève:", studentErr);
        }
      }

      return {
        email: email.trim(),
        fullName,
        phone,
        password: generatedPassword,
        userId
      };
    },
    onSuccess: (data) => {
      toast.success(`Compte parent créé avec succès pour ${data.fullName}`);
      queryClient.invalidateQueries({ queryKey: ['parents', tenantId] });
      queryClient.invalidateQueries({ queryKey: ['students', tenantId] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Erreur lors de l'enregistrement du parent");
    }
  });

  // 3. Link an existing parent to a student
  const linkParentMutation = useMutation({
    mutationFn: async ({
      studentId,
      parentId,
      parentName,
      parentPhone,
      parentEmail
    }: {
      studentId: string;
      parentId: string;
      parentName?: string;
      parentPhone?: string;
      parentEmail?: string;
    }) => {
      const { error } = await supabase
        .from('students')
        .update({
          responsible_id: parentId,
          guardian_name: parentName || null,
          guardian_phone: parentPhone || null,
          guardian_email: parentEmail || null
        })
        .eq('id', studentId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Parent associé à l'élève avec succès");
      queryClient.invalidateQueries({ queryKey: ['students', tenantId] });
      queryClient.invalidateQueries({ queryKey: ['parents', tenantId] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Erreur lors de l'association");
    }
  });

  // 4. Unlink a parent from a student
  const unlinkParentMutation = useMutation({
    mutationFn: async ({ studentId }: { studentId: string }) => {
      const { error } = await supabase
        .from('students')
        .update({
          responsible_id: null,
          guardian_name: null,
          guardian_phone: null,
          guardian_email: null
        })
        .eq('id', studentId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Parent dissocié de l'élève");
      queryClient.invalidateQueries({ queryKey: ['students', tenantId] });
      queryClient.invalidateQueries({ queryKey: ['parents', tenantId] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Erreur lors de la dissociation");
    }
  });

  // 5. Update Parent info
  const updateParentMutation = useMutation({
    mutationFn: async ({
      id,
      fullName,
      phone
    }: {
      id: string;
      fullName: string;
      phone?: string;
    }) => {
      const { error } = await supabase
        .from('user_profiles')
        .update({
          full_name: fullName,
          phone: phone || null
        })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Informations du parent mises à jour");
      queryClient.invalidateQueries({ queryKey: ['parents', tenantId] });
      queryClient.invalidateQueries({ queryKey: ['students', tenantId] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Erreur lors de la mise à jour");
    }
  });

  return {
    parents: parentsQuery.data || [],
    isLoading: parentsQuery.isLoading,
    parentsQuery,
    createParentMutation,
    linkParentMutation,
    unlinkParentMutation,
    updateParentMutation,
    createParent: createParentMutation.mutateAsync,
    linkParent: linkParentMutation.mutateAsync,
    unlinkParent: unlinkParentMutation.mutateAsync,
    updateParent: updateParentMutation.mutateAsync
  };
}
