import { Stack } from 'expo-router';

export default function EnseignantLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      {/* Tabs group */}
      <Stack.Screen name="(tabs)" />
      {/* Student detail — slides on top of the tabs */}
      <Stack.Screen
        name="eleve/[id]"
        options={{ animation: 'slide_from_right' }}
      />
    </Stack>
  );
}
