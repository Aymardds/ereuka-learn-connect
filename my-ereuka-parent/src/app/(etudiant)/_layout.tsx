import { Tabs } from 'expo-router';
import { NativeTabBar, TabIconConfig } from '@/components/NativeTabBar';

const STUDENT_TAB_ICONS: Record<string, TabIconConfig> = {
  index: { active: 'book', inactive: 'book-outline', label: 'Accueil' },
  notes: { active: 'stats-chart', inactive: 'stats-chart-outline', label: 'Notes' },
  emploidutemps: { active: 'time', inactive: 'time-outline', label: 'Emploi du temps' },
  presences: { active: 'checkmark-circle', inactive: 'checkmark-circle-outline', label: 'Présences' },
};

export default function EtudiantLayout() {
  return (
    <Tabs
      tabBar={(props) => <NativeTabBar {...props} icons={STUDENT_TAB_ICONS} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Accueil' }} />
      <Tabs.Screen name="notes" options={{ title: 'Notes' }} />
      <Tabs.Screen name="emploidutemps" options={{ title: 'EDT' }} />
      <Tabs.Screen name="presences" options={{ title: 'Présences' }} />
    </Tabs>
  );
}

