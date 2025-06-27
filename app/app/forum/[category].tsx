import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  ImageBackground,
  RefreshControl,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { getFirestore, collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { firebaseApp } from '../firebaseConfig';


import { LinearGradient } from 'expo-linear-gradient';
import PostCard from '../../components/PostCard';

import { Ionicons } from '@expo/vector-icons';

const db = getFirestore(firebaseApp);

export default function CategoryPage() {
  const { category } = useLocalSearchParams();
  const router = useRouter();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchCategoryPosts = async () => {
    setLoading(true);
    try {
      const q = query(
        collection(db, 'posts'),
        where('category', '==', formatCategoryName(category)),

        orderBy('createdAt', 'desc')
      );
      const snapshot = await getDocs(q);
      const newPosts = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      }));
      setPosts(newPosts);
    } catch (err) {
      console.error('Error fetching category posts:', err);
    } finally {
      setLoading(false);
    }
  };
  const formatCategoryName = (slug) => {
    if (!slug) return '';
    return slug
      .replace(/-/g, ' ') // 'ultimate-team' → 'ultimate team'
      .replace(/\b\w/g, (char) => char.toUpperCase()); // 'ultimate team' → 'Ultimate Team'
  };
  
  useEffect(() => {
    fetchCategoryPosts();
  }, [category]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchCategoryPosts();
    setRefreshing(false);
  };

  const backgroundSource = require('../../assets/images/Article bk.png');

  return (
    <ImageBackground source={backgroundSource} style={{ flex: 1 }}>
      <LinearGradient colors={['transparent', 'transparent']} style={{ flex: 1 }}>
        <View style={{ flex: 1, paddingTop: 80, paddingHorizontal: 16 }}>
          <Text style={styles.headerText}>{category} Posts</Text>

          {loading ? (
            <ActivityIndicator size="large" color="#FFD700" />
          ) : posts.length === 0 ? (
            <Text style={styles.emptyText}>No posts found in this category yet.</Text>
          ) : (
            <FlatList
              data={posts}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <PostCard
                  post={item}
                  router={router}
                  hotTopic={false}
                />
              )}
              refreshControl={
                Platform.OS !== 'web' ? (
                  <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                ) : null
              }
              contentContainerStyle={{ paddingBottom: 80 }}
              showsVerticalScrollIndicator={false}
            />
          )}
        </View>
      </LinearGradient>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  headerText: {
    color: '#FFD700',
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  emptyText: {
    color: '#ccc',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 20,
  },
});
