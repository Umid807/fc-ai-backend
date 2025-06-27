import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Vibration,
  Alert,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { secureLog } from '../../utils/security';

// Types
interface UndoState {
  content: string;
  timestamp: number;
  action: string;
}

interface ClearAllButtonProps {
  onClearAll: () => void;
  onUndo: () => void;
  undoState: UndoState | null;
  disabled: boolean;
}

// Constants
const UNDO_DISPLAY_DURATION = 30000; // 30 seconds
const COUNTDOWN_INTERVAL = 1000; // 1 second

const ClearAllButton: React.FC<ClearAllButtonProps> = ({
  onClearAll,
  onUndo,
  undoState,
  disabled,
}) => {
  const { t } = useTranslation();
  
  // State management
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [countdownSeconds, setCountdownSeconds] = useState(0);
  
  // Animation refs
  const buttonAnimation = useRef(new Animated.Value(1)).current;
  const undoAnimation = useRef(new Animated.Value(0)).current;
  const pulseAnimation = useRef(new Animated.Value(0)).current;
  const confirmAnimation = useRef(new Animated.Value(0)).current;
  
  // Animation tracking for cleanup
  const animationRefs = useRef<Animated.CompositeAnimation[]>([]);
  const pulseLoopRef = useRef<Animated.CompositeAnimation | null>(null);
  
  // Timer refs
  const countdownTimer = useRef<NodeJS.Timeout | null>(null);
  const confirmationTimer = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);
  
  // Comprehensive cleanup function
  const cleanupAnimations = useCallback(() => {
    try {
      // Stop all tracked animations
      animationRefs.current.forEach(animation => animation.stop());
      animationRefs.current = [];
      
      // Stop pulse loop specifically
      if (pulseLoopRef.current) {
        pulseLoopRef.current.stop();
        pulseLoopRef.current = null;
      }
      
      // Remove all listeners
      buttonAnimation.removeAllListeners();
      undoAnimation.removeAllListeners();
      pulseAnimation.removeAllListeners();
      confirmAnimation.removeAllListeners();
      
      // Reset animation values to prevent memory leaks
      buttonAnimation.setValue(1);
      undoAnimation.setValue(0);
      pulseAnimation.setValue(0);
      confirmAnimation.setValue(0);
    } catch (error) {
      secureLog('Animation cleanup error', { 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  }, [buttonAnimation, undoAnimation, pulseAnimation, confirmAnimation]);
  
  // Enhanced cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;
    
    return () => {
      isMountedRef.current = false;
      
      // Clear all timers
      if (countdownTimer.current) {
        clearInterval(countdownTimer.current);
        countdownTimer.current = null;
      }
      
      if (confirmationTimer.current) {
        clearTimeout(confirmationTimer.current);
        confirmationTimer.current = null;
      }
      
      // Cleanup animations
      cleanupAnimations();
    };
  }, [cleanupAnimations]);
  
  // Handle undo state changes
  useEffect(() => {
    if (undoState) {
      // Start countdown
      const remainingTime = UNDO_DISPLAY_DURATION - (Date.now() - undoState.timestamp);
      const seconds = Math.max(0, Math.ceil(remainingTime / 1000));
      setCountdownSeconds(seconds);
      
      // Animate undo button in
      const undoInAnimation = Animated.spring(undoAnimation, {
        toValue: 1,
        useNativeDriver: true,
        tension: 150,
        friction: 8,
      });
      
      animationRefs.current.push(undoInAnimation);
      undoInAnimation.start();
      
      // Start countdown timer
      countdownTimer.current = setInterval(() => {
        if (!isMountedRef.current) return;
        
        const newRemainingTime = UNDO_DISPLAY_DURATION - (Date.now() - undoState.timestamp);
        const newSeconds = Math.max(0, Math.ceil(newRemainingTime / 1000));
        
        setCountdownSeconds(newSeconds);
        
        if (newSeconds <= 0) {
          // Time's up, hide undo button
          const undoOutAnimation = Animated.spring(undoAnimation, {
            toValue: 0,
            useNativeDriver: true,
            tension: 150,
            friction: 8,
          });
          
          animationRefs.current.push(undoOutAnimation);
          undoOutAnimation.start();
          
          if (countdownTimer.current) {
            clearInterval(countdownTimer.current);
            countdownTimer.current = null;
          }
        }
      }, COUNTDOWN_INTERVAL);
      
      secureLog('Undo state activated', {
        remainingTime: seconds,
        hasContent: !!undoState.content,
        action: undoState.action,
      });
    } else {
      // Hide undo button
      const undoOutAnimation = Animated.spring(undoAnimation, {
        toValue: 0,
        useNativeDriver: true,
        tension: 150,
        friction: 8,
      });
      
      animationRefs.current.push(undoOutAnimation);
      undoOutAnimation.start();
      
      if (countdownTimer.current) {
        clearInterval(countdownTimer.current);
        countdownTimer.current = null;
      }
    }
  }, [undoState, undoAnimation]);
  
  // Start pulse animation loop for confirmation state
  useEffect(() => {
    if (showConfirmation) {
      const startPulse = () => {
        const pulseLoop = Animated.loop(
          Animated.sequence([
            Animated.timing(pulseAnimation, {
              toValue: 1,
              duration: 800,
              useNativeDriver: true,
            }),
            Animated.timing(pulseAnimation, {
              toValue: 0,
              duration: 800,
              useNativeDriver: true,
            }),
          ])
        );
        
        pulseLoopRef.current = pulseLoop;
        pulseLoop.start();
      };
      
      startPulse();
      
      // Auto-hide confirmation after 5 seconds
      confirmationTimer.current = setTimeout(() => {
        if (isMountedRef.current) {
          setShowConfirmation(false);
          animateConfirmation(false);
        }
      }, 5000);
      
      return () => {
        if (confirmationTimer.current) {
          clearTimeout(confirmationTimer.current);
          confirmationTimer.current = null;
        }
        if (pulseLoopRef.current) {
          pulseLoopRef.current.stop();
          pulseLoopRef.current = null;
        }
      };
    } else {
      // Stop pulse animation when hiding confirmation
      if (pulseLoopRef.current) {
        pulseLoopRef.current.stop();
        pulseLoopRef.current = null;
      }
    }
  }, [showConfirmation, pulseAnimation]);
  
  // Animation helpers
  const animateButtonPress = useCallback(() => {
    const pressAnimation = Animated.sequence([
      Animated.timing(buttonAnimation, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(buttonAnimation, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]);
    
    animationRefs.current.push(pressAnimation);
    pressAnimation.start();
  }, [buttonAnimation]);
  
  const animateConfirmation = useCallback((show: boolean) => {
    const confirmationAnimation = Animated.spring(confirmAnimation, {
      toValue: show ? 1 : 0,
      useNativeDriver: true,
      tension: 150,
      friction: 8,
    });
    
    animationRefs.current.push(confirmationAnimation);
    confirmationAnimation.start();
  }, [confirmAnimation]);
  
  // Handle clear button press
  const handleClearPress = useCallback(() => {
    if (disabled) return;
    
    try {
      animateButtonPress();
      Vibration.vibrate(50);
      
      if (!showConfirmation) {
        // Show confirmation
        setShowConfirmation(true);
        animateConfirmation(true);
        
        secureLog('Clear confirmation requested', {
          timestamp: Date.now(),
        });
      } else {
        // Confirm clear action
        onClearAll();
        setShowConfirmation(false);
        animateConfirmation(false);
        Vibration.vibrate([100, 50, 100]);
        
        secureLog('Content cleared', {
          confirmed: true,
          timestamp: Date.now(),
        });
      }
    } catch (error) {
      secureLog('Clear button error', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }, [disabled, showConfirmation, animateButtonPress, animateConfirmation, onClearAll]);
  
  // Handle undo button press
  const handleUndoPress = useCallback(() => {
    if (!undoState) return;
    
    try {
      onUndo();
      Vibration.vibrate(30);
      
      // Hide undo button immediately
      const undoOutAnimation = Animated.spring(undoAnimation, {
        toValue: 0,
        useNativeDriver: true,
        tension: 150,
        friction: 8,
      });
      
      animationRefs.current.push(undoOutAnimation);
      undoOutAnimation.start();
      
      if (countdownTimer.current) {
        clearInterval(countdownTimer.current);
        countdownTimer.current = null;
      }
      
      secureLog('Undo action executed', {
        hasContent: !!undoState.content,
        timeSinceClear: Date.now() - undoState.timestamp,
      });
    } catch (error) {
      secureLog('Undo button error', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }, [undoState, onUndo, undoAnimation]);
  
  // Handle cancel confirmation
  const handleCancelConfirmation = useCallback(() => {
    try {
      setShowConfirmation(false);
      animateConfirmation(false);
      Vibration.vibrate(30);
      
      secureLog('Clear confirmation cancelled', {
        timestamp: Date.now(),
      });
    } catch (error) {
      secureLog('Cancel confirmation error', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }, [animateConfirmation]);
  
  // Format countdown display
  const formatCountdown = useCallback((seconds: number): string => {
    if (seconds <= 0) return '0s';
    return seconds < 60 ? `${seconds}s` : `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
  }, []);
  
  // Safe translation helper
  const safeTranslate = useCallback((key: string, fallback: string): string => {
    try {
      const translated = t(key);
      return translated === key ? fallback : translated;
    } catch (error) {
      return fallback;
    }
  }, [t]);
  
  try {
    return (
      <View style={styles.container}>
        {/* Clear All Button */}
        <Animated.View
          style={[
            styles.buttonContainer,
            {
              transform: [{ scale: buttonAnimation }],
              opacity: disabled ? 0.5 : 1,
            },
          ]}
        >
          <TouchableOpacity
            style={[
              styles.clearButton,
              showConfirmation && styles.confirmationButton,
            ]}
            onPress={handleClearPress}
            disabled={disabled}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel={showConfirmation 
              ? safeTranslate('clearAllButton.confirmClearAccessibility', 'Confirm clear all content')
              : safeTranslate('clearAllButton.clearAllAccessibility', 'Clear all content')
            }
            accessibilityState={{ 
              disabled: disabled,
              selected: showConfirmation 
            }}
            accessibilityHint={showConfirmation 
              ? safeTranslate('clearAllButton.confirmHint', 'Tap to confirm clearing all content, or tap cancel to abort')
              : safeTranslate('clearAllButton.clearHint', 'Tap to clear all content with confirmation step')
            }
          >
            <LinearGradient
              colors={
                showConfirmation
                  ? ['rgba(255, 99, 71, 0.8)', 'rgba(255, 69, 0, 0.6)']
                  : ['rgba(255, 99, 71, 0.2)', 'rgba(255, 99, 71, 0.1)']
              }
              style={styles.buttonGradient}
            >
              <Animated.View
                style={[
                  styles.buttonContent,
                  {
                    shadowOpacity: showConfirmation
                      ? pulseAnimation.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0.3, 0.8],
                        })
                      : 0.3,
                  },
                ]}
              >
                <Ionicons
                  name={showConfirmation ? "warning" : "trash-bin"}
                  size={16}
                  color={showConfirmation ? "#FFD700" : "#FF6347"}
                />
                <Text style={[
                  styles.buttonText,
                  showConfirmation && styles.confirmationText,
                ]}>
                  {showConfirmation 
                    ? safeTranslate('common.confirmClear', 'Confirm Clear') 
                    : safeTranslate('textEditor.clearAll', 'Clear All')
                  }
                </Text>
              </Animated.View>
            </LinearGradient>
          </TouchableOpacity>
          
          {/* Cancel Confirmation Button */}
          {showConfirmation && (
            <Animated.View
              style={[
                styles.cancelContainer,
                {
                  transform: [
                    {
                      scale: confirmAnimation.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.8, 1],
                      }),
                    },
                  ],
                  opacity: confirmAnimation,
                },
              ]}
            >
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={handleCancelConfirmation}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel={safeTranslate('clearAllButton.cancelAccessibility', 'Cancel clear action')}
                accessibilityHint={safeTranslate('clearAllButton.cancelHint', 'Tap to cancel the clear action')}
              >
                <LinearGradient
                  colors={['rgba(0, 255, 255, 0.2)', 'rgba(0, 255, 255, 0.1)']}
                  style={styles.cancelGradient}
                >
                  <Ionicons name="close" size={14} color="#00FFFF" />
                  <Text style={styles.cancelText}>
                    {safeTranslate('common.cancel', 'Cancel')}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            </Animated.View>
          )}
        </Animated.View>
        
        {/* Undo Button - FIXED: Smaller size and better positioning */}
        {undoState && (
          <Animated.View
            style={[
              styles.undoContainer,
              {
                transform: [
                  {
                    translateY: undoAnimation.interpolate({
                      inputRange: [0, 1],
                      outputRange: [30, 0], // FIXED: Reduced from 50 to 30
                    }),
                  },
                  { scale: undoAnimation },
                ],
                opacity: undoAnimation,
              },
            ]}
          >
            <TouchableOpacity
              style={styles.undoButton}
              onPress={handleUndoPress}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel={safeTranslate('clearAllButton.undoAccessibility', 'Undo clear action')}
              accessibilityState={{ disabled: !undoState }}
              accessibilityHint={safeTranslate('clearAllButton.undoHint', `Tap to undo the clear action. Time remaining: ${formatCountdown(countdownSeconds)}`)}
            >
              <LinearGradient
                colors={['rgba(50, 205, 50, 0.8)', 'rgba(34, 139, 34, 0.6)']}
                style={styles.undoGradient}
              >
                <View style={styles.undoContent}>
                  <Ionicons name="arrow-undo" size={6} color="#FFFFFF" /> {/* FIXED: Reduced from 16 to 14 */}
                  <Text style={styles.undoText}>
                    {safeTranslate('common.undo', 'Undo')}
                  </Text>
                  <View style={styles.countdownContainer}>
                    <Text style={styles.countdownText}>
                      {formatCountdown(countdownSeconds)}
                    </Text>
                  </View>
                </View>
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>
        )}
      </View>
    );
  } catch (error) {
    secureLog('ClearAllButton render error', {
      error: error instanceof Error ? error.message : 'Unknown error',
      hasUndoState: !!undoState,
      disabled,
    });
    
    // Fallback UI
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>
          {safeTranslate('clearAllButton.errorFallback', 'Clear button unavailable')}
        </Text>
      </View>
    );
  }
};

export default ClearAllButton;

/* ----------------- GAMING STYLES - ENHANCED ----------------- */
const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginVertical: 8,
  },
  buttonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  clearButton: {
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 99, 71, 0.3)',
    shadowColor: '#FF6347',
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    shadowOpacity: 0.3,
    elevation: 0,
  },
  confirmationButton: {
    borderColor: '#FFD700',
    shadowColor: '#FFD700',
    shadowOpacity: 0.6,
    shadowRadius: 8,
  },
  buttonGradient: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    shadowColor: '#FF6347',
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 4,
  },
  buttonText: {
    color: '#FF6347',
    fontSize: 14,
    fontWeight: '600',
  },
  confirmationText: {
    color: '#FFD700',
    fontWeight: 'bold',
  },
  cancelContainer: {
    marginLeft: 4,
  },
  cancelButton: {
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 255, 0.3)',
  },
  cancelGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 4,
  },
  cancelText: {
    color: '#00FFFF',
    fontSize: 12,
    fontWeight: '500',
  },
undoContainer: {
  position: 'absolute',
  top: 5,
  right: 10, // Position to the right side
  zIndex: 1000,
},
  undoButton: {
    borderRadius: 8, // FIXED: Reduced from 12 to 8 for more compact look
    overflow: 'hidden',
    borderWidth: 1.5, // FIXED: Reduced from 2 to 1.5
    borderColor: '#32CD32',
    shadowColor: '#32CD32',
    shadowOffset: { width: 0, height: 2 }, // FIXED: Reduced shadow
    shadowRadius: 4, // FIXED: Reduced from 8 to 4
    shadowOpacity: 0.4, // FIXED: Reduced from 0.6 to 0.4
    elevation: 0,
  },
  undoGradient: {
    paddingHorizontal: 2, // FIXED: Reduced from 20 to 12
    paddingVertical: 2, // FIXED: Reduced from 12 to 8
  },
  undoContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6, // FIXED: Reduced from 10 to 6
  },
  undoText: {
    color: '#FFFFFF',
    fontSize: 14, // FIXED: Reduced from 16 to 14
    fontWeight: '600', // FIXED: Reduced from 'bold' to '600'
  },
  countdownContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 6, // FIXED: Reduced from 8 to 6
    paddingVertical: 3, // FIXED: Reduced from 4 to 3
    borderRadius: 4, // FIXED: Reduced from 6 to 4
    marginLeft: 2, // FIXED: Reduced from 4 to 2
  },
  countdownText: {
    color: '#FFFFFF',
    fontSize: 11, // FIXED: Reduced from 12 to 11
    fontWeight: '600',
    minWidth: 20, // FIXED: Reduced from 24 to 20
    textAlign: 'center',
  },
  errorText: {
    color: '#FF6347',
    fontSize: 12,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});