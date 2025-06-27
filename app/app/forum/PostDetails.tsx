import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Platform,
  Animated,
  ActivityIndicator,
  RefreshControl,
  AppState,
  Dimensions,
  TextInput,
} from 'react-native';
import { useRoute, useNavigation, useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import {
  getFirestore,
  doc,
  getDoc,
  onSnapshot,
  updateDoc,
  increment,
  arrayUnion,
  arrayRemove,
  deleteDoc,
  runTransaction,
  addDoc,
  collection,
  serverTimestamp,
} from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
// Add this to your existing imports
import { 
  validateCommentContent, 
  sanitizeUsername, 
  sanitizeURL, 
  secureLog 
} from '../../utils/security';
// Components
import PostContent from '../../components/forum/PostContent';
import CommentsList from '../../components/forum/CommentsList';
import CommentInput from '../../components/forum/CommentInput';
import QuickInfoBox from '../../components/forum/QuickInfoBox';
import EmojiPicker from '../../components/forum/EmojiPicker';
import LoadingScreen from '../../components/forum/LoadingScreen';
import ErrorScreen from '../../components/forum/ErrorScreen';
import TranslationButton from '../../components/forum/TranslationButton';
import { CustomHeader } from '../../components/CustomHeader';
// Utils & Config
import { firebaseApp } from '../firebaseConfig';
import { 
  createNotification, 
  checkAndGrantDailyReward,
  sanitizeInput,
  validatePostId,
  handleNetworkError,
  debounce,
  formatTimeAgo
} from '../../utils/helpers';

// Translation Services
import { DeepLTranslationService } from '../../services/DeepLTranslationService';
import { usePostTranslation } from '../../hooks/usePostTranslation';

// Types
interface Post {
  id: string;
  title: string;
  content: string;
  username: string;
  userId: string;
  userAvatar: string;
  likes: number;
  comments: number;
  engagement: number;
  images?: string[];
  gif?: string;
  vip?: boolean;
  category?: string;
  likedBy?: string[];
  createdAt: any;
  updatedAt?: any;
  visibility?: string;
}

interface Comment {
  id: string;
  text: string;
  userId: string;
  username: string;
  userAvatar: string;
  likes: number;
  likedBy?: string[];
  createdAt: any;
}

interface PostAuthor {
  uid: string;
  username: string;
  profileImage: string;
  reputation?: number;
  vip?: boolean;
  rank?: string;
}

interface RouteParams {
  id: string;
  fromPosting?: string;
  highlightComment?: string;
}

// Initialize Firebase
const db = getFirestore(firebaseApp);
const auth = getAuth(firebaseApp);

// Constants
const SCREEN_WIDTH = Dimensions.get('window').width;
const REFRESH_DEBOUNCE_MS = 1000;
const LIKE_DEBOUNCE_MS = 500;
const SAVE_DEBOUNCE_MS = 500;

export default function PostDetails() {
  // Navigation & Route
  const route = useRoute();
  const navigation = useNavigation();
  const { id, fromPosting, highlightComment } = route.params as RouteParams;
// Header/Notification State - NEW
const [notifications, setNotifications] = useState<any[]>([]);

const markNotificationAsRead = async (notifId: string) => {
  // Implement notification marking logic if needed
  console.log('Marking notification as read:', notifId);
};
  // Refs
  const scrollViewRef = useRef<ScrollView>(null);
  const isMountedRef = useRef(true);
  const unsubscribeRef = useRef<(() => void)[]>([]);
  const feedbackOpacity = useRef(new Animated.Value(0)).current;

  // Core State
  const [post, setPost] = useState<Post | null>(null);
  const [postAuthor, setPostAuthor] = useState<PostAuthor | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Interaction State
  const [hasLiked, setHasLiked] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [sortMethod, setSortMethod] = useState<'newest' | 'mostLiked'>('newest');
  
  // UI State
  const [showHeartAnim, setShowHeartAnim] = useState(false);
  const [heartAnimCoords, setHeartAnimCoords] = useState({ x: 0, y: 0 });
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [quickInfoVisible, setQuickInfoVisible] = useState(false);
  const [quickInfoData, setQuickInfoData] = useState<any>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showLikeToast, setShowLikeToast] = useState(false);
  // Comment State - ADDED TOGGLE STATE
  const [showCommentInput, setShowCommentInput] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [selection, setSelection] = useState({ start: 0, end: 0 });
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);

  const [emojiTarget, setEmojiTarget] = useState<'main' | string>('main'); // Track which input is active
const [replyStates, setReplyStates] = useState<{[commentId: string]: string}>({}); // Track reply text for each comment
  // Translation State - NEW
  const {
    translateItem,
    getTranslatedText,
    isTranslating: isTranslatingContent,
    isItemTranslated,
    getCurrentLanguage,
    clearTranslation,
  } = usePostTranslation();

  const currentUser = auth.currentUser;

  // ================================================================
  // DEBUG LOGGING - MOVED TO USEEFFECT TO PREVENT INFINITE RENDERS
  // ================================================================

useEffect(() => {
  console.log('🟨 DEBUG PostDetails States:', {
    loading,
    post: !!post,
    currentUser: !!currentUser,
    showCommentInput,
    canInteract: !!canInteract,  // FIXED: Convert to boolean
    postId: id
  });
}, [showCommentInput]);

  // ================================================================
  // VALIDATION & SAFETY
  // ================================================================

  // Validate route params on mount
  useEffect(() => {
    if (!validatePostId(id)) {
      setError('Invalid post ID');
      setLoading(false);
      return;
    }
  }, [id]);

  // ================================================================
  // TRANSLATION HANDLERS - NEW
  // ================================================================

  const handleTranslatePost = useCallback(async (targetLanguage: string) => {
    if (!post || !post.content) {
      showFeedback('No content to translate');
      return;
    }

    const postId = `post_${post.id}`;
    
    try {
      // Get translation service instance (assumes API key is already configured)

const translationService = DeepLTranslationService.getInstance();
      
      await translateItem(
        postId,
        post.content,
        targetLanguage,
        (text, targetLang) => translationService.translateText(text, targetLang)
      );
      
      showFeedback(`Post translated! 🌐`);
    } catch (error) {
      console.error('Translation failed:', error);
      showFeedback('Translation failed. Please try again.');
    }
  }, [post, translateItem, showFeedback]);

  const getDisplayContent = useCallback(() => {
    if (!post) return '';
    
    const postId = `post_${post.id}`;
    const translatedText = getTranslatedText(postId);
    
    return translatedText || post.content || '';
  }, [post, getTranslatedText]);

  const getDisplayTitle = useCallback(() => {
    if (!post) return '';
    
    const titleId = `title_${post.id}`;
    const translatedTitle = getTranslatedText(titleId);
    
    return translatedTitle || post.title || '';
  }, [post, getTranslatedText]);

  const handleTranslateTitle = useCallback(async (targetLanguage: string) => {
    if (!post || !post.title) return;

    const titleId = `title_${post.id}`;
    
    try {
const translationService = DeepLTranslationService.getInstance();
      
      await translateItem(
        titleId,
        post.title,
        targetLanguage,
        (text, targetLang) => translationService.translateText(text, targetLang)
      );
    } catch (error) {
      console.error('Title translation failed:', error);
    }
  }, [post, translateItem]);

  const handleTranslateComplete = useCallback(async (targetLanguage: string) => {
    // Translate both title and content together
    await Promise.all([
      handleTranslateTitle(targetLanguage),
      handleTranslatePost(targetLanguage),
    ]);
  }, [handleTranslateTitle, handleTranslatePost]);

  // ================================================================
  // EMOJI PICKER HANDLERS - NEW SECTION
  // ================================================================

const handleShowEmojiPicker = useCallback((target: 'main' | string = 'main') => {
  console.log('🟦 DEBUG: Show emoji picker clicked for target:', target);
  setEmojiTarget(target);
  setShowEmojiPicker(true);
}, []);

const handleEmojiSelect = useCallback((emoji: string) => {
  console.log('🟦 DEBUG: Emoji selected:', emoji, 'for target:', emojiTarget);
  
  if (emojiTarget === 'main') {
    // Handle main comment emoji
    const startStr = newComment.substring(0, selection.start);
    const endStr = newComment.substring(selection.end);
    const updated = startStr + emoji + endStr;
    
    setNewComment(updated);
    
    // Update cursor position
    const newPos = selection.start + emoji.length;
    setSelection({ start: newPos, end: newPos });
  } else {
    // Handle reply emoji - update specific reply text
    const currentReplyText = replyStates[emojiTarget] || '';
    const updatedReplyText = currentReplyText + emoji;
    
    setReplyStates(prev => ({
      ...prev,
      [emojiTarget]: updatedReplyText
    }));
    
    console.log('🟦 DEBUG: Updated reply text for', emojiTarget, ':', updatedReplyText);
  }
}, [newComment, selection.start, selection.end, emojiTarget, replyStates]);

const handleCloseEmojiPicker = useCallback(() => {
  console.log('🟦 DEBUG: Close emoji picker');
  setShowEmojiPicker(false);
  setEmojiTarget('main'); // Reset to main
}, []);


const updateReplyText = useCallback((commentId: string, text: string) => {
  setReplyStates(prev => ({
    ...prev,
    [commentId]: text
  }));
}, []);

const getReplyText = useCallback((commentId: string) => {
  return replyStates[commentId] || '';
}, [replyStates]);

const clearReplyText = useCallback((commentId: string) => {
  setReplyStates(prev => {
    const newState = { ...prev };
    delete newState[commentId];
    return newState;
  });
}, [])

  // ================================================================
  // FEEDBACK SYSTEM
  // ================================================================

  const showFeedback = useCallback((message: string, duration = 3000) => {
    if (!isMountedRef.current) return;
    
    setFeedbackMessage(message);
    Animated.sequence([
      Animated.timing(feedbackOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.delay(duration),
      Animated.timing(feedbackOpacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      if (isMountedRef.current) {
        setFeedbackMessage('');
      }
    });
  }, [feedbackOpacity]);

  // ================================================================
  // DATA FETCHING & REAL-TIME UPDATES
  // ================================================================

  const fetchPost = useCallback(async () => {
    if (!id || !isMountedRef.current) return;

    try {
      setError(null);
      
      const postRef = doc(db, 'posts', id);
      const postSnap = await getDoc(postRef);
      
      if (!postSnap.exists()) {
        setError('Post not found');
        setLoading(false);
        return;
      }

      const postData = { id: postSnap.id, ...postSnap.data() } as Post;
      
      // Validate post data
      if (!postData.title || !postData.userId) {
        setError('Invalid post data');
        setLoading(false);
        return;
      }

      setPost(postData);
      console.log('✅ DEBUG: Post loaded successfully', { postId: postData.id, title: postData.title });

      // Fetch author data if available
      if (postData.userId) {
        try {
          const userRef = doc(db, 'users', postData.userId);
          const userSnap = await getDoc(userRef);
          
          if (userSnap.exists()) {
            const userData = userSnap.data();
            setPostAuthor({
              uid: userSnap.id,
              username: userData.username || postData.username || 'Anonymous',
              profileImage: userData.profileImage || userData.avatar || postData.userAvatar || '',
              reputation: userData.reputation || 0,
              vip: userData.vip || false,
              rank: userData.rank || '',
            });
          }
        } catch (authorError) {
          console.warn('Failed to fetch author data:', authorError);
          // Set fallback author data
          setPostAuthor({
            uid: postData.userId,
            username: postData.username || 'Anonymous',
            profileImage: postData.userAvatar || '',
          });
        }
      }

      setLoading(false);

    } catch (error) {
      console.error('Error fetching post:', error);
      setError(handleNetworkError(error));
      setLoading(false);
    }
  }, [id]);

// COMPLETELY REMOVE LOGGING TO STOP INFINITE LOOP
const cleanupListeners = useCallback(() => {
  // Silent cleanup - no logging
  unsubscribeRef.current.forEach((unsubscribe) => {
    try {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    } catch (error) {
      // Silent error handling
    }
  });
  unsubscribeRef.current = [];
}, []); // Empty dependency array

const setupRealTimeListeners = useCallback(() => {
  if (!id || !isMountedRef.current || !currentUser?.uid) return;

  // Silent cleanup - no logging to prevent infinite loops
  unsubscribeRef.current.forEach((unsubscribe) => {
    try {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    } catch (error) {
      // Silent error handling
    }
  });
  unsubscribeRef.current = [];

  // Post listener
  const postRef = doc(db, 'posts', id);
  const postUnsubscribe = onSnapshot(postRef, 
    (snap) => {
      if (!isMountedRef.current) return;
      
      if (snap.exists()) {
        const postData = { id: snap.id, ...snap.data() } as Post;
        setPost(prevPost => ({
          ...prevPost,
          ...postData,
        }));
      }
    },
    (error) => {
      console.error('Post listener error:', error);
      // Don't show error for real-time updates, just log it
    }
  );

  // Comments listener
  const commentsRef = collection(db, 'posts', id, 'comments');
  const commentsUnsubscribe = onSnapshot(commentsRef,
    (snapshot) => {
      if (!isMountedRef.current) return;
      
      const commentsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Comment[];
      
      setComments(commentsData);
    },
    (error) => {
      console.error('Comments listener error:', error);
    }
  );

  // Store listeners in ref for cleanup
  unsubscribeRef.current = [postUnsubscribe, commentsUnsubscribe];

  // Check user interactions (like/save status) - currentUser is guaranteed to exist here
  checkUserInteractions();
}, [id, currentUser?.uid, checkUserInteractions]); // INCLUDE checkUserInteractions

  const checkUserInteractions = useCallback(async () => {
    if (!currentUser || !post?.id || !isMountedRef.current) return;

    try {
      // Check like status
      if (post.likedBy && Array.isArray(post.likedBy)) {
        setHasLiked(post.likedBy.includes(currentUser.uid));
      }

      // Check save status
      const savedRef = doc(db, 'users', currentUser.uid, 'savedPosts', post.id);
      const savedSnap = await getDoc(savedRef);
      setIsSaved(savedSnap.exists());

    } catch (error) {
      console.warn('Failed to check user interactions:', error);
    }
  }, [currentUser, post?.id, post?.likedBy]);

  // ================================================================
  // USER ACTIONS - DEBOUNCED FOR PERFORMANCE
  // ================================================================

const handleLike = useCallback(
  debounce(async () => {
    console.log('🔍 DEBUG handleLike called with:', {
      hasLiked,
      currentUser: !!currentUser,
      post: !!post,
      postLikedBy: post?.likedBy,
      currentUserUid: currentUser?.uid
    });

    if (!currentUser || !post || !isMountedRef.current) {
      if (!currentUser) {
        showFeedback('Please log in to like posts');
      }
      return;
    }

    // Check if already liked and show toast
    if (hasLiked) {
      console.log('🎯 User already liked - showing toast');
      setShowLikeToast(true);
      setTimeout(() => {
        if (isMountedRef.current) {
          setShowLikeToast(false);
        }
      }, 2000);
      return;
    }

    console.log('🚀 Proceeding with like action');

    try {
      const postRef = doc(db, 'posts', post.id);
      
      await runTransaction(db, async (transaction) => {
        const postDoc = await transaction.get(postRef);
        
        if (!postDoc.exists()) {
          throw new Error('Post not found');
        }

        const postData = postDoc.data();
        const likedBy = postData.likedBy || [];

        console.log('🔍 Transaction check - likedBy:', likedBy, 'includes user:', likedBy.includes(currentUser.uid));

        if (likedBy.includes(currentUser.uid)) {
          throw new Error('Already liked');
        }

        transaction.update(postRef, {
          likes: increment(1),
          likedBy: arrayUnion(currentUser.uid),
        });
      });

      // Optimistic update
      setHasLiked(true);
      setPost(prev => prev ? { ...prev, likes: (prev.likes || 0) + 1 } : null);

      // Heart animation
      setShowHeartAnim(true);
      setTimeout(() => {
        if (isMountedRef.current) {
          setShowHeartAnim(false);
        }
      }, 1500);

      // Create notification
      if (post.userId && currentUser.uid !== post.userId) {
        const triggerName = currentUser.displayName || currentUser.email || 'Someone';
        await createNotification(post.userId, {
          type: 'like',
          message: `${triggerName} liked your post.`,
          postId: post.id,
        });
      }

      showFeedback('Post liked! ❤️');

    } catch (error) {
      console.error('❌ Error in handleLike:', error);
      console.log('🔍 Error details:', error.message);
      
      // Check if it's the "Already liked" error
      if (error.message === 'Already liked') {
        console.log('🎯 Caught "Already liked" error - showing toast');
        setShowLikeToast(true);
        setTimeout(() => {
          if (isMountedRef.current) {
            setShowLikeToast(false);
          }
        }, 2000);
        return;
      }
      
      // Revert optimistic update for other errors
      setHasLiked(false);
      showFeedback('Failed to like post. Please try again.');
    }
  }, LIKE_DEBOUNCE_MS),
  [currentUser, post, hasLiked, showFeedback, isMountedRef]
);
  const handleSave = useCallback(
    debounce(async () => {
      if (!currentUser || !post || isSaved || !isMountedRef.current) {
        if (!currentUser) {
          showFeedback('Please log in to save posts');
        } else if (isSaved) {
          showFeedback('Post already saved');
        }
        return;
      }

      try {
        const saveRef = doc(db, 'users', currentUser.uid, 'savedPosts', post.id);
        await updateDoc(saveRef, {
          postId: post.id,
          title: post.title || '',
          snippet: post.content?.slice(0, 100) || '',
          category: post.category || 'General',
          savedAt: new Date(),
        });

        setIsSaved(true);
        showFeedback('Post saved! 🔖');

      } catch (error) {
        console.error('Error saving post:', error);
        showFeedback('Failed to save post. Please try again.');
      }
    }, SAVE_DEBOUNCE_MS),
    [currentUser, post, isSaved, showFeedback]
  );

  const handleDeletePost = useCallback(async () => {
    if (!post || !currentUser || currentUser.uid !== post.userId) {
      showFeedback('You can only delete your own posts');
      return;
    }

    Alert.alert(
      'Delete Post',
      'Are you sure you want to delete this post? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteDoc(doc(db, 'posts', post.id));
              showFeedback('Post deleted successfully');
              
              // Navigate back after short delay
              setTimeout(() => {
                navigation.goBack();
              }, 1500);

            } catch (error) {
              console.error('Error deleting post:', error);
              showFeedback('Failed to delete post. Please try again.');
            }
          },
        },
      ]
    );
  }, [post, currentUser, navigation, showFeedback]);

  // ================================================================
  // COMMENT HANDLERS - UPDATED WITH TOGGLE LOGIC
  // ================================================================

const handleShowCommentInput = useCallback(() => {
  if (!currentUser) {
    showFeedback('Please log in to comment');
    return;
  }
  
  console.log('🟦 DEBUG: Show comment input clicked');
  setShowCommentInput(true);
  
}, [currentUser, showFeedback, canInteract]);

  const handleHideCommentInput = useCallback(() => {
    console.log('🟦 DEBUG: Hide comment input');
    setShowCommentInput(false);
    setNewComment('');
    // Also close emoji picker when hiding comment input
    setShowEmojiPicker(false);
  }, []);

  const handleAddComment = useCallback(async () => {
  console.log('🔍 Starting comment submission with security checks');
  
  const trimmedComment = sanitizeInput(newComment);
  
  if (!trimmedComment || !currentUser || isSubmittingComment) {
    if (!trimmedComment) {
      showFeedback('Please enter a comment');
    } else if (!currentUser) {
      showFeedback('Please log in to comment');
    }
    return;
  }

  // ADD SECURITY VALIDATION HERE
  const validation = validateCommentContent(trimmedComment);
  console.log('🔍 Validation result:', validation);
  
  if (!validation.isValid) {
    console.log('🚨 VALIDATION FAILED:', validation.errors);
    secureLog('Invalid comment content', { errors: validation.errors, userId: currentUser.uid });
    showFeedback(validation.errors[0] || 'Invalid comment content');
    return;
  }

  console.log('✅ Validation passed, proceeding with submission');
  setIsSubmittingComment(true);

  try {
    const commentData = {
      text: validation.sanitizedContent,  // Use sanitized content
      userId: currentUser.uid,
      username: sanitizeUsername(currentUser.displayName || currentUser.email?.split('@')[0] || 'Anonymous'),
      userAvatar: sanitizeURL(currentUser.photoURL || '') || '',
      likes: 0,
      likedBy: [],
      createdAt: serverTimestamp(),
      postId: id,
    };

    console.log('🔍 Creating comment document');

    // Rest of your existing code...
    await addDoc(collection(db, 'posts', id, 'comments'), commentData);
    await updateDoc(doc(db, 'posts', id), {
      comments: increment(1),
      lastActivity: serverTimestamp(),
    });

    // Create notification for post author
    if (post?.userId && currentUser.uid !== post.userId) {
      const triggerName = sanitizeUsername(currentUser.displayName || currentUser.email || 'Someone');
      await createNotification(post.userId, {
        type: 'comment',
        message: `${triggerName} commented on your post.`,
        postId: id,
      });
    }
    
    setNewComment('');
    setShowCommentInput(false);
    setShowEmojiPicker(false); // Close emoji picker too
    showFeedback('Comment posted! 💬');

    console.log('✅ Comment posted successfully with security');

  } catch (error) {
    console.error('Error adding comment:', error);
    secureLog('Comment submission failed', { error: error.message, postId: id });
    showFeedback('Failed to post comment. Please try again.');
  } finally {
    setIsSubmittingComment(false);
  }
}, [newComment, currentUser, isSubmittingComment, showFeedback, id, post]);
  // ================================================================
  // UI HANDLERS
  // ================================================================

  const handleShowQuickInfo = useCallback((userData: any, fromBanner = false) => {
    if (!userData) return;
    
    setQuickInfoData(userData);
    setQuickInfoVisible(true);
  }, []);

  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleRefresh = useCallback(
    debounce(async () => {
      setRefreshing(true);
      try {
        await fetchPost();
      } catch (error) {
        console.error('Refresh error:', error);
      } finally {
        setRefreshing(false);
      }
    }, REFRESH_DEBOUNCE_MS),
    [fetchPost]
  );

  const scrollToTop = useCallback(() => {
    scrollViewRef.current?.scrollTo({ y: 0, animated: true });
  }, []);

  // ================================================================
  // LIFECYCLE & EFFECTS
  // ================================================================

// FIXED: Remove cleanupListeners from dependency array
useEffect(() => {
  isMountedRef.current = true;
  fetchPost();
  
  return () => {
    isMountedRef.current = false;
    cleanupListeners();
  };
}, [fetchPost]); // STABLE DEPENDENCIES

useEffect(() => {
  if (post?.id && currentUser?.uid) {
    setupRealTimeListeners();
  }
  
  return () => {
    cleanupListeners();
  };
}, [post?.id, currentUser?.uid, setupRealTimeListeners]); // INCLUDE setupRealTimeListeners

  // Handle app state changes for connection optimization
  useEffect(() => {
    const handleAppStateChange = (nextAppState: string) => {
      if (nextAppState === 'active' && post) {
        // Refresh data when app becomes active
        handleRefresh();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription?.remove();
  }, [post, handleRefresh]);

  // Focus effect for navigation optimization
// FIXED: Remove cleanupListeners from dependency array
useFocusEffect(
  useCallback(() => {
    // Component is focused
    return () => {
      // Component is unfocused - cleanup UI state only
      setShowEmojiPicker(false);
      setQuickInfoVisible(false);
      // Don't call cleanupListeners here - let useEffect handle it
    };
  }, []) // EMPTY DEPENDENCIES
);
  // ================================================================
  // MEMOIZED VALUES FOR PERFORMANCE
  // ================================================================

  const isOwnPost = useMemo(() => {
    return currentUser && post && currentUser.uid === post.userId;
  }, [currentUser, post]);

  const canInteract = useMemo(() => {
    return !loading && post && currentUser;
  }, [loading, post, currentUser]);

  const sortedComments = useMemo(() => {
    if (!comments.length) return [];
    
    const sorted = [...comments];
    if (sortMethod === 'mostLiked') {
      sorted.sort((a, b) => (b.likes || 0) - (a.likes || 0));
    } else {
      sorted.sort((a, b) => {
        const aTime = a.createdAt?.toDate?.()?.getTime() || 0;
        const bTime = b.createdAt?.toDate?.()?.getTime() || 0;
        return bTime - aTime;
      });
    }
    return sorted;
  }, [comments, sortMethod]);

  // Translation-related memoized values - NEW
  const postTranslationButton = useMemo(() => {
    if (!post) return null;
    
    return (
      <TranslationButton
        onTranslate={handleTranslateComplete}
        isTranslating={isTranslatingContent}
        isTranslated={isItemTranslated(`post_${post.id}`)}
        currentLanguage={getCurrentLanguage(`post_${post.id}`)}
        size="medium"
        showLabel={true}
      />
    );
  }, [post, handleTranslateComplete, isTranslatingContent, isItemTranslated, getCurrentLanguage]);

  const displayPost = useMemo(() => {
    if (!post) return null;
    
    return {
      ...post,
      title: getDisplayTitle(),
      content: getDisplayContent(),
    };
  }, [post, getDisplayTitle, getDisplayContent]);

  // ================================================================
  // RENDER CONDITIONS
  // ================================================================

  if (loading) {
    return <LoadingScreen />;
  }

  if (error) {
    return (
      <ErrorScreen 
        error={error} 
        onRetry={fetchPost}
        onBack={handleBack}
      />
    );
  }

  if (!post) {
    return (
      <ErrorScreen 
        error="Post not found" 
        onBack={handleBack}
      />
    );
  }

  // ================================================================
  // MAIN RENDER
  // ================================================================

  return (
        <View style={styles.container}>
    {/* Gaming Gradient Background */}
    <LinearGradient
      colors={['#000', '#0a0a0a', '#1a262e', '#16323e']}
      style={StyleSheet.absoluteFill}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    />
    {/* Custom Header */}
    <CustomHeader
      navigation={navigation}
      route={{ name: 'Post Details' }}
      options={{ headerTitle: 'Post Details' }}
      back={true}
      notifications={notifications}
      markNotificationAsRead={markNotificationAsRead}
      userId={currentUser?.uid || ''}
      onBackPress={handleBack} // Use your existing handleBack function
    />
      <ScrollView
        ref={scrollViewRef}
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#00FFFF"
            colors={['#00FFFF', '#6A5ACD']}
          />
        }
      >
<View style={styles.headerSpacer} />

        {/* Delete Button for Own Posts */}
        {isOwnPost && (
          <TouchableOpacity
            onPress={handleDeletePost}
            style={styles.deleteButton}
          >
            <Ionicons name="trash-outline" size={18} color="#FF4444" />
            <Text style={styles.deleteButtonText}>Delete Post</Text>
          </TouchableOpacity>
        )}

        {/* Post Content - UPDATED WITH TRANSLATION */}
        <PostContent
          post={displayPost}
          postAuthor={postAuthor}
          onShowQuickInfo={handleShowQuickInfo}
          onLike={handleLike}
          onSave={handleSave}
          onComment={handleShowCommentInput}
          hasLiked={hasLiked}
          isSaved={isSaved}
          canInteract={canInteract}
          showHeartAnim={showHeartAnim}
          heartAnimCoords={heartAnimCoords}
          translationButton={postTranslationButton}
        />

        {/* Comments Section */}
<CommentsList
  comments={sortedComments}
  postId={post.id}
  sortMethod={sortMethod}
  onSortChange={setSortMethod}
  onShowQuickInfo={handleShowQuickInfo}
  highlightComment={highlightComment}
  scrollViewRef={scrollViewRef}
  showFeedback={showFeedback}
  // UPDATED EMOJI PROPS - Now context-aware
  showEmojiPicker={showEmojiPicker}
  onShowEmojiPicker={handleShowEmojiPicker}
  onEmojiSelect={handleEmojiSelect}
  onCloseEmojiPicker={handleCloseEmojiPicker}
  emojiPickerVisible={showEmojiPicker}
  emojiTarget={emojiTarget}
  // NEW REPLY STATE PROPS
  replyStates={replyStates}
  onUpdateReplyText={updateReplyText}
  onGetReplyText={getReplyText}
  onClearReplyText={clearReplyText}
/>

        {/* Back to Top Button */}
        <TouchableOpacity style={styles.backToTopButton} onPress={scrollToTop}>
          <LinearGradient
            colors={['#00FFFF', '#6A5ACD']}
            style={styles.backToTopGradient}
          >
            <Ionicons name="arrow-up" size={20} color="#000" />
            <Text style={styles.backToTopText}>Back to Top</Text>
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>

      {/* Floating Comment Input - UPDATED WITH EMOJI BUTTON */}
      {canInteract && showCommentInput && (
        <View style={styles.simpleCommentInput}>
          <LinearGradient
            colors={['rgba(0,0,0,0.95)', 'rgba(0,0,0,0.9)']}
            style={styles.simpleCommentContainer}
          >
            <TextInput
              style={styles.simpleCommentTextInput}
              value={newComment}
              onChangeText={setNewComment}
              onSelectionChange={({ nativeEvent }) => 
                setSelection(nativeEvent.selection)
              }
              placeholder="Write a comment..."
              placeholderTextColor="#666"
              multiline
              autoFocus
            />
            <View style={styles.simpleCommentActions}>
              <TouchableOpacity
                style={styles.simpleCommentCancel}
                onPress={handleHideCommentInput}
              >
                <Text style={styles.simpleCommentCancelText}>Cancel</Text>
              </TouchableOpacity>
              
              {/* EMOJI BUTTON */}
<TouchableOpacity
  style={styles.simpleCommentEmojiButton}
  onPress={() => handleShowEmojiPicker('main')} // Specify 'main' target
>
  <Ionicons 
    name="happy" 
    size={20} 
    color={showEmojiPicker && emojiTarget === 'main' ? "#FFD700" : "#999"}
  />
</TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.simpleCommentSubmit,
                  !newComment.trim() && styles.simpleCommentSubmitDisabled
                ]}
                onPress={handleAddComment}
                disabled={!newComment.trim() || isSubmittingComment}
              >
                <Text style={styles.simpleCommentSubmitText}>
                  {isSubmittingComment ? 'Posting...' : 'Post'}
                </Text>
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </View>
      )}

      {/* Modals */}
      <QuickInfoBox
        visible={quickInfoVisible}
        userData={quickInfoData}
        onClose={() => setQuickInfoVisible(false)}
        onMoreInfo={() => {
          setQuickInfoVisible(false);
          // Navigate to user profile
        }}
      />

      {/* UPDATED EMOJI PICKER */}
      <EmojiPicker
        visible={showEmojiPicker}
        onSelect={handleEmojiSelect}
        onClose={handleCloseEmojiPicker}
      />

      {/* Feedback Toast */}
      {feedbackMessage !== '' && (
        <Animated.View
          style={[
            styles.feedbackToast,
            { opacity: feedbackOpacity }
          ]}
        >
          <LinearGradient
            colors={['rgba(0,255,255,0.9)', 'rgba(106,90,205,0.9)']}
            style={styles.feedbackGradient}
          >
            <Text style={styles.feedbackText}>{feedbackMessage}</Text>
          </LinearGradient>
        </Animated.View>
      )}
      {/* Like Toast Message - ADD THIS */}
      {showLikeToast && (
        <Animated.View style={styles.likeToastContainer}>
          <LinearGradient
            colors={['rgba(255, 99, 71, 0.9)', 'rgba(255, 69, 0, 0.9)']}
            style={styles.likeToastGradient}
          >
            <Ionicons name="heart" size={20} color="#fff" />
            <Text style={styles.likeToastText}>Already liked! ❤️</Text>
          </LinearGradient>
        </Animated.View>
      )}
    
    </View>
  );
}

// ================================================================
// STYLES - OPTIMIZED FOR GLOBAL ACCESSIBILITY
// ================================================================

const styles = StyleSheet.create({
  headerSpacer: {
  height: 100, // Adjust based on your design preference
},

  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 100, // Space for floating comment input
  },
  backButton: {
    alignSelf: 'flex-start',
    borderRadius: 20,
    marginBottom: 16,
    overflow: 'hidden',
    width: 120,
    height: 40,
  },
  backButtonInner: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  // Like Toast Styles - ADD THESE
  likeToastContainer: {
    position: 'absolute',
    top: 150,
    alignSelf: 'center',
    borderRadius: 25,
    overflow: 'hidden',
    shadowColor: '#FF6347',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
    zIndex: 1000,
  },
  likeToastGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 8,
  },
  likeToastText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  backButtonText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 14,
  },
  deleteButton: {
    alignSelf: 'flex-end',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: '#FF4444',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 12,
    gap: 6,
  },
  deleteButtonText: {
    color: '#FF4444',
    fontWeight: 'bold',
    fontSize: 14,
  },
  backToTopButton: {
    alignSelf: 'center',
    marginTop: 24,
    borderRadius: 20,
    overflow: 'hidden',
  },
  backToTopGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 6,
  },
  backToTopText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 14,
  },
  feedbackToast: {
    position: 'absolute',
    bottom: 120,
    left: 20,
    right: 20,
    borderRadius: 12,
    overflow: 'hidden',
    zIndex: 1000,
  },
  feedbackGradient: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    alignItems: 'center',
  },
  feedbackText: {
    color: '#000',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  
  // Comment Input Styles
  simpleCommentInput: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    borderRadius: 12,
    overflow: 'hidden',
    zIndex: 1000,
  },
  simpleCommentContainer: {
    padding: 16,
  },
  simpleCommentTextInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 255, 0.3)',
    borderRadius: 8,
    padding: 12,
    color: '#fff',
    fontSize: 16,
    minHeight: 60,
    textAlignVertical: 'top',
    marginBottom: 12,
  },
  simpleCommentActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  simpleCommentCancel: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  simpleCommentCancelText: {
    color: '#999',
    fontSize: 14,
    fontWeight: '600',
  },
  // NEW EMOJI BUTTON STYLE
  simpleCommentEmojiButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  simpleCommentSubmit: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: '#00FFFF',
  },
  simpleCommentSubmitDisabled: {
    backgroundColor: 'rgba(102, 102, 102, 0.3)',
  },
  simpleCommentSubmitText: {
    color: '#000',
    fontSize: 14,
    fontWeight: 'bold',
  },
});