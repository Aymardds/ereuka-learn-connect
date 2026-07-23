import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  StatusBar,
  Platform,
} from 'react-native';
import { supabase } from '../../lib/supabase';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import * as AppleAuthentication from 'expo-apple-authentication';
import { makeRedirectUri } from 'expo-auth-session';

WebBrowser.maybeCompleteAuthSession();

interface StudentInfo {
  id: string;
  first_name: string;
  last_name: string;
  class_name?: string;
  status: string;
}

export default function HomeScreen() {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [inviteToken, setInviteToken] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [children, setChildren] = useState<StudentInfo[]>([]);
  const [isAppleAvailable, setIsAppleAvailable] = useState(false);

  useEffect(() => {
    // Check Apple Sign-In availability
    if (Platform.OS === 'ios') {
      AppleAuthentication.isAvailableAsync().then(setIsAppleAvailable);
    }

    // 1. Initial Session check
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchChildren(session.user.id);
      setLoading(false);
    });

    // 2. Auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) fetchChildren(session.user.id);
    });

    // 3. Deep Linking handling (Invitation via URL click or OAuth redirect)
    const handleDeepLink = async (event: { url: string }) => {
      const parsed = Linking.parse(event.url);

      // Handle OAuth Tokens in URL hash or params
      if (parsed.queryParams?.access_token && parsed.queryParams?.refresh_token) {
        await supabase.auth.setSession({
          access_token: parsed.queryParams.access_token as string,
          refresh_token: parsed.queryParams.refresh_token as string,
        });
      }

      // Handle Invitation Token
      if (parsed.queryParams?.token) {
        handleConfirmToken(parsed.queryParams.token as string);
      }
    };

    const linkSub = Linking.addEventListener('url', handleDeepLink);
    Linking.getInitialURL().then((url) => {
      if (url) handleDeepLink({ url });
    });

    return () => {
      subscription.unsubscribe();
      linkSub.remove();
    };
  }, []);

  // Fetch parent's children
  const fetchChildren = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('students')
        .select('id, first_name, last_name, status, classes(name)')
        .eq('responsible_id', userId);

      if (error) throw error;
      setChildren(
        (data || []).map((item: any) => ({
          id: item.id,
          first_name: item.first_name,
          last_name: item.last_name,
          class_name: item.classes?.name || 'Non assignée',
          status: item.status,
        }))
      );
    } catch (err: any) {
      console.error('Error fetching children:', err.message);
    }
  };

  // Google Sign-In
  const handleGoogleSignIn = async () => {
    try {
      setIsSubmitting(true);
      const redirectUrl = makeRedirectUri({
        scheme: 'myereukaparent',
        path: 'auth/callback',
      });

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          skipBrowserRedirect: true,
        },
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
          }
        }
      }
    } catch (err: any) {
      Alert.alert('Erreur Google', err.message || 'Impossible de se connecter avec Google.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Apple Sign-In
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
        const { data, error } = await supabase.auth.signInWithIdToken({
          provider: 'apple',
          token: credential.identityToken,
        });

        if (error) throw error;
      } else {
        throw new Error('Aucun token reçu de la part d\'Apple.');
      }
    } catch (e: any) {
      if (e.code === 'ERR_REQUEST_CANCELED') return;
      Alert.alert('Erreur Apple', e.message || 'Impossible de se connecter avec Apple.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Confirm Invitation without password using RPC
  const handleConfirmToken = async (tokenToUse: string) => {
    if (!tokenToUse.trim()) {
      Alert.alert('Erreur', 'Veuillez saisir un code d\'invitation valide.');
      return;
    }

    setIsSubmitting(true);
    try {
      const { data, error } = await supabase.rpc('accept_parent_invitation', {
        p_token: tokenToUse.trim(),
      });

      if (error) throw error;

      Alert.alert(
        'Succès 🎉',
        'Votre invitation a été confirmée avec succès ! Bienvenue sur MyEreuka.'
      );

      const { data: sessionData } = await supabase.auth.getSession();
      if (sessionData.session) {
        setSession(sessionData.session);
        fetchChildren(sessionData.session.user.id);
      }
    } catch (err: any) {
      Alert.alert('Erreur', err.message || 'Impossible de valider l\'invitation.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setChildren([]);
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  // --- VIEW FOR LOGGED IN PARENTS ---
  if (session) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.header}>
          <View>
            <Text style={styles.headerSubtitle}>ESPACE PARENT</Text>
            <Text style={styles.headerTitle}>MyEreuka 🎓</Text>
          </View>
          <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut}>
            <Text style={styles.signOutText}>Déconnexion</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.sectionTitle}>Mes Enfants Inscrits ({children.length})</Text>

          {children.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>Aucun enfant rattaché pour le moment.</Text>
            </View>
          ) : (
            children.map((child) => (
              <View key={child.id} style={styles.childCard}>
                <View style={styles.avatarCircle}>
                  <Text style={styles.avatarText}>
                    {child.first_name[0]}
                    {child.last_name[0]}
                  </Text>
                </View>
                <View style={styles.childDetails}>
                  <Text style={styles.childName}>
                    {child.first_name} {child.last_name}
                  </Text>
                  <Text style={styles.childClass}>Classe : {child.class_name}</Text>
                  <View style={styles.statusBadge}>
                    <Text style={styles.statusBadgeText}>
                      Statut : {child.status === 'active' ? 'Inscrit(e)' : 'En attente'}
                    </Text>
                  </View>
                </View>
              </View>
            ))
          )}
        </ScrollView>
      </SafeAreaView>
    );
  }

  // --- VIEW FOR UNAUTHENTICATED PARENTS ---
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <ScrollView contentContainerStyle={styles.authContent}>
        <View style={styles.logoBadge}>
          <Text style={styles.logoBadgeText}>E</Text>
        </View>
        <Text style={styles.authTitle}>Bienvenue sur MyEreuka</Text>
        <Text style={styles.authSubtitle}>
          Connectez-vous à l'espace parent de votre établissement.
        </Text>

        <View style={styles.card}>
          {/* SOCIAL LOGIN BUTTONS */}
          <Text style={styles.label}>Connexion rapide & sécurisée</Text>

          {/* GOOGLE BUTTON */}
          <TouchableOpacity
            style={styles.googleBtn}
            onPress={handleGoogleSignIn}
            disabled={isSubmitting}
          >
            <View style={styles.googleIconContainer}>
              <Text style={styles.googleIconText}>G</Text>
            </View>
            <Text style={styles.googleBtnText}>Continuer avec Google</Text>
          </TouchableOpacity>

          {/* APPLE BUTTON (iOS native) */}
          {isAppleAvailable && (
            <AppleAuthentication.AppleAuthenticationButton
              buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
              buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
              cornerRadius={12}
              style={styles.appleBtn}
              onPress={handleAppleSignIn}
            />
          )}

          <View style={styles.dividerContainer}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>OU PAR INVITATION</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* INVITATION CODE */}
          <Text style={styles.label}>Code ou Lien d'invitation</Text>
          <TextInput
            style={styles.input}
            placeholder="Collez votre code d'invitation ici"
            value={inviteToken}
            onChangeText={setInviteToken}
            autoCapitalize="none"
          />

          <TouchableOpacity
            style={styles.submitBtn}
            onPress={() => handleConfirmToken(inviteToken)}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitBtnText}>Confirmer mon accès</Text>
            )}
          </TouchableOpacity>
        </View>

        <Text style={styles.footerNote}>
          Les invitations sont transmises par SMS ou Email par l'établissement scolaire de votre enfant.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  headerSubtitle: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#64748b',
    letterSpacing: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  signOutBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#fee2e2',
  },
  signOutText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ef4444',
  },
  content: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 15,
  },
  emptyCard: {
    backgroundColor: '#ffffff',
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  emptyText: {
    color: '#94a3b8',
    fontSize: 14,
  },
  childCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  avatarCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#dbeafe',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  avatarText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2563eb',
  },
  childDetails: {
    flex: 1,
  },
  childName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  childClass: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 2,
  },
  statusBadge: {
    marginTop: 6,
    alignSelf: 'flex-start',
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  statusBadgeText: {
    fontSize: 11,
    color: '#475569',
    fontWeight: '500',
  },
  // Auth view styles
  authContent: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    flexGrow: 1,
  },
  logoBadge: {
    width: 60,
    height: 60,
    borderRadius: 16,
    backgroundColor: '#2563eb',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  logoBadgeText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  authTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0f172a',
    textAlign: 'center',
  },
  authSubtitle: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 30,
  },
  card: {
    width: '100%',
    backgroundColor: '#ffffff',
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 10,
  },
  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  googleIconContainer: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#ea4335',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  googleIconText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 13,
  },
  googleBtnText: {
    color: '#0f172a',
    fontWeight: '600',
    fontSize: 14,
  },
  appleBtn: {
    width: '100%',
    height: 48,
    marginBottom: 16,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 18,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#e2e8f0',
  },
  dividerText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#94a3b8',
    paddingHorizontal: 10,
    letterSpacing: 1,
  },
  input: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: '#0f172a',
    marginBottom: 16,
  },
  submitBtn: {
    backgroundColor: '#2563eb',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  submitBtnText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 15,
  },
  footerNote: {
    fontSize: 12,
    color: '#94a3b8',
    textAlign: 'center',
    marginTop: 24,
    paddingHorizontal: 20,
  },
});
