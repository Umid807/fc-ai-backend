// hooks/usePostCreation.ts - Post Creation Hook for FC25 Locker

import React, { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import { Alert } from 'react-native';

// Firebase imports
import { 
  getFirestore, 
  collection, 
  addDoc, 
  serverTimestamp,
  doc,
  getDoc,
  updateDoc,
  increment,
  runTransaction
} from 'firebase/firestore';
import { firebaseApp } from '../app/firebaseConfig';

// Security utilities
import { 
  validateCommentContent, 
  sanitizeUserData, 
  secureLog,
  hasSpamPatterns,
  checkRateLimit 
} from '../utils/security';

// Types
interface PostData {
  title: string;
  content: string;
  category: string;
  images?: string[];
  gif?: string | null;
  pollData?: PollData | null;
  userId: string;
  username: string;
  userAvatar?: string | null;
}

interface PollData {
  question: string;
  options: string[];
  isBoost: boolean;
  isAnonymous: boolean;
  allowMultipleVotes?: boolean;
  hasTimeLimit?: boolean;
  timeLimitHours?: number;
  requireComment?: boolean;
}

interface HotnessCalculationData {
  content: string;
  images: string[];
  gif: string | null;
  pollData?: PollData | null;
  category?: string;
}

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  score: number;
}

interface PostCreationState {
  isSubmitting: boolean;
  isValidating: boolean;
  validationErrors: string[];
  lastValidation: ValidationResult | null;
  submissionAttempts: number;
  lastSubmissionTime: number | null;
}

interface UsePostCreationReturn {
  // State
  state: PostCreationState;
  
  // Core functions
  calculateHotnessScore: (data: HotnessCalculationData) => number;
  validatePostData: (data: PostData) => Promise<ValidationResult>;
  submitPost: (data: PostData) => Promise<{ success: boolean; postId?: string; error?: string }>;
  
  // Utility functions
  estimateReadingTime: (content: string) => number;
  calculateEngagementPotential: (data: PostData) => number;
  getContentStatistics: (content: string) => ContentStats;
  
  // Rate limiting
  canSubmitPost: () => boolean;
  getTimeUntilNextSubmission: () => number;
  
  // Reset functions
  resetState: () => void;
  clearValidationErrors: () => void;
}

interface ContentStats {
  wordCount: number;
  characterCount: number;
  paragraphCount: number;
  hasEmojis: boolean;
  hasHashtags: boolean;
  hasMentions: boolean;
  readingTime: number;
  complexity: 'low' | 'medium' | 'high';
}

// Constants
const HOTNESS_WEIGHTS = {
  CONTENT_LENGTH: 0.15,
  CONTENT_QUALITY: 0.25,
  MEDIA_RICHNESS: 0.20,
  POLL_ENGAGEMENT: 0.15,
  CATEGORY_POPULARITY: 0.10,
  USER_ENGAGEMENT: 0.10,
  RECENCY_BOOST: 0.05,
} as const;

const CATEGORY_POPULARITY_SCORES = {
  ultimate_team: 0.95,
  career_mode: 0.88,
  rush: 0.82,
  fc_mobile: 0.85,
  general_discussion: 0.90,
} as const;

const RATE_LIMIT_CONFIG = {
  MAX_POSTS_PER_HOUR: 5,
  MAX_POSTS_PER_DAY: 20,
  COOLDOWN_MINUTES: 2,
} as const;

const db = getFirestore(firebaseApp);

export const usePostCreation = (): UsePostCreationReturn => {
  // State management
  const [state, setState] = useState<PostCreationState>({
    isSubmitting: false,
    isValidating: false,
    validationErrors: [],
    lastValidation: null,
    submissionAttempts: 0,
    lastSubmissionTime: null,
  });
  
  // Refs for cleanup and rate limiting
  const isMountedRef = useRef(true);
  const submissionHistoryRef = useRef<number[]>([]);
  
  // State update helper
  const updateState = useCallback((updates: Partial<PostCreationState>) => {
    if (!isMountedRef.current) return;
    setState(prev => ({ ...prev, ...updates }));
  }, []);
  
  // Content analysis functions
  const getContentStatistics = useCallback((content: string): ContentStats => {
    if (!content || typeof content !== 'string') {
      return {
        wordCount: 0,
        characterCount: 0,
        paragraphCount: 0,
        hasEmojis: false,
        hasHashtags: false,
        hasMentions: false,
        readingTime: 0,
        complexity: 'low',
      };
    }
    
    const wordCount = content.trim().split(/\s+/).filter(Boolean).length;
    const characterCount = content.length;
    const paragraphCount = content.split(/\n\s*\n/).filter(Boolean).length;
    
    // Pattern detection
    const hasEmojis = /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]/u.test(content);
    const hasHashtags = /#\w+/.test(content);
    const hasMentions = /@\w+/.test(content);
    
    // Reading time (average 200 words per minute)
    const readingTime = Math.max(1, Math.ceil(wordCount / 200));
    
    // Complexity assessment
    let complexity: ContentStats['complexity'] = 'low';
    if (wordCount > 100 && paragraphCount > 2) complexity = 'medium';
    if (wordCount > 300 && paragraphCount > 4) complexity = 'high';
    
    return {
      wordCount,
      characterCount,
      paragraphCount,
      hasEmojis,
      hasHashtags,
      hasMentions,
      readingTime,
      complexity,
    };
  }, []);
  
  // Hotness score calculation
  const calculateHotnessScore = useCallback((data: HotnessCalculationData): number => {
    try {
      let score = 0;
      const contentStats = getContentStatistics(data.content);
      
      // 1. Content Length Score (0-100)
      const lengthScore = Math.min(100, (contentStats.wordCount / 200) * 100);
      score += lengthScore * HOTNESS_WEIGHTS.CONTENT_LENGTH;
      
      // 2. Content Quality Score (0-100)
      let qualityScore = 0;
      
      // Base quality from word count and structure
      if (contentStats.wordCount >= 50) qualityScore += 20;
      if (contentStats.wordCount >= 100) qualityScore += 15;
      if (contentStats.paragraphCount > 1) qualityScore += 10;
      if (contentStats.hasEmojis) qualityScore += 5;
      if (contentStats.hasHashtags) qualityScore += 5;
      
      // Complexity bonus
      switch (contentStats.complexity) {
        case 'medium': qualityScore += 15; break;
        case 'high': qualityScore += 25; break;
        default: qualityScore += 5; break;
      }
      
      // Spam penalty
      if (hasSpamPatterns(data.content)) {
        qualityScore = Math.max(0, qualityScore - 50);
      }
      
      score += Math.min(100, qualityScore) * HOTNESS_WEIGHTS.CONTENT_QUALITY;
      
      // 3. Media Richness Score (0-100)
      let mediaScore = 0;
      if (data.images && data.images.length > 0) {
        mediaScore += Math.min(50, data.images.length * 15);
      }
      if (data.gif) {
        mediaScore += 30;
      }
      
      score += Math.min(100, mediaScore) * HOTNESS_WEIGHTS.MEDIA_RICHNESS;
      
      // 4. Poll Engagement Score (0-100)
      let pollScore = 0;
      if (data.pollData) {
        pollScore += 40; // Base poll bonus
        if (data.pollData.options.length >= 3) pollScore += 10;
        if (data.pollData.options.length >= 4) pollScore += 10;
        if (data.pollData.isBoost) pollScore += 20;
        if (data.pollData.hasTimeLimit) pollScore += 10;
        if (data.pollData.allowMultipleVotes) pollScore += 5;
        if (data.pollData.requireComment) pollScore += 5;
      }
      
      score += Math.min(100, pollScore) * HOTNESS_WEIGHTS.POLL_ENGAGEMENT;
      
      // 5. Category Popularity Score (0-100)
      const categoryScore = data.category 
        ? (CATEGORY_POPULARITY_SCORES[data.category as keyof typeof CATEGORY_POPULARITY_SCORES] || 0.5) * 100
        : 50;
      
      score += categoryScore * HOTNESS_WEIGHTS.CATEGORY_POPULARITY;
      
      // 6. User Engagement Score (placeholder - would use user stats)
      const userScore = 75; // Base score, would be calculated from user history
      score += userScore * HOTNESS_WEIGHTS.USER_ENGAGEMENT;
      
      // 7. Recency Boost (new posts get slight boost)
      const recencyScore = 100; // New posts get full recency score
      score += recencyScore * HOTNESS_WEIGHTS.RECENCY_BOOST;
      
      // Final score normalization
      const finalScore = Math.round(Math.max(0, Math.min(100, score)));
      
      secureLog('Hotness score calculated', {
        finalScore,
        contentLength: contentStats.wordCount,
        hasMedia: (data.images?.length || 0) > 0 || !!data.gif,
        hasPoll: !!data.pollData,
        category: data.category,
      });
      
      return finalScore;
      
    } catch (error) {
      secureLog('Hotness calculation error', { error: error.message });
      return 50; // Default score on error
    }
  }, [getContentStatistics]);
  
  // Engagement potential calculation
  const calculateEngagementPotential = useCallback((data: PostData): number => {
    const contentStats = getContentStatistics(data.content);
    const hotnessScore = calculateHotnessScore(data);
    
    let potential = hotnessScore * 0.6; // Base from hotness
    
    // Content engagement factors
    if (contentStats.complexity === 'high') potential += 10;
    if (contentStats.hasHashtags) potential += 5;
    if (contentStats.hasMentions) potential += 5;
    
    // Category engagement multipliers
    const categoryMultipliers = {
      ultimate_team: 1.2,
      career_mode: 1.1,
      rush: 1.15,
      fc_mobile: 1.05,
      general_discussion: 1.0,
    };
    
    const multiplier = categoryMultipliers[data.category as keyof typeof categoryMultipliers] || 1.0;
    potential *= multiplier;
    
    return Math.round(Math.max(0, Math.min(100, potential)));
  }, [getContentStatistics, calculateHotnessScore]);
  
  // Reading time estimation
  const estimateReadingTime = useCallback((content: string): number => {
    const stats = getContentStatistics(content);
    return stats.readingTime;
  }, [getContentStatistics]);
  
  // Post validation
  const validatePostData = useCallback(async (data: PostData): Promise<ValidationResult> => {
    updateState({ isValidating: true });
    
    const errors: string[] = [];
    const warnings: string[] = [];
    let score = 100;
    
    try {
      // Basic field validation
      if (!data.title?.trim()) {
        errors.push('Title is required');
        score -= 25;
      } else if (data.title.length < 5) {
        warnings.push('Title is quite short');
        score -= 5;
      } else if (data.title.length > 200) {
        errors.push('Title is too long (max 200 characters)');
        score -= 15;
      }
      
      if (!data.content?.trim()) {
        errors.push('Content is required');
        score -= 25;
      } else if (data.content.length < 10) {
        warnings.push('Content is quite short');
        score -= 10;
      } else if (data.content.length > 5000) {
        errors.push('Content is too long (max 5000 characters)');
        score -= 15;
      }
      
      if (!data.category) {
        errors.push('Category selection is required');
        score -= 20;
      }
      
      if (!data.userId) {
        errors.push('User authentication required');
        score -= 30;
      }
      
      // Content quality validation
      const titleValidation = validateCommentContent(data.title);
      if (!titleValidation.isValid) {
        errors.push(...titleValidation.errors);
        score -= 20;
      }
      
      const contentValidation = validateCommentContent(data.content);
      if (!contentValidation.isValid) {
        errors.push(...contentValidation.errors);
        score -= 20;
      }
      
      // Spam detection
      if (hasSpamPatterns(data.title)) {
        errors.push('Title appears to contain spam');
        score -= 30;
      }
      
      if (hasSpamPatterns(data.content)) {
        errors.push('Content appears to contain spam');
        score -= 30;
      }
      
      // Poll validation
      if (data.pollData) {
        const validOptions = data.pollData.options.filter(opt => opt.trim());
        if (validOptions.length < 2) {
          errors.push('Polls must have at least 2 options');
          score -= 15;
        }
        if (validOptions.length > 10) {
          warnings.push('Polls with many options may be overwhelming');
          score -= 5;
        }
        
        // Poll question validation
        if (!data.pollData.question?.trim()) {
          warnings.push('Poll question is empty, will use post title');
        }
      }
      
      // Image validation
      if (data.images && data.images.length > 0) {
        if (data.images.length > 10) {
          warnings.push('Many images may slow loading');
          score -= 5;
        }
        
        // Validate image URLs
        for (const imageUrl of data.images) {
          if (!imageUrl || typeof imageUrl !== 'string') {
            errors.push('Invalid image detected');
            score -= 10;
            break;
          }
        }
      }
      
      // Rate limiting check
      if (!canSubmitPost()) {
        errors.push('Rate limit exceeded. Please wait before posting again.');
        score -= 50;
      }
      
      const result: ValidationResult = {
        isValid: errors.length === 0,
        errors,
        warnings,
        score: Math.max(0, score),
      };
      
      updateState({ 
        lastValidation: result,
        validationErrors: errors,
      });
      
      secureLog('Post validation completed', {
        isValid: result.isValid,
        errorsCount: errors.length,
        warningsCount: warnings.length,
        score: result.score,
        userId: data.userId,
      });
      
      return result;
      
    } catch (error) {
      const errorMsg = 'Validation failed due to technical error';
      errors.push(errorMsg);
      
      secureLog('Post validation error', {
        error: error.message,
        userId: data.userId,
      });
      
      const result: ValidationResult = {
        isValid: false,
        errors,
        warnings,
        score: 0,
      };
      
      updateState({ 
        lastValidation: result,
        validationErrors: errors,
      });
      
      return result;
      
    } finally {
      updateState({ isValidating: false });
    }
  }, [updateState]);
  
  // Rate limiting functions
  const canSubmitPost = useCallback((): boolean => {
    const now = Date.now();
    const oneHourAgo = now - (60 * 60 * 1000);
    const oneDayAgo = now - (24 * 60 * 60 * 1000);
    
    // Clean old submissions
    submissionHistoryRef.current = submissionHistoryRef.current.filter(time => time > oneDayAgo);
    
    // Check hourly limit
    const recentSubmissions = submissionHistoryRef.current.filter(time => time > oneHourAgo);
    if (recentSubmissions.length >= RATE_LIMIT_CONFIG.MAX_POSTS_PER_HOUR) {
      return false;
    }
    
    // Check daily limit
    if (submissionHistoryRef.current.length >= RATE_LIMIT_CONFIG.MAX_POSTS_PER_DAY) {
      return false;
    }
    
    // Check cooldown
    if (state.lastSubmissionTime) {
      const timeSinceLastSubmission = now - state.lastSubmissionTime;
      const cooldownMs = RATE_LIMIT_CONFIG.COOLDOWN_MINUTES * 60 * 1000;
      if (timeSinceLastSubmission < cooldownMs) {
        return false;
      }
    }
    
    return true;
  }, [state.lastSubmissionTime]);
  
  const getTimeUntilNextSubmission = useCallback((): number => {
    if (canSubmitPost()) return 0;
    
    const now = Date.now();
    
    // Check cooldown first
    if (state.lastSubmissionTime) {
      const cooldownMs = RATE_LIMIT_CONFIG.COOLDOWN_MINUTES * 60 * 1000;
      const timeSinceLastSubmission = now - state.lastSubmissionTime;
      if (timeSinceLastSubmission < cooldownMs) {
        return cooldownMs - timeSinceLastSubmission;
      }
    }
    
    // Check hourly limit
    const oneHourAgo = now - (60 * 60 * 1000);
    const recentSubmissions = submissionHistoryRef.current.filter(time => time > oneHourAgo);
    if (recentSubmissions.length >= RATE_LIMIT_CONFIG.MAX_POSTS_PER_HOUR) {
      const oldestRecent = Math.min(...recentSubmissions);
      return (oldestRecent + (60 * 60 * 1000)) - now;
    }
    
    return 0;
  }, [state.lastSubmissionTime, canSubmitPost]);
  
  // Post submission
  const submitPost = useCallback(async (data: PostData): Promise<{ success: boolean; postId?: string; error?: string }> => {
    updateState({ isSubmitting: true });
    
    try {
      // Final validation
      const validation = await validatePostData(data);
      if (!validation.isValid) {
        return {
          success: false,
          error: validation.errors[0] || 'Validation failed',
        };
      }
      
      // Rate limiting check
      if (!canSubmitPost()) {
        return {
          success: false,
          error: 'Rate limit exceeded. Please wait before posting again.',
        };
      }
      
      // Sanitize post data
      const sanitizedData = sanitizeUserData(data);
      
      // Calculate scores
      const hotnessScore = calculateHotnessScore(sanitizedData);
      const engagementPotential = calculateEngagementPotential(sanitizedData);
      
      // Prepare post document
      const postDoc = {
        ...sanitizedData,
        hotnessScore,
        engagementPotential,
        likes: 0,
        useful: 0,
        comments: 0,
        views: 0,
        shares: 0,
        reported: false,
        isActive: true,
        visibility: 'public',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        
        // Poll data processing
        pollData: data.pollData ? {
          question: data.pollData.question.trim() || sanitizedData.title,
          options: data.pollData.options.filter(opt => opt.trim()).map((option, index) => ({
            id: `option_${index}`,
            text: option.trim(),
            votes: 0,
            voters: [],
          })),
          totalVotes: 0,
          settings: {
            isAnonymous: data.pollData.isAnonymous,
            isBoost: data.pollData.isBoost,
            allowMultipleVotes: data.pollData.allowMultipleVotes || false,
            hasTimeLimit: data.pollData.hasTimeLimit || false,
            timeLimitHours: data.pollData.timeLimitHours || 24,
            requireComment: data.pollData.requireComment || false,
          },
          createdAt: serverTimestamp(),
          expiresAt: data.pollData.hasTimeLimit 
            ? new Date(Date.now() + (data.pollData.timeLimitHours || 24) * 60 * 60 * 1000)
            : null,
        } : null,
        
        // Metadata
        metadata: {
          contentStats: getContentStatistics(data.content),
          submissionAttempts: state.submissionAttempts + 1,
          clientTimestamp: Date.now(),
        },
      };
      
      // Submit to Firestore
      const docRef = await addDoc(collection(db, 'posts'), postDoc);
      
      // Update submission tracking
      const now = Date.now();
      submissionHistoryRef.current.push(now);
      
      updateState({
        submissionAttempts: state.submissionAttempts + 1,
        lastSubmissionTime: now,
      });
      
      secureLog('Post submitted successfully', {
        postId: docRef.id,
        userId: data.userId,
        category: data.category,
        hotnessScore,
        engagementPotential,
      });
      
      return {
        success: true,
        postId: docRef.id,
      };
      
    } catch (error) {
      secureLog('Post submission error', {
        error: error.message,
        userId: data.userId,
        attempts: state.submissionAttempts + 1,
      });
      
      updateState({
        submissionAttempts: state.submissionAttempts + 1,
      });
      
      return {
        success: false,
        error: error.message || 'Failed to submit post',
      };
      
    } finally {
      updateState({ isSubmitting: false });
    }
  }, [
    updateState,
    validatePostData,
    canSubmitPost,
    calculateHotnessScore,
    calculateEngagementPotential,
    getContentStatistics,
    state.submissionAttempts,
  ]);
  
  // Reset functions
  const resetState = useCallback(() => {
    setState({
      isSubmitting: false,
      isValidating: false,
      validationErrors: [],
      lastValidation: null,
      submissionAttempts: 0,
      lastSubmissionTime: null,
    });
  }, []);
  
  const clearValidationErrors = useCallback(() => {
    updateState({
      validationErrors: [],
      lastValidation: null,
    });
  }, [updateState]);
  
  // Cleanup
  React.useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);
  
  return {
    state,
    calculateHotnessScore,
    validatePostData,
    submitPost,
    estimateReadingTime,
    calculateEngagementPotential,
    getContentStatistics,
    canSubmitPost,
    getTimeUntilNextSubmission,
    resetState,
    clearValidationErrors,
  };
};