import React, { useEffect, useRef, memo, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  Platform,
  StatusBar,
  ScrollView,
  Alert,
  Linking,
  Share,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import { BlurView } from 'expo-blur';

// Types
interface ErrorScreenProps {
  error: string | Error;
  onRetry?: () => void;
  onBack?: () => void;
  onReportError?: (errorDetails: ErrorReport) => void;
  variant?: 'fullscreen' | 'modal' | 'inline' | 'overlay';
  showRetry?: boolean;
  showBack?: boolean;
  showReport?: boolean;
  showDetails?: boolean;
  retryText?: string;
  backText?: string;
  customActions?: ErrorAction[];
  errorCode?: string;
  timestamp?: Date;
  testID?: string;
}

interface ErrorAction {
  id: string;
  label: string;
  icon: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
}

interface ErrorReport {
  error: string;
  errorCode?: string;
  timestamp: Date;
  userAgent: string;
  platform: string;
  screenInfo: {
    width: number;
    height: number;
  };
}

interface ErrorType {
  type: 'network' | 'server' | 'permission' | 'validation' | 'unknown';
  icon: string;
  title: string;
  description: string;
  suggestions: string[];
  primaryAction?: string;
}

// Constants
const SCREEN_WIDTH = Dimensions.get('window').width;
const SCREEN_HEIGHT = Dimensions.get('window').height;
const ANIMATION_DURATION = 600;
const SHAKE_ANIMATION_DURATION = 500;

// Error type definitions for better UX
const ERROR_TYPES: { [key: string]: ErrorType } = {
  // Network Errors
  'network': {
    type: 'network',
    icon: 'wifi-outline',
    title: 'Connection Problem',
    description: 'Unable to connect to our servers. Please check your internet connection.',
    suggestions: [
      'Check your Wi-Fi or mobile data connection',
      'Try switching between Wi-Fi and mobile data',
      'Restart your router if using Wi-Fi',
      'Move to an area with better signal strength'
    ],
    primaryAction: 'Try Again',
  },
  'timeout': {
    type: 'network',
    icon: 'time-outline',
    title: 'Request Timeout',
    description: 'The request took too long to complete. This might be due to slow internet.',
    suggestions: [
      'Check your internet speed',
      'Try again in a few moments',
      'Switch to a more stable connection'
    ],
    primaryAction: 'Retry',
  },
  'offline': {
    type: 'network',
    icon: 'cloud-offline-outline',
    title: 'You\'re Offline',
    description: 'No internet connection detected. Some features may not be available.',
    suggestions: [
      'Connect to Wi-Fi or enable mobile data',
      'Check airplane mode settings',
      'Some content may be available offline'
    ],
    primaryAction: 'Check Connection',
  },

  // Server Errors
  'server': {
    type: 'server',
    icon: 'server-outline',
    title: 'Server Error',
    description: 'Our servers are experiencing issues. We\'re working to fix this.',
    suggestions: [
      'Try again in a few minutes',
      'Check our status page for updates',
      'Contact support if the problem persists'
    ],
    primaryAction: 'Try Again',
  },
  '404': {
    type: 'server',
    icon: 'search-outline',
    title: 'Content Not Found',
    description: 'The content you\'re looking for doesn\'t exist or has been moved.',
    suggestions: [
      'Check the URL for typos',
      'The content may have been deleted',
      'Try searching for what you need'
    ],
    primaryAction: 'Go Back',
  },
  '403': {
    type: 'permission',
    icon: 'lock-closed-outline',
    title: 'Access Denied',
    description: 'You don\'t have permission to access this content.',
    suggestions: [
      'Log in to your account',
      'Check if you have the required permissions',
      'Contact support for access'
    ],
    primaryAction: 'Sign In',
  },
  '500': {
    type: 'server',
    icon: 'warning-outline',
    title: 'Internal Server Error',
    description: 'Something went wrong on our end. We\'ve been notified.',
    suggestions: [
      'Try again in a few minutes',
      'The issue has been reported to our team',
      'Check our status page for updates'
    ],
    primaryAction: 'Retry',
  },

  // Permission Errors
  'permission': {
    type: 'permission',
    icon: 'shield-outline',
    title: 'Permission Required',
    description: 'This action requires additional permissions.',
    suggestions: [
      'Grant the required permissions in settings',
      'Log in to your account',
      'Upgrade your account for access'
    ],
    primaryAction: 'Grant Permission',
  },

  // Validation Errors
  'validation': {
    type: 'validation',
    icon: 'alert-circle-outline',
    title: 'Invalid Input',
    description: 'Please check your input and try again.',
    suggestions: [
      'Review the form for errors',
      'Ensure all required fields are filled',
      'Check input format requirements'
    ],
    primaryAction: 'Fix Input',
  },

  // Default/Unknown
  'unknown': {
    type: 'unknown',
    icon: 'help-circle-outline',
    title: 'Something Went Wrong',
    description: 'An unexpected error occurred. We\'re looking into it.',
    suggestions: [
      'Try refreshing the page',
      'Restart the app',
      'Contact support if the problem continues'
    ],
    primaryAction: 'Try Again',
  },
};

const ErrorScreen: React.FC<ErrorScreenProps> = ({
  error,
  onRetry,
  onBack,
  onReportError,
  variant = 'fullscreen',
  showRetry = true,
  showBack = true,
  showReport = true,
  showDetails = false,
  retryText = 'Try Again',
  backText = 'Go Back',
  customActions = [],
  errorCode,
  timestamp = new Date(),
  testID = 'error-screen',
}) => {
  // Animation values
  const fadeValue = useRef(new Animated.Value(0)).current;
  const scaleValue = useRef(new Animated.Value(0.8)).current;
  const shakeValue = useRef(new Animated.Value(0)).current;
  const slideValue = useRef(new Animated.Value(50)).current;

  // State
  const [showFullDetails, setShowFullDetails] = useState(false);
  const [isReporting, setIsReporting] = useState(false);
  const [hasSharedError, setHasSharedError] = useState(false);

  // Refs
  const isMountedRef = useRef(true);
  const retryCountRef = useRef(0);

  // ================================================================
  // ERROR ANALYSIS & CLASSIFICATION
  // ================================================================

  const analyzeError = useCallback((): ErrorType => {
    const errorMessage = typeof error === 'string' ? error : error.message;
    const errorString = errorMessage.toLowerCase();

    // Network-related errors
    if (errorString.includes('network') || 
        errorString.includes('connection') || 
        errorString.includes('internet')) {
      return ERROR_TYPES.network;
    }

    if (errorString.includes('timeout') || 
        errorString.includes('slow')) {
      return ERROR_TYPES.timeout;
    }

    if (errorString.includes('offline') || 
        errorString.includes('no connection')) {
      return ERROR_TYPES.offline;
    }

    // Server errors by status code
    if (errorCode === '404' || errorString.includes('not found')) {
      return ERROR_TYPES['404'];
    }

    if (errorCode === '403' || errorString.includes('forbidden') || 
        errorString.includes('access denied')) {
      return ERROR_TYPES['403'];
    }

    if (errorCode === '500' || errorString.includes('internal server')) {
      return ERROR_TYPES['500'];
    }

    if (errorString.includes('server') || errorString.includes('service')) {
      return ERROR_TYPES.server;
    }

    // Permission errors
    if (errorString.includes('permission') || 
        errorString.includes('unauthorized') ||
        errorString.includes('access')) {
      return ERROR_TYPES.permission;
    }

    // Validation errors
    if (errorString.includes('validation') || 
        errorString.includes('invalid') ||
        errorString.includes('required')) {
      return ERROR_TYPES.validation;
    }

    // Default to unknown
    return ERROR_TYPES.unknown;
  }, [error, errorCode]);

  const errorType = analyzeError();

  // ================================================================
  // ANIMATIONS
  // ================================================================

  const startEntranceAnimation = useCallback(() => {
    // Reset values
    fadeValue.setValue(0);
    scaleValue.setValue(0.8);
    slideValue.setValue(50);

    // Stagger entrance animations
    Animated.parallel([
      Animated.timing(fadeValue, {
        toValue: 1,
        duration: ANIMATION_DURATION,
        useNativeDriver: true,
      }),
      Animated.spring(scaleValue, {
        toValue: 1,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }),
      Animated.timing(slideValue, {
        toValue: 0,
        duration: ANIMATION_DURATION,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeValue, scaleValue, slideValue]);

  const startShakeAnimation = useCallback(() => {
    shakeValue.setValue(0);
    
    Animated.sequence([
      Animated.timing(shakeValue, {
        toValue: 10,
        duration: SHAKE_ANIMATION_DURATION / 4,
        useNativeDriver: true,
      }),
      Animated.timing(shakeValue, {
        toValue: -10,
        duration: SHAKE_ANIMATION_DURATION / 4,
        useNativeDriver: true,
      }),
      Animated.timing(shakeValue, {
        toValue: 10,
        duration: SHAKE_ANIMATION_DURATION / 4,
        useNativeDriver: true,
      }),
      Animated.timing(shakeValue, {
        toValue: 0,
        duration: SHAKE_ANIMATION_DURATION / 4,
        useNativeDriver: true,
      }),
    ]).start();
  }, [shakeValue]);

  // ================================================================
  // HANDLERS
  // ================================================================

  const handleRetry = useCallback(() => {
    if (!onRetry) return;

    retryCountRef.current += 1;
    
    // Show shake animation on repeated failures
    if (retryCountRef.current > 1) {
      startShakeAnimation();
    }

    onRetry();
  }, [onRetry, startShakeAnimation]);

  const handleReportError = useCallback(async () => {
    if (!onReportError || isReporting) return;

    setIsReporting(true);

    try {
      const errorReport: ErrorReport = {
        error: typeof error === 'string' ? error : error.message,
        errorCode,
        timestamp,
        userAgent: 'React Native App',
        platform: Platform.OS,
        screenInfo: {
          width: SCREEN_WIDTH,
          height: SCREEN_HEIGHT,
        },
      };

      await onReportError(errorReport);
      
      // Show success feedback
      Alert.alert(
        'Error Reported',
        'Thank you for reporting this issue. Our team will investigate.',
        [{ text: 'OK' }]
      );

    } catch (reportError) {
      console.error('Failed to report error:', reportError);
      Alert.alert(
        'Report Failed',
        'Unable to send error report. Please try again later.',
        [{ text: 'OK' }]
      );
    } finally {
      if (isMountedRef.current) {
        setIsReporting(false);
      }
    }
  }, [onReportError, error, errorCode, timestamp, isReporting]);

  const handleShareError = useCallback(async () => {
    if (hasSharedError) return;

    try {
      const errorMessage = typeof error === 'string' ? error : error.message;
      const shareContent = {
        message: `I encountered an error in FC25 Locker: ${errorMessage}`,
        title: 'FC25 Locker Error Report',
      };

      await Share.share(shareContent);
      setHasSharedError(true);

    } catch (shareError) {
      console.error('Failed to share error:', shareError);
    }
  }, [error, hasSharedError]);

  const handleContactSupport = useCallback(async () => {
    const supportUrl = 'https://fc25locker.com/support';
    
    try {
      const canOpen = await Linking.canOpenURL(supportUrl);
      if (canOpen) {
        await Linking.openURL(supportUrl);
      } else {
        Alert.alert(
          'Support',
          'Visit fc25locker.com/support for help',
          [{ text: 'OK' }]
        );
      }
    } catch (linkError) {
      console.error('Failed to open support link:', linkError);
    }
  }, []);

  const toggleDetails = useCallback(() => {
    setShowFullDetails(prev => !prev);
  }, []);

  // ================================================================
  // EFFECTS
  // ================================================================

  useEffect(() => {
    isMountedRef.current = true;
    startEntranceAnimation();

    return () => {
      isMountedRef.current = false;
    };
  }, [startEntranceAnimation]);

  // ================================================================
  // RENDER COMPONENTS
  // ================================================================

  const renderErrorIcon = () => (
    <Animated.View
      style={[
        styles.iconContainer,
        {
          transform: [
            { scale: scaleValue },
            { translateX: shakeValue },
          ],
        },
      ]}
    >
      <LinearGradient
        colors={getIconColors(errorType.type)}
        style={styles.iconGradient}
      >
        <Ionicons 
          name={errorType.icon as any} 
          size={variant === 'inline' ? 24 : 32} 
          color="#000" 
        />
      </LinearGradient>
    </Animated.View>
  );

  const renderErrorContent = () => (
    <Animated.View
      style={[
        styles.contentContainer,
        {
          opacity: fadeValue,
          transform: [{ translateY: slideValue }],
        },
      ]}
    >
      <Text style={[styles.errorTitle, variant === 'inline' && styles.inlineTitle]}>
        {errorType.title}
      </Text>
      
      <Text style={[styles.errorDescription, variant === 'inline' && styles.inlineDescription]}>
        {errorType.description}
      </Text>

      {variant !== 'inline' && (
        <View style={styles.suggestionsContainer}>
          <Text style={styles.suggestionsTitle}>What you can try:</Text>
          {errorType.suggestions.map((suggestion, index) => (
            <View key={index} style={styles.suggestionItem}>
              <Text style={styles.suggestionBullet}>•</Text>
              <Text style={styles.suggestionText}>{suggestion}</Text>
            </View>
          ))}
        </View>
      )}

      {showDetails && (
        <TouchableOpacity
          style={styles.detailsToggle}
          onPress={toggleDetails}
          accessibilityRole="button"
          accessibilityLabel={`${showFullDetails ? 'Hide' : 'Show'} error details`}
        >
          <Text style={styles.detailsToggleText}>
            {showFullDetails ? 'Hide Details' : 'Show Details'}
          </Text>
          <Ionicons 
            name={showFullDetails ? 'chevron-up' : 'chevron-down'} 
            size={16} 
            color="#00FFFF" 
          />
        </TouchableOpacity>
      )}

      {showFullDetails && (
        <View style={styles.errorDetailsContainer}>
          <ScrollView style={styles.errorDetailsScroll} nestedScrollEnabled>
            <Text style={styles.errorDetailsTitle}>Technical Details:</Text>
            <Text style={styles.errorDetailsText}>
              Error: {typeof error === 'string' ? error : error.message}
            </Text>
            {errorCode && (
              <Text style={styles.errorDetailsText}>
                Code: {errorCode}
              </Text>
            )}
            <Text style={styles.errorDetailsText}>
              Time: {timestamp.toLocaleString()}
            </Text>
            <Text style={styles.errorDetailsText}>
              Platform: {Platform.OS} {Platform.Version}
            </Text>
          </ScrollView>
        </View>
      )}
    </Animated.View>
  );

  const renderActions = () => {
    const actions: ErrorAction[] = [];

    // Add default actions
    if (showRetry && onRetry) {
      actions.push({
        id: 'retry',
        label: retryText,
        icon: 'refresh',
        onPress: handleRetry,
        variant: 'primary',
      });
    }

    if (showBack && onBack) {
      actions.push({
        id: 'back',
        label: backText,
        icon: 'arrow-back',
        onPress: onBack,
        variant: 'secondary',
      });
    }

    // Add custom actions
    actions.push(...customActions);

    // Add utility actions for non-inline variants
    if (variant !== 'inline') {
      if (showReport) {
        actions.push({
          id: 'report',
          label: isReporting ? 'Reporting...' : 'Report Issue',
          icon: 'bug',
          onPress: handleReportError,
          variant: 'secondary',
        });
      }

      actions.push({
        id: 'support',
        label: 'Contact Support',
        icon: 'help-circle',
        onPress: handleContactSupport,
        variant: 'secondary',
      });

      actions.push({
        id: 'share',
        label: hasSharedError ? 'Shared' : 'Share Error',
        icon: 'share',
        onPress: handleShareError,
        variant: 'secondary',
      });
    }

    return (
      <Animated.View
        style={[
          styles.actionsContainer,
          {
            opacity: fadeValue,
            transform: [{ translateY: slideValue }],
          },
        ]}
      >
        <View style={styles.primaryActions}>
          {actions
            .filter(action => action.variant === 'primary')
            .slice(0, 2)
            .map(action => renderActionButton(action, true))}
        </View>
        
        {variant !== 'inline' && (
          <View style={styles.secondaryActions}>
            {actions
              .filter(action => action.variant !== 'primary')
              .slice(0, 4)
              .map(action => renderActionButton(action, false))}
          </View>
        )}
      </Animated.View>
    );
  };

  const renderActionButton = (action: ErrorAction, isPrimary: boolean) => {
    const isDisabled = action.id === 'report' && isReporting;

    return (
      <TouchableOpacity
        key={action.id}
        style={[
          isPrimary ? styles.primaryActionButton : styles.secondaryActionButton,
          isDisabled && styles.disabledActionButton,
        ]}
        onPress={action.onPress}
        disabled={isDisabled}
        accessibilityRole="button"
        accessibilityLabel={action.label}
        accessibilityState={{ disabled: isDisabled }}
      >
        {isPrimary ? (
          <LinearGradient
            colors={['#00FFFF', '#6A5ACD']}
            style={styles.primaryActionGradient}
          >
            <Ionicons 
              name={action.icon as any} 
              size={16} 
              color="#000" 
              style={styles.actionIcon}
            />
            <Text style={styles.primaryActionText}>{action.label}</Text>
          </LinearGradient>
        ) : (
          <>
            <Ionicons 
              name={action.icon as any} 
              size={16} 
              color="#00FFFF" 
              style={styles.actionIcon}
            />
            <Text style={styles.secondaryActionText}>{action.label}</Text>
          </>
        )}
      </TouchableOpacity>
    );
  };

  const renderInlineVariant = () => (
    <View style={styles.inlineContainer}>
      {renderErrorIcon()}
      <View style={styles.inlineContent}>
        {renderErrorContent()}
        {renderActions()}
      </View>
    </View>
  );

  const renderModalVariant = () => (
    <View style={styles.modalBackdrop}>
      <BlurView intensity={50} tint="dark" style={StyleSheet.absoluteFill} />
      <Animated.View
        style={[
          styles.modalContainer,
          {
            opacity: fadeValue,
            transform: [{ scale: scaleValue }],
          },
        ]}
      >
        <LinearGradient
          colors={['rgba(0,0,0,0.95)', 'rgba(0,0,0,0.9)']}
          style={styles.modalContent}
        >
          {renderErrorIcon()}
          {renderErrorContent()}
          {renderActions()}
        </LinearGradient>
      </Animated.View>
    </View>
  );

  const renderOverlayVariant = () => (
    <View style={styles.overlayContainer}>
      <Animated.View
        style={[
          styles.overlayContent,
          {
            opacity: fadeValue,
            transform: [{ translateY: slideValue }],
          },
        ]}
      >
        <LinearGradient
          colors={['rgba(255,68,68,0.9)', 'rgba(255,68,68,0.7)']}
          style={styles.overlayGradient}
        >
          {renderErrorIcon()}
          <Text style={styles.overlayText}>
            {typeof error === 'string' ? error : error.message}
          </Text>
          {onRetry && (
            <TouchableOpacity onPress={handleRetry} style={styles.overlayButton}>
              <Text style={styles.overlayButtonText}>Retry</Text>
            </TouchableOpacity>
          )}
        </LinearGradient>
      </Animated.View>
    </View>
  );

  const renderFullscreenVariant = () => (
    <View style={styles.fullscreenContainer}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />
      
      <LinearGradient
        colors={['#000', '#1a1a2e', '#16213e']}
        style={StyleSheet.absoluteFill}
      />

      <ScrollView
        contentContainerStyle={styles.fullscreenContent}
        showsVerticalScrollIndicator={false}
      >
        {renderErrorIcon()}
        {renderErrorContent()}
        {renderActions()}
      </ScrollView>
    </View>
  );

  // ================================================================
  // HELPER FUNCTIONS
  // ================================================================

  function getIconColors(errorType: string): string[] {
    switch (errorType) {
      case 'network':
        return ['#FF6B6B', '#FF8E53'];
      case 'server':
        return ['#FF9F43', '#FECA57'];
      case 'permission':
        return ['#FD79A8', '#FDCB6E'];
      case 'validation':
        return ['#00FFFF', '#6A5ACD'];
      default:
        return ['#95A5A6', '#7F8C8D'];
    }
  }

  // ================================================================
  // MAIN RENDER
  // ================================================================

  switch (variant) {
    case 'inline':
      return renderInlineVariant();
    case 'modal':
      return renderModalVariant();
    case 'overlay':
      return renderOverlayVariant();
    default:
      return renderFullscreenVariant();
  }
};

// ================================================================
// STYLES
// ================================================================

const styles = StyleSheet.create({
  // Icon
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 24,
    alignSelf: 'center',
  },
  iconGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Content
  contentContainer: {
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  errorTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 12,
  },
  errorDescription: {
    color: '#ccc',
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },

  // Suggestions
  suggestionsContainer: {
    width: '100%',
    backgroundColor: 'rgba(0, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  suggestionsTitle: {
    color: '#00FFFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  suggestionBullet: {
    color: '#00FFFF',
    fontSize: 16,
    marginRight: 8,
    marginTop: 2,
  },
  suggestionText: {
    color: '#fff',
    fontSize: 14,
    flex: 1,
    lineHeight: 20,
  },

  // Details
  detailsToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 8,
  },
  detailsToggleText: {
    color: '#00FFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  errorDetailsContainer: {
    width: '100%',
    maxHeight: 200,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 8,
    marginTop: 16,
  },
  errorDetailsScroll: {
    padding: 16,
  },
  errorDetailsTitle: {
    color: '#00FFFF',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  errorDetailsText: {
    color: '#999',
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    marginBottom: 4,
  },

  // Actions
  actionsContainer: {
    width: '100%',
    paddingHorizontal: 20,
  },
  primaryActions: {
    gap: 12,
    marginBottom: 16,
  },
  secondaryActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 12,
  },
  primaryActionButton: {
    borderRadius: 24,
    overflow: 'hidden',
    height: 48,
  },
  primaryActionGradient: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  secondaryActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 255, 0.3)',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    minWidth: 100,
  },
  disabledActionButton: {
    opacity: 0.5,
  },
  actionIcon: {
    marginRight: 8,
  },
  primaryActionText: {
    color: '#000',
    fontSize: 16,
    fontWeight: 'bold',
  },
  secondaryActionText: {
    color: '#00FFFF',
    fontSize: 14,
    fontWeight: '600',
  },

  // Variants
  fullscreenContainer: {
    flex: 1,
  },
  fullscreenContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingVertical: 40,
  },

  modalBackdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalContainer: {
    width: SCREEN_WIDTH * 0.9,
    maxHeight: SCREEN_HEIGHT * 0.8,
    borderRadius: 20,
    overflow: 'hidden',
  },
  modalContent: {
    padding: 24,
    alignItems: 'center',
  },

  inlineContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 68, 68, 0.3)',
    borderRadius: 12,
    padding: 16,
    margin: 16,
  },
  inlineContent: {
    flex: 1,
    marginLeft: 12,
  },
  inlineTitle: {
    fontSize: 16,
    marginBottom: 4,
  },
  inlineDescription: {
    fontSize: 14,
    marginBottom: 12,
  },

  overlayContainer: {
    position: 'absolute',
    top: 50,
    left: 20,
    right: 20,
    zIndex: 1000,
  },
  overlayContent: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  overlayGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  overlayText: {
    color: '#fff',
    fontSize: 14,
    flex: 1,
    marginHorizontal: 12,
  },
  overlayButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  overlayButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
});

export default memo(ErrorScreen);