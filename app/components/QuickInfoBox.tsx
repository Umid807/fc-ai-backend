// components/QuickInfoBox.tsx
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ImageBackground,
  Modal,
  TouchableWithoutFeedback,
} from 'react-native';
import {
  getFirestore,
  doc,
  getDoc,
  updateDoc,
  arrayUnion,
  arrayRemove,
} from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { firebaseApp } from './firebaseConfig';
import { createNotification } from './firebaseHelpers';

const db = getFirestore(firebaseApp);
const auth = getAuth(firebaseApp);

const QuickInfoBox = ({ visible, onClose, userData, onMoreInfo, position }: any) => {
  const [following, setFollowing] = useState(false);
  const [loading, setLoading] = useState(false);
  const authUser = auth.currentUser;

  useEffect(() => {
    if (!authUser || !userData?.uid) return;
    (async () => {
      try {
        console.log('🟨 Checking if', authUser.uid, 'is following', userData.uid);
        const userRef = doc(db, 'users', authUser.uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          const data = userSnap.data();
          setFollowing(data.following?.includes(userData.uid));
          console.log('🟨 follow status:', data.following);
        }
      } catch (error) {
        console.error('Error checking follow status:', error);
      }
    })();
  }, [authUser, userData?.uid]);

  const handleFollowUnfollow = async () => {
    if (!authUser || !userData?.uid || loading) return;
    setLoading(true);
    try {
      console.log('🟨 handleFollowUnfollow: currentUser:', authUser.uid, 'targetUser:', userData.uid);
      const userRef = doc(db, 'users', authUser.uid);
      const otherUserRef = doc(db, 'users', userData.uid);

      if (following) {
        console.log('🟨 Unfollowing user...');
        await updateDoc(userRef, { following: arrayRemove(userData.uid) });
        await updateDoc(otherUserRef, { followedBy: arrayRemove(authUser.uid) });
        setFollowing(false);
      } else {
        console.log('🟨 Following user...');
        await updateDoc(userRef, { following: arrayUnion(userData.uid) });
        await updateDoc(otherUserRef, { followedBy: arrayUnion(authUser.uid) });
        if (authUser.uid !== userData.uid) {
          const triggerName = authUser.displayName || authUser.email || 'Someone';
          console.log('🟨 creating notification for follow...');
          await createNotification(userData.uid, {
            type: 'follow',
            message: `The user ${triggerName} has started following you.`,
          });
        }
        setFollowing(true);
      }
    } catch (error) {
      console.error('Error updating follow status:', error);
    }
    setLoading(false);
  };

  if (!userData) return null;

  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View
          style={[
            quickInfoStyles.overlay,
            position === 'nearBanner' && quickInfoStyles.nearBannerPosition,
          ]}
        >
          <ImageBackground
            source={require('../../assets/images/bk16.png')} // or your preferred image
            style={quickInfoStyles.box}
            imageStyle={{ borderRadius: 8 }}
          >
            <Image
              source={{ uri: userData.profileImage || userData.avatar || 'https://via.placeholder.com/80' }}
              style={quickInfoStyles.avatar}
            />
            <Text style={quickInfoStyles.username}>{userData.username}</Text>
            {userData.rank && (
              <Text style={[quickInfoStyles.rankText, { color: '#87CEFA' }]}>{userData.rank}</Text>
            )}
            {userData.vip && (
              <Text style={[quickInfoStyles.vipText, { color: '#FFD700' }]}>VIP</Text>
            )}
            {typeof userData.reputation === 'number' && (
              <Text style={[quickInfoStyles.reputationText, { color: '#ccc' }]}>
                Reputation: {userData.reputation}
              </Text>
            )}
            <TouchableOpacity
              style={[quickInfoStyles.followButton, following ? quickInfoStyles.unfollowButton : {}]}
              onPress={handleFollowUnfollow}
              disabled={loading}
            >
              <Text style={quickInfoStyles.followButtonText}>{following ? 'Unfollow' : 'Follow'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={quickInfoStyles.moreInfoButton} onPress={onMoreInfo}>
              <Text style={quickInfoStyles.moreInfoButtonText}>More Info</Text>
            </TouchableOpacity>
          </ImageBackground>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const quickInfoStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center' },
  nearBannerPosition: { justifyContent: 'flex-start', marginTop: 120 },
  box: {
    width: 220,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  avatar: { width: 60, height: 60, borderRadius: 30, marginBottom: 8 },
  username: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  stats: { color: '#aaa', fontSize: 14, marginVertical: 8 },
  followButton: { backgroundColor: '#FFD700', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8, marginVertical: 4 },
  followButtonText: { color: '#121212', fontWeight: 'bold' },
  moreInfoButton: { marginTop: 8 },
  moreInfoButtonText: { color: '#FFD700', textDecorationLine: 'underline' },
  unfollowButton: { backgroundColor: '#aaa' },
  rankText: {
    color: '#87CEFA', // sky blue
    fontSize: 16,
    fontWeight: '600',
    marginTop: 4,
  },
  vipText: {
    color: '#FFD700', // gold
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 4,
    textShadowColor: '#fff',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  reputationText: {
    color: '#ccc',
    fontSize: 15,
    marginTop: 4,
  },
});

export default QuickInfoBox;