import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { AppMessage, Announcement, AppNotification } from '@/types/database';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export function useCommunication() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();
  const tenantId = profile?.tenant_id;
  const userId = profile?.id;

  const messagesQuery = useQuery({
    queryKey: ['messages', tenantId, userId],
    queryFn: async () => {
      if (!tenantId || !userId) return [];
      const { data, error } = await supabase
        .from('messages')
        .select(`
          *,
          sender:user_profiles!messages_sender_id_fkey(*),
          recipient:user_profiles!messages_recipient_id_fkey(*)
        `)
        .eq('tenant_id', tenantId)
        .or(`sender_id.eq.${userId},recipient_id.eq.${userId}`)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as AppMessage[];
    },
    enabled: !!tenantId && !!userId,
  });

  const announcementsQuery = useQuery({
    queryKey: ['announcements', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data, error } = await supabase
        .from('announcements')
        .select(`
          *,
          author:user_profiles(*)
        `)
        .eq('tenant_id', tenantId)
        .order('published_at', { ascending: false });
      if (error) throw error;
      return (data || []) as Announcement[];
    },
    enabled: !!tenantId,
  });

  const notificationsQuery = useQuery({
    queryKey: ['notifications', tenantId, userId],
    queryFn: async () => {
      if (!tenantId || !userId) return [];
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as AppNotification[];
    },
    enabled: !!tenantId && !!userId,
  });

  const sendMessageMutation = useMutation({
    mutationFn: async ({ recipientId, subject, body }: { recipientId: string; subject: string; body: string }) => {
      if (!tenantId || !userId) throw new Error('Authentification requise');
      const { data, error } = await supabase
        .from('messages')
        .insert([{
          tenant_id: tenantId,
          sender_id: userId,
          recipient_id: recipientId,
          subject,
          body,
        }])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages', tenantId, userId] });
      toast.success('Message envoyé');
    },
    onError: (err: any) => {
      toast.error('Erreur d\'envoi: ' + err.message);
    }
  });

  const createAnnouncementMutation = useMutation({
    mutationFn: async (announcement: Partial<Announcement>) => {
      if (!tenantId) throw new Error('Tenant ID manquant');
      const { data, error } = await supabase
        .from('announcements')
        .insert([{
          ...announcement,
          tenant_id: tenantId,
          author_id: userId,
        }])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['announcements', tenantId] });
      toast.success('Annonce publiée avec succès');
    },
    onError: (err: any) => {
      toast.error('Erreur: ' + err.message);
    }
  });

  return {
    messages: messagesQuery.data || [],
    announcements: announcementsQuery.data || [],
    notifications: notificationsQuery.data || [],
    sendMessage: sendMessageMutation.mutateAsync,
    createAnnouncement: createAnnouncementMutation.mutateAsync,
    unreadNotificationsCount: (notificationsQuery.data || []).filter(n => !n.is_read).length,
  };
}
