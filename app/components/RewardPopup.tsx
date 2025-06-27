import React, { useEffect, useRef } from 'react';
import { Animated, View, Text, StyleSheet, Image } from 'react-native';

interface RewardPopupProps {
  amount: number;
  type: 'xp' | 'coins' | 'rep';
  onComplete?: () => void;
}

const rewardIcons = {
  xp: require('../assets/icons/xpIcon.png'),
  coins: require('../assets/icons/coin.png'),
  rep: require('../assets/icons/rep.png'),
};

const RewardPopup = ({ amount, type, onComplete }: RewardPopupProps) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const moveAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(moveAnim, {
        toValue: -30, // Move up slightly
        duration: 1500,
        useNativeDriver: true,
      }),
    ]).start(() => {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
        delay: 500,
      }).start(() => onComplete && onComplete());
    });
  }, []);

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: fadeAnim,
          transform: [{ translateY: moveAnim }],
        },
      ]}
    >
      <Image source={rewardIcons[type]} style={styles.icon} />
      <Text style={styles.text}>+{amount} {(type || '').toUpperCase()}</Text>

    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    alignSelf: 'center',
    top: 100,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(71, 68, 68, 0.05)',
    borderRadius: 20,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
    
  },
  icon: {
    width: 40,
    height: 40,
    marginRight: 8,
  },
text: {
  color: "#FFD700", // Golden color for better coin vibe
  fontWeight: "bold",
  fontSize: 20,
  textShadowColor: "#000",
  textShadowOffset: { width: 1, height: 1 },
  textShadowRadius: 2,
},

});

export default RewardPopup;
