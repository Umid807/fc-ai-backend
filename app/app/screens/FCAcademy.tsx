// app/screens/FCAcademy.tsx
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
import { Platform } from 'react-native';

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
  const [sessions, setSessions] = useState<Session[]>([]);
  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [pastSessions, setPastSessions] = useState<any[]>([]);
  const [myBookings, setMyBookings] = useState<Session[]>([]);
  const [showBookingSuccess, setShowBookingSuccess] = useState(false);
  const [selectedCoach, setSelectedCoach] = useState<Coach | null>(null);
  const [showCoachModal, setShowCoachModal] = useState(false);
  
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
    registerForPushNotificationsAsync().then(token => {
      if (token) {
        setExpoPushToken(token);
        // Save token to user profile in Firestore
        saveNotificationToken(token);
      }
    });

    // Listen for notification responses
    const responseListener = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data;
      if (data.sessionId) {
        // Navigate to session room or session details
        router.push({
          pathname: '/screens/SessionRoom',
          params: { sessionId: data.sessionId },
        });
      }
    });

    return () => {
      Notifications.removeNotificationSubscription(responseListener);
    };
  }, []);

  // Fetch sessions with pagination and error handling
  const fetchSessions = async (loadMore = false) => {
    try {
      if (!loadMore) {
        setLoading(prev => ({ ...prev, sessions: true }));
        setErrors(prev => ({ ...prev, sessions: null }));
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
      
      if (snap.empty && !loadMore) {
        setHasMoreSessions(false);
        setSessions([]);
      } else {
        const data = snap.docs.map(doc => ({
          id: doc.id,
          ...(doc.data() as any),
        }));

        if (loadMore) {
          setSessions(prev => [...prev, ...data]);
        } else {
          setSessions(data);
        }

        setLastVisibleSession(snap.docs[snap.docs.length - 1] || null);
        setHasMoreSessions(snap.docs.length === 10);
      }
    } catch (err) {
      console.error('🔥 Error loading academy sessions:', err);
      setErrors(prev => ({ 
        ...prev, 
        sessions: t('fcAcademy.errorLoadingSessions') 
      }));
    } finally {
      setLoading(prev => ({ ...prev, sessions: false }));
    }
  };

  // Fetch coaches with pagination
  const fetchCoaches = async (loadMore = false) => {
    try {
      if (!loadMore) {
        setLoading(prev => ({ ...prev, coaches: true }));
        setErrors(prev => ({ ...prev, coaches: null }));
      }

      const db = getFirestore();
      const coachesRef = collection(db, 'coaches');
      
      let q = query(coachesRef, limit(5));

      if (loadMore && lastVisibleCoach) {
        q = query(
          coachesRef,
          startAfter(lastVisibleCoach),
          limit(5)
        );
      }

      const snap = await getDocs(q);
      
      if (snap.empty && !loadMore) {
        setHasMoreCoaches(false);
        setCoaches([]);
      } else {
        const data = snap.docs.map(doc => ({
          id: doc.id,
          ...(doc.data() as any),
        }));

        if (loadMore) {
          setCoaches(prev => [...prev, ...data]);
        } else {
          setCoaches(data);
        }

        setLastVisibleCoach(snap.docs[snap.docs.length - 1] || null);
        setHasMoreCoaches(snap.docs.length === 5);
      }
    } catch (err) {
      console.error('Error loading coaches:', err);
      setErrors(prev => ({ 
        ...prev, 
        coaches: t('fcAcademy.errorLoadingCoaches') 
      }));
    } finally {
      setLoading(prev => ({ ...prev, coaches: false }));
    }
  };

  // Fetch past sessions
  const fetchPastSessions = async () => {
    try {
      setLoading(prev => ({ ...prev, pastSessions: true }));
      setErrors(prev => ({ ...prev, pastSessions: null }));

      const db = getFirestore();
      const ref = collection(db, 'past_sessions');
      const q = query(ref, limit(10));

      const snap = await getDocs(q);
      const data = snap.docs.map(doc => ({
        id: doc.id,
        ...(doc.data() as any),
      }));

      setPastSessions(data);
    } catch (err) {
      console.error('🔥 Error loading past sessions:', err);
      setErrors(prev => ({ 
        ...prev, 
        pastSessions: t('fcAcademy.errorLoadingPastSessions') 
      }));
    } finally {
      setLoading(prev => ({ ...prev, pastSessions: false }));
    }
  };

  // Initial data fetch
  useEffect(() => {
    fetchSessions();
    fetchCoaches();
    fetchPastSessions();
  }, []);

  // Fetch user bookings with real-time updates
  useEffect(() => {
    const db = getFirestore();
    const auth = getAuth();
    const user = auth.currentUser;
    if (!user) return;

    setLoading(prev => ({ ...prev, myBookings: true }));

    const now = new Date();

    const unsubscribe = onSnapshot(
      query(
        collectionGroup(db, 'bookings'),
        where('userId', '==', user.uid)
      ),
      async (snap) => {
        try {
          const sessionRefs = snap.docs.map(doc => doc.ref.parent.parent);
          const fetchedSessions: Session[] = [];

          for (const ref of sessionRefs) {
            const sessionSnap = await getDoc(ref!);
            const sessionData = sessionSnap.data();
            if (
              sessionData &&
              sessionData.status === 'scheduled' &&
              sessionData.scheduleTime?.toDate() > now
            ) {
              fetchedSessions.push({
                id: sessionSnap.id,
                ...(sessionData as any),
              });
            }
          }

          setMyBookings(fetchedSessions);
          
          // Schedule notifications for upcoming sessions
          scheduleSessionNotifications(fetchedSessions);
        } catch (err) {
          console.error('Error loading my bookings:', err);
          setErrors(prev => ({ 
            ...prev, 
            myBookings: t('fcAcademy.errorLoadingBookings') 
          }));
        } finally {
          setLoading(prev => ({ ...prev, myBookings: false }));
        }
      }
    );

    return () => unsubscribe();
  }, []);

  // Pull to refresh
  const onRefresh = async () => {
    setLoading(prev => ({ ...prev, refreshing: true }));
    
    // Reset pagination
    setLastVisibleSession(null);
    setLastVisibleCoach(null);
    setHasMoreSessions(true);
    setHasMoreCoaches(true);
    
    await Promise.all([
      fetchSessions(),
      fetchCoaches(),
      fetchPastSessions()
    ]);
    
    setLoading(prev => ({ ...prev, refreshing: false }));
  };

  // Session time validation
  const isSessionValid = (session: Session): boolean => {
    const now = new Date();
    const sessionTime = session.scheduleTime.toDate();
    const timeDiff = sessionTime.getTime() - now.getTime();
    const hoursUntilSession = timeDiff / (1000 * 60 * 60);
    
    // Can't book sessions that start in less than 1 hour
    return hoursUntilSession >= 1;
  };

  // Push notification functions
  const registerForPushNotificationsAsync = async (): Promise<string | null> => {
    let token = null;

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
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
        Alert.alert(
          t('fcAcademy.notificationPermissionTitle'),
          t('fcAcademy.notificationPermissionMessage')
        );
        return null;
      }
      
      token = (await Notifications.getExpoPushTokenAsync()).data;
    } else {
      Alert.alert(t('fcAcademy.physicalDeviceRequired'));
    }

    return token;
  };

  const saveNotificationToken = async (token: string) => {
    try {
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) return;

      const db = getFirestore();
      const userRef = doc(db, 'users', user.uid);
      
      await updateDoc(userRef, {
        expoPushToken: token,
        lastTokenUpdate: Timestamp.now(),
      });
    } catch (err) {
      console.error('Error saving notification token:', err);
    }
  };

  const scheduleSessionNotifications = async (sessions: Session[]) => {
    try {
      // Cancel existing notifications
      await Notifications.cancelAllScheduledNotificationsAsync();

      for (const session of sessions) {
        const sessionTime = session.scheduleTime.toDate();
        const now = new Date();
        
        // Schedule notification 1 hour before
        const oneHourBefore = new Date(sessionTime.getTime() - 60 * 60 * 1000);
        
        if (oneHourBefore > now) {
          await Notifications.scheduleNotificationAsync({
            content: {
              title: t('fcAcademy.sessionReminder'),
              body: t('fcAcademy.sessionStartingSoon', { title: session.title }),
              data: { sessionId: session.id },
              sound: true,
            },
            trigger: oneHourBefore,
          });
        }

        // Schedule notification 10 minutes before
        const tenMinutesBefore = new Date(sessionTime.getTime() - 10 * 60 * 1000);
        
        if (tenMinutesBefore > now) {
          await Notifications.scheduleNotificationAsync({
            content: {
              title: t('fcAcademy.sessionStarting'),
              body: t('fcAcademy.sessionStartingNow', { title: session.title }),
              data: { sessionId: session.id },
              sound: true,
            },
            trigger: tenMinutesBefore,
          });
        }
      }
    } catch (err) {
      console.error('Error scheduling notifications:', err);
    }
  };

  const handleBookSession = (sessionId: string) => {
    const found = sessions.find(s => s.id === sessionId);
    if (found) {
      if (!isSessionValid(found)) {
        Alert.alert(
          t('fcAcademy.bookingNotAllowed'),
          t('fcAcademy.sessionTooSoon')
        );
        return;
      }
      setSelectedSession(found);
      setShowBookingModal(true);
    }
  };

  const handleCancelBooking = async (sessionId: string) => {
    try {
      const db = getFirestore();
      const auth = getAuth();
      const user = auth.currentUser;

      if (!user) return;

      const userId = user.uid;
      const sessionRef = doc(db, 'academy_sessions', sessionId);
      const bookingRef = doc(db, 'academy_sessions', sessionId, 'bookings', userId);

      await updateDoc(sessionRef, {
        registeredCount: increment(-1)
      });
      await deleteDoc(bookingRef);

      Alert.alert(t('fcAcademy.success'), t('fcAcademy.bookingCancelled'));
    } catch (err) {
      console.error('❌ Failed to cancel booking:', err);
      Alert.alert(t('fcAcademy.error'), t('fcAcademy.failedToCancel'));
    }
  };

  const handleViewCoachSessions = (coachId: string) => {
    console.log('View sessions for coach:', coachId);
  };

  const formatDate = (ts?: Timestamp) => {
    if (!ts?.toDate) return t('fcAcademy.notAvailable');
    const d = ts.toDate();
    return d.toLocaleString();
  };

  const openCoachInfo = (coachId: string) => {
    const found = coaches.find(c => c.id === coachId);
    if (found) {
      setSelectedCoach(found);
      setShowCoachModal(true);
    }
  };

  // Loading component
  const LoadingSpinner = ({ text }: { text: string }) => (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color="#00F0FF" />
      <Text style={styles.loadingText}>{text}</Text>
    </View>
  );

  // Error component
  const ErrorMessage = ({ message, onRetry }: { message: string; onRetry: () => void }) => (
    <View style={styles.errorContainer}>
      <Text style={styles.errorText}>{message}</Text>
      <TouchableOpacity onPress={onRetry} style={styles.retryButton}>
        <Text style={styles.retryButtonText}>{t('fcAcademy.retry')}</Text>
      </TouchableOpacity>
    </View>
  );

  // Empty state component
  const EmptyState = ({ title, message, icon }: { title: string; message: string; icon: string }) => (
    <View style={styles.emptyStateContainer}>
      <Text style={styles.emptyStateIcon}>{icon}</Text>
      <Text style={styles.emptyStateTitle}>{title}</Text>
      <Text style={styles.emptyStateMessage}>{message}</Text>
    </View>
  );

  // Render session card
  const renderSession = ({ item }: { item: Session }) => {
    const coach = coaches.find(c => c.id === item.coachId);

    return (
      <View style={styles.sessionCard}>
        <View style={styles.sessionGlowPanel}>
          <View style={styles.sessionCoachRow}>
            {coach?.coachImage && (
              <TouchableOpacity onPress={() => openCoachInfo(item.coachId)}>
                <Image source={{ uri: coach.coachImage }} style={styles.sessionCoachAvatar} />
              </TouchableOpacity>
            )}
            <Text style={styles.sessionCoachName}>{coach?.coachName}</Text>
          </View>

          <Text style={styles.sessionTitle}>{item.title}</Text>
          <Text style={styles.sessionDescription}>
            {item.description?.slice(0, 60) ?? ''}...
          </Text>
          <Text style={styles.sessionTime}>{formatDate(item.scheduleTime)}</Text>

          <Text style={styles.languageIcon}>
            <Text>{item.language?.toUpperCase()}</Text> | <Text>{item.registeredCount ?? 0}</Text> / <Text>{item.capacity ?? t('fcAcademy.capacityNotAvailable')}</Text>
          </Text>

          <TouchableOpacity
            style={[
              styles.bookButton,
              !isSessionValid(item) && styles.bookButtonDisabled
            ]}
            onPress={() => handleBookSession(item.id)}
            disabled={!isSessionValid(item)}
          >
            <Text style={[
              styles.bookButtonText,
              !isSessionValid(item) && styles.bookButtonTextDisabled
            ]}>
              {isSessionValid(item) ? t('fcAcademy.book') : t('fcAcademy.tooSoon')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderMySession = ({ item }: { item: Session }) => {
    const coach = coaches.find(c => c.id === item.coachId);

    return (
      <View style={styles.mySessionBox}>
        <Image
          source={{ uri: coach?.coachImage }}
          style={styles.mySessionThumb}
        />

        <View style={styles.mySessionDetails}>
          <Text style={styles.mySessionTitle}>{item.title}</Text>
          <Text style={styles.mySessionCoach}>👤 <Text>{coach?.coachName ?? t('fcAcademy.coachNotAvailable')}</Text></Text>
          <Text style={styles.mySessionTime}>🕒 <Text>{formatDate(item.scheduleTime)}</Text></Text>

          <View style={{ flexDirection: 'row', gap: 10 }}>
            <TouchableOpacity
              style={styles.enterButton}
              onPress={() =>
                router.push({
                  pathname: '/screens/SessionRoom',
                  params: { sessionId: item.id },
                })
              }
            >
              <Text style={styles.enterButtonText}>{t('fcAcademy.enter')}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.enterButton, { backgroundColor: '#FF4444' }]}
              onPress={() => handleCancelBooking(item.id)}
            >
              <Text style={[styles.enterButtonText, { color: '#fff' }]}>{t('fcAcademy.cancel')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  const markNotificationAsRead = async (notifId: string) => {
    // Implement notification marking logic
  };

  return (
    <ImageBackground
      source={require('../../assets/images/fclive.png')}
      style={styles.pageBackground}
    >
      {/* Custom Header */}
      <CustomHeader
        navigation={navigation}
        route={{ name: 'FC Academy' }}
        options={{ headerTitle: t('fcAcademy.fcLiveAcademy') }}
        back={true}
        notifications={notifications}
        markNotificationAsRead={markNotificationAsRead}
        userId={getAuth().currentUser?.uid || ''}
        onBackPress={() => {
  // Force back to main tabs instead of stack navigation
  router.dismiss(); // This dismisses the current modal/screen
}}
      />

      {/* Visual confirmation */}
      {showBookingSuccess && (
        <View style={styles.successOverlay}>
          <View style={styles.successMessage}>
            <Text style={styles.successText}>{t('fcAcademy.bookingConfirmed')}</Text>
          </View>
        </View>
      )}

      {/* Spacer for header */}
      <View style={{ height: HEADER_OFFSET }} />

      {/* Scrollable content */}
      <ScrollView 
        contentContainerStyle={styles.container}
        refreshControl={
          <RefreshControl
            refreshing={loading.refreshing}
            onRefresh={onRefresh}
            tintColor="#00F0FF"
            colors={['#00F0FF', '#39FF14']}
          />
        }
      >
        <View style={styles.contentWrapper}>
          {/* My Upcoming Sessions */}
          <Text style={styles.mySessionsHeader}>{t('fcAcademy.myUpcomingSessions')}</Text>

          {loading.myBookings ? (
            <LoadingSpinner text={t('fcAcademy.loadingBookings')} />
          ) : errors.myBookings ? (
            <ErrorMessage 
              message={errors.myBookings} 
              onRetry={() => window.location.reload()} 
            />
          ) : myBookings.length > 0 ? (
            <FlatList
              data={myBookings}
              keyExtractor={(item) => item.id}
              renderItem={renderMySession}
              scrollEnabled={false}
            />
          ) : (
            <EmptyState
              icon="📅"
              title={t('fcAcademy.noUpcomingSessions')}
              message={t('fcAcademy.bookSessionsBelow')}
            />
          )}

          {/* Upcoming Sessions */}
          <Text style={styles.sectionLabel}>{t('fcAcademy.upcomingLiveSessions')}</Text>
          
          {loading.sessions ? (
            <LoadingSpinner text={t('fcAcademy.loadingSessions')} />
          ) : errors.sessions ? (
            <ErrorMessage 
              message={errors.sessions} 
              onRetry={() => fetchSessions()} 
            />
          ) : sessions.length > 0 ? (
            <FlatList
              data={sessions}
              keyExtractor={item => item.id}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.sessionsContainer}
              renderItem={renderSession}
              onEndReached={() => {
                if (hasMoreSessions && !loading.sessions) {
                  fetchSessions(true);
                }
              }}
              onEndReachedThreshold={0.5}
            />
          ) : (
            <EmptyState
              icon="🎯"
              title={t('fcAcademy.noSessionsAvailable')}
              message={t('fcAcademy.checkBackLater')}
            />
          )}

          {/* Top Coaches */}
          <Text style={styles.sectionLabel}>{t("fcAcademy.topCoaches")}</Text>
          
          {loading.coaches ? (
            <LoadingSpinner text={t('fcAcademy.loadingCoaches')} />
          ) : errors.coaches ? (
            <ErrorMessage 
              message={errors.coaches} 
              onRetry={() => fetchCoaches()} 
            />
          ) : coaches.length > 0 ? (
            <>
              <FlatList
                data={coaches}
                keyExtractor={(item) => item.id}
                horizontal
                pagingEnabled
                snapToAlignment="center"
                showsHorizontalScrollIndicator={false}
                decelerationRate={0.9}
                onScroll={Animated.event(
                  [{ nativeEvent: { contentOffset: { x: scrollX } } }],
                  { useNativeDriver: false }
                )}
                onEndReached={() => {
                  if (hasMoreCoaches && !loading.coaches) {
                    fetchCoaches(true);
                  }
                }}
                onEndReachedThreshold={0.5}
                renderItem={({ item }) => (
                  <View style={styles.coachCardContainer}>
                    <View style={styles.coachGlowPanel}>
                      <View style={styles.coachImageContainer}>
                        <TouchableOpacity onPress={() => openCoachInfo(item.id)}>
                          <Image 
                            source={{ uri: item.coachCard || item.coachImage }} 
                            style={styles.coachImage} 
                            resizeMode="contain" 
                          />
                        </TouchableOpacity>
                      </View>

                      <Text style={styles.coachName}>{item.coachName}</Text>
                      <Text style={styles.coachInfoText}>{t('fcAcademy.nationality')}: <Text>{item.Nationality}</Text></Text>
                      <Text style={styles.coachInfoText}>{t('fcAcademy.timeZone')}: <Text>{item.timezone}</Text></Text>
                      <Text style={styles.coachInfoText}>{t('fcAcademy.languages')}: <Text>{item.offeringLanguage}</Text></Text>
                      <Text style={styles.achievementHighlight}>
                        🏆 <Text>{item.achievements?.split(',')[0] ?? t('fcAcademy.achievementNotAvailable')}</Text>
                      </Text>

                      <TouchableOpacity
                        onPress={() => handleViewCoachSessions(item.id)}
                        style={styles.bookButton}
                      >
                        <Text style={styles.bookButtonText}>{t('fcAcademy.viewSessions')}</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              />
              
              {/* Pagination dots */}
              <View style={styles.paginationContainer}>
                {coaches.map((_, index) => {
                  const inputRange = [
                    (index - 1) * SCREEN_WIDTH * 0.9,
                    index * SCREEN_WIDTH * 0.9,
                    (index + 1) * SCREEN_WIDTH * 0.9,
                  ];

                  const dotOpacity = scrollX.interpolate({
                    inputRange,
                    outputRange: [0.3, 1, 0.3],
                    extrapolate: 'clamp',
                  });

                  const dotScale = scrollX.interpolate({
                    inputRange,
                    outputRange: [0.8, 1.2, 0.8],
                    extrapolate: 'clamp',
                  });

                  return (
                    <Animated.View
                      key={index}
                      style={[
                        styles.paginationDot,
                        {
                          opacity: dotOpacity,
                          transform: [{ scale: dotScale }],
                        }
                      ]}
                    />
                  );
                })}
              </View>
            </>
          ) : (
            <EmptyState
              icon="👨‍🏫"
              title={t('fcAcademy.noCoachesAvailable')}
              message={t('fcAcademy.coachesComingSoon')}
            />
          )}

          {/* Past Sessions */}
          <Text style={styles.sectionLabel}>{t('fcAcademy.rewatchPastSessions')}</Text>
          
          {loading.pastSessions ? (
            <LoadingSpinner text={t('fcAcademy.loadingPastSessions')} />
          ) : errors.pastSessions ? (
            <ErrorMessage 
              message={errors.pastSessions} 
              onRetry={fetchPastSessions} 
            />
          ) : pastSessions.length > 0 ? (
            <FlatList
              data={pastSessions}
              keyExtractor={(item) => item.id}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 20 }}
              renderItem={({ item }) => (
                <View style={styles.pastSessionCard}>
                  <Image
                    source={{ uri: item.thumbnailUrl }}
                    style={styles.pastSessionThumbnail}
                  />
                  <Text style={styles.pastSessionTitle} numberOfLines={1}>
                    🎯 <Text>{item.sessionTitle}</Text>
                  </Text>
                  <Text style={styles.pastSessionCoach} numberOfLines={1}>
                    👤 <Text>{item.coachId}</Text>
                  </Text>
                  <Text style={styles.pastSessionCoach} numberOfLines={1}>
                    🌐 <Text>{item.language?.toUpperCase() ?? t('fcAcademy.languageNotAvailable')}</Text>
                  </Text>
                  <Text style={styles.pastSessionCoach} numberOfLines={1}>
                    🕒 <Text>{formatDate(item.uploadedAt)}</Text>
                  </Text>
                </View>
              )}
            />
          ) : (
            <EmptyState
              icon="📺"
              title={t('fcAcademy.noPastSessions')}
              message={t('fcAcademy.pastSessionsComingSoon')}
            />
          )}
        </View>
      </ScrollView>

      {/* Coach Modal */}
      {showCoachModal && selectedCoach && (
        <View style={styles.coachModalOverlay}>
          <View style={styles.coachModalContent}>
            <Image source={{ uri: selectedCoach.coachImage }} style={styles.modalCoachImage} />
            <Text style={styles.modalCoachName}>{selectedCoach.coachName}</Text>
            <Text style={styles.modalCoachDetail}>{t('fcAcademy.nationality')}: <Text>{selectedCoach.Nationality}</Text></Text>
            <Text style={styles.modalCoachDetail}>
              {t('fcAcademy.languages')}: <Text>{selectedCoach.offeringLanguage}</Text>
            </Text>
            {selectedCoach.Slogan && (
              <Text style={styles.modalCoachDetail}>"<Text>{selectedCoach.Slogan}</Text>"</Text>
            )}
            {selectedCoach.achievements && (
              <Text style={styles.modalCoachDetail}>
                {t('fcAcademy.achievements')}: <Text>{selectedCoach.achievements}</Text>
              </Text>
            )}
            <TouchableOpacity
              onPress={() => setShowCoachModal(false)}
              style={styles.modalCloseButton}
            >
              <Text style={{ color: '#fff' }}>{t('fcAcademy.close')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Booking Modal */}
      {showBookingModal && selectedSession && (
        <View style={styles.coachModalOverlay}>
          <View style={styles.coachModalContent}>
            <Text style={styles.modalCoachName}>{t('fcAcademy.confirmBooking')}</Text>
            <Text style={styles.modalCoachDetail}>{t('fcAcademy.session')}: <Text>{selectedSession.title}</Text></Text>
            <Text style={styles.modalCoachDetail}>{t('fcAcademy.coach')}: <Text>{coaches.find(c => c.id === selectedSession.coachId)?.coachName ?? t('fcAcademy.coachNotAvailable')}</Text></Text>
            <Text style={styles.modalCoachDetail}>{t('fcAcademy.time')}: <Text>{formatDate(selectedSession.scheduleTime)}</Text></Text>
            <Text style={styles.modalCoachDetail}>
              {t('fcAcademy.availableSpots')}: <Text>{selectedSession.capacity! - (selectedSession.registeredCount ?? 0)}</Text>
            </Text>
            <Text style={[styles.modalCoachDetail, { marginTop: 10 }]}>
              {t('fcAcademy.bookingConfirmationMessage')}
            </Text>

            {loading.booking ? (
              <ActivityIndicator size="large" color="#39FF14" style={{ marginTop: 20 }} />
            ) : (
              <>
                <TouchableOpacity
                  onPress={async () => {
                    try {
                      setLoading(prev => ({ ...prev, booking: true }));
                      setErrors(prev => ({ ...prev, booking: null }));

                      const db = getFirestore();
                      const auth = getAuth();
                      const currentUser = auth.currentUser;

                      if (!currentUser) {
                        Alert.alert(t('fcAcademy.error'), t('fcAcademy.loginRequired'));
                        return;
                      }

                      const userId = currentUser.uid;
                      const sessionRef = doc(db, 'academy_sessions', selectedSession.id);
                      const bookingRef = doc(db, 'academy_sessions', selectedSession.id, 'bookings', userId);

                      // Check if user already booked
                      const bookingSnap = await getDoc(bookingRef);
                      if (bookingSnap.exists()) {
                        Alert.alert(t('fcAcademy.error'), t('fcAcademy.alreadyBooked'));
                        return;
                      }

                      // Check session data
                      const sessionSnap = await getDoc(sessionRef);
                      if (!sessionSnap.exists()) {
                        Alert.alert(t('fcAcademy.error'), t('fcAcademy.sessionNotFound'));
                        return;
                      }

                      const sessionData = sessionSnap.data();
                      const currentCount = sessionData.registeredCount ?? 0;
                      const capacity = sessionData.capacity ?? 0;

                      if (currentCount >= capacity) {
                        Alert.alert(t('fcAcademy.error'), t('fcAcademy.sessionFull'));
                        return;
                      }

                      // Proceed with booking
                      await setDoc(bookingRef, {
                        bookedAt: Timestamp.now(),
                        userId: userId,
                      });

                      await updateDoc(sessionRef, {
                        registeredCount: currentCount + 1,
                      });

                      // Close modal and update local UI
                      setShowBookingModal(false);
                      setSelectedSession(null);

                      // Show visual feedback
                      setShowBookingSuccess(true);
                      setTimeout(() => setShowBookingSuccess(false), 2500);

                      // Update local session count
                      setSessions(prev =>
                        prev.map(s =>
                          s.id === selectedSession.id
                            ? {
                                ...s,
                                registeredCount: currentCount + 1,
                              }
                            : s
                        )
                      );

                      // Send confirmation notification
                      await Notifications.scheduleNotificationAsync({
                        content: {
                          title: t('fcAcademy.bookingConfirmed'),
                          body: t('fcAcademy.sessionBookedSuccess', { title: selectedSession.title }),
                          data: { sessionId: selectedSession.id },
                        },
                        trigger: null, // Send immediately
                      });

                    } catch (err) {
                      console.error('❌ Booking failed:', err);
                      setErrors(prev => ({ 
                        ...prev, 
                        booking: t('fcAcademy.bookingFailed') 
                      }));
                      Alert.alert(t('fcAcademy.error'), t('fcAcademy.bookingFailed'));
                    } finally {
                      setLoading(prev => ({ ...prev, booking: false }));
                    }
                  }}
                  style={styles.modalCloseButton}
                >
                  <Text style={{ color: '#000', fontWeight: 'bold' }}>{t('fcAcademy.confirmBooking')}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => {
                    setShowBookingModal(false);
                    setSelectedSession(null);
                  }}
                  style={[styles.modalCloseButton, { backgroundColor: '#444', marginTop: 10 }]}
                >
                  <Text style={{ color: '#fff' }}>{t('fcAcademy.cancel')}</Text>
                </TouchableOpacity>
              </>
            )}

            {errors.booking && (
              <Text style={styles.errorText}>{errors.booking}</Text>
            )}
          </View>
        </View>
      )}
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  pageBackground: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  container: {
    paddingBottom: 40,
  },
  contentWrapper: {
    width: '100%',
    maxWidth: 380,
    alignSelf: 'center',
    paddingHorizontal: 16,
  },
  
  // Loading States
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    color: '#00F0FF',
    fontSize: 14,
    marginTop: 10,
    fontStyle: 'italic',
  },
  
  // Error States
  errorContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 30,
    backgroundColor: 'rgba(255, 68, 68, 0.1)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FF4444',
    marginVertical: 10,
  },
  errorText: {
    color: '#FF6B6B',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 15,
  },
  retryButton: {
    backgroundColor: '#FF4444',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  
  // Empty States
  emptyStateContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#444',
    marginVertical: 10,
  },
  emptyStateIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyStateTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyStateMessage: {
    color: '#BBBBBB',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  
  // Success overlay
  successOverlay: {
    position: 'absolute',
    top: 100,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 99,
  },
  successMessage: {
    backgroundColor: '#39FF14',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    shadowColor: '#39FF14',
    shadowOpacity: 0.6,
    shadowRadius: 10,
  },
  successText: {
    color: '#000',
    fontWeight: 'bold',
  },

  // Headers
  mySessionsHeader: {
    fontSize: 16,
    fontWeight: '700',
    color: '#39FF14',
    textTransform: 'uppercase',
    marginBottom: 12,
    marginTop: 30,
    letterSpacing: 1.3,
    textShadowColor: '#00FF00',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 6,
    opacity: 0.9,
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#9BE3FF',
    textTransform: 'uppercase',
    marginBottom: 10,
    marginTop: 28,
    letterSpacing: 1.2,
    textShadowColor: '#00BFFF',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 4,
    opacity: 0.8,
  },

  // Session Cards
  sessionsContainer: {
    paddingBottom: 20,
  },
  sessionCard: {
    width: 220,
    marginRight: 16,
    padding: 12,
  },
  sessionGlowPanel: {
    backgroundColor: 'rgba(10,10,30,0.9)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#00f0ff',
    padding: 16,
    shadowColor: '#00f0ff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  sessionCoachRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  sessionCoachAvatar: {
    width: 70,
    height: 70,
    borderRadius: 14,
    marginRight: 6,
    borderWidth: 1,
    borderColor: '#39FF14',
  },
  sessionCoachName: {
    color: '#9BE3FF',
    fontSize: 12,
    fontWeight: '600',
  },
  sessionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'left',
    marginBottom: 4,
  },
  sessionDescription: {
    color: '#BBBBBB',
    fontSize: 12,
    marginBottom: 6,
  },
  sessionTime: {
    fontSize: 12,
    color: '#8DE9FF',
    marginBottom: 4,
  },
  languageIcon: {
    fontSize: 11,
    color: '#39FF14',
    fontWeight: '600',
    marginBottom: 10,
  },
  bookButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#39FF14',
    borderRadius: 5,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  bookButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  bookButtonDisabled: {
    borderColor: '#666',
    opacity: 0.5,
  },
  bookButtonTextDisabled: {
    color: '#999',
  },

  // My Sessions
  mySessionBox: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#39FF14',
    padding: 10,
    marginBottom: 14,
    alignItems: 'center',
  },
  mySessionThumb: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#00FFFF',
  },
  mySessionDetails: {
    flex: 1,
  },
  mySessionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 4,
  },
  mySessionCoach: {
    fontSize: 12,
    color: '#9BE3FF',
    marginBottom: 2,
  },
  mySessionTime: {
    fontSize: 12,
    color: '#FFEB3B',
    marginBottom: 8,
  },
  enterButton: {
    alignSelf: 'flex-start',
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: '#39FF14',
  },
  enterButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#000000',
  },

  // Coach Cards
  coachCardContainer: {
    width: SCREEN_WIDTH * 0.9,
    marginHorizontal: SCREEN_WIDTH * 0.05 / 2,
    borderRadius: 16,
    overflow: 'hidden',
  },
  coachGlowPanel: {
    backgroundColor: 'rgba(20, 5, 30, 0.9)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#FF44AA',
    padding: 14,
    shadowColor: '#FF44AA',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.45,
    shadowRadius: 12,
    alignItems: 'flex-start',
  },
  coachImageContainer: {
    width: '100%',
    height: 240,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    backgroundColor: 'rgba(10, 0, 20, 0.7)',
    borderRadius: 16,
  },
  coachImage: {
    width: 180,
    height: 220,
    resizeMode: 'contain',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FF99CC',
    backgroundColor: 'transparent',
  },
  coachName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 6,
    textShadowColor: '#FF44AA',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 6,
  },
  coachInfoText: {
    color: '#FFE9F9',
    fontSize: 16,
    marginBottom: 4,
  },
  achievementHighlight: {
    color: '#FFD700',
    fontSize: 16,
    fontWeight: 'bold',
    fontStyle: 'italic',
    textShadowColor: '#000',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 4,
    marginBottom: 8,
  },

  // Pagination
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 10,
    marginBottom: 24,
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginHorizontal: 6,
    backgroundColor: '#FF44AA',
  },

  // Past Sessions
  pastSessionCard: {
    width: 140,
    marginRight: 12,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 10,
    padding: 8,
    borderWidth: 1,
    borderColor: '#FF44AA',
  },
  pastSessionThumbnail: {
    width: '100%',
    height: 80,
    borderRadius: 6,
    marginBottom: 6,
  },
  pastSessionTitle: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: 'bold',
    marginBottom: 2,
  },
  pastSessionCoach: {
    fontSize: 11,
    color: '#9BE3FF',
  },

  // Modals
  coachModalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.88)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  coachModalContent: {
    backgroundColor: '#111927',
    padding: 20,
    borderRadius: 12,
    width: '85%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#00f0ff',
  },
  modalCoachImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 1,
    borderColor: '#39FF14',
    marginBottom: 10,
  },
  modalCoachName: {
    color: '#FFFC00',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  modalCoachDetail: {
    color: '#D0E8FF',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 4,
  },
  modalCloseButton: {
    marginTop: 14,
    paddingVertical: 6,
    paddingHorizontal: 20,
    borderRadius: 6,
    backgroundColor: '#39FF14',
  },
});