// utils/helpers.ts - Production Ready Utility Functions

import {
  getFirestore,
  collection,
  addDoc,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  increment,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { Platform } from 'react-native';
import { firebaseApp } from '../app/firebaseConfig';

const db = getFirestore(firebaseApp);

// ================================================================
// INPUT VALIDATION & SANITIZATION
// ================================================================

/**
 * Sanitize user input to prevent XSS and other attacks
 */
export const sanitizeInput = (input: string): string => {
  if (!input || typeof input !== 'string') return '';
  
  return input
    .trim()
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
    .replace(/javascript:/gi, '') // Remove javascript: protocols
    .replace(/on\w+\s*=/gi, '') // Remove event handlers
    .replace(/[<>]/g, '') // Remove angle brackets
    .substring(0, 1000); // Limit length
};

/**
 * Validate post ID format
 */
export const validatePostId = (id: string): boolean => {
  if (!id || typeof id !== 'string') return false;
  // Firestore document IDs are alphanumeric and can contain underscores and hyphens
  return /^[a-zA-Z0-9_-]+$/.test(id) && id.length >= 1 && id.length <= 100;
};

/**
 * Validate email format
 */
export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validate username format
 */
export const validateUsername = (username: string): boolean => {
  if (!username || typeof username !== 'string') return false;
  // Username: 3-20 characters, alphanumeric and underscores only
  return /^[a-zA-Z0-9_]{3,20}$/.test(username);
};

// ================================================================
// DEBOUNCING & THROTTLING FOR PERFORMANCE
// ================================================================

/**
 * Debounce function calls to prevent spam
 */
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  delay: number
): ((...args: Parameters<T>) => void) => {
  let timeoutId: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
};

/**
 * Throttle function calls for performance
 */
export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  delay: number
): ((...args: Parameters<T>) => void) => {
  let lastCall = 0;
  
  return (...args: Parameters<T>) => {
    const now = Date.now();
    if (now - lastCall >= delay) {
      lastCall = now;
      func(...args);
    }
  };
};

// ================================================================
// NETWORK ERROR HANDLING
// ================================================================

/**
 * Handle network errors with user-friendly messages
 */
export const handleNetworkError = (error: any): string => {
  if (!error) return 'An unknown error occurred';
  
  const errorMessage = error.message || error.toString();
  
  // Firebase specific errors
  if (errorMessage.includes('permission-denied')) {
    return 'Access denied. Please check your permissions.';
  }
  if (errorMessage.includes('not-found')) {
    return 'Content not found.';
  }
  if (errorMessage.includes('unavailable')) {
    return 'Service temporarily unavailable. Please try again.';
  }
  if (errorMessage.includes('deadline-exceeded') || errorMessage.includes('timeout')) {
    return 'Request timed out. Please check your connection.';
  }
  if (errorMessage.includes('network')) {
    return 'Network error. Please check your internet connection.';
  }
  if (errorMessage.includes('quota-exceeded')) {
    return 'Service limit reached. Please try again later.';
  }
  
  // Generic network errors
  if (errorMessage.includes('fetch') || errorMessage.includes('NetworkError')) {
    return 'Connection failed. Please check your internet.';
  }
  
  return 'Something went wrong. Please try again.';
};

// ================================================================
// TIME FORMATTING
// ================================================================

/**
 * Format timestamp to relative time (e.g., "2 hours ago")
 */
export const formatTimeAgo = (timestamp: any): string => {
  if (!timestamp) return 'Just now';
  
  let date: Date;
  
  try {
    if (timestamp.toDate) {
      date = timestamp.toDate();
    } else if (timestamp.seconds) {
      date = new Date(timestamp.seconds * 1000);
    } else if (timestamp instanceof Date) {
      date = timestamp;
    } else {
      date = new Date(timestamp);
    }
  } catch (error) {
    return 'Just now';
  }
  
  const now = new Date();
  const secondsAgo = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (secondsAgo < 60) {
    return secondsAgo <= 5 ? 'Just now' : `${secondsAgo} seconds ago`;
  }
  
  const minutesAgo = Math.floor(secondsAgo / 60);
  if (minutesAgo < 60) {
    return `${minutesAgo} minute${minutesAgo !== 1 ? 's' : ''} ago`;
  }
  
  const hoursAgo = Math.floor(minutesAgo / 60);
  if (hoursAgo < 24) {
    return `${hoursAgo} hour${hoursAgo !== 1 ? 's' : ''} ago`;
  }
  
  const daysAgo = Math.floor(hoursAgo / 24);
  if (daysAgo < 30) {
    return `${daysAgo} day${daysAgo !== 1 ? 's' : ''} ago`;
  }
  
  const monthsAgo = Math.floor(daysAgo / 30);
  if (monthsAgo < 12) {
    return `${monthsAgo} month${monthsAgo !== 1 ? 's' : ''} ago`;
  }
  
  const yearsAgo = Math.floor(monthsAgo / 12);
  return `${yearsAgo} year${yearsAgo !== 1 ? 's' : ''} ago`;
};

// ================================================================
// NOTIFICATION SYSTEM
// ================================================================

/**
 * Create notification for user
 */
export const createNotification = async (
  targetUserId: string,
  data: {
    type: string;
    message: string;
    postId?: string;
    commentId?: string;
    replyId?: string;
    fromUserId?: string;
  }
): Promise<void> => {
  try {
    if (!targetUserId || !data.type || !data.message) {
      throw new Error('Missing required notification data');
    }

    const notificationsRef = collection(db, 'users', targetUserId, 'notifications');
    
    await addDoc(notificationsRef, {
      ...data,
      timestamp: serverTimestamp(),
      read: false,
      platform: Platform.OS,
    });
    
    console.log('✅ Notification created for user:', targetUserId);
    
  } catch (error) {
    console.error('❌ Error creating notification:', error);
    // Don't throw error - notifications are not critical
  }
};

// ================================================================
// REWARD SYSTEM
// ================================================================

/**
 * Check and grant daily reward to user
 */
export const checkAndGrantDailyReward = async (
  userId: string,
  rewardKey: string,
  xp: number,
  coins: number
): Promise<boolean> => {
  try {
    if (!userId || !rewardKey || xp < 0 || coins < 0) {
      throw new Error('Invalid reward parameters');
    }

    const userRef = doc(db, 'users', userId);
    const rewardTrackerRef = doc(db, 'users', userId, 'rewardTracking', rewardKey);
    
    // Check if reward already claimed today
    const rewardSnap = await getDoc(rewardTrackerRef);
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayTimestamp = today.getTime();

    let alreadyClaimedToday = false;

    if (rewardSnap.exists()) {
      const lastClaimed = rewardSnap.data()?.lastClaimed?.toDate?.();
      if (lastClaimed && lastClaimed.getTime() >= todayTimestamp) {
        alreadyClaimedToday = true;
      }
    }

    if (!alreadyClaimedToday) {
      // Grant reward
      await updateDoc(userRef, {
        XP: increment(xp),
        DailyXP: increment(xp),
        coins: increment(coins),
        dailyCoins: increment(coins),
      });

      // Update reward tracker
      await setDoc(rewardTrackerRef, {
        lastClaimed: serverTimestamp(),
        rewardKey,
        xpGranted: xp,
        coinsGranted: coins,
      });

      console.log(`🎉 Reward granted: ${rewardKey} (+${xp} XP / +${coins} Coins)`);
      return true;
    } else {
      console.log(`⏳ Reward already claimed today for: ${rewardKey}`);
      return false;
    }
    
  } catch (error) {
    console.error(`❌ Error in reward ${rewardKey}:`, error);
    return false;
  }
};

// ================================================================
// DATA FORMATTING & VALIDATION
// ================================================================

/**
 * Format large numbers (e.g., 1000 -> 1K)
 */
export const formatNumber = (num: number): string => {
  if (!num || typeof num !== 'number') return '0';
  
  if (num < 1000) return num.toString();
  if (num < 1000000) return `${(num / 1000).toFixed(1)}K`;
  if (num < 1000000000) return `${(num / 1000000).toFixed(1)}M`;
  return `${(num / 1000000000).toFixed(1)}B`;
};

/**
 * Validate and format image URL
 */
export const validateImageUrl = (url: string): boolean => {
  if (!url || typeof url !== 'string') return false;
  
  try {
    const urlObj = new URL(url);
    
    // Only allow HTTPS
    if (urlObj.protocol !== 'https:') return false;
    
    // Check for image extensions
    const validExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
    const hasValidExtension = validExtensions.some(ext => 
      urlObj.pathname.toLowerCase().includes(ext)
    );
    
    // Allow common image hosting domains
    const trustedDomains = [
      'firebasestorage.googleapis.com',
      'imgur.com',
      'i.imgur.com',
      'via.placeholder.com',
      'picsum.photos',
      'images.unsplash.com',
    ];
    
    const isTrustedDomain = trustedDomains.some(domain => 
      urlObj.hostname.includes(domain)
    );
    
    return hasValidExtension || isTrustedDomain;
    
  } catch (error) {
    return false;
  }
};

/**
 * Generate secure share URL
 */
export const generateShareUrl = (postId: string): string => {
  if (!validatePostId(postId)) return '';
  return `https://fc25locker.com/post/${postId}`;
};

// ================================================================
// DEVICE & PERFORMANCE HELPERS
// ================================================================

/**
 * Check if device is low-end for performance optimization
 */
export const isLowEndDevice = (): boolean => {
  if (Platform.OS === 'web') {
    // Check for low-end web devices
    const memory = (navigator as any).deviceMemory;
    const connection = (navigator as any).connection;
    
    if (memory && memory < 4) return true;
    if (connection && connection.effectiveType && 
        ['slow-2g', '2g'].includes(connection.effectiveType)) return true;
    
    return false;
  }
  
  // For React Native, you might use react-native-device-info
  // For now, return false as default
  return false;
};

/**
 * Get optimal image quality based on device capabilities
 */
export const getOptimalImageQuality = (): 'low' | 'medium' | 'high' => {
  if (isLowEndDevice()) return 'low';
  
  // Check connection speed
  if (Platform.OS === 'web') {
    const connection = (navigator as any).connection;
    if (connection && connection.effectiveType) {
      if (['slow-2g', '2g'].includes(connection.effectiveType)) return 'low';
      if (connection.effectiveType === '3g') return 'medium';
    }
  }
  
  return 'high';
};

// ================================================================
// RETRY MECHANISMS FOR GLOBAL RELIABILITY
// ================================================================

/**
 * Retry async operation with exponential backoff
 */
export const retryWithBackoff = async <T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> => {
  let lastError: Error;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      
      if (attempt === maxRetries) {
        throw lastError;
      }
      
      // Check if error is retryable
      const isRetryable = isRetryableError(error);
      if (!isRetryable) {
        throw lastError;
      }
      
      // Exponential backoff with jitter
      const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 1000;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError!;
};

/**
 * Check if error is retryable
 */
export const isRetryableError = (error: any): boolean => {
  if (!error) return false;
  
  const errorMessage = error.message || error.toString();
  
  // Network errors that can be retried
  const retryableErrors = [
    'network',
    'timeout',
    'deadline-exceeded',
    'unavailable',
    'internal',
    'unknown',
    'fetch',
    'NetworkError',
  ];
  
  return retryableErrors.some(retryableError => 
    errorMessage.toLowerCase().includes(retryableError.toLowerCase())
  );
};

// ================================================================
// CONTENT MODERATION HELPERS
// ================================================================

/**
 * Basic content filtering for inappropriate content
 */
export const moderateContent = (content: string): {
  isAppropriate: boolean;
  filteredContent: string;
  flags: string[];
} => {
  if (!content || typeof content !== 'string') {
    return { isAppropriate: true, filteredContent: '', flags: [] };
  }
  
  const flags: string[] = [];
  let filteredContent = content;
  
  // Basic profanity filter (expand as needed)
  const inappropriateWords = [
    // Add inappropriate words here
    'spam', 'scam', 'hack', 'cheat',
  ];
  
  inappropriateWords.forEach(word => {
    const regex = new RegExp(word, 'gi');
    if (regex.test(filteredContent)) {
      flags.push(`Contains inappropriate word: ${word}`);
      filteredContent = filteredContent.replace(regex, '***');
    }
  });
  
  // Check for excessive caps (might indicate shouting/spam)
  const capsRatio = (content.match(/[A-Z]/g) || []).length / content.length;
  if (capsRatio > 0.7 && content.length > 10) {
    flags.push('Excessive capitalization');
  }
  
  // Check for repeated characters (spam indicator)
  if (/(.)\1{4,}/.test(content)) {
    flags.push('Repeated characters detected');
  }
  
  // Check for suspicious links
  if (/https?:\/\/(?!fc25locker\.com)/i.test(content)) {
    flags.push('External links detected');
  }
  
  return {
    isAppropriate: flags.length === 0,
    filteredContent,
    flags
  };
};

// ================================================================
// EXPORTS
// ================================================================

export default {
  sanitizeInput,
  validatePostId,
  validateEmail,
  validateUsername,
  debounce,
  throttle,
  handleNetworkError,
  formatTimeAgo,
  createNotification,
  checkAndGrantDailyReward,
  formatNumber,
  validateImageUrl,
  generateShareUrl,
  isLowEndDevice,
  getOptimalImageQuality,
  retryWithBackoff,
  isRetryableError,
  moderateContent,
};