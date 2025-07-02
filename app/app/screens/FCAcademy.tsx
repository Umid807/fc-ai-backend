import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ImageBackground,
  FlatList,
  TouchableOpacity,
  Image,
  ScrollView,
  Dimensions,
  Animated,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Platform,
} from 'react-native';
import {
  getFirestore,
  collection,
  query,
  where,
  orderBy,
  getDocs,
  doc,
  updateDoc,
  Timestamp,
  arrayUnion,
  getDoc,
  setDoc,
  onSnapshot,
  deleteDoc,
  increment,
  collectionGroup,
  limit,
  startAfter,
  QueryDocumentSnapshot,
  DocumentData
} from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { useNavigation } from '@react-navigation/native';
import { router } from 'expo-router';
import i18n from '../i18n/i18n';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CustomHeader } from '../../components/CustomHeader';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Configure notifications
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

type Session = {
  id: string;
  coachId: string;
  title: string;
  description?: string;
  scheduleTime: Timestamp;
  language: string;
  isVIPOnly?: boolean;
  registeredCount?: number;
  capacity?: number;
  status: 'scheduled' | 'cancelled' | 'completed';
};

type Coach = {
  id: string;
  coachImage: string;
  coachCard?: string;
  coachName: string;
  Nationality: string;
  Slogan?: string;
  achievements?: string;
  offeringLanguage: string;
  timezone?: string;
};

type LoadingState = {
  sessions: boolean;
  coaches: boolean;
  pastSessions: boolean;
  myBookings: boolean;
  booking: boolean;
  refreshing: boolean;
};

type ErrorState = {
  sessions: string | null;
  coaches: string | null;
  pastSessions: string | null;
  myBookings: string | null;
  booking: string | null;
};

export default function FCAcademy() {
  console.log("FCAcademy: Component mounted.");
  const [sessions, setSessions] = useState<Session[]>([]);
  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [pastSessions, setPastSessions] = useState<any[]>([]);
  const [myBookings, setMyBookings] = useState<Session[]>([]);
  const [showBookingSuccess, setShowBookingSuccess] = useState(false);
  const [selectedCoach, setSelectedCoach] = useState<Coach | null>(null);
  const [showCoachModal, setShowCoachModal] = useState(false);
  console.log("FCAcademy: Initializing core states (sessions, coaches, modals, bookings, errors, loading, pagination).");

  // Loading and error states
  const [loading, setLoading] = useState<LoadingState>({
    sessions: true,
    coaches: true,
    pastSessions: true,
    myBookings: true,
    booking: false,
    refreshing: false,
  });

  const [errors, setErrors] = useState<ErrorState>({
    sessions: null,
    coaches: null,
    pastSessions: null,
    myBookings: null,
    booking: null,
  });

  // Pagination states
  const [lastVisibleSession, setLastVisibleSession] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [lastVisibleCoach, setLastVisibleCoach] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [hasMoreSessions, setHasMoreSessions] = useState(true);
  const [hasMoreCoaches, setHasMoreCoaches] = useState(true);

  // Notification states
  const [notifications, setNotifications] = useState<any[]>([]);
  const [expoPushToken, setExpoPushToken] = useState<string>('');

  const navigation = useNavigation();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const scrollX = useRef(new Animated.Value(0)).current;

  // Calculate proper header offset based on screen size and safe area
  const LOGO_SPACE = 280; // Space for your logo
  const HEADER_OFFSET = LOGO_SPACE + insets.top;

  // Register for push notifications
  useEffect(() => {
    console.log("FCAcademy: Initializing push notifications.");
    registerForPushNotificationsAsync().then(token => {
      if (token) {
        setExpoPushToken(token);
        console.log("FCAcademy: Expo push token obtained.");
        // Save token to user profile in Firestore
        saveNotificationToken(token);
      } else {
        console.log("FCAcademy: No Expo push token obtained.");
      }
    });

    // Listen for notification responses
    const responseListener = Notifications.addNotificationResponseReceivedListener(response => {
      console.log("FCAcademy: Notification response received, attempting navigation.");
      const data = response.notification.request.content.data;
      if (data.sessionId) {
        router.push({
          pathname: '/screens/SessionRoom',
          params: { sessionId: data.sessionId },
        });
      }
    });

    return () => {
      console.log("FCAcademy: Cleaning up push notification listener.");
      Notifications.removeNotificationSubscription(responseListener);
    };
  }, []);

  // Fetch sessions with pagination and error handling
  const fetchSessions = async (loadMore = false) => {
    console.log(`FCAcademy: Fetching sessions. Load more: ${loadMore}`);
    try {
      if (!loadMore) {
        setLoading(prev => ({ ...prev, sessions: true }));
        setErrors(prev => ({ ...prev, sessions: null }));
        console.log("FCAcademy: Sessions loading started.");
      } else {
        console.log("FCAcademy: Fetching more sessions (pagination).");
      }

      const db = getFirestore();
      const sessionsRef = collection(db, 'academy_sessions');
      const now = new Date();

      let q = query(
        sessionsRef,
        where('status', '==', 'scheduled'),
        where('scheduleTime', '>', Timestamp.fromDate(now)),
        orderBy('scheduleTime', 'asc'),
        limit(10)
      );

      if (loadMore && lastVisibleSession) {
        q = query(
          sessionsRef,
          where('status', '==', 'scheduled'),
          where('scheduleTime', '>', Timestamp.fromDate(now)),
          orderBy('scheduleTime', 'asc'),
          startAfter(lastVisibleSession),
          limit(10)
        );
      }

      const snap = await getDocs(q);
      console.log("FCAcademy: Sessions data loaded successfully.");

      if (snap.empty && !loadMore) {
        console.log("FCAcademy: No upcoming sessions available.");
        setHasMoreSessions(false);
        setSessions([]);
      } else {
        const data = snap.docs.map(doc => ({
          id: doc.id,
          ...(doc.data() as any),
        })) as Session[];

        if (loadMore) {
          setSessions(prev => [...prev, ...data]);
        } else {
          setSessions(data);
        }

        setLastVisibleSession(snap.docs[snap.docs.length - 1] || null);
        setHasMoreSessions(snap.docs.length === 10);
      }
    } catch (err: any) {
      console.error('FCAcademy: Error loading academy sessions:', err);
      setErrors(prev => ({
        ...prev,
        sessions: t('fcAcademy.errorLoadingSessions', { message: err.message }),
      }));
      console.log("FCAcademy: Failed to load sessions: " + err.message);
    } finally {
      setLoading(prev => ({ ...prev, sessions: false }));
      console.log("FCAcademy: Sessions loading finished.");
    }
  };

  // Fetch coaches with pagination and error handling
  const fetchCoaches = async (loadMore = false) => {
    console.log(`FCAcademy: Fetching coaches. Load more: ${loadMore}`);
    try {
      if (!loadMore) {
        setLoading(prev => ({ ...prev, coaches: true }));
        setErrors(prev => ({ ...prev, coaches: null }));
        console.log("FCAcademy: Coaches loading started.");
      } else {
        console.log("FCAcademy: Fetching more coaches (pagination).");
      }

      const db = getFirestore();
      const coachesRef = collection(db, 'coaches');

      let q = query(
        coachesRef,
        orderBy('coachName', 'asc'),
        limit(10)
      );

      if (loadMore && lastVisibleCoach) {
        q = query(
          coachesRef,
          orderBy('coachName', 'asc'),
          startAfter(lastVisibleCoach),
          limit(10)
        );
      }

      const snap = await getDocs(q);
      console.log("FCAcademy: Coaches data loaded successfully.");

      if (snap.empty && !loadMore) {
        console.log("FCAcademy: No coaches available.");
        setHasMoreCoaches(false);
        setCoaches([]);
      } else {
        const data = snap.docs.map(doc => ({
          id: doc.id,
          ...(doc.data() as any),
        })) as Coach[];

        if (loadMore) {
          setCoaches(prev => [...prev, ...data]);
        } else {
          setCoaches(data);
        }

        setLastVisibleCoach(snap.docs[snap.docs.length - 1] || null);
        setHasMoreCoaches(snap.docs.length === 10);
      }
    } catch (err: any) {
      console.error('FCAcademy: Error loading coaches:', err);
      setErrors(prev => ({
        ...prev,
        coaches: t('fcAcademy.errorLoadingCoaches', { message: err.message }),
      }));
      console.log("FCAcademy: Failed to load coaches: " + err.message);
    } finally {
      setLoading(prev => ({ ...prev, coaches: false }));
      console.log("FCAcademy: Coaches loading finished.");
    }
  };


  // Initial data fetch on mount
  useEffect(() => {
    console.log("FCAcademy: Initiating initial data fetch (sessions & coaches).");
    fetchSessions();
    fetchCoaches();
  }, []);

  // Refresh functionality
  const onRefresh = async () => {
    console.log("FCAcademy: User pulled to refresh data.");
    setLoading(prev => ({ ...prev, refreshing: true }));
    setHasMoreSessions(true); // Reset pagination for sessions
    setLastVisibleSession(null);
    setHasMoreCoaches(true); // Reset pagination for coaches
    setLastVisibleCoach(null);

    await Promise.all([fetchSessions(), fetchCoaches()]);
    setLoading(prev => ({ ...prev, refreshing: false }));
    console.log("FCAcademy: Refresh completed.");
  };

  // Helper function to register for push notifications
  async function registerForPushNotificationsAsync() {
    console.log("FCAcademy: Registering for push notifications...");
    let token;
    if (Platform.OS === 'android') {
      Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    }

    if (Device.isDevice) {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      if (finalStatus !== 'granted') {
        Alert.alert('Permission Denied', 'Failed to get push token for push notification!');
        console.log("FCAcademy: Push notification permission denied.");
        return;
      }
      token = (await Notifications.getExpoPushTokenAsync()).data;
    } else {
      Alert.alert('Not a physical device', 'Must use physical device for Push Notifications');
      console.warn('FCAcademy: Push notifications not supported on simulator.');
    }

    return token;
  }

  // Helper function to save notification token to Firestore
  const saveNotificationToken = async (token: string) => {
    console.log("FCAcademy: Attempting to save notification token.");
    const auth = getAuth();
    const user = auth.currentUser;
    if (user) {
      const db = getFirestore();
      const userRef = doc(db, 'users', user.uid);
      try {
        await updateDoc(userRef, {
          expoPushToken: token,
          updatedAt: Timestamp.now(),
        });
        console.log("FCAcademy: Notification token saved successfully.");
      } catch (e: any) {
        console.error("FCAcademy: Error saving notification token:", e);
        Alert.alert('Error', 'Failed to save notification token.');
        console.log("FCAcademy: Failed to save notification token: " + e.message);
      }
    } else {
      console.log("FCAcademy: No user logged in to save notification token.");
    }
  };

  // Handle session booking
  const handleBooking = async (session: Session) => {
    console.log("FCAcademy: User attempting to book session: " + session.id);
    setSelectedSession(session);
    setShowBookingModal(true);
    console.log("FCAcademy: Booking modal opened.");
  };

  const confirmBooking = async () => {
    console.log("FCAcademy: Booking confirmation process started.");
    if (!selectedSession) {
      console.warn("FCAcademy: No session selected for booking confirmation.");
      return;
    }

    setLoading(prev => ({ ...prev, booking: true }));
    setErrors(prev => ({ ...prev, booking: null }));

    const auth = getAuth();
    const user = auth.currentUser;
    if (!user) {
      Alert.alert('Authentication Required', 'Please log in to book a session.');
      setLoading(prev => ({ ...prev, booking: false }));
      console.log("FCAcademy: Booking failed: User not authenticated.");
      return;
    }

    const db = getFirestore();
    const sessionRef = doc(db, 'academy_sessions', selectedSession.id);
    const userBookingRef = doc(db, 'users', user.uid, 'my_bookings', selectedSession.id);

    try {
      // Check if already booked
      const userBookingSnap = await getDoc(userBookingRef);
      if (userBookingSnap.exists()) {
        Alert.alert('Already Booked', 'You have already booked this session.');
        console.log("FCAcademy: Booking failed: Session already booked.");
        return;
      }

      // Check capacity
      const sessionSnap = await getDoc(sessionRef);
      if (!sessionSnap.exists()) {
        Alert.alert('Error', 'Session not found.');
        console.error("FCAcademy: Booking failed: Session document not found.");
        return;
      }
      const currentCapacity = (sessionSnap.data()?.capacity || 0);
      const registeredCount = (sessionSnap.data()?.registeredCount || 0);

      if (registeredCount >= currentCapacity) {
        Alert.alert('Full', 'This session is full.');
        console.log("FCAcademy: Booking failed: Session capacity reached.");
        return;
      }

      await updateDoc(sessionRef, {
        registeredCount: increment(1),
        attendees: arrayUnion(user.uid),
      });

      await setDoc(userBookingRef, {
        sessionId: selectedSession.id,
        title: selectedSession.title,
        scheduleTime: selectedSession.scheduleTime,
        coachId: selectedSession.coachId,
        bookedAt: Timestamp.now(),
      });
      console.log("FCAcademy: Session booked successfully.");

      setShowBookingModal(false);
      setShowBookingSuccess(true);
      console.log("FCAcademy: Booking successful, showing confirmation.");
      // Refresh my bookings list
      fetchMyBookings();
    } catch (e: any) {
      console.error("FCAcademy: Error booking session:", e);
      setErrors(prev => ({
        ...prev,
        booking: t('fcAcademy.errorBookingSession', { message: e.message }),
      }));
      Alert.alert('Booking Error', 'Failed to book session: ' + e.message);
      console.log("FCAcademy: Error confirming booking: " + e.message);
    } finally {
      setLoading(prev => ({ ...prev, booking: false }));
    }
  };

  // Helper to open coach modal
  const handleViewCoach = (coach: Coach) => {
    console.log("FCAcademy: User viewing coach details: " + coach.id);
    setSelectedCoach(coach);
    setShowCoachModal(true);
    console.log("FCAcademy: Coach details modal opened.");
  };

  // Fetch my bookings
  const fetchMyBookings = async () => {
    console.log("FCAcademy: Fetching user's bookings.");
    setLoading(prev => ({ ...prev, myBookings: true }));
    setErrors(prev => ({ ...prev, myBookings: null }));

    const auth = getAuth();
    const user = auth.currentUser;
    if (!user) {
      console.log("FCAcademy: Skipping my bookings fetch: No user logged in.");
      setLoading(prev => ({ ...prev, myBookings: false }));
      return;
    }

    const db = getFirestore();
    const myBookingsRef = collection(db, 'users', user.uid, 'my_bookings');

    try {
      const q = query(myBookingsRef, orderBy('bookedAt', 'desc'));
      const unsubscribe = onSnapshot(q, async (snapshot) => {
        const bookings = await Promise.all(snapshot.docs.map(async (bookingDoc) => {
          const bookingData = bookingDoc.data();
          if (bookingData.sessionId) {
            const sessionRef = doc(db, 'academy_sessions', bookingData.sessionId);
            const sessionSnap = await getDoc(sessionRef);
            if (sessionSnap.exists()) {
              return { id: sessionSnap.id, ...(sessionSnap.data() as any) };
            }
          }
          return null;
        }));
        const filteredBookings = bookings.filter(b => b !== null) as Session[];
        setMyBookings(filteredBookings);
        console.log("FCAcademy: User bookings updated.");
        setLoading(prev => ({ ...prev, myBookings: false }));
      });

      return () => {
        console.log("FCAcademy: Cleaning up my bookings listener.");
        unsubscribe(); // Detach the listener when component unmounts
      };
    } catch (e: any) {
      console.error("FCAcademy: Error fetching my bookings:", e);
      setErrors(prev => ({
        ...prev,
        myBookings: t('fcAcademy.errorFetchingMyBookings', { message: e.message }),
      }));
      console.log("FCAcademy: Failed to load user bookings: " + e.message);
      setLoading(prev => ({ ...prev, myBookings: false }));
    }
  };

  // useEffect for fetching my bookings on user change or mount
  useEffect(() => {
    console.log("FCAcademy: Setting up user bookings listener.");
    const auth = getAuth();
    const unsubscribe = auth.onAuthStateChanged(user => {
      if (user) {
        fetchMyBookings();
      } else {
        setMyBookings([]);
      }
    });
    return () => {
      console.log("FCAcademy: Cleaning up auth state listener.");
      unsubscribe();
    };
  }, []);

  // Conditional rendering for loading/error states for sessions
  const renderSessionsList = () => {
    if (loading.sessions) {
      return <ActivityIndicator size="large" color="#0000ff" style={styles.loadingIndicator} />;
    }
    if (errors.sessions) {
      return <Text style={styles.errorText}>{errors.sessions}</Text>;
    }
    if (sessions.length === 0) {
      console.log("FCAcademy: No upcoming sessions available.");
      return <Text style={styles.noDataText}>{t('fcAcademy.noUpcomingSessions')}</Text>;
    }
    return (
      <FlatList
        data={sessions}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.sessionCard}
            onPress={() => handleBooking(item)}
          >
            <Text style={styles.sessionTitle}>{item.title}</Text>
            <Text style={styles.sessionDescription}>{item.description}</Text>
            <Text style={styles.sessionTime}>
              {item.scheduleTime.toDate().toLocaleString()}
            </Text>
            {/* Add more session details */}
          </TouchableOpacity>
        )}
        onEndReached={() => {
          if (hasMoreSessions && !loading.sessions) {
            console.log("FCAcademy: End of sessions list reached, fetching more.");
            fetchSessions(true);
          }
        }}
        onEndReachedThreshold={0.5}
        ListFooterComponent={() => {
          if (loading.sessions && hasMoreSessions) {
            return <ActivityIndicator size="small" color="#0000ff" />;
          }
          return null;
        }}
      />
    );
  };

  // Conditional rendering for loading/error states for coaches
  const renderCoachesList = () => {
    if (loading.coaches) {
      return <ActivityIndicator size="large" color="#0000ff" style={styles.loadingIndicator} />;
    }
    if (errors.coaches) {
      return <Text style={styles.errorText}>{errors.coaches}</Text>;
    }
    if (coaches.length === 0) {
      console.log("FCAcademy: No coaches available.");
      return <Text style={styles.noDataText}>{t('fcAcademy.noCoachesAvailable')}</Text>;
    }
    return (
      <FlatList
        data={coaches}
        keyExtractor={(item) => item.id}
        horizontal
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.coachCard}
            onPress={() => handleViewCoach(item)}
          >
            <Image source={{ uri: item.coachImage }} style={styles.coachImage} />
            <Text style={styles.coachName}>{item.coachName}</Text>
            <Text style={styles.coachNationality}>{item.Nationality}</Text>
            {/* Add more coach details */}
          </TouchableOpacity>
        )}
        onEndReached={() => {
          if (hasMoreCoaches && !loading.coaches) {
            console.log("FCAcademy: End of coaches list reached, fetching more.");
            fetchCoaches(true);
          }
        }}
        onEndReachedThreshold={0.5}
        ListFooterComponent={() => {
          if (loading.coaches && hasMoreCoaches) {
            return <ActivityIndicator size="small" color="#0000ff" />;
          }
          return null;
        }}
      />
    );
  };

  // Conditional rendering for loading/error states for my bookings
  const renderMyBookingsList = () => {
    if (loading.myBookings) {
      return <ActivityIndicator size="large" color="#0000ff" style={styles.loadingIndicator} />;
    }
    if (errors.myBookings) {
      return <Text style={styles.errorText}>{errors.myBookings}</Text>;
    }
    if (myBookings.length === 0) {
      return <Text style={styles.noDataText}>{t('fcAcademy.noBookings')}</Text>;
    }
    return (
      <FlatList
        data={myBookings}
        keyExtractor={(item) => item.id}
        horizontal
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.myBookingCard}
            onPress={() => {
              router.push({
                pathname: '/screens/SessionRoom',
                params: { sessionId: item.id },
              });
              console.log("FCAcademy: Navigating to SessionRoom from my bookings.");
            }}
          >
            <Text style={styles.myBookingTitle}>{item.title}</Text>
            <Text style={styles.myBookingTime}>
              {item.scheduleTime.toDate().toLocaleString()}
            </Text>
            {/* Add more my booking details */}
          </TouchableOpacity>
        )}
      />
    );
  };


  return (
    <View style={styles.container}>
      <CustomHeader showCoins={true} showProfile={true} />
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl
            refreshing={loading.refreshing}
            onRefresh={onRefresh}
            tintColor="#fff" // Customize refresh indicator color
          />
        }
      >
        <ImageBackground
          source={require('../../assets/images/background.png')}
          style={styles.backgroundImage}
          resizeMode="cover"
        >
          <View style={styles.overlay}>
            <Text style={styles.headerTitle}>{t('fcAcademy.title')}</Text>
          </View>
        </ImageBackground>

        {/* My Bookings Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('fcAcademy.myBookings')}</Text>
          {renderMyBookingsList()}
        </View>

        {/* Upcoming Sessions Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('fcAcademy.upcomingSessions')}</Text>
          {renderSessionsList()}
          {hasMoreSessions && sessions.length > 0 && !loading.sessions && (
            <TouchableOpacity
              onPress={() => {
                console.log("FCAcademy: User requesting more sessions.");
                fetchSessions(true);
              }}
              style={styles.loadMoreButton}
            >
              <Text style={styles.loadMoreButtonText}>{t('common.loadMore')}</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Coaches Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('fcAcademy.coaches')}</Text>
          {renderCoachesList()}
          {hasMoreCoaches && coaches.length > 0 && !loading.coaches && (
            <TouchableOpacity
              onPress={() => {
                console.log("FCAcademy: User requesting more coaches.");
                fetchCoaches(true);
              }}
              style={styles.loadMoreButton}
            >
              <Text style={styles.loadMoreButtonText}>{t('common.loadMore')}</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Booking Modal */}
        {showBookingModal && selectedSession && (
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>{t('fcAcademy.confirmBooking')}</Text>
              <Text style={styles.modalText}>{t('fcAcademy.session')}: {selectedSession.title}</Text>
              <Text style={styles.modalText}>{t('fcAcademy.time')}: {selectedSession.scheduleTime.toDate().toLocaleString()}</Text>
              <TouchableOpacity
                style={styles.modalButton}
                onPress={confirmBooking}
                disabled={loading.booking}
              >
                {loading.booking ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.modalButtonText}>{t('common.confirm')}</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setShowBookingModal(false);
                  setSelectedSession(null);
                  console.log("FCAcademy: Booking modal closed by user.");
                }}
              >
                <Text style={styles.modalButtonText}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              {errors.booking && <Text style={styles.errorText}>{errors.booking}</Text>}
            </View>
          </View>
        )}

        {/* Booking Success Modal */}
        {showBookingSuccess && (
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>{t('fcAcademy.bookingSuccessTitle')}</Text>
              <Text style={styles.modalText}>{t('fcAcademy.bookingSuccessMessage')}</Text>
              <TouchableOpacity
                style={styles.modalButton}
                onPress={() => {
                  setShowBookingSuccess(false);
                  console.log("FCAcademy: Booking successful, confirmation closed.");
                }}
              >
                <Text style={styles.modalButtonText}>{t('common.ok')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Coach Details Modal */}
        {showCoachModal && selectedCoach && (
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>{t('fcAcademy.coachDetails')}</Text>
              <Image source={{ uri: selectedCoach.coachImage }} style={styles.modalCoachImage} />
              <Text style={styles.modalText}>{t('fcAcademy.coachName')}: {selectedCoach.coachName}</Text>
              <Text style={styles.modalText}>{t('fcAcademy.nationality')}: {selectedCoach.Nationality}</Text>
              {selectedCoach.Slogan && <Text style={styles.modalText}>{t('fcAcademy.slogan')}: {selectedCoach.Slogan}</Text>}
              {selectedCoach.achievements && <Text style={styles.modalText}>{t('fcAcademy.achievements')}: {selectedCoach.achievements}</Text>}
              <Text style={styles.modalText}>{t('fcAcademy.offeringLanguage')}: {selectedCoach.offeringLanguage}</Text>
              <TouchableOpacity
                style={styles.modalButton}
                onPress={() => {
                  setShowCoachModal(false);
                  setSelectedCoach(null);
                  console.log("FCAcademy: Coach details modal closed.");
                }}
              >
                <Text style={styles.modalButtonText}>{t('common.close')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
  },
  backgroundImage: {
    width: SCREEN_WIDTH,
    height: SCREEN_WIDTH * 0.6, // Adjust height as needed
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: -1, height: 1 },
    textShadowRadius: 10,
  },
  section: {
    paddingVertical: 20,
    paddingHorizontal: 15,
    backgroundColor: '#fff',
    marginTop: 10,
    borderRadius: 8,
    marginHorizontal: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
  },
  sessionCard: {
    backgroundColor: '#e0f7fa',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    borderLeftWidth: 5,
    borderLeftColor: '#00bcd4',
  },
  sessionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#00796b',
    marginBottom: 5,
  },
  sessionDescription: {
    fontSize: 14,
    color: '#4caf50',
    marginBottom: 5,
  },
  sessionTime: {
    fontSize: 13,
    color: '#006064',
    fontStyle: 'italic',
  },
  coachCard: {
    backgroundColor: '#ffe0b2',
    padding: 15,
    borderRadius: 8,
    marginRight: 10,
    alignItems: 'center',
    width: 120, // Fixed width for horizontal scroll
    borderBottomWidth: 5,
    borderBottomColor: '#fb8c00',
  },
  coachImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 10,
    borderWidth: 2,
    borderColor: '#ff9800',
  },
  coachName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#e65100',
    textAlign: 'center',
  },
  coachNationality: {
    fontSize: 12,
    color: '#f57c00',
    textAlign: 'center',
  },
  myBookingCard: {
    backgroundColor: '#c8e6c9',
    padding: 15,
    borderRadius: 8,
    marginRight: 10,
    width: 180,
    borderRightWidth: 5,
    borderRightColor: '#4caf50',
  },
  myBookingTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2e7d32',
    marginBottom: 5,
  },
  myBookingTime: {
    fontSize: 12,
    color: '#1b5e20',
  },
  loadingIndicator: {
    marginTop: 20,
    marginBottom: 20,
  },
  errorText: {
    color: 'red',
    textAlign: 'center',
    marginTop: 10,
    marginBottom: 10,
  },
  noDataText: {
    textAlign: 'center',
    color: '#666',
    marginTop: 20,
    marginBottom: 20,
    fontSize: 16,
  },
  loadMoreButton: {
    backgroundColor: '#1976d2',
    padding: 10,
    borderRadius: 5,
    alignSelf: 'center',
    marginTop: 15,
  },
  loadMoreButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  modalContent: {
    backgroundColor: '#fff',
    padding: 25,
    borderRadius: 10,
    width: '80%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
  },
  modalText: {
    fontSize: 16,
    marginBottom: 10,
    color: '#555',
    textAlign: 'center',
  },
  modalButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 8,
    marginTop: 15,
    width: '80%',
    alignItems: 'center',
  },
  modalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  cancelButton: {
    backgroundColor: '#f44336',
    marginTop: 10,
  },
  modalCoachImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 15,
    borderWidth: 3,
    borderColor: '#ff9800',
  },
});