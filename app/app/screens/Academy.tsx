import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  Animated,
  StyleSheet,
  Easing,
  Dimensions,
  Image,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Accelerometer } from 'expo-sensors';
import { useIsFocused } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';

// Get device dimensions
const { width, height } = Dimensions.get('window');

const AcademyScreen = React.forwardRef((props, ref) => {
  const { t } = useTranslation();
  const router = useRouter();
  const isFocused = useIsFocused();

  // Intro zoom-in effect
  const containerScale = useRef(new Animated.Value(0.9)).current;

  // Animated opacity values for press effects
  const attackingOpacity = useRef(new Animated.Value(0)).current;
  const defendingOpacity = useRef(new Animated.Value(0)).current;

  // Text animation effects
  const attackingTextScale = useRef(new Animated.Value(1)).current;
  const defendingTextScale = useRef(new Animated.Value(1)).current;

  // Parallax effect
  const tiltAnim = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;

  useEffect(() => {
      secureLog("AcademyScreen mounted: Initializing zoom-in effect and accelerometer listener");
    Animated.timing(containerScale, {
      toValue: 1,
      duration: 600,
      easing: Easing.out(Easing.exp),
      useNativeDriver: true,
    }).start();

    Accelerometer.setUpdateInterval(16);
    const subscription = Accelerometer.addListener(({ x, y }) => {
      tiltAnim.setValue({ x: -x * 0.2, y: y * 0.2 });
    });

    secureLog("AcademyScreen unmounted: Accelerometer listener removed.");
    return () => subscription && subscription.remove();
  }, []);

  const handleAttackingPress = () => {
    logEvent("attack_button_pressed", { screen: "OffenseScreen" });
    router.push('/screens/OffenseScreen');
  }
  const handleDefendingPress = () => {
    logEvent("defense_button_pressed", { screen: "DefensiveFundamentals" });
    router.push('/screens/DefensiveFundamentals');
  }

  const animateSection = (overlayAnim, textScaleAnim, toValue, duration) => {
    Animated.parallel([
      Animated.timing(overlayAnim, {
        toValue: toValue === 1 ? 0.3 : 0,
        duration,
        easing: Easing.linear,
        useNativeDriver: false,
      }),
      Animated.timing(textScaleAnim, {
        toValue: toValue === 1 ? 1.1 : 1,
        duration,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start();
  };

  return (
    <Animated.View ref={ref} style={[styles.container, { transform: [{ scale: containerScale }] }]}>
      <Animated.View
        style={{
          flex: 1,
          transform: [{ translateX: tiltAnim.x }, { translateY: tiltAnim.y }],
        }}
      >
        <View style={styles.pitchContainer}>
          {/* Top Half - Attacking */}
          <View style={styles.halfContainer}>
            <Image
              source={require('../../assets/images/academy1.png')} // Background only version
              style={styles.backgroundImage}
              resizeMode="cover"
            />
            
            {/* Gradient Overlay for Better Text Readability */}
            <LinearGradient
              colors={['rgba(0,0,0,0.2)', 'rgba(0,0,0,0.1)', 'rgba(0,0,0,0.3)']}
              style={styles.gradientOverlay}
            />

            {/* Text Overlay */}
            <View style={styles.textContainer}>
              <Animated.Text 
                style={[
                  styles.sectionTitle,
                  styles.attackingTitle,
                  { transform: [{ scale: attackingTextScale }] }
                ]}
              >
                {t('academy_menu.master_attacking')}
              </Animated.Text>
              <Text style={[styles.sectionSubtitle, styles.attackingSubtitle]}>
                {t('academy_menu.attacking_subtitle')}
              </Text>
            </View>

            {/* Touch Area */}
            <TouchableOpacity
              style={styles.touchableContainer}
              activeOpacity={1}
              onPressIn={() => {
                secureLog("Attacking section animation started: onPressIn");
                animateSection(attackingOpacity, attackingTextScale, 1, 200);
              }}
              onPressOut={() => {
                secureLog("Attacking section animation ended: onPressOut");
                animateSection(attackingOpacity, attackingTextScale, 0, 300);
              }}
              onPress={handleAttackingPress}
            >
              <Animated.View style={[styles.pressOverlay, { opacity: attackingOpacity }]} />
            </TouchableOpacity>
          </View>

          {/* Divider Line */}
          <View style={styles.dividerContainer}>
            <LinearGradient
              colors={['transparent', '#39FF14', '#00FFFF', '#39FF14', 'transparent']}
              style={styles.dividerLine}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            />
          </View>

          {/* Bottom Half - Defending */}
          <View style={styles.halfContainer}>
            <Image
              source={require('../../assets/images/academy2.png')} // Background only version
              style={styles.backgroundImage}
              resizeMode="cover"
            />
            
            {/* Gradient Overlay for Better Text Readability */}
            <LinearGradient
              colors={['rgba(0,0,0,0.3)', 'rgba(0,0,0,0.1)', 'rgba(0,0,0,0.2)']}
              style={styles.gradientOverlay}
            />

            {/* Text Overlay */}
            <View style={styles.textContainer}>
              <Animated.Text 
                style={[
                  styles.sectionTitle,
                  styles.defendingTitle,
                  { transform: [{ scale: defendingTextScale }] }
                ]}
              >
                {t('academy_menu.master_defending')}
              </Animated.Text>
              <Text style={[styles.sectionSubtitle, styles.defendingSubtitle]}>
                {t('academy_menu.defending_subtitle')}
              </Text>
            </View>

            {/* Touch Area */}
            <TouchableOpacity
              style={styles.touchableContainer}
              activeOpacity={1}
              onPressIn={() => {
                secureLog("Defending section animation started: onPressIn");
                animateSection(defendingOpacity, defendingTextScale, 1, 200);
              }}
              onPressOut={() => {
                secureLog("Defending section animation ended: onPressOut");
                animateSection(defendingOpacity, defendingTextScale, 0, 300);
              }}
              onPress={handleDefendingPress}
            >
              <Animated.View style={[styles.pressOverlay, { opacity: defendingOpacity }]} />
            </TouchableOpacity>
          </View>
        </View>
      </Animated.View>
    </Animated.View>
  );
});

export default AcademyScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  pitchContainer: {
    flex: 1,
  },
  halfContainer: {
    height: (height - 4) * 0.5, // Subtract divider height and split perfectly
    width: '102%',
    justifyContent: 'center',
    left: -5,
    alignItems: 'center',
    overflow: 'hidden',
  },
  backgroundImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  gradientOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
  },
  dividerContainer: {
    height: 4,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  dividerLine: {
    height: 2,
    width: '80%',
    opacity: 0.8,
  },
  textContainer: {
    position: 'absolute',
    zIndex: 2,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    height: '100%',
  },
  sectionTitle: {
    fontSize: 32,
    fontWeight: '900',
    textAlign: 'center',
    letterSpacing: 3,
    marginBottom: 12,
    fontFamily: 'monospace', // Cool tech font
    textTransform: 'uppercase',
    textShadowOffset: { width: 3, height: 3 },
    textShadowRadius: 12,
  },
  attackingTitle: {
    color: '#00FFFF', // Bright cyan for contrast against orange/red background
    textShadowColor: 'rgba(0,255,255,0.8)',
  },
  defendingTitle: {
    color: '#00BFFF',
    textShadowColor: 'rgba(0,191,255,0.6)',
  },
  sectionSubtitle: {
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 2,
    opacity: 0.95,
    fontFamily: 'monospace', // Cool tech font
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 8,
    textShadowColor: 'rgba(0,0,0,0.9)',
  },
  attackingSubtitle: {
    color: '#FFFFFF', // Pure white for maximum contrast
  },
  defendingSubtitle: {
    color: '#39FF14',
  },
  touchableContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 3,
  },
  pressOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000',
  },
});
