import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Modal,
  Platform,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { Brand, Radius, Shadows, Spacing } from '@/constants/theme';

export interface AppTopHeaderProps {
  title?: string;
  subtitle?: string;
  role: 'parent' | 'enseignant' | 'etudiant';
  userName?: string;
  avatarInitial?: string;
  rightAction?: React.ReactNode;
}

export function AppTopHeader({
  title,
  subtitle,
  role,
  userName = 'Utilisateur',
  avatarInitial,
  rightAction,
}: AppTopHeaderProps) {
  const router = useRouter();
  const [menuVisible, setMenuVisible] = useState(false);

  const roleColors = {
    parent: { primary: Brand.blue, light: Brand.blueLight, label: 'Espace Parent', emoji: '👨‍👩‍👧' },
    enseignant: { primary: Brand.violet, light: Brand.violetLight, label: 'Espace Enseignant', emoji: '👩‍🏫' },
    etudiant: { primary: Brand.green, light: Brand.greenLight, label: 'Espace Étudiant', emoji: '🎓' },
  }[role];

  const initial = avatarInitial || userName.charAt(0).toUpperCase() || 'E';

  const handleLogout = async () => {
    Alert.alert(
      'Déconnexion',
      'Êtes-vous sûr de vouloir vous déconnecter ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Déconnexion',
          style: 'destructive',
          onPress: async () => {
            setMenuVisible(false);
            await supabase.auth.signOut();
            router.replace('/');
          },
        },
      ]
    );
  };

  const switchSpace = (targetRole: 'parent' | 'enseignant' | 'etudiant') => {
    setMenuVisible(false);
    router.replace(`/(${targetRole})/` as any);
  };

  return (
    <>
      <View style={[styles.headerContainer, { backgroundColor: roleColors.primary }]}>
        <View style={styles.headerLeft}>
          <View style={styles.logoBadge}>
            <Text style={styles.logoText}>E</Text>
          </View>
          <View style={styles.titleBox}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {title || 'Eurêka'}
            </Text>
            <Text style={styles.headerSubtitle} numberOfLines={1}>
              {subtitle || roleColors.label}
            </Text>
          </View>
        </View>

        <View style={styles.headerRight}>
          {rightAction}

          <TouchableOpacity
            style={styles.profileBtn}
            onPress={() => setMenuVisible(true)}
            activeOpacity={0.8}
            accessibilityLabel="Menu profil"
          >
            <View style={styles.avatarCircle}>
              <Text style={[styles.avatarText, { color: roleColors.primary }]}>{initial}</Text>
            </View>
            <Ionicons name="menu-outline" size={18} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Navigation Quick Menu Modal */}
      <Modal visible={menuVisible} animationType="fade" transparent>
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setMenuVisible(false)}
        >
          <View style={[styles.menuSheet, Shadows.md]}>
            {/* Header User info */}
            <View style={styles.menuHeader}>
              <View style={[styles.largeAvatar, { backgroundColor: roleColors.light }]}>
                <Text style={[styles.largeAvatarText, { color: roleColors.primary }]}>
                  {initial}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.menuUserName}>{userName}</Text>
                <View style={[styles.roleBadge, { backgroundColor: roleColors.light }]}>
                  <Text style={[styles.roleBadgeText, { color: roleColors.primary }]}>
                    {roleColors.emoji} {roleColors.label}
                  </Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => setMenuVisible(false)}>
                <Ionicons name="close" size={22} color="#64748B" />
              </TouchableOpacity>
            </View>

            <View style={styles.divider} />

            {/* Quick Switch Spaces */}
            <Text style={styles.menuSectionTitle}>Changer d'espace</Text>
            <View style={styles.spacesRow}>
              {[
                { id: 'parent' as const, label: 'Parent', color: Brand.blue, icon: 'people' },
                { id: 'enseignant' as const, label: 'Enseignant', color: Brand.violet, icon: 'school' },
                { id: 'etudiant' as const, label: 'Étudiant', color: Brand.green, icon: 'book' },
              ].map(s => {
                const isActive = s.id === role;
                return (
                  <TouchableOpacity
                    key={s.id}
                    style={[
                      styles.spaceChip,
                      isActive && { borderColor: s.color, backgroundColor: `${s.color}15`, borderWidth: 2 },
                    ]}
                    onPress={() => switchSpace(s.id)}
                  >
                    <Ionicons name={s.icon as any} size={16} color={isActive ? s.color : '#64748B'} />
                    <Text
                      style={[
                        styles.spaceChipText,
                        isActive && { color: s.color, fontWeight: '800' },
                      ]}
                    >
                      {s.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.divider} />

            {/* Sync status */}
            <View style={styles.syncBox}>
              <View style={styles.syncDot} />
              <Text style={styles.syncText}>Serveur Cloud Eurêka connecté • Mode en ligne</Text>
            </View>

            {/* Logout button */}
            <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
              <Ionicons name="log-out-outline" size={18} color={Brand.red} />
              <Text style={styles.logoutBtnText}>Se déconnecter</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.base,
    paddingVertical: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  logoBadge: {
    width: 36,
    height: 36,
    borderRadius: Radius.lg,
    backgroundColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoText: {
    fontSize: 20,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  titleBox: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  headerSubtitle: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '600',
    marginTop: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  profileBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radius.full,
    gap: 6,
  },
  avatarCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 13,
    fontWeight: '900',
  },
  /* Modal Menu */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-start',
    paddingTop: Platform.OS === 'ios' ? 80 : 50,
    paddingHorizontal: Spacing.base,
  },
  menuSheet: {
    backgroundColor: '#FFFFFF',
    borderRadius: Radius.xxl,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  menuHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  largeAvatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    justifyContent: 'center',
    alignItems: 'center',
  },
  largeAvatarText: {
    fontSize: 20,
    fontWeight: '900',
  },
  menuUserName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  roleBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.full,
    marginTop: 4,
  },
  roleBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 14,
  },
  menuSectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  spacesRow: {
    flexDirection: 'row',
    gap: 8,
  },
  spaceChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: Radius.lg,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 5,
  },
  spaceChipText: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '600',
  },
  syncBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: Radius.md,
    marginBottom: 12,
  },
  syncDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Brand.green,
  },
  syncText: {
    fontSize: 11,
    color: '#166534',
    fontWeight: '600',
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEF2F2',
    paddingVertical: 12,
    borderRadius: Radius.lg,
    gap: 8,
  },
  logoutBtnText: {
    color: Brand.red,
    fontWeight: '800',
    fontSize: 13,
  },
});
