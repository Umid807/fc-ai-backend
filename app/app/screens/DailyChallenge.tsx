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
import StreakDisplay from "../../components/DailyChallenges/StreakDisplay";
import ResetTimerDisplay from "../../components/DailyChallenges/ResetTimerDisplay";
import TabsNavigation from "../../components/DailyChallenges/TabsNavigation";
import PollCard from "../../components/DailyChallenges/PollCard";
import VideoCard from "../../components/DailyChallenges/VideoCard";
import BonusChestSection from "../../components/DailyChallenges/BonusChestSection";
import ProgressBars from "../../components/DailyChallenges/ProgressBars";
import VideoPlayerModal from "../../components/DailyChallenges/VideoPlayerModal";
import XPAnimation from "../../components/XPAnimation";
import RewardPopup from "../../components/RewardPopup";

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
  const now = new Date();
  const midnight = new Date();
  midnight.setHours(24, 0, 0, 0);
  return midnight.getTime() - now.getTime();
};

const formatTime = (milliseconds: number): string => {
  const totalSeconds = Math.floor(milliseconds / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${hours.toString().padStart(2, "0")}:${minutes
    .toString()
    .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
};

// MAIN COMPONENT
const DailyChallenges: React.FC = () => {
  const router = useRouter();
  const db = getFirestore();
  const rtdb = getDatabase();

  // AUTH STATE
  const [currentUserUid, setCurrentUserUid] = useState<string | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

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

  // REWARD RULES STATE
  const [rewardRules, setRewardRules] = useState<any>(null);
  const [rewardRulesLoading, setRewardRulesLoading] = useState(true);

  // DAILY PROGRESS STATE
  const [dailyXP, setDailyXP] = useState<number>(0);
  const [dailyCoins, setDailyCoins] = useState<number>(0);
  const [bonusClaimed, setBonusClaimed] = useState(false);

  // POLLS STATE
  const [polls, setPolls] = useState<Poll[]>([]);
  const [pollsLoaded, setPollsLoaded] = useState(false);

  // VIDEOS STATE
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [videosLoaded, setVideosLoaded] = useState(false);
  const [watchedVideoIds, setWatchedVideoIds] = useState<string[]>([]);

  // VIDEO PLAYER STATE
  const [videoModalVisible, setVideoModalVisible] = useState(false);
  const [currentVideo, setCurrentVideo] = useState<VideoItem | null>(null);
  const [playing, setPlaying] = useState(true);
  const [videoDuration, setVideoDuration] = useState(0);
  const [hasCompletedVideo, setHasCompletedVideo] = useState(false);
  const [videoProgress, setVideoProgress] = useState(0);

  // ANIMATION STATE
  const [showXPAnimation, setShowXPAnimation] = useState(false);
  const [rewardPopupVisible, setRewardPopupVisible] = useState(false);
  const [earnedPollXP, setEarnedPollXP] = useState(0);
  const [earnedPollCoins, setEarnedPollCoins] = useState(0);

  // UI STATE
  const [activeTab, setActiveTab] = useState<"polls" | "videos" | "community">("polls");
  const [timeLeft, setTimeLeft] = useState(getTimeUntilMidnight());
  const [canRecoverStreak, setCanRecoverStreak] = useState(true);
  const [streakCheckedToday, setStreakCheckedToday] = useState(false);
  const [monthlyResetChecked, setMonthlyResetChecked] = useState(false);

  // REFS
  const playerRef = useRef<any>(null);
  const totalWatchedRef = useRef(0);
  const lastTimestampRef = useRef(0);
  const watchInterval = useRef<NodeJS.Timeout | null>(null);
  const sparkleAnim = useRef(new Animated.Value(0)).current;
  const chestAnimation = useRef(new Animated.Value(0)).current;

  // AUTHENTICATION GUARD
  const ensureAuthenticated = useCallback(() => {
    if (!currentUserUid) {
      Alert.alert(i18n.t('global.error'), i18n.t('global.unauthenticated_action_message'));
      router.replace('/login');
      return false;
    }
    return true;
  }, [currentUserUid, router]);

  // VIDEO HANDLING
  const handleVideoCompletion = useCallback(async () => {
    if (!ensureAuthenticated() || !currentUserUid || !currentVideo || hasCompletedVideo) return;

    const multiplier = userData.streakToday === 7 ? 1.5 : 1;
    const xpEarned = Math.round((rewardRules?.videos?.xpPerVideo ?? 50) * multiplier);
    const coinsEarned = Math.round((rewardRules?.videos?.coinsPerVideo ?? 100) * multiplier);

    const userDocRef = doc(db, "users", currentUserUid);

    try {
      // Server-side check if video was already watched
      const watchedVideoRef = doc(db, "users", currentUserUid, "watchedVideos", currentVideo.id);
      const watchedSnap = await getDoc(watchedVideoRef);

      if (watchedSnap.exists()) {
        console.log("❌ Video already watched (server-side check). No reward.");
        setVideos((prev) =>
          prev.map((v) => (v.id === currentVideo.id ? { ...v, watched: true } : v))
        );
        return;
      }

      // Record watched video and update user rewards
      await setDoc(watchedVideoRef, {
        videoId: currentVideo.id,
        watchedAt: Timestamp.now(),
        completed: true,
        xpEarned,
        coinsEarned,
      });

      const userSnap = await getDoc(userDocRef);
      const currentData = userSnap.data();
      if (!currentData) throw new Error("User data not found for reward update.");

      const newDailyXP = Math.min((currentData.dailyXP || 0) + xpEarned, rewardRules?.xpCap?.daily ?? 300);
      const newDailyCoins = (currentData.dailyCoins || 0) + coinsEarned;
      const newTotalXP = (currentData.XP || 0) + xpEarned;
      const newTotalCoins = (currentData.coins || 0) + coinsEarned;

      await updateDoc(userDocRef, {
        dailyXP: newDailyXP,
        dailyCoins: newDailyCoins,
        XP: newTotalXP,
        coins: newTotalCoins,
        lastVideosCompletedAt: Timestamp.now(),
      });

      // Update local state
      setVideos((prev) =>
        prev.map((v) => (v.id === currentVideo.id ? { ...v, watched: true } : v))
      );
      setWatchedVideoIds((prev) => [...prev, currentVideo.id]);

      // Trigger animations
      setEarnedPollXP(xpEarned);
      setEarnedPollCoins(coinsEarned);
      setShowXPAnimation(true);
      setRewardPopupVisible(true);
      setTimeout(() => setShowXPAnimation(false), 1500);
      setTimeout(() => setRewardPopupVisible(false), 2000);

      setHasCompletedVideo(true);
      console.log("🎉 Video reward granted!");

    } catch (err) {
      console.error("❌ Failed to complete video:", err);
      Alert.alert(i18n.t('daily_challenge.error_completing_video_title'), i18n.t('daily_challenge.error_completing_video_message'));
    }
  }, [currentUserUid, currentVideo, hasCompletedVideo, rewardRules, userData.streakToday, db, ensureAuthenticated]);

  const onChangeState = useCallback((stateChange: string) => {
    if (stateChange === "paused" || stateChange === "ended") {
      if (watchInterval.current) {
        clearInterval(watchInterval.current);
        watchInterval.current = null;
      }
      setPlaying(false);
    } else if (stateChange === "playing" && !watchInterval.current) {
      setPlaying(true);
      watchInterval.current = setInterval(async () => {
        try {
          const currentTime = await playerRef.current?.getCurrentTime?.();
          if (typeof currentTime !== 'number' || isNaN(currentTime)) return;

          const delta = currentTime - lastTimestampRef.current;

          if (delta > 0 && delta < 3) {
            totalWatchedRef.current += delta;
          } else if (delta < 0) {
            lastTimestampRef.current = currentTime;
          }

          lastTimestampRef.current = currentTime;

          if (videoDuration > 0) {
            const progress = (totalWatchedRef.current / videoDuration) * 100;
            setVideoProgress(progress);

            if (progress >= (rewardRules?.videos?.watchPercentage || 80) && !hasCompletedVideo) {
              handleVideoCompletion();
            }
          }
        } catch (err) {
          console.warn("⚠️ Tracker error:", err);
          if (watchInterval.current) {
            clearInterval(watchInterval.current);
            watchInterval.current = null;
          }
        }
      }, 1000);
    }
  }, [videoDuration, hasCompletedVideo, rewardRules, handleVideoCompletion]);

  const onReady = useCallback(async () => {
    if (!playerRef.current) return;
    
    try {
      const duration = await playerRef.current.getDuration();
      if (typeof duration === 'number' && !isNaN(duration) && duration > 0) {
        setVideoDuration(duration);
        console.log("Video ready. Duration:", duration);
      }
    } catch (error) {
      console.warn("Error getting video duration:", error);
    }
  }, []);

  const openVideoModal = useCallback((video: VideoItem) => {
    setCurrentVideo(video);
    setVideoModalVisible(true);
    setHasCompletedVideo(false);
    setVideoProgress(0);
    totalWatchedRef.current = 0;
    lastTimestampRef.current = 0;
    
    if (watchInterval.current) {
      clearInterval(watchInterval.current);
      watchInterval.current = null;
    }
  }, []);

  // DAILY RESET & STREAK MANAGEMENT
  const checkDailyReset = useCallback(async () => {
    if (!currentUserUid) return;

    try {
      const userDocRef = doc(db, "users", currentUserUid);
      const userSnap = await getDoc(userDocRef);
      if (!userSnap.exists()) return;

      const data = userSnap.data();
      const lastActive = data.lastActiveDay?.toDate?.();
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (!lastActive || lastActive.toDateString() !== today.toDateString()) {
        await updateDoc(userDocRef, {
          dailyXP: 0,
          dailyCoins: 0,
          bonusClaimed: false,
          lastActiveDay: Timestamp.fromDate(today),
        });

        setDailyXP(0);
        setDailyCoins(0);
        setBonusClaimed(false);
        setStreakCheckedToday(false);
      } else {
        setStreakCheckedToday(true);
      }
    } catch (err) {
      console.error("checkDailyReset error:", err);
      Alert.alert(i18n.t('global.error'), i18n.t('daily_challenge.error_daily_reset_check'));
    }
  }, [currentUserUid, db]);

const updateStreakOnXpEarned = useCallback(async (xpAmount: number, currentStreakVal: number, lastActiveDayVal: Timestamp | null) => {
  if (!currentUserUid) return;

  try {
    const userDocRef = doc(db, "users", currentUserUid);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const lastActive = lastActiveDayVal?.toDate?.();
    lastActive?.setHours(0, 0, 0, 0);

    let newStreak = currentStreakVal;
    const threshold = parseInt(rewardRules?.bonusChest?.requiredDailyXP ?? "150");

    if (!lastActive) {
      // First time user - start streak if XP threshold met
      newStreak = xpAmount >= threshold ? 1 : 0;
    } else {
      const diff = today.getTime() - lastActive.getTime();
      const daysSinceLastActive = Math.round(diff / (1000 * 60 * 60 * 24));

      if (daysSinceLastActive === 0) {
        // Same day - no streak change, just check if they met today's XP target
        console.log("Streak update skipped: Same day.");
        return; // Don't update streak for same day
      } else if (daysSinceLastActive === 1) {
        // Yesterday was last active - normal progression/regression
        if (xpAmount >= threshold) {
          // Met today's XP target - continue/increase streak
          newStreak = Math.min(currentStreakVal + 1, 7); // Increase streak, cap at 7
        } else {
          // Didn't meet today's XP target - lose 1 streak (YOUR INTENDED LOGIC)
          newStreak = Math.max(currentStreakVal - 1, 0); // Lose 1 streak, minimum 0
        }
      } else {
        // 2+ days missed - reset to 0 (YOUR INTENDED LOGIC)
        if (xpAmount >= threshold) {
          newStreak = 1; // Start fresh with 1 if they meet XP target today
        } else {
          newStreak = 0; // Stay at 0 if they don't meet XP target
        }
      }
    }

    // Update the highest streak if current streak is higher
    const lastHighestStreak = Math.max(userData.lastHighestStreak || 0, newStreak);

    await updateDoc(userDocRef, {
      streakToday: newStreak,
      lastHighestStreak,
      lastActiveDay: Timestamp.fromDate(today),
    });
    
    console.log(`✅ Streak updated: ${currentStreakVal} → ${newStreak} (Highest: ${lastHighestStreak})`);

  } catch (error) {
    console.error("Error updating streak:", error);
    Alert.alert(i18n.t('global.error'), i18n.t('daily_challenge.error_updating_streak_message'));
  }
}, [currentUserUid, db, userData.lastHighestStreak, rewardRules, ensureAuthenticated]);

//  test function after your existing functions (around line 400, after recoverStreak function):

const testStreakLogic = useCallback(async (daysMissed: number, currentXP: number) => {
  if (!currentUserUid) return;

  try {
    const userDocRef = doc(db, "users", currentUserUid);
    
    // Simulate different lastActiveDay scenarios
    const testDate = new Date();
    testDate.setDate(testDate.getDate() - daysMissed); // Go back X days
    testDate.setHours(0, 0, 0, 0);
    
    console.log(`🧪 TESTING: ${daysMissed} days missed, ${currentXP} XP earned today`);
    console.log(`📅 Simulating lastActiveDay: ${testDate.toDateString()}`);
    console.log(`📊 Current streak before test: ${userData.streakToday}`);
    
    // Call your streak update function with test data
    await updateStreakOnXpEarned(
      currentXP, 
      userData.streakToday, 
      Timestamp.fromDate(testDate)
    );
    
    console.log(`✅ Test completed. Check your streak in the UI!`);
    
  } catch (error) {
    console.error("Test error:", error);
  }
}, [currentUserUid, userData.streakToday, updateStreakOnXpEarned, db]);

  // POLL HANDLING
  const handleVote = useCallback(async (pollId: string, choice: string) => {
    if (!ensureAuthenticated() || !currentUserUid) return;

    const currentPoll = polls.find(p => p.id === pollId);
    if (currentPoll?.voted) return;

    const streakMultiplier = userData.streakToday === 7 ? 1.5 : 1;
    const rewardXP = Math.round((rewardRules?.polls?.xpPerPoll ?? 30) * streakMultiplier);
    const rewardCoins = Math.round((rewardRules?.polls?.coinsPerPoll ?? 50) * streakMultiplier);

    const userDocRef = doc(db, "users", currentUserUid);
    const pollHistoryDocRef = doc(db, "users", currentUserUid, "pollHistory", pollId);

    try {
      const pollHistorySnap = await getDoc(pollHistoryDocRef);
      if (pollHistorySnap.exists()) {
        Alert.alert(i18n.t('daily_challenge.already_voted_title'), i18n.t('daily_challenge.already_voted_message'));
        setPolls(prevPolls => prevPolls.map(p => p.id === pollId ? { ...p, voted: true, selectedChoice: choice } : p));
        return;
      }

      await setDoc(pollHistoryDocRef, {
        selectedChoice: choice,
        votedAt: Timestamp.now(),
      });

      const userSnap = await getDoc(userDocRef);
      const currentData = userSnap.data();

      const newDailyXP = Math.min((currentData?.dailyXP || 0) + rewardXP, rewardRules?.xpCap?.daily ?? 300);
      const newDailyCoins = (currentData?.dailyCoins || 0) + rewardCoins;
      const newTotalXP = (currentData?.XP || 0) + rewardXP;
      const newTotalCoins = (currentData?.coins || 0) + rewardCoins;

      await updateDoc(userDocRef, {
        dailyXP: newDailyXP,
        dailyCoins: newDailyCoins,
        XP: newTotalXP,
        coins: newTotalCoins,
      });

      setEarnedPollXP(rewardXP);
      setEarnedPollCoins(rewardCoins);
      setShowXPAnimation(true);
      setRewardPopupVisible(true);

      setTimeout(() => setShowXPAnimation(false), 1500);
      setTimeout(() => setRewardPopupVisible(false), 2000);

      setPolls(prevPolls => {
        const updatedPolls = prevPolls.map((poll) =>
          poll.id === pollId ? { ...poll, voted: true, selectedChoice: choice } : poll
        );
        
        const allVoted = updatedPolls.every((p) => p.voted);
        if (allVoted) {
          updateDoc(userDocRef, { lastPollsCompletedAt: Timestamp.now() })
            .catch((err) => console.error("❌ Error updating lastPollsCompletedAt:", err));
        }
        
        return updatedPolls;
      });

    } catch (err) {
      console.error("❌ handleVote error:", err);
      Alert.alert(i18n.t('daily_challenge.error_submitting_vote'), i18n.t('daily_challenge.error_submitting_vote_message'));
    }
  }, [currentUserUid, polls, rewardRules, userData.streakToday, db, ensureAuthenticated]);

  // STREAK RECOVERY
  const recoverStreak = useCallback(async () => {
    if (!ensureAuthenticated() || !currentUserUid) return;

    try {
      const userDocRef = doc(db, "users", currentUserUid);
      const userSnap = await getDoc(userDocRef);
      if (!userSnap.exists()) return;

      const data = userSnap.data();
      const isVIP = data.vip === true;
      const now = new Date();
      const userCoins = data.coins || 0;
      const cost = rewardRules?.streakRecovery?.coinsCost || 5000;

      if (isVIP) {
        const vipUsed = data.vipStreakRecoveryUsed || 0;
        const vipResetAt = data.vipRecoveryResetAt?.toDate?.() || null;

        let canUseFree = true;
        if (vipResetAt && now < vipResetAt && vipUsed >= (rewardRules?.streakRecovery?.vipMaxUses || 2)) {
          canUseFree = false;
        }

        if (vipResetAt && now > vipResetAt) {
          await updateDoc(userDocRef, { vipStreakRecoveryUsed: 0 });
          canUseFree = true;
        }

        if (canUseFree && vipUsed < (rewardRules?.streakRecovery?.vipMaxUses || 2)) {
          await updateDoc(userDocRef, {
            streakToday: 7,
            lastHighestStreak: Math.max(data.lastHighestStreak || 0, 7),
            lastStreakRecoveryUsed: Timestamp.fromDate(now),
            vipStreakRecoveryUsed: vipUsed + 1,
            vipRecoveryResetAt: Timestamp.fromDate(new Date(now.getTime() + (rewardRules?.streakRecovery?.vipCooldownDays || 7) * 24 * 60 * 60 * 1000)),
          });
          setCanRecoverStreak(false);
          Alert.alert(i18n.t('daily_challenge.vip_recovery_alert_title'), i18n.t('daily_challenge.vip_recovery_alert_message'));
          return;
        }
      }

      if (userCoins < cost) {
        Alert.alert(i18n.t('daily_challenge.not_enough_coins_title'), i18n.t('daily_challenge.not_enough_coins_message', { cost }));
        return;
      }

      await updateDoc(userDocRef, {
        coins: userCoins - cost,
        streakToday: 7,
        lastHighestStreak: Math.max(data.lastHighestStreak || 0, 7),
        lastStreakRecoveryUsed: Timestamp.fromDate(now),
      });
      
      setCanRecoverStreak(false);
      Alert.alert(i18n.t('daily_challenge.streak_recovered_alert_title'), i18n.t('daily_challenge.streak_recovered_alert_message', { cost }));
    } catch (err) {
      console.error("❌ Failed to recover streak:", err);
      Alert.alert(i18n.t('daily_challenge.error_recovering_streak_title'), i18n.t('daily_challenge.error_recovering_streak_message'));
    }
  }, [currentUserUid, rewardRules, db, ensureAuthenticated]);

  // BONUS CHEST
  const handleClaimBonus = useCallback(async () => {
    if (!ensureAuthenticated() || !currentUserUid || bonusClaimed) return;

    const requiredXP = parseInt(rewardRules?.bonusChest?.requiredDailyXP ?? "150");
    if (dailyXP < requiredXP) {
      Alert.alert(i18n.t('daily_challenge.bonus_not_ready_title'), i18n.t('daily_challenge.bonus_not_ready_message', { xpNeeded: requiredXP }));
      return;
    }

    try {
      const userDocRef = doc(db, "users", currentUserUid);
      const streakMultiplier = userData.streakToday === 7 ? 1.5 : 1;
      const chestXP = Math.round((rewardRules?.bonusChest?.xp ?? 30) * streakMultiplier);
      const chestCoins = Math.round((rewardRules?.bonusChest?.coins ?? 200) * streakMultiplier);

      const userSnap = await getDoc(userDocRef);
      const currentData = userSnap.data();
      if (!currentData) throw new Error("User data not found for bonus claim.");

      const newDailyXP = Math.min((currentData.dailyXP || 0) + chestXP, rewardRules?.xpCap?.daily ?? 300);
      const newDailyCoins = (currentData.dailyCoins || 0) + chestCoins;
      const newTotalXP = (currentData.XP || 0) + chestXP;
      const newTotalCoins = (currentData.coins || 0) + chestCoins;

      await updateDoc(userDocRef, {
        dailyXP: newDailyXP,
        dailyCoins: newDailyCoins,
        XP: newTotalXP,
        coins: newTotalCoins,
        bonusClaimed: true,
      });

      setBonusClaimed(true);

      sparkleAnim.setValue(0);
      Animated.timing(sparkleAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: false,
      }).start();

      setEarnedPollXP(chestXP);
      setEarnedPollCoins(chestCoins);
      setShowXPAnimation(true);
      setRewardPopupVisible(true);
      setTimeout(() => setShowXPAnimation(false), 1500);
      setTimeout(() => setRewardPopupVisible(false), 2000);

    } catch (error) {
      console.error("Bonus claim failed:", error);
      Alert.alert(i18n.t('daily_challenge.bonus_claim_failed_title'), i18n.t('daily_challenge.bonus_claim_failed_message'));
    }
  }, [currentUserUid, bonusClaimed, dailyXP, rewardRules, userData.streakToday, db, ensureAuthenticated, sparkleAnim]);

  // DATA FETCHING
  const fetchDailyPolls = useCallback(async () => {
    if (!ensureAuthenticated() || !currentUserUid) return;

    try {
      setPollsLoaded(false);
      
      const userDocRef = doc(db, "users", currentUserUid);
      const userSnapshot = await getDoc(userDocRef);
      const docData = userSnapshot.data();
      const lastCompleted = docData?.lastPollsCompletedAt?.toDate?.() || null;
      const today = new Date();

      if (lastCompleted && lastCompleted.toDateString() === today.toDateString()) {
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

      const pollHistoryRef = collection(db, "users", currentUserUid, "pollHistory");
      const historySnapshot = await getDocs(pollHistoryRef);
      const seenPollIds = historySnapshot.docs.map((d) => d.id);

      const unseenPolls = activePolls.filter((p) => !seenPollIds.includes(p.id));

      if (unseenPolls.length === 0) {
        await updateDoc(userDocRef, { lastPollsCompletedAt: Timestamp.now() });
        setPolls([]);
      } else {
        // Shuffle and select polls
        for (let i = unseenPolls.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [unseenPolls[i], unseenPolls[j]] = [unseenPolls[j], unseenPolls[i]];
        }
        const selectedPolls = unseenPolls.slice(0, 2);
        setPolls(selectedPolls.map((p) => ({ ...p, voted: false })));
      }
    } catch (error) {
      console.error("Error fetching polls:", error);
      Alert.alert(i18n.t('global.error'), i18n.t('daily_challenge.error_fetching_polls_message'));
    } finally {
      setPollsLoaded(true);
    }
  }, [currentUserUid, db, ensureAuthenticated]);

  const fetchDailyVideos = useCallback(async () => {
    if (!ensureAuthenticated() || !currentUserUid) return;

    try {
      setVideosLoaded(false);
      
      const videosRef = ref(rtdb, "dailychallengevideos");
      const snap = await get(videosRef);
      if (!snap.exists()) {
        setVideos([]);
        setVideosLoaded(true);
        return;
      }

      const data = snap.val();
      const allVideos = Object.keys(data).map((key) => ({
        id: key,
        title: data[key].title,
        thumbnailUrl: data[key].thumbnail_url,
        youtubeUrl: data[key].video_url,
        rewardXP: data[key].rewardXP || rewardRules?.videos?.xpPerVideo || 50,
        rewardCoins: data[key].rewardCoins || rewardRules?.videos?.coinsPerVideo || 100,
        watched: false,
      }));

      const videoHistoryRef = collection(db, "users", currentUserUid, "watchedVideos");
      const historySnap = await getDocs(videoHistoryRef);
      const seenVideoIds = historySnap.docs.map((d) => d.id);
      setWatchedVideoIds(seenVideoIds);

      const unseenVideos = allVideos.filter((v) => !seenVideoIds.includes(v.id));

      if (unseenVideos.length === 0) {
        setVideos([]);
      } else {
        // Shuffle and select videos
        for (let i = unseenVideos.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [unseenVideos[i], unseenVideos[j]] = [unseenVideos[j], unseenVideos[i]];
        }
        const selectedVideos = unseenVideos.slice(0, 2);
        setVideos(selectedVideos.map((v) => ({ ...v, watched: seenVideoIds.includes(v.id) })));
      }
    } catch (error) {
      console.error("Error fetching videos:", error);
      Alert.alert(i18n.t('global.error'), i18n.t('daily_challenge.error_fetching_videos_message'));
    } finally {
      setVideosLoaded(true);
    }
  }, [currentUserUid, rewardRules, db, rtdb, ensureAuthenticated]);

  const checkAndHandleMonthlyReset = useCallback(async () => {
    if (!currentUserUid) return;

    try {
      const userDocRef = doc(db, "users", currentUserUid);
      const userSnap = await getDoc(userDocRef);
      if (!userSnap.exists()) return;

      const data = userSnap.data();
      const lastResetAt: Timestamp | null = data.lastResetAt || null;
      const now = Timestamp.now();
      const thirtyDays = 30 * 24 * 60 * 60 * 1000;

      if (!lastResetAt || now.toMillis() - lastResetAt.toMillis() > thirtyDays) {
        console.log("Performing monthly reset...");
        
        // Clear poll and video history (simple approach)
        const pollHistoryRef = collection(db, "users", currentUserUid, "pollHistory");
        const videoHistoryRef = collection(db, "users", currentUserUid, "watchedVideos");

        const [pollSnapshot, videoSnapshot] = await Promise.all([
          getDocs(pollHistoryRef),
          getDocs(videoHistoryRef)
        ]);

        // Delete documents in batches
        const deletePromises = [
          ...pollSnapshot.docs.map(doc => doc.ref.delete()),
          ...videoSnapshot.docs.map(doc => doc.ref.delete())
        ];

        await Promise.all(deletePromises);
        await updateDoc(userDocRef, { lastResetAt: now });

        // Re-fetch data after reset
        fetchDailyPolls();
        fetchDailyVideos();
      }
    } catch (error) {
      console.error("Error handling monthly reset:", error);
      Alert.alert(i18n.t('global.error'), i18n.t('daily_challenge.error_monthly_reset_check'));
    } finally {
      setMonthlyResetChecked(true);
    }
  }, [currentUserUid, db, fetchDailyPolls, fetchDailyVideos]);





  

  // EFFECTS

useEffect(() => {
  if (currentUserUid && userData.lastActiveDay !== null && !streakCheckedToday && rewardRules) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const lastActive = new Date(userData.lastActiveDay.toDate());
    lastActive.setHours(0, 0, 0, 0);

    const sameDay = today.toDateString() === lastActive.toDateString();

    if (!sameDay) {
      console.log("Streak Check Effect: Different day, triggering streak update.");
      updateStreakOnXpEarned(dailyXP, userData.streakToday, userData.lastActiveDay).then(() => {
        setStreakCheckedToday(true);
      });
    } else {
      setStreakCheckedToday(true);
      console.log("Streak Check Effect: Same day, marking streak as checked.");
    }
  }
}, [dailyXP, userData.lastActiveDay, userData.streakToday, currentUserUid, streakCheckedToday, rewardRules, updateStreakOnXpEarned]);


  // 1. Auth state observer
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(user => {
      if (user) {
        setCurrentUserUid(user.uid);
      } else {
        setCurrentUserUid(null);
        router.replace('/login');
      }
      setIsAuthLoading(false);
    });
    return () => unsubscribe();
  }, [router]);

  // 2. Initialize user data
  useEffect(() => {
    const initializeUserData = async () => {
      if (!ensureAuthenticated() || !currentUserUid) return;

      try {
        const userDocRef = doc(db, "users", currentUserUid);
        const snapshot = await getDoc(userDocRef);

        if (!snapshot.exists()) {
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
        } else {
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
            }
          });

          if (Object.keys(updates).length > 0) {
            await updateDoc(userDocRef, updates);
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
    if (!currentUserUid) return;

    const userDocRef = doc(db, "users", currentUserUid);
    const unsubscribe = onSnapshot(
      userDocRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          
          // Update daily progress
          setDailyXP(data.dailyXP ?? 0);
          setDailyCoins(data.dailyCoins ?? 0);
          setBonusClaimed(data.bonusClaimed ?? false);

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

          // Update streak recovery availability
          const isVIP = data.vip ?? false;
          if (isVIP) {
            const vipUsed = data.vipStreakRecoveryUsed || 0;
            const resetAt = data.vipRecoveryResetAt?.toDate?.() || null;
            const now = new Date();

            if (!resetAt || now > resetAt) {
              setCanRecoverStreak(true);
            } else {
              setCanRecoverStreak(vipUsed < 2);
            }
          } else {
            setCanRecoverStreak(true);
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
    if (currentUserUid) {
      checkDailyReset();
    }
  }, [currentUserUid, checkDailyReset]);

  // 5. Timer for daily reset
  useEffect(() => {
    const interval = setInterval(() => {
      const newTimeLeft = getTimeUntilMidnight();
      setTimeLeft(newTimeLeft);
      
      if (newTimeLeft <= 1000 && newTimeLeft > -1000 && currentUserUid) {
        checkDailyReset();
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [currentUserUid, checkDailyReset]);

  // 6. Monthly reset check
  useEffect(() => {
    if (currentUserUid && !monthlyResetChecked) {
      checkAndHandleMonthlyReset();
    }
  }, [currentUserUid, monthlyResetChecked, checkAndHandleMonthlyReset]);

  // 7. Fetch reward rules
  useEffect(() => {
    const fetchRewardRules = async () => {
      if (!currentUserUid) return;
      
      try {
        setRewardRulesLoading(true);
        const rewardDocRef = doc(db, "config", "rewardRules");
        const rewardSnap = await getDoc(rewardDocRef);
        
        if (rewardSnap.exists()) {
          setRewardRules(rewardSnap.data());
        } else {
          // Default values
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
        }
      } catch (error) {
        console.error("Error fetching rewardRules:", error);
        Alert.alert(i18n.t('global.error'), i18n.t('daily_challenge.error_fetching_reward_rules_message'));
      } finally {
        setRewardRulesLoading(false);
      }
    };

    if (currentUserUid) {
      fetchRewardRules();
    }
  }, [currentUserUid, db]);

  // 8. Bonus chest animation
  useEffect(() => {
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
    } else {
      chestAnimation.stopAnimation();
      chestAnimation.setValue(0);
    }
  }, [dailyXP, bonusClaimed, rewardRules, chestAnimation]);

  // 9. Fetch polls and videos after setup
  useEffect(() => {
    if (currentUserUid && monthlyResetChecked && rewardRules && !rewardRulesLoading) {
      fetchDailyPolls();
      fetchDailyVideos();
    }
  }, [currentUserUid, monthlyResetChecked, rewardRules, rewardRulesLoading]);

  // 10. App state listener for video playback
  useEffect(() => {
    const subscription = AppState.addEventListener("change", async (nextAppState) => {
      if (nextAppState === "active" && videoModalVisible && playerRef.current && playing) {
        try {
          const currentTime = await playerRef.current.getCurrentTime?.();
          if (typeof currentTime === 'number' && !isNaN(currentTime)) {
            lastTimestampRef.current = currentTime;
            if (!watchInterval.current) {
              onChangeState("playing");
            }
          }
        } catch (err) {
          console.warn("Error getting current time on app state change:", err);
        }
      } else if (nextAppState !== "active" && watchInterval.current) {
        clearInterval(watchInterval.current);
        watchInterval.current = null;
      }
    });

    return () => subscription.remove();
  }, [videoModalVisible, playing, onChangeState]);

  // 11. Cleanup for video interval
  useEffect(() => {
    return () => {
      if (watchInterval.current) {
        clearInterval(watchInterval.current);
        watchInterval.current = null;
        console.log("Cleanup: Video watch interval cleared");
      }
    };
  }, []);

  // RENDER
  if (isAuthLoading || rewardRulesLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#00FF9D" />
        <Text style={styles.loadingText}>{i18n.t('daily_challenge.loading_config')}</Text>
      </View>
    );
  }

  const targetXP = rewardRules?.xpCap?.daily ?? 500;
  const targetCoins = rewardRules?.coinsCap?.daily ?? 1500;

  return (
    <ImageBackground
      source={require("../../assets/images/bk20.png")}
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
          setActiveTab={setActiveTab}
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



// Place this somewhere in your JSX for easy access:

{/* TEMPORARY TEST BUTTONS - REMOVE AFTER TESTING */}
{__DEV__ && (
  <View style={{ padding: 20, backgroundColor: 'rgba(255,0,0,0.3)', margin: 10 }}>
    <Text style={{ color: 'white', fontSize: 16, marginBottom: 10 }}>
      🧪 STREAK TESTING (DEV ONLY)
    </Text>
    <Text style={{ color: 'white', fontSize: 12, marginBottom: 10 }}>
      Current: {userData.streakToday} | Highest: {userData.lastHighestStreak} | Daily XP: {dailyXP}
    </Text>
    
    <TouchableOpacity 
      style={{ backgroundColor: '#ff6b6b', padding: 10, margin: 5, borderRadius: 5 }}
      onPress={() => testStreakLogic(1, 200)} // Miss 1 day, meet XP
    >
      <Text style={{ color: 'white', textAlign: 'center' }}>
        Test: Miss 1 Day + Meet XP (should +1 streak)
      </Text>
    </TouchableOpacity>
    
    <TouchableOpacity 
      style={{ backgroundColor: '#ffa502', padding: 10, margin: 5, borderRadius: 5 }}
      onPress={() => testStreakLogic(1, 50)} // Miss 1 day, don't meet XP
    >
      <Text style={{ color: 'white', textAlign: 'center' }}>
        Test: Miss 1 Day + Low XP (should -1 streak)
      </Text>
    </TouchableOpacity>
    
    <TouchableOpacity 
      style={{ backgroundColor: '#2ed573', padding: 10, margin: 5, borderRadius: 5 }}
      onPress={() => testStreakLogic(3, 200)} // Miss 3 days, meet XP
    >
      <Text style={{ color: 'white', textAlign: 'center' }}>
        Test: Miss 3 Days + Meet XP (should reset to 1)
      </Text>
    </TouchableOpacity>
    
    <TouchableOpacity 
      style={{ backgroundColor: '#1e90ff', padding: 10, margin: 5, borderRadius: 5 }}
      onPress={() => testStreakLogic(3, 50)} // Miss 3 days, don't meet XP
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
          sparkleAnim={sparkleAnim}
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
        onClose={() => setVideoModalVisible(false)}
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