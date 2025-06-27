import React, { useState, useCallback, useRef, useEffect, memo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Alert,
  ActivityIndicator,
  Keyboard,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import {
  getFirestore,
  collection,
  addDoc,
  updateDoc,
  doc,
  increment,
  serverTimestamp,
  runTransaction,
} from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

// Utils
import { 
  sanitizeInput, 
  debounce,
  validateCommentLength,
  checkForSpam,
  createNotification,
} from '../../utils/helpers';
import { firebaseApp } from '../../app/firebaseConfig';
// Security imports - NEW
import { 
  validateCommentContent, 
  sanitizeCommentText, 
  sanitizeUsername, 
  sanitizeURL, 
  hasSpamPatterns, 
  checkRateLimit,
  secureLog,
  filterProfanity 
} from '../../utils/security';

// Types
interface CommentInputProps {
  value: string;
  onChangeText: (text: string) => void;
  onSubmit: () => void;
  onEmojiPress: () => void;
  selection: { start: number; end: number };
  onSelectionChange: (selection: { start: number; end: number }) => void;
  isSubmitting: boolean;
  showFeedback: (message: string, duration?: number) => void;
  postId: string;
  postAuthorId?: string;
  replyToComment?: {
    id: string;
    username: string;
  } | null;
  onCancelReply?: () => void;
}

// Constants
const MAX_COMMENT_LENGTH = 2000;
const MIN_COMMENT_LENGTH = 1;
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const MAX_COMMENTS_PER_WINDOW = 10;
const SPAM_CHECK_THRESHOLD = 3;
const VALIDATION_DEBOUNCE_MS = 300;
const SUBMIT_DEBOUNCE_MS = 1000;

// Initialize Firebase
const db = getFirestore(firebaseApp);
const auth = getAuth(firebaseApp);

const CommentInput: React.FC<CommentInputProps> = ({
  value,
  onChangeText,
  onSubmit,
  onEmojiPress,
  selection,
  onSelectionChange,
  isSubmitting,
  showFeedback,
  postId,
  postAuthorId,
  replyToComment,
  onCancelReply,
}) => {
  // State
  const [localSubmitting, setLocalSubmitting] = useState(false);
  const [characterCount, setCharacterCount] = useState(0);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [isFocused, setIsFocused] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [validationWarning, setValidationWarning] = useState<string | null>(null);
  const [isValidContent, setIsValidContent] = useState(true);
  const [rateLimitRemaining, setRateLimitRemaining] = useState(MAX_COMMENTS_PER_WINDOW);
  const [lastSubmitTime, setLastSubmitTime] = useState(0);
  const [spamScore, setSpamScore] = useState(0);

  // Refs
  const textInputRef = useRef<TextInput>(null);
  const submitTimeRef = useRef<number[]>([]);
  const isMountedRef = useRef(true);
  const slideAnimation = useRef(new Animated.Value(0)).current;
  const validationTimeoutRef = useRef<NodeJS.Timeout>();

  const currentUser = auth.currentUser;

  // ================================================================
  // REAL-TIME VALIDATION & SECURITY
  // ================================================================

  const validateContentRealTime = useCallback((text: string) => {
    if (validationTimeoutRef.current) {
      clearTimeout(validationTimeoutRef.current);
    }

    validationTimeoutRef.current = setTimeout(() => {
      if (!isMountedRef.current) return;

      // Character count
      setCharacterCount(text.length);

      // Quick validation without full sanitization (for performance)
      const errors: string[] = [];
      const warnings: string[] = [];
      let isValid = true;

      // Length validation
      if (text.length > MAX_COMMENT_LENGTH) {
        errors.push(`Exceeds ${MAX_COMMENT_LENGTH} character limit`);
        isValid = false;
      } else if (text.length > MAX_COMMENT_LENGTH * 0.9) {
        warnings.push(`Approaching character limit (${MAX_COMMENT_LENGTH - text.length} remaining)`);
      }

      // Basic spam detection (lightweight)
      if (text.length > 10) {
        // Check excessive caps
        const capsRatio = (text.match(/[A-Z]/g) || []).length / text.length;
        if (capsRatio > 0.8) {
          warnings.push('Reduce EXCESSIVE CAPITALIZATION');
        }

        // Check repetition
        if (/(.)\1{5,}/.test(text)) {
          warnings.push('Avoid excessive character repetition');
        }

        // Check for obvious spam patterns
        if (hasSpamPatterns(text)) {
          errors.push('Content appears to be spam');
          isValid = false;
        }
      }

      // Check for dangerous content
      if (text.includes('<script') || text.includes('javascript:')) {
        errors.push('Invalid content detected');
        isValid = false;
      }

      // Profanity check
      const profanityResult = filterProfanity(text);
      if (profanityResult.hasProfanity) {
        warnings.push(`Inappropriate language detected: ${profanityResult.flaggedWords.join(', ')}`);
      }

      // Calculate spam score
      let score = 0;
      if (capsRatio > 0.6) score += 1;
      if (/(.)\1{3,}/.test(text)) score += 1;
      if (profanityResult.hasProfanity) score += 1;
      if (text.split('!').length > 5) score += 1; // Excessive exclamation
      setSpamScore(score);

      // Update state
      setValidationError(errors.length > 0 ? errors[0] : null);
      setValidationWarning(warnings.length > 0 ? warnings[0] : null);
      setIsValidContent(isValid);
    }, VALIDATION_DEBOUNCE_MS);
  }, []);

  const checkCurrentRateLimit = useCallback((): boolean => {
    const userId = currentUser?.uid;
    if (!userId) return false;

    const canSubmit = checkRateLimit(
      `comment_${userId}`,
      MAX_COMMENTS_PER_WINDOW,
      RATE_LIMIT_WINDOW
    );

    // Update rate limit display
    const now = Date.now();
    const recentSubmissions = submitTimeRef.current.filter(
      time => now - time < RATE_LIMIT_WINDOW
    );
    setRateLimitRemaining(Math.max(0, MAX_COMMENTS_PER_WINDOW - recentSubmissions.length));

    return canSubmit;
  }, [currentUser]);

  // ================================================================
  // HANDLERS
  // ================================================================

  const handleTextChange = useCallback((text: string) => {
    // Update parent component
    onChangeText(text);
    
    // Real-time validation
    validateContentRealTime(text);
  }, [onChangeText, validateContentRealTime]);

  const handleSubmitComment = useCallback(
    debounce(async () => {
      if (!currentUser || !postId || localSubmitting || isSubmitting) {
        if (!currentUser) {
          showFeedback('Please log in to comment');
        }
        return;
      }

      // Pre-submission validation
      const trimmedComment = sanitizeInput(value);
      if (!trimmedComment) {
        showFeedback('Please enter a comment');
        return;
      }

      // Rate limiting check
      if (!checkCurrentRateLimit()) {
        const timeRemaining = Math.ceil((RATE_LIMIT_WINDOW - (Date.now() - lastSubmitTime)) / 1000);
        showFeedback(`Too many comments. Please wait ${timeRemaining} seconds.`, 4000);
        return;
      }

      // Comprehensive validation with security
      const validation = validateCommentContent(trimmedComment);
      if (!validation.isValid) {
        secureLog('Invalid comment submission', { 
          errors: validation.errors, 
          userId: currentUser.uid,
          postId,
          spamScore 
        });
        showFeedback(validation.errors[0] || 'Invalid comment content', 4000);
        setValidationError(validation.errors[0] || 'Invalid content');
        return;
      }

      // Additional spam protection
      if (spamScore >= SPAM_CHECK_THRESHOLD) {
        secureLog('High spam score comment blocked', { 
          spamScore, 
          userId: currentUser.uid,
          content: validation.sanitizedContent.substring(0, 100) 
        });
        showFeedback('Comment appears to be spam and was blocked', 4000);
        return;
      }

      // Check submission frequency (additional protection)
      const now = Date.now();
      const timeSinceLastSubmit = now - lastSubmitTime;
      if (timeSinceLastSubmit < 3000) { // 3 second minimum between submissions
        showFeedback('Please wait a moment before commenting again', 3000);
        return;
      }

      setLocalSubmitting(true);
      setValidationError(null);

      try {
        // Prepare secure comment data
        const commentData = {
          text: validation.sanitizedContent,
          userId: currentUser.uid,
          username: sanitizeUsername(currentUser.displayName || currentUser.email?.split('@')[0] || 'Anonymous'),
          userAvatar: sanitizeURL(currentUser.photoURL || '') || '',
          likes: 0,
          likedBy: [],
          createdAt: serverTimestamp(),
          postId: postId,
          // Reply-specific fields
          ...(replyToComment && {
            replyTo: replyToComment.id,
            replyToUsername: sanitizeUsername(replyToComment.username),
          }),
          // Security metadata
          submittedAt: now,
          ipHash: 'client-side', // In production, handle server-side
          spamScore: spamScore,
        };

        // Submit with transaction for consistency
        await runTransaction(db, async (transaction) => {
          // Add the comment
          const commentsRef = collection(db, 'posts', postId, 'comments');
          const commentRef = doc(commentsRef);
          transaction.set(commentRef, commentData);

          // Update post comment count
          const postRef = doc(db, 'posts', postId);
          transaction.update(postRef, {
            comments: increment(1),
            lastActivity: serverTimestamp(),
          });

          // Update user's comment count (for reputation system)
          const userRef = doc(db, 'users', currentUser.uid);
          transaction.update(userRef, {
            totalComments: increment(1),
            reputation: increment(1), // Small reputation boost for commenting
            lastActivity: serverTimestamp(),
          });
        });

        // Track submission time for rate limiting
        submitTimeRef.current.push(now);
        submitTimeRef.current = submitTimeRef.current.filter(
          time => now - time < RATE_LIMIT_WINDOW
        );
        setLastSubmitTime(now);

        // Create notification for post author (if not commenting on own post)
        if (postAuthorId && currentUser.uid !== postAuthorId) {
          const triggerName = sanitizeUsername(currentUser.displayName || currentUser.email || 'Someone');
          await createNotification(postAuthorId, {
            type: 'comment',
            message: replyToComment 
              ? `${triggerName} replied to your comment.`
              : `${triggerName} commented on your post.`,
            postId: postId,
            fromUserId: currentUser.uid,
          });
        }

        // Create notification for reply target (if replying to someone else)
        if (replyToComment && replyToComment.id && currentUser.uid !== postAuthorId) {
          try {
            const triggerName = sanitizeUsername(currentUser.displayName || currentUser.email || 'Someone');
            await createNotification(replyToComment.id, {
              type: 'reply',
              message: `${triggerName} replied to your comment.`,
              postId: postId,
              fromUserId: currentUser.uid,
            });
          } catch (replyNotificationError) {
            console.warn('Failed to send reply notification:', replyNotificationError);
          }
        }

        // Success feedback
        onChangeText(''); // Clear input
        setCharacterCount(0);
        setSpamScore(0);
        setValidationError(null);
        setValidationWarning(null);
        
        if (replyToComment && onCancelReply) {
          onCancelReply(); // Clear reply state
        }

        // Update rate limit display
        setRateLimitRemaining(prev => Math.max(0, prev - 1));

        showFeedback(
          replyToComment ? 'Reply posted! 💬' : 'Comment posted! 💬',
          2000
        );

        // Dismiss keyboard
        Keyboard.dismiss();
        textInputRef.current?.blur();

        // Call parent onSubmit if provided
        onSubmit();

      } catch (error) {
        console.error('Error adding comment:', error);
        secureLog('Comment submission failed', { 
          error: error.message, 
          userId: currentUser.uid,
          postId 
        });
        
        // User-friendly error messages
        let errorMessage = 'Failed to post comment. Please try again.';
        
        if (error.code === 'permission-denied') {
          errorMessage = 'You do not have permission to comment on this post.';
        } else if (error.code === 'unavailable') {
          errorMessage = 'Service temporarily unavailable. Please try again.';
        } else if (error.message?.includes('network')) {
          errorMessage = 'Network error. Please check your connection.';
        }
        
        showFeedback(errorMessage, 4000);
        setValidationError(errorMessage);
        
      } finally {
        if (isMountedRef.current) {
          setLocalSubmitting(false);
        }
      }
    }, SUBMIT_DEBOUNCE_MS),
    [
      currentUser,
      postId,
      value,
      localSubmitting,
      isSubmitting,
      replyToComment,
      postAuthorId,
      spamScore,
      lastSubmitTime,
      onChangeText,
      onCancelReply,
      onSubmit,
      showFeedback,
      checkCurrentRateLimit,
    ]
  );

  const handleFocus = useCallback(() => {
    setIsFocused(true);
    Animated.timing(slideAnimation, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [slideAnimation]);

  const handleBlur = useCallback(() => {
    setIsFocused(false);
    if (!value.trim()) {
      Animated.timing(slideAnimation, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [slideAnimation, value]);

  // ================================================================
  // EFFECTS
  // ================================================================

  useEffect(() => {
    isMountedRef.current = true;
    
    // Initialize rate limit check
    checkCurrentRateLimit();
    
    // Keyboard listeners
    const keyboardWillShow = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => {
        setKeyboardHeight(e.endCoordinates.height);
      }
    );
    
    const keyboardWillHide = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        setKeyboardHeight(0);
      }
    );

    return () => {
      isMountedRef.current = false;
      keyboardWillShow.remove();
      keyboardWillHide.remove();
      if (validationTimeoutRef.current) {
        clearTimeout(validationTimeoutRef.current);
      }
    };
  }, [checkCurrentRateLimit]);

  // Update character count when value changes externally
  useEffect(() => {
    setCharacterCount(value.length);
    if (value.length === 0) {
      setValidationError(null);
      setValidationWarning(null);
      setSpamScore(0);
    }
  }, [value]);

  // ================================================================
  // RENDER HELPERS
  // ================================================================

  const isSubmittingState = localSubmitting || isSubmitting;
  const canSubmit = !isSubmittingState && 
                    value.trim().length >= MIN_COMMENT_LENGTH && 
                    !validationError &&
                    isValidContent &&
                    rateLimitRemaining > 0;

  const isOverLimit = characterCount > MAX_COMMENT_LENGTH;
  const isNearLimit = characterCount > MAX_COMMENT_LENGTH * 0.8;

  const getCharacterCountColor = () => {
    if (isOverLimit) return '#FF6B6B';
    if (isNearLimit) return '#FFD700';
    if (validationWarning) return '#FF9500';
    return '#999';
  };

  const getPlaceholderText = () => {
    if (replyToComment) {
      return `Reply to ${sanitizeUsername(replyToComment.username)}...`;
    }
    return 'Share your thoughts...';
  };

  const getSubmitButtonColor = () => {
    if (!canSubmit) return 'rgba(102, 102, 102, 0.3)';
    if (spamScore >= 2) return 'rgba(255, 155, 0, 0.8)';
    return '#00FFFF';
  };

  // ================================================================
  // RENDER
  // ================================================================

  return (
    <Animated.View 
      style={[
        styles.container,
        {
          bottom: keyboardHeight,
          transform: [{
            translateY: slideAnimation.interpolate({
              inputRange: [0, 1],
              outputRange: [100, 0],
            }),
          }],
        },
      ]}
    >
      {/* Reply Banner */}
      {replyToComment && (
        <View style={styles.replyBanner}>
          <View style={styles.replyInfo}>
            <Ionicons name="return-down-forward" size={16} color="#00FFFF" />
            <Text style={styles.replyText}>
              Replying to <Text style={styles.replyUsername}>{sanitizeUsername(replyToComment.username)}</Text>
            </Text>
          </View>
          {onCancelReply && (
            <TouchableOpacity
              onPress={onCancelReply}
              style={styles.cancelReplyButton}
              accessibilityRole="button"
              accessibilityLabel="Cancel reply"
            >
              <Ionicons name="close" size={16} color="#999" />
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Main Input Container */}
      <LinearGradient
        colors={['rgba(0,0,0,0.95)', 'rgba(0,0,0,0.9)']}
        style={styles.inputContainer}
      >
        <View style={styles.inputWrapper}>
          {/* Text Input */}
          <TextInput
            ref={textInputRef}
            style={[
              styles.textInput,
              isFocused && styles.textInputFocused,
              validationError && styles.textInputError,
              validationWarning && styles.textInputWarning,
            ]}
            value={value}
            onChangeText={handleTextChange}
            onSelectionChange={({ nativeEvent }) => 
              onSelectionChange(nativeEvent.selection)
            }
            onFocus={handleFocus}
            onBlur={handleBlur}
            placeholder={getPlaceholderText()}
            placeholderTextColor="#666"
            multiline
            numberOfLines={Platform.OS === 'ios' ? undefined : 3}
            maxLength={MAX_COMMENT_LENGTH + 100} // Allow slight overage for user feedback
            returnKeyType="default"
            blurOnSubmit={false}
            textAlignVertical="top"
            accessibilityLabel="Comment input"
            accessibilityHint={`Enter your ${replyToComment ? 'reply' : 'comment'} here`}
          />

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            {/* Emoji Button */}
            <TouchableOpacity
              style={styles.actionButton}
              onPress={onEmojiPress}
              accessibilityRole="button"
              accessibilityLabel="Add emoji"
            >
              <Ionicons name="happy" size={24} color="#FFD700" />
            </TouchableOpacity>

            {/* Submit Button */}
            <TouchableOpacity
              style={[
                styles.submitButton,
                { backgroundColor: getSubmitButtonColor() },
                !canSubmit && styles.submitButtonDisabled,
              ]}
              onPress={handleSubmitComment}
              disabled={!canSubmit}
              accessibilityRole="button"
              accessibilityLabel={`Submit ${replyToComment ? 'reply' : 'comment'}`}
              accessibilityState={{ disabled: !canSubmit }}
            >
              {isSubmittingState ? (
                <ActivityIndicator size="small" color="#000" />
              ) : (
                <Ionicons 
                  name="send" 
                  size={20} 
                  color={canSubmit ? "#000" : "#666"} 
                />
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Security & Validation Footer */}
        <View style={styles.footer}>
          <View style={styles.footerLeft}>
            {/* Character Count */}
            <Text style={[styles.characterCount, { color: getCharacterCountColor() }]}>
              {characterCount}/{MAX_COMMENT_LENGTH}
            </Text>
            
            {/* Rate Limit Indicator */}
            {rateLimitRemaining <= 3 && (
              <Text style={styles.rateLimitText}>
                {rateLimitRemaining} comments remaining
              </Text>
            )}

            {/* Spam Score Indicator (for testing - remove in production) */}
            {__DEV__ && spamScore > 0 && (
              <Text style={styles.spamScore}>
                Spam: {spamScore}/{SPAM_CHECK_THRESHOLD}
              </Text>
            )}
          </View>

          <View style={styles.footerRight}>
            {/* Security Status */}
            {isValidContent ? (
              <Ionicons name="shield-checkmark" size={16} color="#4CAF50" />
            ) : (
              <Ionicons name="shield-outline" size={16} color="#FF6B6B" />
            )}
          </View>
        </View>

        {/* Validation Messages */}
        {(validationError || validationWarning) && (
          <View style={styles.validationContainer}>
            {validationError && (
              <View style={styles.errorMessage}>
                <Ionicons name="alert-circle" size={14} color="#FF6B6B" />
                <Text style={styles.errorText}>{validationError}</Text>
              </View>
            )}
            {validationWarning && !validationError && (
              <View style={styles.warningMessage}>
                <Ionicons name="warning" size={14} color="#FF9500" />
                <Text style={styles.warningText}>{validationWarning}</Text>
              </View>
            )}
          </View>
        )}
      </LinearGradient>
    </Animated.View>
  );
};

// ================================================================
// STYLES
// ================================================================

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 1000,
    borderRadius: 12,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },

  // Reply Banner
  replyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(0, 255, 255, 0.1)',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 255, 255, 0.2)',
  },
  replyInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 8,
  },
  replyText: {
    color: '#fff',
    fontSize: 14,
  },
  replyUsername: {
    color: '#00FFFF',
    fontWeight: 'bold',
  },
  cancelReplyButton: {
    padding: 4,
  },

  // Input Container
  inputContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 12,
  },
  
  // Text Input
  textInput: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 255, 0.3)',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: '#fff',
    fontSize: 16,
    minHeight: 44,
    maxHeight: 120,
    textAlignVertical: 'top',
  },
  textInputFocused: {
    borderColor: '#00FFFF',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  textInputError: {
    borderColor: '#FF6B6B',
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
  },
  textInputWarning: {
    borderColor: '#FF9500',
    backgroundColor: 'rgba(255, 149, 0, 0.1)',
  },

  // Action Buttons
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  actionButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 255, 0.3)',
  },
  submitButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#00FFFF',
  },
  submitButtonDisabled: {
    borderColor: 'rgba(102, 102, 102, 0.5)',
  },

  // Footer
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    minHeight: 20,
  },
  footerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  footerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  characterCount: {
    fontSize: 12,
    fontWeight: '600',
  },
  rateLimitText: {
    fontSize: 10,
    color: '#FF9500',
    fontWeight: '600',
  },
  spamScore: {
    fontSize: 10,
    color: '#FF6B6B',
    fontWeight: '600',
  },

  // Validation Messages
  validationContainer: {
    marginTop: 8,
    gap: 4,
  },
  errorMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  errorText: {
    color: '#FF6B6B',
    fontSize: 12,
    flex: 1,
  },
  warningMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 149, 0, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  warningText: {
    color: '#FF9500',
    fontSize: 12,
    flex: 1,
  },
});

export default memo(CommentInput);