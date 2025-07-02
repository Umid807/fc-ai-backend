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
import i18n from '../../i18n/i18n';

// DeepL for content translation
import { useTranslation } from '../../../../hooks/useTranslation';
import { LanguageSelector } from '../../../../components/LanguageSelector';
import { DEEPL_API_KEY } from '../../../../config/constants';

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
import PostCard from '../../../../components/PostCard';
import MyCircleScreen from '../forum/MyCircleScreen';
import { firebaseApp } from '../../firebaseConfig';

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
  console.log("ForumScreen: formatTimestamp called with timestamp:", timestamp);
  if (timestamp && typeof timestamp === 'object' && 'seconds' in timestamp) {
    const dateObj = new Date(timestamp.seconds * 1000);
    console.log("ForumScreen: formatTimestamp - Converted timestamp to date:", dateObj.toLocaleDateString());
    return dateObj.toLocaleDateString();
  }
  console.log("ForumScreen: formatTimestamp - Invalid timestamp, returning 'No Date'");
  return t('articleScreen.noDate');
}

// ⭐⭐⭐ QuickInfoBox Component ⭐⭐⭐
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
  console.log("QuickInfoBox: Component rendered. Visible:", visible, "UserData:", userData?.uid);
  const [following, setFollowing] = useState(false);
  console.log("QuickInfoBox: Initial 'following' state set to:", false);
  const [loading, setLoading] = useState(false);
  console.log("QuickInfoBox: Initial 'loading' state set to:", false);
  const authUser = auth.currentUser;
  console.log("QuickInfoBox: Auth user retrieved:", authUser?.uid);

  const createNotification = async (targetUserId: string, notifData: any) => {
    console.log("QuickInfoBox: createNotification called for userId:", targetUserId, "with data:", notifData);
    try {
      console.log('Creating notification for', targetUserId, '->', notifData);
    } catch (error: any) {
      console.error('Failed to create notification:', error);
      console.log("QuickInfoBox: createNotification failed. Error:", error.message);
    }
  };

  useEffect(() => {
    console.log("QuickInfoBox: useEffect triggered for follow status check.");
    if (!authUser || !userData?.uid) {
      console.log("QuickInfoBox: useEffect - Skipping follow status check, authUser or userData.uid is missing.");
      return;
    }

    const checkFollowStatus = async () => {
      console.log("QuickInfoBox: checkFollowStatus initiated.");
      try {
        const userSnap = await getDoc(doc(db, 'users', authUser.uid));
        if (userSnap.exists()) {
          console.log("QuickInfoBox: checkFollowStatus - Current user data fetched successfully.");
          const data = userSnap.data();
          setFollowing(((data.following || []) as string[]).includes(userData.uid));
          console.log("QuickInfoBox: 'following' state updated to:", ((data.following || []) as string[]).includes(userData.uid));
        }
      } catch (error: any) {
        console.error('Failed to check follow status:', error);
        console.log("QuickInfoBox: checkFollowStatus failed. Error:", error.message);
      }
    };

    checkFollowStatus();
    console.log("QuickInfoBox: checkFollowStatus function invoked.");
  }, [authUser, userData?.uid]);
  console.log("QuickInfoBox: useEffect dependencies for follow status check updated.");

  const handleFollowUnfollow = async () => {
    console.log("QuickInfoBox: handleFollowUnfollow called.");
    if (!authUser || !userData?.uid || loading) {
      console.log("QuickInfoBox: handleFollowUnfollow - Skipping, authUser, userData.uid, or loading is true.");
      return;
    }

    setLoading(true);
    console.log("QuickInfoBox: 'loading' state set to true for follow/unfollow operation.");
    try {
      const userRef = doc(db, 'users', authUser.uid);
      const otherRef = doc(db, 'users', userData.uid);

      if (following) {
        console.log("QuickInfoBox: Unfollowing user:", userData.uid);
        await Promise.all([
          updateDoc(userRef, { following: arrayRemove(userData.uid) }),
          updateDoc(otherRef, { followedBy: arrayRemove(authUser.uid) })
        ]);
        setFollowing(false);
        console.log("QuickInfoBox: 'following' state updated to false. Unfollow successful.");
      } else {
        console.log("QuickInfoBox: Following user:", userData.uid);
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
          console.log("QuickInfoBox: Follow notification created for user:", userData.uid);
        }
        setFollowing(true);
        console.log("QuickInfoBox: 'following' state updated to true. Follow successful.");
      }
    } catch (error: any) {
      console.error('Follow/unfollow failed:', error);
      console.log("QuickInfoBox: Follow/unfollow failed. Error:", error.message);
      Alert.alert(t('common.error'), t('quickInfoBox.followError'));
    } finally {
      setLoading(false);
      console.log("QuickInfoBox: 'loading' state set to false after follow/unfollow operation.");
    }
  };

  if (!userData) {
    console.log("QuickInfoBox: userData is null, component will not render.");
    return null;
  }
  console.log("QuickInfoBox: Component rendering with userData:", userData.username);

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
                {userData.rank || t('quickInfoBox.member')} {userData.vip && '⭐ VIP'}
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

// ⭐⭐⭐ Main ForumLayout Component ⭐⭐⭐
export default function ForumLayout() {
  console.log("ForumLayout: Component mounted.");
  const { t } = useI18nTranslation(); // UI localization
  const router = useRouter();
  console.log("ForumLayout: useRouter hook initialized.");

  // DeepL Translation state
  const {
    translate,
    isTranslating,
    currentLanguage,
    setCurrentLanguage,
    supportedLanguages,
  } = useTranslation(DEEPL_API_KEY);
  console.log("ForumLayout: DeepL translation hook initialized. Current language:", currentLanguage);

  const [showLanguageSelector, setShowLanguageSelector] = useState(false);
  console.log("ForumLayout: 'showLanguageSelector' state initialized to false.");
  const [translatedPosts, setTranslatedPosts] = useState<Record<string, TranslatedPost>>({});
  console.log("ForumLayout: 'translatedPosts' state initialized to empty object.");

  // Auth & User state
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  console.log("ForumLayout: 'currentUserId' state initialized to null.");
  const [currentUser, setCurrentUser] = useState<UserData | null>(null);
  console.log("ForumLayout: 'currentUser' state initialized to null.");
  const [followedUsers, setFollowedUsers] = useState<UserData[]>([]);
  console.log("ForumLayout: 'followedUsers' state initialized to empty array.");

  // Posts & Pagination state
  const [posts, setPosts] = useState<ForumPost[]>([]);
  console.log("ForumLayout: 'posts' state initialized to empty array.");
  const [lastVisible, setLastVisible] = useState<any>(null);
  console.log("ForumLayout: 'lastVisible' state initialized to null.");
  const [hasMore, setHasMore] = useState(true);
  console.log("ForumLayout: 'hasMore' state initialized to true.");
  const [loadingMore, setLoadingMore] = useState(false);
  console.log("ForumLayout: 'loadingMore' state initialized to false.");
  const [refreshing, setRefreshing] = useState(false);
  console.log("ForumLayout: 'refreshing' state initialized to false.");
  const [initialLoading, setInitialLoading] = useState(true);
  console.log("ForumLayout: 'initialLoading' state initialized to true.");

  // UI state
  const [activeTab, setActiveTab] = useState('hot');
  console.log("ForumLayout: 'activeTab' state initialized to 'hot'.");
  const [searchVisible, setSearchVisible] = useState(false);
  console.log("ForumLayout: 'searchVisible' state initialized to false.");
  const [searchQuery, setSearchQuery] = useState('');
  console.log("ForumLayout: 'searchQuery' state initialized to empty string.");
  const [showQuickInfo, setShowQuickInfo] = useState(false);
  console.log("ForumLayout: 'showQuickInfo' state initialized to false.");
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
  console.log("ForumLayout: 'selectedUser' state initialized to null.");

  // Private Reply state
  const [showPrivateReply, setShowPrivateReply] = useState(false);
  console.log("ForumLayout: 'showPrivateReply' state initialized to false.");
  const [privateReplyPostId, setPrivateReplyPostId] = useState<string | null>(null);
  console.log("ForumLayout: 'privateReplyPostId' state initialized to null.");
  const PRIVATE_REPLY_THRESHOLD = 8;
  console.log("ForumLayout: PRIVATE_REPLY_THRESHOLD set to:", PRIVATE_REPLY_THRESHOLD);

  // Tab configuration with i18n
  const tabs = [
    { key: 'hot', label: t('forumScreen.tabs.hot'), icon: 'flame' },
    { key: 'newest', label: t('forumScreen.tabs.newest'), icon: 'time' },
    { key: 'categories', label: t('forumScreen.tabs.categories'), icon: 'folder' },
    { key: 'circle', label: t('forumScreen.tabs.myCircle'), icon: 'people' },
  ];
  console.log("ForumLayout: Tabs configured.");

  // ⭐⭐⭐ Auth Listener ⭐⭐⭐
  useEffect(() => {
    console.log("ForumLayout: useEffect triggered for auth state change listener.");
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      console.log("ForumLayout: onAuthStateChanged callback triggered. User:", user?.uid);
      if (user) {
        setCurrentUserId(user.uid);
        console.log("ForumLayout: 'currentUserId' state updated to:", user.uid);
      } else {
        setCurrentUserId(null);
        console.log("ForumLayout: 'currentUserId' state updated to null (user logged out).");
        setCurrentUser(null);
        console.log("ForumLayout: 'currentUser' state updated to null.");
        setFollowedUsers([]);
        console.log("ForumLayout: 'followedUsers' state cleared.");
      }
    });

    return unsubscribe;
  }, []);
  console.log("ForumLayout: Auth state change listener set up.");

  // ⭐⭐⭐ Fetch Current User & Followed Users ⭐⭐⭐
  useEffect(() => {
    console.log("ForumLayout: useEffect triggered for fetching user data. CurrentUserId:", currentUserId);
    if (!currentUserId) {
      console.log("ForumLayout: Skipping fetch user data, currentUserId is null.");
      return;
    }

    const fetchUserData = async () => {
      console.log("ForumLayout: fetchUserData initiated for userId:", currentUserId);
      try {
        const userSnap = await getDoc(doc(db, 'users', currentUserId));
        if (userSnap.exists()) {
          const userData = userSnap.data() as UserData;
          setCurrentUser({ uid: userSnap.id, ...userData });
          console.log("ForumLayout: 'currentUser' state updated with data for uid:", userSnap.id);

          // Fetch followed users
          if (Array.isArray(userData.following) && userData.following.length > 0) {
            console.log("ForumLayout: Fetching followed users for:", currentUserId);
            const followedDocs = await Promise.all(
              userData.following.map(uid => getDoc(doc(db, 'users', uid)))
            );

            const followedUsersData = followedDocs
              .filter(snap => snap.exists())
              .map(snap => ({ uid: snap.id, ...snap.data() } as UserData));

            setFollowedUsers(followedUsersData);
            console.log("ForumLayout: 'followedUsers' state updated with", followedUsersData.length, "users.");
          }
        } else {
          console.log("ForumLayout: User document does not exist for uid:", currentUserId);
        }
      } catch (error: any) {
        console.error('Failed to fetch user data:', error);
        console.log("ForumLayout: fetchUserData failed. Error:", error.message);
      }
    };

    fetchUserData();
    console.log("ForumLayout: fetchUserData function invoked.");
  }, [currentUserId]);
  console.log("ForumLayout: useEffect dependencies for user data fetch updated.");


  // ⭐⭐⭐ Post Fetching Logic ⭐⭐⭐
  const POSTS_PER_PAGE = 25;
  console.log("ForumLayout: POSTS_PER_PAGE set to:", POSTS_PER_PAGE);

  const fetchInitialPosts = useCallback(async (force = false) => {
    console.log("ForumLayout: fetchInitialPosts called. Force:", force, "Current posts length:", posts.length);
    if (!force && posts.length > 0) {
      console.log("ForumLayout: Skipping initial fetch, posts already loaded.");
      return;
    }

    setInitialLoading(true);
    console.log("ForumLayout: 'initialLoading' state set to true.");
    try {
      const orderField = activeTab === 'hot' ? 'hotness' : 'createdAt';
      console.log("ForumLayout: Fetching initial posts with orderField:", orderField, "for activeTab:", activeTab);
      const q = query(
        collection(db, 'posts'),
        orderBy(orderField, 'desc'),
        limit(POSTS_PER_PAGE)
      );

      const snapshot = await getDocs(q);
      console.log("ForumLayout: Initial posts snapshot received. Docs found:", snapshot.docs.length);

      if (!snapshot.empty) {
        const fetchedPosts = snapshot.docs.map(docSnap => {
          const data = docSnap.data();
          const post: ForumPost = {
            id: docSnap.id,
            ...data,
            image: Array.isArray(data.images) && data.images.length > 0
              ? data.images[0]
              : data.image || null,
            createdAt: data.createdAt?.seconds
              ? new Date(data.createdAt.seconds * 1000)
              : data.createdAt?.toDate?.() || new Date(),
          } as ForumPost;
          console.log("ForumLayout: Mapped post:", post.id);
          return post;
        });

        setPosts(fetchedPosts);
        console.log("ForumLayout: 'posts' state updated with", fetchedPosts.length, "initial posts.");
        setLastVisible(snapshot.docs[snapshot.docs.length - 1]);
        console.log("ForumLayout: 'lastVisible' state updated.");
        setHasMore(snapshot.docs.length === POSTS_PER_PAGE);
        console.log("ForumLayout: 'hasMore' state updated to:", snapshot.docs.length === POSTS_PER_PAGE);
      } else {
        setPosts([]);
        console.log("ForumLayout: No initial posts found. 'posts' state set to empty.");
        setHasMore(false);
        console.log("ForumLayout: 'hasMore' state set to false.");
      }
    } catch (error: any) {
      console.error('Failed to fetch posts:', error);
      console.log("ForumLayout: fetchInitialPosts failed. Error:", error.message);
      Alert.alert(t('common.error'), t('forumScreen.errors.fetchPosts'));
    } finally {
      setInitialLoading(false);
      console.log("ForumLayout: 'initialLoading' state set to false.");
    }
  }, [activeTab, posts.length, t]); // Added posts.length to dependencies to allow re-fetching when empty initially or force is true.

  useEffect(() => {
    console.log("ForumLayout: useEffect triggered for initial post fetch.");
    fetchInitialPosts(false);
  }, [fetchInitialPosts]);
  console.log("ForumLayout: useEffect dependencies for initial post fetch updated.");

  const handleRefresh = async () => {
    console.log("ForumLayout: handleRefresh called.");
    setRefreshing(true);
    console.log("ForumLayout: 'refreshing' state set to true.");
    try {
      setPosts([]);
      console.log("ForumLayout: 'posts' state cleared for refresh.");
      setLastVisible(null);
      console.log("ForumLayout: 'lastVisible' state cleared for refresh.");
      setHasMore(true);
      console.log("ForumLayout: 'hasMore' state reset to true for refresh.");
      setTranslatedPosts({}); // Clear translations on refresh
      console.log("ForumLayout: 'translatedPosts' state cleared on refresh.");
      await fetchInitialPosts(true);
      console.log("ForumLayout: Initial posts re-fetched due to refresh.");
    } catch (error: any) {
      console.error('Refresh failed:', error);
      console.log("ForumLayout: handleRefresh failed. Error:", error.message);
    } finally {
      setRefreshing(false);
      console.log("ForumLayout: 'refreshing' state set to false.");
    }
  };

  const fetchMorePosts = async () => {
    console.log("ForumLayout: fetchMorePosts called.");
    if (!hasMore || loadingMore || !lastVisible) {
      console.log("ForumLayout: Skipping fetchMorePosts, hasMore:", hasMore, "loadingMore:", loadingMore, "lastVisible:", lastVisible);
      return;
    }

    setLoadingMore(true);
    console.log("ForumLayout: 'loadingMore' state set to true.");
    try {
      const orderField = activeTab === 'hot' ? 'hotness' : 'createdAt';
      console.log("ForumLayout: Fetching more posts with orderField:", orderField);
      const q = query(
        collection(db, 'posts'),
        orderBy(orderField, 'desc'),
        startAfter(lastVisible),
        limit(POSTS_PER_PAGE)
      );

      const snapshot = await getDocs(q);
      console.log("ForumLayout: More posts snapshot received. Docs found:", snapshot.docs.length);

      if (!snapshot.empty) {
        const morePosts = snapshot.docs.map(docSnap => {
          const data = docSnap.data();
          const post: ForumPost = {
            id: docSnap.id,
            ...data,
            image: Array.isArray(data.images) && data.images.length > 0
              ? data.images[0]
              : data.image || null,
            createdAt: data.createdAt?.seconds
              ? new Date(data.createdAt.seconds * 1000)
              : data.createdAt?.toDate?.() || new Date(),
          } as ForumPost;
          console.log("ForumLayout: Mapped more post:", post.id);
          return post;
        });

        setPosts(prevPosts => [...prevPosts, ...morePosts]);
        console.log("ForumLayout: 'posts' state appended with", morePosts.length, "more posts.");
        setLastVisible(snapshot.docs[snapshot.docs.length - 1]);
        console.log("ForumLayout: 'lastVisible' state updated for next pagination.");
        setHasMore(snapshot.docs.length === POSTS_PER_PAGE);
        console.log("ForumLayout: 'hasMore' state updated to:", snapshot.docs.length === POSTS_PER_PAGE);
      } else {
        setHasMore(false);
        console.log("ForumLayout: No more posts found. 'hasMore' state set to false.");
      }
    } catch (error: any) {
      console.error('Failed to fetch more posts:', error);
      console.log("ForumLayout: fetchMorePosts failed. Error:", error.message);
    } finally {
      setLoadingMore(false);
      console.log("ForumLayout: 'loadingMore' state set to false.");
    }
  };

  // ⭐⭐⭐ Filter & Sort Posts ⭐⭐⭐
  const filteredPosts = useMemo(() => {
    console.log("ForumLayout: useMemo triggered for filteredPosts. ActiveTab:", activeTab, "SearchQuery:", searchQuery);
    let filtered = [...posts];

    // Apply tab filters
    if (activeTab === 'newest') {
      filtered.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      console.log("ForumLayout: Posts sorted by 'newest' tab.");
    } else if (activeTab === 'circle' && currentUserId) {
      const followedUserIds = followedUsers.map(user => user.uid);
      filtered = filtered.filter(post =>
        post.userId === currentUserId || followedUserIds.includes(post.userId)
      );
      filtered.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      console.log("ForumLayout: Posts filtered for 'circle' tab and sorted by newest.");
    } else if (activeTab === 'hot') {
      filtered.sort((a, b) => (b.hotness || 0) - (a.hotness || 0));
      console.log("ForumLayout: Posts sorted by 'hot' tab.");
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(post =>
        post.title?.toLowerCase().includes(query) ||
        post.content?.toLowerCase().includes(query) ||
        post.username?.toLowerCase().includes(query)
      );
      console.log("ForumLayout: Posts further filtered by search query:", searchQuery);
    }

    console.log("ForumLayout: filteredPosts memoization complete. Resulting count:", filtered.length);
    return filtered;
  }, [posts, activeTab, currentUserId, followedUsers, searchQuery]);
  console.log("ForumLayout: useMemo dependencies for filteredPosts updated.");

  // ⭐⭐⭐ Translation Logic with Instant Refresh ⭐⭐⭐
  const handleLanguageChange = async (language: string) => {
    console.log("ForumLayout: handleLanguageChange called. New language:", language);
    setCurrentLanguage(language);
    console.log("ForumLayout: 'currentLanguage' state updated to:", language);
    setShowLanguageSelector(false);
    console.log("ForumLayout: 'showLanguageSelector' state set to false.");

    if (language === 'EN') {
      setTranslatedPosts({});
      console.log("ForumLayout: Language set to English, clearing translated posts.");
      return;
    }

    // 🚀 Force refresh posts immediately after language change
    setInitialLoading(true);
    console.log("ForumLayout: 'initialLoading' state set to true (force refresh posts for translation).");
    await fetchInitialPosts(true);
    console.log("ForumLayout: Initial posts re-fetched for translation.");

    // Then translate the newly fetched posts
    try {
      const postsToTranslate = filteredPosts.slice(0, 10); // Translate first 10 for quick display
      const translations: Record<string, TranslatedPost> = {};

      for (const post of postsToTranslate) {
        console.log("ForumLayout: Translating post ID:", post.id);
        const [translatedTitle, translatedContent] = await Promise.all([
          translate(post.title, language),
          translate(post.content, language),
        ]);

        translations[post.id] = {
          title: translatedTitle,
          content: translatedContent,
        };
        console.log("ForumLayout: Post ID", post.id, "translated.");
      }

      setTranslatedPosts(translations);
      console.log("ForumLayout: 'translatedPosts' state updated with new translations.");
    } catch (error: any) {
      console.error('Translation failed:', error);
      console.log("ForumLayout: Translation process failed. Error:", error.message);
      Alert.alert(t('common.error'), t('forumScreen.errors.translation'));
    } finally {
      setInitialLoading(false);
      console.log("ForumLayout: 'initialLoading' state set to false after translation process.");
    }
  };

  // ⭐⭐⭐ Private Reply Logic ⭐⭐⭐
  const openPrivateReply = (postId: string) => {
    console.log("ForumLayout: openPrivateReply called for postId:", postId);
    if (!currentUser) {
      console.log("ForumLayout: Private reply failed - user not logged in.");
      return Alert.alert(t('forumScreen.privateReply.loginRequiredTitle'), t('forumScreen.privateReply.loginRequiredMessage'));
    }

    if ((currentUser.reputation || 0) < PRIVATE_REPLY_THRESHOLD) {
      console.log("ForumLayout: Private reply failed - reputation too low. Current rep:", currentUser.reputation);
      return Alert.alert(
        t('forumScreen.privateReply.restrictedTitle'),
        t('forumScreen.privateReply.restrictedMessage')
      );
    }

    setPrivateReplyPostId(postId);
    console.log("ForumLayout: 'privateReplyPostId' set to:", postId);
    setShowPrivateReply(true);
    console.log("ForumLayout: 'showPrivateReply' state set to true (modal opened).");
  };

  // ⭐⭐⭐ Background Selection ⭐⭐⭐
  const backgroundImages: Record<string, any> = {
    hot: require('../../../../assets/images/forumbg.png'),
    newest: require('../../../../assets/images/newest.png'),
    circle: require('../../../../assets/images/Article bk.png'),
    categories: require('../../../../assets/images/Article bk.png'),
  };
  console.log("ForumLayout: Background images mapped for tabs.");

  // ⭐⭐⭐ Render Methods ⭐⭐⭐
  const renderContent = () => {
    console.log("ForumLayout: renderContent called. ActiveTab:", activeTab);
    if (activeTab === 'categories') {
      console.log("ForumLayout: Rendering CategoryTab.");
      return <CategoryTab />;
    }

    if (activeTab === 'circle') {
      console.log("ForumLayout: Rendering MyCircleScreen.");
      return (
        <MyCircleScreen
          followedUsers={followedUsers}
          currentUser={currentUser}
          router={router}
        />
      );
    }

    console.log("ForumLayout: Rendering PostList.");
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
          console.log("ForumLayout: 'selectedUser' state updated after PostCard user press:", user.uid);
          setShowQuickInfo(true);
          console.log("ForumLayout: 'showQuickInfo' state set to true (QuickInfoBox opened).");
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
  console.log("ForumLayout: renderContent function defined.");

  // ⭐⭐⭐ Main Render ⭐⭐⭐
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
                onPress={() => {
                  setShowLanguageSelector(!showLanguageSelector);
                  console.log("ForumLayout: Language toggle pressed. 'showLanguageSelector' state toggled to:", !showLanguageSelector);
                }}
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
                onClose={() => {
                  setSearchVisible(false);
                  setSearchQuery(''); // Clear search query on close
                  console.log("ForumLayout: Search bar closed. 'searchVisible' set to false, 'searchQuery' cleared.");
                }}
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
              onClose={() => {
                setShowQuickInfo(false);
                setSelectedUser(null);
                console.log("ForumLayout: QuickInfoBox closed. 'showQuickInfo' set to false, 'selectedUser' cleared.");
              }}
              userData={selectedUser}
              currentUser={currentUser}
              onMoreInfo={() => {
                setShowQuickInfo(false);
                console.log("ForumLayout: QuickInfoBox 'More Info' pressed. 'showQuickInfo' set to false.");
                if (selectedUser) {
                  router.push(`/profile/${selectedUser.uid}`);
                  console.log("ForumLayout: Navigating to ProfileScreen for user:", selectedUser.uid);
                }
              }}
            />

            {/* Private Reply Modal */}
            <PrivateReplyModal
              visible={showPrivateReply}
              postId={privateReplyPostId}
              onClose={() => {
                setShowPrivateReply(false);
                setPrivateReplyPostId(null);
                console.log("ForumLayout: PrivateReplyModal closed. 'showPrivateReply' set to false, 'privateReplyPostId' cleared.");
              }}
            />
          </View>
        </LinearGradient>
      </ImageBackground>
    </SafeAreaView>
  );
}

// ⭐⭐⭐ Sub-Components ⭐⭐⭐

const TopNavigation = ({ tabs, activeTab, setActiveTab, router }: any) => {
  const { t } = useI18nTranslation();
  console.log("TopNavigation: Component rendered. ActiveTab:", activeTab);

  return (
    <ImageBackground
      source={require('../../../../assets/images/tabbk.png')}
      style={styles.topNavContainer}
      imageStyle={{ borderRadius: 12 }}
    >
      <View style={styles.tabsContainer}>
        {tabs.map((tab: any) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tabItem, activeTab === tab.key && styles.activeTabItem]}
            onPress={() => {
              setActiveTab(tab.key);
              console.log("TopNavigation: Tab pressed. Active tab changed to:", tab.key);
            }}
            activeOpacity={0.8}
          >
            <Ionicons
              name={tab.icon as any}
              size={16}
              color={activeTab === tab.key ? '#FFD700' : '#888'}
            />
            <Text style={[styles.tabText, activeTab === tab.key && styles.activeTabText]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity
          onPress={() => {
            router.push('/forum/ForumSearch');
            console.log("TopNavigation: Search icon pressed. Navigating to ForumSearch.");
          }}
          style={styles.searchIconButton}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="search" size={20} color="#FFD700" />
        </TouchableOpacity>
      </View>
    </ImageBackground>
  );
};

const SearchBar = ({ searchQuery, setSearchQuery, onClose }: any) => {
  const { t } = useI18nTranslation();
  console.log("SearchBar: Component rendered. SearchQuery:", searchQuery);

  return (
    <View style={styles.searchBarContainer}>
      <Ionicons name="search" size={18} color="#888" style={styles.searchIcon} />
      <TextInput
        placeholder={t('forumScreen.search.placeholder')}
        placeholderTextColor="#888"
        value={searchQuery}
        onChangeText={(text) => {
          setSearchQuery(text);
          console.log("SearchBar: Search input changed to:", text);
        }}
        style={styles.searchInput}
        autoCorrect={false}
        autoCapitalize="none"
        autoFocus
        returnKeyType="search"
      />
      {searchQuery.length > 0 && (
        <TouchableOpacity onPress={() => {
          setSearchQuery('');
          console.log("SearchBar: Clear button pressed. SearchQuery cleared.");
        }} style={styles.clearButton}>
          <Ionicons name="close-circle" size={18} color="#888" />
        </TouchableOpacity>
      )}
      <TouchableOpacity onPress={() => {
        onClose();
        console.log("SearchBar: Close button pressed.");
      }} style={styles.closeButton}>
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
}: any) => {
  const { t } = useI18nTranslation();
  console.log("PostList: Component rendered. InitialLoading:", initialLoading, "Posts count:", posts.length);

  if (initialLoading) {
    console.log("PostList: Displaying initial loading indicator.");
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
    console.log("PostList: No posts found message displayed. Message:", message);

    return (
      <View style={styles.noPostsContainer}>
        <Ionicons name="chatbubbles-outline" size={64} color="#666" />
        <Text style={styles.noPostsText}>{message}</Text>
      </View>
    );
  }

  const renderPost = ({ item: post }: { item: ForumPost }) => {
    const translatedPost = translatedPosts[post.id];
    const displayPost = currentLanguage === 'EN' || !translatedPost
      ? post
      : { ...post, title: translatedPost.title, content: translatedPost.content };
    console.log("PostList: Rendering post ID:", post.id, "Translated:", !!translatedPost);

    return (
      <PostCard
        post={displayPost}
        router={router}
        currentUser={currentUser}
        onPrivateReply={onPrivateReply}
        onUserPress={onUserPress}
        hotTopic={activeTab === 'hot'}
        isTranslated={currentLanguage !== 'EN' && !translatedPost} // Indicates if translation is pending/failed
      />
    );
  };
  console.log("PostList: renderPost function defined.");

  return (
    <FlatList
      data={posts}
      keyExtractor={(item) => item.id}
      renderItem={renderPost}
      onEndReached={fetchMorePosts}
      onEndReachedThreshold={0.7}
      ListFooterComponent={() => {
        if (loadingMore) {
          console.log("PostList: Displaying load more indicator.");
          return (
            <View style={styles.loadMoreContainer}>
              <ActivityIndicator size="small" color="#FFD700" />
              <Text style={styles.loadMoreText}>{t('forumScreen.postList.loadingMore')}</Text>
            </View>
          );
        }
        return null;
      }}
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
  console.log("CategoryTab: Component rendered.");

  const categories = [
    {
      id: 'general',
      title: t('forumScreen.categories.generalDiscussion'),
      image: require('../../../../assets/images/gd.png'),
      description: t('forumScreen.categories.generalDiscussionDesc')
    },
  ];
  console.log("CategoryTab: Categories defined.");

  const renderCategory = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={styles.categoryButton}
      onPress={() => {
        router.push(`/forum/${item.id}`);
        console.log("CategoryTab: Category button pressed. Navigating to category:", item.id);
      }}
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
  console.log("CategoryTab: renderCategory function defined.");

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

const FloatingPostButton = ({ router }: any) => {
  const pulse = useRef(new Animated.Value(1)).current;
  console.log("FloatingPostButton: Component rendered. Animated value initialized.");

  useEffect(() => {
    console.log("FloatingPostButton: useEffect triggered for pulse animation.");
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
    console.log("FloatingPostButton: Pulse animation started.");

    return () => {
      animation.stop();
      console.log("FloatingPostButton: Pulse animation stopped (cleanup).");
    }
  }, [pulse]);
  console.log("FloatingPostButton: useEffect dependencies for animation updated.");

  return (
    <Animated.View style={[styles.floatingButton, { transform: [{ scale: pulse }] }]}>
      <TouchableOpacity
        onPress={() => {
          router.push('/forum/CreatePost');
          console.log("FloatingPostButton: Create Post button pressed. Navigating to CreatePost.");
        }}
        activeOpacity={0.8}
        style={styles.floatingButtonContent}
      >
        <Ionicons name="add" size={24} color="#121212" />
      </TouchableOpacity>
    </Animated.View>
  );
};

const PrivateReplyModal = ({ visible, postId, onClose }: any) => {
  const { t } = useI18nTranslation();
  console.log("PrivateReplyModal: Component rendered. Visible:", visible, "PostId:", postId);
  const [replyText, setReplyText] = useState('');
  console.log("PrivateReplyModal: 'replyText' state initialized to empty string.");
  const [cooldown, setCooldown] = useState(false);
  console.log("PrivateReplyModal: 'cooldown' state initialized to false.");
  const [sending, setSending] = useState(false);
  console.log("PrivateReplyModal: 'sending' state initialized to false.");

  const handleSend = async () => {
    console.log("PrivateReplyModal: handleSend called.");
    if (cooldown || sending || !replyText.trim()) {
      console.log("PrivateReplyModal: Skipping send, cooldown, sending, or empty replyText detected.");
      return;
    }

    if (replyText.trim().length < 10) {
      console.log("PrivateReplyModal: Validation failed - reply text too short.");
      Alert.alert(t('privateReplyModal.tooShortTitle'), t('privateReplyModal.tooShortMessage'));
      return;
    }

    setSending(true);
    console.log("PrivateReplyModal: 'sending' state set to true.");
    try {
      const stored = await AsyncStorage.getItem('privateReplies');
      const replies = stored ? JSON.parse(stored) : [];
      console.log("PrivateReplyModal: Existing private replies fetched from AsyncStorage:", replies.length);

      const newReply = {
        id: Date.now().toString(),
        postId,
        text: replyText.trim(),
        timestamp: new Date().toISOString(),
        sent: true,
      };
      console.log("PrivateReplyModal: New reply object created:", newReply.id);

      replies.push(newReply);
      await AsyncStorage.setItem('privateReplies', JSON.stringify(replies));
      console.log("PrivateReplyModal: New reply saved to AsyncStorage.");

      Alert.alert(t('privateReplyModal.sentTitle'), t('privateReplyModal.sentMessage'));
      setReplyText('');
      console.log("PrivateReplyModal: 'replyText' state cleared.");
      onClose();
      console.log("PrivateReplyModal: Modal closed after successful send.");

      // Set cooldown
      setCooldown(true);
      console.log("PrivateReplyModal: 'cooldown' state set to true.");
      setTimeout(() => {
        setCooldown(false);
        console.log("PrivateReplyModal: 'cooldown' state set to false after 30 seconds.");
      }, 30000); // 30 seconds cooldown
    } catch (error: any) {
      console.error('Failed to send private reply:', error);
      console.log("PrivateReplyModal: handleSend failed. Error:", error.message);
      Alert.alert(t('common.error'), t('privateReplyModal.sendError'));
    } finally {
      setSending(false);
      console.log("PrivateReplyModal: 'sending' state set to false.");
    }
  };

  const handleClose = () => {
    console.log("PrivateReplyModal: handleClose called.");
    if (sending) {
      console.log("PrivateReplyModal: Cannot close while sending is in progress.");
      return;
    }
    setReplyText('');
    console.log("PrivateReplyModal: 'replyText' state cleared on close.");
    onClose();
    console.log("PrivateReplyModal: Modal closed.");
  };

  if (!visible) {
    console.log("PrivateReplyModal: Modal not visible, returning null.");
    return null;
  }
  console.log("PrivateReplyModal: Modal is visible, rendering content.");

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
            onChangeText={(text) => {
              setReplyText(text);
              console.log("PrivateReplyModal: Reply input changed. Length:", text.length);
            }}
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

// ⭐⭐⭐ Styles ⭐⭐⭐

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
    paddingTop: 40,
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
    fontWeight: 'bold',
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