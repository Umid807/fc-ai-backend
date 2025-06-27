import React, { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
  Animated,
  Dimensions,
  ImageBackground,
  FlatList,
  Vibration,
  ActivityIndicator,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

// Security utilities
import { sanitizeHTML, secureLog } from '../../utils/security';

// Asset imports for better bundle management
import utIcon from '../../assets/images/ut.png';
import cmIcon from '../../assets/images/cm.png';
import rushIcon from '../../assets/images/rush.png';
import fcMobileIcon from '../../assets/images/fcMobile.png';
import generalDIcon from '../../assets/images/generalD.png';

// Enhanced TypeScript interfaces
interface Category {
  id: string;
  name: string;
  nameKey: string; // i18n key
  emoji: string;  // Keep this for fallback
  icon: any;      
  description: string;
  descriptionKey: string; // i18n key
  color: string;
  gradientColors: string[];
  popularity: number;
  isBoost?: boolean;
  sortOrder: number;
}

interface CategorySelectorProps {
  selectedCategory: string | null;
  onCategorySelect: (categoryId: string) => void;
  showModal: boolean;
  onShowModal: () => void;
  onCloseModal: () => void;
  disabled?: boolean;
  showPopularFirst?: boolean;
}

// Constants
const SCREEN_WIDTH = Dimensions.get('window').width;
const SCREEN_HEIGHT = Dimensions.get('window').height;
const ANIMATION_DURATION = 300;

// FC25 Categories Data with i18n support
const FC25_CATEGORIES: Category[] = [
  {
    id: 'ultimate_team',
    name: 'Ultimate Team',
    nameKey: 'category.ultimateTeam',
    emoji: '⚽',
    icon: utIcon, // Fixed: Use import instead of require
    description: 'Squad building, pack openings, and UT strategies',
    descriptionKey: 'category.ultimateTeamDescription',
    color: '#FFD700',
    gradientColors: ['#FFD700', '#FFA500'],
    popularity: 95,
    isBoost: true,
    sortOrder: 1,
  },
  {
    id: 'career_mode',
    name: 'Career Mode',
    nameKey: 'category.careerMode',
    emoji: '🏆',
    icon: cmIcon, // Fixed: Use import instead of require
    description: 'Manager career, player career, and transfers',
    descriptionKey: 'category.careerModeDescription',
    color: '#00FFFF',
    gradientColors: ['#00FFFF', '#0080FF'],
    popularity: 88,
    sortOrder: 2,
  },
  {
    id: 'rush',
    name: 'Rush',
    nameKey: 'category.rush',
    emoji: '⚡',
    icon: rushIcon, // Fixed: Use import instead of require
    description: 'Fast-paced gameplay and Rush mode discussions',
    descriptionKey: 'category.rushDescription',
    color: '#FF6347',
    gradientColors: ['#FF6347', '#DC143C'],
    popularity: 82,
    sortOrder: 3,
  },
  {
    id: 'fc_mobile',
    name: 'FC Mobile',
    nameKey: 'category.fcMobile',
    emoji: '📱',
    icon: fcMobileIcon, // Fixed: Use import instead of require
    description: 'Mobile gaming tips, events, and strategies',
    descriptionKey: 'category.fcMobileDescription',
    color: '#32CD32',
    gradientColors: ['#32CD32', '#228B22'],
    popularity: 85,
    sortOrder: 4,
  },
  {
    id: 'general_discussion',
    name: 'General Discussion',
    nameKey: 'category.generalDiscussion',
    emoji: '💬',
    icon: generalDIcon, // Fixed: Use import instead of require
    description: 'General FC25 topics and community chat',
    descriptionKey: 'category.generalDiscussionDescription',
    color: '#9370DB',
    gradientColors: ['#9370DB', '#6A5ACD'],
    popularity: 90,
    sortOrder: 5,
  },
];

const CategorySelector: React.FC<CategorySelectorProps> = ({
  selectedCategory,
  onCategorySelect,
  showModal,
  onShowModal,
  onCloseModal,
  disabled = false,
  showPopularFirst = false,
}) => {
  const { t } = useTranslation();
  
  // Animation refs with proper cleanup tracking
  const slideAnimation = useRef(new Animated.Value(0)).current;
  const scaleAnimation = useRef(new Animated.Value(0.8)).current;
  const pulseAnimation = useRef(new Animated.Value(1)).current;
  const shimmerAnimation = useRef(new Animated.Value(0)).current;
  const isMountedRef = useRef(true);
  const animationRefs = useRef<Animated.CompositeAnimation[]>([]);
  
  // State management
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // Enhanced cleanup function
  const cleanupAnimations = useCallback(() => {
    try {
      // Stop all running animations
      animationRefs.current.forEach(animation => {
        animation.stop();
      });
      animationRefs.current = [];
      
      // Remove all listeners
      slideAnimation.removeAllListeners();
      scaleAnimation.removeAllListeners();
      pulseAnimation.removeAllListeners();
      shimmerAnimation.removeAllListeners();
      
      // Reset animation values
      slideAnimation.setValue(0);
      scaleAnimation.setValue(0.8);
      pulseAnimation.setValue(1);
      shimmerAnimation.setValue(0);
    } catch (error) {
      secureLog('Animation cleanup error', { error: error.message });
    }
  }, [slideAnimation, scaleAnimation, pulseAnimation, shimmerAnimation]);
  
  // Component cleanup
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      cleanupAnimations();
    };
  }, [cleanupAnimations]);
  
  // Get selected category data
  const selectedCategoryData = useMemo(() => {
    return FC25_CATEGORIES.find(cat => cat.id === selectedCategory) || null;
  }, [selectedCategory]);
  
  // Filter and sort categories with i18n support
  const filteredCategories = useMemo(() => {
    let categories = [...FC25_CATEGORIES];
    
    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      categories = categories.filter(cat => {
        const name = t(cat.nameKey, cat.name).toLowerCase();
        const description = t(cat.descriptionKey, cat.description).toLowerCase();
        return name.includes(query) || description.includes(query);
      });
    }
    
    // Sort by popularity or default order
    if (showPopularFirst) {
      categories.sort((a, b) => b.popularity - a.popularity);
    } else {
      categories.sort((a, b) => a.sortOrder - b.sortOrder);
    }
    
    return categories;
  }, [searchQuery, showPopularFirst, t]);
  
  // Enhanced animation functions with proper cleanup
  const animateIn = useCallback(() => {
    if (!isMountedRef.current) return;
    
    try {
      const animation = Animated.parallel([
        Animated.spring(slideAnimation, {
          toValue: 1,
          useNativeDriver: true,
          tension: 100,
          friction: 8,
        }),
        Animated.spring(scaleAnimation, {
          toValue: 1,
          useNativeDriver: true,
          tension: 120,
          friction: 7,
        }),
      ]);
      
      animationRefs.current.push(animation);
      animation.start((finished) => {
        if (finished && isMountedRef.current) {
          const index = animationRefs.current.indexOf(animation);
          if (index > -1) {
            animationRefs.current.splice(index, 1);
          }
        }
      });
    } catch (error) {
      secureLog('Animate in error', { error: error.message });
    }
  }, [slideAnimation, scaleAnimation]);
  
  const animateOut = useCallback((callback?: () => void) => {
    if (!isMountedRef.current) return;
    
    try {
      const animation = Animated.parallel([
        Animated.timing(slideAnimation, {
          toValue: 0,
          duration: ANIMATION_DURATION,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnimation, {
          toValue: 0.8,
          duration: ANIMATION_DURATION,
          useNativeDriver: true,
        }),
      ]);
      
      animationRefs.current.push(animation);
      animation.start((finished) => {
        const index = animationRefs.current.indexOf(animation);
        if (index > -1) {
          animationRefs.current.splice(index, 1);
        }
        
        if (finished && isMountedRef.current && callback) {
          callback();
        }
      });
    } catch (error) {
      secureLog('Animate out error', { error: error.message });
      if (callback) callback();
    }
  }, [slideAnimation, scaleAnimation]);
  
  const startPulseAnimation = useCallback(() => {
    if (!isMountedRef.current) return;
    
    try {
      const animation = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnimation, {
            toValue: 1.05,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnimation, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      );
      
      animationRefs.current.push(animation);
      animation.start();
    } catch (error) {
      secureLog('Pulse animation error', { error: error.message });
    }
  }, [pulseAnimation]);
  
  const startShimmerAnimation = useCallback(() => {
    if (!isMountedRef.current) return;
    
    try {
      const animation = Animated.loop(
        Animated.timing(shimmerAnimation, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        })
      );
      
      animationRefs.current.push(animation);
      animation.start();
    } catch (error) {
      secureLog('Shimmer animation error', { error: error.message });
    }
  }, [shimmerAnimation]);
  
  // Handle modal lifecycle
  useEffect(() => {
    if (showModal) {
      animateIn();
      startShimmerAnimation();
    } else {
      // Reset animations
      setTimeout(() => {
        if (isMountedRef.current) {
          cleanupAnimations();
        }
      }, ANIMATION_DURATION);
      setSearchQuery('');
      setSelectedIndex(null);
    }
  }, [showModal, animateIn, startShimmerAnimation, cleanupAnimations]);
  
  // Enhanced category selection with better error handling
  const handleCategorySelect = useCallback((category: Category, index: number) => {
    if (disabled || isLoading || !isMountedRef.current) return;
    
    try {
      setIsLoading(true);
      setSelectedIndex(index);
      Vibration.vibrate(50);
      
      // Enhanced logging
      secureLog('Category selected', {
        categoryId: category.id,
        categoryName: category.name,
        popularity: category.popularity,
        timestamp: Date.now(),
      });
      
      // Simulate processing delay for better UX
      const processingTimeout = setTimeout(() => {
        if (!isMountedRef.current) return;
        
        animateOut(() => {
          if (isMountedRef.current) {
            onCategorySelect(category.id);
            setIsLoading(false);
            setSelectedIndex(null);
          }
        });
      }, 500);
      
      // Cleanup if component unmounts
      return () => clearTimeout(processingTimeout);
      
    } catch (error) {
      secureLog('Category selection error', { 
        error: error.message, 
        categoryId: category.id 
      });
      setIsLoading(false);
      setSelectedIndex(null);
    }
  }, [disabled, isLoading, animateOut, onCategorySelect]);
  
  // Handle modal close
  const handleClose = useCallback(() => {
    if (isLoading || !isMountedRef.current) return;
    
    try {
      Vibration.vibrate(30);
      animateOut(() => {
        if (isMountedRef.current) {
          onCloseModal();
        }
      });
    } catch (error) {
      secureLog('Modal close error', { error: error.message });
      onCloseModal();
    }
  }, [isLoading, animateOut, onCloseModal]);
  
  // Render category item
  const renderCategoryItem = useCallback(({ item: category, index }: { item: Category; index: number }) => {
    const isSelected = selectedIndex === index;
    const isCurrentSelection = selectedCategory === category.id;
    
    return (
      <TouchableOpacity
        style={[
          styles.categoryItem,
          isCurrentSelection && styles.currentCategoryItem,
        ]}
        onPress={() => handleCategorySelect(category, index)}
        disabled={disabled || isLoading}
        activeOpacity={0.8}
      >
        <Animated.View
          style={[
            styles.categoryContent,
            isSelected && {
              transform: [{ scale: pulseAnimation }],
            },
          ]}
        >
          <LinearGradient
            colors={[
              isCurrentSelection ? category.color + 'CC' : category.gradientColors[0] + '66',
              isCurrentSelection ? category.gradientColors[1] + 'AA' : category.gradientColors[1] + '44',
              'transparent'
            ]}
            style={styles.categoryGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.categoryHeader}>
              <View style={styles.categoryIconContainer}>
                <LinearGradient
                  colors={category.gradientColors}
                  style={styles.categoryIconGradient}
                >
                  <Text style={styles.categoryEmoji}>{category.emoji}</Text>
                </LinearGradient>
                
                {/* Boost indicator */}
                {category.isBoost && (
                  <View style={styles.boostIndicator}>
                    <Ionicons name="flash" size={12} color="#FFD700" />
                  </View>
                )}
                
                {/* Selection indicator */}
                {isCurrentSelection && (
                  <View style={styles.selectionIndicator}>
                    <Ionicons name="checkmark-circle" size={20} color="#32CD32" />
                  </View>
                )}
              </View>
              
              <View style={styles.categoryInfo}>
                <Text style={[
                  styles.categoryName,
                  { color: category.color }
                ]}>
                  {t(category.nameKey, category.name)}
                </Text>
                
                <Text style={styles.categoryDescription}>
                  {t(category.descriptionKey, category.description)}
                </Text>
                
                {/* Popularity indicator */}
                <View style={styles.popularityContainer}>
                  <View style={styles.popularityBar}>
                    <View 
                      style={[
                        styles.popularityFill,
                        { 
                          width: `${category.popularity}%`,
                          backgroundColor: category.color,
                        }
                      ]} 
                    />
                  </View>
                  <Text style={styles.popularityText}>
                    {t('categorySelector.popularityPercent', { 
                      percent: category.popularity,
                      defaultValue: `${category.popularity}% popular`
                    })}
                  </Text>
                </View>
              </View>
            </View>
            
            {/* Loading indicator for selected item */}
            {isSelected && isLoading && (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color={category.color} />
                <Text style={styles.loadingText}>
                  {t('categorySelector.selecting', 'Selecting...')}
                </Text>
              </View>
            )}
          </LinearGradient>
        </Animated.View>
      </TouchableOpacity>
    );
  }, [selectedIndex, selectedCategory, isLoading, disabled, pulseAnimation, handleCategorySelect, t]);
  
  // Render inline selector (EXACT SAME UI AS ORIGINAL)
  const renderInlineSelector = useCallback(() => (
    <View style={styles.inlineContainer}>
      <TouchableOpacity
        style={[
          styles.inlineSelector,
          selectedCategoryData && styles.inlineSelectorSelected,
          disabled && styles.inlineSelectorDisabled,
        ]}
        onPress={onShowModal}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={t('categorySelector.selectCategory', 'Select Category')}
      >
        {/* EXACT SAME STRUCTURE AS ORIGINAL */}
        <View style={styles.inlineSelectorBackground}>
          <LinearGradient
            colors={selectedCategoryData 
              ? [selectedCategoryData.color + '22', selectedCategoryData.color + '11']
              : ['rgba(0, 255, 255, 0.08)', 'rgba(0, 255, 255, 0.03)']
            }
            style={styles.inlineSelectorGradient}
          >
            <View style={styles.inlineSelectorContent}>
              {selectedCategoryData ? (
                <>
                  <Image 
                    source={selectedCategoryData.icon} 
                    style={{ 
                      width: 24, 
                      height: 24,
                      borderRadius: 12,
                      marginRight: 12,
                    }} 
                    resizeMode="cover"
                  />
                  <Text style={[
                    styles.inlineSelectorText,
                    { color: selectedCategoryData.color }
                  ]}>
                    {t(selectedCategoryData.nameKey, selectedCategoryData.name)}
                  </Text>
                  {selectedCategoryData.isBoost && (
                    <Ionicons name="flash" size={16} color="#FFD700" />
                  )}
                </>
              ) : (
                <>
                  <Ionicons name="apps" size={20} color="#00FFFF" />
                  <Text style={styles.inlineSelectorPlaceholder}>
                    {t('categorySelector.selectCategory', 'Select Category')}
                  </Text>
                </>
              )}
              <Ionicons 
                name="chevron-down" 
                size={20} 
                color={selectedCategoryData ? selectedCategoryData.color : "#00FFFF"} 
              />
            </View>
          </LinearGradient>
        </View>
      </TouchableOpacity>
      
      {/* Category hint */}
      <Text style={styles.categoryHint}>
        {t('categorySelector.categoryHint', 'Choose the best category for your post')}
      </Text>
    </View>
  ), [selectedCategoryData, disabled, onShowModal, t]);
  
  // Render shimmer effect
  const renderShimmerOverlay = useCallback(() => (
    <Animated.View
      style={[
        styles.shimmerOverlay,
        {
          opacity: shimmerAnimation.interpolate({
            inputRange: [0, 0.5, 1],
            outputRange: [0, 0.3, 0],
          }),
          transform: [
            {
              translateX: shimmerAnimation.interpolate({
                inputRange: [0, 1],
                outputRange: [-SCREEN_WIDTH, SCREEN_WIDTH],
              }),
            },
          ],
        },
      ]}
    />
  ), [shimmerAnimation]);
  
  return (
    <>
      {/* Inline Selector */}
      {renderInlineSelector()}
      
      {/* Modal - EXACT SAME STRUCTURE AS ORIGINAL */}
      <Modal
        visible={showModal}
        transparent
        animationType="slide"
        onRequestClose={handleClose}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.9)', justifyContent: 'center', padding: 20 }}>
          <View style={{
            backgroundColor: 'rgba(18, 25, 40, 0.95)',
            borderRadius: 20,
            borderWidth: 2,
            borderColor: '#00FFFF40',
            height: '80%', // Fixed: Changed from maxHeight to height
            shadowColor: '#00FFFF',
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.4,
            shadowRadius: 15,
            elevation: 15,
            overflow: 'hidden',
          }}>
            
            {/* Enhanced Header with gradient - SAME STYLING */}
            <View style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: 20,
              backgroundColor: 'rgba(0, 255, 255, 0.05)',
              borderBottomWidth: 1,
              borderBottomColor: '#00FFFF20',
            }}>
              <Text style={{
                color: '#00FFFF',
                fontSize: 18,
                fontWeight: '700',
                textShadowColor: '#00FFFF50',
                textShadowOffset: { width: 0, height: 0 },
                textShadowRadius: 5,
              }}>
                ⚽ {t('categorySelector.selectCategory', 'Select Category')}
              </Text>
              <TouchableOpacity
                onPress={handleClose}
                style={{
                  padding: 10,
                  borderRadius: 20,
                  backgroundColor: 'rgba(255, 69, 69, 0.2)',
                  borderWidth: 1,
                  borderColor: 'rgba(255, 69, 69, 0.3)',
                }}
              >
                <Ionicons name="close" size={18} color="#ff4545" />
              </TouchableOpacity>
            </View>

            {/* Enhanced Categories - SAME STYLING, Fixed: Removed maxHeight */}
            <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
              {filteredCategories.map((category, index) => {
                const isCurrentSelection = selectedCategory === category.id;
                const isLoadingThisItem = selectedIndex === index && isLoading; 
                
                return (
                  <TouchableOpacity
                    key={category.id}
                    onPress={() => handleCategorySelect(category, index)}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      padding: 18,
                      marginHorizontal: 12,
                      marginVertical: 6,
                      borderRadius: 12,
                      backgroundColor: isCurrentSelection 
                        ? `${category.color}15` 
                        : 'rgba(255, 255, 255, 0.02)',
                      borderWidth: 1,
                      borderColor: isCurrentSelection 
                        ? `${category.color}40` 
                        : 'rgba(255, 255, 255, 0.08)',
                    }}
                    activeOpacity={0.7}
                  >
                    {/* Enhanced Icon - SAME STYLING */}
                    <View style={{
                      width: 50,
                      height: 50,
                      borderRadius: 25,
                      backgroundColor: `${category.color}20`,
                      borderWidth: 2,
                      borderColor: `${category.color}60`,
                      justifyContent: 'center',
                      alignItems: 'center',
                      marginRight: 16,
                      shadowColor: category.color,
                      shadowOffset: { width: 0, height: 0 },
                      shadowOpacity: 0.3,
                      shadowRadius: 8,
                      elevation: 5,
                    }}>
                      <Image 
                        source={category.icon} 
                        style={{ 
                          width: 46, 
                          height: 46, 
                          borderRadius: 23 
                        }} 
                        resizeMode="cover"
                      />
                      {category.isBoost && (
                        <View style={{
                          position: 'absolute',
                          top: -3,
                          right: -3,
                          width: 12,
                          height: 12,
                          borderRadius: 6,
                          backgroundColor: '#FFD700',
                          borderWidth: 1,
                          borderColor: '#FFF',
                          justifyContent: 'center',
                          alignItems: 'center',
                        }}>
                          <Ionicons name="flash" size={8} color="#000" />
                        </View>
                      )}
                    </View>
                    
                    {/* Enhanced Info - SAME STYLING */}
                    <View style={{ flex: 1 }}>
                      <Text style={{
                        color: isCurrentSelection ? category.color : '#fff',
                        fontSize: 16,
                        fontWeight: '700',
                        marginBottom: 4,
                        textShadowColor: isCurrentSelection ? `${category.color}30` : 'transparent',
                        textShadowOffset: { width: 0, height: 0 },
                        textShadowRadius: 3,
                      }}>
                        {t(category.nameKey, category.name)}
                      </Text>
                      <Text style={{
                        color: '#bbb',
                        fontSize: 12,
                        lineHeight: 16,
                        opacity: 0.8,
                      }}>
                        {t(category.descriptionKey, category.description)}
                      </Text>
                      
                      {/* Just some spacing */}
                      <View style={{ marginTop: 6 }} />
                    </View>
                    
                    {/* Enhanced Selection indicator - SAME STYLING */}
                    {isCurrentSelection && (
                      <View style={{
                        backgroundColor: `${category.color}20`,
                        borderRadius: 15,
                        padding: 5,
                      }}>
                        <Ionicons name="checkmark-circle" size={20} color={category.color} />
                      </View>
                    )}
                    
                    {/* Loading - SAME STYLING */}
                    {isLoadingThisItem && (
                      <ActivityIndicator size="small" color={category.color} style={{ marginLeft: 8 }} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            
            {/* Enhanced Footer - SAME STYLING */}
            <View style={{
              padding: 16,
              backgroundColor: 'rgba(0, 255, 255, 0.03)',
              borderTopWidth: 1,
              borderTopColor: '#00FFFF20',
              alignItems: 'center',
            }}>
              <Text style={{
                color: '#666',
                fontSize: 11,
                fontStyle: 'italic',
              }}>
                🎮 {t('categorySelector.footerText', 'Choose your gaming discussion category')}
              </Text>
            </View>
            
          </View>
        </View>
      </Modal>
    </>
  );
};

export default CategorySelector;

/* SAME STYLES AS ORIGINAL - NO CHANGES */
const styles = StyleSheet.create({
  // Inline Selector Styles - FIXED
  inlineContainer: {
    marginBottom: 16,
  },
  inlineSelector: {
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#00FFFF33',
    overflow: 'hidden',
    shadowColor: '#00FFFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 0,
  },
  inlineSelectorSelected: {
    borderColor: '#00FFFF',
    shadowOpacity: 0.5,
  },
  inlineSelectorDisabled: {
    opacity: 0.5,
  },
  
  // Fixed: Added solid background layer
  inlineSelectorBackground: {
    backgroundColor: 'rgba(0, 20, 30, 0.9)', // Solid dark background
    borderRadius: 14,
  },
  inlineSelectorGradient: {
    borderRadius: 14,
  },
  inlineSelectorContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    minHeight: 60,
  },
  inlineSelectorEmoji: {
    fontSize: 24,
    marginRight: 12,
  },
  inlineSelectorText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#00FFFF',
  },
  inlineSelectorPlaceholder: {
    flex: 1,
    fontSize: 16,
    color: '#00FFFF', // Changed from #888 to make it more visible
    fontWeight: '500',
  },
  categoryHint: {
    color: '#888',
    fontSize: 12,
    marginTop: 8,
    marginLeft: 4,
    fontStyle: 'italic',
  },
  
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backgroundImage: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '95%',
    maxHeight: '85%',
    alignSelf: 'center',
  },
  modalContent: {
    flex: 1,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#00FFFF66',
    shadowColor: '#00FFFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
    backgroundColor: 'rgba(0, 20, 30, 0.95)', // Added fallback background
  },
  cardBackground: {
    flex: 1,
  },
  cardBackgroundImage: {
    borderRadius: 18,
    opacity: 0.8,
  },
  
  // Header Styles
  modalHeader: {
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#00FFFF22',
  },
  headerGradient: {
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  modalTitle: {
    color: '#FFD700',
    fontSize: 22,
    fontWeight: 'bold',
    textShadowColor: '#FFD700',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 4,
  },
  closeButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
  },
  modalSubtitle: {
    color: '#ccc',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 4,
  },
  
  // Categories List Styles
  categoriesList: {
    flex: 1,
  },
  categoriesContent: {
    padding: 16,
    paddingBottom: 80,
  },
  categoryItem: {
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: 'rgba(0, 20, 30, 0.8)', // Added fallback background
  },
  currentCategoryItem: {
    borderWidth: 2,
    borderColor: '#32CD32',
    shadowColor: '#32CD32',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 8,
  },
  categoryContent: {
    overflow: 'hidden',
  },
  categoryGradient: {
    padding: 20,
    borderWidth: 1,
    borderColor: '#00FFFF22',
    minHeight: 120, // Ensure minimum height
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  categoryIconContainer: {
    marginRight: 16,
    position: 'relative',
  },
  categoryIconGradient: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  categoryEmoji: {
    fontSize: 28,
  },
  boostIndicator: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: 'rgba(255, 215, 0, 0.9)',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectionIndicator: {
    position: 'absolute',
    bottom: -5,
    right: -5,
    backgroundColor: 'rgba(50, 205, 50, 0.9)',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryInfo: {
    flex: 1,
  },
  categoryName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 6,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  categoryDescription: {
    color: '#ccc',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  popularityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  popularityBar: {
    flex: 1,
    height: 4,
    backgroundColor: '#333',
    borderRadius: 2,
    marginRight: 8,
    overflow: 'hidden',
  },
  popularityFill: {
    height: '100%',
    borderRadius: 2,
  },
  popularityText: {
    color: '#888',
    fontSize: 10,
    fontWeight: '600',
    minWidth: 70,
    textAlign: 'right',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    padding: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 8,
  },
  loadingText: {
    color: '#ccc',
    fontSize: 12,
    marginLeft: 8,
  },
  
  // Footer Styles
  modalFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 60,
  },
  footerGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  footerText: {
    color: '#888',
    fontSize: 11,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  
  // Shimmer Effect
  shimmerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 255, 255, 0.1)',
    transform: [{ skewX: '-20deg' }],
  },
});