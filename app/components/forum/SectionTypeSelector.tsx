import React, { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
  Animated,
  Vibration,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { secureLog } from '../../utils/security';

// Types
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
    type: 'text' | 'quote' | 'image' | 'table' | 'video' | 'poll';
  };
  order: number;
  isCollapsed: boolean;
  isEditing: boolean;
  // Type-specific data
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
}

interface SectionType {
  id: string;
  name: string;
  icon: string;
  description: string;
  color: string;
  isVIP: boolean;
  category: 'basic' | 'media' | 'interactive' | 'premium';
  estimatedTime: number; // minutes to complete
}

interface SectionTypeSelectorProps {
  visible: boolean;
  onSelect: (section: TemplateSection) => void;
  onClose: () => void;
  userVIPStatus: boolean;
  existingSectionCount: number;
  maxSectionsForUser: number;
  onShowVIPUpgrade?: () => void;
}

// Constants
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Default Styles
const DEFAULT_TEXT_STYLE: TextStyle = {
  fontSize: 16,
  fontWeight: 'normal',
  fontStyle: 'normal',
  textDecorationLine: 'none',
  textAlign: 'left',
  color: '#FFFFFF',
  fontFamily: 'System',
};

const DEFAULT_QUOTE_STYLE: TextStyle = {
  fontSize: 18,
  fontWeight: 'normal',
  fontStyle: 'italic',
  textDecorationLine: 'none',
  textAlign: 'center',
  color: '#FFD700',
  fontFamily: 'System',
};

const DEFAULT_HEADER_STYLE: TextStyle = {
  fontSize: 22,
  fontWeight: 'bold',
  fontStyle: 'normal',
  textDecorationLine: 'none',
  textAlign: 'center',
  color: '#00FFFF',
  fontFamily: 'System',
};

// Section Type Definitions
export const SECTION_TYPES: SectionType[] = [
  // Basic Sections (Free)
  {
    id: 'text',
    name: 'Text Section',
    icon: 'document-text',
    description: 'Rich text with styling options',
    color: '#00FFFF',
    isVIP: false,
    category: 'basic',
    estimatedTime: 3,
  },
  {
    id: 'quote',
    name: 'Quote Block',
    icon: 'chatbox-ellipses',
    description: 'Highlight quotes with attribution',
    color: '#FFD700',
    isVIP: false,
    category: 'basic',
    estimatedTime: 2,
  },
  
  // Media Sections (Mixed)
  {
    id: 'image',
    name: 'Image Gallery',
    icon: 'images',
    description: 'Photo galleries and showcases',
    color: '#32CD32',
    isVIP: false,
    category: 'media',
    estimatedTime: 4,
  },
  {
    id: 'video',
    name: 'Video Embed',
    icon: 'play-circle',
    description: 'YouTube, Twitch, and video uploads',
    color: '#FF6347',
    isVIP: true,
    category: 'media',
    estimatedTime: 3,
  },
  
  // Interactive Sections (Mixed)
  {
    id: 'poll',
    name: 'Interactive Poll',
    icon: 'bar-chart',
    description: 'Polls and community voting',
    color: '#FF69B4',
    isVIP: false,
    category: 'interactive',
    estimatedTime: 5,
  },
  
  // Premium Sections (VIP Only)
  {
    id: 'table',
    name: 'Data Table',
    icon: 'grid',
    description: 'Statistics and comparisons',
    color: '#9370DB',
    isVIP: true,
    category: 'premium',
    estimatedTime: 8,
  },
];

// Section Factory Functions
export const createSectionByType = (type: string, order: number = 0): TemplateSection => {
  const baseSection = {
    id: `section_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    content: '',
    isCollapsed: false,
    isEditing: true,
    order,
  };

  switch (type) {
    case 'text':
      return {
        ...baseSection,
        label: 'Text Section',
        style: DEFAULT_TEXT_STYLE,
        config: {
          placeholder: 'Enter your content here...',
          minHeight: 120,
          allowEmpty: false,
          type: 'text',
        },
      };
    
    case 'quote':
      return {
        ...baseSection,
        label: 'Quote Block',
        style: DEFAULT_QUOTE_STYLE,
        config: {
          placeholder: 'Enter your quote here...',
          minHeight: 80,
          allowEmpty: false,
          type: 'quote',
        },
        quoteData: {
          text: '',
          attribution: '',
          source: '',
        },
      };
    
    case 'image':
      return {
        ...baseSection,
        label: 'Image Gallery',
        style: DEFAULT_TEXT_STYLE,
        config: {
          placeholder: 'Add images to your gallery...',
          minHeight: 100,
          allowEmpty: true,
          type: 'image',
        },
        images: [],
      };
    
    case 'table':
      return {
        ...baseSection,
        label: 'Data Table',
        style: DEFAULT_TEXT_STYLE,
        config: {
          placeholder: 'Configure your table...',
          minHeight: 120,
          allowEmpty: false,
          type: 'table',
        },
        tableData: {
          template: '3x3',
          headers: ['Player', 'Rating', 'Price'],
          rows: [['', '', ''], ['', '', ''], ['', '', '']],
        },
      };
    
    case 'video':
      return {
        ...baseSection,
        label: 'Video Embed',
        style: DEFAULT_TEXT_STYLE,
        config: {
          placeholder: 'Add video URL or upload...',
          minHeight: 100,
          allowEmpty: true,
          type: 'video',
        },
        videoData: {
          url: '',
          platform: 'youtube',
          title: '',
        },
      };
    
    case 'poll':
      return {
        ...baseSection,
        label: 'Interactive Poll',
        style: DEFAULT_TEXT_STYLE,
        config: {
          placeholder: 'Create your poll question...',
          minHeight: 100,
          allowEmpty: false,
          type: 'poll',
        },
        pollData: {
          question: '',
          options: ['', ''],
          settings: {},
        },
      };
    
    default:
      return createSectionByType('text', order);
  }
};

// Helper Functions
const getCategoryIcon = (category: string): string => {
  switch (category) {
    case 'basic': return 'document';
    case 'media': return 'camera';
    case 'interactive': return 'people';
    case 'premium': return 'star';
    default: return 'add';
  }
};

const getCategoryColor = (category: string): string => {
  switch (category) {
    case 'basic': return '#00FFFF';
    case 'media': return '#32CD32';
    case 'interactive': return '#FF69B4';
    case 'premium': return '#FFD700';
    default: return '#888';
  }
};

const SectionTypeSelector: React.FC<SectionTypeSelectorProps> = ({
  visible,
  onSelect,
  onClose,
  userVIPStatus,
  existingSectionCount,
  maxSectionsForUser,
  onShowVIPUpgrade,
}) => {
  const { t } = useTranslation();
  
  // Animation refs
  const slideAnimation = useRef(new Animated.Value(0)).current;
  const itemAnimations = useRef<{ [key: string]: Animated.Value }>({}).current;
  
  // State
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showVIPPrompt, setShowVIPPrompt] = useState(false);
  const [selectedVIPSection, setSelectedVIPSection] = useState<SectionType | null>(null);
  
  // Initialize item animations
  useEffect(() => {
    SECTION_TYPES.forEach(sectionType => {
      if (!itemAnimations[sectionType.id]) {
        itemAnimations[sectionType.id] = new Animated.Value(0);
      }
    });
  }, [itemAnimations]);
  
  // Modal animations
  useEffect(() => {
    if (visible) {
      // Slide in animation
      Animated.spring(slideAnimation, {
        toValue: 1,
        useNativeDriver: true,
        tension: 100,
        friction: 8,
      }).start();
      
      // Stagger item animations
      const animations = SECTION_TYPES.map((sectionType, index) =>
        Animated.timing(itemAnimations[sectionType.id], {
          toValue: 1,
          duration: 300,
          delay: index * 50,
          useNativeDriver: true,
        })
      );
      
      Animated.stagger(50, animations).start();
    } else {
      slideAnimation.setValue(0);
      Object.values(itemAnimations).forEach(anim => anim.setValue(0));
    }
  }, [visible, slideAnimation, itemAnimations]);
  
  // Filter sections by category
  const filteredSections = useMemo(() => {
    if (selectedCategory === 'all') {
      return SECTION_TYPES;
    }
    return SECTION_TYPES.filter(section => section.category === selectedCategory);
  }, [selectedCategory]);
  
  // Check if user can add more sections
  const canAddMoreSections = useMemo(() => {
    return existingSectionCount < maxSectionsForUser;
  }, [existingSectionCount, maxSectionsForUser]);
  
  // Categories for filtering
  const categories = useMemo(() => [
    { id: 'all', name: 'All', icon: 'grid', color: '#888' },
    { id: 'basic', name: 'Basic', icon: 'document', color: '#00FFFF' },
    { id: 'media', name: 'Media', icon: 'camera', color: '#32CD32' },
    { id: 'interactive', name: 'Interactive', icon: 'people', color: '#FF69B4' },
    { id: 'premium', name: 'Premium', icon: 'star', color: '#FFD700' },
  ], []);
  
  // Handle section selection
  const handleSectionSelect = useCallback((sectionType: SectionType) => {
    // Check section limits
    if (!canAddMoreSections) {
      if (onShowVIPUpgrade) {
        onShowVIPUpgrade();
      }
      return;
    }
    
    // Check VIP requirement
    if (sectionType.isVIP && !userVIPStatus) {
      setSelectedVIPSection(sectionType);
      setShowVIPPrompt(true);
      Vibration.vibrate(100);
      return;
    }
    
    // Create and select section
    const newSection = createSectionByType(sectionType.id, existingSectionCount);
    
    secureLog('Section type selected', {
      sectionType: sectionType.id,
      sectionName: sectionType.name,
      isVIP: sectionType.isVIP,
      userVIP: userVIPStatus,
      existingCount: existingSectionCount,
    });
    
    onSelect(newSection);
    Vibration.vibrate(30);
  }, [canAddMoreSections, userVIPStatus, existingSectionCount, onSelect, onShowVIPUpgrade]);
  
  // Handle VIP upgrade from prompt
  const handleVIPUpgrade = useCallback(() => {
    setShowVIPPrompt(false);
    if (onShowVIPUpgrade) {
      onShowVIPUpgrade();
    }
  }, [onShowVIPUpgrade]);
  
  // Handle close
  const handleClose = useCallback(() => {
    Animated.timing(slideAnimation, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      onClose();
      setShowVIPPrompt(false);
      setSelectedVIPSection(null);
    });
  }, [slideAnimation, onClose]);
  
  // Render section type item
  const renderSectionTypeItem = useCallback((sectionType: SectionType) => {
    const animation = itemAnimations[sectionType.id] || new Animated.Value(0);
    const isLocked = sectionType.isVIP && !userVIPStatus;
    
    return (
      <Animated.View
        key={sectionType.id}
        style={[
          styles.sectionTypeContainer,
          {
            transform: [
              {
                translateY: animation.interpolate({
                  inputRange: [0, 1],
                  outputRange: [20, 0],
                }),
              },
              { scale: animation },
            ],
            opacity: animation,
          },
        ]}
      >
        <TouchableOpacity
          style={[
            styles.sectionTypeItem,
            isLocked && styles.sectionTypeItemLocked,
          ]}
          onPress={() => handleSectionSelect(sectionType)}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel={`Add ${sectionType.name}`}
          accessibilityState={{ disabled: isLocked }}
        >
          <LinearGradient
            colors={
              isLocked
                ? ['rgba(255, 215, 0, 0.1)', 'rgba(255, 215, 0, 0.05)']
                : [`${sectionType.color}15`, 'transparent']
            }
            style={styles.sectionTypeGradient}
          >
            <View style={styles.sectionTypeHeader}>
              <View style={styles.sectionTypeIconContainer}>
                <View style={[styles.sectionTypeIconBackground, { backgroundColor: sectionType.color }]}>
                  <Ionicons
                    name={sectionType.icon as any}
                    size={24}
                    color="#000"
                  />
                </View>
                {isLocked && (
                  <View style={styles.vipLockOverlay}>
                    <Ionicons name="crown" size={16} color="#FFD700" />
                  </View>
                )}
              </View>
              
              <View style={styles.sectionTypeInfo}>
                <Text style={[
                  styles.sectionTypeName,
                  isLocked && styles.sectionTypeNameLocked,
                ]}>
                  {sectionType.name}
                </Text>
                <Text style={styles.sectionTypeDescription}>
                  {sectionType.description}
                </Text>
              </View>
              
              <View style={styles.sectionTypeMetadata}>
                <Text style={styles.sectionTypeTime}>
                  {sectionType.estimatedTime}min
                </Text>
                <Ionicons
                  name="chevron-forward"
                  size={16}
                  color={isLocked ? "#FFD700" : "#888"}
                />
              </View>
            </View>
            
            {isLocked && (
              <View style={styles.vipPromptContainer}>
                <Text style={styles.vipPromptText}>
                  VIP Feature - Upgrade to unlock
                </Text>
              </View>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>
    );
  }, [itemAnimations, userVIPStatus, handleSectionSelect]);
  
  // Render category filter
  const renderCategoryFilter = useCallback(() => (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.categoryFilter}
      contentContainerStyle={styles.categoryFilterContent}
    >
      {categories.map(category => (
        <TouchableOpacity
          key={category.id}
          style={[
            styles.categoryButton,
            selectedCategory === category.id && styles.categoryButtonActive,
          ]}
          onPress={() => setSelectedCategory(category.id)}
        >
          <LinearGradient
            colors={
              selectedCategory === category.id
                ? ['rgba(0, 255, 255, 0.3)', 'rgba(0, 255, 255, 0.1)']
                : ['rgba(255, 255, 255, 0.05)', 'transparent']
            }
            style={styles.categoryButtonGradient}
          >
            <Ionicons
              name={category.icon as any}
              size={16}
              color={selectedCategory === category.id ? '#00FFFF' : category.color}
            />
            <Text style={[
              styles.categoryButtonText,
              selectedCategory === category.id && styles.categoryButtonTextActive,
            ]}>
              {category.name}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      ))}
    </ScrollView>
  ), [categories, selectedCategory]);
  
  if (!visible) return null;
  
  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
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
                <Text style={styles.headerTitle}>Add Section</Text>
                <Text style={styles.headerSubtitle}>
                  {existingSectionCount}/{maxSectionsForUser} sections
                  {!canAddMoreSections && (
                    <Text style={styles.limitWarning}> • Limit reached</Text>
                  )}
                </Text>
              </View>
              <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
                <Ionicons name="close" size={24} color="#888" />
              </TouchableOpacity>
            </View>
            
            {/* Section Limit Warning */}
            {!canAddMoreSections && (
              <View style={styles.limitWarningContainer}>
                <LinearGradient
                  colors={['rgba(255, 215, 0, 0.2)', 'rgba(255, 215, 0, 0.1)']}
                  style={styles.limitWarningGradient}
                >
                  <Ionicons name="warning" size={20} color="#FFD700" />
                  <Text style={styles.limitWarningText}>
                    {userVIPStatus 
                      ? 'You\'ve reached the maximum number of sections for this post.'
                      : 'Free users are limited to 3 sections. Upgrade to VIP for unlimited sections!'
                    }
                  </Text>
                </LinearGradient>
              </View>
            )}
            
            {/* Category Filter */}
            {renderCategoryFilter()}
            
            {/* Section Types List */}
            <ScrollView
              style={styles.sectionTypesList}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.sectionTypesContent}
            >
              {filteredSections.map(renderSectionTypeItem)}
            </ScrollView>
          </LinearGradient>
        </Animated.View>
        
        {/* VIP Upgrade Prompt */}
        {showVIPPrompt && selectedVIPSection && (
          <View style={styles.vipPromptOverlay}>
            <View style={styles.vipPromptModal}>
              <LinearGradient
                colors={['rgba(255, 215, 0, 0.1)', 'rgba(255, 215, 0, 0.05)']}
                style={styles.vipPromptContent}
              >
                <View style={styles.vipPromptHeader}>
                  <Ionicons name="crown" size={32} color="#FFD700" />
                  <Text style={styles.vipPromptTitle}>VIP Feature</Text>
                </View>
                
                <Text style={styles.vipPromptMessage}>
                  {selectedVIPSection.name} is available for VIP members only.
                </Text>
                
                <View style={styles.vipFeaturesList}>
                  <Text style={styles.vipFeaturesTitle}>✨ Upgrade to VIP and unlock:</Text>
                  <Text style={styles.vipFeatureItem}>• Unlimited sections</Text>
                  <Text style={styles.vipFeatureItem}>• Advanced section types</Text>
                  <Text style={styles.vipFeatureItem}>• Premium styling options</Text>
                  <Text style={styles.vipFeatureItem}>• Priority support</Text>
                </View>
                
                <View style={styles.vipPromptActions}>
                  <TouchableOpacity
                    style={styles.vipPromptCancel}
                    onPress={() => setShowVIPPrompt(false)}
                  >
                    <Text style={styles.vipPromptCancelText}>Maybe Later</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={styles.vipPromptUpgrade}
                    onPress={handleVIPUpgrade}
                  >
                    <LinearGradient
                      colors={['#FFD700', '#FFA500']}
                      style={styles.vipPromptUpgradeGradient}
                    >
                      <Text style={styles.vipPromptUpgradeText}>Upgrade to VIP</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              </LinearGradient>
            </View>
          </View>
        )}
      </View>
    </Modal>
  );
};

export default SectionTypeSelector;

/* ----------------- REVOLUTIONARY GAMING STYLES ----------------- */
const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
  },
  modalContainer: {
    flex: 1,
    marginTop: 50,
  },
  modalContent: {
    flex: 1,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 20,
  },
  
  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 255, 255, 0.2)',
  },
  headerLeft: {
    flex: 1,
  },
  headerTitle: {
    color: '#FFD700',
    fontSize: 22,
    fontWeight: 'bold',
  },
  headerSubtitle: {
    color: '#00FFFF',
    fontSize: 14,
    marginTop: 2,
  },
  limitWarning: {
    color: '#FF6347',
    fontWeight: 'bold',
  },
  closeButton: {
    padding: 8,
  },
  
  // Limit Warning
  limitWarningContainer: {
    marginHorizontal: 20,
    marginTop: 16,
    borderRadius: 12,
    overflow: 'hidden',
  },
  limitWarningGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 8,
  },
  limitWarningText: {
    color: '#FFD700',
    fontSize: 13,
    flex: 1,
    fontWeight: '500',
  },
  
  // Category Filter
  categoryFilter: {
    marginTop: 16,
    height: 50,
  },
  categoryFilterContent: {
    paddingHorizontal: 20,
    gap: 8,
  },
  categoryButton: {
    borderRadius: 8,
    overflow: 'hidden',
  },
  categoryButtonActive: {
    // Additional styling handled by gradient
  },
  categoryButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
  },
  categoryButtonText: {
    color: '#888',
    fontSize: 12,
    fontWeight: '600',
  },
  categoryButtonTextActive: {
    color: '#00FFFF',
  },
  
  // Section Types List
  sectionTypesList: {
    flex: 1,
    marginTop: 16,
  },
  sectionTypesContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  sectionTypeContainer: {
    marginBottom: 12,
  },
  sectionTypeItem: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 255, 0.2)',
  },
  sectionTypeItemLocked: {
    borderColor: 'rgba(255, 215, 0, 0.3)',
  },
  sectionTypeGradient: {
    padding: 16,
  },
  sectionTypeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionTypeIconContainer: {
    position: 'relative',
    marginRight: 16,
  },
  sectionTypeIconBackground: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  vipLockOverlay: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    borderRadius: 12,
    padding: 2,
  },
  sectionTypeInfo: {
    flex: 1,
  },
  sectionTypeName: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  sectionTypeNameLocked: {
    color: '#FFD700',
  },
  sectionTypeDescription: {
    color: '#CCCCCC',
    fontSize: 13,
    lineHeight: 18,
  },
  sectionTypeMetadata: {
    alignItems: 'center',
    gap: 4,
  },
  sectionTypeTime: {
    color: '#888',
    fontSize: 11,
    fontWeight: '500',
  },
  vipPromptContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 215, 0, 0.2)',
  },
  vipPromptText: {
    color: '#FFD700',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  
  // VIP Upgrade Prompt Modal
  vipPromptOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  vipPromptModal: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#FFD700',
  },
  vipPromptContent: {
    padding: 24,
    alignItems: 'center',
  },
  vipPromptHeader: {
    alignItems: 'center',
    marginBottom: 16,
  },
  vipPromptTitle: {
    color: '#FFD700',
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 8,
  },
  vipPromptMessage: {
    color: '#FFFFFF',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 22,
  },
  vipFeaturesList: {
    alignSelf: 'stretch',
    marginBottom: 24,
  },
  vipFeaturesTitle: {
    color: '#FFD700',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  vipFeatureItem: {
    color: '#CCCCCC',
    fontSize: 13,
    marginBottom: 4,
    lineHeight: 18,
  },
  vipPromptActions: {
    flexDirection: 'row',
    gap: 12,
    alignSelf: 'stretch',
  },
  vipPromptCancel: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#888',
    borderRadius: 8,
  },
  vipPromptCancelText: {
    color: '#888',
    fontSize: 14,
    fontWeight: '600',
  },
  vipPromptUpgrade: {
    flex: 2,
    borderRadius: 8,
    overflow: 'hidden',
  },
  vipPromptUpgradeGradient: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  vipPromptUpgradeText: {
    color: '#000',
    fontSize: 14,
    fontWeight: 'bold',
  },
});