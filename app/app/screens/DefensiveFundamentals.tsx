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
import DefensiveFundtabl from '../screens/DefensiveFundtabl'; // Changed from SkillMovesTabl

// Import local data
import { matchDayData } from '../../assets/data/prematch';
// Renamed import to avoid collision with local variables
import { halfTime as halfTimeDataFromFile } from '../../assets/data/half_break';

const { width, height } = Dimensions.get('window');
const db = getFirestore(firebaseApp);
const auth = getAuth(firebaseApp);

/** Helper: force HTTP -> HTTPS */
function ensureHttps(url = '') {
  console.log("DefensiveFundamentals: ensureHttps called with URL:", url);
  if (!url) {
    console.log("DefensiveFundamentals: ensureHttps returning empty string for empty URL.");
    return '';
  }
  const secureUrl = url.startsWith('http://') ? url.replace('http://', 'https://') : url;
  console.log("DefensiveFundamentals: ensureHttps returning secure URL:", secureUrl);
  return secureUrl;
}

/** Extract YouTube video ID */
function extractYoutubeVideoId(url = '') {
  console.log("DefensiveFundamentals: extractYoutubeVideoId called with URL:", url);
  const regex = /(?:youtube\.com\/(?:[^/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
  const match = url.match(regex);
  const videoId = match ? match[1] : null;
  console.log("DefensiveFundamentals: extractYoutubeVideoId returning video ID:", videoId);
  return videoId;
}

/** Transform YouTube URL for embedding */
function transformYoutubeUrl(originalUrl = '', { autoplay = 0, mute = 0 } = {}) {
  console.log("DefensiveFundamentals: transformYoutubeUrl called with URL:", originalUrl, "autoplay:", autoplay, "mute:", mute);
  if (!originalUrl) {
    console.log("DefensiveFundamentals: transformYoutubeUrl returning empty string for empty original URL.");
    return '';
  }
  const videoId = extractYoutubeVideoId(originalUrl);
  if (!videoId) {
    console.log("DefensiveFundamentals: transformYoutubeUrl returning original URL as video ID not found.");
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
  console.log("DefensiveFundamentals: transformYoutubeUrl returning embed URL:", embedUrl);
  return embedUrl;
}

/** Get YouTube thumbnail URL */
function getYoutubeThumbnail(url = '') {
  console.log("DefensiveFundamentals: getYoutubeThumbnail called with URL:", url);
  const videoId = extractYoutubeVideoId(url);
  const thumbnailUrl = videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : 'https://via.placeholder.com/150';
  console.log("DefensiveFundamentals: getYoutubeThumbnail returning thumbnail URL:", thumbnailUrl);
  return thumbnailUrl;
}

/** Shuffle array in place */
function shuffle(array) {
  console.log("DefensiveFundamentals: shuffle function called.");
  let currentIndex = array.length, randomIndex;
  while (currentIndex !== 0) {
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;
    [array[currentIndex], array[randomIndex]] = [
      array[randomIndex], array[currentIndex]];
  }
  console.log("DefensiveFundamentals: Array shuffled.");
  return array;
}

/** Modal background image based on type */
function getModalBackground(type) {
  console.log("DefensiveFundamentals: getModalBackground called with type:", type);
  return require('../../assets/images/Article bk.png');
}

export default function ExploreDefenseArsenallScreen() {
  console.log("ExploreDefenseArsenallScreen: Component mounted successfully.");
  const navigation = useNavigation();
  const route = useRoute();
  const router = useRouter();
  const { t } = useTranslation();

  // ========= HEADER ==========
  useLayoutEffect(() => {
    console.log("ExploreDefenseArsenallScreen: useLayoutEffect triggered for header options.");
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
    console.log("ExploreDefenseArsenallScreen: Header options set.");
  }, [navigation, route, t]);

  // ========= STATE ==========
  const [selectedCategory, setSelectedCategory] = useState('formations');
  console.log("ExploreDefenseArsenallScreen: State selectedCategory initialized to:", selectedCategory);
  // Hero article (spotlight) state
  const [heroArticle, setHeroArticle] = useState(null);
  console.log("ExploreDefenseArsenallScreen: State heroArticle initialized to:", heroArticle);
  const [loadingHeroArticle, setLoadingHeroArticle] = useState(true);
  console.log("ExploreDefenseArsenallScreen: State loadingHeroArticle initialized to:", loadingHeroArticle);
  const [heroArticleError, setHeroArticleError] = useState(false);
  console.log("ExploreDefenseArsenallScreen: State heroArticleError initialized to:", heroArticleError);
  const [heroCountdown, setHeroCountdown] = useState('');
  console.log("ExploreDefenseArsenallScreen: State heroCountdown initialized to:", heroCountdown);
  // Hero carousel articles state (for grid or carousel, if used)
  const [heroArticles, setHeroArticles] = useState([]);
  console.log("ExploreDefenseArsenallScreen: State heroArticles initialized to empty array.");
  const [currentHeroIndex, setCurrentHeroIndex] = useState(0);
  console.log("ExploreDefenseArsenallScreen: State currentHeroIndex initialized to:", currentHeroIndex);

  const [loadingHeroArticles, setLoadingHeroArticles] = useState(true);
  console.log("ExploreDefenseArsenallScreen: State loadingHeroArticles initialized to:", loadingHeroArticles);
  const [heroArticlesError, setHeroArticlesError] = useState(false);
  console.log("ExploreDefenseArsenallScreen: State heroArticlesError initialized to:", heroArticlesError);

  // Tactical videos
  const [tacticalVideos, setTacticalVideos] = useState([]);
  console.log("ExploreDefenseArsenallScreen: State tacticalVideos initialized to empty array.");
  const [loadingTacticalVideos, setLoadingTacticalVideos] = useState(true);
  console.log("ExploreDefenseArsenallScreen: State loadingTacticalVideos initialized to:", loadingTacticalVideos);
  const [tacticalVideosError, setTacticalVideosError] = useState(false);
  console.log("ExploreDefenseArsenallScreen: State tacticalVideosError initialized to:", tacticalVideosError);

  // Modal
  const [modalVisible, setModalVisible] = useState(false);
  console.log("ExploreDefenseArsenallScreen: State modalVisible initialized to:", modalVisible);
  const [selectedItem, setSelectedItem] = useState(null);
  console.log("ExploreDefenseArsenallScreen: State selectedItem initialized to:", selectedItem);

  // For hero re-fetch
  const [hasRefetched, setHasRefetched] = useState(false);
  console.log("ExploreDefenseArsenallScreen: State hasRefetched initialized to:", hasRefetched);

  // Pre-match modal
  const [selectedGameMode, setSelectedGameMode] = useState(null);
  console.log("ExploreDefenseArsenallScreen: State selectedGameMode initialized to:", selectedGameMode);
  const [selectedDivision, setSelectedDivision] = useState(null);
  console.log("ExploreDefenseArsenallScreen: State selectedDivision initialized to:", selectedDivision);
  const [showPrematchTips, setShowPrematchTips] = useState(false);
  console.log("ExploreDefenseArsenallScreen: State showPrematchTips initialized to:", showPrematchTips);
  const [prematchDisplayedTips, setPrematchDisplayedTips] = useState([]);
  console.log("ExploreDefenseArsenallScreen: State prematchDisplayedTips initialized to empty array.");

  // Mid-time modal
  const [midtimeStep, setMidtimeStep] = useState(1);
  console.log("ExploreDefenseArsenallScreen: State midtimeStep initialized to:", midtimeStep);
  const [midtimePerformance, setMidtimePerformance] = useState(null);
  console.log("ExploreDefenseArsenallScreen: State midtimePerformance initialized to:", midtimePerformance);
  const [midtimeConcern, setMidtimeConcern] = useState(null);
  console.log("ExploreDefenseArsenallScreen: State midtimeConcern initialized to:", midtimeConcern);
  const [showMidtimeTips, setShowMidtimeTips] = useState(false);
  console.log("ExploreDefenseArsenallScreen: State showMidtimeTips initialized to:", showMidtimeTips);
  const [midtimeDisplayedTips, setMidtimeDisplayedTips] = useState([]);
  console.log("ExploreDefenseArsenallScreen: State midtimeDisplayedTips initialized to empty array.");

  // Post-game
  const [postgameStep, setPostgameStep] = useState(1);
  console.log("ExploreDefenseArsenallScreen: State postgameStep initialized to:", postgameStep);
  const [postgameAnswers, setPostgameAnswers] = useState({
    overallPerformance: 0,
    attacking: 0,
    defending: 0,
    control: 0,
    mentality: 0,
  });
  console.log("ExploreDefenseArsenallScreen: State postgameAnswers initialized to:", postgameAnswers);
  const [postgameProgress, setPostgameProgress] = useState(0);
  console.log("ExploreDefenseArsenallScreen: State postgameProgress initialized to:", postgameProgress);
  const [showPostgameSurveyComplete, setShowPostgameSurveyComplete] = useState(false);
  console.log("ExploreDefenseArsenallScreen: State showPostgameSurveyComplete initialized to:", showPostgameSurveyComplete);

  // Animations
  const fadeAnim = useRef(new Animated.Value(1)).current;
  console.log("ExploreDefenseArsenallScreen: Animation fadeAnim initialized.");
  const slideAnim = useRef(new Animated.Value(0)).current;
  console.log("ExploreDefenseArsenallScreen: Animation slideAnim initialized.");
  const ctaOpacity = useRef(new Animated.Value(1)).current;
  console.log("ExploreDefenseArsenallScreen: Animation ctaOpacity initialized.");

  useEffect(() => {
    console.log("ExploreDefenseArsenallScreen: useEffect triggered for loading post-game progress.");
    loadPostGameProgress();
    return () => {
      console.log("ExploreDefenseArsenallScreen: Cleanup function for animations triggered.");
      fadeAnim.stopAnimation();
      slideAnim.stopAnimation();
      ctaOpacity.stopAnimation();
      console.log("ExploreDefenseArsenallScreen: Animations stopped during cleanup.");
    };
  }, []);

  async function loadPostGameProgress() {
    console.log("ExploreDefenseArsenallScreen: loadPostGameProgress function called.");
    try {
      console.log("ExploreDefenseArsenallScreen: Attempting to load postGameCheckingCount from AsyncStorage.");
      const progressStr = await AsyncStorage.getItem('postGameCheckingCount');
      if (progressStr) {
        setPostgameProgress(parseInt(progressStr, 10));
        console.log("ExploreDefenseArsenallScreen: postGameCheckingCount loaded successfully:", progressStr);
      } else {
        console.log("ExploreDefenseArsenallScreen: No postGameCheckingCount found in AsyncStorage.");
      }
    } catch (err) {
      console.log('ExploreDefenseArsenallScreen: Error loading postGameCheckingCount:', err);
      console.error('ExploreDefenseArsenallScreen: Error loading postGameCheckingCount:', err);
    }
  }

  // ========= CATEGORY DEFINITIONS ==========
  const categories = [
    { id: 'formations', label: t('defensive_fundamentals.categoryDefensiveFormations'), background: require('../../assets/images/button.png') },
    { id: 'matchDayAssistant', label: t('defensive_fundamentals.categoryMatchDayAssistant'), background: require('../../assets/images/button.png') },
    { id: 'skillMoves', label: t('defensive_fundamentals.categoryDefendingFundamentals'), background: require('../../assets/images/button.png') },
    { id: 'tacticalVideos', label: t('defensive_fundamentals.categoryDefendingTutorials'), background: require('../../assets/images/button.png') },
  ];
  console.log("ExploreDefenseArsenallScreen: Categories defined.");

  // ========= GRID DATA ==========
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
    skillMoves: [], // remains empty as the component now renders DefensiveFundtabl
  };
  console.log("ExploreDefenseArsenallScreen: Grid data defined.");

  // ========= 1) TACTICAL VIDEOS ==========
  useEffect(() => {
    console.log("ExploreDefenseArsenallScreen: useEffect triggered for tactical videos Firebase subscription.");
    setLoadingTacticalVideos(true);
    setTacticalVideosError(false);
    const database = getDatabase(firebaseApp);
    const videosRef = ref(database, 'weekly_videos');

    const unsubscribe = onValue(
      videosRef,
      (snapshot) => {
        console.log("ExploreDefenseArsenallScreen: Realtime DB snapshot received for tactical videos.");
        if (snapshot.exists()) {
          const data = snapshot.val();
          const allVideos = Object.keys(data).map((key) => ({ id: key, ...data[key] }));
          console.log("ExploreDefenseArsenallScreen: All videos fetched from Realtime DB:", allVideos);
          const defendVideos = allVideos.filter((video) => video.category === 'defend');
          defendVideos.sort((a, b) => (b.views || 0) - (a.views || 0));
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
          console.log("ExploreDefenseArsenallScreen: Top 6 defending tactical videos set:", top6);
        } else {
          setTacticalVideos([]);
          console.log("ExploreDefenseArsenallScreen: No tactical videos found in Realtime DB.");
        }
        setLoadingTacticalVideos(false);
        console.log("ExploreDefenseArsenallScreen: Finished loading tactical videos.");
      },
      (error) => {
        console.error('ExploreDefenseArsenallScreen: Realtime DB Error:', error);
        setTacticalVideosError(true);
        setLoadingTacticalVideos(false);
        console.log("ExploreDefenseArsenallScreen: Error loading tactical videos.");
      }
    );
    return () => {
      console.log("ExploreDefenseArsenallScreen: Cleaning up tactical videos Firebase subscription.");
      unsubscribe();
    };
  }, [t]);

  // ========= 2) HERO ARTICLE (Daily refresh) ==========
  async function fetchHeroArticles_Defending() {
    console.log("ExploreDefenseArsenallScreen: fetchHeroArticles_Defending function called.");
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
        console.log("ExploreDefenseArsenallScreen: State heroArticles updated.", selectedArticles);
        setHeroArticle(selectedArticles[0] || null);
        console.log("ExploreDefenseArsenallScreen: State heroArticle updated.", selectedArticles[0] || null);

        await AsyncStorage.setItem(cacheTimeKey, now.toString());
        await AsyncStorage.setItem(cacheKey, JSON.stringify(selectedArticles));
        console.log('[CACHE] Saved new Defending hero articles to AsyncStorage.');
      } else {
        console.log('[FIRESTORE] No articles found in the "Defending" category.');
        setHeroArticles([]);
        console.log("ExploreDefenseArsenallScreen: State heroArticles set to empty array.");
        setHeroArticle(null);
        console.log("ExploreDefenseArsenallScreen: State heroArticle set to null.");
      }
    } catch (error) {
      console.log('ExploreDefenseArsenallScreen: Error fetching Defending hero articles:', error);
      setHeroArticleError(true);
      console.log("ExploreDefenseArsenallScreen: State heroArticleError set to true.");
    } finally {
      setLoadingHeroArticle(false);
      console.log("ExploreDefenseArsenallScreen: State loadingHeroArticle set to false.");
    }
  }

  useEffect(() => {
    console.log('[EFFECT] Calling fetchHeroArticles_Defending...');
    fetchHeroArticles_Defending();
  }, []);

  // FlatList ref for hero
  const flatListRef = useRef(null);
  console.log("ExploreDefenseArsenallScreen: flatListRef initialized.");

  const handleHeroArticlePress = (article) => {
    console.log('ExploreDefenseArsenallScreen: handleHeroArticlePress called with article:', article.id);
    router.push({
      pathname: 'screens/ArticleScreen',
      params: { article: JSON.stringify(article) },
    });
    console.log("ExploreDefenseArsenallScreen: Navigation to ArticleScreen initiated.");
  };

  // Instead of full screen width, let's use .92 for container & item
  const HERO_WIDTH = width * 0.92;
  const heroImages = [
    require('../../assets/images/shooting.png'),
    require('../../assets/images/shooting.png'),
    require('../../assets/images/shooting.png'),
  ];
  console.log("ExploreDefenseArsenallScreen: Hero images defined.");

  const renderHeroItem = ({ item, index }) => {
    const backgroundImage =
      item.image_url && item.image_url.trim() !== ''
        ? { uri: item.image_url }
        : heroImages[index] || heroImages[0];
    console.log("ExploreDefenseArsenallScreen: Rendering hero item with background:", backgroundImage);

    return (
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => handleHeroArticlePress(item)}
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
                onPress={() => handleHeroArticlePress(item)}
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
    console.log("ExploreDefenseArsenallScreen: onHeroScrollEnd triggered.");
    const contentOffset = event.nativeEvent.contentOffset.x;
    const viewSize = event.nativeEvent.layoutMeasurement.width;
    const index = Math.floor(contentOffset / viewSize);
    setCurrentHeroIndex(index);
    console.log("ExploreDefenseArsenallScreen: Current hero index updated to:", index);
  };


  // 2b) Real-time hero article updates
  useEffect(() => {
    console.log("ExploreDefenseArsenallScreen: useEffect triggered for real-time hero article updates.");
    let unsubscribe;
    if (heroArticle?.id) {
      console.log("ExploreDefenseArsenallScreen: Subscribing to real-time updates for heroArticle ID:", heroArticle.id);
      const docRef = doc(db, 'Articles', heroArticle.id);
      unsubscribe = onSnapshot(
        docRef,
        (snapshot) => {
          console.log("ExploreDefenseArsenallScreen: Real-time hero article snapshot received.");
          if (snapshot.exists()) {
            setHeroArticle((prev) => ({ ...prev, ...snapshot.data() }));
            console.log("ExploreDefenseArsenallScreen: Hero article updated in real-time.");
          } else {
            console.log("ExploreDefenseArsenallScreen: Hero article does not exist anymore.");
          }
        },
        (error) => {
          console.log('ExploreDefenseArsenallScreen: Error listening to hero article changes:', error);
          console.error('ExploreDefenseArsenallScreen: Error listening to hero article changes:', error);
        }
      );
    }
    return () => {
      console.log("ExploreDefenseArsenallScreen: Cleaning up real-time hero article subscription.");
      if (unsubscribe) unsubscribe();
    };
  }, [heroArticle?.id]);

  // ========= HANDLERS ==========
  const handleCategoryChange = (cat) => {
    console.log('ExploreDefenseArsenallScreen: handleCategoryChange called for category:', cat);
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 20, duration: 200, useNativeDriver: true }),
    ]).start(() => {
      setSelectedCategory(cat);
      console.log("ExploreDefenseArsenallScreen: State selectedCategory updated to:", cat);
      requestAnimationFrame(() => {
        fadeAnim.setValue(0);
        slideAnim.setValue(-20);
        Animated.parallel([
          Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
          Animated.timing(slideAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
        ]).start();
      });
    });
    console.log("ExploreDefenseArsenallScreen: Category change animation started.");
  };

  const handleCTAPressIn = () => {
    console.log("ExploreDefenseArsenallScreen: handleCTAPressIn called.");
    Animated.timing(ctaOpacity, { toValue: 0.5, duration: 200, useNativeDriver: true }).start();
    console.log("ExploreDefenseArsenallScreen: CTA button opacity animation started (in).");
  };
  const handleCTAPressOut = () => {
    console.log("ExploreDefenseArsenallScreen: handleCTAPressOut called.");
    Animated.timing(ctaOpacity, { toValue: 1, duration: 200, useNativeDriver: true }).start();
    console.log("ExploreDefenseArsenallScreen: CTA button opacity animation started (out).");
  };
  const handleCTAPress = () => {
    console.log("ExploreDefenseArsenallScreen: handleCTAPress called.");
    if (heroArticle) {
      router.push({ pathname: 'screens/ArticleScreen', params: { article: JSON.stringify(heroArticle) } });
      console.log("ExploreDefenseArsenallScreen: Navigation to ArticleScreen initiated for hero article.");
    } else {
      console.log("ExploreDefenseArsenallScreen: No hero article selected for CTA press.");
    }
  };

  const handleMoreAttackingTips = () => {
    console.log("ExploreDefenseArsenallScreen: handleMoreAttackingTips called.");
    router.push('/screens/AllAttackingArticles');
    console.log("ExploreDefenseArsenallScreen: Navigation to AllAttackingArticles initiated.");
  };

  const handleGridPress = (item) => {
    console.log('ExploreDefenseArsenallScreen: handleGridPress called with item ID:', item.id, 'type:', item.type);
    setSelectedItem(item);
    console.log("ExploreDefenseArsenallScreen: State selectedItem updated to:", item.id);
    setModalVisible(true);
    console.log("ExploreDefenseArsenallScreen: State modalVisible set to true.");
  };

  const closeModal = () => {
    console.log("ExploreDefenseArsenallScreen: closeModal called.");
    setModalVisible(false);
    console.log("ExploreDefenseArsenallScreen: State modalVisible set to false.");
    setSelectedItem(null);
    console.log("ExploreDefenseArsenallScreen: State selectedItem set to null.");

    // Reset pre-match
    setSelectedGameMode(null);
    console.log("ExploreDefenseArsenallScreen: State selectedGameMode reset to null.");
    setSelectedDivision(null);
    console.log("ExploreDefenseArsenallScreen: State selectedDivision reset to null.");
    setShowPrematchTips(false);
    console.log("ExploreDefenseArsenallScreen: State showPrematchTips reset to false.");
    setPrematchDisplayedTips([]);
    console.log("ExploreDefenseArsenallScreen: State prematchDisplayedTips reset to empty array.");

    // Reset mid-time
    setMidtimeStep(1);
    console.log("ExploreDefenseArsenallScreen: State midtimeStep reset to 1.");
    setMidtimePerformance(null);
    console.log("ExploreDefenseArsenallScreen: State midtimePerformance reset to null.");
    setMidtimeConcern(null);
    console.log("ExploreDefenseArsenallScreen: State midtimeConcern reset to null.");
    setShowMidtimeTips(false);
    console.log("ExploreDefenseArsenallScreen: State showMidtimeTips reset to false.");
    setMidtimeDisplayedTips([]);
    console.log("ExploreDefenseArsenallScreen: State midtimeDisplayedTips reset to empty array.");

    // Reset post-game
    setPostgameStep(1);
    console.log("ExploreDefenseArsenallScreen: State postgameStep reset to 1.");
    setPostgameAnswers({
      overallPerformance: 0,
      attacking: 0,
      defending: 0,
      control: 0,
      mentality: 0,
    });
    console.log("ExploreDefenseArsenallScreen: State postgameAnswers reset to initial values.");
    setShowPostgameSurveyComplete(false);
    console.log("ExploreDefenseArsenallScreen: State showPostgameSurveyComplete reset to false.");
    console.log("ExploreDefenseArsenallScreen: Modal closed and states reset.");
  };

  // ========== PRE-MATCH TIPS ===========
  const divisionMapping = {
    'Division 10-8': 'beginner',
    'Division 7-5': 'intermediate',
    'Division 4-2': 'advanced',
    'Elite': 'elite',
  };
  function generatePrematchTips() {
    console.log("ExploreDefenseArsenallScreen: generatePrematchTips called.");
    let tips = [];
    if (selectedGameMode === 'UT' || selectedGameMode === 'Seasons') {
      console.log("ExploreDefenseArsenallScreen: Game mode is UT or Seasons.");
      if (selectedDivision) {
        console.log("ExploreDefenseArsenallScreen: Division selected:", selectedDivision);
        const subKey = divisionMapping[selectedDivision];
        tips = (matchDayData.preMatch.UT && matchDayData.preMatch.UT[subKey]) || [];
        console.log("ExploreDefenseArsenallScreen: Fetched UT/Seasons tips based on division:", tips.length, "tips.");
      } else {
        console.log("ExploreDefenseArsenallScreen: No division selected for UT/Seasons.");
      }
    } else if (selectedGameMode === 'Career') {
      tips = matchDayData.preMatch.careerMode || [];
      console.log("ExploreDefenseArsenallScreen: Fetched Career Mode tips:", tips.length, "tips.");
    } else {
      tips = matchDayData.preMatch.general || [];
      console.log("ExploreDefenseArsenallScreen: Fetched general pre-match tips:", tips.length, "tips.");
    }
    if (tips.length === 0) {
      tips = matchDayData.preMatch.general || [];
      console.log("ExploreDefenseArsenallScreen: Fallback to general pre-match tips as no specific tips found.");
    }
    const shuffled = shuffle([...tips]);
    const finalTips = shuffled.slice(0, 3);
    setPrematchDisplayedTips(finalTips);
    console.log("ExploreDefenseArsenallScreen: State prematchDisplayedTips updated:", finalTips);
    setShowPrematchTips(true);
    console.log("ExploreDefenseArsenallScreen: State showPrematchTips set to true.");
    console.log("ExploreDefenseArsenallScreen: Pre-match tips generated and displayed.");
  }

  // ========== MID-TIME TIPS ===========
  function generateMidtimeTips() {
    console.log("ExploreDefenseArsenallScreen: generateMidtimeTips called.");
    console.log('[MID-TIME] Performance:', midtimePerformance);
    console.log('[MID-TIME] Concern:', midtimeConcern);

    let tipsPerformance = [];
    let tipsConcern = [];

    // Use the imported halfTime data (renamed to halfTimeDataFromFile)
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
        (item) => item.level.toLowerCase() === perfKey.toLowerCase()
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
    console.log("ExploreDefenseArsenallScreen: State midtimeDisplayedTips updated:", finalTips);
    setShowMidtimeTips(true);
    console.log("ExploreDefenseArsenallScreen: State showMidtimeTips set to true.");
    console.log("ExploreDefenseArsenallScreen: Mid-time tips generated and displayed.");
  }

  // ========== POST-GAME SURVEY ===========
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
    console.log("ExploreDefenseArsenallScreen: handlePostGameAnswer called for step:", postgameStep, "with rating:", rating);
    let newAnswers = { ...postgameAnswers };
    switch (postgameStep) {
      case 1:
        newAnswers.overallPerformance = rating;
        console.log("ExploreDefenseArsenallScreen: Post-game overallPerformance set to:", rating);
        break;
      case 2:
        newAnswers.attacking = rating;
        console.log("ExploreDefenseArsenallScreen: Post-game attacking rating set to:", rating);
        break;
      case 3:
        newAnswers.defending = rating;
        console.log("ExploreDefenseArsenallScreen: Post-game defending rating set to:", rating);
        break;
      case 4:
        newAnswers.control = rating;
        console.log("ExploreDefenseArsenallScreen: Post-game control rating set to:", rating);
        break;
      case 5:
        newAnswers.mentality = rating;
        console.log("ExploreDefenseArsenallScreen: Post-game mentality rating set to:", rating);
        break;
    }
    setPostgameAnswers(newAnswers);
    console.log("ExploreDefenseArsenallScreen: State postgameAnswers updated:", newAnswers);

    if (postgameStep < 5) {
      setPostgameStep(postgameStep + 1);
      console.log("ExploreDefenseArsenallScreen: State postgameStep incremented to:", postgameStep + 1);
    } else {
      finalizePostGameSurvey(newAnswers);
      console.log("ExploreDefenseArsenallScreen: Post-game survey finalized.");
    }
  }

  async function finalizePostGameSurvey(finalAnswers) {
    console.log("ExploreDefenseArsenallScreen: finalizePostGameSurvey called with final answers:", finalAnswers);
    setPostgameStep(6); // Indicate completion or final step
    console.log("ExploreDefenseArsenallScreen: State postgameStep set to 6.");
    setShowPostgameSurveyComplete(true);
    console.log("ExploreDefenseArsenallScreen: State showPostgameSurveyComplete set to true.");

    let newProgress = postgameProgress + 1;
    if (newProgress > 100) newProgress = 100; // Cap at 100
    setPostgameProgress(newProgress);
    console.log("ExploreDefenseArsenallScreen: State postgameProgress updated to:", newProgress);
    await AsyncStorage.setItem('postGameCheckingCount', String(newProgress));
    console.log("ExploreDefenseArsenallScreen: postGameCheckingCount saved to AsyncStorage:", newProgress);

    const newGameId = newProgress; // Using progress as a simple ID for now
    const gameData = {
      gameId: newGameId,
      date: new Date().toISOString().slice(0, 10), // YYYY-MM-DD
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
    console.log("ExploreDefenseArsenallScreen: Local game data stored and upload initiated.");

    if (newProgress === 100) {
      console.log('ExploreDefenseArsenallScreen: User reached 100 post-game check-ins! Show big 100-game report soon...');
    }
    console.log("ExploreDefenseArsenallScreen: Post-game survey finalized and data processed.");
  }

  async function storeLocalGameData(newGame) {
    console.log("ExploreDefenseArsenallScreen: storeLocalGameData called with new game:", newGame.gameId);
    try {
      const existingStr = await AsyncStorage.getItem('localPostGameEntries');
      let existing = existingStr ? JSON.parse(existingStr) : [];
      existing.push({ ...newGame, uploaded: false });
      await AsyncStorage.setItem('localPostGameEntries', JSON.stringify(existing));
      console.log("ExploreDefenseArsenallScreen: Game data stored locally:", newGame.gameId);
    } catch (err) {
      console.log('ExploreDefenseArsenallScreen: Error storing local game data:', err);
      console.error('ExploreDefenseArsenallScreen: Error storing local game data:', err);
    }
  }

  async function maybeUploadPostGameData() {
    console.log("ExploreDefenseArsenallScreen: maybeUploadPostGameData called.");
    try {
      const existingStr = await AsyncStorage.getItem('localPostGameEntries');
      if (!existingStr) {
        console.log("ExploreDefenseArsenallScreen: No local post-game entries found to upload.");
        return;
      }
      let entries = JSON.parse(existingStr);
      let unUploaded = entries.filter((g) => !g.uploaded);
      if (unUploaded.length < 10) {
        console.log("ExploreDefenseArsenallScreen: Less than 10 un-uploaded entries, skipping upload for now.");
        return;
      }

      const batch = unUploaded.slice(0, 10);
      const summary = summarizeGames(batch);
      await uploadPostGameSummary(summary);
      console.log("ExploreDefenseArsenallScreen: Post-game summary generated and upload initiated.");

      // Mark them as uploaded
      const updated = entries.map((item) => {
        if (batch.some((b) => b.gameId === item.gameId)) {
          return { ...item, uploaded: true };
        }
        return item;
      });
      await AsyncStorage.setItem('localPostGameEntries', JSON.stringify(updated));
      console.log("ExploreDefenseArsenallScreen: Local post-game entries marked as uploaded.");
    } catch (err) {
      console.log('ExploreDefenseArsenallScreen: maybeUploadPostGameData error:', err);
      console.error('ExploreDefenseArsenallScreen: maybeUploadPostGameData error:', err);
    }
  }

  function summarizeGames(games) {
    console.log("ExploreDefenseArsenallScreen: summarizeGames called with", games.length, "games.");
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
    console.log("ExploreDefenseArsenallScreen: Game summary generated:", summary);
    return summary;
  }

  async function uploadPostGameSummary(summary) {
    console.log("ExploreDefenseArsenallScreen: uploadPostGameSummary called.");
    try {
      const user = auth.currentUser;
      if (!user) {
        console.log('ExploreDefenseArsenallScreen: No user signed in. Storing offline only.');
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
      console.log('ExploreDefenseArsenallScreen: Uploaded post-game summary to Firestore successfully!');
    } catch (err) {
      console.log('ExploreDefenseArsenallScreen: Error uploading post-game summary:', err);
      console.error('ExploreDefenseArsenallScreen: Error uploading post-game summary:', err);
    }
  }

  // Container style
  const containerStyle =
    selectedCategory === 'formations'
      ? styles.formationGridContainer
      : styles.fullWidthGridContainer;
  console.log("ExploreDefenseArsenallScreen: Container style determined:", selectedCategory);

  // Update selectedCategoryObj based on the modified categories
  const selectedCategoryObj = categories.find((c) => c.id === selectedCategory);
  const AnimatedImageBackground = Animated.createAnimatedComponent(ImageBackground);
  console.log("ExploreDefenseArsenallScreen: AnimatedImageBackground component created.");

  // Grid item
  const InteractiveGridItem = React.memo(({ item }) => {
    const opacityAnim = useRef(new Animated.Value(1)).current;
    const onPress = () => {
      console.log("ExploreDefenseArsenallScreen: InteractiveGridItem pressed. Item ID:", item.id);
      Animated.sequence([
        Animated.timing(opacityAnim, { toValue: 0.5, duration: 100, useNativeDriver: true }),
        Animated.timing(opacityAnim, { toValue: 1, duration: 100, useNativeDriver: true }),
      ]).start(() => {
        handleGridPress(item);
        console.log("ExploreDefenseArsenallScreen: InteractiveGridItem press animation complete, handleGridPress called.");
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
      imageSource = require('../../assets/images/bk.png');
    }
    console.log("ExploreDefenseArsenallScreen: Rendering InteractiveGridItem for item:", item.id, "with image source:", imageSource);
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
        </Animated.View><View style={styles.titleContainer}><Text style={styles.gridItemTitle} numberOfLines={2}>
            {item.title}
          </Text></View></TouchableOpacity>
    );
  });

  function getCategoryData() {
    console.log("ExploreDefenseArsenallScreen: getCategoryData called for selectedCategory:", selectedCategory);
    if (selectedCategory === 'tacticalVideos') return tacticalVideos;
    if (selectedCategory === 'skillMoves') return [];
    const data = gridData[selectedCategory] || [];
    console.log("ExploreDefenseArsenallScreen: Returning data for category:", selectedCategory, "data length:", data.length);
    return data;
  }

  function getPostGameQuestionTitle(step) {
    console.log("ExploreDefenseArsenallScreen: getPostGameQuestionTitle called for step:", step);
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
        console.log("ExploreDefenseArsenallScreen: Unknown post-game question step:", step);
        return '';
    }
  }

  // ========== RENDER ==========
  return (
    <SafeAreaView style={styles.safeAreaContainer}><ImageBackground
      source={require('../../assets/images/bk13.png')}
      style={styles.pageBackground}
      resizeMode="cover"
    >
      <View style={{ marginTop: 50, flex: 1 }}><ScrollView contentContainerStyle={styles.scrollContainer}>
        {/* HERO SECTION */}
        <View style={styles.heroSection}>
          {loadingHeroArticle ? (
            <ActivityIndicator size="small" color="#00FFFF" />
          ) : heroArticleError ? (
            <Text style={{ color: 'red' }}>{t('defensive_fundamentals.heroErrorLoadingArticles')}</Text>
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

          <TouchableOpacity
            style={styles.moreTipsButton}
            onPress={() => router.push('/screens/AllAttackingArticles')}
          >
            <Text style={styles.moreTipsButtonText}>{t('defensive_fundamentals.heroMoreArticlesButton')}</Text>
          </TouchableOpacity>
        </View>


        {/* MAIN SECTION */}
        <View style={styles.mainSection}><Text style={styles.sectionHeader}>{t('defensive_fundamentals.exploreDefenseArsenalTitle')}</Text><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryTabs}>
          {categories.map((cat) => (
            <TouchableOpacity
              key={cat.id}
              onPress={() => handleCategoryChange(cat.id)}
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
        </ScrollView><AnimatedImageBackground
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
                  onPress={() =>
                    router.push({
                      pathname:
                        selectedCategory === 'formations'
                          ? '/screens/FormationsScreen'
                          : selectedCategory === 'skillMoves'
                            ? '/AllDefendingFundamentalsScreen'
                            : '/screens/MoreVideos',
                    })}
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
        </AnimatedImageBackground></View>

        {/* MODAL */}
        <Modal
          visible={modalVisible}
          transparent
          animationType="fade"
          onRequestClose={closeModal}
        >
          <TouchableWithoutFeedback onPress={() => { if (selectedItem?.type !== 'tacticalVideo') closeModal(); }}>
            <View style={styles.modalBackground}><ScrollView contentContainerStyle={styles.modalScrollContainer}>
              <TouchableWithoutFeedback>
                <View style={styles.modalContainer}><ImageBackground
                  source={getModalBackground(selectedItem?.type)}
                  style={styles.modalImageBg}
                  imageStyle={{ borderRadius: 10, resizeMode: 'cover' }}
                >
                  {/* TACTICAL VIDEO MODAL */}
                  {selectedItem?.type === 'tacticalVideo' ? (
                    <View style={styles.modalContent}><Text style={styles.modalTitle}>{selectedItem.title}</Text><View style={styles.videoContainer}>
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
                    </View></View>
                  ) : selectedItem?.type === 'formation' ? (
                    /* FORMATION MODAL */
                    <View style={styles.modalContent}><Text style={styles.modalTitle}>{selectedItem.title}</Text><Text style={styles.modalText}>{selectedItem.description}</Text><Text style={styles.modalSubheading}>{t('defensive_fundamentals.formationModalPros')}</Text><Text style={styles.modalText}>{selectedItem.pros}</Text><Text style={styles.modalSubheading}>{t('defensive_fundamentals.formationModalCons')}</Text><Text style={styles.modalText}>{selectedItem.cons}</Text><Text style={styles.modalSubheading}>{t('defensive_fundamentals.formationModalBestFor')}</Text><Text style={styles.modalText}>{selectedItem.recommended}</Text></View>
                  ) : selectedItem?.type === 'matchDayAssistantPrematch' ? (
                    /* PRE-MATCH HUDDLE */
                    <View style={styles.modalContent}><Text style={styles.modalTitle}>{t('defensive_fundamentals.prematchModalTitle')}</Text>
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
                                      console.log("ExploreDefenseArsenallScreen: Pre-match game mode selected:", mode);
                                      setSelectedGameMode(mode);
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
                                      console.log("ExploreDefenseArsenallScreen: Pre-match division selected:", div);
                                      setSelectedDivision(div);
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
                        <View><Text style={styles.modalText}>{t('defensive_fundamentals.prematchModalHereAreYourTips')}</Text>
                          {prematchDisplayedTips.map((tip, idx) => (
                            <View key={idx} style={styles.tipContainer}><Text style={styles.tipTitle}>{tip.text}</Text></View>
                          ))}
                          {/* Show More Button */}
                          <TouchableOpacity onPress={generatePrematchTips} style={styles.showMoreButton}><Text style={styles.showMoreButtonText}>{t('defensive_fundamentals.prematchModalShowMoreButton')}</Text></TouchableOpacity></View>
                      )}
                    </View>
                  ) : selectedItem?.type === 'matchDayAssistantMidtime' ? (
                    /* MID-TIME CHECK */
                    <View style={styles.modalContent}><Text style={styles.modalTitle}>{t('defensive_fundamentals.midtimeModalTitle')}</Text>
                      {!showMidtimeTips ? (
                        midtimeStep === 1 ? (
                          <>
                            <Text style={styles.highlightedQuestion}>{t('defensive_fundamentals.midtimeModalFirstHalfPerformanceQuestion')}</Text>
                            <View style={styles.buttonGroupColumn}>
                              {[t('defensive_fundamentals.midtimeOptionDominating'), t('defensive_fundamentals.midtimeOptionGood'), t('defensive_fundamentals.midtimeOptionEven'), t('defensive_fundamentals.midtimeOptionStruggling')].map((option) => (
                                <TouchableOpacity
                                  key={option}
                                  onPress={() => {
                                    console.log("ExploreDefenseArsenallScreen: Mid-time performance selected:", option);
                                    setMidtimePerformance(option);
                                    setMidtimeStep(2);
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
                                    console.log("ExploreDefenseArsenallScreen: Mid-time concern selected:", concern);
                                    setMidtimeConcern(concern);
                                    generateMidtimeTips();
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
                        <View><Text style={styles.modalText}>{t('defensive_fundamentals.midtimeModalHereAreYourTips')}</Text>
                          {midtimeDisplayedTips.map((tip, idx) => (
                            <View key={idx} style={styles.tipContainer}><Text style={styles.tipTitle}>{tip}</Text></View>
                          ))}
                        </View>
                      )}
                    </View>
                  ) : selectedItem?.type === 'matchDayAssistantPostgame' ? (
                    /* POST-GAME 5-QUESTION SURVEY */
                    <View style={styles.modalContent}><Text style={styles.modalTitle}>{t('defensive_fundamentals.postGameModalTitle')}</Text><View style={styles.progressBarContainer}><Text style={styles.progressLabel}>
                      {t('defensive_fundamentals.postGameModalProgressLabel', { progress: postgameProgress })}
                    </Text><View style={styles.progressBarOuter}><View
                      style={[
                        styles.progressBarInner,
                        { width: `${(postgameProgress / 100) * 100}%` },
                      ]}
                    /></View><TouchableOpacity onPress={() => alert(t('defensive_fundamentals.postGameModalUnlockReportMessage'))}><Text style={styles.questionMark}>{t("common.questionMark")}</Text></TouchableOpacity></View>

                      {postgameStep <= 5 && (
                        <Text style={styles.highlightedQuestion}>
                          {getPostGameQuestionTitle(postgameStep)}
                        </Text>
                      )}

                      {showPostgameSurveyComplete ? (
                        <View><Text style={styles.modalText}>{t('defensive_fundamentals.postGameModalSurveyComplete')}</Text><Text style={styles.modalText}>
                          {t('defensive_fundamentals.postGameModalCurrentProgress', { progress: postgameProgress })}
                        </Text></View>
                      ) : (
                        <View>
                          {postgameStep <= 5 && (
                            <View style={styles.buttonGroupColumn}>
                              {postGameOptions[postgameStep].map((option) => (
                                <TouchableOpacity
                                  key={option.label}
                                  style={styles.optionButton}
                                  onPress={() => handlePostGameAnswer(option.rating)}
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
                    <View style={styles.modalContent}><Text style={styles.modalTitle}>{selectedItem?.title}</Text><Text style={styles.modalText}>{t("common.noAdditionalDetails")}</Text></View>
                  )}

                  {/* Close Buttons */}
                  <TouchableOpacity onPress={closeModal} style={styles.closeButton}><Text style={styles.closeButtonText}>{t("common.close")}</Text></TouchableOpacity></ImageBackground></View></TouchableWithoutFeedback></ScrollView></View></TouchableWithoutFeedback></Modal></View></ImageBackground></SafeAreaView>
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
  spotlightContent: {
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  spotlightArticleTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff228',
    textAlign: 'center',
    marginBottom: 25,
    textShadowColor: '#fff',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 10,
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
    backgroundColor: '#00FFB5',
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