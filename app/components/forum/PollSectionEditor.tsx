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
  Modal,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

// Security utilities
import { validatePostContent, secureLog } from '../../utils/security';

// Types
interface TextStyle {
  fontSize: number;
  fontWeight: 'normal' | 'bold';
  fontStyle: 'normal' | 'italic';
  textDecorationLine: 'none' | 'underline' | 'line-through' | 'shadow' | 'outline' | 'gradient';
  textAlign: 'left' | 'center' | 'right' | 'justify';
  color: string;
  fontFamily: string;
}

interface PollOption {
  id: string;
  text: string;
  votes: number;
  percentage: number;
  color?: string;
}

interface PollSettings {
  allowMultiple: boolean;
  requireComment: boolean;
  isAnonymous: boolean;
  duration: number; // hours, 0 = no limit
  maxOptions: number;
  pollType: 'choice' | 'rating' | 'yesno';
  showResults: 'immediate' | 'after_vote' | 'after_close';
}

interface PollData {
  question: string;
  options: PollOption[];
  settings: PollSettings;
  category: 'prediction' | 'rating' | 'opinion' | 'general';
  totalVotes: number;
  isActive: boolean;
  createdAt: string;
  closesAt?: string;
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
  pollData?: PollData;
}

interface PollSectionEditorProps {
  section: TemplateSection;
  onContentChange: (content: string) => void;
  onStyleUpdate: (styleUpdates: Partial<TextStyle>) => void;
  onSectionUpdate: (updates: Partial<TemplateSection>) => void;
  userVIPStatus: boolean;
  disabled: boolean;
}

// Constants
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const MAX_QUESTION_LENGTH = 200;
const MAX_OPTION_LENGTH = 100;
const FREE_MAX_OPTIONS = 4;
const VIP_MAX_OPTIONS = 8;
const MAX_DURATION_HOURS = 168; // 1 week

// Poll Type Configurations
const POLL_TYPES = [
  {
    id: 'choice',
    name: 'Multiple Choice',
    icon: 'checkmark-circle',
    description: 'Standard voting with multiple options',
    isVIP: false,
  },
  {
    id: 'yesno',
    name: 'Yes/No',
    icon: 'help-circle',
    description: 'Simple binary choice',
    isVIP: false,
  },
  {
    id: 'rating',
    name: 'Rating Scale',
    icon: 'star',
    description: '1-10 rating system',
    isVIP: false,
  },
] as const;

// Duration Options
const DURATION_OPTIONS = [
  { hours: 1, label: '1 Hour', isVIP: false },
  { hours: 6, label: '6 Hours', isVIP: false },
  { hours: 24, label: '1 Day', isVIP: false },
  { hours: 48, label: '2 Days', isVIP: false },
  { hours: 72, label: '3 Days', isVIP: true },
  { hours: 168, label: '1 Week', isVIP: true },
  { hours: 0, label: 'No Limit', isVIP: true },
] as const;

// Secure validation function
const securePollValidation = {
  validateQuestion: (question: string): { isValid: boolean; error?: string } => {
    if (typeof question !== 'string') {
      return { isValid: false, error: 'Question must be text' };
    }
    
    const trimmed = question.trim();
    if (trimmed.length === 0) {
      return { isValid: true }; // Allow empty during editing
    }
    
    if (question.length > MAX_QUESTION_LENGTH) {
      return { isValid: false, error: `Question too long (max ${MAX_QUESTION_LENGTH} characters)` };
    }
    
    // Only validate content if there's actual text
    if (trimmed.length > 0) {
      const contentValidation = validatePostContent(trimmed);
      if (!contentValidation.isValid) {
        return { isValid: false, error: contentValidation.errors?.[0] || 'Invalid content' };
      }
    }
    
    return { isValid: true };
  },
  
  validateOption: (option: string): { isValid: boolean; error?: string } => {
    if (typeof option !== 'string') {
      return { isValid: false, error: 'Option must be text' };
    }
    
    const trimmed = option.trim();
    if (trimmed.length === 0) {
      return { isValid: true }; // Empty options are allowed during editing
    }
    
    if (option.length > MAX_OPTION_LENGTH) {
      return { isValid: false, error: `Option too long (max ${MAX_OPTION_LENGTH} characters)` };
    }
    
    // Only validate content if there's actual text
    if (trimmed.length > 0) {
      const contentValidation = validatePostContent(trimmed);
      if (!contentValidation.isValid) {
        return { isValid: false, error: contentValidation.errors?.[0] || 'Invalid content' };
      }
    }
    
    return { isValid: true };
  },
};

const PollSectionEditor: React.FC<PollSectionEditorProps> = ({
  section,
  onContentChange,
  onStyleUpdate,
  onSectionUpdate,
  userVIPStatus,
  disabled,
}) => {
  const { t } = useTranslation();
  
  // Safety check with proper loading state
  const [isInitialized, setIsInitialized] = useState(false);
  
  // Create stable defaults using useMemo
  const defaultSettings = useMemo((): PollSettings => ({
    allowMultiple: false,
    requireComment: false,
    isAnonymous: false,
    duration: 24,
    maxOptions: userVIPStatus ? VIP_MAX_OPTIONS : FREE_MAX_OPTIONS,
    pollType: 'choice',
    showResults: 'after_vote',
  }), [userVIPStatus]);
  
  const defaultOptions = useMemo((): PollOption[] => [
    { id: '1', text: '', votes: 0, percentage: 0 },
    { id: '2', text: '', votes: 0, percentage: 0 },
  ], []);
  
  // Secure state initialization
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState<PollOption[]>([]);
  const [pollSettings, setPollSettings] = useState<PollSettings>(defaultSettings);
  const [pollCategory, setPollCategory] = useState<'prediction' | 'rating' | 'opinion' | 'general'>('general');
  
  // UI states
  const [showPollTypeSelector, setShowPollTypeSelector] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isDirty, setIsDirty] = useState(false);
  
  // Animation refs
  const slideAnimation = useRef(new Animated.Value(0)).current;
  const previewAnimation = useRef(new Animated.Value(1)).current;
  const optionAnimations = useRef<Record<string, Animated.Value>>({}).current;
  
  // Component mount ref
  const isMounted = useRef(true);
  
  // Initialize component safely
  useEffect(() => {
    isMounted.current = true;
    
    const initializeState = () => {
      try {
        let hasExistingContent = false;
        
        // Initialize question
        const initialQuestion = section?.pollData?.question;
        if (typeof initialQuestion === 'string') {
          setPollQuestion(initialQuestion);
          if (initialQuestion.trim().length > 0) {
            hasExistingContent = true;
          }
        }
        
        // Initialize options
        const initialOptions = section?.pollData?.options;
        if (Array.isArray(initialOptions) && initialOptions.length > 0) {
          const safeOptions = initialOptions.map((option, index) => ({
            id: option?.id || (index + 1).toString(),
            text: typeof option?.text === 'string' ? option.text : '',
            votes: typeof option?.votes === 'number' ? option.votes : 0,
            percentage: typeof option?.percentage === 'number' ? option.percentage : 0,
            color: option?.color,
          }));
          setPollOptions(safeOptions);
          
          // Check if any options have content
          if (safeOptions.some(opt => opt.text && opt.text.trim().length > 0)) {
            hasExistingContent = true;
          }
          
          // Initialize animations for existing options
          safeOptions.forEach(option => {
            if (!optionAnimations[option.id]) {
              optionAnimations[option.id] = new Animated.Value(1);
            }
          });
        } else {
          setPollOptions([...defaultOptions]);
          // Initialize animations for default options
          defaultOptions.forEach(option => {
            if (!optionAnimations[option.id]) {
              optionAnimations[option.id] = new Animated.Value(1);
            }
          });
        }
        
        // Initialize settings
        const initialSettings = section?.pollData?.settings;
        if (initialSettings && typeof initialSettings === 'object') {
          setPollSettings({
            allowMultiple: Boolean(initialSettings.allowMultiple),
            requireComment: Boolean(initialSettings.requireComment),
            isAnonymous: Boolean(initialSettings.isAnonymous),
            duration: typeof initialSettings.duration === 'number' ? 
              Math.max(0, Math.min(initialSettings.duration, MAX_DURATION_HOURS)) : 24,
            maxOptions: typeof initialSettings.maxOptions === 'number' ? 
              Math.max(2, Math.min(initialSettings.maxOptions, userVIPStatus ? VIP_MAX_OPTIONS : FREE_MAX_OPTIONS)) : 
              (userVIPStatus ? VIP_MAX_OPTIONS : FREE_MAX_OPTIONS),
            pollType: ['choice', 'rating', 'yesno'].includes(initialSettings.pollType) ? 
              initialSettings.pollType : 'choice',
            showResults: ['immediate', 'after_vote', 'after_close'].includes(initialSettings.showResults) ? 
              initialSettings.showResults : 'after_vote',
          });
          hasExistingContent = true; // Any existing settings means it has content
        }
        
        // Initialize category
        const initialCategory = section?.pollData?.category;
        if (['prediction', 'rating', 'opinion', 'general'].includes(initialCategory)) {
          setPollCategory(initialCategory);
        }
        
        // IMPORTANT: Set isDirty to false for fresh initialization, true if existing content
        console.log('🔵 Initialization - hasExistingContent:', hasExistingContent);
        setIsDirty(hasExistingContent);
        setIsInitialized(true);
        
        // Animate in
        Animated.spring(slideAnimation, {
          toValue: 1,
          useNativeDriver: true,
          tension: 120,
          friction: 8,
        }).start();
        
      } catch (error) {
        console.error('Error initializing poll editor:', error);
        setIsInitialized(true); // Still show the editor
      }
    };
    
    initializeState();
    
    return () => {
      isMounted.current = false;
    };
  }, [section, defaultOptions, defaultSettings, userVIPStatus, slideAnimation, optionAnimations]);
  
  // Format poll for content preview (memoized)
  const formatPollForContent = useCallback((pollData: PollData): string => {
    try {
      const question = pollData.question || '';
      const pollType = pollData.settings?.pollType || 'choice';
      
      let content = `🗳️ ${getPollTypeIcon(pollType)} ${question}\n`;
      
      if (pollData.options && Array.isArray(pollData.options) && pollData.options.length > 0) {
        content += '\nOptions:\n';
        pollData.options.forEach((option, index) => {
          if (option && typeof option.text === 'string' && option.text.trim()) {
            content += `${index + 1}. ${option.text}\n`;
          }
        });
      }
        
      if (pollData.settings && typeof pollData.settings.duration === 'number' && pollData.settings.duration > 0) {
        content += `\n⏰ Closes in ${pollData.settings.duration} hours`;
      }
        
      return content.trim();
    } catch (error) {
      console.error('Error formatting poll content:', error);
      return 'Poll configuration...';
    }
  }, []);
  
  // Get poll type icon (memoized)
  const getPollTypeIcon = useCallback((type: string): string => {
    switch (type) {
      case 'choice': return '☑️';
      case 'yesno': return '❓';
      case 'rating': return '⭐';
      default: return '🗳️';
    }
  }, []);
  
  // Manual save function
  const performManualSave = useCallback(() => {
    if (!isMounted.current) return;
    
    try {
      // Validate content before saving
      const questionValid = pollQuestion.trim().length > 0;
      const validOptions = pollOptions.filter(opt => opt?.text?.trim()).length >= 2;
      
      if (!questionValid) {
        Alert.alert('Validation Error', 'Please enter a poll question.');
        return;
      }
      
      if (!validOptions) {
        Alert.alert('Validation Error', 'Please provide at least 2 poll options.');
        return;
      }
      
      // Validate question content
      if (pollQuestion.trim().length > 0) {
        const questionValidation = validatePostContent(pollQuestion.trim());
        if (!questionValidation.isValid) {
          Alert.alert('Content Error', questionValidation.errors?.[0] || 'Invalid question content');
          return;
        }
      }
      
      // Validate options content
      for (const option of pollOptions) {
        if (option?.text?.trim()) {
          const optionValidation = validatePostContent(option.text.trim());
          if (!optionValidation.isValid) {
            Alert.alert('Content Error', `Invalid option content: ${optionValidation.errors?.[0] || 'Invalid content'}`);
            return;
          }
        }
      }
      
      const pollData: PollData = {
        question: pollQuestion.trim(),
        options: pollOptions.filter(opt => opt?.text?.trim()), // Only save options with content
        settings: { ...pollSettings },
        category: pollCategory,
        totalVotes: pollOptions.reduce((sum, opt) => sum + (opt?.votes || 0), 0),
        isActive: true,
        createdAt: section?.pollData?.createdAt || new Date().toISOString(),
        closesAt: pollSettings.duration > 0 ? 
          new Date(Date.now() + pollSettings.duration * 60 * 60 * 1000).toISOString() : 
          undefined,
      };
      
      const formattedContent = formatPollForContent(pollData);
      
      // Update section with poll data - do this FIRST
      onSectionUpdate({
        pollData: pollData,
        content: formattedContent,
      });
      
      // Then update content for preview - do this SECOND
      // Note: For poll sections, this call should be ignored by AdvancedTemplateEditor
      onContentChange(formattedContent);
      
      // Clear dirty state and errors after successful save
      setIsDirty(false);
      setErrors({});
      
      Alert.alert('Success', 'Poll saved successfully!');
      
      secureLog('Poll manually saved', {
        sectionId: section.id,
        pollType: pollData.settings?.pollType || 'choice',
        optionCount: pollData.options?.length || 0,
        category: pollData.category,
      });
      
    } catch (error) {
      console.error('Error in manual save:', error);
      Alert.alert('Error', 'Failed to save poll. Please try again.');
    }
  }, [pollQuestion, pollOptions, pollSettings, pollCategory, section, onSectionUpdate, onContentChange, formatPollForContent]);
  
  // Clear error for field
  const clearError = useCallback((field: string) => {
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[field];
      return newErrors;
    });
  }, []);
  
  // Set error for field
  const setError = useCallback((field: string, error: string) => {
    setErrors(prev => ({ ...prev, [field]: error }));
  }, []);
  
  // Handle question change with validation
  const handleQuestionChange = useCallback((text: string) => {
    if (!isMounted.current) return;
    
    console.log('🟢 Question changed:', text);
    console.log('🟢 Setting isDirty to true');
    
    setPollQuestion(text);
    clearError('question');
    
    // Only validate if text is getting long
    if (text.length > MAX_QUESTION_LENGTH) {
      setError('question', `Question too long (max ${MAX_QUESTION_LENGTH} characters)`);
    }
    
    setIsDirty(true);
  }, [clearError, setError]);
  
  // Handle option change with validation
  const handleOptionChange = useCallback((optionId: string, text: string) => {
    if (!isMounted.current) return;
    
    console.log('🟢 Option changed:', optionId, text);
    console.log('🟢 Setting isDirty to true');
    
    setPollOptions(prev => {
      return prev.map(option => 
        option?.id === optionId 
          ? { ...option, text }
          : option
      );
    });
    
    clearError(`option_${optionId}`);
    
    // Only validate if text is getting long
    if (text.length > MAX_OPTION_LENGTH) {
      setError(`option_${optionId}`, `Option too long (max ${MAX_OPTION_LENGTH} characters)`);
    }
    
    setIsDirty(true);
  }, [clearError, setError]);
  
  // Add new option
  const addOption = useCallback(() => {
    if (!isMounted.current) return;
    
    try {
      const maxOptions = pollSettings.maxOptions;
      
      if (pollOptions.length >= maxOptions) {
        const upgradeMessage = userVIPStatus 
          ? 'Maximum number of options reached.'
          : `Free users are limited to ${FREE_MAX_OPTIONS} options. Upgrade to VIP for up to ${VIP_MAX_OPTIONS} options!`;
        
        Alert.alert('Option Limit', upgradeMessage);
        return;
      }
      
      const newOption: PollOption = {
        id: `option_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        text: '',
        votes: 0,
        percentage: 0,
      };
      
      // Initialize animation immediately
      optionAnimations[newOption.id] = new Animated.Value(0);
      
      // Update options state
      setPollOptions(prev => [...prev, newOption]);
      
      // Animate new option
      Animated.spring(optionAnimations[newOption.id], {
        toValue: 1,
        useNativeDriver: true,
        tension: 120,
        friction: 8,
      }).start();
      
      setIsDirty(true);
      Vibration.vibrate(30);
      
    } catch (error) {
      console.error('Error adding option:', error);
      Alert.alert('Error', 'Failed to add option');
    }
  }, [pollOptions.length, pollSettings.maxOptions, userVIPStatus, optionAnimations]);
  
  // Remove option
  const removeOption = useCallback((optionId: string) => {
    if (!isMounted.current) return;
    
    try {
      if (pollOptions.length <= 2) {
        Alert.alert('Minimum Options', 'Polls must have at least 2 options.');
        return;
      }
      
      // Animate out
      if (optionAnimations[optionId]) {
        Animated.timing(optionAnimations[optionId], {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }).start(() => {
          if (isMounted.current) {
            setPollOptions(prev => prev.filter(option => option?.id !== optionId));
            delete optionAnimations[optionId];
          }
        });
      } else {
        setPollOptions(prev => prev.filter(option => option?.id !== optionId));
      }
      
      // Clear any errors for this option
      clearError(`option_${optionId}`);
      
      setIsDirty(true);
      Vibration.vibrate(50);
      
    } catch (error) {
      console.error('Error removing option:', error);
      Alert.alert('Error', 'Failed to remove option');
    }
  }, [pollOptions.length, optionAnimations, clearError]);
  
  // Change poll type
  const changePollType = useCallback((type: string) => {
    if (!isMounted.current) return;
    
    try {
      const pollType = POLL_TYPES.find(pt => pt.id === type);
      if (!pollType) return;
      
      // Check VIP requirement
      if (pollType.isVIP && !userVIPStatus) {
        Alert.alert(
          'VIP Feature',
          'This poll type is available for VIP members only.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Upgrade to VIP', style: 'default' },
          ]
        );
        return;
      }
      
      setPollSettings(prev => ({ 
        ...prev, 
        pollType: type as PollSettings['pollType']
      }));
      
      // Handle special poll type setups
      if (type === 'yesno') {
        const newOptions = [
          { id: 'yes_option', text: 'Yes', votes: 0, percentage: 0 },
          { id: 'no_option', text: 'No', votes: 0, percentage: 0 },
        ];
        setPollOptions(newOptions);
        // Initialize animations
        newOptions.forEach(option => {
          if (!optionAnimations[option.id]) {
            optionAnimations[option.id] = new Animated.Value(1);
          }
        });
      } else if (type === 'rating') {
        const newOptions = [
          { id: 'rating_1', text: 'Poor (1-2)', votes: 0, percentage: 0 },
          { id: 'rating_2', text: 'Below Average (3-4)', votes: 0, percentage: 0 },
          { id: 'rating_3', text: 'Average (5-6)', votes: 0, percentage: 0 },
          { id: 'rating_4', text: 'Good (7-8)', votes: 0, percentage: 0 },
          { id: 'rating_5', text: 'Excellent (9-10)', votes: 0, percentage: 0 },
        ];
        setPollOptions(newOptions);
        // Initialize animations
        newOptions.forEach(option => {
          if (!optionAnimations[option.id]) {
            optionAnimations[option.id] = new Animated.Value(1);
          }
        });
      }
      
      setShowPollTypeSelector(false);
      setIsDirty(true); // Make sure dirty flag is set
      Vibration.vibrate(30);
      
    } catch (error) {
      console.error('Error changing poll type:', error);
      Alert.alert('Error', 'Failed to change poll type');
    }
  }, [userVIPStatus, optionAnimations]);
  
  // Update settings
  const updateSetting = useCallback((key: keyof PollSettings, value: any) => {
    if (!isMounted.current) return;
    
    try {
      setPollSettings(prev => ({ 
        ...prev, 
        [key]: value 
      }));
      setIsDirty(true); // Make sure dirty flag is set
      Vibration.vibrate(20);
    } catch (error) {
      console.error('Error updating setting:', error);
    }
  }, []);
  
  // Preview animation
  const animatePreview = useCallback(() => {
    Animated.sequence([
      Animated.timing(previewAnimation, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(previewAnimation, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
  }, [previewAnimation]);
  
  // Calculate progress (memoized to prevent re-renders)
  const pollProgress = useMemo(() => {
    const questionComplete = pollQuestion.trim().length > 0;
    const optionsComplete = pollOptions.filter(opt => 
      opt && opt.text && opt.text.trim().length > 0
    ).length >= 2;
    return { 
      questionComplete, 
      optionsComplete, 
      isComplete: questionComplete && optionsComplete 
    };
  }, [pollQuestion, pollOptions]);
  
  // Character counts (memoized)
  const questionCharCount = useMemo(() => 
    `${pollQuestion.length}/${MAX_QUESTION_LENGTH}`, 
    [pollQuestion.length]
  );
  
  // Trigger preview animation when poll changes
  useEffect(() => {
    if (pollProgress.questionComplete || pollProgress.optionsComplete) {
      animatePreview();
    }
  }, [pollProgress.questionComplete, pollProgress.optionsComplete, animatePreview]);
  
  // Initialize option animations
  useEffect(() => {
    pollOptions.forEach(option => {
      if (option?.id && !optionAnimations[option.id]) {
        optionAnimations[option.id] = new Animated.Value(1);
      }
    });
  }, [pollOptions, optionAnimations]);
  
  // Loading state
  if (!isInitialized) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading poll editor...</Text>
      </View>
    );
  }
  
  // Debug log for render
  console.log('🔵 PollSectionEditor render - isDirty:', isDirty, 'isInitialized:', isInitialized);
  
  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ scale: slideAnimation }],
          opacity: slideAnimation,
        },
      ]}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons name="bar-chart" size={20} color="#FF69B4" />
          <Text style={styles.headerTitle}>Interactive Poll</Text>
          {isDirty && (
            <View style={styles.dirtyIndicator}>
              <Text style={styles.dirtyText}>Unsaved Changes</Text>
            </View>
          )}
        </View>
        
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.quickAction}
            onPress={() => setShowPollTypeSelector(true)}
          >
            <Ionicons name="options" size={18} color="#FF69B4" />
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.quickAction}
            onPress={() => setShowSettingsModal(true)}
          >
            <Ionicons name="settings" size={18} color="#00FFFF" />
          </TouchableOpacity>
          
          {/* Manual Save Button */}
          <TouchableOpacity
            style={[
              styles.saveButton, 
              !isDirty && styles.saveButtonDisabled
            ]}
            onPress={() => {
              console.log('🟢 Save button pressed, isDirty:', isDirty);
              if (isDirty) {
                performManualSave();
              } else {
                console.log('🔴 Save button disabled - no changes to save');
              }
            }}
            activeOpacity={isDirty ? 0.7 : 1}
            pointerEvents={isDirty ? 'auto' : 'none'}
          >
            <Ionicons 
              name="save" 
              size={18} 
              color={isDirty ? "#32CD32" : "#888"} 
            />
            <Text style={[
              styles.saveButtonText, 
              !isDirty && styles.saveButtonTextDisabled
            ]}>
              Save {isDirty ? '✓' : '✗'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
      
      {/* Progress Indicator */}
      <View style={styles.progressContainer}>
        <View style={styles.progressItem}>
          <Ionicons
            name={pollProgress.questionComplete ? "checkmark-circle" : "ellipse-outline"}
            size={16}
            color={pollProgress.questionComplete ? "#32CD32" : "#888"}
          />
          <Text style={[styles.progressText, pollProgress.questionComplete && styles.progressComplete]}>
            Question
          </Text>
        </View>
        
        <View style={styles.progressItem}>
          <Ionicons
            name={pollProgress.optionsComplete ? "checkmark-circle" : "ellipse-outline"}
            size={16}
            color={pollProgress.optionsComplete ? "#32CD32" : "#888"}
          />
          <Text style={[styles.progressText, pollProgress.optionsComplete && styles.progressComplete]}>
            Options ({pollOptions.filter(opt => opt?.text?.trim()).length}/2+)
          </Text>
        </View>
        
        <View style={styles.progressItem}>
          <Ionicons
            name={pollProgress.isComplete ? "checkmark-circle" : "ellipse-outline"}
            size={16}
            color={pollProgress.isComplete ? "#32CD32" : "#888"}
          />
          <Text style={[styles.progressText, pollProgress.isComplete && styles.progressComplete]}>
            Ready
          </Text>
        </View>
      </View>
      
      {/* Question Input */}
      <View style={styles.inputSection}>
        <Text style={styles.inputLabel}>Poll Question</Text>
        <View style={[styles.inputContainer, errors.question && styles.inputError]}>
          <LinearGradient
            colors={['rgba(255, 105, 180, 0.1)', 'transparent']}
            style={styles.inputGradient}
          >
            <TextInput
              style={styles.questionInput}
              placeholder="What do you want to ask your community?"
              placeholderTextColor="#888"
              value={pollQuestion}
              onChangeText={handleQuestionChange}
              maxLength={MAX_QUESTION_LENGTH}
              multiline
              editable={!disabled}
            />
          </LinearGradient>
        </View>
        <View style={styles.inputFooter}>
          <Text style={styles.charCount}>{questionCharCount}</Text>
          {errors.question && <Text style={styles.errorText}>{errors.question}</Text>}
        </View>
      </View>
      
      {/* Poll Options */}
      <View style={styles.optionsSection}>
        <View style={styles.optionsHeader}>
          <Text style={styles.optionsLabel}>Poll Options</Text>
          <TouchableOpacity
            style={[
              styles.addOptionButton,
              pollOptions.length >= pollSettings.maxOptions && styles.addOptionButtonDisabled,
            ]}
            onPress={addOption}
            disabled={pollOptions.length >= pollSettings.maxOptions}
          >
            <Ionicons
              name="add-circle"
              size={20}
              color={pollOptions.length >= pollSettings.maxOptions ? "#888" : "#32CD32"}
            />
            <Text style={[
              styles.addOptionText,
              pollOptions.length >= pollSettings.maxOptions && styles.addOptionTextDisabled,
            ]}>
              Add Option ({pollOptions.length}/{pollSettings.maxOptions})
            </Text>
          </TouchableOpacity>
        </View>
        
        <ScrollView style={styles.optionsList} showsVerticalScrollIndicator={false}>
          {pollOptions.map((option, index) => {
            if (!option?.id) return null;
            
            return (
              <Animated.View
                key={option.id}
                style={[
                  styles.optionContainer,
                  {
                    opacity: optionAnimations[option.id] || 1,
                    transform: [
                      {
                        scale: optionAnimations[option.id] || 1,
                      },
                    ],
                  },
                ]}
              >
                <LinearGradient
                  colors={['rgba(255, 105, 180, 0.1)', 'transparent']}
                  style={styles.optionGradient}
                >
                  <View style={styles.optionHeader}>
                    <Text style={styles.optionNumber}>{index + 1}</Text>
                    {pollOptions.length > 2 && (
                      <TouchableOpacity
                        style={styles.removeOptionButton}
                        onPress={() => removeOption(option.id)}
                      >
                        <Ionicons name="close-circle" size={20} color="#FF6347" />
                      </TouchableOpacity>
                    )}
                  </View>
                  
                  <TextInput
                    style={[
                      styles.optionInput,
                      errors[`option_${option.id}`] && styles.optionInputError,
                    ]}
                    placeholder={`Option ${index + 1}`}
                    placeholderTextColor="#888"
                    value={option.text || ''}
                    onChangeText={(text) => handleOptionChange(option.id, text)}
                    maxLength={MAX_OPTION_LENGTH}
                    editable={!disabled}
                  />
                  
                  <Text style={styles.optionCharCount}>
                    {(option.text || '').length}/{MAX_OPTION_LENGTH}
                  </Text>
                  
                  {errors[`option_${option.id}`] && (
                    <Text style={styles.optionError}>{errors[`option_${option.id}`]}</Text>
                  )}
                </LinearGradient>
              </Animated.View>
            );
          })}
        </ScrollView>
      </View>
      
      {/* Live Preview */}
      {pollProgress.isComplete && (
        <Animated.View
          style={[
            styles.previewContainer,
            {
              transform: [{ scale: previewAnimation }],
            },
          ]}
        >
          <Text style={styles.previewLabel}>Poll Preview:</Text>
          
          <View style={styles.pollPreview}>
            <LinearGradient
              colors={['rgba(255, 105, 180, 0.1)', 'rgba(255, 105, 180, 0.05)']}
              style={styles.pollPreviewGradient}
            >
              <View style={styles.pollPreviewHeader}>
                <Text style={styles.pollPreviewIcon}>{getPollTypeIcon(pollSettings.pollType)}</Text>
                <Text style={styles.pollPreviewQuestion} numberOfLines={3}>
                  {pollQuestion}
                </Text>
              </View>
              
              <View style={styles.pollPreviewOptions}>
                {pollOptions.filter(opt => opt?.text?.trim()).map((option, index) => (
                  <View key={option.id} style={styles.pollPreviewOption}>
                    <View style={styles.pollPreviewOptionBadge}>
                      <Text style={styles.pollPreviewOptionNumber}>{index + 1}</Text>
                    </View>
                    <Text style={styles.pollPreviewOptionText} numberOfLines={2}>
                      {option.text}
                    </Text>
                    <Text style={styles.pollPreviewPercentage}>0%</Text>
                  </View>
                ))}
              </View>
              
              <View style={styles.pollPreviewFooter}>
                <Text style={styles.pollPreviewMeta}>
                  0 votes • {pollSettings.duration > 0 ? `${pollSettings.duration}h remaining` : 'No time limit'}
                </Text>
              </View>
            </LinearGradient>
          </View>
        </Animated.View>
      )}
      
      {/* Poll Type Selector Modal */}
      <Modal
        visible={showPollTypeSelector}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPollTypeSelector(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.pollTypeModal}>
            <LinearGradient
              colors={['rgba(18, 25, 40, 0.95)', 'rgba(10, 15, 25, 0.9)']}
              style={styles.pollTypeContent}
            >
              <View style={styles.pollTypeHeader}>
                <Text style={styles.pollTypeTitle}>Choose Poll Type</Text>
                <TouchableOpacity onPress={() => setShowPollTypeSelector(false)}>
                  <Ionicons name="close" size={24} color="#888" />
                </TouchableOpacity>
              </View>
              
              <ScrollView style={styles.pollTypeList}>
                {POLL_TYPES.map(pollType => (
                  <TouchableOpacity
                    key={pollType.id}
                    style={[
                      styles.pollTypeItem,
                      pollType.isVIP && !userVIPStatus && styles.pollTypeItemLocked,
                      pollSettings.pollType === pollType.id && styles.pollTypeItemActive,
                    ]}
                    onPress={() => changePollType(pollType.id)}
                    disabled={pollType.isVIP && !userVIPStatus}
                  >
                    <LinearGradient
                      colors={
                        pollType.isVIP && !userVIPStatus
                          ? ['rgba(255, 215, 0, 0.1)', 'transparent']
                          : pollSettings.pollType === pollType.id
                          ? ['rgba(255, 105, 180, 0.2)', 'rgba(255, 105, 180, 0.1)']
                          : ['rgba(255, 255, 255, 0.05)', 'transparent']
                      }
                      style={styles.pollTypeItemGradient}
                    >
                      <View style={styles.pollTypeItemHeader}>
                        <Ionicons
                          name={pollType.icon as any}
                          size={24}
                          color={
                            pollSettings.pollType === pollType.id 
                              ? "#FF69B4" 
                              : pollType.isVIP && !userVIPStatus 
                              ? "#FFD700" 
                              : "#FF69B4"
                          }
                        />
                        <Text style={[
                          styles.pollTypeName,
                          pollType.isVIP && !userVIPStatus && styles.pollTypeNameLocked,
                          pollSettings.pollType === pollType.id && styles.pollTypeNameActive,
                        ]}>
                          {pollType.name}
                          {pollType.isVIP && (
                            <Text style={styles.vipBadge}> 👑</Text>
                          )}
                        </Text>
                      </View>
                      <Text style={styles.pollTypeDescription}>{pollType.description}</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </LinearGradient>
          </View>
        </View>
      </Modal>
      
      {/* Settings Modal */}
      <Modal
        visible={showSettingsModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSettingsModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.settingsModal}>
            <LinearGradient
              colors={['rgba(18, 25, 40, 0.95)', 'rgba(10, 15, 25, 0.9)']}
              style={styles.settingsContent}
            >
              <View style={styles.settingsHeader}>
                <Text style={styles.settingsTitle}>Poll Settings</Text>
                <TouchableOpacity onPress={() => setShowSettingsModal(false)}>
                  <Ionicons name="close" size={24} color="#888" />
                </TouchableOpacity>
              </View>
              
              <ScrollView style={styles.settingsList}>
                {/* Duration Setting */}
                <View style={styles.settingSection}>
                  <Text style={styles.settingSectionTitle}>Poll Duration</Text>
                  <View style={styles.durationOptions}>
                    {DURATION_OPTIONS.map(duration => (
                      <TouchableOpacity
                        key={duration.hours}
                        style={[
                          styles.durationOption,
                          duration.isVIP && !userVIPStatus && styles.durationOptionLocked,
                          pollSettings.duration === duration.hours && styles.durationOptionActive,
                        ]}
                        onPress={() => updateSetting('duration', duration.hours)}
                        disabled={duration.isVIP && !userVIPStatus}
                      >
                        <Text style={[
                          styles.durationOptionText,
                          duration.isVIP && !userVIPStatus && styles.durationOptionTextLocked,
                          pollSettings.duration === duration.hours && styles.durationOptionTextActive,
                        ]}>
                          {duration.label}
                          {duration.isVIP && ' 👑'}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </ScrollView>
            </LinearGradient>
          </View>
        </View>
      </Modal>
    </Animated.View>
  );
};

export default PollSectionEditor;

/* ----------------- OPTIMIZED POLL EDITOR STYLES ----------------- */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  
  // Loading
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    color: '#FF69B4',
    fontSize: 16,
  },
  
  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 105, 180, 0.2)',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 16,
  },
  headerTitle: {
    color: '#FF69B4',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  dirtyIndicator: {
    marginLeft: 12,
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    flexShrink: 0,
  },
  dirtyText: {
    color: '#FFD700',
    fontSize: 11,
    fontWeight: '500',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
    flexShrink: 0,
  },
  quickAction: {
    backgroundColor: 'rgba(255, 105, 180, 0.1)',
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 105, 180, 0.3)',
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(50, 205, 50, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(50, 205, 50, 0.3)',
    gap: 4,
  },
  saveButtonDisabled: {
    backgroundColor: 'rgba(136, 136, 136, 0.1)',
    borderColor: 'rgba(136, 136, 136, 0.3)',
    opacity: 0.5, // Make it more obviously disabled
  },
  saveButtonText: {
    color: '#32CD32',
    fontSize: 12,
    fontWeight: '600',
  },
  saveButtonTextDisabled: {
    color: '#888',
  },
  
  // Progress
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  progressItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  progressText: {
    color: '#888',
    fontSize: 11,
    fontWeight: '500',
  },
  progressComplete: {
    color: '#32CD32',
  },
  
  // Question Input
  inputSection: {
    marginBottom: 16,
  },
  inputLabel: {
    color: '#FF69B4',
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
  questionInput: {
    color: '#FFFFFF',
    fontSize: 16,
    padding: 16,
    minHeight: 80,
    textAlignVertical: 'top',
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
  
  // Options Section
  optionsSection: {
    flex: 1,
    marginBottom: 16,
  },
  optionsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  optionsLabel: {
    color: '#FF69B4',
    fontSize: 14,
    fontWeight: '600',
  },
  addOptionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(50, 205, 50, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(50, 205, 50, 0.3)',
    gap: 4,
  },
  addOptionButtonDisabled: {
    backgroundColor: 'rgba(136, 136, 136, 0.1)',
    borderColor: 'rgba(136, 136, 136, 0.3)',
  },
  addOptionText: {
    color: '#32CD32',
    fontSize: 12,
    fontWeight: '600',
  },
  addOptionTextDisabled: {
    color: '#888',
  },
  optionsList: {
    flex: 1,
  },
  optionContainer: {
    marginBottom: 12,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 105, 180, 0.2)',
  },
  optionGradient: {
    padding: 12,
  },
  optionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  optionNumber: {
    color: '#FF69B4',
    fontSize: 14,
    fontWeight: 'bold',
    backgroundColor: 'rgba(255, 105, 180, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    minWidth: 24,
    textAlign: 'center',
  },
  removeOptionButton: {
    padding: 4,
  },
  optionInput: {
    color: '#FFFFFF',
    fontSize: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    marginBottom: 4,
  },
  optionInputError: {
    borderColor: '#FF6347',
  },
  optionCharCount: {
    color: '#888',
    fontSize: 11,
    textAlign: 'right',
  },
  optionError: {
    color: '#FF6347',
    fontSize: 11,
    marginTop: 2,
  },
  
  // Preview
  previewContainer: {
    marginTop: 16,
    marginBottom: 16,
  },
  previewLabel: {
    color: '#FF69B4',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  pollPreview: {
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 105, 180, 0.3)',
  },
  pollPreviewGradient: {
    padding: 16,
  },
  pollPreviewHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
    gap: 8,
  },
  pollPreviewIcon: {
    fontSize: 20,
  },
  pollPreviewQuestion: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    flex: 1,
    lineHeight: 22,
  },
  pollPreviewOptions: {
    marginBottom: 12,
  },
  pollPreviewOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    gap: 12,
  },
  pollPreviewOptionBadge: {
    backgroundColor: 'rgba(255, 105, 180, 0.3)',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pollPreviewOptionNumber: {
    color: '#FF69B4',
    fontSize: 12,
    fontWeight: 'bold',
  },
  pollPreviewOptionText: {
    color: '#FFFFFF',
    fontSize: 14,
    flex: 1,
  },
  pollPreviewPercentage: {
    color: '#888',
    fontSize: 12,
    fontWeight: '600',
  },
  pollPreviewFooter: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 105, 180, 0.2)',
  },
  pollPreviewMeta: {
    color: '#888',
    fontSize: 12,
    marginBottom: 4,
  },
  
  // Modals
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  
  // Poll Type Modal
  pollTypeModal: {
    width: '100%',
    maxWidth: 400,
    maxHeight: '70%',
    borderRadius: 16,
    overflow: 'hidden',
  },
  pollTypeContent: {
    maxHeight: '100%',
  },
  pollTypeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 105, 180, 0.2)',
  },
  pollTypeTitle: {
    color: '#FF69B4',
    fontSize: 18,
    fontWeight: 'bold',
  },
  pollTypeList: {
    maxHeight: 400,
    padding: 16,
  },
  pollTypeItem: {
    marginBottom: 12,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 105, 180, 0.2)',
  },
  pollTypeItemLocked: {
    borderColor: 'rgba(255, 215, 0, 0.3)',
    opacity: 0.7,
  },
  pollTypeItemActive: {
    borderColor: '#FF69B4',
    borderWidth: 2,
  },
  pollTypeItemGradient: {
    padding: 16,
  },
  pollTypeItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 12,
  },
  pollTypeName: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  pollTypeNameLocked: {
    color: '#FFD700',
  },
  pollTypeNameActive: {
    color: '#FF69B4',
  },
  vipBadge: {
    color: '#FFD700',
  },
  pollTypeDescription: {
    color: '#888',
    fontSize: 13,
    lineHeight: 18,
  },
  
  // Settings Modal
  settingsModal: {
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
    borderRadius: 16,
    overflow: 'hidden',
  },
  settingsContent: {
    maxHeight: '100%',
  },
  settingsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 255, 255, 0.2)',
  },
  settingsTitle: {
    color: '#00FFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  settingsList: {
    maxHeight: 500,
    padding: 16,
  },
  settingSection: {
    marginBottom: 24,
  },
  settingSectionTitle: {
    color: '#00FFFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  durationOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  durationOption: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  durationOptionLocked: {
    borderColor: 'rgba(255, 215, 0, 0.3)',
    opacity: 0.7,
  },
  durationOptionActive: {
    borderColor: '#00FFFF',
    backgroundColor: 'rgba(0, 255, 255, 0.1)',
  },
  durationOptionText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  durationOptionTextLocked: {
    color: '#FFD700',
  },
  durationOptionTextActive: {
    color: '#00FFFF',
  },
});