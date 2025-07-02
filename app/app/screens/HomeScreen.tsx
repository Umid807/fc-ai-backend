import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Image,
  ImageBackground,
  Modal,
  Alert,
  Animated,
  Dimensions,
  FlatList,
  Pressable,
  ActivityIndicator,
  Platform,

} from 'react-native';
import { useRouter, Link } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import {
  Brain,
  PlusCircle,
  Crown,
  HelpCircle,
  Gift,
  Trophy,
  Wifi,
  WifiOff,
  Star,
  Zap,
} from 'lucide-react-native';
import { WebView } from 'react-native-webview';
import { LinearGradient } from 'expo-linear-gradient';
import {
  getFirestore,
  doc,
  onSnapshot,
  updateDoc,
  collection,
  getDoc,
  query,
  orderBy,
  where,
  limit,
  getDocs,
  runTransaction,
} from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import * as Notifications from 'expo-notifications';
import RewardPopup from '../../components/RewardPopup';
import { useTranslation } from 'react-i18next';
import NetInfo from '@react-native-community/netinfo';

// Prevent auto-hide splash screen
SplashScreen.preventAutoHideAsync().catch(() => { });
console.log("HomeScreen: SplashScreen auto-hide prevented.");

// Configure notifications
Notifications.setNotificationHandler({
  handleNotification: async () => {
    console.log("HomeScreen: Notification received. Handling notification.");
    return ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    });
  },
});
console.log("HomeScreen: Notification handler configured.");

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Constants
const DAILY_REWARD_AMOUNT = 50;
const AI_QUESTION_COST = 200;
const FREE_QUESTIONS_LIMIT = 3;
console.log("HomeScreen: Constants initialized (DAILY_REWARD_AMOUNT, AI_QUESTION_COST, FREE_QUESTIONS_LIMIT).");

interface HeroCard {
  id: string;
  title: string;
  subtitle: string;
  imageUrl: string;
  videoUrl?: string;
  articleId?: string;
  type?: string;
  priority?: number;
  expireAt?: any;
}

interface Video {
  id: string;
  title: string;
  video_url: string;
  thumbnail_url: string;
  sponsored?: boolean;
  featured?: boolean;
  active?: boolean;
}

interface UserData {
  coins?: number;
  vip?: boolean;
  remainingFreeAIQuestions?: number;
  dailyCoins?: number;
  lastClaimedDate?: any;
  lastAIQuestionDate?: string;
  lastAIQuestionReset?: any;
  raffleNotificationEnabled?: boolean;
  raffleNotificationId?: string;
}

// Enhanced Error Boundary Component
class ErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback?: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
    console.log("ErrorBoundary: Component initialized.");
  }

  static getDerivedStateFromError(error: Error) {
    console.log("ErrorBoundary: Error detected by getDerivedStateFromError:", error.message);
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('HomeScreen ErrorBoundary: Caught an error:', error, errorInfo);
    // Here you can log to Firebase Analytics or crash reporting
  }

  render() {
    if (this.state.hasError) {
      console.log("ErrorBoundary: Rendering fallback UI.");
      return this.props.fallback || (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Oops! Something went wrong! Please restart the app.</Text>
        </View>
      );
    }

    return this.props.children;
  }
}

// Enhanced FadeTouchable with accessibility
const FadeTouchable = React.memo(({
  onPress,
  style,
  children,
  disabled = false,
  accessibilityLabel,
  accessibilityHint,
}: {
  onPress: () => void;
  style?: any;
  children: React.ReactNode;
  disabled?: boolean;
  accessibilityLabel?: string;
  accessibilityHint?: string;
}) => {
  console.log("FadeTouchable: Component rendered.");
  const opacity = useRef(new Animated.Value(1)).current;

  const handlePressIn = useCallback(() => {
    if (disabled) return;
    console.log("FadeTouchable: PressIn detected.");
    Animated.timing(opacity, {
      toValue: 0.6,
      duration: 150,
      useNativeDriver: true,
    }).start();
  }, [disabled, opacity]);

  const handlePressOut = useCallback(() => {
    if (disabled) return;
    console.log("FadeTouchable: PressOut detected.");
    Animated.timing(opacity, {
      toValue: 1,
      duration: 150,
      useNativeDriver: true,
    }).start();
  }, [disabled, opacity]);

  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={disabled ? [style, { opacity: 0.5 }] : style}
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      accessibilityRole="button"
    >
      <Animated.View style={{ opacity }}>
        {children}
      </Animated.View>
    </Pressable>
  );
});

// Loading Skeleton Components
const HeroCardSkeleton = () => {
  console.log("HeroCardSkeleton: Component rendered.");
  return (
    <View style={styles.heroCardSkeleton}>
      <View style={styles.heroCardSkeletonImage} />
      <View style={styles.heroCardSkeletonText}>
        <View style={styles.heroCardSkeletonTitle} />
        <View style={styles.heroCardSkeletonSubtitle} />
      </View>
    </View>
  );
};

const VideoCardSkeleton = ({ index }: { index: number }) => {
  console.log(`VideoCardSkeleton: Component rendered for index ${index}.`);
  return (
    <View style={[
      styles.videoCardSkeleton,
      index === 0 && styles.videoCard1,
      index === 1 && styles.videoCard2,
      index === 2 && styles.videoCard3,
    ]}>
      <View style={styles.videoSkeletonImage} />
      <View style={styles.videoSkeletonText} />
    </View>
  );
};

// Offline Banner Component
const OfflineBanner = ({ isVisible }: { isVisible: boolean }) => {
  const slideAnim = useRef(new Animated.Value(-100)).current;
  console.log("OfflineBanner: Component rendered. isVisible:", isVisible);

  useEffect(() => {
    console.log("OfflineBanner: useEffect triggered. isVisible:", isVisible);
    Animated.timing(slideAnim, {
      toValue: isVisible ? 0 : -100,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      console.log(`OfflineBanner: Animation ${isVisible ? 'shown' : 'hidden'}.`);
    });
  }, [isVisible, slideAnim]);

  return (
    <Animated.View style={[styles.offlineBanner, { transform: [{ translateY: slideAnim }] }]}>
      <WifiOff size={16} color="#FFFFFF" />
      <Text style={styles.offlineBannerText}>No internet! Check your connection to stay on the pitch</Text>
    </Animated.View>
  );
};

// VIP Badge Component
const VIPBadge = () => {
  console.log("VIPBadge: Component rendered.");
  return (
    <LinearGradient
      colors={['#FFD700', '#FFA500', '#FF8C00']}
      style={styles.vipBadge}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <Crown size={12} color="#000" />
      <Text style={styles.vipBadgeText}>VIP</Text>
      <Star size={10} color="#000" />
    </LinearGradient>
  );
};

export default function HomePage() {
  console.log("HomePage: Component mounted.");
  const { t } = useTranslation();
  const router = useRouter();
  console.log("HomePage: Router initialized.");

  // State Management
  const [coins, setCoins] = useState<number>(0);
  console.log("HomePage: State 'coins' initialized to 0.");
  const [dailyRewardClaimed, setDailyRewardClaimed] = useState(false);
  console.log("HomePage: State 'dailyRewardClaimed' initialized to false.");
  const [dailyRewardCountdownState, setDailyRewardCountdownState] = useState("00:00:00");
  console.log("HomePage: State 'dailyRewardCountdownState' initialized to '00:00:00'.");
  const [trickCountdown, setTrickCountdown] = useState("00:00:00");
  console.log("HomePage: State 'trickCountdown' initialized to '00:00:00'.");
  const [username, setUsername] = useState(t('home.defaultUsername'));
  console.log("HomePage: State 'username' initialized to default.");
  const [dataLoaded, setDataLoaded] = useState(false);
  console.log("HomePage: State 'dataLoaded' initialized to false.");
  const [academyVisible, setAcademyVisible] = useState(false);
  console.log("HomePage: State 'academyVisible' initialized to false.");
  const [loading, setLoading] = useState(false);
  console.log("HomePage: State 'loading' initialized to false (for AI chat).");
  const [pageLoading, setPageLoading] = useState(true);
  console.log("HomePage: State 'pageLoading' initialized to true.");
  const [isOnline, setIsOnline] = useState(true);
  console.log("HomePage: State 'isOnline' initialized to true.");

  // AI Section State
  const [remainingQuestions, setRemainingQuestions] = useState(FREE_QUESTIONS_LIMIT);
  console.log("HomePage: State 'remainingQuestions' initialized to FREE_QUESTIONS_LIMIT.");
  const [question, setQuestion] = useState('');
  console.log("HomePage: State 'question' initialized to empty string.");
  const [answer, setAnswer] = useState('');
  console.log("HomePage: State 'answer' initialized to empty string.");
  const [isVIP, setIsVIP] = useState(false);
  console.log("HomePage: State 'isVIP' initialized to false.");
  const [shortAnswer, setShortAnswer] = useState("");
  console.log("HomePage: State 'shortAnswer' initialized to empty string.");
  const [fullAnswer, setFullAnswer] = useState("");
  console.log("HomePage: State 'fullAnswer' initialized to empty string.");
  const [inputHeight, setInputHeight] = useState(40);
  console.log("HomePage: State 'inputHeight' initialized to 40.");

  // Challenge State
  const [dailyChallengeCoins, setDailyChallengeCoins] = useState(0);
  console.log("HomePage: State 'dailyChallengeCoins' initialized to 0.");

  // Animation References
  const progressAnim = useRef(new Animated.Value(0)).current;
  console.log("HomePage: Ref 'progressAnim' initialized.");
  const scrollX = useRef(new Animated.Value(0)).current;
  console.log("HomePage: Ref 'scrollX' initialized.");
  const pulseAnim = useRef(new Animated.Value(1)).current;
  console.log("HomePage: Ref 'pulseAnim' initialized.");
  const coinOpacity = useRef(new Animated.Value(0)).current;
  console.log("HomePage: Ref 'coinOpacity' initialized.");
  const didYouKnowTextOpacity = useRef(new Animated.Value(1)).current;
  console.log("HomePage: Ref 'didYouKnowTextOpacity' initialized.");

  // Modal and UI State
  const [videoModalVisible, setVideoModalVisible] = useState(false);
  console.log("HomePage: State 'videoModalVisible' initialized to false.");
  const [selectedVideoUrl, setSelectedVideoUrl] = useState('');
  console.log("HomePage: State 'selectedVideoUrl' initialized to empty string.");
  const [homeVideos, setHomeVideos] = useState<Video[]>([]);
  console.log("HomePage: State 'homeVideos' initialized to empty array.");
  const [heroCards, setHeroCards] = useState<HeroCard[]>([]);
  console.log("HomePage: State 'heroCards' initialized to empty array.");
  const [showCoinDrop, setShowCoinDrop] = useState(false);
  console.log("HomePage: State 'showCoinDrop' initialized to false.");
  const [showRewardPopup, setShowRewardPopup] = useState(false);
  console.log("HomePage: State 'showRewardPopup' initialized to false.");
  const [isSubscribedToNotifications, setIsSubscribedToNotifications] = useState(false);
  console.log("HomePage: State 'isSubscribedToNotifications' initialized to false.");
  const [heroLoading, setHeroLoading] = useState(true);
  console.log("HomePage: State 'heroLoading' initialized to true.");
  const [videosLoading, setVideosLoading] = useState(true);
  console.log("HomePage: State 'videosLoading' initialized to true.");

  // Did You Know Section
  const didYouKnowTipKeys = useMemo(() => [
    'home.didYouKnow.tip1',
    'home.didYouKnow.tip2',
    'home.didYouKnow.tip3',
    'home.didYouKnow.tip4',
    'home.didYouKnow.tip5',
    'home.didYouKnow.tip6',
  ], []);
  const [currentDidYouKnowIndex, setCurrentDidYouKnowIndex] = useState(0);
  console.log("HomePage: State 'currentDidYouKnowIndex' initialized to 0.");

  // Cleanup function for timers and animations
  const cleanupRef = useRef<(() => void)[]>([]);
  console.log("HomePage: Ref 'cleanupRef' initialized.");

  const addCleanup = useCallback((cleanup: () => void) => {
    cleanupRef.current.push(cleanup);
    console.log("HomePage: Cleanup function added to queue.");
  }, []);

  // Enhanced timezone handling with DST support
  const getNextFridayEST = useCallback(() => {
    console.log("HomePage: getNextFridayEST called.");
    const now = new Date();

    // Determine if we're in EDT (Daylight Saving) or EST (Standard)
    const isDST = (date: Date) => {
      const jan = new Date(date.getFullYear(), 0, 1);
      const jul = new Date(date.getFullYear(), 6, 1);
      return Math.max(jan.getTimezoneOffset(), jul.getTimezoneOffset()) !== date.getTimezoneOffset();
    };

    const estOffset = isDST(now) ? -4 : -5; // EDT: UTC-4, EST: UTC-5
    console.log(`HomePage: Current timezone offset for EST/EDT is ${estOffset} hours.`);
    const nowEST = new Date(now.getTime() + (estOffset * 60 * 60 * 1000));
    console.log("HomePage: Current time converted to EST/EDT:", nowEST.toISOString());

    let nextFriday = new Date(nowEST);
    const daysUntilFriday = (5 - nowEST.getDay() + 7) % 7;
    console.log(`HomePage: Days until next Friday: ${daysUntilFriday}.`);

    if (daysUntilFriday === 0) {
      // It's Friday - check if it's before 8 PM EST/EDT
      if (nowEST.getHours() >= 20) {
        console.log("HomePage: It's Friday after 8 PM, scheduling for next week.");
        nextFriday.setDate(nextFriday.getDate() + 7);
      } else {
        console.log("HomePage: It's Friday before 8 PM.");
      }
    } else {
      nextFriday.setDate(nextFriday.getDate() + daysUntilFriday);
      console.log(`HomePage: Set date to next Friday: ${nextFriday.toDateString()}.`);
    }

    nextFriday.setHours(20, 0, 0, 0); // Set to 8 PM EST/EDT
    console.log("HomePage: Next Friday 8 PM EST/EDT calculated:", nextFriday.toISOString());
    return new Date(nextFriday.getTime() - (estOffset * 60 * 60 * 1000)); // Convert back to local time for scheduling
  }, []);

  // Biweekly AI question reset (every other Monday)
  const shouldResetAIQuestions = useCallback((userData: UserData) => {
    console.log("HomePage: shouldResetAIQuestions called for user data.");
    const now = new Date();
    const lastReset = userData.lastAIQuestionReset?.toDate?.() ??
      (userData.lastAIQuestionReset ? new Date(userData.lastAIQuestionReset) : null);
    console.log("HomePage: Last AI question reset date:", lastReset?.toISOString() || "N/A");

    if (!lastReset) {
      console.log("HomePage: No last reset date found, returning true for reset.");
      return true; // First time, reset
    }

    const daysSinceReset = Math.floor((now.getTime() - lastReset.getTime()) / (1000 * 60 * 60 * 24));
    console.log(`HomePage: Days since last AI question reset: ${daysSinceReset}.`);

    // Check if it's been at least 14 days and it's Monday
    if (daysSinceReset >= 14 && now.getDay() === 1) { // Monday is 1
      const currentMondayStart = new Date(now);
      currentMondayStart.setHours(0, 0, 0, 0);
      const lastResetMondayStart = new Date(lastReset);
      lastResetMondayStart.setHours(0, 0, 0, 0);

      const resetNeeded = currentMondayStart.getTime() !== lastResetMondayStart.getTime();
      console.log("HomePage: Reset needed (>=14 days & Monday):", resetNeeded);
      return resetNeeded;
    }

    console.log("HomePage: No AI question reset needed.");
    return false;
  }, []);

  // Enhanced notification handler with iOS/Android support
  const handleNotifyMe = useCallback(async () => {
    console.log("HomePage: handleNotifyMe called.");
    try {
      const auth = getAuth();
      const user = auth.currentUser;
      console.log("HomePage: Current user:", user?.uid || "None");

      if (!user) {
        Alert.alert(t('home.errorTitle'), t('home.userNotSignedIn'));
        console.log("HomePage: Notification setup failed: User not signed in.");
        return;
      }

      // Enhanced permission request for both platforms
      let permissionResult;
      if (Platform.OS === 'ios') {
        console.log("HomePage: Requesting iOS notification permissions.");
        permissionResult = await Notifications.requestPermissionsAsync({
          ios: {
            allowAlert: true,
            allowBadge: true,
            allowSound: true,
            allowAnnouncements: true,
          },
        });
      } else {
        console.log("HomePage: Requesting Android notification permissions.");
        permissionResult = await Notifications.requestPermissionsAsync({
          android: {
            allowAlert: true,
            allowBadge: true,
            allowSound: true,
          },
        });
      }
      console.log("HomePage: Notification permission status:", permissionResult.status);

      if (permissionResult.status !== 'granted') {
        Alert.alert(
          '🚨 Permission Required',
          'Enable notifications to get reminded about the weekly raffle! 🏆'
        );
        console.log("HomePage: Notification permission not granted.");
        return;
      }

      const db = getFirestore();
      const userDocRef = doc(db, "users", user.uid);
      console.log("HomePage: User document reference:", userDocRef.path);

      // Cancel existing notification if any
      if (isSubscribedToNotifications) {
        console.log("HomePage: User is currently subscribed to notifications. Attempting to cancel existing.");
        const userData = (await getDoc(userDocRef)).data() as UserData;
        if (userData.raffleNotificationId) {
          await Notifications.cancelScheduledNotificationAsync(userData.raffleNotificationId);
          console.log(`HomeScreen: Canceled existing notification with ID: ${userData.raffleNotificationId}`);
        } else {
          console.log("HomeScreen: No existing notification ID found to cancel.");
        }
      }

      const nextFridayEST = getNextFridayEST();
      const notificationTime = new Date(nextFridayEST.getTime() - (30 * 60 * 1000)); // 30 mins before 8 PM
      console.log("HomePage: Scheduling notification for:", notificationTime.toISOString());

      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: "🏆 FC25 Weekly Raffle!",
          body: "⏳ 30 minutes left to join! Don't miss your chance to win big!",
          sound: true,
          badge: 1,
          ...(Platform.OS === 'android' && {
            priority: Notifications.AndroidNotificationPriority.HIGH,
            vibrate: [0, 250, 250, 250],
          }),
          ...(Platform.OS === 'ios' && {
            threadIdentifier: 'raffle-reminders',
          }),
        },
        trigger: { date: notificationTime },
      });
      console.log("HomePage: Notification scheduled with ID:", notificationId);

      await updateDoc(userDocRef, {
        raffleNotificationId: notificationId,
        raffleNotificationEnabled: true,
        lastNotificationScheduled: new Date(),
      });
      console.log("HomePage: Firestore updated with new notification ID and status.");
      setIsSubscribedToNotifications(true);
      console.log("HomePage: State 'isSubscribedToNotifications' set to true.");

      Alert.alert(
        '🎉 You\'re in the game!',
        `We'll remind you 30 minutes before kickoff!\n🏆 ${nextFridayEST.toLocaleDateString()} at ${nextFridayEST.toLocaleTimeString()}`
      );
    } catch (error) {
      console.error('HomePage: Notification setup error:', error);
      Alert.alert('❌ Oops!', 'Could not set up notifications. Please try again!');
    }
  }, [t, getNextFridayEST, isSubscribedToNotifications]);

  // Network status monitoring
  useEffect(() => {
    console.log("HomePage: Network status useEffect triggered.");
    const unsubscribe = NetInfo.addEventListener(state => {
      console.log("HomePage: Network status changed. isConnected:", state.isConnected);
      setIsOnline(state.isConnected ?? true);
      console.log("HomePage: State 'isOnline' updated to:", state.isConnected);
    });

    addCleanup(() => {
      console.log("HomePage: Network status listener unsubscribed.");
      unsubscribe();
    });
    return () => {
      console.log("HomePage: Network status useEffect cleanup.");
      unsubscribe();
    };
  }, [addCleanup]);

  // Enhanced User Data Effect with biweekly reset and error recovery
  useEffect(() => {
    console.log("HomePage: User data useEffect triggered.");
    const auth = getAuth();
    const user = auth.currentUser;
    console.log("HomePage: Current Firebase user:", user?.uid || "None");

    if (!user) {
      console.log("HomePage: No user logged in. Setting default states.");
      setUsername(t('home.defaultUsername'));
      setCoins(0);
      setIsVIP(false);
      setRemainingQuestions(FREE_QUESTIONS_LIMIT);
      setDailyChallengeCoins(0);
      setDailyRewardClaimed(false);

      if (!dataLoaded) {
        console.log("HomePage: Data not yet loaded, hiding splash screen (no user).");
        setDataLoaded(true);
        setPageLoading(false);
        SplashScreen.hideAsync().catch(() => { });
        console.log("HomePage: State 'dataLoaded' set to true, 'pageLoading' set to false.");
      }
      return;
    }

    setUsername(user.displayName || user.email?.split('@')[0] || t('home.defaultUsername'));
    console.log("HomePage: Username set to:", username);

    const db = getFirestore();
    const userDocRef = doc(db, "users", user.uid);
    console.log("HomePage: Firestore user document ref:", userDocRef.path);

    const unsubscribe = onSnapshot(
      userDocRef,
      async (docSnapshot) => {
        try {
          console.log("HomePage: Firestore user data snapshot received.");
          if (docSnapshot.exists()) {
            console.log("HomePage: User document exists.");
            const userData = docSnapshot.data() as UserData;
            console.log("HomePage: User data:", userData);

            // Safe data extraction with fallbacks
            setCoins(userData.coins ?? 0);
            console.log("HomePage: State 'coins' updated to:", userData.coins ?? 0);
            setIsVIP(userData.vip === true);
            console.log("HomePage: State 'isVIP' updated to:", userData.vip);
            setDailyChallengeCoins(userData.dailyCoins ?? 0);
            console.log("HomePage: State 'dailyChallengeCoins' updated to:", userData.dailyCoins ?? 0);
            setIsSubscribedToNotifications(userData.raffleNotificationEnabled === true);
            console.log("HomePage: State 'isSubscribedToNotifications' updated to:", userData.raffleNotificationEnabled);

            // Handle biweekly AI question reset
            let currentQuestions = userData.remainingFreeAIQuestions ?? FREE_QUESTIONS_LIMIT;
            console.log("HomePage: Current remaining AI questions (before reset check):", currentQuestions);

            if (!userData.vip && shouldResetAIQuestions(userData)) {
              console.log("HomePage: Biweekly AI questions reset triggered.");
              currentQuestions = FREE_QUESTIONS_LIMIT;
              console.log("HomePage: Remaining questions reset to:", currentQuestions);

              // Update Firebase with reset
              try {
                await updateDoc(userDocRef, {
                  remainingFreeAIQuestions: FREE_QUESTIONS_LIMIT,
                  lastAIQuestionReset: new Date(),
                });
                console.log("HomePage: Firestore updated with AI question reset.");
              } catch (updateError) {
                console.error('HomePage: Error resetting AI questions in Firestore:', updateError);
              }
            }
            setRemainingQuestions(currentQuestions);
            console.log("HomePage: State 'remainingQuestions' updated to:", currentQuestions);


            // Handle date comparison safely
            const lastClaimedDate = userData.lastClaimedDate?.toDate?.() ??
              (userData.lastClaimedDate ? new Date(userData.lastClaimedDate) : null);
            const todayString = new Date().toISOString().split('T')[0];
            const lastClaimedString = lastClaimedDate ?
              lastClaimedDate.toISOString().split('T')[0] : "";
            console.log("HomePage: Today's date string:", todayString);
            console.log("HomePage: Last claimed date string:", lastClaimedString);

            setDailyRewardClaimed(lastClaimedString === todayString);
            console.log("HomePage: State 'dailyRewardClaimed' updated to:", lastClaimedString === todayString);
          } else {
            console.log("HomePage: User document does not exist. Setting default states.");
            // Reset to defaults if document doesn't exist
            setCoins(0);
            setIsVIP(false);
            setRemainingQuestions(FREE_QUESTIONS_LIMIT);
            setDailyChallengeCoins(0);
            setDailyRewardClaimed(false);
            setIsSubscribedToNotifications(false);
          }
        } catch (error) {
          console.error("HomePage: Error processing user data snapshot:", error);
        } finally {
          if (!dataLoaded) {
            console.log("HomePage: Data processing complete, hiding splash screen (user data loaded).");
            setDataLoaded(true);
            setPageLoading(false);
            SplashScreen.hideAsync().catch(() => { });
            console.log("HomePage: State 'dataLoaded' set to true, 'pageLoading' set to false.");
          }
        }
      },
      (error) => {
        console.error("HomePage: Real-time user data snapshot error:", error);
        if (!dataLoaded) {
          console.log("HomePage: Snapshot error occurred before data loaded, hiding splash screen.");
          setDataLoaded(true);
          setPageLoading(false);
          SplashScreen.hideAsync().catch(() => { });
        }
      }
    );

    addCleanup(() => {
      console.log("HomePage: User data snapshot listener unsubscribed.");
      unsubscribe();
    });
    return () => {
      console.log("HomePage: User data useEffect cleanup.");
      unsubscribe();
    };
  }, [dataLoaded, t, addCleanup, shouldResetAIQuestions]);

  // Enhanced Hero Cards Effect with fallback handling
  useEffect(() => {
    console.log("HomePage: Hero cards useEffect triggered.");
    const fetchHeroCards = async () => {
      try {
        setHeroLoading(true);
        console.log("HomePage: State 'heroLoading' set to true.");
        const db = getFirestore();
        const heroRef = collection(db, "mainHero");
        const q = query(heroRef, where("active", "==", true));
        const snapshot = await getDocs(q);
        const now = new Date();
        console.log("HomePage: Fetched hero cards snapshot.");

        const validCards = snapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() } as HeroCard))
          .filter(card => {
            try {
              const expireAt = card.expireAt?.toDate?.() || new Date(card.expireAt);
              const isValid = expireAt > now;
              if (!isValid) {
                console.log(`HomeScreen: Hero card "${card.title}" expired at ${expireAt.toISOString()}.`);
              }
              return isValid;
            } catch (e) {
              console.warn(`HomeScreen: Invalid expireAt date for card "${card.title}". Excluding.`, e);
              return false; // Exclude cards with invalid dates
            }
          })
          .sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0))
          .slice(0, 5);
        console.log("HomePage: Processed valid hero cards:", validCards.length);

        setHeroCards(validCards);
        console.log("HomePage: State 'heroCards' updated.");
      } catch (err) {
        console.error("HomePage: Error loading hero cards:", err);
        setHeroCards([]); // Fallback to empty array on error
        console.log("HomePage: State 'heroCards' set to empty array due to error.");
      } finally {
        setHeroLoading(false);
        console.log("HomePage: State 'heroLoading' set to false.");
      }
    };

    fetchHeroCards();
    console.log("HomePage: Hero cards fetch initiated.");
  }, []);

  // Enhanced Home Videos Effect with fallback handling
  useEffect(() => {
    console.log("HomePage: Home videos useEffect triggered.");
    const fetchHomeVideos = async () => {
      try {
        setVideosLoading(true);
        console.log("HomePage: State 'videosLoading' set to true.");
        const db = getFirestore();
        const videosRef = collection(db, "videos");
        let selected: Video[] = [];
        console.log("HomePage: Fetching sponsored videos.");

        // Get sponsored videos first
        const sponsoredQuery = query(
          videosRef,
          where("sponsored", "==", true),
          where("active", "==", true),
          limit(3)
        );
        const sponsoredSnap = await getDocs(sponsoredQuery);
        selected = sponsoredSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Video));
        console.log(`HomePage: Found ${selected.length} sponsored videos.`);

        // Fill with featured videos if needed
        if (selected.length < 3) {
          console.log("HomePage: Fetching featured videos to fill up.");
          const featuredQuery = query(
            videosRef,
            where("featured", "==", true),
            where("active", "==", true),
            limit(3 - selected.length)
          );
          const featuredSnap = await getDocs(featuredQuery);
          const featuredVideos = featuredSnap.docs
            .map(doc => ({ id: doc.id, ...doc.data() } as Video))
            .filter(v => !selected.some(s => s.id === v.id)); // Avoid duplicates
          selected = [...selected, ...featuredVideos];
          console.log(`HomePage: Found ${featuredVideos.length} featured videos. Total: ${selected.length}`);
        }

        // Fill with random active videos if still needed
        if (selected.length < 3) {
          console.log("HomePage: Fetching random active videos to fill up.");
          const allQuery = query(videosRef, where("active", "==", true));
          const allSnap = await getDocs(allQuery);
          const allActive = allSnap.docs
            .map(doc => ({ id: doc.id, ...doc.data() } as Video))
            .filter(v => !selected.some(s => s.id === v.id)); // Avoid duplicates

          const shuffled = allActive
            .sort(() => 0.5 - Math.random()) // Shuffle
            .slice(0, 3 - selected.length);
          selected = [...selected, ...shuffled];
          console.log(`HomePage: Found ${shuffled.length} random active videos. Total: ${selected.length}`);
        }

        setHomeVideos(selected);
        console.log("HomePage: State 'homeVideos' updated.");
      } catch (error) {
        console.error("HomePage: Error fetching home videos:", error);
        setHomeVideos([]); // Fallback to empty array on error
        console.log("HomePage: State 'homeVideos' set to empty array due to error.");
      } finally {
        setVideosLoading(false);
        console.log("HomePage: State 'videosLoading' set to false.");
      }
    };

    fetchHomeVideos();
    console.log("HomePage: Home videos fetch initiated.");
  }, []);

  // Academy Visibility Effect
  useEffect(() => {
    console.log("HomePage: Academy visibility useEffect triggered.");
    const fetchAcademyVisibility = async () => {
      try {
        const db = getFirestore();
        const docRef = doc(db, 'settings', 'FC LIVE Academy visibility');
        const docSnap = await getDoc(docRef);
        setAcademyVisible(docSnap.exists() && docSnap.data()?.academyVisible === true);
        console.log("HomePage: State 'academyVisible' updated to:", docSnap.exists() && docSnap.data()?.academyVisible);
      } catch (err) {
        console.error("HomePage: Error fetching academy visibility:", err);
        setAcademyVisible(false); // Default to false on error
        console.log("HomePage: State 'academyVisible' set to false due to error.");
      }
    };

    fetchAcademyVisibility();
    console.log("HomePage: Academy visibility fetch initiated.");
  }, []);

  // Enhanced Countdown Timer Effect
  useEffect(() => {
    console.log("HomePage: Countdown timer useEffect triggered.");
    const timer = setInterval(() => {
      const now = new Date();

      // Calculate next Friday 8 PM EST/EDT
      const nextFridayEST = getNextFridayEST();
      const diffToRaffle = nextFridayEST.getTime() - now.getTime();
      console.log(`HomePage: Time until raffle: ${diffToRaffle}ms.`);

      const formatCountdown = (diff: number) => {
        if (diff <= 0) return "00:00:00";
        const h = Math.floor(diff / (1000 * 60 * 60));
        const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const s = Math.floor((diff % (1000 * 60)) / 1000);
        return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
      };

      setTrickCountdown(formatCountdown(diffToRaffle));
      console.log("HomePage: State 'trickCountdown' updated to:", formatCountdown(diffToRaffle));

      // Calculate midnight countdown for daily rewards
      const tomorrow = new Date(now);
      tomorrow.setDate(now.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);
      const diffToMidnight = tomorrow.getTime() - now.getTime();
      console.log(`HomePage: Time until midnight: ${diffToMidnight}ms.`);

      if (dailyRewardClaimed) {
        if (diffToMidnight <= 0) {
          console.log("HomePage: Daily reward timer passed midnight. Resetting claim status.");
          setDailyRewardClaimed(false);
          setDailyRewardCountdownState("00:00:00");
        } else {
          setDailyRewardCountdownState(formatCountdown(diffToMidnight));
          console.log("HomePage: State 'dailyRewardCountdownState' updated to:", formatCountdown(diffToMidnight));
        }
      } else {
        setDailyRewardCountdownState("00:00:00");
      }
    }, 1000);

    addCleanup(() => {
      console.log("HomePage: Countdown timer cleared.");
      clearInterval(timer);
    });
    return () => {
      console.log("HomePage: Countdown timer useEffect cleanup.");
      clearInterval(timer);
    };
  }, [dailyRewardClaimed, addCleanup, getNextFridayEST]);

  // Did You Know Animation Effect
  useEffect(() => {
    console.log("HomePage: Did You Know animation useEffect triggered.");
    const interval = setInterval(() => {
      Animated.timing(didYouKnowTextOpacity, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true
      }).start(() => {
        setCurrentDidYouKnowIndex((prevIndex) => {
          const newIndex = (prevIndex + 1) % didYouKnowTipKeys.length;
          console.log(`HomePage: Did You Know index changed from ${prevIndex} to ${newIndex}.`);
          return newIndex;
        });
        Animated.timing(didYouKnowTextOpacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true
        }).start();
        console.log("HomePage: Did You Know text opacity animated back to 1.");
      });
    }, 10000);

    addCleanup(() => {
      console.log("HomePage: Did You Know interval cleared.");
      clearInterval(interval);
    });
    return () => {
      console.log("HomePage: Did You Know useEffect cleanup.");
      clearInterval(interval);
    };
  }, [didYouKnowTipKeys.length, didYouKnowTextOpacity, addCleanup]);

  // Progress Animation Effect
  useEffect(() => {
    console.log("HomePage: Progress animation useEffect triggered. DailyChallengeCoins:", dailyChallengeCoins);
    const progressVal = Math.min(dailyChallengeCoins / 1000, 1);
    Animated.timing(progressAnim, {
      toValue: progressVal,
      duration: 500,
      useNativeDriver: false
    }).start(() => {
      console.log("HomePage: Progress animation completed. Target value:", progressVal);
    });
  }, [dailyChallengeCoins, progressAnim]);

  // Pulse Animation Effect
  useEffect(() => {
    console.log("HomePage: Pulse animation useEffect triggered.");
    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 600,
          useNativeDriver: true
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true
        }),
      ])
    );

    pulseAnimation.start();
    console.log("HomePage: Pulse animation started.");
    addCleanup(() => {
      console.log("HomePage: Pulse animation stopped.");
      pulseAnimation.stop();
    });

    return () => {
      console.log("HomePage: Pulse animation useEffect cleanup.");
      pulseAnimation.stop();
    };
  }, [pulseAnim, addCleanup]);

  // General cleanup effect
  useEffect(() => {
    console.log("HomePage: General cleanup useEffect triggered.");
    return () => {
      console.log("HomePage: Running all cleanup functions.");
      cleanupRef.current.forEach(cleanup => cleanup());
      cleanupRef.current = [];
      console.log("HomePage: All cleanup functions executed.");
    };
  }, []);

  // Enhanced Event Handlers

  const handleDailyReward = useCallback(async () => {
    console.log("HomePage: handleDailyReward called.");
    try {
      const auth = getAuth();
      const user = auth.currentUser;
      console.log("HomePage: Current user for daily reward:", user?.uid || "None");

      if (!user) {
        Alert.alert(t('home.errorTitle'), t('home.userNotFoundSignInAgain'));
        console.log("HomePage: Daily reward failed: User not found/signed in.");
        return;
      }

      const db = getFirestore();
      const userDocRef = doc(db, "users", user.uid);
      console.log("HomePage: User document reference for daily reward:", userDocRef.path);

      await runTransaction(db, async (transaction) => {
        console.log("HomePage: Daily reward transaction started.");
        const userDocSnap = await transaction.get(userDocRef);
        console.log("HomePage: User document snapshot fetched for transaction.");

        if (!userDocSnap.exists()) {
          console.error("HomePage: User document does not exist during daily reward transaction.");
          throw new Error("UserDocNotFound");
        }

        const userData = userDocSnap.data() as UserData;
        const lastClaimedDate = userData.lastClaimedDate?.toDate?.() ??
          (userData.lastClaimedDate ? new Date(userData.lastClaimedDate) : null);
        const todayString = new Date().toISOString().split('T')[0];
        const lastClaimedString = lastClaimedDate ?
          lastClaimedDate.toISOString().split('T')[0] : "";
        console.log("HomePage: Transaction: lastClaimedString:", lastClaimedString, "todayString:", todayString);


        if (lastClaimedString === todayString) {
          console.warn("HomePage: Daily reward already claimed today.");
          throw new Error("AlreadyClaimed");
        }

        transaction.update(userDocRef, {
          coins: (userData.coins || 0) + DAILY_REWARD_AMOUNT,
          lastClaimedDate: new Date(),
        });
        console.log(`HomePage: Transaction: User coins updated by ${DAILY_REWARD_AMOUNT}. Last claimed date set to now.`);
      });

      setDailyRewardClaimed(true);
      console.log("HomePage: State 'dailyRewardClaimed' set to true.");
      setShowRewardPopup(true);
      console.log("HomePage: State 'showRewardPopup' set to true.");

      // Auto-hide reward popup
      setTimeout(() => {
        setShowRewardPopup(false);
        console.log("HomePage: State 'showRewardPopup' set to false (auto-hide).");
      }, 3000);

      // Coin drop animation
      setShowCoinDrop(true);
      console.log("HomePage: State 'showCoinDrop' set to true.");
      Animated.sequence([
        Animated.timing(coinOpacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true
        }),
        Animated.delay(500),
        Animated.timing(coinOpacity, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true
        }),
      ]).start(() => {
        setShowCoinDrop(false);
        console.log("HomePage: State 'showCoinDrop' set to false (animation complete).");
      });

    } catch (error: any) {
      console.error("HomePage: Daily reward error:", error);

      let errorMessage = t('home.couldNotClaimReward');
      if (error.message === "AlreadyClaimed") {
        errorMessage = t('home.rewardAlreadyClaimed');
      } else if (error.message === "UserDocNotFound") {
        errorMessage = t('home.userDoesNotExistContactSupport');
      }

      Alert.alert(t('home.errorTitle'), errorMessage);
    }
  }, [t, coinOpacity]);

  const handleAskAI = useCallback(async () => {
    console.log("HomePage: handleAskAI called.");
    if (!question.trim()) {
      Alert.alert(t('home.errorTitle'), 'Please enter a question first! ⚽');
      console.log("HomePage: AI question validation failed: Empty question.");
      return;
    }

    if (!isOnline) {
      Alert.alert('❌ No Connection', 'Check your internet connection to ask AI questions!');
      console.log("HomePage: AI question failed: No internet connection.");
      return;
    }

    if (!isVIP && remainingQuestions <= 0) {
      Alert.alert(t('home.limitReachedTitle'), t('home.allFreeQuestionsUsed'));
      console.log("HomePage: AI question failed: Free question limit reached for non-VIP user.");
      return;
    }

    setLoading(true);
    console.log("HomePage: State 'loading' set to true (AI chat).");
    const BACKEND_URL = "https://fc-ai-backend.onrender.com/api/ask-ai";
    console.log("HomePage: AI Backend URL:", BACKEND_URL);

    try {
      console.log("HomePage: Initiating AI API call.");
      const response = await fetch(BACKEND_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, isVIP }),
      });
      console.log("HomePage: AI API response received. Status:", response.status);

      if (!response.ok) {
        console.error(`HomePage: Server error from AI API: ${response.status} ${response.statusText}`);
        throw new Error(`Server error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log("HomePage: AI API response data:", data);

      if (data.answer) {
        setAnswer(data.answer);
        setFullAnswer(data.answer);
        setShortAnswer(truncateText(data.answer));
        console.log("HomePage: State 'answer', 'fullAnswer', 'shortAnswer' updated with AI response.");

        // Update remaining questions for non-VIP users
        if (!isVIP) {
          console.log("HomePage: User is not VIP. Decrementing remaining questions.");
          const auth = getAuth();
          const user = auth.currentUser;

          if (user) {
            const db = getFirestore();
            const userDocRef = doc(db, "users", user.uid);
            const newRemaining = Math.max(0, remainingQuestions - 1);
            console.log(`HomePage: New remaining questions: ${newRemaining}.`);

            setRemainingQuestions(newRemaining);
            console.log("HomePage: State 'remainingQuestions' updated.");

            try {
              await updateDoc(userDocRef, {
                remainingFreeAIQuestions: newRemaining,
                lastAIQuestionDate: new Date().toISOString().split('T')[0],
              });
              console.log("HomePage: Firestore updated with new remaining questions.");
            } catch (updateError) {
              console.error("HomePage: Error updating user questions in Firestore:", updateError);
              setRemainingQuestions(remainingQuestions); // Revert state on update error
            }
          } else {
            console.warn("HomePage: User not found for updating remaining questions after AI call.");
          }
        }
      } else {
        setAnswer(t('home.noAnswerReceived'));
        setShortAnswer(t('home.noAnswerReceived'));
        setFullAnswer(t('home.noAnswerReceived'));
        console.log("HomePage: No answer received from AI API.");
      }
    } catch (error: any) {
      console.error("HomePage: AI API call error:", error);
      let errorMessage = error.message.includes('Network request failed') || error.message.includes('fetch') ?
        '❌ Connection timeout! Check your internet and try again.' :
        '🚧 AI is taking a break! Please try again in a moment.';
      setAnswer(errorMessage);
      setShortAnswer(errorMessage);
      setFullAnswer(errorMessage);
      console.log("HomePage: State 'answer', 'shortAnswer', 'fullAnswer' updated with error message.");
    } finally {
      setLoading(false);
      console.log("HomePage: State 'loading' set to false (AI chat).");
    }
  }, [question, isVIP, remainingQuestions, t, isOnline]);

  const truncateText = useCallback((text: string, maxWords = 20) => {
    console.log(`HomePage: truncateText called with text length ${text.length}, maxWords ${maxWords}.`);
    const words = text.split(" ");
    const truncated = words.slice(0, maxWords).join(" ") + (words.length > maxWords ? "..." : "");
    console.log("HomePage: Truncated text:", truncated);
    return truncated;
  }, []);

  const handleUseCoinsForAI = useCallback(async () => {
    console.log("HomePage: handleUseCoinsForAI called.");
    const auth = getAuth();
    const user = auth.currentUser;
    console.log("HomePage: Current user for coin usage:", user?.uid || "None");

    if (!user) {
      Alert.alert(t('home.errorTitle'), t('home.userNotSignedIn'));
      console.log("HomePage: Coin usage failed: User not signed in.");
      return;
    }

    if (coins < AI_QUESTION_COST) {
      Alert.alert('❌ Not Enough Coins', `You need ${AI_QUESTION_COST} coins for an extra question!`);
      console.log(`HomePage: Coin usage failed: Not enough coins. Needed ${AI_QUESTION_COST}, had ${coins}.`);
      return;
    }

    const db = getFirestore();
    const userRef = doc(db, "users", user.uid);
    console.log("HomePage: User document reference for coin usage:", userRef.path);

    try {
      await runTransaction(db, async (transaction) => {
        console.log("HomePage: Coin usage transaction started.");
        const userDoc = await transaction.get(userRef);
        console.log("HomePage: User document snapshot fetched for transaction.");

        if (!userDoc.exists()) {
          console.error("HomePage: User document does not exist during coin usage transaction.");
          throw new Error("UserDocNotFound");
        }

        const userData = userDoc.data() as UserData;
        const currentCoins = userData.coins || 0;
        const currentQuestions = userData.remainingFreeAIQuestions || 0;
        console.log(`HomePage: Transaction: Current coins: ${currentCoins}, current questions: ${currentQuestions}.`);

        if (currentCoins < AI_QUESTION_COST) {
          console.warn("HomePage: Transaction: Not enough coins during double-check.");
          throw new Error("NotEnoughCoins");
        }

        transaction.update(userRef, {
          coins: currentCoins - AI_QUESTION_COST,
          remainingFreeAIQuestions: currentQuestions + 1,
        });
        console.log(`HomePage: Transaction: Coins deducted by ${AI_QUESTION_COST}, questions increased by 1.`);
      });

      Alert.alert('🎉 Success!', 'You gained an extra AI question! Game on!');
      console.log("HomePage: Coin usage for AI question successful.");
    } catch (err: any) {
      console.error("HomePage: Error using coins for AI:", err);

      let errorMessage = 'Transaction failed. Please try again!';
      if (err.message === "NotEnoughCoins") {
        errorMessage = `❌ You need ${AI_QUESTION_COST} coins for this!`;
      } else if (err.message === "UserDocNotFound") {
        errorMessage = t('home.userDoesNotExistContactSupport');
      }

      Alert.alert('❌ Oops!', errorMessage);
    }
  }, [coins, t]);

  const openVideoModal = useCallback((videoUrl: string) => {
    console.log("HomePage: openVideoModal called with URL:", videoUrl);
    if (!videoUrl) {
      Alert.alert('❌ Video Error', 'This video is currently unavailable!');
      console.log("HomePage: Video modal failed: No video URL provided.");
      return;
    }
    setSelectedVideoUrl(videoUrl);
    console.log("HomePage: State 'selectedVideoUrl' updated.");
    setVideoModalVisible(true);
    console.log("HomePage: State 'videoModalVisible' set to true.");
  }, []);

  const handleHeroPress = useCallback((card: HeroCard) => {
    console.log("HomePage: handleHeroPress called for card:", card.id, card.title);
    if (card.videoUrl) {
      openVideoModal(card.videoUrl);
      console.log("HomePage: Hero card press -> opening video modal.");
    } else if (card.articleId) {
      router.push({
        pathname: "/screens/ArticleScreen",
        params: { articleId: card.articleId }
      });
      console.log("HomePage: Hero card press -> navigating to ArticleScreen.");
    } else if (card.type === "card") {
      router.push("/screens/GenerateCard");
      console.log("HomePage: Hero card press -> navigating to GenerateCard.");
    } else {
      Alert.alert('❌ Coming Soon', 'This feature will be available soon!');
      console.log("HomePage: Hero card press -> feature not yet available.");
    }
  }, [openVideoModal, router]);

  const handleShufflePress = useCallback(() => {
    console.log("HomePage: handleShufflePress called.");
    router.push('/screens/Raffle');
    console.log("HomePage: Navigating to Raffle screen.");
  }, [router]);

  // Enhanced render function with accessibility
  const renderHeroCard = useCallback(({ item }: { item: HeroCard }) => {
    console.log("HomePage: renderHeroCard called for item:", item.id);
    return (
      <FadeTouchable
        onPress={() => handleHeroPress(item)}
        style={styles.heroCardTouchable}
        accessibilityLabel={`Hero card: ${item.title}`}
        accessibilityHint="Tap to view content"
      >
        <Image
          source={{ uri: item.imageUrl }}
          style={styles.heroCardImageBackground}
          onError={({ nativeEvent: { error } }) => console.log('HomeScreen: Hero image failed to load:', item.imageUrl, error)}
          defaultSource={require('../../assets/images/fallback.png')}
        />
        <View style={styles.heroCardTextContainer}>
          <Text style={styles.heroCardTitle}>{item.title}</Text>
          <Text style={styles.heroCardSubtitle}>{item.subtitle}</Text>
        </View>
      </FadeTouchable>
    );
  }, [handleHeroPress]);

  // Loading state
  if (pageLoading) {
    console.log("HomePage: Displaying page loading indicator.");
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FFD700" />
        <Text style={styles.loadingText}>⚽ Loading your game...</Text>
      </View>
    );
  }
  console.log("HomePage: Page loading complete. Rendering main content.");

  return (
    <ErrorBoundary>
      <ImageBackground
        source={require('../../assets/images/bk final.png')}
        style={styles.pageBackground}
        imageStyle={{ transform: [{ translateY: -10 }] }}
      >
        <OfflineBanner isVisible={!isOnline} />
        {showRewardPopup && <RewardPopup amount={DAILY_REWARD_AMOUNT} type="coins" />}

        <ScrollView
          contentContainerStyle={{ paddingTop: 110 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Header Section */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              {!dailyRewardClaimed ? (
                <FadeTouchable
                  onPress={handleDailyReward}
                  accessibilityLabel="Daily reward"
                  accessibilityHint="Tap to claim your daily coins"
                >
                  <View style={styles.dailyRewardContainer}>
                    <Animated.Image
                      source={require('../../assets/icons/coin.png')}
                      style={[styles.pulsingCoin, { transform: [{ scale: pulseAnim }] }]}
                      resizeMode="contain"
                    />
                    <View style={styles.badgeOverlay}>
                      <Text style={styles.badgeText}>
                        +{DAILY_REWARD_AMOUNT}💰
                      </Text>
                    </View>
                  </View>
                </FadeTouchable>
              ) : (
                <View style={styles.claimedRewardContainer}>
                  <View style={styles.claimedRewardCircle}>
                    <ImageBackground
                      source={require('../../assets/icons/coin.png')}
                      style={styles.rewardCircle}
                      imageStyle={{ resizeMode: 'contain' }}
                    >
                      <Text style={styles.rewardCircleText}>✔</Text>
                    </ImageBackground>
                  </View>
                  <Text style={styles.rewardCountdown}>{dailyRewardCountdownState}</Text>
                </View>
              )}
            </View>

            <View style={styles.headerRight}>
              {isVIP && <VIPBadge />}
              <Text style={styles.userHomeText}>
                {t('home.userHomeTitle', { name: username })}
              </Text>
              <View style={styles.coinRewardRow}>
                <Text style={styles.headerCoinBalance}>
                  {coins?.toLocaleString()} 💰
                </Text>
              </View>
              <Link href="/profile" asChild>
                <TouchableOpacity style={styles.headerButton}>
                  <Image
                    source={{ uri: 'https://via.placeholder.com/40' }}
                    style={styles.profileImage}
                    defaultSource={require('../../assets/images/fallback.png')}
                  />
                </TouchableOpacity>
              </Link>
            </View>
          </View>

          {/* Academy Button */}
          {academyVisible && (
            <View style={styles.academyButtonWrapper}>
              <FadeTouchable
                onPress={() => {
                  router.push('/screens/FCAcademy');
                  console.log("HomePage: Navigating to FCAcademy screen.");
                }}
                accessibilityLabel="FC Academy"
                accessibilityHint="Enter the academy for training"
              >
                <LinearGradient
                  colors={['#00FFC3', '#006eff']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.academyTopButton}
                >
                  <Text style={styles.academyTopButtonText}>
                    {t('home.enterAcademyButton')}
                  </Text>
                </LinearGradient>
              </FadeTouchable>
            </View>
          )}

          {/* Hero Cards Section */}
          {heroLoading ? (
            <View style={styles.heroSkeletonContainer}>
              {[1, 2, 3].map(i => (
                <HeroCardSkeleton key={i} />
              ))}
            </View>
          ) : heroCards.length > 0 ? (
            <>
              <FlatList
                data={heroCards}
                keyExtractor={(item) => item.id}
                horizontal
                pagingEnabled
                snapToAlignment="center"
                showsHorizontalScrollIndicator={false}
                decelerationRate={0.90}
                onScroll={Animated.event(
                  [{ nativeEvent: { contentOffset: { x: scrollX } } }],
                  { useNativeDriver: false }
                )}
                renderItem={renderHeroCard}
              />
              <View style={styles.heroDotsContainer}>
                {heroCards.map((_, index) => {
                  const inputRange = [
                    (index - 1) * SCREEN_WIDTH * 0.95,
                    index * SCREEN_WIDTH * 0.95,
                    (index + 1) * SCREEN_WIDTH * 0.95,
                  ];
                  const dotOpacity = scrollX.interpolate({
                    inputRange,
                    outputRange: [0.3, 1, 0.3],
                    extrapolate: 'clamp'
                  });
                  const dotScale = scrollX.interpolate({
                    inputRange,
                    outputRange: [0.8, 1.2, 0.8],
                    extrapolate: 'clamp'
                  });
                  return (
                    <Animated.View
                      key={index}
                      style={[
                        styles.heroDot,
                        { opacity: dotOpacity, transform: [{ scale: dotScale }] }
                      ]}
                    />
                  );
                })}
              </View>
            </>
          ) : null}

          {/* Daily Challenge & Weekly Raffle Section */}
          <View style={styles.challengeMainContainer}>
            {/* Daily Challenge Card */}
            <FadeTouchable
              onPress={() => {
                router.push('/screens/DailyChallenge');
                console.log("HomePage: Navigating to DailyChallenge screen.");
              }}
              style={styles.dailyChallengeWrapper}
              accessibilityLabel="Daily Challenge"
              accessibilityHint="Complete daily challenges to earn coins"
            >
              <ImageBackground
                source={require('../../assets/images/daily challenge3.png')}
                style={styles.dailyChallengeCard}
                imageStyle={styles.dailyChallengeImageStyle}
                defaultSource={require('../../assets/images/fallback.png')}
              >
                <LinearGradient
                  colors={['rgba(0,0,0,0.7)', 'rgba(0,0,0,0.8)']}
                  style={styles.challengeGradientOverlay}
                >
                  <View style={styles.challengeCardContents}>
                    <View style={styles.challengeIconContainer}>
                      <Gift size={20} color="#FFD700" />
                    </View>
                    <Text style={styles.challengeTitle}>
                      {t('home.dailyChallengeTitle')}
                    </Text>
                    <Text style={styles.challengeSubtitle}>
                      {t('home.dailyChallengeSubtitle')}
                    </Text>
                    <View style={styles.progressBarBackground}>
                      <Animated.View
                        style={[
                          styles.progressBarFill,
                          {
                            width: progressAnim.interpolate({
                              inputRange: [0, 1],
                              outputRange: ['0%', '100%'],
                              extrapolate: 'clamp'
                            }),
                          },
                        ]}
                      />
                    </View>
                    <Text style={styles.progressText}>
                      {dailyChallengeCoins}/1000 💰
                    </Text>
                  </View>
                </LinearGradient>
              </ImageBackground>
            </FadeTouchable>

            {/* Weekly Raffle Card */}
            <FadeTouchable
              onPress={handleShufflePress}
              style={styles.weeklyRaffleWrapper}
              accessibilityLabel="Weekly Raffle"
              accessibilityHint="Join the weekly raffle to win prizes"
            >
              <ImageBackground
                source={require('../../assets/images/daily challenge3.png')}
                style={styles.weeklyRaffleCard}
                imageStyle={styles.weeklyRaffleImageStyle}
                defaultSource={require('../../assets/images/fallback.png')}
              >
                <LinearGradient
                  colors={['rgba(255,107,53,0.7)', 'rgba(139,69,19,0.8)']}
                  style={styles.raffleGradientOverlay}
                >
                  <View style={styles.raffleCardContents}>
                    <View style={styles.raffleIconContainer}>
                      <Trophy size={20} color="#FFD700" />
                    </View>
                    <Text style={styles.raffleTitle}>
                      {t('home.weeklyRaffleButton')}
                    </Text>
                    <Text style={styles.raffleSubtitle}>
                      {t('home.weeklyRaffleSubtitle')}
                    </Text>
                    <Text style={styles.raffleCountdownLabel}>
                      Fridays 8 PM EST
                    </Text>
                    <View style={styles.countdownTimeContainer}>
                      <Text style={styles.raffleCountdownTime}>
                        {trickCountdown}
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={[
                        styles.notifyMeButton,
                        isSubscribedToNotifications && styles.notifyMeButtonSubscribed
                      ]}
                      onPress={handleNotifyMe}
                      activeOpacity={0.8}
                    >
                      <Text style={[
                        styles.notifyMeText,
                        isSubscribedToNotifications && styles.notifyMeTextSubscribed
                      ]}>
                        {isSubscribedToNotifications ? ' Subscribed' : '🔔 Notify Me'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </LinearGradient>
              </ImageBackground>
            </FadeTouchable>
          </View>

          {/* Enhanced Ask AI Section */}
          <ImageBackground
            source={require('../../assets/images/bk8.png')}
            style={styles.askAIContainer}
            imageStyle={styles.askAIImageStyle}
            defaultSource={require('../../assets/images/fallback.png')}
          >
            <Text style={styles.askAISectionTitleStyle}>
              {t('home.askAISectionTitle')}
            </Text>

            <View style={styles.askInputContainer}>
              <TextInput
                style={[
                  styles.askInput,
                  { height: Math.max(40, Math.min(inputHeight, 200)) }
                ]}
                placeholder="⚽ Ask me anything about football!"
                placeholderTextColor="#bbb"
                value={question}
                onChangeText={(text) => {
                  setQuestion(text);
                  console.log("HomePage: AI question input changed:", text);
                }}
                multiline={true}
                scrollEnabled={true}
                onContentSizeChange={(event) =>
                  setInputHeight(event.nativeEvent.contentSize.height)
                }
                editable={!loading}
                maxLength={500}
              />
            </View>

            <FadeTouchable
              onPress={handleAskAI}
              style={[styles.askButton, loading && styles.askButtonDisabled]}
              disabled={loading}
              accessibilityLabel="Ask AI"
              accessibilityHint="Get AI answers to your questions"
            >
              <View style={styles.askButtonContents}>
                {loading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Brain size={24} color="#FFFFFF" />
                )}
                <Text style={styles.askButtonText}>
                  {loading ? '💬 Thinking...' : '💬 Ask AI'}
                </Text>
              </View>
            </FadeTouchable>

            {!isVIP && (remainingQuestions <= 0) && (
              <Text style={styles.remainingQuestions}>
                ❌ {remainingQuestions} questions left (resets biweekly)
              </Text>
            )}
            {!isVIP && (remainingQuestions > 0) && (
              <Text style={styles.remainingQuestions}>
                ✅ {remainingQuestions} questions left (resets biweekly)
              </Text>
            )}


            {answer !== '' && (
              <View style={styles.answerContainer}>
                <Text style={styles.answerText}>{shortAnswer}</Text>
                {fullAnswer.length > shortAnswer.length && (
                  <TouchableOpacity
                    style={styles.viewMoreButton}
                    onPress={() => {
                      router.push({
                        pathname: "/AskAIFullPage",
                        params: { fullAnswer: encodeURIComponent(fullAnswer) }
                      });
                      console.log("HomePage: Navigating to AskAIFullPage.");
                    }}
                  >
                    <Text style={styles.viewMoreText}>
                      View Full Answer 👉
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            {(!isVIP && remainingQuestions <= 0) && (
              <View style={styles.extraOptions}>
                <FadeTouchable
                  style={styles.coinOption}
                  onPress={handleUseCoinsForAI}
                  accessibilityLabel="Buy question with coins"
                >
                  <LinearGradient
                    colors={['#FFD700', '#FFA500']}
                    style={styles.coinOptionGradient}
                  >
                    <View style={styles.optionContents}>
                      <PlusCircle size={20} color="#000" />
                      <Text style={styles.optionText}>
                        💰 {AI_QUESTION_COST} Coins
                      </Text>
                    </View>
                  </LinearGradient>
                </FadeTouchable>

                <FadeTouchable
                  style={styles.membershipOption}
                  onPress={() => {
                    router.push("/screens/ManageMyAccount");
                    console.log("HomePage: Navigating to ManageMyAccount for VIP.");
                  }}
                  accessibilityLabel="Upgrade to VIP"
                >
                  <LinearGradient
                    colors={['#FFCD35', '#FF8C00']}
                    style={styles.membershipOptionGradient}
                  >
                    <View style={styles.optionContents}>
                      <Crown size={20} color="#FFF" />
                      <Text style={styles.membershipOptionText}>
                        👑 Go VIP
                      </Text>
                    </View>
                  </LinearGradient>
                </FadeTouchable>
              </View>
            )}
          </ImageBackground>

          {/* Did You Know Section */}
          <View style={styles.didYouKnowOuterContainer}>
            <LinearGradient
              colors={['#000000', '#022d45']}
              style={styles.didYouKnowContainer}
            >
              <View style={styles.didYouKnowContents}>
                <HelpCircle size={20} color="#FFA500" style={styles.didYouKnowIcon} />
                <Animated.View
                  style={[styles.didYouKnowTextContainer, { opacity: didYouKnowTextOpacity }]}
                >
                  <Text style={styles.didYouKnowText}>
                    {t('home.didYouKnowFull', {
                      tip: t(didYouKnowTipKeys[currentDidYouKnowIndex])
                    })}
                  </Text>
                </Animated.View>
              </View>
            </LinearGradient>
          </View>

          {/* Enhanced Video Guides Section */}
          <ImageBackground
            source={require('../../assets/images/video room3.png')}
            style={styles.quickTipsContainer}
            imageStyle={styles.quickTipsImageStyle}
            defaultSource={require('../../assets/images/fallback.png')}
          >
            <Text style={styles.videoGuideSectionTitleStyle}>
              {t('home.videoGuideSectionTitle')}
            </Text>

            <View style={styles.videoGridContainer}>
              {videosLoading ? (
                [0, 1, 2].map(index => (
                  <VideoCardSkeleton key={index} index={index} />
                ))
              ) : homeVideos.length > 0 ? (
                homeVideos.map((video, index) => (
                  <FadeTouchable
                    key={video.id}
                    style={[
                      styles.videoCard,
                      index === 0 && styles.videoCard1,
                      index === 1 && styles.videoCard2,
                      index === 2 && styles.videoCard3,
                    ]}
                    onPress={() => openVideoModal(video.video_url)}
                    accessibilityLabel={`Video: ${video.title}`}
                    accessibilityHint="Tap to watch video"
                  >
                    <View style={styles.videoCardImageContainer}>
                      <Image
                        source={{ uri: video.thumbnail_url }}
                        style={styles.videoThumbnail}
                        defaultSource={require('../../assets/images/fallback.png')}
                        onError={({ nativeEvent: { error } }) => console.log('HomeScreen: Video thumbnail failed to load:', video.thumbnail_url, error)}
                      />
                      <View style={styles.videoOverlay}>
                        <View style={styles.playButton}>
                          <Text style={styles.playIcon}>▶</Text>
                        </View>
                      </View>
                    </View>
                    <Text style={styles.videoTitle} numberOfLines={2}>
                      {video.title}
                    </Text>
                  </FadeTouchable>
                ))
              ) : (
                <View style={styles.videosLoadingContainer}>
                  <Text style={styles.videosLoadingText}>
                    🚫 No videos available right now
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.moreVideosButtonContainer}>
              <FadeTouchable
                onPress={() => {
                  router.push('/screens/MoreVideos');
                  console.log("HomePage: Navigating to MoreVideos screen.");
                }}
                style={styles.watchMoreButton}
                accessibilityLabel="More videos"
              >
                <LinearGradient
                  colors={['#01361a', '#001e24']}
                  style={styles.watchMoreButtonGradient}
                >
                  <Text style={styles.watchMoreButtonText}>
                    {t('home.moreVideosButton')}
                  </Text>
                </LinearGradient>
              </FadeTouchable>
            </View>
          </ImageBackground>

          {/* DNA Section */}
          <View style={styles.dnaOuterContainer}>
            <ImageBackground
              source={require('../../assets/images/dna.png')}
              style={styles.dnaContainer}
              imageStyle={styles.dnaImageStyle}
              defaultSource={require('../../assets/images/fallback.png')}
            >
              <View style={styles.dnaOverlay} />
              <View style={styles.dnaContent}>
                <Text style={styles.dnaMainText}>{t('home.dnaMainText')}</Text>
                <Text style={styles.dnaSubText}>{t('home.dnaSubText')}</Text>
                <FadeTouchable
                  onPress={() => {
                    router.push('/Dna/quiz');
                    console.log("HomePage: Navigating to DNA Quiz screen.");
                  }}
                  style={styles.dnaButtonTouchable}
                  accessibilityLabel="Start DNA quiz"
                >
                  <LinearGradient
                    colors={['#FFD700', '#FFA500']}
                    style={styles.dnaButtonGradient}
                  >
                    <Text style={styles.dnaButtonText}>
                      {t('home.startQuizButton')}
                    </Text>
                  </LinearGradient>
                </FadeTouchable>
              </View>
            </ImageBackground>
          </View>
        </ScrollView>

        {/* Coin Drop Animation */}
        {showCoinDrop && (
          <Animated.View style={[styles.coinDrop, { opacity: coinOpacity }]}>
            <LinearGradient
              colors={['#FFD700', '#FFC107']}
              style={styles.coinButtonGradient}
            >
              <Text style={styles.coinButtonText}>
                +{DAILY_REWARD_AMOUNT} 💰
              </Text>
            </LinearGradient>
          </Animated.View>
        )}

        {/* Enhanced Video Modal */}
        <Modal
          visible={videoModalVisible}
          animationType="slide"
          onRequestClose={() => {
            setVideoModalVisible(false);
            setSelectedVideoUrl(''); // Clear URL on close
            console.log("HomePage: Video modal closed. State 'videoModalVisible' set to false, 'selectedVideoUrl' cleared.");
          }}
        >
          <View style={styles.modalContainer}>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => {
                setVideoModalVisible(false);
                setSelectedVideoUrl('');
                console.log("HomePage: Video modal close button pressed.");
              }}
            >
              <Text style={styles.modalCloseText}>✖ Close</Text>
            </TouchableOpacity>
            {selectedVideoUrl && (
              <WebView
                source={{ uri: selectedVideoUrl }}
                style={styles.webview}
                allowsFullscreenVideo
                startInLoadingState
                renderLoading={() => (
                  <View style={styles.webviewLoading}>
                    <ActivityIndicator size="large" color="#FFD700" />
                    <Text style={styles.webviewLoadingText}>⚽ Loading video...</Text>
                  </View>
                )}
              />
            )}
          </View>
        </Modal>
      </ImageBackground>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  // Error boundary
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
    padding: 20,
  },
  errorText: {
    color: '#FFD700',
    fontSize: 16,
    textAlign: 'center',
    fontWeight: '600',
  },

  // Loading states
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  loadingText: {
    color: '#FFD700',
    fontSize: 16,
    marginTop: 10,
    fontWeight: '600',
  },

  // Offline banner
  offlineBanner: {
    position: 'absolute',
    top: 50,    // Changed from 0 to 50
    left: 0,
    right: 0,
    backgroundColor: '#FF4444',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,    // Increased from 8 to 12
    paddingTop: 15,         // Reduced from 40 to 15
    zIndex: 1000,
    elevation: 1000,
  },
  offlineBannerText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },

  // VIP Badge
  vipBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    marginBottom: 5,
    alignSelf: 'flex-end',
    borderWidth: 1,
    borderColor: '#FFA500',
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
    elevation: 5,
  },
  vipBadgeText: {
    color: '#000',
    fontSize: 10,
    fontWeight: 'bold',
    marginHorizontal: 3,
  },

  // Skeleton loading
  heroSkeletonContainer: {
    flexDirection: 'row',
    paddingHorizontal: 15,
    marginBottom: 25,
  },
  heroCardSkeleton: {
    width: SCREEN_WIDTH * 0.95,
    height: 240,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    marginHorizontal: (SCREEN_WIDTH * 0.05) / 2,
    overflow: 'hidden',
  },
  heroCardSkeletonImage: {
    width: '100%',
    height: '75%',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  heroCardSkeletonText: {
    padding: 16,
  },
  heroCardSkeletonTitle: {
    width: '70%',
    height: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 4,
    marginBottom: 8,
  },
  heroCardSkeletonSubtitle: {
    width: '50%',
    height: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 4,
  },
  videoCardSkeleton: {
    width: '31%',
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  videoSkeletonImage: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  videoSkeletonText: {
    height: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    margin: 6,
    borderRadius: 4,
  },

  // Main layout
  pageBackground: {
    flex: 1,
    width: '100%',
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingBottom: 5,
    alignItems: 'center',
    marginTop: -100,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerRight: {
    flexDirection: 'column',
    alignItems: 'flex-end',
    marginTop: -5,
  },
  headerButton: {
    padding: 5,
  },
  profileImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginTop: 5,
  },
  userHomeText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 60,
    marginRight: 5,
  },
  coinRewardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
  },
  headerCoinBalance: {
    color: '#FFD700',
    fontSize: 18,
    marginRight: 8,
    fontWeight: '700',
  },

  // Daily reward
  dailyRewardContainer: {
    position: 'relative',
    alignItems: 'center',
    marginTop: 20,
    marginLeft: 5,
  },
  claimedRewardContainer: {
    alignItems: 'center',
  },
  claimedRewardCircle: {
    transform: [{ scale: 0.9 }],
    opacity: 0.3,
  },
  rewardCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 25,
  },
  rewardCircleText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#00FF00',
  },
  rewardCountdown: {
    fontSize: 10,
    color: '#FFD700',
    marginTop: 5,
    fontWeight: '600',
  },
  pulsingCoin: {
    width: 60,
    height: 60,
    resizeMode: 'contain',
    marginTop: 25,
    marginLeft: 8,
  },
  badgeOverlay: {
    position: 'absolute',
    top: 15,
    right: -15,
    backgroundColor: '#FFD700',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowOffset: { width: 1, height: 1 },
    shadowRadius: 4,
    elevation: 4,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#000',
  },

  // Academy button
  academyButtonWrapper: {
    marginTop: 10,
    marginBottom: 15,
    marginHorizontal: 15,
    zIndex: 10,
  },
  academyTopButton: {
    paddingVertical: 16,
    paddingHorizontal: 30,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#00FFC3',
    shadowColor: '#00FFF7',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.95,
    shadowRadius: 16,
    elevation: 18,
  },
  academyTopButtonText: {
    fontSize: 18,
    fontWeight: '900',
    color: '#FFFFFF',
    textShadowColor: '#00FFF7',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },

  // Hero cards
  heroCardTouchable: {
    width: SCREEN_WIDTH * 0.95,
    marginHorizontal: (SCREEN_WIDTH * 0.05) / 2,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#00FFFF',
  },
  heroCardImageBackground: {
    width: '100%',
    height: 240,
    justifyContent: 'flex-end',
  },
  heroCardTextContainer: {
    backgroundColor: 'rgba(0,0,0,0.6)',
    padding: 16,
    paddingBottom: 18,
  },
  heroCardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  heroCardSubtitle: {
    fontSize: 14,
    color: '#ccc',
  },
  heroDotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 10,
    marginBottom: 25,
    zIndex: 10,
  },
  heroDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginHorizontal: 5,
    backgroundColor: '#FFD700',
  },

  // Challenge section
  challengeMainContainer: {
    flexDirection: 'row',
    marginHorizontal: 15,
    marginVertical: 20,
    gap: 10,
  },

  // Daily Challenge
  dailyChallengeWrapper: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 6,
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  dailyChallengeCard: {
    height: 180,
    justifyContent: 'center',
  },
  dailyChallengeImageStyle: {
    borderRadius: 12,
  },
  challengeGradientOverlay: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 12,
    justifyContent: 'center',
    borderRadius: 12,
  },
  challengeCardContents: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  challengeIconContainer: {
    width: 36,
    height: 36,
    backgroundColor: 'rgba(255, 215, 0, 0.3)',
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    borderWidth: 2,
    borderColor: 'rgba(255, 215, 0, 0.6)',
  },
  challengeTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 1)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  challengeSubtitle: {
    fontSize: 10,
    color: '#FFFFFF',
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 8,
    textShadowColor: 'rgba(0, 0, 0, 1)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  progressBarBackground: {
    width: '100%',
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.4)',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#FFD700',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 1)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },

  // Weekly Raffle
  weeklyRaffleWrapper: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 6,
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  weeklyRaffleCard: {
    height: 180,
    justifyContent: 'center',
  },
  weeklyRaffleImageStyle: {
    borderRadius: 12,
  },
  raffleGradientOverlay: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 12,
    justifyContent: 'center',
    borderRadius: 12,
  },
  raffleCardContents: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  raffleIconContainer: {
    width: 36,
    height: 36,
    backgroundColor: 'rgba(255, 215, 0, 0.3)',
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    borderWidth: 2,
    borderColor: 'rgba(255, 215, 0, 0.6)',
  },
  raffleTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 1)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  raffleSubtitle: {
    fontSize: 10,
    color: '#FFFFFF',
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 6,
    textShadowColor: 'rgba(0, 0, 0, 1)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  raffleCountdownLabel: {
    fontSize: 9,
    color: '#FFFFFF',
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 4,
    textShadowColor: 'rgba(0, 0, 0, 1)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  countdownTimeContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.4)',
    marginBottom: 6,
  },
  raffleCountdownTime: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#FFD700',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 1)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },

  // Notification button
  notifyMeButton: {
    backgroundColor: 'rgba(255, 215, 0, 0.9)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.5,
    shadowRadius: 3,
    elevation: 3,
  },
  notifyMeButtonSubscribed: {
    backgroundColor: 'rgba(34, 197, 94, 0.9)',
  },
  notifyMeText: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#000',
    textAlign: 'center',
  },
  notifyMeTextSubscribed: {
    color: '#FFF',
  },

  // Ask AI section
  askAIContainer: {
    paddingHorizontal: 15,
    paddingTop: 40,
    paddingBottom: 20,
    marginHorizontal: 10,
    marginVertical: 15,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#bbbede',
    overflow: 'hidden',
    position: 'relative',
  },
  askAIImageStyle: {
    borderRadius: 10,
    opacity: 0.9,
  },
  askAISectionTitleStyle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    position: 'absolute',
    top: 15,
    left: 0,
    right: 0,
  },
  askInputContainer: {
    width: '100%',
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#bbbede',
    marginBottom: 15,
  },
  askInput: {
    color: "#fff",
    paddingHorizontal: 10,
    paddingVertical: 10,
    fontSize: 16,
    lineHeight: 22,
  },
  askButton: {
    backgroundColor: 'transparent',
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#39FF14',
    alignItems: 'center',
    justifyContent: 'center',
  },
  askButtonDisabled: {
    opacity: 0.6,
  },
  askButtonContents: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  askButtonText: {
    marginLeft: 8,
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
  remainingQuestions: {
    textAlign: 'center',
    color: '#FFD700',
    marginTop: 10,
    fontSize: 12,
    fontWeight: '600',
  },
  answerContainer: {
    padding: 12,
    borderRadius: 8,
    marginTop: 15,
    borderWidth: 1,
    borderColor: '#39FF14',
    backgroundColor: 'rgba(0,255,0,0.05)',
  },
  answerText: {
    fontSize: 14,
    color: "#fcff00",
    fontWeight: "500",
    lineHeight: 20,
  },
  viewMoreButton: {
    marginTop: 10,
    alignSelf: "flex-end",
  },
  viewMoreText: {
    fontSize: 13,
    color: "#FFFFFF",
    fontWeight: "600",
    backgroundColor: "rgba(0, 122, 255, 0.8)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  extraOptions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 15,
    gap: 10,
  },

  // Enhanced option buttons
  coinOption: {
    flex: 1,
    borderRadius: 10,
    overflow: 'hidden',
    elevation: 3,
  },
  coinOptionGradient: {
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  membershipOption: {
    flex: 1,
    borderRadius: 10,
    overflow: 'hidden',
    elevation: 3,
  },
  membershipOptionGradient: {
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionContents: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionText: {
    marginLeft: 6,
    color: '#000',
    fontWeight: 'bold',
    fontSize: 12,
    textAlign: 'center',
  },
  membershipOptionText: {
    marginLeft: 6,
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 12,
    textAlign: 'center',
  },

  // Did you know
  didYouKnowOuterContainer: {
    opacity: 0.9,
    marginHorizontal: 10,
    marginVertical: 10,
  },
  didYouKnowContainer: {
    padding: 15,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#bbbede',
  },
  didYouKnowContents: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  didYouKnowIcon: {
    marginRight: 12,
  },
  didYouKnowTextContainer: {
    flex: 1,
  },
  didYouKnowText: {
    color: '#FFFFFF',
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
  },

  // Video section
  quickTipsContainer: {
    paddingHorizontal: 15,
    paddingTop: 50,
    paddingBottom: 20,
    borderRadius: 10,
    margin: 10,
    borderWidth: 2,
    borderColor: '#bbbede',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 8,
    position: 'relative',
  },
  quickTipsImageStyle: {
    borderRadius: 10,
  },
  videoGuideSectionTitleStyle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    position: 'absolute',
    top: 15,
    left: 0,
    right: 0,
  },
  videoGridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 15,
    paddingHorizontal: 5,
  },
  videoCard: {
    width: '31%',
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  videoCard1: {
    marginTop: 20,
    left: -9,
  },
  videoCard2: {
    marginTop: 20,
    left: -2,
  },
  videoCard3: {
    marginTop: 20,
    left: 3,
  },
  videoCardImageContainer: {
    position: 'relative',
    width: '100%',
    aspectRatio: 16 / 9,
  },
  videoThumbnail: {
    width: '100%',
    height: '100%',
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
  },
  videoOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
  },
  playButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
  },
  playIcon: {
    color: '#333',
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 2,
  },
  videoTitle: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
    paddingHorizontal: 6,
    paddingVertical: 8,
    lineHeight: 14,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  videosLoadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  videosLoadingText: {
    color: '#ccc',
    fontStyle: 'italic',
    fontSize: 14,
    textAlign: 'center',
  },
  moreVideosButtonContainer: {
    marginTop: 20,
    alignItems: 'center',
  },
  watchMoreButton: {
    alignSelf: 'center',
  },
  watchMoreButtonGradient: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#bbbede',
  },
  watchMoreButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    textShadowColor: '#39FF14',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },

  // DNA section
  dnaOuterContainer: {
    marginHorizontal: 10,
    marginVertical: 20,
  },
  dnaContainer: {
    height: 220,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#bbbede',
  },
  dnaImageStyle: {
    borderRadius: 10,
  },
  dnaOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    zIndex: 1,
  },
  dnaContent: {
    zIndex: 2,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  dnaMainText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fffc00',
    marginBottom: 8,
    textShadowColor: '#000',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 6,
    textAlign: 'center',
  },
  dnaSubText: {
    color: '#fff',
    fontSize: 14,
    fontStyle: 'italic',
    textAlign: 'center',
    marginBottom: 20,
    textShadowColor: '#000',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 4,
    lineHeight: 20,
  },
  dnaButtonTouchable: {},
  dnaButtonGradient: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
    elevation: 5,
  },
  dnaButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#121212',
    textAlign: 'center',
  },

  // Coin drop animation
  coinDrop: {
    position: 'absolute',
    alignSelf: 'center',
    zIndex: 999,
    top: '45%',
  },
  coinButtonGradient: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
  },
  coinButtonText: {
    color: '#333',
    fontSize: 16,
    fontWeight: 'bold',
  },

  // Modal
  modalContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  modalCloseButton: {
    padding: 15,
    backgroundColor: '#FF4444',
    alignSelf: 'flex-end',
    margin: 10,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#39FF14',
    shadowColor: '#FF4444',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 5,
  },
  modalCloseText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
  webview: {
    flex: 1,
  },
  webviewLoading: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  webviewLoadingText: {
    color: '#FFD700',
    fontSize: 16,
    marginTop: 10,
    fontWeight: '600',
  },
});