import React, { useRef, useState, useLayoutEffect, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Animated,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Image,
  ImageBackground,
  ScrollView,
  Modal,
  SafeAreaView,
  ActivityIndicator,
  FlatList,
  Alert,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { useNavigation, useRoute } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next'; // <--- ADDED: i18n import

// If you’re using Expo:
import { LinearGradient } from 'expo-linear-gradient';

// If you’re NOT using Expo, install react-native-linear-gradient:
// import LinearGradient from 'react-native-linear-gradient';

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
import SkillMovesTable from '../screens/SkillMovesTable';

// Import local data
import { matchDayData } from '../../assets/data/prematch';
import { halfTime as halfTimeDataFromFile } from '../../assets/data/half_break';

const { width, height } = Dimensions.get('window');
const db = getFirestore(firebaseApp);
const auth = getAuth(firebaseApp);

/** Helper: force HTTP -> HTTPS */
function ensureHttps(url = '') {
  if (!url) return '';
  return url.startsWith('http://') ? url.replace('http://', 'https://') : url;
}

/** Extract YouTube video ID */
function extractYoutubeVideoId(url = '') {
  const regex = /(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
  const match = url.match(regex);
  return match ? match[1] : null;
}

/** Transform YouTube URL for embedding */
function transformYoutubeUrl(originalUrl = '', { autoplay = 0, mute = 0 } = {}) {
  if (!originalUrl) return '';
  const videoId = extractYoutubeVideoId(originalUrl);
  if (!videoId) return originalUrl;
  let embedUrl = `https://www.youtube.com/embed/${videoId}`;
  const params = [];
  if (autoplay) params.push(`autoplay=${autoplay}`);
  if (mute) params.push(`mute=${mute}`);
  params.push('playsinline=1');
  if (params.length > 0) {
    embedUrl += `?${params.join('&')}`;
  }
  return embedUrl;
}

/** Get YouTube thumbnail URL */
function getYoutubeThumbnail(url = '') {
  const videoId = extractYoutubeVideoId(url);
  return videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : 'https://via.placeholder.com/150';
}

/** Shuffle array in place */
function shuffle(array) {
  let currentIndex = array.length, randomIndex;
  while (currentIndex !== 0) {
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;
    [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
  }
  return array;
}

/** Modal background image based on type */
function getModalBackground(type) {
  return require('../../assets/images/Article bk.png');
}

/** Local images for the 3 hero slides. */
const heroImages = [
  require('../../assets/images/attacking_herobar.png'),
  require('../../assets/images/attacking_herobar2.png'),
  require('../../assets/images/attacking_herobar3.png'),
];

export default function ExploreAttackArsenalScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const router = useRouter();
  const { t } = useTranslation(); // <--- ADDED: useTranslation hook

  // ======= HEADER =======
  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: true,
      header: (props) => (
        <CustomHeader
          {...props}
          navigation={navigation}
          route={route}
          options={{ headerTitle: t('common.appTitle') }} // MODIFIED: Translated 'proVision'
          back={props.back}
        />
      ),
    });
  }, [navigation, route, t]); // MODIFIED: Added t to dependency array

  // ======= STATE =======
  const [selectedCategory, setSelectedCategory] = useState('formations');

  // Hero articles (3 swipeable)
  const [heroArticles, setHeroArticles] = useState([]);
  const [loadingHeroArticles, setLoadingHeroArticles] = useState(true);
  const [heroArticlesError, setHeroArticlesError] = useState(false);
  const [currentHeroIndex, setCurrentHeroIndex] = useState(0);

  // Tactical videos
  const [tacticalVideos, setTacticalVideos] = useState([]);
  const [loadingTacticalVideos, setLoadingTacticalVideos] = useState(true);
  const [tacticalVideosError, setTacticalVideosError] = useState(false);

  // Modal & grid state
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);

  // Pre-match modal
  const [selectedGameMode, setSelectedGameMode] = useState(null);
  const [selectedDivision, setSelectedDivision] = useState(null);
  const [showPrematchTips, setShowPrematchTips] = useState(false);
  const [prematchDisplayedTips, setPrematchDisplayedTips] = useState([]);

  // Mid-time modal
  const [midtimeStep, setMidtimeStep] = useState(1);
  const [midtimePerformance, setMidtimePerformance] = useState(null);
  const [midtimeConcern, setMidtimeConcern] = useState(null);
  const [showMidtimeTips, setShowMidtimeTips] = useState(false);
  const [midtimeDisplayedTips, setMidtimeDisplayedTips] = useState([]);

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

  // Animations
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;
  const ctaOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    loadPostGameProgress();
    return () => {
      fadeAnim.stopAnimation();
      slideAnim.stopAnimation();
      ctaOpacity.stopAnimation();
    };
  }, []);

  async function loadPostGameProgress() {
    try {
      const progressStr = await AsyncStorage.getItem('postGameCheckinCount');
      if (progressStr) {
        setPostgameProgress(parseInt(progressStr, 10));
      }
    } catch (err) {
      console.log('Error loading postGameCheckinCount:', err);
    }
  }

  // ======= CATEGORY DEFINITIONS =======
  const categories = [
    { id: 'formations', label: t('offenseScreen.categoryFormations'), background: require('../../assets/images/button.png') }, // MODIFIED: Translated label
    { id: 'matchDayAssistant', label: t('offenseScreen.categoryMatchDayAssistant'), background: require('../../assets/images/button.png') }, // MODIFIED: Translated label
    { id: 'skillMoves', label: t('offenseScreen.categorySkillMoves'), background: require('../../assets/images/button.png') }, // MODIFIED: Translated label
    { id: 'tacticalVideos', label: t('offenseScreen.categoryTacticalVideos'), background: require('../../assets/images/button.png') }, // MODIFIED: Translated label
  ];

  // ======= GRID DATA =======
  const gridData = {
    formations: [
      {
        id: '4-2-4',
        title: '4-2-4',
        preview: { uri: '' },
        background: require('../../assets/images/424.png'),
        description: t('offenseScreen.formation424Description'), // MODIFIED: Translated description
        pros: t('offenseScreen.formation424Pros'), // MODIFIED: Translated pros
        cons: t('offenseScreen.formation424Cons'), // MODIFIED: Translated cons
        recommended: t('offenseScreen.formation424Recommended'), // MODIFIED: Translated recommended
        type: 'formation',
      },
      {
        id: '3-4-3',
        title: '3-4-3',
        preview: { uri: '' },
        background: require('../../assets/images/343.png'),
        description: t('offenseScreen.formation343Description'), // MODIFIED: Translated description
        pros: t('offenseScreen.formation343Pros'), // MODIFIED: Translated pros
        cons: t('offenseScreen.formation343Cons'), // MODIFIED: Translated cons
        recommended: t('offenseScreen.formation343Recommended'), // MODIFIED: Translated recommended
        type: 'formation',
      },
      {
        id: '4-3-3 (Attack)',
        title: '4-3-3 (Attack)',
        preview: { uri: '' },
        background: require('../../assets/images/433.png'),
        description: t('offenseScreen.formation433AttackDescription'), // MODIFIED: Translated description
        pros: t('offenseScreen.formation433AttackPros'), // MODIFIED: Translated pros
        cons: t('offenseScreen.formation433AttackCons'), // MODIFIED: Translated cons
        recommended: t('offenseScreen.formation433AttackRecommended'), // MODIFIED: Translated recommended
        type: 'formation',
      },
      {
        id: '4-2-1-3',
        title: '4-2-1-3',
        preview: { uri: '' },
        background: require('../../assets/images/4213.png'),
        description: t('offenseScreen.formation4213Description'), // MODIFIED: Translated description
        pros: t('offenseScreen.formation4213Pros'), // MODIFIED: Translated pros
        cons: t('offenseScreen.formation4213Cons'), // MODIFIED: Translated cons
        recommended: t('offenseScreen.formation4213Recommended'), // MODIFIED: Translated recommended
        type: 'formation',
      },
      {
        id: '3-5-2',
        title: '3-5-2',
        preview: { uri: '' },
        background: require('../../assets/images/352.png'),
        description: t('offenseScreen.formation352Description'), // MODIFIED: Translated description
        pros: t('offenseScreen.formation352Pros'), // MODIFIED: Translated pros
        cons: t('offenseScreen.formation352Cons'), // MODIFIED: Translated cons
        recommended: t('offenseScreen.formation352Recommended'), // MODIFIED: Translated recommended
        type: 'formation',
      },
      {
        id: '4-1-3-2',
        title: '4-1-3-2',
        preview: { uri: '' },
        background: require('../../assets/images/4132.png'),
        description: t('offenseScreen.formation4132Description'), // MODIFIED: Translated description
        pros: t('offenseScreen.formation4132Pros'), // MODIFIED: Translated pros
        cons: t('offenseScreen.formation4132Cons'), // MODIFIED: Translated cons
        recommended: t('offenseScreen.formation4132Recommended'), // MODIFIED: Translated recommended
        type: 'formation',
      },
    ],
    matchDayAssistant: [
      {
        id: 'prematch-huddle',
        title: t('offenseScreen.prematchHuddleTitle'), // MODIFIED: Translated title
        preview: { uri: '' },
        background: require('../../assets/images/pre_match.png'),
        type: 'matchDayAssistantPrematch',
      },
      {
        id: 'midtime-check',
        title: t('offenseScreen.midtimeCheckTitle'), // MODIFIED: Translated title
        preview: { uri: '' },
        background: require('../../assets/images/mid_match.png'),
        type: 'matchDayAssistantMidtime',
      },
      {
        id: 'postgame-reflection',
        title: t('offenseScreen.postgameReflectionTitle'), // MODIFIED: Translated title
        preview: { uri: '' },
        background: require('../../assets/images/post_match.png'),
        type: 'matchDayAssistantPostgame',
      },
    ],
  };

  // ======= 1) TACTICAL VIDEOS =======
  useEffect(() => {
    setLoadingTacticalVideos(true);
    setTacticalVideosError(false);
    const database = getDatabase(firebaseApp);
    const videosRef = ref(database, 'weekly_videos');
    const unsubscribe = onValue(
      videosRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.val();
          const allVideos = Object.keys(data).map((key) => ({ id: key, ...data[key] }));
          const attackVideos = allVideos.filter((video) => video.category === 'attack');
          attackVideos.sort((a, b) => (b.views || 0) - (a.views || 0));
          const top6 = attackVideos.slice(0, 6).map((vid) => {
            const thumb = ensureHttps(getYoutubeThumbnail(vid.video_url || ''));
            return {
              ...vid,
              preview: { uri: thumb },
              videoUrl: ensureHttps(vid.video_url || ''),
              title: vid.title || t('offenseScreen.noTitle'), // MODIFIED: Translated 'No Title'
              type: 'tacticalVideo',
            };
          });
          setTacticalVideos(top6);
        } else {
          setTacticalVideos([]);
        }
        setLoadingTacticalVideos(false);
      },
      (error) => {
        console.error('Realtime DB Error:', error);
        setTacticalVideosError(true);
        setLoadingTacticalVideos(false);
      }
    );
    return () => unsubscribe();
  }, [t]); // MODIFIED: Added t to dependency array

  // ======= 2) HERO ARTICLES (Swipeable Carousel) =======
  async function fetchHeroArticles_Attacking() {
    setLoadingHeroArticles(true);
    setHeroArticlesError(false);
  
    try {
      const now = Date.now();
      const midnight = new Date();
      midnight.setHours(0, 0, 0, 0);
  
      const cacheKey = 'heroArticles_Attacking';
      const cacheTimeKey = 'lastHeroArticlesPickTime_Attacking';
  
      // --- COMMENTING OUT THE CACHE LOADING LOGIC FOR DEV ---
      // const lastPickTimeStr = await AsyncStorage.getItem(cacheTimeKey);
      // const lastPickTime = lastPickTimeStr ? parseInt(lastPickTimeStr, 10) : 0;
  
      // // Use cached articles if it's still today's selection
      // if (lastPickTime >= midnight.getTime()) {
      //   const cachedArticlesStr = await AsyncStorage.getItem(cacheKey);
      //   if (cachedArticlesStr) {
      //     const cachedArticles = JSON.parse(cachedArticlesStr);
      //     console.log('[CACHE] Loaded Attacking hero articles from cache:', cachedArticles);
      //     setHeroArticles(cachedArticles);
      //     return;
      //   }
      // }
  
      console.log('[FIRESTORE] Fetching new Attacking hero articles...');
      const q = query(collection(db, 'Articles'), where('category', '==', 'Attacking'));
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
  
        setHeroArticles(selectedArticles);
        await AsyncStorage.setItem(cacheTimeKey, now.toString());
        await AsyncStorage.setItem(cacheKey, JSON.stringify(selectedArticles));
        console.log('[CACHE] Saved new Attacking hero articles to AsyncStorage.');
      } else {
        console.log('[FIRESTORE] No articles found in the "Attacking" category.');
        setHeroArticles([]);
      }
    } catch (error) {
      console.log('Error fetching Attacking hero articles:', error);
      setHeroArticlesError(true);
    } finally {
      setLoadingHeroArticles(false);
    }
  }
  
  useEffect(() => {
    console.log('[EFFECT] Calling fetchHeroArticles_Attacking...');
    fetchHeroArticles_Attacking();
  }, []);
  
  // FlatList ref for hero
  const flatListRef = useRef(null);
  
  const handleHeroArticlePress = (article) => {
    console.log('[NAVIGATE] Pressing hero article:', article);
    router.push({
      pathname: 'screens/ArticleScreen',
      params: { article: JSON.stringify(article) },
    });
  };
  
  // Instead of full screen width, let's use .92 for container & item
  const HERO_WIDTH = width * 0.92;
  
  const renderHeroItem = ({ item, index }) => {
    console.log(`[RENDER] Hero item index ${index}:`, item);
  
    const backgroundImage = heroImages[index] || heroImages[0];
    return (
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => handleHeroArticlePress(item)}
      >
        <ImageBackground
          source={backgroundImage}
          style={[styles.heroItemBackground, { width: HERO_WIDTH }]}
          resizeMode="cover"
        >
          <View style={styles.heroOverlay}>
            <View style={styles.heroTextContainer}>
              <Text style={styles.heroTitle}>{item.title || t('offenseScreen.noTitle')}</Text> {/* MODIFIED: Translated 'No Title' */}
              <Text style={styles.heroTeaser}>{item.teaser || t('offenseScreen.noTeaser')}</Text> {/* MODIFIED: Translated 'No teaser available' */}
              <TouchableOpacity
                style={styles.ctaButton}
                onPress={() => handleHeroArticlePress(item)}
              >
                <Text style={styles.ctaButtonText}>{t('offenseScreen.readNowButton')}</Text> {/* MODIFIED: Translated 'Read Now' */}
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
  };
  
  

  // ========== PRE-MATCH TIPS ==========
  const divisionMapping = {
    'Division 10-8': 'beginner',
    'Division 7-5': 'intermediate',
    'Division 4-2': 'advanced',
    'Elite': 'elite',
  };
  function generatePrematchTips() {
    let tips = [];
    if (selectedGameMode === 'UT' || selectedGameMode === 'Seasons') {
      if (selectedDivision) {
        const subKey = divisionMapping[selectedDivision];
        tips = (matchDayData.preMatch.UT && matchDayData.preMatch.UT[subKey]) || [];
      }
    } else if (selectedGameMode === 'Career') {
      tips = matchDayData.preMatch.careerMode || [];
    } else {
      tips = matchDayData.preMatch.general || [];
    }
    if (tips.length === 0) {
      tips = matchDayData.preMatch.general || [];
    }
    const shuffled = shuffle([...tips]);
    setPrematchDisplayedTips(shuffled.slice(0, 3));
    setShowPrematchTips(true);
  }

  // ========== MID-TIME TIPS ==========
  function generateMidtimeTips() {
    let tipsPerformance = [];
    let tipsConcern = [];

    const halfTimeContent = halfTimeDataFromFile ?? { performanceFeedback: [], mainConcern: {} };

    const performanceMapping = {
      [t('offenseScreen.dominating')]: 'dominating', // MODIFIED: Translated key
      [t('offenseScreen.good')]: 'good', // MODIFIED: Translated key
      [t('offenseScreen.even')]: 'even', // MODIFIED: Translated key
      [t('offenseScreen.struggling')]: 'struggling', // MODIFIED: Translated key
    };

    const concernMapping = {
      [t('offenseScreen.defense')]: 'defense', // MODIFIED: Translated key
      [t('offenseScreen.finishing')]: 'finishing', // MODIFIED: Translated key
      [t('offenseScreen.possession')]: 'possession', // MODIFIED: Translated key
      [t('offenseScreen.staminaFatigue')]: 'stamina', // MODIFIED: Translated key
    };

    if (midtimePerformance) {
      const perfKey = performanceMapping[midtimePerformance];
      const foundPerformance =
        halfTimeContent.performanceFeedback.find(
          (item) => item.level.toLowerCase() === perfKey.toLowerCase()
        ) || { tips: [] };
      tipsPerformance = foundPerformance.tips.map((tip) => tip.text) || [];
    }

    if (midtimeConcern) {
      const concernKey = concernMapping[midtimeConcern];
      tipsConcern = halfTimeContent.mainConcern[concernKey] || [];
    }

    const combined = [...tipsPerformance, ...tipsConcern];
    if (combined.length === 0) {
      const evenFallback = halfTimeContent.performanceFeedback.find(
        (item) => item.level.toLowerCase() === 'even'
      );
      if (evenFallback && evenFallback.tips && evenFallback.tips.length > 0) {
        combined.push(...evenFallback.tips.map((tip) => tip.text));
      } else {
        combined.push(t('offenseScreen.noMidtimeTipsAvailable')); // MODIFIED: Translated 'No mid-time tips available.'
      }
    }

    const shuffled = shuffle([...combined]);
    const finalTips = shuffled.slice(0, 3);
    setMidtimeDisplayedTips(finalTips);
    setShowMidtimeTips(true);
  }

  // ========== POST-GAME SURVEY ==========
  const postGameOptions = {
    1: [
      { label: t('offenseScreen.postGameCrushedIt'), rating: 5 }, // MODIFIED: Translated label
      { label: t('offenseScreen.postGamePrettySolid'), rating: 4 }, // MODIFIED: Translated label
      { label: t('offenseScreen.postGameMeh'), rating: 3 }, // MODIFIED: Translated label
      { label: t('offenseScreen.postGameToughGame'), rating: 2 }, // MODIFIED: Translated label
    ],
    2: [
      { label: t('offenseScreen.postGameGoalMachine'), rating: 5 }, // MODIFIED: Translated label
      { label: t('offenseScreen.postGameSolidEffort'), rating: 4 }, // MODIFIED: Translated label
      { label: t('offenseScreen.postGameHitOrMiss'), rating: 3 }, // MODIFIED: Translated label
      { label: t('offenseScreen.postGameBluntAttack'), rating: 2 }, // MODIFIED: Translated label
    ],
    3: [
      { label: t('offenseScreen.postGameBrickWall'), rating: 5 }, // MODIFIED: Translated label
      { label: t('offenseScreen.postGameReliableDefense'), rating: 4 }, // MODIFIED: Translated label
      { label: t('offenseScreen.postGameLeakyMoments'), rating: 3 }, // MODIFIED: Translated label
      { label: t('offenseScreen.postGameWideOpen'), rating: 2 }, // MODIFIED: Translated label
    ],
    4: [
      { label: t('offenseScreen.postGameMaestroMode'), rating: 5 }, // MODIFIED: Translated label
      { label: t('offenseScreen.postGameFairlySteady'), rating: 4 }, // MODIFIED: Translated label
      { label: t('offenseScreen.postGame5050Battle'), rating: 3 }, // MODIFIED: Translated label
      { label: t('offenseScreen.postGameChaotic'), rating: 2 }, // MODIFIED: Translated label
    ],
    5: [
      { label: t('offenseScreen.postGameZenMaster'), rating: 5 }, // MODIFIED: Translated label
      { label: t('offenseScreen.postGameMostlyComposed'), rating: 4 }, // MODIFIED: Translated label
      { label: t('offenseScreen.postGameOnEdge'), rating: 3 }, // MODIFIED: Translated label
      { label: t('offenseScreen.postGameTilted'), rating: 2 }, // MODIFIED: Translated label
    ],
  };

  function handlePostGameAnswer(rating) {
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
      default:
        break;
    }
    setPostgameAnswers(newAnswers);

    if (postgameStep < 5) {
      setPostgameStep(postgameStep + 1);
    } else {
      finalizePostGameSurvey(newAnswers);
    }
  }

  async function finalizePostGameSurvey(finalAnswers) {
    setPostgameStep(6);
    setShowPostgameSurveyComplete(true);

    let newProgress = postgameProgress + 1;
    if (newProgress > 100) newProgress = 100;
    setPostgameProgress(newProgress);
    await AsyncStorage.setItem('postGameCheckinCount', String(newProgress));

    const newGameId = newProgress;
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

    if (newProgress === 100) {
      console.log(t('offenseScreen.hundredCheckinsMessage')); // MODIFIED: Translated message
    }
  }

  async function storeLocalGameData(newGame) {
    try {
      const existingStr = await AsyncStorage.getItem('localPostGameEntries');
      let existing = existingStr ? JSON.parse(existingStr) : [];
      existing.push({ ...newGame, uploaded: false });
      await AsyncStorage.setItem('localPostGameEntries', JSON.stringify(existing));
    } catch (err) {
      console.log('Error storing local game data:', err);
    }
  }

  async function maybeUploadPostGameData() {
    try {
      const existingStr = await AsyncStorage.getItem('localPostGameEntries');
      if (!existingStr) return;
      let entries = JSON.parse(existingStr);
      let unUploaded = entries.filter((g) => !g.uploaded);
      if (unUploaded.length < 10) return;

      const batch = unUploaded.slice(0, 10);
      const summary = summarizeGames(batch);
      await uploadPostGameSummary(summary);

      const updated = entries.map((item) => {
        if (batch.some((b) => b.gameId === item.gameId)) {
          return { ...item, uploaded: true };
        }
        return item;
      });
      await AsyncStorage.setItem('localPostGameEntries', JSON.stringify(updated));
    } catch (err) {
      console.log('maybeUploadPostGameData error:', err);
    }
  }

  function summarizeGames(games) {
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
    return {
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
  }

  async function uploadPostGameSummary(summary) {
    try {
      const user = auth.currentUser;
      if (!user) {
        console.log(t('offenseScreen.noUserSignedIn')); // MODIFIED: Translated message
        return;
      }
      const docRef = doc(db, 'postGameTracker', user.uid);
      await setDoc(
        docRef,
        {
          lastUpload: new Date().toISOString(),
          summary: summary,
        },
        { merge: true }
      );
      console.log(t('offenseScreen.uploadSuccess')); // MODIFIED: Translated message
    } catch (err) {
      console.log(t('offenseScreen.uploadError'), err); // MODIFIED: Translated message
    }
  }

  // ======= HANDLERS =======
  const handleCategoryChange = (cat) => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 20, duration: 200, useNativeDriver: true }),
    ]).start(() => {
      setSelectedCategory(cat);
      requestAnimationFrame(() => {
        fadeAnim.setValue(0);
        slideAnim.setValue(-20);
        Animated.parallel([
          Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
          Animated.timing(slideAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
        ]).start();
      });
    });
  };

  const handleCtaPressIn = () => {
    Animated.timing(ctaOpacity, { toValue: 0.5, duration: 200, useNativeDriver: true }).start();
  };
  const handleCtaPressOut = () => {
    Animated.timing(ctaOpacity, { toValue: 1, duration: 200, useNativeDriver: true }).start();
  };

  const handleGridPress = (item) => {
    setSelectedItem(item);
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setSelectedItem(null);

    // Reset pre-match
    setSelectedGameMode(null);
    setSelectedDivision(null);
    setShowPrematchTips(false);
    setPrematchDisplayedTips([]);

    // Reset mid-time
    setMidtimeStep(1);
    setMidtimePerformance(null);
    setMidtimeConcern(null);
    setShowMidtimeTips(false);
    setMidtimeDisplayedTips([]);

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
  };

  // Container style
  const containerStyle =
    selectedCategory === 'formations'
      ? styles.formationGridContainer
      : styles.fullWidthGridContainer;

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
    return (
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={onPress}
        accessibilityLabel={t('offenseScreen.selectItemAriaLabel', { itemTitle: item.title })} // MODIFIED: Translated aria label
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
    if (selectedCategory === 'tacticalVideos') return tacticalVideos;
    if (selectedCategory === 'skillMoves') return [];
    return gridData[selectedCategory] || [];
  }

  function getPostGameQuestionTitle(step) {
    switch (step) {
      case 1:
        return t('offenseScreen.postGameQ1'); // MODIFIED: Translated question
      case 2:
        return t('offenseScreen.postGameQ2'); // MODIFIED: Translated question
      case 3:
        return t('offenseScreen.postGameQ3'); // MODIFIED: Translated question
      case 4:
        return t('offenseScreen.postGameQ4'); // MODIFIED: Translated question
      case 5:
        return t('offenseScreen.postGameQ5'); // MODIFIED: Translated question
      default:
        return '';
    }
  }

  // ======= RENDER =======
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
              {loadingHeroArticles ? (
                <ActivityIndicator size="small" color="#00FFFF" />
              ) : heroArticlesError ? (
                <Text style={{ color: 'red' }}>{t('offenseScreen.errorLoadingArticles')}</Text> // MODIFIED: Translated error message
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
                    // Tells the list each item’s size so it can position them properly
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
                onPress={() => router.push('screens/AllAttackingArticles')}
              >
                <Text style={styles.moreTipsButtonText}>{t('offenseScreen.moreArticlesButton')}</Text> // MODIFIED: Translated 'More Articles'
              </TouchableOpacity>
            </View>

            {/* MAIN SECTION */}
            <View style={styles.mainSection}>
              <Text style={styles.sectionHeader}>{t('offenseScreen.exploreAttackArsenalHeader')}</Text> // MODIFIED: Translated header

              {/* WRAP THE CATEGORY TABS SCROLLVIEW IN A VIEW 
                WITH A RIGHT-SIDE LINEAR GRADIENT 
              */}
              <View style={styles.categoryTabsWrapper}>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.categoryTabs}
                >
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
                </ScrollView>

                {/* Subtle gradient to the right side */}
                <LinearGradient
                  colors={['transparent', 'rgba(0,0,0,0.6)']}
                  style={styles.categoryTabsFadeRight}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                />
              </View>

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
                  <View style={styles.skillMovesWrapper}>
                    <SkillMovesTable />
                  </View>
                ) : (
                  <>
                    {selectedCategory === 'tacticalVideos' && loadingTacticalVideos ? (
                      <ActivityIndicator size="large" color="#FFD700" />
                    ) : selectedCategory === 'tacticalVideos' && tacticalVideosError ? (
                      <Text style={styles.errorText}>{t('offenseScreen.errorLoadingVideos')}</Text> // MODIFIED: Translated error message
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
                                ? '/AllSkillMovesScreen'
                                : '/screens/MoreVideos',
                          })
                        }
                      >
                        <Text style={styles.viewAllButtonText}>
                          {selectedCategory === 'formations'
                            ? t('offenseScreen.seeAllFormations')
                            : selectedCategory === 'skillMoves'
                            ? t('offenseScreen.seeAllSkillMoves')
                            : selectedCategory === 'tacticalVideos'
                            ? t('offenseScreen.watchAllAttackingTutorials')
                            : t('offenseScreen.viewAll')}
                        </Text>
                      </TouchableOpacity>
                    )}
                  </>
                )}
              </AnimatedImageBackground>
            </View>
          </ScrollView>

          {/* MODAL */}
          <Modal visible={modalVisible} transparent animationType="fade" onRequestClose={closeModal}>
            <TouchableWithoutFeedback
              onPress={() => {
                if (selectedItem?.type !== 'tacticalVideo') closeModal();
              }}
            >
              <View style={styles.modalBackground}>
                <ScrollView contentContainerStyle={styles.modalScrollContainer}>
                  <TouchableWithoutFeedback>
                    <View style={styles.modalContainer}>
                      <ImageBackground
                        source={getModalBackground(selectedItem?.type)}
                        style={styles.modalImageBg}
                        imageStyle={{ borderRadius: 10, resizeMode: 'cover' }}
                      >
                        {selectedItem?.type === 'tacticalVideo' ? (
                          <View style={styles.modalContent}>
                            <Text style={styles.modalTitle}>{selectedItem.title}</Text>
                            <View style={styles.videoContainer}>
                              {selectedItem.videoUrl ? (
                                <WebView
                                  source={{
                                    uri: transformYoutubeUrl(ensureHttps(selectedItem.videoUrl), {
                                      autoplay: 1,
                                      mute: 1,
                                    }),
                                  }}
                                  style={{ flex: 1 }}
                                  javaScriptEnabled
                                  allowsInlineMediaPlayback
                                  mediaPlaybackRequiresUserAction={false}
                                />
                              ) : (
                                <Text style={{ color: '#fff' }}>{t('offenseScreen.noVideoUrlProvided')}</Text> // MODIFIED: Translated message
                              )}
                            </View>
                          </View>
                        ) : selectedItem?.type === 'formation' ? (
                          <View style={styles.modalContent}>
                            <Text style={styles.modalTitle}>{selectedItem.title}</Text>
                            <Text style={styles.modalText}>{selectedItem.description}</Text>
                            <Text style={styles.modalSubheading}>{t('offenseScreen.modalPros')}</Text> // MODIFIED: Translated subheading
                            <Text style={styles.modalText}>{selectedItem.pros}</Text>
                            <Text style={styles.modalSubheading}>{t('offenseScreen.modalCons')}</Text> // MODIFIED: Translated subheading
                            <Text style={styles.modalText}>{selectedItem.cons}</Text>
                            <Text style={styles.modalSubheading}>{t('offenseScreen.modalBestFor')}</Text> // MODIFIED: Translated subheading
                            <Text style={styles.modalText}>{selectedItem.recommended}</Text>
                          </View>
                        ) : selectedItem?.type === 'matchDayAssistantPrematch' ? (
                          <View style={styles.modalContent}>
                            <Text style={styles.modalTitle}>{t('offenseScreen.prematchHuddleTitle')}</Text> // MODIFIED: Translated title
                            {!showPrematchTips ? (
                              <>
                                {!selectedGameMode ? (
                                  <>
                                    <Text style={styles.highlightedQuestion}>
                                      {t('offenseScreen.prematchGameModeQuestion')}
                                    </Text> // MODIFIED: Translated question
                                    <View style={styles.buttonGroupColumn}>
                                      {[t('offenseScreen.gameModeUT'), t('offenseScreen.gameModeCareer'), t('offenseScreen.gameModeQuickKickOff'), t('offenseScreen.gameModeSeasons'), t('offenseScreen.gameModeRush')].map(
                                        (mode) => (
                                          <TouchableOpacity
                                            key={mode}
                                            onPress={() => {
                                              setSelectedGameMode(mode);
                                              if (mode !== t('offenseScreen.gameModeUT') && mode !== t('offenseScreen.gameModeSeasons')) {
                                                generatePrematchTips();
                                              }
                                            }}
                                            style={styles.optionButton}
                                          >
                                            <Text style={styles.optionButtonText}>{mode}</Text>
                                          </TouchableOpacity>
                                        )
                                      )}
                                    </View>
                                  </>
                                ) : (selectedGameMode === t('offenseScreen.gameModeUT') || selectedGameMode === t('offenseScreen.gameModeSeasons')) &&
                                  !selectedDivision ? (
                                  <>
                                    <Text style={styles.highlightedQuestion}>
                                      {t('offenseScreen.prematchDivisionQuestion')}
                                    </Text> // MODIFIED: Translated question
                                    <View style={styles.buttonGroupColumn}>
                                      {[t('offenseScreen.division10_8'), t('offenseScreen.division7_5'), t('offenseScreen.division4_2'), t('offenseScreen.divisionElite')].map(
                                        (div) => (
                                          <TouchableOpacity
                                            key={div}
                                            onPress={() => {
                                              setSelectedDivision(div);
                                              generatePrematchTips();
                                            }}
                                            style={styles.optionButton}
                                          >
                                            <Text style={styles.optionButtonText}>{div}</Text>
                                          </TouchableOpacity>
                                        )
                                      )}
                                    </View>
                                  </>
                                ) : null}

                                {showPrematchTips && (
                                  <View>
                                    <Text style={styles.modalText}>{t('offenseScreen.hereAreYourTips')}</Text> // MODIFIED: Translated 'Here are your tips:'
                                    {prematchDisplayedTips.map((tip, idx) => (
                                      <View key={idx} style={styles.tipContainer}>
                                        <Text style={styles.tipTitle}>{tip.text}</Text>
                                      </View>
                                    ))}
                                    <TouchableOpacity
                                      onPress={generatePrematchTips}
                                      style={styles.showMoreButton}
                                    >
                                      <Text style={styles.showMoreButtonText}>{t('offenseScreen.show3More')}</Text> // MODIFIED: Translated 'Show 3 More'
                                    </TouchableOpacity>
                                  </View>
                                )}
                              </>
                            ) : (
                              <View>
                                <Text style={styles.modalText}>{t('offenseScreen.hereAreYourTips')}</Text> // MODIFIED: Translated 'Here are your tips:'
                                {prematchDisplayedTips.map((tip, idx) => (
                                  <View key={idx} style={styles.tipContainer}>
                                    <Text style={styles.tipTitle}>{tip.text}</Text>
                                  </View>
                                ))}
                                <TouchableOpacity
                                  onPress={generatePrematchTips}
                                  style={styles.showMoreButton}
                                >
                                  <Text style={styles.showMoreButtonText}>{t('offenseScreen.show3More')}</Text> // MODIFIED: Translated 'Show 3 More'
                                </TouchableOpacity>
                              </View>
                            )}
                          </View>
                        ) : selectedItem?.type === 'matchDayAssistantMidtime' ? (
                          <View style={styles.modalContent}>
                            <Text style={styles.modalTitle}>{t('offenseScreen.midtimeCheckTitle')}</Text> // MODIFIED: Translated title
                            {!showMidtimeTips ? (
                              midtimeStep === 1 ? (
                                <>
                                  <Text style={styles.highlightedQuestion}>
                                    {t('offenseScreen.midtimePerformanceQuestion')}
                                  </Text> // MODIFIED: Translated question
                                  <View style={styles.buttonGroupColumn}>
                                    {[t('offenseScreen.dominating'), t('offenseScreen.good'), t('offenseScreen.even'), t('offenseScreen.struggling')].map((option) => (
                                      <TouchableOpacity
                                        key={option}
                                        onPress={() => {
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
                                  <Text style={styles.highlightedQuestion}>
                                    {t('offenseScreen.midtimeConcernQuestion')}
                                  </Text> // MODIFIED: Translated question
                                  <View style={styles.buttonGroupColumn}>
                                    {[
                                      t('offenseScreen.defense'),
                                      t('offenseScreen.finishing'),
                                      t('offenseScreen.possession'),
                                      t('offenseScreen.staminaFatigue'),
                                    ].map((concern) => (
                                      <TouchableOpacity
                                        key={concern}
                                        onPress={() => {
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
                              <View>
                                <Text style={styles.modalText}>{t('offenseScreen.hereAreYourTips')}</Text> // MODIFIED: Translated 'Here are your tips:'
                                {midtimeDisplayedTips.map((tip, idx) => (
                                  <View key={idx} style={styles.tipContainer}>
                                    <Text style={styles.tipTitle}>{tip}</Text>
                                  </View>
                                ))}
                              </View>
                            )}
                          </View>
                        ) : selectedItem?.type === 'matchDayAssistantPostgame' ? (
                          <View style={styles.modalContent}>
                            <Text style={styles.modalTitle}>{t('offenseScreen.postgameReflectionTitle')}</Text> // MODIFIED: Translated title
                            <View style={styles.progressBarContainer}>
                              <Text style={styles.progressLabel}>
                                {t('offenseScreen.postGameProgress', { progress: postgameProgress, total: 100 })}
                              </Text> // MODIFIED: Translated progress label
                              <View style={styles.progressBarOuter}>
                                <View
                                  style={[
                                    styles.progressBarInner,
                                    { width: `${(postgameProgress / 100) * 100}%` },
                                  ]}
                                />
                              </View>
                              <TouchableOpacity
                                onPress={() =>
                                  Alert.alert(
                                    t('common.info'), // MODIFIED: Translated 'Info'
                                    t('offenseScreen.postGameInfoAlert') // MODIFIED: Translated alert message
                                  )
                                }
                              >
                                <Text style={styles.questionMark}>?</Text>
                              </TouchableOpacity>
                            </View>
                            {postgameStep <= 5 && (
                              <Text style={styles.highlightedQuestion}>
                                {getPostGameQuestionTitle(postgameStep)}
                              </Text>
                            )}
                            {showPostgameSurveyComplete ? (
                              <View>
                                <Text style={styles.modalText}>
                                  {t('offenseScreen.surveyComplete')}
                                </Text> // MODIFIED: Translated message
                                <Text style={styles.modalText}>
                                  {t('offenseScreen.currentCheckins', { progress: postgameProgress, total: 100 })}
                                </Text> // MODIFIED: Translated message
                              </View>
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
                          <View style={styles.modalContent}>
                            <Text style={styles.modalTitle}>{selectedItem?.title}</Text>
                            <Text style={styles.modalText}>{t('offenseScreen.noAdditionalDetails')}</Text> // MODIFIED: Translated message
                          </View>
                        )}

                        <TouchableOpacity onPress={closeModal} style={styles.closeButton}>
                          <Text style={styles.closeButtonText}>{t('common.closeButton')}</Text> // MODIFIED: Translated 'CLOSE'
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
    // Center the hero container and match the width with hero items
    alignSelf: 'center',
    width: width * 0.92,
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
  },
  heroItemBackground: {
    height: '100%',
  },
  heroOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 15,
    justifyContent: 'center',
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
  ctaButton: {
    backgroundColor: 'rgba(0,255,195,0.43)',
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 6,
    marginBottom: 5,
  },
  ctaButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#000',
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
  /* The category tabs plus gradient 
  */
  categoryTabsWrapper: {
    position: 'relative',
    marginBottom: 15,
  },
  categoryTabs: {
    paddingHorizontal: 5,
  },
  categoryTabsFadeRight: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    width: 40,
    // pointerEvents so it won't block taps on the scrollview
    pointerEvents: 'none',
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
});