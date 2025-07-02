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

// If you’re using Expo, we use expo-linear-gradient for the fade effect
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
}

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

export default function AllAttackingArticlesScreen() {
  const navigation = useNavigation();
  const router = useRouter();

  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  // Track which articles are expanded (object mapping article id to boolean)
  const [expanded, setExpanded] = useState({});
  // For back-to-top functionality
  const [showBackToTop, setShowBackToTop] = useState(false);
  const scrollViewRef = useRef(null);

  // Fetch articles from Firestore on mount
  useEffect(() => {
    const fetchArticles = async () => {
      try {
        const db = getFirestore(firebaseApp);
        const articlesRef = collection(db, 'Articles');
        // Query: category == "Attacking", sorted by date descending
        const q = query(
          articlesRef,
          where('category', '==', 'Attacking'),
          orderBy('date', 'desc')
        );
        const querySnapshot = await getDocs(q);
        const articlesData = [];
        querySnapshot.forEach((doc) => {
          articlesData.push({ id: doc.id, ...doc.data() });
        });
        setArticles(articlesData);
      } catch (error) {
        console.error('Error fetching articles:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchArticles();
  }, []);

  // Toggle expansion state for an article using LayoutAnimation
  const toggleExpand = (id) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Handle scroll to show/hide the "Back to Top" button
  const handleScroll = (event) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    setShowBackToTop(offsetY > 100);
  };

  // Scroll to top when back-to-top is pressed
  const scrollToTop = () => {
    scrollViewRef.current?.scrollTo({ y: 0, animated: true });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ImageBackground source={require('../../assets/images/Article bk.png')} style={styles.background}>
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
                  source={require('../../assets/images/button2.png')}
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
