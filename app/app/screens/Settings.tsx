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
import { db } from '@/app/firebaseConfig'; // Make sure this path is correct
import { useRouter } from 'expo-router';
import { FontAwesome, MaterialIcons, Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

// Import your i18n setup
import i18n from '../i18n/i18n'; // Adjust path if necessary

// ─── Language Options ───────────────────────────────────────────
const languageOptions = [
  { name: 'English', code: 'en' },
  { name: 'Français', code: 'fr' },
  { name: 'Español', code: 'es' },
  { name: '简体中文', code: 'zh-CN' },
  { name: '繁體中文', code: 'zh-TW' },
  { name: 'العربية', code: 'ar' },
  { name: 'Deutsch', code: 'de' },
  { name: '日本語', code: 'ja' },
  { name: '한국어', code: 'ko' },
];

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

  // Do not render if not visible to avoid unnecessary computations
  // if (!visible) return null; // Keep this commented if you prefer the modal to always be in the tree for animations

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={onClose}>
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
                    outputRange: [300, 0], // Start from further down
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
                  backgroundColor: neonColor + '33', // Slight highlight for selected
                  borderColor: neonColor,
                  borderWidth: 1,
                },
              ]}
              onPress={() => {
                onSelect(option);
                // onClose(); // Keep modal open if needed, or close as intended
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
    backgroundColor: 'rgba(0, 0, 0, 0.6)', // Darker background
    justifyContent: 'flex-end',
  },
  modalContainer: {
    marginHorizontal: 10, // Less horizontal margin
    marginBottom: Platform.OS === 'ios' ? 30 : 20, // Adjust for notch/navbar
    backgroundColor: '#1A1A1A', // Darker modal
    borderRadius: 15, // More rounded
    padding: 20,
    shadowOffset: { width: 0, height: -2 }, // Shadow upwards
    shadowOpacity: 0.5,
    shadowRadius: 15,
    elevation: 10, // For Android
    borderWidth: 1,
  },
  modalTitle: {
    fontSize: 20, // Larger title
    fontWeight: '600', // Semi-bold
    marginBottom: 15,
    textAlign: 'center',
  },
  optionButton: {
    paddingVertical: 12, // More padding
    paddingHorizontal: 15,
    marginVertical: 5,
    borderRadius: 10,
    backgroundColor: '#2C2C2C', // Darker buttons
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between', // Ensure checkmark is on the right
  },
  optionText: {
    color: '#E0E0E0', // Lighter text for contrast
    fontSize: 17, // Larger text
  },
});

// ─── Main Styles ─────────────────────────────────────────────────
const createStyles = () =>
  StyleSheet.create({
    container: {
      flex: 1,
    },
    background: {
      flex: 1,
      resizeMode: 'cover',
    },
    cardContainer: {
      marginHorizontal: 16,
      marginBottom: 20,
      borderRadius: 12, // More rounded cards
      overflow: 'hidden',
      shadowColor: '#00E5FF',
      shadowOffset: { width: 0, height: 2 }, // Softer shadow
      shadowOpacity: 0.6, // Less intense shadow
      shadowRadius: 8,  // Smaller radius
      elevation: 5,     // Adjusted elevation for Android
      borderWidth: 1,
      borderColor: 'rgba(0, 229, 255, 0.2)', // Subtle border matching neon
    },
    cardContent: {
      padding: 16,
      backgroundColor: 'rgba(20, 20, 20, 0.85)', // Darker, more opaque background for readability
    },
    sectionHeader: {
      fontSize: 20,
      fontWeight: 'bold',
      marginBottom: 12,
      color: '#00E5FF', // Default neon color
      textShadowColor: '#00E5FF',
      textShadowOffset: { width: 0, height: 0 },
      textShadowRadius: 8, // Slightly smaller glow
    },
    settingItem: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: 'rgba(255, 255, 255, 0.05)', // Very subtle background
      paddingVertical: 12,
      paddingHorizontal: 10,
      borderRadius: 8,
      marginBottom: 10,
    },
    settingTitle: {
      flex: 1,
      fontSize: 16,
      color: '#E0E0E0', // Lighter text
      marginLeft: 12, // More spacing from icon
    },
    settingValue: { // For displaying selected language
      fontSize: 16,
      color: '#00E5FF', // Neon color for the value
      marginRight: 8,
    },
    icon: {
      width: 24, // Standardized icon width
      alignItems: 'center',
    },
    profileCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: 'rgba(0,0,0,0.5)', // Darker profile card
      padding: 16,
      borderRadius: 12,
      marginBottom: 20,
      position: 'relative',
      borderWidth: 1,
      borderColor: 'rgba(255, 215, 0, 0.3)', // Subtle gold border
    },
    profileImage: {
      width: 70, // Slightly smaller
      height: 70,
      borderRadius: 35,
      borderWidth: 2,
      borderColor: '#FFD700', // Gold border
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
      top: 12,
      right: 12,
      flexDirection: 'row',
      alignItems: 'center',
      padding: 6, // Add padding for easier tap
      backgroundColor: 'rgba(0,0,0,0.3)',
      borderRadius: 6,
    },
    editProfileText: {
      fontSize: 12,
      color: '#00E5FF',
      marginRight: 4,
    },
  });

// ─── Main Component ──────────────────────────────────────────────
export default function SettingsScreen() {
  const { isDarkMode } = useContext(ThemeContext); // Assuming ThemeContext provides this
  const auth = getAuth();
  const currentUser = auth.currentUser;
  const router = useRouter();

  // Local state for settings
  const [username, setUsername] = useState(
    currentUser ? currentUser.displayName || i18n.t('settings.defaultUsername') : i18n.t('settings.notLoggedIn')
  );
  // NEW: Language state
  const [selectedLanguageCode, setSelectedLanguageCode] = useState(i18n.language);
  const [languageModalVisible, setLanguageModalVisible] = useState(false);

  const [forumNotifications, setForumNotifications] = useState(true);
  const [gameUpdates, setGameUpdates] = useState(true);
  const [raffleReminders, setRaffleReminders] = useState(false);
  const [dailyChallengeReminders, setDailyChallengeReminders] = useState(true);
  const [viewPostsOption, setViewPostsOption] = useState<'Public' | 'Friends Only' | 'Private'>('Public');
  const [replyPostsOption, setReplyPostsOption] = useState<'Everyone' | 'Only Followers' | 'No One'>('Everyone');
  const [showReputation, setShowReputation] = useState(true);
  const [showRank, setShowRank] = useState(true);

  const [viewOptionModalVisible, setViewOptionModalVisible] = useState(false);
  const [replyOptionModalVisible, setReplyOptionModalVisible] = useState(false);

  const styles = createStyles();
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, []);

  // Listen for Firestore updates and initialize language
  useEffect(() => {
    if (currentUser) {
      const userDocRef = doc(db, 'users', currentUser.uid);
      const unsubscribe = onSnapshot(userDocRef, (docSnapshot) => {
        const data = docSnapshot.data();
        if (data) {
          setUsername(data.username ?? (currentUser.displayName || i18n.t('settings.defaultUsername')));
          setForumNotifications(data.forumNotifications ?? true);
          setGameUpdates(data.gameUpdates ?? true);
          setRaffleReminders(data.raffleReminders ?? false);
          setDailyChallengeReminders(data.dailyChallengeReminders ?? true);
          setViewPostsOption(data.viewPostsOption ?? 'Public');
          setReplyPostsOption(data.replyPostsOption ?? 'Everyone');
          setShowReputation(data.showReputation ?? true);
          setShowRank(data.showRank ?? true);

          // Load and set language
          const savedLangCode = data.language || 'en'; // Default to English if not set
          if (savedLangCode !== i18n.language) {
            i18n.changeLanguage(savedLangCode).then(() => {
              setSelectedLanguageCode(savedLangCode);
            });
          } else {
            setSelectedLanguageCode(savedLangCode);
          }
        } else {
          // If no data, set default language
           if (i18n.language !== 'en') {
            i18n.changeLanguage('en').then(() => {
                setSelectedLanguageCode('en');
            });
           } else {
            setSelectedLanguageCode('en');
           }
        }
      });
      return () => unsubscribe();
    } else {
      // Handle case for non-logged-in user, default to current i18n language or 'en'
      const currentAppLang = i18n.language || 'en';
      setSelectedLanguageCode(currentAppLang);
      if (i18n.language !== currentAppLang) {
        i18n.changeLanguage(currentAppLang);
      }
    }
  }, [currentUser]);


  const updateUserSetting = async (field: string, value: any) => {
    if (currentUser) {
      try {
        await updateDoc(doc(db, 'users', currentUser.uid), { [field]: value });
      } catch (error: any) {
        Alert.alert(i18n.t('settings.errorAlertTitle'), i18n.t('settings.errorUpdatingSetting') + error.message);
      }
    } else {
      Alert.alert(i18n.t('settings.notLoggedInTitle'), i18n.t('settings.notLoggedInMessage'));
    }
  };

  const triggerHaptic = () => {
    Haptics.selectionAsync();
  };

  const handleProfilePress = () => {
    triggerHaptic();
    router.push('/screens/UserProfileScreen'); // Ensure this route exists
  };

  const handleChangeUsername = () => {
    triggerHaptic();
    Alert.prompt(
      i18n.t('settings.changeUsernameTitle'),
      i18n.t('settings.changeUsernameMessage'),
      async (newUsername) => {
        if (!newUsername || newUsername.trim() === '') {
          Alert.alert(i18n.t('settings.invalidInputTitle'), i18n.t('settings.usernameCannotBeEmpty'));
          return;
        }
        if (currentUser) {
          try {
            await updateProfile(currentUser, { displayName: newUsername });
            setUsername(newUsername);
            await updateUserSetting('username', newUsername);
            Alert.alert(i18n.t('settings.successAlertTitle'), i18n.t('settings.usernameUpdatedSuccess'));
          } catch (error: any) {
            Alert.alert(i18n.t('settings.errorAlertTitle'), error.message);
          }
        } else {
          Alert.alert(i18n.t('settings.errorAlertTitle'), i18n.t('settings.notLoggedInMessage'));
        }
      },
      'plain-text',
      username
    );
  };

  const handleLanguageSelect = async (selectedName: string) => {
    triggerHaptic();
    const selectedLang = languageOptions.find(lang => lang.name === selectedName);
    if (selectedLang) {
      try {
        await i18n.changeLanguage(selectedLang.code);
        setSelectedLanguageCode(selectedLang.code);
        await updateUserSetting('language', selectedLang.code);
        setLanguageModalVisible(false); // Close modal on selection
      } catch (error) {
        console.error("Failed to change language:", error);
        Alert.alert(i18n.t('settings.errorAlertTitle'), i18n.t('settings.languageChangeError'));
      }
    }
  };
  
  const renderCardSection = (headerKey: string, neonColor: string, children: React.ReactNode) => (
    <ImageBackground
      source={require('../../assets/images/postbg.png')} // Ensure this image exists
      style={styles.cardContainer}
      imageStyle={{ opacity: 0.3, resizeMode: 'cover' }} // Adjusted opacity
    >
      <View style={styles.cardContent}>
        <Text style={[styles.sectionHeader, { color: neonColor, textShadowColor: neonColor }]}>
          {i18n.t(headerKey)}
        </Text>
        {children}
      </View>
    </ImageBackground>
  );

  const handleRateApp = () => {
    triggerHaptic();
    Alert.alert(
      i18n.t('settings.rateAppTitle'),
      i18n.t('settings.rateAppMessage'),
      [
        { text: i18n.t('settings.cancelButton'), style: 'cancel' },
        {
          text: i18n.t('settings.rateButton'),
          onPress: () => {
            // Replace with your actual App Store/Play Store links
            const iosAppId = 'YOUR_IOS_APP_ID';
            const androidPackageName = 'YOUR_ANDROID_PACKAGE_NAME';
            const url = Platform.OS === 'ios'
                ? `itms-apps://apps.apple.com/app/id${iosAppId}?action=write-review`
                : `market://details?id=${androidPackageName}`;
            
            Linking.canOpenURL(url).then(supported => {
              if (supported) {
                Linking.openURL(url);
              } else {
                // Fallback to web URL if store URL fails
                const webUrl = Platform.OS === 'ios'
                    ? `https://apps.apple.com/app/id${iosAppId}`
                    : `https://play.google.com/store/apps/details?id=${androidPackageName}`;
                Linking.openURL(webUrl).catch(err => Alert.alert(i18n.t('settings.errorAlertTitle'), i18n.t('settings.couldNotOpenStoreUrl')));
              }
            }).catch(err => Alert.alert(i18n.t('settings.errorAlertTitle'), i18n.t('settings.couldNotOpenStoreUrl')));
          },
        },
      ],
      { cancelable: true }
    );
  };

  const currentLanguageName = languageOptions.find(lang => lang.code === selectedLanguageCode)?.name || selectedLanguageCode;

  const content = (
    <Animated.View style={{ opacity: fadeAnim, paddingBottom: 20 }}>
      {/* Profile & Account Section */}
      {renderCardSection('settings.profileAccountHeader', '#00FFD1', (
        <>
          {currentUser ? (
            <TouchableOpacity
              style={styles.profileCard}
              onPress={handleProfilePress}
            >
              <Image
                source={require('../../assets/images/avatar.png')} // Ensure this image exists
                style={styles.profileImage}
              />
              <View style={styles.profileInfo}>
                <Text style={styles.profileName}>{username}</Text>
              </View>
              <TouchableOpacity
                style={styles.editProfile}
                onPress={handleChangeUsername} // Changed to directly call change username
              >
                <Text style={styles.editProfileText}>{i18n.t('settings.editProfileButton')}</Text>
                <MaterialIcons name="edit" size={16} color="#00E5FF" />
              </TouchableOpacity>
            </TouchableOpacity>
          ) : (
            <View style={styles.profileCard}>
              <Image
                source={require('../../assets/images/avatar.png')}
                style={styles.profileImage}
              />
              <View style={styles.profileInfo}>
                <Text style={styles.profileName}>{i18n.t('settings.notLoggedIn')}</Text>
              </View>
            </View>
          )}
        </>
      ))}

      {/* Language Settings Section */}
      {renderCardSection('settings.languageRegionHeader', '#FFD700', ( // Using a gold-like color for this section
        <TouchableOpacity
            style={styles.settingItem}
            onPress={() => {
                triggerHaptic();
                setLanguageModalVisible(true);
            }}
        >
            <View style={styles.icon}>
                <Ionicons name="language-outline" size={22} color="#FFD700" />
            </View>
            <Text style={styles.settingTitle}>{i18n.t('settings.languageLabel')}</Text>
            <Text style={styles.settingValue}>{currentLanguageName}</Text>
            <Ionicons name="chevron-forward" size={20} color="#FFD700" />
        </TouchableOpacity>
      ))}


      {/* Notifications & Alerts Section */}
      {renderCardSection('settings.notificationsAlertsHeader', '#00FF87', (
        <>
          <View style={styles.settingItem}>
            <View style={styles.icon}><FontAwesome name="bell-o" size={20} color="#00E5FF" /></View>
            <Text style={styles.settingTitle}>{i18n.t('settings.forumNotificationsLabel')}</Text>
            <Switch
              value={forumNotifications}
              onValueChange={async (value) => {
                triggerHaptic(); setForumNotifications(value); await updateUserSetting('forumNotifications', value);
              }}
              thumbColor={forumNotifications ? '#00E5FF' : '#777'}
              trackColor={{ false: '#333', true: '#00E5FF55' }}
            />
          </View>
          <View style={styles.settingItem}>
            <View style={styles.icon}><FontAwesome name="gamepad" size={20} color="#00E5FF" /></View>
            <Text style={styles.settingTitle}>{i18n.t('settings.gameUpdatesLabel')}</Text>
            <Switch
              value={gameUpdates}
              onValueChange={async (value) => {
                triggerHaptic(); setGameUpdates(value); await updateUserSetting('gameUpdates', value);
              }}
              thumbColor={gameUpdates ? '#00E5FF' : '#777'}
              trackColor={{ false: '#333', true: '#00E5FF55' }}
            />
          </View>
          <View style={styles.settingItem}>
            <View style={styles.icon}><FontAwesome name="ticket" size={20} color="#00E5FF" /></View>
            <Text style={styles.settingTitle}>{i18n.t('settings.raffleRemindersLabel')}</Text>
            <Switch
              value={raffleReminders}
              onValueChange={async (value) => {
                triggerHaptic(); setRaffleReminders(value); await updateUserSetting('raffleReminders', value);
              }}
              thumbColor={raffleReminders ? '#00E5FF' : '#777'}
              trackColor={{ false: '#333', true: '#00E5FF55' }}
            />
          </View>
          <View style={styles.settingItem}>
            <View style={styles.icon}><Ionicons name="calendar-outline" size={20} color="#00E5FF" /></View>
            <Text style={styles.settingTitle}>{i18n.t('settings.dailyChallengeRemindersLabel')}</Text>
            <Switch
              value={dailyChallengeReminders}
              onValueChange={async (value) => {
                triggerHaptic(); setDailyChallengeReminders(value); await updateUserSetting('dailyChallengeReminders', value);
              }}
              thumbColor={dailyChallengeReminders ? '#00E5FF' : '#777'}
              trackColor={{ false: '#333', true: '#00E5FF55' }}
            />
          </View>
        </>
      ))}

      {/* Privacy & Security Section */}
      {renderCardSection('settings.privacySecurityHeader', '#33CCFF', (
        <>
          <TouchableOpacity style={styles.settingItem} onPress={() => { triggerHaptic(); setViewOptionModalVisible(true);}}>
            <View style={styles.icon}><FontAwesome name="eye-slash" size={20} color="#33CCFF" /></View>
            <Text style={styles.settingTitle}>{i18n.t('settings.whoCanViewPostsLabel')}</Text>
            <Text style={styles.settingValue}>{i18n.t(`settings.privacyOptions.${viewPostsOption.toLowerCase().replace(' ', '')}`)}</Text>
            <Ionicons name="chevron-forward" size={20} color="#33CCFF" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.settingItem} onPress={() => { triggerHaptic(); setReplyOptionModalVisible(true);}}>
            <View style={styles.icon}><FontAwesome name="comments-o" size={20} color="#33CCFF" /></View>
            <Text style={styles.settingTitle}>{i18n.t('settings.whoCanReplyPostsLabel')}</Text>
             <Text style={styles.settingValue}>{i18n.t(`settings.replyOptions.${replyPostsOption.toLowerCase().replace(' ', '')}`)}</Text>
            <Ionicons name="chevron-forward" size={20} color="#33CCFF" />
          </TouchableOpacity>
          <View style={styles.settingItem}>
            <View style={styles.icon}><FontAwesome name="star-o" size={20} color="#33CCFF" /></View>
            <Text style={styles.settingTitle}>{i18n.t('settings.showReputationLabel')}</Text>
            <Switch
              value={showReputation}
              onValueChange={async (value) => {
                triggerHaptic(); setShowReputation(value); await updateUserSetting('showReputation', value);
              }}
              thumbColor={showReputation ? '#33CCFF' : '#777'}
              trackColor={{ false: '#333', true: '#33CCFF55' }}
            />
          </View>
          <View style={styles.settingItem}>
            <View style={styles.icon}><FontAwesome name="trophy" size={20} color="#33CCFF" /></View>
            <Text style={styles.settingTitle}>{i18n.t('settings.showRankLabel')}</Text>
            <Switch
              value={showRank}
              onValueChange={async (value) => {
                triggerHaptic(); setShowRank(value); await updateUserSetting('showRank', value);
              }}
              thumbColor={showRank ? '#33CCFF' : '#777'}
              trackColor={{ false: '#333', true: '#33CCFF55' }}
            />
          </View>
        </>
      ))}

      {/* App Info & Legal Section */}
      {renderCardSection('settings.appInfoLegalHeader', '#0088FF', (
        <>
          <TouchableOpacity style={styles.settingItem} onPress={() => { triggerHaptic(); router.push('/screens/AboutApp'); }}>
            <View style={styles.icon}><FontAwesome name="info-circle" size={22} color="#0088FF" /></View>
            <Text style={styles.settingTitle}>{i18n.t('settings.aboutAppLabel')}</Text>
            <Ionicons name="chevron-forward" size={20} color="#0088FF" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.settingItem} onPress={() => { triggerHaptic(); router.push('/screens/PrivacyPolicy'); }}>
            <View style={styles.icon}><FontAwesome name="shield" size={20} color="#0088FF" /></View>
            <Text style={styles.settingTitle}>{i18n.t('settings.privacyPolicyLabel')}</Text>
            <Ionicons name="chevron-forward" size={20} color="#0088FF" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.settingItem} onPress={handleRateApp}>
            <View style={styles.icon}><FontAwesome name="star" size={22} color="#0088FF" /></View>
            <Text style={styles.settingTitle}>{i18n.t('settings.rateAppLabel')}</Text>
            <Ionicons name="chevron-forward" size={20} color="#0088FF" />
          </TouchableOpacity>
        </>
      ))}
    </Animated.View>
  );

  return (
    <ImageBackground
      source={require('../../assets/images/settingsbk.png')} // Ensure this image exists
      style={styles.background}
    >
      <ScrollView
        contentContainerStyle={{
          paddingTop: Platform.OS === 'ios' ? 60 : 40, // Adjust for status bar
          paddingBottom: 40, // More padding at bottom
        }}
        showsVerticalScrollIndicator={false}
      >
        {content}
      </ScrollView>

      {/* Language Selection Modal */}
      <CustomOptionModal
        visible={languageModalVisible}
        title={i18n.t('settings.languageModalTitle')}
        options={languageOptions.map(lang => lang.name)}
        selectedOption={currentLanguageName}
        neonColor="#FFD700"
        onSelect={handleLanguageSelect}
        onClose={() => setLanguageModalVisible(false)}
      />

      {/* Privacy Modals */}
      <CustomOptionModal
        visible={viewOptionModalVisible}
        title={i18n.t('settings.whoCanViewPostsModalTitle')}
        options={[i18n.t('settings.privacyOptions.public'), i18n.t('settings.privacyOptions.friendsonly'), i18n.t('settings.privacyOptions.private')]}
        selectedOption={i18n.t(`settings.privacyOptions.${viewPostsOption.toLowerCase().replace(' ', '')}`)}
        neonColor="#33CCFF"
        onSelect={(optionValue) => { // optionValue here is the translated string
            triggerHaptic();
            // Find the key corresponding to the translated optionValue
            let originalOptionKey: 'Public' | 'Friends Only' | 'Private' = 'Public'; // Default
            if (optionValue === i18n.t('settings.privacyOptions.public')) originalOptionKey = 'Public';
            else if (optionValue === i18n.t('settings.privacyOptions.friendsonly')) originalOptionKey = 'Friends Only';
            else if (optionValue === i18n.t('settings.privacyOptions.private')) originalOptionKey = 'Private';
            
            setViewPostsOption(originalOptionKey);
            updateUserSetting('viewPostsOption', originalOptionKey);
            setViewOptionModalVisible(false);
        }}
        onClose={() => setViewOptionModalVisible(false)}
      />
      <CustomOptionModal
        visible={replyOptionModalVisible}
        title={i18n.t('settings.whoCanReplyPostsModalTitle')}
        options={[i18n.t('settings.replyOptions.everyone'), i18n.t('settings.replyOptions.onlyfollowers'), i18n.t('settings.replyOptions.noone')]}
        selectedOption={i18n.t(`settings.replyOptions.${replyPostsOption.toLowerCase().replace(' ', '')}`)}
        neonColor="#33CCFF"
        onSelect={(optionValue) => {
            triggerHaptic();
            let originalOptionKey: 'Everyone' | 'Only Followers' | 'No One' = 'Everyone'; // Default
            if (optionValue === i18n.t('settings.replyOptions.everyone')) originalOptionKey = 'Everyone';
            else if (optionValue === i18n.t('settings.replyOptions.onlyfollowers')) originalOptionKey = 'Only Followers';
            else if (optionValue === i18n.t('settings.replyOptions.noone')) originalOptionKey = 'No One';

            setReplyPostsOption(originalOptionKey);
            updateUserSetting('replyPostsOption', originalOptionKey);
            setReplyOptionModalVisible(false);
        }}
        onClose={() => setReplyOptionModalVisible(false)}
      />
    </ImageBackground>
  );
}