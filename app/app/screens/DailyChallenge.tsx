import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ImageBackground,
  ActivityIndicator,
  Alert,
  Animated,
  AppState,
  Dimensions,
  TouchableOpacity
} from "react-native";
import { useRouter } from "expo-router";

// FIRESTORE imports
import {
  getFirestore,
  collection,
  query,
  where,
  getDocs,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  Timestamp,
  onSnapshot,
  deleteDoc
} from "firebase/firestore";
import auth from "../firebaseAuth";

// REALTIME DATABASE imports
import { getDatabase, ref, get } from "firebase/database";

// IMPORTED COMPONENTS
import StreakDisplay from "../../../components/DailyChallenges/StreakDisplay";
import ResetTimerDisplay from "../../../components/DailyChallenges/ResetTimerDisplay";
import TabsNavigation from "../../../components/DailyChallenges/TabsNavigation";
import PollCard from "../../../components/DailyChallenges/PollCard";
import VideoCard from "../../../components/DailyChallenges/VideoCard";
import BonusChestSection from "../../../components/DailyChallenges/BonusChestSection";
import ProgressBars from "../../../components/DailyChallenges/ProgressBars";
import VideoPlayerModal from "../../../components/DailyChallenges/VideoPlayerModal";
import XPAnimation from "../../../components/XPAnimation";
import RewardPopup from "../../../components/RewardPopup";

// Import i18n
import i18n from '../i18n/i18n';

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get("window");

// TYPES
type Poll = {
  id: string;
  question: string;
  options: string[];
  voted: boolean;
  selectedChoice?: string;
};

type VideoItem = {
  id: string;
  title: string;
  thumbnailUrl: string;
  youtubeUrl: string;
  rewardXP: number;
  rewardCoins: number;
  watched: boolean;
};

// HELPER FUNCTIONS
const getTimeUntilMidnight = (): number => {
  console.log("DailyChallenge: Calculating time until midnight.");
  const now = new Date();
  const midnight = new Date();
  midnight.setHours(24, 0, 0, 0);
  const timeLeft = midnight.getTime() - now.getTime();
  console.log(`DailyChallenge: Time left until midnight: ${timeLeft}ms`);
  return timeLeft;
};

const formatTime = (milliseconds: number): string => {
  console.log("DailyChallenge: Formatting time.");
  const totalSeconds = Math.floor(milliseconds / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const formatted = `${hours.toString().padStart(2, "0")}:${minutes
    .toString()
    .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  console.log(`DailyChallenge: Formatted time: ${formatted}`);
  return formatted;
};

// MAIN COMPONENT
const DailyChallenges: React.FC = () => {
  console.log("DailyChallenge: Component rendered.");
  const router = useRouter();
  const db = getFirestore();
  const rtdb = getDatabase();

  // AUTH STATE
  const [currentUserUid, setCurrentUserUid] = useState<string | null>(null);
  console.log("DailyChallenge: currentUserUid initialized to " + currentUserUid);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  console.log("DailyChallenge: isAuthLoading initialized to " + isAuthLoading);

  // USER DATA STATE
  const [userData, setUserData] = useState<any>({
    streakToday: 0,
    lastHighestStreak: 0,
    coins: 0,
    XP: 0,
    lastActiveDay: null,
    lastStreakRecoveryUsed: null,
    vip: false,
    vipStreakRecoveryUsed: 0,
    vipRecoveryResetAt: null,
  });
  console.log("DailyChallenge: userData initialized to " + JSON.stringify(userData));

  // REWARD RULES STATE
  const [rewardRules, setRewardRules] = useState<any>(null);
  console.log("DailyChallenge: rewardRules initialized to " + rewardRules);
  const [rewardRulesLoading, setRewardRulesLoading] = useState(true);
  console.log("DailyChallenge: rewardRulesLoading initialized to " + rewardRulesLoading);

  // DAILY PROGRESS STATE
  const [dailyXP, setDailyXP] = useState<number>(0);
  console.log("DailyChallenge: dailyXP initialized to " + dailyXP);
  const [dailyCoins, setDailyCoins] = useState<number>(0);
  console.log("DailyChallenge: dailyCoins initialized to " + dailyCoins);
  const [bonusClaimed, setBonusClaimed] = useState(false);
  console.log("DailyChallenge: bonusClaimed initialized to " + bonusClaimed);

  // POLLS STATE
  const [polls, setPolls] = useState<Poll[]>([]);
  console.log("DailyChallenge: polls initialized to " + JSON.stringify(polls));
  const [pollsLoaded, setPollsLoaded] = useState(false);
  console.log("DailyChallenge: pollsLoaded initialized to " + pollsLoaded);

  // VIDEOS STATE
  const [videos, setVideos] = useState<VideoItem[]>([]);
  console.log("DailyChallenge: videos initialized to " + JSON.stringify(videos));
  const [videosLoaded, setVideosLoaded] = useState(false);
  console.log("DailyChallenge: videosLoaded initialized to " + videosLoaded);
  const [watchedVideoIds, setWatchedVideoIds] = useState<string[]>([]);
  console.log("DailyChallenge: watchedVideoIds initialized to " + JSON.stringify(watchedVideoIds));

  // VIDEO PLAYER STATE
  const [videoModalVisible, setVideoModalVisible] = useState(false);
  console.log("DailyChallenge: videoModalVisible initialized to " + videoModalVisible);
  const [currentVideo, setCurrentVideo] = useState<VideoItem | null>(null);
  console.log("DailyChallenge: currentVideo initialized to " + currentVideo);
  const [playing, setPlaying] = useState(true);
  console.log("DailyChallenge: playing initialized to " + playing);
  const [videoDuration, setVideoDuration] = useState(0);
  console.log("DailyChallenge: videoDuration initialized to " + videoDuration);
  const [hasCompletedVideo, setHasCompletedVideo] = useState(false);
  console.log("DailyChallenge: hasCompletedVideo initialized to " + hasCompletedVideo);
  const [videoProgress, setVideoProgress] = useState(0);
  console.log("DailyChallenge: videoProgress initialized to " + videoProgress);

  // ANIMATION STATE
  const [showXPAnimation, setShowXPAnimation] = useState(false);
  console.log("DailyChallenge: showXPAnimation initialized to " + showXPAnimation);
  const [rewardPopupVisible, setRewardPopupVisible] = useState(false);
  console.log("DailyChallenge: rewardPopupVisible initialized to " + rewardPopupVisible);
  const [earnedPollXP, setEarnedPollXP] = useState(0);
  console.log("DailyChallenge: earnedPollXP initialized to " + earnedPollXP);
  const [earnedPollCoins, setEarnedPollCoins] = useState(0);
  console.log("DailyChallenge: earnedPollCoins initialized to " + earnedPollCoins);

  // UI STATE
  const [activeTab, setActiveTab] = useState<"polls" | "videos" | "community">("polls");
  console.log("DailyChallenge: activeTab initialized to " + activeTab);
  const [timeLeft, setTimeLeft] = useState(getTimeUntilMidnight());
  console.log("DailyChallenge: timeLeft initialized to " + timeLeft);
  const [canRecoverStreak, setCanRecoverStreak] = useState(true);
  console.log("DailyChallenge: canRecoverStreak initialized to " + canRecoverStreak);
  const [streakCheckedToday, setStreakCheckedToday] = useState(false);
  console.log("DailyChallenge: streakCheckedToday initialized to " + streakCheckedToday);
  const [monthlyResetChecked, setMonthlyResetChecked] = useState(false);
  console.log("DailyChallenge: monthlyResetChecked initialized to " + monthlyResetChecked);

  // REFS
  const playerRef = useRef<any>(null);
  console.log("DailyChallenge: playerRef initialized.");
  const totalWatchedRef = useRef(0);
  console.log("DailyChallenge: totalWatchedRef initialized to " + totalWatchedRef.current);
  const lastTimestampRef = useRef(0);
  console.log("DailyChallenge: lastTimestampRef initialized to " + lastTimestampRef.current);
  const watchInterval = useRef<NodeJS.Timeout | null>(null);
  console.log("DailyChallenge: watchInterval initialized.");
  const sparkleAnim = useRef(new Animated.Value(0)).current;
  console.log("DailyChallenge: sparkleAnim initialized.");
  const chestAnimation = useRef(new Animated.Value(0)).current;
  console.log("DailyChallenge: chestAnimation initialized.");

  // AUTHENTICATION GUARD
  const ensureAuthenticated = useCallback(() => {
    console.log("DailyChallenge: ensureAuthenticated called.");
    if (!currentUserUid) {
      console.log("DailyChallenge: User not authenticated. Redirecting to login.");
      Alert.alert(i18n.t('global.error'), i18n.t('global.unauthenticated_action_message'));
      router.replace('/login');
      return false;
    }
    console.log("DailyChallenge: User authenticated.");
    return true;
  }, [currentUserUid, router]);

  // VIDEO HANDLING
  const handleVideoCompletion = useCallback(async () => {
    console.log("DailyChallenge: handleVideoCompletion called.");
    if (!ensureAuthenticated() || !currentUserUid || !currentVideo || hasCompletedVideo) {
      console.log("DailyChallenge: handleVideoCompletion prerequisites not met. Returning.");
      return;
    }

    const multiplier = userData.streakToday === 7 ? 1.5 : 1;
    const xpEarned = Math.round((rewardRules?.videos?.xpPerVideo ?? 50) * multiplier);
    const coinsEarned = Math.round((rewardRules?.videos?.coinsPerVideo ?? 100) * multiplier);
    console.log(`DailyChallenge: Video completion rewards calculated. XP: ${xpEarned}, Coins: ${coinsEarned}, Multiplier: ${multiplier}`);

    const userDocRef = doc(db, "users", currentUserUid);

    try {
      console.log("DailyChallenge: Checking if video was already watched (server-side).");
      const watchedVideoRef = doc(db, "users", currentUserUid, "watchedVideos", currentVideo.id);
      const watchedSnap = await getDoc(watchedVideoRef);

      if (watchedSnap.exists()) {
        console.log("🚫 Video already watched (server-side check). No reward.");
        setVideos((prev) =>
          prev.map((v) => (v.id === currentVideo.id ? { ...v, watched: true } : v))
        );
        console.log("DailyChallenge: Video state updated to watched. Returning.");
        return;
      }

      console.log("DailyChallenge: Recording watched video and updating user rewards.");
      await setDoc(watchedVideoRef, {
        videoId: currentVideo.id,
        watchedAt: Timestamp.now(),
        completed: true,
        xpEarned,
        coinsEarned,
      });
      console.log("DailyChallenge: Watched video recorded in Firestore.");

      const userSnap = await getDoc(userDocRef);
      const currentData = userSnap.data();
      if (!currentData) {
        throw new Error("User data not found for reward update.");
      }
      console.log("DailyChallenge: User data fetched for reward update.");

      const newDailyXP = Math.min((currentData.dailyXP || 0) + xpEarned, rewardRules?.xpCap?.daily ?? 300);
      const newDailyCoins = (currentData.dailyCoins || 0) + coinsEarned;
      const newTotalXP = (currentData.XP || 0) + xpEarned;
      const newTotalCoins = (currentData.coins || 0) + coinsEarned;
      console.log(`DailyChallenge: New daily XP: ${newDailyXP}, New daily coins: ${newDailyCoins}, New total XP: ${newTotalXP}, New total coins: ${newTotalCoins}`);

      await updateDoc(userDocRef, {
        dailyXP: newDailyXP,
        dailyCoins: newDailyCoins,
        XP: newTotalXP,
        coins: newTotalCoins,
        lastVideosCompletedAt: Timestamp.now(),
      });
      console.log("DailyChallenge: User document updated with video rewards.");

      // Update local state
      setVideos((prev) =>
        prev.map((v) => (v.id === currentVideo.id ? { ...v, watched: true } : v))
      );
      setWatchedVideoIds((prev) => [...prev, currentVideo.id]);
      console.log("DailyChallenge: Local video and watchedVideoIds state updated.");

      // Trigger animations
      setEarnedPollXP(xpEarned);
      setEarnedPollCoins(coinsEarned);
      setShowXPAnimation(true);
      setRewardPopupVisible(true);
      setTimeout(() => setShowXPAnimation(false), 1500);
      setTimeout(() => setRewardPopupVisible(false), 2000);
      console.log("DailyChallenge: XP/Coin animation and reward popup triggered.");

      setHasCompletedVideo(true);
      console.log("🎉 Video reward granted!");
    } catch (err: any) {
      console.error("🚫 Failed to complete video:", err);
      Alert.alert(i18n.t('daily_challenge.error_completing_video_title'), i18n.t('daily_challenge.error_completing_video_message'));
    }
  }, [currentUserUid, currentVideo, hasCompletedVideo, rewardRules, userData.streakToday, db, ensureAuthenticated]);

  const onChangeState = useCallback((stateChange: string) => {
    console.log(`DailyChallenge: Video player state changed to: ${stateChange}`);
    if (stateChange === "paused" || stateChange === "ended") {
      if (watchInterval.current) {
        clearInterval(watchInterval.current);
        watchInterval.current = null;
        console.log("DailyChallenge: Video watch interval cleared due to pause/end.");
      }
      setPlaying(false);
    } else if (stateChange === "playing" && !watchInterval.current) {
      setPlaying(true);
      console.log("DailyChallenge: Video player started playing, starting watch interval.");
      watchInterval.current = setInterval(async () => {
        try {
          const currentTime = await playerRef.current?.getCurrentTime?.();
          if (typeof currentTime !== 'number' || isNaN(currentTime)) return;
          console.log(`DailyChallenge: Video current time: ${currentTime.toFixed(2)}s`);

          const delta = currentTime - lastTimestampRef.current;

          if (delta > 0 && delta < 3) {
            totalWatchedRef.current += delta;
            console.log(`DailyChallenge: totalWatchedRef updated: ${totalWatchedRef.current.toFixed(2)}s`);
          } else if (delta < 0) {
            console.log("DailyChallenge: Video time jumped backward, resetting last timestamp.");
            lastTimestampRef.current = currentTime;
          }

          lastTimestampRef.current = currentTime;

          if (videoDuration > 0) {
            const progress = (totalWatchedRef.current / videoDuration) * 100;
            setVideoProgress(progress);
            console.log(`DailyChallenge: Video progress: ${progress.toFixed(2)}%`);

            if (progress >= (rewardRules?.videos?.watchPercentage || 80) && !hasCompletedVideo) {
              console.log("DailyChallenge: Video watch percentage reached, triggering completion handler.");
              handleVideoCompletion();
            }
          }
        } catch (err) {
          console.warn(" anomalie Tracker error:", err);
          if (watchInterval.current) {
            clearInterval(watchInterval.current);
            watchInterval.current = null;
            console.log("DailyChallenge: Video watch interval cleared due to error.");
          }
        }
      }, 1000);
    }
  }, [videoDuration, hasCompletedVideo, rewardRules, handleVideoCompletion]);

  const onReady = useCallback(async () => {
    console.log("DailyChallenge: Video player ready callback triggered.");
    if (!playerRef.current) return;
    
    try {
      const duration = await playerRef.current.getDuration();
      if (typeof duration === 'number' && !isNaN(duration) && duration > 0) {
        setVideoDuration(duration);
        console.log("DailyChallenge: Video ready. Duration:", duration);
      }
    } catch (error) {
      console.warn("Error getting video duration:", error);
    }
  }, []);

  const openVideoModal = useCallback((video: VideoItem) => {
    console.log(`DailyChallenge: Opening video modal for video ID: ${video.id}`);
    setCurrentVideo(video);
    setVideoModalVisible(true);
    setHasCompletedVideo(false);
    setVideoProgress(0);
    totalWatchedRef.current = 0;
    lastTimestampRef.current = 0;
    
    if (watchInterval.current) {
      clearInterval(watchInterval.current);
      watchInterval.current = null;
      console.log("DailyChallenge: Previous video watch interval cleared before opening new modal.");
    }
  }, []);

  // DAILY RESET & STREAK MANAGEMENT
  const checkDailyReset = useCallback(async () => {
    console.log("DailyChallenge: checkDailyReset called.");
    if (!currentUserUid) {
      console.log("DailyChallenge: No current user UID, skipping daily reset check.");
      return;
    }

    try {
      const userDocRef = doc(db, "users", currentUserUid);
      const userSnap = await getDoc(userDocRef);
      if (!userSnap.exists()) {
        console.log("DailyChallenge: User document does not exist, skipping daily reset.");
        return;
      }

      const data = userSnap.data();
      const lastActive = data.lastActiveDay?.toDate?.() || null;
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      console.log(`DailyChallenge: Last active day: ${lastActive?.toDateString() || 'N/A'}, Today: ${today.toDateString()}`);

      if (!lastActive || lastActive.toDateString() !== today.toDateString()) {
        console.log("DailyChallenge: Different day detected. Resetting daily progress.");
        await updateDoc(userDocRef, {
          dailyXP: 0,
          dailyCoins: 0,
          bonusClaimed: false,
          lastActiveDay: Timestamp.fromDate(today),
        });
        console.log("DailyChallenge: Daily progress reset in Firestore.");
        setDailyXP(0);
        setDailyCoins(0);
        setBonusClaimed(false);
        setStreakCheckedToday(false); // Mark as not checked for the new day
        console.log("DailyChallenge: Local daily progress state updated and streakCheckedToday set to false.");
      } else {
        setStreakCheckedToday(true);
        console.log("DailyChallenge: Same day, streak already checked for today.");
      }
    } catch (err) {
      console.error("checkDailyReset error:", err);
      Alert.alert(i18n.t('global.error'), i18n.t('daily_challenge.error_daily_reset_check'));
    }
  }, [currentUserUid, db]);

  const updateStreakOnXPEarned = useCallback(async (xpAmount: number, currentStreakVal: number, lastActiveDayVal: Timestamp | null) => {
    console.log(`DailyChallenge: updateStreakOnXPEarned called with XP: ${xpAmount}, Current Streak: ${currentStreakVal}`);
    if (!currentUserUid) {
      console.log("DailyChallenge: No current user UID, skipping streak update.");
      return;
    }

    try {
      const userDocRef = doc(db, "users", currentUserUid);

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const lastActive = lastActiveDayVal?.toDate?.() || null;
      lastActive?.setHours(0, 0, 0, 0);
      console.log(`DailyChallenge: Streak update - Today: ${today.toDateString()}, Last Active Day: ${lastActive?.toDateString() || 'N/A'}`);

      let newStreak = currentStreakVal;
      const threshold = parseInt(rewardRules?.bonusChest?.requiredDailyXP ?? "150");
      console.log(`DailyChallenge: XP threshold for streak: ${threshold}`);

      if (!lastActive) {
        // First time user - start streak if XP threshold met
        newStreak = xpAmount >= threshold ? 1 : 0;
        console.log(`DailyChallenge: First time user. Streak started: ${newStreak}`);
      } else {
        const diff = today.getTime() - lastActive.getTime();
        const daysSinceLastActive = Math.round(diff / (1000 * 60 * 60 * 24));
        console.log(`DailyChallenge: Days since last active: ${daysSinceLastActive}`);

        if (daysSinceLastActive === 0) {
          console.log("Streak update skipped: Same day.");
          return; // Don't update streak for same day
        } else if (daysSinceLastActive === 1) {
          // Yesterday was last active - normal progression/regression
          if (xpAmount >= threshold) {
            // Met today's XP target - continue/increase streak
            newStreak = Math.min(currentStreakVal + 1, 7); // Increase streak, cap at 7
            console.log(`DailyChallenge: Met XP target. New streak: ${newStreak}`);
          } else {
            // Didn't meet today's XP target - lose 1 streak
            newStreak = Math.max(currentStreakVal - 1, 0); // Lose 1 streak, minimum 0
            console.log(`DailyChallenge: Did not meet XP target. New streak: ${newStreak}`);
          }
        } else {
          // 2+ days missed - reset to 0
          if (xpAmount >= threshold) {
            newStreak = 1; // Start fresh with 1 if they meet XP target today
            console.log(`DailyChallenge: Missed 2+ days, but met today's XP. New streak: ${newStreak}`);
          } else {
            newStreak = 0; // Stay at 0 if they don't meet XP target
            console.log(`DailyChallenge: Missed 2+ days, and did not meet today's XP. New streak: ${newStreak}`);
          }
        }
      }

      // Update the highest streak if current streak is higher
      const lastHighestStreak = Math.max(userData.lastHighestStreak || 0, newStreak);
      console.log(`DailyChallenge: Last highest streak: ${lastHighestStreak}`);

      await updateDoc(userDocRef, {
        streakToday: newStreak,
        lastHighestStreak,
        lastActiveDay: Timestamp.fromDate(today),
      });
      console.log(`✅ Streak updated: ${currentStreakVal} -> ${newStreak} (Highest: ${lastHighestStreak})`);

    } catch (error) {
      console.error("Error updating streak:", error);
      Alert.alert(i18n.t('global.error'), i18n.t('daily_challenge.error_updating_streak_message'));
    }
  }, [currentUserUid, db, userData.lastHighestStreak, rewardRules?.bonusChest?.requiredDailyXP]);

  // TEST FUNCTION for streak logic (DEV ONLY)
  const testStreakLogic = useCallback(async (daysMissed: number, currentXP: number) => {
    console.log(`⚙️ TESTING: ${daysMissed} days missed, ${currentXP} XP earned today`);
    if (!currentUserUid) return;

    try {
      const userDocRef = doc(db, "users", currentUserUid);
      
      // Simulate different lastActiveDay scenarios
      const testDate = new Date();
      testDate.setDate(testDate.getDate() - daysMissed); // Go back X days
      testDate.setHours(0, 0, 0, 0);
      
      console.log(`⚙️ Simulating lastActiveDay: ${testDate.toDateString()}`);
      console.log(`⚙️ Current streak before test: ${userData.streakToday}`);
      
      // Call your streak update function with test data
      await updateStreakOnXPEarned(
        currentXP,
        userData.streakToday,
        Timestamp.fromDate(testDate)
      );
      
      console.log(`✅ Test completed. Check your streak in the UI!`);
      
    } catch (error) {
      console.error("Test error:", error);
    }
  }, [currentUserUid, userData.streakToday, updateStreakOnXPEarned, db]);

  // POLL HANDLING
  const handleVote = useCallback(async (pollId: string, choice: string) => {
    console.log(`DailyChallenge: handleVote called for Poll ID: ${pollId}, Choice: ${choice}`);
    if (!ensureAuthenticated() || !currentUserUid) {
      console.log("DailyChallenge: handleVote prerequisites not met. Returning.");
      return;
    }

    const currentPoll = polls.find(p => p.id === pollId);
    if (currentPoll?.voted) {
      console.log("DailyChallenge: Poll already voted. Displaying alert.");
      Alert.alert(i18n.t('daily_challenge.already_voted_title'), i18n.t('daily_challenge.already_voted_message'));
      setPolls(prevPolls => prevPolls.map(p => p.id === pollId ? { ...p, voted: true, selectedChoice: choice } : p));
      return;
    }
    
    const streakMultiplier = userData.streakToday === 7 ? 1.5 : 1;
    const rewardXP = Math.round((rewardRules?.polls?.xpPerPoll ?? 30) * streakMultiplier);
    const rewardCoins = Math.round((rewardRules?.polls?.coinsPerPoll ?? 50) * streakMultiplier);
    console.log(`DailyChallenge: Poll vote rewards calculated. XP: ${rewardXP}, Coins: ${rewardCoins}, Multiplier: ${streakMultiplier}`);

    const userDocRef = doc(db, "users", currentUserUid);
    const pollHistoryDocRef = doc(db, "users", currentUserUid, "pollHistory", pollId);

    try {
      console.log("DailyChallenge: Checking if poll was already voted (server-side).");
      const pollHistorySnap = await getDoc(pollHistoryDocRef);
      if (pollHistorySnap.exists()) {
        console.log("DailyChallenge: Poll already voted (server-side check). Displaying alert.");
        Alert.alert(i18n.t('daily_challenge.already_voted_title'), i18n.t('daily_challenge.already_voted_message'));
        setPolls(prevPolls => prevPolls.map(p => p.id === pollId ? { ...p, voted: true, selectedChoice: choice } : p));
        return;
      }

      console.log("DailyChallenge: Recording poll vote and updating user rewards.");
      await setDoc(pollHistoryDocRef, {
        selectedChoice: choice,
        votedAt: Timestamp.now(),
      });
      console.log("DailyChallenge: Poll vote recorded in Firestore.");

      const userSnap = await getDoc(userDocRef);
      const currentData = userSnap.data();

      const newDailyXP = Math.min((currentData?.dailyXP || 0) + rewardXP, rewardRules?.xpCap?.daily ?? 300);
      const newDailyCoins = (currentData?.dailyCoins || 0) + rewardCoins;
      const newTotalXP = (currentData?.XP || 0) + rewardXP;
      const newTotalCoins = (currentData?.coins || 0) + rewardCoins;
      console.log(`DailyChallenge: New daily XP: ${newDailyXP}, New daily coins: ${newDailyCoins}, New total XP: ${newTotalXP}, New total coins: ${newTotalCoins}`);


      await updateDoc(userDocRef, {
        dailyXP: newDailyXP,
        dailyCoins: newDailyCoins,
        XP: newTotalXP,
        coins: newTotalCoins,
      });
      console.log("DailyChallenge: User document updated with poll rewards.");

      setEarnedPollXP(rewardXP);
      setEarnedPollCoins(rewardCoins);
      setShowXPAnimation(true);
      setRewardPopupVisible(true);

      setTimeout(() => setShowXPAnimation(false), 1500);
      setTimeout(() => setRewardPopupVisible(false), 2000);
      console.log("DailyChallenge: XP/Coin animation and reward popup triggered.");

      setPolls(prevPolls => {
        const updatedPolls = prevPolls.map((poll) =>
          poll.id === pollId ? { ...poll, voted: true, selectedChoice: choice } : poll
        );
        
        const allVoted = updatedPolls.every((p) => p.voted);
        if (allVoted) {
          console.log("DailyChallenge: All polls voted, updating lastPollsCompletedAt.");
          updateDoc(userDocRef, { lastPollsCompletedAt: Timestamp.now() })
            .catch((err) => console.error("🚫 Error updating lastPollsCompletedAt:", err));
        }
        
        return updatedPolls;
      });
      console.log("DailyChallenge: Local polls state updated.");

    } catch (err) {
      console.error("🚫 handleVote error:", err);
      Alert.alert(i18n.t('daily_challenge.error_submitting_vote'), i18n.t('daily_challenge.error_submitting_vote_message'));
    }
  }, [currentUserUid, polls, rewardRules, userData.streakToday, db, ensureAuthenticated]);

  // STREAK RECOVERY
  const recoverStreak = useCallback(async () => {
    console.log("DailyChallenge: recoverStreak called.");
    if (!ensureAuthenticated() || !currentUserUid) {
      console.log("DailyChallenge: recoverStreak prerequisites not met. Returning.");
      return;
    }

    try {
      const userDocRef = doc(db, "users", currentUserUid);
      const userSnap = await getDoc(userDocRef);
      if (!userSnap.exists()) return;
      console.log("DailyChallenge: User document fetched for streak recovery.");

      const data = userSnap.data();
      const isVIP = data.vip === true;
      const userCoins = data.coins || 0;
      const cost = rewardRules?.streakRecovery?.coinsCost || 5000;
      console.log(`DailyChallenge: Streak recovery - Is VIP: ${isVIP}, User coins: ${userCoins}, Cost: ${cost}`);

      if (isVIP) {
        const vipUsed = data.vipStreakRecoveryUsed || 0;
        const vipResetAt = data.vipRecoveryResetAt?.toDate?.() || null;
        console.log(`DailyChallenge: VIP streak recovery - Used: ${vipUsed}, Reset At: ${vipResetAt?.toDateString() || 'N/A'}`);

        let canUseFree = true;
        const now = new Date();
        
        if (vipResetAt && now < vipResetAt && vipUsed >= (rewardRules?.streakRecovery?.vipMaxUses || 2)) {
          canUseFree = false;
          console.log("DailyChallenge: VIP free recovery limit reached for current period.");
        }

        if (vipResetAt && now > vipResetAt) {
          console.log("DailyChallenge: VIP recovery reset period passed, resetting count.");
          await updateDoc(userDocRef, { vipStreakRecoveryUsed: 0 });
          canUseFree = true;
        }

        if (canUseFree && vipUsed < (rewardRules?.streakRecovery?.vipMaxUses || 2)) {
          console.log("DailyChallenge: VIP free streak recovery available. Applying.");
          await updateDoc(userDocRef, {
            streakToday: 7,
            lastHighestStreak: Math.max(data.lastHighestStreak || 0, 7),
            lastStreakRecoveryUsed: Timestamp.fromDate(now),
            vipStreakRecoveryUsed: vipUsed + 1,
            vipRecoveryResetAt: Timestamp.fromDate(new Date(now.getTime() + (rewardRules?.streakRecovery?.vipCooldownDays || 7) * 24 * 60 * 60 * 1000)),
          });
          setCanRecoverStreak(false);
          Alert.alert(i18n.t('daily_challenge.vip_recovery_alert_title'), i18n.t('daily_challenge.vip_recovery_alert_message'));
          console.log("DailyChallenge: VIP streak recovery applied.");
          return;
        }
      }

      if (userCoins < cost) {
        console.log("DailyChallenge: Not enough coins for streak recovery.");
        Alert.alert(i18n.t('daily_challenge.not_enough_coins_title'), i18n.t('daily_challenge.not_enough_coins_message', { cost }));
        return;
      }

      console.log("DailyChallenge: Recovering streak using coins. Updating Firestore.");
      await updateDoc(userDocRef, {
        coins: userCoins - cost,
        streakToday: 7,
        lastHighestStreak: Math.max(data.lastHighestStreak || 0, 7),
        lastStreakRecoveryUsed: Timestamp.fromDate(now),
      });
      console.log("DailyChallenge: Streak recovery with coins applied.");
      
      setCanRecoverStreak(false);
      Alert.alert(i18n.t('daily_challenge.streak_recovered_alert_title'), i18n.t('daily_challenge.streak_recovered_alert_message', { cost }));
    } catch (err) {
      console.error("🚫 Failed to recover streak:", err);
      Alert.alert(i18n.t('daily_challenge.error_recovering_streak_title'), i18n.t('daily_challenge.error_recovering_streak_message'));
    }
  }, [currentUserUid, rewardRules, db, ensureAuthenticated]);

  // BONUS CHEST
  const handleClaimBonus = useCallback(async () => {
    console.log("DailyChallenge: handleClaimBonus called.");
    if (!ensureAuthenticated() || !currentUserUid || bonusClaimed) {
      console.log("DailyChallenge: handleClaimBonus prerequisites not met or bonus already claimed. Returning.");
      return;
    }

    const requiredXP = parseInt(rewardRules?.bonusChest?.requiredDailyXP ?? "150");
    if (dailyXP < requiredXP) {
      console.log(`DailyChallenge: Daily XP (${dailyXP}) is less than required XP (${requiredXP}) for bonus. Displaying alert.`);
      Alert.alert(i18n.t('daily_challenge.bonus_not_ready_title'), i18n.t('daily_challenge.bonus_not_ready_message', { xpNeeded: requiredXP }));
      return;
    }

    try {
      const userDocRef = doc(db, "users", currentUserUid);
      const streakMultiplier = userData.streakToday === 7 ? 1.5 : 1;
      const chestXP = Math.round((rewardRules?.bonusChest?.xp ?? 30) * streakMultiplier);
      const chestCoins = Math.round((rewardRules?.bonusChest?.coins ?? 200) * streakMultiplier);
      console.log(`DailyChallenge: Bonus chest rewards calculated. XP: ${chestXP}, Coins: ${chestCoins}, Multiplier: ${streakMultiplier}`);

      const userSnap = await getDoc(userDocRef);
      const currentData = userSnap.data();
      if (!currentData) throw new Error("User data not found for bonus claim.");
      console.log("DailyChallenge: User data fetched for bonus claim.");

      const newDailyXP = Math.min((currentData.dailyXP || 0) + chestXP, rewardRules?.xpCap?.daily ?? 300);
      const newDailyCoins = (currentData.dailyCoins || 0) + chestCoins;
      const newTotalXP = (currentData.XP || 0) + chestXP;
      const newTotalCoins = (currentData.coins || 0) + chestCoins;
      console.log(`DailyChallenge: New daily XP: ${newDailyXP}, New daily coins: ${newDailyCoins}, New total XP: ${newTotalXP}, New total coins: ${newTotalCoins}`);

      await updateDoc(userDocRef, {
        dailyXP: newDailyXP,
        dailyCoins: newDailyCoins,
        XP: newTotalXP,
        coins: newTotalCoins,
        bonusClaimed: true,
      });
      console.log("DailyChallenge: User document updated with bonus rewards.");

      setBonusClaimed(true);
      console.log("DailyChallenge: Local bonusClaimed state updated to true.");

      sparkleAnim.setValue(0);
      Animated.timing(sparkleAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: false,
      }).start();
      console.log("DailyChallenge: Sparkle animation started.");

      setEarnedPollXP(chestXP);
      setEarnedPollCoins(chestCoins);
      setShowXPAnimation(true);
      setRewardPopupVisible(true);
      setTimeout(() => setShowXPAnimation(false), 1500);
      setTimeout(() => setRewardPopupVisible(false), 2000);
      console.log("DailyChallenge: XP/Coin animation and reward popup triggered.");

    } catch (error) {
      console.error("Bonus claim failed:", error);
      Alert.alert(i18n.t('daily_challenge.bonus_claim_failed_title'), i18n.t('daily_challenge.bonus_claim_failed_message'));
    }
  }, [currentUserUid, bonusClaimed, dailyXP, rewardRules, userData.streakToday, db, ensureAuthenticated, sparkleAnim]);

  // DATA FETCHING
  const fetchDailyPolls = useCallback(async () => {
    console.log("DailyChallenge: fetchDailyPolls called.");
    if (!ensureAuthenticated() || !currentUserUid) {
      console.log("DailyChallenge: No current user UID, skipping poll fetch.");
      return;
    }

    try {
      setPollsLoaded(false);
      console.log("DailyChallenge: pollsLoaded set to false.");
      
      const userDocRef = doc(db, "users", currentUserUid);
      const userSnapshot = await getDoc(userDocRef);
      const docData = userSnapshot.data();
      const lastCompleted = docData?.lastPollsCompletedAt?.toDate?.() || null;
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      console.log(`DailyChallenge: Last polls completed: ${lastCompleted?.toDateString() || 'N/A'}, Today: ${today.toDateString()}`);

      if (lastCompleted && lastCompleted.toDateString() === today.toDateString()) {
        console.log("DailyChallenge: Polls already completed today. Setting empty array.");
        setPolls([]);
        setPollsLoaded(true);
        return;
      }

      const pollsRef = collection(db, "polls");
      const activeQuery = query(pollsRef, where("active", "==", true));
      const pollsSnapshot = await getDocs(activeQuery);
      const activePolls = pollsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Poll[];
      console.log(`DailyChallenge: Fetched ${activePolls.length} active polls.`);

      const pollHistoryRef = collection(db, "users", currentUserUid, "pollHistory");
      const historySnapshot = await getDocs(pollHistoryRef);
      const seenPollIds = historySnapshot.docs.map((d) => d.id);
      console.log(`DailyChallenge: Fetched ${seenPollIds.length} poll history entries.`);

      const unseenPolls = activePolls.filter((p) => !seenPollIds.includes(p.id));
      console.log(`DailyChallenge: Found ${unseenPolls.length} unseen polls.`);

      if (unseenPolls.length === 0) {
        console.log("DailyChallenge: No unseen polls available. Updating lastPollsCompletedAt.");
        await updateDoc(userDocRef, { lastPollsCompletedAt: Timestamp.now() });
        setPolls([]);
      } else {
        // Shuffle and select polls
        for (let i = unseenPolls.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [unseenPolls[i], unseenPolls[j]] = [unseenPolls[j], unseenPolls[i]];
        }
        const selectedPolls = unseenPolls.slice(0, 2);
        console.log(`DailyChallenge: Selected ${selectedPolls.length} polls for today.`);
        setPolls(selectedPolls.map((p) => ({ ...p, voted: false })));
      }
    } catch (error) {
      console.error("Error fetching polls:", error);
      Alert.alert(i18n.t('global.error'), i18n.t('daily_challenge.error_fetching_polls_message'));
    } finally {
      setPollsLoaded(true);
      console.log("DailyChallenge: pollsLoaded set to true.");
    }
  }, [currentUserUid, db, ensureAuthenticated]);

  const fetchDailyVideos = useCallback(async () => {
    console.log("DailyChallenge: fetchDailyVideos called.");
    if (!ensureAuthenticated() || !currentUserUid) {
      console.log("DailyChallenge: No current user UID, skipping video fetch.");
      return;
    }

    try {
      setVideosLoaded(false);
      console.log("DailyChallenge: videosLoaded set to false.");
      
      const videosRef = ref(rtdb, "dailychallengevideos");
      const snap = await get(videosRef);
      if (!snap.exists()) {
        console.log("DailyChallenge: No videos found in Realtime Database.");
        setVideos([]);
        setVideosLoaded(true);
        return;
      }
      console.log("DailyChallenge: Videos fetched from Realtime Database.");

      const data = snap.val();
      const allVideos: VideoItem[] = Object.keys(data).map((key) => ({
        id: key,
        title: data[key].title,
        thumbnailUrl: data[key].thumbnail_url,
        youtubeUrl: data[key].video_url,
        rewardXP: data[key].rewardXP || rewardRules?.videos?.xpPerVideo || 50,
        rewardCoins: data[key].rewardCoins || rewardRules?.videos?.coinsPerVideo || 100,
        watched: false, // Will be updated based on history
      }));
      console.log(`DailyChallenge: Mapped ${allVideos.length} videos.`);

      const videoHistoryRef = collection(db, "users", currentUserUid, "watchedVideos");
      const historySnap = await getDocs(videoHistoryRef);
      const seenVideoIds = historySnap.docs.map((d) => d.id);
      setWatchedVideoIds(seenVideoIds);
      console.log(`DailyChallenge: Fetched ${seenVideoIds.length} watched video history entries.`);

      const unseenVideos = allVideos.filter((v) => !seenVideoIds.includes(v.id));
      console.log(`DailyChallenge: Found ${unseenVideos.length} unseen videos.`);

      if (unseenVideos.length === 0) {
        console.log("DailyChallenge: No unseen videos available. Setting empty array.");
        setVideos([]);
      } else {
        // Shuffle and select videos
        for (let i = unseenVideos.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [unseenVideos[i], unseenVideos[j]] = [unseenVideos[j], unseenVideos[i]];
        }
        const selectedVideos = unseenVideos.slice(0, 2);
        console.log(`DailyChallenge: Selected ${selectedVideos.length} videos for today.`);
        setVideos(selectedVideos.map((v) => ({ ...v, watched: seenVideoIds.includes(v.id) })));
      }
    } catch (error) {
      console.error("Error fetching videos:", error);
      Alert.alert(i18n.t('global.error'), i18n.t('daily_challenge.error_fetching_videos_message'));
    } finally {
      setVideosLoaded(true);
      console.log("DailyChallenge: videosLoaded set to true.");
    }
  }, [currentUserUid, rewardRules, db, rtdb, ensureAuthenticated]);

  const checkAndHandleMonthlyReset = useCallback(async () => {
    console.log("DailyChallenge: checkAndHandleMonthlyReset called.");
    if (!currentUserUid) {
      console.log("DailyChallenge: No current user UID, skipping monthly reset check.");
      return;
    }

    try {
      const userDocRef = doc(db, "users", currentUserUid);
      const userSnap = await getDoc(userDocRef);
      if (!userSnap.exists()) return;
      console.log("DailyChallenge: User document fetched for monthly reset.");

      const data = userSnap.data();
      const lastResetAt: Timestamp | null = data.lastResetAt || null;
      const now = Timestamp.now();
      const thirtyDays = 30 * 24 * 60 * 60 * 1000;
      console.log(`DailyChallenge: Last reset at: ${lastResetAt?.toDate()?.toDateString() || 'N/A'}, Now: ${now.toDate().toDateString()}`);


      if (!lastResetAt || now.toMillis() - lastResetAt.toMillis() > thirtyDays) {
        console.log("Performing monthly reset...");
        
        // Clear poll and video history (simple approach)
        const pollHistoryRef = collection(db, "users", currentUserUid, "pollHistory");
        const videoHistoryRef = collection(db, "users", currentUserUid, "watchedVideos");

        const [pollSnapshot, videoSnapshot] = await Promise.all([
          getDocs(pollHistoryRef),
          getDocs(videoHistoryRef)
        ]);
        console.log("DailyChallenge: Poll and video history snapshots fetched for deletion.");

        // Delete documents in batches
        const deletePromises = [
          ...pollSnapshot.docs.map(doc => deleteDoc(doc.ref)),
          ...videoSnapshot.docs.map(doc => deleteDoc(doc.ref))
        ];

        await Promise.all(deletePromises);
        console.log("DailyChallenge: Old poll and video history deleted.");
        await updateDoc(userDocRef, { lastResetAt: now });
        console.log("DailyChallenge: User document updated with new lastResetAt.");

        // Re-fetch data after reset
        fetchDailyPolls();
        fetchDailyVideos();
        console.log("DailyChallenge: Daily polls and videos re-fetched after monthly reset.");
      }
    } catch (error) {
      console.error("Error handling monthly reset:", error);
      Alert.alert(i18n.t('global.error'), i18n.t('daily_challenge.error_monthly_reset_check'));
    } finally {
      setMonthlyResetChecked(true);
      console.log("DailyChallenge: monthlyResetChecked set to true.");
    }
  }, [currentUserUid, db, fetchDailyPolls, fetchDailyVideos]);



  // EFFECTS

  useEffect(() => {
    console.log("DailyChallenge: Streak check useEffect triggered.");
    if (currentUserUid && userData.lastActiveDay !== null && !streakCheckedToday && rewardRules) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const lastActive = new Date(userData.lastActiveDay.toDate());
      lastActive.setHours(0, 0, 0, 0);

      const sameDay = today.toDateString() === lastActive.toDateString();

      if (!sameDay) {
        console.log("DailyChallenge: Streak Check Effect: Different day, triggering streak update.");
        updateStreakOnXPEarned(dailyXP, userData.streakToday, userData.lastActiveDay).then(() => {
          setStreakCheckedToday(true);
        });
      } else {
        setStreakCheckedToday(true);
        console.log("DailyChallenge: Streak Check Effect: Same day, marking streak as checked.");
      }
    }
  }, [dailyXP, userData.lastActiveDay, userData.streakToday, currentUserUid, streakCheckedToday, rewardRules, updateStreakOnXPEarned]);

  // 1. Auth state observer
  useEffect(() => {
    console.log("DailyChallenge: Auth state observer useEffect triggered.");
    const unsubscribe = auth.onAuthStateChanged(user => {
      if (user) {
        setCurrentUserUid(user.uid);
        console.log("DailyChallenge: User logged in, UID set: " + user.uid);
      } else {
        setCurrentUserUid(null);
        console.log("DailyChallenge: User logged out, UID set to null. Redirecting to login.");
        router.replace('/login');
      }
      setIsAuthLoading(false);
      console.log("DailyChallenge: isAuthLoading set to false.");
    });
    return () => unsubscribe();
  }, [router]);

  // 2. Initialize user data
  useEffect(() => {
    console.log("DailyChallenge: Initialize user data useEffect triggered.");
    const initializeUserData = async () => {
      if (!ensureAuthenticated() || !currentUserUid) {
        console.log("DailyChallenge: Not authenticated, skipping user data initialization.");
        return;
      }

      try {
        const userDocRef = doc(db, "users", currentUserUid);
        const snapshot = await getDoc(userDocRef);
        console.log("DailyChallenge: Attempting to fetch user document for initialization.");

        if (!snapshot.exists()) {
          console.log("DailyChallenge: User document does not exist, creating new one.");
          await setDoc(userDocRef, {
            dailyXP: 0,
            dailyCoins: 0,
            streakToday: 0,
            lastHighestStreak: 0,
            coins: 0,
            XP: 0,
            bonusClaimed: false,
            lastActiveDay: Timestamp.now(),
            lastStreakRecoveryUsed: null,
            vip: false,
            vipStreakRecoveryUsed: 0,
            vipRecoveryResetAt: null,
            lastResetAt: Timestamp.now(),
          });
          console.log("DailyChallenge: New user document created.");
        } else {
          console.log("DailyChallenge: User document exists, checking for missing fields.");
          const data = snapshot.data();
          const updates: any = {};
          
          const requiredFields = {
            dailyXP: 0,
            dailyCoins: 0,
            streakToday: 0,
            lastHighestStreak: 0,
            coins: 0,
            XP: 0,
            bonusClaimed: false,
            lastActiveDay: Timestamp.now(),
            lastStreakRecoveryUsed: null,
            vip: false,
            vipStreakRecoveryUsed: 0,
            vipRecoveryResetAt: null,
            lastResetAt: Timestamp.now(),
          };

          Object.entries(requiredFields).forEach(([field, defaultValue]) => {
            if (!Object.prototype.hasOwnProperty.call(data, field)) {
              updates[field] = defaultValue;
              console.log(`DailyChallenge: Missing field '${field}', setting to default value.`);
            }
          });

          if (Object.keys(updates).length > 0) {
            await updateDoc(userDocRef, updates);
            console.log("DailyChallenge: User document updated with missing fields.");
          }
        }
      } catch (error) {
        console.error("Error initializing user data:", error);
        Alert.alert(i18n.t('global.error'), i18n.t('daily_challenge.error_initializing_user_data_message'));
      }
    };

    if (currentUserUid) {
      initializeUserData();
    }
  }, [currentUserUid, db, ensureAuthenticated]);

  // 3. Real-time listener for user data
  useEffect(() => {
    console.log("DailyChallenge: Real-time user data listener useEffect triggered.");
    if (!currentUserUid) {
      console.log("DailyChallenge: No current user UID, skipping real-time user data listener.");
      return;
    }

    const userDocRef = doc(db, "users", currentUserUid);
    const unsubscribe = onSnapshot(
      userDocRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          console.log("DailyChallenge: User data updated by real-time listener.");
          
          // Update daily progress
          setDailyXP(data.dailyXP ?? 0);
          setDailyCoins(data.dailyCoins ?? 0);
          setBonusClaimed(data.bonusClaimed ?? false);
          console.log(`DailyChallenge: Daily progress updated - XP: ${data.dailyXP}, Coins: ${data.dailyCoins}, Bonus Claimed: ${data.bonusClaimed}`);

          // Update user data
          setUserData((prev: any) => ({
            ...prev,
            streakToday: data.streakToday ?? 0,
            lastHighestStreak: data.lastHighestStreak ?? 0,
            coins: data.coins ?? 0,
            XP: data.XP ?? 0,
            lastActiveDay: data.lastActiveDay ?? null,
            lastStreakRecoveryUsed: data.lastStreakRecoveryUsed ?? null,
            vip: data.vip ?? false,
            vipStreakRecoveryUsed: data.vipStreakRecoveryUsed ?? 0,
            vipRecoveryResetAt: data.vipRecoveryResetAt ?? null,
          }));
          console.log("DailyChallenge: User data state updated.");

          // Update streak recovery availability
          const isVIP = data.vip ?? false;
          if (isVIP) {
            const vipUsed = data.vipStreakRecoveryUsed || 0;
            const resetAt = data.vipRecoveryResetAt?.toDate?.() || null;
            const now = new Date();

            if (!resetAt || now > resetAt) {
              setCanRecoverStreak(true);
              console.log("DailyChallenge: VIP recovery cooldown passed, setting canRecoverStreak to true.");
            } else {
              setCanRecoverStreak(vipUsed < 2); // Assuming 2 max VIP uses
              console.log(`DailyChallenge: VIP recovery still on cooldown or max uses reached. canRecoverStreak: ${vipUsed < 2}`);
            }
          } else {
            setCanRecoverStreak(true); // Always true for non-VIP if coins are enough
            console.log("DailyChallenge: Not VIP, setting canRecoverStreak to true.");
          }
        }
      },
      (error) => {
        console.error("Error listening to user data:", error);
        Alert.alert(i18n.t('global.error'), i18n.t('daily_challenge.error_fetching_user_data_message'));
      }
    );
    return () => unsubscribe();
  }, [currentUserUid, db]);

  // 4. Daily reset check
  useEffect(() => {
    console.log("DailyChallenge: Daily reset check useEffect triggered.");
    if (currentUserUid) {
      checkDailyReset();
    }
  }, [currentUserUid, checkDailyReset]);

  // 5. Timer for daily reset
  useEffect(() => {
    console.log("DailyChallenge: Timer for daily reset useEffect triggered.");
    const interval = setInterval(() => {
      const newTimeLeft = getTimeUntilMidnight();
      setTimeLeft(newTimeLeft);
      
      if (newTimeLeft <= 1000 && newTimeLeft > -1000 && currentUserUid) {
        console.log("DailyChallenge: Time near midnight, triggering daily reset check.");
        checkDailyReset();
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [currentUserUid, checkDailyReset]);

  // 6. Monthly reset check
  useEffect(() => {
    console.log("DailyChallenge: Monthly reset check useEffect triggered.");
    if (currentUserUid && !monthlyResetChecked) {
      checkAndHandleMonthlyReset();
    }
  }, [currentUserUid, monthlyResetChecked, checkAndHandleMonthlyReset]);

  // 7. Fetch reward rules
  useEffect(() => {
    console.log("DailyChallenge: Fetch reward rules useEffect triggered.");
    const fetchRewardRules = async () => {
      if (!currentUserUid) {
        console.log("DailyChallenge: No current user UID, skipping reward rules fetch.");
        return;
      }
      
      try {
        setRewardRulesLoading(true);
        console.log("DailyChallenge: rewardRulesLoading set to true.");
        const rewardDocRef = doc(db, "config", "rewardRules");
        const rewardSnap = await getDoc(rewardDocRef);
        
        if (rewardSnap.exists()) {
          setRewardRules(rewardSnap.data());
          console.log("DailyChallenge: Reward rules fetched successfully.");
        } else {
          // Default values if document does not exist
          const defaultRules = {
            polls: { xpPerPoll: 30, coinsPerPoll: 50 },
            videos: { xpPerVideo: 50, coinsPerVideo: 100, watchPercentage: 80 },
            community: { meaningfulPostXP: 30, likesCoins: 50, repliesXP: 20, commentsCoins: 15 },
            bonusChest: { requiredDailyXP: 150, xp: 30, coins: 200 },
            xpCap: { daily: 500 },
            coinsCap: { daily: 1500 },
            streakRecovery: { coinsCost: 5000, vipMaxUses: 2, vipCooldownDays: 7 }
          };
          setRewardRules(defaultRules);
          console.log("DailyChallenge: Reward rules document not found, using default rules.");
        }
      } catch (error) {
        console.error("Error fetching rewardRules:", error);
        Alert.alert(i18n.t('global.error'), i18n.t('daily_challenge.error_fetching_reward_rules_message'));
      } finally {
        setRewardRulesLoading(false);
        console.log("DailyChallenge: rewardRulesLoading set to false.");
      }
    };

    if (currentUserUid) {
      fetchRewardRules();
    }
  }, [currentUserUid, db]);

  // 8. Bonus chest animation
  useEffect(() => {
    console.log("DailyChallenge: Bonus chest animation useEffect triggered.");
    if (!rewardRules) return;
    
    const requiredXP = parseInt(rewardRules?.bonusChest?.requiredDailyXP ?? "150");
    if (dailyXP >= requiredXP && !bonusClaimed) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(chestAnimation, {
            toValue: 1,
            duration: 800,
            useNativeDriver: false,
          }),
          Animated.timing(chestAnimation, {
            toValue: 0,
            duration: 1500,
            useNativeDriver: false,
          }),
        ])
      ).start();
      console.log("DailyChallenge: Bonus chest animation started (loop).");
    } else {
      chestAnimation.stopAnimation();
      chestAnimation.setValue(0);
      console.log("DailyChallenge: Bonus chest animation stopped and reset.");
    }
  }, [dailyXP, bonusClaimed, rewardRules, chestAnimation]);

  // 9. Fetch polls and videos after setup
  useEffect(() => {
    console.log("DailyChallenge: Fetch polls/videos after setup useEffect triggered.");
    if (currentUserUid && monthlyResetChecked && rewardRules && !rewardRulesLoading) {
      fetchDailyPolls();
      fetchDailyVideos();
      console.log("DailyChallenge: Initiated fetch for daily polls and videos.");
    }
  }, [currentUserUid, monthlyResetChecked, rewardRules, rewardRulesLoading, fetchDailyPolls, fetchDailyVideos]);

  // 10. App state listener for video playback
  useEffect(() => {
    console.log("DailyChallenge: App state listener useEffect for video playback triggered.");
    const subscription = AppState.addEventListener("change", async (nextAppState) => {
      console.log(`DailyChallenge: AppState changed to: ${nextAppState}`);
      if (nextAppState === "active" && videoModalVisible && playerRef.current && playing) {
        try {
          const currentTime = await playerRef.current.getCurrentTime?.();
          if (typeof currentTime === 'number' && !isNaN(currentTime)) {
            lastTimestampRef.current = currentTime;
            if (!watchInterval.current) {
              onChangeState("playing"); // Restart interval if active and playing
              console.log("DailyChallenge: App became active, restarting video watch interval.");
            }
          }
        } catch (err) {
          console.warn("Error getting current time on app state change:", err);
        }
      } else if (nextAppState !== "active" && watchInterval.current) {
        clearInterval(watchInterval.current);
        watchInterval.current = null;
        console.log("DailyChallenge: App became inactive, clearing video watch interval.");
      }
    });

    return () => subscription.remove();
  }, [videoModalVisible, playing, onChangeState]);

  // 11. Cleanup for video interval
  useEffect(() => {
    console.log("DailyChallenge: Video interval cleanup useEffect triggered.");
    return () => {
      if (watchInterval.current) {
        clearInterval(watchInterval.current);
        watchInterval.current = null;
        console.log("Cleanup: Video watch interval cleared on component unmount.");
      }
    };
  }, []);

  // RENDER
  if (isAuthLoading || rewardRulesLoading) {
    console.log("DailyChallenge: Displaying loading indicator.");
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#00FF9D" />
        <Text style={styles.loadingText}>{i18n.t('daily_challenge.loading_config')}</Text>
      </View>
    );
  }

  const targetXP = rewardRules?.xpCap?.daily ?? 500;
  const targetCoins = rewardRules?.coinsCap?.daily ?? 1500;
  console.log(`DailyChallenge: Render - Target XP: ${targetXP}, Target Coins: ${targetCoins}`);

  return (
    <ImageBackground
      source={require("../../../assets/images/bk20.png")}
      style={styles.background}
      resizeMode="cover"
    >
      <View style={styles.overlay} />
      <ScrollView contentContainerStyle={styles.container}>
        {/* Daily Streak Section */}
        <StreakDisplay
          streakToday={userData.streakToday}
          dailyXP={dailyXP}
          vip={userData.vip}
          vipStreakRecoveryUsed={userData.vipStreakRecoveryUsed}
          canRecoverStreak={canRecoverStreak}
          recoverStreak={recoverStreak}
          rewardRules={rewardRules}
          userCoins={userData.coins}
        />

        {/* Reset Timer Section */}
        <ResetTimerDisplay
          timeLeft={timeLeft}
          formatTime={formatTime}
        />

        {/* Tabs Navigation */}
        <TabsNavigation
          activeTab={activeTab}
          setActiveTab={(tab) => {
            console.log(`DailyChallenge: Tab changed to: ${tab}`);
            setActiveTab(tab);
          }}
        />

        {/* Polls Tab Content */}
        {activeTab === "polls" && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{i18n.t('daily_challenge.poll_section_title')}</Text>
            {!pollsLoaded ? (
              <Text style={styles.loadingText}>{i18n.t('daily_challenge.loading_polls')}</Text>
            ) : polls.length === 0 ? (
              <View style={styles.pollCompletionCard}>
                <Text style={styles.pollCompleteTitle}>{i18n.t('daily_challenge.poll_completed_title')}</Text>
                <Text style={styles.pollCompleteMessage}>
                  {i18n.t('daily_challenge.poll_completed_message')}
                </Text>
              </View>
            ) : (
              polls.map((poll) => (
                <PollCard
                  key={poll.id}
                  poll={poll}
                  onVote={handleVote}
                />
              ))
            )}
          </View>
        )}


        {/* TEMPORARY TEST BUTTONS - REMOVE AFTER TESTING */}
        {__DEV__ && (
          <View style={{ padding: 20, backgroundColor: 'rgba(255,0,0,0.3)', margin: 10 }}>
            <Text style={{ color: 'white', fontSize: 16, marginBottom: 10 }}>
              ⚙️ STREAK TESTING (DEV ONLY)
            </Text>
            <Text style={{ color: 'white', fontSize: 12, marginBottom: 10 }}>
              Current: {userData.streakToday} | Highest: {userData.lastHighestStreak} | Daily XP: {dailyXP}
            </Text>
            
            <TouchableOpacity 
              style={{ backgroundColor: '#ff6b6b', padding: 10, margin: 5, borderRadius: 5 }}
              onPress={() => {
                console.log("DailyChallenge: Test button pressed: Miss 1 Day + Meet XP");
                testStreakLogic(1, 200); // Miss 1 day, meet XP
              }}
            >
              <Text style={{ color: 'white', textAlign: 'center' }}>
                Test: Miss 1 Day + Meet XP (should +1 streak)
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={{ backgroundColor: '#ffa502', padding: 10, margin: 5, borderRadius: 5 }}
              onPress={() => {
                console.log("DailyChallenge: Test button pressed: Miss 1 Day + Low XP");
                testStreakLogic(1, 50); // Miss 1 day, don't meet XP
              }}
            >
              <Text style={{ color: 'white', textAlign: 'center' }}>
                Test: Miss 1 Day + Low XP (should -1 streak)
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={{ backgroundColor: '#2ed573', padding: 10, margin: 5, borderRadius: 5 }}
              onPress={() => {
                console.log("DailyChallenge: Test button pressed: Miss 3 Days + Meet XP");
                testStreakLogic(3, 200); // Miss 3 days, meet XP
              }}
            >
              <Text style={{ color: 'white', textAlign: 'center' }}>
                Test: Miss 3 Days + Meet XP (should reset to 1)
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={{ backgroundColor: '#1e90ff', padding: 10, margin: 5, borderRadius: 5 }}
              onPress={() => {
                console.log("DailyChallenge: Test button pressed: Miss 3 Days + Low XP");
                testStreakLogic(3, 50); // Miss 3 days, don't meet XP
              }}
            >
              <Text style={{ color: 'white', textAlign: 'center' }}>
                Test: Miss 3 Days + Low XP (should reset to 0)
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Videos Tab Content */}
        {activeTab === "videos" && (
          <View style={styles.section}>
            <Text style={styles.videoInfoTitle}>{i18n.t('daily_challenge.video_section_title')}</Text>
            <Text style={styles.videoInfoText}>
              {i18n.t('daily_challenge.video_section_description')}
            </Text>
            {!videosLoaded ? (
              <Text style={styles.loadingText}>{i18n.t('daily_challenge.loading')}</Text>
            ) : videos.length === 0 ? (
              <Text style={styles.emptyText}>{i18n.t('daily_challenge.no_new_videos')}</Text>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {videos.map((video) => (
                  <VideoCard
                    key={video.id}
                    video={video}
                    watchedVideoIds={watchedVideoIds}
                    onPress={openVideoModal}
                  />
                ))}
              </ScrollView>
            )}
          </View>
        )}

        {/* Community Tab Content */}
        {activeTab === "community" && (
          <View style={styles.rewardCard}>
            <Text style={styles.rewardTitle}>{i18n.t('daily_challenge.how_to_earn_rewards_title')}</Text>
            <View style={styles.rewardList}>
              <Text style={styles.rewardLine}>
                {i18n.t('daily_challenge.community_meaningful_post')}
                <Text style={styles.rewardAmount}>+{rewardRules?.community?.meaningfulPostXP ?? 30} XP</Text>
              </Text>
              <Text style={styles.rewardLine}>
                {i18n.t('daily_challenge.community_get_likes')}
                <Text style={styles.rewardAmount}>+{rewardRules?.community?.likesCoins ?? 50} Coins</Text>
              </Text>
              <Text style={styles.rewardLine}>
                {i18n.t('daily_challenge.community_reply_users')}
                <Text style={styles.rewardAmount}>+{rewardRules?.community?.repliesXP ?? 20} XP</Text>
              </Text>
              <Text style={styles.rewardLine}>
                {i18n.t('daily_challenge.community_receive_comment')}
                <Text style={styles.rewardAmount}>+{rewardRules?.community?.commentsCoins ?? 15} Coins</Text>
              </Text>
            </View>
          </View>
        )}

        {/* Bonus Chest Section */}
        <BonusChestSection
          dailyXP={dailyXP}
          bonusClaimed={bonusClaimed}
          rewardRules={rewardRules}
          handleClaimBonus={handleClaimBonus}
          chestAnimation={chestAnimation}
          sparkleAnim={sparkleAnim} // Pass the Animated.Value
        />

        {/* Progress Bars */}
        <ProgressBars
          dailyXP={dailyXP}
          targetXP={targetXP}
          dailyCoins={dailyCoins}
          targetCoins={targetCoins}
        />
      </ScrollView>

      {/* Video Player Modal */}
      <VideoPlayerModal
        visible={videoModalVisible}
        onClose={() => {
          console.log("DailyChallenge: Video modal closed.");
          setVideoModalVisible(false);
        }}
        currentVideo={currentVideo}
        playerRef={playerRef}
        playing={playing}
        onReady={onReady}
        onChangeState={onChangeState}
        videoDuration={videoDuration}
        videoProgress={videoProgress}
        handleVideoCompletion={handleVideoCompletion}
      />

      {/* XP/Reward Animation Overlay */}
      {(showXPAnimation || rewardPopupVisible) && (
        <View style={styles.animationAnchor}>
          {showXPAnimation && <XPAnimation amount={earnedPollXP} />}
          {rewardPopupVisible && <RewardPopup amount={earnedPollCoins} type="coins" />}
        </View>
      )}
    </ImageBackground>
  );
};

// STYLES
const styles = StyleSheet.create({
  background: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  container: {
    padding: 20,
    paddingBottom: 40,
    minHeight: "100%",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0a1720',
  },
  loadingText: {
    color: '#00FF9D',
    marginTop: 10,
    fontSize: 16,
    textAlign: "center",
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 10,
    textShadowColor: "#000",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  emptyText: {
    color: "#fff",
    textAlign: "center",
    fontSize: 16,
  },
  pollCompletionCard: {
    backgroundColor: "#122433",
    padding: 20,
    borderRadius: 12,
    alignItems: "center",
    shadowColor: "#00FF9D",
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    marginHorizontal: 8,
  },
  pollCompleteTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#00FF9D",
    marginBottom: 8,
  },
  pollCompleteMessage: {
    color: "#fff",
    fontSize: 15,
    textAlign: "center",
  },
  videoInfoTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 4,
    textAlign: "center",
  },
  videoInfoText: {
    fontSize: 14,
    color: "#ccc",
    textAlign: "center",
    lineHeight: 20,
  },
  rewardCard: {
    backgroundColor: "rgba(0, 20, 30, 0.7)",
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
    shadowColor: "#00FF9D",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    borderWidth: 1,
    borderColor: "#00FF9D33",
  },
  rewardTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 10,
    textAlign: "center",
  },
  rewardList: {
    gap: 10,
  },
  rewardLine: {
    color: "#ccc",
    fontSize: 15,
    lineHeight: 20,
  },
  rewardAmount: {
    color: "#00FF9D",
    fontWeight: "600",
  },
  animationAnchor: {
    position: 'absolute',
    top: SCREEN_HEIGHT / 2 - 40,
    left: SCREEN_WIDTH / 2 - 60,
    zIndex: 999,
  },
});

export default DailyChallenges;