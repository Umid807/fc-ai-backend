import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  View,
  StyleSheet,
  LayoutChangeEvent,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";

interface CardScanEffectProps {
  beamWidth?: number;
  speed?: number;
  angle?: string;
}

const CardScanEffect: React.FC<CardScanEffectProps> = ({
  beamWidth = 150,    // wider, softer beam
  speed = 5000,      // nice and slow
  angle = "0deg",   // keep that tilt
}) => {
  const scanAnim = useRef(new Animated.Value(0)).current;
  const [w, setW] = useState(0);
  const [h, setH] = useState(0);

  useEffect(() => {
    if (w > 0) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(scanAnim, {
            toValue: 1,
            duration: speed,
            useNativeDriver: true,
          }),
          Animated.timing(scanAnim, {
            toValue: 0,
            duration: 0,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
  }, [w, scanAnim, speed]);

  const translateX = scanAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-beamWidth, w + beamWidth],
  });

  const onLayout = (e: LayoutChangeEvent) => {
    setW(e.nativeEvent.layout.width);
    setH(e.nativeEvent.layout.height);
  };

  return (
    <View style={styles.wrapper} pointerEvents="none" onLayout={onLayout}>
      {w > 0 && (
        <Animated.View
          style={[
            styles.beam,
            {
              width: beamWidth,
              height: h * 2,
              top: -h,                // move above the card
              transform: [
                { translateX },
                { rotate: angle },
              ],
            },
          ]}
        >
          <LinearGradient
                        colors={[
                          
                          "rgba(255,255,255,0.1)",
                          "rgba(255,255,255,0.0)",
                          "rgba(255,255,255,0.1)",
                          
                        ]}
            locations={[0, 0.5, 1]}
            style={styles.gradient}
          />
        </Animated.View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    ...StyleSheet.absoluteFillObject,
    overflow: "hidden",
    borderRadius: 16,
  },
  beam: {
    position: "absolute",
    left: 0,
    zIndex: 10,
  },
  gradient: {
    flex: 1,
    borderRadius: 50, // fully rounded pill shape
  },
});

export default CardScanEffect;
