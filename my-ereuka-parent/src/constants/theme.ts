/**
 * Ereuka Design System — Colors, Spacing, Typography, Shadows
 * Thème premium bleu/violet cohérent avec la web app Ereuka.
 */

import '@/global.css';
import { Platform } from 'react-native';

// ── Brand palette ─────────────────────────────────────────────────────────────
export const Brand = {
  blue: '#2563EB',
  blueDark: '#1D4ED8',
  blueLight: '#DBEAFE',
  violet: '#7C3AED',
  violetDark: '#5B21B6',
  violetLight: '#EDE9FE',
  amber: '#F59E0B',
  amberLight: '#FEF3C7',
  green: '#10B981',
  greenLight: '#D1FAE5',
  red: '#EF4444',
  redLight: '#FEE2E2',
  rose: '#F43F5E',
  roseLight: '#FFE4E6',
} as const;

// ── Role palette (parent = bleu, enseignant = violet, étudiant = vert) ────────
export const RoleColors = {
  parent: {
    primary: Brand.blue,
    primaryDark: Brand.blueDark,
    primaryLight: Brand.blueLight,
    gradient: ['#2563EB', '#1D4ED8'] as [string, string],
  },
  enseignant: {
    primary: Brand.violet,
    primaryDark: Brand.violetDark,
    primaryLight: Brand.violetLight,
    gradient: ['#7C3AED', '#5B21B6'] as [string, string],
  },
  etudiant: {
    primary: Brand.green,
    primaryDark: '#059669',
    primaryLight: Brand.greenLight,
    gradient: ['#10B981', '#059669'] as [string, string],
  },
} as const;

export type Role = keyof typeof RoleColors;

// ── Light / Dark theme ────────────────────────────────────────────────────────
export const Colors = {
  light: {
    text: '#0F172A',
    textSecondary: '#64748B',
    textMuted: '#94A3B8',
    background: '#F8FAFC',
    backgroundElement: '#FFFFFF',
    backgroundSelected: '#EFF6FF',
    border: '#E2E8F0',
    card: '#FFFFFF',
    primary: Brand.blue,
    primaryForeground: '#FFFFFF',
    success: Brand.green,
    warning: Brand.amber,
    danger: Brand.red,
  },
  dark: {
    text: '#F1F5F9',
    textSecondary: '#94A3B8',
    textMuted: '#64748B',
    background: '#0F172A',
    backgroundElement: '#1E293B',
    backgroundSelected: '#1E3A5F',
    border: '#334155',
    card: '#1E293B',
    primary: '#60A5FA',
    primaryForeground: '#0F172A',
    success: '#34D399',
    warning: '#FCD34D',
    danger: '#F87171',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

// ── Fonts ─────────────────────────────────────────────────────────────────────
export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

// ── Spacing ───────────────────────────────────────────────────────────────────
export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
  base: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

// ── Border radius ─────────────────────────────────────────────────────────────
export const Radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  full: 999,
} as const;

// ── Shadows ───────────────────────────────────────────────────────────────────
export const Shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
  },
  colored: (color: string) => ({
    shadowColor: color,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  }),
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
