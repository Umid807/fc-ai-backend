import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Modal,
  Animated,
  Dimensions,
  TextInput,
  Alert,
  StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

// Firebase imports
import { db } from "../../app/firebaseConfig";
import { collection, addDoc, serverTimestamp, getDocs, query, where } from 'firebase/firestore';

// Types
interface TextStyle {
  fontSize: number;
  fontWeight: 'normal' | 'bold';
  fontStyle: 'normal' | 'italic';
  textDecorationLine: 'none' | 'underline' | 'line-through';
  textAlign: 'left' | 'center' | 'right' | 'justify';
  color: string;
  fontFamily: string;
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
}

interface CreateMyTemplateProps {
  visible: boolean;
  onClose: () => void;
  userId: string;
  onTemplateCreated: () => void;
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Secure logging function
const secureLog = (message: string, metadata?: Record<string, any>) => {
  if (__DEV__) {
    console.log(`[CreateMyTemplate] ${message}`, metadata);
  }
};

// Input sanitization function
const sanitizeInput = (input: string, maxLength: number = 200): string => {
  return input
    .replace(/[<>]/g, '') // Remove HTML tags only
    .replace(/javascript:/gi, '') // Remove JS protocols
    .replace(/data:/gi, '') // Remove data URLs
    .replace(/vbscript:/gi, '') // Remove VBScript
    .substring(0, maxLength); // ✅ REMOVED .trim() - keeps spaces during typing
};

// Content validation functions
const validateSectionData = (section: TemplateSection) => {
  const allowedTypes = ['text', 'quote', 'image', 'table', 'video', 'poll'];
  
  if (!allowedTypes.includes(section.config.type)) {
    throw new Error('Invalid section type detected');
  }
  
  if (section.config.minHeight < 20 || section.config.minHeight > 500) {
    throw new Error('Invalid section height parameters');
  }
  
  if (section.label.length > 50) {
    throw new Error('Section label too long (max 50 characters)');
  }
  
  if (section.config.placeholder.length > 100) {
    throw new Error('Section placeholder too long (max 100 characters)');
  }
};

const validateContentLimits = (sections: TemplateSection[]) => {
  if (sections.length > 10) {
    throw new Error('Maximum 10 sections allowed per template');
  }
  
  if (sections.length === 0) {
    throw new Error('At least one section is required');
  }
  
  sections.forEach((section, index) => {
    try {
      validateSectionData(section);
    } catch (error) {
      throw new Error(`Section ${index + 1}: ${error instanceof Error ? error.message : 'Invalid data'}`);
    }
  });
};

// Rate limiting check
const checkRateLimit = async (userId: string): Promise<void> => {
  try {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentTemplatesQuery = query(
      collection(db, 'MyAdvancedTemplates'),
      where('userId', '==', userId),
      where('createdAt', '>', twentyFourHoursAgo)
    );
    
    const recentTemplates = await getDocs(recentTemplatesQuery);
    
    if (recentTemplates.size >= 5) {
      throw new Error('Rate limit exceeded. You can create maximum 5 templates per day. Please try again tomorrow.');
    }
  } catch (error) {
    if (error instanceof Error && error.message.includes('Rate limit')) {
      throw error;
    }
    // If rate limit check fails, log but don't block (fail open for better UX)
    secureLog('Rate limit check failed', { 
      hasUserId: !!userId,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Section types for dropdown
const SECTION_TYPES = [
  { id: 'text', name: 'Text Content', icon: 'document-text', color: '#4A90E2' },
  { id: 'quote', name: 'Quote Block', icon: 'chatbox-ellipses', color: '#9370DB' },
  { id: 'image', name: 'Image Upload', icon: 'image', color: '#32CD32' },
  { id: 'table', name: 'Data Table', icon: 'grid', color: '#FF6347' },
  { id: 'video', name: 'Video Embed', icon: 'videocam', color: '#FF69B4' },
  { id: 'poll', name: 'Community Poll', icon: 'bar-chart', color: '#FFD700' },
];

// Template categories
const TEMPLATE_CATEGORIES = [
  { id: 'community', name: 'Basic Templates' },
  { id: 'review', name: 'Card Review' },
  { id: 'tutorial', name: 'Video Tutorials' },
  { id: 'gaming', name: 'Gaming' },
  { id: 'creative', name: 'Creative' },
];

// Color presets for template gradients
const GRADIENT_PRESETS = [
  ['#667eea', '#764ba2'],
  ['#f093fb', '#f5576c'],
  ['#4facfe', '#00f2fe'],
  ['#43e97b', '#38f9d7'],
  ['#fa709a', '#fee140'],
  ['#a8edea', '#fed6e3'],
  ['#ff9a9e', '#fecfef'],
  ['#667eea', '#764ba2'],
];

const CreateMyTemplate: React.FC<CreateMyTemplateProps> = ({
  visible,
  onClose,
  userId,
  onTemplateCreated,
}) => {
  // State management
  const [templateName, setTemplateName] = useState('');
  const [templateDescription, setTemplateDescription] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('community');
  const [selectedGradient, setSelectedGradient] = useState(0);
  const [sections, setSections] = useState<TemplateSection[]>([]);
  const [saving, setSaving] = useState(false);
  
  // Animation and refs
  const slideAnimation = useRef(new Animated.Value(0)).current;
  const isMountedRef = useRef(true);
  
  // Animation cleanup function
  const cleanupAnimations = useCallback(() => {
    try {
      slideAnimation.removeAllListeners();
      slideAnimation.setValue(0);
    } catch (error) {
      secureLog('Animation cleanup error', { 
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }, [slideAnimation]);
  
  // Component cleanup
  useEffect(() => {
    isMountedRef.current = true;
    
    return () => {
      isMountedRef.current = false;
      cleanupAnimations();
    };
  }, [cleanupAnimations]);
  
  // Animate modal appearance
  useEffect(() => {
    if (visible) {
      Animated.spring(slideAnimation, {
        toValue: 1,
        useNativeDriver: true,
        tension: 100,
        friction: 8,
      }).start();
    } else {
      slideAnimation.setValue(0);
    }
  }, [visible, slideAnimation]);
  
  // Secure input handlers
  const handleTemplateNameChange = useCallback((text: string) => {
    const sanitized = sanitizeInput(text, 50);
    setTemplateName(sanitized);
  }, []);
  
  const handleTemplateDescriptionChange = useCallback((text: string) => {
    const sanitized = sanitizeInput(text, 200);
    setTemplateDescription(sanitized);
  }, []);
  
  // Add new section with validation
  const addSection = useCallback((type: string) => {
    try {
      if (sections.length >= 10) {
        Alert.alert('Limit Reached', 'Maximum 10 sections allowed per template');
        return;
      }
      
      if (!SECTION_TYPES.find(t => t.id === type)) {
        secureLog('Invalid section type attempted', { type });
        return;
      }
      
      const newSection: TemplateSection = {
        id: `section_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        label: '',
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
          placeholder: '',
          minHeight: Math.max(20, Math.min(500, type === 'image' ? 200 : type === 'table' ? 150 : 80)),
          maxHeight: type === 'text' ? 300 : undefined,
          allowEmpty: false,
          type: type as any,
        },
        order: sections.length,
        exampleContent: '',
      };
      
      setSections(prev => [...prev, newSection]);
    } catch (error) {
      secureLog('Add section error', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        type 
      });
      Alert.alert('Error', 'Failed to add section. Please try again.');
    }
  }, [sections]);
  
  // Update section with sanitization
  const updateSection = useCallback((sectionId: string, updates: Partial<TemplateSection>) => {
    try {
      setSections(prev => prev.map(section => {
        if (section.id === sectionId) {
          const updatedSection = { ...section, ...updates };
          
          // Sanitize text inputs
          if (updates.label !== undefined) {
            updatedSection.label = sanitizeInput(updates.label, 50);
          }
          
          if (updates.config?.placeholder !== undefined) {
            updatedSection.config = {
              ...updatedSection.config,
              placeholder: sanitizeInput(updates.config.placeholder, 100)
            };
          }
          
          return updatedSection;
        }
        return section;
      }));
    } catch (error) {
      secureLog('Update section error', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        sectionId: sectionId ? 'present' : 'missing'
      });
    }
  }, []);
  
  // Remove section
  const removeSection = useCallback((sectionId: string) => {
    setSections(prev => prev.filter(section => section.id !== sectionId));
  }, []);
  
  // Move section up/down
  const moveSection = useCallback((sectionId: string, direction: 'up' | 'down') => {
    setSections(prev => {
      const currentIndex = prev.findIndex(s => s.id === sectionId);
      if (
        (direction === 'up' && currentIndex === 0) ||
        (direction === 'down' && currentIndex === prev.length - 1)
      ) {
        return prev;
      }
      
      const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
      const newSections = [...prev];
      [newSections[currentIndex], newSections[newIndex]] = [newSections[newIndex], newSections[currentIndex]];
      
      // Update order values
      return newSections.map((section, index) => ({ ...section, order: index }));
    });
  }, []);
  
  // Enhanced validation with security checks
  const validateTemplate = useCallback(() => {
    const sanitizedName = sanitizeInput(templateName, 50);
    const sanitizedDescription = sanitizeInput(templateDescription, 200);
    
    if (sanitizedName.length < 3) {
      Alert.alert('Validation Error', 'Template name must be at least 3 characters long');
      return false;
    }
    
    
    if (sections.length === 0) {
      Alert.alert('Validation Error', 'Please add at least one section to your template');
      return false;
    }
    
    if (sections.length > 10) {
      Alert.alert('Validation Error', 'Maximum 10 sections allowed per template');
      return false;
    }
    
    // Check if all sections have labels
    const invalidSections = sections.filter(s => !s.label.trim() || s.label.trim().length < 2);
    if (invalidSections.length > 0) {
      Alert.alert('Validation Error', 'All sections must have labels (minimum 2 characters)');
      return false;
    }
    
    try {
      validateContentLimits(sections);
    } catch (error) {
      Alert.alert('Validation Error', error instanceof Error ? error.message : 'Invalid template data');
      return false;
    }
    
    return true;
  }, [templateName, templateDescription, sections]);
  
  // Authentication check
  const checkAuthentication = useCallback(() => {
    if (!userId || userId === 'anonymous' || userId.trim() === '') {
      Alert.alert(
        'Authentication Required',
        'You must be logged in to create custom templates. Please log in and try again.',
        [{ text: 'OK' }]
      );
      return false;
    }
    return true;
  }, [userId]);
  
  // Save template with comprehensive security
  const saveTemplate = useCallback(async () => {
    if (!checkAuthentication()) return;
    if (!validateTemplate()) return;
    
    setSaving(true);
    
    try {
      // Rate limiting check
      await checkRateLimit(userId);
      
      // Sanitize all inputs
      const sanitizedName = sanitizeInput(templateName, 50);
      const sanitizedDescription = sanitizeInput(templateDescription, 200);
      
      // Clean and validate sections
      const cleanSections = sections.map((section, index) => {
        const cleanSection = {
          id: section.id,
          label: sanitizeInput(section.label, 50),
          style: {
            fontSize: Math.max(12, Math.min(32, section.style?.fontSize || 16)),
            fontWeight: section.style?.fontWeight || 'normal',
            fontStyle: section.style?.fontStyle || 'normal',
            textDecorationLine: section.style?.textDecorationLine || 'none',
            textAlign: section.style?.textAlign || 'left',
            color: section.style?.color || '#FFFFFF',
            fontFamily: section.style?.fontFamily || 'System',
          },
          config: {
            placeholder: sanitizeInput(section.config?.placeholder || '', 100),
            minHeight: Math.max(20, Math.min(500, section.config?.minHeight || 80)),
            maxHeight: section.config?.maxHeight ? Math.max(50, Math.min(800, section.config.maxHeight)) : 300,
            allowEmpty: Boolean(section.config?.allowEmpty),
            type: section.config?.type || 'text',
          },
          order: index, // Use array index for reliable ordering
          exampleContent: sanitizeInput(section.exampleContent || '', 150),
        };
        
        // Validate each clean section
        validateSectionData(cleanSection);
        
        return cleanSection;
      });
      
      // Validate gradient selection
      const safeGradientIndex = Math.max(0, Math.min(GRADIENT_PRESETS.length - 1, selectedGradient));
      
      // Build template data
      const templateData = {
        name: sanitizedName,
        description: sanitizedDescription,
        category: selectedCategory,
        difficulty: 'beginner' as const,
        isVIP: false,
        isActive: true,
        sections: cleanSections,
        metadata: {
          author: 'Custom User',
          estimatedTime: Math.max(5, Math.min(60, cleanSections.length * 2)),
          features: cleanSections
            .map(s => s.label)
            .filter(label => label.trim())
            .slice(0, 5), // Limit features array
          useCase: sanitizedDescription,
          preview: `Custom template with ${cleanSections.length} sections`,
          icon: 'create',
          gradient: GRADIENT_PRESETS[safeGradientIndex],
          complexity: Math.min(5, Math.max(1, cleanSections.length)),
          popularity: 0,
        },
        type: 'advanced' as const,
        userId: userId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      
      // Save to Firestore
      await addDoc(collection(db, 'MyAdvancedTemplates'), templateData);
      
      secureLog('Template created successfully', {
        hasUserId: !!userId,
        sectionCount: cleanSections.length,
        category: selectedCategory
      });
      
      Alert.alert(
        'Success! 🎉',
        'Your custom template has been created successfully!',
        [
          {
            text: 'OK',
            onPress: () => {
              onTemplateCreated();
              onClose();
              resetForm();
            }
          }
        ]
      );
      
    } catch (error) {
      secureLog('Template save failed', { 
        hasUserId: !!userId,
        sectionCount: sections.length,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      const errorMessage = error instanceof Error ? error.message : 'Failed to save template. Please try again.';
      Alert.alert('Error', errorMessage);
    } finally {
      if (isMountedRef.current) {
        setSaving(false);
      }
    }
  }, [templateName, templateDescription, selectedCategory, selectedGradient, sections, userId, validateTemplate, checkAuthentication, onTemplateCreated, onClose]);
  
  // Reset form
  const resetForm = useCallback(() => {
    setTemplateName('');
    setTemplateDescription('');
    setSelectedCategory('community');
    setSelectedGradient(0);
    setSections([]);
  }, []);
  
  // Get section type info
  const getSectionTypeInfo = useCallback((type: string) => {
    return SECTION_TYPES.find(t => t.id === type) || SECTION_TYPES[0];
  }, []);
  
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
              {/* Header */}
              <View style={styles.header}>
                <View style={styles.headerLeft}>
                  <TouchableOpacity onPress={onClose} style={styles.backButton}>
                    <Ionicons name="chevron-back" size={24} color="#00FFFF" />
                  </TouchableOpacity>
                  <View>
                    <Text style={styles.title}>Create My Template</Text>
                    <Text style={styles.subtitle}>Design your custom post template</Text>
                  </View>
                </View>
                
                <TouchableOpacity 
                  onPress={saveTemplate}
                  style={[styles.saveButton, saving && styles.saveButtonDisabled]}
                  disabled={saving}
                >
                  <Ionicons name={saving ? "hourglass" : "checkmark"} size={18} color="#000000" />
                  <Text style={styles.saveButtonText}>
                    {saving ? 'Saving...' : 'Save'}
                  </Text>
                </TouchableOpacity>
              </View>
              
              <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                {/* Basic Info Section */}
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>📝 Basic Information</Text>
                  
                  <View style={styles.inputContainer}>
                    <Text style={styles.inputLabel}>Template Name * (3-50 characters)</Text>
                    <TextInput
                      style={styles.textInput}
                      placeholder="Enter template name..."
                      placeholderTextColor="#888"
                      value={templateName}
                      onChangeText={handleTemplateNameChange}
                      maxLength={50}
                    />
                    <Text style={styles.characterCount}>{templateName.length}/50</Text>
                  </View>
                  
                  <View style={styles.inputContainer}>
                    <Text style={styles.inputLabel}>Description (optional, max 200 characters)</Text>
                    <TextInput
                      style={[styles.textInput, styles.textArea]}
                      placeholder="Describe what this template is for..."
                      placeholderTextColor="#888"
                      value={templateDescription}
                      onChangeText={handleTemplateDescriptionChange}
                      multiline
                      maxLength={200}
                    />
                    <Text style={styles.characterCount}>{templateDescription.length}/200</Text>
                  </View>
                  
                  <View style={styles.inputContainer}>
                    <Text style={styles.inputLabel}>Category</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      {TEMPLATE_CATEGORIES.map(category => (
                        <TouchableOpacity
                          key={category.id}
                          style={[
                            styles.categoryChip,
                            selectedCategory === category.id && styles.categoryChipActive
                          ]}
                          onPress={() => setSelectedCategory(category.id)}
                        >
                          <Text style={[
                            styles.categoryChipText,
                            selectedCategory === category.id && styles.categoryChipTextActive
                          ]}>
                            {category.name}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                  
                  <View style={styles.inputContainer}>
                    <Text style={styles.inputLabel}>Color Theme</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      {GRADIENT_PRESETS.map((gradient, index) => (
                        <TouchableOpacity
                          key={index}
                          style={[
                            styles.gradientOption,
                            selectedGradient === index && styles.gradientOptionActive
                          ]}
                          onPress={() => setSelectedGradient(index)}
                        >
                          <LinearGradient
                            colors={gradient}
                            style={styles.gradientPreview}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                          />
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                </View>
                
                {/* Sections Builder */}
                <View style={styles.section}>
                  <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>🔧 Template Sections</Text>
                    <Text style={styles.sectionCount}>{sections.length}/10 sections</Text>
                  </View>
                  
                  {/* Add Section Buttons */}
                  <View style={styles.addSectionContainer}>
                    <Text style={styles.addSectionLabel}>Add Section:</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      {SECTION_TYPES.map(type => (
                        <TouchableOpacity
                          key={type.id}
                          style={[
                            styles.addSectionButton,
                            sections.length >= 10 && styles.addSectionButtonDisabled
                          ]}
                          onPress={() => addSection(type.id)}
                          disabled={sections.length >= 10}
                        >
                          <Ionicons name={type.icon as any} size={16} color={type.color} />
                          <Text style={styles.addSectionButtonText}>{type.name}</Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                  
                  {/* Sections List */}
                  {sections.map((section, index) => {
                    const typeInfo = getSectionTypeInfo(section.config.type);
                    return (
                      <View key={section.id} style={styles.sectionCard}>
                        <View style={styles.sectionCardHeader}>
                          <View style={styles.sectionInfo}>
                            <Ionicons name={typeInfo.icon as any} size={20} color={typeInfo.color} />
                            <Text style={styles.sectionTypeName}>{typeInfo.name}</Text>
                            <Text style={styles.sectionOrder}>#{index + 1}</Text>
                          </View>
                          
                          <View style={styles.sectionActions}>
                            <TouchableOpacity
                              style={styles.sectionActionButton}
                              onPress={() => moveSection(section.id, 'up')}
                              disabled={index === 0}
                            >
                              <Ionicons 
                                name="chevron-up" 
                                size={16} 
                                color={index === 0 ? "#666" : "#00FFFF"} 
                              />
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={styles.sectionActionButton}
                              onPress={() => moveSection(section.id, 'down')}
                              disabled={index === sections.length - 1}
                            >
                              <Ionicons 
                                name="chevron-down" 
                                size={16} 
                                color={index === sections.length - 1 ? "#666" : "#00FFFF"} 
                              />
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={[styles.sectionActionButton, styles.deleteButton]}
                              onPress={() => removeSection(section.id)}
                            >
                              <Ionicons name="trash" size={16} color="#FF6B6B" />
                            </TouchableOpacity>
                          </View>
                        </View>
                        
                        <View style={styles.sectionInputs}>
                          <View style={styles.inputWrapper}>
                            <TextInput
                              style={styles.sectionInput}
                              placeholder="Section label (e.g., 'Post Title', 'Main Content')"
                              placeholderTextColor="#888"
                              value={section.label}
                              onChangeText={(text) => updateSection(section.id, { label: text })}
                              maxLength={50}
                            />
                            <Text style={styles.sectionCharacterCount}>{section.label.length}/50</Text>
                          </View>
                          <View style={styles.inputWrapper}>
                            <TextInput
                              style={[styles.sectionInput, styles.sectionPlaceholder]}
                              placeholder="Placeholder text for users"
                              placeholderTextColor="#888"
                              value={section.config.placeholder}
                              onChangeText={(text) => updateSection(section.id, {
                                config: { ...section.config, placeholder: text }
                              })}
                              maxLength={100}
                            />
                            <Text style={styles.sectionCharacterCount}>{section.config.placeholder.length}/100</Text>
                          </View>
                        </View>
                      </View>
                    );
                  })}
                  
                  {sections.length === 0 && (
                    <View style={styles.emptySections}>
                      <Ionicons name="add-circle-outline" size={48} color="#666" />
                      <Text style={styles.emptySectionsText}>No sections added yet</Text>
                      <Text style={styles.emptySectionsSubtext}>Add sections above to build your template</Text>
                    </View>
                  )}
                </View>
                
                {/* Preview Section */}
                {sections.length > 0 && (
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>👀 Preview</Text>
                    <View style={styles.previewCard}>
                      <LinearGradient
                        colors={GRADIENT_PRESETS[selectedGradient]}
                        style={styles.previewGradient}
                      >
                        <Text style={styles.previewTitle}>{templateName || 'Template Name'}</Text>
                        <Text style={styles.previewDescription}>
                          {templateDescription || 'Template description'}
                        </Text>
                        <Text style={styles.previewSections}>
                          {sections.length} sections: {sections.map(s => s.label || 'Untitled').join(', ')}
                        </Text>
                      </LinearGradient>
                    </View>
                  </View>
                )}
              </ScrollView>
            </LinearGradient>
          </Animated.View>
        </View>
      </Modal>
    );
  } catch (error) {
    secureLog('CreateMyTemplate render error', { 
      error: error instanceof Error ? error.message : 'Unknown error',
      visible,
      hasUserId: !!userId
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
            <Text style={styles.errorFallbackTitle}>Unable to Load Template Creator</Text>
            <Text style={styles.errorFallbackText}>
              An error occurred while loading the template creator. Please try again.
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

export default CreateMyTemplate;

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
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  subtitle: {
    color: '#888',
    fontSize: 13,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#00FFFF',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 6,
  },
  saveButtonDisabled: {
    backgroundColor: '#666',
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#000000',
    fontSize: 14,
    fontWeight: 'bold',
  },
  
  // Content
  content: {
    flex: 1,
    padding: 20,
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionCount: {
    color: '#00FFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  
  // Input Styles
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    color: '#CCCCCC',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: '#FFFFFF',
    fontSize: 16,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  characterCount: {
    color: '#888',
    fontSize: 12,
    textAlign: 'right',
    marginTop: 4,
  },
  
  // Category Chips
  categoryChip: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  categoryChipActive: {
    backgroundColor: 'rgba(0, 255, 255, 0.2)',
    borderColor: '#00FFFF',
  },
  categoryChipText: {
    color: '#CCCCCC',
    fontSize: 14,
    fontWeight: '500',
  },
  categoryChipTextActive: {
    color: '#00FFFF',
    fontWeight: 'bold',
  },
  
  // Gradient Options
  gradientOption: {
    marginRight: 12,
    borderRadius: 12,
    padding: 2,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  gradientOptionActive: {
    borderColor: '#00FFFF',
  },
  gradientPreview: {
    width: 40,
    height: 40,
    borderRadius: 10,
  },
  
  // Add Section
  addSectionContainer: {
    marginBottom: 20,
  },
  addSectionLabel: {
    color: '#CCCCCC',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 10,
  },
  addSectionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    marginRight: 10,
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  addSectionButtonDisabled: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    opacity: 0.5,
  },
  addSectionButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '500',
  },
  
  // Section Cards
  sectionCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  sectionCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTypeName: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  sectionOrder: {
    color: '#888',
    fontSize: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  sectionActions: {
    flexDirection: 'row',
    gap: 4,
  },
  sectionActionButton: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  deleteButton: {
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
  },
  sectionInputs: {
    gap: 10,
  },
  inputWrapper: {
    position: 'relative',
  },
  sectionInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#FFFFFF',
    fontSize: 14,
  },
  sectionPlaceholder: {
    fontStyle: 'italic',
  },
  sectionCharacterCount: {
    color: '#666',
    fontSize: 10,
    textAlign: 'right',
    marginTop: 2,
  },
  
  // Empty State
  emptySections: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptySectionsText: {
    color: '#888',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 12,
  },
  emptySectionsSubtext: {
    color: '#666',
    fontSize: 12,
    marginTop: 4,
  },
  
  // Preview
  previewCard: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  previewGradient: {
    padding: 20,
    minHeight: 120,
  },
  previewTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  previewDescription: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
    marginBottom: 12,
  },
  previewSections: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 12,
    fontStyle: 'italic',
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
    fontSize: 18,
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
});