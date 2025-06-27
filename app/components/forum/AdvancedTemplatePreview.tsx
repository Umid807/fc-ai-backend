import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  SafeAreaView,
  StatusBar,
  Animated,
  RefreshControl,
  Dimensions,
  Alert,
  Vibration,
  Platform,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

// Security utilities
import { 
  validatePostContent, 
  sanitizeUsername, 
  sanitizeURL, 
  secureLog 
} from '../../utils/security';

// Components
import PostContent from '../../components/forum/PostContent';
import QuickInfoBox from '../../components/forum/QuickInfoBox';
import LoadingScreen from '../../components/forum/LoadingScreen';

// Section renderers
import { 
  SectionRenderer,
  TableRenderer,
  VideoRenderer,
  PollRenderer,
  QuoteRenderer,
  ImageRenderer,
  TextRenderer
} from './SectionRenderers';

// Import floating controls from LiveEditingControls
import {
  NeonLiveEditIndicator,
  SectionEditingModal, 
  MasterControlsModal,
  MasterControlsButton,
} from './LiveEditingControls';

// Types
interface PreviewPostData {
  title: string;
  content: string;
  images?: string[];
  gif?: string;
  pollData?: {
    question: string;
    options: string[];
    isBoost: boolean;
    isAnonymous: boolean;
  } | null;
  category?: string | null;
  author: {
    username: string;
    avatar: string | null;
  };
  isPrivate?: boolean;
}

interface AdvancedPreviewData {
  sections: TemplateSection[];
  templateName: string;
  author: {
    uid: string;
    username: string;
    profileImage: string;
    isVIP: boolean;
    title?: string;
    level?: number;
  };
  category: string;
  isPrivate: boolean;
  selectedImages?: string[];
  selectedGif?: string | null;
  pollData?: {
    question: string;
    options: string[];
    isBoost: boolean;
    isAnonymous: boolean;
  } | null;
  customPostBackground?: any;
}

interface TemplateSection {
  id: string;
  label: string;
  content: string;
  style: any;
  config: {
    placeholder: string;
    minHeight: number;
    maxHeight?: number;
    allowEmpty: boolean;
    type: 'text' | 'rich' | 'code' | 'image' | 'quote' | 'table' | 'video' | 'poll';
  };
  order: number;
  isCollapsed: boolean;
  isEditing: boolean;
  images?: any[];
  imageSize?: 'Small' | 'Medium' | 'Large' | 'Full';
  quoteData?: {
    text: string;
    attribution: string;
    source?: string;
    platform?: 'twitter' | 'twitch' | 'youtube' | 'reddit';
  };
  quoteStyle?: 'Gold' | 'Green' | 'Blue' | 'Clear';
  tableData?: {
    template: string;
    headers: string[];
    rows: string[][];
    styling: {
      theme: 'blue' | 'gold' | 'dark' | 'green' | 'purple';
      showBorders: boolean;
      alternateRows: boolean;
      headerStyle: 'bold' | 'normal';
    };
  };
  videoData?: {
    url: string;
    platform: 'youtube' | 'twitch' | 'streamable' | 'tiktok' | 'twitter' | 'other';
    title?: string;
    description?: string;
    embedUrl?: string;
    thumbnailUrl?: string;
  };
  pollData?: {
    question: string;
    options: string[];
    settings: {
      isAnonymous: boolean;
      allowMultipleVotes: boolean;
      showResultsAfterVote: boolean;
    };
  };
  sectionBackground?: 'dark' | 'light' | 'transparent' | 'gradient';
  customStyle?: any;
}

interface PostPreviewModalProps {
  visible: boolean;
  postData?: PreviewPostData;
  advancedData?: AdvancedPreviewData;
  onConfirm: () => void;
  onCancel: () => void;
  onEdit?: () => void;
  onSectionUpdate?: (sectionId: string, updates: any) => void;
  onSectionStyleUpdate?: (sectionId: string, styleUpdates: any) => void;
  onPostStyleUpdate?: (backgroundStyle: any) => void;
  isSubmitting: boolean;
  mode?: 'simple' | 'advanced';
}

// Constants
const SCREEN_WIDTH = Dimensions.get('window').width;
const SCREEN_HEIGHT = Dimensions.get('window').height;

// Safe validation function
const safeValidateContent = (content: string, contentType: string = 'post'): { isValid: boolean; sanitizedContent: string; errors: string[] } => {
  try {
    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return {
        isValid: true,
        sanitizedContent: content || '',
        errors: []
      };
    }

    let validation;
    try {
      validation = validatePostContent(content, contentType);
    } catch (error) {
      try {
        validation = validatePostContent(content);
      } catch (innerError) {
        const sanitizedContent = content
          .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
          .replace(/javascript:/gi, '')
          .replace(/on\w+\s*=/gi, '')
          .replace(/data:/gi, '');
        
        return {
          isValid: true,
          sanitizedContent,
          errors: []
        };
      }
    }

    if (validation && typeof validation === 'object' && 'isValid' in validation) {
      return validation;
    } else {
      return {
        isValid: true,
        sanitizedContent: content,
        errors: []
      };
    }
  } catch (error) {
    secureLog('Safe validation error', { 
      error: error instanceof Error ? error.message : 'Unknown error',
      contentType
    });
    
    const sanitizedContent = content
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '')
      .replace(/data:/gi, '');
    
    return {
      isValid: true,
      sanitizedContent,
      errors: []
    };
  }
};

const PostPreviewModal: React.FC<PostPreviewModalProps> = ({
  visible,
  postData,
  advancedData,
  onConfirm,
  onCancel,
  onEdit,
  onSectionUpdate,
  onSectionStyleUpdate,
  onPostStyleUpdate,
  isSubmitting,
  mode = 'simple',
}) => {
  const { t } = useTranslation();
  
  // Refs for proper cleanup
  const isMountedRef = useRef(true);
  const scrollViewRef = useRef<ScrollView>(null);
  const modalAnimRef = useRef(new Animated.Value(0)).current;
  const fadeAnimRef = useRef(new Animated.Value(0)).current;
  const scaleAnimRef = useRef(new Animated.Value(0.8)).current;
  const animationInProgressRef = useRef(false);
  const sectionRefs = useRef<{ [key: string]: View | null }>({});
  
  // State
  const [modalLoading, setModalLoading] = useState(false);
  const [quickInfoVisible, setQuickInfoVisible] = useState(false);
  const [quickInfoData, setQuickInfoData] = useState<any>(null);
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  // Live editing state
// Live editing state
const [liveEditingEnabled, setLiveEditingEnabled] = useState(false);
const [activeSectionId, setActiveSectionId] = useState<string | null>(null);
const [tempSectionUpdates, setTempSectionUpdates] = useState<Record<string, any>>({});
const [customPostBackground, setCustomPostBackground] = useState<any>(null);
const [showMasterControls, setShowMasterControls] = useState(false);
  // Cleanup system
  const cleanupAnimations = useCallback(() => {
    try {
      if (animationInProgressRef.current) {
        modalAnimRef.stopAnimation();
        fadeAnimRef.stopAnimation();
        scaleAnimRef.stopAnimation();
        animationInProgressRef.current = false;
      }
      
      modalAnimRef.removeAllListeners();
      fadeAnimRef.removeAllListeners();
      scaleAnimRef.removeAllListeners();
      
      modalAnimRef.setValue(visible ? 1 : 0);
      fadeAnimRef.setValue(visible ? 1 : 0);
      scaleAnimRef.setValue(visible ? 1 : 0.8);
      
    } catch (error) {
      secureLog('Animation cleanup error', { 
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }, [visible, modalAnimRef, fadeAnimRef, scaleAnimRef]);
  
  useEffect(() => {
    isMountedRef.current = true;
    
    return () => {
      isMountedRef.current = false;
      cleanupAnimations();
    };
  }, [cleanupAnimations]);

  // Initialize custom background
  useEffect(() => {
    if (advancedData?.customPostBackground) {
      setCustomPostBackground(advancedData.customPostBackground);
    }
  }, [advancedData]);
  
  // Modal animations
  useEffect(() => {
    if (animationInProgressRef.current) return;
    
    animationInProgressRef.current = true;
    
    if (visible) {
      Animated.parallel([
        Animated.timing(modalAnimRef, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnimRef, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnimRef, {
          toValue: 1,
          tension: 100,
          friction: 8,
          useNativeDriver: true,
        }),
      ]).start((finished) => {
        animationInProgressRef.current = false;
        if (!finished && isMountedRef.current) {
          modalAnimRef.setValue(1);
          fadeAnimRef.setValue(1);
          scaleAnimRef.setValue(1);
        }
      });
    } else {
      Animated.parallel([
        Animated.timing(modalAnimRef, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnimRef, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnimRef, {
          toValue: 0.8,
          tension: 150,
          friction: 8,
          useNativeDriver: true,
        }),
      ]).start((finished) => {
        animationInProgressRef.current = false;
        if (!finished && isMountedRef.current) {
          modalAnimRef.setValue(0);
          fadeAnimRef.setValue(0);
          scaleAnimRef.setValue(0.8);
        }
      });
    }
  }, [visible, modalAnimRef, fadeAnimRef, scaleAnimRef]);

  // Toggle live editing
  const toggleLiveEditing = useCallback(() => {
    setLiveEditingEnabled(prev => {
      const newState = !prev;
      if (!newState) {
        // Disable live editing - clear all states
        setActiveSectionId(null);
      }
      Vibration.vibrate(newState ? 100 : 50);
      showFeedback(newState ? 'Live editing enabled! Tap sections to customize.' : 'Live editing disabled.');
      return newState;
    });
  }, []);
  
  // Handle section tap for live editing
  const handleSectionTap = useCallback((sectionId: string) => {
    if (!liveEditingEnabled) return;
    
    // Save previous changes if any
    if (activeSectionId && activeSectionId !== sectionId) {
      // Auto-save previous section changes
      const previousUpdates = tempSectionUpdates[activeSectionId];
      if (previousUpdates && onSectionUpdate) {
        onSectionUpdate(activeSectionId, previousUpdates);
      }
    }
    
    // Toggle section selection
    if (activeSectionId === sectionId) {
      setActiveSectionId(null); // Deselect
    } else {
      setActiveSectionId(sectionId); // Select new section
      Vibration.vibrate(50);
    }
  }, [liveEditingEnabled, activeSectionId, tempSectionUpdates, onSectionUpdate]);

  // Handle section updates
  const handleSectionUpdate = useCallback((sectionId: string, updates: any) => {
    if (!liveEditingEnabled) return;
    
    // Update temporary state for immediate preview
    setTempSectionUpdates(prev => ({
      ...prev,
      [sectionId]: { ...prev[sectionId], ...updates }
    }));
    
    // Notify parent component immediately for live updates
    if (onSectionUpdate) {
      onSectionUpdate(sectionId, updates);
    }
    
    // Show feedback
    showFeedback('Changes applied!');
  }, [liveEditingEnabled, onSectionUpdate]);

  const handleSectionStyleUpdate = useCallback((sectionId: string, styleUpdates: any) => {
    if (!liveEditingEnabled) return;
    
    // Update temporary state for immediate preview
    setTempSectionUpdates(prev => ({
      ...prev,
      [sectionId]: { ...prev[sectionId], ...styleUpdates }
    }));
    
    // Notify parent component immediately for live updates
    if (onSectionStyleUpdate) {
      onSectionStyleUpdate(sectionId, styleUpdates);
    }
    
    // Show feedback
    showFeedback('Style updated!');
  }, [liveEditingEnabled, onSectionStyleUpdate]);

  // Handle tap outside to close floating controls
// Handle tap outside to close floating controls
const handleTapOutside = useCallback(() => {
  if (liveEditingEnabled && activeSectionId) {
    setActiveSectionId(null);
  }
}, [liveEditingEnabled, activeSectionId]);

  // Handle post background updates
const handlePostBackgroundUpdate = useCallback((background: any) => {
  console.log('Received background update:', background);
  setCustomPostBackground(background);
  if (onPostStyleUpdate) {
    onPostStyleUpdate(background);
  }
  showFeedback('Post background updated!');
}, [onPostStyleUpdate]);

  // Close floating controls
  const closeSectionControls = useCallback(() => {
    setActiveSectionId(null);
  }, []);

  const handlePreviewInteraction = useCallback((action: string) => {
    switch (action) {
      case 'video_error':
        showFeedback('Video failed to load in preview mode');
        break;
      case 'video_link':
        showFeedback('Video link interaction - preview mode');
        break;
      case 'poll_vote':
        showFeedback('Poll voting - preview mode only');
        break;
      default:
        showFeedback(`Preview interaction: ${action}`);
    }
  }, []);
  
  // Feedback system
  const showFeedback = useCallback((message: string, duration = 3000) => {
    if (!isMountedRef.current) return;
    
    setFeedbackMessage(message);
    const feedbackOpacity = new Animated.Value(0);
    
    Animated.sequence([
      Animated.timing(feedbackOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.delay(duration),
      Animated.timing(feedbackOpacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      if (isMountedRef.current) {
        setFeedbackMessage('');
      }
    });
  }, []);
  
  // Data processing
  const processedPostData = useMemo(() => {
    try {
      if (mode === 'advanced' && advancedData) {
        const validSections = advancedData.sections
          .filter(section => section.content.trim() || section.config.allowEmpty || (section.images && section.images.length > 0))
          .sort((a, b) => a.order - b.order)
          .map(section => {
            const updates = tempSectionUpdates[section.id] || {};
            return { ...section, ...updates };
          });
        
        const finalTitle = advancedData.templateName || 
                          validSections[0]?.content.substring(0, 100) || 
                          'Advanced Template Post';
        
        const titleValidation = safeValidateContent(finalTitle, 'post');
        const processedTitle = titleValidation.isValid ? titleValidation.sanitizedContent : finalTitle;
        
        const nonImageSectionImages = (advancedData.selectedImages || []);

        return {
          id: 'preview-advanced',
          title: processedTitle,
          content: '',
          username: sanitizeUsername(advancedData.author.username || 'Anonymous'),
          userId: advancedData.author.uid || 'preview-user',
          userAvatar: sanitizeURL(advancedData.author.profileImage || '') || '',
          likes: 0,
          comments: 0,
          engagement: 0,
          images: nonImageSectionImages,
          gif: advancedData.selectedGif || null,
          vip: advancedData.author.isVIP || false,
          category: advancedData.category || 'general',
          likedBy: [],
          createdAt: new Date(),
          visibility: advancedData.isPrivate ? 'private' : 'public',
          pollData: advancedData.pollData,
          sections: validSections,
          templateName: advancedData.templateName,
          isAdvancedTemplate: true,
          customPostBackground: customPostBackground || advancedData.customPostBackground,
        };
      } else if (mode === 'simple' && postData) {
        const rawTitle = postData.title || '';
        const rawContent = postData.content || '';
        
        const titleValidation = safeValidateContent(rawTitle, 'post');
        const contentValidation = safeValidateContent(rawContent, 'post');
        
        const processedTitle = titleValidation.isValid ? (titleValidation.sanitizedContent || t('createPost.untitledPost', 'Untitled Post')) : (rawTitle || t('createPost.untitledPost', 'Untitled Post'));
        const processedContent = contentValidation.isValid ? contentValidation.sanitizedContent : rawContent;
        
        return {
          id: 'preview-simple',
          title: processedTitle,
          content: processedContent,
          username: sanitizeUsername(postData.author.username || 'Anonymous'),
          userId: 'preview-user',
          userAvatar: sanitizeURL(postData.author.avatar || '') || '',
          likes: 0,
          comments: 0,
          engagement: 0,
          images: postData.images || [],
          gif: postData.gif || null,
          vip: false,
          category: postData.category || 'general',
          likedBy: [],
          createdAt: new Date(),
          visibility: postData.isPrivate ? 'private' : 'public',
          pollData: postData.pollData,
          isAdvancedTemplate: false,
        };
      }
      
      return null;
    } catch (error) {
      secureLog('Post data processing error', {
        error: error instanceof Error ? error.message : 'Unknown error',
        mode,
        hasPostData: !!postData,
        hasAdvancedData: !!advancedData,
      });
      return null;
    }
  }, [mode, advancedData, postData, t, tempSectionUpdates, customPostBackground]);
  
  const processedAuthorData = useMemo(() => {
    try {
      if (mode === 'advanced' && advancedData) {
        return {
          uid: advancedData.author.uid || 'preview-user',
          username: sanitizeUsername(advancedData.author.username || 'Anonymous'),
          profileImage: sanitizeURL(advancedData.author.profileImage || '') || '',
          vip: advancedData.author.isVIP || false,
          rank: advancedData.author.title || 'Member',
          level: advancedData.author.level || 1,
        };
      } else if (mode === 'simple' && postData) {
        return {
          uid: 'preview-user',
          username: sanitizeUsername(postData.author.username || 'Anonymous'),
          profileImage: sanitizeURL(postData.author.avatar || '') || '',
          vip: false,
          rank: 'Member',
          level: 1,
        };
      }
      
      return null;
    } catch (error) {
      secureLog('Author data processing error', {
        error: error instanceof Error ? error.message : 'Unknown error',
        mode
      });
      return null;
    }
  }, [mode, advancedData, postData]);
  
  // Advanced section renderer with live editing
  const renderAdvancedSection = useCallback((section: any, index: number) => {
    const isActiveSection = liveEditingEnabled && activeSectionId === section.id;
    const sectionUpdates = tempSectionUpdates[section.id] || {};
    const finalSection = { ...section, ...sectionUpdates };

    // Apply section background styling
const getSectionBackground = () => {
  // Get the most up-to-date background (including temp updates from dragging)
  const background = finalSection.sectionBackground;
  
  // If no background or transparent
  if (!background || background === 'transparent') {
    return { backgroundColor: 'transparent' };
  }
  
  // Handle legacy string values (for backwards compatibility)
  if (typeof background === 'string') {
    switch (background) {
      case 'dark':
        return { backgroundColor: 'rgba(0, 0, 0, 0.8)' };
      case 'light':
        return { backgroundColor: 'rgba(255, 255, 255, 0.1)' };
      default:
        return { backgroundColor: 'transparent' };
    }
  }
  
  // Handle new object structure (same as post background)
  if (typeof background === 'object' && background.type) {
    if (background.type === 'solid') {
      // Use the current opacity from the background object (this gets updated during drag)
      const opacity = background.opacity !== undefined ? background.opacity : 0.3;
      const color = background.color || '#000000';
      return {
        backgroundColor: `${color}${Math.round(opacity * 255).toString(16).padStart(2, '0')}`
      };
    }
    
    if (background.type === 'gradient') {
      return null; // Will be handled by LinearGradient component
    }
  }
  
  return { backgroundColor: 'transparent' };
};

    const sectionStyle = {
      marginBottom: finalSection.customStyle?.marginBottom || 16,
      padding: finalSection.customStyle?.padding || 12,
      borderRadius: 8,
      overflow: 'hidden' as const,
      position: 'relative' as const,
      ...getSectionBackground(),
    };

    // Live editing visual feedback
    const editingStyle = liveEditingEnabled ? {
      borderWidth: isActiveSection ? 2 : 1,
      borderColor: isActiveSection ? '#00FFFF' : 'rgba(0, 255, 255, 0.3)',
      shadowColor: isActiveSection ? '#00FFFF' : 'transparent',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: isActiveSection ? 0.5 : 0,
      shadowRadius: isActiveSection ? 10 : 0,
      elevation: isActiveSection ? 0 : 0,
    } : {};

    return (
      <TouchableOpacity
  key={finalSection.id || index}
  onPress={() => handleSectionTap(finalSection.id)}
  activeOpacity={liveEditingEnabled ? 0.8 : 1}
  disabled={!liveEditingEnabled}
  style={[sectionStyle, editingStyle]}
  ref={(ref) => {
    sectionRefs.current[finalSection.id] = ref;
  }}
>
{/* Section Background Rendering (same as post background) */}
{finalSection.sectionBackground && typeof finalSection.sectionBackground === 'object' && (
  <>
    {finalSection.sectionBackground.type === 'gradient' && finalSection.sectionBackground.colors && (
      <LinearGradient
        colors={finalSection.sectionBackground.colors}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />
    )}
    {finalSection.sectionBackground.type === 'solid' && (
      <View 
        style={[
          StyleSheet.absoluteFill, 
          { 
            backgroundColor: `${finalSection.sectionBackground.color}${Math.round((finalSection.sectionBackground.opacity !== undefined ? finalSection.sectionBackground.opacity : 0.3) * 255).toString(16).padStart(2, '0')}`,
          }
        ]} 
      />
    )}
  </>
)}
        {/* Section Label */}
        {(finalSection.showLabel !== false) && (
          <Text style={styles.sectionLabel}>{finalSection.label}</Text>
        )}
        
        {/* Section Content */}
        <SectionRenderer
          section={finalSection}
          isEditing={false}
          onPreviewInteraction={handlePreviewInteraction}
        />
        
{/* Neon Live Edit Indicator */}
        {liveEditingEnabled && (
          <NeonLiveEditIndicator
            isActive={isActiveSection}
            onPress={() => handleSectionTap(finalSection.id)}
          />
        )}

{/* Section Editing Modal */}
        <SectionEditingModal
          section={finalSection}
          isVisible={isActiveSection}
          userVIP={processedAuthorData?.vip || false}
          onSectionUpdate={handleSectionUpdate}
          onSectionStyleUpdate={handleSectionStyleUpdate}
          onClose={closeSectionControls}
        />
      </TouchableOpacity>
    );
  }, [
    liveEditingEnabled, 
    activeSectionId, 
    tempSectionUpdates, 
    handleSectionTap, 
    handlePreviewInteraction,
    handleSectionUpdate,
    handleSectionStyleUpdate,
    processedAuthorData,
    closeSectionControls
  ]);

  // Interaction handlers
  const handleShowQuickInfo = useCallback((userData: any) => {
    try {
      if (!userData) return;
      
      setQuickInfoData(userData);
      setQuickInfoVisible(true);
      
      secureLog('Quick info shown in preview', {
        username: userData.username || 'Unknown',
        mode
      });
    } catch (error) {
      secureLog('Quick info error', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }, [mode]);
  
  const handlePreviewLike = useCallback(() => {
    Vibration.vibrate(50);
    showFeedback(t('preview.likePreview', 'This is a preview - like will work when posted! ❤️'));
  }, [showFeedback, t]);
  
  const handlePreviewSave = useCallback(() => {
    showFeedback(t('preview.savePreview', 'This is a preview - save will work when posted! 🔖'));
  }, [showFeedback, t]);
  
  const handlePreviewComment = useCallback(() => {
    showFeedback(t('preview.commentPreview', 'This is a preview - comments will work when posted! 💬'));
  }, [showFeedback, t]);
  
  const handleBack = useCallback(() => {
    try {
      if (isSubmitting) {
        Alert.alert(
          t('preview.submitInProgress', 'Submission in Progress'),
          t('preview.pleaseWait', 'Please wait for the post to be submitted.'),
          [{ text: t('common.ok', 'OK') }]
        );
        return;
      }
      
      onCancel();
      
      secureLog('Preview modal closed', {
        mode,
        method: 'back_button'
      });
    } catch (error) {
      secureLog('Back handler error', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      onCancel();
    }
  }, [isSubmitting, onCancel, t, mode]);
  
  const handleConfirm = useCallback(() => {
    try {
      if (isSubmitting) {
        showFeedback(t('preview.alreadySubmitting', 'Already submitting...'));
        return;
      }
      
      if (!processedPostData) {
        showFeedback(t('preview.invalidData', 'Invalid post data. Please try again.'));
        return;
      }
      
      if (mode === 'simple') {
        if (!processedPostData.title.trim()) {
          showFeedback(t('preview.missingTitle', 'Please add a title.'));
          return;
        }
      } else if (mode === 'advanced') {
        if (!processedPostData.sections || processedPostData.sections.length === 0) {
          showFeedback(t('preview.missingSections', 'Please add content to sections.'));
          return;
        }
        
        const hasAtLeastOneSection = processedPostData.sections.length > 0;
        
        if (!hasAtLeastOneSection) {
          showFeedback(t('preview.noValidSections', 'Please add at least one section.'));
          return;
        }
      }
      
      Vibration.vibrate(100);
      onConfirm();
      
      secureLog('Preview confirmed', {
        mode,
        titleLength: processedPostData.title.length,
        contentLength: processedPostData.content.length,
        hasImages: (processedPostData.images || []).length > 0,
        hasGif: !!processedPostData.gif,
        hasPoll: !!processedPostData.pollData,
        sectionCount: mode === 'advanced' ? (processedPostData.sections || []).length : 1,
        hasCustomBackground: !!customPostBackground,
        liveEditingEnabled: liveEditingEnabled,
      });
    } catch (error) {
      secureLog('Confirm handler error', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      showFeedback(t('common.error', 'An error occurred. Please try again.'));
    }
  }, [isSubmitting, processedPostData, mode, onConfirm, showFeedback, t, customPostBackground, liveEditingEnabled]);
  
  const handleEdit = useCallback(() => {
    try {
      if (isSubmitting || !onEdit) return;
      
      onEdit();
      
      secureLog('Edit requested from preview', {
        mode,
        hasEditHandler: !!onEdit
      });
    } catch (error) {
      secureLog('Edit handler error', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }, [isSubmitting, onEdit, mode]);
  
  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    
    setTimeout(() => {
      if (isMountedRef.current) {
        setRefreshing(false);
        showFeedback(t('preview.refreshed', 'Preview refreshed! 🔄'));
      }
    }, 1000);
  }, [showFeedback, t]);
  
  const scrollToTop = useCallback(() => {
    scrollViewRef.current?.scrollTo({ y: 0, animated: true });
  }, []);
  
  // Render conditions
  if (!visible) {
    return null;
  }
  
  if (!processedPostData || !processedAuthorData) {
    return (
      <Modal
        visible={visible}
        animationType="none"
        transparent
        onRequestClose={handleBack}
      >
        <View style={styles.container}>
          <LinearGradient
            colors={['#000', '#0a0a0a', '#1a262e', '#16323e']}
            style={StyleSheet.absoluteFill}
          />
          <LoadingScreen />
        </View>
      </Modal>
    );
  }
  
  // Main render
  try {


    return (
<Modal
  visible={visible}
  animationType="none"
  transparent
  onRequestClose={handleBack}
  hardwareAccelerated={Platform.OS === 'android'}
  statusBarTranslucent
>
  <View style={styles.container}>
          <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
            
<LinearGradient
  colors={['#000', '#0a0a0a', '#1a262e', '#16323e']}
  style={StyleSheet.absoluteFill}
  start={{ x: 0, y: 0 }}
  end={{ x: 1, y: 1 }}
/>
            
            <Animated.View
              style={[
                styles.modalContainer,
                {
                  opacity: modalAnimRef,
                  transform: [
                    { scale: scaleAnimRef },
                    {
                      translateY: modalAnimRef.interpolate({
                        inputRange: [0, 1],
                        outputRange: [50, 0],
                      }),
                    },
                  ],
                },
              ]}
            >
              {/* Header */}
              <Animated.View 
                style={[
                  styles.header,
                  { opacity: fadeAnimRef }
                ]}
              >
                <TouchableOpacity 
                  onPress={handleBack} 
                  style={styles.backButton}
                  disabled={isSubmitting}
                  accessibilityRole="button"
                  accessibilityLabel={t('common.goBack', 'Go Back')}
                >
                  <LinearGradient
                    colors={['#00FFFF', '#6A5ACD']}
                    style={styles.backButtonGradient}
                  >
                    <Ionicons name="chevron-back" size={20} color="#000" />
                    <Text style={styles.backButtonText}>
                      {t('common.back', 'Back')}
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>
                
                <View style={styles.headerTitleContainer}>
                  <Text style={styles.headerTitle}>
                    {t('preview.title', 'Preview')}
                  </Text>
                  <View style={styles.previewBadge}>
                    <LinearGradient
                      colors={['rgba(255, 215, 0, 0.3)', 'rgba(255, 140, 0, 0.2)']}
                      style={styles.previewBadgeGradient}
                    >
                      <Ionicons name="eye" size={14} color="#FFD700" />
                      <Text style={styles.previewBadgeText}>
                        {mode === 'advanced' 
                          ? (liveEditingEnabled ? 'Live Edit Mode' : 'Advanced Preview')
                          : t('preview.simplePreview', 'Simple Preview')
                        }
                      </Text>
                    </LinearGradient>
                  </View>
                </View>
                

              
                {onEdit && (
                  <TouchableOpacity 
                    onPress={handleEdit} 
                    style={styles.editButton}
                    disabled={isSubmitting}
                    accessibilityRole="button"
                    accessibilityLabel={t('common.edit', 'Edit')}
                  >
                    <LinearGradient
                      colors={['rgba(0, 255, 255, 0.2)', 'rgba(0, 128, 255, 0.2)']}
                      style={styles.editButtonGradient}
                    >
                      <Ionicons name="create" size={18} color="#00FFFF" />
                      <Text style={styles.editButtonText}>
                        {t('common.edit', 'Edit')}
                      </Text>
                    </LinearGradient>
                  </TouchableOpacity>
                )}
              </Animated.View>
              
{/* Content */}
<View style={styles.scrollViewContainer}>
  <ScrollView
    ref={scrollViewRef}
    style={styles.scrollView}
    contentContainerStyle={[
      styles.contentContainer,
      liveEditingEnabled && { paddingVertical: 20 }
    ]}
    showsVerticalScrollIndicator={false}
    refreshControl={
      <RefreshControl
        refreshing={refreshing}
        onRefresh={handleRefresh}
        tintColor="#00FFFF"
        colors={['#00FFFF', '#6A5ACD']}
      />
    }

  >
                  {/* Preview Notice */}
                  <Animated.View 
                    style={[
                      styles.previewNotice,
                      { opacity: fadeAnimRef }
                    ]}
                  >
                    <LinearGradient
                      colors={['rgba(255, 215, 0, 0.15)', 'rgba(255, 140, 0, 0.1)']}
                      style={styles.previewNoticeGradient}
                    >
                      <Ionicons name="information-circle" size={20} color="#FFD700" />
                      <Text style={styles.previewNoticeText}>
                        {liveEditingEnabled 
                          ? 'Live editing mode: Tap sections to customize them instantly!'
                          : t('preview.notice', 'This is how your post will appear. Interactions are disabled in preview mode.')
                        }
                      </Text>
                    </LinearGradient>
                  </Animated.View>
                  
                  {/* Post Content */}
                  <Animated.View style={{ opacity: fadeAnimRef }}>
                    {mode === 'advanced' && processedPostData.sections ? (
                      <View style={[styles.advancedPostContainer, { position: 'relative', overflow: 'hidden' }]}>
{customPostBackground && (
  <>
    {customPostBackground.type === 'gradient' && (
      <LinearGradient
        colors={customPostBackground.colors} // Don't modify colors here - they already have opacity
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />
    )}
    {customPostBackground.type === 'solid' && (
      <View 
        style={[
          StyleSheet.absoluteFill, 
          { 
            backgroundColor: `${customPostBackground.color}${Math.round((customPostBackground.opacity || 0.3) * 255).toString(16).padStart(2, '0')}`,
          }
        ]} 
      />
    )}
  </>
)}
                       {/* Post Header */}
                        <View style={styles.postHeader}>
                          <View style={styles.authorInfo}>
                            <View style={styles.authorAvatar}>
                              {processedPostData.userAvatar ? (
                                <Image 
                                  source={{ uri: processedPostData.userAvatar }} 
                                  style={styles.avatarImage}
                                />
                              ) : (
                                <View style={styles.avatarPlaceholder}>
                                  <Ionicons name="person" size={20} color="#888" />
                                </View>
                              )}
                            </View>
                            <View style={styles.authorDetails}>
                              <View style={styles.authorNameRow}>
                                <Text style={styles.authorName}>{processedPostData.username}</Text>

                                
{/* Gaming Style Live Edit Toggle */}
<TouchableOpacity
  onPress={toggleLiveEditing}
  style={[
    styles.gamingLiveEditButton,
    liveEditingEnabled && styles.gamingLiveEditButtonActive
  ]}
  activeOpacity={0.8}
>
  <Animated.View style={styles.gamingButtonGlow}>
    <LinearGradient
      colors={
        liveEditingEnabled
          ? ['rgba(255, 20, 147, 0.8)', 'rgba(138, 43, 226, 0.6)']
          : ['rgba(255, 255, 255, 0.2)', 'rgba(200, 200, 200, 0.1)']
      }
      style={styles.gamingButtonGlowGradient}
    />
  </Animated.View>
  
  <LinearGradient
    colors={
      liveEditingEnabled
        ? ['#FF1493', '#8A2BE2', '#4169E1']
        : ['rgba(21, 77, 3, 0.66)', 'rgba(24, 141, 20, 0.81)', 'rgba(3, 118, 47, 0.91)']
    }
    style={styles.gamingButtonGradient}
    start={{ x: 0, y: 0 }}
    end={{ x: 1, y: 1 }}
  >
    <View style={styles.gamingButtonContent}>
      <Text style={[
        styles.gamingButtonText,
        liveEditingEnabled && styles.gamingButtonTextActive
      ]}>
        LIVE EDIT
      </Text>
      {liveEditingEnabled && (
        <View style={styles.gamingButtonIndicator}>
          <View style={styles.pulsingDot} />
        </View>
      )}
    </View>
    
  </LinearGradient>
</TouchableOpacity>
                              </View>
                              <Text style={styles.postTime}>Preview • {processedPostData.category}</Text>
                            </View>
                          </View>
                          
{liveEditingEnabled && (
  <TouchableOpacity
    onPress={() => setShowMasterControls(true)}
    style={styles.neonMasterControls}
    activeOpacity={0.8}
  >
    {/* Neon Glow Effect */}
    <View style={styles.neonGlow} />
    
    
    {/* Main Button Content */}
    <LinearGradient
      colors={['rgba(0, 255, 255, 0.1)', 'rgba(138, 43, 226, 0.1)']}
      style={styles.neonMasterGradient}
    >
      <View style={styles.neonMasterContent}>
        {/* Icon with pulsing effect */}
        <View style={styles.neonIconContainer}>
          <Ionicons name="options" size={12} color="#00FFFF" />
          <View style={styles.pulsingRing} />
        </View>
        
        {/* Text */}
        <View style={styles.neonTextContainer}>
          <Text style={styles.neonMasterText}>POST</Text>
          <Text style={styles.neonMasterSubtext}>Background</Text>
        </View>

        
        
      </View>
    </LinearGradient>
  </TouchableOpacity>
)}
                        </View>

                        {/* Render sections with live editing */}
                        {processedPostData.sections
                          .sort((a, b) => a.order - b.order)
                          .map((section, index) => renderAdvancedSection(section, index))
                        }
                        
                        {/* Non-section content */}
                        {processedPostData.images && processedPostData.images.length > 0 && (
                          <View style={styles.additionalImages}>
                            <Text style={styles.additionalImagesLabel}>Additional Images:</Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                              {processedPostData.images.map((imageUri, index) => (
                                <Image
                                  key={index}
                                  source={{ uri: imageUri }}
                                  style={styles.additionalImage}
                                  resizeMode="cover"
                                />
                              ))}
                            </ScrollView>
                          </View>
                        )}
                        
                        {processedPostData.gif && (
                          <Image 
                            source={{ uri: processedPostData.gif }} 
                            style={styles.postGif}
                            resizeMode="cover"
                          />
                        )}
                        
                        {processedPostData.pollData && (
                          <View style={styles.pollContainer}>
                            <Text style={styles.pollQuestion}>{processedPostData.pollData.question}</Text>
                            {processedPostData.pollData.options.map((option, index) => (
                              <TouchableOpacity key={index} style={styles.pollOption} onPress={handlePreviewLike}>
                                <Ionicons name="radio-button-off" size={16} color="#00FFFF" />
                                <Text style={styles.pollOptionText}>{option}</Text>
                              </TouchableOpacity>
                            ))}
                          </View>
                        )}
                        
                        {/* Engagement buttons */}
                        <View style={styles.engagementButtons}>
                          <TouchableOpacity style={styles.engagementButton} onPress={handlePreviewLike}>
                            <Ionicons name="heart-outline" size={20} color="#FF6B6B" />
                            <Text style={styles.engagementText}>Like</Text>
                          </TouchableOpacity>
                          
                          <TouchableOpacity style={styles.engagementButton} onPress={handlePreviewComment}>
                            <Ionicons name="chatbubble-outline" size={20} color="#00FFFF" />
                            <Text style={styles.engagementText}>Comment</Text>
                          </TouchableOpacity>
                          
                          <TouchableOpacity style={styles.engagementButton} onPress={handlePreviewSave}>
                            <Ionicons name="bookmark-outline" size={20} color="#32CD32" />
                            <Text style={styles.engagementText}>Save</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    ) : (
                      <PostContent
                        post={processedPostData}
                        postAuthor={processedAuthorData}
                        onShowQuickInfo={handleShowQuickInfo}
                        onLike={handlePreviewLike}
                        onSave={handlePreviewSave}
                        onComment={handlePreviewComment}
                        hasLiked={false}
                        isSaved={false}
                        canInteract={true}
                        showHeartAnim={false}
                        heartAnimCoords={{ x: 0, y: 0 }}
                        translationButton={null}
                        isPreview={true}
                      />
                    )}
                  </Animated.View>
                  
                  {/* Back to Top Button */}
                  <TouchableOpacity 
                    style={styles.backToTopButton} 
                    onPress={scrollToTop}
                    accessibilityRole="button"
                    accessibilityLabel={t('common.backToTop', 'Back to Top')}
                  >
                    <LinearGradient
                      colors={['#00FFFF', '#6A5ACD']}
                      style={styles.backToTopGradient}
                    >
                      <Ionicons name="arrow-up" size={20} color="#000" />
                      <Text style={styles.backToTopText}>
                        {t('common.backToTop', 'Back to Top')}
                      </Text>
                    </LinearGradient>
                  </TouchableOpacity>
</ScrollView>
</View>
              
              {/* Action Buttons */}
              <Animated.View 
                style={[
                  styles.actionButtons,
                  { opacity: fadeAnimRef }
                ]}
              >
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={handleBack}
                  disabled={isSubmitting}
                  accessibilityRole="button"
                  accessibilityLabel={t('common.cancel', 'Cancel')}
                >
                  <LinearGradient
                    colors={['rgba(255, 69, 69, 0.2)', 'rgba(255, 99, 71, 0.2)']}
                    style={styles.cancelButtonGradient}
                  >
                    <Ionicons name="close" size={20} color="#FF6B6B" />
                    <Text style={styles.cancelButtonText}>
                      {t('common.cancel', 'Cancel')}
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[
                    styles.confirmButton,
                    isSubmitting && styles.confirmButtonDisabled
                  ]}
                  onPress={handleConfirm}
                  disabled={isSubmitting}
                  accessibilityRole="button"
                  accessibilityLabel={t('preview.confirmPost', 'Confirm & Post')}
                  accessibilityState={{ disabled: isSubmitting }}
                >
                  <LinearGradient
                    colors={
                      isSubmitting
                        ? ['rgba(0, 255, 255, 0.3)', 'rgba(106, 90, 205, 0.3)']
                        : ['#00FFFF', '#6A5ACD']
                    }
                    style={styles.confirmButtonGradient}
                  >
                    {isSubmitting ? (
                      <>
                        <Animated.View
                          style={{
                            transform: [{
                              rotate: modalAnimRef.interpolate({
                                inputRange: [0, 1],
                                outputRange: ['0deg', '360deg'],
                              }),
                            }],
                          }}
                        >
                          <Ionicons name="sync" size={20} color="#000" />
                        </Animated.View>
                        <Text style={styles.confirmButtonText}>
                          {t('common.submitting', 'Submitting...')}
                        </Text>
                      </>
                    ) : (
                      <>
                        <Ionicons name="checkmark" size={20} color="#000" />
                        <Text style={styles.confirmButtonText}>
                          {t('preview.confirmPost', 'Confirm & Post')}
                        </Text>
                      </>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </Animated.View>
            </Animated.View>
            
                        {/* Master Controls Modal */}
            <MasterControlsModal
              isVisible={showMasterControls}
              userVIP={processedAuthorData?.vip || false}
              currentBackground={customPostBackground}
              onPostBackgroundUpdate={handlePostBackgroundUpdate}
              onClose={() => setShowMasterControls(false)}
            />
            {/* Modals */}
            <QuickInfoBox
              visible={quickInfoVisible}
              userData={quickInfoData}
              onClose={() => setQuickInfoVisible(false)}
              onMoreInfo={() => {
                setQuickInfoVisible(false);
                showFeedback(t('preview.profilePreview', 'Profile preview not available in preview mode'));
              }}
            />
            
            {/* Feedback Toast */}
            {feedbackMessage !== '' && (
              <Animated.View
                style={[
                  styles.feedbackToast,
                  { opacity: fadeAnimRef }
                ]}
              >
                <LinearGradient
                  colors={['rgba(0,255,255,0.9)', 'rgba(106,90,205,0.9)']}
                  style={styles.feedbackGradient}
                >
                  <Text style={styles.feedbackText}>{feedbackMessage}</Text>
                </LinearGradient>
              </Animated.View>
            )}
</SafeAreaView>
</View>
      </Modal>
    );
  } catch (error) {
    secureLog('PostPreviewModal render error', {
      error: error instanceof Error ? error.message : 'Unknown error',
      mode,
      visible,
      hasPostData: !!processedPostData,
    });
    
    return (
      <Modal visible={visible} transparent onRequestClose={onCancel}>
        <View style={styles.errorContainer}>
          <LinearGradient
            colors={['#000', '#0a0a0a']}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.errorContent}>
            <Ionicons name="warning" size={48} color="#FF6B6B" />
            <Text style={styles.errorText}>
              {t('preview.errorOccurred', 'An error occurred while loading the preview.')}
            </Text>
            <TouchableOpacity onPress={onCancel} style={styles.errorButton}>
              <Text style={styles.errorButtonText}>
                {t('common.close', 'Close')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  }
};

export default PostPreviewModal;

// Enhanced styles with true live editing support
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
  },
  
  // Header Styles
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 255, 255, 0.1)',
  },
  backButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  backButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
  },
  backButtonText: {
    color: '#000',
    fontSize: 14,
    fontWeight: '700',
  },
  headerTitleContainer: {
    flex: 1,
    marginLeft: 16,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
    textShadowColor: 'rgba(0, 255, 255, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  previewBadge: {
    marginTop: 6,
    alignSelf: 'flex-start',
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.4)',
  },
  previewBadgeGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    gap: 6,
  },
  previewBadgeText: {
    color: '#FFD700',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
  },

  // Live Edit Toggle Button
  liveEditToggle: {
    borderRadius: 12,
    overflow: 'hidden',
    marginRight: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  liveEditToggleActive: {
    borderColor: 'rgba(0, 255, 255, 0.8)',
    shadowColor: '#00FFFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 12,
    elevation: 0,
  },
  liveEditToggleGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
  },
  liveEditToggleText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  liveEditToggleTextActive: {
    color: '#000',
    fontWeight: '700',
  },

  editButton: {
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 255, 0.3)',
  },
  editButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
  },
  editButtonText: {
    color: '#00FFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  
  // Content Styles
  scrollViewContainer: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 120,
  },
  previewNotice: {
    marginBottom: 20,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.3)',
  },
  previewNoticeGradient: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    gap: 12,
  },
  previewNoticeText: {
    color: '#FFD700',
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
    flex: 1,
  },
  
  // Advanced Post Container
  advancedPostContainer: {
    backgroundColor: 'rgba(0, 20, 30, 0.8)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(147, 112, 219, 0.3)',
  },

  // Section Label
  sectionLabel: {
    color: '#9370DB',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },

  

  // Floating Controls Container
  floatingControlsContainer: {
    position: 'absolute',
    top: 8,
    right: 8,
    zIndex: 20,
    gap: 8,
    maxWidth: SCREEN_WIDTH * 0.4,
  },


  
  // Post Header
  postHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  authorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  authorAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(0, 255, 255, 0.3)',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  authorDetails: {
    flex: 1,
  },
  authorName: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
  },
  postTime: {
    color: '#888',
    fontSize: 12,
  },
  vipBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  vipText: {
    color: '#FFD700',
    fontSize: 12,
    fontWeight: '700',
  },
  
  // Additional Images
  additionalImages: {
    marginTop: 16,
    padding: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 12,
  },
  additionalImagesLabel: {
    color: '#32CD32',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  additionalImage: {
    width: 120,
    height: 80,
    borderRadius: 8,
    marginRight: 8,
  },
  
  // GIF
  postGif: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    marginTop: 16,
  },
  
  // Poll
  pollContainer: {
    marginTop: 16,
    padding: 16,
    backgroundColor: 'rgba(0, 255, 255, 0.1)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 255, 0.3)',
  },
  pollQuestion: {
    color: '#FFD700',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  pollOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 8,
  },
  pollOptionText: {
    color: '#CCCCCC',
    fontSize: 14,
    fontWeight: '500',
  },
  
  // Engagement Buttons
  engagementButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  engagementButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    gap: 6,
  },
  engagementText: {
    color: '#CCCCCC',
    fontSize: 12,
    fontWeight: '600',
  },
  
  // Back to Top Button
  backToTopButton: {
    alignSelf: 'center',
    marginTop: 24,
    borderRadius: 20,
    overflow: 'hidden',
  },
  backToTopGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 6,
  },
  backToTopText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 14,
  },
  
  // Action Buttons
  actionButtons: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 255, 255, 0.1)',
    gap: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
  },
  cancelButton: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 107, 0.4)',
  },
  cancelButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 8,
  },
  cancelButtonText: {
    color: '#FF6B6B',
    fontSize: 16,
    fontWeight: '700',
  },
  confirmButton: {
    flex: 2,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 255, 0.4)',
  },
  confirmButtonDisabled: {
    opacity: 0.6,
  },
  confirmButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 8,
  },
  confirmButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '700',
  },
  
  // Feedback Toast
  feedbackToast: {
    position: 'absolute',
    bottom: 150,
    left: 20,
    right: 20,
    borderRadius: 12,
    overflow: 'hidden',
    zIndex: 1000,
  },
  feedbackGradient: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    alignItems: 'center',
  },
  feedbackText: {
    color: '#000',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  
  // Error Fallback Styles
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContent: {
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    marginHorizontal: 40,
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 107, 0.4)',
  },
  errorText: {
    color: '#FFFFFF',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 24,
    lineHeight: 22,
  },
  errorButton: {
    backgroundColor: '#FF6B6B',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  errorButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  // Header Live Edit Button
// Gaming Style Live Edit Button
  gamingLiveEditButton: {
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    position: 'relative',
  },
  gamingLiveEditButtonActive: {
    borderColor: 'rgba(0, 255, 255, 0.8)',
    shadowColor: '#00FFFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
    
  },
  gamingButtonGlow: {
    position: 'absolute',
    top: -2,
    left: -2,
    right: -2,
    bottom: -2,
    borderRadius: 14,
    overflow: 'hidden',
  },
  gamingButtonGlowGradient: {
    flex: 1,
  },
  gamingButtonGradient: {
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  gamingButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    position: 'relative',
  },
gamingButtonText: {
    color: '#CCCCCC',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
  },
  gamingButtonTextActive: {
    color: '#000',
    textShadowColor: 'rgba(0, 255, 255, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  gamingButtonIndicator: {
    marginLeft: 2,
  },
  pulsingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#00FF41',
    shadowColor: '#00FF41',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
    
  },
  authorNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 8,
    flex: 0,
  },
neonMasterControls: {
  position: 'absolute',
  top:0,
  right: 10,
  width: 60,
  height: 50,
  borderRadius: 8,
  overflow: 'visible',
},
neonGlow: {
  position: 'absolute',
  top: -4,
  left: -4,
  right: -4,
  bottom: -4,
  borderRadius: 12,
  backgroundColor: 'transparent',
  borderWidth: 1,
  borderColor: '#00FFFF',
  shadowColor: '#00FFFF',
  shadowOffset: { width: 0, height: 0 },
  shadowOpacity: 0.8,
  shadowRadius: 12,
  elevation: 0,
},
neonGlowInner: {
  position: 'absolute',
  top: -2,
  left: -2,
  right: -2,
  bottom: -2,
  borderRadius: 10,
  backgroundColor: 'transparent',
  borderWidth: 0.5,
  borderColor: '#8A2BE2',
  shadowColor: '#8A2BE2',
  shadowOffset: { width: 0, height: 0 },
  shadowOpacity: 0.6,
  shadowRadius: 8,
  elevation: 0,
},
neonMasterGradient: {
  flex: 1,
  borderRadius: 8,
  borderWidth: 1,
  borderColor: 'rgba(0, 255, 255, 0.4)',
  backgroundColor: 'rgba(0, 0, 0, 0.8)',
},
neonMasterContent: {
  flex: 1,
  alignItems: 'center',
  justifyContent: 'center',
  position: 'relative',
  gap: 8,
},
neonIconContainer: {
  position: 'relative',
  alignItems: 'center',
  justifyContent: 'center',
},
pulsingRing: {
  position: 'absolute',
  width: 20,
  height: 20,
  borderRadius: 14,
  borderWidth: 1,
  borderColor: 'rgba(0, 255, 255, 0.3)',
  backgroundColor: 'transparent',
},
neonTextContainer: {
  alignItems: 'center',
},
neonMasterText: {
  color: '#00FFFF',
  fontSize: 6,
  fontWeight: '800',
  letterSpacing: 1,
  textShadowColor: '#00FFFF',
  textShadowOffset: { width: 0, height: 0 },
  textShadowRadius: 4,
},
neonMasterSubtext: {
  color: '#00FFFF',
  fontSize: 7,
  fontWeight: '700',
  letterSpacing: 0.5,
  textShadowColor: '#8A2BE2',
  textShadowOffset: { width: 0, height: 0 },
  textShadowRadius: 3,
},

});