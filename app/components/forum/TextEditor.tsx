import React, { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Animated,
  Vibration,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';

// Security utilities
import { validatePostContent, sanitizePostContent, secureLog } from '../../utils/security';

// Import Sub-Components (conditional imports for safe loading)
let GroupedToolbar: any = null;
let ClearAllButton: any = null;
let TemplateSelector: any = null;
let EmojiPicker: any = null;
let VIPFeaturePreview: any = null;

try {
  GroupedToolbar = require('./GroupedToolbar').default;
} catch (e) {
  secureLog('GroupedToolbar component not found', { available: false });
}

try {
  ClearAllButton = require('./ClearAllButton').default;
} catch (e) {
  secureLog('ClearAllButton component not found', { available: false });
}

try {
  TemplateSelector = require('./TemplateSelector').default;
} catch (e) {
  secureLog('TemplateSelector component not found', { available: false });
}

try {
  EmojiPicker = require('./EmojiPicker').default;
} catch (e) {
  secureLog('EmojiPicker component not found', { available: false });
}

try {
  VIPFeaturePreview = require('./VIPFeature').default;
} catch (e) {
  secureLog('VIPFeaturePreview component not found', { available: false });
}

// Types & Interfaces
interface TextStyle {
  fontSize: number;
  fontWeight: 'normal' | 'bold';
  fontStyle: 'normal' | 'italic';
  textDecorationLine: 'none' | 'underline' | 'line-through' | 'shadow' | 'outline' | 'gradient';
  textAlign: 'left' | 'center' | 'right' | 'justify';
  color: string;
  fontFamily?: string;
  textShadow?: string;
  background?: string;
  textShadowColor?: string;
  textShadowOffset?: { width: number; height: number };
  textShadowRadius?: number;
}

interface LanguageConfig {
  font: string;
  direction: 'ltr' | 'rtl';
  name: string;
  code: string;
}

interface VIPFeatures {
  fonts: string[];
  effects: string[];
  templates: string[];
  styling: string[];
}

interface UndoState {
  content: string;
  timestamp: number;
  action: string;
}

interface TextEditorProps {
  title: string;
  content: string;
  onTitleChange: (title: string) => void;
  onContentChange: (content: string) => void;
  wordCount: number;
  disabled?: boolean;
  maxTitleLength?: number;
  maxContentLength?: number;
  placeholder?: string;
  titlePlaceholder?: string;
  userVIPStatus?: boolean;
}

// Constants
const MIN_CONTENT_HEIGHT = Dimensions.get('window').height * 0.3;
const MAX_TITLE_LENGTH_DEFAULT = 200;
const MAX_CONTENT_LENGTH_DEFAULT = 5000;
const DEBOUNCE_MS = 300;
const UNDO_TIMEOUT_MS = 30000; // 30 seconds to undo

// Language Configuration for Multi-Language Support
const LANGUAGE_CONFIG: Record<string, LanguageConfig> = {
  'en': { font: 'System', direction: 'ltr', name: 'English', code: 'en' },
  'ar': { font: 'NotoSansArabic', direction: 'rtl', name: 'العربية', code: 'ar' },
  'zh': { font: 'NotoSansCJK', direction: 'ltr', name: '中文', code: 'zh' },
  'es': { font: 'System', direction: 'ltr', name: 'Español', code: 'es' },
  'fr': { font: 'System', direction: 'ltr', name: 'Français', code: 'fr' },
  'de': { font: 'System', direction: 'ltr', name: 'Deutsch', code: 'de' },
  'ja': { font: 'NotoSansCJK', direction: 'ltr', name: '日本語', code: 'ja' },
  'ko': { font: 'NotoSansCJK', direction: 'ltr', name: '한국어', code: 'ko' },
  'he': { font: 'NotoSansHebrew', direction: 'rtl', name: 'עברית', code: 'he' },
  'ur': { font: 'NotoSansUrdu', direction: 'rtl', name: 'اردو', code: 'ur' },
};

// VIP Features Framework
const VIP_FEATURES: VIPFeatures = {
  fonts: ['Orbitron', 'Exo', 'Audiowide', 'RajdhaniSemiBold', 'QuanticoRegular'],
  effects: ['shadow', 'outline', 'gradient', 'glow', 'emboss'],
  templates: ['community', 'advanced-editor', 'premium-layouts'],
  styling: ['backgrounds', 'enhanced-sizing', 'custom-spacing', 'advanced-colors']
};

const TextEditor: React.FC<TextEditorProps> = ({
  title,
  content,
  onTitleChange,
  onContentChange,
  wordCount,
  disabled = false,
  maxTitleLength = MAX_TITLE_LENGTH_DEFAULT,
  maxContentLength = MAX_CONTENT_LENGTH_DEFAULT,
  placeholder,
  titlePlaceholder,
  userVIPStatus = false,
}) => {
  const { t, i18n } = useTranslation();
  
  // Refs for cleanup and performance
  const isMountedRef = useRef(true);
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const undoTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const contentInputRef = useRef<TextInput>(null);
  const titleInputRef = useRef<TextInput>(null);
  const animationRefs = useRef<Animated.CompositeAnimation[]>([]);
  
  // Animation refs
  const focusAnimation = useRef(new Animated.Value(0)).current;
  const toolbarAnimation = useRef(new Animated.Value(1)).current;
  const vipAnimation = useRef(new Animated.Value(0)).current;
  
  // Core State Management
  const [textStyle, setTextStyle] = useState<TextStyle>({
    fontSize: 16,
    fontWeight: 'normal',
    fontStyle: 'normal',
    textDecorationLine: 'none',
    textAlign: 'left',
    color: '#FFFFFF',
    fontFamily: 'System',
  });
  
  const [contentHeight, setContentHeight] = useState(MIN_CONTENT_HEIGHT);
  const [isContentFocused, setIsContentFocused] = useState(false);
  const [isTitleFocused, setIsTitleFocused] = useState(false);
  const [selectionStart, setSelectionStart] = useState(0);
  const [selectionEnd, setSelectionEnd] = useState(0);
  const [errors, setErrors] = useState<{ title?: string; content?: string }>({});
  
  // Enhanced State for New Features
  const [selectedLanguage, setSelectedLanguage] = useState<string>(i18n.language || 'en');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);
  const [showVIPPreview, setShowVIPPreview] = useState(false);
  const [recentEmojis, setRecentEmojis] = useState<string[]>([]);
  const [undoState, setUndoState] = useState<UndoState | null>(null);
  const [lastClearedContent, setLastClearedContent] = useState<string>('');
  
  // ENHANCED: Animation cleanup system
  const cleanupAnimations = useCallback(() => {
    try {
      // Stop all running animations
      animationRefs.current.forEach(animation => {
        animation.stop();
      });
      animationRefs.current = [];
      
      // Remove all listeners
      focusAnimation.removeAllListeners();
      toolbarAnimation.removeAllListeners();
      vipAnimation.removeAllListeners();
      
      // Reset animation values to prevent memory leaks
      focusAnimation.setValue(0);
      toolbarAnimation.setValue(1);
      vipAnimation.setValue(0);
    } catch (error) {
      secureLog('Animation cleanup error', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        hasAnimations: animationRefs.current.length > 0
      });
    }
  }, [focusAnimation, toolbarAnimation, vipAnimation]);
  
  // Language & Font Management
  const currentLanguageConfig = useMemo(() => 
    LANGUAGE_CONFIG[selectedLanguage] || LANGUAGE_CONFIG['en'], 
    [selectedLanguage]
  );
  
  // Auto-detect language from content (basic implementation)
  const detectLanguageFromContent = useCallback((text: string): string => {
    try {
      // Simple detection based on character sets
      const arabicRegex = /[\u0600-\u06FF]/;
      const chineseRegex = /[\u4e00-\u9fff]/;
      const hebrewRegex = /[\u0590-\u05FF]/;
      const japaneseRegex = /[\u3040-\u309F\u30A0-\u30FF]/;
      const koreanRegex = /[\uAC00-\uD7AF]/;
      
      if (arabicRegex.test(text)) return 'ar';
      if (chineseRegex.test(text)) return 'zh';
      if (hebrewRegex.test(text)) return 'he';
      if (japaneseRegex.test(text)) return 'ja';
      if (koreanRegex.test(text)) return 'ko';
      
      return 'en'; // Default fallback
    } catch (error) {
      secureLog('Language detection error', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        textLength: text?.length || 0
      });
      return 'en';
    }
  }, []);
  
  // ENHANCED: Validation with secure logging
  const validateContent = useCallback((text: string, type: 'title' | 'content') => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
    
    debounceTimeoutRef.current = setTimeout(() => {
      try {
        const validation = validatePostContent(text);
        
        if (!validation.isValid) {
          setErrors(prev => ({
            ...prev,
            [type]: validation.errors[0] || t('textEditor.invalidContent', 'Content contains invalid characters')
          }));
          
          // SECURITY FIX: No user content in logs
          secureLog('Content validation failed', {
            type,
            errorCount: validation.errors?.length || 0,
            contentLength: text?.length || 0,
            language: selectedLanguage,
            hasVIPAccess: userVIPStatus,
          });
        } else {
          setErrors(prev => {
            const newErrors = { ...prev };
            delete newErrors[type];
            return newErrors;
          });
        }
      } catch (error) {
        secureLog('Validation error', {
          type,
          error: error instanceof Error ? error.message : 'Unknown error',
          contentLength: text?.length || 0
        });
      }
    }, DEBOUNCE_MS);
  }, [t, selectedLanguage, userVIPStatus]);
  
  // ENHANCED: Animation Controllers with error handling
  const animateFocus = useCallback((focused: boolean) => {
    try {
      if (!isMountedRef.current) return;
      
      const animation = Animated.spring(focusAnimation, {
        toValue: focused ? 1 : 0,
        useNativeDriver: false,
        tension: 120,
        friction: 8,
      });
      
      animationRefs.current.push(animation);
      animation.start();
    } catch (error) {
      secureLog('Focus animation error', { 
        focused,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }, [focusAnimation]);
  
  const animateToolbar = useCallback((visible: boolean) => {
    try {
      if (!isMountedRef.current) return;
      
      const animation = Animated.spring(toolbarAnimation, {
        toValue: visible ? 1 : 0.85,
        useNativeDriver: true,
        tension: 100,
        friction: 8,
      });
      
      animationRefs.current.push(animation);
      animation.start();
    } catch (error) {
      secureLog('Toolbar animation error', { 
        visible,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }, [toolbarAnimation]);
  
  const animateVIPFeature = useCallback((show: boolean) => {
    try {
      if (!isMountedRef.current) return;
      
      const animation = Animated.spring(vipAnimation, {
        toValue: show ? 1 : 0,
        useNativeDriver: true,
        tension: 150,
        friction: 8,
      });
      
      animationRefs.current.push(animation);
      animation.start();
    } catch (error) {
      secureLog('VIP animation error', { 
        show,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }, [vipAnimation]);
  
  // Enhanced Text Style Management
  const updateTextStyle = useCallback(<K extends keyof TextStyle>(
    key: K,
    value: TextStyle[K],
    requiresVIP = false
  ) => {
    try {
      if (requiresVIP && !userVIPStatus) {
        setShowVIPPreview(true);
        animateVIPFeature(true);
        return;
      }
      
      setTextStyle(prev => ({ ...prev, [key]: value }));
      Vibration.vibrate(30);
      
      secureLog('Text style updated', {
        styleKey: key,
        requiresVIP,
        hasVIPAccess: userVIPStatus,
        language: selectedLanguage
      });
    } catch (error) {
      secureLog('Text style update error', {
        styleKey: key,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }, [userVIPStatus, selectedLanguage, animateVIPFeature]);

  // Language Management
  const handleLanguageChange = useCallback((languageCode: string) => {
    try {
      const config = LANGUAGE_CONFIG[languageCode];
      if (config) {
        setSelectedLanguage(languageCode);
        
        // Auto-update font for the language
        updateTextStyle('fontFamily', config.font);
        
        secureLog('Language changed', {
          fromLanguage: selectedLanguage,
          toLanguage: languageCode,
          fontFamily: config.font,
          direction: config.direction,
        });
      }
    } catch (error) {
      secureLog('Language change error', {
        languageCode,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }, [selectedLanguage, updateTextStyle]);
  
  // Auto-detect language from content changes
  const handleContentChangeWithDetection = useCallback((text: string) => {
    try {
      if (text.length <= maxContentLength) {
        onContentChange(text);
        validateContent(text, 'content');
        
        // Auto-detect language if content is substantial
        if (text.length > 20) {
          const detectedLang = detectLanguageFromContent(text);
          if (detectedLang !== selectedLanguage) {
            handleLanguageChange(detectedLang);
          }
        }
      }
    } catch (error) {
      secureLog('Content change error', {
        contentLength: text?.length || 0,
        maxLength: maxContentLength,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }, [maxContentLength, onContentChange, validateContent, detectLanguageFromContent, selectedLanguage, handleLanguageChange]);
  
  // ENHANCED: Content Manipulation with secure logging
  const insertText = useCallback((insertText: string) => {
    try {
      const before = content.substring(0, selectionStart);
      const after = content.substring(selectionEnd);
      const newContent = before + insertText + after;
      
      onContentChange(newContent);
      
      // Move cursor after inserted text
      setTimeout(() => {
        const newPosition = selectionStart + insertText.length;
        contentInputRef.current?.setNativeProps({
          selection: { start: newPosition, end: newPosition }
        });
      }, 100);
      
      // SECURITY FIX: No user content in logs
      secureLog('Text insertion completed', { 
        insertionLength: insertText?.length || 0,
        position: selectionStart,
        language: selectedLanguage,
        totalContentLength: newContent?.length || 0
      });
    } catch (error) {
      secureLog('Text insertion error', {
        error: error instanceof Error ? error.message : 'Unknown error',
        position: selectionStart,
        insertionLength: insertText?.length || 0
      });
    }
  }, [content, selectionStart, selectionEnd, onContentChange, selectedLanguage]);
  
  // ENHANCED: Clear All with Undo Functionality
  const handleClearAll = useCallback(() => {
    try {
      if (content.trim().length === 0) return;
      
      // Save current content for undo
      setLastClearedContent(content);
      setUndoState({
        content: content,
        timestamp: Date.now(),
        action: 'clear_all'
      });
      
      // Clear content
      onContentChange('');
      
      // Set undo timeout
      if (undoTimeoutRef.current) {
        clearTimeout(undoTimeoutRef.current);
      }
      
      undoTimeoutRef.current = setTimeout(() => {
        setUndoState(null);
        setLastClearedContent('');
      }, UNDO_TIMEOUT_MS);
      
      secureLog('Content cleared with undo option', {
        clearedContentLength: content?.length || 0,
        undoTimeoutMs: UNDO_TIMEOUT_MS,
        timestamp: Date.now()
      });
    } catch (error) {
      secureLog('Clear all error', {
        error: error instanceof Error ? error.message : 'Unknown error',
        contentLength: content?.length || 0
      });
    }
  }, [content, onContentChange]);
  
  // Undo Clear Action
  const handleUndoClear = useCallback(() => {
    try {
      if (undoState && lastClearedContent) {
        onContentChange(lastClearedContent);
        setUndoState(null);
        setLastClearedContent('');
        
        if (undoTimeoutRef.current) {
          clearTimeout(undoTimeoutRef.current);
        }
        
        secureLog('Clear action undone', {
          restoredContentLength: lastClearedContent?.length || 0,
          timestamp: Date.now()
        });
      }
    } catch (error) {
      secureLog('Undo clear error', {
        error: error instanceof Error ? error.message : 'Unknown error',
        hasUndoState: !!undoState,
        hasLastContent: !!lastClearedContent
      });
    }
  }, [undoState, lastClearedContent, onContentChange]);
  
  // Smart font resolver function
  const getFontFamily = useCallback((baseFontFamily: string, fontWeight: 'normal' | 'bold', fontStyle: 'normal' | 'italic') => {
    try {
      // Handle system fonts
      if (baseFontFamily === 'System') {
        return 'System'; // System handles weight/style automatically
      }
      
      if (baseFontFamily === 'Times New Roman' || baseFontFamily === 'Times') {
        return 'Times New Roman'; // System font with built-in variants
      }
      
      // Handle custom fonts with smart variant selection
      switch (baseFontFamily) {
        case 'Orbitron':
          return 'Orbitron'; // Only has regular
          
        case 'Exo':
          if (fontWeight === 'bold' && fontStyle === 'italic') return 'Exo'; // Fallback if no bold+italic
          if (fontWeight === 'bold') return 'Exo-Bold';
          if (fontStyle === 'italic') return 'Exo-Italic';
          return 'Exo';
          
        case 'Audiowide':
          return 'Audiowide'; // Only has regular
          
        case 'Rajdhani':
          if (fontWeight === 'bold') return 'Rajdhani-Bold';
          if (fontStyle === 'italic') return 'Rajdhani-Light'; // Use Light as "italic"
          return 'Rajdhani';
          
        case 'Quantico':
          if (fontWeight === 'bold' && fontStyle === 'italic') return 'Quantico-Italic'; // Use italic as fallback
          if (fontWeight === 'bold') return 'Quantico-Bold';
          if (fontStyle === 'italic') return 'Quantico-Italic';
          return 'Quantico';
          
        case 'SpaceMono':
          return 'SpaceMono'; // Only has regular
          
        default:
          return baseFontFamily || 'System';
      }
    } catch (error) {
      secureLog('Font resolution error', {
        baseFontFamily,
        fontWeight,
        fontStyle,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return 'System'; // Safe fallback
    }
  }, []);
  
  const getTextInputStyle = useCallback((textStyle: TextStyle) => {
    try {
      const smartFontFamily = getFontFamily(
        textStyle.fontFamily || 'System',
        textStyle.fontWeight,
        textStyle.fontStyle
      );
      
      return {
        fontSize: textStyle.fontSize,
        fontWeight: textStyle.fontWeight,
        fontStyle: textStyle.fontStyle,
        textDecorationLine: ['shadow', 'outline', 'gradient'].includes(textStyle.textDecorationLine) 
          ? 'none' 
          : textStyle.textDecorationLine,
        textAlign: textStyle.textAlign,
        color: textStyle.color,
        fontFamily: smartFontFamily, // Use the smart font family
        textShadowColor: textStyle.textShadowColor || textStyle.textShadow,
        textShadowOffset: textStyle.textShadowOffset || (textStyle.textShadow ? { width: 1, height: 1 } : undefined),
        textShadowRadius: textStyle.textShadowRadius || (textStyle.textShadow ? 2 : 0),
      };
    } catch (error) {
      secureLog('Text style computation error', {
        fontSize: textStyle?.fontSize,
        fontFamily: textStyle?.fontFamily,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      // Return safe fallback style
      return {
        fontSize: 16,
        fontWeight: 'normal' as const,
        fontStyle: 'normal' as const,
        textDecorationLine: 'none' as const,
        textAlign: 'left' as const,
        color: '#FFFFFF',
        fontFamily: 'System',
      };
    }
  }, [getFontFamily]);
  
  // ENHANCED: Enterprise Emoji Handler
  const handleEmojiSelect = useCallback((emoji: string) => {
    try {
      insertText(emoji);
      Vibration.vibrate(30);
      
      secureLog('Emoji selected', { 
        emojiLength: emoji?.length || 0,
        position: selectionStart,
        language: selectedLanguage,
      });
    } catch (error) {
      secureLog('Emoji selection error', {
        error: error instanceof Error ? error.message : 'Unknown error',
        position: selectionStart
      });
    }
  }, [insertText, selectionStart, selectedLanguage]);
  
  const handleUpdateRecentEmojis = useCallback((emojis: string[]) => {
    try {
      setRecentEmojis(emojis);
      secureLog('Recent emojis updated', { 
        count: emojis?.length || 0,
        timestamp: Date.now()
      });
    } catch (error) {
      secureLog('Recent emojis update error', {
        error: error instanceof Error ? error.message : 'Unknown error',
        emojisCount: emojis?.length || 0
      });
    }
  }, []);
  
  // Input Handlers with enhanced error handling
  const handleTitleChange = useCallback((text: string) => {
    try {
      if (text.length <= maxTitleLength) {
        onTitleChange(text);
        validateContent(text, 'title');
      }
    } catch (error) {
      secureLog('Title change error', {
        textLength: text?.length || 0,
        maxLength: maxTitleLength,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }, [maxTitleLength, onTitleChange, validateContent]);
  
  const handleContentFocus = useCallback(() => {
    try {
      setIsContentFocused(true);
      animateFocus(true);
      animateToolbar(true);
    } catch (error) {
      secureLog('Content focus error', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }, [animateFocus, animateToolbar]);
  
  const handleContentBlur = useCallback(() => {
    try {
      setIsContentFocused(false);
      animateFocus(false);
      animateToolbar(false);
    } catch (error) {
      secureLog('Content blur error', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }, [animateFocus, animateToolbar]);
  
  const handleTitleFocus = useCallback(() => {
    try {
      setIsTitleFocused(true);
    } catch (error) {
      secureLog('Title focus error', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }, []);
  
  const handleTitleBlur = useCallback(() => {
    try {
      setIsTitleFocused(false);
    } catch (error) {
      secureLog('Title blur error', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }, []);
  
  const handleSelectionChange = useCallback((event: any) => {
    try {
      const { start, end } = event.nativeEvent.selection;
      setSelectionStart(start);
      setSelectionEnd(end);
    } catch (error) {
      secureLog('Selection change error', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }, []);
  
  const handleContentSizeChange = useCallback((event: any) => {
    try {
      const { height } = event.nativeEvent.contentSize;
      setContentHeight(Math.max(MIN_CONTENT_HEIGHT, height));
    } catch (error) {
      secureLog('Content size change error', {
        error: error instanceof Error ? error.message : 'Unknown error',
        minHeight: MIN_CONTENT_HEIGHT
      });
    }
  }, []);
  
  // ENHANCED: Comprehensive cleanup
  useEffect(() => {
    isMountedRef.current = true;
    
    return () => {
      isMountedRef.current = false;
      
      // Comprehensive cleanup
      cleanupAnimations();
      
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
        debounceTimeoutRef.current = null;
      }
      
      if (undoTimeoutRef.current) {
        clearTimeout(undoTimeoutRef.current);
        undoTimeoutRef.current = null;
      }
    };
  }, [cleanupAnimations]);
  
  // Memoized values for performance
  const titleCharacterCount = useMemo(() => 
    `${title?.length || 0}/${maxTitleLength}`, 
    [title?.length, maxTitleLength]);
  
  const contentCharacterCount = useMemo(() => 
    `${content?.length || 0}/${maxContentLength}`, 
    [content?.length, maxContentLength]);
  
  const isNearLimit = useMemo(() => ({
    title: (title?.length || 0) > maxTitleLength * 0.8,
    content: (content?.length || 0) > maxContentLength * 0.8,
  }), [title?.length, content?.length, maxTitleLength, maxContentLength]);
  
  const readingTime = useMemo(() => {
    try {
      const wordsPerMinute = 200;
      const estimatedTime = Math.ceil(wordCount / wordsPerMinute);
      return estimatedTime > 0 ? estimatedTime : 1;
    } catch (error) {
      secureLog('Reading time calculation error', {
        wordCount,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return 1;
    }
  }, [wordCount]);
  
  // Error boundary component render
  if (!isMountedRef.current) {
    return null;
  }
  
  try {
    return (
      <View style={styles.container}>
        {/* Title Section */}
        <View style={styles.titleSection}>
          <Animated.View
            style={[
              styles.inputContainer,
              {
                borderColor: focusAnimation.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['#00FFFF33', '#00FFFF'],
                }),
                shadowOpacity: focusAnimation.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.2, 0.5],
                }),
              },
            ]}
          >
            <LinearGradient
              colors={['rgba(0, 255, 255, 0.05)', 'transparent']}
              style={styles.inputGradient}
            >
              <TextInput
                ref={titleInputRef}
                style={[
                  styles.titleInput,
                  {
                    color: textStyle.color,
                    fontSize: Math.min(textStyle.fontSize + 2, 24),
                    fontWeight: textStyle.fontWeight,
                    fontStyle: textStyle.fontStyle,
                    fontFamily: textStyle.fontFamily,
                    textAlign: textStyle.textAlign,
                  },
                  errors.title && styles.errorInput,
                ]}
                placeholder={titlePlaceholder || t('textEditor.titlePlaceholder', 'Enter your title...')}
                placeholderTextColor="#888"
                value={title}
                onChangeText={handleTitleChange}
                onFocus={handleTitleFocus}
                onBlur={handleTitleBlur}
                maxLength={maxTitleLength}
                editable={!disabled}
                multiline
                autoCorrect
                accessibilityRole="text"
                accessibilityLabel={t('textEditor.titleAccessibility', 'Post title input')}
              />
            </LinearGradient>
          </Animated.View>
          
          <View style={styles.titleFooter}>
            <Text style={[
              styles.characterCount,
              isNearLimit.title && styles.nearLimitText
            ]}>
              {titleCharacterCount}
            </Text>
            {errors.title && (
              <Text style={styles.errorText}>{errors.title}</Text>
            )}
          </View>
        </View>
        
        {/* Enhanced Grouped Toolbar - Conditional Rendering */}
        {GroupedToolbar && (
          <GroupedToolbar
            textStyle={textStyle}
            onStyleUpdate={updateTextStyle}
            selectedLanguage={selectedLanguage}
            onLanguageChange={handleLanguageChange}
            languageConfig={LANGUAGE_CONFIG}
            userVIPStatus={userVIPStatus}
            vipFeatures={VIP_FEATURES}
            onShowEmojiPicker={() => setShowEmojiPicker(true)}
            onShowTemplates={() => setShowTemplateSelector(true)}
            disabled={disabled}
            animation={toolbarAnimation}
          />
        )}
        
        {/* Content Input Section */}
        <View style={styles.contentSection}>
          <Animated.View
            style={[
              styles.inputContainer,
              {
                borderColor: focusAnimation.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['#00FFFF33', '#00FFFF'],
                }),
                shadowOpacity: focusAnimation.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.2, 0.5],
                }),
              },
            ]}
          >
            <LinearGradient
              colors={['rgba(0, 20, 30, 0.4)', 'rgba(0, 10, 20, 0.6)']}
              style={styles.inputGradient}
            >
              <TextInput
                ref={contentInputRef}
                style={[
                  styles.contentInput,
                  {
                    minHeight: MIN_CONTENT_HEIGHT,
                    height: Math.max(MIN_CONTENT_HEIGHT, contentHeight),
                    ...getTextInputStyle(textStyle), // Use the smart style function
                  },
                  errors.content && styles.errorInput,
                ]}
                placeholder={placeholder || t('textEditor.contentPlaceholder', 'Share your gaming experience...')}
                placeholderTextColor="#888"
                value={content}
                onChangeText={handleContentChangeWithDetection}
                onFocus={handleContentFocus}
                onBlur={handleContentBlur}
                onSelectionChange={handleSelectionChange}
                onContentSizeChange={handleContentSizeChange}
                maxLength={maxContentLength}
                multiline
                textAlignVertical="top"
                editable={!disabled}
                autoCorrect
                accessibilityRole="text"
                accessibilityLabel={t('textEditor.contentAccessibility', 'Post content input')}
              />
            </LinearGradient>
          </Animated.View>
          
          {/* Enhanced Content Footer */}
          <View style={styles.contentFooter}>
            <View style={styles.statsContainer}>
              <Text style={styles.wordCount}>
                {t('textEditor.wordCount', { count: wordCount }, `${wordCount} words`)}
              </Text>
              <Text style={styles.readingTime}>
                {t('textEditor.readingTime', { time: readingTime }, `${readingTime} min read`)}
              </Text>
              <Text style={styles.languageIndicator}>
                {currentLanguageConfig.name}
              </Text>
            </View>
            <Text style={[
              styles.characterCount,
              isNearLimit.content && styles.nearLimitText
            ]}>
              {contentCharacterCount}
            </Text>
          </View>
          
          {errors.content && (
            <Text style={styles.errorText}>{errors.content}</Text>
          )}
        </View>
        
        {/* Clear All Button with Undo - Conditional Rendering */}
        {ClearAllButton && (
          <ClearAllButton
            onClearAll={handleClearAll}
            onUndo={handleUndoClear}
            undoState={undoState}
            disabled={disabled || (content?.trim()?.length || 0) === 0}
          />
        )}
        
        {/* Sub-Component Modals - Conditional Rendering */}
        {EmojiPicker && showEmojiPicker && (
          <EmojiPicker
            visible={showEmojiPicker}
            onSelect={handleEmojiSelect}
            onClose={() => setShowEmojiPicker(false)}
            recentEmojis={recentEmojis}
            onUpdateRecents={handleUpdateRecentEmojis}
          />
        )}
        
        {TemplateSelector && showTemplateSelector && (
          <TemplateSelector
            visible={showTemplateSelector}
            onSelect={(template) => {
              onContentChange(template);
              setShowTemplateSelector(false);
            }}
            onClose={() => setShowTemplateSelector(false)}
            userVIPStatus={userVIPStatus}
          />
        )}
        
        {VIPFeaturePreview && showVIPPreview && (
          <VIPFeaturePreview
            visible={showVIPPreview}
            onClose={() => {
              setShowVIPPreview(false);
              animateVIPFeature(false);
            }}
            featureType="text-editor"
            animation={vipAnimation}
          />
        )}
      </View>
    );
  } catch (error) {
    secureLog('TextEditor render error', {
      error: error instanceof Error ? error.message : 'Unknown error',
      hasContent: !!content,
      disabled,
      timestamp: Date.now()
    });
    
    // Fallback UI
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>
          {t('textEditor.errorFallback', 'An error occurred. Please try again.')}
        </Text>
      </View>
    );
  }
};

export default TextEditor;

/* ----------------- ENHANCED GAMING STYLES ----------------- */
const styles = StyleSheet.create({
  container: {
    marginVertical: 16,
  },
  titleSection: {
    marginBottom: 16,
  },
  contentSection: {
    marginBottom: 16,
  },
  inputContainer: {
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#00FFFF',
    backgroundColor: 'rgba(0, 30, 40, 0.9)',
    overflow: 'hidden',
    // Intense neon glow
    shadowColor: '#00FFFF',
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 20,
    shadowOpacity: 1,
    // Alternative: Box shadow simulation
    borderTopColor: '#00FFAA',
    borderLeftColor: '#00FFFF', 
    borderRightColor: '#0088FF',
    borderBottomColor: '#0066FF',
  },
  inputGradient: {
    padding: 2,
  },
  titleInput: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    padding: 16,
    minHeight: 60,
    textAlignVertical: 'top',
  },
  contentInput: {
    color: '#FFFFFF',
    fontSize: 16,
    padding: 16,
    textAlignVertical: 'top',
  },
  errorInput: {
    borderColor: '#FF6347',
  },
  titleFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingHorizontal: 4,
  },
  contentFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingHorizontal: 4,
  },
  statsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  characterCount: {
    color: '#888',
    fontSize: 12,
  },
  nearLimitText: {
    color: '#FFD700',
    fontWeight: 'bold',
  },
  wordCount: {
    color: '#00FFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  readingTime: {
    color: '#32CD32',
    fontSize: 12,
    fontWeight: '500',
  },
  languageIndicator: {
    color: '#FFD700',
    fontSize: 12,
    fontWeight: '500',
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  errorText: {
    color: '#FF6347',
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
  },
});