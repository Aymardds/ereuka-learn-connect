import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { Tenant } from '../types/database';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export function useSettings() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();
  const tenantId = profile?.tenant_id;

  // READ Tenant info
  const tenantQuery = useQuery({
    queryKey: ['tenant', tenantId],
    queryFn: async () => {
      if (!tenantId) return null;
      const { data, error } = await supabase
        .from('tenants')
        .select('*')
        .eq('id', tenantId)
        .single();

      if (error) throw error;
      return data as Tenant;
    },
    enabled: !!tenantId,
  });

  // UPDATE Tenant info
  const updateTenantMutation = useMutation({
    mutationFn: async (updateData: Partial<Tenant>) => {
      if (!tenantId) throw new Error("No tenant ID");
      const { data, error } = await supabase
        .from('tenants')
        .update(updateData)
        .eq('id', tenantId)
        .select()
        .single();

      if (error) throw error;
      return data as Tenant;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant', tenantId] });
      toast.success('Paramètres mis à jour avec succès');
    },
    onError: (error) => {
      toast.error('Erreur lors de la mise à jour des paramètres');
      console.error(error);
    }
  });

  // UPLOAD LOGO
  const uploadLogoMutation = useMutation({
    mutationFn: async (file: File) => {
      if (!tenantId) throw new Error("No tenant ID");
      
      const fileExt = file.name.split('.').pop();
      const fileName = `${tenantId}/logo-${Date.now()}.${fileExt}`;

      // Upload to bucket
      const { error: uploadError } = await supabase.storage
        .from('school-assets')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data } = supabase.storage.from('school-assets').getPublicUrl(fileName);
      
      // Update tenant table with new URL
      const { data: updateData, error: updateError } = await supabase
        .from('tenants')
        .update({ logo_url: data.publicUrl })
        .eq('id', tenantId)
        .select()
        .single();

      if (updateError) throw updateError;
      return updateData as Tenant;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant', tenantId] });
      toast.success('Logo mis à jour avec succès');
    },
    onError: (error) => {
      toast.error('Erreur lors de la mise à jour du logo');
      console.error(error);
    }
  });

  return {
    tenantQuery,
    updateTenantMutation,
    uploadLogoMutation
  };
}
