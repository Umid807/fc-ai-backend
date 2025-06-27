import { Platform } from 'react-native';
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  addDoc,
  onSnapshot,
  serverTimestamp,
  increment,
  arrayUnion,
  arrayRemove,
  runTransaction,
  Timestamp,
  DocumentSnapshot,
  QuerySnapshot
} from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Import your Firebase config
import { app, db } from '../app/firebaseConfig';
import auth from '../app/firebaseAuth';

// SIMPLIFIED monitoring - no more spam
const silentLog = (message: string, data?: any) => {
  if (__DEV__) {
    console.log(`🔧 API: ${message}`, data || '');
  }
};

const silentError = (message: string, error?: any) => {
  console.error(`🚨 API ERROR: ${message}`, error);
};

// ================================================================
// SIMPLIFIED TYPES - MATCHING YOUR FIREBASE STRUCTURE
// ================================================================

interface ApiClientConfig {
  enableRetry: boolean;
  maxRetries: number;
  retryDelay: number;
  enableCaching: boolean;
  cacheTimeout: number;
}

interface ApiResponse<T = any> {
  data: T;
  success: boolean;
  message?: string;
  timestamp: string;
  cached?: boolean;
}

// Post interface matching your Firebase structure exactly
interface Post {
  id: string;
  title: string;
  content?: string;
  category?: string;
  username: string;
  userId: string;
  userAvatar: string;
  likes: number;
  comments?: number;
  engagement?: number;
  images?: string[];
  gif?: string;
  vip?: boolean;
  createdAt: any; // Firestore Timestamp
  updatedAt?: any;
  tags?: string[];
  likedBy?: string[];
  visibility?: string;
  hotness?: number;
  hotnessScore?: number;
  reported?: boolean;
  type?: string;
  useful?: number;
  pollData?: any;
}

interface Comment {
  id: string;
  postId: string;
  text: string;
  username: string;
  userId: string;
  userAvatar: string;
  likes: number;
  createdAt: any;
  parentId?: string;
  replies?: Reply[];
}

interface Reply {
  id: string;
  commentId: string;
  text: string;
  username: string;
  userId: string;
  userAvatar: string;
  likes: number;
  createdAt: any;
  parentReplyId?: string;
}

interface UserProfile {
  id: string;
  username: string;
  email?: string;
  profileImage?: string;
  avatar?: string;
  reputation?: number;
  vip?: boolean;
  rank?: string;
  createdAt?: any;
  XP?: number;
  coins?: number;
  following?: string[];
  followedBy?: string[];
}

// ================================================================
// SIMPLE ERROR CLASS
// ================================================================

class ApiError extends Error {
  public code: string;
  public details?: any;
  public timestamp: string;

  constructor(message: string, code: string = 'unknown', details?: any) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.details = details;
    this.timestamp = new Date().toISOString();
  }
}

// ================================================================
// SIMPLIFIED FIREBASE API CLIENT - FOCUS ON RELIABILITY
// ================================================================

class FirebaseApiClient {
  private config: ApiClientConfig;
  private cache: Map<string, { data: any; timestamp: number; expiry: number }> = new Map();

  constructor(config: Partial<ApiClientConfig> = {}) {
    this.config = {
      enableRetry: true,
      maxRetries: 3,
      retryDelay: 1000,
      enableCaching: true,
      cacheTimeout: 300000, // 5 minutes
      ...config
    };

    silentLog('API Client initialized', { 
      platform: Platform.OS,
      cache_enabled: this.config.enableCaching 
    });
  }

  // ================================================================
  // SIMPLE CACHE MANAGEMENT
  // ================================================================

  private getCacheKey(operation: string, params: any = {}): string {
    return `${operation}_${JSON.stringify(params)}`;
  }

  private setCache(key: string, data: any, customTtl?: number): void {
    if (!this.config.enableCaching) return;

    const ttl = customTtl || this.config.cacheTimeout;
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      expiry: Date.now() + ttl
    });

    // Cleanup old cache entries
    this.cleanupExpiredCache();
  }

  private getCache(key: string): any {
    if (!this.config.enableCaching) return null;

    const cached = this.cache.get(key);
    if (!cached) return null;

    if (Date.now() > cached.expiry) {
      this.cache.delete(key);
      return null;
    }

    return cached.data;
  }

  private cleanupExpiredCache(): void {
    const now = Date.now();
    for (const [key, value] of this.cache.entries()) {
      if (now > value.expiry) {
        this.cache.delete(key);
      }
    }
  }

  // ================================================================
  // SIMPLE RETRY LOGIC
  // ================================================================

  private async executeWithRetry<T>(
    operation: () => Promise<T>,
    operationName: string
  ): Promise<T> {
    let lastError: any;

    for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
      try {
        const result = await operation();
        
        if (attempt > 0) {
          silentLog(`${operationName} succeeded after ${attempt} attempts`);
        }
        
        return result;
      } catch (error) {
        lastError = error;
        
        if (attempt < this.config.maxRetries && this.isRetryableError(error)) {
          const delay = this.config.retryDelay * Math.pow(2, attempt);
          silentLog(`${operationName} failed, retrying in ${delay}ms (attempt ${attempt + 1})`);
          await this.delay(delay);
          continue;
        }
        
        break;
      }
    }

    silentError(`${operationName} failed after all retries`, lastError);
    throw lastError;
  }

  private isRetryableError(error: any): boolean {
    if (!error) return false;
    
    // Firebase retryable error codes
    const retryableCodes = [
      'unavailable',
      'deadline-exceeded',
      'resource-exhausted',
      'internal',
      'unknown'
    ];

    return retryableCodes.includes(error?.code) || 
           error?.message?.includes('network') ||
           error?.message?.includes('timeout');
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // ================================================================
  // FIREBASE DATA CONVERSION - ROBUST PROCESSING
  // ================================================================

  private convertFirestoreTimestamp(timestamp: any): string {
    if (!timestamp) return new Date().toISOString();
    
    try {
      if (timestamp.toDate) {
        return timestamp.toDate().toISOString();
      }
      
      if (timestamp.seconds) {
        return new Date(timestamp.seconds * 1000).toISOString();
      }
      
      return new Date(timestamp).toISOString();
    } catch (error) {
      silentError('Failed to convert timestamp', { timestamp, error });
      return new Date().toISOString();
    }
  }

  private processPostData(doc: DocumentSnapshot): Post | null {
    if (!doc.exists()) {
      silentLog('Document does not exist', { id: doc.id });
      return null;
    }

    const data = doc.data();
    if (!data) {
      silentLog('Document has no data', { id: doc.id });
      return null;
    }

    try {
      // SAFE data extraction with defaults matching your Firebase structure
      const post: Post = {
        id: doc.id,
        title: this.safeString(data.title, 'Untitled'),
        content: this.safeString(data.content),
        category: this.safeString(data.category),
        username: this.safeString(data.username, 'Anonymous'),
        userId: this.safeString(data.userId, ''),
        userAvatar: this.safeString(data.userAvatar, ''),
        likes: this.safeNumber(data.likes, 0),
        comments: this.safeNumber(data.comments, 0),
        engagement: this.safeNumber(data.engagement, 0),
        images: Array.isArray(data.images) ? data.images : [],
        gif: data.gif ? String(data.gif) : undefined,
        vip: Boolean(data.vip),
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
        tags: Array.isArray(data.tags) ? data.tags : [],
        likedBy: Array.isArray(data.likedBy) ? data.likedBy : [],
        visibility: this.safeString(data.visibility, 'public'),
        hotness: this.safeNumber(data.hotness, 0),
        hotnessScore: this.safeNumber(data.hotnessScore, 0),
        reported: Boolean(data.reported),
        type: this.safeString(data.type, 'text'),
        useful: this.safeNumber(data.useful, 0),
        pollData: data.pollData
      };

      silentLog('Post processed successfully', { 
        id: post.id, 
        title: post.title?.substring(0, 30),
        hasImages: Array.isArray(post.images) && post.images.length > 0,
        imageCount: post.images?.length || 0,
        firstImage: post.images?.[0]?.substring(0, 50) + '...' || 'none'
      });

      return post;
    } catch (error) {
      silentError('Failed to process post data', { error, docId: doc.id });
      return null;
    }
  }

  private processCommentData(doc: DocumentSnapshot): Comment | null {
    if (!doc.exists()) return null;

    const data = doc.data();
    if (!data) return null;

    try {
      return {
        id: doc.id,
        postId: this.safeString(data.postId, ''),
        text: this.safeString(data.text, ''),
        username: this.safeString(data.username, 'Anonymous'),
        userId: this.safeString(data.userId, ''),
        userAvatar: this.safeString(data.userAvatar, ''),
        likes: this.safeNumber(data.likes, 0),
        createdAt: data.createdAt,
        parentId: data.parentId
      };
    } catch (error) {
      silentError('Failed to process comment data', { error, docId: doc.id });
      return null;
    }
  }

  private processUserData(doc: DocumentSnapshot): UserProfile | null {
    if (!doc.exists()) return null;

    const data = doc.data();
    if (!data) return null;

    try {
      return {
        id: doc.id,
        username: this.safeString(data.username, 'Anonymous'),
        email: this.safeString(data.email),
        profileImage: this.safeString(data.profileImage || data.avatar),
        avatar: this.safeString(data.avatar || data.profileImage),
        reputation: this.safeNumber(data.reputation, 0),
        vip: Boolean(data.vip || data.vipStatus),
        rank: this.safeString(data.rank, 'Unranked'),
        createdAt: data.createdAt,
        XP: this.safeNumber(data.XP || data.xpLevel, 0),
        coins: this.safeNumber(data.coins, 0),
        following: Array.isArray(data.following) ? data.following : [],
        followedBy: Array.isArray(data.followedBy) ? data.followedBy : []
      };
    } catch (error) {
      silentError('Failed to process user data', { error, docId: doc.id });
      return null;
    }
  }

  // ================================================================
  // UTILITY FUNCTIONS FOR SAFE DATA EXTRACTION
  // ================================================================

  private safeString(value: any, defaultValue: string = ''): string {
    if (value === null || value === undefined) return defaultValue;
    return String(value);
  }

  private safeNumber(value: any, defaultValue: number = 0): number {
    if (value === null || value === undefined) return defaultValue;
    const num = Number(value);
    return isNaN(num) ? defaultValue : num;
  }

  // ================================================================
  // MAIN API METHODS - SIMPLIFIED AND ROBUST
  // ================================================================

  async getPost(postId: string): Promise<ApiResponse<Post>> {
    const startTime = Date.now();
    const cacheKey = this.getCacheKey('getPost', { postId });

    silentLog('Getting post', { postId });

    // Validate input
    if (!postId || typeof postId !== 'string' || postId.trim() === '') {
      throw new ApiError('Invalid post ID provided', 'invalid-input');
    }

    // Check cache first
    const cached = this.getCache(cacheKey);
    if (cached) {
      silentLog('Post found in cache', { postId });
      return {
        data: cached,
        success: true,
        timestamp: new Date().toISOString(),
        cached: true
      };
    }

    return this.executeWithRetry(async () => {
      try {
        // Get post document
        const postRef = doc(db, 'posts', postId);
        const postSnap = await getDoc(postRef);
        
        if (!postSnap.exists()) {
          throw new ApiError(`Post not found: ${postId}`, 'not-found');
        }

        const post = this.processPostData(postSnap);
        if (!post) {
          throw new ApiError('Invalid post data structure', 'invalid-data');
        }

        // Enhance with user data if available (optional - don't fail if user missing)
        if (post.userId) {
          try {
            const userSnap = await getDoc(doc(db, 'users', post.userId));
            if (userSnap.exists()) {
              const userData = userSnap.data();
              if (userData) {
                post.userAvatar = userData.profileImage || userData.avatar || post.userAvatar;
                post.username = userData.username || post.username;
                post.vip = userData.vip || userData.vipStatus || post.vip;
                silentLog('User data enhanced successfully', { 
                  userId: post.userId, 
                  username: post.username 
                });
              }
            } else {
              silentLog('User document not found - using post data', { 
                userId: post.userId,
                fallbackUsername: post.username 
              });
            }
          } catch (userError) {
            silentLog('Failed to enhance post with user data - using fallback', { 
              error: userError, 
              userId: post.userId 
            });
            // Continue without user enhancement - this is not critical
          }
        }

        // Cache the result
        this.setCache(cacheKey, post);

        const duration = Date.now() - startTime;
        silentLog('Post loaded successfully', { 
          postId, 
          duration: `${duration}ms`,
          title: post.title?.substring(0, 30)
        });

        return {
          data: post,
          success: true,
          timestamp: new Date().toISOString()
        };

      } catch (error) {
        const duration = Date.now() - startTime;
        silentError('Failed to get post', { 
          postId, 
          duration: `${duration}ms`,
          error: error instanceof Error ? error.message : String(error)
        });
        throw error;
      }
    }, 'getPost');
  }

  async getComments(postId: string, options: { sort?: string; limit?: number } = {}): Promise<ApiResponse<Comment[]>> {
    const cacheKey = this.getCacheKey('getComments', { postId, ...options });

    silentLog('Getting comments', { postId, options });

    // Check cache first
    const cached = this.getCache(cacheKey);
    if (cached) {
      return {
        data: cached,
        success: true,
        timestamp: new Date().toISOString(),
        cached: true
      };
    }

    return this.executeWithRetry(async () => {
      try {
        const commentsRef = collection(db, 'posts', postId, 'comments');
        let commentsQuery = query(commentsRef);

        // Apply sorting
        if (options.sort === 'mostLiked') {
          commentsQuery = query(commentsQuery, orderBy('likes', 'desc'));
        } else {
          commentsQuery = query(commentsQuery, orderBy('createdAt', 'desc'));
        }

        // Apply limit
        if (options.limit) {
          commentsQuery = query(commentsQuery, limit(options.limit));
        }

        const querySnapshot = await getDocs(commentsQuery);
        const comments: Comment[] = [];

        querySnapshot.forEach((doc) => {
          const comment = this.processCommentData(doc);
          if (comment) {
            comments.push(comment);
          }
        });

        // Cache with shorter TTL for comments
        this.setCache(cacheKey, comments, 60000); // 1 minute

        silentLog('Comments loaded successfully', { 
          postId, 
          count: comments.length 
        });

        return {
          data: comments,
          success: true,
          timestamp: new Date().toISOString()
        };

      } catch (error) {
        silentError('Failed to get comments', { postId, error });
        throw error;
      }
    }, 'getComments');
  }

  async getUserProfile(userId: string): Promise<ApiResponse<UserProfile>> {
    const cacheKey = this.getCacheKey('getUserProfile', { userId });

    // Check cache first
    const cached = this.getCache(cacheKey);
    if (cached) {
      return {
        data: cached,
        success: true,
        timestamp: new Date().toISOString(),
        cached: true
      };
    }

    return this.executeWithRetry(async () => {
      try {
        const userRef = doc(db, 'users', userId);
        const userSnap = await getDoc(userRef);
        
        if (!userSnap.exists()) {
          // Return a fallback user profile instead of throwing error
          const fallbackUser: UserProfile = {
            id: userId,
            username: 'User',
            email: '',
            profileImage: '',
            avatar: '',
            reputation: 0,
            vip: false,
            rank: 'Unranked',
            createdAt: null,
            XP: 0,
            coins: 0,
            following: [],
            followedBy: []
          };

          silentLog('User not found - returning fallback profile', { userId });

          return {
            data: fallbackUser,
            success: true,
            message: 'User profile not found - using fallback',
            timestamp: new Date().toISOString()
          };
        }

        const user = this.processUserData(userSnap);
        if (!user) {
          throw new ApiError('Invalid user data structure', 'invalid-data');
        }

        // Cache user data
        this.setCache(cacheKey, user);

        silentLog('User profile loaded successfully', { 
          userId, 
          username: user.username 
        });

        return {
          data: user,
          success: true,
          timestamp: new Date().toISOString()
        };

      } catch (error) {
        silentError('Failed to get user profile', { userId, error });
        throw error;
      }
    }, 'getUserProfile');
  }

  // ================================================================
  // INTERACTION METHODS
  // ================================================================

  async likePost(postId: string): Promise<ApiResponse<{ success: boolean }>> {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      throw new ApiError('User must be authenticated to like posts', 'unauthenticated');
    }

    return this.executeWithRetry(async () => {
      try {
        const postRef = doc(db, 'posts', postId);
        
        await runTransaction(db, async (transaction) => {
          const postDoc = await transaction.get(postRef);
          
          if (!postDoc.exists()) {
            throw new ApiError('Post not found', 'not-found');
          }

          const postData = postDoc.data();
          const likedBy = postData.likedBy || [];

          if (likedBy.includes(currentUser.uid)) {
            throw new ApiError('Post already liked by user', 'already-liked');
          }

          transaction.update(postRef, {
            likes: increment(1),
            likedBy: arrayUnion(currentUser.uid)
          });
        });

        // Clear relevant caches
        this.cache.delete(this.getCacheKey('getPost', { postId }));

        silentLog('Post liked successfully', { postId, userId: currentUser.uid });

        return {
          data: { success: true },
          success: true,
          timestamp: new Date().toISOString()
        };

      } catch (error) {
        silentError('Failed to like post', { postId, error });
        throw error;
      }
    }, 'likePost');
  }

  async savePost(postId: string): Promise<ApiResponse<{ success: boolean }>> {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      throw new ApiError('User must be authenticated to save posts', 'unauthenticated');
    }

    return this.executeWithRetry(async () => {
      try {
        const post = await this.getPost(postId);
        if (!post.success) {
          throw new ApiError('Post not found', 'not-found');
        }

        const saveRef = doc(db, 'users', currentUser.uid, 'savedPosts', postId);
        await setDoc(saveRef, {
          postId: postId,
          title: post.data.title,
          snippet: post.data.content?.substring(0, 100) || '',
          category: post.data.category || '',
          savedAt: serverTimestamp()
        });

        silentLog('Post saved successfully', { postId, userId: currentUser.uid });

        return {
          data: { success: true },
          success: true,
          timestamp: new Date().toISOString()
        };

      } catch (error) {
        silentError('Failed to save post', { postId, error });
        throw error;
      }
    }, 'savePost');
  }

  async deletePost(postId: string): Promise<ApiResponse<{ success: boolean }>> {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      throw new ApiError('User must be authenticated to delete posts', 'unauthenticated');
    }

    return this.executeWithRetry(async () => {
      try {
        // Verify ownership
        const post = await this.getPost(postId);
        if (!post.success) {
          throw new ApiError('Post not found', 'not-found');
        }

        if (post.data.userId !== currentUser.uid) {
          throw new ApiError('User can only delete their own posts', 'unauthorized');
        }

        const postRef = doc(db, 'posts', postId);
        await deleteDoc(postRef);

        // Clear caches
        this.cache.delete(this.getCacheKey('getPost', { postId }));

        silentLog('Post deleted successfully', { postId, userId: currentUser.uid });

        return {
          data: { success: true },
          success: true,
          timestamp: new Date().toISOString()
        };

      } catch (error) {
        silentError('Failed to delete post', { postId, error });
        throw error;
      }
    }, 'deletePost');
  }

  // ================================================================
  // COMMENT OPERATIONS
  // ================================================================

  async addComment(commentData: {
    postId: string;
    content: string;
    userId: string;
    username: string;
    userAvatar: string;
  }): Promise<ApiResponse<Comment>> {
    return this.executeWithRetry(async () => {
      try {
        const commentsRef = collection(db, 'posts', commentData.postId, 'comments');
        const newCommentRef = doc(commentsRef);

        const comment = {
          text: commentData.content,
          likes: 0,
          createdAt: serverTimestamp(),
          userId: commentData.userId,
          userAvatar: commentData.userAvatar,
          username: commentData.username,
          postId: commentData.postId
        };

        await setDoc(newCommentRef, comment);

        // Update post comment count
        const postRef = doc(db, 'posts', commentData.postId);
        await updateDoc(postRef, {
          comments: increment(1)
        });

        // Clear comment cache
        this.cache.delete(this.getCacheKey('getComments', { postId: commentData.postId }));

        const result: Comment = {
          id: newCommentRef.id,
          postId: commentData.postId,
          text: commentData.content,
          username: commentData.username,
          userId: commentData.userId,
          userAvatar: commentData.userAvatar,
          likes: 0,
          createdAt: serverTimestamp()
        };

        silentLog('Comment added successfully', { 
          postId: commentData.postId, 
          commentId: newCommentRef.id 
        });

        return {
          data: result,
          success: true,
          timestamp: new Date().toISOString()
        };

      } catch (error) {
        silentError('Failed to add comment', { postId: commentData.postId, error });
        throw error;
      }
    }, 'addComment');
  }

  // ================================================================
  // STATUS CHECKS
  // ================================================================

  async checkLikeStatus(postId: string, userId: string): Promise<ApiResponse<{ hasLiked: boolean }>> {
    return this.executeWithRetry(async () => {
      try {
        const post = await this.getPost(postId);
        if (!post.success) {
          throw new ApiError('Post not found', 'not-found');
        }

        const hasLiked = post.data.likedBy?.includes(userId) || false;

        return {
          data: { hasLiked },
          success: true,
          timestamp: new Date().toISOString()
        };

      } catch (error) {
        silentError('Failed to check like status', { postId, userId, error });
        throw error;
      }
    }, 'checkLikeStatus');
  }

  async checkSaveStatus(postId: string, userId: string): Promise<ApiResponse<{ isSaved: boolean }>> {
    return this.executeWithRetry(async () => {
      try {
        const saveRef = doc(db, 'users', userId, 'savedPosts', postId);
        const saveSnap = await getDoc(saveRef);

        return {
          data: { isSaved: saveSnap.exists() },
          success: true,
          timestamp: new Date().toISOString()
        };

      } catch (error) {
        silentError('Failed to check save status', { postId, userId, error });
        throw error;
      }
    }, 'checkSaveStatus');
  }

  async getRelatedPosts(postId: string, options: { limit?: number; tags?: string[] } = {}): Promise<ApiResponse<Post[]>> {
    const cacheKey = this.getCacheKey('getRelatedPosts', { postId, ...options });

    silentLog('Getting related posts', { postId, options });

    // Check cache first
    const cached = this.getCache(cacheKey);
    if (cached) {
      return {
        data: cached,
        success: true,
        timestamp: new Date().toISOString(),
        cached: true
      };
    }

    return this.executeWithRetry(async () => {
      try {
        // Get the original post to find related posts
        const originalPost = await this.getPost(postId);
        if (!originalPost.success) {
          throw new ApiError('Original post not found', 'not-found');
        }

        const postsRef = collection(db, 'posts');
        let relatedQuery = query(
          postsRef,
          where('visibility', '==', 'public'),
          orderBy('likes', 'desc'),
          limit(options.limit || 5)
        );

        // If original post has a category, try to find posts in same category
        if (originalPost.data.category) {
          try {
            relatedQuery = query(
              postsRef,
              where('category', '==', originalPost.data.category),
              where('visibility', '==', 'public'),
              orderBy('likes', 'desc'),
              limit(options.limit || 5)
            );
          } catch (error) {
            // If category query fails, fall back to general query
            silentError('Category-based query failed, using fallback', error);
            relatedQuery = query(
              postsRef,
              where('visibility', '==', 'public'),
              orderBy('createdAt', 'desc'),
              limit(options.limit || 5)
            );
          }
        }

        const querySnapshot = await getDocs(relatedQuery);
        const relatedPosts: Post[] = [];

        querySnapshot.forEach((doc) => {
          // Exclude the original post
          if (doc.id !== postId) {
            const post = this.processPostData(doc);
            if (post) {
              relatedPosts.push(post);
            }
          }
        });

        // If we don't have enough posts and we used category filter, try a broader search
        if (relatedPosts.length < 3 && originalPost.data.category) {
          try {
            const broadQuery = query(
              postsRef,
              where('visibility', '==', 'public'),
              orderBy('createdAt', 'desc'),
              limit(options.limit || 5)
            );

            const broadSnapshot = await getDocs(broadQuery);
            const additionalPosts: Post[] = [];

            broadSnapshot.forEach((doc) => {
              if (doc.id !== postId && !relatedPosts.find(p => p.id === doc.id)) {
                const post = this.processPostData(doc);
                if (post && additionalPosts.length < (options.limit || 5) - relatedPosts.length) {
                  additionalPosts.push(post);
                }
              }
            });

            relatedPosts.push(...additionalPosts);
          } catch (error) {
            silentError('Broad search failed', error);
          }
        }

        // Cache related posts with shorter TTL
        this.setCache(cacheKey, relatedPosts, 600000); // 10 minutes

        silentLog('Related posts loaded successfully', { 
          postId, 
          count: relatedPosts.length,
          originalCategory: originalPost.data.category 
        });

        return {
          data: relatedPosts,
          success: true,
          timestamp: new Date().toISOString()
        };

      } catch (error) {
        silentError('Failed to get related posts', { postId, error });
        
        // Return empty array instead of throwing error for related posts
        // This is non-critical functionality
        return {
          data: [],
          success: true,
          message: 'Related posts unavailable',
          timestamp: new Date().toISOString()
        };
      }
    }, 'getRelatedPosts');
  }

  async addReply(replyData: {
    commentId: string;
    postId: string;
    content: string;
    userId: string;
    username: string;
    userAvatar: string;
  }): Promise<ApiResponse<Reply>> {
    return this.executeWithRetry(async () => {
      try {
        // For simplicity, we'll store replies as a subcollection of comments
        const repliesRef = collection(db, 'posts', replyData.postId, 'comments', replyData.commentId, 'replies');
        const newReplyRef = doc(repliesRef);

        const reply = {
          text: replyData.content,
          likes: 0,
          createdAt: serverTimestamp(),
          userId: replyData.userId,
          userAvatar: replyData.userAvatar,
          username: replyData.username,
          commentId: replyData.commentId
        };

        await setDoc(newReplyRef, reply);

        // Clear comment cache to force refresh
        this.cache.delete(this.getCacheKey('getComments', { postId: replyData.postId }));

        const result: Reply = {
          id: newReplyRef.id,
          commentId: replyData.commentId,
          text: replyData.content,
          username: replyData.username,
          userId: replyData.userId,
          userAvatar: replyData.userAvatar,
          likes: 0,
          createdAt: serverTimestamp()
        };

        silentLog('Reply added successfully', { 
          postId: replyData.postId, 
          commentId: replyData.commentId,
          replyId: newReplyRef.id 
        });

        return {
          data: result,
          success: true,
          timestamp: new Date().toISOString()
        };

      } catch (error) {
        silentError('Failed to add reply', { 
          postId: replyData.postId, 
          commentId: replyData.commentId, 
          error 
        });
        throw error;
      }
    }, 'addReply');
  }

  // ================================================================
  // UTILITY METHODS
  // ================================================================

  isAuthenticated(): boolean {
    return !!auth.currentUser;
  }

  getCurrentUser() {
    return auth.currentUser;
  }

  clearCache(): void {
    this.cache.clear();
    silentLog('Cache cleared');
  }

  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }
}

// ================================================================
// SINGLETON INSTANCE - SIMPLIFIED CONFIGURATION
// ================================================================

export const apiClient = new FirebaseApiClient({
  enableRetry: true,
  maxRetries: 2, // Reduced for faster failures
  retryDelay: 1000,
  enableCaching: true,
  cacheTimeout: 300000 // 5 minutes
});

// ================================================================
// EXPORTS
// ================================================================

export { FirebaseApiClient, ApiError };
export type { 
  ApiClientConfig, 
  ApiResponse, 
  Post, 
  Comment, 
  Reply, 
  UserProfile 
};