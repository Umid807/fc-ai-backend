import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ImageBackground,
  Modal,
  TouchableWithoutFeedback,
  Animated,
  Dimensions,
  ActivityIndicator,
  Vibration,
} from 'react-native';
import {
  getFirestore,
  doc,
  getDoc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  increment,
} from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';

import { firebaseApp } from '../../app/firebaseConfig';
import { createNotification } from '../../utils/firebaseHelpers';

const db = getFirestore(firebaseApp);
const auth = getAuth(firebaseApp);
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface QuickInfoBoxProps {
  visible: boolean;
  onClose: () => void;
  userData: {
    uid: string;
    username: string;
    profileImage?: string;
    avatar?: string;
    rank?: string;
    vip?: boolean;
    followers?: number;
    following?: number;
    posts?: number;
    lastSeen?: Date;
    joinedAt?: Date;
    bio?: string;
  };
  onMoreInfo: () => void;
  position?: 'center' | 'nearBanner' | 'top' | 'bottom';
}

const QuickInfoBox: React.FC<QuickInfoBoxProps> = ({ 
  visible, 
  onClose, 
  userData, 
  onMoreInfo, 
  position = 'center' 
}) => {
  // State management
  const [following, setFollowing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [userStats, setUserStats] = useState({
    followers: 0,
    following: 0,
    posts: 0,
  });
  const [extendedInfo, setExtendedInfo] = useState<any>(null);
  const [showExtended, setShowExtended] = useState(false);

  // Animation refs
  const slideAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const followButtonScale = useRef(new Animated.Value(1)).current;

  const authUser = auth.currentUser;

  // ================================================================
  // ANIMATION EFFECTS
  // ================================================================

  useEffect(() => {
    if (visible) {
      // Entrance animation
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 1,
          useNativeDriver: true,
          tension: 50,
          friction: 8,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
          tension: 50,
          friction: 8,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Exit animation
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 0.8,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  // ================================================================
  // DATA FETCHING
  // ================================================================

  useEffect(() => {
    if (!authUser || !userData?.uid) return;

    const fetchUserData = async () => {
      try {
        console.log('🟨 Fetching extended user data for:', userData.uid);
        
        // Check follow status
        const userRef = doc(db, 'users', authUser.uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          const data = userSnap.data();
          setFollowing(data.following?.includes(userData.uid) || false);
        }

        // Fetch target user's extended info
        const targetUserRef = doc(db, 'users', userData.uid);
        const targetUserSnap = await getDoc(targetUserRef);
        if (targetUserSnap.exists()) {
          const targetData = targetUserSnap.data();
          setExtendedInfo(targetData);
          setUserStats({
            followers: targetData.followedBy?.length || 0,
            following: targetData.following?.length || 0,
            posts: targetData.postsCount || 0,
          });
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
      }
    };

    fetchUserData();
  }, [authUser, userData?.uid]);

  // ================================================================
  // ACTIONS
  // ================================================================

  const handleFollowUnfollow = async () => {
    if (!authUser || !userData?.uid || loading || authUser.uid === userData.uid) return;

    // Haptic feedback
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // Button press animation
    Animated.sequence([
      Animated.timing(followButtonScale, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.spring(followButtonScale, {
        toValue: 1,
        useNativeDriver: true,
      }),
    ]).start();

    setLoading(true);
    try {
      const userRef = doc(db, 'users', authUser.uid);
      const otherUserRef = doc(db, 'users', userData.uid);

      if (following) {
        // Unfollow
        await updateDoc(userRef, { following: arrayRemove(userData.uid) });
        await updateDoc(otherUserRef, { 
          followedBy: arrayRemove(authUser.uid),
        });
        setFollowing(false);
        setUserStats(prev => ({ ...prev, followers: prev.followers - 1 }));
      } else {
        // Follow
        await updateDoc(userRef, { following: arrayUnion(userData.uid) });
        await updateDoc(otherUserRef, { 
          followedBy: arrayUnion(authUser.uid),
        });
        
        // Send notification
        const triggerName = authUser.displayName || authUser.email || 'Someone';
        await createNotification(userData.uid, {
          type: 'follow',
          message: `${triggerName} started following you!`,
          fromUserId: authUser.uid,
        });
        
        setFollowing(true);
        setUserStats(prev => ({ ...prev, followers: prev.followers + 1 }));
      }
    } catch (error) {
      console.error('Error updating follow status:', error);
      // Revert optimistic update
      setFollowing(!following);
    } finally {
      setLoading(false);
    }
  };

  const handleMoreInfo = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onClose();
    setTimeout(() => onMoreInfo(), 300);
  };

  const toggleExtendedInfo = () => {
    setShowExtended(!showExtended);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  // ================================================================
  // RENDER HELPERS
  // ================================================================

  const getRankColor = (rank: string) => {
    const rankColors: { [key: string]: string } = {
      'Bronze': '#CD7F32',
      'Silver': '#C0C0C0',
      'Gold': '#FFD700',
      'Platinum': '#E5E4E2',
      'Diamond': '#B9F2FF',
      'Master': '#FF6B6B',
      'Grandmaster': '#FF3838',
      'Legend': '#9B59B6',
    };
    return rankColors[rank] || '#87CEFA';
  };

  const getPositionStyles = () => {
    const baseTransform = [
      { scale: scaleAnim },
      { 
        translateY: slideAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [50, 0],
        })
      }
    ];

    switch (position) {
      case 'nearBanner':
        return {
          justifyContent: 'flex-start',
          marginTop: 120,
          transform: baseTransform,
        };
      case 'top':
        return {
          justifyContent: 'flex-start',
          marginTop: 60,
          transform: baseTransform,
        };
      case 'bottom':
        return {
          justifyContent: 'flex-end',
          marginBottom: 100,
          transform: baseTransform,
        };
      default:
        return {
          justifyContent: 'center',
          transform: baseTransform,
        };
    }
  };

  const formatLastSeen = (lastSeen?: Date) => {
    if (!lastSeen) return 'Unknown';
    const now = new Date();
    const diff = now.getTime() - lastSeen.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (minutes < 5) return 'Online';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  if (!userData) return null;

  return (
    <Modal 
      transparent 
      animationType="none" 
      visible={visible} 
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <Animated.View
            style={[
              styles.container,
              getPositionStyles(),
              { opacity: opacityAnim }
            ]}
          >
            <TouchableWithoutFeedback>
              <View>
                {/* Main Info Card */}
                <View style={styles.card}>
                  <View style={styles.cardGlow} />
                  
                  {/* Header with Avatar and Basic Info */}
                  <View style={styles.header}>
                    <View style={styles.avatarContainer}>
                      {userData.vip && (
                        <View style={styles.vipGlow} />
                      )}
                      <Image
                        source={{ 
                          uri: userData.profileImage || userData.avatar || 'https://via.placeholder.com/80' 
                        }}
                        style={styles.avatar}
                      />
                      {extendedInfo?.isOnline && (
                        <View style={styles.onlineIndicator} />
                      )}
                    </View>

                    <View style={styles.userInfo}>
                      <Text style={styles.username} numberOfLines={1}>
                        {userData.username}
                      </Text>
                      
                      {userData.rank && (
                        <View style={styles.rankContainer}>
                          <Text style={[styles.rank, { color: getRankColor(userData.rank) }]}>
                            ⚡ {userData.rank}
                          </Text>
                        </View>
                      )}
                      
                      {userData.vip && (
                        <View style={styles.vipContainer}>
                          <LinearGradient
                            colors={['#FFD700', '#FFA500']}
                            style={styles.vipBadge}
                          >
                            <Text style={styles.vipText}>👑 VIP</Text>
                          </LinearGradient>
                        </View>
                      )}
                    </View>

                    <TouchableOpacity 
                      style={styles.expandButton}
                      onPress={toggleExtendedInfo}
                    >
                      <Ionicons 
                        name={showExtended ? "chevron-up" : "chevron-down"} 
                        size={20} 
                        color="#00FFFF" 
                      />
                    </TouchableOpacity>
                  </View>

                  {/* Gaming-Style Stats Cards */}
                  <View style={styles.statsContainer}>
                    <View style={styles.statCard}>
                      <Text style={styles.statNumber}>{userStats.posts}</Text>
                      <Text style={styles.statLabel}>Posts</Text>
                    </View>
                    <View style={styles.statCard}>
                      <Text style={styles.statNumber}>{userStats.followers}</Text>
                      <Text style={styles.statLabel}>Followers</Text>
                    </View>
                    <View style={styles.statCard}>
                      <Text style={styles.statNumber}>{userStats.following}</Text>
                      <Text style={styles.statLabel}>Following</Text>
                    </View>
                  </View>

                  {/* Extended Info */}
                  {showExtended && extendedInfo && (
                    <Animated.View style={styles.extendedInfo}>
                      {extendedInfo.bio && (
                        <View style={styles.bioContainer}>
                          <Text style={styles.bio} numberOfLines={2}>
                            💬 {extendedInfo.bio}
                          </Text>
                        </View>
                      )}
                      <View style={styles.infoRow}>
                        <Text style={styles.lastSeen}>
                          🟢 {formatLastSeen(extendedInfo.lastSeen?.toDate())}
                        </Text>
                        {extendedInfo.joinedAt && (
                          <Text style={styles.joinedAt}>
                            📅 {extendedInfo.joinedAt.toDate().toLocaleDateString()}
                          </Text>
                        )}
                      </View>
                    </Animated.View>
                  )}

                  {/* Gaming-Style Action Buttons */}
                  <View style={styles.actionButtons}>
                    {authUser?.uid !== userData.uid && (
                      <Animated.View style={{ transform: [{ scale: followButtonScale }] }}>
                        <TouchableOpacity
                          style={[
                            styles.followButton,
                            following && styles.unfollowButton,
                            loading && styles.buttonDisabled,
                          ]}
                          onPress={handleFollowUnfollow}
                          disabled={loading}
                          activeOpacity={0.8}
                        >
                          {loading ? (
                            <ActivityIndicator size="small" color="#fff" />
                          ) : (
                            <>
                              <Ionicons 
                                name={following ? "person-remove" : "person-add"} 
                                size={18} 
                                color="#fff"
                                style={styles.buttonIcon}
                              />
                              <Text style={styles.followButtonText}>
                                {following ? 'Unfollow' : 'Follow'}
                              </Text>
                            </>
                          )}
                        </TouchableOpacity>
                      </Animated.View>
                    )}

                    <TouchableOpacity 
                      style={styles.moreInfoButton} 
                      onPress={() => {
                        handleMoreInfo();
                        // Navigate to user profile
                        // nav.navigate('UserProfile', { userId: userData.uid });
                      }}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="person-circle" size={18} color="#00FFFF" />
                      <Text style={styles.moreInfoButtonText}>View Profile</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </Animated.View>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  container: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  card: {
    width: Math.min(SCREEN_WIDTH - 40, 300),
    borderRadius: 20,
    padding: 0,
    backgroundColor: '#1a1a1a',
    borderWidth: 2,
    borderColor: '#00FFFF',
    shadowColor: '#00FFFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 15,
    overflow: 'hidden',
    position: 'relative',
  },
  cardGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 255, 255, 0.05)',
    borderRadius: 18,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 16,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 16,
  },
  vipGlow: {
    position: 'absolute',
    top: -6,
    left: -6,
    right: -6,
    bottom: -6,
    borderRadius: 42,
    backgroundColor: '#FFD700',
    opacity: 0.3,
  },
  avatar: {
    width: 70,
    height: 70,
    borderRadius: 35,
    borderWidth: 3,
    borderColor: '#00FFFF',
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#4CAF50',
    borderWidth: 3,
    borderColor: '#1a1a1a',
  },
  userInfo: {
    flex: 1,
  },
  username: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  rankContainer: {
    marginBottom: 4,
  },
  rank: {
    fontSize: 16,
    fontWeight: '700',
  },
  vipContainer: {
    alignSelf: 'flex-start',
  },
  vipBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 15,
  },
  vipText: {
    color: '#000',
    fontSize: 12,
    fontWeight: 'bold',
  },
  expandButton: {
    padding: 10,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 255, 255, 0.1)',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
    paddingVertical: 10,
    gap: 10,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: 'rgba(0, 255, 255, 0.1)',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 255, 0.2)',
  },
  statNumber: {
    color: '#00FFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  statLabel: {
    color: '#ccc',
    fontSize: 11,
    marginTop: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  extendedInfo: {
    padding: 20,
    paddingTop: 10,
  },
  bioContainer: {
    backgroundColor: 'rgba(0, 255, 255, 0.05)',
    padding: 12,
    borderRadius: 10,
    marginBottom: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#00FFFF',
  },
  bio: {
    color: '#ddd',
    fontSize: 14,
    lineHeight: 20,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  lastSeen: {
    color: '#4CAF50',
    fontSize: 12,
    fontWeight: '600',
  },
  joinedAt: {
    color: '#999',
    fontSize: 12,
  },
  actionButtons: {
    flexDirection: 'row',
    padding: 20,
    paddingTop: 10,
    gap: 12,
  },
  followButton: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#00FFFF',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unfollowButton: {
    backgroundColor: '#666',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonIcon: {
    marginRight: 8,
  },
  followButtonText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 14,
  },
  moreInfoButton: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: 'rgba(0, 255, 255, 0.1)',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#00FFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  moreInfoButtonText: {
    color: '#00FFFF',
    fontWeight: 'bold',
    fontSize: 14,
    marginLeft: 8,
  },
});

export default QuickInfoBox;