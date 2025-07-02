import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  FlatList,
  TouchableOpacity,
  ImageBackground,
  Image,
  Modal,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ViewToken } from 'react-native'; 
import {
  getFirestore,
  collection,
  query,
  where,
  onSnapshot,
  doc,
  updateDoc,
  increment,
} from 'firebase/firestore';
import app from '../firebaseConfig';

const SCREEN_WIDTH = Dimensions.get('window').width;
const db = getFirestore(app);

const MoreVideos = () => {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [videos, setVideos] = useState([]);
  const [heroVideos, setHeroVideos] = useState([]);
  const [displayedVideos, setDisplayedVideos] = useState([]);
  const [sortMode, setSortMode] = useState('newest');
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedVideoUrl, setSelectedVideoUrl] = useState('');
  const [currentHeroIndex, setCurrentHeroIndex] = useState(0);

  const heroFlatListRef = useRef(null);

  const onHeroViewableItemsChanged = useRef(({ viewableItems }) => {
    if (viewableItems.length > 0) {
      setCurrentHeroIndex(viewableItems[0].index ?? 0);
    }
  }).current;

  // Subscribe to videos collection once and update videos & hero videos
  useEffect(() => {
    const q = query(collection(db, 'videos'), where('active', '==', true));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const fetched = [];
        snapshot.forEach((docSnapshot) => {
          fetched.push({ ...docSnapshot.data(), id: docSnapshot.id });
        });

        // Store the full list of videos
        setVideos(fetched);

        // Calculate hero videos: priority 2 (sponsored) first, then fill with priority 1 (featured)
        const sponsored = fetched.filter((video) => video.priority === 2);
        const featured = fetched.filter((video) => video.priority === 1);
        let hero = [...sponsored];
        if (hero.length < 6) {
          const remaining = 6 - hero.length;
          hero = [...hero, ...featured.slice(0, remaining)];
        }
        setHeroVideos(hero);

        setLoading(false);
      },
      (error) => {
        console.error('🔥 Firestore Error:', error);
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, []);

  // Sort videos whenever videos, heroVideos, or sortMode changes
  useEffect(() => {
    if (videos.length === 0) return;
    let sortedVideos = [];
    if (sortMode === 'newest') {
      sortedVideos = [...videos].sort((a, b) => {
        const aTime =
          a.createdAt && a.createdAt.toDate ? a.createdAt.toDate() : new Date(0);
        const bTime =
          b.createdAt && b.createdAt.toDate ? b.createdAt.toDate() : new Date(0);
        return bTime - aTime;
      });
    } else if (sortMode === 'most') {
      sortedVideos = [...videos].sort(
        (a, b) => (b.views || 0) - (a.views || 0)
      );
    } else if (sortMode === 'recommended') {
      // Exclude hero videos and randomize the rest for recommendation
      const heroIds = new Set(heroVideos.map((video) => video.id));
      const remaining = videos.filter((video) => !heroIds.has(video.id));
      sortedVideos = remaining.sort(() => Math.random() - 0.5);
    }
    setDisplayedVideos(sortedVideos);
  }, [videos, sortMode, heroVideos]);

  // Update sort mode – the sorting effect will handle the list update
  const changeSortMode = (mode) => {
    setSortMode(mode);
  };

  // Open video modal and increment view count
  const openVideo = async (video) => {
    setSelectedVideoUrl(video.video_url);
    setModalVisible(true);
    try {
      const videoRef = doc(db, 'videos', video.id);
      await updateDoc(videoRef, { views: increment(1) });
    } catch (err) {
      console.error('Failed to increment views:', err);
    }
  };

  // Handle dot press to scroll to specific hero video
  const handleDotPress = (index) => {
    if (heroFlatListRef.current) {
      heroFlatListRef.current.scrollToIndex({
        index,
        animated: true,
      });
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#fff" />
        <Text style={styles.loadingText}>{t('moreVideos.loading')}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Simple Custom Header */}
      <ImageBackground
        source={require('../../assets/images/header.png')}
        style={[styles.headerBackground, { height: 60 + insets.top, paddingTop: insets.top }]}
        imageStyle={{ opacity: 0.9 }}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('moreVideos.header_title')}</Text>
          <View style={{ width: 24 }} />
        </View>
      </ImageBackground>

      {/* Main Content with proper top margin */}
      <ImageBackground
        source={require('../../assets/images/bk15.png')}
        style={[styles.bg, { marginTop: 60 + insets.top }]}
      >

      {/* Hero Horizontal Scroll */}
      <ImageBackground
        source={require('../../assets/images/bk18.png')}
        style={styles.heroSection}
        imageStyle={{ borderRadius: 10 }}
      >
        <Text style={styles.heroTitle}>{t('moreVideos.hero_title')}</Text>

        <FlatList
          ref={heroFlatListRef}
          horizontal
          data={heroVideos}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity onPress={() => openVideo(item)} style={styles.heroCard}>
              <Image source={{ uri: item.thumbnail_url }} style={styles.heroImage} />
              <Text style={styles.badgeText}>
                {item.priority === 2 
                  ? t('moreVideos.sponsored_badge') 
                  : item.priority === 1 
                  ? t('moreVideos.featured_badge') 
                  : ''
                }
              </Text>
            </TouchableOpacity>
          )}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.heroListContent}
          onViewableItemsChanged={onHeroViewableItemsChanged}
          viewabilityConfig={{ itemVisiblePercentThreshold: 50 }}
          pagingEnabled={true}
          snapToInterval={SCREEN_WIDTH} // Full screen width per scroll
          decelerationRate="fast"
          snapToAlignment="start"
          getItemLayout={(data, index) => ({
            length: SCREEN_WIDTH,
            offset: SCREEN_WIDTH * index,
            index,
          })}
        />

        {/* Interactive Dots */}
        <View style={styles.dotsContainer}>
          {Array.from({ length: heroVideos.length }).map((_, index) => (
            <TouchableOpacity
              key={index}
              onPress={() => handleDotPress(index)}
              style={[
                styles.dot,
                currentHeroIndex === index && styles.activeDot,
              ]}
            />
          ))}
        </View>
      </ImageBackground>

      {/* Tabs */}
      <View style={styles.tabs}>
        {['newest', 'most', 'recommended'].map((mode) => (
          <Pressable key={mode} onPress={() => changeSortMode(mode)} style={styles.tabBtn}>
            <Text style={[styles.tabText, sortMode === mode && styles.tabActive]}>
              {t(`moreVideos.tab_${mode}`)}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Video Grid */}
      <FlatList
        data={displayedVideos}
        numColumns={2}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity onPress={() => openVideo(item)} style={styles.videoCard}>
            <Image source={{ uri: item.thumbnail_url }} style={styles.videoThumb} />
            <Text style={styles.videoTitle}>{item.title}</Text>
          </TouchableOpacity>
        )}
        contentContainerStyle={{ paddingBottom: 32, paddingHorizontal: 8 }}
      />

      {/* Video Playback Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={{ flex: 1, backgroundColor: '#000' }}>
          <TouchableOpacity
            onPress={() => setModalVisible(false)}
            style={styles.closeBtn}
          >
            <Text style={{ color: '#fff', fontWeight: 'bold' }}>
              {t('moreVideos.close_button')}
            </Text>
          </TouchableOpacity>
          <WebView
            source={{ uri: selectedVideoUrl }}
            style={{ flex: 1 }}
            allowsFullscreenVideo
          />
        </View>
              </Modal>
      </ImageBackground>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  bg: {
    flex: 1,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  loadingText: {
    color: '#fff',
    marginTop: 10,
    fontSize: 16,
  },
  tabs: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 10,
  },
  tabBtn: {
    padding: 10,
  },
  tabText: {
    color: '#aaa',
    fontSize: 16,
  },
  tabActive: {
    color: '#fff',
    fontWeight: 'bold',
  },
  heroCard: {
    marginRight: 10,
    width: SCREEN_WIDTH - 20, // Full screen width minus padding
  },
  heroImage: {
    width: '100%',
    height: 200,
    borderRadius: 10,
  },
  badgeText: {
    position: 'absolute',
    top: 5,
    left: 5,
    backgroundColor: 'rgba(0,0,0,0.5)',
    color: '#fff',
    padding: 4,
    borderRadius: 3,
    overflow: 'hidden',
  },
  videoCard: {
    flex: 1,
    margin: 8,
  },
  videoThumb: {
    width: '100%',
    height: 150,
    borderRadius: 10,
  },
  videoTitle: {
    color: '#fff',
    marginTop: 5,
    textAlign: 'center',
    fontWeight: 'bold',
  },
  closeBtn: {
    padding: 10,
    backgroundColor: '#111',
    alignSelf: 'flex-end',
    margin: 10,
    borderRadius: 5,
  },
  heroSection: {
    marginTop: 10,
    paddingVertical: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 12,
  },
  
  heroTitle: {
    color: '#FFD700',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'left',
  },
  
  heroListContent: {
    paddingHorizontal: 10,
  },

  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#777',
    marginHorizontal: 4,
    opacity: 0.5,
  },
  
  activeDot: {
    backgroundColor: '#FFD700',
    width: 10,
    height: 10,
    opacity: 1,
  },

  // Header Styles
  headerBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    backgroundColor: 'transparent',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 60,
    paddingHorizontal: 16,
  },
  headerTitle: {
    fontSize: 18,
    color: '#ffffffdd',
    fontWeight: '600',
    letterSpacing: 1.5,
    textShadowColor: '#39FF14',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  backButton: {
    padding: 5,
  },
});

export default MoreVideos;