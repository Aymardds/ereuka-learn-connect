import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, useColorScheme } from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
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

export interface NativeTabBarOptions {
  icons: Record<string, TabIconConfig>;
}

export function NativeTabBar({ state, descriptors, navigation, icons }: BottomTabBarProps & NativeTabBarOptions) {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const insets = useSafeAreaInsets();

  const bottomInset = Math.max(insets.bottom, Platform.OS === 'ios' ? 24 : 12);

  const handlePress = (route: any, isFocused: boolean) => {
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } else {
      Haptics.selectionAsync();
    }

    const event = navigation.emit({
      type: 'tabPress',
      target: route.key,
      canPreventDefault: true,
    });

    if (!isFocused && !event.defaultPrevented) {
      navigation.navigate(route.name, route.params);
    }
  };

  const renderContent = () => (
    <View style={[styles.tabsContainer, { paddingBottom: bottomInset }]}>
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const isFocused = state.index === index;
        const config = icons[route.name] || {
          active: 'grid',
          inactive: 'grid-outline',
          label: options.title || route.name,
        };

        const iconName = isFocused ? config.active : config.inactive;
        const activeColor = Brand.blue;
        const inactiveColor = isDark ? '#94A3B8' : '#64748B';

        return (
          <TouchableOpacity
            key={route.key}
            accessibilityRole="button"
            accessibilityState={isFocused ? { selected: true } : {}}
            accessibilityLabel={options.tabBarAccessibilityLabel}
            testID={options.tabBarButtonTestID}
            onPress={() => handlePress(route, isFocused)}
            activeOpacity={0.7}
            style={styles.tabItem}
          >
            {Platform.OS === 'android' ? (
              // Android Material 3 Active Indicator Pill
              <View
                style={[
                  styles.androidPill,
                  isFocused && {
                    backgroundColor: isDark ? 'rgba(37, 99, 235, 0.25)' : '#EFF6FF',
                    transform: [{ scale: 1.05 }],
                  },
                ]}
              >
                <Ionicons
                  name={iconName}
                  size={22}
                  color={isFocused ? activeColor : inactiveColor}
                />
              </View>
            ) : (
              // iOS Icon with filled/outline state
              <View style={styles.iosIconWrapper}>
                <Ionicons
                  name={iconName}
                  size={24}
                  color={isFocused ? activeColor : inactiveColor}
                />
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
        intensity={85}
        tint={isDark ? 'dark' : 'systemChromeMaterialLight'}
        style={[
          styles.iosBlurContainer,
          {
            borderTopColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
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
    paddingTop: 10,
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
    marginBottom: 4,
    height: 26,
    justifyContent: 'center',
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '500',
    letterSpacing: -0.1,
  },
  tabLabelActive: {
    fontWeight: '700',
  },
});
