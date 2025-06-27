// app/(tabs)/Dna/_layout.tsx

import React from 'react';
import { Slot, Stack } from 'expo-router';

export default function DnaLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Slot />
    </Stack>
  );
}
