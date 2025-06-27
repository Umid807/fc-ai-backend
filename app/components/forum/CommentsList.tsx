import React, { memo, useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import {
  collection,
  onSnapshot,
  query,
  orderBy,
  limit,
  where,
  getFirestore,
} from 'firebase/firestore';
import Ionicons from '@expo/vector-icons/Ionicons';

import CommentItem from './CommentItem';
import { firebaseApp } from '../../app/firebaseConfig';

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
}

interface CommentsListProps {
  comments: Comment[];
  postId: string;
  sortMethod: 'newest' | 'mostLiked';
  onSortChange: (method: 'newest' | 'mostLiked') => void;
  onShowQuickInfo: (userData: any) => void;
  highlightComment?: string;
  scrollViewRef: React.RefObject<ScrollView>;
  showFeedback: (message: string) => void;
  showEmojiPicker: boolean;
  onShowEmojiPicker: (target?: 'main' | string) => void; // UPDATED: Accept target parameter
  onEmojiSelect: (emoji: string) => void;
  onCloseEmojiPicker: () => void;
  emojiTarget?: string; // NEW: Current emoji target
  // NEW: Reply state management props
  replyStates: {[commentId: string]: string};
  onUpdateReplyText: (commentId: string, text: string) => void;
  onGetReplyText: (commentId: string) => string;
  onClearReplyText: (commentId: string) => void;
}

const db = getFirestore(firebaseApp);

const CommentsList: React.FC<CommentsListProps> = ({
  comments: initialComments,
  postId,
  sortMethod,
  onSortChange,
  onShowQuickInfo,
  highlightComment,
  scrollViewRef,
  showFeedback,
  showEmojiPicker,
  onShowEmojiPicker,
  onEmojiSelect,
  onCloseEmojiPicker,
  emojiTarget,
  // NEW PROPS
  replyStates,
  onUpdateReplyText,
  onGetReplyText,
  onClearReplyText,
}) => {
  const [comments, setComments] = useState<Comment[]>(initialComments);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const isMountedRef = useRef(true);

  // ================================================================
  // REAL-TIME COMMENTS LISTENER
  // ================================================================

  const setupCommentsListener = useCallback(() => {
    if (!postId || !isMountedRef.current) return;

    setLoading(true);
    setError(null);

    try {
const commentsRef = collection(db, 'posts', postId, 'comments');
      
      // Create query based on sort method - ONLY get top-level comments (no replies)
      let commentsQuery;
      
if (sortMethod === 'mostLiked') {
        commentsQuery = query(
          commentsRef, 
          orderBy('likes', 'desc'), 
          limit(100)
        );
      } else {
        commentsQuery = query(
          commentsRef, 
          orderBy('createdAt', 'desc'), 
          limit(100)
        );
      }

const unsubscribe = onSnapshot(
        commentsQuery,
        (snapshot) => {
          if (!isMountedRef.current) return;

          const commentsData: Comment[] = [];
          
          snapshot.forEach((doc) => {
            const data = doc.data();
            
            // Skip replies - only show top-level comments
            if (data.replyTo) {
              return;
            }
            
            // Validate comment data
            if (!data.text || !data.userId || !data.createdAt) {
              console.warn('Invalid comment data:', doc.id);
              return;
            }

            // Convert Firestore timestamp to Date
            let createdAt: Date;
            try {
              if (data.createdAt?.toDate) {
                createdAt = data.createdAt.toDate();
              } else if (data.createdAt?.seconds) {
                createdAt = new Date(data.createdAt.seconds * 1000);
              } else {
                createdAt = new Date();
              }
            } catch (error) {
              console.warn('Invalid createdAt for comment:', doc.id);
              createdAt = new Date();
            }

            commentsData.push({
              id: doc.id,
              text: data.text,
              userId: data.userId,
              username: data.username || 'Anonymous',
              userAvatar: data.userAvatar || '',
              likes: data.likes || 0,
              likedBy: data.likedBy || [],
              createdAt,
            });
          });

          // Sort comments based on method (fallback sort in case Firestore ordering fails)
          if (sortMethod === 'mostLiked') {
            commentsData.sort((a, b) => (b.likes || 0) - (a.likes || 0));
          } else {
            commentsData.sort((a, b) => 
              (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0)
            );
          }

          setComments(commentsData);
          setLoading(false);
          setError(null);
        },
        (error) => {
          console.error('Comments listener error:', error);
          if (isMountedRef.current) {
            setError('Failed to load comments');
            setLoading(false);
          }
        }
      );

      unsubscribeRef.current = unsubscribe;

    } catch (error) {
      console.error('Error setting up comments listener:', error);
      setError('Failed to load comments');
      setLoading(false);
    }
  }, [postId, sortMethod]);

  // ================================================================
  // EFFECTS
  // ================================================================

  useEffect(() => {
    isMountedRef.current = true;
    setupCommentsListener();

    return () => {
      isMountedRef.current = false;
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, [setupCommentsListener]);

  // Update when sort method changes
  useEffect(() => {
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
    }
    setupCommentsListener();
  }, [sortMethod, setupCommentsListener]);

  // ================================================================
  // HANDLERS
  // ================================================================

  const handleSortChange = useCallback((method: 'newest' | 'mostLiked') => {
    if (method !== sortMethod) {
      onSortChange(method);
    }
  }, [sortMethod, onSortChange]);

  const handleAddReply = useCallback(async (
    parentCommentId: string,
    parentReplyId: string | null,
    replyText: string
  ) => {
    // This will be implemented in the CommentItem component
    // Just pass it through for now
    try {
      showFeedback('Reply posted! 💬');
    } catch (error) {
      console.error('Error adding reply:', error);
      showFeedback('Failed to post reply');
    }
  }, [showFeedback]);

  const retryLoading = useCallback(() => {
    setError(null);
    setupCommentsListener();
  }, [setupCommentsListener]);

  // ================================================================
  // RENDER COMPONENTS
  // ================================================================

  const renderSortOptions = () => (
    <View style={styles.sortOptionsContainer}>
      <TouchableOpacity
        onPress={() => handleSortChange('newest')}
        style={[
          styles.sortButton,
          sortMethod === 'newest' && styles.activeSortButton,
        ]}
        accessibilityRole="button"
        accessibilityLabel="Sort by newest"
        accessibilityState={{ selected: sortMethod === 'newest' }}
      >
        <Text style={[
          styles.sortButtonText,
          sortMethod === 'newest' ? styles.activeSortButtonText : styles.inactiveSortButtonText,
        ]}>
          Newest
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => handleSortChange('mostLiked')}
        style={[
          styles.sortButton,
          sortMethod === 'mostLiked' && styles.activeSortButton,
        ]}
        accessibilityRole="button"
        accessibilityLabel="Sort by most liked"
        accessibilityState={{ selected: sortMethod === 'mostLiked' }}
      >
        <Text style={[
          styles.sortButtonText,
          sortMethod === 'mostLiked' ? styles.activeSortButtonText : styles.inactiveSortButtonText,
        ]}>
          Most Liked
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderCommentsHeader = () => (
    <View style={styles.commentsHeader}>
      <Text style={styles.commentsTitle}>
        Comments ({comments.length})
      </Text>
      {loading && (
        <ActivityIndicator
          size="small"
          color="#00FFFF"
          style={styles.loadingIndicator}
        />
      )}
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="chatbubble-outline" size={48} color="#666" />
      <Text style={styles.emptyStateTitle}>
        Be the first to break the silence! 🏆
      </Text>
      <Text style={styles.emptyStateSubtitle}>
        Share your thoughts about this post
      </Text>
    </View>
  );

  const renderErrorState = () => (
    <View style={styles.errorState}>
      <Ionicons name="alert-circle-outline" size={48} color="#FF6B6B" />
      <Text style={styles.errorTitle}>Failed to load comments</Text>
      <Text style={styles.errorSubtitle}>
        Check your connection and try again
      </Text>
      <TouchableOpacity
        style={styles.retryButton}
        onPress={retryLoading}
        accessibilityRole="button"
        accessibilityLabel="Retry loading comments"
      >
        <Text style={styles.retryButtonText}>Retry</Text>
      </TouchableOpacity>
    </View>
  );

  const renderCommentsList = () => (
    <View style={styles.commentsList}>
      {comments.map((comment, index) => (
        <View key={comment.id}>
          <CommentItem
            comment={comment}
            postId={postId}
            onShowQuickInfo={onShowQuickInfo}
            onAddReply={handleAddReply}
            highlightComment={highlightComment}
            scrollViewRef={scrollViewRef}
            showFeedback={showFeedback}
            showEmojiPicker={showEmojiPicker}
            onShowEmojiPicker={onShowEmojiPicker}
            onEmojiSelect={onEmojiSelect}
            onCloseEmojiPicker={onCloseEmojiPicker}
            emojiTarget={emojiTarget} // NEW: Pass emoji target
            // NEW: Reply state props
            replyText={onGetReplyText(comment.id)}
            onUpdateReplyText={(text) => onUpdateReplyText(comment.id, text)}
            onClearReplyText={() => onClearReplyText(comment.id)}
          />
          {/* Separator between comments */}
          {index < comments.length - 1 && (
            <View style={styles.commentSeparator} />
          )}
        </View>
      ))}
    </View>
  );

  // ================================================================
  // MAIN RENDER
  // ================================================================

  return (
    <View style={styles.container}>
      {renderSortOptions()}
      {renderCommentsHeader()}
      
      {error ? (
        renderErrorState()
      ) : comments.length === 0 && !loading ? (
        renderEmptyState()
      ) : (
        renderCommentsList()
      )}
    </View>
  );
};

// ================================================================
// STYLES
// ================================================================

const styles = StyleSheet.create({
  container: {
    marginTop: 24,
  },
  
  // Sort Options
  sortOptionsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 20,
    gap: 12,
  },
  sortButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 255, 0.5)',
    backgroundColor: 'rgba(0, 255, 255, 0.1)',
    minWidth: 100,
    alignItems: 'center',
  },
  activeSortButton: {
    backgroundColor: '#00FFFF',
    borderColor: '#00FFFF',
  },
  sortButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  activeSortButtonText: {
    color: '#000',
  },
  inactiveSortButtonText: {
    color: '#00FFFF',
  },

  // Comments Header
  commentsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  commentsTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  loadingIndicator: {
    marginLeft: 12,
  },

  // Comments List
  commentsList: {
    gap: 12,
  },
  commentSeparator: {
    height: 1,
    backgroundColor: 'rgba(0, 255, 255, 0.2)',
    marginVertical: 8,
    marginHorizontal: 16,
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emptyStateTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyStateSubtitle: {
    color: '#999',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },

  // Error State
  errorState: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  errorTitle: {
    color: '#FF6B6B',
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  errorSubtitle: {
    color: '#999',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: 'rgba(0, 255, 255, 0.2)',
    borderWidth: 1,
    borderColor: '#00FFFF',
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  retryButtonText: {
    color: '#00FFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default memo(CommentsList);