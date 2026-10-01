import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Alert,
  StatusBar,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as WebBrowser from 'expo-web-browser';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Linking from 'expo-linking';
import { makeRedirectUri } from 'expo-auth-session';
import { supabase } from '../../../lib/supabase';
import { Brand, Radius, RoleColors, Shadows, Spacing } from '@/constants/theme';
import type { Role } from '@/constants/theme';

WebBrowser.maybeCompleteAuthSession();

const ROLE_CONFIG: Record<Role, { label: string; emoji: string; description: string }> = {
  parent: {
    label: 'Parent',
    emoji: '👨‍👩‍👧',
    description: 'Connectez-vous à l\'espace parent',
  },
  enseignant: {
    label: 'Enseignant',
    emoji: '👩‍🏫',
    description: 'Connectez-vous à l\'espace enseignant',
  },
  etudiant: {
    label: 'Étudiant',
    emoji: '🎓',
    description: 'Connectez-vous à votre espace étudiant',
  },
};

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{ role?: Role }>();
  const role = (params.role || 'parent') as Role;

  const roleConfig = ROLE_CONFIG[role] || ROLE_CONFIG.parent;
  const roleColors = RoleColors[role] || RoleColors.parent;

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [inviteToken, setInviteToken] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAppleAvailable, setIsAppleAvailable] = useState(false);
  const [authMode, setAuthMode] = useState<'social' | 'email' | 'invite'>('social');

  React.useEffect(() => {
    if (Platform.OS === 'ios') {
      AppleAuthentication.isAvailableAsync().then(setIsAppleAvailable);
    }
    const handleDeepLink = async (event: { url: string }) => {
      const parsed = Linking.parse(event.url);
      if (parsed.queryParams?.access_token && parsed.queryParams?.refresh_token) {
        await supabase.auth.setSession({
          access_token: parsed.queryParams.access_token as string,
          refresh_token: parsed.queryParams.refresh_token as string,
        });
        navigateByRole();
      }
    };
    const sub = Linking.addEventListener('url', handleDeepLink);
    Linking.getInitialURL().then((url) => { if (url) handleDeepLink({ url }); });
    return () => sub.remove();
  }, []);

  const navigateByRole = () => {
    if (role === 'enseignant') router.replace('/(enseignant)/' as any);
    else if (role === 'etudiant') router.replace('/(etudiant)/' as any);
    else router.replace('/(parent)/' as any);
  };

  const handleGoogleSignIn = async () => {
    try {
      setIsSubmitting(true);
      const redirectUrl = makeRedirectUri({ scheme: 'myereukaparent', path: 'auth/callback' });
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: redirectUrl, skipBrowserRedirect: true },
      });
      if (error) throw error;
      if (data?.url) {
        const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);
        if (result.type === 'success' && result.url) {
          const parsed = Linking.parse(result.url);
          if (parsed.queryParams?.access_token && parsed.queryParams?.refresh_token) {
            await supabase.auth.setSession({
              access_token: parsed.queryParams.access_token as string,
              refresh_token: parsed.queryParams.refresh_token as string,
            });
            navigateByRole();
          }
        }
      }
    } catch (err: any) {
      Alert.alert('Erreur Google', err.message || 'Impossible de se connecter avec Google.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAppleSignIn = async () => {
    try {
      setIsSubmitting(true);
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
      if (credential.identityToken) {
        const { error } = await supabase.auth.signInWithIdToken({
          provider: 'apple',
          token: credential.identityToken,
        });
        if (error) throw error;
        navigateByRole();
      }
    } catch (e: any) {
      if (e.code === 'ERR_REQUEST_CANCELED') return;
      Alert.alert('Erreur Apple', e.message || 'Impossible de se connecter avec Apple.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEmailSignIn = async () => {
    if (!email || !password) {
      Alert.alert('Champs requis', 'Veuillez remplir tous les champs.');
      return;
    }
    setIsSubmitting(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      navigateByRole();
    } catch (err: any) {
      Alert.alert('Erreur de connexion', err.message || 'Email ou mot de passe incorrect.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInviteToken = async () => {
    if (!inviteToken.trim()) {
      Alert.alert('Erreur', 'Veuillez saisir un code d\'invitation.');
      return;
    }
    setIsSubmitting(true);
    try {
      const { error } = await supabase.rpc('accept_parent_invitation', { p_token: inviteToken.trim() });
      if (error) throw error;
      Alert.alert('Succès 🎉', 'Invitation confirmée ! Bienvenue sur Ereuka.');
      navigateByRole();
    } catch (err: any) {
      Alert.alert('Erreur', err.message || 'Code d\'invitation invalide.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <StatusBar barStyle="dark-content" />
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Back button */}
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Text style={styles.backText}>← Retour</Text>
          </TouchableOpacity>

          {/* Header */}
          <View style={styles.header}>
            <View style={[styles.roleBadge, { backgroundColor: roleColors.primaryLight }]}>
              <Text style={styles.roleEmoji}>{roleConfig.emoji}</Text>
            </View>
            <Text style={styles.title}>{roleConfig.description}</Text>
            <Text style={styles.subtitle}>
              Espace <Text style={[styles.roleLabel, { color: roleColors.primary }]}>{roleConfig.label}</Text>
            </Text>
          </View>

          {/* Auth mode tabs */}
          <View style={styles.modeTabs}>
            {(['social', 'email', ...(role === 'parent' ? ['invite'] : [])] as ('social' | 'email' | 'invite')[]).map((mode) => (
              <TouchableOpacity
                key={mode}
                style={[
                  styles.modeTab,
                  authMode === mode && [styles.modeTabActive, { borderBottomColor: roleColors.primary }],
                ]}
                onPress={() => setAuthMode(mode)}
              >
                <Text style={[styles.modeTabText, authMode === mode && { color: roleColors.primary, fontWeight: '700' }]}>
                  {mode === 'social' ? 'Réseaux' : mode === 'email' ? 'Email' : 'Invitation'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Social auth */}
          {authMode === 'social' && (
            <View style={styles.card}>
              <TouchableOpacity
                style={styles.googleBtn}
                onPress={handleGoogleSignIn}
                disabled={isSubmitting}
              >
                <View style={styles.googleIcon}>
                  <Text style={styles.googleIconText}>G</Text>
                </View>
                <Text style={styles.googleBtnText}>Continuer avec Google</Text>
              </TouchableOpacity>

              {isAppleAvailable && (
                <AppleAuthentication.AppleAuthenticationButton
                  buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
                  buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
                  cornerRadius={Radius.md}
                  style={styles.appleBtn}
                  onPress={handleAppleSignIn}
                />
              )}

              <Text style={styles.secureNote}>🔒 Connexion sécurisée OAuth 2.0</Text>
            </View>
          )}

          {/* Email auth */}
          {authMode === 'email' && (
            <View style={styles.card}>
              <Text style={styles.inputLabel}>Adresse email</Text>
              <TextInput
                style={styles.input}
                placeholder="votre@email.com"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
              />
              <Text style={styles.inputLabel}>Mot de passe</Text>
              <TextInput
                style={styles.input}
                placeholder="••••••••"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />
              <TouchableOpacity
                style={[styles.primaryBtn, { backgroundColor: roleColors.primary }, Shadows.colored(roleColors.primary)]}
                onPress={handleEmailSignIn}
                disabled={isSubmitting}
              >
                {isSubmitting
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={styles.primaryBtnText}>Se connecter</Text>
                }
              </TouchableOpacity>
            </View>
          )}

          {/* Invitation (parent only) */}
          {authMode === 'invite' && role === 'parent' && (
            <View style={styles.card}>
              <Text style={styles.inviteNote}>
                Les codes d'invitation sont envoyés par SMS ou Email par l'école de votre enfant.
              </Text>
              <Text style={styles.inputLabel}>Code ou lien d'invitation</Text>
              <TextInput
                style={styles.input}
                placeholder="Collez votre code ici"
                value={inviteToken}
                onChangeText={setInviteToken}
                autoCapitalize="none"
                multiline
              />
              <TouchableOpacity
                style={[styles.primaryBtn, { backgroundColor: roleColors.primary }, Shadows.colored(roleColors.primary)]}
                onPress={handleInviteToken}
                disabled={isSubmitting}
              >
                {isSubmitting
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={styles.primaryBtnText}>Confirmer mon accès</Text>
                }
              </TouchableOpacity>
            </View>
          )}

          {isSubmitting && authMode !== 'email' && authMode !== 'invite' && (
            <ActivityIndicator color={roleColors.primary} style={{ marginTop: Spacing.xl }} />
          )}
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  content: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
  },
  backBtn: {
    marginBottom: Spacing.xl,
  },
  backText: {
    fontSize: 15,
    color: '#64748B',
    fontWeight: '500',
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing.xxl,
  },
  roleBadge: {
    width: 72,
    height: 72,
    borderRadius: Radius.xl,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.base,
  },
  roleEmoji: { fontSize: 36 },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 4,
  },
  roleLabel: {
    fontWeight: '700',
  },
  modeTabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    marginBottom: Spacing.xl,
  },
  modeTab: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.base,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  modeTabActive: {
    borderBottomWidth: 2,
  },
  modeTabText: {
    fontSize: 14,
    color: '#64748B',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...Shadows.md,
  },
  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: Radius.md,
    paddingVertical: 13,
    marginBottom: Spacing.sm,
  },
  googleIcon: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#EA4335',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  googleIconText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  googleBtnText: { fontSize: 15, fontWeight: '600', color: '#0F172A' },
  appleBtn: { width: '100%', height: 48, marginBottom: Spacing.sm },
  secureNote: {
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: Spacing.sm,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 6,
    marginTop: Spacing.sm,
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: Radius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: '#0F172A',
    marginBottom: Spacing.sm,
  },
  primaryBtn: {
    paddingVertical: 14,
    borderRadius: Radius.md,
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
  inviteNote: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 20,
    marginBottom: Spacing.base,
    backgroundColor: '#F1F5F9',
    padding: Spacing.sm,
    borderRadius: Radius.sm,
  },
});
