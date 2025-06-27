import React, { useCallback, useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Vibration,
  Animated,
  Dimensions,
  Modal,
  ScrollView,
  SafeAreaView,
  StatusBar,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

import { BackgroundControls } from './BackgroundControls';

// Types
interface TemplateSection {
  id: string;
  label: string;
  content: string;
  style: any;
  config: {
    type: 'text' | 'image' | 'quote' | 'table' | 'video' | 'poll';
    allowEmpty: boolean;
  };
  order: number;
  images?: any[];
  imageSize?: 'Small' | 'Medium' | 'Large' | 'Full';
  quoteStyle?: 'Gold' | 'Green' | 'Blue' | 'Clear';
  sectionBackground?: {
  type: 'transparent' | 'solid' | 'gradient';
  id?: string;
  color?: string;
  colors?: string[];
  originalColors?: string[];
  opacity?: number;
} | null;
  customStyle?: any;
  tableData?: {
    styling: {
      theme: 'blue' | 'gold' | 'dark' | 'green' | 'purple';
    };
  };
}

interface FloatingControlsProps {
  section: TemplateSection;
  isVisible: boolean;
  userVIP: boolean;
  onSectionUpdate: (sectionId: string, updates: any) => void;
  onSectionStyleUpdate: (sectionId: string, styleUpdates: any) => void;
  onClose: () => void;
}

interface MasterControlsProps {
  isVisible: boolean;
  userVIP: boolean;
  currentBackground: any;
  onPostBackgroundUpdate: (background: any) => void;
  onClose: () => void;
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// ================================================================
// NEON LIVE EDIT INDICATOR COMPONENT
// ================================================================
export const NeonLiveEditIndicator: React.FC<{
  isActive: boolean;
  onPress: () => void;
}> = ({ isActive, onPress }) => {
  const pulseAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const createPulseAnimation = () => {
      return Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1500,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 0,
            duration: 1500,
            useNativeDriver: true,
          }),
        ])
      );
    };

    const createGlowAnimation = () => {
      return Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, {
            toValue: 1,
            duration: 2000,
            useNativeDriver: true,
          }),
          Animated.timing(glowAnim, {
            toValue: 0,
            duration: 2000,
            useNativeDriver: true,
          }),
        ])
      );
    };

    if (isActive) {
      createPulseAnimation().start();
      createGlowAnimation().start();
    } else {
      pulseAnim.setValue(0);
      glowAnim.setValue(0);
    }

    return () => {
      pulseAnim.stopAnimation();
      glowAnim.stopAnimation();
    };
  }, [isActive, pulseAnim, glowAnim]);

  const pulseScale = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.2],
  });

  const glowOpacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.8],
  });

  return (
    <TouchableOpacity
      onPress={onPress}
      style={[
        styles.neonIndicator,
        isActive && styles.neonIndicatorActive
      ]}
      activeOpacity={0.8}
    >
      {/* Outer Glow Effect */}
      <Animated.View
        style={[
          styles.neonGlowOuter,
          {
            opacity: isActive ? glowOpacity : 0,
            transform: [{ scale: pulseScale }],
          },
        ]}
      >
        <LinearGradient
          colors={['rgba(0, 255, 255, 0.4)', 'rgba(147, 112, 219, 0.2)']}
          style={styles.neonGlowGradient}
        />
      </Animated.View>

      {/* Main Button */}
      <Animated.View
        style={[
          styles.neonButton,
          {
            transform: [{ scale: isActive ? pulseScale : 1 }],
          },
        ]}
      >
        <LinearGradient
          colors={
            isActive
              ? ['rgba(0, 255, 255, 0.9)', 'rgba(147, 112, 219, 0.7)']
              : ['rgba(0, 255, 255, 0.3)', 'rgba(147, 112, 219, 0.2)']
          }
          style={styles.neonButtonGradient}
        >
          <Ionicons
            name={isActive ? "options" : "options-outline"}
            size={14}
            color={isActive ? "#000" : "#00FFFF"}
          />
        </LinearGradient>
      </Animated.View>

      {/* Inner Glow */}
      {isActive && (
        <Animated.View
          style={[
            styles.neonGlowInner,
            { opacity: glowOpacity },
          ]}
        >
          <LinearGradient
            colors={['rgba(0, 255, 255, 0.6)', 'transparent']}
            style={styles.neonGlowGradient}
          />
        </Animated.View>
      )}
    </TouchableOpacity>
  );
};

// ================================================================
// SECTION EDITING MODAL
// ================================================================
export const SectionEditingModal: React.FC<FloatingControlsProps> = ({
  section,
  isVisible,
  userVIP,
  onSectionUpdate,
  onSectionStyleUpdate,
  onClose,
}) => {
  const slideAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scrollY = useRef(new Animated.Value(0)).current;
  
  useEffect(() => {
    if (isVisible) {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isVisible, slideAnim, fadeAnim]);

  const handleSave = useCallback(() => {
    Vibration.vibrate(100);
    onClose();
  }, [onClose]);

  if (!isVisible) return null;

  const translateY = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [300, 0],
  });

  return (
    <Modal
      visible={isVisible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <Animated.View
        style={[
          styles.modalOverlay,
          { opacity: fadeAnim },
        ]}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={onClose}
        />
        
        <Animated.View
          style={[
            styles.modalContainer,
            {
              transform: [{ translateY }],
            },
          ]}
        >
          <LinearGradient
            colors={['#0a0a0a', '#1a1a2e', '#16213e']}
            style={styles.modalGradient}
          >
            {/* Header */}
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderLeft}>
                <LinearGradient
                  colors={['rgba(0, 255, 255, 0.3)', 'rgba(147, 112, 219, 0.2)']}
                  style={styles.sectionTypeBadge}
                >
                  <Ionicons
                    name={getSectionIcon(section.config.type)}
                    size={16}
                    color="#00FFFF"
                  />
                  <Text style={styles.sectionTypeText}>
                    {section.config.type.toUpperCase()}
                  </Text>
                </LinearGradient>
              </View>
              
              <TouchableOpacity
                onPress={handleSave}
                style={styles.saveButton}
              >
                <LinearGradient
                  colors={['#00FF41', '#32CD32']}
                  style={styles.saveButtonGradient}
                >
                  <Ionicons name="checkmark" size={18} color="#000" />
                  <Text style={styles.saveButtonText}>SAVE</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>

            {/* Neon Divider */}
            <View style={styles.neonDivider}>
              <LinearGradient
                colors={['transparent', '#00FFFF', 'transparent']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.neonDividerGradient}
              />
            </View>

            {/* Scrollable Content */}
            <View style={styles.scrollableContentContainer}>
              <ScrollView
                style={styles.modalScrollView}
                contentContainerStyle={styles.modalScrollContent}
                showsVerticalScrollIndicator={false}
                onScroll={Animated.event(
                  [{ nativeEvent: { contentOffset: { y: scrollY } } }],
                  { 
                    useNativeDriver: false,
                    listener: (event) => {
                      const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
                      const scrollPercent = contentOffset.y / Math.max(contentSize.height - layoutMeasurement.height, 1);
                      const maxScroll = Math.max(layoutMeasurement.height - 30, 0);
                      const indicatorPosition = scrollPercent * maxScroll;
                      scrollY.setValue(indicatorPosition);
                    }
                  }
                )}
                scrollEventThrottle={16}
              >
{/* Section-Specific Controls */}
                {renderSectionControls(section, userVIP, onSectionUpdate, onSectionStyleUpdate)}
                
{/* Section Background Controls */}
<BackgroundControls
  isSectionBackground={true}
  currentSectionBackground={section.sectionBackground} // This should now be the full object
onSectionBackgroundUpdate={(background) => {
  console.log('🎨 Section background updated:', background);
  // Direct update like post background - no intermediate chain
  onSectionStyleUpdate(section.id, { sectionBackground: background });
}}
  userVIP={userVIP}
  sectionId={section.id}
/>
                
                {/* Non-Background Universal Controls */}
                {renderNonBackgroundControls(section, userVIP, onSectionStyleUpdate)}
              </ScrollView>
              
              {/* Custom Scroll Indicator */}
              <View style={styles.scrollIndicator}>
                <Animated.View style={[styles.scrollIndicatorBar, { transform: [{ translateY: scrollY }] }]}>
                  <LinearGradient
                    colors={['rgba(0, 255, 255, 0.6)', 'rgba(147, 112, 219, 0.4)']}
                    style={styles.scrollIndicatorBarGradient}
                  />
                </Animated.View>
              </View>
            </View>
          </LinearGradient>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

// ================================================================
// MASTER CONTROLS MODAL (NOW JUST POST BACKGROUND)
// ================================================================
export const MasterControlsModal: React.FC<MasterControlsProps> = ({
  isVisible,
  userVIP,
  currentBackground,
  onPostBackgroundUpdate,
  onClose,
}) => {
  const slideAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scrollY = useRef(new Animated.Value(0)).current;
  const [isExtended, setIsExtended] = useState(false);

  useEffect(() => {
    if (isVisible) {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isVisible, slideAnim, fadeAnim]);

  const handleSave = useCallback(() => {
    Vibration.vibrate(100);
    onClose();
  }, [onClose]);

  if (!isVisible) return null;

  const translateY = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [300, 0],
  });

  return (
    <Modal
      visible={isVisible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <Animated.View
        style={[
          styles.modalOverlay,
          { opacity: fadeAnim },
        ]}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={onClose}
        />
        
<Animated.View
          style={[
            styles.modalContainer,
            isExtended ? styles.modalContainerExtended : styles.modalContainerCompact,
            {
              transform: [{ translateY }],
            },
          ]}
        >
          <LinearGradient
            colors={['#0a0a0a', '#1a1a2e', '#16213e']}
            style={styles.modalGradient}
          >
            {/* Header */}
{/* Header */}
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderLeft}>
                <LinearGradient
                  colors={['rgba(255, 215, 0, 0.3)', 'rgba(255, 140, 0, 0.2)']}
                  style={styles.masterBadge}
                >
                  <Ionicons name="color-palette" size={16} color="#FFD700" />
                  <Text style={styles.masterBadgeText}>POST BACKGROUND</Text>
                </LinearGradient>
              </View>

              <View style={styles.modalHeaderRight}>
                <TouchableOpacity
                  onPress={() => {
                    setIsExtended(!isExtended);
                    Vibration.vibrate(50);
                  }}
                  style={styles.extendButton}
                >
                  <LinearGradient
                    colors={isExtended 
                      ? ['rgba(255, 107, 107, 0.2)', 'rgba(255, 99, 71, 0.2)']
                      : ['rgba(0, 255, 255, 0.2)', 'rgba(147, 112, 219, 0.2)']
                    }
                    style={styles.extendButtonGradient}
                  >
                    <Ionicons 
                      name={isExtended ? "contract" : "expand"} 
                      size={16} 
                      color={isExtended ? "#FF6B6B" : "#00FFFF"} 
                    />
                    <Text style={[
                      styles.extendButtonText,
                      { color: isExtended ? "#FF6B6B" : "#00FFFF" }
                    ]}>
                      {isExtended ? "COMPACT" : "EXTEND"}
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>
                
                <TouchableOpacity
                  onPress={handleSave}
                  style={styles.saveButton}
                >
                  <LinearGradient
                    colors={['#00FF41', '#32CD32']}
                    style={styles.saveButtonGradient}
                  >
                    <Ionicons name="checkmark" size={18} color="#000" />
                    <Text style={styles.saveButtonText}>SAVE</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>

            {/* Neon Divider */}
            <View style={styles.neonDivider}>
              <LinearGradient
                colors={['transparent', '#FFD700', 'transparent']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.neonDividerGradient}
              />
            </View>

            {/* Scrollable Content */}
            <View style={styles.scrollableContentContainer}>
              <ScrollView
                style={styles.modalScrollView}
                contentContainerStyle={styles.modalScrollContent}
                showsVerticalScrollIndicator={false}
                onScroll={Animated.event(
                  [{ nativeEvent: { contentOffset: { y: scrollY } } }],
                  { 
                    useNativeDriver: false,
                    listener: (event) => {
                      const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
                      const scrollPercent = contentOffset.y / Math.max(contentSize.height - layoutMeasurement.height, 1);
                      const maxScroll = Math.max(layoutMeasurement.height - 30, 0);
                      const indicatorPosition = scrollPercent * maxScroll;
                      scrollY.setValue(indicatorPosition);
                    }
                  }
                )}
                scrollEventThrottle={16}
              >
<BackgroundControls
  isPostBackground={true}
  currentPostBackground={currentBackground}
  onPostBackgroundUpdate={onPostBackgroundUpdate}
  userVIP={userVIP}
/>
              </ScrollView>
              
              {/* Custom Scroll Indicator */}
              <View style={styles.scrollIndicator}>
                <Animated.View style={[styles.scrollIndicatorBar, { transform: [{ translateY: scrollY }] }]}>
                  <LinearGradient
                    colors={['rgba(255, 215, 0, 0.6)', 'rgba(255, 140, 0, 0.4)']}
                    style={styles.scrollIndicatorBarGradient}
                  />
                </Animated.View>
              </View>
            </View>
          </LinearGradient>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

// ================================================================
// MASTER CONTROLS FLOATING BUTTON
// ================================================================
export const MasterControlsButton: React.FC<{
  onPress: () => void;
  userVIP: boolean;
}> = ({ onPress, userVIP }) => {
  const pulseAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();

    return () => pulse.stop();
  }, [pulseAnim]);

  const glowOpacity = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.8],
  });

  return (
    <TouchableOpacity
      onPress={onPress}
      style={styles.masterButton}
      activeOpacity={0.8}
    >
      {/* Glow Effect */}
      <Animated.View
        style={[
          styles.masterButtonGlow,
          { opacity: glowOpacity },
        ]}
      >
        <LinearGradient
          colors={['rgba(255, 215, 0, 0.4)', 'rgba(255, 140, 0, 0.2)']}
          style={styles.masterButtonGlowGradient}
        />
      </Animated.View>

      {/* Main Button */}
      <LinearGradient
        colors={userVIP 
          ? ['rgba(255, 215, 0, 0.9)', 'rgba(255, 140, 0, 0.7)']
          : ['rgba(255, 215, 0, 0.3)', 'rgba(255, 140, 0, 0.2)']
        }
        style={styles.masterButtonGradient}
      >
        <Ionicons
          name="settings"
          size={20}
          color={userVIP ? "#000" : "#FFD700"}
        />
        {!userVIP && (
          <View style={styles.lockIconContainer}>
            <Ionicons name="lock-closed" size={12} color="#FFD700" />
          </View>
        )}
      </LinearGradient>
    </TouchableOpacity>
  );
};

// ================================================================
// HELPER FUNCTIONS
// ================================================================
const getSectionIcon = (type: string): any => {
  const icons = {
    text: 'text',
    image: 'image',
    quote: 'chatbubble-ellipses',
    table: 'grid',
    video: 'play-circle',
    poll: 'bar-chart',
  };
  return icons[type as keyof typeof icons] || 'document';
};

const renderSectionControls = (
  section: TemplateSection,
  userVIP: boolean,
  onSectionUpdate: (sectionId: string, updates: any) => void,
  onSectionStyleUpdate: (sectionId: string, styleUpdates: any) => void
) => {
  const components = [];

  // Image Size Controls
  if (section.config.type === 'image') {
    components.push(
      <View key="image-size" style={styles.controlGroup}>
        <Text style={styles.controlGroupTitle}>
          <Ionicons name="resize" size={14} color="#00FFFF" /> IMAGE SIZE
        </Text>
        <View style={styles.controlRow}>
          {['Small', 'Medium', 'Large', 'Full'].map((size) => (
            <TouchableOpacity
              key={size}
              style={[
                styles.controlButton,
                section.imageSize === size && styles.controlButtonActive
              ]}
              onPress={() => {
                onSectionUpdate(section.id, { imageSize: size });
                Vibration.vibrate(50);
              }}
            >
              <LinearGradient
                colors={
                  section.imageSize === size
                    ? ['#32CD32', '#228B22']
                    : ['rgba(255, 255, 255, 0.1)', 'rgba(255, 255, 255, 0.05)']
                }
                style={styles.controlButtonGradient}
              >
                <Text style={[
                  styles.controlButtonText,
                  section.imageSize === size && styles.controlButtonTextActive
                ]}>
                  {size.charAt(0)}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  }

  // Quote Style Controls
  if (section.config.type === 'quote') {
    const quoteStyles = [
      { id: 'Gold', color: '#FFD700', icon: '🥇' },
      { id: 'Green', color: '#32CD32', icon: '🟢' },
      { id: 'Blue', color: '#00BFFF', icon: '🔵' },
      { id: 'Clear', color: '#FFFFFF', icon: '⚪' },
    ];

    components.push(
      <View key="quote-style" style={styles.controlGroup}>
        <Text style={styles.controlGroupTitle}>
          <Ionicons name="chatbubble-ellipses" size={14} color="#FFD700" /> QUOTE STYLE
        </Text>
        <View style={styles.controlRow}>
          {quoteStyles.map((style) => (
            <TouchableOpacity
              key={style.id}
              style={[
                styles.controlIconButton,
                section.quoteStyle === style.id && styles.controlIconButtonActive
              ]}
              onPress={() => {
                onSectionUpdate(section.id, { quoteStyle: style.id });
                Vibration.vibrate(50);
              }}
            >
              <LinearGradient
                colors={
                  section.quoteStyle === style.id
                    ? [`${style.color}60`, `${style.color}40`]
                    : ['rgba(255, 255, 255, 0.1)', 'rgba(255, 255, 255, 0.05)']
                }
                style={styles.controlIconButtonGradient}
              >
                <Text style={styles.controlIconText}>{style.icon}</Text>
              </LinearGradient>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  }

  // Table Theme Controls
  if (section.config.type === 'table') {
    const tableThemes = [
      { id: 'blue', color: '#0066CC', icon: '🌊' },
      { id: 'gold', color: '#FFD700', icon: '🏆' },
      { id: 'dark', color: '#333333', icon: '🌙' },
      { id: 'green', color: '#32CD32', icon: '🌿' },
      { id: 'purple', color: '#9370DB', icon: '👑' },
    ];

    components.push(
      <View key="table-theme" style={styles.controlGroup}>
        <Text style={styles.controlGroupTitle}>
          <Ionicons name="grid" size={14} color="#00BFFF" /> TABLE THEME
        </Text>
        <View style={styles.controlRow}>
          {tableThemes.map((theme) => (
            <TouchableOpacity
              key={theme.id}
              style={[
                styles.controlIconButton,
                section.tableData?.styling?.theme === theme.id && styles.controlIconButtonActive
              ]}
              onPress={() => {
                onSectionUpdate(section.id, {
                  tableData: {
                    ...section.tableData,
                    styling: {
                      ...section.tableData?.styling,
                      theme: theme.id
                    }
                  }
                });
                Vibration.vibrate(50);
              }}
            >
              <LinearGradient
                colors={
                  section.tableData?.styling?.theme === theme.id
                    ? [`${theme.color}60`, `${theme.color}40`]
                    : ['rgba(255, 255, 255, 0.1)', 'rgba(255, 255, 255, 0.05)']
                }
                style={styles.controlIconButtonGradient}
              >
                <Text style={styles.controlIconText}>{theme.icon}</Text>
              </LinearGradient>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  }

  return components;
};

// Renamed from renderUniversalControls to renderNonBackgroundControls
// Background controls will be handled by BackgroundControls component
const renderNonBackgroundControls = (
  section: TemplateSection,
  userVIP: boolean,
  onSectionStyleUpdate: (sectionId: string, styleUpdates: any) => void
) => {
  return [
    // Spacing Controls (keeping this here since it's layout, not background)
    <View key="spacing" style={styles.controlGroup}>
      <Text style={styles.controlGroupTitle}>
        <Ionicons name="arrow-down" size={14} color="#00FFFF" /> SPACING
      </Text>
      <View style={styles.controlRow}>
        {[8, 16, 24, 32].map((spacing) => (
          <TouchableOpacity
            key={spacing}
            style={[
              styles.controlButton,
              (section.customStyle?.marginBottom || 16) === spacing && styles.controlButtonActive
            ]}
            onPress={() => {
              onSectionStyleUpdate(section.id, {
                customStyle: {
                  ...section.customStyle,
                  marginBottom: spacing
                }
              });
              Vibration.vibrate(30);
            }}
          >
            <LinearGradient
              colors={
                (section.customStyle?.marginBottom || 16) === spacing
                  ? ['#00FFFF', '#6A5ACD']
                  : ['rgba(255, 255, 255, 0.1)', 'rgba(255, 255, 255, 0.05)']
              }
              style={styles.controlButtonGradient}
            >
              <Text style={[
                styles.controlButtonText,
                (section.customStyle?.marginBottom || 16) === spacing && styles.controlButtonTextActive
              ]}>
                {spacing}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        ))}
      </View>
    </View>,
  ];
};

// ================================================================
// MAIN EXPORTS
// ================================================================
export {
  NeonLiveEditIndicator,
  SectionEditingModal,
  MasterControlsModal,
  MasterControlsButton,
};

// Default export for backward compatibility
const LiveEditingControls = {
  NeonLiveEditIndicator,
  SectionEditingModal,
  MasterControlsModal,
  MasterControlsButton,
};

export default LiveEditingControls;

// ================================================================
// STYLES (Background-related styles removed)
// ================================================================
const styles = StyleSheet.create({
  // Neon Live Edit Indicator
  neonIndicator: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 32,
    height: 32,
    zIndex: 10,
  },
  neonIndicatorActive: {
    // Active state handled by animations
  },
  neonGlowOuter: {
    position: 'absolute',
    top: -8,
    left: -8,
    right: -8,
    bottom: -8,
    borderRadius: 24,
    overflow: 'hidden',
  },
  neonGlowInner: {
    position: 'absolute',
    top: -4,
    left: -4,
    right: -4,
    bottom: -4,
    borderRadius: 20,
    overflow: 'hidden',
  },
  neonGlowGradient: {
    flex: 1,
    borderRadius: 20,
  },
  neonButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 255, 0.3)',
  },
  neonButtonGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Master Controls Button
  masterButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 40,
    height: 40,
    zIndex: 10,
  },
  masterButtonGlow: {
    position: 'absolute',
    top: -8,
    left: -8,
    right: -8,
    bottom: -8,
    borderRadius: 28,
    overflow: 'hidden',
  },
  masterButtonGlowGradient: {
    flex: 1,
    borderRadius: 28,
  },
  masterButtonGradient: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 215, 0, 0.4)',
  },
  lockIconContainer: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    borderRadius: 8,
    padding: 1,
  },

  // Modal Overlay & Container
  modalOverlay: {
    flex: 1,
    backgroundColor: 'transparent',
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
modalContainer: {
    height: SCREEN_HEIGHT * 0.35,
    minHeight: 280,
    maxHeight: 400,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 255, 0.3)',
    shadowColor: '#00FFFF',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 0,
  },
  modalContainerCompact: {
    height: SCREEN_HEIGHT * 0.35,
    minHeight: 280,
    maxHeight: 400,
  },
  modalContainerExtended: {
    height: SCREEN_HEIGHT * 0.75,
    minHeight: 500,
    maxHeight: SCREEN_HEIGHT * 0.9,
  },
  modalGradient: {
    flex: 1,
  },

  // Modal Header
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    paddingBottom: 12,
  },
  modalHeaderLeft: {
    flex: 1,
  },
  sectionTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 6,
    alignSelf: 'flex-start',
  },
  sectionTypeText: {
    color: '#00FFFF',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
  },
  masterBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 6,
    alignSelf: 'flex-start',
  },
  masterBadgeText: {
    color: '#FFD700',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
  },
  saveButton: {
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(50, 205, 50, 0.4)',
  },
  saveButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 6,
  },
  saveButtonText: {
    color: '#000',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.5,
  },

  // Neon Divider
  neonDivider: {
    height: 2,
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 1,
    overflow: 'hidden',
  },
  neonDividerGradient: {
    flex: 1,
  },

  // Modal Content
  modalScrollView: {
    flex: 1,
  },
  modalScrollContent: {
    padding: 16,
    paddingTop: 8,
  },

  // Control Groups
  controlGroup: {
    marginBottom: 20,
  },
  controlGroupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  controlGroupTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 12,
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
  vipBadgeText: {
    color: '#FFD700',
    fontSize: 10,
    fontWeight: '700',
  },

  // Control Rows & Buttons
  controlRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  controlButton: {
    borderRadius: 8,
    overflow: 'hidden',
    flex: 1,
    minWidth: 40,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  controlButtonActive: {
    borderColor: 'rgba(50, 205, 50, 0.6)',
    shadowColor: '#32CD32',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 4,
    elevation: 0,
  },
  controlButtonGradient: {
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  controlButtonText: {
    color: '#CCCCCC',
    fontSize: 12,
    fontWeight: '700',
  },
  controlButtonTextActive: {
    color: '#000',
  },
  controlIconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  controlIconButtonActive: {
    borderColor: 'rgba(0, 255, 255, 0.6)',
    shadowColor: '#00FFFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 4,
    elevation: 0,
  },
  controlIconButtonGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlIconText: {
    fontSize: 16,
  },



  // Custom Scroll Indicator
  scrollableContentContainer: {
    flex: 1,
    position: 'relative',
  },
  scrollIndicator: {
    position: 'absolute',
    right: 4,
    top: 8,
    bottom: 8,
    width: 3,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  scrollIndicatorBar: {
    width: '100%',
    height: 30,
    borderRadius: 2,
  },
  scrollIndicatorBarGradient: {
    flex: 1,
    borderRadius: 2,
  },
  modalHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  extendButton: {
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 255, 0.3)',
  },
  extendButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 4,
  },
  extendButtonText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});