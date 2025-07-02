import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  FlatList,
  TextInput,
  Image,
  Modal,
  Alert,
  Dimensions,
  ImageBackground,
  Platform,
  RefreshControl,
  TouchableWithoutFeedback,
  ActivityIndicator,
  StatusBar,
  SafeAreaView,
} from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

// i18n for UI localization
import { useTranslation as useI18nTranslation } from 'react-i18next';
import i18n from '../i18n/i18n';

// DeepL for content translation
import { useTranslation } from '../../hooks/useTranslation';
import { LanguageSelector } from '../../components/LanguageSelector';
import { DEEPL_API_KEY } from '../../config/constants';

// Firebase imports
import {
  getFirestore,
  collection,
  getDocs,
  getDoc,
  doc,
  updateDoc,
  arrayRemove,
  arrayUnion,
  query,
  orderBy,
  limit,
  startAfter,
  where,
} from 'firebase/firestore';
import { getAuth, onAuthStateChanged } from 'firebase/auth';

// Component imports
import PostCard from '../../components/PostCard';
import MyCircleScreen from '../forum/MyCircleScreen';
import { firebaseApp } from '../firebaseConfig';

// Initialize Firebase
const db = getFirestore(firebaseApp);
const auth = getAuth(firebaseApp);
const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// Types
interface ForumPost {
  id: string;
  title: string;
  content: string;
  userId: string;
  username?: string;
  userAvatar?: string;
  createdAt: Date;
  updatedAt?: Date;
  likes: number;
  comments: number;
  category?: string;
  tags?: string[];
  image?: string;
  images?: string[];
  hotness?: number;
  isPinned?: boolean;
  isLocked?: boolean;
  vipOnly?: boolean;
}

interface UserData {
  uid: string;
  username: string;
  email?: string;
  profileImage?: string;
  avatar?: string;
  rank?: string;
  reputation?: number;
  vip?: boolean;
  following?: string[];
  followedBy?: string[];
  joinedAt?: Date;
  lastActive?: Date;
}

interface TranslatedPost {
  title: string;
  content: string;
}

// Helper function to convert Firestore timestamp object to a readable date string
function formatTimestamp(timestamp: any, t: any) {
  if (timestamp && typeof timestamp === 'object' && 'seconds' in timestamp) {
    const dateObj = new Date(timestamp.seconds * 1000);
    return dateObj.toLocaleDateString();
  }
  return t('articleScreen.noDate');
}

// ─── QuickInfoBox Component ──────────────────────────────────────────────────
const QuickInfoBox = ({ 
  visible, 
  onClose, 
  userData, 
  currentUser, 
  onMoreInfo 
}: {
  visible: boolean;
  onClose: () => void;
  userData: UserData | null;
  currentUser: UserData | null;
  onMoreInfo: () => void;
}) => {
  const { t } = useI18nTranslation(); // UI localization
  const [following, setFollowing] = useState(false);
  const [loading, setLoading] = useState(false);
  const authUser = auth.currentUser;

  const createNotification = async (targetUserId: string, notifData: any) => {
    try {
      console.log('Creating notification for', targetUserId, '->', notifData);
    } catch (error) {
      console.error('Failed to create notification:', error);
    }
  };

  useEffect(() => {
    if (!authUser || !userData?.uid) return;
    
    const checkFollowStatus = async () => {
      try {
        const userSnap = await getDoc(doc(db, 'users', authUser.uid));
        if (userSnap.exists()) {
          const data = userSnap.data();
          setFollowing((data.following || []).includes(userData.uid));
        }
      } catch (error) {
        console.error('Failed to check follow status:', error);
      }
    };

    checkFollowStatus();
  }, [authUser, userData?.uid]);

  const handleFollowUnfollow = async () => {
    if (!authUser || !userData?.uid || loading) return;
    
    setLoading(true);
    try {
      const userRef = doc(db, 'users', authUser.uid);
      const otherRef = doc(db, 'users', userData.uid);

      if (following) {
        await Promise.all([
          updateDoc(userRef, { following: arrayRemove(userData.uid) }),
          updateDoc(otherRef, { followedBy: arrayRemove(authUser.uid) })
        ]);
        setFollowing(false);
      } else {
        await Promise.all([
          updateDoc(userRef, { following: arrayUnion(userData.uid) }),
          updateDoc(otherRef, { followedBy: arrayUnion(authUser.uid) })
        ]);
        
        if (authUser.uid !== userData.uid) {
          const name = authUser.displayName || authUser.email || t('quickInfoBox.someone');
          await createNotification(userData.uid, {
            type: 'follow',
            message: t('quickInfoBox.followNotification', { name }),
            timestamp: new Date(),
          });
        }
        setFollowing(true);
      }
    } catch (error) {
      console.error('Follow/unfollow failed:', error);
      Alert.alert(t('common.error'), t('quickInfoBox.followError'));
    } finally {
      setLoading(false);
    }
  };

  if (!userData) return null;

  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={quickStyles.overlay}>
          <TouchableWithoutFeedback>
            <LinearGradient colors={['#4c669f', '#3b5998', '#192f6a']} style={quickStyles.box}>
              <Image
                source={{ 
                  uri: userData.profileImage || userData.avatar || 'https://via.placeholder.com/80' 
                }}
                style={quickStyles.avatar}
              />
              <Text style={quickStyles.username} numberOfLines={1}>
                {userData.username || t('quickInfoBox.anonymous')}
              </Text>
              <Text style={quickStyles.stats}>
                {userData.rank || t('quickInfoBox.member')} {userData.vip && '• VIP'}
              </Text>
              <Text style={quickStyles.reputation}>
                {t('quickInfoBox.reputation')}: {userData.reputation || 0}
              </Text>
              
              {authUser?.uid !== userData.uid && (
                <TouchableOpacity
                  style={[quickStyles.followButton, following && quickStyles.unfollowButton]}
                  onPress={handleFollowUnfollow}
                  disabled={loading}
                >
                  <Text style={quickStyles.followButtonText}>
                    {loading ? t('common.loading') : (following ? t('quickInfoBox.unfollow') : t('quickInfoBox.follow'))}
                  </Text>
                </TouchableOpacity>
              )}
              
              <TouchableOpacity style={quickStyles.moreInfoButton} onPress={onMoreInfo}>
                <Text style={quickStyles.moreInfoButtonText}>{t('quickInfoBox.moreInfo')}</Text>
              </TouchableOpacity>
            </LinearGradient>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

// ─── Main ForumLayout Component ──────────────────────────────────────────────
export default function ForumLayout() {
  const { t } = useI18nTranslation(); // UI localization
  const router = useRouter();

  // DeepL Translation state
  const {
    translate,
    isTranslating,
    currentLanguage,
    setCurrentLanguage,
    supportedLanguages,
  } = useTranslation(DEEPL_API_KEY);

  const [showLanguageSelector, setShowLanguageSelector] = useState(false);
  const [translatedPosts, setTranslatedPosts] = useState<Record<string, TranslatedPost>>({});

  // Auth & User state
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<UserData | null>(null);
  const [followedUsers, setFollowedUsers] = useState<UserData[]>([]);

  // Posts & Pagination state
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [lastVisible, setLastVisible] = useState<any>(null);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  // UI state
  const [activeTab, setActiveTab] = useState('hot');
  const [searchVisible, setSearchVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showQuickInfo, setShowQuickInfo] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);

  // Private Reply state
  const [showPrivateReply, setShowPrivateReply] = useState(false);
  const [privateReplyPostId, setPrivateReplyPostId] = useState<string | null>(null);
  const PRIVATE_REPLY_THRESHOLD = 8;

  // Tab configuration with i18n
  const tabs = [
    { key: 'hot', label: t('forumScreen.tabs.hot'), icon: 'flame' },
    { key: 'newest', label: t('forumScreen.tabs.newest'), icon: 'time' },
    { key: 'categories', label: t('forumScreen.tabs.categories'), icon: 'folder' },
    { key: 'circle', label: t('forumScreen.tabs.myCircle'), icon: 'people' },
  ];

  // ─── Auth Listener ───────────────────────────────────────────────────────────
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setCurrentUserId(user.uid);
      } else {
        setCurrentUserId(null);
        setCurrentUser(null);
        setFollowedUsers([]);
      }
    });

    return unsubscribe;
  }, []);

  // ─── Fetch Current User & Followed Users ────────────────────────────────────
  useEffect(() => {
    if (!currentUserId) return;

    const fetchUserData = async () => {
      try {
        const userSnap = await getDoc(doc(db, 'users', currentUserId));
        if (userSnap.exists()) {
          const userData = userSnap.data() as UserData;
          setCurrentUser({ uid: userSnap.id, ...userData });

          // Fetch followed users
          if (Array.isArray(userData.following) && userData.following.length > 0) {
            const followedDocs = await Promise.all(
              userData.following.map(uid => getDoc(doc(db, 'users', uid)))
            );
            
            const followedUsersData = followedDocs
              .filter(snap => snap.exists())
              .map(snap => ({ uid: snap.id, ...snap.data() } as UserData));
            
            setFollowedUsers(followedUsersData);
          }
        }
      } catch (error) {
        console.error('Failed to fetch user data:', error);
      }
    };

    fetchUserData();
  }, [currentUserId]);

  // ─── Post Fetching Logic ─────────────────────────────────────────────────────
  const POSTS_PER_PAGE = 25;

  const fetchInitialPosts = useCallback(async (force = false) => {
    if (!force && posts.length > 0) return;

    setInitialLoading(true);
    try {
      const orderField = activeTab === 'hot' ? 'hotness' : 'createdAt';
      const q = query(
        collection(db, 'posts'),
        orderBy(orderField, 'desc'),
        limit(POSTS_PER_PAGE)
      );

      const snapshot = await getDocs(q);
      
      if (!snapshot.empty) {
        const fetchedPosts = snapshot.docs.map(docSnap => {
          const data = docSnap.data();
          return {
            id: docSnap.id,
            ...data,
            image: Array.isArray(data.images) && data.images.length > 0 
              ? data.images[0] 
              : data.image || null,
            createdAt: data.createdAt?.seconds 
              ? new Date(data.createdAt.seconds * 1000)
              : data.createdAt?.toDate?.() || new Date(),
          } as ForumPost;
        });

        setPosts(fetchedPosts);
        setLastVisible(snapshot.docs[snapshot.docs.length - 1]);
        setHasMore(snapshot.docs.length === POSTS_PER_PAGE);
      } else {
        setPosts([]);
        setHasMore(false);
      }
    } catch (error) {
      console.error('Failed to fetch posts:', error);
      Alert.alert(t('common.error'), t('forumScreen.errors.fetchPosts'));
    } finally {
      setInitialLoading(false);
    }
  }, [activeTab, posts.length, t]);

  useEffect(() => {
    fetchInitialPosts(false);
  }, [fetchInitialPosts]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      setPosts([]);
      setLastVisible(null);
      setHasMore(true);
      setTranslatedPosts({}); // Clear translations on refresh
      await fetchInitialPosts(true);
    } catch (error) {
      console.error('Refresh failed:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const fetchMorePosts = async () => {
    if (!hasMore || loadingMore || !lastVisible) return;

    setLoadingMore(true);
    try {
      const orderField = activeTab === 'hot' ? 'hotness' : 'createdAt';
      const q = query(
        collection(db, 'posts'),
        orderBy(orderField, 'desc'),
        startAfter(lastVisible),
        limit(POSTS_PER_PAGE)
      );

      const snapshot = await getDocs(q);
      
      if (!snapshot.empty) {
        const morePosts = snapshot.docs.map(docSnap => {
          const data = docSnap.data();
          return {
            id: docSnap.id,
            ...data,
            image: Array.isArray(data.images) && data.images.length > 0 
              ? data.images[0] 
              : data.image || null,
            createdAt: data.createdAt?.seconds 
              ? new Date(data.createdAt.seconds * 1000)
              : data.createdAt?.toDate?.() || new Date(),
          } as ForumPost;
        });

        setPosts(prevPosts => [...prevPosts, ...morePosts]);
        setLastVisible(snapshot.docs[snapshot.docs.length - 1]);
        setHasMore(snapshot.docs.length === POSTS_PER_PAGE);
      } else {
        setHasMore(false);
      }
    } catch (error) {
      console.error('Failed to fetch more posts:', error);
    } finally {
      setLoadingMore(false);
    }
  };

  // ─── Filter & Sort Posts ─────────────────────────────────────────────────────
  const filteredPosts = useMemo(() => {
    let filtered = [...posts];

    // Apply tab filters
    if (activeTab === 'newest') {
      filtered.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    } else if (activeTab === 'circle' && currentUserId) {
      const followedUserIds = followedUsers.map(user => user.uid);
      filtered = filtered.filter(post => 
        post.userId === currentUserId || followedUserIds.includes(post.userId)
      );
      filtered.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    } else if (activeTab === 'hot') {
      filtered.sort((a, b) => (b.hotness || 0) - (a.hotness || 0));
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(post =>
        post.title?.toLowerCase().includes(query) ||
        post.content?.toLowerCase().includes(query) ||
        post.username?.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [posts, activeTab, currentUserId, followedUsers, searchQuery]);

  // ─── Translation Logic with Instant Refresh ─────────────────────────────────
  const handleLanguageChange = async (language: string) => {
    setCurrentLanguage(language);
    setShowLanguageSelector(false);

    if (language === 'EN') {
      setTranslatedPosts({});
      return;
    }

    // 🚀 Force refresh posts immediately after language change
    setInitialLoading(true);
    await fetchInitialPosts(true);
    
    // Then translate the newly fetched posts
    try {
      const postsToTranslate = filteredPosts.slice(0, 10);
      const translations: Record<string, TranslatedPost> = {};
      
      for (const post of postsToTranslate) {
        const [translatedTitle, translatedContent] = await Promise.all([
          translate(post.title, language),
          translate(post.content, language),
        ]);

        translations[post.id] = {
          title: translatedTitle,
          content: translatedContent,
        };
      }

      setTranslatedPosts(translations);
    } catch (error) {
      console.error('Translation failed:', error);
      Alert.alert(t('common.error'), t('forumScreen.errors.translation'));
    } finally {
      setInitialLoading(false);
    }
  };

  // ─── Private Reply Logic ─────────────────────────────────────────────────────
  const openPrivateReply = (postId: string) => {
    if (!currentUser) {
      return Alert.alert(t('forumScreen.privateReply.loginRequiredTitle'), t('forumScreen.privateReply.loginRequiredMessage'));
    }
    
    if ((currentUser.reputation || 0) < PRIVATE_REPLY_THRESHOLD) {
      return Alert.alert(
        t('forumScreen.privateReply.restrictedTitle'),
        t('forumScreen.privateReply.restrictedMessage')
      );
    }
    
    setPrivateReplyPostId(postId);
    setShowPrivateReply(true);
  };

  // ─── Background Selection ────────────────────────────────────────────────────
  const backgroundImages = {
    hot: require('../../assets/images/forumbg.png'),
    newest: require('../../assets/images/newest.png'),
    circle: require('../../assets/images/Article bk.png'),
    categories: require('../../assets/images/Article bk.png'),
  };

  // ─── Render Methods ──────────────────────────────────────────────────────────
  const renderContent = () => {
    if (activeTab === 'categories') {
      return <CategoryTab />;
    }
    
    if (activeTab === 'circle') {
      return (
        <MyCircleScreen
          followedUsers={followedUsers}
          currentUser={currentUser}
          router={router}
        />
      );
    }

    return (
      <PostList
        posts={filteredPosts}
        translatedPosts={translatedPosts}
        currentLanguage={currentLanguage}
        router={router}
        currentUser={currentUser}
        onPrivateReply={openPrivateReply}
        onUserPress={(user) => {
          setSelectedUser(user);
          setShowQuickInfo(true);
        }}
        fetchMorePosts={fetchMorePosts}
        loadingMore={loadingMore}
        onRefresh={handleRefresh}
        refreshing={refreshing}
        initialLoading={initialLoading}
        activeTab={activeTab}
      />
    );
  };

  // ─── Main Render ─────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      
      <ImageBackground 
        source={backgroundImages[activeTab as keyof typeof backgroundImages]} 
        style={styles.backgroundImage}
        resizeMode="cover"
      >
        <LinearGradient 
          colors={['rgba(0,0,0,0.3)', 'rgba(0,0,0,0.7)']} 
          style={styles.gradient}
        >
          <View style={styles.container}>
            {/* Header with Navigation and Language Toggle */}
            <View style={styles.headerContainer}>
              <TopNavigation
                tabs={tabs}
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                router={router}
              />
              
              <TouchableOpacity 
                style={styles.languageToggle}
                onPress={() => setShowLanguageSelector(!showLanguageSelector)}
              >
                <Text style={styles.languageToggleText}>🌍 {currentLanguage}</Text>
              </TouchableOpacity>
            </View>

            {/* Language Selector */}
            {showLanguageSelector && (
              <View style={styles.languageSelectorContainer}>
                <LanguageSelector
                  currentLanguage={currentLanguage}
                  supportedLanguages={supportedLanguages}
                  onLanguageChange={handleLanguageChange}
                  style={styles.languageSelectorStyle}
                />
              </View>
            )}

            {/* Translation Loading Indicator */}
            {isTranslating && (
              <View style={styles.translationLoadingContainer}>
                <ActivityIndicator size="small" color="#FFD700" />
                <Text style={styles.translationLoadingText}>{t('forumScreen.translating')}</Text>
              </View>
            )}

            {/* Search Bar */}
            {searchVisible && (
              <SearchBar
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                onClose={() => setSearchVisible(false)}
              />
            )}

            {/* Main Content */}
            <View style={styles.contentContainer}>
              {renderContent()}
            </View>

            {/* Floating Create Post Button */}
            <FloatingPostButton router={router} />

            {/* Quick Info Modal */}
            <QuickInfoBox
              visible={showQuickInfo}
              onClose={() => setShowQuickInfo(false)}
              userData={selectedUser}
              currentUser={currentUser}
              onMoreInfo={() => {
                setShowQuickInfo(false);
                if (selectedUser) {
                  router.push(`/profile/${selectedUser.uid}`);
                }
              }}
            />

            {/* Private Reply Modal */}
            <PrivateReplyModal
              visible={showPrivateReply}
              postId={privateReplyPostId}
              onClose={() => setShowPrivateReply(false)}
            />
          </View>
        </LinearGradient>
      </ImageBackground>
    </SafeAreaView>
  );
}

// ─── Sub-Components ──────────────────────────────────────────────────────────

const TopNavigation = ({ tabs, activeTab, setActiveTab, router }) => {
  const { t } = useI18nTranslation();
  
  return (
    <ImageBackground
      source={require('../../assets/images/tabbk.png')}
      style={styles.topNavContainer}
      imageStyle={{ borderRadius: 12 }}
    >
      <View style={styles.tabsContainer}>
        {tabs.map(tab => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tabItem, activeTab === tab.key && styles.activeTabItem]}
            onPress={() => setActiveTab(tab.key)}
            activeOpacity={0.8}
          >
            <Ionicons
              name={tab.icon as any}
              size={16}
              color={activeTab === tab.key ? '#FFD700' : '#888'}
            />
            <Text style={[
              styles.tabText, 
              activeTab === tab.key && styles.activeTabText
            ]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity
          onPress={() => router.push('/forum/ForumSearch')}
          style={styles.searchIconButton}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="search" size={20} color="#FFD700" />
        </TouchableOpacity>
      </View>
    </ImageBackground>
  );
};

const SearchBar = ({ searchQuery, setSearchQuery, onClose }) => {
  const { t } = useI18nTranslation();
  
  return (
    <View style={styles.searchBarContainer}>
      <Ionicons name="search" size={18} color="#888" style={styles.searchIcon} />
      <TextInput
        placeholder={t('forumScreen.search.placeholder')}
        placeholderTextColor="#888"
        value={searchQuery}
        onChangeText={setSearchQuery}
        style={styles.searchInput}
        autoCorrect={false}
        autoCapitalize="none"
        autoFocus
        returnKeyType="search"
      />
      {searchQuery.length > 0 && (
        <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearButton}>
          <Ionicons name="close-circle" size={18} color="#888" />
        </TouchableOpacity>
      )}
      <TouchableOpacity onPress={onClose} style={styles.closeButton}>
        <Ionicons name="close" size={18} color="#888" />
      </TouchableOpacity>
    </View>
  );
};

const PostList = ({ 
  posts, 
  translatedPosts, 
  currentLanguage, 
  router, 
  currentUser, 
  onPrivateReply, 
  onUserPress,
  fetchMorePosts, 
  loadingMore, 
  onRefresh, 
  refreshing, 
  initialLoading, 
  activeTab 
}) => {
  const { t } = useI18nTranslation();

  if (initialLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FFD700" />
        <Text style={styles.loadingText}>{t('forumScreen.postList.loading')}</Text>
      </View>
    );
  }

  if (!posts.length) {
    const message = activeTab === 'circle' 
      ? t('forumScreen.postList.noPostsInCircle')
      : t('forumScreen.postList.noPostsFound');
    
    return (
      <View style={styles.noPostsContainer}>
        <Ionicons name="chatbubbles-outline" size={64} color="#666" />
        <Text style={styles.noPostsText}>{message}</Text>
      </View>
    );
  }

  const renderPost = ({ item: post }) => {
    const translatedPost = translatedPosts[post.id];
    const displayPost = currentLanguage === 'EN' || !translatedPost 
      ? post 
      : { ...post, title: translatedPost.title, content: translatedPost.content };

    return (
      <PostCard
        post={displayPost}
        router={router}
        currentUser={currentUser}
        onPrivateReply={onPrivateReply}
        onUserPress={onUserPress}
        hotTopic={activeTab === 'hot'}
        isTranslated={currentLanguage !== 'EN' && !!translatedPost}
      />
    );
  };

  return (
    <FlatList
      data={posts}
      keyExtractor={(item) => item.id}
      renderItem={renderPost}
      onEndReached={fetchMorePosts}
      onEndReachedThreshold={0.7}
      ListFooterComponent={
        loadingMore ? (
          <View style={styles.loadMoreContainer}>
            <ActivityIndicator size="small" color="#FFD700" />
            <Text style={styles.loadMoreText}>{t('forumScreen.postList.loadingMore')}</Text>
          </View>
        ) : null
      }
      refreshControl={
        Platform.OS !== 'web' ? (
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        ) : null
      }
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.listContainer}
      initialNumToRender={10}
      windowSize={10}
      removeClippedSubviews={true}
      maxToRenderPerBatch={5}
    />
  );
};

const CategoryTab = () => {
  const { t } = useI18nTranslation();
  const router = useRouter();
  
  const categories = [
    { 
      id: 'general', 
      title: t('forumScreen.categories.generalDiscussion'), 
      image: require('../../assets/images/gd.png'),
      description: t('forumScreen.categories.generalDiscussionDesc')
    },
  ];

  const renderCategory = ({ item }) => (
    <TouchableOpacity
      style={styles.categoryButton}
      onPress={() => router.push(`/forum/${item.id}`)}
      activeOpacity={0.8}
    >
      <Image 
        source={item.image} 
        style={styles.categoryImage} 
        resizeMode="cover" 
      />
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.8)']}
        style={styles.categoryOverlay}
      >
        <Text style={styles.categoryTitle}>{item.title}</Text>
        <Text style={styles.categoryDescription}>{item.description}</Text>
      </LinearGradient>
    </TouchableOpacity>
  );

  return (
    <FlatList
      data={categories}
      keyExtractor={(item) => item.id}
      numColumns={2}
      columnWrapperStyle={styles.categoryRow}
      renderItem={renderCategory}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.categoryContainer}
    />
  );
};

const FloatingPostButton = ({ router }) => {
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { 
          toValue: 1.05, 
          duration: 1000, 
          useNativeDriver: true 
        }),
        Animated.timing(pulse, { 
          toValue: 1, 
          duration: 1000, 
          useNativeDriver: true 
        }),
      ])
    );
    animation.start();
    
    return () => animation.stop();
  }, [pulse]);

  return (
    <Animated.View style={[styles.floatingButton, { transform: [{ scale: pulse }] }]}>
      <TouchableOpacity 
        onPress={() => router.push('/forum/CreatePost')} 
        activeOpacity={0.8}
        style={styles.floatingButtonContent}
      >
        <Ionicons name="add" size={24} color="#121212" />
      </TouchableOpacity>
    </Animated.View>
  );
};

const PrivateReplyModal = ({ visible, postId, onClose }) => {
  const { t } = useI18nTranslation();
  const [replyText, setReplyText] = useState('');
  const [cooldown, setCooldown] = useState(false);
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (cooldown || sending || !replyText.trim()) return;
    
    if (replyText.trim().length < 10) {
      Alert.alert(t('privateReplyModal.tooShortTitle'), t('privateReplyModal.tooShortMessage'));
      return;
    }

    setSending(true);
    try {
      const stored = await AsyncStorage.getItem('privateReplies');
      const replies = stored ? JSON.parse(stored) : [];
      
      const newReply = {
        id: Date.now().toString(),
        postId,
        text: replyText.trim(),
        timestamp: new Date().toISOString(),
        sent: true,
      };
      
      replies.push(newReply);
      await AsyncStorage.setItem('privateReplies', JSON.stringify(replies));
      
      Alert.alert(t('privateReplyModal.sentTitle'), t('privateReplyModal.sentMessage'));
      setReplyText('');
      onClose();
      
      // Set cooldown
      setCooldown(true);
      setTimeout(() => setCooldown(false), 30000); // 30 seconds cooldown
    } catch (error) {
      console.error('Failed to send private reply:', error);
      Alert.alert(t('common.error'), t('privateReplyModal.sendError'));
    } finally {
      setSending(false);
    }
  };

  const handleClose = () => {
    if (sending) return;
    setReplyText('');
    onClose();
  };

  if (!visible) return null;

  return (
    <Modal visible transparent animationType="slide" onRequestClose={handleClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{t('privateReplyModal.title')}</Text>
            <TouchableOpacity onPress={handleClose} disabled={sending}>
              <Ionicons name="close" size={24} color="#FFD700" />
            </TouchableOpacity>
          </View>
          
          <Text style={styles.modalDescription}>
            {t('privateReplyModal.description')}
          </Text>
          
          <TextInput
            style={styles.modalInput}
            placeholder={t('privateReplyModal.placeholder')}
            placeholderTextColor="#888"
            value={replyText}
            onChangeText={setReplyText}
            multiline
            numberOfLines={4}
            maxLength={500}
            textAlignVertical="top"
            editable={!sending}
          />
          
          <Text style={styles.characterCount}>
            {replyText.length}/500 {t('privateReplyModal.characters')}
          </Text>
          
          <View style={styles.modalButtons}>
            <TouchableOpacity 
              onPress={handleClose} 
              style={[styles.modalButton, styles.cancelButton]}
              disabled={sending}
            >
              <Text style={styles.cancelButtonText}>{t('common.cancelButton')}</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              onPress={handleSend} 
              style={[
                styles.modalButton, 
                styles.sendButton,
                (sending || cooldown || !replyText.trim()) && styles.disabledButton
              ]}
              disabled={sending || cooldown || !replyText.trim()}
            >
              <Text style={styles.sendButtonText}>
                {sending ? t('common.sending') : cooldown ? t('privateReplyModal.cooldown') : t('common.sendButton')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

// ─── Styles ──────────────────────────────────────────────────────────────────

const quickStyles = StyleSheet.create({
  overlay: { 
    flex: 1, 
    backgroundColor: 'rgba(0,0,0,0.5)', 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  box: { 
    width: 250, 
    padding: 20, 
    borderRadius: 12, 
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.3)',
  },
  avatar: { 
    width: 70, 
    height: 70, 
    borderRadius: 35, 
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#FFD700',
  },
  username: { 
    color: '#fff', 
    fontSize: 18, 
    fontWeight: 'bold',
    textAlign: 'center',
  },
  stats: { 
    color: '#aaa', 
    fontSize: 14, 
    marginVertical: 8,
    textAlign: 'center',
  },
  reputation: {
    color: '#FFD700',
    fontSize: 12,
    marginBottom: 15,
  },
  followButton: { 
    backgroundColor: '#FFD700', 
    paddingVertical: 8, 
    paddingHorizontal: 20, 
    borderRadius: 20, 
    marginVertical: 8,
    minWidth: 100,
  },
  followButtonText: { 
    color: '#121212', 
    fontWeight: 'bold',
    textAlign: 'center',
  },
  moreInfoButton: { 
    marginTop: 8 
  },
  moreInfoButtonText: { 
    color: '#FFD700', 
    textDecorationLine: 'underline',
    fontSize: 14,
  },
  unfollowButton: { 
    backgroundColor: '#666' 
  },
});

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#000',
  },
  backgroundImage: {
    flex: 1,
  },
  gradient: { 
    flex: 1 
  },
  container: { 
    flex: 1, 
    paddingTop: Platform.OS === 'ios' ? 0 : StatusBar.currentHeight || 0,
  },
  
  // Header Styles
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 40, // Increased padding to push header down
    zIndex: 100,
  },
  topNavContainer: {
    flex: 1,
    height: 50,
    marginRight: 10,
    overflow: 'hidden',
  },
  tabsContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 2,
  },
  tabItem: { 
    flex: 1, 
    alignItems: 'center', 
    paddingVertical: 8,
    borderRadius: 8,
    marginHorizontal: 2,
  },
  activeTabItem: {
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
  },
  tabText: { 
    color: '#fff', 
    fontSize: 11, 
    marginTop: 2,
    fontWeight: '500',
  },
  activeTabText: { 
    color: '#FFD700', 
    fontWeight: 'bold' 
  },
  searchIconButton: {
    padding: 10,
    marginLeft: 12,
  },
  languageToggle: {
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#FFD700',
  },
  languageToggleText: {
    color: '#FFD700',
    fontSize: 14,
    fontWeight: 'bold',
  },
  
  // Language Selector
  languageSelectorContainer: {
    position: 'absolute',
    top: 100,
    right: 16,
    zIndex: 200,
    maxWidth: screenWidth * 0.85,
  },
  languageSelectorStyle: {
    backgroundColor: 'rgba(0,0,0,0.95)',
    borderWidth: 1,
    borderColor: '#FFD700',
  },
  
  // Translation Loading
  translationLoadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    marginHorizontal: 16,
    padding: 12,
    borderRadius: 8,
    marginTop: 10,
  },
  translationLoadingText: {
    color: '#FFD700',
    marginLeft: 8,
    fontSize: 14,
  },
  
  // Search Bar
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(195, 213, 218, 0.4)',
    borderRadius: 10,
    paddingHorizontal: 12,
    marginHorizontal: 16,
    marginTop: Platform.OS === 'ios' ? 50 : 30,
    marginBottom: 8,
    height: 40,
    top: 75,
    zIndex: 99,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: { 
    flex: 1, 
    color: '#fff', 
    fontSize: 14, 
    paddingVertical: 4,
  },
  clearButton: {
    marginLeft: 8,
  },
  closeButton: {
    marginLeft: 8,
    padding: 4,
  },
  
  // Content
  contentContainer: {
    flex: 1,
    marginTop: 80, // Increased to push content below header
  },
  
  // Post List
  listContainer: { 
    paddingHorizontal: 16, 
    paddingBottom: 100,
    paddingTop: 10,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  loadingText: {
    color: '#fff',
    fontSize: 16,
    marginTop: 10,
  },
  noPostsContainer: { 
    flex: 1, 
    alignItems: 'center', 
    justifyContent: 'center', 
    padding: 40,
  },
  noPostsText: { 
    color: '#fff', 
    fontSize: 18, 
    textAlign: 'center',
    marginTop: 16,
    lineHeight: 24,
  },
  loadMoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  loadMoreText: {
    color: '#FFD700',
    marginLeft: 8,
    fontSize: 14,
  },
  
  // Floating Button
  floatingButton: { 
    position: 'absolute', 
    bottom: 30, 
    right: 20, 
    zIndex: 1000,
  },
  floatingButtonContent: {
    backgroundColor: '#FFD700',
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  
  // Categories
  categoryContainer: { 
    paddingBottom: 100, 
    paddingTop: 16,
    paddingHorizontal: 16,
  },
  categoryRow: { 
    justifyContent: 'space-between', 
    marginBottom: 16,
  },
  categoryButton: { 
    flex: 1, 
    marginHorizontal: 8, 
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  categoryImage: { 
    width: '100%', 
    height: 150,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: '#00FFFF',
    backgroundColor: '#111',
  },
  categoryOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 12,
  },
  categoryTitle: { 
    color: '#fff', 
    fontSize: 16, 
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 4,
  },
  categoryDescription: {
    color: '#ddd',
    fontSize: 12,
    textAlign: 'center',
  },
  
  // Modal Styles
  modalOverlay: { 
    flex: 1, 
    backgroundColor: 'rgba(0,0,0,0.7)', 
    justifyContent: 'center', 
    alignItems: 'center',
    padding: 20,
  },
  modalContent: { 
    backgroundColor: '#1a1a1a', 
    borderRadius: 16, 
    padding: 20, 
    width: '100%',
    maxWidth: 400,
    borderWidth: 1,
    borderColor: '#333',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: { 
    fontSize: 18, 
    fontWeight: 'bold', 
    color: '#FFD700',
  },
  modalDescription: {
    color: '#ccc',
    fontSize: 14,
    marginBottom: 16,
    lineHeight: 20,
  },
  modalInput: { 
    height: 100, 
    borderColor: '#333', 
    borderWidth: 1, 
    borderRadius: 8, 
    color: '#fff', 
    padding: 12, 
    marginBottom: 8, 
    textAlignVertical: 'top',
    backgroundColor: '#222',
  },
  characterCount: {
    color: '#888',
    fontSize: 12,
    textAlign: 'right',
    marginBottom: 16,
  },
  modalButtons: { 
    flexDirection: 'row', 
    justifyContent: 'space-between',
    gap: 12,
  },
  modalButton: { 
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#444',
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  sendButton: {
    backgroundColor: '#FFD700',
  },
  sendButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: 'bold',
  },
  disabledButton: {
    backgroundColor: '#666',
    opacity: 0.6,
  },
});