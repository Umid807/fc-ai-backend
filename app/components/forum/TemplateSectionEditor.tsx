import React, { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Animated,
  Vibration,
  Dimensions,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

// Import existing components for maximum reuse
import TextEditor from './TextEditor';
import GroupedToolbar from './GroupedToolbar';
import VIPFeature from './VIPFeature';
import { validatePostContent, sanitizePostContent, secureLog } from '../../utils/security';
// Import existing components for maximum reuse

import SectionContentEditor from './SectionContentEditor'; // ← ADD THIS LINE
import QuoteSectionEditor from './QuoteSectionEditor';
import ImageSectionEditor from './ImageSectionEditor';
import TableSectionEditor from './TableSectionEditor';
import VideoSectionEditor from './VideoSectionEditor';
import PollSectionEditor from './PollSectionEditor';

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
    type: 'text' | 'rich' | 'code';
  };
  order: number;
  isCollapsed: boolean;
  isEditing: boolean;
}

interface TemplateSectionEditorProps {
  section: TemplateSection;
  isActive: boolean;
  onContentChange: (sectionId: string, content: string) => void;
  onStyleUpdate: (sectionId: string, style: Partial<TextStyle>) => void;
  onLabelChange: (sectionId: string, label: string) => void;
  onToggleSection: (sectionId: string) => void;
  onDeleteSection: (sectionId: string) => void;
  onDuplicateSection: (sectionId: string) => void;
  userVIPStatus: boolean;
  disabled?: boolean;
  showAdvancedControls?: boolean;
  maxSections?: number;
  currentSectionCount?: number;
  onVIPUpgradePrompt?: () => void;
}

// Constants
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const ANIMATION_DURATION = 300;
const COLLAPSE_PREVIEW_LENGTH = 50;
const LONG_PRESS_DURATION = 500;

// Section Type Icons Mapping
const SECTION_TYPE_ICONS: Record<string, string> = {
  'text': 'document-text',
  'rich': 'reader',
  'code': 'code-slash',
  'header': 'title',
  'quote': 'chatbox-ellipses',
  'stats': 'stats-chart',
  'conclusion': 'checkmark-circle',
  'esports': 'trophy',
  'tactical': 'library',
  'gradient': 'color-palette',
};

// Get section icon based on content and style
const getSectionIcon = (section: TemplateSection): string => {
  // Smart icon detection based on section characteristics
  if (section.label.toLowerCase().includes('header') || section.style.fontSize >= 20) {
    return 'title';
  }
  if (section.label.toLowerCase().includes('quote') || section.style.fontStyle === 'italic') {
    return 'chatbox-ellipses';
  }
  if (section.label.toLowerCase().includes('stats') || section.style.fontFamily === 'SpaceMono') {
    return 'stats-chart';
  }
  if (section.label.toLowerCase().includes('conclusion') || section.label.toLowerCase().includes('call')) {
    return 'checkmark-circle';
  }
  if (section.label.toLowerCase().includes('esports') || section.style.fontFamily === 'Orbitron') {
    return 'trophy';
  }
  if (section.label.toLowerCase().includes('tactical') || section.label.toLowerCase().includes('analysis')) {
    return 'library';
  }
  if (section.style.textDecorationLine === 'gradient' || section.style.fontFamily === 'Audiowide') {
    return 'color-palette';
  }
  
  return SECTION_TYPE_ICONS[section.config.type] || 'document-text';
};

// Generate content preview for collapsed state
const getContentPreview = (content: string, maxLength: number = COLLAPSE_PREVIEW_LENGTH): string => {
  if (!content.trim()) return 'No content yet...';
  
  const preview = content.trim().replace(/\n/g, ' ').substring(0, maxLength);
  return preview.length < content.trim().length ? `${preview}...` : preview;
};

// Get style preview text for header
const getStylePreview = (style: TextStyle): string => {
  const parts: string[] = [];
  
  if (style.fontFamily !== 'System') {
    parts.push(style.fontFamily);
  }
  if (style.fontWeight === 'bold') {
    parts.push('Bold');
  }
  if (style.fontStyle === 'italic') {
    parts.push('Italic');
  }
  if (style.textDecorationLine !== 'none') {
    parts.push(style.textDecorationLine.charAt(0).toUpperCase() + style.textDecorationLine.slice(1));
  }
  
  return parts.length > 0 ? parts.join(', ') : 'Default';
};

const TemplateSectionEditor: React.FC<TemplateSectionEditorProps> = ({
  section,
  isActive,
  onContentChange,
  onStyleUpdate,
  onLabelChange,
  onToggleSection,
  onDeleteSection,
  onDuplicateSection,
  userVIPStatus,
  disabled = false,
  showAdvancedControls = true,
  maxSections = 3,
  currentSectionCount = 0,
  onVIPUpgradePrompt,
}) => {
  const { t } = useTranslation();
  
  // Animation refs
  const expandAnimation = useRef(new Animated.Value(section.isCollapsed ? 0 : 1)).current;
  const glowAnimation = useRef(new Animated.Value(0)).current;
  const pulseAnimation = useRef(new Animated.Value(1)).current;
  const longPressAnimation = useRef(new Animated.Value(1)).current;
  
  // State management
  const [isLongPressing, setIsLongPressing] = useState(false);
  const [showQuickActions, setShowQuickActions] = useState(false);
  const [isEditingLabel, setIsEditingLabel] = useState(false);
  const [tempLabel, setTempLabel] = useState(section.label);
  const [contentErrors, setContentErrors] = useState<string[]>([]);
  const [showVIPPreview, setShowVIPPreview] = useState(false);
  const [lastActiveTime, setLastActiveTime] = useState<number>(0);
  
  // Update expand animation when section collapse state changes
  useEffect(() => {
    Animated.spring(expandAnimation, {
      toValue: section.isCollapsed ? 0 : 1,
      useNativeDriver: false,
      tension: 120,
      friction: 8,
    }).start();
  }, [section.isCollapsed, expandAnimation]);
  
  // Glow animation for active state
  useEffect(() => {
    if (isActive && !section.isCollapsed) {
      // Start glow animation
      Animated.loop(
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
      ).start();
      
      setLastActiveTime(Date.now());
    } else {
      glowAnimation.setValue(0);
    }
  }, [isActive, section.isCollapsed, glowAnimation]);
  
  // Pulse animation for interactions
  const triggerPulse = useCallback(() => {
    Animated.sequence([
      Animated.timing(pulseAnimation, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(pulseAnimation, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
  }, [pulseAnimation]);
  
  // Long press animation
  const startLongPress = useCallback(() => {
    setIsLongPressing(true);
    Animated.timing(longPressAnimation, {
      toValue: 0.9,
      duration: LONG_PRESS_DURATION,
      useNativeDriver: true,
    }).start(() => {
      if (showAdvancedControls) {
        setShowQuickActions(true);
        Vibration.vibrate(100);
      }
    });
  }, [longPressAnimation, showAdvancedControls]);
  
  const cancelLongPress = useCallback(() => {
    setIsLongPressing(false);
    Animated.timing(longPressAnimation, {
      toValue: 1,
      duration: 150,
      useNativeDriver: true,
    }).start();
  }, [longPressAnimation]);
  
  // Content validation
  const validateContent = useCallback((content: string) => {
    const validation = validatePostContent(content);
    setContentErrors(validation.isValid ? [] : validation.errors);
    return validation.isValid;
  }, []);
  
  // Content change handler with validation
  const handleContentChange = useCallback((content: string) => {
    validateContent(content);
    onContentChange(section.id, content);
    
    secureLog('Section content updated', {
      sectionId: section.id,
      sectionLabel: section.label,
      contentLength: content.length,
      hasErrors: contentErrors.length > 0,
    });
  }, [section.id, section.label, onContentChange, validateContent, contentErrors.length]);
  
  // Style update handler with VIP checks
  const handleStyleUpdate = useCallback(<K extends keyof TextStyle>(
    key: K,
    value: TextStyle[K],
    requiresVIP = false
  ) => {
    if (requiresVIP && !userVIPStatus) {
      if (onVIPUpgradePrompt) {
        onVIPUpgradePrompt();
      } else {
        setShowVIPPreview(true);
      }
      return;
    }
    
    onStyleUpdate(section.id, { [key]: value });
    triggerPulse();
    Vibration.vibrate(30);
    
    secureLog('Section style updated', {
      sectionId: section.id,
      styleProperty: key,
      newValue: value,
      requiresVIP,
      userVIP: userVIPStatus,
    });
  }, [section.id, userVIPStatus, onStyleUpdate, triggerPulse, onVIPUpgradePrompt]);
  
  // Label editing handlers
  const startLabelEdit = useCallback(() => {
    setIsEditingLabel(true);
    setTempLabel(section.label);
  }, [section.label]);
  
  const saveLabelEdit = useCallback(() => {
    if (tempLabel.trim() && tempLabel.trim() !== section.label) {
      onLabelChange(section.id, tempLabel.trim());
    }
    setIsEditingLabel(false);
    setTempLabel(section.label);
  }, [tempLabel, section.id, section.label, onLabelChange]);
  
  const cancelLabelEdit = useCallback(() => {
    setIsEditingLabel(false);
    setTempLabel(section.label);
  }, [section.label]);
  
  // Section actions
  const handleToggleSection = useCallback(() => {
    onToggleSection(section.id);
    triggerPulse();
    Vibration.vibrate(30);
  }, [section.id, onToggleSection, triggerPulse]);
  
  const handleDeleteSection = useCallback(() => {
    Alert.alert(
      t('sectionEditor.confirmDelete'),
      t('sectionEditor.deleteWarning', { sectionName: section.label }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: () => {
            onDeleteSection(section.id);
            Vibration.vibrate(100);
          },
        },
      ]
    );
  }, [section.id, section.label, onDeleteSection, t]);
  
  const handleDuplicateSection = useCallback(() => {
    // Check section limits
    const effectiveMaxSections = userVIPStatus ? Infinity : maxSections;
    if (currentSectionCount >= effectiveMaxSections) {
      if (onVIPUpgradePrompt) {
        onVIPUpgradePrompt();
      }
      return;
    }
    
    onDuplicateSection(section.id);
    setShowQuickActions(false);
    Vibration.vibrate(30);
  }, [
    section.id,
    currentSectionCount,
    maxSections,
    userVIPStatus,
    onDuplicateSection,
    onVIPUpgradePrompt,
  ]);
  
  // Calculate content statistics
  const contentStats = useMemo(() => {
    const content = section.content;
    const wordCount = content.trim().split(/\s+/).filter(Boolean).length;
    const charCount = content.length;
    const lineCount = content.split('\n').length;
    
    return {
      words: wordCount,
      characters: charCount,
      lines: lineCount,
      estimatedReadTime: Math.max(1, Math.ceil(wordCount / 200)), // 200 WPM
    };
  }, [section.content]);
  
  // Get section type badge color
  const sectionTypeColor = useMemo(() => {
    if (section.style.fontFamily === 'Orbitron' || section.label.toLowerCase().includes('esports')) {
      return '#FFD700'; // Gold for eSports
    }
    if (section.style.fontFamily === 'SpaceMono' || section.label.toLowerCase().includes('stats')) {
      return '#32CD32'; // Green for stats
    }
    if (section.style.fontStyle === 'italic' || section.label.toLowerCase().includes('quote')) {
      return '#FF69B4'; // Pink for quotes
    }
    if (section.style.fontSize >= 20 || section.label.toLowerCase().includes('header')) {
      return '#FFD700'; // Gold for headers
    }
    
    return '#00FFFF'; // Default cyan
  }, [section.style, section.label]);
  
  // Render section header
  const renderSectionHeader = useCallback(() => (
    <TouchableOpacity
      style={[
        styles.sectionHeader,
        isActive && styles.activeSectionHeader,
        section.isCollapsed && styles.collapsedSectionHeader,
      ]}
      onPress={handleToggleSection}
      onLongPress={startLongPress}
      onPressOut={cancelLongPress}
      activeOpacity={0.8}
      disabled={disabled}
    >
      <Animated.View
        style={[
          styles.headerAnimatedContainer,
          {
            transform: [{ scale: pulseAnimation }],
          },
        ]}
      >
        <LinearGradient
          colors={
            isActive && !section.isCollapsed
              ? [
                  `rgba(0, 255, 255, ${glowAnimation.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.2, 0.4],
                  })})`,
                  'rgba(0, 255, 255, 0.1)',
                ]
              : ['rgba(255, 255, 255, 0.05)', 'transparent']
          }
          style={styles.sectionHeaderGradient}
        >
          <View style={styles.sectionHeaderContent}>
            {/* Left Side - Icon, Label, Stats */}
            <View style={styles.sectionHeaderLeft}>
              <View style={styles.sectionIconContainer}>
                <Ionicons
                  name={getSectionIcon(section) as any}
                  size={18}
                  color={sectionTypeColor}
                />
                <View style={[styles.sectionTypeBadge, { backgroundColor: sectionTypeColor }]} />
              </View>
              
              <View style={styles.sectionHeaderInfo}>
                {isEditingLabel ? (
                  <View style={styles.labelEditContainer}>
                    <TextInput
                      style={styles.labelEditInput}
                      value={tempLabel}
                      onChangeText={setTempLabel}
                      onSubmitEditing={saveLabelEdit}
                      onBlur={saveLabelEdit}
                      placeholder="Section name"
                      placeholderTextColor="#666"
                      autoFocus
                      maxLength={50}
                    />
                    <TouchableOpacity onPress={saveLabelEdit} style={styles.labelEditAction}>
                      <Ionicons name="checkmark" size={16} color="#32CD32" />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={cancelLabelEdit} style={styles.labelEditAction}>
                      <Ionicons name="close" size={16} color="#FF6347" />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity onPress={startLabelEdit} disabled={disabled}>
                    <Text style={[
                      styles.sectionLabel,
                      isActive && styles.activeSectionLabel,
                    ]}>
                      {section.label}
                    </Text>
                  </TouchableOpacity>
                )}
                
                {/* Content Preview and Stats */}
                <View style={styles.sectionMeta}>
                  {section.isCollapsed && section.content.length > 0 && (
                    <Text style={styles.contentPreview} numberOfLines={1}>
                      {getContentPreview(section.content)}
                    </Text>
                  )}
                  
                  {!section.isCollapsed && (
                    <View style={styles.contentStats}>
                      <Text style={styles.statText}>
                        {contentStats.words} words • {contentStats.characters} chars
                      </Text>
                      {contentStats.words > 0 && (
                        <Text style={styles.statText}>
                          • {contentStats.estimatedReadTime}min read
                        </Text>
                      )}
                    </View>
                  )}
                </View>
              </View>
            </View>
            
            {/* Right Side - Controls */}
            <View style={styles.sectionHeaderRight}>
              {/* Style Preview */}
              <View style={styles.stylePreview}>
                <Text style={styles.stylePreviewText}>
                  {getStylePreview(section.style)}
                </Text>
              </View>
              
              {/* Expand/Collapse Icon */}
              <Animated.View
                style={{
                  transform: [{
                    rotate: expandAnimation.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0deg', '90deg'],
                    }),
                  }],
                }}
              >
                <Ionicons
                  name="chevron-forward"
                  size={20}
                  color={isActive ? '#00FFFF' : '#888'}
                />
              </Animated.View>
            </View>
          </View>
          
          {/* Error Indicators */}
          {contentErrors.length > 0 && (
            <View style={styles.errorIndicator}>
              <Ionicons name="warning" size={14} color="#FF6347" />
              <Text style={styles.errorText}>{contentErrors[0]}</Text>
            </View>
          )}
        </LinearGradient>
      </Animated.View>
    </TouchableOpacity>
  ), [
    section,
    isActive,
    disabled,
    handleToggleSection,
    startLongPress,
    cancelLongPress,
    pulseAnimation,
    glowAnimation,
    expandAnimation,
    sectionTypeColor,
    isEditingLabel,
    tempLabel,
    setTempLabel,
    saveLabelEdit,
    cancelLabelEdit,
    startLabelEdit,
    contentStats,
    contentErrors,
  ]);
  
  // Render section content editor
  const renderSectionContent = useCallback(() => {
    if (section.isCollapsed || !isActive) return null;
    
    return (
      <Animated.View
        style={[
          styles.sectionContentContainer,
          {
            maxHeight: expandAnimation.interpolate({
              inputRange: [0, 1],
              outputRange: [0, section.config.maxHeight || 500],
            }),
            opacity: expandAnimation,
          },
        ]}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.contentEditor}
        >
          {/* Section-specific TextEditor */}
{section.config.type === 'quote' ? (
  <QuoteSectionEditor
    section={section}
    onContentChange={handleContentChange}
    onStyleUpdate={handleStyleUpdate}
    onSectionUpdate={(updates) => {
      // Update the section with new data
      Object.entries(updates).forEach(([key, value]) => {
        if (key === 'content') {
          handleContentChange(value);
        } else if (key === 'quoteData' || key === 'images' || key === 'tableData' || key === 'videoData' || key === 'pollData') {
          // Handle type-specific data updates
          // You'll need to add this handler to TemplateSectionEditor props
        }
      });
    }}
    userVIPStatus={userVIPStatus}
    disabled={disabled}
  />
) : section.config.type === 'image' ? (
  <ImageSectionEditor
    section={section}
    onContentChange={handleContentChange}
    onStyleUpdate={handleStyleUpdate}
    onSectionUpdate={(updates) => {
      // Handle image section updates
    }}
    userVIPStatus={userVIPStatus}
    disabled={disabled}
  />
) : section.config.type === 'table' ? (
  <TableSectionEditor
    section={section}
    onContentChange={handleContentChange}
    onStyleUpdate={handleStyleUpdate}
    onSectionUpdate={(updates) => {
      // Handle table section updates
    }}
    userVIPStatus={userVIPStatus}
    disabled={disabled}
  />
) : section.config.type === 'video' ? (
  <VideoSectionEditor
    section={section}
    onContentChange={handleContentChange}
    onStyleUpdate={handleStyleUpdate}
    onSectionUpdate={(updates) => {
      // Handle video section updates
    }}
    userVIPStatus={userVIPStatus}
    disabled={disabled}
  />
) : section.config.type === 'poll' ? (
  <PollSectionEditor
    section={section}
    onContentChange={handleContentChange}
    onStyleUpdate={handleStyleUpdate}
    onSectionUpdate={(updates) => {
      // Handle poll section updates
    }}
    userVIPStatus={userVIPStatus}
    disabled={disabled}
  />
) : (
  <SectionContentEditor
    content={section.content}
    onContentChange={handleContentChange}
    textStyle={section.style}
    onStyleUpdate={handleStyleUpdate}
    placeholder={section.config.placeholder}
    minHeight={section.config.minHeight}
    maxHeight={section.config.maxHeight}
    sectionLabel={section.label}
    sectionType={section.config.type}
    userVIPStatus={userVIPStatus}
    disabled={disabled}
    onShowVIPUpgrade={onVIPUpgradePrompt}
  />
)}
          
          {/* Custom Section Toolbar */}

          
          {/* Section-specific Actions */}
          <View style={styles.sectionActions}>
            <View style={styles.sectionActionGroup}>
              <TouchableOpacity
                style={styles.sectionActionButton}
                onPress={handleDuplicateSection}
                disabled={disabled}
              >
                <Ionicons name="copy" size={16} color="#32CD32" />
                <Text style={styles.sectionActionText}>Duplicate</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.sectionActionButton}
                onPress={handleDeleteSection}
                disabled={disabled}
              >
                <Ionicons name="trash" size={16} color="#FF6347" />
                <Text style={[styles.sectionActionText, { color: '#FF6347' }]}>Delete</Text>
              </TouchableOpacity>
            </View>
            
            {/* Content Validation Status */}
            <View style={styles.validationStatus}>
              {contentErrors.length === 0 ? (
                <View style={styles.validStatus}>
                  <Ionicons name="checkmark-circle" size={16} color="#32CD32" />
                  <Text style={styles.validText}>Valid content</Text>
                </View>
              ) : (
                <View style={styles.invalidStatus}>
                  <Ionicons name="warning" size={16} color="#FF6347" />
                  <Text style={styles.invalidText}>{contentErrors.length} issues</Text>
                </View>
              )}
            </View>
          </View>
        </KeyboardAvoidingView>
      </Animated.View>
    );
  }, [
    section,
    isActive,
    expandAnimation,
    handleContentChange,
    contentStats,
    disabled,
    userVIPStatus,
    handleStyleUpdate,
    handleDuplicateSection,
    handleDeleteSection,
    contentErrors,
  ]);
  
  // Render quick actions modal
  const renderQuickActions = useCallback(() => {
    if (!showQuickActions) return null;
    
    return (
      <Modal
        visible={showQuickActions}
        transparent
        animationType="fade"
        onRequestClose={() => setShowQuickActions(false)}
      >
        <TouchableOpacity
          style={styles.quickActionsOverlay}
          onPress={() => setShowQuickActions(false)}
          activeOpacity={1}
        >
          <View style={styles.quickActionsModal}>
            <LinearGradient
              colors={['rgba(18, 25, 40, 0.95)', 'rgba(10, 15, 25, 0.9)']}
              style={styles.quickActionsContent}
            >
              <Text style={styles.quickActionsTitle}>Section Actions</Text>
              
              <TouchableOpacity
                style={styles.quickActionItem}
                onPress={() => {
                  handleDuplicateSection();
                  setShowQuickActions(false);
                }}
              >
                <Ionicons name="copy" size={20} color="#32CD32" />
                <Text style={styles.quickActionText}>Duplicate Section</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.quickActionItem}
                onPress={() => {
                  startLabelEdit();
                  setShowQuickActions(false);
                }}
              >
                <Ionicons name="create" size={20} color="#00FFFF" />
                <Text style={styles.quickActionText}>Rename Section</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.quickActionItem}
                onPress={() => {
                  handleDeleteSection();
                  setShowQuickActions(false);
                }}
              >
                <Ionicons name="trash" size={20} color="#FF6347" />
                <Text style={[styles.quickActionText, { color: '#FF6347' }]}>Delete Section</Text>
              </TouchableOpacity>
            </LinearGradient>
          </View>
        </TouchableOpacity>
      </Modal>
    );
  }, [
    showQuickActions,
    handleDuplicateSection,
    startLabelEdit,
    handleDeleteSection,
  ]);
  
  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ scale: longPressAnimation }],
        },
      ]}
    >
      {/* Section Header */}
      {renderSectionHeader()}
      
      {/* Section Content */}
      {renderSectionContent()}
      
      {/* Quick Actions Modal */}
      {renderQuickActions()}
      
      {/* VIP Feature Preview */}
      <VIPFeature
        visible={showVIPPreview}
        onClose={() => setShowVIPPreview(false)}
        featureType="section-styling"
        animation={new Animated.Value(showVIPPreview ? 1 : 0)}
      />
    </Animated.View>
  );
};

export default TemplateSectionEditor;

/* ----------------- ULTIMATE SECTION EDITOR STYLES ----------------- */
const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
    borderRadius: 16,
    overflow: 'hidden',
  },
  sectionHeader: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 255, 0.2)',
  },
  activeSectionHeader: {
    borderColor: '#00FFFF',
    shadowColor: '#00FFFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  collapsedSectionHeader: {
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
  },
  headerAnimatedContainer: {
    overflow: 'hidden',
  },
  sectionHeaderGradient: {
    padding: 16,
  },
  sectionHeaderContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
  },
  sectionIconContainer: {
    position: 'relative',
    marginRight: 12,
    marginTop: 2,
  },
  sectionTypeBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  sectionHeaderInfo: {
    flex: 1,
  },
  labelEditContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  labelEditInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    backgroundColor: 'rgba(0, 255, 255, 0.1)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
  },
  labelEditAction: {
    padding: 6,
    marginLeft: 4,
  },
  sectionLabel: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  activeSectionLabel: {
    color: '#00FFFF',
  },
  sectionMeta: {
    marginTop: 4,
  },
  contentPreview: {
    color: '#CCCCCC',
    fontSize: 13,
    fontStyle: 'italic',
    lineHeight: 16,
  },
  contentStats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  statText: {
    color: '#888',
    fontSize: 11,
    marginRight: 4,
  },
  sectionHeaderRight: {
    alignItems: 'flex-end',
    marginLeft: 12,
  },
  stylePreview: {
    backgroundColor: 'rgba(0, 255, 255, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 8,
  },
  stylePreviewText: {
    color: '#00FFFF',
    fontSize: 10,
    fontWeight: '500',
  },
  errorIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 99, 71, 0.2)',
  },
  errorText: {
    color: '#FF6347',
    fontSize: 12,
    marginLeft: 6,
    flex: 1,
  },
  
  // Section Content Styles
  sectionContentContainer: {
    overflow: 'hidden',
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 255, 255, 0.2)',
    
  },
  contentEditor: {
    padding: 16,
    paddingTop: 12,
  },
  sectionActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  sectionActionGroup: {
    flexDirection: 'row',
    gap: 12,
  },
  sectionActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  sectionActionText: {
    color: '#32CD32',
    fontSize: 12,
    fontWeight: '500',
  },
  validationStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  validStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  validText: {
    color: '#32CD32',
    fontSize: 12,
    fontWeight: '500',
  },
  invalidStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  invalidText: {
    color: '#FF6347',
    fontSize: 12,
    fontWeight: '500',
  },
  
  // Quick Actions Modal Styles
  quickActionsOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickActionsModal: {
    width: SCREEN_WIDTH * 0.8,
    borderRadius: 16,
    overflow: 'hidden',
  },
  quickActionsContent: {
    padding: 20,
  },
  quickActionsTitle: {
    color: '#FFD700',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 16,
  },
  quickActionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 12,
  },
  quickActionText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
  },
});