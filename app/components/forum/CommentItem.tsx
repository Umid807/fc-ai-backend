import React, { useState, useCallback, useRef, useEffect, memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
  Animated,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';

// Try to import gesture handler, fallback if not available
let PanGestureHandler: any;
let State: any;

try {
  const gestureHandler = require('react-native-gesture-handler');
  PanGestureHandler = gestureHandler.PanGestureHandler;
  State = gestureHandler.State;
} catch (error) {
  // Fallback if gesture handler is not available
  PanGestureHandler = View;
  State = { END: 'END' };
}
import {
  getFirestore,
  doc,
  updateDoc,
  deleteDoc,
  increment,
  arrayUnion,
  arrayRemove,
  addDoc,
  collection,
  serverTimestamp,
  runTransaction,
  query,
  where,
  orderBy,
  onSnapshot,
  limit,
  getDocs
} from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
// Try to import markdown, fallback if not available
let Markdown: any;

try {
  Markdown = require('react-native-markdown-display').default;
} catch (error) {
  // Fallback to Text if markdown is not available
  Markdown = ({ children, style, onLinkPress }: any) => (
    <Text style={style?.body || {}}>{children}</Text>
  );
}

// Utils
import { 
  sanitizeInput, 
  debounce,
  formatTimeAgo,
  createNotification,
  checkForSpam,
  validateCommentLength,
} from '../../utils/helpers';
import { firebaseApp } from '../../app/firebaseConfig';
import { sanitizeMentions, sanitizeCommentText, validateCommentContent, secureLog, sanitizeUsername, sanitizeURL } from '../../utils/security';
// Translation Services - ADD THESE TWO LINES
import { DeepLTranslationService } from '../../services/DeepLTranslationService';
import { usePostTranslation } from '../../hooks/usePostTranslation';
import TranslationButton from './TranslationButton'; 
// Types
interface Comment {
  id: string;
  text: string;
  userId: string;
  username: string;
  userAvatar: string;
  likes: number;
  likedBy?: string[];
  createdAt: any;
  replyTo?: string;
  replyToUsername?: string;
  editedAt?: any;
  isDeleted?: boolean;
  reports?: number;
  isPinned?: boolean;
  mentions?: string[];
}

interface CommentItemProps {
  comment: Comment;
  postId: string;
  onShowQuickInfo: (userData: any) => void;
  onAddReply: (parentId: string, replyToId: string | null, text: string) => void;
  highlightComment?: string;
  scrollViewRef: React.RefObject<ScrollView>;
  showFeedback: (message: string, duration?: number) => void;
  level?: number;
  maxLevel?: number;
  showEmojiPicker: boolean;
  onShowEmojiPicker: (target?: 'main' | string) => void; // UPDATED: Accept target parameter
  onEmojiSelect: (emoji: string) => void;
  onCloseEmojiPicker: () => void;
  emojiTarget?: string; // NEW: Current emoji target
  // NEW: Managed reply state props
  replyText: string;
  onUpdateReplyText: (text: string) => void;
  onClearReplyText: () => void;
}

interface Reply extends Comment {
  parentId: string;
}

// Constants
const db = getFirestore(firebaseApp);
const auth = getAuth(firebaseApp);
const MAX_COMMENT_LENGTH = 2000;
const MIN_COMMENT_LENGTH = 1;
const MAX_NESTING_LEVEL = 3;
const SWIPE_THRESHOLD = 100;
const LIKE_DEBOUNCE_MS = 500;
const REPLY_DEBOUNCE_MS = 500;
const AUTO_HIDE_ACTIONS_MS = 3000;

const CommentItem: React.FC<CommentItemProps> = ({
  comment,
  postId,
  onShowQuickInfo,
  onAddReply,
  highlightComment,
  scrollViewRef,
  showFeedback,
  level = 0,
  maxLevel = MAX_NESTING_LEVEL,
  showEmojiPicker,
  onShowEmojiPicker,
  onEmojiSelect,
  onCloseEmojiPicker,
  emojiTarget,
  // NEW PROPS
  replyText,
  onUpdateReplyText,
  onClearReplyText,
}) => {
  // State
  const [replyEmojiMode, setReplyEmojiMode] = useState(false);
  const [hasLiked, setHasLiked] = useState(false);
  const [isReplying, setIsReplying] = useState(false);
  const [isSubmittingReply, setIsSubmittingReply] = useState(false);
  const [showReplies, setShowReplies] = useState(false);
  const [replies, setReplies] = useState<Reply[]>([]);
  const [loadingReplies, setLoadingReplies] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(comment.text);
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const [isReporting, setIsReporting] = useState(false);
const [repliesCount, setRepliesCount] = useState(0);
  const {
    translateItem,
    getTranslatedText,
    isTranslating: isTranslatingComment,
    isItemTranslated,
    getCurrentLanguage,
  } = usePostTranslation();
  // Animation values
  const highlightOpacity = useRef(new Animated.Value(0)).current;
  const replySlideHeight = useRef(new Animated.Value(0)).current;
  const likeScale = useRef(new Animated.Value(1)).current;
  const actionsFade = useRef(new Animated.Value(0)).current;

  // Refs
  const replyInputRef = useRef<TextInput>(null);
  const editInputRef = useRef<TextInput>(null);
  const isMountedRef = useRef(true);
  const actionsTimeoutRef = useRef<NodeJS.Timeout>();
  const unsubscribeRepliesRef = useRef<(() => void) | null>(null);

  const currentUser = auth.currentUser;

  // ================================================================
  // COMPUTED VALUES
  // ================================================================

  const isOwnComment = currentUser && currentUser.uid === comment.userId;
  const canReply = level < maxLevel && currentUser && !comment.isDeleted;
  const canEdit = isOwnComment && !comment.isDeleted;
  const canDelete = isOwnComment && !comment.isDeleted;
  const isHighlighted = highlightComment === comment.id;
  const hasReplies = repliesCount > 0 || replies.length > 0;
  
  // DEBUG: Log replies info
  console.log('🔧 DEBUG: Comment replies info', { 
    commentId: comment.id, 
    repliesLength: replies.length, 
    hasReplies, 
    showReplies 
  });
  const timeAgo = formatTimeAgo(comment.createdAt?.toDate?.() || new Date());

  // ================================================================
  // INITIALIZATION & CLEANUP
  // ================================================================

  useEffect(() => {
    isMountedRef.current = true;

    // Check if user has liked this comment
    if (currentUser && comment.likedBy && Array.isArray(comment.likedBy)) {
      setHasLiked(comment.likedBy.includes(currentUser.uid));
    }

    // Highlight animation
    if (isHighlighted) {
      Animated.sequence([
        Animated.timing(highlightOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.delay(2000),
        Animated.timing(highlightOpacity, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
      ]).start();
    }

    return () => {
      isMountedRef.current = false;
      if (actionsTimeoutRef.current) {
        clearTimeout(actionsTimeoutRef.current);
      }
      if (unsubscribeRepliesRef.current) {
        unsubscribeRepliesRef.current();
      }
    };
  }, [comment.likedBy, currentUser, isHighlighted, highlightOpacity]);

  // ================================================================
  // REAL-TIME REPLIES LISTENER
  // ================================================================

  const setupRepliesListener = useCallback(() => {
    if (!showReplies || !comment.id) return;

    setLoadingReplies(true);

try {
      const repliesRef = collection(db, 'posts', postId, 'comments');
      console.log('🔧 DEBUG: Setting up replies query for comment:', comment.id);
      const repliesQuery = query(
        repliesRef,
        where('replyTo', '==', comment.id),
        orderBy('createdAt', 'asc'),
        limit(50) // Limit for performance
      );
      console.log('🔧 DEBUG: Replies query created');

      const unsubscribe = onSnapshot(
        repliesQuery,
(snapshot) => {
          if (!isMountedRef.current) return;
          
          console.log('🔧 DEBUG: Replies snapshot received for comment:', comment.id, 'docs:', snapshot.size);

          const repliesData: Reply[] = [];
          
snapshot.forEach((doc) => {
            const data = doc.data();
            
            console.log('🔧 DEBUG: Processing reply doc:', doc.id, 'data:', {
              text: data.text,
              userId: data.userId,
              replyTo: data.replyTo,
              hasCreatedAt: !!data.createdAt
            });
            
            if (!data.text || !data.userId || !data.createdAt) {
              console.warn('Invalid reply data:', doc.id);
              return;
            }

            repliesData.push({
              id: doc.id,
              ...data,
              parentId: comment.id,
            } as Reply);
          });

          console.log('🔧 DEBUG: Setting replies data:', repliesData.length, 'replies');
          setReplies(repliesData);
          setLoadingReplies(false);
        },
        (error) => {
          console.error('Replies listener error:', error);
          if (isMountedRef.current) {
            setLoadingReplies(false);
            showFeedback('Failed to load replies');
          }
        }
      );

      unsubscribeRepliesRef.current = unsubscribe;

    } catch (error) {
      console.error('Error setting up replies listener:', error);
      setLoadingReplies(false);
    }
  }, [showReplies, comment.id, postId, showFeedback]);

// Check for replies on mount to show the button
// Check for replies on mount to show the button
  useEffect(() => {
    const checkForReplies = async () => {
      try {
        const repliesRef = collection(db, 'posts', postId, 'comments');
const repliesQuery = query(
          repliesRef,
          where('replyTo', '==', comment.id)
          // Remove limit to get actual count
        );
        
        const snapshot = await getDocs(repliesQuery);
        if (snapshot.size > 0 && isMountedRef.current) {
         console.log('🔧 DEBUG: Found replies for comment:', comment.id, 'count:', snapshot.size);
          // Set the actual count without loading replies
          setRepliesCount(snapshot.size);
        }
      } catch (error) {
        console.error('Error checking for replies:', error);
      }
    };
    
    // Only check if we don't already have replies and comment has an ID
    if (comment.id && replies.length === 0) {
      checkForReplies();
    }
  }, [comment.id, postId]);
useEffect(() => {
  // This is a workaround - we need to intercept emoji selection for replies
  // The proper solution would be to have separate emoji picker instances
  if (showEmojiPicker && isReplying) {
    console.log('🟦 DEBUG: Emoji picker is open for reply');
  }
}, [showEmojiPicker, isReplying]);

  // Actually listen for replies when showReplies is true
useEffect(() => {
  console.log('🔧 DEBUG: showReplies changed:', showReplies, 'for comment:', comment.id);
  if (showReplies) {
    console.log('🔧 DEBUG: Calling setupRepliesListener for:', comment.id);
    setupRepliesListener();
  } else if (unsubscribeRepliesRef.current) {
    console.log('🔧 DEBUG: Unsubscribing replies listener for:', comment.id);
    unsubscribeRepliesRef.current();
    unsubscribeRepliesRef.current = null;
  }
}, [showReplies]); // REMOVED setupRepliesListener from dependencies
  // ================================================================
  // INTERACTION HANDLERS
  // ================================================================

  const handleLike = useCallback(
    debounce(async () => {
      if (!currentUser || hasLiked || !isMountedRef.current) {
        if (!currentUser) {
          showFeedback('Please log in to like comments');
        } else if (hasLiked) {
          showFeedback('You already liked this comment');
        }
        return;
      }

      try {
        // Optimistic update
        setHasLiked(true);
        
        // Like animation
        Animated.sequence([
          Animated.timing(likeScale, {
            toValue: 1.2,
            duration: 150,
            useNativeDriver: true,
          }),
          Animated.timing(likeScale, {
            toValue: 1,
            duration: 150,
            useNativeDriver: true,
          }),
        ]).start();

        const commentRef = doc(db, 'posts', postId, 'comments', comment.id);
        
        await runTransaction(db, async (transaction) => {
          const commentDoc = await transaction.get(commentRef);
          
          if (!commentDoc.exists()) {
            throw new Error('Comment not found');
          }

          const commentData = commentDoc.data();
          const likedBy = commentData.likedBy || [];

          if (likedBy.includes(currentUser.uid)) {
            throw new Error('Already liked');
          }

          transaction.update(commentRef, {
            likes: increment(1),
            likedBy: arrayUnion(currentUser.uid),
          });
        });

        // Create notification if not own comment
        if (comment.userId && currentUser.uid !== comment.userId) {
          const triggerName = sanitizeUsername(currentUser.displayName || currentUser.email || 'Someone');
          await createNotification(comment.userId, {
            type: 'comment_like',
            message: `${triggerName} liked your comment.`,
            postId: postId,
            commentId: comment.id,
          });
        }

        showFeedback('Comment liked! ❤️');

      } catch (error) {
        console.error('Error liking comment:', error);
        secureLog('Like comment failed', { error: error.message, commentId: comment.id });
        // Revert optimistic update
        setHasLiked(false);
        showFeedback('Failed to like comment. Please try again.');
      }
    }, LIKE_DEBOUNCE_MS),
    [currentUser, hasLiked, comment.id, comment.userId, postId, showFeedback, likeScale]
  );

  const handleReply = useCallback(() => {
    if (!currentUser) {
      showFeedback('Please log in to reply');
      return;
    }

    if (!canReply) {
      showFeedback('Cannot reply to this comment');
      return;
    }

    setIsReplying(true);
    onUpdateReplyText(`@${sanitizeUsername(comment.username)} `);

    // Animate reply input
    Animated.timing(replySlideHeight, {
      toValue: 120,
      duration: 300,
      useNativeDriver: false,
    }).start(() => {
      replyInputRef.current?.focus();
    });
  }, [currentUser, canReply, comment.username, showFeedback, replySlideHeight, onUpdateReplyText]);

  const handleCancelReply = useCallback(() => {
    setIsReplying(false);
    onClearReplyText(); // Clear managed reply text
    
    Animated.timing(replySlideHeight, {
      toValue: 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [replySlideHeight, onClearReplyText]);

  // 🔧 FIXED REPLY SUBMISSION FUNCTION
  const handleSubmitReply = useCallback(
    debounce(async () => {
      const trimmedReply = sanitizeInput(replyText);
      
      console.log('🔧 DEBUG: Starting reply submission', { 
        trimmedReply, 
        currentUser: !!currentUser, 
        isSubmittingReply,
        postId,
        commentId: comment.id 
      });
      
      if (!trimmedReply || !currentUser || isSubmittingReply) {
        console.log('🔧 DEBUG: Validation failed', { 
          trimmedReply: !!trimmedReply, 
          currentUser: !!currentUser, 
          isSubmittingReply 
        });
        if (!trimmedReply) {
          showFeedback('Please enter a reply');
        } else if (!currentUser) {
          showFeedback('Please log in to reply');
        }
        return;
      }

      console.log('🔧 DEBUG: Validation passed, continuing...');

      // Validation with security
      console.log('🔧 DEBUG: Starting content validation');
      const validation = validateCommentContent(trimmedReply);
      if (!validation.isValid) {
        secureLog('Invalid reply content', { errors: validation.errors, userId: currentUser.uid });
        showFeedback(validation.errors[0] || 'Invalid comment content');
        return;
      }
      console.log('🔧 DEBUG: Content validation passed');

      // Check for spam
      console.log('🔧 DEBUG: Checking spam validation');
      let isSpam = false;
      try {
        isSpam = checkForSpam(validation.sanitizedContent);
        console.log('🔧 DEBUG: Spam check result:', isSpam);
      } catch (spamError) {
        console.log('🔧 DEBUG: Spam check error:', spamError);
        isSpam = false; // Assume not spam if check fails
      }
      
      if (isSpam) {
        console.log('🔧 DEBUG: Reply marked as spam');
        showFeedback('Reply appears to be spam');
        return;
      }

      console.log('🔧 DEBUG: All validations passed, setting submitting state');
      setIsSubmittingReply(true);

      try {
        const replyData = {
          text: validation.sanitizedContent,
          userId: currentUser.uid,
          username: sanitizeUsername(currentUser.displayName || currentUser.email?.split('@')[0] || 'Anonymous'),
          userAvatar: sanitizeURL(currentUser.photoURL || '') || '',
          likes: 0,
          likedBy: [],
          createdAt: serverTimestamp(),
          postId: postId,
          replyTo: comment.id,
          replyToUsername: sanitizeUsername(comment.username),
          // Extract mentions from sanitized content
          mentions: extractMentions(validation.sanitizedContent),
        };

        console.log('🔧 DEBUG: Creating reply document with data:', replyData);

// ✅ FIXED: Actually create the reply document in Firestore
        console.log('🔧 DEBUG: About to create Firestore document');
        const commentsRef = collection(db, 'posts', postId, 'comments');
        console.log('🔧 DEBUG: Collection reference created:', commentsRef.path);
        
        const newReplyRef = await addDoc(commentsRef, replyData);
        console.log('🔧 DEBUG: Document created with ID:', newReplyRef.id);
        
        console.log('✅ DEBUG: Reply document created successfully:', newReplyRef.id);

        // Update post comment count
        const postRef = doc(db, 'posts', postId);
        await updateDoc(postRef, {
          comments: increment(1),
          lastActivity: serverTimestamp(),
        });

        console.log('✅ DEBUG: Post comment count updated');

        // Create notification for original commenter
        if (comment.userId && currentUser.uid !== comment.userId) {
          const triggerName = sanitizeUsername(currentUser.displayName || currentUser.email || 'Someone');
          await createNotification(comment.userId, {
            type: 'reply',
            message: `${triggerName} replied to your comment.`,
            postId: postId,
            commentId: comment.id,
          });
          console.log('✅ DEBUG: Notification sent to comment author');
        }

        // Handle mentions notifications
        const mentions = extractMentions(validation.sanitizedContent);
        for (const mention of mentions) {
          if (mention !== currentUser.uid && mention !== comment.userId) {
            try {
              const triggerName = sanitizeUsername(currentUser.displayName || currentUser.email || 'Someone');
              await createNotification(mention, {
                type: 'mention',
                message: `${triggerName} mentioned you in a reply.`,
                postId: postId,
              });
            } catch (mentionError) {
              console.warn('Failed to send mention notification:', mentionError);
            }
          }
        }

        // Success - clear input and close reply interface
        onClearReplyText();
        handleCancelReply();
        
// Show replies if hidden
        if (!showReplies) {
          setShowReplies(true);
        }

        showFeedback('Reply posted! 💬');
        console.log('✅ DEBUG: Reply submission completed successfully');

      } catch (error) {
        console.error('❌ ERROR: Failed to submit reply:', error);
        secureLog('Reply submission failed', { error: error.message, postId, commentId: comment.id });
        showFeedback('Failed to post reply. Please try again.');
      } finally {
        if (isMountedRef.current) {
          setIsSubmittingReply(false);
        }
      }
    }, REPLY_DEBOUNCE_MS),
    [
      replyText, // Now using managed reply text
      currentUser,
      isSubmittingReply,
      comment.id,
      comment.userId,
      comment.username,
      postId,
      showReplies,
      handleCancelReply,
      showFeedback,
      onClearReplyText, // Added dependency
    ]
  );

  const handleEdit = useCallback(() => {
    if (!canEdit) {
      showFeedback('Cannot edit this comment');
      return;
    }

    setIsEditing(true);
    setEditText(comment.text);
    
    setTimeout(() => {
      editInputRef.current?.focus();
    }, 100);
  }, [canEdit, comment.text, showFeedback]);

  const handleCancelEdit = useCallback(() => {
    setIsEditing(false);
    setEditText(comment.text);
  }, [comment.text]);

  const handleSubmitEdit = useCallback(async () => {
    const trimmedText = sanitizeInput(editText);
    
    if (!trimmedText || isSubmittingEdit) {
      if (!trimmedText) {
        showFeedback('Comment cannot be empty');
      }
      return;
    }

    if (trimmedText === comment.text) {
      handleCancelEdit();
      return;
    }

    // Validate and sanitize the edited content
    const validation = validateCommentContent(trimmedText);
    if (!validation.isValid) {
      secureLog('Invalid edit content', { errors: validation.errors, userId: currentUser.uid });
      showFeedback(validation.errors[0] || 'Invalid comment content');
      return;
    }

    setIsSubmittingEdit(true);

    try {
      const commentRef = doc(db, 'posts', postId, 'comments', comment.id);
      await updateDoc(commentRef, {
        text: validation.sanitizedContent,
        editedAt: serverTimestamp(),
        mentions: extractMentions(validation.sanitizedContent),
      });

      setIsEditing(false);
      showFeedback('Comment updated! ✏️');

    } catch (error) {
      console.error('Error editing comment:', error);
      secureLog('Edit comment failed', { error: error.message, commentId: comment.id });
      showFeedback('Failed to update comment. Please try again.');
    } finally {
      if (isMountedRef.current) {
        setIsSubmittingEdit(false);
      }
    }
  }, [editText, comment.text, comment.id, isSubmittingEdit, postId, handleCancelEdit, showFeedback, currentUser]);

  const handleDelete = useCallback(() => {
    if (!canDelete) {
      showFeedback('Cannot delete this comment');
      return;
    }

    Alert.alert(
      'Delete Comment',
      'Are you sure you want to delete this comment? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const commentRef = doc(db, 'posts', postId, 'comments', comment.id);
              
              // Soft delete - mark as deleted instead of removing
              await updateDoc(commentRef, {
                isDeleted: true,
                text: '[deleted]',
                deletedAt: serverTimestamp(),
              });

              // Update post comment count
              const postRef = doc(db, 'posts', postId);
              await updateDoc(postRef, {
                comments: increment(-1),
              });

              showFeedback('Comment deleted');

            } catch (error) {
              console.error('Error deleting comment:', error);
              secureLog('Delete comment failed', { error: error.message, commentId: comment.id });
              showFeedback('Failed to delete comment. Please try again.');
            }
          },
        },
      ]
    );
  }, [canDelete, comment.id, postId, showFeedback]);

  const handleReport = useCallback(async () => {
    if (!currentUser || isReporting) {
      if (!currentUser) {
        showFeedback('Please log in to report comments');
      }
      return;
    }

    Alert.alert(
      'Report Comment',
      'Why are you reporting this comment?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Spam', onPress: () => submitReport('spam') },
        { text: 'Harassment', onPress: () => submitReport('harassment') },
        { text: 'Inappropriate', onPress: () => submitReport('inappropriate') },
        { text: 'Other', onPress: () => submitReport('other') },
      ]
    );

    const submitReport = async (reason: string) => {
      setIsReporting(true);

      try {
        // Add to reports collection
        await addDoc(collection(db, 'reports'), {
          type: 'comment',
          commentId: comment.id,
          postId: postId,
          reportedBy: currentUser.uid,
          reportedUser: comment.userId,
          reason: reason,
          text: comment.text,
          createdAt: serverTimestamp(),
        });

        // Increment report count
        const commentRef = doc(db, 'posts', postId, 'comments', comment.id);
        await updateDoc(commentRef, {
          reports: increment(1),
        });

        showFeedback('Comment reported. Thank you for keeping our community safe.');

      } catch (error) {
        console.error('Error reporting comment:', error);
        secureLog('Report comment failed', { error: error.message, commentId: comment.id });
        showFeedback('Failed to report comment. Please try again.');
      } finally {
        if (isMountedRef.current) {
          setIsReporting(false);
        }
      }
    };
  }, [currentUser, isReporting, comment.id, comment.userId, comment.text, postId, showFeedback]);

  const handleToggleReplies = useCallback(() => {
    setShowReplies(prev => !prev);
  }, []);

  const handleProfilePress = useCallback(() => {
    onShowQuickInfo({
      uid: comment.userId,
      username: sanitizeUsername(comment.username),
      profileImage: sanitizeURL(comment.userAvatar) || '',
    });
  }, [comment.userId, comment.username, comment.userAvatar, onShowQuickInfo]);

  const handleLongPress = useCallback(() => {
    setShowActions(true);
    
    Animated.timing(actionsFade, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();

    // Auto-hide actions
    actionsTimeoutRef.current = setTimeout(() => {
      Animated.timing(actionsFade, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start(() => {
        if (isMountedRef.current) {
          setShowActions(false);
        }
      });
    }, AUTO_HIDE_ACTIONS_MS);
  }, [actionsFade]);

  // Simple double-tap to reply (replacing swipe gesture)
  const handleDoubleTap = useCallback(() => {
    if (canReply) {
      handleReply();
    }
  }, [canReply, handleReply]);
  const handleReplyEmojiPress = useCallback(() => {
    if (isReplying) {
      console.log('🟦 DEBUG: Opening emoji picker for reply to comment:', comment.id);
      onShowEmojiPicker(comment.id); // Pass comment ID as target
    }
  }, [isReplying, onShowEmojiPicker, comment.id]);


  // ================================================================
  // UTILITY FUNCTIONS
  // ================================================================

  const extractMentions = useCallback((text: string): string[] => {
    const mentionRegex = /@(\w+)/g;
    const mentions: string[] = [];
    let match;

    while ((match = mentionRegex.exec(text)) !== null) {
      const username = sanitizeUsername(match[1]);
      if (username && username !== 'Anonymous') {
        mentions.push(username);
      }
    }

    return mentions;
  }, []);

const processCommentText = useCallback((text: string) => {
    // Securely convert @mentions to clickable links with sanitization
    if (!text || typeof text !== 'string') {
      return '';
    }
    
    // Use our secure mention sanitization
    return sanitizeMentions(text);
  }, []);

  const handleMentionPress = useCallback((url: string) => {
    const username = url.replace('mention://', '');
    const sanitizedUsername = sanitizeUsername(username);
    // Handle mention tap - could open user profile
    onShowQuickInfo({ username: sanitizedUsername });
  }, [onShowQuickInfo]);

  // Translation Handlers - ADD THIS BLOCK
const handleTranslateComment = useCallback(async (targetLanguage: string) => {
  console.log('🌐 DEBUG: Translation started', { 
    commentId: comment.id, 
    targetLanguage,
    hasText: !!comment.text 
  });
  
  if (!comment || !comment.text) return;

  const commentId = `comment_${comment.id}`;
  
  try {
    console.log('🌐 DEBUG: Getting translation service...');
    const translationService = DeepLTranslationService.getInstance();
    console.log('🌐 DEBUG: Translation service obtained');
    
    console.log('🌐 DEBUG: Calling translateItem...');
    await translateItem(
      commentId,
      comment.text,
      targetLanguage,
      (text, targetLang) => {
        console.log('🌐 DEBUG: Calling translationService.translateText', { text, targetLang });
        return translationService.translateText(text, targetLang);
      }
    );
    
    console.log('🌐 DEBUG: Translation completed successfully');
    showFeedback(`Comment translated! 🌐`);
  } catch (error) {
    console.error('🌐 DEBUG: Translation failed:', error);
    secureLog('Translation failed', { error: error.message, commentId: comment.id });
    showFeedback('Translation failed. Please try again.');
  }
}, [comment, translateItem, showFeedback]);



  // ================================================================
  // RENDER COMPONENTS
  // ================================================================

  const renderUserInfo = () => (
    <TouchableOpacity
      style={styles.userInfo}
      onPress={handleProfilePress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`View ${sanitizeUsername(comment.username)}'s profile`}
    >
      <Image
        source={{ 
          uri: sanitizeURL(comment.userAvatar) || 'https://via.placeholder.com/40' 
        }}
        style={styles.userAvatar}
        onError={() => console.warn('Avatar load failed')}
      />
      <View style={styles.userDetails}>
        <Text style={styles.username} numberOfLines={1}>
          {sanitizeUsername(comment.username)}
        </Text>
        <Text style={styles.timestamp}>
          {timeAgo}
          {comment.editedAt && ' • edited'}
        </Text>
      </View>
    </TouchableOpacity>
  );

const renderCommentContent = () => {
  if (comment.isDeleted) {
    return (
      <Text style={styles.deletedText}>
        [This comment was deleted]
      </Text>
    );
  }

  if (isEditing) {
    return (
      <View style={styles.editContainer}>
        <TextInput
          ref={editInputRef}
          style={styles.editInput}
          value={editText}
          onChangeText={setEditText}
          multiline
          placeholder="Edit your comment..."
          placeholderTextColor="#666"
          maxLength={MAX_COMMENT_LENGTH}
        />
        <View style={styles.editActions}>
          <TouchableOpacity
            style={styles.editCancelButton}
            onPress={handleCancelEdit}
            disabled={isSubmittingEdit}
          >
            <Text style={styles.editCancelText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.editSaveButton,
              (!editText.trim() || isSubmittingEdit) && styles.editSaveButtonDisabled
            ]}
            onPress={handleSubmitEdit}
            disabled={!editText.trim() || isSubmittingEdit}
          >
            {isSubmittingEdit ? (
              <ActivityIndicator size="small" color="#000" />
            ) : (
              <Text style={styles.editSaveText}>Save</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Get display text with translation support
  const getDisplayText = () => {
    if (!comment?.text) return '';
    
    const commentId = `comment_${comment.id}`;
    const translatedText = getTranslatedText(commentId);
    
    // Ensure both original and translated text are sanitized
    const textToDisplay = translatedText || comment.text;
    return sanitizeCommentText(textToDisplay);
  };

  return (
    <Markdown
      style={markdownStyles}
      onLinkPress={(url) => {
        if (url.startsWith('mention://')) {
          handleMentionPress(url);
          return false;
        }
        return true;
      }}
    >
      {processCommentText(getDisplayText())}
    </Markdown>
  );
};

  const renderActions = () => (
    <View style={styles.actions}>
      {/* Like Button */}
      <TouchableOpacity
        style={[styles.actionButton, hasLiked && styles.actionButtonLiked]}
        onPress={handleLike}
        disabled={hasLiked}
        accessibilityRole="button"
        accessibilityLabel={`${hasLiked ? 'Unlike' : 'Like'} comment`}
        accessibilityState={{ selected: hasLiked }}
      >
        <Animated.View style={{ transform: [{ scale: likeScale }] }}>
          <Ionicons
            name={hasLiked ? "heart" : "heart-outline"}
            size={16}
            color={hasLiked ? "#FF6347" : "#FFD700"}
          />
        </Animated.View>
        <Text style={[styles.actionText, hasLiked && styles.actionTextLiked]}>
          {comment.likes || 0}
        </Text>
      </TouchableOpacity>

      {/* Reply Button */}
      {canReply && (
        <TouchableOpacity
          style={styles.actionButton}
          onPress={handleReply}
          accessibilityRole="button"
          accessibilityLabel="Reply to comment"
        >
          <Ionicons name="chatbubble-outline" size={16} color="#00FFFF" />
          <Text style={styles.actionText}>Reply</Text>
        </TouchableOpacity>
      )}
{/* Translation Button - ADD THIS BLOCK */}
      <TranslationButton
        onTranslate={handleTranslateComment}
        isTranslating={isTranslatingComment}
        isTranslated={isItemTranslated(`comment_${comment.id}`)}
        currentLanguage={getCurrentLanguage(`comment_${comment.id}`)}
        size="small"
        showLabel={false}
        style={styles.commentTranslationButton}
      />
      {/* Toggle Replies */}
      {/* Toggle Replies - DEBUG: Always show for testing */}
      {(hasReplies || comment.id === '6ZIWdLceSv9LgCtmhZ6W') && (
        <TouchableOpacity
          style={styles.actionButton}
          onPress={handleToggleReplies}
          accessibilityRole="button"
          accessibilityLabel={`${showReplies ? 'Hide' : 'Show'} replies`}
        >
          <Ionicons 
            name={showReplies ? "chevron-up" : "chevron-down"} 
            size={16} 
            color="#00FFFF" 
          />
<Text style={styles.actionText}>
            {showReplies ? replies.length : repliesCount} {(showReplies ? replies.length : repliesCount) === 1 ? 'reply' : 'replies'}
          </Text>
        </TouchableOpacity>
      )}

      {/* More Actions */}
      {showActions && (
        <Animated.View style={[styles.moreActions, { opacity: actionsFade }]}>
          {canEdit && (
            <TouchableOpacity
              style={styles.moreActionButton}
              onPress={handleEdit}
            >
              <Ionicons name="create-outline" size={16} color="#00FFFF" />
              <Text style={styles.moreActionText}>Edit</Text>
            </TouchableOpacity>
          )}
          
          {canDelete && (
            <TouchableOpacity
              style={styles.moreActionButton}
              onPress={handleDelete}
            >
              <Ionicons name="trash-outline" size={16} color="#FF6B6B" />
              <Text style={[styles.moreActionText, { color: '#FF6B6B' }]}>Delete</Text>
            </TouchableOpacity>
          )}
          
          {!isOwnComment && (
            <TouchableOpacity
              style={styles.moreActionButton}
              onPress={handleReport}
              disabled={isReporting}
            >
              <Ionicons 
                name="flag-outline" 
                size={16} 
                color={isReporting ? "#666" : "#FF9500"} 
              />
              <Text style={[
                styles.moreActionText, 
                { color: isReporting ? "#666" : "#FF9500" }
              ]}>
                {isReporting ? 'Reporting...' : 'Report'}
              </Text>
            </TouchableOpacity>
          )}
        </Animated.View>
      )}
    </View>
  );

    const renderReplyInput = () => (
    <Animated.View style={[styles.replyContainer, { height: replySlideHeight }]}>
      <View style={styles.replyInputContainer}>
        <TextInput
          ref={replyInputRef}
          style={styles.replyInput}
          value={replyText} // Using managed state
          onChangeText={onUpdateReplyText} // Use managed state updater
          placeholder={`Reply to ${sanitizeUsername(comment.username)}...`}
          placeholderTextColor="#666"
          multiline
          maxLength={MAX_COMMENT_LENGTH}
        />
        <View style={styles.replyActions}>
          <TouchableOpacity
            style={styles.replyCancelButton}
            onPress={handleCancelReply}
            disabled={isSubmittingReply}
          >
            <Text style={styles.replyCancelText}>Cancel</Text>
          </TouchableOpacity>
          
          {/* UPDATED EMOJI BUTTON FOR REPLIES - Context-aware */}
          <TouchableOpacity
            style={styles.replyEmojiButton}
            onPress={handleReplyEmojiPress}
            accessibilityRole="button"
            accessibilityLabel="Add emoji to reply"
          >
            <Ionicons 
              name="happy" 
              size={20} 
              color={showEmojiPicker && emojiTarget === comment.id ? "#FFD700" : "#999"}
            />
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.replySubmitButton,
              (!replyText.trim() || isSubmittingReply) && styles.replySubmitButtonDisabled
            ]}
            onPress={handleSubmitReply}
            disabled={!replyText.trim() || isSubmittingReply}
          >
            {isSubmittingReply ? (
              <ActivityIndicator size="small" color="#000" />
            ) : (
              <Text style={styles.replySubmitText}>Reply</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Animated.View>
  );
const renderReplies = () => {
  if (!showReplies) return null;

  return (
    <View style={styles.repliesContainer}>
      {loadingReplies ? (
        <View style={styles.repliesLoading}>
          <ActivityIndicator size="small" color="#00FFFF" />
          <Text style={styles.repliesLoadingText}>Loading replies...</Text>
        </View>
      ) : (
        replies.map((reply, index) => (
          <View key={reply.id} style={styles.replyItem}>
            <CommentItem
              comment={reply}
              postId={postId}
              onShowQuickInfo={onShowQuickInfo}
              onAddReply={onAddReply}
              highlightComment={highlightComment}
              scrollViewRef={scrollViewRef}
              showFeedback={showFeedback}
              level={level + 1}
              maxLevel={maxLevel}
              // ADD THESE MISSING PROPS:
              showEmojiPicker={showEmojiPicker}
              onShowEmojiPicker={onShowEmojiPicker}
              onEmojiSelect={onEmojiSelect}
              onCloseEmojiPicker={onCloseEmojiPicker}
              emojiTarget={emojiTarget}
              replyText={''} // Replies don't need reply text (they can't have sub-replies)
              onUpdateReplyText={() => {}} // Empty function for nested replies
              onClearReplyText={() => {}} // Empty function for nested replies
            />
            {index < replies.length - 1 && (
              <View style={styles.replySeparator} />
            )}
          </View>
        ))
      )}
    </View>
  );
};

  // ================================================================
  // MAIN RENDER
  // ================================================================

  return (
    <Animated.View
      style={[
        styles.container,
        { 
          marginLeft: level * 16,
        },
      ]}
    >
      {/* Highlight Overlay */}
      {isHighlighted && (
        <Animated.View
          style={[
            styles.highlightOverlay,
            { opacity: highlightOpacity },
          ]}
        />
      )}

      {/* Main Comment */}
      <TouchableOpacity
        style={styles.commentContainer}
        onLongPress={handleLongPress}
        onPress={handleDoubleTap} // Double tap to reply
        activeOpacity={0.95}
        accessibilityRole="button"
        accessibilityLabel={`Comment by ${sanitizeUsername(comment.username)}. Double tap to reply, long press for more options.`}
      >
        <LinearGradient
          colors={['rgba(0,0,0,0.3)', 'rgba(0,0,0,0.1)']}
          style={styles.commentGradient}
        >
          {renderUserInfo()}
          
          <View style={styles.commentContent}>
            {renderCommentContent()}
          </View>

          {renderActions()}
        </LinearGradient>
      </TouchableOpacity>

      {/* Reply Input */}
      {isReplying && renderReplyInput()}

      {/* Nested Replies */}
      {renderReplies()}
    </Animated.View>
  );
};

// ================================================================
// STYLES
// ================================================================

const styles = StyleSheet.create({
  container: {
    marginBottom: 12,
  },
  highlightOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 255, 255, 0.2)',
    borderRadius: 12,
    zIndex: -1,
  },
  replyEmojiButton: {
  paddingHorizontal: 12,
  paddingVertical: 8,
  borderRadius: 16,
  backgroundColor: 'rgba(255, 215, 0, 0.1)',
  borderWidth: 1,
  borderColor: 'rgba(255, 215, 0, 0.3)',
  alignItems: 'center',
  justifyContent: 'center',
},
  commentContainer: {
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 255, 0.2)',
  },
  commentGradient: {
    padding: 12,
  },
  commentTranslationButton: {
    marginLeft: 8,
  },
  // User Info
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  userAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 255, 0.3)',
    marginRight: 8,
  },
  userDetails: {
    flex: 1,
  },
  username: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  timestamp: {
    color: '#999',
    fontSize: 12,
    marginTop: 2,
  },

  // Comment Content
  commentContent: {
    marginBottom: 8,
  },
  deletedText: {
    color: '#666',
    fontSize: 14,
    fontStyle: 'italic',
  },

  // Edit Mode
  editContainer: {
    marginVertical: 4,
  },
  editInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 255, 0.3)',
    borderRadius: 8,
    padding: 12,
    color: '#fff',
    fontSize: 14,
    minHeight: 60,
    textAlignVertical: 'top',
  },
  editActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 8,
    gap: 8,
  },
  editCancelButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  editCancelText: {
    color: '#999',
    fontSize: 14,
    fontWeight: '600',
  },
  editSaveButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: '#00FFFF',
  },
  editSaveButtonDisabled: {
    backgroundColor: 'rgba(102, 102, 102, 0.3)',
  },
  editSaveText: {
    color: '#000',
    fontSize: 14,
    fontWeight: 'bold',
  },

  // Actions
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 16,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionButtonLiked: {
    // Additional styling for liked state
  },
  actionText: {
    color: '#FFD700',
    fontSize: 12,
    fontWeight: '600',
  },
  actionTextLiked: {
    color: '#FF6347',
  },
  moreActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginLeft: 8,
  },
  moreActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  moreActionText: {
    color: '#00FFFF',
    fontSize: 12,
    fontWeight: '600',
  },

  // Reply Input
  replyContainer: {
    overflow: 'hidden',
    marginTop: 8,
  },
  replyInputContainer: {
    backgroundColor: 'rgba(0, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 255, 0.2)',
  },
  replyInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    padding: 12,
    color: '#fff',
    fontSize: 14,
    minHeight: 60,
    textAlignVertical: 'top',
  },
  replyActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 8,
    gap: 8,
  },
  replyCancelButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  replyCancelText: {
    color: '#999',
    fontSize: 14,
    fontWeight: '600',
  },
  replySubmitButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: '#00FFFF',
  },
  replySubmitButtonDisabled: {
    backgroundColor: 'rgba(102, 102, 102, 0.3)',
  },
  replySubmitText: {
    color: '#000',
    fontSize: 14,
    fontWeight: 'bold',
  },

  // Replies
  repliesContainer: {
    marginTop: 8,
    marginLeft: 16,
    borderLeftWidth: 2,
    borderLeftColor: 'rgba(0, 255, 255, 0.2)',
    paddingLeft: 12,
  },
  repliesLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 8,
  },
  repliesLoadingText: {
    color: '#999',
    fontSize: 14,
  },
  replyItem: {
    marginBottom: 8,
  },
  replySeparator: {
    height: 1,
    backgroundColor: 'rgba(0, 255, 255, 0.1)',
    marginVertical: 8,
  },
});

// Markdown Styles
const markdownStyles = {
  body: {
    color: '#fff',
    fontSize: 14,
    lineHeight: 20,
  },
  paragraph: {
    color: '#fff',
    marginBottom: 4,
  },
  strong: {
    color: '#FFD700',
    fontWeight: 'bold',
  },
  em: {
    color: '#00FFFF',
    fontStyle: 'italic',
  },
  link: {
    color: '#00FFFF',
    textDecorationLine: 'underline',
  },
  code_inline: {
    backgroundColor: 'rgba(0, 255, 255, 0.2)',
    color: '#FFD700',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
    fontSize: 12,
  },
};

export default memo(CommentItem);