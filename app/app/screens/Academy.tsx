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
  console.log("AcademyScreen: Component rendering started.");

  const { t } = useTranslation();
  const router = useRouter();
  const isFocused = useIsFocused();
  console.log(`AcademyScreen: isFocused status updated to: ${isFocused}`);

  // Intro zoom-in effect
  const containerScale = useRef(new Animated.Value(0.9)).current;
  console.log("AcademyScreen: Initializing containerScale Animated.Value to 0.9.");

  // Animated opacity values for press effects
  const attackingOpacity = useRef(new Animated.Value(0)).current;
  const defendingOpacity = useRef(new Animated.Value(0)).current;
  console.log("AcademyScreen: Initializing attackingOpacity and defendingOpacity to 0.");

  // Text animation effects
  const attackingTextScale = useRef(new Animated.Value(1)).current;
  const defendingTextScale = useRef(new Animated.Value(1)).current;
  console.log("AcademyScreen: Initializing attackingTextScale and defendingTextScale to 1.");

  // Parallax effect
  const tiltAnim = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  console.log("AcademyScreen: Initializing tiltAnim Animated.ValueXY to {x: 0, y: 0}.");

  useEffect(() => {
    console.log("AcademyScreen: useEffect hook triggered. Starting intro zoom-in animation.");
    Animated.timing(containerScale, {
      toValue: 1,
      duration: 600,
      easing: Easing.out(Easing.exp),
      useNativeDriver: true,
    }).start(() => {
      console.log("AcademyScreen: Intro zoom-in animation completed.");
    });

    console.log("AcademyScreen: Setting Accelerometer update interval to 16ms for parallax effect.");
    Accelerometer.setUpdateInterval(16);
    let subscription;
    try {
      subscription = Accelerometer.addListener(({ x, y }) => {
        tiltAnim.setValue({ x: -x * 0.2, y: y * 0.2 });
      });
      console.log("AcademyScreen: Accelerometer listener added successfully for parallax effect.");
    } catch (error) {
      console.error(`AcademyScreen: Failed to add Accelerometer listener. Error: ${error.message}`);
    }

    return () => {
      console.log("AcademyScreen: useEffect cleanup triggered. Attempting to remove Accelerometer listener.");
      if (subscription) {
        subscription.remove();
        console.log("AcademyScreen: Accelerometer listener removed during cleanup.");
      } else {
        console.log("AcademyScreen: No Accelerometer subscription found to remove.");
      }
    };
  }, []);

  const handleAttackingPress = () => {
    console.log("AcademyScreen: Attacking section pressed. Initiating navigation to OffenseScreen.");
    router.push('/screens/OffenseScreen');
    console.log("AcademyScreen: Navigation to OffenseScreen completed.");
  };

  const handleDefendingPress = () => {
    console.log("AcademyScreen: Defending section pressed. Initiating navigation to DefensiveFundamentals.");
    router.push('/screens/DefensiveFundamentals');
    console.log("AcademyScreen: Navigation to DefensiveFundamentals completed.");
  };

  const animateSection = (overlayAnim, textScaleAnim, toValue, duration) => {
    console.log(`AcademyScreen: animateSection called. Target toValue: ${toValue}, Duration: ${duration}ms.`);
    Animated.parallel([
      Animated.timing(overlayAnim, {
        toValue: toValue === 1 ? 0.3 : 0, // Conditional opacity value
        duration,
        easing: Easing.linear,
        useNativeDriver: false,
      }),
      Animated.timing(textScaleAnim, {
        toValue: toValue === 1 ? 1.1 : 1, // Conditional text scale value
        duration,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start(() => {
      console.log(`AcademyScreen: Section animation for toValue ${toValue} completed.`);
    });
  };

  console.log("AcademyScreen: Rendering JSX elements for Academy menu.");
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
                console.log("AcademyScreen: Attacking section: onPressIn detected. Starting visual feedback animation.");
                animateSection(attackingOpacity, attackingTextScale, 1, 200);
              }}
              onPressOut={() => {
                console.log("AcademyScreen: Attacking section: onPressOut detected. Reverting visual feedback animation.");
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
            {console.log("AcademyScreen: Divider line rendered between sections.")}
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
                console.log("AcademyScreen: Defending section: onPressIn detected. Starting visual feedback animation.");
                animateSection(defendingOpacity, defendingTextScale, 1, 200);
              }}
              onPressOut={() => {
                console.log("AcademyScreen: Defending section: onPressOut detected. Reverting visual feedback animation.");
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
    height: (height - 4) * 0.5, // Subtract divider height and split
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