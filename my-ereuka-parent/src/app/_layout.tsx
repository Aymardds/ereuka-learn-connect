import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useColorScheme, ActivityIndicator, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useAuth } from '@/hooks/useAuth';
import { Brand } from '@/constants/theme';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const { session, role, loading } = useAuth();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (loading) return;
    SplashScreen.hideAsync();

    const seg0 = segments[0] as string | undefined;
    const inAuthGroup = seg0 === 'auth';
    const inParent = seg0 === '(parent)';
    const inEnseignant = seg0 === '(enseignant)';
    const inEtudiant = seg0 === '(etudiant)';
    const inProtected = inParent || inEnseignant || inEtudiant;

    if (session && role) {
      // Redirect to correct space if in wrong one
      if (inParent && role !== 'parent') {
        router.replace(`/(${role})/` as any);
      } else if (inEnseignant && role !== 'enseignant') {
        router.replace(`/(${role})/` as any);
      } else if (inEtudiant && role !== 'etudiant') {
        router.replace(`/(${role})/` as any);
      } else if (!inProtected && !inAuthGroup) {
        // Logged in with role → redirect to correct space
        router.replace(`/(${role})/` as any);
      }
    } else if (!session && inProtected) {
      // Not logged in → back to welcome
      router.replace('/');
    }
  }, [session, role, loading, segments]);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8FAFC' }}>
        <ActivityIndicator size="large" color={Brand.blue} />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <Stack screenOptions={{ headerShown: false }}>
          {/* Welcome / Role selection */}
          <Stack.Screen name="index" options={{ animation: 'fade' }} />

          {/* Auth screens */}
          <Stack.Screen
            name="auth/login"
            options={{ animation: 'slide_from_bottom', presentation: 'modal' }}
          />

          {/* Parent space */}
          <Stack.Screen name="(parent)" options={{ animation: 'fade' }} />

          {/* Teacher space */}
          <Stack.Screen name="(enseignant)" options={{ animation: 'fade' }} />

          {/* Student space */}
          <Stack.Screen name="(etudiant)" options={{ animation: 'fade' }} />

          {/* Legacy screens (kept for backward compat) */}
          <Stack.Screen name="explore" options={{ headerShown: false }} />
        </Stack>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
