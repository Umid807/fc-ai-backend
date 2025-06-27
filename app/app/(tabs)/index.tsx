import React, { useState, useEffect } from 'react';
import {
  View,
  ActivityIndicator,
  TouchableOpacity,
  Text,
  Modal,
  FlatList,
  StyleSheet,
  Alert,
  Animated,
  Image,
  ImageBackground,
} from 'react-native';
import { useFonts } from 'expo-font';
import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDoc,
  onSnapshot,
  collection,
  query,
  orderBy,
  deleteDoc,
  updateDoc,
} from 'firebase/firestore';
import { LinearGradient } from 'expo-linear-gradient';

// Import Screens
import HomeScreen from '../screens/HomeScreen';
import ForumScreen from '../screens/ForumScreen';
import ProfileScreen from '../screens/UserProfileScreen';
import DefensiveFundamentals from '../screens/DefensiveFundamentals';
import OffenseScreen from '../screens/OffenseScreen';
import MoreTipsPage from '../screens/MoreDefensiveTips';
import ExploreAttackArsenalScreen from '../screens/OffenseScreen';
import ArticleScreen from '../screens/ArticleScreen';
import GenerateCard from '../screens/GenerateCard';
import DailyChallenge from '../screens/DailyChallenge';
import ManageMyAccount from '../screens/ManageMyAccount';
import MyActivity from '../screens/MyActivity';
import FCDNAAnalyzerStackWrapper from '../Dna/quiz';





// Academy and Notifications Screens
import AcademyScreen from '../screens/Academy';
import NotificationScreen from '../screens/NotificationScreen';
import Settings from '../screens/Settings';

// ——— Import shared NotificationBell ———
import { NotificationBell } from '../../components/notification';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

/**
 * CustomHeader
 * - Uses an image background.
 * - Back button or settings button on left.
 * - Title in center.
 * - NotificationBell on the right.
 */
const CustomHeader = ({
  navigation,
  route,
  options,
  back,
  notifications,
  markNotificationAsRead,
  userId,
}: {
  navigation: any;
  route: any;
  options: any;
  back: any;
  notifications: any[];
  markNotificationAsRead: (notifId: string) => Promise<void>;
  userId: string;
}) => {
  const title =
    route.name === 'Home'
      ? 'proVision FC'
      : options.headerTitle || options.title || route.name;

  return (
    <ImageBackground
      source={require('../../assets/images/bk6.png')}
      style={styles.headerBackground}
      imageStyle={{ opacity: 0.9 }}
    >
      <View style={styles.headerContent}>
        {back ? (
          <TouchableOpacity onPress={navigation.goBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            onPress={() => navigation.navigate('Settings')}
            style={styles.settingsButton}
          >
            <Image source={require('../../assets/images/settings.png')} style={styles.settingsIcon} />
          </TouchableOpacity>
        )}

        <Text style={styles.headerTitle}>{title}</Text>

        <View style={styles.rightContainer}>
          {userId && (
            <NotificationBell
              notifications={notifications}
              navigation={navigation}
              markNotificationAsRead={markNotificationAsRead}
              userId={userId}
            />
          )}
        </View>
      </View>
    </ImageBackground>
  );
};

/**
 * HomeTabs
 */
function HomeTabs({ coins }: { coins: number | null }) {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused, size, color }) => {
          let iconName = '';
          if (route.name === 'The Arena') iconName = focused ? 'trophy' : 'trophy-outline';
          if (route.name === 'The Academy') iconName = focused ? 'school' : 'school-outline';
          if (route.name === 'Locker Room') iconName = focused ? 'people' : 'people-outline';
          if (route.name === 'My Profile')
            iconName = focused ? 'person-circle' : 'person-circle-outline';
          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#007AFF',
        tabBarInactiveTintColor: 'gray',
        tabBarBackground: () => (
          <ImageBackground source={require('../../assets/images/bk6.png')} style={StyleSheet.absoluteFill} />
        ),
      })}
    >
      <Tab.Screen name="The Arena">
        {(props) => <HomeScreen {...props} coins={coins} />}
      </Tab.Screen>
      <Tab.Screen name="The Academy" component={AcademyScreen} />
      <Tab.Screen name="Locker Room" component={ForumScreen} />
      <Tab.Screen name="My Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

/**
 * Main App
 */
export default function App() {
  const [fontsLoaded] = useFonts({
    // Existing font
    Orbitron: require('../../assets/fonts/Orbitron/Orbitron-Regular.ttf'),
    
    // Add all the VIP fonts here:
    'Exo': require('../../assets/fonts/Exo/Exo-Regular.ttf'),
    'Exo-Italic': require('../../assets/fonts/Exo/Exo-Italic.ttf'),
    'Exo-Bold': require('../../assets/fonts/Exo/Exo-Bold.ttf'),
    'SpaceMono': require('../../assets/fonts/SpaceMono/SpaceMono-Regular.ttf'),
    'Audiowide': require('../../assets/fonts/Audiowide/Audiowide-Regular.ttf'),
    
    'Rajdhani': require('../../assets/fonts/Rajdhani/Rajdhani-Regular.ttf'),
    'Rajdhani-Light': require('../../assets/fonts/Rajdhani/Rajdhani-Light.ttf'),
    'Rajdhani-Bold': require('../../assets/fonts/Rajdhani/Rajdhani-Bold.ttf'),
    
    'QuanticoRegular': require('../../assets/fonts/Quantico/Quantico-Regular.ttf'),
    'Quantico-Bold': require('../../assets/fonts/Quantico/Quantico-Bold.ttf'),
  });
  
  // Rest of your existing code...
  const [coins, setCoins] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [notifications, setNotifications] = useState<any[]>([]);

  useEffect(() => {
    const auth = getAuth();
    let unsubscribeCoins = () => {};
    let unsubscribeNotifications = () => {};

    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        fetchUserData(currentUser.uid);
        unsubscribeCoins = subscribeToCoinUpdates(currentUser.uid);
        unsubscribeNotifications = subscribeToNotifications(currentUser.uid);
      } else {
        setCoins(0);
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      unsubscribeCoins();
      unsubscribeNotifications();
    };
  }, []);

  const fetchUserData = async (userId: string) => {
    const db = getFirestore();
    try {
      const docSnap = await getDoc(doc(db, 'users', userId));
      setCoins(docSnap.exists() ? docSnap.data().coins ?? 0 : 0);
    } catch {
      setCoins(0);
    }
    setLoading(false);
  };

  const subscribeToCoinUpdates = (userId: string) => {
    const db = getFirestore();
    return onSnapshot(doc(db, 'users', userId), (snap) => {
      if (snap.exists()) setCoins(snap.data().coins ?? 0);
    });
  };

  const subscribeToNotifications = (userId: string) => {
    const db = getFirestore();
    const q = query(collection(db, 'users', userId, 'notifications'), orderBy('timestamp', 'desc'));
    return onSnapshot(q, (qs) => {
      const notifs: any[] = [];
      qs.forEach((d) => notifs.push({ id: d.id, ...d.data() }));
      setNotifications(notifs);

      // auto-delete old ones
      const now = Date.now();
      notifs.forEach((n) => {
        if (!n.timestamp) return;
        const ts = n.timestamp.toDate?.() ?? new Date(n.timestamp);
        if ((now - ts.getTime()) / (1000*60*60*24) > 30) {
          deleteDoc(doc(db, 'users', userId, 'notifications', n.id));
        }
      });
    });
  };

  const markNotificationAsRead = async (notifId: string) => {
    if (!user) return;
    const db = getFirestore();
    await updateDoc(doc(db, 'users', user.uid, 'notifications', notifId), { read: true });
  };

  if (!fontsLoaded || loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#FFA500" />
      </View>
    );
  }

  return (
    <Stack.Navigator
      screenOptions={({ navigation, route, back }) => ({
        header: (props) => (
          <CustomHeader
            {...props}
            notifications={notifications}
            markNotificationAsRead={markNotificationAsRead}
            userId={user?.uid}
          />
        ),
      })}
    >
<Stack.Screen name="Home">
  {(props) => <HomeTabs {...props} coins={coins} />}
</Stack.Screen>

<Stack.Screen name="Settings" component={Settings} options={{ headerTitle: "Settings" }} />
<Stack.Screen name="Notifications">
  {(props) => (
    <NotificationScreen
      {...props}
      notifications={notifications}
      markNotificationAsRead={markNotificationAsRead}
    />
  )}
</Stack.Screen>
<Stack.Screen name="ForumScreen" component={ForumScreen} options={{ headerTitle: "Locker Room" }} />
<Stack.Screen name="OffenseScreen" component={OffenseScreen} options={{ headerTitle: "Offense" }} />
<Stack.Screen name="DefensiveFundamentals" component={DefensiveFundamentals} options={{ headerTitle: "Defense" }} />
<Stack.Screen name="MoreTipsPage" component={MoreTipsPage} options={{ headerTitle: "More Tips" }} />
<Stack.Screen name="UserProfileScreen" component={ProfileScreen} options={{ headerTitle: "My Profile" }} />
<Stack.Screen name="GenerateCard" component={GenerateCard} options={{ headerTitle: "Player Card" }} />
<Stack.Screen name="DailyChallenge" component={DailyChallenge} options={{ headerTitle: "Daily Challenge" }} />
<Stack.Screen name="ManageMyAccount" component={ManageMyAccount} options={{ headerTitle: "Manage Account" }} />
<Stack.Screen name="MyActivity" component={MyActivity} options={{ headerTitle: "My Activity" }} />
<Stack.Screen
  name="FCDNAAnalyzerPage"
  component={FCDNAAnalyzerStackWrapper}
  options={{ headerShown: false }} // prevent double header
/>

<Stack.Screen name="ExploreAttackArsenalScreen" component={ExploreAttackArsenalScreen} options={{ headerTitle: "Attack Arsenal" }} />
<Stack.Screen name="ArticleScreen" component={ArticleScreen} options={{ headerTitle: "Article" }} />
<Stack.Screen name="PostDetails">
  {(props) => {
    const PostDetails = require('../forum/PostDetails').default;
    return <PostDetails {...props} />;
  }}
</Stack.Screen>


      
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  headerBackground: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    height: 60,
    zIndex: 1000,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 60,
    paddingHorizontal: 10,
  },
  headerTitle: { fontSize: 24, color: '#fff', fontWeight: 'bold' },
  settingsButton: { padding: 5, bottom: -15 },
  settingsIcon: { width: 40, height: 40, resizeMode: 'contain' },
  backButton: { padding: 5 },
  rightContainer: { flexDirection: 'row', alignItems: 'center' },
});
