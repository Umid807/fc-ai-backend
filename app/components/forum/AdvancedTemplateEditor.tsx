import React, { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Modal,
  Animated,
  Vibration,
  Dimensions,
  Alert,
  TextInput,
  BackHandler,
  TouchableWithoutFeedback,
} from 'react-native';

import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

// Import existing components for maximum reuse
import TextEditor from './TextEditor';
import GroupedToolbar from './GroupedToolbar';
import VIPFeature from './VIPFeature';
import { validatePostContent, sanitizePostContent, secureLog } from '../../utils/security';
import SectionContentEditor from './SectionContentEditor';
import SectionTypeSelector, { createSectionByType } from './SectionTypeSelector';
import QuoteSectionEditor from './QuoteSectionEditor';
import ImageSectionEditor from './ImageSectionEditor';
import TableSectionEditor from './TableSectionEditor';
import VideoSectionEditor from './VideoSectionEditor';
import PollSectionEditor from './PollSectionEditor';
import SmoothDragList from './SmoothDragList';

// Types & Interfaces
interface TextStyle {
  fontSize: number;
  fontWeight: 'normal' | 'bold';
  fontStyle: 'normal' | 'italic';
  textDecorationLine: 'none' | 'underline' | 'line-through' | 'shadow' | 'outline';
  textAlign: 'left' | 'center' | 'right' | 'justify';
  color: string;
  fontFamily: string;
  textShadowColor?: string;
  textShadowOffset?: { width: number; height: number };
  textShadowRadius?: number;
}

interface TemplateSection {
  id: string;
  label: string;
  content: string;
  style: TextStyle;
  config: {
    placeholder: string;
    minHeight: number;
    maxHeight?: number;
    allowEmpty: boolean;
    type: 'text' | 'quote' | 'image' | 'table' | 'video' | 'poll';
  };
  order: number;
  isCollapsed: boolean;
  isEditing: boolean;
  // Type-specific data (matches SectionTypeSelector interface)
  images?: string[];
  quoteData?: {
    text: string;
    attribution: string;
    source?: string;
    platform?: 'twitter' | 'twitch' | 'youtube' | 'reddit';
  };
  tableData?: {
    template: string;
    headers: string[];
    rows: string[][];
  };
  videoData?: {
    url?: string;
    platform?: 'youtube' | 'twitch' | 'streamable' | 'upload';
    title?: string;
  };
  pollData?: {
    question: string;
    options: string[];
    settings: any;
  };
   showLabel?: boolean;
   showActionsMenu?: boolean;
   menuPosition?: { x: number; y: number; }; // Add position tracking
}

interface AdvancedTemplate {
  id: string;
  name: string;
  description: string;
  isVIP: boolean;
  category: 'gaming' | 'esports' | 'community' | 'custom';
  sections: Omit<TemplateSection, 'content' | 'isCollapsed' | 'isEditing'>[];
  metadata: {
    author?: string;
    uses: number;
    rating: number;
    thumbnail: string;
    tags: string[];
  };
}

interface AdvancedTemplateEditorProps {
  visible: boolean;
  onSave: (sections: TemplateSection[]) => void;
  onClose: () => void;
  userVIPStatus: boolean;
  initialTemplate?: AdvancedTemplate;
  existingSections?: TemplateSection[];
  onShowTemplateSelector?: () => void;
}

// Constants
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const MAX_SECTIONS_FREE = 3;
const MIN_SECTION_HEIGHT = 80;
const ANIMATION_DURATION = 300;

// Enhanced content sanitization
const sanitizeContent = (content: string): string => {
  try {
    if (!content || typeof content !== 'string') return '';
    
    // Remove potential XSS vectors while preserving spaces
    let sanitized = content
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '')
      .replace(/data:/gi, '');
      // REMOVED .trim() - this was likely removing spaces
    
    return sanitized;
  } catch (error) {
    secureLog('Content sanitization error', { 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
    return '';
  }
};

// Enhanced validation
const validateSectionContent = (content: string, config: TemplateSection['config']): { isValid: boolean; errors: string[] } => {
  try {
    const errors: string[] = [];
    
    if (!content || typeof content !== 'string') {
      if (!config.allowEmpty) {
        errors.push('Content is required');
      }
      return { isValid: errors.length === 0, errors };
    }
    
    const sanitized = sanitizeContent(content);
    if (sanitized !== content) {
      errors.push('Content contains invalid characters');
    }
    
    if (sanitized.length === 0 && !config.allowEmpty) {
      errors.push('Content cannot be empty');
    }
    
    if (sanitized.length > 10000) {
      errors.push('Content too long (max 10,000 characters)');
    }
    
    return { isValid: errors.length === 0, errors };
  } catch (error) {
    secureLog('Content validation error', { 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
    return { isValid: false, errors: ['Validation failed'] };
  }
};

// Built-in Templates for Quick Start
const QUICK_START_TEMPLATES: AdvancedTemplate[] = [
 {
   id: 'basic_multi_section',
   name: 'Basic Multi-Section Post',
   description: 'Simple template with three customizable sections',
   isVIP: false,
   category: 'gaming',
   sections: [
     {
       id: 'header',
       label: 'Header',
       style: {
         fontSize: 20,
         fontWeight: 'bold',
         fontStyle: 'normal',
         textDecorationLine: 'none',
         textAlign: 'center',
         color: '#FFD700',
         fontFamily: 'System',
       },
       config: {
         placeholder: '🎮 Your awesome title here...',
         minHeight: 60,
         maxHeight: 100,
         allowEmpty: false,
         type: 'text',
       },
       order: 0,
     },
     {
       id: 'content',
       label: 'Main Content',
       style: {
         fontSize: 16,
         fontWeight: 'normal',
         fontStyle: 'normal',
         textDecorationLine: 'none',
         textAlign: 'left',
         color: '#FFFFFF',
         fontFamily: 'System',
       },
       config: {
         placeholder: 'Share your thoughts, experiences, or insights...',
         minHeight: 120,
         maxHeight: 300,
         allowEmpty: false,
         type: 'text',
       },
       order: 1,
     },
     {
       id: 'conclusion',
       label: 'Conclusion',
       style: {
         fontSize: 15,
         fontWeight: 'normal',
         fontStyle: 'italic',
         textDecorationLine: 'none',
         textAlign: 'center',
         color: '#32CD32',
         fontFamily: 'System',
       },
       config: {
         placeholder: 'What do you think? Share your thoughts below! 👇',
         minHeight: 50,
         allowEmpty: true,
         type: 'text',
       },
       order: 2,
     },
   ],
   metadata: {
     uses: 0,
     rating: 5.0,
     thumbnail: 'basic_template.jpg',
     tags: ['basic', 'multi-section', 'starter'],
   },
 },
 {
   id: 'esports_match_report',
   name: 'eSports Match Report',
   description: 'Professional tournament coverage template',
   isVIP: true,
   category: 'esports',
   sections: [
     {
       id: 'match_header',
       label: 'Match Header',
       style: {
         fontSize: 22,
         fontWeight: 'bold',
         fontStyle: 'normal',
         textDecorationLine: 'none',
         textAlign: 'center',
         color: '#FFD700',
         fontFamily: 'System',
       },
       config: {
         placeholder: '🏆 GRAND FINAL: Team Alpha vs Team Beta',
         minHeight: 70,
         maxHeight: 120,
         allowEmpty: false,
         type: 'text',
       },
       order: 0,
     },
     {
       id: 'match_stats',
       label: 'Match Statistics',
       style: {
         fontSize: 14,
         fontWeight: 'normal',
         fontStyle: 'normal',
         textDecorationLine: 'none',
         textAlign: 'left',
         color: '#00FFFF',
         fontFamily: 'System',
       },
       config: {
         placeholder: 'Score: 3-1\nMVP: PlayerX\nTournament: World Championship',
         minHeight: 80,
         maxHeight: 150,
         allowEmpty: true,
         type: 'text',
       },
       order: 1,
     },
     {
       id: 'match_analysis',
       label: 'Match Analysis',
       style: {
         fontSize: 16,
         fontWeight: 'normal',
         fontStyle: 'normal',
         textDecorationLine: 'none',
         textAlign: 'left',
         color: '#FFFFFF',
         fontFamily: 'System',
       },
       config: {
         placeholder: 'Detailed breakdown of team strategies, key moments, and standout performances...',
         minHeight: 120,
         maxHeight: 400,
         allowEmpty: false,
         type: 'text',
       },
       order: 2,
     },
   ],
   metadata: {
     author: 'ProGamer',
     uses: 1247,
     rating: 4.9,
     thumbnail: 'esports_template.jpg',
     tags: ['esports', 'professional', 'tournament', 'analysis'],
   },
 },
];

// Section color scheme based on type and order
const getSectionColors = (section: TemplateSection, isActive: boolean) => {
  // Consistent 3D depth: always same color, different opacity for uniform visual depth
  const activeOpacity = [0.89, 0.38];
  const inactiveOpacity = [0.81, 0.32];
  
  // Special colors for header and main content sections
  if (section.label.toLowerCase().includes('header') || 
      section.label.toLowerCase().includes('title')) {
    const headerColor = '31, 0, 209';
    return isActive
      ? [`rgba(${headerColor}, ${activeOpacity[0]})`, `rgba(${headerColor}, ${activeOpacity[1]})`]
      : [`rgba(${headerColor}, ${inactiveOpacity[0]})`, `rgba(${headerColor}, ${inactiveOpacity[1]})`];
  }
  
  if (section.label.toLowerCase().includes('content') || 
      section.label.toLowerCase().includes('main')) {
    const contentColor = '54, 195, 243';
    return isActive
      ? [`rgba(${contentColor}, ${activeOpacity[0]})`, `rgba(${contentColor}, ${activeOpacity[1]})`]
      : [`rgba(${contentColor}, ${inactiveOpacity[0]})`, `rgba(${contentColor}, ${inactiveOpacity[1]})`];
  }

  const colorSchemes = {
    text: (() => {
      const color = '0, 255, 255';
      return isActive 
        ? [`rgba(${color}, ${activeOpacity[0]})`, `rgba(${color}, ${activeOpacity[1]})`]
        : [`rgba(${color}, ${inactiveOpacity[0]})`, `rgba(${color}, ${inactiveOpacity[1]})`];
    })(),
    quote: (() => {
      const color = '234, 202, 0';
      return isActive
        ? [`rgba(${color}, ${activeOpacity[0]})`, `rgba(${color}, ${activeOpacity[1]})`]
        : [`rgba(${color}, ${inactiveOpacity[0]})`, `rgba(${color}, ${inactiveOpacity[1]})`];
    })(),
    image: (() => {
      const color = '50, 205, 50';
      return isActive
        ? [`rgba(${color}, ${activeOpacity[0]})`, `rgba(${color}, ${activeOpacity[1]})`]
        : [`rgba(${color}, ${inactiveOpacity[0]})`, `rgba(${color}, ${inactiveOpacity[1]})`];
    })(),
    video: (() => {
      const color = '255, 71, 71';
      return isActive
        ? [`rgba(${color}, ${activeOpacity[0]})`, `rgba(${color}, ${activeOpacity[1]})`]
        : [`rgba(${color}, ${inactiveOpacity[0]})`, `rgba(${color}, ${inactiveOpacity[1]})`];
    })(),
    table: (() => {
      const color = '137, 43, 226';
      return isActive
        ? [`rgba(${color}, ${activeOpacity[0]})`, `rgba(${color}, ${activeOpacity[1]})`]
        : [`rgba(${color}, ${inactiveOpacity[0]})`, `rgba(${color}, ${inactiveOpacity[1]})`];
    })(),
    poll: (() => {
      const color = '255, 20, 145';
      return isActive
        ? [`rgba(${color}, ${activeOpacity[0]})`, `rgba(${color}, ${activeOpacity[1]})`]
        : [`rgba(${color}, ${inactiveOpacity[0]})`, `rgba(${color}, ${inactiveOpacity[1]})`];
    })(),
  };
  
  return colorSchemes[section.config.type] || colorSchemes.text;
};

const AdvancedTemplateEditor: React.FC<AdvancedTemplateEditorProps> = ({
  visible,
  onSave,
  onClose,
  userVIPStatus,
  initialTemplate,
  existingSections = [],
  onShowTemplateSelector,
}) => {
  const { t } = useTranslation();
  
  // Animation refs
  const slideAnimation = useRef(new Animated.Value(0)).current;
  const sectionAnimations = useRef<Record<string, Animated.Value>>({}).current;
  const animationRefs = useRef<Animated.CompositeAnimation[]>([]);
  const isMountedRef = useRef(true);
  
  // State management - Optimized with memoization
  const [sections, setSections] = useState<TemplateSection[]>([]);
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [showQuickStart, setShowQuickStart] = useState(false);
  const [showVIPUpgrade, setShowVIPUpgrade] = useState(false);
  const [showSectionTypeSelector, setShowSectionTypeSelector] = useState(false);
  const [templateName, setTemplateName] = useState('Custom Template');
  const [initialSections, setInitialSections] = useState<TemplateSection[]>([]);
  
  const scrollViewRef = useRef<ScrollView>(null);
  
  // Comprehensive animation cleanup
  const cleanupAnimations = useCallback(() => {
    try {
      // Stop all tracked animations
      animationRefs.current.forEach(animation => animation.stop());
      animationRefs.current = [];
      
      // Remove all listeners
      slideAnimation.removeAllListeners();
      
      // Reset animation values
      slideAnimation.setValue(0);
      
      // Cleanup section animations
      Object.values(sectionAnimations).forEach(animation => {
        animation.removeAllListeners();
        animation.setValue(0);
      });
    } catch (error) {
      secureLog('Animation cleanup error', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        animationCount: animationRefs.current.length 
      });
    }
  }, [slideAnimation, sectionAnimations]);
  
  // Enhanced useEffect with comprehensive cleanup
  useEffect(() => {
    isMountedRef.current = true;
    
    return () => {
      isMountedRef.current = false;
      cleanupAnimations();
    };
  }, [cleanupAnimations]);
  
  // Track unsaved changes - Optimized memoization
  const hasUnsavedChanges = useMemo(() => {
    try {
      if (initialSections.length === 0 && sections.length === 0) return false;
      if (initialSections.length !== sections.length) return true;
      
      return sections.some((section, index) => {
        const initial = initialSections[index];
        if (!initial) return true;
        
        return (
          section.content !== initial.content ||
          section.label !== initial.label ||
          section.showLabel !== initial.showLabel ||
          JSON.stringify(section.style) !== JSON.stringify(initial.style)
        );
      });
    } catch (error) {
      secureLog('Unsaved changes check error', { 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      return false;
    }
  }, [sections, initialSections]);
  
  // Initialize template data - FIXED: All sections collapsed by default
  useEffect(() => {
    if (!visible) return;
    
    try {
      // SMART: Distinguish between fresh template and existing content
      if (existingSections.length > 0) {
        // FIXED: Preserve existing content, just reset UI state
        const sectionsWithCollapsedState = existingSections.map(s => ({ 
          ...s, 
          isCollapsed: true, 
          isEditing: false,
          showLabel: s.showLabel !== undefined ? s.showLabel : true, // Default true
          showActionsMenu: false, // Close all menus
        }));
        setSections(sectionsWithCollapsedState);
        setInitialSections(sectionsWithCollapsedState.map(s => ({ ...s })));
        setActiveSection(null);
      } else if (initialTemplate) {
        // FIXED: Fresh template - start with empty content
        const loadedSections: TemplateSection[] = initialTemplate.sections.map((section) => ({
          ...section,
          content: '', // Empty for fresh template
          isCollapsed: true,
          isEditing: false,
          showLabel: true, // Default true for new sections
          showActionsMenu: false, // Default closed
        }));
        setSections(loadedSections);
        setInitialSections(loadedSections.map(s => ({ ...s })));
        setActiveSection(null);
        setTemplateName(initialTemplate.name);
      } else if (sections.length === 0) {
        setShowQuickStart(true);
      }
      
      // Animate modal appearance
      const slideInAnimation = Animated.spring(slideAnimation, {
        toValue: 1,
        useNativeDriver: true,
        tension: 100,
        friction: 8,
      });
      
      animationRefs.current.push(slideInAnimation);
      slideInAnimation.start();
    } catch (error) {
      secureLog('Template initialization error', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        hasInitialTemplate: !!initialTemplate,
        existingSectionsCount: existingSections.length 
      });
    }
  }, [visible, initialTemplate, slideAnimation, existingSections]);

  // Handle Android back button
  useEffect(() => {
    if (!visible) return;
    
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      try {
        if (hasUnsavedChanges) {
          Alert.alert(
            t('advancedTemplate.unsavedChanges'),
            t('advancedTemplate.unsavedChangesMessage'),
            [
              { text: t('common.cancel'), style: 'cancel' },
              { text: t('common.discard'), style: 'destructive', onPress: onClose },
            ]
          );
          return true;
        }
        onClose();
        return true;
      } catch (error) {
        secureLog('Back handler error', { 
          error: error instanceof Error ? error.message : 'Unknown error' 
        });
        onClose();
        return true;
      }
    });
    
    return () => backHandler.remove();
  }, [visible, hasUnsavedChanges, onClose, t]);
  
  // Initialize section animations
  useEffect(() => {
    try {
      sections.forEach(section => {
        if (!sectionAnimations[section.id]) {
          sectionAnimations[section.id] = new Animated.Value(section.isCollapsed ? 0 : 1);
        }
      });
    } catch (error) {
      secureLog('Section animation initialization error', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        sectionCount: sections.length 
      });
    }
  }, [sections, sectionAnimations]);
  
  // Section Management Functions
  const createNewSection = useCallback((template?: Partial<TemplateSection>) => {
    try {
      const newSection: TemplateSection = {
        id: `section_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        label: template?.label || `Section ${sections.length + 1}`,
        content: '',
        style: template?.style || {
          fontSize: 16,
          fontWeight: 'normal',
          fontStyle: 'normal',
          textDecorationLine: 'none',
          textAlign: 'left',
          color: '#FFFFFF',
          fontFamily: 'System',
        },
        config: template?.config || {
          placeholder: 'Enter your content here...',
          minHeight: MIN_SECTION_HEIGHT,
          allowEmpty: true,
          type: 'text',
        },
        order: sections.length,
        isCollapsed: false, // New sections start expanded
        isEditing: true,
        showLabel: true,
        showActionsMenu: false,
      };
      
      return newSection;
    } catch (error) {
      secureLog('Section creation error', { 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      return null;
    }
  }, [sections.length]);
  
  const handleSectionTypeSelect = useCallback((newSection: any) => {
    try {
      if (!newSection) return;
      
      // Collapse all other sections and close their menus
      const updatedSections = sections.map(section => ({
        ...section,
        isCollapsed: true,
        isEditing: false,
        showActionsMenu: false,
      }));
      
      // Ensure new section is collapsed
      const collapsedNewSection = {
        ...newSection,
        isCollapsed: true,
        isEditing: false,
        showLabel: true,
        showActionsMenu: false,
      };
      
      setSections([...updatedSections, collapsedNewSection]);
      setActiveSection(null); // No active section
      setShowSectionTypeSelector(false);
      Vibration.vibrate(30);
      
      secureLog('Advanced template section added', {
        sectionType: newSection.config?.type || 'unknown',
        sectionCount: sections.length + 1,
        userVIP: userVIPStatus,
      });
    } catch (error) {
      secureLog('Section type selection error', { 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  }, [sections, userVIPStatus]);

  const addSection = useCallback(() => {
    try {
      // Check VIP limits
      if (!userVIPStatus && sections.length >= MAX_SECTIONS_FREE) {
        setShowVIPUpgrade(true);
        Vibration.vibrate(100);
        return;
      }
      
      // Show section type selector instead of auto-creating
      setShowSectionTypeSelector(true);
      Vibration.vibrate(30);
    } catch (error) {
      secureLog('Add section error', { 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  }, [sections, userVIPStatus]);
  
  const removeSection = useCallback((sectionId: string) => {
    try {
      Alert.alert(
        'Delete Section',
        'Are you sure you want to delete this section?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: () => {
              setSections(prevSections => 
                prevSections.filter(section => section.id !== sectionId)
              );
              // Clear active section if it was deleted
              setActiveSection(null);
              
              secureLog('Section deleted', { 
                sectionId: sectionId ? 'present' : 'missing',
                remainingSections: sections.length - 1 
              });
            },
          },
        ]
      );
    } catch (error) {
      secureLog('Remove section error', { 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  }, [sections.length]);

  // Helper function to check if section is deletable
  const isDeletableSection = useCallback((section?: TemplateSection) => {
    try {
      if (!section) return false;
      
      // Only header/title sections are mandatory (non-deletable)
      if (section.label.toLowerCase().includes('header') || 
          section.label.toLowerCase().includes('title')) {
        return false;
      }
      
      // All other sections (including main content) are deletable
      return true;
    } catch (error) {
      secureLog('Deletable section check error', { 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      return false;
    }
  }, []);

  // TODO: Replace these manual move functions with SmoothDragList reordering
  const moveSectionUp = useCallback((sectionId: string) => {
    try {
      setSections(prev => {
        const sectionIndex = prev.findIndex(s => s.id === sectionId);
        const section = prev[sectionIndex];
        
        // Can't move header/title sections or first section
        if (sectionIndex <= 0 || !isDeletableSection(section)) return prev;
        
        // Can't move above a header/title section
        const targetSection = prev[sectionIndex - 1];
        if (!isDeletableSection(targetSection)) return prev;
        
        // Swap sections
        const newSections = [...prev];
        [newSections[sectionIndex - 1], newSections[sectionIndex]] = 
        [newSections[sectionIndex], newSections[sectionIndex - 1]];
        
        // Update order values and close menus
        return newSections.map((section, index) => ({ 
          ...section, 
          order: index,
          showActionsMenu: false, // Close all menus after move
        }));
      });
      
      Vibration.vibrate(30);
      secureLog('Section moved up', { sectionId: sectionId ? 'present' : 'missing' });
    } catch (error) {
      secureLog('Move section up error', { 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  }, [isDeletableSection]);

  const moveSectionDown = useCallback((sectionId: string) => {
    try {
      setSections(prev => {
        const sectionIndex = prev.findIndex(s => s.id === sectionId);
        const section = prev[sectionIndex];
        
        // Can't move last section or non-deletable sections
        if (sectionIndex >= prev.length - 1 || !isDeletableSection(section)) return prev;
        
        // Swap sections
        const newSections = [...prev];
        [newSections[sectionIndex], newSections[sectionIndex + 1]] = 
        [newSections[sectionIndex + 1], newSections[sectionIndex]];
        
        // Update order values and close menus
        return newSections.map((section, index) => ({ 
          ...section, 
          order: index,
          showActionsMenu: false, // Close all menus after move
        }));
      });
      
      Vibration.vibrate(30);
      secureLog('Section moved down', { sectionId: sectionId ? 'present' : 'missing' });
    } catch (error) {
      secureLog('Move section down error', { 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  }, [isDeletableSection]);

  // TODO: This will be replaced by SmoothDragList's onReorder callback
  const handleSectionReorder = useCallback((newSections: TemplateSection[]) => {
    try {
      // Update order values and close all menus
      const reorderedSections = newSections.map((section, index) => ({
        ...section,
        order: index,
        showActionsMenu: false,
      }));
      
      setSections(reorderedSections);
      Vibration.vibrate(30);
      
      secureLog('Sections reordered', {
        sectionCount: reorderedSections.length,
        userVIP: userVIPStatus,
      });
    } catch (error) {
      secureLog('Section reorder error', { 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  }, [userVIPStatus]);

  const toggleSection = useCallback((sectionId: string) => {
    try {
      setSections(prev => prev.map(section => {
        if (section.id === sectionId) {
          const newCollapsed = !section.isCollapsed;
          const newEditing = !newCollapsed;
          
          // Animate section
          const animation = Animated.spring(sectionAnimations[sectionId], {
            toValue: newCollapsed ? 0 : 1,
            useNativeDriver: false,
            tension: 150,
            friction: 8,
          });
          
          animationRefs.current.push(animation);
          animation.start();
          
          return {
            ...section,
            isCollapsed: newCollapsed,
            isEditing: newEditing,
            showActionsMenu: false, // Close menu when toggling
          };
        } else {
          // Collapse other sections when one is expanded
          if (!section.isCollapsed) {
            const animation = Animated.spring(sectionAnimations[section.id], {
              toValue: 0,
              useNativeDriver: false,
              tension: 150,
              friction: 8,
            });
            
            animationRefs.current.push(animation);
            animation.start();
          }
          return {
            ...section,
            isCollapsed: true,
            isEditing: false,
            showActionsMenu: false, // Close all other menus
          };
        }
      }));
      
      setActiveSection(sectionId);
      Vibration.vibrate(30);
    } catch (error) {
      secureLog('Toggle section error', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        sectionId: sectionId ? 'present' : 'missing' 
      });
    }
  }, [sectionAnimations]);
  
  const updateSectionContent = useCallback((sectionId: string, content: string) => {
    try {
      console.log('🟡 AdvancedTemplateEditor - updateSectionContent called');
      console.log('🟡 SectionId:', sectionId);
      console.log('🟡 Content received:', JSON.stringify(content));
      
      // Don't update content for image sections - they handle their own display
      setSections(prev => prev.map(section => {
        if (section.id === sectionId) {
          if (section.config.type === 'image') {
            console.log('🟡 Skipping content update for image section');
            return section; // Don't update content for image sections
          }
          const sanitizedContent = sanitizeContent(content);
          console.log('🟡 After sanitization:', JSON.stringify(sanitizedContent));
          return { ...section, content: sanitizedContent };
        }
        return section;
      }));
    } catch (error) {
      secureLog('Update section content error', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        sectionId: sectionId ? 'present' : 'missing' 
      });
    }
  }, []);
  
  const updateSectionStyle = useCallback((sectionId: string, styleUpdates: Partial<TextStyle>) => {
    try {
      setSections(prev => prev.map(section => {
        if (section.id === sectionId) {
          const newStyle = { ...section.style, ...styleUpdates };
          return { ...section, style: newStyle };
        }
        return section;
      }));
    } catch (error) {
      secureLog('Update section style error', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        sectionId: sectionId ? 'present' : 'missing' 
      });
    }
  }, []);
  
  const updateSectionLabel = useCallback((sectionId: string, label: string) => {
    try {
      const sanitizedLabel = sanitizeContent(label);
      setSections(prev => prev.map(section =>
        section.id === sectionId ? { ...section, label: sanitizedLabel } : section
      ));
    } catch (error) {
      secureLog('Update section label error', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        sectionId: sectionId ? 'present' : 'missing' 
      });
    }
  }, []);

  // FIXED: Close all floating menus
  const closeAllFloatingMenus = useCallback(() => {
    setSections(prev => prev.map(section => ({
      ...section,
      showActionsMenu: false,
    })));
  }, []);
  
  // Quick Start Template Selection
  const handleQuickStartTemplate = useCallback((template: AdvancedTemplate) => {
    try {
      if (template.isVIP && !userVIPStatus) {
        setShowVIPUpgrade(true);
        return;
      }
      
      // FIXED: All sections collapsed by default
      const loadedSections: TemplateSection[] = template.sections.map((section) => ({
        ...section,
        content: '',
        isCollapsed: true, // FIXED: Default collapsed
        isEditing: false,  // FIXED: Default not editing
        showActionsMenu: false, // Default closed
      }));
      
      setSections(loadedSections);
      setInitialSections(loadedSections.map(s => ({ ...s })));
      setActiveSection(null); // No active section initially
      setTemplateName(template.name);
      setShowQuickStart(false);
      
      secureLog('Quick start template selected', {
        templateId: template.id ? 'present' : 'missing',
        templateName: template.name || 'unnamed',
        sectionCount: template.sections?.length || 0,
        isVIP: template.isVIP,
      });
    } catch (error) {
      secureLog('Quick start template error', { 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  }, [userVIPStatus]);
  
  // Handle close with unsaved changes check
const handleClose = useCallback(() => {
  try {
    if (hasUnsavedChanges) {
      Alert.alert(
        t('advancedTemplate.unsavedChanges'),
        t('advancedTemplate.unsavedChangesMessage'),
        [
          { text: t('common.cancel'), style: 'cancel' },
          { text: t('common.discard'), style: 'destructive', onPress: onClose },
        ]
      );
    } else {
      // Save the current sections when closing (only if no unsaved changes)
      const sortedSections = sections.sort((a, b) => a.order - b.order);
      onSave(sortedSections);
      onClose();
    }
  } catch (error) {
    secureLog('Handle close error', { 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
    onClose();
  }
}, [hasUnsavedChanges, onClose, onSave, sections, t]);
  
  // Save Template - Enhanced validation
const handleSave = useCallback(() => {
  try {
    // Save all sections regardless of content - allow draft saving
    const sortedSections = sections.sort((a, b) => a.order - b.order);
    
    
    // Update initial state after successful save - this clears the "unsaved" indicator
    setInitialSections(sortedSections.map(s => ({ ...s })));
    
    // Show brief save confirmation without closing modal
    Alert.alert(
      'Saved!',
      'Your template has been saved successfully.',
      [{ text: 'OK', style: 'default' }]
    );
      
    secureLog('Advanced template saved', {
      templateName: templateName || 'unnamed',
      sectionCount: sortedSections.length,
      userVIP: userVIPStatus,
    });
  } catch (error) {
    secureLog('Save template error', { 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
    Alert.alert(
      t('advancedTemplate.errorTitle'),
      'An error occurred while saving. Please try again.'
    );
  }
}, [sections, templateName, userVIPStatus, onSave, t]);

  // Render Section Editor with error boundary
const renderSectionEditor = useCallback((section: TemplateSection, isDragging?: boolean, dragHandle?: React.ReactNode) => {
  try {
    const animation = sectionAnimations[section.id] || new Animated.Value(0);
    const isActive = activeSection === section.id;
    const isDeletable = isDeletableSection(section);
    
    return (
      <View 
        key={section.id} 
        style={[
          styles.sectionContainer,
          isDragging && styles.sectionContainerDragging, // Add dragging style
        ]}
      >
        {/* Section Header */}
        <TouchableOpacity
          style={[
            styles.sectionHeader,
            isActive && styles.activeSectionHeader,
            section.isCollapsed && styles.collapsedSectionHeader,
            isDragging && styles.sectionHeaderDragging, // Add dragging style
          ]}
          onPress={() => toggleSection(section.id)}
          activeOpacity={0.8}
          disabled={isDragging} // Disable touch when dragging
        >
          <LinearGradient
            colors={getSectionColors(section, isActive)}
            style={styles.sectionHeaderGradient}
          >
            <View style={styles.sectionHeaderContent}>
              <View style={styles.sectionHeaderLeft}>
                <Ionicons
                  name={section.isCollapsed ? 'chevron-forward' : 'chevron-down'}
                  size={20}
                  color={isActive ? '#00FFFF' : '#888'}
                />
                {isActive ? (
                  <TextInput
                    style={[
                      styles.sectionLabelInput,
                      styles.activeSectionLabel,
                    ]}
                    value={section.label}
                    onChangeText={(text) => updateSectionLabel(section.id, text)}
                    placeholder="Section Label"
                    placeholderTextColor="#888"
                    editable={!isDragging} // Disable editing when dragging
                  />
                ) : (
                  <Text style={styles.sectionLabel}>
                    {section.label}
                  </Text>
                )}
              </View>
              
              <View style={styles.sectionHeaderRight}>
                {/* Compact character count */}
                {section.content.length > 0 && (
                  <View style={styles.charCountBadge}>
                    <Text style={styles.charCountText}>{section.content.length}</Text>
                  </View>
                )}
                
                {/* Use the provided drag handle from SmoothDragList */}
                {isDeletable && dragHandle}
                
                {/* Floating actions button - FIXED: Track button position */}
                <TouchableOpacity
                  ref={(ref) => {
                    // Store reference for position tracking
                    if (ref && !section.menuPosition) {
                      ref.measure((x, y, width, height, pageX, pageY) => {
                        setSections(prev => prev.map(s => 
                          s.id === section.id 
                            ? { ...s, menuPosition: { x: pageX, y: pageY + height } }
                            : s
                        ));
                      });
                    }
                  }}
                  style={[
                    styles.floatingActionsButton,
                    section.showActionsMenu && styles.floatingActionsButtonActive
                  ]}
                  onPress={(e) => {
                    e.stopPropagation();
                    
                    // Get button position
                    e.currentTarget.measure((x, y, width, height, pageX, pageY) => {
                      setSections(prev => prev.map(s => 
                        s.id === section.id 
                          ? { 
                              ...s, 
                              showActionsMenu: !s.showActionsMenu,
                              menuPosition: { x: pageX, y: pageY + height }
                            }
                          : { ...s, showActionsMenu: false } // Close other menus
                      ));
                    });
                  }}
                  hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
                  disabled={isDragging} // Disable when dragging
                >
                  <Ionicons 
                    name={section.showActionsMenu ? "close" : "ellipsis-horizontal"} 
                    size={16} 
                    color={section.showActionsMenu ? "#FFD700" : "#00FFFF"} 
                  />
                </TouchableOpacity>
              </View>
            </View>
            
            {/* Content Preview for Collapsed Sections */}
            {section.isCollapsed && section.content.length > 0 && (
              <Text style={styles.sectionPreview} numberOfLines={2}>
                {section.content}
              </Text>
            )}
            
            {/* Clean dragging state - no ugly overlay */}
          </LinearGradient>
        </TouchableOpacity>
        
        {/* Section Content Editor */}
        <Animated.View
          style={[
            styles.sectionContentContainer,
            {
              opacity: animation,
            },
          ]}
        >
          {isActive && !section.isCollapsed && !isDragging && ( // Don't show content when dragging
            <View style={styles.sectionContent}>
              {section.config.type === 'quote' ? (
                <QuoteSectionEditor
                  section={section}
                  onContentChange={(content) => updateSectionContent(section.id, content)}
                  onStyleUpdate={(styleUpdates) => updateSectionStyle(section.id, styleUpdates)}
                  onSectionUpdate={(updates) => {
                    // Handle section-specific data updates
                    setSections(prev => prev.map(s => 
                      s.id === section.id ? { ...s, ...updates } : s
                    ));
                  }}
                  userVIPStatus={userVIPStatus}
                  disabled={false}
                />
              ) : section.config.type === 'image' ? (
                <ImageSectionEditor
                  section={section}
                  onContentChange={(content) => updateSectionContent(section.id, content)}
                  onStyleUpdate={(styleUpdates) => updateSectionStyle(section.id, styleUpdates)}
                  onSectionUpdate={(updates) => {
                    console.log('🔍 ImageSectionEditor update:', updates);
                    setSections(prev => prev.map(s => 
                      s.id === section.id ? { ...s, ...updates } : s
                    ));
                  }}
                  userVIPStatus={userVIPStatus}
                  disabled={false}
                />
              ) : section.config.type === 'table' ? (
                <TableSectionEditor
                  section={section}
                  onContentChange={(content) => updateSectionContent(section.id, content)}
                  onStyleUpdate={(styleUpdates) => updateSectionStyle(section.id, styleUpdates)}
                  onSectionUpdate={(updates) => {
                    setSections(prev => prev.map(s => 
                      s.id === section.id ? { ...s, ...updates } : s
                    ));
                  }}
                  userVIPStatus={userVIPStatus}
                  disabled={false}
                />
              ) : section.config.type === 'video' ? (
                <VideoSectionEditor
                  section={section}
                  onContentChange={(content) => updateSectionContent(section.id, content)}
                  onStyleUpdate={(styleUpdates) => updateSectionStyle(section.id, styleUpdates)}
                  onSectionUpdate={(updates) => {
                    setSections(prev => prev.map(s => 
                      s.id === section.id ? { ...s, ...updates } : s
                    ));
                  }}
                  userVIPStatus={userVIPStatus}
                  disabled={false}
                />
              ) : section.config.type === 'poll' ? (
                <PollSectionEditor
                  section={section}
                  onContentChange={(content) => updateSectionContent(section.id, content)}
                  onStyleUpdate={(styleUpdates) => updateSectionStyle(section.id, styleUpdates)}
                  onSectionUpdate={(updates) => {
                    setSections(prev => prev.map(s => 
                      s.id === section.id ? { ...s, ...updates } : s
                    ));
                  }}
                  userVIPStatus={userVIPStatus}
                  disabled={false}
                />
              ) : (
                <SectionContentEditor
                  content={section.content}
                  onContentChange={(content) => updateSectionContent(section.id, content)}
                  textStyle={section.style}
                  onStyleUpdate={(styleUpdates) => updateSectionStyle(section.id, styleUpdates)}
                  placeholder={section.config.placeholder}
                  minHeight={section.config.minHeight}
                  maxHeight={section.config.maxHeight}
                  sectionLabel={section.label}
                  sectionType={section.config.type}
                  userVIPStatus={userVIPStatus}
                  disabled={false}
                  onShowVIPUpgrade={() => setShowVIPUpgrade(true)}
                />
              )}
            </View>
          )}
        </Animated.View>
      </View>
    );
  } catch (error) {
    secureLog('Render section editor error', { 
      error: error instanceof Error ? error.message : 'Unknown error',
      sectionId: section?.id ? 'present' : 'missing' 
    });
    
    // Fallback UI for section render errors
    return (
      <View key={section?.id || 'error'} style={styles.sectionContainer}>
        <View style={styles.sectionHeader}>
          <Text style={styles.errorText}>
            Section could not be loaded. Please try refreshing.
          </Text>
        </View>
      </View>
    );
  }
}, [
  sectionAnimations,
  activeSection,
  isDeletableSection,
  toggleSection,
  updateSectionLabel,
  updateSectionContent,
  updateSectionStyle,
  userVIPStatus,
  setSections, // Make sure this is in the dependency array
  setShowVIPUpgrade, // Make sure this is in the dependency array
]);
  // Render Quick Start Modal
  const renderQuickStartModal = useCallback(() => (
    <Modal
      visible={showQuickStart}
      transparent
      animationType="fade"
      onRequestClose={() => setShowQuickStart(false)}
    >
      <View style={styles.quickStartOverlay}>
        <View style={styles.quickStartModal}>
          <LinearGradient
            colors={['rgba(18, 25, 40, 0.98)', 'rgba(10, 15, 25, 0.95)']}
            style={styles.quickStartContent}
          >
            <View style={styles.quickStartHeader}>
              <Text style={styles.quickStartTitle}>Choose a Template</Text>
              <TouchableOpacity 
                onPress={() => setShowQuickStart(false)}
                style={styles.quickStartClose}
              >
                <Ionicons name="close" size={24} color="#888" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.quickStartList}>
              {QUICK_START_TEMPLATES.map(template => (
                <TouchableOpacity
                  key={template.id}
                  style={[
                    styles.quickStartItem,
                    template.isVIP && !userVIPStatus && styles.vipQuickStartItem,
                  ]}
                  onPress={() => handleQuickStartTemplate(template)}
                  disabled={template.isVIP && !userVIPStatus}
                >
                  <LinearGradient
                    colors={
                      template.isVIP && !userVIPStatus
                        ? ['rgba(255, 215, 0, 0.1)', 'transparent']
                        : ['rgba(0, 255, 255, 0.1)', 'transparent']
                    }
                    style={styles.quickStartItemGradient}
                  >
                    <View style={styles.quickStartItemHeader}>
                      <Text style={[
                        styles.quickStartItemTitle,
                        template.isVIP && styles.vipQuickStartTitle,
                      ]}>
                        {template.name}
                      </Text>
                      {template.isVIP && (
                        <Ionicons name="crown" size={16} color="#FFD700" />
                      )}
                    </View>
                    <Text style={styles.quickStartItemDescription}>
                      {template.description}
                    </Text>
                    <Text style={styles.quickStartItemSections}>
                      {template.sections.length} sections
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>
              ))}
            </ScrollView>
            
            <TouchableOpacity
              style={styles.customTemplateButton}
              onPress={() => {
                const basicSection = createNewSection({
                  label: 'Content',
                  style: {
                    fontSize: 16,
                    fontWeight: 'normal',
                    fontStyle: 'normal',
                    textDecorationLine: 'none',
                    textAlign: 'left',
                    color: '#FFFFFF',
                    fontFamily: 'System',
                  },
                  config: {
                    placeholder: 'Start writing your content...',
                    minHeight: 120,
                    allowEmpty: false,
                    type: 'text',
                  },
                });
                if (basicSection) {
                  setSections([basicSection]);
                  setInitialSections([{ ...basicSection }]);
                  setActiveSection(basicSection.id);
                }
                setShowQuickStart(false);
              }}
            >
              <Text style={styles.customTemplateButtonText}>
                Start from Scratch
              </Text>
            </TouchableOpacity>
          </LinearGradient>
        </View>
      </View>
    </Modal>
  ), [showQuickStart, userVIPStatus, handleQuickStartTemplate, createNewSection]);
  
  // Calculate section count display
  const sectionCountDisplay = useMemo(() => {
    try {
      const current = sections.length;
      const max = userVIPStatus ? '∞' : MAX_SECTIONS_FREE;
      return `${current}/${max}`;
    } catch (error) {
      secureLog('Section count display error', { 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      return '0/0';
    }
  }, [sections.length, userVIPStatus]);
  
  // FIXED: Render Floating Actions Menu with proper positioning
  const renderFloatingActionsMenu = useCallback((section: TemplateSection) => {
    if (!section.showActionsMenu || !section.menuPosition) return null;
    
    // Calculate menu position
// Calculate menu position - centered vertically
const menuX = Math.min(section.menuPosition.x - 220, SCREEN_WIDTH - 220); // Ensure menu fits on screen
const menuY = SCREEN_HEIGHT / 2 - 100; // Always center vertically (100 is roughly half menu height)
    
    return (
      <View key={`menu-${section.id}`} style={[styles.floatingMenuWrapper, { pointerEvents: 'box-none' }]}>
        {/* FIXED: Invisible backdrop for tap-outside-to-close */}
        <TouchableWithoutFeedback onPress={closeAllFloatingMenus}>
          <View style={styles.floatingMenuBackdrop} />
        </TouchableWithoutFeedback>
        
        <Animated.View style={[
          styles.floatingActionsMenu,
          {
            left: menuX,
            top: menuY,
          }
        ]}>
          <LinearGradient
            colors={['rgba(0, 20, 30, 0.98)', 'rgba(0, 30, 40, 0.95)']}
            style={styles.floatingActionsGradient}
          >
            {/* Label visibility toggle */}
            <TouchableOpacity
              style={[
                styles.floatingActionItem,
                section.showLabel && styles.floatingActionItemActive
              ]}
              onPress={() => {
                setSections(prev => prev.map(s => 
                  s.id === section.id 
                    ? { ...s, showLabel: !s.showLabel, showActionsMenu: false }
                    : s
                ));
              }}
            >
              <View style={styles.floatingActionIcon}>
                <Ionicons 
                  name={section.showLabel ? "eye" : "eye-off"} 
                  size={18} 
                  color={section.showLabel ? "#9370DB" : "#666"} 
                />
              </View>
              <View style={styles.floatingActionContent}>
                <Text style={styles.floatingActionTitle}>
                  {section.showLabel ? 'Hide Label' : 'Show Label'}
                </Text>
                <Text style={styles.floatingActionSubtitle}>
                  {section.showLabel ? 'Label will be hidden in preview' : 'Label will be shown in preview'}
                </Text>
              </View>
            </TouchableOpacity>
            
            {/* Move Up Action */}
            {isDeletableSection(section) && sections.findIndex(s => s.id === section.id) > 0 && (
              <>
                <View style={styles.floatingActionDivider} />
                <TouchableOpacity
                  style={styles.floatingActionItem}
                  onPress={() => moveSectionUp(section.id)}
                >
                  <View style={styles.floatingActionIcon}>
                    <Ionicons name="arrow-up" size={18} color="#00BFFF" />
                  </View>
                  <View style={styles.floatingActionContent}>
                    <Text style={styles.floatingActionTitle}>Move Up</Text>
                    <Text style={styles.floatingActionSubtitle}>Move this section higher</Text>
                  </View>
                </TouchableOpacity>
              </>
            )}
            
            {/* Move Down Action - FIXED: Using correct function */}
            {isDeletableSection(section) && sections.findIndex(s => s.id === section.id) < sections.length - 1 && (
              <>
                <View style={styles.floatingActionDivider} />
                <TouchableOpacity
                  style={styles.floatingActionItem}
                  onPress={() => moveSectionDown(section.id)}
                >
                  <View style={styles.floatingActionIcon}>
                    <Ionicons name="arrow-down" size={18} color="#00BFFF" />
                  </View>
                  <View style={styles.floatingActionContent}>
                    <Text style={styles.floatingActionTitle}>Move Down</Text>
                    <Text style={styles.floatingActionSubtitle}>Move this section lower</Text>
                  </View>
                </TouchableOpacity>
              </>
            )}
            
{/* Clear Content Action */}
{section.content.length > 0 && (
  <>
    <View style={styles.floatingActionDivider} />
    <TouchableOpacity
      style={styles.floatingActionItem}
      onPress={() => {
        Alert.alert(
          'Clear Content',
          'Are you sure you want to clear all content in this section?',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Clear',
              style: 'destructive',
              onPress: () => {
                updateSectionContent(section.id, '');
                setSections(prev => prev.map(s => 
                  s.id === section.id ? { ...s, showActionsMenu: false } : s
                ));
                Vibration.vibrate(30);
              },
            },
          ]
        );
      }}
    >
      <View style={styles.floatingActionIcon}>
        <Ionicons name="refresh-outline" size={18} color="#FFA500" />
      </View>
      <View style={styles.floatingActionContent}>
        <Text style={styles.floatingActionTitle}>Clear Content</Text>
        <Text style={styles.floatingActionSubtitle}>Reset this section's content</Text>
      </View>
    </TouchableOpacity>
  </>
)}

{/* Delete action for deletable sections */}
{isDeletableSection(section) && (
  <>
    <View style={styles.floatingActionDivider} />
    <TouchableOpacity
      style={[styles.floatingActionItem, styles.floatingActionItemDanger]}
      onPress={() => removeSection(section.id)}
    >
      <View style={styles.floatingActionIconDanger}>
        <Ionicons name="trash-outline" size={18} color="#FF6347" />
      </View>
      <View style={styles.floatingActionContent}>
        <Text style={[styles.floatingActionTitle, styles.floatingActionTitleDanger]}>
          Delete Section
        </Text>
        <Text style={[styles.floatingActionSubtitle, styles.floatingActionSubtitleDanger]}>
          This action cannot be undone
        </Text>
      </View>
    </TouchableOpacity>
  </>
)}
          </LinearGradient>
        </Animated.View>
      </View>
    );
  }, [sections, isDeletableSection, moveSectionUp, moveSectionDown, removeSection, closeAllFloatingMenus]);
  
  if (!visible) return null;
  
  try {
    return (
      <Modal
        visible={visible}
        animationType="none"
        transparent
        onRequestClose={handleClose}
      >
        <View style={styles.modalOverlay}>
          <Animated.View
            style={[
              styles.modalContainer,
              {
                transform: [
                  {
                    translateY: slideAnimation.interpolate({
                      inputRange: [0, 1],
                      outputRange: [SCREEN_HEIGHT, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            <LinearGradient
              colors={['rgba(18, 25, 40, 0.98)', 'rgba(10, 15, 25, 0.95)']}
              style={styles.modalContent}
            >
              {/* Header */}
              <View style={styles.header}>
                <View style={styles.headerLeft}>
                  <TouchableOpacity onPress={handleClose} style={styles.backButton}>
                    <Ionicons name="chevron-back" size={24} color="#00FFFF" />
                  </TouchableOpacity>
                  <View>
                    <Text style={styles.title}>Advanced Editor</Text>
                    <Text style={styles.subtitle}>
                      Sections: {sectionCountDisplay}
                      {hasUnsavedChanges && <Text style={styles.unsavedIndicator}> • Unsaved</Text>}
                    </Text>
                  </View>
                </View>
                
                <TouchableOpacity 
                  onPress={hasUnsavedChanges ? handleSave : undefined} 
                  style={[styles.saveButton, !hasUnsavedChanges && styles.saveButtonDisabled]}
                  disabled={!hasUnsavedChanges}
                >
                  <LinearGradient
                    colors={hasUnsavedChanges 
                      ? ['rgba(50, 205, 50, 0.8)', 'rgba(34, 139, 34, 0.6)']
                      : ['rgba(128, 128, 128, 0.6)', 'rgba(96, 96, 96, 0.4)']
                    }
                    style={styles.saveButtonGradient}
                  >
                    <Ionicons 
                      name="checkmark" 
                      size={20} 
                      color={hasUnsavedChanges ? "#FFFFFF" : "#CCCCCC"} 
                    />
                    <Text style={[
                      styles.saveButtonText,
                      !hasUnsavedChanges && styles.saveButtonTextDisabled
                    ]}>
                      Save
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>

{/* SmoothDragList Integration */}
<SmoothDragList
  items={sections}
  onReorder={handleSectionReorder}
  renderItem={(section, isDragging, dragHandle) => renderSectionEditor(section, isDragging, dragHandle)}
  canDrag={isDeletableSection}
  keyExtractor={(section) => section.id}
  style={styles.sectionsContainer}
  contentContainerStyle={styles.sectionsContentContainer}
  showsVerticalScrollIndicator={false}
  // Gaming-optimized settings
  hapticFeedback={true}
  autoScrollThreshold={80}
  autoScrollSpeed={3}
  dragActivationDelay={0} // Immediate activation for drag handle
  dragScale={1.03}
  dragOpacity={0.95}
  insertionLineColor="#00FFFF"
  insertionLineHeight={2}
  elasticityTension={180}
  elasticityFriction={9}
/>

{/* Add Section Button - MOVED OUTSIDE SmoothDragList */}
<TouchableOpacity
  style={[
    styles.addSectionButton,
    !userVIPStatus && sections.length >= MAX_SECTIONS_FREE && styles.disabledAddSection,
  ]}
  onPress={addSection}
  disabled={!userVIPStatus && sections.length >= MAX_SECTIONS_FREE}
>
  <LinearGradient
    colors={
      !userVIPStatus && sections.length >= MAX_SECTIONS_FREE
        ? ['rgba(255, 215, 0, 0.2)', 'rgba(255, 215, 0, 0.1)']
        : ['rgba(0, 255, 255, 0.2)', 'rgba(0, 255, 255, 0.1)']
    }
    style={styles.addSectionGradient}
  >
    <Ionicons
      name="add-circle"
      size={24}
      color={
        !userVIPStatus && sections.length >= MAX_SECTIONS_FREE
          ? '#FFD700'
          : '#00FFFF'
      }
    />
    <Text style={[
      styles.addSectionText,
      !userVIPStatus && sections.length >= MAX_SECTIONS_FREE && styles.vipAddSectionText,
    ]}>
      {!userVIPStatus && sections.length >= MAX_SECTIONS_FREE
        ? 'Upgrade to VIP for Unlimited Sections'
        : 'Add New Section'
      }
    </Text>
  </LinearGradient>
</TouchableOpacity>

{/* Drag Instructions - Updated text */}
{sections.some(s => isDeletableSection(s)) && (
  <View style={styles.dragInstructions}>
    <LinearGradient
      colors={['rgba(0, 255, 255, 0.05)', 'rgba(0, 255, 255, 0.01)']}
      style={styles.dragInstructionsGradient}
    >
      <Ionicons name="information-circle-outline" size={18} color="#00FFFF" />
      <View style={styles.dragInstructionsContent}>
        <Text style={styles.dragInstructionsTitle}>💡 Pro Tip</Text>
        <Text style={styles.dragInstructionsText}>
          Drag sections smoothly to any position - see the insertion line!
        </Text>
      </View>
    </LinearGradient>
  </View>
)}
               
              
              {/* FIXED: Floating Actions Menus - Positioned Outside ScrollView */}
              {sections.map(section => renderFloatingActionsMenu(section))}
            </LinearGradient>
          </Animated.View>
          
          {/* Quick Start Modal */}
          {renderQuickStartModal()}
          
          {/* Section Type Selector */}
          <SectionTypeSelector
            visible={showSectionTypeSelector}
            onSelect={handleSectionTypeSelect}
            onClose={() => setShowSectionTypeSelector(false)}
            userVIPStatus={userVIPStatus}
            existingSectionCount={sections.length}
            maxSectionsForUser={userVIPStatus ? Infinity : MAX_SECTIONS_FREE}
            onShowVIPUpgrade={() => setShowVIPUpgrade(true)}
          />
          
          {/* VIP Upgrade Modal */}
          <VIPFeature
            visible={showVIPUpgrade}
            onClose={() => setShowVIPUpgrade(false)}
            featureType="advanced-templates"
            animation={new Animated.Value(showVIPUpgrade ? 1 : 0)}
          />
        </View>
      </Modal>
    );
  } catch (error) {
    secureLog('Main render error', { 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
    
    // Fallback UI
    return (
      <Modal visible={visible} transparent onRequestClose={onClose}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>
                An error occurred. Please close and try again.
              </Text>
              <TouchableOpacity onPress={onClose} style={styles.errorButton}>
                <Text style={styles.errorButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  }
};

export default AdvancedTemplateEditor;

/* ----------------- IMPROVED GAMING STYLES ----------------- */
const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
  },
  modalContainer: {
    flex: 1,
    marginTop: 50,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
  },
  modalContent: {
    flex: 1,
    paddingTop: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 255, 255, 0.2)',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  backButton: {
    padding: 8,
    marginRight: 12,
  },
  title: {
    color: '#FFD700',
    fontSize: 22,
    fontWeight: 'bold',
  },
  subtitle: {
    color: '#00FFFF',
    fontSize: 14,
    marginTop: 2,
  },
  unsavedIndicator: {
    color: '#FF6347',
    fontWeight: 'bold',
  },
  saveButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  saveButtonTextDisabled: {
    color: '#CCCCCC',
  },
sectionsContainer: {
  flex: 1,
  padding: 20,
  paddingBottom: 0, // Remove bottom padding
},
sectionsContentContainer: {
  paddingBottom: 200, // Space for add button and instructions
},
  sectionContainer: {
    marginBottom: 16,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 255, 0.2)',
  },
  sectionHeader: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  activeSectionHeader: {
    borderColor: '#00FFFF',
    shadowColor: '#00FFFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 0,
  },
  collapsedSectionHeader: {
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
  },
  sectionHeaderGradient: {
    padding: 16,
  },
  sectionHeaderContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  sectionLabel: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 12,
    flex: 1,
  },
  activeSectionLabel: {
    color: '#00FFFF',
  },
  sectionLabelInput: {
    color: '#00FFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 12,
    flex: 1,
    backgroundColor: 'rgba(0, 255, 255, 0.1)',
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 255, 0.3)',
  },
  sectionHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  charCountBadge: {
    backgroundColor: 'rgba(0, 255, 255, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 255, 0.3)',
  },
  charCountText: {
    color: '#00FFFF',
    fontSize: 10,
    fontWeight: '600',
  },
  
  // Simplified drag handle styles (to be replaced by SmoothDragList)
  dragHandleContainer: {
    padding: 8,
    borderRadius: 6,
  },
  dragHandle: {
    width: 16,
    height: 18,
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: 4,
    paddingVertical: 2,
  },
  dragDotRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 2,
  },
  dragDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#888',
  },
  
  floatingActionsButton: {
    backgroundColor: 'rgba(0, 255, 255, 0.15)',
    borderRadius: 12,
    padding: 8,
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 255, 0.3)',
  },
  floatingActionsButtonActive: {
    backgroundColor: 'rgba(255, 215, 0, 0.15)',
    borderColor: 'rgba(255, 215, 0, 0.4)',
  },
  sectionPreview: {
    color: '#CCCCCC',
    fontSize: 14,
    lineHeight: 18,
    fontStyle: 'italic',
  },
  sectionContentContainer: {
    overflow: 'hidden',
  },
  sectionContent: {
    padding: 16,
    paddingTop: 0,
  },
  addSectionButton: {
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: 'rgba(0, 255, 255, 0.3)',
    marginTop: 8,
  },
  disabledAddSection: {
    borderColor: 'rgba(255, 215, 0, 0.3)',
  },
  addSectionGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    gap: 12,
  },
  addSectionText: {
    color: '#00FFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  vipAddSectionText: {
    color: '#FFD700',
  },
  
  // Drag Instructions
  dragInstructions: {
    marginTop: 24,
    marginHorizontal: 8,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 255, 0.2)',
  },
  dragInstructionsGradient: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 16,
    paddingHorizontal: 16,
    gap: 12,
  },
  dragInstructionsContent: {
    flex: 1,
  },
  dragInstructionsTitle: {
    color: '#00FFFF',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  dragInstructionsText: {
    color: '#CCCCCC',
    fontSize: 13,
    lineHeight: 18,
  },
  
  // FIXED: Floating Actions Menu - Properly positioned with backdrop
  floatingMenuWrapper: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
  },
  floatingMenuBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
  },
  floatingActionsMenu: {
    position: 'absolute',
    zIndex: 1001,
    borderRadius: 16, // FIXED: Increased border radius
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 255, 0.4)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 0,
    minWidth: 220, // FIXED: Increased width
    maxWidth: 300, // FIXED: Increased max width
  },
  floatingActionsGradient: {
    paddingVertical: 8, // FIXED: Added vertical padding
  },
  floatingActionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18, // FIXED: Increased horizontal padding
    paddingVertical: 16, // FIXED: Increased vertical padding
    gap: 14, // FIXED: Increased gap
  },
  floatingActionItemActive: {
    backgroundColor: 'rgba(147, 112, 219, 0.1)',
  },
  floatingActionItemDanger: {
    backgroundColor: 'rgba(255, 99, 71, 0.05)',
  },
  floatingActionIcon: {
    width: 36, // FIXED: Increased icon container size
    height: 36, // FIXED: Increased icon container size
    borderRadius: 10, // FIXED: Increased border radius
    backgroundColor: 'rgba(147, 112, 219, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(147, 112, 219, 0.3)',
  },
  floatingActionIconDanger: {
    backgroundColor: 'rgba(255, 99, 71, 0.15)',
    borderColor: 'rgba(255, 99, 71, 0.3)',
  },
  floatingActionContent: {
    flex: 1,
  },
  floatingActionTitle: {
    color: '#FFFFFF',
    fontSize: 15, // FIXED: Slightly increased font size
    fontWeight: '600',
    marginBottom: 4, // FIXED: Increased margin
  },
  floatingActionTitleDanger: {
    color: '#FF6347',
  },
  floatingActionSubtitle: {
    color: '#CCCCCC',
    fontSize: 12, // FIXED: Slightly increased font size
    lineHeight: 16, // FIXED: Increased line height
  },
  floatingActionSubtitleDanger: {
    color: '#FF9999',
  },
  floatingActionDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginHorizontal: 18, // FIXED: Increased margin
    marginVertical: 4, // FIXED: Added vertical margin
  },
  
  // Quick Start Modal Styles
  quickStartOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickStartModal: {
    width: SCREEN_WIDTH * 0.9,
    maxHeight: SCREEN_HEIGHT * 0.8,
    borderRadius: 16,
    overflow: 'hidden',
  },
  quickStartContent: {
    padding: 20,
  },
  quickStartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  quickStartTitle: {
    color: '#FFD700',
    fontSize: 20,
    fontWeight: 'bold',
  },
  quickStartClose: {
    padding: 8,
  },
  quickStartList: {
    maxHeight: SCREEN_HEIGHT * 0.5,
  },
  quickStartItem: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 255, 0.2)',
  },
  vipQuickStartItem: {
    borderColor: 'rgba(255, 215, 0, 0.3)',
  },
  quickStartItemGradient: {
    padding: 16,
  },
  quickStartItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  quickStartItemTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    flex: 1,
  },
  vipQuickStartTitle: {
    color: '#FFD700',
  },
  quickStartItemDescription: {
    color: '#CCCCCC',
    fontSize: 14,
    marginBottom: 8,
  },
  quickStartItemSections: {
    color: '#00FFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  customTemplateButton: {
    backgroundColor: 'rgba(0, 255, 255, 0.1)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 255, 0.3)',
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 16,
  },
  customTemplateButtonText: {
    color: '#00FFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  
  // Error handling styles
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    color: '#FF6347',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
  },
  errorButton: {
    backgroundColor: 'rgba(0, 255, 255, 0.2)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  errorButtonText: {
    color: '#00FFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  // Add these styles to your existing StyleSheet at the bottom:

  // Dragging state styles
  sectionContainerDragging: {
    zIndex: 1000,
    elevation: 0,
  },
  sectionHeaderDragging: {
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 0,
  },
  draggingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 12,
    overflow: 'hidden',
  },
  draggingGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  draggingText: {
    color: '#FFD700',
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
});