import React, { useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  Animated,
  StatusBar,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Brand, Radius, Shadows, Spacing } from '@/constants/theme';

interface RoleOption {
  id: 'parent' | 'enseignant' | 'etudiant';
  emoji: string;
  title: string;
  subtitle: string;
  color: string;
  colorLight: string;
  route: string;
}

const ROLES: RoleOption[] = [
  {
    id: 'parent',
    emoji: '👨‍👩‍👧',
    title: 'Parent',
    subtitle: 'Suivez la scolarité de vos enfants',
    color: Brand.blue,
    colorLight: Brand.blueLight,
    route: '/(parent)/',
  },
  {
    id: 'enseignant',
    emoji: '👩‍🏫',
    title: 'Enseignant',
    subtitle: 'Gérez vos classes, notes et présences',
    color: Brand.violet,
    colorLight: Brand.violetLight,
    route: '/(enseignant)/',
  },
  {
    id: 'etudiant',
    emoji: '🎓',
    title: 'Étudiant',
    subtitle: 'Consultez vos notes et votre emploi du temps',
    color: Brand.green,
    colorLight: Brand.greenLight,
    route: '/(etudiant)/',
  },
];

export default function WelcomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // Entrance animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const cardAnims = useRef(ROLES.map(() => new Animated.Value(40))).current;
  const cardFadeAnims = useRef(ROLES.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
    ]).start();

    ROLES.forEach((_, i) => {
      Animated.parallel([
        Animated.timing(cardAnims[i], {
          toValue: 0,
          duration: 500,
          delay: 300 + i * 120,
          useNativeDriver: true,
        }),
        Animated.timing(cardFadeAnims[i], {
          toValue: 1,
          duration: 500,
          delay: 300 + i * 120,
          useNativeDriver: true,
        }),
      ]).start();
    });
  }, []);

  const handleRoleSelect = (role: RoleOption) => {
    router.push(`/auth/login?role=${role.id}` as any);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" />
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <Animated.View
          style={[styles.header, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}
        >
          <View style={styles.logoBadge}>
            <Text style={styles.logoText}>E</Text>
          </View>
          <Text style={styles.brandName}>Ereuka</Text>
          <Text style={styles.tagline}>La plateforme scolaire intelligente</Text>
          <Text style={styles.subtitle}>Choisissez votre espace pour commencer</Text>
        </Animated.View>

        {/* Role cards */}
        <View style={styles.cardsContainer}>
          {ROLES.map((role, i) => (
            <Animated.View
              key={role.id}
              style={{
                opacity: cardFadeAnims[i],
                transform: [{ translateY: cardAnims[i] }],
              }}
            >
              <TouchableOpacity
                style={[styles.card, Shadows.md]}
                onPress={() => handleRoleSelect(role)}
                activeOpacity={0.82}
              >
                <View style={[styles.cardIconBg, { backgroundColor: role.colorLight }]}>
                  <Text style={styles.cardEmoji}>{role.emoji}</Text>
                </View>
                <View style={styles.cardBody}>
                  <Text style={styles.cardTitle}>{role.title}</Text>
                  <Text style={styles.cardSubtitle}>{role.subtitle}</Text>
                </View>
                <View style={[styles.cardArrow, { backgroundColor: role.color }]}>
                  <Text style={styles.cardArrowText}>→</Text>
                </View>
              </TouchableOpacity>
            </Animated.View>
          ))}
        </View>

        {/* Footer */}
        <Animated.View style={[styles.footer, { opacity: fadeAnim }]}>
          <Text style={styles.footerText}>
            Vos données sont protégées et chiffrées de bout en bout.
          </Text>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  content: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xxxl,
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing.xxxl,
  },
  logoBadge: {
    width: 72,
    height: 72,
    borderRadius: Radius.xl,
    backgroundColor: Brand.blue,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.base,
    ...Shadows.colored(Brand.blue),
  },
  logoText: {
    fontSize: 36,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -1,
  },
  brandName: {
    fontSize: 30,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.5,
  },
  tagline: {
    fontSize: 14,
    color: Brand.blue,
    fontWeight: '600',
    marginTop: 4,
    letterSpacing: 0.2,
  },
  subtitle: {
    fontSize: 15,
    color: '#64748B',
    marginTop: Spacing.sm,
    textAlign: 'center',
    lineHeight: 22,
  },
  cardsContainer: {
    gap: Spacing.md,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cardIconBg: {
    width: 56,
    height: 56,
    borderRadius: Radius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.base,
  },
  cardEmoji: {
    fontSize: 28,
  },
  cardBody: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  cardSubtitle: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 3,
    lineHeight: 18,
  },
  cardArrow: {
    width: 36,
    height: 36,
    borderRadius: Radius.full,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: Spacing.sm,
  },
  cardArrowText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  footer: {
    marginTop: Spacing.xxxl,
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
  },
  footerText: {
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 18,
  },
});
