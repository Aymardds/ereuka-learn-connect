import { Tabs } from 'expo-router';
import { NativeTabBar, TabIconConfig } from '@/components/NativeTabBar';

const PARENT_TAB_ICONS: Record<string, TabIconConfig> = {
  index: { active: 'home', inactive: 'home-outline', label: 'Accueil' },
  notes: { active: 'bar-chart', inactive: 'bar-chart-outline', label: 'Notes' },
  absences: { active: 'calendar', inactive: 'calendar-outline', label: 'Présences' },
  paiements: { active: 'card', inactive: 'card-outline', label: 'Paiements' },
  messages: { active: 'chatbubbles', inactive: 'chatbubbles-outline', label: 'Messages' },
};

export default function ParentLayout() {
  return (
    <Tabs
      tabBar={(props) => <NativeTabBar {...props} icons={PARENT_TAB_ICONS} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Accueil' }} />
      <Tabs.Screen name="notes" options={{ title: 'Notes' }} />
      <Tabs.Screen name="absences" options={{ title: 'Présences' }} />
      <Tabs.Screen name="paiements" options={{ title: 'Paiements' }} />
      <Tabs.Screen name="messages" options={{ title: 'Messages' }} />
    </Tabs>
  );
}

