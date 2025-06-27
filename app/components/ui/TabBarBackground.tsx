// fcassistant/components/ui/TabBarBackground.tsx
import React from 'react';
import { View, StyleSheet } from 'react-native';

interface TabBarBackgroundProps {
  backgroundColor?: string;
}

export default function TabBarBackground({
  backgroundColor = 'rgba(255, 255, 255, 0.9)',
}: TabBarBackgroundProps) {
  return <View style={[styles.background, { backgroundColor }]} />;
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
  },
});
