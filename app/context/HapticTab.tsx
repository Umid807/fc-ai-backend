// app/components/HapticTab.tsx
import React from 'react';
import { TouchableOpacity } from 'react-native';

export function HapticTab(props: any) {
  // For now, simply return a TouchableOpacity with the provided props.
  // Later, you can add haptic feedback functionality here.
  return <TouchableOpacity {...props} />;
}
