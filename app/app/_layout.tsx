// app/_layout.tsx
import React, { useEffect } from 'react';
import { Slot, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import 'react-native-reanimated';
import { ThemeProvider } from '@/context/ThemeContext';
import { AuthProvider } from '../services/useAuth'; // ← ADD THIS

// Prevent the splash screen from auto-hiding until fonts (and any other assets) are loaded.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono/SpaceMono-Regular.ttf'),
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  // Wait for fonts (or other assets) before rendering
  if (!fontsLoaded) {
    return null;
  }

  return (
    <ThemeProvider>
      <AuthProvider> {/* ← ADD THIS */}
        {/* 
          This Stack wraps *all* routes. 
          headerShown: false turns off the default white bar everywhere. 
        */}
        <Stack screenOptions={{ headerShown: false }}>
          <Slot />
        </Stack>
      </AuthProvider> {/* ← ADD THIS */}
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}