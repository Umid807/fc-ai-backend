import React, { useEffect, useRef } from 'react';
import { Animated, Text, StyleSheet, Dimensions } from 'react-native';

const { width } = Dimensions.get('window');

const TextBurst = ({ text, x = width / 2, y = 100, onComplete }: any) => {
  const opacity = useRef(new Animated.Value(1)).current;
  const translateY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -40,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 1000,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onComplete?.();
    });
  }, []);

  return (
    <Animated.View
      style={[
        styles.burst,
        {
          left: x - 60,
          top: y - 20,
          transform: [{ translateY }],
          opacity,
        },
      ]}
      pointerEvents="none"
    >
      <Text style={styles.burstText}>{text}</Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  burst: {
    position: 'absolute',
    zIndex: 9999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 10,
  },
  burstText: {
    color: '#FFD700',
    fontWeight: 'bold',
    fontSize: 14,
    textAlign: 'center',
  },
});

export default TextBurst;
