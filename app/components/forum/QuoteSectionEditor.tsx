import React, { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
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
import AsyncStorage from '@react-native-async-storage/async-storage';

// Security utilities
import { validatePostContent, sanitizePostContent, secureLog } from '../../utils/security';

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
    type: string;
  };
  order: number;
  isCollapsed: boolean;
  isEditing: boolean;
  quoteData?: {
    text: string;
    attribution: string;
    source?: string;
    platform?: 'twitter' | 'twitch' | 'youtube' | 'reddit' | 'instagram' | 'tiktok' | 'official';
    verified?: boolean;
    timestamp?: string;
  };
}

interface QuoteSectionEditorProps {
  section: TemplateSection;
  onContentChange: (content: string) => void;
  onStyleUpdate: (styleUpdates: Partial<TextStyle>) => void;
  onSectionUpdate: (updates: Partial<TemplateSection>) => void;
  userVIPStatus: boolean;
  disabled: boolean;
}

// Constants
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const MAX_QUOTE_LENGTH = 500;
const MAX_ATTRIBUTION_LENGTH = 100;
const MAX_SOURCE_LENGTH = 150;

// Platform configurations
const PLATFORMS = [
  { id: 'twitter', name: 'Twitter', icon: 'logo-twitter', color: '#1DA1F2' },
  { id: 'twitch', name: 'Twitch', icon: 'game-controller', color: '#9146FF' },
  { id: 'youtube', name: 'YouTube', icon: 'logo-youtube', color: '#FF0000' },
  { id: 'reddit', name: 'Reddit', icon: 'logo-reddit', color: '#FF4500' },
  { id: 'instagram', name: 'Instagram', icon: 'logo-instagram', color: '#E4405F' },
  { id: 'tiktok', name: 'TikTok', icon: 'musical-notes', color: '#000000' },
  { id: 'official', name: 'Official', icon: 'checkmark-circle', color: '#32CD32' },
];

// Quote templates for quick start
const QUOTE_TEMPLATES = [
  {
    id: 'player_reaction',
    name: 'Player Reaction',
    template: {
      text: 'This was the best match of my career!',
      attribution: 'Haaland',
      source: 'Post-match interview',
      platform: 'official' as const,
    },
    category: 'gaming',
  },
  {
    id: 'dev_statement',
    name: 'Developer Quote',
    template: {
      text: 'We\'re completely reworking the physics engine for the next update.',
      attribution: 'EA Sports Team',
      source: 'Developer livestream',
      platform: 'official' as const,
    },
    category: 'gaming',
  },
  {
    id: 'community_reaction',
    name: 'Community Reaction',
    template: {
      text: 'This update is absolutely game-changing! 🔥',
      attribution: '@ProGamer_2024',
      source: '',
      platform: 'twitter' as const,
    },
    category: 'social',
  },
  {
    id: 'streamer_quote',
    name: 'Streamer Quote',
    template: {
      text: 'Chat, this is why I love this game so much!',
      attribution: 'TimTheGamer',
      source: 'Live stream',
      platform: 'twitch' as const,
    },
    category: 'streaming',
  },
];

// Quote styles for different contexts
const QUOTE_STYLES = [
  {
    id: 'professional',
    name: 'Professional',
    style: {
      fontSize: 18,
      fontWeight: 'normal' as const,
      fontStyle: 'italic' as const,
      textAlign: 'center' as const,
      color: '#FFD700',
      fontFamily: 'System',
    },
    description: 'Clean, professional look',
  },
  {
    id: 'highlight',
    name: 'Highlight',
    style: {
      fontSize: 20,
      fontWeight: 'bold' as const,
      fontStyle: 'normal' as const,
      textAlign: 'center' as const,
      color: '#00FFFF',
      fontFamily: 'System',
    },
    description: 'Bold, attention-grabbing',
  },
  {
    id: 'gaming',
    name: 'Gaming',
    style: {
      fontSize: 19,
      fontWeight: 'bold' as const,
      fontStyle: 'normal' as const,
      textAlign: 'center' as const,
      color: '#32CD32',
      fontFamily: 'Orbitron',
    },
    description: 'Gaming-themed styling',
    isVIP: true,
  },
  {
    id: 'casual',
    name: 'Casual',
    style: {
      fontSize: 16,
      fontWeight: 'normal' as const,
      fontStyle: 'italic' as const,
      textAlign: 'left' as const,
      color: '#FFFFFF',
      fontFamily: 'System',
    },
    description: 'Relaxed, conversational',
  },
];

const QuoteSectionEditor: React.FC<QuoteSectionEditorProps> = ({
  section,
  onContentChange,
  onStyleUpdate,
  onSectionUpdate,
  userVIPStatus,
  disabled,
}) => {
  const { t } = useTranslation();
  
  // Animation refs
  const slideAnimation = useRef(new Animated.Value(0)).current;
  const templateAnimation = useRef(new Animated.Value(0)).current;
  const previewAnimation = useRef(new Animated.Value(1)).current;
  
  // State management
  const [quoteText, setQuoteText] = useState(section.quoteData?.text || '');
  const [attribution, setAttribution] = useState(section.quoteData?.attribution || '');
  const [source, setSource] = useState(section.quoteData?.source || '');
  const [selectedPlatform, setSelectedPlatform] = useState(section.quoteData?.platform || 'official');
  const [isVerified, setIsVerified] = useState(section.quoteData?.verified || false);
  const [showQuickTemplates, setShowQuickTemplates] = useState(false);
  const [showStyleSelector, setShowStyleSelector] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [isDirty, setIsDirty] = useState(false);
  
  // Auto-save timer
  const autoSaveTimer = useRef<NodeJS.Timeout>();
  
  // Initialize component
  useEffect(() => {
    Animated.spring(slideAnimation, {
      toValue: 1,
      useNativeDriver: true,
      tension: 120,
      friction: 8,
    }).start();
  }, [slideAnimation]);
  
  // Get platform info
  const currentPlatform = useMemo(() => 
    PLATFORMS.find(p => p.id === selectedPlatform) || PLATFORMS[0], 
    [selectedPlatform]
  );
  
  // Validation
  const validateInput = useCallback((text: string, type: 'quote' | 'attribution' | 'source') => {
    const validation = validatePostContent(text.trim());
    
    if (!validation.isValid) {
      setErrors(prev => ({
        ...prev,
        [type]: validation.errors[0] || 'Invalid content'
      }));
      return false;
    }
    
    // Clear error if valid
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[type];
      return newErrors;
    });
    
    return true;
  }, []);
  
// Auto-save functionality - remove duplicate content update
const autoSave = useCallback(() => {
  if (autoSaveTimer.current) {
    clearTimeout(autoSaveTimer.current);
  }
  
  autoSaveTimer.current = setTimeout(() => {
    const updatedQuoteData = {
      text: quoteText.trim(),
      attribution: attribution.trim(),
      source: source.trim(),
      platform: selectedPlatform,
      verified: isVerified,
      timestamp: new Date().toISOString(),
    };
    
    // Update section data only - let parent handle content formatting
    onSectionUpdate({
      quoteData: updatedQuoteData,
      content: formatQuoteForContent(updatedQuoteData),
    });
    
    setIsDirty(false);
    
    secureLog('Quote auto-saved', {
      sectionId: section.id,
      platform: selectedPlatform,
      hasAttribution: !!attribution.trim(),
      hasSource: !!source.trim(),
    });
  }, 2000); // Increased delay to reduce frequency
}, [quoteText, attribution, source, selectedPlatform, isVerified, section.id, onSectionUpdate, formatQuoteForContent]);
  
  // Format quote for content preview
  const formatQuoteForContent = useCallback((quoteData: any) => {
    let formatted = `"${quoteData.text}"`;
    
    if (quoteData.attribution) {
      formatted += `\n— ${quoteData.attribution}`;
    }
    
    if (quoteData.source) {
      formatted += ` (${quoteData.source})`;
    }
    
    return formatted;
  }, []);
  
  // Input handlers with validation and auto-save
  const handleQuoteTextChange = useCallback((text: string) => {
    if (text.length <= MAX_QUOTE_LENGTH) {
      setQuoteText(text);
      validateInput(text, 'quote');
      setIsDirty(true);
      autoSave();
    }
  }, [validateInput, autoSave]);
  
  const handleAttributionChange = useCallback((text: string) => {
    if (text.length <= MAX_ATTRIBUTION_LENGTH) {
      setAttribution(text);
      validateInput(text, 'attribution');
      setIsDirty(true);
      autoSave();
    }
  }, [validateInput, autoSave]);
  
  const handleSourceChange = useCallback((text: string) => {
    if (text.length <= MAX_SOURCE_LENGTH) {
      setSource(text);
      validateInput(text, 'source');
      setIsDirty(true);
      autoSave();
    }
  }, [validateInput, autoSave]);
  
  const handlePlatformChange = useCallback((platformId: string) => {
    setSelectedPlatform(platformId);
    setIsDirty(true);
    autoSave();
    Vibration.vibrate(30);
  }, [autoSave]);
  
  // Template application
  const applyTemplate = useCallback((template: any) => {
    setQuoteText(template.text);
    setAttribution(template.attribution);
    setSource(template.source);
    setSelectedPlatform(template.platform);
    setShowQuickTemplates(false);
    setIsDirty(true);
    autoSave();
    
    Vibration.vibrate(50);
    
    secureLog('Quote template applied', {
      templateId: template.id || 'custom',
      platform: template.platform,
    });
  }, [autoSave]);
  
  // Style application
  const applyQuoteStyle = useCallback((styleConfig: any) => {
    if (styleConfig.isVIP && !userVIPStatus) {
      Alert.alert(
        'VIP Feature',
        'This style is available for VIP members only.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Upgrade to VIP', style: 'default' },
        ]
      );
      return;
    }
    
    onStyleUpdate(styleConfig.style);
    setShowStyleSelector(false);
    Vibration.vibrate(30);
    
    secureLog('Quote style applied', {
      styleId: styleConfig.id,
      isVIP: styleConfig.isVIP,
      userVIP: userVIPStatus,
    });
  }, [userVIPStatus, onStyleUpdate]);
  
// Quote preview animation - disabled to prevent flashing
const animatePreview = useCallback(() => {
  // Animation disabled
}, []);

  
  // Cleanup
  useEffect(() => {
    return () => {
      if (autoSaveTimer.current) {
        clearTimeout(autoSaveTimer.current);
      }
    };
  }, []);
  
  // Character counts
  const quoteCharCount = `${quoteText.length}/${MAX_QUOTE_LENGTH}`;
  const attributionCharCount = `${attribution.length}/${MAX_ATTRIBUTION_LENGTH}`;
  const sourceCharCount = `${source.length}/${MAX_SOURCE_LENGTH}`;
  
  // Check if quote is complete
  const isQuoteComplete = quoteText.trim().length > 0 && attribution.trim().length > 0;
  
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <Animated.View
        style={[
          styles.editorContainer,
          {
            transform: [{ scale: slideAnimation }],
            opacity: slideAnimation,
          },
        ]}
      >
        {/* Header with Quick Actions */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Ionicons name="chatbox-ellipses" size={20} color="#FFD700" />
            <Text style={styles.headerTitle}>Quote Block</Text>
            {isDirty && (
              <View style={styles.savingIndicator}>
                <Text style={styles.savingText}>Saving...</Text>
              </View>
            )}
          </View>
          
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.quickAction}
              onPress={() => setShowQuickTemplates(true)}
            >
              <Ionicons name="flash" size={18} color="#32CD32" />
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.quickAction}
              onPress={() => setShowStyleSelector(true)}
            >
              <Ionicons name="color-palette" size={18} color="#00FFFF" />
            </TouchableOpacity>
          </View>
        </View>
        
        {/* Quote Text Input */}
        <View style={styles.inputSection}>
          <Text style={styles.inputLabel}>Quote Text</Text>
          <View style={[styles.inputContainer, errors.quote && styles.inputError]}>
            <LinearGradient
              colors={['rgba(255, 215, 0, 0.1)', 'transparent']}
              style={styles.inputGradient}
            >
              <TextInput
                style={styles.quoteInput}
                placeholder="Enter the quote text..."
                placeholderTextColor="#888"
                value={quoteText}
                onChangeText={handleQuoteTextChange}
                multiline
                maxLength={MAX_QUOTE_LENGTH}
                editable={!disabled}
              />
            </LinearGradient>
          </View>
          <View style={styles.inputFooter}>
            <Text style={styles.charCount}>{quoteCharCount}</Text>
            {errors.quote && <Text style={styles.errorText}>{errors.quote}</Text>}
          </View>
        </View>
        
        {/* Attribution Input */}
        <View style={styles.inputSection}>
          <Text style={styles.inputLabel}>Attribution</Text>
          <View style={[styles.inputContainer, errors.attribution && styles.inputError]}>
            <LinearGradient
              colors={['rgba(0, 255, 255, 0.1)', 'transparent']}
              style={styles.inputGradient}
            >
              <TextInput
                style={styles.attributionInput}
                placeholder="Who said this? (e.g., @username, Player Name)"
                placeholderTextColor="#888"
                value={attribution}
                onChangeText={handleAttributionChange}
                maxLength={MAX_ATTRIBUTION_LENGTH}
                editable={!disabled}
              />
            </LinearGradient>
          </View>
          <View style={styles.inputFooter}>
            <Text style={styles.charCount}>{attributionCharCount}</Text>
            {errors.attribution && <Text style={styles.errorText}>{errors.attribution}</Text>}
          </View>
        </View>
        
        {/* Platform & Source Row */}
        <View style={styles.metadataRow}>
          {/* Platform Selector */}
          <View style={styles.platformSection}>
            <Text style={styles.inputLabel}>Platform</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.platformScroll}
              contentContainerStyle={styles.platformContent}
            >
              {PLATFORMS.map(platform => (
                <TouchableOpacity
                  key={platform.id}
                  style={[
                    styles.platformButton,
                    selectedPlatform === platform.id && styles.platformButtonActive,
                  ]}
                  onPress={() => handlePlatformChange(platform.id)}
                >
                  <LinearGradient
                    colors={
                      selectedPlatform === platform.id
                        ? [`${platform.color}40`, `${platform.color}20`]
                        : ['rgba(255, 255, 255, 0.05)', 'transparent']
                    }
                    style={styles.platformGradient}
                  >
                    <Ionicons
                      name={platform.icon as any}
                      size={16}
                      color={selectedPlatform === platform.id ? platform.color : '#888'}
                    />
                    <Text style={[
                      styles.platformText,
                      selectedPlatform === platform.id && { color: platform.color },
                    ]}>
                      {platform.name}
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
        
        {/* Source Input (Optional) */}
        <View style={styles.inputSection}>
          <Text style={styles.inputLabel}>Source (Optional)</Text>
          <View style={[styles.inputContainer, errors.source && styles.inputError]}>
            <LinearGradient
              colors={['rgba(50, 205, 50, 0.1)', 'transparent']}
              style={styles.inputGradient}
            >
              <TextInput
                style={styles.sourceInput}
                placeholder="Source context (e.g., 'Live stream', 'Post-match interview')"
                placeholderTextColor="#888"
                value={source}
                onChangeText={handleSourceChange}
                maxLength={MAX_SOURCE_LENGTH}
                editable={!disabled}
              />
            </LinearGradient>
          </View>
          <View style={styles.inputFooter}>
            <Text style={styles.charCount}>{sourceCharCount}</Text>
            {errors.source && <Text style={styles.errorText}>{errors.source}</Text>}
          </View>
        </View>
        

        
        {/* Completion Status */}
        <View style={styles.statusContainer}>
          <View style={styles.statusItem}>
            <Ionicons
              name={quoteText.trim() ? "checkmark-circle" : "ellipse-outline"}
              size={16}
              color={quoteText.trim() ? "#32CD32" : "#888"}
            />
            <Text style={[styles.statusText, quoteText.trim() && styles.statusComplete]}>
              Quote text
            </Text>
          </View>
          
          <View style={styles.statusItem}>
            <Ionicons
              name={attribution.trim() ? "checkmark-circle" : "ellipse-outline"}
              size={16}
              color={attribution.trim() ? "#32CD32" : "#888"}
            />
            <Text style={[styles.statusText, attribution.trim() && styles.statusComplete]}>
              Attribution
            </Text>
          </View>
          
          <View style={styles.statusItem}>
            <Ionicons
              name={isQuoteComplete ? "checkmark-circle" : "ellipse-outline"}
              size={16}
              color={isQuoteComplete ? "#32CD32" : "#888"}
            />
            <Text style={[styles.statusText, isQuoteComplete && styles.statusComplete]}>
              Ready to publish
            </Text>
          </View>
        </View>
      </Animated.View>
      
      {/* Quick Templates Modal */}
      {showQuickTemplates && (
        <View style={styles.modalOverlay}>
          <View style={styles.templateModal}>
            <LinearGradient
              colors={['rgba(18, 25, 40, 0.95)', 'rgba(10, 15, 25, 0.9)']}
              style={styles.templateContent}
            >
              <View style={styles.templateHeader}>
                <Text style={styles.templateTitle}>Quick Templates</Text>
                <TouchableOpacity onPress={() => setShowQuickTemplates(false)}>
                  <Ionicons name="close" size={24} color="#888" />
                </TouchableOpacity>
              </View>
              
              <ScrollView style={styles.templateList}>
                {QUOTE_TEMPLATES.map(template => (
                  <TouchableOpacity
                    key={template.id}
                    style={styles.templateItem}
                    onPress={() => applyTemplate(template.template)}
                  >
                    <LinearGradient
                      colors={['rgba(0, 255, 255, 0.1)', 'transparent']}
                      style={styles.templateItemGradient}
                    >
                      <Text style={styles.templateName}>{template.name}</Text>
                      <Text style={styles.templatePreview}>"{template.template.text}"</Text>
                      <Text style={styles.templateAttribution}>— {template.template.attribution}</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </LinearGradient>
          </View>
        </View>
      )}
      
      {/* Style Selector Modal */}
      {showStyleSelector && (
        <View style={styles.modalOverlay}>
          <View style={styles.styleModal}>
            <LinearGradient
              colors={['rgba(18, 25, 40, 0.95)', 'rgba(10, 15, 25, 0.9)']}
              style={styles.styleContent}
            >
              <View style={styles.styleHeader}>
                <Text style={styles.styleTitle}>Quote Styles</Text>
                <TouchableOpacity onPress={() => setShowStyleSelector(false)}>
                  <Ionicons name="close" size={24} color="#888" />
                </TouchableOpacity>
              </View>
              
              <ScrollView style={styles.styleList}>
                {QUOTE_STYLES.map(style => (
                  <TouchableOpacity
                    key={style.id}
                    style={[
                      styles.styleItem,
                      style.isVIP && !userVIPStatus && styles.styleItemLocked,
                    ]}
                    onPress={() => applyQuoteStyle(style)}
                    disabled={style.isVIP && !userVIPStatus}
                  >
                    <LinearGradient
                      colors={
                        style.isVIP && !userVIPStatus
                          ? ['rgba(255, 215, 0, 0.1)', 'transparent']
                          : ['rgba(0, 255, 255, 0.1)', 'transparent']
                      }
                      style={styles.styleItemGradient}
                    >
                      <View style={styles.styleItemHeader}>
                        <Text style={[
                          styles.styleName,
                          style.isVIP && !userVIPStatus && styles.styleNameLocked,
                        ]}>
                          {style.name}
                          {style.isVIP && (
                            <Text style={styles.vipBadge}> 👑</Text>
                          )}
                        </Text>
                        <Text style={styles.styleDescription}>{style.description}</Text>
                      </View>
                      
                      <Text style={[styles.stylePreview, style.style]}>
                        "Sample quote text"
                      </Text>
                    </LinearGradient>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </LinearGradient>
          </View>
        </View>
      )}
    </KeyboardAvoidingView>
  );
};

export default QuoteSectionEditor;

/* ----------------- REVOLUTIONARY QUOTE EDITOR STYLES ----------------- */
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  editorContainer: {
    flex: 1,
    padding: 16,
  },
  
  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 215, 0, 0.2)',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerTitle: {
    color: '#FFD700',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  savingIndicator: {
    marginLeft: 12,
    backgroundColor: 'rgba(32, 205, 50, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  savingText: {
    color: '#32CD32',
    fontSize: 11,
    fontWeight: '500',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  quickAction: {
    backgroundColor: 'rgba(0, 255, 255, 0.1)',
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 255, 0.3)',
  },
  
  // Input Sections
  inputSection: {
    marginBottom: 16,
  },
  inputLabel: {
    color: '#00FFFF',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  inputContainer: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    overflow: 'hidden',
  },
  inputError: {
    borderColor: '#FF6347',
  },
  inputGradient: {
    padding: 1,
  },
  quoteInput: {
    color: '#FFFFFF',
    fontSize: 16,
    padding: 16,
    minHeight: 80,
    textAlignVertical: 'top',
    fontStyle: 'italic',
  },
  attributionInput: {
    color: '#FFFFFF',
    fontSize: 15,
    padding: 16,
    minHeight: 50,
  },
  sourceInput: {
    color: '#FFFFFF',
    fontSize: 14,
    padding: 16,
    minHeight: 45,
  },
  inputFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
    paddingHorizontal: 4,
  },
  charCount: {
    color: '#888',
    fontSize: 12,
  },
  errorText: {
    color: '#FF6347',
    fontSize: 12,
  },
  
  // Metadata Row
  metadataRow: {
    marginBottom: 16,
  },
  platformSection: {
    marginBottom: 8,
  },
  platformScroll: {
    marginTop: 8,
  },
  platformContent: {
    gap: 8,
  },
  platformButton: {
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  platformButtonActive: {
    borderColor: 'rgba(0, 255, 255, 0.5)',
  },
  platformGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
  },
  platformText: {
    color: '#888',
    fontSize: 12,
    fontWeight: '500',
  },
  
  // Preview
  previewContainer: {
    marginTop: 20,
    marginBottom: 16,
  },
  previewLabel: {
    color: '#32CD32',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  previewBox: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.3)',
  },
  quotePreview: {
    alignItems: 'center',
  },
  previewQuoteText: {
    fontSize: 18,
    fontStyle: 'italic',
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 26,
  },
  previewAttribution: {
    alignItems: 'center',
  },
  previewAttributionText: {
    color: '#CCCCCC',
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
  },
  previewMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  previewSource: {
    color: '#888',
    fontSize: 12,
  },
  
  // Status
  statusContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 12,
    padding: 12,
    marginTop: 8,
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusText: {
    color: '#888',
    fontSize: 12,
    fontWeight: '500',
  },
  statusComplete: {
    color: '#32CD32',
  },
  
  // Modals
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  // Template Modal
  templateModal: {
    width: SCREEN_WIDTH * 0.9,
    maxHeight: '70%',
    borderRadius: 16,
    overflow: 'hidden',
  },
  templateContent: {
    maxHeight: '100%',
  },
  templateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 255, 255, 0.2)',
  },
  templateTitle: {
    color: '#FFD700',
    fontSize: 18,
    fontWeight: 'bold',
  },
  templateList: {
    maxHeight: 400,
    padding: 16,
  },
  templateItem: {
    marginBottom: 12,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 255, 0.2)',
  },
  templateItemGradient: {
    padding: 16,
  },
  templateName: {
    color: '#00FFFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  templatePreview: {
    color: '#FFFFFF',
    fontSize: 14,
    fontStyle: 'italic',
    marginBottom: 4,
  },
  templateAttribution: {
    color: '#CCCCCC',
    fontSize: 13,
  },
  
  // Style Modal
  styleModal: {
    width: SCREEN_WIDTH * 0.9,
    maxHeight: '70%',
    borderRadius: 16,
    overflow: 'hidden',
  },
  styleContent: {
    maxHeight: '100%',
  },
  styleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 255, 255, 0.2)',
  },
  styleTitle: {
    color: '#FFD700',
    fontSize: 18,
    fontWeight: 'bold',
  },
  styleList: {
    maxHeight: 400,
    padding: 16,
  },
  styleItem: {
    marginBottom: 12,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 255, 0.2)',
  },
  styleItemLocked: {
    borderColor: 'rgba(255, 215, 0, 0.3)',
    opacity: 0.7,
  },
  styleItemGradient: {
    padding: 16,
  },
  styleItemHeader: {
    marginBottom: 8,
  },
  styleName: {
    color: '#00FFFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  styleNameLocked: {
    color: '#FFD700',
  },
  vipBadge: {
    color: '#FFD700',
  },
  styleDescription: {
    color: '#888',
    fontSize: 12,
  },
  stylePreview: {
    fontSize: 14,
    textAlign: 'center',
  },
});