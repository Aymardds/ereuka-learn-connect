import { Tabs } from 'expo-router';
import { NativeTabBar, TabIconConfig } from '@/components/NativeTabBar';

const TEACHER_TAB_ICONS: Record<string, TabIconConfig> = {
  index: { active: 'school', inactive: 'school-outline', label: 'Classes' },
  presences: { active: 'clipboard', inactive: 'clipboard-outline', label: 'Présences' },
  notes: { active: 'create', inactive: 'create-outline', label: 'Saisie Notes' },
  eleves: { active: 'people', inactive: 'people-outline', label: 'Élèves' },
};

export default function EnseignantLayout() {
  return (
    <Tabs
      tabBar={(props) => <NativeTabBar {...props} icons={TEACHER_TAB_ICONS} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Classes' }} />
      <Tabs.Screen name="presences" options={{ title: 'Présences' }} />
      <Tabs.Screen name="notes" options={{ title: 'Notes' }} />
      <Tabs.Screen name="eleves" options={{ title: 'Élèves' }} />
    </Tabs>
  );
}

