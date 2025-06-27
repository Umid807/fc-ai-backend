// hooks/useUserRewards.ts - User Rewards System Hook for FC25 Locker

import React, { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import { Alert } from 'react-native';

// Firebase imports
import { 
  getFirestore, 
  doc, 
  getDoc, 
  updateDoc, 
  increment, 
  runTransaction,
  serverTimestamp,
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  Timestamp
} from 'firebase/firestore';
import { firebaseApp } from '../app/firebaseConfig';

// Security utilities
import { secureLog, checkRateLimit } from '../utils/security';

// Types
interface RewardRules {
  bonusChest: {
    coins: number;
    requiredDaily: number;
    xp: number;
  };
  dailyLogin: {
    coins: number;
  };
  getLikes: {
    coins: number;
    required: {
      likes: number;
    };
  };
  polls: {
    coinsPerPoll: number;
    maxPoll: number;
  };
  postMeaningful: {
    coins: number;
    maxPerDay: number;
    minLength: number;
    requireMedia: boolean;
    requireNoFlags: boolean;
    xp: number;
  };
  receiveComments: {
    coins: number;
    eligibleComments: number;
    xp: number;
  };
  replyToUsers: {
    coins: number;
    eligibleReplies: number;
    xp: number;
  };
  videos: {
    coinsPerVideo: number;
    maxVideosPerDay: number;
    xpPerVideo: number;
  };
  strikeRecovery: {
    [key: string]: number;
  };
}

interface UserRewardData {
  userId: string;
  coins: number;
  xp: number;
  level: number;
  dailyStreak: number;
  lastLoginDate: string;
  todayStats: {
    postsCreated: number;
    meaningfulPosts: number;
    commentsReceived: number;
    repliesMade: number;
    videosWatched: number;
    pollsCreated: number;
    likesReceived: number;
    date: string;
  };
  achievements: string[];
  penalties: {
    strikes: number;
    lastStrike: Timestamp | null;
    restrictions: string[];
  };
}

interface PostRewardData {
  content: string;
  hasMedia: boolean;
  userData: any;
  category?: string;
  engagement?: {
    likes?: number;
    comments?: number;
    views?: number;
  };
}

interface RewardResult {
  success: boolean;
  coinsEarned: number;
  xpEarned: number;
  newLevel?: number;
  achievementUnlocked?: string;
  message: string;
  reason: string;
}

interface UseUserRewardsState {
  isProcessingReward: boolean;
  lastRewardResult: RewardResult | null;
  rewardRules: RewardRules | null;
  userRewardData: UserRewardData | null;
  todayEarnings: {
    coins: number;
    xp: number;
    actions: number;
  };
}

interface UseUserRewardsReturn {
  // State
  state: UseUserRewardsState;
  
  // Core reward functions
  rewardMeaningfulPost: (userDocRef: any, postData: PostRewardData) => Promise<RewardResult>;
  rewardDailyLogin: (userId: string) => Promise<RewardResult>;
  rewardPollCreation: (userId: string) => Promise<RewardResult>;
  rewardCommentReceived: (userId: string, commentData: any) => Promise<RewardResult>;
  rewardReplyMade: (userId: string, replyData: any) => Promise<RewardResult>;
  rewardVideoWatched: (userId: string, videoData: any) => Promise<RewardResult>;
  rewardLikesReceived: (userId: string, likesCount: number) => Promise<RewardResult>;
  
  // Bonus rewards
  processBonusChest: (userId: string) => Promise<RewardResult>;
  processStreakBonus: (userId: string, streakDays: number) => Promise<RewardResult>;
  
  // Utility functions
  calculateLevel: (xp: number) => number;
  getXpForNextLevel: (currentLevel: number) => number;
  checkAchievements: (userData: UserRewardData) => string[];
  getUserRewardData: (userId: string) => Promise<UserRewardData | null>;
  getRewardRules: () => Promise<RewardRules | null>;
  
  // Analytics
  getTodayStats: (userId: string) => Promise<any>;
  getRewardHistory: (userId: string, days?: number) => Promise<any[]>;
  
  // Reset functions
  resetState: () => void;
}

// Constants
const XP_LEVELS = [
  0, 100, 250, 500, 1000, 1750, 2750, 4000, 5500, 7250, 9250, // 0-10
  11500, 14000, 16750, 19750, 23000, 26500, 30250, 34250, 38500, 43000, // 11-20
  47750, 52750, 58000, 63500, 69250, 75250, 81500, 88000, 94750, 101750, // 21-30
  109000, 116500, 124250, 132250, 140500, 149000, 157750, 166750, 176000, 185500, // 31-40
  195250, 205250, 215500, 226000, 236750, 247750, 259000, 270500, 282250, 294250, // 41-50
  306500, 319000, 331750, 344750, 358000, 371500, 385250, 399250, 413500, 428000, // 51-60
  442750, 457750, 473000, 488500, 504250, 520250, 536500, 553000, 569750, 586750, // 61-70
  604000, 621500, 639250, 657250, 675500, 694000, 712750, 731750, 751000, 770500, // 71-80
  790250, 810250, 830500, 851000, 871750, 892750, 914000, 935500, 957250, 979250, // 81-90
  1001500, 1024000, 1046750, 1069750, 1093000, 1116500, 1140250, 1164250, 1188500, 1213000, // 91-100
];

const ACHIEVEMENTS = {
  FIRST_POST: { id: 'first_post', name: 'First Post', description: 'Created your first post', coins: 50, xp: 25 },
  SOCIAL_BUTTERFLY: { id: 'social_butterfly', name: 'Social Butterfly', description: '100 comments received', coins: 200, xp: 100 },
  POLL_MASTER: { id: 'poll_master', name: 'Poll Master', description: 'Created 10 polls', coins: 150, xp: 75 },
  WEEK_STREAK: { id: 'week_streak', name: 'Weekly Warrior', description: '7-day login streak', coins: 100, xp: 50 },
  MONTH_STREAK: { id: 'month_streak', name: 'Monthly Master', description: '30-day login streak', coins: 500, xp: 250 },
  CONTENT_CREATOR: { id: 'content_creator', name: 'Content Creator', description: '50 meaningful posts', coins: 300, xp: 150 },
  COMMUNITY_HELPER: { id: 'community_helper', name: 'Community Helper', description: '100 helpful replies', coins: 250, xp: 125 },
  VIDEO_ENTHUSIAST: { id: 'video_enthusiast', name: 'Video Enthusiast', description: 'Watched 25 videos', coins: 100, xp: 50 },
  LEVEL_10: { id: 'level_10', name: 'Rising Star', description: 'Reached level 10', coins: 200, xp: 0 },
  LEVEL_25: { id: 'level_25', name: 'Community Leader', description: 'Reached level 25', coins: 500, xp: 0 },
  LEVEL_50: { id: 'level_50', name: 'FC25 Legend', description: 'Reached level 50', coins: 1000, xp: 0 },
};

const db = getFirestore(firebaseApp);

export const useUserRewards = (): UseUserRewardsReturn => {
  // State management
  const [state, setState] = useState<UseUserRewardsState>({
    isProcessingReward: false,
    lastRewardResult: null,
    rewardRules: null,
    userRewardData: null,
    todayEarnings: {
      coins: 0,
      xp: 0,
      actions: 0,
    },
  });
  
  // Refs for cleanup and caching
  const isMountedRef = useRef(true);
  const rulesCache = useRef<{ rules: RewardRules | null; timestamp: number }>({
    rules: null,
    timestamp: 0,
  });
  
  // State update helper
  const updateState = useCallback((updates: Partial<UseUserRewardsState>) => {
    if (!isMountedRef.current) return;
    setState(prev => ({ ...prev, ...updates }));
  }, []);
  
  // Get reward rules from Firestore with caching
  const getRewardRules = useCallback(async (): Promise<RewardRules | null> => {
    try {
      // Check cache (valid for 5 minutes)
      const now = Date.now();
      if (rulesCache.current.rules && (now - rulesCache.current.timestamp) < 300000) {
        return rulesCache.current.rules;
      }
      
      const rulesDoc = await getDoc(doc(db, 'config', 'rewardRules'));
      
      if (!rulesDoc.exists()) {
        secureLog('Reward rules not found in Firestore');
        return null;
      }
      
      const rules = rulesDoc.data() as RewardRules;
      
      // Update cache
      rulesCache.current = {
        rules,
        timestamp: now,
      };
      
      updateState({ rewardRules: rules });
      
      return rules;
      
    } catch (error) {
      secureLog('Error fetching reward rules', { error: error.message });
      return null;
    }
  }, [updateState]);
  
  // Get user reward data
  const getUserRewardData = useCallback(async (userId: string): Promise<UserRewardData | null> => {
    try {
      const userDoc = await getDoc(doc(db, 'users', userId));
      
      if (!userDoc.exists()) {
        secureLog('User not found for rewards', { userId });
        return null;
      }
      
      const userData = userDoc.data();
      const today = new Date().toISOString().split('T')[0];
      
      const rewardData: UserRewardData = {
        userId,
        coins: userData.coins || 0,
        xp: userData.xp || 0,
        level: calculateLevel(userData.xp || 0),
        dailyStreak: userData.dailyStreak || 0,
        lastLoginDate: userData.lastLoginDate || '',
        todayStats: userData.todayStats && userData.todayStats.date === today 
          ? userData.todayStats 
          : {
              postsCreated: 0,
              meaningfulPosts: 0,
              commentsReceived: 0,
              repliesMade: 0,
              videosWatched: 0,
              pollsCreated: 0,
              likesReceived: 0,
              date: today,
            },
        achievements: userData.achievements || [],
        penalties: userData.penalties || {
          strikes: 0,
          lastStrike: null,
          restrictions: [],
        },
      };
      
      updateState({ userRewardData: rewardData });
      
      return rewardData;
      
    } catch (error) {
      secureLog('Error fetching user reward data', { error: error.message, userId });
      return null;
    }
  }, [updateState]);
  
  // Calculate level from XP
  const calculateLevel = useCallback((xp: number): number => {
    for (let level = XP_LEVELS.length - 1; level >= 0; level--) {
      if (xp >= XP_LEVELS[level]) {
        return level;
      }
    }
    return 0;
  }, []);
  
  // Get XP required for next level
  const getXpForNextLevel = useCallback((currentLevel: number): number => {
    if (currentLevel >= XP_LEVELS.length - 1) {
      return XP_LEVELS[XP_LEVELS.length - 1];
    }
    return XP_LEVELS[currentLevel + 1];
  }, []);
  
  // Check for new achievements
  const checkAchievements = useCallback((userData: UserRewardData): string[] => {
    const newAchievements: string[] = [];
    
    // Level achievements
    if (userData.level >= 10 && !userData.achievements.includes('level_10')) {
      newAchievements.push('level_10');
    }
    if (userData.level >= 25 && !userData.achievements.includes('level_25')) {
      newAchievements.push('level_25');
    }
    if (userData.level >= 50 && !userData.achievements.includes('level_50')) {
      newAchievements.push('level_50');
    }
    
    // Streak achievements
    if (userData.dailyStreak >= 7 && !userData.achievements.includes('week_streak')) {
      newAchievements.push('week_streak');
    }
    if (userData.dailyStreak >= 30 && !userData.achievements.includes('month_streak')) {
      newAchievements.push('month_streak');
    }
    
    // Content achievements (would need additional tracking)
    // These would be checked based on user's historical data
    
    return newAchievements;
  }, []);
  
  // Process achievement rewards
  const processAchievementRewards = useCallback(async (
    userId: string, 
    achievementIds: string[]
  ): Promise<{ coins: number; xp: number }> => {
    let totalCoins = 0;
    let totalXp = 0;
    
    for (const achievementId of achievementIds) {
      const achievement = ACHIEVEMENTS[achievementId as keyof typeof ACHIEVEMENTS];
      if (achievement) {
        totalCoins += achievement.coins;
        totalXp += achievement.xp;
        
        secureLog('Achievement unlocked', {
          userId,
          achievementId,
          coins: achievement.coins,
          xp: achievement.xp,
        });
      }
    }
    
    return { coins: totalCoins, xp: totalXp };
  }, []);
  
  // Core reward function for meaningful posts
  const rewardMeaningfulPost = useCallback(async (
    userDocRef: any, 
    postData: PostRewardData
  ): Promise<RewardResult> => {
    updateState({ isProcessingReward: true });
    
    try {
      const rules = await getRewardRules();
      if (!rules) {
        return {
          success: false,
          coinsEarned: 0,
          xpEarned: 0,
          message: 'Reward rules not available',
          reason: 'system_error',
        };
      }
      
      const userData = await getUserRewardData(postData.userData.uid);
      if (!userData) {
        return {
          success: false,
          coinsEarned: 0,
          xpEarned: 0,
          message: 'User data not available',
          reason: 'user_error',
        };
      }
      
      const postMeaningfulRules = rules.postMeaningful;
      const today = new Date().toISOString().split('T')[0];
      
      // Check if user has already reached daily limit
      if (userData.todayStats.meaningfulPosts >= postMeaningfulRules.maxPerDay) {
        return {
          success: false,
          coinsEarned: 0,
          xpEarned: 0,
          message: `Daily limit reached (${postMeaningfulRules.maxPerDay} meaningful posts per day)`,
          reason: 'daily_limit',
        };
      }
      
      // Check content length requirement
      if (postData.content.length < postMeaningfulRules.minLength) {
        return {
          success: false,
          coinsEarned: 0,
          xpEarned: 0,
          message: `Post too short (minimum ${postMeaningfulRules.minLength} characters)`,
          reason: 'content_length',
        };
      }
      
      // Check media requirement
      if (postMeaningfulRules.requireMedia && !postData.hasMedia) {
        return {
          success: false,
          coinsEarned: 0,
          xpEarned: 0,
          message: 'Media required for meaningful post reward',
          reason: 'media_required',
        };
      }
      
      // Check for flags/penalties
      if (postMeaningfulRules.requireNoFlags && userData.penalties.strikes > 0) {
        return {
          success: false,
          coinsEarned: 0,
          xpEarned: 0,
          message: 'Account has active penalties',
          reason: 'penalties',
        };
      }
      
      // Calculate rewards
      let coinsEarned = postMeaningfulRules.coins;
      let xpEarned = postMeaningfulRules.xp || 25;
      
      // Category bonus (if applicable)
      const categoryBonuses = {
        ultimate_team: 1.2,
        career_mode: 1.1,
        rush: 1.15,
        fc_mobile: 1.05,
        general_discussion: 1.0,
      };
      
      const categoryMultiplier = categoryBonuses[postData.category as keyof typeof categoryBonuses] || 1.0;
      coinsEarned = Math.round(coinsEarned * categoryMultiplier);
      xpEarned = Math.round(xpEarned * categoryMultiplier);
      
      // Process the reward transaction
      await runTransaction(db, async (transaction) => {
        const userDoc = await transaction.get(userDocRef);
        
        if (!userDoc.exists()) {
          throw new Error('User document not found');
        }
        
        const currentData = userDoc.data();
        const currentLevel = calculateLevel(currentData.xp || 0);
        const newXp = (currentData.xp || 0) + xpEarned;
        const newLevel = calculateLevel(newXp);
        
        // Update user document
        const updateData: any = {
          coins: increment(coinsEarned),
          xp: increment(xpEarned),
          [`todayStats.meaningfulPosts`]: increment(1),
          [`todayStats.postsCreated`]: increment(1),
          [`todayStats.date`]: today,
          lastRewardTime: serverTimestamp(),
        };
        
        // Check for achievements
        const updatedUserData = { ...userData, xp: newXp, level: newLevel };
        const newAchievements = checkAchievements(updatedUserData);
        
        if (newAchievements.length > 0) {
          updateData.achievements = [...(currentData.achievements || []), ...newAchievements];
          
          // Add achievement rewards
          const achievementRewards = await processAchievementRewards(userData.userId, newAchievements);
          updateData.coins = increment(coinsEarned + achievementRewards.coins);
          updateData.xp = increment(xpEarned + achievementRewards.xp);
          
          coinsEarned += achievementRewards.coins;
          xpEarned += achievementRewards.xp;
        }
        
        transaction.update(userDocRef, updateData);
      });
      
      // Update local state
      updateState({
        todayEarnings: {
          coins: state.todayEarnings.coins + coinsEarned,
          xp: state.todayEarnings.xp + xpEarned,
          actions: state.todayEarnings.actions + 1,
        },
      });
      
      const result: RewardResult = {
        success: true,
        coinsEarned,
        xpEarned,
        newLevel: calculateLevel((userData.xp || 0) + xpEarned) > userData.level 
          ? calculateLevel((userData.xp || 0) + xpEarned) 
          : undefined,
        message: `Earned ${coinsEarned} coins and ${xpEarned} XP for meaningful post!`,
        reason: 'meaningful_post',
      };
      
      updateState({ lastRewardResult: result });
      
      secureLog('Meaningful post reward processed', {
        userId: userData.userId,
        coinsEarned,
        xpEarned,
        categoryMultiplier,
        postLength: postData.content.length,
        hasMedia: postData.hasMedia,
      });
      
      return result;
      
    } catch (error) {
      secureLog('Error processing meaningful post reward', {
        error: error.message,
        userId: postData.userData.uid,
      });
      
      return {
        success: false,
        coinsEarned: 0,
        xpEarned: 0,
        message: 'Failed to process reward',
        reason: 'system_error',
      };
      
    } finally {
      updateState({ isProcessingReward: false });
    }
  }, [updateState, getRewardRules, getUserRewardData, calculateLevel, checkAchievements, processAchievementRewards, state.todayEarnings]);
  
  // Daily login reward
  const rewardDailyLogin = useCallback(async (userId: string): Promise<RewardResult> => {
    updateState({ isProcessingReward: true });
    
    try {
      const rules = await getRewardRules();
      if (!rules) {
        return {
          success: false,
          coinsEarned: 0,
          xpEarned: 0,
          message: 'Reward rules not available',
          reason: 'system_error',
        };
      }
      
      const userData = await getUserRewardData(userId);
      if (!userData) {
        return {
          success: false,
          coinsEarned: 0,
          xpEarned: 0,
          message: 'User data not available',
          reason: 'user_error',
        };
      }
      
      const today = new Date().toISOString().split('T')[0];
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      
      // Check if already claimed today
      if (userData.lastLoginDate === today) {
        return {
          success: false,
          coinsEarned: 0,
          xpEarned: 0,
          message: 'Daily login reward already claimed today',
          reason: 'already_claimed',
        };
      }
      
      // Calculate streak
      let newStreak = 1;
      if (userData.lastLoginDate === yesterday) {
        newStreak = userData.dailyStreak + 1;
      }
      
      // Calculate reward with streak bonus
      let coinsEarned = rules.dailyLogin.coins;
      let xpEarned = 10; // Base XP for login
      
      // Streak bonuses
      if (newStreak >= 7) coinsEarned += 20; // Weekly bonus
      if (newStreak >= 30) coinsEarned += 50; // Monthly bonus
      if (newStreak % 10 === 0) coinsEarned += 30; // Every 10 days
      
      // Process the reward
      const userDocRef = doc(db, 'users', userId);
      await updateDoc(userDocRef, {
        coins: increment(coinsEarned),
        xp: increment(xpEarned),
        dailyStreak: newStreak,
        lastLoginDate: today,
        lastLoginTime: serverTimestamp(),
      });
      
      const result: RewardResult = {
        success: true,
        coinsEarned,
        xpEarned,
        message: `Daily login reward! ${newStreak} day streak!`,
        reason: 'daily_login',
      };
      
      updateState({ lastRewardResult: result });
      
      secureLog('Daily login reward processed', {
        userId,
        coinsEarned,
        xpEarned,
        streak: newStreak,
      });
      
      return result;
      
    } catch (error) {
      secureLog('Error processing daily login reward', {
        error: error.message,
        userId,
      });
      
      return {
        success: false,
        coinsEarned: 0,
        xpEarned: 0,
        message: 'Failed to process daily login reward',
        reason: 'system_error',
      };
      
    } finally {
      updateState({ isProcessingReward: false });
    }
  }, [updateState, getRewardRules, getUserRewardData]);
  
  // Poll creation reward
  const rewardPollCreation = useCallback(async (userId: string): Promise<RewardResult> => {
    updateState({ isProcessingReward: true });
    
    try {
      const rules = await getRewardRules();
      if (!rules) {
        return {
          success: false,
          coinsEarned: 0,
          xpEarned: 0,
          message: 'Reward rules not available',
          reason: 'system_error',
        };
      }
      
      const userData = await getUserRewardData(userId);
      if (!userData) {
        return {
          success: false,
          coinsEarned: 0,
          xpEarned: 0,
          message: 'User data not available',
          reason: 'user_error',
        };
      }
      
      // Check daily limit
      if (userData.todayStats.pollsCreated >= rules.polls.maxPoll) {
        return {
          success: false,
          coinsEarned: 0,
          xpEarned: 0,
          message: `Daily poll limit reached (${rules.polls.maxPoll} polls per day)`,
          reason: 'daily_limit',
        };
      }
      
      const coinsEarned = rules.polls.coinsPerPoll;
      const xpEarned = 15; // Base XP for poll creation
      const today = new Date().toISOString().split('T')[0];
      
      // Process the reward
      const userDocRef = doc(db, 'users', userId);
      await updateDoc(userDocRef, {
        coins: increment(coinsEarned),
        xp: increment(xpEarned),
        [`todayStats.pollsCreated`]: increment(1),
        [`todayStats.date`]: today,
      });
      
      const result: RewardResult = {
        success: true,
        coinsEarned,
        xpEarned,
        message: `Earned ${coinsEarned} coins for creating a poll!`,
        reason: 'poll_creation',
      };
      
      updateState({ lastRewardResult: result });
      
      secureLog('Poll creation reward processed', {
        userId,
        coinsEarned,
        xpEarned,
        dailyCount: userData.todayStats.pollsCreated + 1,
      });
      
      return result;
      
    } catch (error) {
      secureLog('Error processing poll creation reward', {
        error: error.message,
        userId,
      });
      
      return {
        success: false,
        coinsEarned: 0,
        xpEarned: 0,
        message: 'Failed to process poll reward',
        reason: 'system_error',
      };
      
    } finally {
      updateState({ isProcessingReward: false });
    }
  }, [updateState, getRewardRules, getUserRewardData]);
  
  // Comment received reward
  const rewardCommentReceived = useCallback(async (userId: string, commentData: any): Promise<RewardResult> => {
    updateState({ isProcessingReward: true });
    
    try {
      const rules = await getRewardRules();
      if (!rules) {
        return { success: false, coinsEarned: 0, xpEarned: 0, message: 'Reward rules not available', reason: 'system_error' };
      }
      
      const userData = await getUserRewardData(userId);
      if (!userData) {
        return { success: false, coinsEarned: 0, xpEarned: 0, message: 'User data not available', reason: 'user_error' };
      }
      
      // Check if eligible (every 3 comments)
      const newCommentCount = userData.todayStats.commentsReceived + 1;
      if (newCommentCount % rules.receiveComments.eligibleComments !== 0) {
        // Update count but no reward yet
        const userDocRef = doc(db, 'users', userId);
        await updateDoc(userDocRef, {
          [`todayStats.commentsReceived`]: increment(1),
          [`todayStats.date`]: new Date().toISOString().split('T')[0],
        });
        
        return {
          success: false,
          coinsEarned: 0,
          xpEarned: 0,
          message: `${rules.receiveComments.eligibleComments - (newCommentCount % rules.receiveComments.eligibleComments)} more comments needed for reward`,
          reason: 'not_eligible',
        };
      }
      
      const coinsEarned = rules.receiveComments.coins;
      const xpEarned = rules.receiveComments.xp || 10;
      const today = new Date().toISOString().split('T')[0];
      
      // Process the reward
      const userDocRef = doc(db, 'users', userId);
      await updateDoc(userDocRef, {
        coins: increment(coinsEarned),
        xp: increment(xpEarned),
        [`todayStats.commentsReceived`]: increment(1),
        [`todayStats.date`]: today,
      });
      
      const result: RewardResult = {
        success: true,
        coinsEarned,
        xpEarned,
        message: `Earned ${coinsEarned} coins for receiving ${rules.receiveComments.eligibleComments} comments!`,
        reason: 'comments_received',
      };
      
      updateState({ lastRewardResult: result });
      
      return result;
      
    } catch (error) {
      secureLog('Error processing comment received reward', { error: error.message, userId });
      return { success: false, coinsEarned: 0, xpEarned: 0, message: 'Failed to process reward', reason: 'system_error' };
    } finally {
      updateState({ isProcessingReward: false });
    }
  }, [updateState, getRewardRules, getUserRewardData]);
  
  // Reply made reward
  const rewardReplyMade = useCallback(async (userId: string, replyData: any): Promise<RewardResult> => {
    updateState({ isProcessingReward: true });
    
    try {
      const rules = await getRewardRules();
      if (!rules) {
        return { success: false, coinsEarned: 0, xpEarned: 0, message: 'Reward rules not available', reason: 'system_error' };
      }
      
      const userData = await getUserRewardData(userId);
      if (!userData) {
        return { success: false, coinsEarned: 0, xpEarned: 0, message: 'User data not available', reason: 'user_error' };
      }
      
      // Check if eligible (every 3 replies)
      const newReplyCount = userData.todayStats.repliesMade + 1;
      if (newReplyCount % rules.replyToUsers.eligibleReplies !== 0) {
        // Update count but no reward yet
        const userDocRef = doc(db, 'users', userId);
        await updateDoc(userDocRef, {
          [`todayStats.repliesMade`]: increment(1),
          [`todayStats.date`]: new Date().toISOString().split('T')[0],
        });
        
        return {
          success: false,
          coinsEarned: 0,
          xpEarned: 0,
          message: `${rules.replyToUsers.eligibleReplies - (newReplyCount % rules.replyToUsers.eligibleReplies)} more replies needed for reward`,
          reason: 'not_eligible',
        };
      }
      
      const coinsEarned = rules.replyToUsers.coins;
      const xpEarned = rules.replyToUsers.xp || 10;
      const today = new Date().toISOString().split('T')[0];
      
      // Process the reward
      const userDocRef = doc(db, 'users', userId);
      await updateDoc(userDocRef, {
        coins: increment(coinsEarned),
        xp: increment(xpEarned),
        [`todayStats.repliesMade`]: increment(1),
        [`todayStats.date`]: today,
      });
      
      const result: RewardResult = {
        success: true,
        coinsEarned,
        xpEarned,
        message: `Earned ${coinsEarned} coins for making ${rules.replyToUsers.eligibleReplies} helpful replies!`,
        reason: 'replies_made',
      };
      
      updateState({ lastRewardResult: result });
      
      return result;
      
    } catch (error) {
      secureLog('Error processing reply reward', { error: error.message, userId });
      return { success: false, coinsEarned: 0, xpEarned: 0, message: 'Failed to process reward', reason: 'system_error' };
    } finally {
      updateState({ isProcessingReward: false });
    }
  }, [updateState, getRewardRules, getUserRewardData]);
  
  // Video watched reward
  const rewardVideoWatched = useCallback(async (userId: string, videoData: any): Promise<RewardResult> => {
    updateState({ isProcessingReward: true });
    
    try {
      const rules = await getRewardRules();
      if (!rules) {
        return { success: false, coinsEarned: 0, xpEarned: 0, message: 'Reward rules not available', reason: 'system_error' };
      }
      
      const userData = await getUserRewardData(userId);
      if (!userData) {
        return { success: false, coinsEarned: 0, xpEarned: 0, message: 'User data not available', reason: 'user_error' };
      }
      
      // Check daily limit
      if (userData.todayStats.videosWatched >= rules.videos.maxVideosPerDay) {
        return {
          success: false,
          coinsEarned: 0,
          xpEarned: 0,
          message: `Daily video limit reached (${rules.videos.maxVideosPerDay} videos per day)`,
          reason: 'daily_limit',
        };
      }
      
      const coinsEarned = rules.videos.coinsPerVideo;
      const xpEarned = rules.videos.xpPerVideo || 20;
      const today = new Date().toISOString().split('T')[0];
      
      // Process the reward
      const userDocRef = doc(db, 'users', userId);
      await updateDoc(userDocRef, {
        coins: increment(coinsEarned),
        xp: increment(xpEarned),
        [`todayStats.videosWatched`]: increment(1),
        [`todayStats.date`]: today,
      });
      
      const result: RewardResult = {
        success: true,
        coinsEarned,
        xpEarned,
        message: `Earned ${coinsEarned} coins for watching a video!`,
        reason: 'video_watched',
      };
      
      updateState({ lastRewardResult: result });
      
      return result;
      
    } catch (error) {
      secureLog('Error processing video reward', { error: error.message, userId });
      return { success: false, coinsEarned: 0, xpEarned: 0, message: 'Failed to process reward', reason: 'system_error' };
    } finally {
      updateState({ isProcessingReward: false });
    }
  }, [updateState, getRewardRules, getUserRewardData]);
  
  // Likes received reward
  const rewardLikesReceived = useCallback(async (userId: string, likesCount: number): Promise<RewardResult> => {
    updateState({ isProcessingReward: true });
    
    try {
      const rules = await getRewardRules();
      if (!rules) {
        return { success: false, coinsEarned: 0, xpEarned: 0, message: 'Reward rules not available', reason: 'system_error' };
      }
      
      // Check if milestone reached
      if (likesCount % rules.getLikes.required.likes !== 0) {
        return {
          success: false,
          coinsEarned: 0,
          xpEarned: 0,
          message: `${rules.getLikes.required.likes - (likesCount % rules.getLikes.required.likes)} more likes needed for reward`,
          reason: 'not_eligible',
        };
      }
      
      const coinsEarned = rules.getLikes.coins;
      const xpEarned = 15; // Base XP for likes milestone
      
      // Process the reward
      const userDocRef = doc(db, 'users', userId);
      await updateDoc(userDocRef, {
        coins: increment(coinsEarned),
        xp: increment(xpEarned),
        [`todayStats.likesReceived`]: likesCount,
        [`todayStats.date`]: new Date().toISOString().split('T')[0],
      });
      
      const result: RewardResult = {
        success: true,
        coinsEarned,
        xpEarned,
        message: `Earned ${coinsEarned} coins for reaching ${likesCount} likes!`,
        reason: 'likes_milestone',
      };
      
      updateState({ lastRewardResult: result });
      
      return result;
      
    } catch (error) {
      secureLog('Error processing likes reward', { error: error.message, userId });
      return { success: false, coinsEarned: 0, xpEarned: 0, message: 'Failed to process reward', reason: 'system_error' };
    } finally {
      updateState({ isProcessingReward: false });
    }
  }, [updateState, getRewardRules]);
  
  // Bonus chest processing
  const processBonusChest = useCallback(async (userId: string): Promise<RewardResult> => {
    updateState({ isProcessingReward: true });
    
    try {
      const rules = await getRewardRules();
      if (!rules) {
        return { success: false, coinsEarned: 0, xpEarned: 0, message: 'Reward rules not available', reason: 'system_error' };
      }
      
      const userData = await getUserRewardData(userId);
      if (!userData) {
        return { success: false, coinsEarned: 0, xpEarned: 0, message: 'User data not available', reason: 'user_error' };
      }
      
      // Check if eligible (daily requirement met)
      if (userData.dailyStreak < rules.bonusChest.requiredDaily) {
        return {
          success: false,
          coinsEarned: 0,
          xpEarned: 0,
          message: `Need ${rules.bonusChest.requiredDaily} day streak for bonus chest`,
          reason: 'not_eligible',
        };
      }
      
      const coinsEarned = rules.bonusChest.coins;
      const xpEarned = rules.bonusChest.xp;
      
      // Process the reward
      const userDocRef = doc(db, 'users', userId);
      await updateDoc(userDocRef, {
        coins: increment(coinsEarned),
        xp: increment(xpEarned),
        lastBonusChest: serverTimestamp(),
      });
      
      const result: RewardResult = {
        success: true,
        coinsEarned,
        xpEarned,
        message: `Bonus chest opened! Earned ${coinsEarned} coins and ${xpEarned} XP!`,
        reason: 'bonus_chest',
      };
      
      updateState({ lastRewardResult: result });
      
      return result;
      
    } catch (error) {
      secureLog('Error processing bonus chest', { error: error.message, userId });
      return { success: false, coinsEarned: 0, xpEarned: 0, message: 'Failed to process bonus chest', reason: 'system_error' };
    } finally {
      updateState({ isProcessingReward: false });
    }
  }, [updateState, getRewardRules, getUserRewardData]);
  
  // Streak bonus processing
  const processStreakBonus = useCallback(async (userId: string, streakDays: number): Promise<RewardResult> => {
    // Special milestone bonuses for long streaks
    const streakMilestones = {
      7: { coins: 100, xp: 50, message: 'Weekly streak bonus!' },
      14: { coins: 200, xp: 100, message: 'Two-week streak bonus!' },
      30: { coins: 500, xp: 250, message: 'Monthly streak bonus!' },
      50: { coins: 750, xp: 375, message: 'Epic streak bonus!' },
      100: { coins: 1500, xp: 750, message: 'Legendary streak bonus!' },
    };
    
    const milestone = streakMilestones[streakDays as keyof typeof streakMilestones];
    if (!milestone) {
      return { success: false, coinsEarned: 0, xpEarned: 0, message: 'No milestone reached', reason: 'no_milestone' };
    }
    
    updateState({ isProcessingReward: true });
    
    try {
      // Process the milestone reward
      const userDocRef = doc(db, 'users', userId);
      await updateDoc(userDocRef, {
        coins: increment(milestone.coins),
        xp: increment(milestone.xp),
        [`streakMilestones.${streakDays}`]: serverTimestamp(),
      });
      
      const result: RewardResult = {
        success: true,
        coinsEarned: milestone.coins,
        xpEarned: milestone.xp,
        message: milestone.message,
        reason: 'streak_milestone',
      };
      
      updateState({ lastRewardResult: result });
      
      return result;
      
    } catch (error) {
      secureLog('Error processing streak bonus', { error: error.message, userId, streakDays });
      return { success: false, coinsEarned: 0, xpEarned: 0, message: 'Failed to process streak bonus', reason: 'system_error' };
    } finally {
      updateState({ isProcessingReward: false });
    }
  }, [updateState]);
  
  // Get today's stats
  const getTodayStats = useCallback(async (userId: string) => {
    try {
      const userData = await getUserRewardData(userId);
      return userData?.todayStats || null;
    } catch (error) {
      secureLog('Error fetching today stats', { error: error.message, userId });
      return null;
    }
  }, [getUserRewardData]);
  
  // Get reward history
  const getRewardHistory = useCallback(async (userId: string, days: number = 7) => {
    try {
      // This would query a rewardHistory collection if it exists
      // For now, return empty array
      return [];
    } catch (error) {
      secureLog('Error fetching reward history', { error: error.message, userId });
      return [];
    }
  }, []);
  
  // Reset state
  const resetState = useCallback(() => {
    setState({
      isProcessingReward: false,
      lastRewardResult: null,
      rewardRules: null,
      userRewardData: null,
      todayEarnings: {
        coins: 0,
        xp: 0,
        actions: 0,
      },
    });
  }, []);
  
  // Cleanup
  React.useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);
  
  return {
    state,
    rewardMeaningfulPost,
    rewardDailyLogin,
    rewardPollCreation,
    rewardCommentReceived,
    rewardReplyMade,
    rewardVideoWatched,
    rewardLikesReceived,
    processBonusChest,
    processStreakBonus,
    calculateLevel,
    getXpForNextLevel,
    checkAchievements,
    getUserRewardData,
    getRewardRules,
    getTodayStats,
    getRewardHistory,
    resetState,
  };
};