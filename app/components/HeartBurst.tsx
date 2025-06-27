import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';

interface Props {
  onComplete: () => void;
  x?: number;
  y?: number;
}

export default function HeartBurst({ onComplete, x = 0, y = 0 }: Props) {
  const scale = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.timing(scale, { toValue: 1.5, duration: 200, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 0, duration: 400, useNativeDriver: true }),
    ]).start(() => onComplete());
  }, []);

  return (
    <Animated.View
      style={[
        styles.heartContainer,
        {
          transform: [{ scale }],
          opacity,
          top: y - 20, // Adjusted to rise a bit
          left: x - 16, // Center horizontally around the click
        },
      ]}
    >
      <Text style={styles.heart}>❤️</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  heartContainer: {
    position: 'absolute',
    zIndex: 10,
  },
  heart: {
    fontSize: 32,
  },
});
