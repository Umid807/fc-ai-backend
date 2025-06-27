import React, { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Animated,
  Vibration,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Safe conditional imports with error handling
let GroupedToolbar: any = null;
let VIPFeature: any = null;

try {
  GroupedToolbar = require('./GroupedToolbar').default;
} catch (e) {
  // Component not available - graceful degradation
}

try {
  VIPFeature = require('./VIPFeature').default;
} catch (e) {
  // Component not available - graceful degradation
}

// Enhanced security utilities
const secureLog = (message: string, metadata: Record<string, any> = {}) => {
  // Production-safe logging - NO user content, only safe metadata
  const safeMetadata = {
    timestamp: Date.now(),
    component: 'SectionContentEditor',
    ...Object.fromEntries(
      Object.entries(metadata).filter(([key, value]) => {
        // Only log safe, non-sensitive metadata
        const safKeys = [
          'sectionLabel', 'contentLength', 'storageKey', 'hasErrors', 
          'requiresVIP', 'userVIP', 'styleProperty', 'error', 'available',
          'animationCount', 'timeoutCount', 'componentMounted'
        ];
        return safKeys.includes(key) && typeof value !== 'object';
      })
    )
  };
  
  if (__DEV__) {
    console.log(`[SECURE] ${message}`, safeMetadata);
  }
};

// Enhanced validation utilities
const validatePostContent = (content: string) => {
  const errors: string[] = [];
  
  // Basic validation without exposing content
  if (content.length === 0) {
    errors.push('Content cannot be empty');
  }
  
  // Check for suspicious patterns without logging content
  const suspiciousPatterns = [
    /<script/i,
    /javascript:/i,
    /on\w+\s*=/i,
  ];
  
  const hasSuspiciousContent = suspiciousPatterns.some(pattern => 
    pattern.test(content)
  );
  
  if (hasSuspiciousContent) {
    errors.push('Content contains invalid characters');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
};

const sanitizePostContent = (content: string): string => {
  // Basic sanitization without breaking normal text input
  return content
    .replace(/<script[^>]*>.*?<\/script>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '');
  // Removed .trim() - this was breaking normal spaces!
};

// Types & Interfaces
interface TextStyle {
  fontSize: number;
  fontWeight: 'normal' | 'bold';
  fontStyle: 'normal' | 'italic';
  textDecorationLine: 'none' | 'underline' | 'line-through' | 'shadow' | 'outline' | 'gradient';
  textAlign: 'left' | 'center' | 'right' | 'justify';
  color: string;
  fontFamily: string;
  textShadowColor?: string;
  textShadowOffset?: { width: number; height: number };
  textShadowRadius?: number;
}

interface SectionContentEditorProps {
  content: string;
  onContentChange: (content: string) => void;
  textStyle: TextStyle;
  onStyleUpdate: (styleUpdates: Partial<TextStyle>) => void;
  placeholder?: string;
  minHeight?: number;
  maxHeight?: number;
  maxContentLength?: number;
  userVIPStatus: boolean;
  disabled?: boolean;
  sectionLabel?: string;
  sectionType?: 'text' | 'rich' | 'code';
  onShowVIPUpgrade?: () => void;
  onClearDraft?: () => void;
}

// Constants
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const DEFAULT_MIN_HEIGHT = 120;
const DEFAULT_MAX_HEIGHT = 400;
const DEFAULT_MAX_LENGTH = 5000;
const ANIMATION_DURATION = 300;

// VIP Features Configuration
const VIP_FEATURES = {
  fonts: ['Orbitron', 'Exo', 'Audiowide', 'RajdhaniSemiBold', 'QuanticoRegular'],
  effects: ['shadow', 'outline', 'gradient', 'glow'],
  templates: [],
  styling: [],
};

const SectionContentEditor: React.FC<SectionContentEditorProps> = ({
  content,
  onContentChange,
  textStyle,
  onStyleUpdate,
  placeholder,
  minHeight = DEFAULT_MIN_HEIGHT,
  maxHeight = DEFAULT_MAX_HEIGHT,
  maxContentLength = DEFAULT_MAX_LENGTH,
  userVIPStatus,
  disabled = false,
  sectionLabel = 'Section',
  sectionType = 'text',
  onShowVIPUpgrade,
  onClearDraft,
}) => {
  const { t } = useTranslation();
  
  // State management
  const [isFocused, setIsFocused] = useState(false);
  const [showVIPPreview, setShowVIPPreview] = useState(false);
  const [contentErrors, setContentErrors] = useState<string[]>([]);
  const [showCharacterCount, setShowCharacterCount] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [lastSavedContent, setLastSavedContent] = useState(content);
  
  // Component lifecycle tracking
  const isMountedRef = useRef(true);
  
  // Animation refs with cleanup tracking
  const focusAnimation = useRef(new Animated.Value(0)).current;
  const errorAnimation = useRef(new Animated.Value(0)).current;
  const glowAnimation = useRef(new Animated.Value(0)).current;
  const toolbarAnimation = useRef(new Animated.Value(0)).current;
  const animationRefs = useRef<Animated.CompositeAnimation[]>([]);
  
  // Timer refs for cleanup
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const savedStateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const glowLoopRef = useRef<Animated.CompositeAnimation | null>(null);
  
  // Text input ref
  const textInputRef = useRef<TextInput>(null);
  
  // Generate unique key for this section
  const storageKey = useMemo(() => {
    return `section_draft_${sectionLabel}`.replace(/[^a-zA-Z0-9_]/g, '_');
  }, [sectionLabel]);
  
  // Track unsaved changes
  const hasUnsavedChanges = useMemo(() => {
    return content !== lastSavedContent && content.trim().length > 0;
  }, [content, lastSavedContent]);
  
  // CRITICAL: Comprehensive animation cleanup system
  const cleanupAnimations = useCallback(() => {
    try {
      // Stop all tracked animations
      animationRefs.current.forEach(animation => {
        try {
          animation.stop();
        } catch (error) {
          // Silent cleanup - animation might already be stopped
        }
      });
      animationRefs.current = [];
      
      // Stop glow loop specifically
      if (glowLoopRef.current) {
        try {
          glowLoopRef.current.stop();
          glowLoopRef.current = null;
        } catch (error) {
          // Silent cleanup
        }
      }
      
      // Remove all listeners
      focusAnimation.removeAllListeners();
      errorAnimation.removeAllListeners();
      glowAnimation.removeAllListeners();
      toolbarAnimation.removeAllListeners();
      
      // Reset animation values to prevent memory leaks
      focusAnimation.setValue(0);
      errorAnimation.setValue(0);
      glowAnimation.setValue(0);
      toolbarAnimation.setValue(0);
      
      secureLog('Animation cleanup completed', {
        animationCount: animationRefs.current.length,
        componentMounted: isMountedRef.current
      });
    } catch (error) {
      secureLog('Animation cleanup error', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }, [focusAnimation, errorAnimation, glowAnimation, toolbarAnimation]);
  
  // CRITICAL: Comprehensive timeout cleanup system
  const cleanupTimeouts = useCallback(() => {
    try {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
        autoSaveTimeoutRef.current = null;
      }
      
      if (savedStateTimeoutRef.current) {
        clearTimeout(savedStateTimeoutRef.current);
        savedStateTimeoutRef.current = null;
      }
      
      secureLog('Timeout cleanup completed', {
        timeoutCount: 2,
        componentMounted: isMountedRef.current
      });
    } catch (error) {
      secureLog('Timeout cleanup error', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }, []);
  
  // Enhanced component lifecycle management
  useEffect(() => {
    isMountedRef.current = true;
    
    return () => {
      isMountedRef.current = false;
      cleanupAnimations();
      cleanupTimeouts();
    };
  }, [cleanupAnimations, cleanupTimeouts]);
  
  // Enhanced focus animation effect with proper cleanup
  useEffect(() => {
    if (!isMountedRef.current) return;
    
    const focusAnim = Animated.spring(focusAnimation, {
      toValue: isFocused ? 1 : 0,
      useNativeDriver: false,
      tension: 150,
      friction: 8,
    });
    
    animationRefs.current.push(focusAnim);
    focusAnim.start();
    
    // Enhanced glow animation when focused with proper cleanup
    if (isFocused) {
      const glowLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnimation, {
            toValue: 1,
            duration: 2000,
            useNativeDriver: false,
          }),
          Animated.timing(glowAnimation, {
            toValue: 0,
            duration: 2000,
            useNativeDriver: false,
          }),
        ])
      );
      
      glowLoopRef.current = glowLoop;
      animationRefs.current.push(glowLoop);
      glowLoop.start();
    } else {
      // Stop glow animation when not focused
      if (glowLoopRef.current) {
        glowLoopRef.current.stop();
        glowLoopRef.current = null;
      }
      glowAnimation.setValue(0);
    }
  }, [isFocused, focusAnimation, glowAnimation]);
  
  // Enhanced toolbar animation effect with proper cleanup
  useEffect(() => {
    if (!isMountedRef.current) return;
    
    const toolbarAnim = Animated.spring(toolbarAnimation, {
      toValue: isFocused ? 1 : 0,
      useNativeDriver: true,
      tension: 120,
      friction: 8,
    });
    
    animationRefs.current.push(toolbarAnim);
    toolbarAnim.start();
  }, [isFocused, toolbarAnimation]);
  
  // Enhanced error animation effect with proper cleanup
  useEffect(() => {
    if (!isMountedRef.current || contentErrors.length === 0) return;
    
    const errorAnim = Animated.sequence([
      Animated.timing(errorAnimation, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.delay(3000),
      Animated.timing(errorAnimation, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]);
    
    animationRefs.current.push(errorAnim);
    errorAnim.start();
  }, [contentErrors, errorAnimation]);
  
  // Load saved content on mount with enhanced error handling
  useEffect(() => {
    const loadSavedContent = async () => {
      try {
        const savedContent = await AsyncStorage.getItem(storageKey);
        if (savedContent !== null && isMountedRef.current) {
          setLastSavedContent(savedContent);
        } else if (isMountedRef.current) {
          setLastSavedContent(content);
        }
      } catch (error) {
        secureLog('Failed to load saved content', { 
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        if (isMountedRef.current) {
          setLastSavedContent(content);
        }
      }
    };
    
    loadSavedContent();
  }, [storageKey]);
  
  // Enhanced auto-save with proper cleanup
  useEffect(() => {
    // Clean up existing timeout
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
      autoSaveTimeoutRef.current = null;
    }
    
    if (hasUnsavedChanges && content.trim().length > 10 && isMountedRef.current) {
      autoSaveTimeoutRef.current = setTimeout(() => {
        if (isMountedRef.current) {
          handleSave();
        }
      }, 30000);
    }
    
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
        autoSaveTimeoutRef.current = null;
      }
    };
  }, [hasUnsavedChanges, content]);

  // Enhanced content validation
  const validateContent = useCallback((text: string) => {
    const validation = validatePostContent(text);
    if (isMountedRef.current) {
      setContentErrors(validation.isValid ? [] : validation.errors);
    }
    return validation.isValid;
  }, []);
  
  // Enhanced save handler with bulletproof error handling
  const handleSave = useCallback(async () => {
    if (!isMountedRef.current) return;
    
    try {
      // Save to AsyncStorage
      await AsyncStorage.setItem(storageKey, content);
      
      // Update parent component immediately
      onContentChange(content);
      
      // Update local state only if component is still mounted
      if (isMountedRef.current) {
        setLastSavedContent(content);
        setIsSaved(true);
        
        // Remove focus to hide blinking cursor
        textInputRef.current?.blur();
        
        // Show feedback
        Vibration.vibrate(30);
        
        // Reset saved state after a few seconds with cleanup
        if (savedStateTimeoutRef.current) {
          clearTimeout(savedStateTimeoutRef.current);
        }
        
        savedStateTimeoutRef.current = setTimeout(() => {
          if (isMountedRef.current) {
            setIsSaved(false);
          }
        }, 2000);
      }
      
      secureLog('Section content saved to storage', {
        sectionLabel,
        contentLength: content.length,
        storageKey,
      });
      
    } catch (error) {
      secureLog('Failed to save content', { 
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      if (isMountedRef.current) {
        Alert.alert(
          t('sectionEditor.saveErrorTitle', 'Save Error'),
          t('sectionEditor.saveErrorMessage', 'Failed to save your content. Please try again.')
        );
      }
    }
  }, [content, sectionLabel, storageKey, onContentChange, t]);
  
  // Enhanced clear saved content with error handling
  const clearSavedContent = useCallback(async () => {
    try {
      await AsyncStorage.removeItem(storageKey);
      
      if (isMountedRef.current) {
        setLastSavedContent('');
      }
      
      secureLog('Cleared saved content', { storageKey });
      
      // Call parent clear draft if provided
      if (onClearDraft) {
        onClearDraft();
      }
    } catch (error) {
      secureLog('Failed to clear saved content', { 
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }, [storageKey, onClearDraft]);
  
  // Enhanced content change handler with security
  const handleContentChange = useCallback((text: string) => {
    if (!isMountedRef.current) return;
    
    // Validate content length
    if (text.length > maxContentLength) {
      text = text.substring(0, maxContentLength);
      Vibration.vibrate(50);
    }
    
    // REMOVED SANITIZATION - it was breaking normal text input!
    // Just validate without changing the text
    validateContent(text);
    
    // Update content with original text (preserve spaces!)
    onContentChange(text);
    
// Show character count when approaching limit
const shouldShow = text.length > maxContentLength * 0.8 || isFocused;
setShowCharacterCount(shouldShow);
    
    secureLog('Section content updated', {
      sectionLabel,
      contentLength: text.length,
      hasErrors: contentErrors.length > 0,
    });
  }, [maxContentLength, validateContent, onContentChange, sectionLabel, contentErrors.length]);
  
  // Enhanced style update handler with security
  const handleStyleUpdate = useCallback(<K extends keyof TextStyle>(
    key: K,
    value: TextStyle[K],
    requiresVIP = false
  ) => {
    if (!isMountedRef.current) return;
    
    // Apply style update directly (VIP check handled by GroupedToolbar)
    onStyleUpdate({ [key]: value });
    Vibration.vibrate(30);
    
    secureLog('Section style updated', {
      sectionLabel,
      styleProperty: key,
      // NOTE: Do not log the actual value as it could contain user preferences
      requiresVIP,
      userVIP: userVIPStatus,
    });
  }, [onStyleUpdate, sectionLabel, userVIPStatus]);
  
  // Enhanced focus handlers
  const handleFocus = useCallback(() => {
    if (!isMountedRef.current || disabled) return;
    setIsFocused(true);
    Vibration.vibrate(30);
  }, [disabled]);
  
  const handleBlur = useCallback(() => {
    if (!isMountedRef.current) return;
    setIsFocused(false);
  }, []);
  
// Calculate content statistics - stable calculation
const contentStats = useMemo(() => {
  const charCount = content.length;
  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;
  const lineCount = content.split('\n').length;
  const remainingChars = maxContentLength - charCount;
  
  return {
    words: wordCount,
    characters: charCount,
    lines: lineCount,
    remaining: remainingChars,
    progress: (charCount / maxContentLength) * 100,
  };
}, [content, maxContentLength]);

  // Enhanced dynamic height calculation
// Stable dynamic height calculation - prevent keyboard layout thrashing
const dynamicHeight = useMemo(() => {
  // Only recalculate when not focused to prevent keyboard issues
  if (isFocused) {
    return minHeight; // Use consistent height when editing
  }
  
  const lines = Math.max(
    content.split('\n').length,
    content.length > 0 ? Math.ceil(content.length / 50) : 1
  );
  
  // Different sizing based on section type/label
  let baseLines, lineHeight, minLines;
  
  const labelLower = sectionLabel?.toLowerCase() || '';
  
  if (labelLower.includes('header') || labelLower.includes('title')) {
    baseLines = Math.max(2, Math.min(lines, 4));
    lineHeight = 28;
    minLines = 2;
  } else if (labelLower.includes('content') || 
             labelLower.includes('main') ||
             labelLower.includes('analysis') ||
             labelLower.includes('description')) {
    baseLines = Math.max(8, lines);
    lineHeight = 24;
    minLines = 8;
  } else {
    baseLines = Math.max(4, lines);
    lineHeight = 26;
    minLines = 4;
  }
  
  const calculatedHeight = Math.min(
    Math.max(minHeight, baseLines * lineHeight),
    maxHeight
  );
  
  return calculatedHeight;
}, [content, minHeight, maxHeight, sectionLabel, isFocused]);
  
  // Enhanced text style generation with security
  const appliedTextStyle = useMemo(() => {
    return {
      fontSize: textStyle.fontSize || 16,
      fontWeight: textStyle.fontWeight || 'normal',
      fontStyle: textStyle.fontStyle || 'normal',
      textDecorationLine: textStyle.textDecorationLine === 'gradient' ? 'none' : (textStyle.textDecorationLine || 'none'),
      textAlign: textStyle.textAlign || 'left',
      color: textStyle.color || '#FFFFFF',
      fontFamily: textStyle.fontFamily || 'System',
      textShadowColor: textStyle.textShadowColor,
      textShadowOffset: textStyle.textShadowOffset,
      textShadowRadius: textStyle.textShadowRadius,
      lineHeight: (textStyle.fontSize || 16) * 1.4,
    };
  }, [textStyle]);
  
  // Enhanced error handling with try-catch for render
  try {
return (
  <KeyboardAvoidingView
    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    style={styles.container}
    keyboardVerticalOffset={0}
    enabled={isFocused}
  >
        {/* Section Info Header */}
        <View style={styles.sectionHeader}>
          <View style={styles.sectionInfo}>
            <Text style={styles.sectionLabel}>
              {sectionLabel}
            </Text>
            <View style={styles.sectionMeta}>
              <Text style={styles.sectionType}>
                {t(`sectionEditor.sectionType.${sectionType}`, sectionType.toUpperCase())} {t('sectionEditor.section', 'SECTION')}
              </Text>
              <Text style={styles.wordCount}>
                {t('sectionEditor.wordCount', '{{count}} words', { count: contentStats.words })}
              </Text>
            </View>
          </View>
          
          {/* Quick Style Preview */}
          <View style={styles.stylePreview}>
            <Text style={styles.stylePreviewText}>
              {textStyle.fontFamily !== 'System' && `${textStyle.fontFamily} • `}
              {textStyle.fontSize}px
              {textStyle.fontWeight === 'bold' && ` • ${t('sectionEditor.bold', 'Bold')}`}
              {textStyle.fontStyle === 'italic' && ` • ${t('sectionEditor.italic', 'Italic')}`}
            </Text>
          </View>
        </View>
        
        {/* Main Content Editor */}
        <Animated.View
          style={[
            styles.editorContainer,
            {
              borderColor: focusAnimation.interpolate({
                inputRange: [0, 1],
                outputRange: ['rgba(0, 255, 255, 0.2)', '#00FFFF'],
              }),
              shadowOpacity: focusAnimation.interpolate({
                inputRange: [0, 1],
                outputRange: [0, 0.5],
              }),
              shadowRadius: focusAnimation.interpolate({
                inputRange: [0, 1],
                outputRange: [0, 12],
              }),
            },
          ]}
        >
          <LinearGradient
            colors={
              isFocused
                ? [
                    `rgba(0, 255, 255, ${glowAnimation._value * 0.1 + 0.05})`,
                    'rgba(0, 255, 255, 0.02)',
                  ]
                : ['rgba(0, 20, 30, 0.8)', 'rgba(0, 10, 20, 0.6)']
            }
            style={[styles.editorGradient, { minHeight: dynamicHeight }]}
          >
            <ScrollView
              style={styles.scrollContainer}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <TextInput
                ref={textInputRef}
                style={[
                  styles.textInput,
                  appliedTextStyle,
                  {
                    minHeight: dynamicHeight - 24,
                  },
                ]}
                value={content}
                onChangeText={handleContentChange}
                placeholder={placeholder || t('sectionEditor.placeholder', 'Enter your content here...')}
                placeholderTextColor="rgba(255, 255, 255, 0.4)"
                multiline
                textAlignVertical="top"
                onFocus={handleFocus}
                onBlur={handleBlur}
                editable={!disabled}
                maxLength={maxContentLength}
                scrollEnabled={false}
              />
            </ScrollView>
            
            {/* Character Count Indicator */}
            {(showCharacterCount && isMountedRef.current) && (
              <View style={styles.characterCountContainer}>
                <View style={styles.progressBar}>
                  <View 
                    style={[
                      styles.progressFill,
                      {
                        width: `${Math.min(contentStats.progress, 100)}%`,
                        backgroundColor: 
                          contentStats.progress > 95 ? '#FF6347' :
                          contentStats.progress > 80 ? '#FFD700' : '#32CD32',
                      },
                    ]} 
                  />
                </View>
                <Text style={[
                  styles.characterCount,
                  contentStats.remaining < 100 && styles.warningCount,
                  contentStats.remaining <= 0 && styles.errorCount,
                ]}>
                  {t('sectionEditor.charsLeft', '{{count}} chars left', { count: contentStats.remaining })}
                </Text>
              </View>
            )}
          </LinearGradient>
        </Animated.View>
        
        {/* Enhanced Toolbar with Safe Conditional Rendering */}
        {GroupedToolbar && (
          <Animated.View
            style={[
              styles.toolbarContainer,
              {
                opacity: toolbarAnimation,
                transform: [
                  {
                    translateY: toolbarAnimation.interpolate({
                      inputRange: [0, 1],
                      outputRange: [20, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            <GroupedToolbar
              textStyle={textStyle}
              onStyleUpdate={handleStyleUpdate}
              selectedLanguage="en"
              onLanguageChange={() => {}}
              languageConfig={{}}
              userVIPStatus={userVIPStatus}
              vipFeatures={VIP_FEATURES}
              onShowEmojiPicker={() => {}}
              onShowTemplates={() => {}}
              disabled={disabled}
              animation={toolbarAnimation}
            />
          </Animated.View>
        )}
        
        {/* Content Statistics Panel */}
        {isFocused && (
          <Animated.View
            style={[
              styles.statsPanel,
              {
                opacity: toolbarAnimation,
              },
            ]}
          >
            <LinearGradient
              colors={['rgba(0, 255, 255, 0.1)', 'rgba(0, 255, 255, 0.05)']}
              style={styles.statsPanelGradient}
            >
              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <Ionicons name="text" size={14} color="#00FFFF" />
                  <Text style={styles.statValue}>{contentStats.words}</Text>
                  <Text style={styles.statLabel}>{t('sectionEditor.words', 'words')}</Text>
                </View>
                
                <View style={styles.statItem}>
                  <Ionicons name="document" size={14} color="#32CD32" />
                  <Text style={styles.statValue}>{contentStats.characters}</Text>
                  <Text style={styles.statLabel}>{t('sectionEditor.chars', 'chars')}</Text>
                </View>
                
                <View style={styles.statItem}>
                  <Ionicons name="reorder-three" size={14} color="#FFD700" />
                  <Text style={styles.statValue}>{contentStats.lines}</Text>
                  <Text style={styles.statLabel}>{t('sectionEditor.lines', 'lines')}</Text>
                </View>
                
                <View style={styles.statItem}>
                  <Ionicons name="time" size={14} color="#FF69B4" />
                  <Text style={styles.statValue}>
                    {Math.max(1, Math.ceil(contentStats.words / 200))}
                  </Text>
                  <Text style={styles.statLabel}>{t('sectionEditor.minRead', 'min read')}</Text>
                </View>
              </View>
            </LinearGradient>
          </Animated.View>
        )}
        
        {/* Save Button */}
        <View style={styles.saveButtonContainer}>
          <TouchableOpacity
            style={[
              styles.saveButton,
              isSaved && styles.savedButton,
              !hasUnsavedChanges && styles.disabledSaveButton,
            ]}
            onPress={handleSave}
            disabled={!hasUnsavedChanges}
          >
            <LinearGradient
              colors={
                isSaved
                  ? ['rgba(50, 205, 50, 0.8)', 'rgba(34, 139, 34, 0.6)']
                  : hasUnsavedChanges
                  ? ['rgba(0, 255, 255, 0.8)', 'rgba(0, 191, 255, 0.6)']
                  : ['rgba(128, 128, 128, 0.3)', 'rgba(128, 128, 128, 0.2)']
              }
              style={styles.saveButtonGradient}
            >
              <Ionicons 
                name={isSaved ? "checkmark-circle" : "save"} 
                size={16} 
                color={isSaved ? "#32CD32" : hasUnsavedChanges ? "#00FFFF" : "#888"} 
              />
              <Text style={[
                styles.saveButtonText,
                isSaved && styles.savedText,
                !hasUnsavedChanges && styles.disabledText,
              ]}>
                {isSaved 
                  ? t('sectionEditor.saved', 'Saved!')
                  : hasUnsavedChanges 
                    ? t('sectionEditor.saveDraft', 'Save Draft')
                    : t('sectionEditor.noChanges', 'No Changes')
                }
              </Text>
            </LinearGradient>
          </TouchableOpacity>
          
          {hasUnsavedChanges && (
            <Text style={styles.unsavedIndicator}>
              • {t('sectionEditor.unsavedChanges', 'Unsaved changes')}
            </Text>
          )}
        </View>
        
        {/* Error Display */}
        {contentErrors.length > 0 && (
          <Animated.View
            style={[
              styles.errorContainer,
              {
                opacity: errorAnimation,
                transform: [
                  {
                    translateY: errorAnimation.interpolate({
                      inputRange: [0, 1],
                      outputRange: [20, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            <LinearGradient
              colors={['rgba(255, 99, 71, 0.2)', 'rgba(255, 99, 71, 0.1)']}
              style={styles.errorGradient}
            >
              <Ionicons name="warning" size={16} color="#FF6347" />
              <Text style={styles.errorText}>
                {t(`sectionEditor.error.${contentErrors[0]}`, contentErrors[0])}
              </Text>
              <TouchableOpacity
                onPress={() => setContentErrors([])}
                style={styles.errorClose}
              >
                <Ionicons name="close" size={14} color="#FF6347" />
              </TouchableOpacity>
            </LinearGradient>
          </Animated.View>
        )}
        
        {/* VIP Feature Preview with Safe Conditional Rendering */}
        {VIPFeature && (
          <VIPFeature
            visible={showVIPPreview}
            onClose={() => setShowVIPPreview(false)}
            featureType="section-styling"
            animation={new Animated.Value(showVIPPreview ? 1 : 0)}
          />
        )}
      </KeyboardAvoidingView>
    );
  } catch (error) {
    // Bulletproof error boundary - never crash the parent
    secureLog('SectionContentEditor render error', {
      error: error instanceof Error ? error.message : 'Unknown error',
      hasContent: !!content,
      disabled,
    });
    
    // Fallback UI
    return (
      <View style={styles.container}>
        <View style={styles.errorFallback}>
          <Ionicons name="warning" size={24} color="#FF6347" />
          <Text style={styles.errorFallbackText}>
            {t('sectionEditor.errorFallback', 'An error occurred. Please try again.')}
          </Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => {
              // Force re-render by clearing content errors
              setContentErrors([]);
            }}
          >
            <Text style={styles.retryButtonText}>
              {t('sectionEditor.retry', 'Retry')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }
};

export default SectionContentEditor;

/* ----------------- ENTERPRISE-GRADE SECTION EDITOR STYLES ----------------- */
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  
  // Section Header
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  sectionInfo: {
    flex: 1,
  },
  sectionLabel: {
    color: '#FFD700',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  sectionMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionType: {
    color: '#00FFFF',
    fontSize: 10,
    fontWeight: '600',
    backgroundColor: 'rgba(0, 255, 255, 0.2)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  wordCount: {
    color: '#888',
    fontSize: 11,
  },
  stylePreview: {
    backgroundColor: 'rgba(0, 255, 255, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    maxWidth: SCREEN_WIDTH * 0.4,
  },
  stylePreviewText: {
    color: '#00FFFF',
    fontSize: 10,
    fontWeight: '500',
    textAlign: 'right',
  },
  
  // Main Editor Container
  editorContainer: {
    borderRadius: 16,
    borderWidth: 2,
    shadowColor: '#00FFFF',
    shadowOffset: { width: 0, height: 0 },
    elevation: 0,
    marginBottom: 16,
    overflow: 'hidden',
  },
  editorGradient: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  scrollContainer: {
    flex: 1,
  },
  textInput: {
    color: '#FFFFFF',
    fontSize: 16,
    lineHeight: 24,
    textAlignVertical: 'top',
    includeFontPadding: false,
  },
  
  // Character Count
  characterCountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 8,
  },
  progressBar: {
    flex: 1,
    height: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  characterCount: {
    color: '#888',
    fontSize: 11,
    fontWeight: '500',
  },
  warningCount: {
    color: '#FFD700',
  },
  errorCount: {
    color: '#FF6347',
  },
  
  // Toolbar Container
  toolbarContainer: {
    marginBottom: 16,
  },
  
  // Statistics Panel
  statsPanel: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 16,
  },
  statsPanelGradient: {
    padding: 12,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  statItem: {
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  statLabel: {
    color: '#888',
    fontSize: 10,
    textAlign: 'center',
  },
  
  // Save Button Styles
  saveButtonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  saveButton: {
    borderRadius: 8,
    overflow: 'hidden',
  },
  savedButton: {
    // Additional styling for saved state
  },
  disabledSaveButton: {
    opacity: 0.6,
  },
  saveButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
  },
  saveButtonText: {
    color: '#00FFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  savedText: {
    color: '#32CD32',
  },
  disabledText: {
    color: '#888',
  },
  unsavedIndicator: {
    color: '#FFD700',
    fontSize: 10,
    fontStyle: 'italic',
  },
  
  // Error Display
  errorContainer: {
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 12,
  },
  errorGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 8,
  },
  errorText: {
    color: '#FF6347',
    fontSize: 12,
    flex: 1,
    fontWeight: '500',
  },
  errorClose: {
    padding: 4,
  },
  
  // Error Fallback UI
  errorFallback: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    gap: 16,
  },
  errorFallbackText: {
    color: '#FF6347',
    fontSize: 16,
    textAlign: 'center',
    fontWeight: '500',
  },
  retryButton: {
    backgroundColor: 'rgba(0, 255, 255, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#00FFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});