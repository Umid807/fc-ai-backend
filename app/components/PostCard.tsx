import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  ImageBackground,
  Animated,
  StyleSheet,
} from 'react-native';
import FastImage from 'expo-fast-image';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { deleteDoc, doc, getFirestore } from 'firebase/firestore';
import { firebaseApp } from '../app/firebaseConfig';

const db = getFirestore(firebaseApp);
const getTimeAgo = (timestamp) => {
  if (!timestamp) return '';

  let postDate;

  if (typeof timestamp === 'object' && timestamp.toDate) {
    postDate = timestamp.toDate();
  } else if (typeof timestamp === 'object' && timestamp.seconds) {
    postDate = new Date(timestamp.seconds * 1000);
  } else if (typeof timestamp === 'number') {
    postDate = new Date(timestamp);
  } else if (typeof timestamp === 'string') {
    postDate = new Date(Date.parse(timestamp));
  } else {
    postDate = new Date(timestamp);
  }

  // 🧠 Normalize both to UTC timestamps
  const nowUTC = new Date().getTime();
  const postUTC = postDate.getTime();
  const diffInSeconds = Math.floor((nowUTC - postUTC) / 1000);

  if (diffInSeconds < 60) return 'Just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 172800) return 'Yesterday';

  return postDate.toLocaleDateString();
};




const PostCard = ({ post, currentUser, onPrivateReply, hotTopic }) => {
  const router = useRouter();
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  const handleDelete = async (postId) => {
    Alert.alert(
      'Confirm Delete',
      'Are you sure you want to delete this post?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteDoc(doc(db, 'posts', postId));
              console.log('Post deleted:', postId);
            } catch (err) {
              console.error('Error deleting post:', err);
              Alert.alert('Error', 'Could not delete post.');
            }
          },
        },
      ],
      { cancelable: true }
    );
  };

  const handleEdit = (postId) => {
    router.push(`/forum/EditPost?id=${postId}`);
  };

  if (post.reports >= 3) {
    return (
      <View style={styles.hiddenPost}>
        <Text style={styles.hiddenText}>This post is under review.</Text>
      </View>
    );
  }

  const mainImage = post.image || null;
  const commentCount = post.comments ?? 0;
  const likeCount = post.likes ?? 0;

  return (
<TouchableOpacity
  onPress={() => router.push(`/forum/PostDetails?id=${post.id}`)}
  activeOpacity={0.9}
>
  <Animated.View style={{ opacity: fadeAnim }}>
    <ImageBackground
      source={require('../assets/images/postcard.png')}
      style={[
        styles.postCard,
        {
          borderWidth: 1.5,
          borderRadius: 12,
          backgroundColor: 'rgba(0, 0, 0, 0.6)',
          borderColor:  '#00ffc0',
          shadowColor: hotTopic ? '#00ffc0' : '#00ffff',
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: hotTopic ? 0.5 : 0.2,
          shadowRadius: hotTopic ? 10 : 6,
          elevation: hotTopic ? 8 : 4,
        },
      ]}
      
      imageStyle={{ borderRadius: 12 }}
    >
      {mainImage && (
        <FastImage
          source={{ uri: mainImage }}
          style={styles.standardImage}
          cacheKey={post.id}
        />
      )}

      <Text style={styles.postTitle} numberOfLines={2} ellipsizeMode="tail">
        {post.title}
      </Text>
      <Text style={styles.postContent} numberOfLines={2} ellipsizeMode="tail">
        {post.content}
      </Text>

      <Text style={{ color: '#aaa', fontSize: 12, marginTop: 2 }}>
        <Ionicons name="time" size={12} color="#aaa" />{' '}
        {(() => {
          console.log('🕐 post.createdAt:', post.createdAt);
          console.log('🕐 getTimeAgo result:', getTimeAgo(post.createdAt));
          return getTimeAgo(post.createdAt);
        })()}
      </Text>

      <View style={styles.postStats}>
        <Text style={styles.postLikes}>
          <Ionicons name="heart" size={14} color="#FF6347" /> {likeCount}
        </Text>
        <Text style={styles.postComments}>
          <Ionicons name="chatbubble-ellipses" size={14} color="#00FFFF" /> {commentCount}
        </Text>
      </View>

{currentUser?.isAdmin && post.hotness !== undefined && (
  <View
    style={{
      backgroundColor: 'rgba(255, 215, 0, 0.08)',
      borderRadius: 6,
      paddingHorizontal: 8,
      paddingVertical: 4,
      alignSelf: 'flex-start',
      marginTop: 4,
    }}
  >
    <Text style={{ color: '#FFD700', fontSize: 12, fontWeight: '600' }}>
      🔥 Score: {post.hotness.toFixed(1)}
    </Text>
  </View>
)}


      {currentUser?.isAdmin && (
        <View style={styles.adminButtons}>
          <TouchableOpacity onPress={() => handleEdit(post.id)} style={styles.adminIcon}>
            <Ionicons name="create-outline" size={18} color="#FFD700" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => handleDelete(post.id)} style={styles.adminIcon}>
            <Ionicons name="trash-outline" size={18} color="#FF6347" />
          </TouchableOpacity>
        </View>
      )}
    </ImageBackground>
  </Animated.View>
</TouchableOpacity>

  );
};

const styles = StyleSheet.create({
  postCard: {
    borderRadius: 12,
    padding: 12,
    marginVertical: 8,
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
  },
  featuredCard: {
    borderWidth: 1,
    borderColor: '#00ffc0',
  },
  standardImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginBottom: 8,
  },
  postTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  postContent: {
    fontSize: 14,
    color: '#ccc',
    marginVertical: 4,
  },
  postStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  postLikes: {
    fontSize: 14,
    color: '#FF6347',
    fontWeight: '600',
  },

  postComments: {
    fontSize: 14,
    color: '#00FFFF',
    fontWeight: '600',
  },
  hiddenPost: {
    padding: 16,
    alignItems: 'center',
  },
  hiddenText: {
    fontSize: 14,
    color: '#888',
  },
  adminButtons: {
    position: 'absolute',
    top: 8,
    right: 8,
    flexDirection: 'row',
    gap: 8,
    backgroundColor: 'rgba(0,0,0,0.4)',
    padding: 4,
    borderRadius: 6,
  },
  adminIcon: {
    paddingHorizontal: 4,
  },
});

export default PostCard;
