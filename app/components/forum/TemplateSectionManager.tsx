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
  PanGestureHandler,
  State,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { secureLog } from '../../utils/security';

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
    type: 'text' | 'rich' | 'code';
  };
  order: number;
  isCollapsed: boolean;
  isEditing: boolean;
}

interface SectionTemplate {
  id: string;
  name: string;
  icon: string;
  description: string;
  defaultStyle: TextStyle;
  defaultConfig: {
    placeholder: string;
    minHeight: number;
    maxHeight?: number;
    allowEmpty: boolean;
    type: 'text' | 'rich' | 'code';
  };
  isVIP?: boolean;
  category: 'basic' | 'content' | 'media' | 'interactive' | 'vip';
}

interface TemplateSectionManagerProps {
  sections: TemplateSection[];
  onSectionsUpdate: (sections: TemplateSection[]) => void;
  onSectionSelect: (sectionId: string) => void;
  activeSectionId: string | null;
  userVIPStatus: boolean;
  maxSections?: number;
  onVIPUpgradePrompt: () => void;
  disabled?: boolean;
}

// Constants
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const MAX_SECTIONS_FREE = 3;
const DRAG_THRESHOLD = 10;
const LONG_PRESS_DURATION = 500;

// Section Templates Library
const SECTION_TEMPLATES: SectionTemplate[] = [
  // Basic Section Types
  {
    id: 'text_basic',
    name: 'Text Section',
    icon: 'document-text',
    description: 'Basic text content with standard formatting',
    category: 'basic',
    defaultStyle: {
      fontSize: 16,
      fontWeight: 'normal',
      fontStyle: 'normal',
      textDecorationLine: 'none',
      textAlign: 'left',
      color: '#FFFFFF',
      fontFamily: 'System',
    },
    defaultConfig: {
      placeholder: 'Enter your content here...',
      minHeight: 80,
      maxHeight: 300,
      allowEmpty: false,
      type: 'text',
    },
  },
  {
    id: 'header_section',
    name: 'Header',
    icon: 'title',
    description: 'Bold header text for titles and announcements',
    category: 'basic',
    defaultStyle: {
      fontSize: 22,
      fontWeight: 'bold',
      fontStyle: 'normal',
      textDecorationLine: 'none',
      textAlign: 'center',
      color: '#FFD700',
      fontFamily: 'System',
    },
    defaultConfig: {
      placeholder: '🎮 Your awesome title here...',
      minHeight: 60,
      maxHeight: 120,
      allowEmpty: false,
      type: 'text',
    },
  },
  {
    id: 'quote_section',
    name: 'Quote Block',
    icon: 'chatbox-ellipses',
    description: 'Stylized quote or highlight section',
    category: 'content',
    defaultStyle: {
      fontSize: 16,
      fontWeight: 'normal',
      fontStyle: 'italic',
      textDecorationLine: 'none',
      textAlign: 'center',
      color: '#00FFFF',
      fontFamily: 'System',
    },
    defaultConfig: {
      placeholder: '"Enter your quote or key message here..."',
      minHeight: 70,
      maxHeight: 150,
      allowEmpty: false,
      type: 'text',
    },
  },
  {
    id: 'stats_section',
    name: 'Statistics',
    icon: 'stats-chart',
    description: 'Gaming stats, scores, and data display',
    category: 'content',
    defaultStyle: {
      fontSize: 14,
      fontWeight: 'normal',
      fontStyle: 'normal',
      textDecorationLine: 'none',
      textAlign: 'left',
      color: '#32CD32',
      fontFamily: 'SpaceMono',
    },
    defaultConfig: {
      placeholder: 'Score: 3-1\nKills: 24\nDeaths: 8\nAssists: 12',
      minHeight: 80,
      maxHeight: 200,
      allowEmpty: false,
      type: 'text',
    },
  },
  {
    id: 'conclusion_section',
    name: 'Conclusion',
    icon: 'checkmark-circle',
    description: 'Wrap-up section with call-to-action',
    category: 'content',
    defaultStyle: {
      fontSize: 15,
      fontWeight: 'normal',
      fontStyle: 'italic',
      textDecorationLine: 'none',
      textAlign: 'center',
      color: '#FF69B4',
      fontFamily: 'System',
    },
    defaultConfig: {
      placeholder: 'What are your thoughts? Share in the comments! 👇',
      minHeight: 50,
      maxHeight: 100,
      allowEmpty: true,
      type: 'text',
    },
  },
  
  // VIP Premium Sections
  {
    id: 'esports_header',
    name: 'eSports Header',
    icon: 'trophy',
    description: 'Professional tournament-style header',
    category: 'vip',
    isVIP: true,
    defaultStyle: {
      fontSize: 24,
      fontWeight: 'bold',
      fontStyle: 'normal',
      textDecorationLine: 'none',
      textAlign: 'center',
      color: '#FFD700',
      fontFamily: 'Orbitron',
    },
    defaultConfig: {
      placeholder: '🏆 GRAND FINAL: Team Alpha vs Team Beta',
      minHeight: 80,
      maxHeight: 140,
      allowEmpty: false,
      type: 'text',
    },
  },
  {
    id: 'tactical_analysis',
    name: 'Tactical Analysis',
    icon: 'library',
    description: 'Deep dive analysis with premium formatting',
    category: 'vip',
    isVIP: true,
    defaultStyle: {
      fontSize: 16,
      fontWeight: 'normal',
      fontStyle: 'normal',
      textDecorationLine: 'none',
      textAlign: 'left',
      color: '#FFFFFF',
      fontFamily: 'System',
    },
    defaultConfig: {
      placeholder: 'Detailed tactical breakdown:\n\n• Formation analysis\n• Key player movements\n• Strategic decisions\n• Impact assessment',
      minHeight: 120,
      maxHeight: 400,
      allowEmpty: false,
      type: 'rich',
    },
  },
  {
    id: 'gradient_highlight',
    name: 'Gradient Highlight',
    icon: 'color-palette',
    description: 'Eye-catching gradient text section',
    category: 'vip',
    isVIP: true,
    defaultStyle: {
      fontSize: 18,
      fontWeight: 'bold',
      fontStyle: 'normal',
      textDecorationLine: 'gradient',
      textAlign: 'center',
      color: '#FFD700',
      fontFamily: 'Audiowide',
    },
    defaultConfig: {
      placeholder: '✨ PREMIUM ANNOUNCEMENT ✨',
      minHeight: 60,
      maxHeight: 120,
      allowEmpty: false,
      type: 'text',
    },
  },
];

const TemplateSectionManager: React.FC<TemplateSectionManagerProps> = ({
  sections,
  onSectionsUpdate,
  onSectionSelect,
  activeSectionId,
  userVIPStatus,
  maxSections = MAX_SECTIONS_FREE,
  onVIPUpgradePrompt,
  disabled = false,
}) => {
  const { t } = useTranslation();
  
  // State management
  const [showSectionPicker, setShowSectionPicker] = useState(false);
  const [showReorderMode, setShowReorderMode] = useState(false);
  const [draggedSectionId, setDraggedSectionId] = useState<string | null>(null);
  const [reorderSections, setReorderSections] = useState<TemplateSection[]>([]);
  
  // Animation refs
  const pickerAnimation = useRef(new Animated.Value(0)).current;
  const reorderAnimation = useRef(new Animated.Value(0)).current;
  const sectionAnimations = useRef<Record<string, Animated.Value>>({}).current;
  
  // Initialize animations for sections
  useEffect(() => {
    sections.forEach(section => {
      if (!sectionAnimations[section.id]) {
        sectionAnimations[section.id] = new Animated.Value(1);
      }
    });
  }, [sections, sectionAnimations]);
  
  // Animate picker modal
  useEffect(() => {
    Animated.spring(pickerAnimation, {
      toValue: showSectionPicker ? 1 : 0,
      useNativeDriver: true,
      tension: 150,
      friction: 8,
    }).start();
  }, [showSectionPicker, pickerAnimation]);
  
  // Animate reorder mode
  useEffect(() => {
    Animated.spring(reorderAnimation, {
      toValue: showReorderMode ? 1 : 0,
      useNativeDriver: true,
      tension: 100,
      friction: 8,
    }).start();
    
    if (showReorderMode) {
      setReorderSections([...sections]);
    }
  }, [showReorderMode, sections, reorderAnimation]);
  
  // Section Management Functions
  const createSectionFromTemplate = useCallback((template: SectionTemplate) => {
    const newSection: TemplateSection = {
      id: `section_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      label: template.name,
      content: '',
      style: { ...template.defaultStyle },
      config: { ...template.defaultConfig },
      order: sections.length,
      isCollapsed: false,
      isEditing: true,
    };
    
    return newSection;
  }, [sections.length]);
  
  const addSection = useCallback((template: SectionTemplate) => {
    // Check VIP requirements
    if (template.isVIP && !userVIPStatus) {
      onVIPUpgradePrompt();
      setShowSectionPicker(false);
      return;
    }
    
    // Check section limits
    const effectiveMaxSections = userVIPStatus ? Infinity : maxSections;
    if (sections.length >= effectiveMaxSections) {
      onVIPUpgradePrompt();
      setShowSectionPicker(false);
      return;
    }
    
    const newSection = createSectionFromTemplate(template);
    
    // Collapse all existing sections
    const updatedSections = sections.map(section => ({
      ...section,
      isCollapsed: true,
      isEditing: false,
    }));
    
    const newSections = [...updatedSections, newSection];
    onSectionsUpdate(newSections);
    onSectionSelect(newSection.id);
    setShowSectionPicker(false);
    
    Vibration.vibrate(30);
    
    secureLog('Template section added', {
      templateId: template.id,
      templateName: template.name,
      sectionCount: newSections.length,
      isVIP: template.isVIP,
      userVIP: userVIPStatus,
    });
  }, [
    sections,
    userVIPStatus,
    maxSections,
    onVIPUpgradePrompt,
    createSectionFromTemplate,
    onSectionsUpdate,
    onSectionSelect,
  ]);
  
  const removeSection = useCallback((sectionId: string) => {
    const sectionToRemove = sections.find(s => s.id === sectionId);
    if (!sectionToRemove) return;
    
    Alert.alert(
      t('sectionManager.confirmDelete'),
      t('sectionManager.deleteWarning', { sectionName: sectionToRemove.label }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: () => {
            // Animate section removal
            Animated.timing(sectionAnimations[sectionId], {
              toValue: 0,
              duration: 300,
              useNativeDriver: true,
            }).start(() => {
              const updatedSections = sections
                .filter(section => section.id !== sectionId)
                .map((section, index) => ({ ...section, order: index }));
              
              onSectionsUpdate(updatedSections);
              
              // Select another section if this was active
              if (activeSectionId === sectionId) {
                const nextSection = updatedSections[0];
                if (nextSection) {
                  onSectionSelect(nextSection.id);
                }
              }
            });
            
            Vibration.vibrate(50);
            
            secureLog('Template section removed', {
              sectionId,
              sectionLabel: sectionToRemove.label,
              remainingSections: sections.length - 1,
            });
          },
        },
      ]
    );
  }, [sections, activeSectionId, onSectionsUpdate, onSectionSelect, sectionAnimations, t]);
  
  const duplicateSection = useCallback((sectionId: string) => {
    const sectionToDuplicate = sections.find(s => s.id === sectionId);
    if (!sectionToDuplicate) return;
    
    // Check section limits
    const effectiveMaxSections = userVIPStatus ? Infinity : maxSections;
    if (sections.length >= effectiveMaxSections) {
      onVIPUpgradePrompt();
      return;
    }
    
    const duplicatedSection: TemplateSection = {
      ...sectionToDuplicate,
      id: `section_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      label: `${sectionToDuplicate.label} (Copy)`,
      order: sections.length,
      isCollapsed: false,
      isEditing: true,
    };
    
    // Collapse all existing sections
    const updatedSections = sections.map(section => ({
      ...section,
      isCollapsed: true,
      isEditing: false,
    }));
    
    const newSections = [...updatedSections, duplicatedSection];
    onSectionsUpdate(newSections);
    onSectionSelect(duplicatedSection.id);
    
    Vibration.vibrate(30);
    
    secureLog('Template section duplicated', {
      originalSectionId: sectionId,
      newSectionId: duplicatedSection.id,
      sectionCount: newSections.length,
    });
  }, [sections, userVIPStatus, maxSections, onVIPUpgradePrompt, onSectionsUpdate, onSectionSelect]);
  
  // Reorder Functions
  const startReorderMode = useCallback(() => {
    if (sections.length <= 1) return;
    setShowReorderMode(true);
    Vibration.vibrate(50);
  }, [sections.length]);
  
  const cancelReorderMode = useCallback(() => {
    setShowReorderMode(false);
    setReorderSections([]);
    setDraggedSectionId(null);
  }, []);
  
  const confirmReorder = useCallback(() => {
    const reorderedSections = reorderSections.map((section, index) => ({
      ...section,
      order: index,
    }));
    
    onSectionsUpdate(reorderedSections);
    setShowReorderMode(false);
    setReorderSections([]);
    setDraggedSectionId(null);
    
    Vibration.vibrate(30);
    
    secureLog('Template sections reordered', {
      sectionCount: reorderedSections.length,
      newOrder: reorderedSections.map(s => s.id),
    });
  }, [reorderSections, onSectionsUpdate]);
  
  const moveSectionUp = useCallback((sectionId: string) => {
    const currentIndex = reorderSections.findIndex(s => s.id === sectionId);
    if (currentIndex <= 0) return;
    
    const newSections = [...reorderSections];
    [newSections[currentIndex], newSections[currentIndex - 1]] = 
    [newSections[currentIndex - 1], newSections[currentIndex]];
    
    setReorderSections(newSections);
    Vibration.vibrate(30);
  }, [reorderSections]);
  
  const moveSectionDown = useCallback((sectionId: string) => {
    const currentIndex = reorderSections.findIndex(s => s.id === sectionId);
    if (currentIndex >= reorderSections.length - 1) return;
    
    const newSections = [...reorderSections];
    [newSections[currentIndex], newSections[currentIndex + 1]] = 
    [newSections[currentIndex + 1], newSections[currentIndex]];
    
    setReorderSections(newSections);
    Vibration.vibrate(30);
  }, [reorderSections]);
  
  // Filter section templates by category
  const sectionsByCategory = useMemo(() => {
    const categories = ['basic', 'content', 'vip'] as const;
    const result: Record<string, SectionTemplate[]> = {};
    
    categories.forEach(category => {
      result[category] = SECTION_TEMPLATES.filter(template => 
        template.category === category && (!template.isVIP || userVIPStatus)
      );
    });
    
    return result;
  }, [userVIPStatus]);
  
  // Render section picker modal
  const renderSectionPicker = useCallback(() => (
    <Modal
      visible={showSectionPicker}
      transparent
      animationType="none"
      onRequestClose={() => setShowSectionPicker(false)}
    >
      <View style={styles.pickerOverlay}>
        <Animated.View
          style={[
            styles.pickerModal,
            {
              transform: [
                {
                  translateY: pickerAnimation.interpolate({
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
            style={styles.pickerContent}
          >
            <View style={styles.pickerHeader}>
              <Text style={styles.pickerTitle}>Add New Section</Text>
              <TouchableOpacity 
                onPress={() => setShowSectionPicker(false)}
                style={styles.pickerClose}
              >
                <Ionicons name="close" size={24} color="#888" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.pickerList} showsVerticalScrollIndicator={false}>
              {/* Basic Sections */}
              <View style={styles.categorySection}>
                <Text style={styles.categoryTitle}>📝 Basic Sections</Text>
                {sectionsByCategory.basic?.map(template => (
                  <TouchableOpacity
                    key={template.id}
                    style={styles.templateItem}
                    onPress={() => addSection(template)}
                  >
                    <LinearGradient
                      colors={['rgba(0, 255, 255, 0.1)', 'transparent']}
                      style={styles.templateItemGradient}
                    >
                      <View style={styles.templateItemContent}>
                        <View style={styles.templateItemLeft}>
                          <View style={styles.templateIcon}>
                            <Ionicons name={template.icon as any} size={20} color="#00FFFF" />
                          </View>
                          <View style={styles.templateInfo}>
                            <Text style={styles.templateName}>{template.name}</Text>
                            <Text style={styles.templateDescription}>{template.description}</Text>
                          </View>
                        </View>
                        <Ionicons name="add-circle" size={24} color="#00FFFF" />
                      </View>
                    </LinearGradient>
                  </TouchableOpacity>
                ))}
              </View>
              
              {/* Content Sections */}
              <View style={styles.categorySection}>
                <Text style={styles.categoryTitle}>🎮 Content Sections</Text>
                {sectionsByCategory.content?.map(template => (
                  <TouchableOpacity
                    key={template.id}
                    style={styles.templateItem}
                    onPress={() => addSection(template)}
                  >
                    <LinearGradient
                      colors={['rgba(50, 205, 50, 0.1)', 'transparent']}
                      style={styles.templateItemGradient}
                    >
                      <View style={styles.templateItemContent}>
                        <View style={styles.templateItemLeft}>
                          <View style={[styles.templateIcon, { backgroundColor: 'rgba(50, 205, 50, 0.2)' }]}>
                            <Ionicons name={template.icon as any} size={20} color="#32CD32" />
                          </View>
                          <View style={styles.templateInfo}>
                            <Text style={styles.templateName}>{template.name}</Text>
                            <Text style={styles.templateDescription}>{template.description}</Text>
                          </View>
                        </View>
                        <Ionicons name="add-circle" size={24} color="#32CD32" />
                      </View>
                    </LinearGradient>
                  </TouchableOpacity>
                ))}
              </View>
              
              {/* VIP Sections */}
              {userVIPStatus && (
                <View style={styles.categorySection}>
                  <Text style={styles.categoryTitle}>👑 VIP Premium Sections</Text>
                  {sectionsByCategory.vip?.map(template => (
                    <TouchableOpacity
                      key={template.id}
                      style={[styles.templateItem, styles.vipTemplateItem]}
                      onPress={() => addSection(template)}
                    >
                      <LinearGradient
                        colors={['rgba(255, 215, 0, 0.2)', 'rgba(255, 215, 0, 0.1)']}
                        style={styles.templateItemGradient}
                      >
                        <View style={styles.templateItemContent}>
                          <View style={styles.templateItemLeft}>
                            <View style={[styles.templateIcon, { backgroundColor: 'rgba(255, 215, 0, 0.2)' }]}>
                              <Ionicons name={template.icon as any} size={20} color="#FFD700" />
                            </View>
                            <View style={styles.templateInfo}>
                              <View style={styles.vipTemplateHeader}>
                                <Text style={styles.vipTemplateName}>{template.name}</Text>
                                <Ionicons name="crown" size={14} color="#FFD700" />
                              </View>
                              <Text style={styles.templateDescription}>{template.description}</Text>
                            </View>
                          </View>
                          <Ionicons name="add-circle" size={24} color="#FFD700" />
                        </View>
                      </LinearGradient>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
              
              {/* VIP Upgrade Prompt for Non-VIP Users */}
              {!userVIPStatus && (
                <TouchableOpacity
                  style={styles.vipUpgradeSection}
                  onPress={() => {
                    onVIPUpgradePrompt();
                    setShowSectionPicker(false);
                  }}
                >
                  <LinearGradient
                    colors={['rgba(255, 215, 0, 0.15)', 'rgba(255, 215, 0, 0.05)']}
                    style={styles.vipUpgradeGradient}
                  >
                    <View style={styles.vipUpgradeContent}>
                      <Ionicons name="crown" size={32} color="#FFD700" />
                      <View style={styles.vipUpgradeText}>
                        <Text style={styles.vipUpgradeTitle}>Unlock VIP Sections</Text>
                        <Text style={styles.vipUpgradeDescription}>
                          Get access to premium section types, advanced styling, and unlimited sections
                        </Text>
                      </View>
                      <Ionicons name="arrow-forward" size={24} color="#FFD700" />
                    </View>
                  </LinearGradient>
                </TouchableOpacity>
              )}
            </ScrollView>
          </LinearGradient>
        </Animated.View>
      </View>
    </Modal>
  ), [
    showSectionPicker,
    pickerAnimation,
    sectionsByCategory,
    userVIPStatus,
    addSection,
    onVIPUpgradePrompt,
  ]);
  
  // Render reorder mode
  const renderReorderMode = useCallback(() => {
    if (!showReorderMode) return null;
    
    return (
      <Animated.View
        style={[
          styles.reorderContainer,
          {
            opacity: reorderAnimation,
            transform: [
              {
                translateY: reorderAnimation.interpolate({
                  inputRange: [0, 1],
                  outputRange: [50, 0],
                }),
              },
            ],
          },
        ]}
      >
        <LinearGradient
          colors={['rgba(255, 215, 0, 0.1)', 'rgba(255, 215, 0, 0.05)']}
          style={styles.reorderContent}
        >
          <View style={styles.reorderHeader}>
            <Text style={styles.reorderTitle}>Reorder Sections</Text>
            <View style={styles.reorderActions}>
              <TouchableOpacity
                style={styles.reorderAction}
                onPress={cancelReorderMode}
              >
                <Text style={styles.reorderCancel}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.reorderAction}
                onPress={confirmReorder}
              >
                <Text style={styles.reorderConfirm}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
          
          <ScrollView style={styles.reorderList}>
            {reorderSections.map((section, index) => (
              <View key={section.id} style={styles.reorderItem}>
                <LinearGradient
                  colors={['rgba(0, 255, 255, 0.1)', 'transparent']}
                  style={styles.reorderItemGradient}
                >
                  <View style={styles.reorderItemContent}>
                    <View style={styles.reorderItemLeft}>
                      <Ionicons name="reorder-three" size={20} color="#888" />
                      <Text style={styles.reorderItemLabel}>{section.label}</Text>
                    </View>
                    
                    <View style={styles.reorderItemActions}>
                      <TouchableOpacity
                        style={[
                          styles.reorderButton,
                          index === 0 && styles.disabledReorderButton,
                        ]}
                        onPress={() => moveSectionUp(section.id)}
                        disabled={index === 0}
                      >
                        <Ionicons 
                          name="chevron-up" 
                          size={16} 
                          color={index === 0 ? '#444' : '#00FFFF'} 
                        />
                      </TouchableOpacity>
                      
                      <TouchableOpacity
                        style={[
                          styles.reorderButton,
                          index === reorderSections.length - 1 && styles.disabledReorderButton,
                        ]}
                        onPress={() => moveSectionDown(section.id)}
                        disabled={index === reorderSections.length - 1}
                      >
                        <Ionicons 
                          name="chevron-down" 
                          size={16} 
                          color={index === reorderSections.length - 1 ? '#444' : '#00FFFF'} 
                        />
                      </TouchableOpacity>
                    </View>
                  </View>
                </LinearGradient>
              </View>
            ))}
          </ScrollView>
        </LinearGradient>
      </Animated.View>
    );
  }, [
    showReorderMode,
    reorderAnimation,
    reorderSections,
    cancelReorderMode,
    confirmReorder,
    moveSectionUp,
    moveSectionDown,
  ]);
  
  // Calculate section counts
  const sectionCountInfo = useMemo(() => {
    const current = sections.length;
    const max = userVIPStatus ? '∞' : maxSections;
    const canAddMore = userVIPStatus || current < maxSections;
    
    return { current, max, canAddMore };
  }, [sections.length, userVIPStatus, maxSections]);
  
  return (
    <View style={styles.container}>
      {/* Main Action Bar */}
      <View style={styles.actionBar}>
        <View style={styles.actionBarLeft}>
          <TouchableOpacity
            style={[
              styles.actionButton,
              !sectionCountInfo.canAddMore && styles.disabledActionButton,
            ]}
            onPress={() => setShowSectionPicker(true)}
            disabled={disabled || !sectionCountInfo.canAddMore}
          >
            <LinearGradient
              colors={
                !sectionCountInfo.canAddMore
                  ? ['rgba(255, 215, 0, 0.2)', 'rgba(255, 215, 0, 0.1)']
                  : ['rgba(0, 255, 255, 0.2)', 'rgba(0, 255, 255, 0.1)']
              }
              style={styles.actionButtonGradient}
            >
              <Ionicons
                name="add"
                size={20}
                color={!sectionCountInfo.canAddMore ? '#FFD700' : '#00FFFF'}
              />
              <Text style={[
                styles.actionButtonText,
                !sectionCountInfo.canAddMore && styles.vipActionButtonText,
              ]}>
                {!sectionCountInfo.canAddMore ? 'Upgrade for More' : 'Add Section'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
          
          {sections.length > 1 && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={startReorderMode}
              disabled={disabled}
            >
              <LinearGradient
                colors={['rgba(255, 105, 180, 0.2)', 'rgba(255, 105, 180, 0.1)']}
                style={styles.actionButtonGradient}
              >
                <Ionicons name="swap-vertical" size={20} color="#FF69B4" />
                <Text style={[styles.actionButtonText, { color: '#FF69B4' }]}>
                  Reorder
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          )}
        </View>
        
        <View style={styles.sectionCounter}>
          <Text style={styles.sectionCountText}>
            {sectionCountInfo.current}/{sectionCountInfo.max}
          </Text>
          <Text style={styles.sectionCountLabel}>sections</Text>
        </View>
      </View>
      
      {/* Section Actions for Active Section */}
      {activeSectionId && (
        <View style={styles.sectionActions}>
          <TouchableOpacity
            style={styles.sectionActionButton}
            onPress={() => duplicateSection(activeSectionId)}
            disabled={disabled || !sectionCountInfo.canAddMore}
          >
            <Ionicons 
              name="copy" 
              size={16} 
              color={!sectionCountInfo.canAddMore ? '#888' : '#32CD32'} 
            />
            <Text style={[
              styles.sectionActionText,
              !sectionCountInfo.canAddMore && styles.disabledSectionActionText,
            ]}>
              Duplicate
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.sectionActionButton}
            onPress={() => removeSection(activeSectionId)}
            disabled={disabled}
          >
            <Ionicons name="trash" size={16} color="#FF6347" />
            <Text style={[styles.sectionActionText, { color: '#FF6347' }]}>
              Delete
            </Text>
          </TouchableOpacity>
        </View>
      )}
      
      {/* Reorder Mode Overlay */}
      {renderReorderMode()}
      
      {/* Section Picker Modal */}
      {renderSectionPicker()}
    </View>
  );
};

export default TemplateSectionManager;

/* ----------------- ADVANCED SECTION MANAGEMENT STYLES ----------------- */
const styles = StyleSheet.create({
  container: {
    marginVertical: 16,
  },
  actionBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  actionBarLeft: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 255, 0.3)',
  },
  disabledActionButton: {
    borderColor: 'rgba(255, 215, 0, 0.3)',
  },
  actionButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
  },
  actionButtonText: {
    color: '#00FFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  vipActionButtonText: {
    color: '#FFD700',
  },
  sectionCounter: {
    alignItems: 'flex-end',
  },
  sectionCountText: {
    color: '#FFD700',
    fontSize: 16,
    fontWeight: 'bold',
  },
  sectionCountLabel: {
    color: '#888',
    fontSize: 12,
  },
  sectionActions: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
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
  disabledSectionActionText: {
    color: '#888',
  },
  
  // Section Picker Modal Styles
  pickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    justifyContent: 'flex-end',
  },
  pickerModal: {
    height: SCREEN_HEIGHT * 0.8,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
  },
  pickerContent: {
    flex: 1,
    paddingTop: 20,
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 255, 255, 0.2)',
  },
  pickerTitle: {
    color: '#FFD700',
    fontSize: 20,
    fontWeight: 'bold',
  },
  pickerClose: {
    padding: 8,
  },
  pickerList: {
    flex: 1,
    padding: 20,
  },
  categorySection: {
    marginBottom: 24,
  },
  categoryTitle: {
    color: '#00FFFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  templateItem: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 255, 0.2)',
  },
  vipTemplateItem: {
    borderColor: 'rgba(255, 215, 0, 0.3)',
  },
  templateItemGradient: {
    padding: 16,
  },
  templateItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  templateItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  templateIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: 'rgba(0, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  templateInfo: {
    flex: 1,
  },
  templateName: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  vipTemplateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  vipTemplateName: {
    color: '#FFD700',
    fontSize: 16,
    fontWeight: '600',
  },
  templateDescription: {
    color: '#CCCCCC',
    fontSize: 13,
    lineHeight: 16,
  },
  vipUpgradeSection: {
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(255, 215, 0, 0.4)',
    marginTop: 16,
  },
  vipUpgradeGradient: {
    padding: 20,
  },
  vipUpgradeContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  vipUpgradeText: {
    flex: 1,
  },
  vipUpgradeTitle: {
    color: '#FFD700',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  vipUpgradeDescription: {
    color: '#CCCCCC',
    fontSize: 14,
    lineHeight: 18,
  },
  
  // Reorder Mode Styles
  reorderContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    zIndex: 1000,
  },
  reorderContent: {
    flex: 1,
    margin: 20,
    borderRadius: 16,
    overflow: 'hidden',
  },
  reorderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 215, 0, 0.2)',
  },
  reorderTitle: {
    color: '#FFD700',
    fontSize: 18,
    fontWeight: 'bold',
  },
  reorderActions: {
    flexDirection: 'row',
    gap: 16,
  },
  reorderAction: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  reorderCancel: {
    color: '#FF6347',
    fontSize: 16,
    fontWeight: '600',
  },
  reorderConfirm: {
    color: '#32CD32',
    fontSize: 16,
    fontWeight: '600',
  },
  reorderList: {
    flex: 1,
    padding: 20,
  },
  reorderItem: {
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 255, 0.2)',
  },
  reorderItemGradient: {
    padding: 16,
  },
  reorderItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  reorderItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  reorderItemLabel: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 12,
  },
  reorderItemActions: {
    flexDirection: 'row',
    gap: 8,
  },
  reorderButton: {
    width: 32,
    height: 32,
    borderRadius: 6,
    backgroundColor: 'rgba(0, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabledReorderButton: {
    backgroundColor: 'rgba(68, 68, 68, 0.1)',
  },
});