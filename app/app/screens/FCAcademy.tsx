```javascript
// REWRITTEN FILE: app/app/screens/FCAcademy.tsx
// TOTAL_LOGS_INSERTED: 53
// COMPONENT_NAME: FCAcademy

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
  console.log("FCAcademy: Sessions state initialized.", { sessions: sessions });
  const [coaches, setCoaches] = useState<Coach[]>([]);
  console.log("FCAcademy: Coaches state initialized.", { coaches: coaches });
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  console.log("FCAcademy: Selected session state initialized.", { selectedSession: selectedSession });
  const [showBookingModal, setShowBookingModal] = useState(false);
  console.log("FCAcademy: Show booking modal state initialized.", { showBookingModal: showBookingModal });
  const [pastSessions, setPastSessions] = useState<any[]>([]);
  console.log("FCAcademy: Past sessions state initialized.", { pastSessions: pastSessions });
  const [myBookings, setMyBookings] = useState<Session[]>([]);
  console.log("FCAcademy: My bookings state initialized.", { myBookings: myBookings });
  const [showBookingSuccess, setShowBookingSuccess] = useState(false);
  console.log("FCAcademy: Show booking success state initialized.", { showBookingSuccess: showBookingSuccess });
  const [selectedCoach, setSelectedCoach] = useState<Coach | null>(null);
  console.log("FCAcademy: Selected coach state initialized.", { selectedCoach: selectedCoach });
  const [showCoachModal, setShowCoachModal] = useState(false);
  console.log("FCAcademy: Show coach modal state initialized.", { showCoachModal: showCoachModal });

  // Loading and error states
  const [loading, setLoading] = useState<LoadingState>({
    sessions: true,
    coaches: true,
    pastSessions: true,
    myBookings: true,
    booking: false,
    refreshing: false,
  });
  console.log("FCAcademy: Loading state initialized.", { loading: loading });

  const [errors, setErrors] = useState<ErrorState>({
    sessions: null,
    coaches: null,
    pastSessions: null,
    myBookings: null,
    booking: null,
  });
  console.log("FCAcademy: Errors state initialized.", { errors: errors });

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
    console.log("FCAcademy: useEffect for push notifications triggered.");
    registerForPushNotificationsAsync().then(token => {
      if (token) {
        setExpoPushToken(token);
        console.log("FCAcademy: Expo push token obtained.", { token: token });
        // Save token to user profile in Firestore
        saveNotificationToken(token);
        console.log("FCAcademy: Notification token save initiated.");
      } else {
        console.log("FCAcademy: No Expo push token received.");
      }
    });

    // Listen for notification responses
    const responseListener = Notifications.addNotificationResponseReceivedListener(response => {
      console.log("FCAcademy: Notification response received.", { response: response });
      const data = response.notification.request.content.data;
      if (data.sessionId) {
        console.log("FCAcademy: Navigating to SessionRoom from notification.", { sessionId: data.sessionId });
        // Navigate to session room or session details
        router.push({
          pathname: '/screens/SessionRoom',
          params: { sessionId: data.sessionId },
        });
      }
    });

    return () => {
      console.log("FCAcademy: Cleaning up notification response listener.");
      Notifications.removeNotificationSubscription(responseListener);
    };
  }, []);

  // Fetch sessions with pagination and error handling
  const fetchSessions = async (loadMore = false) => {
    console.log(`FCAcademy: Fetching sessions. Load more: ${loadMore}`);
    try {
      if (!loadMore) {
        setLoading(prev => ({ ...prev, sessions: true }));
        console.log("FCAcademy: Sessions loading state set to true.");
        setErrors(prev => ({ ...prev, sessions: null }));
        console.log("FCAcademy: Sessions error state cleared.");
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
        console.log("FCAcademy: Fetching more sessions, starting after last visible.");
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
      console.log("FCAcademy: Sessions API call successful.");

      if (snap.empty && !loadMore) {
        console.log("FCAcademy: No upcoming sessions available.");
        setHasMoreSessions(false);
        setSessions([]);
      } else {
        const data = snap.docs.map(doc => ({
          id: doc.id,
          ...(doc.data() as any),
        }));

        if (loadMore) {
          setSessions(prev => {
            const newSessions = [...prev, ...data];
            console.log("FCAcademy: Appended new sessions.", { count: data.length, total: newSessions.length });
            return newSessions;
          });
        } else {
          setSessions(data as Session[]);
          console.log("FCAcademy: Set initial sessions.", { count: data.length });
        }

        setLastVisibleSession(snap.docs[snap.docs.length - 1] || null);
        setHasMoreSessions(snap.docs.length === 10);
        console.log("FCAcademy: Pagination for sessions updated.", { hasMoreSessions: snap.docs.length === 10 });
      }
    } catch (err: any) {
      console.error('FCAcademy: Error loading academy sessions:', err);
      setErrors(prev => ({
        ...prev,
        sessions: t('fcAcademy.errorLoadingSessions', { message: err.message }),
      }));
      console.log("FCAcademy: Sessions loading failed.", { error: err.message });
    } finally {
      setLoading(prev => ({ ...prev, sessions: false }));
      console.log("FCAcademy: Sessions loading state set to false.");
    }
  };

  // Fetch coaches with pagination
  const fetchCoaches = async (loadMore = false) => {
    console.log(`FCAcademy: Fetching coaches. Load more: ${loadMore}`);
    try {
      if (!loadMore) {
        setLoading(prev => ({ ...prev, coaches