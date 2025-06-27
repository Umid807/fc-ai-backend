import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Vibration,
  Animated,
  Dimensions,
  ScrollView,
  PanResponder,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

// Types
interface BackgroundControlsProps {
  // For Post Background
  isPostBackground?: boolean;
  currentPostBackground?: any;
  onPostBackgroundUpdate?: (background: any) => void;
  
  // For Section Background
  isSectionBackground?: boolean;
  currentSectionBackground?: any; // Changed from string to any
  onSectionBackgroundUpdate?: (background: any) => void; // Changed from string to any
  
  // Common
  userVIP: boolean;
  sectionId?: string; // For section backgrounds
}

interface ColorOption {
  id: string;
  name: string;
  color: string;
  locked: boolean;
}

interface GradientPreset {
  id: string;
  name: string;
  colors: string[];
  locked: boolean;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Security: Input validation functions
const isValidHexColor = (color: string): boolean => {
  if (!color || typeof color !== 'string') return false;
  const hexRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
  return hexRegex.test(color);
};

const sanitizeOpacity = (opacity: number): number => {
  if (typeof opacity !== 'number' || isNaN(opacity)) return 0.3;
  return Math.max(0.0, Math.min(1.0, opacity)); 
};

const sanitizeColorArray = (colors: string[]): string[] => {
  if (!Array.isArray(colors)) return ['#000000', '#333333'];
  const validColors = colors.filter(isValidHexColor);
  return validColors.length >= 2 ? validColors.slice(0, 5) : ['#000000', '#333333'];
};

// Helper function to convert hex to rgba
const hexToRgba = (hex: string, alpha: number): string => {
  if (!isValidHexColor(hex)) return `rgba(0, 0, 0, ${alpha})`;
  
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${sanitizeOpacity(alpha)})`;
};

// Helper function to get opacity hex
const getOpacityHex = (opacity: number): string => {
  const sanitizedOpacity = sanitizeOpacity(opacity);
  return Math.round(sanitizedOpacity * 255).toString(16).padStart(2, '0').toUpperCase();
};

// ================================================================
// MAIN BACKGROUND CONTROLS COMPONENT
// ================================================================
export const BackgroundControls: React.FC<BackgroundControlsProps> = ({
  isPostBackground = false,
  currentPostBackground,
  onPostBackgroundUpdate,
  isSectionBackground = false,
  currentSectionBackground,
  onSectionBackgroundUpdate,
  userVIP,
  sectionId,
}) => {
  // State for custom gradient builder
  const [showCustomGradient, setShowCustomGradient] = useState(false);
  const [customColors, setCustomColors] = useState(['#000000', '#333333', '#666666']);
  const [globalOpacity, setGlobalOpacity] = useState(0.3);
  const [activeColorIndex, setActiveColorIndex] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  // Animation refs - All separate to avoid conflicts
  const slideAnim = useRef(new Animated.Value(0)).current;
  const dragScale = useRef(new Animated.Value(1)).current;
const glowAnim = useRef(new Animated.Value(0)).current;
const knobGlow = useRef(new Animated.Value(0.3)).current;
  // Refs for cleanup
  const isMountedRef = useRef(true);

  // Initialize animations
  useEffect(() => {
    isMountedRef.current = true;

    
    
return () => {
  isMountedRef.current = false;
  slideAnim.stopAnimation();
  dragScale.stopAnimation();
  glowAnim.stopAnimation();
  knobGlow.stopAnimation();
};
}, [slideAnim, dragScale, glowAnim, knobGlow]); 

  // ================================================================
  // COLOR PALETTES - Memoized for performance
  // ================================================================
  const solidColors: ColorOption[] = useMemo(() => [
    { id: 'navy', name: 'Deep Navy', color: '#001122', locked: false },
    { id: 'purple', name: 'Royal Purple', color: '#2D1B69', locked: false },
    { id: 'emerald', name: 'Emerald', color: '#004225', locked: !userVIP },
    { id: 'crimson', name: 'Crimson', color: '#4A0E0E', locked: !userVIP },
    { id: 'gold', name: 'Gold', color: '#3D2914', locked: !userVIP },
    { id: 'cyan', name: 'Cyber Cyan', color: '#001A1A', locked: !userVIP },
    { id: 'rose', name: 'Rose Gold', color: '#2D1A1A', locked: !userVIP },
  ], [userVIP]);

  const gradientPresets: GradientPreset[] = useMemo(() => [
    {
      id: 'cosmic',
      name: 'Cosmic Depths',
      colors: ['#000000', '#1a1a2e', '#16213e'],
      locked: false,
    },
    {
      id: 'neon-night',
      name: 'Neon Night',
      colors: ['#0a0a0a', '#1a0033', '#330066'],
      locked: !userVIP,
    },
    {
      id: 'aurora',
      name: 'Aurora',
      colors: ['#001122', '#003366', '#006699'],
      locked: !userVIP,
    },
    {
      id: 'sunset',
      name: 'Sunset Glow',
      colors: ['#FF4500', '#FF6347', '#FFD700'],
      locked: !userVIP,
    },
    {
      id: 'ocean',
      name: 'Deep Ocean',
      colors: ['#003366', '#0066CC', '#00CCFF'],
      locked: !userVIP,
    },
  ], [userVIP]);

  const colorPalette = useMemo(() => [
    '#000000', '#1a1a1a', '#333333', '#4a4a4a', '#666666',
    '#800000', '#cc0000', '#ff3333', '#ff6666', '#ff9999',
    '#0066cc', '#0080ff', '#3399ff', '#66b3ff', '#99ccff',
    '#006600', '#009900', '#00cc00', '#33ff33', '#66ff66',
    '#663399', '#8000ff', '#9933ff', '#b366ff', '#cc99ff',
    '#ff6600', '#ff8800', '#ffaa00', '#ffcc00', '#ffdd33',
    '#cc00cc', '#ff00ff', '#ff33ff', '#ff66ff', '#ff99ff',
    '#004466', '#006688', '#0088aa', '#00aacc', '#00ccee',
  ], []);

  // ================================================================
  // DRAGGABLE SLIDER LOGIC
  // ================================================================
  const sliderWidth = SCREEN_WIDTH - 80;
  const knobSize = 28;
  const trackHeight = 8;
const minOpacity = 0.0;  
const maxOpacity = 1.0;

const handleSliderMove = useCallback((gestureX: number) => {
  if (!isMountedRef.current) return;
  
  const clampedX = Math.max(0, Math.min(gestureX, sliderWidth - knobSize));
  const normalizedPosition = clampedX / (sliderWidth - knobSize);
  const newOpacity = minOpacity + (normalizedPosition * (maxOpacity - minOpacity));
  const roundedOpacity = Math.round(newOpacity * 100) / 100;
  const finalOpacity = sanitizeOpacity(roundedOpacity);
  
  setGlobalOpacity(finalOpacity);
  
  // Get fresh background state and update it - POST BACKGROUND (EXISTING - UNCHANGED)
  if (onPostBackgroundUpdate) {
    // Use functional setState to get current background
    onPostBackgroundUpdate(prevBackground => {
      if (!prevBackground) return prevBackground;
      
      const updatedBackground = { ...prevBackground };
      updatedBackground.opacity = finalOpacity;
      
      if (updatedBackground.type === 'gradient' && updatedBackground.originalColors) {
        updatedBackground.colors = updatedBackground.originalColors.map(color => 
          `${color}${getOpacityHex(finalOpacity)}`
        );
      }
      
      return updatedBackground;
    });
  }
  
// SECTION BACKGROUND - EXACT COPY of post background logic
if (onSectionBackgroundUpdate) {
  // Use functional setState to get current background (SAME AS POST)
  onSectionBackgroundUpdate(prevBackground => {
    if (!prevBackground) return prevBackground;
    
    const updatedBackground = { ...prevBackground };
    updatedBackground.opacity = finalOpacity;
    
    if (updatedBackground.type === 'gradient' && updatedBackground.originalColors) {
      updatedBackground.colors = updatedBackground.originalColors.map(color => 
        `${color}${getOpacityHex(finalOpacity)}`
      );
    }
    
    return updatedBackground;
  });
}
}, [sliderWidth, knobSize, minOpacity, maxOpacity, onPostBackgroundUpdate, onSectionBackgroundUpdate]);

  // PanResponder for draggable slider

const panResponder = useRef(
  PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    
    onPanResponderGrant: () => {
      if (!isMountedRef.current) return;
      setIsDragging(true);
      Animated.spring(dragScale, {
        toValue: 1.2,
        useNativeDriver: true,
      }).start();
    },
    
    onPanResponderMove: (evt, gestureState) => {
      if (!isMountedRef.current) return;
      const containerLeft = 40;
      const relativeX = gestureState.moveX - containerLeft;
      handleSliderMove(relativeX);
    },
    
    onPanResponderRelease: () => {
      if (!isMountedRef.current) return;
      setIsDragging(false);
      Animated.spring(dragScale, {
        toValue: 1,
        useNativeDriver: true,
      }).start();
    },
  })
).current;

const knobPosition = useMemo(() => {
  const normalizedOpacity = (globalOpacity - minOpacity) / (maxOpacity - minOpacity);
  return normalizedOpacity * (sliderWidth - knobSize);
}, [globalOpacity, sliderWidth, knobSize, minOpacity, maxOpacity]); // Added minOpacity, maxOpacity

  // ================================================================
  // HANDLERS - Memoized for performance
  // ================================================================
const handleSolidColorSelect = useCallback((color: ColorOption) => {
    if (!isMountedRef.current) return;
    
    if (color.locked) {
      Vibration.vibrate([50, 50, 50]);
      return;
    }

    if (!isValidHexColor(color.color)) {
      console.warn('Invalid color format:', color.color);
      return;
    }

    Vibration.vibrate(50);
    
    const background = {
      type: 'solid',
      id: color.id,
      color: color.color,
      opacity: sanitizeOpacity(globalOpacity),
    };

    if (isPostBackground && onPostBackgroundUpdate) {
      onPostBackgroundUpdate(background);
    } else if (isSectionBackground && onSectionBackgroundUpdate) {
      onSectionBackgroundUpdate(background);  // Now passing the full background object for sections too
    }
  }, [globalOpacity, isPostBackground, isSectionBackground, onPostBackgroundUpdate, onSectionBackgroundUpdate]);
const handleGradientPresetSelect = useCallback((gradient: GradientPreset) => {
    if (!isMountedRef.current) return;
    
    if (gradient.locked) {
      Vibration.vibrate([50, 50, 50]);
      return;
    }

    const sanitizedColors = sanitizeColorArray(gradient.colors);
    if (sanitizedColors.length < 2) {
      console.warn('Invalid gradient colors:', gradient.colors);
      return;
    }

    Vibration.vibrate(100);
    
    const colorsWithOpacity = sanitizedColors.map(color => 
      `${color}${getOpacityHex(globalOpacity)}`
    );
    
    const background = {
      type: 'gradient',
      id: gradient.id,
      colors: colorsWithOpacity,
      originalColors: sanitizedColors,
      opacity: sanitizeOpacity(globalOpacity),
    };

    if (isPostBackground && onPostBackgroundUpdate) {
      onPostBackgroundUpdate(background);
    } else if (isSectionBackground && onSectionBackgroundUpdate) {
      onSectionBackgroundUpdate(background);  // Now passing full background object for sections too
    }
  }, [globalOpacity, isPostBackground, isSectionBackground, onPostBackgroundUpdate, onSectionBackgroundUpdate]);

  const handleCustomGradientApply = useCallback(() => {
    if (!isMountedRef.current) return;
    
    Vibration.vibrate(100);
    
    const validatedColors = sanitizeColorArray(customColors);
    
    if (validatedColors.length < 2) {
      console.warn('Custom gradient needs at least 2 valid colors');
      Vibration.vibrate([100, 100, 100]); // Error vibration
      return;
    }
    
    const colorsWithOpacity = validatedColors.map(color => 
      `${color}${getOpacityHex(globalOpacity)}`
    );
    
    const background = {
      type: 'gradient',
      id: 'custom',
      colors: colorsWithOpacity,
      originalColors: validatedColors,
      opacity: sanitizeOpacity(globalOpacity),
    };

    if (isPostBackground && onPostBackgroundUpdate) {
      onPostBackgroundUpdate(background);
    }
  }, [customColors, globalOpacity, isPostBackground, onPostBackgroundUpdate]);

  const handleOpacityChange = useCallback((opacity: number) => {
  if (!isMountedRef.current) return;
  
  const sanitizedOpacity = sanitizeOpacity(opacity);
  setGlobalOpacity(sanitizedOpacity);
  
  // Handle Post Background
  if (currentPostBackground && onPostBackgroundUpdate) {
    const updatedBackground = { ...currentPostBackground };
    updatedBackground.opacity = sanitizedOpacity;
    
    if (updatedBackground.type === 'gradient' && updatedBackground.originalColors) {
      updatedBackground.colors = updatedBackground.originalColors.map(color => 
        `${color}${getOpacityHex(sanitizedOpacity)}`
      );
    }
    
    onPostBackgroundUpdate(updatedBackground);
  }
  
  // Handle Section Background (NEW - this was missing!)
  if (currentSectionBackground && onSectionBackgroundUpdate) {
    const updatedBackground = { ...currentSectionBackground };
    updatedBackground.opacity = sanitizedOpacity;
    
    if (updatedBackground.type === 'gradient' && updatedBackground.originalColors) {
      updatedBackground.colors = updatedBackground.originalColors.map(color => 
        `${color}${getOpacityHex(sanitizedOpacity)}`
      );
    }
    
    onSectionBackgroundUpdate(updatedBackground);
  }
}, [currentPostBackground, onPostBackgroundUpdate, currentSectionBackground, onSectionBackgroundUpdate]);


  const handleColorPickerSelect = useCallback((color: string) => {
    if (!isMountedRef.current || !isValidHexColor(color)) return;
    
    const newColors = [...customColors];
    const safeIndex = Math.max(0, Math.min(activeColorIndex, newColors.length - 1));
    newColors[safeIndex] = color;
    setCustomColors(newColors);
    Vibration.vibrate(50);
  }, [customColors, activeColorIndex]);

const handleClearBackground = useCallback(() => {
    if (!isMountedRef.current) return;
    
    Vibration.vibrate(50);
    
    if (isPostBackground && onPostBackgroundUpdate) {
      onPostBackgroundUpdate(null);
    } else if (isSectionBackground && onSectionBackgroundUpdate) {
      onSectionBackgroundUpdate(null);
    }
  }, [isPostBackground, isSectionBackground, onPostBackgroundUpdate, onSectionBackgroundUpdate]);

  const handleAddColor = useCallback(() => {
    if (!isMountedRef.current || customColors.length >= 5) return;
    
    const newColors = [...customColors, '#666666'];
    setCustomColors(newColors);
    Vibration.vibrate(50);
  }, [customColors]);

  const handleRemoveColor = useCallback(() => {
    if (!isMountedRef.current || customColors.length <= 2) return;
    
    const newColors = [...customColors];
    const safeIndex = Math.max(0, Math.min(activeColorIndex, newColors.length - 1));
    newColors.splice(safeIndex, 1);
    setCustomColors(newColors);
    setActiveColorIndex(Math.max(0, safeIndex - 1));
    Vibration.vibrate(50);
  }, [customColors, activeColorIndex]);

  // ================================================================
  // RENDER FUNCTIONS
  // ================================================================
const renderSolidColors = () => (
    <View style={styles.controlGroup}>
      <Text style={styles.controlGroupTitle}>
        <Ionicons name="radio-button-on" size={14} color="#00FFFF" /> SOLID COLORS
      </Text>
      <View style={styles.colorGrid}>
        {solidColors.map((color) => {
          // Only show as active if the background was actually selected as this specific color
// Not just if it happens to have the same ID due to updates
const isActive = (
  (isPostBackground && currentPostBackground?.id === color.id && currentPostBackground?.type === 'solid') ||
  (isSectionBackground && currentSectionBackground?.id === color.id && currentSectionBackground?.type === 'solid')
);
          
          return (
            <TouchableOpacity
              key={color.id}
              style={[
                styles.colorOption,
                isActive && styles.colorOptionActive,
                color.locked && styles.colorOptionLocked,
              ]}
              onPress={() => handleSolidColorSelect(color)}
              disabled={color.locked}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={[
                  hexToRgba(color.color, 1), 
                  hexToRgba(color.color, 0.8)
                ]}
                style={styles.colorOptionGradient}
              >
                <Text style={styles.colorOptionText}>{color.name}</Text>
                {color.locked && (
                  <View style={styles.lockOverlay}>
                    <Ionicons name="lock-closed" size={16} color="rgba(255, 215, 0, 0.8)" />
                  </View>
                )}
              </LinearGradient>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );

  const renderGradientPresets = () => (
    <View style={styles.controlGroup}>
      <View style={styles.controlGroupHeader}>
        <Text style={styles.controlGroupTitle}>
          <Ionicons name="color-filter" size={14} color="#9370DB" /> GRADIENT PRESETS
        </Text>
        {!userVIP && (
          <View style={styles.vipBadge}>
            <Ionicons name="lock-closed" size={12} color="#FFD700" />
            <Text style={styles.vipBadgeText}>VIP</Text>
          </View>
        )}
      </View>
      <View style={styles.gradientGrid}>
        {gradientPresets.map((gradient) => {
          const isActive = (
  (isPostBackground && currentPostBackground?.id === gradient.id && currentPostBackground?.type === 'gradient') ||
  (isSectionBackground && currentSectionBackground?.id === gradient.id && currentSectionBackground?.type === 'gradient')
);
          
          return (
            <TouchableOpacity
              key={gradient.id}
              style={[
                styles.gradientOption,
                isActive && styles.gradientOptionActive,
                gradient.locked && styles.gradientOptionLocked,
              ]}
              onPress={() => handleGradientPresetSelect(gradient)}
              disabled={gradient.locked}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={gradient.colors}
                style={styles.gradientOptionBackground}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Text style={styles.gradientOptionText}>{gradient.name}</Text>
                {gradient.locked && (
                  <View style={styles.lockOverlay}>
                    <Ionicons name="lock-closed" size={20} color="rgba(255, 215, 0, 0.8)" />
                  </View>
                )}
              </LinearGradient>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );

  const renderCustomGradientBuilder = () => {
    const sanitizedColors = sanitizeColorArray(customColors);
    const previewColors = sanitizedColors.map(color => 
      `${color}${getOpacityHex(globalOpacity)}`
    );

    return (
      <View style={styles.controlGroup}>
        <View style={styles.controlGroupHeader}>
          <Text style={styles.controlGroupTitle}>
            <Ionicons name="brush" size={14} color="#FF6B35" /> CUSTOM GRADIENT
          </Text>
          <TouchableOpacity
            onPress={() => setShowCustomGradient(!showCustomGradient)}
            style={styles.toggleButton}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={showCustomGradient ? ['#FF6B35', '#F7931E'] : ['rgba(255, 255, 255, 0.1)', 'rgba(255, 255, 255, 0.05)']}
              style={styles.toggleButtonGradient}
            >
              <Ionicons 
                name={showCustomGradient ? "chevron-up" : "chevron-down"} 
                size={16} 
                color={showCustomGradient ? "#000" : "#CCCCCC"} 
              />
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {showCustomGradient && (
          <View style={styles.customGradientContainer}>
            {/* Real-time Gradient Preview */}
            <View style={styles.gradientPreview}>
              <LinearGradient
                colors={previewColors.length >= 2 ? previewColors : ['#000000', '#333333']}
                style={styles.gradientPreviewBackground}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Text style={styles.gradientPreviewText}>
                  Live Preview ({Math.round(globalOpacity * 100)}%)
                </Text>
              </LinearGradient>
            </View>

            {/* Color Slots */}
            <View style={styles.colorSlots}>
              {customColors.map((color, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.colorSlot,
                    activeColorIndex === index && styles.colorSlotActive,
                  ]}
                  onPress={() => {
                    setActiveColorIndex(index);
                    Vibration.vibrate(30);
                  }}
                  activeOpacity={0.8}
                >
                  <View style={[
                    styles.colorSlotPreview, 
                    { backgroundColor: isValidHexColor(color) ? color : '#666666' }
                  ]} />
                  <Text style={styles.colorSlotText}>Color {index + 1}</Text>
                  <Text style={[styles.colorSlotText, { fontSize: 8, color: '#666' }]}>
                    {isValidHexColor(color) ? color : 'Invalid'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Add/Remove Color Buttons */}
            <View style={styles.colorManagementRow}>
              <TouchableOpacity
                style={styles.colorManagementButton}
                onPress={handleAddColor}
                disabled={customColors.length >= 5}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={customColors.length < 5 ? ['#00FF41', '#32CD32'] : ['#666666', '#444444']}
                  style={styles.colorManagementButtonGradient}
                >
                  <Ionicons name="add" size={16} color={customColors.length < 5 ? "#000" : "#888"} />
                  <Text style={[styles.colorManagementButtonText, { color: customColors.length < 5 ? "#000" : "#888" }]}>
                    ADD COLOR
                  </Text>
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.colorManagementButton}
                onPress={handleRemoveColor}
                disabled={customColors.length <= 2}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={customColors.length > 2 ? ['#FF6B6B', '#FF4444'] : ['#666666', '#444444']}
                  style={styles.colorManagementButtonGradient}
                >
                  <Ionicons name="remove" size={16} color={customColors.length > 2 ? "#000" : "#888"} />
                  <Text style={[styles.colorManagementButtonText, { color: customColors.length > 2 ? "#000" : "#888" }]}>
                    REMOVE
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>

            {/* Color Picker Grid */}
            <View style={styles.colorPickerGrid}>
              {colorPalette.map((color, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.colorPickerOption,
                    customColors[activeColorIndex] === color && styles.colorPickerOptionActive,
                  ]}
                  onPress={() => handleColorPickerSelect(color)}
                  activeOpacity={0.8}
                >
                  <View style={[styles.colorPickerSwatch, { backgroundColor: color }]} />
                </TouchableOpacity>
              ))}
            </View>

            {/* Apply Button */}
            <TouchableOpacity
              style={styles.applyButton}
              onPress={handleCustomGradientApply}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#00FF41', '#32CD32']}
                style={styles.applyButtonGradient}
              >
                <Ionicons name="checkmark-circle" size={18} color="#000" />
                <Text style={styles.applyButtonText}>APPLY CUSTOM GRADIENT</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  const renderDraggableOpacityControl = () => (
    <View style={styles.controlGroup}>
      <Text style={styles.controlGroupTitle}>
        <Ionicons name="water" size={14} color="#32CD32" /> OPACITY: {Math.round(globalOpacity * 100)}%
      </Text>
      
      <View style={styles.opacitySliderContainer}>
        {/* Slider Track */}
        <View style={[styles.opacityTrack, { width: sliderWidth, height: trackHeight }]}>
          <LinearGradient
            colors={[
              'rgba(50, 205, 50, 0.1)', 
              'rgba(50, 205, 50, 0.4)', 
              'rgba(0, 255, 255, 0.6)', 
              'rgba(0, 255, 255, 0.8)'
            ]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.opacityTrackGradient}
          />
          
          {/* Active Track */}
          <View
            style={[
              styles.opacityActiveTrack,
              {
                width: knobPosition + knobSize / 2,
                backgroundColor: '#32CD32', // Use static color instead of interpolation
              },
            ]}
          />
        </View>

        {/* Draggable Knob */}
        <Animated.View
          style={[
            styles.opacityKnob,
            {
              left: knobPosition,
              width: knobSize,
              height: knobSize,
              transform: [
                { scale: dragScale },
                {
                  scale: glowAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [1, 1.05],
                  }),
                },
              ],
            },
          ]}
          {...panResponder.panHandlers}
        >
          {/* Knob Glow Effect */}
          <Animated.View
            style={[
              styles.opacityKnobGlow,
              {
                opacity: knobGlow, // Use separate animation for opacity
              },
            ]}
          >
            <LinearGradient
              colors={['rgba(0, 255, 255, 0.6)', 'transparent']}
              style={styles.opacityKnobGlowGradient}
            />
          </Animated.View>

          {/* Main Knob */}
          <LinearGradient
            colors={['#00FFFF', '#32CD32', '#00FFFF']}
            style={styles.opacityKnobGradient}
          >
            <View style={styles.opacityKnobInner}>
              <Text style={styles.opacityKnobText}>
                {Math.round(globalOpacity * 100)}
              </Text>
            </View>
          </LinearGradient>
        </Animated.View>

{/* Range Labels */}
<View style={styles.opacityLabels}>
  <Text style={styles.opacityLabelText}>0%</Text>
  <Text style={styles.opacityLabelText}>100%</Text>
</View>
      </View>

      {/* Quick Presets */}
      <View style={styles.opacityPresets}>
        <Text style={styles.opacityPresetsTitle}>Quick Presets:</Text>
        <View style={styles.opacityPresetsRow}>
          {[0.25, 0.5, 0.75, 1.0].map((opacity) => (
            <TouchableOpacity
              key={opacity}
              style={[
                styles.opacityPresetButton,
                Math.abs(globalOpacity - opacity) < 0.05 && styles.opacityPresetButtonActive,
              ]}
              onPress={() => handleOpacityChange(opacity)}
              activeOpacity={0.8}
            >
              <Text style={[
                styles.opacityPresetButtonText,
                Math.abs(globalOpacity - opacity) < 0.05 && styles.opacityPresetButtonTextActive,
              ]}>
                {Math.round(opacity * 100)}%
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <Text style={styles.opacityDescription}>
        Drag the slider or tap presets • Lower opacity preserves text readability
      </Text>
    </View>
  );


  const renderClearButton = () => (
    <TouchableOpacity
      style={styles.clearButton}
      onPress={handleClearBackground}
      activeOpacity={0.8}
    >
      <LinearGradient
        colors={['rgba(255, 69, 69, 0.2)', 'rgba(255, 99, 71, 0.2)']}
        style={styles.clearButtonGradient}
      >
        <Ionicons name="close-circle" size={18} color="#FF6B6B" />
        <Text style={styles.clearButtonText}>CLEAR BACKGROUND</Text>
      </LinearGradient>
    </TouchableOpacity>
  );

  // ================================================================
  // MAIN RENDER
  // ================================================================
  useEffect(() => {
    if (showCustomGradient) {
      Animated.timing(slideAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true, // Make this native too
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [showCustomGradient, slideAnim]);

  return (
    <ScrollView 
      style={styles.container} 
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {/* Clear Button */}
      {renderClearButton()}

      {/* Current Background Info */}
      {currentPostBackground && (
        <View style={styles.currentBackgroundInfo}>
          <LinearGradient
            colors={['rgba(0, 255, 255, 0.1)', 'rgba(0, 255, 255, 0.05)']}
            style={styles.currentBackgroundInfoGradient}
          >
            <Ionicons name="information-circle" size={16} color="#00FFFF" />
            <View style={styles.currentBackgroundInfoText}>
              <Text style={styles.currentBackgroundTitle}>
                Current: {currentPostBackground.type === 'gradient' ? 'Gradient' : 'Solid'} - {currentPostBackground.id}
              </Text>
              <Text style={styles.currentBackgroundDetails}>
                Opacity: {Math.round((currentPostBackground.opacity || 0.3) * 100)}%
              </Text>
            </View>
          </LinearGradient>
        </View>
      )}

      {/* Solid Colors */}
      {renderSolidColors()}

      {/* Gradient Presets (Post backgrounds only) */}
      {isPostBackground && renderGradientPresets()}

      {/* Custom Gradient Builder (Post backgrounds only) */}
      {isPostBackground && renderCustomGradientBuilder()}

      {/* Draggable Opacity Control (Post backgrounds only) */}
      {isPostBackground && renderDraggableOpacityControl()}

{/* Section Background Controls - Modified to exclude draggable opacity */}
      {isSectionBackground && (
        <>
          {/* Gradient Presets */}
          {renderGradientPresets()}
          
          {/* Custom Gradient Builder */}
          {renderCustomGradientBuilder()}
          
          {/* Simple Opacity Presets Only for Sections */}
          <View style={styles.controlGroup}>
            <Text style={styles.controlGroupTitle}>
              <Ionicons name="water" size={14} color="#32CD32" /> OPACITY: {Math.round(globalOpacity * 100)}%
            </Text>
            
            {/* Quick Presets Only */}
            <View style={styles.opacityPresets}>
              <Text style={styles.opacityPresetsTitle}>Quick Presets:</Text>
              <View style={styles.opacityPresetsRow}>
                {[0.25, 0.5, 0.75, 1.0].map((opacity) => (
                  <TouchableOpacity
                    key={opacity}
                    style={[
                      styles.opacityPresetButton,
                      Math.abs(globalOpacity - opacity) < 0.05 && styles.opacityPresetButtonActive,
                    ]}
                    onPress={() => handleOpacityChange(opacity)}
                    activeOpacity={0.8}
                  >
                    <Text style={[
                      styles.opacityPresetButtonText,
                      Math.abs(globalOpacity - opacity) < 0.05 && styles.opacityPresetButtonTextActive,
                    ]}>
                      {Math.round(opacity * 100)}%
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <Text style={styles.opacityDescription}>
              Tap presets to adjust opacity • Lower opacity preserves text readability
            </Text>
          </View>
        </>
      )}

      {/* Info Footer */}
      <View style={styles.infoFooter}>
        <LinearGradient
          colors={['rgba(0, 255, 255, 0.1)', 'transparent']}
          style={styles.infoFooterGradient}
        >
          <Ionicons name="information-circle" size={14} color="#00FFFF" />
          <Text style={styles.infoFooterText}>
            {isPostBackground 
              ? 'Backgrounds are applied as overlays to preserve text readability. Drag opacity slider for precise control.'
              : 'Section backgrounds affect individual content blocks'
            }
          </Text>
        </LinearGradient>
      </View>
    </ScrollView>
  );
};

// ================================================================
// ENHANCED STYLES - Production Ready
// ================================================================
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },

  // Control Groups
  controlGroup: {
    marginBottom: 24,
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

  // Current Background Info
  currentBackgroundInfo: {
    marginBottom: 20,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 255, 0.3)',
  },
  currentBackgroundInfoGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 8,
  },
  currentBackgroundInfoText: {
    flex: 1,
  },
  currentBackgroundTitle: {
    color: '#00FFFF',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 2,
  },
  currentBackgroundDetails: {
    color: '#888',
    fontSize: 10,
  },

  // Clear Button
  clearButton: {
    marginBottom: 20,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 107, 0.4)',
  },
  clearButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 8,
  },
  clearButtonText: {
    color: '#FF6B6B',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.5,
  },

  // Solid Colors
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  colorOption: {
    width: (SCREEN_WIDTH - 80) / 2 - 4,
    height: 50,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  colorOptionActive: {
    borderColor: 'rgba(0, 255, 255, 0.8)',
    shadowColor: '#00FFFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
    elevation: Platform.OS === 'android' ? 8 : 0,
  },
  colorOptionLocked: {
    opacity: 0.6,
  },
  colorOptionGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  colorOptionText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },

  // Gradient Presets
  gradientGrid: {
    gap: 8,
  },
  gradientOption: {
    height: 60,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  gradientOptionActive: {
    borderColor: 'rgba(147, 112, 219, 0.8)',
    shadowColor: '#9370DB',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
    elevation: Platform.OS === 'android' ? 8 : 0,
  },
  gradientOptionLocked: {
    opacity: 0.6,
  },
  gradientOptionBackground: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  gradientOptionText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },

  // Toggle Button
  toggleButton: {
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  toggleButtonGradient: {
    paddingHorizontal: 8,
    paddingVertical: 6,
  },

  // Custom Gradient Builder
  customGradientContainer: {
    marginTop: 12,
  },
  gradientPreview: {
    height: 60,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 16,
    borderWidth: 2,
    borderColor: 'rgba(255, 107, 53, 0.4)',
  },
  gradientPreviewBackground: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gradientPreviewText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },

  // Color Slots
  colorSlots: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  colorSlot: {
    flex: 1,
    alignItems: 'center',
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  colorSlotActive: {
    borderColor: 'rgba(255, 107, 53, 0.8)',
    backgroundColor: 'rgba(255, 107, 53, 0.1)',
  },
  colorSlotPreview: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  colorSlotText: {
    color: '#CCCCCC',
    fontSize: 10,
    fontWeight: '600',
  },

  // Color Management
  colorManagementRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  colorManagementButton: {
    flex: 1,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  colorManagementButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    gap: 4,
  },
  colorManagementButtonText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
  },

  // Color Picker Grid
  colorPickerGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 16,
  },
  colorPickerOption: {
    width: 28,
    height: 28,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  colorPickerOptionActive: {
    borderWidth: 3,
    borderColor: '#FF6B35',
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 4,
    elevation: Platform.OS === 'android' ? 4 : 0,
  },
  colorPickerSwatch: {
    flex: 1,
  },

  // Apply Button
  applyButton: {
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(50, 205, 50, 0.4)',
  },
  applyButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 8,
  },
  applyButtonText: {
    color: '#000',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.5,
  },

  // Draggable Opacity Slider
  opacitySliderContainer: {
    paddingVertical: 20,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  opacityTrack: {
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    overflow: 'hidden',
    position: 'relative',
  },
  opacityTrackGradient: {
    flex: 1,
    borderRadius: 4,
  },
  opacityActiveTrack: {
    position: 'absolute',
    top: 0,
    left: 0,
    height: '100%',
    borderRadius: 4,
  },
  opacityKnob: {
    position: 'absolute',
    top: -10, // Center on track
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#00FFFF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
  },
  opacityKnobGlow: {
    position: 'absolute',
    top: -8,
    left: -8,
    right: -8,
    bottom: -8,
    borderRadius: 22,
  },
  opacityKnobGlowGradient: {
    flex: 1,
    borderRadius: 22,
  },
  opacityKnobGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 14,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  opacityKnobInner: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
  },
  opacityKnobText: {
    color: '#000',
    fontSize: 10,
    fontWeight: '900',
    textShadowColor: 'rgba(255, 255, 255, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
  opacityLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 12,
    paddingHorizontal: 14,
  },
  opacityLabelText: {
    color: '#888',
    fontSize: 12,
    fontWeight: '600',
  },

  // Quick Presets
  opacityPresets: {
    marginTop: 16,
    alignItems: 'center',
  },
  opacityPresetsTitle: {
    color: '#CCCCCC',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
  },
  opacityPresetsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  opacityPresetButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  opacityPresetButtonActive: {
    borderColor: '#32CD32',
    backgroundColor: 'rgba(50, 205, 50, 0.2)',
  },
  opacityPresetButtonText: {
    color: '#CCCCCC',
    fontSize: 11,
    fontWeight: '600',
  },
  opacityPresetButtonTextActive: {
    color: '#32CD32',
    fontWeight: '700',
  },
  opacityDescription: {
    color: '#888',
    fontSize: 12,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 16,
  },

  // Section Background Controls
  sectionBackgroundGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  sectionBackgroundOption: {
    flex: 1,
    height: 60,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  sectionBackgroundOptionActive: {
    borderColor: 'rgba(147, 112, 219, 0.6)',
    shadowColor: '#9370DB',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 4,
    elevation: Platform.OS === 'android' ? 4 : 0,
  },
  sectionBackgroundOptionGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  sectionBackgroundOptionText: {
    color: '#CCCCCC',
    fontSize: 12,
    fontWeight: '600',
  },
  sectionBackgroundOptionTextActive: {
    color: '#9370DB',
    fontWeight: '700',
  },

  // Lock Overlay
  lockOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Info Footer
  infoFooter: {
    marginTop: 8,
    marginBottom: 16,
    borderRadius: 8,
    overflow: 'hidden',
  },
  infoFooterGradient: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
    gap: 8,
  },
  infoFooterText: {
    color: '#888',
    fontSize: 12,
    flex: 1,
    lineHeight: 16,
  },
});

export default BackgroundControls;