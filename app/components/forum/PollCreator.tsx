import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
  Alert,
  Switch,
  Animated,
  Dimensions,
  Vibration,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

// Security utilities
import { validatePollContent, sanitizePollData, secureLog } from '../../utils/security';

// Types
interface PollOption {
  id: string;
  text: string;
  emoji?: string;
  color?: string;
}

interface PollSettings {
  isAnonymous: boolean;
  isBoost: boolean;
  allowMultipleVotes: boolean;
  showResultsAfterVote: boolean;
  hasTimeLimit: boolean;
  timeLimitHours: number;
  requireComment: boolean;
}

interface PollData {
  question: string;
  options: PollOption[];
  settings: PollSettings;
  category?: string;
}

interface PollCreatorProps {
  visible: boolean;
  onSave: (pollData: PollData) => void;
  onClose: () => void;
  existingData?: PollData | null;
}

// Constants
const MIN_OPTIONS = 2;
const MAX_OPTIONS = 8;
const MAX_QUESTION_LENGTH = 200;
const MAX_OPTION_LENGTH = 80;
const DEBOUNCE_MS = 300;

const DEFAULT_POLL_SETTINGS: PollSettings = {
  isAnonymous: false,
  isBoost: false,
  allowMultipleVotes: false,
  showResultsAfterVote: true,
  hasTimeLimit: false,
  timeLimitHours: 24,
  requireComment: false,
};

const POLL_COLORS = [
  '#00FFFF', '#FFD700', '#FF6347', '#32CD32', 
  '#FF69B4', '#9370DB', '#FFA500', '#20B2AA'
];

const POPULAR_EMOJIS = [
  '👍', '👎', '❤️', '😂', '😮', '😢', '😡', '🤔',
  '🔥', '💯', '⚡', '🎯', '🏆', '💪', '🙌', '👏'
];

const PollCreator: React.FC<PollCreatorProps> = ({
  visible,
  onSave,
  onClose,
  existingData,
}) => {
  const { t } = useTranslation();
  
  // Refs for cleanup and animations
  const isMountedRef = useRef(true);
  const slideAnimation = useRef(new Animated.Value(0)).current;
  const optionAnimations = useRef<{ [key: string]: Animated.Value }>({});
  
  // State management
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState<PollOption[]>([]);
  const [settings, setSettings] = useState<PollSettings>(DEFAULT_POLL_SETTINGS);
  const [activeTab, setActiveTab] = useState<'basic' | 'advanced'>('basic');
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [isValidating, setIsValidating] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState<string | null>(null);
  
  // Initialize component
  const initializePoll = useCallback(() => {
    if (existingData) {
      setQuestion(existingData.question || '');
      setOptions(existingData.options || []);
      setSettings({ ...DEFAULT_POLL_SETTINGS, ...existingData.settings });
    } else {
      setQuestion('');
      setOptions([
        { id: 'opt_1', text: '', color: POLL_COLORS[0] },
        { id: 'opt_2', text: '', color: POLL_COLORS[1] },
      ]);
      setSettings(DEFAULT_POLL_SETTINGS);
    }
    setErrors({});
    setShowEmojiPicker(null);
  }, [existingData]);
  
  // Animation effects
  const animateSlideIn = useCallback(() => {
    Animated.spring(slideAnimation, {
      toValue: 1,
      useNativeDriver: true,
      tension: 100,
      friction: 8,
    }).start();
  }, [slideAnimation]);
  
  const animateSlideOut = useCallback((callback?: () => void) => {
    Animated.timing(slideAnimation, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(callback);
  }, [slideAnimation]);
  
  const animateOptionAdd = useCallback((optionId: string) => {
    const animation = new Animated.Value(0);
    optionAnimations.current[optionId] = animation;
    
    Animated.spring(animation, {
      toValue: 1,
      useNativeDriver: true,
      tension: 100,
      friction: 8,
    }).start();
  }, []);
  
  const animateOptionRemove = useCallback((optionId: string, callback: () => void) => {
    const animation = optionAnimations.current[optionId];
    if (animation) {
      Animated.timing(animation, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start(() => {
        delete optionAnimations.current[optionId];
        callback();
      });
    } else {
      callback();
    }
  }, []);
  
  // Validation functions
  const validateQuestion = useCallback((questionText: string) => {
    const validation = validatePollContent(questionText.trim());
    if (!validation.isValid) {
      return validation.errors[0] || t('pollCreator.invalidQuestion');
    }
    if (questionText.trim().length < 10) {
      return t('pollCreator.questionTooShort');
    }
    if (questionText.trim().length > MAX_QUESTION_LENGTH) {
      return t('pollCreator.questionTooLong');
    }
    return null;
  }, [t]);
  
  const validateOption = useCallback((optionText: string) => {
    const validation = validatePollContent(optionText.trim());
    if (!validation.isValid) {
      return validation.errors[0] || t('pollCreator.invalidOption');
    }
    if (optionText.trim().length < 1) {
      return t('pollCreator.optionRequired');
    }
    if (optionText.trim().length > MAX_OPTION_LENGTH) {
      return t('pollCreator.optionTooLong');
    }
    return null;
  }, [t]);
  
  const validatePoll = useCallback(() => {
    const newErrors: { [key: string]: string } = {};
    
    // Validate question
    const questionError = validateQuestion(question);
    if (questionError) {
      newErrors.question = questionError;
    }
    
    // Validate options
    const validOptions = options.filter(opt => opt.text.trim());
    if (validOptions.length < MIN_OPTIONS) {
      newErrors.options = t('pollCreator.notEnoughOptions');
    }
    
    // Check for duplicate options
    const optionTexts = validOptions.map(opt => opt.text.trim().toLowerCase());
    const duplicates = optionTexts.filter((text, index) => optionTexts.indexOf(text) !== index);
    if (duplicates.length > 0) {
      newErrors.options = t('pollCreator.duplicateOptions');
    }
    
    // Validate individual options
    options.forEach((option, index) => {
      const optionError = validateOption(option.text);
      if (optionError && option.text.trim()) {
        newErrors[`option_${option.id}`] = optionError;
      }
    });
    
    // Validate time limit
    if (settings.hasTimeLimit && (settings.timeLimitHours < 1 || settings.timeLimitHours > 168)) {
      newErrors.timeLimit = t('pollCreator.invalidTimeLimit');
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [question, options, settings, validateQuestion, validateOption, t]);
  
  // Option management
  const addOption = useCallback(() => {
    if (options.length >= MAX_OPTIONS) {
      Alert.alert(t('pollCreator.maxOptionsTitle'), t('pollCreator.maxOptionsMessage'));
      return;
    }
    
    const newOptionId = `opt_${Date.now()}`;
    const newOption: PollOption = {
      id: newOptionId,
      text: '',
      color: POLL_COLORS[options.length % POLL_COLORS.length],
    };
    
    setOptions(prev => [...prev, newOption]);
    animateOptionAdd(newOptionId);
    Vibration.vibrate(50);
    
    secureLog('Poll option added', { 
      optionId: newOptionId, 
      totalOptions: options.length + 1 
    });
  }, [options, animateOptionAdd, t]);
  
  const removeOption = useCallback((optionId: string) => {
    if (options.length <= MIN_OPTIONS) {
      Alert.alert(t('pollCreator.minOptionsTitle'), t('pollCreator.minOptionsMessage'));
      return;
    }
    
    animateOptionRemove(optionId, () => {
      setOptions(prev => prev.filter(opt => opt.id !== optionId));
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[`option_${optionId}`];
        return newErrors;
      });
    });
    
    Vibration.vibrate(50);
    
    secureLog('Poll option removed', { 
      optionId, 
      remainingOptions: options.length - 1 
    });
  }, [options, animateOptionRemove, t]);
  
  const updateOption = useCallback((optionId: string, updates: Partial<PollOption>) => {
    setOptions(prev => prev.map(opt => 
      opt.id === optionId ? { ...opt, ...updates } : opt
    ));
    
    // Clear error for this option if text is being updated
    if (updates.text !== undefined) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[`option_${optionId}`];
        return newErrors;
      });
    }
  }, []);
  
  const addEmojiToOption = useCallback((optionId: string, emoji: string) => {
    updateOption(optionId, { emoji });
    setShowEmojiPicker(null);
  }, [updateOption]);
  
  // Settings management
  const updateSetting = useCallback(<K extends keyof PollSettings>(
    key: K, 
    value: PollSettings[K]
  ) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  }, []);
  
  // Save poll
  const handleSave = useCallback(async () => {
    setIsValidating(true);
    
    try {
      if (!validatePoll()) {
        Alert.alert(t('pollCreator.validationErrorTitle'), t('pollCreator.validationErrorMessage'));
        return;
      }
      
      const validOptions = options.filter(opt => opt.text.trim());
      
      const pollData: PollData = {
        question: question.trim(),
        options: validOptions,
        settings,
      };
      
      // Sanitize poll data
      const sanitizedData = sanitizePollData(pollData);
      
      secureLog('Poll created', { 
        optionCount: validOptions.length,
        hasTimeLimit: settings.hasTimeLimit,
        isAnonymous: settings.isAnonymous,
      });
      
      animateSlideOut(() => {
        onSave(sanitizedData);
      });
      
    } catch (error) {
      console.error('Error saving poll:', error);
      secureLog('Poll save error', { error: error.message });
      Alert.alert(t('pollCreator.saveErrorTitle'), t('pollCreator.saveErrorMessage'));
    } finally {
      setIsValidating(false);
    }
  }, [validatePoll, question, options, settings, animateSlideOut, onSave, t]);
  
  // Close handler
  const handleClose = useCallback(() => {
    animateSlideOut(() => {
      onClose();
    });
  }, [animateSlideOut, onClose]);
  
  // Modal lifecycle effects
  useEffect(() => {
    if (visible) {
      isMountedRef.current = true;
      initializePoll();
      animateSlideIn();
    } else {
      isMountedRef.current = false;
    }
  }, [visible, initializePoll, animateSlideIn]);
  
  // Cleanup
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);
  
  // Memoized values
  const isFormValid = useMemo(() => {
    return question.trim().length >= 10 && 
           options.filter(opt => opt.text.trim()).length >= MIN_OPTIONS &&
           Object.keys(errors).length === 0;
  }, [question, options, errors]);
  
  const progressPercentage = useMemo(() => {
    let progress = 0;
    if (question.trim()) progress += 40;
    if (options.filter(opt => opt.text.trim()).length >= 2) progress += 40;
    if (isFormValid) progress += 20;
    return progress;
  }, [question, options, isFormValid]);
  
  // Render option item
  const renderOption = useCallback((option: PollOption, index: number) => {
    const animation = optionAnimations.current[option.id] || new Animated.Value(1);
    
    return (
      <Animated.View
        key={option.id}
        style={[
          styles.optionContainer,
          {
            transform: [
              { scale: animation },
              { translateY: animation.interpolate({
                inputRange: [0, 1],
                outputRange: [20, 0],
              })}
            ],
            opacity: animation,
          }
        ]}
      >
        <LinearGradient
          colors={[`${option.color}15`, 'transparent']}
          style={styles.optionGradient}
        >
          <View style={styles.optionHeader}>
            <View style={[styles.colorIndicator, { backgroundColor: option.color }]} />
            <Text style={styles.optionLabel}>
              {t('pollCreator.optionLabel', { number: index + 1 })}
            </Text>
            <View style={styles.optionActions}>
              <TouchableOpacity
                onPress={() => setShowEmojiPicker(option.id)}
                style={styles.emojiButton}
              >
                <Text style={styles.emojiButtonText}>
                  {option.emoji || '😊'}
                </Text>
              </TouchableOpacity>
              {options.length > MIN_OPTIONS && (
                <TouchableOpacity
                  onPress={() => removeOption(option.id)}
                  style={styles.removeButton}
                >
                  <Ionicons name="trash" size={16} color="#FF6347" />
                </TouchableOpacity>
              )}
            </View>
          </View>
          
          <TextInput
            style={[
              styles.optionInput,
              errors[`option_${option.id}`] && styles.errorInput,
            ]}
            placeholder={t('pollCreator.optionPlaceholder', { number: index + 1 })}
            placeholderTextColor="#888"
            value={option.text}
            onChangeText={(text) => updateOption(option.id, { text })}
            maxLength={MAX_OPTION_LENGTH}
            multiline
          />
          
          {errors[`option_${option.id}`] && (
            <Text style={styles.errorText}>{errors[`option_${option.id}`]}</Text>
          )}
        </LinearGradient>
      </Animated.View>
    );
  }, [options, errors, updateOption, removeOption, setShowEmojiPicker, t]);
  
  // Render settings section
  const renderAdvancedSettings = useCallback(() => (
    <View style={styles.settingsSection}>
      <Text style={styles.sectionTitle}>{t('pollCreator.advancedSettings')}</Text>
      
      {/* Anonymous Voting */}
      <View style={styles.settingRow}>
        <View style={styles.settingInfo}>
          <Text style={styles.settingLabel}>{t('pollCreator.anonymousVoting')}</Text>
          <Text style={styles.settingDescription}>
            {t('pollCreator.anonymousDescription')}
          </Text>
        </View>
        <Switch
          value={settings.isAnonymous}
          onValueChange={(value) => updateSetting('isAnonymous', value)}
          trackColor={{ false: '#333', true: '#00FFFF66' }}
          thumbColor={settings.isAnonymous ? '#00FFFF' : '#666'}
        />
      </View>
      
      {/* Multiple Votes */}
      <View style={styles.settingRow}>
        <View style={styles.settingInfo}>
          <Text style={styles.settingLabel}>{t('pollCreator.multipleVotes')}</Text>
          <Text style={styles.settingDescription}>
            {t('pollCreator.multipleVotesDescription')}
          </Text>
        </View>
        <Switch
          value={settings.allowMultipleVotes}
          onValueChange={(value) => updateSetting('allowMultipleVotes', value)}
          trackColor={{ false: '#333', true: '#00FFFF66' }}
          thumbColor={settings.allowMultipleVotes ? '#00FFFF' : '#666'}
        />
      </View>
      
      {/* Show Results */}
      <View style={styles.settingRow}>
        <View style={styles.settingInfo}>
          <Text style={styles.settingLabel}>{t('pollCreator.showResults')}</Text>
          <Text style={styles.settingDescription}>
            {t('pollCreator.showResultsDescription')}
          </Text>
        </View>
        <Switch
          value={settings.showResultsAfterVote}
          onValueChange={(value) => updateSetting('showResultsAfterVote', value)}
          trackColor={{ false: '#333', true: '#00FFFF66' }}
          thumbColor={settings.showResultsAfterVote ? '#00FFFF' : '#666'}
        />
      </View>
      
      {/* Time Limit */}
      <View style={styles.settingRow}>
        <View style={styles.settingInfo}>
          <Text style={styles.settingLabel}>{t('pollCreator.timeLimit')}</Text>
          <Text style={styles.settingDescription}>
            {t('pollCreator.timeLimitDescription')}
          </Text>
        </View>
        <Switch
          value={settings.hasTimeLimit}
          onValueChange={(value) => updateSetting('hasTimeLimit', value)}
          trackColor={{ false: '#333', true: '#00FFFF66' }}
          thumbColor={settings.hasTimeLimit ? '#00FFFF' : '#666'}
        />
      </View>
      
      {settings.hasTimeLimit && (
        <View style={styles.timeLimitContainer}>
          <Text style={styles.timeLimitLabel}>{t('pollCreator.hoursLabel')}</Text>
          <TextInput
            style={styles.timeLimitInput}
            value={settings.timeLimitHours.toString()}
            onChangeText={(text) => {
              const hours = parseInt(text) || 24;
              updateSetting('timeLimitHours', Math.max(1, Math.min(168, hours)));
            }}
            keyboardType="numeric"
            maxLength={3}
          />
        </View>
      )}
      
      {/* Require Comment */}
      <View style={styles.settingRow}>
        <View style={styles.settingInfo}>
          <Text style={styles.settingLabel}>{t('pollCreator.requireComment')}</Text>
          <Text style={styles.settingDescription}>
            {t('pollCreator.requireCommentDescription')}
          </Text>
        </View>
        <Switch
          value={settings.requireComment}
          onValueChange={(value) => updateSetting('requireComment', value)}
          trackColor={{ false: '#333', true: '#00FFFF66' }}
          thumbColor={settings.requireComment ? '#00FFFF' : '#666'}
        />
      </View>
      
      {/* Boost Poll */}
      <View style={styles.settingRow}>
        <View style={styles.settingInfo}>
          <Text style={styles.settingLabel}>{t('pollCreator.boostPoll')}</Text>
          <Text style={styles.settingDescription}>
            {t('pollCreator.boostDescription')}
          </Text>
        </View>
        <Switch
          value={settings.isBoost}
          onValueChange={(value) => updateSetting('isBoost', value)}
          trackColor={{ false: '#333', true: '#FFD70066' }}
          thumbColor={settings.isBoost ? '#FFD700' : '#666'}
        />
      </View>
    </View>
  ), [settings, updateSetting, t]);
  
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
                    outputRange: [Dimensions.get('window').height, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <LinearGradient
            colors={['rgba(0, 20, 30, 0.98)', 'rgba(0, 10, 20, 0.99)']}
            style={styles.modalContent}
          >
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.headerTitle}>{t('pollCreator.title')}</Text>
              <TouchableOpacity 
                onPress={handleClose} 
                style={styles.closeButton}
                accessibilityRole="button"
                accessibilityLabel={t('common.close')}
              >
                <Ionicons name="close" size={24} color="#FFD700" />
              </TouchableOpacity>
            </View>
            
            {/* Progress Bar */}
            <View style={styles.progressContainer}>
              <LinearGradient
                colors={['#00FFFF', '#FFD700']}
                style={[styles.progressBar, { width: `${progressPercentage}%` }]}
              />
            </View>
            
            {/* Tabs */}
            <View style={styles.tabContainer}>
              <TouchableOpacity
                style={[styles.tab, activeTab === 'basic' && styles.activeTab]}
                onPress={() => setActiveTab('basic')}
              >
                <Text style={[styles.tabText, activeTab === 'basic' && styles.activeTabText]}>
                  {t('pollCreator.basicTab')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tab, activeTab === 'advanced' && styles.activeTab]}
                onPress={() => setActiveTab('advanced')}
              >
                <Text style={[styles.tabText, activeTab === 'advanced' && styles.activeTabText]}>
                  {t('pollCreator.advancedTab')}
                </Text>
              </TouchableOpacity>
            </View>
            
            <ScrollView 
              style={styles.content}
              showsVerticalScrollIndicator={false}
            >
              {activeTab === 'basic' ? (
                <View>
                  {/* Question Input */}
                  <View style={styles.questionSection}>
                    <Text style={styles.sectionTitle}>{t('pollCreator.questionTitle')}</Text>
                    <TextInput
                      style={[styles.questionInput, errors.question && styles.errorInput]}
                      placeholder={t('pollCreator.questionPlaceholder')}
                      placeholderTextColor="#888"
                      value={question}
                      onChangeText={setQuestion}
                      maxLength={MAX_QUESTION_LENGTH}
                      multiline
                    />
                    <Text style={styles.characterCount}>
                      {question.length}/{MAX_QUESTION_LENGTH}
                    </Text>
                    {errors.question && (
                      <Text style={styles.errorText}>{errors.question}</Text>
                    )}
                  </View>
                  
                  {/* Options */}
                  <View style={styles.optionsSection}>
                    <View style={styles.optionsHeader}>
                      <Text style={styles.sectionTitle}>{t('pollCreator.optionsTitle')}</Text>
                      <TouchableOpacity
                        onPress={addOption}
                        style={styles.addOptionButton}
                        disabled={options.length >= MAX_OPTIONS}
                      >
                        <Ionicons name="add" size={20} color="#00FFFF" />
                        <Text style={styles.addOptionText}>{t('pollCreator.addOption')}</Text>
                      </TouchableOpacity>
                    </View>
                    
                    {options.map((option, index) => renderOption(option, index))}
                    
                    {errors.options && (
                      <Text style={styles.errorText}>{errors.options}</Text>
                    )}
                  </View>
                </View>
              ) : (
                renderAdvancedSettings()
              )}
            </ScrollView>
            
            {/* Emoji Picker Modal */}
            {showEmojiPicker && (
              <View style={styles.emojiPickerOverlay}>
                <View style={styles.emojiPicker}>
                  <Text style={styles.emojiPickerTitle}>{t('pollCreator.selectEmoji')}</Text>
                  <View style={styles.emojiGrid}>
                    {POPULAR_EMOJIS.map((emoji, index) => (
                      <TouchableOpacity
                        key={index}
                        style={styles.emojiItem}
                        onPress={() => addEmojiToOption(showEmojiPicker, emoji)}
                      >
                        <Text style={styles.emojiText}>{emoji}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <TouchableOpacity
                    onPress={() => setShowEmojiPicker(null)}
                    style={styles.emojiCloseButton}
                  >
                    <Text style={styles.emojiCloseText}>{t('common.close')}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
            
            {/* Footer */}
            <View style={styles.footer}>
              <TouchableOpacity 
                onPress={handleClose} 
                style={styles.cancelButton}
              >
                <Text style={styles.cancelButtonText}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              
              <LinearGradient
                colors={isFormValid ? ['#00FFFF', '#0080FF'] : ['#666', '#444']}
                style={styles.saveButtonGradient}
              >
                <TouchableOpacity
                  onPress={handleSave}
                  style={styles.saveButton}
                  disabled={!isFormValid || isValidating}
                >
                  <Text style={styles.saveButtonText}>
                    {isValidating ? t('common.saving') : t('common.save')}
                  </Text>
                </TouchableOpacity>
              </LinearGradient>
            </View>
          </LinearGradient>
        </Animated.View>
      </View>
    </Modal>
  );
};

export default PollCreator;

/* ----------------- STYLES ----------------- */
const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#00FFFF22',
  },
  headerTitle: {
    color: '#FFD700',
    fontSize: 22,
    fontWeight: 'bold',
    textShadowColor: '#FFD70066',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 4,
  },
  closeButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
  },
  progressContainer: {
    height: 4,
    backgroundColor: '#333',
    marginHorizontal: 20,
    marginVertical: 16,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 2,
  },
  tabContainer: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginBottom: 16,
    backgroundColor: 'rgba(0, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
  },
  activeTab: {
    backgroundColor: 'rgba(0, 255, 255, 0.2)',
  },
  tabText: {
    color: '#888',
    fontWeight: '600',
  },
  activeTabText: {
    color: '#00FFFF',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  questionSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    color: '#FFD700',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  questionInput: {
    backgroundColor: 'rgba(0, 255, 255, 0.05)',
    color: '#fff',
    padding: 16,
    borderRadius: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#00FFFF33',
    minHeight: 80,
    textAlignVertical: 'top',
  },
  characterCount: {
    color: '#888',
    fontSize: 12,
    textAlign: 'right',
    marginTop: 4,
  },
  errorInput: {
    borderColor: '#FF6347',
  },
  errorText: {
    color: '#FF6347',
    fontSize: 12,
    marginTop: 4,
  },
  optionsSection: {
    marginBottom: 24,
  },
  optionsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  addOptionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 255, 255, 0.1)',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#00FFFF66',
  },
  addOptionText: {
    color: '#00FFFF',
    marginLeft: 4,
    fontWeight: '600',
  },
  optionContainer: {
    marginBottom: 16,
  },
  optionGradient: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#00FFFF22',
    overflow: 'hidden',
  },
  optionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    paddingBottom: 8,
  },
  colorIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  optionLabel: {
    color: '#00FFFF',
    fontWeight: '600',
    flex: 1,
  },
  optionActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  emojiButton: {
    padding: 4,
    marginRight: 8,
  },
  emojiButtonText: {
    fontSize: 20,
  },
  removeButton: {
    padding: 4,
  },
  optionInput: {
    color: '#fff',
    paddingHorizontal: 12,
    paddingBottom: 12,
    fontSize: 14,
    minHeight: 40,
  },
  settingsSection: {
    marginBottom: 24,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  settingInfo: {
    flex: 1,
    marginRight: 16,
  },
  settingLabel: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  settingDescription: {
    color: '#888',
    fontSize: 12,
  },
  timeLimitContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    marginLeft: 16,
  },
  timeLimitLabel: {
    color: '#00FFFF',
    marginRight: 12,
  },
  timeLimitInput: {
    backgroundColor: 'rgba(0, 255, 255, 0.1)',
    color: '#fff',
    padding: 8,
    borderRadius: 8,
    width: 60,
    textAlign: 'center',
    borderWidth: 1,
    borderColor: '#00FFFF33',
  },
  emojiPickerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emojiPicker: {
    backgroundColor: 'rgba(0, 20, 30, 0.95)',
    borderRadius: 16,
    padding: 20,
    width: '80%',
    borderWidth: 1,
    borderColor: '#00FFFF33',
  },
  emojiPickerTitle: {
    color: '#FFD700',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 16,
  },
  emojiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  emojiItem: {
    padding: 8,
    margin: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(0, 255, 255, 0.1)',
  },
  emojiText: {
    fontSize: 24,
  },
  emojiCloseButton: {
    marginTop: 16,
    padding: 12,
    backgroundColor: 'rgba(0, 255, 255, 0.1)',
    borderRadius: 8,
    alignItems: 'center',
  },
  emojiCloseText: {
    color: '#00FFFF',
    fontWeight: 'bold',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#00FFFF22',
  },
  cancelButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#666',
  },
  cancelButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  saveButtonGradient: {
    borderRadius: 20,
  },
  saveButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignItems: 'center',
    minWidth: 100,
  },
  saveButtonText: {
    color: '#121212',
    fontWeight: 'bold',
    fontSize: 16,
  },
});