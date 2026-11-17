import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, useColorScheme } from 'react-native';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Brand } from '@/constants/theme';

export interface TabIconConfig {
  active: keyof typeof Ionicons.glyphMap;
  inactive: keyof typeof Ionicons.glyphMap;
  label: string;
}

export interface BottomTabBarProps {
  state: {
    index: number;
    routes: Array<{ key: string; name: string; params?: any }>;
  };
  descriptors: Record<string, any>;
  navigation?: {
    emit?: (event: any) => any;
    navigate?: (name: string, params?: any) => void;
  };
  navigateToTab?: (routeKey: string) => void;
  emitter?: {
    emit?: (event: any) => any;
  };
  insets?: any;
}

export interface NativeTabBarOptions {
  icons: Record<string, TabIconConfig>;
  activeColor?: string;
  badges?: Record<string, number | string | boolean>;
}

export function NativeTabBar({
  state,
  descriptors,
  navigation,
  navigateToTab,
  icons,
  activeColor: propActiveColor,
  badges = {},
}: BottomTabBarProps & NativeTabBarOptions) {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const insets = useSafeAreaInsets();

  const bottomInset = Math.max(insets.bottom, Platform.OS === 'ios' ? 24 : 12);

  // Auto-detect role color if not specified
  const routeNames = state.routes.map(r => r.name);
  const detectedColor =
    propActiveColor ||
    (routeNames.includes('emploidutemps')
      ? Brand.green
      : routeNames.includes('eleves')
      ? Brand.violet
      : Brand.blue);

  const handlePress = (route: any, isFocused: boolean) => {
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } else {
      Haptics.selectionAsync();
    }

    if (navigation?.emit) {
      const event = navigation.emit({
        type: 'tabPress',
        target: route.key,
        canPreventDefault: true,
      });

      if (!isFocused && !event?.defaultPrevented) {
        navigation.navigate?.(route.name, route.params);
      }
    } else if (navigateToTab) {
      if (!isFocused) {
        navigateToTab(route.key);
      }
    }
  };

  const renderContent = () => (
    <View style={[styles.tabsContainer, { paddingBottom: bottomInset }]}>
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key] || { options: {} };
        const isFocused = state.index === index;
        const config = icons[route.name] || {
          active: 'grid' as const,
          inactive: 'grid-outline' as const,
          label: options.title || route.name,
        };

        const iconName = isFocused ? config.active : config.inactive;
        const activeColor = detectedColor;
        const inactiveColor = isDark ? '#94A3B8' : '#64748B';

        const badgeValue = badges[route.name] ?? options.tabBarBadge;

        return (
          <TouchableOpacity
            key={route.key}
            accessibilityRole="button"
            accessibilityState={isFocused ? { selected: true } : {}}
            accessibilityLabel={options.tabBarAccessibilityLabel}
            testID={options.tabBarButtonTestID}
            onPress={() => handlePress(route, isFocused)}
            activeOpacity={0.75}
            style={styles.tabItem}
          >
            {Platform.OS === 'android' ? (
              // Android Material 3 Active Indicator Pill
              <View
                style={[
                  styles.androidPill,
                  isFocused && {
                    backgroundColor: isDark
                      ? `${activeColor}33`
                      : `${activeColor}15`,
                    transform: [{ scale: 1.05 }],
                  },
                ]}
              >
                <Ionicons
                  name={iconName}
                  size={22}
                  color={isFocused ? activeColor : inactiveColor}
                />
                {badgeValue ? (
                  <View style={[styles.badgeCircle, { backgroundColor: Brand.red }]}>
                    {typeof badgeValue === 'number' || typeof badgeValue === 'string' ? (
                      <Text style={styles.badgeText}>{badgeValue}</Text>
                    ) : null}
                  </View>
                ) : null}
              </View>
            ) : (
              // iOS Icon with filled/outline state + subtle active glow
              <View style={styles.iosIconWrapper}>
                <View
                  style={[
                    styles.iosActiveGlow,
                    isFocused && {
                      backgroundColor: isDark
                        ? `${activeColor}25`
                        : `${activeColor}15`,
                    },
                  ]}
                >
                  <Ionicons
                    name={iconName}
                    size={23}
                    color={isFocused ? activeColor : inactiveColor}
                  />
                </View>

                {badgeValue ? (
                  <View style={[styles.badgeCircle, { backgroundColor: Brand.red }]}>
                    {typeof badgeValue === 'number' || typeof badgeValue === 'string' ? (
                      <Text style={styles.badgeText}>{badgeValue}</Text>
                    ) : null}
                  </View>
                ) : null}
              </View>
            )}

            <Text
              style={[
                styles.tabLabel,
                { color: isFocused ? activeColor : inactiveColor },
                isFocused && styles.tabLabelActive,
              ]}
              numberOfLines={1}
            >
              {config.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );

  if (Platform.OS === 'ios') {
    return (
      <BlurView
        intensity={92}
        tint={isDark ? 'dark' : 'systemChromeMaterialLight'}
        style={[
          styles.iosBlurContainer,
          {
            borderTopColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)',
          },
        ]}
      >
        {renderContent()}
      </BlurView>
    );
  }

  return (
    <View
      style={[
        styles.androidBarContainer,
        {
          backgroundColor: isDark ? '#0F172A' : '#FFFFFF',
          borderTopColor: isDark ? '#1E293B' : '#E2E8F0',
        },
      ]}
    >
      {renderContent()}
    </View>
  );
}

const styles = StyleSheet.create({
  iosBlurContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopWidth: StyleSheet.hairlineWidth,
    elevation: 0,
  },
  androidBarContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopWidth: 1,
    elevation: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
  },
  tabsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingTop: 8,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  androidPill: {
    width: 52,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 3,
  },
  iosIconWrapper: {
    position: 'relative',
    marginBottom: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iosActiveGlow: {
    width: 44,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '500',
    letterSpacing: -0.1,
  },
  tabLabelActive: {
    fontWeight: '800',
  },
  badgeCircle: {
    position: 'absolute',
    top: -2,
    right: 2,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '900',
  },
});
