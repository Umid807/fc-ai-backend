import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Animated,
  Vibration,
  Dimensions,
  Modal,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { secureLog } from '../../utils/security';

// Firebase imports for VIP status checking
import { firebaseApp } from "../../app/firebaseConfig";
import { getFirestore, doc, onSnapshot } from 'firebase/firestore';
import { getAuth, onAuthStateChanged } from "firebase/auth";

const db = getFirestore(firebaseApp);
const auth = getAuth(firebaseApp);

// Enhanced TypeScript interfaces
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
  nameKey: string; // i18n key
  code: string;
}

interface VIPFeatures {
  fonts: string[];
  effects: string[];
  templates: string[];
  styling: string[];
}

interface DropdownOption {
  id: string;
  label: string;
  labelKey?: string; // i18n key
  value: any;
  icon?: string;
  isVIP?: boolean;
  preview?: string;
  previewKey?: string; // i18n key
  color?: string;
  isSelected?: boolean;
  onSelect?: () => void;
}

interface DropdownSection {
  id: string;
  title: string;
  titleKey: string; // i18n key
  icon: string;
  options: DropdownOption[];
  selectedValue?: any;
  isVIP?: boolean;
}

interface GroupedToolbarProps {
  textStyle: TextStyle;
  onStyleUpdate: <K extends keyof TextStyle>(key: K, value: TextStyle[K], requiresVIP?: boolean) => void;
  onBatchStyleUpdate?: (updates: Partial<TextStyle>) => void;
  selectedLanguage: string;
  onLanguageChange: (languageCode: string) => void;
  languageConfig: Record<string, LanguageConfig>;
  userVIPStatus: boolean; // This will be IGNORED - we use Firestore data
  vipFeatures: VIPFeatures;
  onShowEmojiPicker: () => void;
  onShowTemplates: () => void;
  onShowVIPUpgrade?: () => void;
  disabled: boolean;
  animation: Animated.Value;
}

// Constants
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const DROPDOWN_WIDTH = SCREEN_WIDTH * 0.9;

// Enhanced VIP status checker - centralized and secure
const checkVIPStatus = (userData: any): boolean => {
  if (!userData || typeof userData !== 'object') return false;
  
  const vipFields = [
    'vip', 'VIP', 'isVIP', 'isvip', 'Vip',
    'vipStatus', 'vipActive', 'isPremium', 'premium'
  ];
  
  return vipFields.some(field => 
    userData[field] === true || userData[field] === 'true'
  );
};

// Updated font sizes - limited for non-VIPs
const NON_VIP_FONT_SIZES = [
  { name: 'Compact', value: 14, nameKey: 'toolbar.fontSizeCompact', isDefault: false },
  { name: 'Default', value: 16, nameKey: 'toolbar.fontSizeDefault', isDefault: true },
  { name: 'Large', value: 20, nameKey: 'toolbar.fontSizeLarge', isDefault: false },
];

const VIP_FONT_SIZES = [10, 12, 14, 16, 18, 20, 22, 24, 28, 32, 36, 42, 48];

// All colors - VIP status determines accessibility
const ALL_COLORS = [
  { name: 'White', nameKey: 'toolbar.colorWhite', value: '#FFFFFF', category: 'basic', isDefault: true },
  { name: 'Cyan', nameKey: 'toolbar.colorCyan', value: '#00FFFF', category: 'gaming', isVIP: true },
  { name: 'Gold', nameKey: 'toolbar.colorGold', value: '#FFD700', category: 'gaming', isVIP: true },
  { name: 'Neon Green', nameKey: 'toolbar.colorNeonGreen', value: '#32CD32', category: 'gaming', isVIP: true },
  { name: 'Hot Pink', nameKey: 'toolbar.colorHotPink', value: '#FF69B4', category: 'gaming', isVIP: true },
  { name: 'Purple', nameKey: 'toolbar.colorPurple', value: '#9370DB', category: 'gaming', isVIP: true },
  { name: 'Orange', nameKey: 'toolbar.colorOrange', value: '#FFA500', category: 'basic', isVIP: true },
  { name: 'Red', nameKey: 'toolbar.colorRed', value: '#FF6347', category: 'basic', isVIP: true },
  { name: 'Blue', nameKey: 'toolbar.colorBlue', value: '#87CEEB', category: 'basic', isVIP: true },
  { name: 'Lime', nameKey: 'toolbar.colorLime', value: '#00FF00', category: 'vip', isVIP: true },
  { name: 'Magenta', nameKey: 'toolbar.colorMagenta', value: '#FF00FF', category: 'vip', isVIP: true },
  { name: 'Electric Blue', nameKey: 'toolbar.colorElectricBlue', value: '#0080FF', category: 'vip', isVIP: true },
];

// All fonts - VIP status determines accessibility
const ALL_FONTS = [
  { name: 'System', nameKey: 'toolbar.fontSystem', value: 'System', category: 'system', isDefault: true },
  { name: 'Times', nameKey: 'toolbar.fontTimes', value: 'Times New Roman', category: 'system', isVIP: true },
  
  // VIP Gaming Fonts
  { name: 'Orbitron', nameKey: 'toolbar.fontOrbitron', value: 'Orbitron', category: 'vip', preview: 'Futuristic Gaming', previewKey: 'toolbar.previewFuturistic', isVIP: true },
  { name: 'Exo', nameKey: 'toolbar.fontExo', value: 'Exo', category: 'vip', preview: 'Modern Tech', previewKey: 'toolbar.previewModernTech', isVIP: true },
  { name: 'Audiowide', nameKey: 'toolbar.fontAudiowide', value: 'Audiowide', category: 'vip', preview: 'Retro Future', previewKey: 'toolbar.previewRetroFuture', isVIP: true },
  { name: 'Rajdhani', nameKey: 'toolbar.fontRajdhani', value: 'Rajdhani', category: 'vip', preview: 'Sharp & Clean', previewKey: 'toolbar.previewSharpClean', isVIP: true },
  { name: 'Quantico', nameKey: 'toolbar.fontQuantico', value: 'Quantico', category: 'vip', preview: 'Military Style', previewKey: 'toolbar.previewMilitary', isVIP: true },
  { name: 'Space Mono', nameKey: 'toolbar.fontSpaceMono', value: 'SpaceMono', category: 'vip', preview: 'Code Style', previewKey: 'toolbar.previewCodeStyle', isVIP: true },
];

// Single text style options - mutually exclusive
const TEXT_STYLE_OPTIONS = [
  { 
    name: 'Regular', 
    nameKey: 'toolbar.regular',
    value: { fontWeight: 'normal' as const, fontStyle: 'normal' as const, textDecorationLine: 'none' as const }, 
    icon: 'text-outline', 
    category: 'basic', 
    isDefault: true 
  },
  { 
    name: 'Bold', 
    nameKey: 'toolbar.bold',
    value: { fontWeight: 'bold' as const, fontStyle: 'normal' as const, textDecorationLine: 'none' as const }, 
    icon: 'text', 
    category: 'basic' 
  },
  { 
    name: 'Italic', 
    nameKey: 'toolbar.italic',
    value: { fontWeight: 'normal' as const, fontStyle: 'italic' as const, textDecorationLine: 'none' as const }, 
    icon: 'text', 
    category: 'basic' 
  },
  { 
    name: 'Underline', 
    nameKey: 'toolbar.underline',
    value: { fontWeight: 'normal' as const, fontStyle: 'normal' as const, textDecorationLine: 'underline' as const }, 
    icon: 'text', 
    category: 'basic' 
  },
];

const ALIGNMENT_OPTIONS = [
  { name: 'Left', nameKey: 'toolbar.alignLeft', value: 'left' as const, icon: 'chevron-back', category: 'basic', isDefault: true },
  { name: 'Center', nameKey: 'toolbar.alignCenter', value: 'center' as const, icon: 'remove', category: 'basic' },
  { name: 'Right', nameKey: 'toolbar.alignRight', value: 'right' as const, icon: 'chevron-forward', category: 'basic' },
  { name: 'Justify', nameKey: 'toolbar.alignJustify', value: 'justify' as const, icon: 'menu', category: 'vip', isVIP: true },
];

// Extended language support with i18n keys
const LANGUAGE_CONFIG = {
  'en': { font: 'System', direction: 'ltr' as const, name: 'English', nameKey: 'language.english', code: 'en' },
  'zh': { font: 'NotoSansCJK', direction: 'ltr' as const, name: '中文', nameKey: 'language.chinese', code: 'zh' },
  'es': { font: 'System', direction: 'ltr' as const, name: 'Español', nameKey: 'language.spanish', code: 'es' },
  'hi': { font: 'NotoSansDevanagari', direction: 'ltr' as const, name: 'हिन्दी', nameKey: 'language.hindi', code: 'hi' },
  'ar': { font: 'NotoSansArabic', direction: 'rtl' as const, name: 'العربية', nameKey: 'language.arabic', code: 'ar' },
  'pt': { font: 'System', direction: 'ltr' as const, name: 'Português', nameKey: 'language.portuguese', code: 'pt' },
  'bn': { font: 'NotoSansBengali', direction: 'ltr' as const, name: 'বাংলা', nameKey: 'language.bengali', code: 'bn' },
  'ru': { font: 'System', direction: 'ltr' as const, name: 'Русский', nameKey: 'language.russian', code: 'ru' },
  'ja': { font: 'NotoSansCJK', direction: 'ltr' as const, name: '日本語', nameKey: 'language.japanese', code: 'ja' },
  'pa': { font: 'NotoSansGurmukhi', direction: 'ltr' as const, name: 'ਪੰਜਾਬੀ', nameKey: 'language.punjabi', code: 'pa' },
  'de': { font: 'System', direction: 'ltr' as const, name: 'Deutsch', nameKey: 'language.german', code: 'de' },
  'jv': { font: 'System', direction: 'ltr' as const, name: 'Javanese', nameKey: 'language.javanese', code: 'jv' },
  'ko': { font: 'NotoSansCJK', direction: 'ltr' as const, name: '한국어', nameKey: 'language.korean', code: 'ko' },
  'fr': { font: 'System', direction: 'ltr' as const, name: 'Français', nameKey: 'language.french', code: 'fr' },
  'te': { font: 'NotoSansTelugu', direction: 'ltr' as const, name: 'తెలుగు', nameKey: 'language.telugu', code: 'te' },
  'mr': { font: 'NotoSansDevanagari', direction: 'ltr' as const, name: 'मराठी', nameKey: 'language.marathi', code: 'mr' },
  'tr': { font: 'System', direction: 'ltr' as const, name: 'Türkçe', nameKey: 'language.turkish', code: 'tr' },
  'ta': { font: 'NotoSansTamil', direction: 'ltr' as const, name: 'தமிழ்', nameKey: 'language.tamil', code: 'ta' },
  'vi': { font: 'System', direction: 'ltr' as const, name: 'Tiếng Việt', nameKey: 'language.vietnamese', code: 'vi' },
  'ug': { font: 'NotoSansArabic', direction: 'rtl' as const, name: 'ئۇيغۇرچە', nameKey: 'language.uyghur', code: 'ug' },
};

// Helper function for cross-platform elevation/shadow
const getElevationStyle = (elevation: number) => {
  if (Platform.OS === 'ios') {
    return {
      shadowColor: '#00FFFF',
      shadowOffset: { width: 0, height: elevation / 2 },
      shadowOpacity: elevation === 0 ? 0 : 0.3,
      shadowRadius: elevation,
    };
  }
  return {
    elevation,
  };
};

const GroupedToolbar: React.FC<GroupedToolbarProps> = ({
  textStyle,
  onStyleUpdate,
  onBatchStyleUpdate,
  selectedLanguage,
  onLanguageChange,
  languageConfig,
  userVIPStatus: propVIPStatus,
  vipFeatures,
  onShowEmojiPicker,
  onShowTemplates,
  onShowVIPUpgrade,
  disabled,
  animation,
}) => {
  const { t } = useTranslation();
  
  // State management
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [actualVIPStatus, setActualVIPStatus] = useState<boolean>(propVIPStatus);
  const [isLoadingVIPStatus, setIsLoadingVIPStatus] = useState<boolean>(true);
  
  // Animation refs with cleanup tracking
  const bounceAnimation = useRef(new Animated.Value(1)).current;
  const dropdownAnimation = useRef(new Animated.Value(0)).current;
  const vipGlowAnimation = useRef(new Animated.Value(0)).current;
  const isMountedRef = useRef(true);
  const unsubscribeRef = useRef<(() => void)[]>([]);
  const animationRefs = useRef<Animated.CompositeAnimation[]>([]);
  
  // Enhanced animation cleanup
  const cleanupAnimations = useCallback(() => {
    try {
      // Stop all running animations
      animationRefs.current.forEach(animation => {
        animation.stop();
      });
      animationRefs.current = [];
      
      // Remove all listeners
      bounceAnimation.removeAllListeners();
      dropdownAnimation.removeAllListeners();
      vipGlowAnimation.removeAllListeners();
      
      // Reset animation values
      bounceAnimation.setValue(1);
      dropdownAnimation.setValue(0);
      vipGlowAnimation.setValue(0);
    } catch (error) {
      secureLog('Animation cleanup error', { error: error.message });
    }
  }, [bounceAnimation, dropdownAnimation, vipGlowAnimation]);
  
  // Component lifecycle management
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      cleanupAnimations();
    };
  }, [cleanupAnimations]);
  
  // VIP glow animation for premium features
  useEffect(() => {
    if (!isMountedRef.current) return;
    
    try {
      const glowLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(vipGlowAnimation, {
            toValue: 1,
            duration: 2000,
            useNativeDriver: false,
          }),
          Animated.timing(vipGlowAnimation, {
            toValue: 0,
            duration: 2000,
            useNativeDriver: false,
          }),
        ])
      );
      
      animationRefs.current.push(glowLoop);
      glowLoop.start();
      
      return () => {
        const index = animationRefs.current.indexOf(glowLoop);
        if (index > -1) {
          animationRefs.current.splice(index, 1);
        }
        glowLoop.stop();
      };
    } catch (error) {
      secureLog('VIP glow animation error', { error: error.message });
    }
  }, [vipGlowAnimation]);
  
  // Enhanced VIP status detection with secure logging
  useEffect(() => {
    isMountedRef.current = true;
    setIsLoadingVIPStatus(true);
    
    const cleanupListeners = () => {
      unsubscribeRef.current.forEach((unsubscribe) => {
        try {
          if (typeof unsubscribe === 'function') {
            unsubscribe();
          }
        } catch (error) {
          secureLog('Cleanup error', { error: error.message });
        }
      });
      unsubscribeRef.current = [];
    };
    
    // Listen to authentication state
    const authUnsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!isMountedRef.current) return;
      
      if (user) {
        try {
          // Listen to user document for real-time VIP status updates
          const userDocRef = doc(db, 'users', user.uid);
          const userDocUnsubscribe = onSnapshot(userDocRef, (userDoc) => {
            if (!isMountedRef.current) return;
            
            if (userDoc.exists()) {
              const userData = userDoc.data();
              setCurrentUser({ uid: user.uid, ...userData });
              
              // SECURE: Use centralized VIP checker (no sensitive logging)
              const isVIP = checkVIPStatus(userData);
              setActualVIPStatus(isVIP);
              
              // SECURE: Log minimal, non-sensitive information only
              secureLog('VIP status updated from Firestore', {
                userId: user.uid,
                hasVIPAccess: isVIP,
                timestamp: Date.now(),
              });
            } else {
              // User document doesn't exist
              setCurrentUser({ uid: user.uid });
              setActualVIPStatus(false);
              
              secureLog('User document not found, setting VIP to false', {
                userId: user.uid,
              });
            }
            setIsLoadingVIPStatus(false);
          }, (error) => {
            secureLog('Firestore listener error', { 
              error: error.message, 
              userId: user.uid 
            });
            // Fallback to prop value on error
            setActualVIPStatus(propVIPStatus);
            setIsLoadingVIPStatus(false);
          });
          
          unsubscribeRef.current.push(userDocUnsubscribe);
        } catch (error) {
          secureLog('VIP listener setup error', { 
            error: error.message, 
            userId: user.uid 
          });
          setActualVIPStatus(propVIPStatus);
          setIsLoadingVIPStatus(false);
        }
      } else {
        setCurrentUser(null);
        setActualVIPStatus(false);
        setIsLoadingVIPStatus(false);
      }
    });
    
    unsubscribeRef.current.push(authUnsubscribe);
    
    return () => {
      isMountedRef.current = false;
      cleanupListeners();
    };
  }, [propVIPStatus]);
  
  // Helper function to get current text style name with i18n
  const getCurrentTextStyleName = useCallback((): string => {
    for (const style of TEXT_STYLE_OPTIONS) {
      const matches = Object.entries(style.value).every(([key, value]) => 
        textStyle[key as keyof TextStyle] === value
      );
      if (matches) return t(style.nameKey, style.name);
    }
    return t('toolbar.regular', 'Regular');
  }, [textStyle, t]);
  
  // Enhanced VIP upgrade handler
  const handleVIPUpgrade = useCallback(() => {
    if (!isMountedRef.current) return;
    
    try {
      Vibration.vibrate([100, 50, 100]);
      closeDropdown();
      
      if (onShowVIPUpgrade) {
        onShowVIPUpgrade();
      }
      
      secureLog('VIP upgrade triggered', {
        userId: currentUser?.uid,
        hasCurrentVIPAccess: actualVIPStatus,
        timestamp: Date.now(),
      });
    } catch (error) {
      secureLog('VIP upgrade handler error', { error: error.message });
    }
  }, [currentUser?.uid, actualVIPStatus, onShowVIPUpgrade]);
  
  // Enhanced dropdown handlers with proper cleanup
  const toggleDropdown = useCallback((dropdownId: string) => {
 if (disabled || !isMountedRef.current) return;
 
 try {
   // NEW: Special handling for emojis - directly open picker
   if (dropdownId === 'emojis') {
     Vibration.vibrate(30);
     
     // Button bounce animation for emoji button
     const bounceSequence = Animated.sequence([
       Animated.timing(bounceAnimation, {
         toValue: 0.95,
         duration: 100,
         useNativeDriver: true,
       }),
       Animated.timing(bounceAnimation, {
         toValue: 1,
         duration: 100,
         useNativeDriver: true,
       }),
     ]);
     
     animationRefs.current.push(bounceSequence);
     bounceSequence.start((finished) => {
       const index = animationRefs.current.indexOf(bounceSequence);
       if (index > -1) {
         animationRefs.current.splice(index, 1);
       }
     });
     
     // Directly open emoji picker
     onShowEmojiPicker();
     return; // Exit early, don't open dropdown
   }
   
   Vibration.vibrate(30);
   
   if (activeDropdown === dropdownId) {
     // Close current dropdown
     const closeAnimation = Animated.timing(dropdownAnimation, {
       toValue: 0,
       duration: 200,
       useNativeDriver: true,
     });
     
     animationRefs.current.push(closeAnimation);
     closeAnimation.start((finished) => {
       if (finished && isMountedRef.current) {
         setActiveDropdown(null);
       }
       const index = animationRefs.current.indexOf(closeAnimation);
       if (index > -1) {
         animationRefs.current.splice(index, 1);
       }
     });
   } else {
     // Open new dropdown
     setActiveDropdown(dropdownId);
     const openAnimation = Animated.timing(dropdownAnimation, {
       toValue: 1,
       duration: 300,
       useNativeDriver: true,
     });
     
     animationRefs.current.push(openAnimation);
     openAnimation.start((finished) => {
       const index = animationRefs.current.indexOf(openAnimation);
       if (index > -1) {
         animationRefs.current.splice(index, 1);
       }
     });
   }
   
   // Button bounce animation for other buttons
   const bounceSequence = Animated.sequence([
     Animated.timing(bounceAnimation, {
       toValue: 0.95,
       duration: 100,
       useNativeDriver: true,
     }),
     Animated.timing(bounceAnimation, {
       toValue: 1,
       duration: 100,
       useNativeDriver: true,
     }),
   ]);
   
   animationRefs.current.push(bounceSequence);
   bounceSequence.start((finished) => {
     const index = animationRefs.current.indexOf(bounceSequence);
     if (index > -1) {
       animationRefs.current.splice(index, 1);
     }
   });
 } catch (error) {
   secureLog('Toggle dropdown error', { error: error.message, dropdownId });
 }
}, [activeDropdown, disabled, dropdownAnimation, bounceAnimation, onShowEmojiPicker]); // ← Added onShowEmojiPicker to dependencies

const closeDropdown = useCallback(() => {
 if (activeDropdown && isMountedRef.current) {
   try {
     const closeAnimation = Animated.timing(dropdownAnimation, {
       toValue: 0,
       duration: 200,
       useNativeDriver: true,
     });
     
     animationRefs.current.push(closeAnimation);
     closeAnimation.start((finished) => {
       if (finished && isMountedRef.current) {
         setActiveDropdown(null);
       }
       const index = animationRefs.current.indexOf(closeAnimation);
       if (index > -1) {
         animationRefs.current.splice(index, 1);
       }
     });
   } catch (error) {
     secureLog('Close dropdown error', { error: error.message });
     setActiveDropdown(null);
   }
 }
}, [activeDropdown, dropdownAnimation]);
  
  // Enhanced batch text style update handler
  const handleTextStyleUpdate = useCallback((styleUpdates: Partial<TextStyle>) => {
    if (disabled || !isMountedRef.current) return;
    
    try {
      if (onBatchStyleUpdate) {
        onBatchStyleUpdate(styleUpdates);
      } else {
        // Fallback to individual updates with delay to prevent conflicts
        Object.entries(styleUpdates).forEach(([key, value], index) => {
          setTimeout(() => {
            if (isMountedRef.current) {
              onStyleUpdate(key as keyof TextStyle, value, false);
            }
          }, index * 10);
        });
      }
      
      closeDropdown();
      Vibration.vibrate(30);
      
      secureLog('Batch text style updated', { 
        updateCount: Object.keys(styleUpdates).length,
        language: selectedLanguage,
        hasVIPAccess: actualVIPStatus,
        userId: currentUser?.uid,
      });
    } catch (error) {
      secureLog('Text style update error', { error: error.message });
    }
  }, [disabled, onBatchStyleUpdate, onStyleUpdate, closeDropdown, selectedLanguage, actualVIPStatus, currentUser?.uid]);
  
  // Enhanced single style update handler with proper VIP checking
  const handleStyleUpdate = useCallback(<K extends keyof TextStyle>(
    key: K, 
    value: TextStyle[K], 
    isVIP = false
  ) => {
    if (disabled || !isMountedRef.current) return;
    
    try {
      if (isVIP && !actualVIPStatus) {
        // Show VIP upgrade instead of blocking
        handleVIPUpgrade();
        
        secureLog('VIP feature triggered upgrade flow', { 
          feature: key, 
          hasVIPAccess: actualVIPStatus,
          userId: currentUser?.uid,
        });
        return;
      }
      
      // Apply style update
      onStyleUpdate(key, value, false);
      closeDropdown();
      Vibration.vibrate(30);
      
      secureLog('Style updated', {
        feature: key,
        hasVIPAccess: actualVIPStatus,
        userId: currentUser?.uid,
      });
    } catch (error) {
      secureLog('Style update error', { error: error.message, feature: key });
    }
  }, [onStyleUpdate, closeDropdown, actualVIPStatus, disabled, handleVIPUpgrade, currentUser?.uid]);
  
  const handleLanguageSelect = useCallback((languageCode: string) => {
    try {
      onLanguageChange(languageCode);
      closeDropdown();
      
      secureLog('Language changed', {
        newLanguage: languageCode,
        userId: currentUser?.uid,
      });
    } catch (error) {
      secureLog('Language change error', { error: error.message });
    }
  }, [onLanguageChange, closeDropdown, currentUser?.uid]);
  
  // Smart font resolver function
  const getFontFamily = useCallback((baseFontFamily: string, fontWeight: 'normal' | 'bold', fontStyle: 'normal' | 'italic') => {
    return baseFontFamily || 'System';
  }, []);
  
  // Enhanced text input style generator
  const getTextInputStyle = useCallback((textStyle: TextStyle) => {
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
      fontFamily: smartFontFamily,
      textShadowColor: textStyle.textShadowColor || textStyle.textShadow,
      textShadowOffset: textStyle.textShadowOffset || (textStyle.textShadow ? { width: 1, height: 1 } : undefined),
      textShadowRadius: textStyle.textShadowRadius || (textStyle.textShadow ? 2 : 0),
    };
  }, [getFontFamily]);
  
  // Enhanced font preview renderer
  const renderFontPreview = useCallback((fontName: string, hasVariants: boolean = false) => {
    const previewText = hasVariants ? 'Aa Bb' : 'Aa';
    const previewStyle = {
      fontFamily: fontName,
      fontSize: 14,
      color: '#00FFFF',
    };
    
    return (
      <View style={styles.fontPreviewContainer}>
        <Text style={[styles.fontPreviewText, previewStyle]}>
          {previewText}
        </Text>
      </View>
    );
  }, []);
  
  // Enhanced font size options with i18n
  const availableFontSizes = useMemo(() => {
    const allSizes = actualVIPStatus ? VIP_FONT_SIZES : [
      ...NON_VIP_FONT_SIZES.map(s => s.value),
      ...VIP_FONT_SIZES.filter(size => !NON_VIP_FONT_SIZES.some(nonVip => nonVip.value === size))
    ];
    
    return allSizes.map(size => {
      const isVIPSize = !NON_VIP_FONT_SIZES.some(nonVip => nonVip.value === size);
      const nonVipConfig = NON_VIP_FONT_SIZES.find(nonVip => nonVip.value === size);
      
      return {
        id: `size-${size}`,
        label: nonVipConfig ? t(nonVipConfig.nameKey, nonVipConfig.name) : `${size}px`,
        value: typeof size === 'object' ? size.value : size,
        preview: 'Aa',
        isSelected: textStyle.fontSize === (typeof size === 'object' ? size.value : size),
        isVIP: isVIPSize,
      };
    });
  }, [actualVIPStatus, textStyle.fontSize, t]);
  
  // Enhanced dropdown sections with comprehensive i18n
  const dropdownSections = useMemo((): DropdownSection[] => {
    const currentTextStyleName = getCurrentTextStyleName();
    
    return [
      {
        id: 'textStyle',
        title: t('toolbar.textStyle', 'Text Style'),
        titleKey: 'toolbar.textStyle',
        icon: 'text',
        options: [
          // Text style options
          ...TEXT_STYLE_OPTIONS.map(style => ({
            id: `style-${style.name.toLowerCase()}`,
            label: t(style.nameKey, style.name),
            labelKey: style.nameKey,
            value: style.value,
            icon: style.icon,
            isSelected: currentTextStyleName === t(style.nameKey, style.name),
            onSelect: () => handleTextStyleUpdate(style.value),
          })),
          // Alignment options
          ...ALIGNMENT_OPTIONS.map(align => ({
            id: `align-${align.value}`,
            label: t(align.nameKey, align.name),
            labelKey: align.nameKey,
            value: align.value,
            icon: align.icon,
            isVIP: align.isVIP,
            isSelected: textStyle.textAlign === align.value,
            onSelect: () => handleStyleUpdate('textAlign', align.value, align.isVIP),
          })),
        ],
      },
      {
        id: 'fontAndSize',
        title: t('toolbar.fontAndSize', 'Font & Size'),
        titleKey: 'toolbar.fontAndSize',
        icon: 'text',
        options: [
          // Font options
          ...ALL_FONTS.map(font => ({
            id: `font-${font.value}`,
            label: t(font.nameKey, font.name),
            labelKey: font.nameKey,
            value: font.value,
            preview: font.previewKey ? t(font.previewKey, font.preview) : font.preview || font.name,
            previewKey: font.previewKey,
            isVIP: font.isVIP,
            isSelected: textStyle.fontFamily === font.value,
            onSelect: () => handleStyleUpdate('fontFamily', font.value, font.isVIP),
          })),
          // Font size options
          ...availableFontSizes.map(size => ({
            ...size,
            onSelect: () => handleStyleUpdate('fontSize', size.value, size.isVIP),
          })),
        ],
      },
      {
        id: 'colors',
        title: t('toolbar.colors', 'Colors'),
        titleKey: 'toolbar.colors',
        icon: 'color-palette',
        options: ALL_COLORS.map(color => ({
          id: `color-${color.value}`,
          label: t(color.nameKey, color.name),
          labelKey: color.nameKey,
          value: color.value,
          color: color.value,
          isVIP: color.isVIP,
          isSelected: textStyle.color === color.value,
          onSelect: () => handleStyleUpdate('color', color.value, color.isVIP),
        })),
      },
      {
        id: 'language',
        title: t('toolbar.language', 'Language'),
        titleKey: 'toolbar.language',
        icon: 'globe',
        selectedValue: selectedLanguage,
        options: Object.entries(LANGUAGE_CONFIG).map(([code, config]) => ({
          id: `lang-${code}`,
          label: t(config.nameKey, config.name),
          labelKey: config.nameKey,
          value: code,
          isSelected: selectedLanguage === code,
          onSelect: () => handleLanguageSelect(code),
        })),
      },
{
  id: 'emojis',  // ← Changed from 'insert'
  title: t('toolbar.emojis', 'Emojis'),  // ← Changed title
  titleKey: 'toolbar.emojis',  // ← Changed key
  icon: 'happy',  // ← Changed from 'add-circle' to 'happy'
  options: [
    {
      id: 'emoji',
      label: t('toolbar.emojis', 'Emojis'),
      labelKey: 'toolbar.emojis',
      value: 'emoji',
      icon: 'happy',
      preview: t('toolbar.emojiCount', '300+'),
      previewKey: 'toolbar.emojiCount',
      onSelect: () => {
        onShowEmojiPicker();
        closeDropdown();
      },
    },
  ],
},
    ];
  }, [
    getCurrentTextStyleName,
    textStyle.textAlign,
    textStyle.fontFamily,
    textStyle.color,
    availableFontSizes,
    selectedLanguage,
    handleTextStyleUpdate,
    handleStyleUpdate,
    handleLanguageSelect,
    onShowEmojiPicker,
    onShowTemplates,
    closeDropdown,
    t,
  ]);
  
  // Enhanced dropdown option renderer with VIP sales technique
  const renderDropdownOption = useCallback((option: DropdownOption, sectionId: string) => {
    const isSelected = option.isSelected;
    const isVIPFeature = option.isVIP;
    const canUseVIPFeature = actualVIPStatus || isLoadingVIPStatus;
    const shouldShowVIPStyling = isVIPFeature && !actualVIPStatus;
    
    // Calculate VIP glow for premium features
    const vipGlowColor = vipGlowAnimation.interpolate({
      inputRange: [0, 1],
      outputRange: ['rgba(255, 215, 0, 0.2)', 'rgba(255, 215, 0, 0.6)'],
    });
    
    const handlePress = () => {
      try {
        if (option.onSelect) {
          option.onSelect();
        }
      } catch (error) {
        secureLog('Option press error', { error: error.message, optionId: option.id });
      }
    };
    
    return (
      <TouchableOpacity
        key={option.id}
        style={[
          styles.dropdownOption,
          isSelected && styles.selectedOption,
          shouldShowVIPStyling && styles.vipOption,
        ]}
        onPress={handlePress}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={option.labelKey ? t(option.labelKey, option.label) : option.label}
        accessibilityState={{ 
          selected: isSelected,
          disabled: shouldShowVIPStyling 
        }}
        accessibilityHint={shouldShowVIPStyling ? t('toolbar.vipFeatureHint', 'VIP feature - tap to upgrade') : undefined}
      >
        {/* VIP Glow Effect for Premium Features */}
        {shouldShowVIPStyling && (
          <Animated.View 
            style={[
              StyleSheet.absoluteFillObject,
              {
                backgroundColor: vipGlowColor,
                borderRadius: 8,
              }
            ]}
          />
        )}
        
        <View style={styles.optionContent}>
          {/* Selection indicator */}
          <View style={[
            styles.selectionIndicator,
            isSelected && styles.selectedIndicator,
          ]}>
            {isSelected && (
              <Ionicons name="checkmark" size={12} color="#32CD32" />
            )}
          </View>
          
          {option.icon && (
            <Ionicons 
              name={option.icon as any} 
              size={16} 
              color={
                isSelected ? '#32CD32' :
                shouldShowVIPStyling ? '#FFD700' : '#00FFFF'
              } 
            />
          )}
          
          {option.color && (
            <View 
              style={[
                styles.colorPreview, 
                { backgroundColor: option.color },
                isSelected && styles.selectedColorPreview,
                shouldShowVIPStyling && styles.vipColorPreview,
              ]} 
            />
          )}
          
          <Text style={[
            styles.optionLabel,
            isSelected && styles.selectedOptionLabel,
            shouldShowVIPStyling && styles.vipOptionLabel,
          ]}>
            {option.labelKey ? t(option.labelKey, option.label) : option.label}
          </Text>

          {/* Enhanced font preview for font options */}
          {option.id.startsWith('font-') ? (
            renderFontPreview(option.value)
          ) : option.preview && (
            <Text style={[
              styles.optionPreview,
              shouldShowVIPStyling && styles.vipPreview,
            ]}>
              {option.previewKey ? t(option.previewKey, option.preview) : option.preview}
            </Text>
          )}
          
          {/* VIP Crown Icon for Premium Features */}
          {shouldShowVIPStyling && (
            <View style={styles.vipBadge}>
              <Ionicons name="diamond" size={12} color="#FFD700" />
              <Text style={styles.vipBadgeText}>
                {t('toolbar.vip', 'VIP')}
              </Text>
            </View>
          )}
          
          {/* VIP User Crown (show they have access) */}
          {isVIPFeature && actualVIPStatus && (
            <Ionicons name="diamond" size={12} color="#32CD32" style={styles.vipOwnedIcon} />
          )}
        </View>
      </TouchableOpacity>
    );
  }, [actualVIPStatus, vipGlowAnimation, isLoadingVIPStatus, renderFontPreview, t]);
  
  // Get current dropdown section
  const currentSection = useMemo(() => 
    dropdownSections.find(section => section.id === activeDropdown),
    [dropdownSections, activeDropdown]
  );
  
  // Show loading state while checking VIP status
  if (isLoadingVIPStatus) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <Animated.View style={[styles.toolbarContainer, { opacity: 0.5 }]}>
          <View style={styles.loadingIndicator}>
            <Text style={styles.loadingText}>
              {t('toolbar.loadingVIPStatus', 'Loading...')}
            </Text>
          </View>
        </Animated.View>
      </View>
    );
  }
  
  return (
    <View style={styles.container}>
      {/* VIP Status Indicator */}
      {actualVIPStatus && (
        <View style={styles.vipStatusBadge}>
          <Ionicons name="diamond" size={16} color="#FFD700" />
          <Text style={styles.vipStatusText}>
            {t('toolbar.vipActive', 'VIP Active')}
          </Text>
        </View>
      )}
      
      {/* Main Toolbar - SAME STYLING AS ORIGINAL */}
      <Animated.View
        style={[
          styles.toolbarContainer,
          {
            transform: [{ scale: bounceAnimation }],
            opacity: animation,
          },
        ]}
      >
        <View style={styles.toolbar}>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.toolbarContent}
            accessibilityRole="tablist"
          >
            {dropdownSections.map((section) => (
              <TouchableOpacity
                key={section.id}
                style={[
                  styles.toolbarButton,
                  activeDropdown === section.id && styles.activeButton,
                ]}
                onPress={() => toggleDropdown(section.id)}
                disabled={disabled}
                activeOpacity={0.8}
                accessibilityRole="tab"
                accessibilityLabel={t(section.titleKey, section.title)}
                accessibilityState={{ 
                  selected: activeDropdown === section.id,
                  expanded: activeDropdown === section.id,
                  disabled: disabled 
                }}
              >
                <View style={styles.buttonContent}>
                  <Ionicons 
                    name={section.icon as any} 
                    size={14} 
                    color={activeDropdown === section.id ? '#32CD32' : '#00FFFF'} 
                  />
                  <Text style={[
                    styles.buttonLabel,
                    activeDropdown === section.id && styles.activeButtonLabel,
                  ]}>
                    {t(section.titleKey, section.title)}
                  </Text>
                  <Ionicons 
                    name="chevron-down" 
                    size={12} 
                    color={activeDropdown === section.id ? '#32CD32' : '#888'}
                    style={[
                      styles.chevron,
                      activeDropdown === section.id && styles.activeChevron,
                    ]}
                  />
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </Animated.View>
      
      {/* Enhanced Dropdown Modal - SAME STYLING AS ORIGINAL */}
      <Modal
        visible={activeDropdown !== null}
        transparent
        animationType="none"
        onRequestClose={closeDropdown}
        statusBarTranslucent
        accessibilityViewIsModal={true}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity 
            style={StyleSheet.absoluteFillObject}
            activeOpacity={1}
            onPress={closeDropdown}
            accessibilityRole="button"
            accessibilityLabel={t('common.close', 'Close')}
          />
          
          <Animated.View
            style={[
              styles.dropdownContainer,
              {
                transform: [
                  {
                    scale: dropdownAnimation.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.8, 1],
                    }),
                  },
                  {
                    translateY: dropdownAnimation.interpolate({
                      inputRange: [0, 1],
                      outputRange: [-20, 0],
                    }),
                  },
                ],
                opacity: dropdownAnimation,
              },
            ]}
          >
            <LinearGradient
              colors={['#000a0f', '#001520', '#000a0f']}
              style={styles.dropdownContent}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              {/* Header - SAME STYLING AS ORIGINAL */}
              <LinearGradient
                colors={['rgba(0, 255, 255, 0.08)', 'rgba(0, 0, 0, 0.3)']}
                style={styles.dropdownHeader}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Ionicons 
                  name={currentSection?.icon as any} 
                  size={20} 
                  color="#00FFFF" 
                />
                <Text style={styles.dropdownTitle}>
                  {currentSection ? t(currentSection.titleKey, currentSection.title) : ''}
                </Text>
                {!actualVIPStatus && (
                  <TouchableOpacity 
                    onPress={handleVIPUpgrade}
                    style={styles.upgradeButton}
                    activeOpacity={0.7}
                    accessibilityRole="button"
                    accessibilityLabel={t('toolbar.upgrade', 'Upgrade')}
                  >
                    <Ionicons name="diamond" size={16} color="#FFD700" />
                    <Text style={styles.upgradeButtonText}>
                      {t('toolbar.upgrade', 'Upgrade')}
                    </Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity 
                  onPress={closeDropdown} 
                  style={styles.closeButton}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel={t('common.close', 'Close')}
                >
                  <Ionicons name="close" size={20} color="#FFFFFF" />
                </TouchableOpacity>
              </LinearGradient>
              
              {/* Options - SAME STYLING AS ORIGINAL */}
              <ScrollView 
                style={styles.dropdownScroll}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
                accessibilityRole="list"
              >
                {currentSection?.options.map(option => 
                  renderDropdownOption(option, currentSection.id)
                )}
              </ScrollView>
            </LinearGradient>
          </Animated.View>
        </View>
      </Modal>
    </View>
  );
};

export default GroupedToolbar;

/* SAME STYLES AS ORIGINAL - NO UI CHANGES */
const styles = StyleSheet.create({
  container: {
    marginBottom: 12,
  },
  loadingContainer: {
    opacity: 0.7,
  },
  loadingIndicator: {
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: '#FFFFFF',
    fontSize: 14,
  },
  vipStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 8,
    gap: 4,
  },
  vipStatusText: {
    color: '#FFD700',
    fontSize: 12,
    fontWeight: 'bold',
  },
  toolbarContainer: {
    borderRadius: 12,
    backgroundColor: 'transparent',
    minHeight: 50,
    maxHeight: 50,
  },
  toolbar: {
    paddingVertical: 8,
    height: 50,
    justifyContent: 'center',
  },
  toolbarContent: {
    paddingHorizontal: 16,
    alignItems: 'center',
    gap: 8,
    height: '100%',
  },
  toolbarButton: {
    borderRadius: 8,
    backgroundColor: 'rgba(0, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 255, 0.2)',
    height: 34,
    justifyContent: 'center',
  },
  activeButton: {
    backgroundColor: 'rgba(50, 205, 50, 0.2)',
    borderColor: '#32CD32',
    ...getElevationStyle(1),
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
    height: '100%',
  },
  buttonLabel: {
    color: '#00FFFF',
    fontSize: 12,
    fontWeight: '600',
    minWidth: 45,
    textAlign: 'center',
  },
  activeButtonLabel: {
    color: '#32CD32',
  },
  chevron: {
    marginLeft: 2,
  },
  activeChevron: {
    transform: [{ rotate: '180deg' }],
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dropdownContainer: {
    width: DROPDOWN_WIDTH,
    maxHeight: '70%',
    borderRadius: 16,
    overflow: 'hidden',
    ...getElevationStyle(8),
  },
  dropdownContent: {
    height: 400,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(0, 255, 255, 0.4)',
  },
  dropdownHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'rgba(0, 255, 255, 0.1)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 255, 255, 0.2)',
    gap: 12,
  },
  dropdownTitle: {
    flex: 1,
    color: '#FFD700',
    fontSize: 18,
    fontWeight: 'bold',
  },
  upgradeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  upgradeButtonText: {
    color: '#FFD700',
    fontSize: 12,
    fontWeight: 'bold',
  },
  closeButton: {
    padding: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  dropdownScroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  dropdownOption: {
    marginVertical: 2,
    borderRadius: 8,
    backgroundColor: 'rgba(0, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'transparent',
    overflow: 'hidden',
  },
  selectedOption: {
    backgroundColor: 'rgba(50, 205, 50, 0.15)',
    borderColor: '#32CD32',
    ...getElevationStyle(1),
  },
  vipOption: {
    backgroundColor: 'rgba(255, 215, 0, 0.08)',
    borderColor: 'rgba(255, 215, 0, 0.3)',
    borderWidth: 2,
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 10,
    zIndex: 1,
  },
  selectionIndicator: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedIndicator: {
    backgroundColor: 'rgba(50, 205, 50, 0.2)',
    borderColor: '#32CD32',
  },
  optionLabel: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  selectedOptionLabel: {
    color: '#32CD32',
    fontWeight: '600',
  },
  vipOptionLabel: {
    color: '#FFD700',
    fontWeight: '600',
  },
  optionPreview: {
    color: '#888',
    fontSize: 12,
    fontStyle: 'italic',
    minWidth: 40,
    textAlign: 'right',
  },
  vipPreview: {
    color: '#FFD700',
    fontWeight: '600',
  },
  colorPreview: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  selectedColorPreview: {
    borderWidth: 2,
    borderColor: '#32CD32',
  },
  vipColorPreview: {
    borderWidth: 2,
    borderColor: '#FFD700',
  },
  vipBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    gap: 2,
  },
  vipBadgeText: {
    color: '#FFD700',
    fontSize: 10,
    fontWeight: 'bold',
  },
  vipOwnedIcon: {
    marginLeft: 4,
  },
  fontPreviewContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  fontPreviewText: {
    fontSize: 14,
  },
  variantsIndicator: {
    color: '#FFD700',
    fontSize: 10,
    opacity: 0.7,
  },
});