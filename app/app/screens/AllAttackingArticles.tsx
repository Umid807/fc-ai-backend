import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Image,
  ImageBackground,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  LayoutAnimation,
  UIManager,
  Platform,
  Alert,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { ChevronDown, ChevronUp } from 'lucide-react-native';

// If you're using Expo, we use expo-linear-gradient for the fade effect
import { LinearGradient } from 'expo-linear-gradient';

// Firebase imports
import {
  getFirestore,
  collection,
  getDocs,
  query,
  where,
  orderBy,
} from 'firebase/firestore';
import { firebaseApp } from '../firebaseConfig';

const { width, height } = Dimensions.get('window');

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
  console.log("AllAttackingArticlesScreen: LayoutAnimation enabled for Android."); // Log 1
}

/** Helper: force HTTP -> HTTPS */
function ensureHttps(url = '') {
  console.log("AllAttackingArticlesScreen: ensureHttps called for URL: " + url); // Log 2
  if (!url) {
    console.log("AllAttackingArticlesScreen: ensureHttps returned empty string (no URL provided)."); // Log 3
    return '';
  }
  const secureUrl = url.startsWith('http://') ? url.replace('http://', 'https://') : url;
  console.log("AllAttackingArticlesScreen: ensureHttps transforming URL from " + url + " to " + secureUrl); // Log 4
  return secureUrl;
}

/** Extract YouTube video ID */
function extractYoutubeVideoId(url = '') {
  console.log("AllAttackingArticlesScreen: extractYoutubeVideoId called for URL: " + url); // Log 5
  const regex = /(?:youtube\.com\/(?:[^/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
  const match = url.match(regex);
  const videoId = match ? match[1] : null;
  console.log("AllAttackingArticlesScreen: Extracted YouTube video ID: " + videoId + " from URL: " + url); // Log 6
  return videoId;
}

/** Transform YouTube URL for embedding */
function transformYoutubeUrl(originalUrl = '', { autoplay = 0, mute = 0 } = {}) {
  console.log("AllAttackingArticlesScreen: transformYoutubeUrl called with original URL: " + originalUrl + ", autoplay: " + autoplay + ", mute: " + mute); // Log 7
  if (!originalUrl) {
    console.log("AllAttackingArticlesScreen: transformYoutubeUrl returned empty string (no original URL provided)."); // Log 8
    return '';
  }
  const videoId = extractYoutubeVideoId(originalUrl);
  if (!videoId) {
    console.log("AllAttackingArticlesScreen: No YouTube video ID found for URL: " + originalUrl + ". Returning original URL."); // Log 9
    return originalUrl;
  }
  let embedUrl = `https://www.youtube.com/embed/${videoId}`;
  const params = [];
  if (autoplay) params.push(`autoplay=${autoplay}`);
  if (mute) params.push(`mute=${mute}`);
  params.push('playsinline=1');
  if (params.length > 0) {
    embedUrl += `?${params.join('&')}`;
    console.log("AllAttackingArticlesScreen: Appended parameters to embed URL. New URL: " + embedUrl); // Log 10
  }
  console.log("AllAttackingArticlesScreen: Transformed YouTube URL for embedding: " + embedUrl); // Log 11
  return embedUrl;
}

/** Get YouTube thumbnail URL */
function getYoutubeThumbnail(url = '') {
  console.log("AllAttackingArticlesScreen: getYoutubeThumbnail called for URL: " + url); // Log 12
  const videoId = extractYoutubeVideoId(url);
  const thumbnailUrl = videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : 'https://via.placeholder.com/150';
  console.log("AllAttackingArticlesScreen: Generated YouTube thumbnail URL: " + thumbnailUrl); // Log 13
  return thumbnailUrl;
}

export default function AllAttackingArticlesScreen() {
  console.log("AllAttackingArticlesScreen: Component mounted."); // Log 14
  const navigation = useNavigation();
  console.log("AllAttackingArticlesScreen: Navigation hook initialized."); // Log 15
  const router = useRouter();
  console.log("AllAttackingArticlesScreen: Router hook initialized."); // Log 16

  const [articles, setArticles] = useState([]);
  console.log("AllAttackingArticlesScreen: Articles state initialized as empty array."); // Log 17
  const [loading, setLoading] = useState(true);
  console.log("AllAttackingArticlesScreen: Loading state initialized to true."); // Log 18
  // Track which articles are expanded (object mapping article id to boolean)
  const [expanded, setExpanded] = useState({});
  console.log("AllAttackingArticlesScreen: Expanded state initialized as empty object."); // Log 19
  // For back-to-top functionality
  const [showBackToTop, setShowBackToTop] = useState(false);
  console.log("AllAttackingArticlesScreen: ShowBackToTop state initialized to false."); // Log 20
  const scrollViewRef = useRef(null);
  console.log("AllAttackingArticlesScreen: ScrollViewRef initialized."); // Log 21

  // Fetch articles from Firestore on mount
  useEffect(() => {
    console.log("AllAttackingArticlesScreen: useEffect triggered for fetching articles."); // Log 22
    const fetchArticles = async () => {
      console.log("AllAttackingArticlesScreen: fetchArticles function started."); // Log 23
      try {
        setLoading(true); // Set loading to true at the start of fetch
        console.log("AllAttackingArticlesScreen: Loading state set to true before API call."); // Log 24
        const db = getFirestore(firebaseApp);
        const articlesRef = collection(db, 'Articles');
        // Query: category == "Attacking", sorted by date descending
        const q = query(
          articlesRef,
          where('category', '==', 'Attacking'),
          orderBy('date', 'desc'),
        );
        console.log("AllAttackingArticlesScreen: Firestore query constructed for 'Attacking' articles, ordered by date descending."); // Log 25
        const querySnapshot = await getDocs(q);
        console.log("AllAttackingArticlesScreen: Firestore getDocs call initiated."); // Log 26
        const articlesData = [];
        querySnapshot.forEach((doc) => {
          articlesData.push({ id: doc.id, ...doc.data() });
          console.log("AllAttackingArticlesScreen: Article data pushed: " + doc.id); // Log 27
        });
        setArticles(articlesData);
        console.log("AllAttackingArticlesScreen: Articles state updated. Number of articles fetched: " + articlesData.length); // Log 28
      } catch (error) {
        console.error('AllAttackingArticlesScreen: Error fetching articles:', error); // Log 29
        Alert.alert('Error', 'Failed to load articles. Please try again later.'); // Log 30
      } finally {
        setLoading(false);
        console.log("AllAttackingArticlesScreen: Loading state set to false (fetch complete)."); // Log 31
      }
    };
    fetchArticles();
    console.log("AllAttackingArticlesScreen: fetchArticles function invoked."); // Log 32
  }, []);

  // Toggle expansion state for an article using LayoutAnimation
  const toggleExpand = (id) => {
    console.log("AllAttackingArticlesScreen: toggleExpand called for article ID: " + id); // Log 33
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
    console.log("AllAttackingArticlesScreen: Expanded state updated for article ID: " + id + ". New state: " + !expanded[id]); // Log 34
  };

  // Handle scroll to show/hide the "Back to Top" button
  const handleScroll = (event) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    console.log("AllAttackingArticlesScreen: Scroll event detected. Offset Y: " + offsetY); // Log 35
    setShowBackToTop(offsetY > 100);
    console.log("AllAttackingArticlesScreen: ShowBackToTop state updated to: " + (offsetY > 100)); // Log 36
  };

  // Scroll to top when back-to-top is pressed
  const scrollToTop = () => {
    console.log("AllAttackingArticlesScreen: ScrollToTop function called."); // Log 37
    scrollViewRef.current?.scrollTo({ y: 0, animated: true });
    console.log("AllAttackingArticlesScreen: ScrollView scrolled to top."); // Log 38
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ImageBackground source={require('../assets/images/Article bks.png')} style={styles.background}>
        <ScrollView
          ref={scrollViewRef}
          contentContainerStyle={styles.container}
          onScroll={handleScroll}
          scrollEventThrottle={16}
        >
          {loading ? (
            <ActivityIndicator size="large" color="#00FFFF" />
          ) : (
            articles.map((article) => (
              <TouchableOpacity
                key={article.id}
                activeOpacity={0.9}
                onPress={() => toggleExpand(article.id)}
              >
                <ImageBackground
                  source={require('../assets/images/button2.png')}
                  style={styles.card}
                  imageStyle={styles.cardImage}
                >
                  <View style={styles.cardContent}>
                    <Image
                      source={{ uri: ensureHttps(article.image_url) }}
                      style={styles.thumbnail}
                      resizeMode="cover"
                    />
                    <View style={styles.textRow}>
                      <Text style={styles.title}>{article.title}</Text>
                      <View style={styles.icon}>
                        {expanded[article.id] ? (
                          <ChevronUp size={20} color="#fff" />
                        ) : (
                          <ChevronDown size={20} color="#fff" />
                        )}
                      </View>
                    </View>
                    {expanded[article.id] && (
                      <View style={styles.descriptionContainer}>
                        <Text style={styles.description}>{article.description}</Text>
                      </View>
                    )}
                  </View>
                </ImageBackground>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
        {showBackToTop && (
          <TouchableOpacity style={styles.backToTopButton} onPress={scrollToTop}>
            <Text style={styles.backToTopText}>Back to Top</Text>
          </TouchableOpacity>
        )}
      </ImageBackground>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  background: {
    flex: 1,
    resizeMode: 'cover',
  },
  container: {
    padding: 16,
    paddingBottom: 80, // extra space for back-to-top
  },
  card: {
    borderRadius: 15,
    overflow: 'hidden',
    marginBottom: 16,
  },
  cardImage: {
    borderRadius: 15,
  },
  cardContent: {
    padding: 16,
  },
  thumbnail: {
    width: '100%',
    height: 200,
    borderRadius: 10,
    marginBottom: 8,
  },
  textRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    flex: 1,
    marginRight: 8,
  },
  icon: {
    padding: 4,
  },
  descriptionContainer: {
    marginTop: 8,
  },
  description: {
    fontSize: 16,
    color: '#fff',
  },
  backToTopButton: {
    position: 'absolute',
    bottom: 30,
    right: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
  },
  backToTopText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});