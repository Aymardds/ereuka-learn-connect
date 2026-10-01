import React, { useEffect, useState } from 'react';
import {
  StyleSheet, Text, View, ScrollView, ActivityIndicator,
  StatusBar, TextInput, TouchableOpacity, RefreshControl, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../../../lib/supabase';
import { Brand, Radius, Shadows, Spacing } from '@/constants/theme';

interface Message {
  id: string;
  content: string;
  sender_name: string;
  created_at: string;
  is_own: boolean;
  thread: string;
}

export default function ParentMessages() {
  const insets = useSafeAreaInsets();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [userName, setUserName] = useState('Parent');

  useEffect(() => { loadMessages(); }, []);

  const loadMessages = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      setUserId(session.user.id);
      setUserName(session.user.user_metadata?.full_name || 'Parent');

      const { data } = await supabase
        .from('messages')
        .select('id, content, created_at, sender_id, sender_name, thread')
        .order('created_at', { ascending: true })
        .limit(50);

      setMessages(
        (data || []).map((m: any) => ({
          id: m.id,
          content: m.content,
          sender_name: m.sender_name || 'Inconnu',
          created_at: m.created_at,
          is_own: m.sender_id === session.user.id,
          thread: m.thread || 'general',
        }))
      );
    } catch (err) { console.error(err); }
    finally { setLoading(false); setRefreshing(false); }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !userId) return;
    setSending(true);
    try {
      const { error } = await supabase.from('messages').insert({
        content: newMessage.trim(),
        sender_id: userId,
        sender_name: userName,
        thread: 'general',
      });
      if (error) throw error;
      setNewMessage('');
      loadMessages();
    } catch (err: any) {
      Alert.alert('Erreur', err.message || 'Impossible d\'envoyer le message.');
    } finally {
      setSending(false);
    }
  };

  const onRefresh = () => { setRefreshing(true); loadMessages(); };

  if (loading) {
    return <View style={styles.centered}><ActivityIndicator color={Brand.blue} size="large" /></View>;
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>💬 Messagerie École</Text>
        <Text style={styles.headerSub}>Fil de discussion avec l'établissement</Text>
      </View>

      <ScrollView
        style={styles.messageList}
        contentContainerStyle={{ padding: Spacing.base, paddingBottom: 20 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Brand.blue} />}
      >
        {messages.length === 0 ? (
          <View style={[styles.emptyCard, Shadows.sm]}>
            <Text style={styles.emptyEmoji}>💬</Text>
            <Text style={styles.emptyText}>Aucun message pour le moment.</Text>
            <Text style={styles.emptyHint}>Commencez une conversation avec l'établissement ci-dessous.</Text>
          </View>
        ) : (
          messages.map(msg => (
            <View
              key={msg.id}
              style={[
                styles.bubble,
                msg.is_own ? styles.ownBubble : styles.otherBubble,
              ]}
            >
              {!msg.is_own && (
                <View style={styles.senderAvatarBlock}>
                  <View style={styles.senderAvatar}>
                    <Text style={styles.senderAvatarText}>{msg.sender_name[0]}</Text>
                  </View>
                </View>
              )}
              <View style={[
                styles.bubbleContent,
                msg.is_own ? styles.ownBubbleContent : styles.otherBubbleContent,
              ]}>
                {!msg.is_own && (
                  <Text style={styles.senderName}>{msg.sender_name}</Text>
                )}
                <Text style={[styles.bubbleText, msg.is_own && styles.ownBubbleText]}>
                  {msg.content}
                </Text>
                <Text style={[styles.bubbleTime, msg.is_own && styles.ownBubbleTime]}>
                  {new Date(msg.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* Input */}
      <View style={[styles.inputArea, { paddingBottom: insets.bottom + 8 }]}>
        <TextInput
          style={styles.input}
          placeholder="Écrire un message..."
          value={newMessage}
          onChangeText={setNewMessage}
          multiline
          maxLength={500}
        />
        <TouchableOpacity
          style={[styles.sendBtn, (!newMessage.trim() || sending) && styles.sendBtnDisabled]}
          onPress={sendMessage}
          disabled={!newMessage.trim() || sending}
        >
          {sending
            ? <ActivityIndicator color="#fff" size="small" />
            : <Text style={styles.sendIcon}>→</Text>
          }
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { backgroundColor: Brand.blue, paddingHorizontal: Spacing.xl, paddingVertical: Spacing.base },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#FFFFFF' },
  headerSub: { fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  messageList: { flex: 1 },
  emptyCard: {
    backgroundColor: '#FFFFFF', borderRadius: Radius.xl, padding: Spacing.xxxl,
    alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0', marginTop: Spacing.xl,
  },
  emptyEmoji: { fontSize: 48, marginBottom: Spacing.sm },
  emptyText: { fontSize: 15, color: '#334155', fontWeight: '600', textAlign: 'center' },
  emptyHint: { fontSize: 13, color: '#94A3B8', textAlign: 'center', marginTop: 6 },
  bubble: { flexDirection: 'row', marginBottom: Spacing.sm, maxWidth: '80%' },
  ownBubble: { alignSelf: 'flex-end' },
  otherBubble: { alignSelf: 'flex-start' },
  senderAvatarBlock: { marginRight: Spacing.xs },
  senderAvatar: {
    width: 32, height: 32, borderRadius: Radius.full,
    backgroundColor: Brand.blueLight, justifyContent: 'center', alignItems: 'center',
  },
  senderAvatarText: { fontSize: 14, fontWeight: '700', color: Brand.blue },
  bubbleContent: { borderRadius: Radius.lg, padding: Spacing.sm, maxWidth: '90%' },
  ownBubbleContent: { backgroundColor: Brand.blue },
  otherBubbleContent: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E2E8F0' },
  senderName: { fontSize: 11, fontWeight: '700', color: Brand.blue, marginBottom: 3 },
  bubbleText: { fontSize: 14, color: '#0F172A', lineHeight: 20 },
  ownBubbleText: { color: '#FFFFFF' },
  bubbleTime: { fontSize: 10, color: '#94A3B8', marginTop: 4, textAlign: 'right' },
  ownBubbleTime: { color: 'rgba(255,255,255,0.6)' },
  inputArea: {
    flexDirection: 'row', alignItems: 'flex-end', padding: Spacing.base,
    backgroundColor: '#FFFFFF', borderTopWidth: 1, borderTopColor: '#E2E8F0',
    gap: Spacing.sm,
  },
  input: {
    flex: 1, backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0',
    borderRadius: Radius.lg, paddingHorizontal: Spacing.base, paddingVertical: Spacing.sm,
    fontSize: 14, color: '#0F172A', maxHeight: 100,
  },
  sendBtn: {
    width: 44, height: 44, borderRadius: Radius.full,
    backgroundColor: Brand.blue, justifyContent: 'center', alignItems: 'center',
  },
  sendBtnDisabled: { backgroundColor: '#CBD5E1' },
  sendIcon: { fontSize: 18, color: '#FFFFFF', fontWeight: '700' },
});
