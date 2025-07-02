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

// ------------------- Custom Option Modal Component -------------------
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
  console.log("CustomOptionModal: Component mounted. Initial visibility: " + visible);

  useEffect(() => {
    console.log("CustomOptionModal: useEffect triggered. Visibility changed to: " + visible);
    Animated.timing(slideAnim, {
      toValue: visible ? 1 : 0,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      console.log("CustomOptionModal: Slide animation " + (visible ? "completed (opened)" : "completed (closed)"));
    });
  }, [visible]);

  if (!visible) {
    console.log("CustomOptionModal: Modal is not visible, returning null.");
    return null;
  }

  return (
    <Modal transparent visible={visible} animationType="none">
      <TouchableOpacity
        style={modalStyles.modalBackground}
        activeOpacity={1}
        onPress={() => {
          console.log("CustomOptionModal: Background pressed, closing modal.");
          onClose();
        }}
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
                console.log("CustomOptionModal: Option '" + option + "' selected.");
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

// ------------------- Main Styles -------------------
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

// ------------------- Main Component -------------------
export default function SettingsScreen() {
  console.log("SettingsScreen: Component rendering initiated.");
  const { isDarkMode } = useContext(ThemeContext);
  console.log("SettingsScreen: Dark mode status fetched: " + isDarkMode);
  const auth = getAuth();
  console.log("SettingsScreen: Firebase auth instance retrieved.");
  const currentUser = auth.currentUser;
  console.log("SettingsScreen: Current user: " + (currentUser ? currentUser.uid : "None"));
  const router = useRouter();
  console.log("SettingsScreen: Expo router instance retrieved.");

  // Local state for settings
  const [username, setUsername] = useState(
    currentUser ? currentUser.displayName || 'User' : 'Not Logged In'
  );
  console.log("SettingsScreen: Initial username state set to: " + username);
  const [autoDetectLanguage, setAutoDetectLanguage] = useState(true);
  console.log("SettingsScreen: Initial autoDetectLanguage state set to: " + autoDetectLanguage);
  const [forumNotifications, setForumNotifications] = useState(true);
  console.log("SettingsScreen: Initial forumNotifications state set to: " + forumNotifications);
  const [gameUpdates, setGameUpdates] = useState(true);
  console.log("SettingsScreen: Initial gameUpdates state set to: " + gameUpdates);
  const [raffleReminders, setRaffleReminders] = useState(false);
  console.log("SettingsScreen: Initial raffleReminders state set to: " + raffleReminders);
  const [dailyChallengeReminders, setDailyChallengeReminders] = useState(true);
  console.log("SettingsScreen: Initial dailyChallengeReminders state set to: " + dailyChallengeReminders);
  const [viewPostsOption, setViewPostsOption] = useState<'Public' | 'Friends Only' | 'Private'>('Public');
  console.log("SettingsScreen: Initial viewPostsOption state set to: " + viewPostsOption);
  const [replyPostsOption, setReplyPostsOption] = useState<'Everyone' | 'Only Followers' | 'No One'>('Everyone');
  console.log("SettingsScreen: Initial replyPostsOption state set to: " + replyPostsOption);
  const [showReputation, setShowReputation] = useState(true);
  console.log("SettingsScreen: Initial showReputation state set to: " + showReputation);
  const [showRank, setShowRank] = useState(true);
  console.log("SettingsScreen: Initial showRank state set to: " + showRank);

  // State for custom option modals
  const [viewOptionModalVisible, setViewOptionModalVisible] = useState(false);
  console.log("SettingsScreen: Initial viewOptionModalVisible state set to: " + viewOptionModalVisible);
  const [replyOptionModalVisible, setReplyOptionModalVisible] = useState(false);
  console.log("SettingsScreen: Initial replyOptionModalVisible state set to: " + replyOptionModalVisible);

  const styles = createStyles();

  // Animated fade-in effect for the screen
  const fadeAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    console.log("SettingsScreen: Fade-in animation starting for screen.");
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start(() => {
      console.log("SettingsScreen: Fade-in animation completed.");
    });
  }, []);

  // Listen for Firestore updates
  useEffect(() => {
    console.log("SettingsScreen: useEffect for Firestore listener triggered.");
    if (currentUser) {
      console.log("SettingsScreen: Setting up Firestore listener for user: " + currentUser.uid);
      const userDocRef = doc(db, 'users', currentUser.uid);
      const unsubscribe = onSnapshot(userDocRef, (docSnapshot) => {
        console.log("SettingsScreen: Firestore docSnapshot received.");
        const data = docSnapshot.data();
        if (data) {
          console.log("SettingsScreen: Firestore data received: " + JSON.stringify(data));
          setAutoDetectLanguage(data.autoDetectLanguage ?? true);
          console.log("SettingsScreen: autoDetectLanguage state updated to: " + (data.autoDetectLanguage ?? true));
          setForumNotifications(data.forumNotifications ?? true);
          console.log("SettingsScreen: forumNotifications state updated to: " + (data.forumNotifications ?? true));
          setGameUpdates(data.gameUpdates ?? true);
          console.log("SettingsScreen: gameUpdates state updated to: " + (data.gameUpdates ?? true));
          setRaffleReminders(data.raffleReminders ?? false);
          console.log("SettingsScreen: raffleReminders state updated to: " + (data.raffleReminders ?? false));
          setDailyChallengeReminders(data.dailyChallengeReminders ?? true);
          console.log("SettingsScreen: dailyChallengeReminders state updated to: " + (data.dailyChallengeReminders ?? true));
          setViewPostsOption(data.viewPostsOption ?? 'Public');
          console.log("SettingsScreen: viewPostsOption state updated to: " + (data.viewPostsOption ?? 'Public'));
          setReplyPostsOption(data.replyPostsOption ?? 'Everyone');
          console.log("SettingsScreen: replyPostsOption state updated to: " + (data.replyPostsOption ?? 'Everyone'));
          setShowReputation(data.showReputation ?? true);
          console.log("SettingsScreen: showReputation state updated to: " + (data.showReputation ?? true));
          setShowRank(data.showRank ?? true);
          console.log("SettingsScreen: showRank state updated to: " + (data.showRank ?? true));
          setUsername(data.username ?? (currentUser.displayName || 'User'));
          console.log("SettingsScreen: username state updated to: " + (data.username ?? (currentUser.displayName || 'User')));
        } else {
          console.log("SettingsScreen: No data found for user doc.");
        }
      });
      return () => {
        console.log("SettingsScreen: Firestore listener unsubscribed on cleanup.");
        unsubscribe();
      };
    } else {
      console.log("SettingsScreen: No current user, Firestore listener not set up.");
    }
  }, [currentUser]);

  // Helper function: update a specific field in Firestore.
  const updateUserSetting = async (field: string, value: any) => {
    console.log("SettingsScreen: updateUserSetting called for field: " + field + ", value: " + value);
    if (currentUser) {
      try {
        console.log("SettingsScreen: Attempting to update Firestore doc for field: " + field);
        await updateDoc(doc(db, 'users', currentUser.uid), { [field]: value });
        console.log("SettingsScreen: Firestore update successful for field: " + field);
      } catch (error: any) {
        console.log("SettingsScreen: Firestore update failed for field: " + field + ". Error: " + error.message);
        Alert.alert('Error', 'Failed to update setting: ' + error.message);
      }
    } else {
      console.log("SettingsScreen: Not logged in. Cannot update user settings.");
      Alert.alert('Not Logged In', 'No user is currently logged in.');
    }
  };

  // Haptic feedback helper
  const triggerHaptic = () => {
    console.log("SettingsScreen: Haptic feedback triggered.");
    Haptics.selectionAsync();
  };

  // Handle navigation to UserProfileScreen
  const handleProfilePress = () => {
    console.log("SettingsScreen: Profile card pressed. Initiating haptic feedback and navigation to UserProfileScreen.");
    triggerHaptic();
    router.push('/screens/UserProfileScreen');
  };

  // Handle Change Username
  const handleChangeUsername = () => {
    console.log("SettingsScreen: Change Username button pressed. Triggering haptic feedback.");
    triggerHaptic();
    Alert.prompt(
      'Change Username',
      'Enter a new username',
      (newUsername) => {
        console.log("SettingsScreen: Username prompt input received: " + newUsername);
        if (!newUsername || newUsername.trim() === '') {
          console.log("SettingsScreen: Invalid input: Username cannot be empty.");
          Alert.alert('Invalid Input', 'Username cannot be empty.');
          return;
        }
        if (currentUser) {
          console.log("SettingsScreen: Updating Firebase Auth profile display name to: " + newUsername);
          updateProfile(currentUser, { displayName: newUsername })
            .then(() => {
              console.log("SettingsScreen: Firebase Auth display name updated successfully.");
              setUsername(newUsername);
              console.log("SettingsScreen: Local username state updated to: " + newUsername);
              Alert.alert('Success', 'Username updated successfully!');
              console.log("SettingsScreen: Calling updateUserSetting for username.");
              updateUserSetting('username', newUsername);
            })
            .catch((error) => {
              console.log("SettingsScreen: Error updating Firebase Auth display name: " + error.message);
              Alert.alert('Error', error.message);
            });
        } else {
          console.log("SettingsScreen: User not logged in, cannot change username.");
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

  // New: App Info & Legal Section
  const handleRateApp = () => {
    console.log("SettingsScreen: Rate App button pressed. Triggering haptic feedback.");
    triggerHaptic();
    Alert.alert(
      'Rate This App',
      'Would you like to rate the app?',
      [
        { text: 'Cancel', style: 'cancel', onPress: () => console.log("SettingsScreen: Rate App cancelled.") },
        {
          text: 'Rate',
          onPress: () => {
            console.log("SettingsScreen: User chose to rate the app.");
            const url =
              Platform.OS === 'ios'
                ? 'https://apps.apple.com/app/id-YOUR_APP_ID'
                : 'https://play.google.com/store/apps/details?id=YOUR_PACKAGE_NAME';
            console.log("SettingsScreen: Attempting to open URL: " + url);
            Linking.openURL(url).catch(err => {
              console.log("SettingsScreen: Failed to open store URL. Error: " + err.message);
              Alert.alert('Error', 'Could not open store URL.');
            });
          },
        },
      ],
      { cancelable: true }
    );
  };

  // Main Content
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
              onPress={() => {
                console.log("SettingsScreen: Not Logged In profile card pressed.");
                Alert.alert('Not Logged In', 'Please log in to access your profile.');
              }}
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
              console.log("SettingsScreen: Forum Notifications pressed. New value: " + newVal);
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
                console.log("SettingsScreen: Forum Notifications switch toggled to: " + value);
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
              console.log("SettingsScreen: Game Updates pressed. New value: " + newVal);
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
                console.log("SettingsScreen: Game Updates switch toggled to: " + value);
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
              console.log("SettingsScreen: FC Points Raffle Reminders pressed. New value: " + newVal);
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
                console.log("SettingsScreen: FC Points Raffle Reminders switch toggled to: " + value);
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
              console.log("SettingsScreen: Daily Challenge Reminders pressed. New value: " + newVal);
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
                console.log("SettingsScreen: Daily Challenge Reminders switch toggled to: " + value);
                await updateUserSetting('dailyChallengeReminders', value);
              }}
              thumbColor={dailyChallengeReminders ? '#00E5FF' : '#CCC'}
              trackColor={{ false: '#444', true: '#666' }}
            />
          </TouchableOpacity>
        </>
      ))}

      {/* Privacy & Security Section */}
      {renderCardSection('Privacy & Security', '#33CCF6', (
        <>
          <TouchableOpacity
            style={styles.settingItem}
            onPress={() => {
              console.log("SettingsScreen: 'Who Can View My Posts?' pressed. Opening modal.");
              setViewOptionModalVisible(true);
            }}
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
            onPress={() => {
              console.log("SettingsScreen: 'Who Can Reply to My Posts?' pressed. Opening modal.");
              setReplyOptionModalVisible(true);
            }}
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
              console.log("SettingsScreen: 'Show Reputation on My Profile' pressed. New value: " + newVal);
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
                console.log("SettingsScreen: 'Show Reputation on My Profile' switch toggled to: " + value);
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
              console.log("SettingsScreen: 'Show Rank on My Profile' pressed. New value: " + newVal);
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
                console.log("SettingsScreen: 'Show Rank on My Profile' switch toggled to: " + value);
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
              console.log("SettingsScreen: 'About This App' pressed. Navigating to AboutApp screen.");
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
              console.log("SettingsScreen: 'Privacy & Cookie Policy' pressed. Navigating to PrivacyPolicy screen.");
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

  console.log("SettingsScreen: Component return rendering.");
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
        neonColor="#33CCF6"
        onSelect={(option) => {
          setViewPostsOption(option);
          console.log("SettingsScreen: View posts option selected: " + option);
          updateUserSetting('viewPostsOption', option);
        }}
        onClose={() => {
          console.log("SettingsScreen: View posts modal closed.");
          setViewOptionModalVisible(false);
        }}
      />
      <CustomOptionModal
        visible={replyOptionModalVisible}
        title="Who Can Reply to My Posts?"
        options={['Everyone', 'Only Followers', 'No One']}
        selectedOption={replyPostsOption}
        neonColor="#33CCF6"
        onSelect={(option) => {
          setReplyPostsOption(option);
          console.log("SettingsScreen: Reply posts option selected: " + option);
          updateUserSetting('replyPostsOption', option);
        }}
        onClose={() => {
          console.log("SettingsScreen: Reply posts modal closed.");
          setReplyOptionModalVisible(false);
        }}
      />
    </ImageBackground>
  );
}