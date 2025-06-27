// MyCircleScreen.tsx (Fixed with working avatar row rendering and i18n)

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  ImageBackground,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import PostCard from '../../components/PostCard';
import { db } from '../firebaseConfig';
import { useTranslation } from 'react-i18next'; // Import useTranslation

const MyCircleScreen = ({ followedUsers }) => {
  const { t } = useTranslation(); // Initialize useTranslation
  const [sortMode, setSortMode] = useState('newest');
  const [posts, setPosts] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const router = useRouter();

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = auth.onAuthStateChanged(user => {
      if (user) {
        const userRef = collection(db, 'users');
        getDocs(userRef).then(snapshot => {
          const userData = snapshot.docs.find(doc => doc.id === user.uid)?.data();
          setCurrentUser({ uid: user.uid, ...userData });
        });
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (currentUser) {
      fetchPosts();
    }
  }, [sortMode, currentUser]);

  const fetchPosts = async () => {
    setRefreshing(true);
    const postsRef = collection(db, 'posts');
    const snapshot = await getDocs(postsRef);
    let loadedPosts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    if (sortMode === 'only-mine') {
      loadedPosts = loadedPosts.filter(post => post.userId === currentUser.uid);
    } else {
      loadedPosts = loadedPosts.filter(
        post => post.userId === currentUser.uid || currentUser.following?.includes(post.userId)
      );
      if (sortMode === 'hottest') {
        loadedPosts.sort((a, b) => (b.hotnessScore || 0) - (a.hotnessScore || 0));
      } else {
        loadedPosts.sort((a, b) => {
          const aTime = a.createdAt?.seconds
            ? a.createdAt.seconds
            : new Date(a.createdAt).getTime() / 1000;
          const bTime = b.createdAt?.seconds
            ? b.createdAt.seconds
            : new Date(b.createdAt).getTime() / 1000;
          return bTime - aTime;
        });
      }
    }
    setPosts(loadedPosts);
    setRefreshing(false);
  };

  const renderSortButton = (labelKey, value) => ( // label is now a key
    <TouchableOpacity
      style={[styles.sortButton, sortMode === value && styles.sortButtonActive]}
      onPress={() => setSortMode(value)}
    >
      <Text style={[styles.sortButtonText, sortMode === value && styles.sortButtonTextActive]}>
        {t(labelKey)} {/* Use t() for translation */}
      </Text>
    </TouchableOpacity>
  );

  const renderPost = ({ item }) => (
    <PostCard
      post={item}
      currentUser={currentUser}
      isMine={item.userId === currentUser?.uid}
      highlight={item.userId === currentUser?.uid}
      showDelete={item.userId === currentUser?.uid}
    />
  );

  if (!currentUser) {
    return <ActivityIndicator size="large" color="#00ffff" style={{ marginTop: 80 }} />;
  }

  return (
    <ImageBackground
      source={require('../../assets/images/mycircle.png')}
      style={{ flex: 1, marginTop: 80 }}
      resizeMode="cover"
    >
      <View style={styles.innerContent}>
        <Text style={styles.header}></Text>
        <Text style={styles.followingLabel}>{t('myCircleScreen.labels.following')}</Text>

        {followedUsers?.length > 0 && (
          <View style={styles.followedUsersContainer}>
            <FlatList
              data={followedUsers}
              keyExtractor={(item) => item.uid}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingVertical: 6 }}
              renderItem={({ item }) => (
                <TouchableOpacity
                  onPress={() => router.push(`/profile/${item.uid}`)}
                  style={styles.followedUserCard}
                >
                  <Image
                    source={{
                      uri: item.profileImage || item.avatar || 'https://via.placeholder.com/60',
                    }}
                    style={styles.followedUserAvatar}
                  />
                  <Text style={styles.followedUserName}>{item.username || t('myCircleScreen.labels.user')}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        )}

        <View style={styles.sortBar}>
          {renderSortButton('myCircleScreen.sortModes.newest', 'newest')}
          {renderSortButton('myCircleScreen.sortModes.hottest', 'hottest')}
          {renderSortButton('myCircleScreen.sortModes.onlyMine', 'only-mine')}
        </View>

        <FlatList
          data={posts}
          keyExtractor={(item) => item.id}
          renderItem={renderPost}
          contentContainerStyle={{ paddingBottom: 100 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={fetchPosts} />
          }
          ListEmptyComponent={
            <Text style={styles.emptyText}>{t('myCircleScreen.emptyStates.noPostsToShow')}</Text>
          }
        />
      </View>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  innerContent: {
    flex: 1,
    paddingHorizontal: 12,
  },
  header: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 60,
    marginBottom: 10,
    textAlign: 'center',
  },
  sortBar: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    marginTop: 12,
    marginBottom: 8,
  },
  sortButton: {
    paddingVertical: 8,
    paddingHorizontal: 18,
    borderRadius: 25,
    borderWidth: 1.5,
    borderColor: '#00ffff55',
    marginHorizontal: 4,
    backgroundColor: 'rgba(0, 255, 255, 0.05)',
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 2,
    transform: [{ scale: 1 }],
  },
  sortButtonActive: {
    backgroundColor: 'rgba(57, 255, 20, 0.15)',
    borderColor: '#39FF14',
    shadowColor: '#39FF14',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 6,
    transform: [{ scale: 1.05 }],
  },
  sortButtonText: {
    color: '#ddd',
    fontSize: 14,
    fontWeight: '500',
  },
  sortButtonTextActive: {
    color: '#39FF14',
    fontWeight: '700',
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 40,
    color: '#888',
    fontSize: 16,
  },
  followedUsersContainer: {
    paddingHorizontal: 12,
    paddingTop: 8,
  },
  followedUserCard: {
    alignItems: 'center',
    marginRight: 14,
  },
  followedUserAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: '#00ffff',
  },
  followedUserName: {
    color: '#ccc',
    fontSize: 11,
    marginTop: 4,
    textAlign: 'center',
    maxWidth: 60,
  },
  followingLabel: {
    color: '#bbffab',
    fontSize: 14,
    fontWeight: '600',
    textAlign:'center',
    marginBottom: 6,
    top:10,
    marginLeft: 6,
    textShadowColor: '#00ffffaa',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 6,
    letterSpacing: 0.5,
  },
});

export default MyCircleScreen;