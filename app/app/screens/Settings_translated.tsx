// app/screens/SettingsScreen.tsx
import React, { useContext, useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  Switch,
  Alert,
  StyleSheet,
  Animated,
  Modal,
  ImageBackground,
  Linking,
  Platform,
} from 'react-native';
import { ThemeContext } from '@/context/ThemeContext';
import { getAuth, updateProfile } from 'firebase/auth';
import { updateDoc, doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/app/firebaseConfig';
import { Link, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { FontAwesome, MaterialIcons, Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

// ─── Custom Option Modal Component ──────────────────────────────
interface CustomOptionModalProps {
  visible: boolean;
  title: string;
  options: string[];
  selectedOption: string;
  neonColor: string;
  onSelect: (option: string) => void;
  onClose: () => void;
}

const CustomOptionModal: React.FC<CustomOptionModalProps> = ({
  visible,
  title,
  options,
  selectedOption,
  neonColor,
  onSelect,
  onClose,
}) => {
  const slideAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: visible ? 1 : 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [visible]);

  if (!visible) return null;

  return (
    <Modal transparent visible={visible} animationType="none">
      <TouchableOpacity
        style={modalStyles.modalBackground}
        activeOpacity={1}
        onPress={onClose}
      >
        <Animated.View
          style={[
            modalStyles.modalContainer,
            {
              transform: [
                {
                  translateY: slideAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [200, 0],
                  }),
                },
              ],
              borderColor: neonColor,
              shadowColor: neonColor,
            },
          ]}
        >
          <Text style={[modalStyles.modalTitle, { color: neonColor }]}>{title}</Text>
          {options.map((option) => (
            <TouchableOpacity
              key={option}
              style={[
                modalStyles.optionButton,
                option === selectedOption && {
                  borderColor: neonColor,
                  borderWidth: 2,
                },
              ]}
              onPress={() => {
                onSelect(option);
                onClose();
              }}
            >
              <Text style={modalStyles.optionText}>{option}</Text>
              {option === selectedOption && (
                <Ionicons
                  name="checkmark-circle"
                  size={20}
                  color={neonColor}
                  style={{ marginLeft: 8 }}
                />
              )}
            </TouchableOpacity>
          ))}
        </Animated.View>
      </TouchableOpacity>
    </Modal>
  );
};

const modalStyles = StyleSheet.create({
  modalBackground: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.06)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    marginHorizontal: 20,
    marginBottom: 40,
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    padding: 16,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  optionButton: {
    padding: 10,
    marginVertical: 4,
    borderRadius: 8,
    backgroundColor: '#2A2A2A',
    flexDirection: 'row',
    alignItems: 'center',
  },
  optionText: {
    color: '#FFF',
    fontSize: 16,
    flex: 1,
  },
});

// ─── Main Styles ─────────────────────────────────────────────────
const createStyles = () =>
  StyleSheet.create({
    container: {
      flex: 1,
    },
    // Full-screen background image
    background: {
      flex: 1,
      resizeMode: 'cover',
    },
    // Card container style with a semi-transparent image background
    cardContainer: {
      marginHorizontal: 16,
      marginBottom: 20,
      borderRadius: 2,
      overflow: 'hidden',
      shadowColor: '#00E5FF',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.9,
      shadowRadius: 10,
      elevation: 1,
    },
    // Overlay style for glowing text headers on cards
    cardContent: {
      padding: 16,
      backgroundColor: 'rgba(30, 30, 30, 0.11)',
    },
    sectionHeader: {
      fontSize: 20,
      fontWeight: 'bold',
      marginBottom: 12,
      color: '#00E5FF',
      textShadowColor: '#00E5FF',
      textShadowOffset: { width: 0, height: 0 },
      textShadowRadius: 10,
    },
    settingItem: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: 'rgba(181, 175, 175, 0.11)',
      padding: 12,
      borderRadius: 8,
      marginBottom: 10,
    },
    settingTitle: {
      flex: 1,
      fontSize: 16,
      color: '#FFF',
      marginLeft: 10,
    },
    icon: {
      width: 30,
      alignItems: 'center',
    },
    profileCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: 'rgba(0,0,0,0.3)',
      padding: 16,
      borderRadius: 12,
      marginBottom: 20,
      position: 'relative',
    },
    profileImage: {
      width: 80,
      height: 80,
      borderRadius: 40,
      borderWidth: 2,
      borderColor: '#FFD700',
    },
    profileInfo: {
      flex: 1,
      marginLeft: 16,
    },
    profileName: {
      fontSize: 20,
      fontWeight: 'bold',
      color: '#FFF',
    },
    editProfile: {
      position: 'absolute',
      top: 8,
      right: 8,
      flexDirection: 'row',
      alignItems: 'center',
    },
    editProfileText: {
      fontSize: 12,
      color: '#00E5FF',
      marginRight: 4,
    },
    button: {
      backgroundColor: '#FFD700',
      padding: 10,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.8,
      shadowRadius: 6,
      elevation: 5,
    },
    buttonText: {
      color: '#000',
      fontSize: 16,
      fontWeight: 'bold',
    },
  });

// ─── Main Component ──────────────────────────────────────────────
export default function SettingsScreen() {
  const { isDarkMode } = useContext(ThemeContext);
  const auth = getAuth();
  const currentUser = auth.currentUser;
  const router = useRouter();

  // Local state for settings
  const [username, setUsername] = useState(
    currentUser ? currentUser.displayName || 'User' : 'Not Logged In'
  );
  const [autoDetectLanguage, setAutoDetectLanguage] = useState(true);
  const [forumNotifications, setForumNotifications] = useState(true);
  const [gameUpdates, setGameUpdates] = useState(true);
  const [raffleReminders, setRaffleReminders] = useState(false);
  const [dailyChallengeReminders, setDailyChallengeReminders] = useState(true);
  const [viewPostsOption, setViewPostsOption] = useState<'Public' | 'Friends Only' | 'Private'>('Public');
  const [replyPostsOption, setReplyPostsOption] = useState<'Everyone' | 'Only Followers' | 'No One'>('Everyone');
  const [showReputation, setShowReputation] = useState(true);
  const [showRank, setShowRank] = useState(true);

  // State for custom option modals
  const [viewOptionModalVisible, setViewOptionModalVisible] = useState(false);
  const [replyOptionModalVisible, setReplyOptionModalVisible] = useState(false);

  const styles = createStyles();

  // Animated fade-in effect for the screen
  const fadeAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, []);

  // Listen for Firestore updates
  useEffect(() => {
    if (currentUser) {
      const userDocRef = doc(db, 'users', currentUser.uid);
      const unsubscribe = onSnapshot(userDocRef, (docSnapshot) => {
        const data = docSnapshot.data();
        if (data) {
          setAutoDetectLanguage(data.autoDetectLanguage ?? true);
          setForumNotifications(data.forumNotifications ?? true);
          setGameUpdates(data.gameUpdates ?? true);
          setRaffleReminders(data.raffleReminders ?? false);
          setDailyChallengeReminders(data.dailyChallengeReminders ?? true);
          setViewPostsOption(data.viewPostsOption ?? 'Public');
          setReplyPostsOption(data.replyPostsOption ?? 'Everyone');
          setShowReputation(data.showReputation ?? true);
          setShowRank(data.showRank ?? true);
          setUsername(data.username ?? (currentUser.displayName || 'User'));
        }
      });
      return () => unsubscribe();
    }
  }, [currentUser]);

  // Helper function: update a specific field in Firestore.
  const updateUserSetting = async (field: string, value: any) => {
    if (currentUser) {
      try {
        await updateDoc(doc(db, 'users', currentUser.uid), { [field]: value });
      } catch (error: any) {
        Alert.alert('Error', 'Failed to update setting: ' + error.message);
      }
    } else {
      Alert.alert('Not Logged In', 'No user is currently logged in.');
    }
  };

  // Haptic feedback helper
  const triggerHaptic = () => {
    Haptics.selectionAsync();
  };

  // Handle navigation to UserProfileScreen
  const handleProfilePress = () => {
    triggerHaptic();
    router.push('/screens/UserProfileScreen');
  };

  // Handle Change Username
  const handleChangeUsername = () => {
    triggerHaptic();
    Alert.prompt(
      'Change Username',
      'Enter a new username',
      (newUsername) => {
        if (!newUsername || newUsername.trim() === '') {
          Alert.alert('Invalid Input', 'Username cannot be empty.');
          return;
        }
        if (currentUser) {
          updateProfile(currentUser, { displayName: newUsername })
            .then(() => {
              setUsername(newUsername);
              Alert.alert('Success', 'Username updated successfully!');
              updateUserSetting('username', newUsername);
            })
            .catch((error) => {
              Alert.alert('Error', error.message);
            });
        } else {
          Alert.alert('Error', 'No user is currently logged in.');
        }
      },
      'plain-text',
      username
    );
  };

  // Render a card section with a header and content using image background
  const renderCardSection = (header: string, neonColor: string, children: React.ReactNode) => (
    <ImageBackground
      source={require('../../assets/images/postbg.png')}
      style={styles.cardContainer}
      imageStyle={{ opacity: 0.5 }}
    >
      <View style={styles.cardContent}>
        <Text style={[styles.sectionHeader, { color: neonColor }]}>{header}</Text>
        {children}
      </View>
    </ImageBackground>
  );

  // ── New: App Info & Legal Section ──
  const handleRateApp = () => {
    triggerHaptic();
    Alert.alert(
      'Rate This App',
      'Would you like to rate the app?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Rate',
          onPress: () => {
            const url =
              Platform.OS === 'ios'
                ? 'https://apps.apple.com/app/id-YOUR_APP_ID'
                : 'https://play.google.com/store/apps/details?id=YOUR_PACKAGE_NAME';
            Linking.openURL(url).catch(err => Alert.alert('Error', 'Could not open store URL.'));
          },
        },
      ],
      { cancelable: true }
    );
  };

  // ── Main Content ──
  const content = (
    <Animated.View style={{ opacity: fadeAnim, paddingBottom: 20 }}>
      {/* Profile & Account Section */}
      {renderCardSection('Profile & Account', '#00FFD1', (
        <>
          {currentUser ? (
            <TouchableOpacity
              style={styles.profileCard}
              onPress={handleProfilePress}
            >
              <Image
                source={require('../../assets/images/avatar.png')}
                style={styles.profileImage}
              />
              <View style={styles.profileInfo}>
                <Text style={styles.profileName}>{username}</Text>
              </View>
              <TouchableOpacity
                style={styles.editProfile}
                onPress={handleProfilePress}
              >
                <Text style={styles.editProfileText}>Edit Profile</Text>
                <MaterialIcons
                  name="edit"
                  size={16}
                  color="#00E5FF"
                />
              </TouchableOpacity>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.profileCard}
              onPress={() =>
                Alert.alert('Not Logged In', 'Please log in to access your profile.')
              }
            >
              <Image
                source={require('../../assets/images/avatar.png')}
                style={styles.profileImage}
              />
              <View style={styles.profileInfo}>
                <Text style={styles.profileName}>Not Logged In</Text>
              </View>
            </TouchableOpacity>
          )}
        </>
      ))}

      {/* Notifications & Alerts Section */}
      {renderCardSection('Notifications & Alerts', '#00FF87', (
        <>
          <TouchableOpacity
            style={styles.settingItem}
            onPress={async () => {
              triggerHaptic();
              const newVal = !forumNotifications;
              setForumNotifications(newVal);
              await updateUserSetting('forumNotifications', newVal);
            }}
          >
            <View style={styles.icon}>
              <FontAwesome
                name="bell-o"
                size={20}
                color="#00E5FF"
              />
            </View>
            <Text style={styles.settingTitle}>Forum Notifications</Text>
            <Switch
              value={forumNotifications}
              onValueChange={async (value) => {
                triggerHaptic();
                setForumNotifications(value);
                await updateUserSetting('forumNotifications', value);
              }}
              thumbColor={forumNotifications ? '#00E5FF' : '#CCC'}
              trackColor={{ false: '#444', true: '#666' }}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.settingItem}
            onPress={async () => {
              triggerHaptic();
              const newVal = !gameUpdates;
              setGameUpdates(newVal);
              await updateUserSetting('gameUpdates', newVal);
            }}
          >
            <View style={styles.icon}>
              <FontAwesome
                name="gamepad"
                size={20}
                color="#00E5FF"
              />
            </View>
            <Text style={styles.settingTitle}>Game Updates & Meta Changes</Text>
            <Switch
              value={gameUpdates}
              onValueChange={async (value) => {
                triggerHaptic();
                setGameUpdates(value);
                await updateUserSetting('gameUpdates', value);
              }}
              thumbColor={gameUpdates ? '#00E5FF' : '#CCC'}
              trackColor={{ false: '#444', true: '#666' }}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.settingItem}
            onPress={async () => {
              triggerHaptic();
              const newVal = !raffleReminders;
              setRaffleReminders(newVal);
              await updateUserSetting('raffleReminders', newVal);
            }}
          >
            <View style={styles.icon}>
              <FontAwesome
                name="ticket"
                size={20}
                color="#00E5FF"
              />
            </View>
            <Text style={styles.settingTitle}>FC Points Raffle Reminders</Text>
            <Switch
              value={raffleReminders}
              onValueChange={async (value) => {
                triggerHaptic();
                setRaffleReminders(value);
                await updateUserSetting('raffleReminders', value);
              }}
              thumbColor={raffleReminders ? '#00E5FF' : '#CCC'}
              trackColor={{ false: '#444', true: '#666' }}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.settingItem}
            onPress={async () => {
              triggerHaptic();
              const newVal = !dailyChallengeReminders;
              setDailyChallengeReminders(newVal);
              await updateUserSetting('dailyChallengeReminders', newVal);
            }}
          >
            <View style={styles.icon}>
              <Ionicons
                name="calendar-outline"
                size={20}
                color="#00E5FF"
              />
            </View>
            <Text style={styles.settingTitle}>Daily Challenge Reminders</Text>
            <Switch
              value={dailyChallengeReminders}
              onValueChange={async (value) => {
                triggerHaptic();
                setDailyChallengeReminders(value);
                await updateUserSetting('dailyChallengeReminders', value);
              }}
              thumbColor={dailyChallengeReminders ? '#00E5FF' : '#CCC'}
              trackColor={{ false: '#444', true: '#666' }}
            />
          </TouchableOpacity>
        </>
      ))}

      {/* Privacy & Security Section */}
      {renderCardSection('Privacy & Security', '#33CCFF', (
        <>
          <TouchableOpacity
            style={styles.settingItem}
            onPress={() => setViewOptionModalVisible(true)}
          >
            <View style={styles.icon}>
              <FontAwesome
                name="lock"
                size={20}
                color="#00E5FF"
              />
            </View>
            <Text style={styles.settingTitle}>Who Can View My Posts?</Text>
            <Ionicons
              name="chevron-forward"
              size={20}
              color="#00E5FF"
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.settingItem}
            onPress={() => setReplyOptionModalVisible(true)}
          >
            <View style={styles.icon}>
              <FontAwesome
                name="comment-o"
                size={20}
                color="#00E5FF"
              />
            </View>
            <Text style={styles.settingTitle}>Who Can Reply to My Posts?</Text>
            <Ionicons
              name="chevron-forward"
              size={20}
              color="#00E5FF"
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.settingItem}
            onPress={async () => {
              triggerHaptic();
              const newVal = !showReputation;
              setShowReputation(newVal);
              await updateUserSetting('showReputation', newVal);
            }}
          >
            <View style={styles.icon}>
              <FontAwesome
                name="star-o"
                size={20}
                color="#00E5FF"
              />
            </View>
            <Text style={styles.settingTitle}>Show Reputation on My Profile</Text>
            <Switch
              value={showReputation}
              onValueChange={async (value) => {
                triggerHaptic();
                setShowReputation(value);
                await updateUserSetting('showReputation', value);
              }}
              thumbColor={showReputation ? '#00E5FF' : '#CCC'}
              trackColor={{ false: '#444', true: '#666' }}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.settingItem}
            onPress={async () => {
              triggerHaptic();
              const newVal = !showRank;
              setShowRank(newVal);
              await updateUserSetting('showRank', newVal);
            }}
          >
            <View style={styles.icon}>
              <FontAwesome
                name="trophy"
                size={20}
                color="#00E5FF"
              />
            </View>
            <Text style={styles.settingTitle}>Show Rank on My Profile</Text>
            <Switch
              value={showRank}
              onValueChange={async (value) => {
                triggerHaptic();
                setShowRank(value);
                await updateUserSetting('showRank', value);
              }}
              thumbColor={showRank ? '#00E5FF' : '#CCC'}
              trackColor={{ false: '#444', true: '#666' }}
            />
          </TouchableOpacity>
        </>
      ))}

      {/* App Info & Legal Section */}
      {renderCardSection('App Info & Legal', '#0088FF', (
        <>
          <TouchableOpacity
            style={styles.settingItem}
            onPress={() => {
              triggerHaptic();
              router.push('/screens/AboutApp');
            }}
          >
            <View style={styles.icon}>
              <FontAwesome
                name="info-circle"
                size={20}
                color="#0088FF"
              />
            </View>
            <Text style={styles.settingTitle}>About This App</Text>
            <Ionicons
              name="chevron-forward"
              size={20}
              color="#0088FF"
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.settingItem}
            onPress={() => {
              triggerHaptic();
              router.push('/screens/PrivacyPolicy');
            }}
          >
            <View style={styles.icon}>
              <FontAwesome
                name="file-text-o"
                size={20}
                color="#0088FF"
              />
            </View>
            <Text style={styles.settingTitle}>Privacy & Cookie Policy</Text>
            <Ionicons
              name="chevron-forward"
              size={20}
              color="#0088FF"
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.settingItem}
            onPress={handleRateApp}
          >
            <View style={styles.icon}>
              <FontAwesome
                name="star"
                size={20}
                color="#0088FF"
              />
            </View>
            <Text style={styles.settingTitle}>Rate This App</Text>
            <Ionicons
              name="chevron-forward"
              size={20}
              color="#0088FF"
            />
          </TouchableOpacity>
        </>
      ))}
    </Animated.View>
  );

  return (
    <ImageBackground
      source={require('../../assets/images/settingsbk.png')}
      style={styles.background}
    >
      <ScrollView
        contentContainerStyle={{
          paddingTop: 80,
          paddingBottom: 20,
          minHeight: '100%',
        }}
      >
        {content}
      </ScrollView>
      {/* Custom Option Modals */}
      <CustomOptionModal
        visible={viewOptionModalVisible}
        title="Who Can View My Posts?"
        options={['Public', 'Friends Only', 'Private']}
        selectedOption={viewPostsOption}
        neonColor="#33CCFF"
        onSelect={(option) => {
          setViewPostsOption(option);
          updateUserSetting('viewPostsOption', option);
        }}
        onClose={() => setViewOptionModalVisible(false)}
      />
      <CustomOptionModal
        visible={replyOptionModalVisible}
        title="Who Can Reply to My Posts?"
        options={['Everyone', 'Only Followers', 'No One']}
        selectedOption={replyPostsOption}
        neonColor="#33CCFF"
        onSelect={(option) => {
          setReplyPostsOption(option);
          updateUserSetting('replyPostsOption', option);
        }}
        onClose={() => setReplyOptionModalVisible(false)}
      />
    </ImageBackground>
  );
}
