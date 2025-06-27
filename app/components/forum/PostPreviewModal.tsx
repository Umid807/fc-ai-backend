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
    type: 'text' | 'rich' | 'code';
  };
  order: number;
  isCollapsed: boolean;
  isEditing: boolean;
}

interface PostPreviewModalProps {
  visible: boolean;
  postData?: PreviewPostData;
  advancedData?: AdvancedPreviewData;
  onConfirm: () => void;
  onCancel: () => void;
  onEdit?: () => void;
  isSubmitting: boolean;
  mode?: 'simple' | 'advanced';
}

// Constants
const SCREEN_WIDTH = Dimensions.get('window').width;
const SCREEN_HEIGHT = Dimensions.get('window').height;

const PostPreviewModal: React.FC<PostPreviewModalProps> = ({
  visible,
  postData,
  advancedData,
  onConfirm,
  onCancel,
  onEdit,
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
  
  // State
  const [modalLoading, setModalLoading] = useState(false);
  const [quickInfoVisible, setQuickInfoVisible] = useState(false);
  const [quickInfoData, setQuickInfoData] = useState<any>(null);
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  
  // ================================================================
  // COMPREHENSIVE CLEANUP SYSTEM
  // ================================================================
  
  const cleanupAnimations = useCallback(() => {
    try {
      if (animationInProgressRef.current) {
        modalAnimRef.stopAnimation();
        fadeAnimRef.stopAnimation();
        scaleAnimRef.stopAnimation();
        animationInProgressRef.current = false;
      }
      
      // Remove all listeners
      modalAnimRef.removeAllListeners();
      fadeAnimRef.removeAllListeners();
      scaleAnimRef.removeAllListeners();
      
      // Reset animation values
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
  
  // ================================================================
  // MODAL ANIMATION SYSTEM
  // ================================================================
  
  useEffect(() => {
    if (animationInProgressRef.current) return;
    
    animationInProgressRef.current = true;
    
    if (visible) {
      // Opening animation
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
          // Fallback if animation was interrupted
          modalAnimRef.setValue(1);
          fadeAnimRef.setValue(1);
          scaleAnimRef.setValue(1);
        }
      });
    } else {
      // Closing animation
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
          // Fallback if animation was interrupted
          modalAnimRef.setValue(0);
          fadeAnimRef.setValue(0);
          scaleAnimRef.setValue(0.8);
        }
      });
    }
  }, [visible, modalAnimRef, fadeAnimRef, scaleAnimRef]);
  
  // ================================================================
  // FEEDBACK SYSTEM
  // ================================================================
  
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
  
  // ================================================================
  // DATA PROCESSING & VALIDATION
  // ================================================================
  
  const processedPostData = useMemo(() => {
    try {
      if (mode === 'advanced' && advancedData) {
        // Process advanced template data
        const validSections = advancedData.sections
          .filter(section => section.content.trim() || section.config.allowEmpty)
          .sort((a, b) => a.order - b.order);
        
        const finalTitle = advancedData.templateName || 
                          validSections[0]?.content.substring(0, 100) || 
                          'Advanced Template Post';
        
        const finalContent = validSections
          .map(section => `**${section.label}:**\n${section.content}`)
          .join('\n\n');
        
        // Validate content
        const titleValidation = validatePostContent(finalTitle);
        const contentValidation = validatePostContent(finalContent);
        
        if (!titleValidation.isValid || !contentValidation.isValid) {
          secureLog('Preview validation failed', {
            titleErrors: titleValidation.errors,
            contentErrors: contentValidation.errors,
            mode: 'advanced'
          });
        }
        
        return {
          id: 'preview-advanced',
          title: titleValidation.sanitizedContent || finalTitle,
          content: contentValidation.sanitizedContent || finalContent,
          username: sanitizeUsername(advancedData.author.username || 'Anonymous'),
          userId: advancedData.author.uid || 'preview-user',
          userAvatar: sanitizeURL(advancedData.author.profileImage || '') || '',
          likes: 0,
          comments: 0,
          engagement: 0,
          images: advancedData.selectedImages || [],
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
        };
      } else if (mode === 'simple' && postData) {
        // Process simple post data
        const titleValidation = validatePostContent(postData.title || '');
        const contentValidation = validatePostContent(postData.content || '');
        
        if (!titleValidation.isValid || !contentValidation.isValid) {
          secureLog('Preview validation failed', {
            titleErrors: titleValidation.errors,
            contentErrors: contentValidation.errors,
            mode: 'simple'
          });
        }
        
        return {
          id: 'preview-simple',
          title: titleValidation.sanitizedContent || postData.title || t('createPost.untitledPost', 'Untitled Post'),
          content: contentValidation.sanitizedContent || postData.content || '',
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
  }, [mode, advancedData, postData, t]);
  
  const processedAuthorData = useMemo(() => {
    try {
      if (mode === 'advanced' && advancedData) {
        return {
          uid: advancedData.author.uid || 'preview-user',
          username: sanitizeUsername(advancedData.author.username || 'Anonymous'),
          profileImage: sanitizeURL(advancedData.author.profileImage || '') || '',
          reputation: 100,
          vip: advancedData.author.isVIP || false,
          rank: advancedData.author.title || 'Member',
          level: advancedData.author.level || 1,
        };
      } else if (mode === 'simple' && postData) {
        return {
          uid: 'preview-user',
          username: sanitizeUsername(postData.author.username || 'Anonymous'),
          profileImage: sanitizeURL(postData.author.avatar || '') || '',
          reputation: 100,
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
  
  // ================================================================
  // INTERACTION HANDLERS
  // ================================================================
  
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
      onCancel(); // Fallback
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
      
      // Final validation before submission
      if (mode === 'simple') {
        if (!processedPostData.title.trim() || !processedPostData.content.trim()) {
          showFeedback(t('preview.missingContent', 'Please add title and content.'));
          return;
        }
      } else if (mode === 'advanced') {
        if (!processedPostData.sections || processedPostData.sections.length === 0) {
          showFeedback(t('preview.missingSections', 'Please add content to sections.'));
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
      });
    } catch (error) {
      secureLog('Confirm handler error', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      showFeedback(t('common.error', 'An error occurred. Please try again.'));
    }
  }, [isSubmitting, processedPostData, mode, onConfirm, showFeedback, t]);
  
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
    
    // Simulate refresh for preview
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
  
  // ================================================================
  // RENDER CONDITIONS
  // ================================================================
  
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
  
  // ================================================================
  // MAIN RENDER
  // ================================================================
  
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
        <SafeAreaView style={styles.container}>
          <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
          
          {/* Gaming Gradient Background */}
          <LinearGradient
            colors={['#000', '#0a0a0a', '#1a262e', '#16323e']}
            style={StyleSheet.absoluteFill}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          />
          
          {/* Animated Modal Container */}
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
                        ? t('preview.advancedPreview', 'Advanced Preview')
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
            <ScrollView
              ref={scrollViewRef}
              style={styles.scrollView}
              contentContainerStyle={styles.contentContainer}
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
                    {t('preview.notice', 'This is how your post will appear. Interactions are disabled in preview mode.')}
                  </Text>
                </LinearGradient>
              </Animated.View>
              
              {/* Post Content */}
              <Animated.View style={{ opacity: fadeAnimRef }}>
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
              </Animated.View>
              
              {/* Advanced Template Sections Preview */}
              {mode === 'advanced' && processedPostData.sections && (
                <Animated.View 
                  style={[
                    styles.sectionsPreview,
                    { opacity: fadeAnimRef }
                  ]}
                >
                  <Text style={styles.sectionsTitle}>
                    {t('preview.templateSections', 'Template Sections')}
                  </Text>
                  {processedPostData.sections.map((section, index) => (
                    <View key={section.id} style={styles.sectionPreview}>
                      <LinearGradient
                        colors={[
                          'rgba(147, 112, 219, 0.15)',
                          'rgba(106, 90, 205, 0.1)'
                        ]}
                        style={styles.sectionPreviewGradient}
                      >
                        <View style={styles.sectionHeader}>
                          <Text style={styles.sectionLabel}>
                            {section.label}
                          </Text>
                          <View style={styles.sectionOrder}>
                            <Text style={styles.sectionOrderText}>
                              {index + 1}
                            </Text>
                          </View>
                        </View>
                        <Text style={styles.sectionContent}>
                          {section.content || t('preview.emptySection', 'Empty section')}
                        </Text>
                      </LinearGradient>
                    </View>
                  ))}
                </Animated.View>
              )}
              
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
      </Modal>
    );
  } catch (error) {
    secureLog('PostPreviewModal render error', {
      error: error instanceof Error ? error.message : 'Unknown error',
      mode,
      visible,
      hasPostData: !!processedPostData,
    });
    
    // Fallback error UI
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

// ================================================================
// STYLES - PRODUCTION READY WITH GAMING AESTHETIC
// ================================================================

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
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 120, // Space for action buttons
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
  
  // Sections Preview Styles
  sectionsPreview: {
    marginTop: 24,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(147, 112, 219, 0.3)',
  },
  sectionsTitle: {
    color: '#9370DB',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
    marginHorizontal: 20,
    marginTop: 20,
    textAlign: 'center',
  },
  sectionPreview: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(147, 112, 219, 0.2)',
  },
  sectionPreviewGradient: {
    padding: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  sectionLabel: {
    color: '#9370DB',
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
  },
  sectionOrder: {
    backgroundColor: 'rgba(147, 112, 219, 0.3)',
    borderRadius: 12,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionOrderText: {
    color: '#9370DB',
    fontSize: 12,
    fontWeight: '700',
  },
  sectionContent: {
    color: '#CCCCCC',
    fontSize: 14,
    lineHeight: 20,
    fontStyle: 'italic',
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
});