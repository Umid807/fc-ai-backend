import React, { useRef, useState, useLayoutEffect, useEffect } from 'react';
import i18n from '../i18n/i18n';
import { useTranslation } from 'react-i18next';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Animated,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Image,
  ScrollView,
  ImageBackground,
  Modal,
  SafeAreaView,
  ActivityIndicator,
  FlatList
} from 'react-native';
import { WebView } from 'react-native-webview';
import { useNavigation, useRoute } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';

// Firebase imports
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  getDocs,
  query,
  where,
  onSnapshot,
} from 'firebase/firestore';
import { getDatabase, ref, onValue } from 'firebase/database';
import { getAuth } from 'firebase/auth';
import { firebaseApp } from '../firebaseConfig';

// Custom components
import CustomHeader from '../screens/CustomHeader';
import DefensiveFundtabl from '../screens/DefensiveFundamentals'; // Changed from SkillMovesTable

// Import local data
import { matchDayData } from '../../assets/data/prematch';
// Renamed import to avoid collision with local variables
import { halfTime as halfTimeDataFromFile } from '../../assets/data/half_break';

const { width, height } = Dimensions.get('window');
const db = getFirestore(firebaseApp);
const auth = getAuth(firebaseApp);

/** Helper: force HTTP -> HTTPS */
function ensureHttps(url = '') {
  console.log("DefensiveFundamentals: ensureHttps called with URL: " + url);
  if (!url) return '';
  const secureUrl = url.startsWith('http://') ? url.replace('http://', 'https://') : url;
  console.log("DefensiveFundamentals: ensureHttps transformed URL: " + secureUrl);
  return secureUrl;
}

/** Extract YouTube video ID */
function extractYoutubeVideoId(url = '') {
  console.log("DefensiveFundamentals: extractYoutubeVideoId called with URL: " + url);
  const regex = /(?:youtube\.com\/(?:[^/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
  const match = url.match(regex);
  const videoId = match ? match[1] : null;
  console.log("DefensiveFundamentals: Extracted YouTube video ID: " + videoId);
  return videoId;
}

/** Transform YouTube URL for embedding */
function transformYoutubeUrl(originalUrl = '', { autoplay = 0, mute = 0 } = {}) {
  console.log(`DefensiveFundamentals: transformYoutubeUrl called. Original URL: ${originalUrl}, Autoplay: ${autoplay}, Mute: ${mute}`);
  if (!originalUrl) return '';
  const videoId = extractYoutubeVideoId(originalUrl);
  if (!videoId) {
    console.log("DefensiveFundamentals: No video ID extracted, returning original URL.");
    return originalUrl;
  }
  let embedUrl = `https://www.youtube.com/embed/${videoId}`;
  const params = [];
  if (autoplay) params.push(`autoplay=${autoplay}`);
  if (mute) params.push(`mute=${mute}`);
  params.push('playsinline=1');
  if (params.length > 0) {
    embedUrl += `?${params.join('&')}`;
  }
  console.log("DefensiveFundamentals: Transformed YouTube embed URL: " + embedUrl);
  return embedUrl;
}

/** Get YouTube thumbnail URL */
function getYoutubeThumbnail(url = '') {
  console.log("DefensiveFundamentals: getYoutubeThumbnail called with URL: " + url);
  const videoId = extractYoutubeVideoId(url);
  const thumbnailUrl = videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : 'https://via.placeholder.com/150';
  console.log("DefensiveFundamentals: Generated YouTube thumbnail URL: " + thumbnailUrl);
  return thumbnailUrl;
}

/** Shuffle array in place */
function shuffle(array) {
  console.log("DefensiveFundamentals: shuffle array called with length: " + array.length);
  let currentIndex = array.length, randomIndex;
  while (currentIndex !== 0) {
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;
    [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
  }
  console.log("DefensiveFundamentals: Array shuffled.");
  return array;
}

/** Modal background image based on type */
function getModalBackground(type) {
  console.log("DefensiveFundamentals: getModalBackground called for type: " + type);
  return require('../../assets/images/Article bk.png');
}

export default function ExploreDefenseArsenallScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const router = useRouter();
  const { t } = useTranslation();
  console.log("ExploreDefenseArsenallScreen: Component mounted.");

  // ========== HEADER ==========
  useLayoutEffect(() => {
    console.log("ExploreDefenseArsenallScreen: useLayoutEffect setting navigation options.");
    navigation.setOptions({
      headerShown: true,
      header: (props) => (
        <CustomHeader
          {...props}
          navigation={navigation}
          route={route}
          options={{ headerTitle: t('common.proVision') }}
          back={props.back}
        />
      ),
    });
    console.log("ExploreDefenseArsenallScreen: Navigation options set.");
  }, [navigation, route, t]);

  // ========== STATE ==========
  const [selectedCategory, setSelectedCategory] = useState('formations');
  console.log("ExploreDefenseArsenallScreen: Initial state selectedCategory: " + selectedCategory);
  // Hero article (spotlight) state
  const [heroArticle, setHeroArticle] = useState(null);
  const [loadingHeroArticle, setLoadingHeroArticle] = useState(true);
  const [heroArticleError, setHeroArticleError] = useState(false);
  const [heroCountdown, setHeroCountdown] = useState('');
  console.log(`ExploreDefenseArsenallScreen: Initial hero article states - loading: ${loadingHeroArticle}, error: ${heroArticleError}, countdown: ${heroCountdown}`);
  // Hero carousel articles state (for grid or carousel, if used)
  const [heroArticles, setHeroArticles] = useState([]);
  const [currentHeroIndex, setCurrentHeroIndex] = useState(0);
  console.log(`ExploreDefenseArsenallScreen: Initial hero articles states - count: ${heroArticles.length}, current index: ${currentHeroIndex}`);

  const [loadingHeroArticles, setLoadingHeroArticles] = useState(true);
  const [heroArticlesError, setHeroArticlesError] = useState(false);
  console.log(`ExploreDefenseArsenallScreen: Initial hero articles list states - loading: ${loadingHeroArticles}, error: ${heroArticlesError}`);

  // Tactical videos
  const [tacticalVideos, setTacticalVideos] = useState([]);
  const [loadingTacticalVideos, setLoadingTacticalVideos] = useState(true);
  const [tacticalVideosError, setTacticalVideosError] = useState(false);
  console.log(`ExploreDefenseArsenallScreen: Initial tactical videos states - count: ${tacticalVideos.length}, loading: ${loadingTacticalVideos}, error: ${tacticalVideosError}`);

  // Modal
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  console.log(`ExploreDefenseArsenallScreen: Initial modal states - visible: ${modalVisible}, selected item: ${selectedItem}`);

  // For hero re-fetch
  const [hasRefetched, setHasRefetched] = useState(false);
  console.log("ExploreDefenseArsenallScreen: Initial hasRefetched: " + hasRefetched);

  // Pre-match modal
  const [selectedGameMode, setSelectedGameMode] = useState(null);
  const [selectedDivision, setSelectedDivision] = useState(null);
  const [showPrematchTips, setShowPrematchTips] = useState(false);
  const [prematchDisplayedTips, setPrematchDisplayedTips] = useState([]);
  console.log(`ExploreDefenseArsenallScreen: Initial pre-match states - gameMode: ${selectedGameMode}, division: ${selectedDivision}, showTips: ${showPrematchTips}, displayedTips: ${prematchDisplayedTips.length}`);

  // Mid-time modal
  const [midtimeStep, setMidtimeStep] = useState(1);
  const [midtimePerformance, setMidtimePerformance] = useState(null);
  const [midtimeConcern, setMidtimeConcern] = useState(null);
  const [showMidtimeTips, setShowMidtimeTips] = useState(false);
  const [midtimeDisplayedTips, setMidtimeDisplayedTips] = useState([]);
  console.log(`ExploreDefenseArsenallScreen: Initial mid-time states - step: ${midtimeStep}, performance: ${midtimePerformance}, concern: ${midtimeConcern}, showTips: ${showMidtimeTips}, displayedTips: ${midtimeDisplayedTips.length}`);

  // Post-game
  const [postgameStep, setPostgameStep] = useState(1);
  const [postgameAnswers, setPostgameAnswers] = useState({
    overallPerformance: 0,
    attacking: 0,
    defending: 0,
    control: 0,
    mentality: 0,
  });
  const [postgameProgress, setPostgameProgress] = useState(0);
  const [showPostgameSurveyComplete, setShowPostgameSurveyComplete] = useState(false);
  console.log(`ExploreDefenseArsenallScreen: Initial post-game states - step: ${postgameStep}, progress: ${postgameProgress}, survey complete: ${showPostgameSurveyComplete}, answers: ${JSON.stringify(postgameAnswers)}`);

  // Animations
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;
  const ctaOpacity = useRef(new Animated.Value(1)).current;
  console.log("ExploreDefenseArsenallScreen: Animation refs initialized.");

  useEffect(() => {
    console.log("ExploreDefenseArsenallScreen: [EFFECT] Calling loadPostGameProgress on mount.");
    loadPostGameProgress();
    return () => {
      console.log("ExploreDefenseArsenallScreen: [CLEANUP] Stopping animations on unmount.");
      fadeAnim.stopAnimation();
      slideAnim.stopAnimation();
      ctaOpacity.stopAnimation();
    };
  }, []);

  async function loadPostGameProgress() {
    console.log("ExploreDefenseArsenallScreen: loadPostGameProgress started.");
    try {
      const progressStr = await AsyncStorage.getItem('postGameCheckingCount');
      console.log("DefensiveFundamentals: AsyncStorage 'postGameCheckingCount' retrieved: " + progressStr);
      if (progressStr) {
        setPostgameProgress(parseInt(progressStr, 10));
        console.log("DefensiveFundamentals: postgameProgress state updated to: " + parseInt(progressStr, 10));
      }
    } catch (err) {
      console.log('DefensiveFundamentals: Error loading postGameCheckingCount:', err);
      // setPostgameProgress(0); // Ensure a default value on error
    }
    console.log("ExploreDefenseArsenallScreen: loadPostGameProgress finished.");
  }

  // ========== CATEGORY DEFINITIONS ==========
  const categories = [
    { id: 'formations', label: t('defensive_fundamentals.categoryDefensiveFormations'), background: require('../../assets/images/button.png') },
    { id: 'matchDayAssistant', label: t('defensive_fundamentals.categoryMatchDayAssistant'), background: require('../../assets/images/button.png') },
    { id: 'skillMoves', label: t('defensive_fundamentals.categoryDefendingFundamentals'), background: require('../../assets/images/button.png') },
    { id: 'tacticalVideos', label: t('defensive_fundamentals.categoryDefendingTutorials'), background: require('../../assets/images/button.png') },
  ];
  console.log("DefensiveFundamentals: Categories defined: " + JSON.stringify(categories.map(c => c.id)));

  // ========== GRID DATA ==========
  const gridData = {
    formations: [
      {
        id: '4-4-2',
        title: '4-4-2',
        preview: { uri: '' },
        background: require('../../assets/images/442.png'),
        description: t('defensive_fundamentals.formation442Description'),
        pros: t('defensive_fundamentals.formation442Pros'),
        cons: t('defensive_fundamentals.formation442Cons'),
        recommended: t('defensive_fundamentals.formation442Recommended'),
        type: 'formation',
      },
      {
        id: '4-2-3-1',
        title: '4-2-3-1',
        preview: { uri: '' },
        background: require('../../assets/images/4231.png'),
        description: t('defensive_fundamentals.formation4231Description'),
        pros: t('defensive_fundamentals.formation4231Pros'),
        cons: t('defensive_fundamentals.formation4231Cons'),
        recommended: t('defensive_fundamentals.formation4231Recommended'),
        type: 'formation',
      },
      {
        id: '4-1-2-1-2',
        title: '4-1-2-1-2',
        preview: { uri: '' },
        background: require('../../assets/images/41212.png'),
        description: t('defensive_fundamentals.formation41212Description'),
        pros: t('defensive_fundamentals.formation41212Pros'),
        cons: t('defensive_fundamentals.formation41212Cons'),
        recommended: t('defensive_fundamentals.formation41212Recommended'),
        type: 'formation',
      },
      {
        id: '3-5-2',
        title: '3-5-2',
        preview: { uri: '' },
        background: require('../../assets/images/352.png'),
        description: t('defensive_fundamentals.formation352Description'),
        pros: t('defensive_fundamentals.formation352Pros'),
        cons: t('defensive_fundamentals.formation352Cons'),
        recommended: t('defensive_fundamentals.formation352Recommended'),
        type: 'formation',
      },
      {
        id: '5-4-1',
        title: '5-4-1',
        preview: { uri: '' },
        background: require('../../assets/images/541.png'),
        description: t('defensive_fundamentals.formation541Description'),
        pros: t('defensive_fundamentals.formation541Pros'),
        cons: t('defensive_fundamentals.formation541Cons'),
        recommended: t('defensive_fundamentals.formation541Recommended'),
        type: 'formation',
      },
      {
        id: '4-3-3',
        title: '4-3-3',
        preview: { uri: '' },
        background: require('../../assets/images/433.png'),
        description: t('defensive_fundamentals.formation433Description'),
        pros: t('defensive_fundamentals.formation433Pros'),
        cons: t('defensive_fundamentals.formation433Cons'),
        recommended: t('defensive_fundamentals.formation433Recommended'),
        type: 'formation',
      },
    ],
    matchDayAssistant: [
      {
        id: 'prematch-huddle',
        title: t('defensive_fundamentals.matchDayAssistantPrematchHuddleTitle'),
        preview: { uri: '' },
        background: require('../../assets/images/pre_match.png'),
        type: 'matchDayAssistantPrematch',
      },
      {
        id: 'midtime-check',
        title: t('defensive_fundamentals.matchDayAssistantMidtimeCheckTitle'),
        preview: { uri: '' },
        background: require('../../assets/images/mid_match.png'),
        type: 'matchDayAssistantMidtime',
      },
      {
        id: 'postgame-reflection',
        title: t('defensive_fundamentals.matchDayAssistantPostgameReflectionTitle'),
        preview: { uri: '' },
        background: require('../../assets/images/post_match.png'),
        type: 'matchDayAssistantPostgame',
      },
    ],
    skillMoves: [], // remains empty as the component now renders DefensiveFundamental
  };

  // ========== 1) TACTICAL VIDEOS ==========
  useEffect(() => {
    console.log("DefensiveFundamentals: [EFFECT] Fetching tactical videos from Firebase Realtime DB.");
    setLoadingTacticalVideos(true);
    setTacticalVideosError(false);
    const database = getDatabase(firebaseApp);
    const videosRef = ref(database, 'weekly_videos');
    const unsubscribe = onValue(
      videosRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.val();
          console.log("DefensiveFundamentals: Realtime DB snapshot received.");
          const allVideos = Object.keys(data).map((key) => ({ id: key, ...data[key] }));
          const defendVideos = allVideos.filter((video) => video.category === 'defend');
          defendVideos.sort((a, b) => (b.views || 0) - (a.views || 0)); // Sort by views descending
          const top6 = defendVideos.slice(0, 6).map((vid) => {
            const thumb = ensureHttps(getYoutubeThumbnail(vid.video_url || ''));
            return {
              ...vid,
              preview: { uri: thumb },
              videoUrl: ensureHttps(vid.video_url || ''),
              title: vid.title || t('common.noTitle'),
              type: 'tacticalVideo',
            };
          });
          setTacticalVideos(top6);
          console.log("DefensiveFundamentals: Tactical videos fetched and set: " + top6.length + " videos.");
        } else {
          setTacticalVideos([]);
          console.log("DefensiveFundamentals: No tactical videos found in Realtime DB.");
        }
        setLoadingTacticalVideos(false);
        console.log("DefensiveFundamentals: Finished loading tactical videos.");
      },
      (error) => {
        console.error('DefensiveFundamentals: Realtime DB Error:', error);
        setTacticalVideosError(true);
        setLoadingTacticalVideos(false);
      }
    );
    return () => {
      console.log("DefensiveFundamentals: [CLEANUP] Unsubscribing from Realtime DB tactical videos.");
      unsubscribe();
    };
  }, [t]);

  // ========== 2) HERO ARTICLE (Daily refresh) ==========
  async function fetchHeroArticles_Defending() {
    console.log("DefensiveFundamentals: fetchHeroArticles_Defending started.");
    setLoadingHeroArticle(true);
    setHeroArticleError(false);

    try {
      const now = Date.now();
      const midnight = new Date();
      midnight.setHours(0, 0, 0, 0);

      const cacheKey = 'heroArticles_Defending';
      const cacheTimeKey = 'lastHeroArticlesPickTime_Defending';

      // --- COMMENTING OUT THE CACHE LOADING LOGIC FOR DEV ---
      // const lastPickTimeStr = await AsyncStorage.getItem(cacheTimeKey);
      // const lastPickTime = lastPickTimeStr ? parseInt(lastPickTimeStr, 10) : 0;
      // if (lastPickTime >= midnight.getTime()) {
      //   const cachedArticlesStr = await AsyncStorage.getItem(cacheKey);
      //   if (cachedArticlesStr) {
      //     const cachedArticles = JSON.parse(cachedArticlesStr);
      //     console.log('[CACHE] Loaded Attacking hero articles from cache:', cachedArticles);
      //     setHeroArticles(cachedArticles);
      //     setHeroArticle(cachedArticles[0] || null);
      //     return;
      //   }
      // }

      console.log('[FIRESTORE] Fetching new Defending hero articles...');
      const q = query(collection(db, 'Articles'), where('category', '==', 'Defending'));
      const querySnapshot = await getDocs(q);
      const articles = [];

      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        console.log(`[FIRESTORE] Fetched docSnap (id: ${docSnap.id}):`, data);
        articles.push({ id: docSnap.id, ...data });
      });

      console.log('[FIRESTORE] All fetched articles before shuffle:', articles);

      if (articles.length > 0) {
        shuffle(articles);
        console.log('[FIRESTORE] Articles after shuffle:', articles);

        // Select the first 3 unique articles
        const selectedArticles = articles.slice(0, 3);
        console.log('[FIRESTORE] Selected hero articles:', selectedArticles);

        // Store them in state so we can render a carousel, and set the spotlight hero
        setHeroArticles(selectedArticles);
        setHeroArticle(selectedArticles[0] || null);
        console.log("DefensiveFundamentals: Hero articles and spotlight hero updated in state.");

        await AsyncStorage.setItem(cacheTimeKey, now.toString());
        await AsyncStorage.setItem(cacheKey, JSON.stringify(selectedArticles));
        console.log('[CACHE] Saved new Defending hero articles to AsyncStorage.');
      } else {
        console.log('[FIRESTORE] No articles found in the "Defending" category.');
        setHeroArticles([]);
        setHeroArticle(null);
      }
    } catch (error) {
      console.log('DefensiveFundamentals: Error fetching Defending hero articles:', error);
      setHeroArticleError(true);
    } finally {
      setLoadingHeroArticle(false);
      console.log("ExploreDefenseArsenallScreen: fetchHeroArticles_Defending finished.");
    }
  }

  useEffect(() => {
    console.log('[EFFECT] Calling fetchHeroArticles_Defending...');
    fetchHeroArticles_Defending();
  }, []);

  // FlatList ref for hero
  const flatListRef = useRef(null);

  const handleHeroArticlePress = (article) => {
    console.log('DefensiveFundamentals: Pressing hero article:', article.id);
    router.push({
      pathname: 'screens/ArticleScreen',
      params: { article: JSON.stringify(article) },
    });
    console.log('DefensiveFundamentals: Navigation to ArticleScreen initiated for article: ' + article.id);
  };

  // Instead of full screen width, let's use .92 for container & item
  const HERO_WIDTH = width * 0.92;
  const heroImages = [
    require('../../assets/images/shooting.png'),
    require('../../assets/images/shooting.png'),
    require('../../assets/images/shooting.png'),
  ];

  const renderHeroItem = ({ item, index }) => {
    const backgroundImage =
      item.image_url && item.image_url.trim() !== ''
        ? { uri: item.image_url }
        : heroImages[index] || heroImages[0];

    return (
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => {
          handleHeroArticlePress(item);
          console.log('DefensiveFundamentals: TouchableOpacity for hero item pressed: ' + item.id);
        }}
      >
        <ImageBackground
          source={backgroundImage}
          style={[styles.heroItemBackground, { width: width * 0.92, height: height * 0.31 }]}
          imageStyle={{ resizeMode: 'cover', borderRadius: 20 }}
        >
          <View style={styles.heroOverlay}>
            <View style={styles.heroTextContainer}>
              <Text style={styles.heroTitle}>{item.title || t('common.noTitle')}</Text>
              <Text style={styles.heroTeaser}>{item.teaser || t('common.noTeaser')}</Text>
              <TouchableOpacity
                style={styles.ctaButton}
                onPress={() => {
                  handleHeroArticlePress(item);
                  console.log('DefensiveFundamentals: CTA button for hero item pressed: ' + item.id);
                }}
              >
                <Text style={styles.ctaButtonText}>{t('defensive_fundamentals.heroReadNowButton')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ImageBackground>
      </TouchableOpacity>
    );
  };


  const onHeroScrollEnd = (event) => {
    const contentOffset = event.nativeEvent.contentOffset.x;
    const viewSize = event.nativeEvent.layoutMeasurement.width;
    const index = Math.floor(contentOffset / viewSize);
    setCurrentHeroIndex(index);
    console.log("DefensiveFundamentals: Hero carousel scrolled to index: " + index);
  };


  // 2b) Real-time hero article updates
  useEffect(() => {
    let unsubscribe;
    if (heroArticle?.id) {
      console.log('DefensiveFundamentals: [EFFECT] Subscribing to real-time hero article changes for ID: ' + heroArticle.id);
      const docRef = doc(db, 'Articles', heroArticle.id);
      unsubscribe = onSnapshot(
        docRef,
        (snapshot) => {
          if (snapshot.exists()) {
            setHeroArticle((prev) => ({ ...prev, ...snapshot.data() }));
            console.log('DefensiveFundamentals: Real-time hero article updated: ' + heroArticle.id);
          }
        },
        (error) => {
          console.log('DefensiveFundamentals: Error listening to hero article changes:', error);
        }
      );
    }
    return () => {
      if (unsubscribe) {
        console.log('DefensiveFundamentals: [CLEANUP] Unsubscribing from real-time hero article changes.');
        unsubscribe();
      }
    };
  }, [heroArticle?.id]);

  // ========== HANDLERS ==========
  const handleCategoryChange = (cat) => {
    console.log('DefensiveFundamentals: Category change initiated to: ' + cat);
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 20, duration: 200, useNativeDriver: true }),
    ]).start(() => {
      setSelectedCategory(cat);
      console.log('DefensiveFundamentals: Category state updated to: ' + cat);
      requestAnimationFrame(() => {
        fadeAnim.setValue(0);
        slideAnim.setValue(-20);
        Animated.parallel([
          Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
          Animated.timing(slideAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
        ]).start(() => {
          console.log('DefensiveFundamentals: Category change animation completed.');
        });
      });
    });
  };

  const handleCtaPressIn = () => {
    console.log('DefensiveFundamentals: CTA button press in animation started.');
    Animated.timing(ctaOpacity, { toValue: 0.5, duration: 200, useNativeDriver: true }).start();
  };
  const handleCtaPressOut = () => {
    console.log('DefensiveFundamentals: CTA button press out animation started.');
    Animated.timing(ctaOpacity, { toValue: 1, duration: 200, useNativeDriver: true }).start();
  };
  const handleCtaPress = () => {
    console.log('DefensiveFundamentals: CTA button pressed for hero article.');
    if (heroArticle) {
      router.push({ pathname: 'screens/ArticleScreen', params: { article: JSON.stringify(heroArticle) } });
      console.log('DefensiveFundamentals: Navigating to ArticleScreen from hero CTA.');
    } else {
      console.log('DefensiveFundamentals: No hero article selected for CTA.');
    }
  };

  const handleMoreAttackingTips = () => {
    console.log('DefensiveFundamentals: "More Tips" button pressed.');
    router.push('/screens/AllAttackingArticles');
    console.log('DefensiveFundamentals: Navigating to AllAttackingArticles screen.');
  };

  const handleGridPress = (item) => {
    console.log('DefensiveFundamentals: Grid item pressed:', item.id);
    setSelectedItem(item);
    setModalVisible(true);
    console.log('DefensiveFundamentals: Modal visibility set to true for item: ' + item.id);
  };

  const closeModal = () => {
    console.log('DefensiveFundamentals: Closing modal.');
    setModalVisible(false);
    setSelectedItem(null);
    console.log('DefensiveFundamentals: Modal visibility set to false and selected item cleared.');

    // Reset pre-match
    setSelectedGameMode(null);
    setSelectedDivision(null);
    setShowPrematchTips(false);
    setPrematchDisplayedTips([]);
    console.log('DefensiveFundamentals: Pre-match modal states reset.');

    // Reset mid-time
    setMidtimeStep(1);
    setMidtimePerformance(null);
    setMidtimeConcern(null);
    setShowMidtimeTips(false);
    setMidtimeDisplayedTips([]);
    console.log('DefensiveFundamentals: Mid-time modal states reset.');

    // Reset post-game
    setPostgameStep(1);
    setPostgameAnswers({
      overallPerformance: 0,
      attacking: 0,
      defending: 0,
      control: 0,
      mentality: 0,
    });
    setShowPostgameSurveyComplete(false);
    console.log('DefensiveFundamentals: Post-game modal states reset.');
  };

  // ========== PRE-MATCH TIPS ==========
  const divisionMapping = {
    'Division 10-8': 'beginner',
    'Division 7-5': 'intermediate',
    'Division 4-2': 'advanced',
    'Elite': 'elite',
  };
  function generatePrematchTips() {
    console.log("DefensiveFundamentals: generatePrematchTips called.");
    let tips = [];
    if (selectedGameMode === 'UT' || selectedGameMode === 'Seasons') {
      if (selectedDivision) {
        const subKey = divisionMapping[selectedDivision];
        console.log(`DefensiveFundamentals: Getting pre-match tips for game mode: ${selectedGameMode}, division: ${selectedDivision} (subkey: ${subKey})`);
        tips = (matchDayData.preMatch.UT && matchDayData.preMatch.UT[subKey]) || [];
      } else {
        console.log("DefensiveFundamentals: Selected game mode requires division, but no division selected. No specific tips generated.");
      }
    } else if (selectedGameMode === 'Career') {
      console.log("DefensiveFundamentals: Getting pre-match tips for Career mode.");
      tips = matchDayData.preMatch.careerMode || [];
    } else {
      console.log("DefensiveFundamentals: Getting general pre-match tips for unknown game mode.");
      tips = matchDayData.preMatch.general || [];
    }
    if (tips.length === 0) {
      console.log("DefensiveFundamentals: No specific pre-match tips found, falling back to general tips.");
      tips = matchDayData.preMatch.general || [];
    }
    const shuffled = shuffle([...tips]);
    setPrematchDisplayedTips(shuffled.slice(0, 3));
    setShowPrematchTips(true);
    console.log("DefensiveFundamentals: Prematch tips generated and displayed: " + shuffled.slice(0, 3).length);
  }

  // ========== MID-TIME TIPS ==========
  function generateMidtimeTips() {
    console.log('DefensiveFundamentals: generateMidtimeTips called.');
    console.log('[MID-TIME] Performance:', midtimePerformance);
    console.log('[MID-TIME] Concern:', midtimeConcern);

    let tipsPerformance = [];
    let tipsConcern = [];

    // Use the imported halfTimeData (renamed to halfTimeDataFromFile)
    const halfTimeContent = halfTimeDataFromFile ?? { performanceFeedback: [], mainConcern: {} };
    console.log('[MID-TIME] halfTimeContent:', JSON.stringify(halfTimeContent, null, 2));

    const performanceMapping = {
      [t('defensive_fundamentals.midtimeOptionDominating')]: 'dominating',
      [t('defensive_fundamentals.midtimeOptionGood')]: 'good',
      [t('defensive_fundamentals.midtimeOptionEven')]: 'even',
      [t('defensive_fundamentals.midtimeOptionStruggling')]: 'struggling',
    };

    const concernMapping = {
      [t('defensive_fundamentals.midtimeConcernDefense')]: 'defense',
      [t('defensive_fundamentals.midtimeConcernFinishing')]: 'finishing',
      [t('defensive_fundamentals.midtimeConcernPossession')]: 'possession',
      [t('defensive_fundamentals.midtimeConcernStaminaFatigue')]: 'stamina',
    };

    if (midtimePerformance) {
      const perfKey = performanceMapping[midtimePerformance];
      console.log('[MID-TIME] Looking for performance:', perfKey);
      const foundPerformance = halfTimeContent.performanceFeedback.find(
        (item) => item.level.toLowerCase() === perfKey?.toLowerCase()
      ) || { tips: [] };
      tipsPerformance = foundPerformance.tips.map((tip) => tip.text) || [];
      console.log('[MID-TIME] Found performance tips:', tipsPerformance);
    }

    if (midtimeConcern) {
      const concernKey = concernMapping[midtimeConcern];
      console.log('[MID-TIME] Looking for concern:', concernKey);
      tipsConcern = halfTimeContent.mainConcern[concernKey] || [];
      console.log('[MID-TIME] Found concern tips:', tipsConcern);
    }

    const combined = [...tipsPerformance, ...tipsConcern];
    console.log('[MID-TIME] Combined tips length:', combined.length);

    if (combined.length === 0) {
      const evenFallback = halfTimeContent.performanceFeedback.find(
        (item) => item.level.toLowerCase() === 'even'
      );
      console.log('[MID-TIME] No tips found, fallback to even:', evenFallback);
      if (evenFallback && evenFallback.tips && evenFallback.tips.length > 0) {
        combined.push(...evenFallback.tips.map((tip) => tip.text));
      } else {
        combined.push(t("defensive_fundamentals.midtimeNoTipsAvailable"));
      }
    }

    const shuffled = shuffle([...combined]);
    const finalTips = shuffled.slice(0, 3);
    console.log('[MID-TIME] final midtimeDisplayedTips:', finalTips);

    setMidtimeDisplayedTips(finalTips);
    setShowMidtimeTips(true);
    console.log("DefensiveFundamentals: Midtime tips generated and displayed: " + finalTips.length);
  }

  // ========== POST-GAME SURVEY ==========
  const postGameOptions = {
    1: [
      { label: t('defensive_fundamentals.postGameOptionCrushedIt'), rating: 5 },
      { label: t('defensive_fundamentals.postGameOptionPrettySolid'), rating: 4 },
      { label: t('defensive_fundamentals.postGameOptionMeh'), rating: 3 },
      { label: t('defensive_fundamentals.postGameOptionToughGame'), rating: 2 },
    ],
    2: [
      { label: t('defensive_fundamentals.postGameOptionGoalMachine'), rating: 5 },
      { label: t('defensive_fundamentals.postGameOptionSolidEffort'), rating: 4 },
      { label: t('defensive_fundamentals.postGameOptionHitOrMiss'), rating: 3 },
      { label: t('defensive_fundamentals.postGameOptionBluntAttack'), rating: 2 },
    ],
    3: [
      { label: t('defensive_fundamentals.postGameOptionBrickWall'), rating: 5 },
      { label: t('defensive_fundamentals.postGameOptionReliableDefense'), rating: 4 },
      { label: t('defensive_fundamentals.postGameOptionLeakyMoments'), rating: 3 },
      { label: t('defensive_fundamentals.postGameOptionWideOpen'), rating: 2 },
    ],
    4: [
      { label: t('defensive_fundamentals.postGameOptionMaestroMode'), rating: 5 },
      { label: t('defensive_fundamentals.postGameOptionFairlySteady'), rating: 4 },
      { label: t('defensive_fundamentals.postGameOptionFiftyFiftyBattle'), rating: 3 },
      { label: t('defensive_fundamentals.postGameOptionChaotic'), rating: 2 },
    ],
    5: [
      { label: t('defensive_fundamentals.postGameOptionZenMaster'), rating: 5 },
      { label: t('defensive_fundamentals.postGameOptionMostlyComposed'), rating: 4 },
      { label: t('defensive_fundamentals.postGameOptionOnEdge'), rating: 3 },
      { label: t('defensive_fundamentals.postGameOptionTilted'), rating: 2 },
    ],
  };

  function handlePostGameAnswer(rating) {
    console.log(`DefensiveFundamentals: Post-game answer selected for step ${postgameStep} with rating: ${rating}`);
    let newAnswers = { ...postgameAnswers };
    switch (postgameStep) {
      case 1:
        newAnswers.overallPerformance = rating;
        break;
      case 2:
        newAnswers.attacking = rating;
        break;
      case 3:
        newAnswers.defending = rating;
        break;
      case 4:
        newAnswers.control = rating;
        break;
      case 5:
        newAnswers.mentality = rating;
        break;
    }
    setPostgameAnswers(newAnswers);
    console.log("DefensiveFundamentals: Post-game answers state updated: " + JSON.stringify(newAnswers));

    if (postgameStep < 5) {
      setPostgameStep(postgameStep + 1);
      console.log("DefensiveFundamentals: Post-game step incremented to: " + (postgameStep + 1));
    } else {
      finalizePostGameSurvey(newAnswers);
      console.log("DefensiveFundamentals: Post-game survey finalized.");
    }
  }

  async function finalizePostGameSurvey(finalAnswers) {
    console.log("DefensiveFundamentals: finalizePostGameSurvey called with final answers.");
    setPostgameStep(6); // Indicate survey completion in terms of steps
    setShowPostgameSurveyComplete(true);
    console.log("DefensiveFundamentals: showPostgameSurveyComplete state updated to true.");

    let newProgress = postgameProgress + 1;
    if (newProgress > 100) newProgress = 100;
    setPostgameProgress(newProgress);
    await AsyncStorage.setItem('postGameCheckingCount', String(newProgress));
    console.log(`DefensiveFundamentals: Post-game progress updated to ${newProgress} and saved to AsyncStorage.`);

    const newGameId = newProgress; // Using progress count as a simple game ID for now
    const gameData = {
      gameId: newGameId,
      date: new Date().toISOString().slice(0, 10),
      ratings: {
        overallPerformance: finalAnswers.overallPerformance,
        attacking: finalAnswers.attacking,
        defending: finalAnswers.defending,
        control: finalAnswers.control,
        mentality: finalAnswers.mentality,
      },
    };
    await storeLocalGameData(gameData);
    await maybeUploadPostGameData();
    console.log("DefensiveFundamentals: Post-game survey processed and data stored/uploaded.");

    if (newProgress === 100) {
      console.log('DefensiveFundamentals: User reached 100 post-game check-ins! Show big 100-game report soon...');
    }
  }

  async function storeLocalGameData(newGame) {
    console.log("DefensiveFundamentals: storeLocalGameData called for game ID: " + newGame.gameId);
    try {
      const existingStr = await AsyncStorage.getItem('localPostGameEntries');
      let existing = existingStr ? JSON.parse(existingStr) : [];
      existing.push({ ...newGame, uploaded: false });
      await AsyncStorage.setItem('localPostGameEntries', JSON.stringify(existing));
      console.log("DefensiveFundamentals: Game data stored locally in AsyncStorage.");
    } catch (err) {
      console.log('DefensiveFundamentals: Error storing local game data:', err);
    }
  }

  async function maybeUploadPostGameData() {
    console.log("DefensiveFundamentals: maybeUploadPostGameData called.");
    try {
      const existingStr = await AsyncStorage.getItem('localPostGameEntries');
      if (!existingStr) {
        console.log("DefensiveFundamentals: No local post-game entries found to upload.");
        return;
      }
      let entries = JSON.parse(existingStr);
      let unUploaded = entries.filter((g) => !g.uploaded);
      if (unUploaded.length < 10) {
        console.log(`DefensiveFundamentals: Less than 10 unuploaded games (${unUploaded.length}). Skipping upload.`);
        return;
      }
      console.log(`DefensiveFundamentals: Found ${unUploaded.length} unuploaded games. Attempting to upload a batch of 10.`);

      const batch = unUploaded.slice(0, 10);
      const summary = summarizeGames(batch);
      await uploadPostGameSummary(summary);
      console.log("DefensiveFundamentals: Post-game batch summary uploaded.");

      // Mark them as uploaded
      const updated = entries.map((item) => {
        if (batch.some((b) => b.gameId === item.gameId)) {
          return { ...item, uploaded: true };
        }
        return item;
      });
      await AsyncStorage.setItem('localPostGameEntries', JSON.stringify(updated));
      console.log("DefensiveFundamentals: Local post-game entries marked as uploaded.");
    } catch (err) {
      console.log('DefensiveFundamentals: maybeUploadPostGameData error:', err);
    }
  }

  function summarizeGames(games) {
    console.log("DefensiveFundamentals: summarizeGames called with " + games.length + " games.");
    let totalOverall = 0;
    let totalAttacking = 0;
    let totalDefending = 0;
    let totalControl = 0;
    let totalMentality = 0;

    games.forEach((g) => {
      totalOverall += g.ratings.overallPerformance;
      totalAttacking += g.ratings.attacking;
      totalDefending += g.ratings.defending;
      totalControl += g.ratings.control;
      totalMentality += g.ratings.mentality;
    });
    const avg = (val) => Math.round((val / games.length) * 10) / 10;
    const summary = {
      gamesPlayed: games.length,
      averages: {
        overallPerformance: avg(totalOverall),
        attacking: avg(totalAttacking),
        defending: avg(totalDefending),
        control: avg(totalControl),
        mentality: avg(totalMentality),
      },
      timestamp: new Date().toISOString(),
    };
    console.log("DefensiveFundamentals: Games summarized: " + JSON.stringify(summary));
    return summary;
  }

  async function uploadPostGameSummary(summary) {
    console.log("DefensiveFundamentals: uploadPostGameSummary called.");
    try {
      const user = auth.currentUser;
      if (!user) {
        console.log('DefensiveFundamentals: No user signed in. Storing offline only.');
        return;
      }
      const docRef = doc(db, 'postGameTrackers', user.uid);
      await setDoc(
        docRef,
        {
          lastUpload: new Date().toISOString(),
          summary: summary,
        },
        { merge: true }
      );
      console.log('DefensiveFundamentals: Uploaded post-game summary to Firestore successfully!');
    } catch (err) {
      console.log('DefensiveFundamentals: Error uploading post-game summary:', err);
    }
  }

  // Container style
  const containerStyle =
    selectedCategory === 'formations'
      ? styles.formationGridContainer
      : styles.fullWidthGridContainer;
  console.log("DefensiveFundamentals: Container style determined based on selected category: " + (selectedCategory === 'formations' ? 'formationGridContainer' : 'fullWidthGridContainer'));

  // Update selectedCategoryObj based on the modified categories
  const selectedCategoryObj = categories.find((c) => c.id === selectedCategory);
  const AnimatedImageBackground = Animated.createAnimatedComponent(ImageBackground);

  // Grid item
  const InteractiveGridItem = React.memo(({ item }) => {
    const opacityAnim = useRef(new Animated.Value(1)).current;
    const onPress = () => {
      Animated.sequence([
        Animated.timing(opacityAnim, { toValue: 0.5, duration: 100, useNativeDriver: true }),
        Animated.timing(opacityAnim, { toValue: 1, duration: 100, useNativeDriver: true }),
      ]).start(() => {
        handleGridPress(item);
        console.log('DefensiveFundamentals: Grid item TouchableOpacity pressed for item: ' + item.id);
      });
    };
    const gridStyle = item.type === 'formation' ? styles.formationGridItem : styles.fullWidthGridItem;
    const finalUri = ensureHttps(item.preview?.uri) || '';
    let imageSource;
    if (finalUri) {
      imageSource = { uri: finalUri };
    } else if (item.background) {
      imageSource = item.background;
    } else {
      imageSource = require('../../assets/images/bk.png'); // Fallback image
    }
    console.log(`DefensiveFundamentals: Rendering grid item ${item.id} with image source: ${JSON.stringify(imageSource)}`);

    return (
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={onPress}
        accessibilityLabel={t('common.selectItem', { itemTitle: item.title })}
        style={gridStyle}
      >
        <Animated.View style={{ opacity: opacityAnim }}>
          <Image
            source={imageSource}
            style={styles.gridItemImage}
            resizeMode={item.type === 'formation' ? 'contain' : 'cover'}
          />
        </Animated.View>
        <View style={styles.titleContainer}>
          <Text style={styles.gridItemTitle} numberOfLines={2}>
            {item.title}
          </Text>
        </View>
      </TouchableOpacity>
    );
  });

  function getCategoryData() {
    console.log("DefensiveFundamentals: getCategoryData called for selected category: " + selectedCategory);
    if (selectedCategory === 'tacticalVideos') return tacticalVideos;
    if (selectedCategory === 'skillMoves') return []; // SkillMoves is handled by DefensiveFundtabl component
    return gridData[selectedCategory] || [];
  }

  function getPostGameQuestionTitle(step) {
    console.log("DefensiveFundamentals: getPostGameQuestionTitle called for step: " + step);
    switch (step) {
      case 1:
        return t('defensive_fundamentals.postGameQuestion1');
      case 2:
        return t('defensive_fundamentals.postGameQuestion2');
      case 3:
        return t('defensive_fundamentals.postGameQuestion3');
      case 4:
        return t('defensive_fundamentals.postGameQuestion4');
      case 5:
        return t('defensive_fundamentals.postGameQuestion5');
      default:
        return '';
    }
  }

  // ========== RENDER ==========
  return (
    <SafeAreaView style={styles.safeAreaContainer}>
      <ImageBackground
        source={require('../../assets/images/bk13.png')}
        style={styles.pageBackground}
        resizeMode="cover"
      >
        <View style={{ marginTop: 50, flex: 1 }}>
          <ScrollView contentContainerStyle={styles.scrollContainer}>
            {/* HERO SECTION */}
            <View style={styles.heroSection}>
              {loadingHeroArticle ? (
                <ActivityIndicator size="small" color="#00FFFF" />
              ) : heroArticleError ? (
                <Text style={{ color: 'red' }}>{t('defensive_fundamentals.heroErrorLoadingArticle')}</Text>
              ) : (
                <>
                  <FlatList
                    ref={flatListRef}
                    data={heroArticles}
                    horizontal
                    pagingEnabled
                    showsHorizontalScrollIndicator={false}
                    keyExtractor={(item) => item.id}
                    renderItem={renderHeroItem}
                    onMomentumScrollEnd={onHeroScrollEnd}
                    snapToInterval={HERO_WIDTH}
                    snapToAlignment="center"
                    decelerationRate="fast"
                    disableIntervalMomentum
                    getItemLayout={(_, index) => ({
                      length: HERO_WIDTH,
                      offset: HERO_WIDTH * index,
                      index,
                    })}
                  />
                  <View style={styles.paginationContainer}>
                    {heroArticles.map((_, i) => (
                      <View
                        key={i}
                        style={[
                          styles.paginationDot,
                          i === currentHeroIndex && styles.paginationDotActive,
                        ]}
                      />
                    ))}
                  </View>
                </>
              )}
              {heroArticles.length > 0 && (
                <TouchableOpacity
                  style={styles.moreTipsButton}
                  onPress={handleMoreAttackingTips}
                >
                  <Text style={styles.moreTipsButtonText}>{t('defensive_fundamentals.heroMoreArticlesButton')}</Text>
                </TouchableOpacity>
              )}
            </View>


            {/* MAIN SECTION */}
            <View style={styles.mainSection}>
              <Text style={styles.sectionHeader}>{t('defensive_fundamentals.exploreDefenseArsenallTitle')}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryTabs}>
                {categories.map((cat) => (
                  <TouchableOpacity
                    key={cat.id}
                    onPress={() => {
                      handleCategoryChange(cat.id);
                      console.log('DefensiveFundamentals: Category tab pressed: ' + cat.id);
                    }}
                    activeOpacity={0.8}
                  >
                    <ImageBackground
                      source={cat.background}
                      style={[
                        styles.categoryTabBackground,
                        selectedCategory === cat.id && styles.categoryTabSelected,
                      ]}
                      imageStyle={styles.categoryTabImage}
                    >
                      <Text
                        style={[
                          styles.categoryTabText,
                          selectedCategory === cat.id && styles.categoryTabTextSelected,
                        ]}
                      >
                        {cat.label}
                      </Text>
                    </ImageBackground>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <AnimatedImageBackground
                source={
                  selectedCategory === 'matchDayAssistant'
                    ? require('../../assets/images/Article bk.png')
                    : selectedCategory === 'formations'
                      ? require('../../assets/images/formation.png')
                      : selectedCategory === 'skillMoves'
                        ? require('../../assets/images/skill moves.png')
                        : selectedCategory === 'tacticalVideos'
                          ? require('../../assets/images/tactical videos.png')
                          : { uri: '' }
                }
                style={[
                  styles.categoryContent,
                  {
                    opacity: fadeAnim,
                    transform: [{ translateY: slideAnim }],
                    borderWidth: 3,
                    borderColor: '#00FFFF',
                    borderRadius: 20,
                    overflow: 'hidden',
                  },
                ]}
                imageStyle={{ borderRadius: 20 }}
              >
                {selectedCategory === 'skillMoves' ? (
                  <View style={styles.skillMovesWrapper}><DefensiveFundtabl /></View>
                ) : (
                  <>
                    {selectedCategory === 'tacticalVideos' && loadingTacticalVideos ? (
                      <ActivityIndicator size="large" color="#FFD700" />
                    ) : selectedCategory === 'tacticalVideos' && tacticalVideosError ? (
                      <Text style={styles.errorText}>{t('defensive_fundamentals.videosErrorLoading')}</Text>
                    ) : null}

                    <View style={containerStyle}>
                      {getCategoryData().map((item) => (
                        <InteractiveGridItem key={item.id} item={item} />
                      ))}
                    </View>

                    {selectedCategory !== 'matchDayAssistant' && (
                      <TouchableOpacity
                        style={styles.viewAllButton}
                        onPress={() => {
                          console.log('DefensiveFundamentals: "View All" button pressed for category: ' + selectedCategory);
                          router.push({
                            pathname:
                              selectedCategory === 'formations'
                                ? '/screens/FormationsScreen'
                                : selectedCategory === 'skillMoves'
                                  ? '/AllDefendingFundamentalsScreen'
                                  : '/screens/MoreVideos',
                          });
                          console.log('DefensiveFundamentals: Navigating to corresponding "View All" screen.');
                        }}
                      >
                        <Text style={styles.viewAllButtonText}>
                          {selectedCategory === 'formations'
                            ? t('defensive_fundamentals.seeAllFormationsButton')
                            : selectedCategory === 'skillMoves'
                              ? t('defensive_fundamentals.seeAllDefensiveFundamentalsButton')
                              : selectedCategory === 'tacticalVideos'
                                ? t('defensive_fundamentals.watchAllTutorialVideosButton')
                                : t('defensive_fundamentals.viewAllButton')}
                        </Text>
                      </TouchableOpacity>
                    )}
                  </>
                )}
              </AnimatedImageBackground>
            </View>
          </ScrollView>

          {/* MODAL */}
          <Modal
            visible={modalVisible}
            transparent
            animationType="fade"
            onRequestClose={closeModal}
          >
            <TouchableWithoutFeedback onPress={() => { if (selectedItem?.type !== 'tacticalVideo') closeModal(); console.log('DefensiveFundamentals: Modal background touched.'); }}>
              <View style={styles.modalBackground}>
                <ScrollView contentContainerStyle={styles.modalScrollContainer}>
                  <TouchableWithoutFeedback>
                    <View style={styles.modalContainer}>
                      <ImageBackground
                        source={getModalBackground(selectedItem?.type)}
                        style={styles.modalImageBg}
                        imageStyle={{ borderRadius: 10, resizeMode: 'cover' }}
                      >
                        {/* TACTICAL VIDEO MODAL */}
                        {selectedItem?.type === 'tacticalVideo' ? (
                          <View style={styles.modalContent}>
                            <Text style={styles.modalTitle}>{selectedItem.title}</Text>
                            <View style={styles.videoContainer}>
                              {selectedItem.videoUrl ? (
                                <WebView
                                  source={{ uri: transformYoutubeUrl(ensureHttps(selectedItem.videoUrl), { autoplay: 1, mute: 1 }) }}
                                  style={{ flex: 1 }}
                                  javaScriptEnabled
                                  allowsInlineMediaPlayback
                                  mediaPlaybackRequiresUserAction={false}
                                />
                              ) : (
                                <Text style={{ color: '#fff' }}>{t("common.noVideoURL")}</Text>
                              )}
                            </View>
                          </View>
                        ) : selectedItem?.type === 'formation' ? (
                          /* FORMATION MODAL */
                          <View style={styles.modalContent}>
                            <Text style={styles.modalTitle}>{selectedItem.title}</Text>
                            <Text style={styles.modalText}>{selectedItem.description}</Text>
                            <Text style={styles.modalSubheading}>{t('defensive_fundamentals.formationModalPros')}</Text>
                            <Text style={styles.modalText}>{selectedItem.pros}</Text>
                            <Text style={styles.modalSubheading}>{t('defensive_fundamentals.formationModalCons')}</Text>
                            <Text style={styles.modalText}>{selectedItem.cons}</Text>
                            <Text style={styles.modalSubheading}>{t('defensive_fundamentals.formationModalBestFor')}</Text>
                            <Text style={styles.modalText}>{selectedItem.recommended}</Text>
                          </View>
                        ) : selectedItem?.type === 'matchDayAssistantPrematch' ? (
                          /* PRE-MATCH HUDDLE */
                          <View style={styles.modalContent}>
                            <Text style={styles.modalTitle}>{t('defensive_fundamentals.prematchModalTitle')}</Text>
                            {!showPrematchTips ? (
                              <>
                                {!selectedGameMode ? (
                                  <>
                                    <Text style={styles.highlightedQuestion}>{t('defensive_fundamentals.prematchModalGameModeQuestion')}</Text>
                                    <View style={styles.buttonGroupColumn}>
                                      {['UT', 'Career', 'Quick Kick-Off', 'Seasons', 'Rush'].map((mode) => (
                                        <TouchableOpacity
                                          key={mode}
                                          onPress={() => {
                                            setSelectedGameMode(mode);
                                            console.log('DefensiveFundamentals: Prematch game mode selected: ' + mode);
                                            if (mode !== 'UT' && mode !== 'Seasons') {
                                              generatePrematchTips();
                                            }
                                          }}
                                          style={styles.optionButton}
                                        >
                                          <Text style={styles.optionButtonText}>{mode}</Text>
                                        </TouchableOpacity>
                                      ))}
                                    </View>
                                  </>
                                ) : (selectedGameMode === 'UT' || selectedGameMode === 'Seasons') && !selectedDivision ? (
                                  <>
                                    <Text style={styles.highlightedQuestion}>{t('defensive_fundamentals.prematchModalDivisionQuestion')}</Text>
                                    <View style={styles.buttonGroupColumn}>
                                      {['Division 10-8', 'Division 7-5', 'Division 4-2', 'Elite'].map((div) => (
                                        <TouchableOpacity
                                          key={div}
                                          onPress={() => {
                                            setSelectedDivision(div);
                                            console.log('DefensiveFundamentals: Prematch division selected: ' + div);
                                            generatePrematchTips();
                                          }}
                                          style={styles.optionButton}
                                        >
                                          <Text style={styles.optionButtonText}>{div}</Text>
                                        </TouchableOpacity>
                                      ))}
                                    </View>
                                  </>
                                ) : null}
                              </>
                            ) : (
                              <View>
                                <Text style={styles.modalText}>{t('defensive_fundamentals.prematchModalHereAreYourTips')}</Text>
                                {prematchDisplayedTips.map((tip, idx) => (
                                  <View key={idx} style={styles.tipContainer}>
                                    <Text style={styles.tipTitle}>{tip.text}</Text>
                                  </View>
                                ))}
                                {/* Show More Button */}
                                <TouchableOpacity onPress={generatePrematchTips} style={styles.showMoreButton}>
                                  <Text style={styles.showMoreButtonText}>{t('defensive_fundamentals.prematchModalShowMoreButton')}</Text>
                                </TouchableOpacity>
                              </View>
                            )}
                          </View>
                        ) : selectedItem?.type === 'matchDayAssistantMidtime' ? (
                          /* MID-TIME CHECK */
                          <View style={styles.modalContent}>
                            <Text style={styles.modalTitle}>{t('defensive_fundamentals.midtimeModalTitle')}</Text>
                            {!showMidtimeTips ? (
                              midtimeStep === 1 ? (
                                <>
                                  <Text style={styles.highlightedQuestion}>{t('defensive_fundamentals.midtimeModalFirstHalfPerformanceQuestion')}</Text>
                                  <View style={styles.buttonGroupColumn}>
                                    {[t('defensive_fundamentals.midtimeOptionDominating'), t('defensive_fundamentals.midtimeOptionGood'), t('defensive_fundamentals.midtimeOptionEven'), t('defensive_fundamentals.midtimeOptionStruggling')].map((option) => (
                                      <TouchableOpacity
                                        key={option}
                                        onPress={() => {
                                          setMidtimePerformance(option);
                                          setMidtimeStep(2);
                                          console.log('DefensiveFundamentals: Midtime performance selected: ' + option);
                                        }}
                                        style={styles.optionButton}
                                      >
                                        <Text style={styles.optionButtonText}>{option}</Text>
                                      </TouchableOpacity>
                                    ))}
                                  </View>
                                </>
                              ) : (
                                <>
                                  <Text style={styles.highlightedQuestion}>{t('defensive_fundamentals.midtimeModalMainConcernQuestion')}</Text>
                                  <View style={styles.buttonGroupColumn}>
                                    {[t('defensive_fundamentals.midtimeConcernDefense'), t('defensive_fundamentals.midtimeConcernFinishing'), t('defensive_fundamentals.midtimeConcernPossession'), t('defensive_fundamentals.midtimeConcernStaminaFatigue')].map((concern) => (
                                      <TouchableOpacity
                                        key={concern}
                                        onPress={() => {
                                          setMidtimeConcern(concern);
                                          generateMidtimeTips();
                                          console.log('DefensiveFundamentals: Midtime concern selected: ' + concern);
                                        }}
                                        style={styles.optionButton}
                                      >
                                        <Text style={styles.optionButtonText}>{concern}</Text>
                                      </TouchableOpacity>
                                    ))}
                                  </View>
                                </>
                              )
                            ) : (
                              <View>
                                <Text style={styles.modalText}>{t('defensive_fundamentals.midtimeModalHereAreYourTips')}</Text>
                                {midtimeDisplayedTips.map((tip, idx) => (
                                  <View key={idx} style={styles.tipContainer}>
                                    <Text style={styles.tipTitle}>{tip}</Text>
                                  </View>
                                ))}
                              </View>
                            )}
                          </View>
                        ) : selectedItem?.type === 'matchDayAssistantPostgame' ? (
                          /* POST-GAME 5-QUESTION SURVEY */
                          <View style={styles.modalContent}>
                            <Text style={styles.modalTitle}>{t('defensive_fundamentals.postGameModalTitle')}</Text>
                            <View style={styles.progressBarContainer}>
                              <Text style={styles.progressLabel}>
                                {t('defensive_fundamentals.postGameModalProgressLabel', { progress: postgameProgress })}
                              </Text>
                              <View style={styles.progressBarOuter}>
                                <View
                                  style={[
                                    styles.progressBarInner,
                                    { width: `${(postgameProgress / 100) * 100}%` },
                                  ]}
                                />
                              </View>
                              <TouchableOpacity onPress={() => alert(t('defensive_fundamentals.postGameModalUnlockReportMessage'))}>
                                <Text style={styles.questionMark}>{t("common.questionMark")}</Text>
                              </TouchableOpacity>
                            </View>

                            {postgameStep <= 5 && (
                              <Text style={styles.highlightedQuestion}>
                                {getPostGameQuestionTitle(postgameStep)}
                              </Text>
                            )}

                            {showPostgameSurveyComplete ? (
                              <View>
                                <Text style={styles.modalText}>{t('defensive_fundamentals.postGameModalSurveyComplete')}</Text>
                                <Text style={styles.modalText}>
                                  {t('defensive_fundamentals.postGameModalCurrentProgress', { progress: postgameProgress })}
                                </Text>
                              </View>
                            ) : (
                              <View>
                                {postgameStep <= 5 && (
                                  <View style={styles.buttonGroupColumn}>
                                    {postGameOptions[postgameStep].map((option) => (
                                      <TouchableOpacity
                                        key={option.label}
                                        style={styles.optionButton}
                                        onPress={() => {
                                          handlePostGameAnswer(option.rating);
                                          console.log(`DefensiveFundamentals: Post-game option selected: ${option.label}, rating: ${option.rating}`);
                                        }}
                                      >
                                        <Text style={styles.optionButtonText}>{option.label}</Text>
                                      </TouchableOpacity>
                                    ))}
                                  </View>
                                )}
                              </View>
                            )}
                          </View>
                        ) : (
                          /* DEFAULT or unknown type */
                          <View style={styles.modalContent}>
                            <Text style={styles.modalTitle}>{selectedItem?.title}</Text>
                            <Text style={styles.modalText}>{t("common.noAdditionalDetails")}</Text>
                          </View>
                        )}

                        {/* Close Button */}
                        <TouchableOpacity onPress={closeModal} style={styles.closeButton}>
                          <Text style={styles.closeButtonText}>{t("common.close")}</Text>
                        </TouchableOpacity>
                      </ImageBackground>
                    </View>
                  </TouchableWithoutFeedback>
                </ScrollView>
              </View>
            </TouchableWithoutFeedback>
          </Modal>
        </View>
      </ImageBackground>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeAreaContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  scrollContainer: {
    paddingBottom: 30,
    flexGrow: 1,
    paddingTop: 10,
  },
  pageBackground: {
    flex: 1,
  },
  heroSection: {
    height: height * 0.31,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    top: 10,
    marginBottom: 20,
    borderWidth: 3,
    borderColor: '#00FFFF',
    borderRadius: 20,
    overflow: 'hidden',
    marginHorizontal: '4%',
  },
  heroImage: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    borderRadius: 20,
  },
  heroItemBackground: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  heroTextContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff228',
    textAlign: 'center',
    marginBottom: 10,
    textShadowColor: '#fff',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 10,
  },
  heroTeaser: {
    fontSize: 14,
    color: '#CCCCCC',
    textAlign: 'center',
    marginBottom: 15,
  },
  heroOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 15,
    justifyContent: 'center',
  },
  ctaButton: {
    backgroundColor: 'rgba(0,255,195,0.43)',
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 6,
    marginBottom: 5,
    top: 5,
  },
  ctaButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#000',
  },
  countdownTimer: {
    fontSize: 12,
    color: '#FFD700',
    top: 5,
  },
  moreTipsButton: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    backgroundColor: 'rgba(62, 200, 255, 0.73)',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 5,
  },
  moreTipsButtonText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#000',
  },
  mainSection: {
    paddingHorizontal: '4%',
  },
  sectionHeader: {
    fontSize: 22,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 10,
  },
  categoryTabs: {
    paddingHorizontal: 5,
    marginBottom: 15,
  },
  categoryTabBackground: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 15,
    marginRight: 10,
    overflow: 'hidden',
  },
  categoryTabImage: {
    borderRadius: 15,
    opacity: 0.8,
  },
  categoryTabText: {
    fontSize: 16,
    color: '#FFFFFF',
  },
  categoryTabSelected: {
    borderWidth: 1,
    borderColor: '#00FFFF',
    shadowColor: '#00FFFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 8,
  },
  categoryTabTextSelected: {
    fontWeight: 'bold',
    color: '#FFD700',
  },
  categoryContent: {
    padding: '3%',
    marginBottom: 20,
  },
  formationGridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  fullWidthGridContainer: {
    alignItems: 'center',
  },
  formationGridItem: {
    width: '45%',
    aspectRatio: 1,
    marginVertical: 10,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: 'rgba(17,17,17,0.5)',
  },
  fullWidthGridItem: {
    width: '90%',
    aspectRatio: 16 / 9,
    marginVertical: 15,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: 'rgba(17,17,17,0.7)',
  },
  gridItemImage: {
    width: '100%',
    height: '100%',
  },
  titleContainer: {
    position: 'absolute',
    bottom: -1,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(2,5,17,0.8)',
    paddingVertical: 4,
    alignItems: 'center',
  },
  gridItemTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
  },
  viewAllButton: {
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#00FFFF',
  },
  viewAllButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#00FFFF',
  },
  modalBackground: {
    flex: 1,
    backgroundColor: 'rgba(26, 26, 26, 0.8)',
    justifyContent: 'center',
  },
  modalScrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  modalContainer: {
    backgroundColor: 'rgba(2, 2, 2, 0.8)',
    borderRadius: 10,
    padding: 5,
    maxHeight: '90%',
    borderWidth: 2,
    borderColor: '#44d44e',
    shadowColor: '#00FFFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
  },
  modalImageBg: {
    width: '105%',
    justifyContent: 'center',
    padding: 15,
    left: -3,
  },
  modalContent: {
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFD700',
    marginBottom: 10,
    textAlign: 'center',
  },
  highlightedQuestion: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFD700',
    marginVertical: 10,
    textAlign: 'center',
  },
  modalText: {
    fontSize: 17,
    color: '#FFF',
    marginBottom: 5,
    textAlign: 'left',
  },
  modalSubheading: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFD700',
    marginTop: 8,
    textAlign: 'left',
  },
  buttonGroupColumn: {
    flexDirection: 'column',
    alignItems: 'center',
    marginVertical: 10,
  },
  optionButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    marginVertical: 5,
    width: '80%',
    alignItems: 'center',
  },
  optionButtonText: {
    fontSize: 14,
    color: '#FFF',
  },
  tipContainer: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 6,
    padding: 8,
    marginVertical: 5,
  },
  tipTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  showMoreButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 6,
    left: 100,
    alignSelf: 'center',
    marginTop: 10,
  },
  showMoreButtonText: {
    fontSize: 10,
    color: '#000',
    fontWeight: 'bold',
  },
  videoContainer: {
    width: '100%',
    height: 220,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#00FFFF',
    borderRadius: 10,
    overflow: 'hidden',
  },
  closeButton: {
    backgroundColor: 'rgba(208, 255, 0, 0.7)',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 20,
    alignSelf: 'center',
    marginBottom: 20,
  },
  closeButtonText: {
    color: '#000',
    fontWeight: 'bold',
  },
  skillMovesWrapper: {
    padding: 10,
    margin: 10,
  },
  errorText: {
    color: 'red',
    textAlign: 'center',
    marginBottom: 10,
  },
  videoCloseButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    zIndex: 1,
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderRadius: 15,
    padding: 5,
  },
  progressBarContainer: {
    marginVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressLabel: {
    color: '#FFD700',
    fontSize: 12,
    marginRight: 5,
  },
  progressBarOuter: {
    width: 100,
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 4,
    overflow: 'hidden',
    marginRight: 5,
  },
  progressBarInner: {
    height: '100%',
    backgroundColor: '#00FFBF',
  },
  questionMark: {
    fontSize: 12,
    color: '#FFD700',
    borderWidth: 1,
    borderColor: '#FFD700',
    borderRadius: 12,
    width: 24,
    height: 24,
    textAlign: 'center',
    lineHeight: 24,
    marginLeft: 5,
    backgroundColor: 'transparent',
  },
  imageBackgroundContainer: {
    width: '100%',
    padding: 10,
  },
  paginationContainer: {
    flexDirection: 'row',
    position: 'absolute',
    bottom: 10,
    alignSelf: 'center',
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#CCCCCC',
    margin: 4,
  },
  paginationDotActive: {
    backgroundColor: '#FFD700',
  },
});