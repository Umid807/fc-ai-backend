import React, { useEffect, useRef, memo, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  Platform,
  StatusBar,
  AppState,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';

// Types
interface LoadingScreenProps {
  message?: string;
  submessage?: string;
  showProgress?: boolean;
  progress?: number; // 0-100
  timeout?: number; // Auto-hide after timeout (ms)
  onTimeout?: () => void;
  variant?: 'default' | 'minimal' | 'splash' | 'inline';
  showTips?: boolean;
  customIcon?: string;
  testID?: string;
}

interface LoadingTip {
  id: string;
  text: string;
  icon: string;
}

// Constants
const SCREEN_WIDTH = Dimensions.get('window').width;
const SCREEN_HEIGHT = Dimensions.get('window').height;
const ANIMATION_DURATION = 1500;
const TIP_ROTATION_INTERVAL = 4000;
const PROGRESS_ANIMATION_DURATION = 300;

// Loading tips for better UX during long loads
const LOADING_TIPS: LoadingTip[] = [
  {
    id: 'tip1',
    text: 'Double-tap posts to quickly like them! ❤️',
    icon: 'heart-outline',
  },
  {
    id: 'tip2',
    text: 'Use @ to mention other users in comments',
    icon: 'at-outline',
  },
  {
    id: 'tip3',
    text: 'Long press emojis for skin tone options',
    icon: 'happy-outline',
  },
  {
    id: 'tip4',
    text: 'Swipe left on comments to quickly reply',
    icon: 'chatbubble-outline',
  },
  {
    id: 'tip5',
    text: 'Save posts to read later with the bookmark icon',
    icon: 'bookmark-outline',
  },
  {
    id: 'tip6',
    text: 'Join the VIP program for exclusive features!',
    icon: 'star-outline',
  },
  {
    id: 'tip7',
    text: 'Report inappropriate content to keep our community safe',
    icon: 'shield-outline',
  },
  {
    id: 'tip8',
    text: 'Dark mode is easier on your eyes during night browsing',
    icon: 'moon-outline',
  },
];

const LoadingScreen: React.FC<LoadingScreenProps> = ({
  message = 'Loading...',
  submessage,
  showProgress = false,
  progress = 0,
  timeout,
  onTimeout,
  variant = 'default',
  showTips = true,
  customIcon,
  testID = 'loading-screen',
}) => {
  // Animation values
  const spinValue = useRef(new Animated.Value(0)).current;
  const fadeValue = useRef(new Animated.Value(0)).current;
  const scaleValue = useRef(new Animated.Value(0.8)).current;
  const progressValue = useRef(new Animated.Value(0)).current;
  const tipFadeValue = useRef(new Animated.Value(0)).current;
  const pulseValue = useRef(new Animated.Value(1)).current;

  // State
  const [currentTipIndex, setCurrentTipIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(true);
  const [appState, setAppState] = useState(AppState.currentState);

  // Refs
  const spinAnimationRef = useRef<Animated.CompositeAnimation>();
  const tipIntervalRef = useRef<NodeJS.Timeout>();
  const timeoutRef = useRef<NodeJS.Timeout>();
  const pulseAnimationRef = useRef<Animated.CompositeAnimation>();
  const isMountedRef = useRef(true);

  // ================================================================
  // ANIMATION CONTROLLERS
  // ================================================================

  const startSpinAnimation = useCallback(() => {
    spinValue.setValue(0);
    
    spinAnimationRef.current = Animated.loop(
      Animated.timing(spinValue, {
        toValue: 1,
        duration: ANIMATION_DURATION,
        useNativeDriver: true,
      })
    );
    
    spinAnimationRef.current.start();
  }, [spinValue]);

  const startPulseAnimation = useCallback(() => {
    pulseAnimationRef.current = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseValue, {
          toValue: 1.1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulseValue, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );
    
    pulseAnimationRef.current.start();
  }, [pulseValue]);

  const startEntranceAnimation = useCallback(() => {
    // Reset values
    fadeValue.setValue(0);
    scaleValue.setValue(0.8);

    // Stagger the entrance animations
    Animated.parallel([
      Animated.timing(fadeValue, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(scaleValue, {
        toValue: 1,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeValue, scaleValue]);

  const animateProgress = useCallback((newProgress: number) => {
    Animated.timing(progressValue, {
      toValue: newProgress / 100,
      duration: PROGRESS_ANIMATION_DURATION,
      useNativeDriver: false,
    }).start();
  }, [progressValue]);

  const rotateTips = useCallback(() => {
    if (!showTips || !isMountedRef.current) return;

    // Fade out current tip
    Animated.timing(tipFadeValue, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      if (!isMountedRef.current) return;

      // Change tip
      setCurrentTipIndex((prev) => (prev + 1) % LOADING_TIPS.length);

      // Fade in new tip
      Animated.timing(tipFadeValue, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }).start();
    });
  }, [showTips, tipFadeValue]);

  // ================================================================
  // LIFECYCLE & EFFECTS
  // ================================================================

  useEffect(() => {
    isMountedRef.current = true;

    // Start animations
    startSpinAnimation();
    startEntranceAnimation();
    
    if (variant !== 'minimal') {
      startPulseAnimation();
    }

    // Setup tip rotation
    if (showTips && variant === 'default') {
      tipFadeValue.setValue(1);
      tipIntervalRef.current = setInterval(rotateTips, TIP_ROTATION_INTERVAL);
    }

    // Setup timeout
    if (timeout && onTimeout) {
      timeoutRef.current = setTimeout(() => {
        if (isMountedRef.current) {
          onTimeout();
        }
      }, timeout);
    }

    return () => {
      isMountedRef.current = false;
      
      // Clean up animations
      if (spinAnimationRef.current) {
        spinAnimationRef.current.stop();
      }
      if (pulseAnimationRef.current) {
        pulseAnimationRef.current.stop();
      }

      // Clean up timers
      if (tipIntervalRef.current) {
        clearInterval(tipIntervalRef.current);
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [
    startSpinAnimation,
    startEntranceAnimation,
    startPulseAnimation,
    rotateTips,
    showTips,
    variant,
    timeout,
    onTimeout,
  ]);

  // Update progress animation
  useEffect(() => {
    if (showProgress) {
      animateProgress(progress);
    }
  }, [progress, showProgress, animateProgress]);

  // Handle app state changes
  useEffect(() => {
    const handleAppStateChange = (nextAppState: string) => {
      setAppState(nextAppState);
      
      if (nextAppState === 'background') {
        // Pause animations when app goes to background
        if (spinAnimationRef.current) {
          spinAnimationRef.current.stop();
        }
        if (pulseAnimationRef.current) {
          pulseAnimationRef.current.stop();
        }
      } else if (nextAppState === 'active') {
        // Resume animations when app becomes active
        startSpinAnimation();
        if (variant !== 'minimal') {
          startPulseAnimation();
        }
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription?.remove();
  }, [startSpinAnimation, startPulseAnimation, variant]);

  // ================================================================
  // COMPUTED VALUES
  // ================================================================

  const spinInterpolation = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const currentTip = LOADING_TIPS[currentTipIndex];

  // ================================================================
  // RENDER VARIANTS
  // ================================================================

  const renderSpinner = () => {
    const iconName = customIcon || (variant === 'splash' ? 'flash' : 'sync');
    
    return (
      <Animated.View
        style={[
          styles.spinnerContainer,
          {
            transform: [
              { rotate: spinInterpolation },
              { scale: pulseValue },
            ],
          },
        ]}
      >
        <LinearGradient
          colors={['#00FFFF', '#6A5ACD', '#00FFFF']}
          style={styles.spinnerGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Ionicons 
            name={iconName as any} 
            size={variant === 'inline' ? 24 : 32} 
            color="#000" 
          />
        </LinearGradient>
      </Animated.View>
    );
  };

  const renderProgressBar = () => {
    if (!showProgress) return null;

    return (
      <View style={styles.progressContainer}>
        <View style={styles.progressTrack}>
          <Animated.View
            style={[
              styles.progressFill,
              {
                width: progressValue.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['0%', '100%'],
                }),
              },
            ]}
          />
        </View>
        <Text style={styles.progressText}>
          {Math.round(progress)}%
        </Text>
      </View>
    );
  };

  const renderLoadingTip = () => {
    if (!showTips || variant !== 'default' || !currentTip) return null;

    return (
      <Animated.View
        style={[
          styles.tipContainer,
          { opacity: tipFadeValue },
        ]}
      >
        <View style={styles.tipContent}>
          <Ionicons 
            name={currentTip.icon as any} 
            size={16} 
            color="#00FFFF" 
            style={styles.tipIcon}
          />
          <Text style={styles.tipText}>{currentTip.text}</Text>
        </View>
      </Animated.View>
    );
  };

  const renderMinimalVariant = () => (
    <View style={styles.minimalContainer}>
      {renderSpinner()}
      <Text style={styles.minimalText}>{message}</Text>
    </View>
  );

  const renderInlineVariant = () => (
    <View style={styles.inlineContainer}>
      {renderSpinner()}
      <Text style={styles.inlineText}>{message}</Text>
    </View>
  );

  const renderSplashVariant = () => (
    <View style={styles.splashContainer}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />
      
      {/* Background with animated gradient */}
      <LinearGradient
        colors={['#000', '#1a1a2e', '#16213e', '#0f3460']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      {/* Animated particles/stars */}
      <View style={styles.particlesContainer}>
        {Array.from({ length: 20 }, (_, index) => (
          <Animated.View
            key={index}
            style={[
              styles.particle,
              {
                left: `${(index * 37) % 100}%`,
                top: `${(index * 23) % 100}%`,
                opacity: fadeValue.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, Math.random() * 0.8 + 0.2],
                }),
                transform: [
                  {
                    scale: scaleValue.interpolate({
                      inputRange: [0.8, 1],
                      outputRange: [0.5, 1],
                    }),
                  },
                ],
              },
            ]}
          />
        ))}
      </View>

      {/* Main content */}
      <Animated.View
        style={[
          styles.splashContent,
          {
            opacity: fadeValue,
            transform: [{ scale: scaleValue }],
          },
        ]}
      >
        {renderSpinner()}
        
        <Text style={styles.splashTitle}>FC25 Locker</Text>
        <Text style={styles.splashSubtitle}>Loading your gaming experience...</Text>
        
        {renderProgressBar()}
      </Animated.View>

      {renderLoadingTip()}
    </View>
  );

  const renderDefaultVariant = () => (
    <View style={styles.defaultContainer}>
      <LinearGradient
        colors={['rgba(0,0,0,0.9)', 'rgba(0,0,0,0.95)', 'rgba(0,0,0,0.9)']}
        style={StyleSheet.absoluteFill}
      />

      <Animated.View
        style={[
          styles.defaultContent,
          {
            opacity: fadeValue,
            transform: [{ scale: scaleValue }],
          },
        ]}
      >
        {renderSpinner()}
        
        <Text style={styles.defaultMessage}>{message}</Text>
        
        {submessage && (
          <Text style={styles.defaultSubmessage}>{submessage}</Text>
        )}
        
        {renderProgressBar()}
      </Animated.View>

      {renderLoadingTip()}
    </View>
  );

  // ================================================================
  // MAIN RENDER
  // ================================================================

  if (!isVisible) return null;

  // Render based on variant
  switch (variant) {
    case 'minimal':
      return renderMinimalVariant();
    case 'inline':
      return renderInlineVariant();
    case 'splash':
      return renderSplashVariant();
    default:
      return renderDefaultVariant();
  }
};

// ================================================================
// STYLES
// ================================================================

const styles = StyleSheet.create({
  // Spinner
  spinnerContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginBottom: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  spinnerGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Progress
  progressContainer: {
    width: '80%',
    marginTop: 20,
    alignItems: 'center',
  },
  progressTrack: {
    width: '100%',
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#00FFFF',
    borderRadius: 2,
  },
  progressText: {
    color: '#00FFFF',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 8,
  },

  // Tips
  tipContainer: {
    position: 'absolute',
    bottom: 80,
    left: 20,
    right: 20,
    alignItems: 'center',
  },
  tipContent: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 255, 0.3)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    maxWidth: '90%',
  },
  tipIcon: {
    marginRight: 8,
  },
  tipText: {
    color: '#fff',
    fontSize: 14,
    textAlign: 'center',
    flex: 1,
  },

  // Minimal Variant
  minimalContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  minimalText: {
    color: '#fff',
    fontSize: 16,
    marginLeft: 12,
  },

  // Inline Variant
  inlineContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  inlineText: {
    color: '#fff',
    fontSize: 14,
    marginLeft: 8,
  },

  // Splash Variant
  splashContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  particlesContainer: {
    ...StyleSheet.absoluteFillObject,
  },
  particle: {
    position: 'absolute',
    width: 2,
    height: 2,
    backgroundColor: '#00FFFF',
    borderRadius: 1,
  },
  splashContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  splashTitle: {
    color: '#fff',
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  splashSubtitle: {
    color: '#999',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
  },

  // Default Variant
  defaultContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  defaultContent: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  defaultMessage: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 8,
  },
  defaultSubmessage: {
    color: '#999',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default memo(LoadingScreen);