import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
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
  FlatList,
  TextInput,
  ImageBackground,
  StatusBar,
  Image,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

// Firebase imports
import { db } from "../../app/firebaseConfig"; // Adjust path as needed
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import CreateMyTemplate from './CreateMyTemplate'; // Adjust path as needed

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
  style: TextStyle;
  config: {
    placeholder: string;
    minHeight: number;
    maxHeight?: number;
    allowEmpty: boolean;
    type: 'text' | 'quote' | 'image' | 'table' | 'video' | 'poll';
  };
  order: number;
  exampleContent?: string;
  exampleData?: any;
}

interface AdvancedPostTemplate {
  id: string;
  name: string;
  description: string;
  category: 'gaming' | 'esports' | 'review' | 'tutorial' | 'community' | 'creative' | 'my';
  difficulty: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  isVIP: boolean;
  isActive: boolean;
  sections: TemplateSection[];
  thumbnail?: string;
  metadata: {
    author: string;
    estimatedTime: number;
    features: string[];
    useCase: string;
    preview: string;
    icon: string;
    gradient: string[];
    complexity: number;
    popularity: number;
  };
  type: 'advanced';
  createdAt?: any;
  updatedAt?: any;
}

interface TemplateSelectorProps {
  visible: boolean;
  onSelectAdvanced: (template: AdvancedPostTemplate) => void;
  onClose: () => void;
  userVIPStatus: boolean;
  userId: string;
}

interface FlatListRenderItemProps {
  item: AdvancedPostTemplate;
  index: number;
}

// Constants
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Secure logging function
const secureLog = (message: string, metadata?: Record<string, any>) => {
  if (__DEV__) {
    console.log(`[TemplateSelector] ${message}`, metadata);
  }
};

// Input sanitization
const sanitizeSearchQuery = (query: string): string => {
  return query
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .trim()
    .substring(0, 100); // Limit length
};

// FALLBACK BASIC TEMPLATE - Hardcoded for non-VIP users
const FALLBACK_BASIC_TEMPLATE: AdvancedPostTemplate = {
  id: 'basic_post_template',
  name: 'Basic Post Template',
  description: 'Simple 3-section template for basic posts',
  category: 'community',
  difficulty: 'beginner',
  isVIP: false,
  isActive: true,
  thumbnail:'https://firebasestorage.googleapis.com/v0/b/fc25assistant.firebasestorage.app/o/Advanced%20posting%20template%20thumbnail%2FChatGPT%20Image%20Jun%2019%2C%202025%2C%2011_30_24%20PM.png?alt=media&token=fc79de4c-280d-4cd6-bfe0-0237424924c2',//placeholder png
  sections: [
    {
      id: 'post_title',
      label: 'Post Title',
      style: {
        fontSize: 20,
        fontWeight: 'bold',
        fontStyle: 'normal',
        textDecorationLine: 'none',
        textAlign: 'center',
        color: '#FFFFFF',
        fontFamily: 'System',
      },
      config: {
        placeholder: 'Enter your post title...',
        minHeight: 60,
        allowEmpty: false,
        type: 'text',
      },
      order: 0,
      exampleContent: 'My First FC Post',
    },
    {
      id: 'main_content',
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
        placeholder: 'Write your main content here...',
        minHeight: 120,
        allowEmpty: false,
        type: 'text',
      },
      order: 1,
      exampleContent: 'Share your thoughts, experiences, or questions with the community.',
    },
    {
      id: 'closing_note',
      label: 'Closing Note',
      style: {
        fontSize: 14,
        fontWeight: 'normal',
        fontStyle: 'italic',
        textDecorationLine: 'none',
        textAlign: 'center',
        color: '#CCCCCC',
        fontFamily: 'System',
      },
      config: {
        placeholder: 'Add a closing note or call to action...',
        minHeight: 40,
        allowEmpty: true,
        type: 'text',
      },
      order: 2,
      exampleContent: 'Thanks for reading! What do you think?',
    },
  ],
  metadata: {
    author: 'FC Team',
    estimatedTime: 5,
    features: ['Simple Layout', 'Quick Setup', 'Beginner Friendly'],
    useCase: 'Perfect for your first posts and simple updates',
    preview: 'Clean and simple template for basic posting',
    icon: 'document-text',
    gradient: ['#4A90E2', '#357ABD', '#1E5F99'],
    complexity: 1,
    popularity: 0,
  },
  type: 'advanced',
};

// Template Categories
const TEMPLATE_CATEGORIES = [
  { id: 'all', name: 'All Templates', icon: 'apps', color: '#FFFFFF' },
  { id: 'community', name: 'Basic Templates', icon: 'document-text', color: '#4A90E2' },
  { id: 'review', name: 'Card Review', icon: 'star', color: '#9370DB' },
  { id: 'tutorial', name: 'Video Tutorials', icon: 'videocam', color: '#32CD32' },
  { id: 'my', name: 'My Templates', icon: 'person', color: '#FF69B4' },
];

const TemplateSelector: React.FC<TemplateSelectorProps> = ({
  visible,
  onSelectAdvanced,
  onClose,
  userVIPStatus,
  userId,
}) => {
  // State management
  const [templates, setTemplates] = useState<AdvancedPostTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'popularity' | 'complexity' | 'time'>('popularity');
  const [showFilters, setShowFilters] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showImagePreview, setShowImagePreview] = useState(false);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string>(''); 
  
  // Animation refs
  const slideAnimation = useRef(new Animated.Value(0)).current;
  const filterAnimation = useRef(new Animated.Value(0)).current;
  const cardAnimations = useRef<Record<string, Animated.Value>>({}).current;
  const isMountedRef = useRef(true);
  
  // Animation cleanup function
  const cleanupAnimations = useCallback(() => {
    try {
      slideAnimation.removeAllListeners();
      filterAnimation.removeAllListeners();
      
      Object.values(cardAnimations).forEach(animation => {
        animation.removeAllListeners();
        animation.setValue(0);
      });
      
      slideAnimation.setValue(0);
      filterAnimation.setValue(0);
    } catch (error) {
      secureLog('Animation cleanup error', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        hasAnimations: Object.keys(cardAnimations).length > 0
      });
    }
  }, [slideAnimation, filterAnimation, cardAnimations]);
  
  // Fetch templates from Firestore
  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const fetchedTemplates: AdvancedPostTemplate[] = [];
      
      secureLog('Template fetch initiated', { 
        hasUserId: !!userId,
        isVIP: userVIPStatus 
      });
      
      // STEP 1: Fetch global templates from AdvancedPostTemplates
      try {
        const globalTemplatesRef = collection(db, 'AdvancedPostTemplates');
        const globalQuery = query(
          globalTemplatesRef,
          where('isActive', '==', true)
        );
        
        const globalSnapshot = await getDocs(globalQuery);
        
        globalSnapshot.forEach((doc) => {
          const templateData = doc.data();
          fetchedTemplates.push({
            id: doc.id,
            ...templateData,
          } as AdvancedPostTemplate);
        });
        
        secureLog('Global templates loaded', { count: globalSnapshot.size });
      } catch (globalError) {
        secureLog('Global templates fetch error', { 
          error: globalError instanceof Error ? globalError.message : 'Unknown error' 
        });
      }
      
      // STEP 2: Fetch user's custom templates (if authenticated)
      if (userId && userId !== 'anonymous' && userId.trim() !== '') {
        try {
          const userTemplatesRef = collection(db, 'MyAdvancedTemplates');
          const userQuery = query(
            userTemplatesRef,
            where('userId', '==', userId),
            where('isActive', '==', true)
          );
          
          const userSnapshot = await getDocs(userQuery);
          
          userSnapshot.forEach((doc) => {
            const templateData = doc.data();
            fetchedTemplates.push({
              id: doc.id,
              ...templateData,
              category: 'my', // Force category to 'my' for user templates
            } as AdvancedPostTemplate);
          });
          
          secureLog('User templates loaded', { count: userSnapshot.size });
        } catch (userError) {
          secureLog('User templates fetch error', { 
            error: userError instanceof Error ? userError.message : 'Unknown error' 
          });
        }
      }
      
      // Always include fallback template
      const finalTemplates = [FALLBACK_BASIC_TEMPLATE, ...fetchedTemplates];
      
      secureLog('Template fetch completed', { 
        totalCount: finalTemplates.length,
        hasBasicTemplate: true 
      });
      
      if (isMountedRef.current) {
        setTemplates(finalTemplates);
      }
      
    } catch (err) {
      secureLog('Critical template fetch error', { 
        error: err instanceof Error ? err.message : 'Unknown error' 
      });
      setError('Failed to load templates. Please try again.');
      if (isMountedRef.current) {
        setTemplates([FALLBACK_BASIC_TEMPLATE]);
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [userVIPStatus, userId]);
  
  // Initialize card animations for all templates
  useEffect(() => {
    templates.forEach((template) => {
      if (!cardAnimations[template.id]) {
        cardAnimations[template.id] = new Animated.Value(0);
      }
    });
  }, [templates, cardAnimations]);
  
  // Animate modal appearance
  useEffect(() => {
    if (visible) {
      Animated.spring(slideAnimation, {
        toValue: 1,
        useNativeDriver: true,
        tension: 100,
        friction: 8,
      }).start();
      
      // Stagger card animations
      const animationPromises = templates.map((template, index) => {
        if (cardAnimations[template.id]) {
          return Animated.timing(cardAnimations[template.id], {
            toValue: 1,
            duration: 400,
            delay: index * 50,
            useNativeDriver: true,
          });
        }
        return null;
      }).filter(Boolean);
      
      if (animationPromises.length > 0) {
        Animated.stagger(50, animationPromises).start();
      }
    } else {
      slideAnimation.setValue(0);
      Object.values(cardAnimations).forEach(anim => anim.setValue(0));
    }
  }, [visible, slideAnimation, cardAnimations, templates]);
  
  // Filter animation
  useEffect(() => {
    Animated.spring(filterAnimation, {
      toValue: showFilters ? 1 : 0,
      useNativeDriver: true,
      tension: 150,
      friction: 8,
    }).start();
  }, [showFilters, filterAnimation]);
  
  // Fetch templates when modal opens
  useEffect(() => {
    if (visible) {
      fetchTemplates();
    }
  }, [visible, fetchTemplates]);
  
  // Component cleanup
  useEffect(() => {
    isMountedRef.current = true;
    
    return () => {
      isMountedRef.current = false;
      cleanupAnimations();
    };
  }, [cleanupAnimations]);

  // Handle search input with sanitization
  const handleSearchChange = useCallback((text: string) => {
    const sanitized = sanitizeSearchQuery(text);
    setSearchQuery(sanitized);
  }, []);

  // Handle thumbnail preview
  const handleThumbnailPreview = useCallback((template: AdvancedPostTemplate) => {
    if (!template.thumbnail) return;
    
    Alert.alert(
      template.name,
      'View full image?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'View Full Image', 
          onPress: () => {
            setImagePreviewUrl(template.thumbnail!);
            setShowImagePreview(true);
          }
        }
      ]
    );
  }, []);
  
  // Filter and sort templates
  const filteredTemplates = useMemo(() => {
    let filtered = [...templates];
    
    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(template => template.category === selectedCategory);
    }
    
    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(template => {
        const nameMatch = template.name.toLowerCase().includes(query);
        const descMatch = template.description.toLowerCase().includes(query);
        const featuresMatch = template.metadata.features.some(feature => 
          feature.toLowerCase().includes(query)
        );
        const useCaseMatch = template.metadata.useCase.toLowerCase().includes(query);
        
        return nameMatch || descMatch || featuresMatch || useCaseMatch;
      });
    }
    
    // Filter by VIP access
    filtered = filtered.filter(template => !template.isVIP || userVIPStatus);
    
    // Sort templates
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'popularity':
          return b.metadata.popularity - a.metadata.popularity;
        case 'complexity':
          return a.metadata.complexity - b.metadata.complexity;
        case 'time':
          return a.metadata.estimatedTime - b.metadata.estimatedTime;
        default:
          return 0;
      }
    });
    
    return filtered;
  }, [templates, selectedCategory, searchQuery, sortBy, userVIPStatus]);
  
  // Update category counts
  const updatedCategories = useMemo(() => {
    return TEMPLATE_CATEGORIES.map(category => ({
      ...category,
      count: category.id === 'all' 
        ? templates.filter(t => !t.isVIP || userVIPStatus).length
        : templates.filter(t => t.category === category.id && (!t.isVIP || userVIPStatus)).length,
    }));
  }, [templates, userVIPStatus]);
  
  // Handle template selection
  const handleTemplateSelect = useCallback((template: AdvancedPostTemplate) => {
    if (template.isVIP && !userVIPStatus) {
      Alert.alert(
        'VIP Feature',
        'This template requires VIP access. Please upgrade to use advanced templates.',
        [{ text: 'OK' }]
      );
      return;
    }
    
    secureLog('Template selected', { 
      templateId: template.id,
      category: template.category,
      isVIP: template.isVIP 
    });
    
    onSelectAdvanced(template);
    onClose();
    Vibration.vibrate(30);
  }, [userVIPStatus, onSelectAdvanced, onClose]);
  
  // Get difficulty color
  const getDifficultyColor = useCallback((difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return '#32CD32';
      case 'intermediate': return '#FFD700';
      case 'advanced': return '#FF6347';
      case 'expert': return '#FF1493';
      default: return '#32CD32';
    }
  }, []);
  
  // Render template card with proper FlatList signature
  const renderTemplateCard = useCallback(({ item: template, index }: FlatListRenderItemProps) => {
    // Ensure animation exists for this template
    if (!cardAnimations[template.id]) {
      cardAnimations[template.id] = new Animated.Value(1);
    }
    
    const animation = cardAnimations[template.id];
    
    return (
      <Animated.View
        style={[
          styles.templateCard,
          {
            transform: [
              {
                translateY: animation.interpolate({
                  inputRange: [0, 1],
                  outputRange: [100, 0],
                }),
              },
              { scale: animation },
            ],
            opacity: animation,
          },
        ]}
      >
        <TouchableOpacity
          style={styles.cardTouchable}
          onPress={() => handleTemplateSelect(template)}
          activeOpacity={0.85}
        >
          <LinearGradient
            colors={template.metadata.gradient}
            style={styles.cardGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.thumbnailContainer}>
              {template.thumbnail ? (
                <TouchableOpacity
                  style={styles.thumbnailTouchable}
                  onPress={() => handleThumbnailPreview(template)}
                  activeOpacity={0.8}
                >
                  <ImageBackground
                    source={{ uri: template.thumbnail }}
                    style={styles.thumbnailImage}
                    resizeMode="cover"
                  >
                    <View style={styles.thumbnailPreviewOverlay}>
                      <Ionicons 
                        name="eye" 
                        size={16} 
                        color="rgba(255, 255, 255, 0.9)" 
                      />
                    </View>
                    <View style={styles.thumbnailIconContainer}>
                      <Ionicons 
                        name={template.metadata.icon as any} 
                        size={20} 
                        color="rgba(255, 255, 255, 0.9)" 
                      />
                    </View>
                  </ImageBackground>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={styles.thumbnailTouchable}
                  onPress={() => handleTemplateSelect(template)}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={['rgba(255, 255, 255, 0.15)', 'rgba(255, 255, 255, 0.05)']}
                    style={styles.thumbnailGradient}
                  >
                    <View style={styles.thumbnailContent}>
                      <View style={styles.mockHeader}>
                        <View style={styles.mockTitle} />
                        <View style={styles.mockBadge} />
                      </View>
                      <View style={styles.mockSections}>
                        {template.sections.slice(0, 3).map((_, idx) => (
                          <View 
                            key={idx} 
                            style={[
                              styles.mockSection,
                              { height: idx === 0 ? 8 : idx === 1 ? 12 : 6 }
                            ]} 
                          />
                        ))}
                      </View>
                      <View style={styles.mockFooter}>
                        <View style={styles.mockStats} />
                        <View style={styles.mockAction} />
                      </View>
                    </View>
                    <View style={styles.thumbnailOverlay}>
                      <Ionicons 
                        name={template.metadata.icon as any} 
                        size={20} 
                        color="rgba(255, 255, 255, 0.8)" 
                      />
                    </View>
                  </LinearGradient>
                </TouchableOpacity>
              )}
            </View>
            
            <View style={styles.cardContent}>
              <View style={styles.cardHeader}>
                <View style={styles.headerTop}>
<View style={styles.titleSection}>
  <View style={styles.titleContainer}>
    <Text style={styles.templateTitle}>{template.name}</Text>
    <Text style={styles.templateCategory}>
      {template.category.toUpperCase()} • {template.metadata.estimatedTime}min
    </Text>
  </View>
</View>
                  
                  <View style={styles.badges}>
                    {template.isVIP && (
                      <View style={styles.vipBadge}>
                        <Ionicons name="crown" size={12} color="#000000" />
                        <Text style={styles.vipText}>VIP</Text>
                      </View>
                    )}
                    <View style={[styles.difficultyBadge, { backgroundColor: getDifficultyColor(template.difficulty) }]}>
                      <Text style={styles.difficultyText}>
                        {template.difficulty.toUpperCase()}
                      </Text>
                    </View>
                  </View>
                </View>
                
                <Text style={styles.templateDescription}>{template.description}</Text>
              </View>
              
              <View style={styles.featuresSection}>
                <Text style={styles.featuresTitle}>Key Features:</Text>
                <View style={styles.featuresContainer}>
                  {template.metadata.features.slice(0, 4).map((feature, idx) => (
                    <View key={idx} style={styles.featureTag}>
                      <Text style={styles.featureText}>{feature}</Text>
                    </View>
                  ))}
                </View>
              </View>
              
              <View style={styles.sectionsPreview}>
                <Text style={styles.sectionsTitle}>
                  {template.sections.length} Sections:
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {template.sections.map((section, idx) => (
                    <View key={section.id} style={styles.sectionChip}>
                      <Text style={styles.sectionLabel}>{section.label}</Text>
                      <Text style={styles.sectionType}>{section.config.type}</Text>
                    </View>
                  ))}
                </ScrollView>
              </View>
              
              <View style={styles.cardFooter}>
                <View style={styles.statsContainer}>
                  <View style={styles.statItem}>
                    <Ionicons name="star" size={12} color="#FFD700" />
                    <Text style={styles.statText}>
                      {'★'.repeat(template.metadata.complexity)}
                    </Text>
                  </View>
                  <View style={styles.statItem}>
                    <Ionicons name="people" size={12} color="#CCCCCC" />
                    <Text style={styles.statText}>{template.metadata.popularity}</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Ionicons name="person" size={12} color="#CCCCCC" />
                    <Text style={styles.statText}>{template.metadata.author}</Text>
                  </View>
                </View>
                
                <View style={styles.useCase}>
                  <Text style={styles.useCaseText}>{template.metadata.useCase}</Text>
                </View>
              </View>
            </View>
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>
    );
  }, [cardAnimations, handleTemplateSelect, getDifficultyColor, handleThumbnailPreview]);
  
  // Retry handler
  const handleRetry = useCallback(() => {
    fetchTemplates();
  }, [fetchTemplates]);
  
  if (!visible) return null;
  
  // Component-level error boundary
  try {
    return (
      <Modal
        visible={visible}
        animationType="none"
        transparent
        onRequestClose={onClose}
        statusBarTranslucent
      >
        <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
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
              colors={['rgba(10, 15, 30, 0.98)', 'rgba(5, 10, 20, 0.96)']}
              style={styles.modalContent}
            >
              <View style={styles.header}>
                <View style={styles.headerLeft}>
                  <TouchableOpacity onPress={onClose} style={styles.backButton}>
                    <Ionicons name="chevron-back" size={24} color="#00FFFF" />
                  </TouchableOpacity>
                  <View>
                    <Text style={styles.title}>Advanced Templates</Text>
                    <Text style={styles.subtitle}>
                      {loading ? 'Loading...' : `${filteredTemplates.length} templates available`}
                    </Text>
                  </View>
                </View>
                
                <View style={styles.headerActions}>
                  <TouchableOpacity 
                    onPress={() => {
                      if (!userVIPStatus) {
                        Alert.alert('VIP Feature', 'Creating custom templates requires VIP access. Please upgrade to continue.');
                        return;
                      }
                      setShowCreateModal(true);
                    }}
                    style={styles.createButton}
                  >
                    <Ionicons name="add" size={18} color="#000000" />
                    <Text style={styles.createButtonText}>Create</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    onPress={() => setShowFilters(!showFilters)}
                    style={styles.filterButton}
                  >
                    <Ionicons name="options" size={20} color="#FFD700" />
                  </TouchableOpacity>
                </View>
              </View>
              
              {error && (
                <View style={styles.errorContainer}>
                  <Text style={styles.errorText}>{error}</Text>
                  <TouchableOpacity onPress={handleRetry} style={styles.retryButton}>
                    <Text style={styles.retryButtonText}>Retry</Text>
                  </TouchableOpacity>
                </View>
              )}
              
              <View style={styles.searchSection}>
                <View style={styles.searchContainer}>
                  <LinearGradient
                    colors={['rgba(0, 255, 255, 0.1)', 'rgba(0, 255, 255, 0.05)']}
                    style={styles.searchGradient}
                  >
                    <Ionicons name="search" size={20} color="#00FFFF" />
                    <TextInput
                      style={styles.searchInput}
                      placeholder="Search templates by features, use case..."
                      placeholderTextColor="#888"
                      value={searchQuery}
                      onChangeText={handleSearchChange}
                    />
                  </LinearGradient>
                </View>
                
                <Animated.View
                  style={[
                    styles.filtersContainer,
                    {
                      opacity: filterAnimation,
                      transform: [
                        {
                          translateY: filterAnimation.interpolate({
                            inputRange: [0, 1],
                            outputRange: [-20, 0],
                          }),
                        },
                      ],
                    },
                  ]}
                >
                  <View style={styles.sortContainer}>
                    <Text style={styles.sortLabel}>Sort by:</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      {['popularity', 'complexity', 'time'].map(sort => (
                        <TouchableOpacity
                          key={sort}
                          style={[styles.sortButton, sortBy === sort && styles.activeSortButton]}
                          onPress={() => setSortBy(sort as any)}
                        >
                          <Text style={[styles.sortText, sortBy === sort && styles.activeSortText]}>
                            {sort === 'popularity' ? '🔥 Popular' : 
                             sort === 'complexity' ? '⭐ Simple First' : 
                             '⏱️ Quick'}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                </Animated.View>
              </View>
              
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                style={styles.categoryContainer}
                contentContainerStyle={styles.categoryContent}
              >
                {updatedCategories.map(category => (
                  <TouchableOpacity
                    key={category.id}
                    style={[
                      styles.categoryButton,
                      selectedCategory === category.id && styles.activeCategoryButton,
                    ]}
                    onPress={() => setSelectedCategory(category.id)}
                  >
                    <LinearGradient
                      colors={
                        selectedCategory === category.id
                          ? ['rgba(0, 255, 255, 0.3)', 'rgba(0, 255, 255, 0.1)']
                          : ['rgba(255, 255, 255, 0.1)', 'rgba(255, 255, 255, 0.05)']
                      }
                      style={styles.categoryGradient}
                    >
                      <Ionicons 
                        name={category.icon as any} 
                        size={16} 
                        color={selectedCategory === category.id ? '#00FFFF' : category.color} 
                      />
                      <Text style={[
                        styles.categoryText,
                        selectedCategory === category.id && styles.activeCategoryText,
                      ]}>
                        {category.name}
                      </Text>
                      <Text style={styles.categoryCount}>({category.count})</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              
              <View style={styles.templatesContainer}>
                {loading ? (
                  <View style={styles.loadingContainer}>
                    <Text style={styles.loadingText}>Loading templates...</Text>
                  </View>
                ) : (
                  <FlatList
                    data={filteredTemplates}
                    renderItem={renderTemplateCard}
                    keyExtractor={(item) => item.id}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.templatesList}
                    numColumns={1}
                    bounces={false}
                    removeClippedSubviews={false}
                    initialNumToRender={3}
                    maxToRenderPerBatch={3}
                    windowSize={5}
                    ListEmptyComponent={() => (
                      <View style={styles.emptyContainer}>
                        <LinearGradient
                          colors={['rgba(255, 255, 255, 0.1)', 'rgba(255, 255, 255, 0.05)']}
                          style={styles.emptyCard}
                        >
                          <Ionicons name="search" size={48} color="#888" />
                          <Text style={styles.emptyTitle}>No Templates Found</Text>
                          <Text style={styles.emptyText}>
                            Try adjusting your search criteria or category filters
                          </Text>
                          <TouchableOpacity 
                            style={styles.resetButton}
                            onPress={() => {
                              setSearchQuery('');
                              setSelectedCategory('all');
                            }}
                          >
                            <Text style={styles.resetButtonText}>Reset Filters</Text>
                          </TouchableOpacity>
                        </LinearGradient>
                      </View>
                    )}
                  />
                )}
              </View>
            </LinearGradient>
          </Animated.View>
        </View>
        
        <CreateMyTemplate
          visible={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          userId={userId}
          onTemplateCreated={() => {
            fetchTemplates();
            setShowCreateModal(false);
          }}
        />
        
        <Modal
          visible={showImagePreview}
          transparent
          animationType="fade"
          onRequestClose={() => setShowImagePreview(false)}
        >
          <View style={styles.imagePreviewOverlay}>
            <TouchableOpacity 
              style={styles.imagePreviewClose}
              onPress={() => setShowImagePreview(false)}
              activeOpacity={0.8}
            >
              <Ionicons name="close" size={30} color="#FFFFFF" />
            </TouchableOpacity>
            <Image
              source={{ uri: imagePreviewUrl }}
              style={styles.imagePreviewFull}
              resizeMode="contain"
            />
          </View>
        </Modal>
      </Modal>
    );
  } catch (error) {
    secureLog('TemplateSelector render error', { 
      error: error instanceof Error ? error.message : 'Unknown error',
      visible,
      templateCount: templates.length
    });
    
    // Fallback UI
    return (
      <Modal visible={visible} transparent onRequestClose={onClose}>
        <View style={styles.errorFallbackContainer}>
          <LinearGradient
            colors={['rgba(10, 15, 30, 0.98)', 'rgba(5, 10, 20, 0.96)']}
            style={styles.errorFallbackContent}
          >
            <Ionicons name="warning" size={48} color="#FF6B6B" />
            <Text style={styles.errorFallbackTitle}>Unable to Load Templates</Text>
            <Text style={styles.errorFallbackText}>
              An error occurred while loading the template selector. Please try again.
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.errorFallbackButton}>
              <Text style={styles.errorFallbackButtonText}>Close</Text>
            </TouchableOpacity>
          </LinearGradient>
        </View>
      </Modal>
    );
  }
};

export default TemplateSelector;

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
  },
  modalContainer: {
    flex: 1,
    marginTop: 40,
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    overflow: 'hidden',
  },
  modalContent: {
    flex: 1,
  },
  
  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 20,
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
    marginRight: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 255, 255, 0.1)',
  },
  title: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  subtitle: {
    color: '#888',
    fontSize: 13,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#00FFFF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    gap: 6,
  },
  createButtonText: {
    color: '#000000',
    fontSize: 14,
    fontWeight: 'bold',
  },
  filterButton: {
    padding: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.3)',
  },
  
  // Error handling
  errorContainer: {
    backgroundColor: 'rgba(255, 0, 0, 0.1)',
    borderColor: 'rgba(255, 0, 0, 0.3)',
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    margin: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  errorText: {
    color: '#FF6B6B',
    fontSize: 14,
    flex: 1,
  },
  retryButton: {
    backgroundColor: 'rgba(255, 107, 107, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginLeft: 12,
  },
  retryButtonText: {
    color: '#FF6B6B',
    fontSize: 12,
    fontWeight: 'bold',
  },
  
  // Error Fallback
  errorFallbackContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorFallbackContent: {
    alignItems: 'center',
    padding: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 107, 0.3)',
    maxWidth: 300,
  },
  errorFallbackTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  errorFallbackText: {
    color: '#CCCCCC',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  errorFallbackButton: {
    backgroundColor: 'rgba(255, 107, 107, 0.2)',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 107, 0.4)',
  },
  errorFallbackButtonText: {
    color: '#FF6B6B',
    fontSize: 16,
    fontWeight: 'bold',
  },
  
  // Loading
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#FFFFFF',
    fontSize: 16,
  },
  
  // Search Section
  searchSection: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  searchContainer: {
    borderRadius: 15,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 255, 0.3)',
    marginBottom: 12,
  },
  searchGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 16,
  },
  filtersContainer: {
    marginTop: 8,
  },
  sortContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  sortLabel: {
    color: '#CCCCCC',
    fontSize: 14,
    fontWeight: '600',
  },
  sortButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginRight: 8,
  },
  activeSortButton: {
    backgroundColor: 'rgba(0, 255, 255, 0.2)',
  },
  sortText: {
    color: '#CCCCCC',
    fontSize: 12,
    fontWeight: '500',
  },
  activeSortText: {
    color: '#00FFFF',
    fontWeight: 'bold',
  },
  
  // Category Filter
  categoryContainer: {
    paddingVertical: 4,
    marginHorizontal: 0,
    paddingHorizontal: 0,
  },
  categoryContent: {
    paddingHorizontal: 20,
    gap: 10,
    paddingLeft: 20,
    paddingRight: 30,
  },
  categoryButton: {
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    height: 36,
    marginHorizontal: 2,
  },
  activeCategoryButton: {
    borderColor: '#00FFFF',
  },
  categoryGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 4,
    gap: 8,
    height: 34,
    justifyContent: 'center',
    margin: 1,
  },
  categoryText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  activeCategoryText: {
    color: '#00FFFF',
  },
  categoryCount: {
    color: '#888',
    fontSize: 11,
  },
  
  // Templates Container
  templatesContainer: {
    flex: 10,
    marginTop: 2,
  },
  templatesList: {
    padding: 20,
    paddingBottom: 100,
    paddingTop: 10,
  },
  templateCard: {
    marginBottom: 16,
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  cardTouchable: {
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  cardGradient: {
    flexDirection: 'row',
    padding: 20,
    minHeight: 280,
    gap: 16,
  },
  
  // Thumbnail Styles
  thumbnailContainer: {
    width: 100,
    height: 140,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  thumbnailTouchable: {
    flex: 1,
    width: '100%',
    height: '100%',
    borderRadius: 12,
    overflow: 'hidden',
  },
  thumbnailImage: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  thumbnailPreviewOverlay: {
    position: 'absolute',
    bottom: 6,
    left: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 6,
    padding: 3,
  },
  thumbnailIconContainer: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    borderRadius: 8,
    padding: 4,
  },
  thumbnailGradient: {
    flex: 1,
    position: 'relative',
  },
  thumbnailContent: {
    flex: 1,
    padding: 8,
    justifyContent: 'space-between',
  },
  mockHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  mockTitle: {
    height: 4,
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    borderRadius: 2,
    marginRight: 6,
  },
  mockBadge: {
    width: 12,
    height: 4,
    backgroundColor: 'rgba(255, 215, 0, 0.8)',
    borderRadius: 2,
  },
  mockSections: {
    flex: 1,
    justifyContent: 'space-around',
    paddingVertical: 4,
  },
  mockSection: {
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    borderRadius: 2,
    marginVertical: 1,
  },
  mockFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  mockStats: {
    width: 20,
    height: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    borderRadius: 2,
  },
  mockAction: {
    width: 16,
    height: 3,
    backgroundColor: 'rgba(0, 255, 255, 0.8)',
    borderRadius: 2,
  },
  thumbnailOverlay: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 8,
    padding: 4,
  },
  
  // Card Content
  cardContent: {
    flex: 1,
  },
  
  // Card Header
  cardHeader: {
    marginBottom: 16,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  titleSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  templateIcon: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    padding: 8,
    borderRadius: 12,
  },
  titleContainer: {
    flex: 1,
  },
  templateTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  templateCategory: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 12,
    fontWeight: '600',
  },
  badges: {
    flexDirection: 'row',
    gap: 8,
  },
  vipBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFD700',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  vipText: {
    color: '#000000',
    fontSize: 11,
    fontWeight: 'bold',
  },
  difficultyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  difficultyText: {
    color: '#000000',
    fontSize: 11,
    fontWeight: 'bold',
  },
  templateDescription: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 14,
    lineHeight: 20,
  },
  
  // Features Section
  featuresSection: {
    marginBottom: 16,
  },
  featuresTitle: {
    color: '#FFD700',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  featuresContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  featureTag: {
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.4)',
  },
  featureText: {
    color: '#FFD700',
    fontSize: 11,
    fontWeight: '600',
  },
  
  // Sections Preview
  sectionsPreview: {
    marginBottom: 16,
  },
  sectionsTitle: {
    color: '#00FFFF',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  sectionChip: {
    backgroundColor: 'rgba(0, 255, 255, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginRight: 8,
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 255, 0.3)',
    alignItems: 'center',
  },
  sectionLabel: {
    color: '#00FFFF',
    fontSize: 11,
    fontWeight: '600',
  },
  sectionType: {
    color: '#888',
    fontSize: 9,
    textTransform: 'uppercase',
  },
  
  // Card Footer
  cardFooter: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
    paddingTop: 12,
  },
  statsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 8,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    color: '#CCCCCC',
    fontSize: 11,
    fontWeight: '500',
  },
  useCase: {
    marginTop: 4,
  },
  useCaseText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 12,
    lineHeight: 16,
    fontStyle: 'italic',
  },
  
  // Empty State
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyCard: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 30,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  emptyTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    color: '#888',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  resetButton: {
    backgroundColor: 'rgba(0, 255, 255, 0.2)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 255, 0.4)',
  },
  resetButtonText: {
    color: '#00FFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  
  // Image Preview Modal
  imagePreviewOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePreviewClose: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 20,
    padding: 10,
  },
  imagePreviewFull: {
    width: '90%',
    height: '80%',
  },
});