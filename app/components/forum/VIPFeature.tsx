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
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { secureLog } from '../../utils/security';

// Types
interface VIPFont {
  id: string;
  name: string;
  value: string;
  preview: string;
  description: string;
  category: 'futuristic' | 'modern' | 'gaming';
}

interface VIPColor {
  id: string;
  name: string;
  value: string;
  type: 'gradient' | 'solid' | 'metallic';
  gradient?: string[];
  preview: string;
}

interface VIPTextEffect {
  id: string;
  name: string;
  value: string;
  description: string;
  preview: string;
  cssStyle: object;
}

interface VIPTemplate {
  id: string;
  title: string;
  content: string;
  category: 'tactical' | 'esports' | 'premium';
  description: string;
  previewText: string;
  variables?: TemplateVariable[];
  exclusiveFeatures: string[];
}

interface TemplateVariable {
  key: string;
  label: string;
  placeholder: string;
  type: 'text' | 'number' | 'select';
  options?: string[];
}

interface VIPFeatureProps {
  visible: boolean;
  onClose: () => void;
  featureType: 'fonts' | 'colors' | 'effects' | 'templates';
  onFeatureSelect: (feature: any) => void;
  currentSelection?: any;
  userVIPStatus: boolean;
}

// Constants
const { width: SCREEN_WIDTH } = Dimensions.get('window');

// VIP Exclusive Fonts
const VIP_FONTS: VIPFont[] = [
  {
    id: 'orbitron',
    name: 'Orbitron',
    value: 'Orbitron',
    preview: 'FUTURISTIC GAMING',
    description: 'Sci-fi inspired font perfect for competitive gaming posts',
    category: 'futuristic',
  },
  {
    id: 'exo',
    name: 'Exo',
    value: 'Exo',
    preview: 'Modern Tech Style',
    description: 'Clean, modern font for professional eSports content',
    category: 'modern',
  },
  {
    id: 'audiowide',
    name: 'Audiowide',
    value: 'Audiowide',
    preview: 'RETRO FUTURE',
    description: 'Bold retro-futuristic style for standout posts',
    category: 'gaming',
  },
  {
    id: 'rajdhani',
    name: 'Rajdhani',
    value: 'RajdhaniSemiBold',
    preview: 'Sharp & Clean',
    description: 'Military-inspired precision for tactical discussions',
    category: 'modern',
  },
  {
    id: 'quantico',
    name: 'Quantico',
    value: 'QuanticoRegular',
    preview: 'Military Style',
    description: 'Professional military aesthetic for strategy posts',
    category: 'gaming',
  },
];

// VIP Exclusive Colors
const VIP_COLORS: VIPColor[] = [
  {
    id: 'neon_gradient',
    name: 'Electric Neon',
    value: 'linear-gradient(45deg, #00BFFF, #00FFFF)',
    type: 'gradient',
    gradient: ['#00BFFF', '#00FFFF'],
    preview: 'Electric blue to cyan gradient',
  },
  {
    id: 'gaming_gold',
    name: 'Gaming Gold',
    value: 'linear-gradient(45deg, #FFD700, #FFA500)',
    type: 'gradient',
    gradient: ['#FFD700', '#FFA500'],
    preview: 'Premium gold gradient',
  },
  {
    id: 'rainbow_gradient',
    name: 'Victory Rainbow',
    value: 'linear-gradient(45deg, #FF6B6B, #4ECDC4, #45B7D1, #96CEB4, #FECA57)',
    type: 'gradient',
    gradient: ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FECA57'],
    preview: 'Celebration rainbow colors',
  },
  {
    id: 'chrome_metallic',
    name: 'Chrome',
    value: '#C0C0C0',
    type: 'metallic',
    preview: 'Metallic chrome finish',
  },
  {
    id: 'platinum_metallic',
    name: 'Platinum',
    value: '#E5E4E2',
    type: 'metallic',
    preview: 'Premium platinum shine',
  },
  {
    id: 'fc25_blue',
    name: 'FC25 Electric',
    value: '#00D4FF',
    type: 'solid',
    preview: 'Official FC25 electric blue',
  },
  {
    id: 'fc25_green',
    name: 'FC25 Neon',
    value: '#39FF14',
    type: 'solid',
    preview: 'FC25 signature neon green',
  },
];

// VIP Text Effects
const VIP_TEXT_EFFECTS: VIPTextEffect[] = [
  {
    id: 'neon_glow',
    name: 'Neon Glow',
    value: 'neon_glow',
    description: 'Bright neon glow effect',
    preview: 'GLOWING TEXT',
    cssStyle: {
      textShadowColor: '#00FFFF',
      textShadowOffset: { width: 0, height: 0 },
      textShadowRadius: 10,
    },
  },
  {
    id: 'bold_outline',
    name: 'Bold Outline',
    value: 'bold_outline',
    description: 'Strong text outline',
    preview: 'OUTLINED TEXT',
    cssStyle: {
      textShadowColor: '#000000',
      textShadowOffset: { width: 2, height: 2 },
      textShadowRadius: 0,
    },
  },
  {
    id: 'gold_shadow',
    name: 'Gold Shadow',
    value: 'gold_shadow',
    description: 'Luxurious gold drop shadow',
    preview: 'GOLDEN TEXT',
    cssStyle: {
      textShadowColor: '#FFD700',
      textShadowOffset: { width: 3, height: 3 },
      textShadowRadius: 5,
    },
  },
  {
    id: 'intense_glow',
    name: 'Intense Glow',
    value: 'intense_glow',
    description: 'Maximum intensity glow',
    preview: 'INTENSE GLOW',
    cssStyle: {
      textShadowColor: '#FF00FF',
      textShadowOffset: { width: 0, height: 0 },
      textShadowRadius: 15,
    },
  },
  {
    id: 'triple_shadow',
    name: '3D Shadow',
    value: 'triple_shadow',
    description: '3D layered shadow effect',
    preview: '3D TEXT',
    cssStyle: {
      textShadowColor: '#333333',
      textShadowOffset: { width: 1, height: 1 },
      textShadowRadius: 0,
    },
  },
];

// VIP Exclusive Templates
const VIP_TEMPLATES: VIPTemplate[] = [
  {
    id: 'tactical_masterclass',
    title: 'Tactical Masterclass',
    category: 'tactical',
    description: 'Professional tactical analysis with advanced formatting',
    previewText: '⚡ TACTICAL BREAKDOWN ⚡\n\n═══════════════════\n📊 Formation Analysis\n═══════════════════\n\nBase: 4-2-3-1 → Fluid 3-4-3\nDefensive Line: High (75)\nWidth: Narrow (35)\n\n🎯 Key Instructions:\n▶ Inverted Wingers\n▶ False 9 Movement\n▶ Overlapping Fullbacks',
    content: '⚡ **TACTICAL BREAKDOWN** ⚡\n\n═══════════════════\n📊 **Formation Analysis**\n═══════════════════\n\n**Base:** {formation} → **Fluid** {fluidFormation}\n**Defensive Line:** {defensiveLine}\n**Width:** {width}\n\n🎯 **Key Instructions:**\n▶ {instruction1}\n▶ {instruction2}\n▶ {instruction3}\n\n📈 **Statistical Impact:**\n• **Possession:** {possessionChange}\n• **Chances Created:** {chancesChange}\n• **Defensive Solidity:** {defenseChange}\n\n💡 **Pro Analysis:**\n{analysis}',
    variables: [
      { key: 'formation', label: 'Base Formation', placeholder: '4-2-3-1', type: 'text' },
      { key: 'fluidFormation', label: 'Fluid Formation', placeholder: '3-4-3', type: 'text' },
      { key: 'defensiveLine', label: 'Defensive Line', placeholder: 'High (75)', type: 'text' },
      { key: 'width', label: 'Width Setting', placeholder: 'Narrow (35)', type: 'text' },
      { key: 'instruction1', label: 'Key Instruction 1', placeholder: 'Inverted Wingers', type: 'text' },
      { key: 'instruction2', label: 'Key Instruction 2', placeholder: 'False 9 Movement', type: 'text' },
      { key: 'instruction3', label: 'Key Instruction 3', placeholder: 'Overlapping Fullbacks', type: 'text' },
      { key: 'possessionChange', label: 'Possession Change', placeholder: '+15%', type: 'text' },
      { key: 'chancesChange', label: 'Chances Change', placeholder: '+22%', type: 'text' },
      { key: 'defenseChange', label: 'Defense Change', placeholder: '+8%', type: 'text' },
      { key: 'analysis', label: 'Professional Analysis', placeholder: 'This tactical setup creates overloads...', type: 'text' },
    ],
    exclusiveFeatures: ['Advanced formatting', 'Special characters', 'Professional layout'],
  },
  {
    id: 'esports_report',
    title: 'eSports Match Report',
    category: 'esports',
    description: 'Professional eSports tournament coverage',
    previewText: '🏆 ESPORTS MATCH REPORT 🏆\n\n┌─────────────────────┐\n│   GRAND FINAL      │\n│   Team A vs Team B  │\n│      3-1 AGG       │\n└─────────────────────┘\n\n🎮 Game 1: Dominant 4-0\n🎮 Game 2: Close 2-1\n🎮 Game 3: Tactical 1-0\n\n🌟 MVP: PlayerX (7 goals)',
    content: '🏆 **ESPORTS MATCH REPORT** 🏆\n\n┌─────────────────────┐\n│   {tournamentStage}     │\n│   {team1} vs {team2}   │\n│      {aggregate}       │\n└─────────────────────┘\n\n🎮 **Game 1:** {game1Result}\n🎮 **Game 2:** {game2Result}\n🎮 **Game 3:** {game3Result}\n\n🌟 **MVP:** {mvpPlayer} ({mvpStats})\n📊 **Stats:** {keyStats}\n🏅 **Prize Pool:** {prizePool}\n\n🔥 **Highlight Moments:**\n{highlights}\n\n📝 **Tournament Analysis:**\n{analysis}',
    variables: [
      { key: 'tournamentStage', label: 'Tournament Stage', placeholder: 'GRAND FINAL', type: 'text' },
      { key: 'team1', label: 'Team 1', placeholder: 'Team A', type: 'text' },
      { key: 'team2', label: 'Team 2', placeholder: 'Team B', type: 'text' },
      { key: 'aggregate', label: 'Aggregate Score', placeholder: '3-1 AGG', type: 'text' },
      { key: 'game1Result', label: 'Game 1 Result', placeholder: 'Dominant 4-0', type: 'text' },
      { key: 'game2Result', label: 'Game 2 Result', placeholder: 'Close 2-1', type: 'text' },
      { key: 'game3Result', label: 'Game 3 Result', placeholder: 'Tactical 1-0', type: 'text' },
      { key: 'mvpPlayer', label: 'MVP Player', placeholder: 'PlayerX', type: 'text' },
      { key: 'mvpStats', label: 'MVP Stats', placeholder: '7 goals, 4 assists', type: 'text' },
      { key: 'keyStats', label: 'Key Statistics', placeholder: '67% possession avg', type: 'text' },
      { key: 'prizePool', label: 'Prize Pool', placeholder: '$50,000', type: 'text' },
      { key: 'highlights', label: 'Highlight Moments', placeholder: 'Amazing comeback...', type: 'text' },
      { key: 'analysis', label: 'Tournament Analysis', placeholder: 'Both teams showed...', type: 'text' },
    ],
    exclusiveFeatures: ['Tournament formatting', 'ASCII art borders', 'Professional layout'],
  },
  {
    id: 'premium_layout',
    title: 'Premium Content Layout',
    category: 'premium',
    description: 'Advanced layout with special styling',
    previewText: '✨ PREMIUM CONTENT ✨\n\n▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓\n▓                                    ▓\n▓     {MAIN HEADING}     ▓\n▓                                    ▓\n▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓\n\n🔸 Premium Feature 1\n🔸 Premium Feature 2\n🔸 Premium Feature 3\n\n━━━━━━━━━━━━━━━━━━━━\nEXCLUSIVE VIP CONTENT\n━━━━━━━━━━━━━━━━━━━━',
    content: '✨ **PREMIUM CONTENT** ✨\n\n▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓\n▓                                    ▓\n▓     {mainHeading}     ▓\n▓                                    ▓\n▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓\n\n🔸 **{feature1}**\n🔸 **{feature2}**\n🔸 **{feature3}**\n\n━━━━━━━━━━━━━━━━━━━━\n**{exclusiveContent}**\n━━━━━━━━━━━━━━━━━━━━\n\n{detailedContent}',
    variables: [
      { key: 'mainHeading', label: 'Main Heading', placeholder: 'VIP ANNOUNCEMENT', type: 'text' },
      { key: 'feature1', label: 'Feature 1', placeholder: 'Exclusive Access', type: 'text' },
      { key: 'feature2', label: 'Feature 2', placeholder: 'Premium Content', type: 'text' },
      { key: 'feature3', label: 'Feature 3', placeholder: 'VIP Benefits', type: 'text' },
      { key: 'exclusiveContent', label: 'Exclusive Section', placeholder: 'EXCLUSIVE VIP CONTENT', type: 'text' },
      { key: 'detailedContent', label: 'Detailed Content', placeholder: 'Your detailed VIP content here...', type: 'text' },
    ],
    exclusiveFeatures: ['ASCII art styling', 'Special characters', 'Premium borders'],
  },
];

const VIPFeature: React.FC<VIPFeatureProps> = ({
  visible,
  onClose,
  featureType,
  onFeatureSelect,
  currentSelection,
  userVIPStatus,
}) => {
  const { t } = useTranslation();
  
  // State management
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [showPreview, setShowPreview] = useState(false);
  
  // Animation refs
  const slideAnimation = useRef(new Animated.Value(0)).current;
  const itemAnimations = useRef<Record<string, Animated.Value>>({}).current;
  const previewAnimation = useRef(new Animated.Value(0)).current;
  
  // Initialize item animations
  useEffect(() => {
    const getItems = () => {
      switch (featureType) {
        case 'fonts': return VIP_FONTS;
        case 'colors': return VIP_COLORS;
        case 'effects': return VIP_TEXT_EFFECTS;
        case 'templates': return VIP_TEMPLATES;
        default: return [];
      }
    };
    
    getItems().forEach((item, index) => {
      if (!itemAnimations[item.id]) {
        itemAnimations[item.id] = new Animated.Value(0);
      }
    });
  }, [featureType, itemAnimations]);
  
  // Animate modal appearance
  useEffect(() => {
    if (visible) {
      Animated.spring(slideAnimation, {
        toValue: 1,
        useNativeDriver: true,
        tension: 100,
        friction: 8,
      }).start();
      
      // Stagger item animations
      const items = Object.values(itemAnimations);
      const animations = items.map((anim, index) =>
        Animated.timing(anim, {
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
  
  // Animate preview
  useEffect(() => {
    Animated.spring(previewAnimation, {
      toValue: showPreview ? 1 : 0,
      useNativeDriver: true,
      tension: 150,
      friction: 8,
    }).start();
  }, [showPreview, previewAnimation]);
  
  // Handle item selection
  const handleItemSelect = useCallback((item: any) => {
    setSelectedItem(item);
    setShowPreview(true);
    Vibration.vibrate(30);
    
    secureLog('VIP feature item selected', {
      featureType,
      itemId: item.id,
      itemName: item.name || item.title,
    });
  }, [featureType]);
  
  // Handle feature confirmation
  const handleFeatureConfirm = useCallback(() => {
    if (selectedItem) {
      onFeatureSelect(selectedItem);
      handleClose();
      
      secureLog('VIP feature confirmed', {
        featureType,
        selectedItem: selectedItem.id,
      });
    }
  }, [selectedItem, onFeatureSelect, featureType]);
  
  // Handle close
  const handleClose = useCallback(() => {
    setShowPreview(false);
    setSelectedItem(null);
    onClose();
  }, [onClose]);
  
  // Get feature data
  const featureData = useMemo(() => {
    switch (featureType) {
      case 'fonts': return { items: VIP_FONTS, title: 'VIP Exclusive Fonts', icon: 'text' };
      case 'colors': return { items: VIP_COLORS, title: 'VIP Exclusive Colors', icon: 'color-palette' };
      case 'effects': return { items: VIP_TEXT_EFFECTS, title: 'VIP Text Effects', icon: 'brush' };
      case 'templates': return { items: VIP_TEMPLATES, title: 'VIP Premium Templates', icon: 'document-text' };
      default: return { items: [], title: 'VIP Features', icon: 'star' };
    }
  }, [featureType]);
  
  // Render font item
  const renderFontItem = useCallback((font: VIPFont, index: number) => {
    const animation = itemAnimations[font.id] || new Animated.Value(0);
    const isSelected = currentSelection?.id === font.id;
    
    return (
      <Animated.View
        key={font.id}
        style={[
          styles.itemCard,
          {
            transform: [
              {
                translateY: animation.interpolate({
                  inputRange: [0, 1],
                  outputRange: [50, 0],
                }),
              },
              { scale: animation },
            ],
            opacity: animation,
          },
        ]}
      >
        <TouchableOpacity
          style={[styles.itemTouchable, isSelected && styles.selectedItem]}
          onPress={() => handleItemSelect(font)}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={['rgba(255, 215, 0, 0.2)', 'rgba(255, 215, 0, 0.1)']}
            style={styles.itemGradient}
          >
            <View style={styles.itemHeader}>
              <View style={styles.itemTitleContainer}>
                <Ionicons name="crown" size={16} color="#FFD700" />
                <Text style={styles.itemTitle}>{font.name}</Text>
                <Text style={styles.vipBadge}>VIP</Text>
              </View>
              <Text style={styles.categoryBadge}>{font.category}</Text>
            </View>
            
            <Text style={[styles.fontPreview, { fontFamily: font.value }]}>
              {font.preview}
            </Text>
            
            <Text style={styles.itemDescription}>{font.description}</Text>
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>
    );
  }, [itemAnimations, currentSelection, handleItemSelect]);
  
  // Render color item
  const renderColorItem = useCallback((color: VIPColor, index: number) => {
    const animation = itemAnimations[color.id] || new Animated.Value(0);
    const isSelected = currentSelection?.id === color.id;
    
    return (
      <Animated.View
        key={color.id}
        style={[
          styles.itemCard,
          {
            transform: [
              {
                translateY: animation.interpolate({
                  inputRange: [0, 1],
                  outputRange: [50, 0],
                }),
              },
              { scale: animation },
            ],
            opacity: animation,
          },
        ]}
      >
        <TouchableOpacity
          style={[styles.itemTouchable, isSelected && styles.selectedItem]}
          onPress={() => handleItemSelect(color)}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={['rgba(255, 215, 0, 0.2)', 'rgba(255, 215, 0, 0.1)']}
            style={styles.itemGradient}
          >
            <View style={styles.itemHeader}>
              <View style={styles.itemTitleContainer}>
                <Ionicons name="crown" size={16} color="#FFD700" />
                <Text style={styles.itemTitle}>{color.name}</Text>
                <Text style={styles.vipBadge}>VIP</Text>
              </View>
              <Text style={styles.categoryBadge}>{color.type}</Text>
            </View>
            
            <View style={styles.colorPreviewContainer}>
              {color.type === 'gradient' && color.gradient ? (
                <LinearGradient
                  colors={color.gradient}
                  style={styles.colorPreview}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                />
              ) : (
                <View style={[styles.colorPreview, { backgroundColor: color.value }]} />
              )}
            </View>
            
            <Text style={styles.itemDescription}>{color.preview}</Text>
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>
    );
  }, [itemAnimations, currentSelection, handleItemSelect]);
  
  // Render effect item
  const renderEffectItem = useCallback((effect: VIPTextEffect, index: number) => {
    const animation = itemAnimations[effect.id] || new Animated.Value(0);
    const isSelected = currentSelection?.id === effect.id;
    
    return (
      <Animated.View
        key={effect.id}
        style={[
          styles.itemCard,
          {
            transform: [
              {
                translateY: animation.interpolate({
                  inputRange: [0, 1],
                  outputRange: [50, 0],
                }),
              },
              { scale: animation },
            ],
            opacity: animation,
          },
        ]}
      >
        <TouchableOpacity
          style={[styles.itemTouchable, isSelected && styles.selectedItem]}
          onPress={() => handleItemSelect(effect)}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={['rgba(255, 215, 0, 0.2)', 'rgba(255, 215, 0, 0.1)']}
            style={styles.itemGradient}
          >
            <View style={styles.itemHeader}>
              <View style={styles.itemTitleContainer}>
                <Ionicons name="crown" size={16} color="#FFD700" />
                <Text style={styles.itemTitle}>{effect.name}</Text>
                <Text style={styles.vipBadge}>VIP</Text>
              </View>
            </View>
            
            <Text style={[styles.effectPreview, effect.cssStyle]}>
              {effect.preview}
            </Text>
            
            <Text style={styles.itemDescription}>{effect.description}</Text>
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>
    );
  }, [itemAnimations, currentSelection, handleItemSelect]);
  
  // Render template item
  const renderTemplateItem = useCallback((template: VIPTemplate, index: number) => {
    const animation = itemAnimations[template.id] || new Animated.Value(0);
    const isSelected = currentSelection?.id === template.id;
    
    return (
      <Animated.View
        key={template.id}
        style={[
          styles.itemCard,
          {
            transform: [
              {
                translateY: animation.interpolate({
                  inputRange: [0, 1],
                  outputRange: [50, 0],
                }),
              },
              { scale: animation },
            ],
            opacity: animation,
          },
        ]}
      >
        <TouchableOpacity
          style={[styles.itemTouchable, isSelected && styles.selectedItem]}
          onPress={() => handleItemSelect(template)}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={['rgba(255, 215, 0, 0.2)', 'rgba(255, 215, 0, 0.1)']}
            style={styles.itemGradient}
          >
            <View style={styles.itemHeader}>
              <View style={styles.itemTitleContainer}>
                <Ionicons name="crown" size={16} color="#FFD700" />
                <Text style={styles.itemTitle}>{template.title}</Text>
                <Text style={styles.vipBadge}>VIP</Text>
              </View>
              <Text style={styles.categoryBadge}>{template.category}</Text>
            </View>
            
            <Text style={styles.itemDescription}>{template.description}</Text>
            
            <ScrollView style={styles.templatePreview} showsVerticalScrollIndicator={false}>
              <Text style={styles.templatePreviewText}>
                {template.previewText}
              </Text>
            </ScrollView>
            
            <View style={styles.templateFeatures}>
              {template.exclusiveFeatures.slice(0, 2).map(feature => (
                <View key={feature} style={styles.featureTag}>
                  <Text style={styles.featureText}>{feature}</Text>
                </View>
              ))}
            </View>
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>
    );
  }, [itemAnimations, currentSelection, handleItemSelect]);
  
  // Render item based on type
  const renderItem = useCallback((item: any, index: number) => {
    switch (featureType) {
      case 'fonts': return renderFontItem(item, index);
      case 'colors': return renderColorItem(item, index);
      case 'effects': return renderEffectItem(item, index);
      case 'templates': return renderTemplateItem(item, index);
      default: return null;
    }
  }, [featureType, renderFontItem, renderColorItem, renderEffectItem, renderTemplateItem]);
  
  if (!visible || !userVIPStatus) return null;
  
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
                    outputRange: [600, 0],
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
              <View style={styles.titleContainer}>
                <Ionicons name="crown" size={24} color="#FFD700" />
                <Text style={styles.title}>{featureData.title}</Text>
              </View>
              <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
                <Ionicons name="close" size={24} color="#888" />
              </TouchableOpacity>
            </View>
            
            {/* VIP Badge */}
            <View style={styles.vipHeader}>
              <LinearGradient
                colors={['rgba(255, 215, 0, 0.3)', 'rgba(255, 215, 0, 0.1)']}
                style={styles.vipHeaderGradient}
              >
                <Ionicons name="star" size={16} color="#FFD700" />
                <Text style={styles.vipHeaderText}>VIP Exclusive Features</Text>
                <Ionicons name="star" size={16} color="#FFD700" />
              </LinearGradient>
            </View>
            
            {/* Features List */}
            <FlatList
              data={featureData.items}
              renderItem={({ item, index }) => renderItem(item, index)}
              keyExtractor={(item) => item.id}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.itemsList}
              numColumns={1}
            />
            
            {/* Preview Panel */}
            {showPreview && selectedItem && (
              <Animated.View
                style={[
                  styles.previewPanel,
                  {
                    transform: [
                      {
                        translateY: previewAnimation.interpolate({
                          inputRange: [0, 1],
                          outputRange: [200, 0],
                        }),
                      },
                    ],
                    opacity: previewAnimation,
                  },
                ]}
              >
                <LinearGradient
                  colors={['rgba(50, 205, 50, 0.8)', 'rgba(34, 139, 34, 0.6)']}
                  style={styles.previewGradient}
                >
                  <Text style={styles.previewTitle}>
                    Selected: {selectedItem.name || selectedItem.title}
                  </Text>
                  <View style={styles.previewActions}>
                    <TouchableOpacity
                      style={styles.previewButton}
                      onPress={() => setShowPreview(false)}
                    >
                      <Text style={styles.previewButtonText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.previewButton, styles.confirmButton]}
                      onPress={handleFeatureConfirm}
                    >
                      <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                      <Text style={styles.confirmButtonText}>Use This</Text>
                    </TouchableOpacity>
                  </View>
                </LinearGradient>
              </Animated.View>
            )}
          </LinearGradient>
        </Animated.View>
      </View>
    </Modal>
  );
};

export default VIPFeature;

/* ----------------- VIP GAMING STYLES ----------------- */
const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    height: '85%',
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
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 215, 0, 0.3)',
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  title: {
    color: '#FFD700',
    fontSize: 20,
    fontWeight: 'bold',
  },
  closeButton: {
    padding: 8,
  },
  vipHeader: {
    marginHorizontal: 20,
    marginTop: 16,
    marginBottom: 8,
    borderRadius: 8,
    overflow: 'hidden',
  },
  vipHeaderGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    gap: 8,
  },
  vipHeaderText: {
    color: '#FFD700',
    fontSize: 14,
    fontWeight: 'bold',
  },
  itemsList: {
    padding: 20,
    gap: 16,
  },
  itemCard: {
    marginBottom: 8,
  },
  itemTouchable: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(255, 215, 0, 0.3)',
  },
  selectedItem: {
    borderColor: '#32CD32',
    shadowColor: '#32CD32',
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 5,
  },
  itemGradient: {
    padding: 16,
    minHeight: 120,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  itemTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  itemTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    flex: 1,
  },
  vipBadge: {
    backgroundColor: 'rgba(255, 215, 0, 0.8)',
    color: '#000000',
    fontSize: 10,
    fontWeight: 'bold',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  categoryBadge: {
    color: '#00FFFF',
    fontSize: 10,
    fontWeight: 'bold',
    backgroundColor: 'rgba(0, 255, 255, 0.2)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    textTransform: 'uppercase',
  },
  itemDescription: {
    color: '#CCCCCC',
    fontSize: 12,
    lineHeight: 16,
    marginTop: 8,
  },
  // Font specific styles
  fontPreview: {
    color: '#FFD700',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginVertical: 8,
  },
  // Color specific styles
  colorPreviewContainer: {
    alignItems: 'center',
    marginVertical: 8,
  },
  colorPreview: {
    width: 60,
    height: 30,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  // Effect specific styles
  effectPreview: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    marginVertical: 8,
  },
  // Template specific styles
  templatePreview: {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 8,
    padding: 12,
    marginVertical: 8,
    maxHeight: 80,
  },
  templatePreviewText: {
    color: '#DDDDDD',
    fontSize: 10,
    lineHeight: 12,
    fontFamily: 'monospace',
  },
  templateFeatures: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  featureTag: {
    backgroundColor: 'rgba(0, 255, 255, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  featureText: {
    color: '#00FFFF',
    fontSize: 9,
    fontWeight: '500',
  },
  // Preview panel styles
  previewPanel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    overflow: 'hidden',
  },
  previewGradient: {
    padding: 20,
  },
  previewTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 16,
  },
  previewActions: {
    flexDirection: 'row',
    gap: 12,
  },
  previewButton: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  confirmButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    flexDirection: 'row',
    gap: 8,
  },
  previewButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  confirmButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
});