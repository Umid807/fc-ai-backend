import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Image,
  Modal,
  Animated,
  Easing,
  Alert,
  Dimensions,
  TouchableWithoutFeedback,
  ImageBackground,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Audio } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import { useFonts } from 'expo-font';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
// === COMPONENTS ===
import { CustomHeader } from '../../components/CustomHeader';
import { RaffleRules } from '../../components/RaffleRules';
import '../i18n/i18n'; // Initialize i18n
// === FIREBASE IMPORTS ===
import { getAuth } from 'firebase/auth';
import {
  getFirestore,
  doc,
  updateDoc,
  getDoc,
  onSnapshot,
  collection,
  writeBatch,
} from 'firebase/firestore';

// === FIREBASE SETUP (CONSOLIDATED) ===
const auth = getAuth();
const db = getFirestore();

// === TYPES ===
interface Winner {
  id: string;
  profileImage?: string;
  username: string;
  prize: string;
}

interface UserData {
  uid?: string;
  profileImage?: string;
  username?: string;
  rank?: string;
  vip?: boolean;
  coins?: number;
  raffleTickets?: number;
}

// === CONSTANTS ===
const TICKET_PRICE = 1000;
const BULK_BONUS_THRESHOLD = 10;
const VIP_BONUS = 5000;

// === UTILITY FUNCTIONS ===
const getNextFriday8pmEST = (): number => {
  const now = new Date();
  const estOffset = -5; // EST is UTC-5
  const currentEST = new Date(now.getTime() + (estOffset * 60 * 60 * 1000));
  
  const dayOfWeek = currentEST.getDay();
  const daysUntilFriday = (5 - dayOfWeek + 7) % 7 || 7;
  
  const nextFriday = new Date(currentEST);
  nextFriday.setDate(currentEST.getDate() + daysUntilFriday);
  nextFriday.setHours(20, 0, 0, 0); // 8 PM
  
  return nextFriday.getTime();
};

const formatTimeLeft = (timeLeft: number) => {
  if (timeLeft <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0 };
  
  const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
  const hours = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);
  
  return { days, hours, minutes, seconds };
};

// === FIREBASE HELPER FUNCTIONS ===
const useFirebaseUser = () => {
  const user = auth.currentUser;
  
  const getUserDocRef = useCallback(() => {
    if (!user) {
      console.error('User not authenticated');
      return null;
    }
    return doc(db, 'users', user.uid);
  }, [user]);

  const updateUserData = useCallback(async (updates: Partial<UserData>) => {
    const userDocRef = getUserDocRef();
    if (!userDocRef) return false;
    
    try {
      await updateDoc(userDocRef, updates);
      return true;
    } catch (error) {
      console.error('Error updating user data:', error);
      return false;
    }
  }, [getUserDocRef]);

  const fetchUserData = useCallback(async (): Promise<UserData | null> => {
    const userDocRef = getUserDocRef();
    if (!userDocRef) return null;
    
    try {
      const docSnap = await getDoc(userDocRef);
      return docSnap.exists() ? docSnap.data() as UserData : null;
    } catch (error) {
      console.error('Error fetching user data:', error);
      return null;
    }
  }, [getUserDocRef]);

  return { updateUserData, fetchUserData, user };
};

// === ANIMATED COUNTDOWN COMPONENT ===
const NeonCountdown: React.FC<{
  targetTime: number;
  onPress: () => void;
}> = ({ targetTime, onPress }) => {
  const { t } = useTranslation();
  const [timeLeft, setTimeLeft] = useState(targetTime - Date.now());
  const glowAnim = useRef(new Animated.Value(0.4)).current;
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    intervalRef.current = setInterval(() => {
      setTimeLeft(targetTime - Date.now());
    }, 1000);

    // Much more subtle glow animation
    const glowAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 0.8,
          duration: 4000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: false,
        }),
        Animated.timing(glowAnim, {
          toValue: 0.4,
          duration: 4000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: false,
        }),
      ])
    );

    glowAnimation.start();

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      glowAnimation.stop();
    };
  }, [targetTime, glowAnim]);

  const { days, hours, minutes, seconds } = useMemo(() => 
    formatTimeLeft(timeLeft), [timeLeft]
  );

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
      <View style={styles.neonContainer}>
        {/* Animated glow background */}
        <Animated.View style={[
          styles.neonGlow,
          { opacity: glowAnim }
        ]} />
        
        <LinearGradient
          colors={['rgba(0, 255, 255, 0.3)', 'rgba(147, 0, 211, 0.3)', 'rgba(255, 20, 147, 0.3)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.neonBorder}
        >
          <View style={styles.neonInner}>
            <Text style={styles.neonTitle}>
              {t('raffle.nextDrawIn')}
            </Text>
            
            <View style={styles.neonTimeContainer}>
              <View style={styles.neonTimeSegment}>
                <Text style={[styles.neonTimeValue, { color: '#00FFFF' }]}>
                  {days.toString().padStart(2, '0')}
                </Text>
                <Text style={styles.neonTimeLabel}>DAYS</Text>
              </View>
              
              <View style={styles.neonTimeSegment}>
                <Text style={[styles.neonTimeValue, { color: '#9370DB' }]}>
                  {hours.toString().padStart(2, '0')}
                </Text>
                <Text style={styles.neonTimeLabel}>HOURS</Text>
              </View>
              
              <View style={styles.neonTimeSegment}>
                <Text style={[styles.neonTimeValue, { color: '#FF1493' }]}>
                  {minutes.toString().padStart(2, '0')}
                </Text>
                <Text style={styles.neonTimeLabel}>MIN</Text>
              </View>
              
              <View style={styles.neonTimeSegment}>
                <Text style={[styles.neonTimeValue, { color: '#00FF7F' }]}>
                  {seconds.toString().padStart(2, '0')}
                </Text>
                <Text style={styles.neonTimeLabel}>SEC</Text>
              </View>
            </View>
          </View>
        </LinearGradient>
      </View>
    </TouchableOpacity>
  );
};

// === WINNERS SECTION COMPONENT ===
const WinnersSection: React.FC = () => {
  const { t } = useTranslation();
  const [winners, setWinners] = useState<Winner[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;


  useEffect(() => {
    const winnersCollectionRef = collection(db, 'winnerOfTheWeek');
    
    const unsubscribe = onSnapshot(
      winnersCollectionRef,
      (snapshot) => {
        try {
          const winnersData = snapshot.docs.map((docSnap) => ({
            id: docSnap.id,
            ...docSnap.data(),
          })) as Winner[];
          
          setWinners(winnersData);
          setError(null);
          
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }).start();
        } catch (err) {
          console.error('Error processing winners data:', err);
          setError('Failed to load winners');
        } finally {
          setLoading(false);
        }
      },
      (err) => {
        console.error('Error fetching winners:', err);
        setError('Failed to load winners');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [fadeAnim]);

  useEffect(() => {
    // Subtle floating animation
    const scaleAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 1.02,
          duration: 4000,
          useNativeDriver: true,
          easing: Easing.inOut(Easing.sin),
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 4000,
          useNativeDriver: true,
          easing: Easing.inOut(Easing.sin),
        }),
      ])
    );

    scaleAnimation.start();
   

    return () => {
      scaleAnimation.stop();
 
    };
  }, [scaleAnim, shineAnim]);

  if (loading) {
    return (
      <LinearGradient
        colors={['#1a1a1a', '#333']}
        style={styles.winnersContainer}
      >
        <Text style={styles.sectionTitle}>{t('raffle.loadingWinners')}</Text>
      </LinearGradient>
    );
  }

  if (error) {
    return (
      <LinearGradient
        colors={['#1a1a1a', '#333']}
        style={styles.winnersContainer}
      >
        <Text style={styles.sectionTitle}>{t('raffle.errorLoadingWinners')}</Text>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient
      colors={['#0a0a0a', '#1a1a1a', '#2a2a2a']}
      start={{ x: 0, y: 0 }} 
      end={{ x: 1, y: 1 }}
      style={styles.winnersContainer}
    >
      <View style={styles.winnersInnerContainer}>
        <View style={styles.winnersHeader}>
          <Ionicons name="trophy" size={28} color="#FFD700" style={styles.trophyIcon} />
          <Text style={styles.sectionTitle}>{t('raffle.lastDrawWinners')}</Text>
          <Ionicons name="trophy" size={28} color="#FFD700" style={styles.trophyIcon} />
        </View>
        
        <Animated.View style={{ 
          transform: [{ scale: scaleAnim }],
          opacity: fadeAnim,
        }}>
          {winners.length > 0 ? (
            winners.map((winner, index) => (
              <Animated.View 
                key={winner.id} 
                style={[
                  styles.championCard,
                  {
                    opacity: fadeAnim,
                    transform: [{
                      translateY: fadeAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [20, 0],
                      })
                    }]
                  }
                ]}
              >
                {/* Shine effect overlay */}
                <Animated.View style={[
                  styles.shineOverlay,
                  {
                    transform: [{
                      translateX: shineAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [-200, 200],
                      })
                    }]
                  }
                ]} />
                
                <LinearGradient
                  colors={['rgba(255, 215, 0, 0.8)', 'rgba(255, 140, 0, 0.6)', 'rgba(255, 69, 0, 0.4)']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.championBorder}
                >
                  <View style={styles.championInner}>
                    <View style={styles.winnerImageContainer}>
                      <Image
                        source={{ 
                          uri: winner.profileImage || 'https://via.placeholder.com/50' 
                        }}
                        style={styles.championImage}
                      />
                      <View style={styles.crownOverlay}>
                        <Ionicons name="star" size={16} color="#FFD700" />
                      </View>
                    </View>
                    
                    <View style={styles.winnerInfo}>
                      <Text style={styles.championName}>
                        🏆 {winner.username}
                      </Text>
                      <Text style={styles.prizeText}>
                        {t('raffle.won')} {winner.prize}
                      </Text>
                    </View>
                    
                    <View style={styles.celebrationEffects}>
                      <Text style={styles.sparkles}>✨</Text>
                    </View>
                  </View>
                </LinearGradient>
              </Animated.View>
            ))
          ) : (
            <View style={styles.noWinnersContainer}>
              <Ionicons name="hourglass-outline" size={48} color="#666" />
              <Text style={styles.noWinnersText}>{t('raffle.noWinnersYet')}</Text>
            </View>
          )}
        </Animated.View>
      </View>
    </LinearGradient>
  );
};

// === PURCHASE LOGIC HOOK ===
const usePurchaseLogic = () => {
  const { updateUserData, fetchUserData } = useFirebaseUser();
  const [purchasing, setPurchasing] = useState(false);
  const { t } = useTranslation();

  const executePurchase = useCallback(async (
    count: number,
    currentCoins: number,
    currentTickets: number,
    setUserCoins: (coins: number) => void,
    setTicketsCount: (tickets: number) => void,
    onSuccess: (totalTickets: number) => void
  ) => {
    if (purchasing) return; // Prevent double-purchases
    
    setPurchasing(true);
    
    try {
      const bonusTickets = Math.floor(count / BULK_BONUS_THRESHOLD);
      const totalTicketsToAdd = count + bonusTickets;
      const totalCost = TICKET_PRICE * count;

      if (currentCoins < totalCost) {
        Alert.alert(
          t('raffle.insufficientCoins'),
          t('raffle.insufficientCoinsMessage')
        );
        return;
      }

      const newCoinCount = currentCoins - totalCost;
      const newTicketsCount = currentTickets + totalTicketsToAdd;

      // Update local state immediately for responsiveness
      setUserCoins(newCoinCount);
      setTicketsCount(newTicketsCount);

      // Batch update Firebase
      const updateSuccess = await updateUserData({
        coins: newCoinCount,
        raffleTickets: newTicketsCount,
      });

      if (updateSuccess) {
        onSuccess(totalTicketsToAdd);
        
        // Verify the update
        const freshData = await fetchUserData();
        if (freshData?.coins !== undefined) {
          setUserCoins(freshData.coins);
        }
        if (freshData?.raffleTickets !== undefined) {
          setTicketsCount(freshData.raffleTickets);
        }
      } else {
        throw new Error('Failed to update user data');
      }
    } catch (error) {
      console.error('Purchase error:', error);
      Alert.alert(t('raffle.purchaseError'), t('raffle.purchaseErrorMessage'));
      
      // Revert local state on error
      const freshData = await fetchUserData();
      if (freshData) {
        setUserCoins(freshData.coins ?? currentCoins);
        setTicketsCount(freshData.raffleTickets ?? currentTickets);
      }
    } finally {
      setPurchasing(false);
    }
  }, [purchasing, updateUserData, fetchUserData, t]);

  return { executePurchase, purchasing };
};

// === TICKET PURCHASE PANEL ===
const TicketPurchasePanel: React.FC<{
  userCoins: number;
  setUserCoins: (coins: number) => void;
  ticketsCount: number;
  setTicketsCount: (count: number) => void;
  onTicketPurchased: (count: number) => void;
  toggleRulesModal: () => void;
  openTicketsModal: () => void;
}> = ({
  userCoins,
  setUserCoins,
  ticketsCount,
  setTicketsCount,
  onTicketPurchased,
  toggleRulesModal,
  openTicketsModal,
}) => {
  const { t } = useTranslation();
  const [purchaseCount, setPurchaseCount] = useState(0);
  const { executePurchase, purchasing } = usePurchaseLogic();
  const buttonScaleAnim = useRef(new Animated.Value(1)).current;

  const handleIncrease = useCallback(() => {
    setPurchaseCount(prev => prev + 1);
    // Button press animation
    Animated.sequence([
      Animated.timing(buttonScaleAnim, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(buttonScaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
  }, [buttonScaleAnim]);

  const handleDecrease = useCallback(() => {
    setPurchaseCount(prev => Math.max(0, prev - 1));
    // Button press animation
    Animated.sequence([
      Animated.timing(buttonScaleAnim, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(buttonScaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
  }, [buttonScaleAnim]);

  const handlePurchase = useCallback(() => {
    if (purchaseCount <= 0 || purchasing) return;

    const bonusTickets = Math.floor(purchaseCount / BULK_BONUS_THRESHOLD);
    const totalTickets = purchaseCount + bonusTickets;
    const totalCost = TICKET_PRICE * purchaseCount;

    Alert.alert(
      t('raffle.purchaseConfirmTitle'),
      t('raffle.purchaseConfirmMessage', {
        count: purchaseCount,
        plural: purchaseCount === 1 ? '' : 's',
        totalTickets,
        cost: totalCost
      }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.confirm'),
          onPress: () => {
            executePurchase(
              purchaseCount,
              userCoins,
              ticketsCount,
              setUserCoins,
              setTicketsCount,
              onTicketPurchased
            );
            setPurchaseCount(0);
          },
        },
      ]
    );
  }, [
    purchaseCount,
    purchasing,
    userCoins,
    ticketsCount,
    executePurchase,
    setUserCoins,
    setTicketsCount,
    onTicketPurchased,
    t
  ]);

  return (
    <LinearGradient
      colors={['#1a1a1a', '#333']}
      start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
      style={styles.rafflePurchaseContainer}
    >
      <View style={styles.purchaseContainer}>
        <View style={styles.purchaseHeader}>
          <Text style={styles.purchaseTitle}>{t('raffle.buyRaffleTickets')}</Text>
          <TouchableOpacity onPress={toggleRulesModal}>
            <Ionicons name="help-circle-outline" size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        <Text style={styles.ticketPrice}>
          {TICKET_PRICE} {t('raffle.coinsPerTicket')}
        </Text>

        <Text style={styles.bulkDiscount}>
          {t('raffle.bulkDiscount', { threshold: BULK_BONUS_THRESHOLD })}
        </Text>

        <View style={styles.counterRow}>
          <Animated.View style={{ transform: [{ scale: buttonScaleAnim }] }}>
            <TouchableOpacity 
              style={[styles.counterButton, purchasing && styles.disabledButton]} 
              onPress={handleDecrease}
              disabled={purchasing}
            >
              <Text style={styles.counterButtonText}>-</Text>
            </TouchableOpacity>
          </Animated.View>
          
          <Text style={styles.purchaseCount}>{purchaseCount}</Text>
          
          <Animated.View style={{ transform: [{ scale: buttonScaleAnim }] }}>
            <TouchableOpacity 
              style={[styles.counterButton, purchasing && styles.disabledButton]} 
              onPress={handleIncrease}
              disabled={purchasing}
            >
              <Text style={styles.counterButtonText}>+</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>

        <LinearGradient 
          colors={purchasing ? ['#666', '#444'] : ['#ff7e5f', '#feb47b']} 
          style={styles.gradientButton}
        >
          <TouchableOpacity 
            style={styles.purchaseButton} 
            onPress={handlePurchase}
            disabled={purchasing || purchaseCount <= 0}
          >
            <Text style={styles.purchaseButtonText}>
              {purchasing ? t('raffle.purchasing') : t('raffle.confirmPurchase')}
            </Text>
          </TouchableOpacity>
        </LinearGradient>

        <TouchableOpacity onPress={openTicketsModal}>
          <Text style={styles.ticketOwned}>
            {t('raffle.totalTicketsOwned', { count: ticketsCount })}
          </Text>
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
};

// === MAIN RAFFLE PAGE ===
const RafflePage: React.FC = () => {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { fetchUserData, user } = useFirebaseUser();

  // Load custom fonts
  const [fontsLoaded] = useFonts({
    'Orbitron-Bold': require('../../assets/fonts/Orbitron/Orbitron-Regular.ttf'),
    'Exo2-Bold': require('../../assets/fonts/Orbitron/Orbitron-Regular.ttf'),
    'Rajdhani-Bold': require('../../assets/fonts/Orbitron/Orbitron-Regular.ttf'),
  });

  // State management
  const [userCoins, setUserCoins] = useState(0);
  const [totalEntries, setTotalEntries] = useState(0);
  const [ticketsCount, setTicketsCount] = useState(0);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [purchasedTickets, setPurchasedTickets] = useState(0);
  const [rulesVisible, setRulesVisible] = useState(false);
  const [ticketsModalVisible, setTicketsModalVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState([]);

  // Animation refs
  const ticketAnim = useRef(new Animated.Value(0)).current;
  const sparkleAnim = useRef(new Animated.Value(0)).current;
  const sparkleRotateAnim = useRef(new Animated.Value(0)).current; // Separate rotation animation
  const headerFadeAnim = useRef(new Animated.Value(0)).current;
  const entriesCountAnim = useRef(new Animated.Value(0)).current;
  const soundRef = useRef<Audio.Sound | null>(null);

  // Cleanup refs
  const unsubscribeRefs = useRef<(() => void)[]>([]);

  // Load initial data
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        if (user) {
          const userData = await fetchUserData();
          if (userData) {
            setUserCoins(userData.coins ?? 0);
            setTicketsCount(userData.raffleTickets ?? 0);
          }
        }

        // Fade in header animation
        Animated.timing(headerFadeAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }).start();

      } catch (error) {
        console.error('Error loading initial data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadInitialData();
  }, [user, fetchUserData, headerFadeAnim]);

  // Setup Firebase listeners
  useEffect(() => {
    if (!user) return;

    // User data listener
    const userDocRef = doc(db, 'users', user.uid);
    const unsubscribeUser = onSnapshot(
      userDocRef,
      (docSnapshot) => {
        if (docSnapshot.exists()) {
          const data = docSnapshot.data();
          setUserCoins(data.coins ?? 0);
          setTicketsCount(data.raffleTickets ?? 0);
        }
      },
      (error) => {
        console.error('Error listening to user data:', error);
      }
    );

    // Raffle pool listener
    const rafflePoolRef = collection(db, 'raffle pool');
    const unsubscribePool = onSnapshot(
      rafflePoolRef,
      (snapshot) => {
        let total = 0;
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          total += data.lockedTickets || 0;
        });
        setTotalEntries(total);

        // Animate entries count change
        Animated.timing(entriesCountAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }).start();
      },
      (error) => {
        console.error('Error listening to raffle pool:', error);
      }
    );

    unsubscribeRefs.current = [unsubscribeUser, unsubscribePool];

    return () => {
      unsubscribeRefs.current.forEach(unsubscribe => unsubscribe());
    };
  }, [user, entriesCountAnim]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (soundRef.current) {
        soundRef.current.unloadAsync();
      }
      unsubscribeRefs.current.forEach(unsubscribe => unsubscribe());
    };
  }, []);

  // Animation functions
  const runTicketAnimation = useCallback(() => {
    ticketAnim.setValue(0);
    Animated.timing(ticketAnim, {
      toValue: 1,
      duration: 800,
      easing: Easing.elastic(1.2),
      useNativeDriver: true,
    }).start();
  }, [ticketAnim]);

  const runSparkleAnimation = useCallback(() => {
    sparkleAnim.setValue(0);
    sparkleRotateAnim.setValue(0);
    
    // Scale animation
    Animated.timing(sparkleAnim, {
      toValue: 1,
      duration: 1200,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();

    // Rotation animation (separate)
    Animated.timing(sparkleRotateAnim, {
      toValue: 1,
      duration: 1200,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [sparkleAnim, sparkleRotateAnim]);

  // Event handlers
  const handleTicketPurchased = useCallback(async (count: number) => {
    setPurchasedTickets(count);
    setShowConfirmation(true);
    runTicketAnimation();
    runSparkleAnimation();
  }, [runTicketAnimation, runSparkleAnimation]);

  const navigateToDrawDetails = useCallback(() => {
    router.push('/screens/drawDetails');
  }, [router]);

  const toggleRulesModal = useCallback(() => {
    setRulesVisible(prev => !prev);
  }, []);

  const markNotificationAsRead = useCallback(async (notifId: string) => {
    // Implement notification read functionality
  }, []);

  const nextDrawTime = useMemo(() => getNextFriday8pmEST(), []);

  if (!fontsLoaded || loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>{t('common.loading')}</Text>
      </View>
    );
  }

  return (
    <ImageBackground
      source={require('../../assets/images/bk17.png')}
      style={styles.fullBackground}
      resizeMode="cover"
    >
      {/* Custom Header */}
      <CustomHeader
        navigation={{ goBack: () => router.back() }}
        route={{ name: t('raffle.championsRaffle') }}
        options={{ headerTitle: t('raffle.championsRaffle') }}
        back={true}
        notifications={notifications}
        markNotificationAsRead={markNotificationAsRead}
        userId={user?.uid || ''}
        onBackPress={() => router.back()}
      />

      <ScrollView 
        contentContainerStyle={[
          styles.scrollContainer,
          { paddingTop: insets.top + 70 }
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Section with Image Background */}
        <Animated.View style={{ opacity: headerFadeAnim }}>
<ImageBackground
  source={require('../../assets/images/rafflehero.png')}
  style={styles.heroContainer}
  imageStyle={{ borderRadius: 12, resizeMode: 'cover' }}
>
  <View style={styles.heroOverlay}>
    {/* Title stays at top */}
    <Animated.Text 
      style={[
        styles.heroTitle,
        { 
          fontFamily: 'Orbitron-Bold',
          marginTop: 20,
          transform: [{
            scale: headerFadeAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [0.8, 1],
            })
          }]
        }
      ]}
    >
      {t('raffle.championsRaffle')}
    </Animated.Text>
    
    {/* Countdown positioned absolutely in center */}
    <View style={styles.countdownPosition}>
      <NeonCountdown
        targetTime={nextDrawTime}
        onPress={navigateToDrawDetails}
      />
    </View>

{/* Circular How to Play button - top right */}
<TouchableOpacity 
  onPress={toggleRulesModal} 
  style={styles.circularHelpButton}
  activeOpacity={0.8}
>
  <LinearGradient
    colors={['#FFD700', '#FFA500', '#FF6B35']}
    style={styles.helpButtonGradient}
  >
    <Ionicons name="help" size={20} color="#000" />
  </LinearGradient>
  <View style={styles.helpButtonGlow} />
</TouchableOpacity>

    {/* Tickets entered at bottom */}
    <View style={styles.entriesPosition}>
      <Animated.Text 
        style={[
          styles.entriesText,
          {
            opacity: entriesCountAnim,
            transform: [{
              translateY: entriesCountAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [20, 0],
              })
            }]
          }
        ]}
      >
        🔥 {totalEntries} {t('raffle.ticketsEnteredThisWeek')}
      </Animated.Text>
    </View>
  </View>
</ImageBackground>
        </Animated.View>



        {/* Circular Gaming Enter Draw Button */}
<View style={styles.circularButtonContainer}>
  <TouchableOpacity
    style={styles.circularButtonWrapper}
    onPress={navigateToDrawDetails}
    activeOpacity={0.8}
  >
    <Animated.View style={[
      styles.circularButtonGlow,
      { opacity: headerFadeAnim }
    ]} />
    
    <LinearGradient
      colors={['#FF0080', '#FF8C00', '#FFD700', '#00FF80', '#0080FF']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.circularButtonBorder}
    >
      <View style={styles.circularButtonInner}>
        <LinearGradient
          colors={['#1a1a1a', '#2d2d2d', '#1a1a1a']}
          style={styles.circularButtonCenter}
        >
          <Ionicons name="flash" size={32} color="#FFD700" style={styles.buttonIcon} />
          <Text style={[styles.circularButtonText, { fontFamily: 'Exo2-Bold' }]}>
            {t('raffle.enterTheDraw')}
          </Text>

        </LinearGradient>
      </View>
    </LinearGradient>
  </TouchableOpacity>
</View>

        {/* Ticket Purchase Panel */}
        <TicketPurchasePanel
          userCoins={userCoins}
          setUserCoins={setUserCoins}
          ticketsCount={ticketsCount}
          setTicketsCount={setTicketsCount}
          onTicketPurchased={handleTicketPurchased}
          toggleRulesModal={toggleRulesModal}
          openTicketsModal={() => setTicketsModalVisible(true)}
        />

        {/* Winners Section */}
        <WinnersSection />

        {/* Confirmation Modal */}
        <Modal
          transparent
          visible={showConfirmation}
          onRequestClose={() => setShowConfirmation(false)}
          animationType="slide"
        >
          <View style={styles.modalOverlay}>
            <View style={styles.confirmationModalContent}>
              <Animated.View style={{ 
                opacity: sparkleAnim,
                transform: [
                  {
                    scale: sparkleAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.5, 1.2],
                    })
                  }
                ]
              }}>
                <Animated.View style={{
                  transform: [
                    {
                      rotate: sparkleRotateAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: ['0deg', '360deg'],
                      })
                    }
                  ]
                }}>
                  <Text style={styles.sparkleText}>{t('raffle.sparkleEffect')}</Text>
                </Animated.View>
              </Animated.View>
              
              <Text style={[styles.modalText, { fontFamily: 'Exo2-Bold' }]}>
                {t('raffle.congratsPurchase', { 
                  count: purchasedTickets,
                  plural: purchasedTickets === 1 ? '' : 's'
                })}
              </Text>
              
              <Text style={styles.modalSubText}>
                {t('raffle.currentlyOwn', { 
                  count: ticketsCount, 
                  plural: ticketsCount === 1 ? '' : 's' 
                })}
              </Text>
              
              <TouchableOpacity
                style={styles.modalButton}
                onPress={() => setShowConfirmation(false)}
              >
                <Text style={styles.modalButtonText}>{t('common.close')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Tickets Owned Modal */}
        <Modal
          transparent
          visible={ticketsModalVisible}
          onRequestClose={() => setTicketsModalVisible(false)}
          animationType="fade"
        >
          <TouchableWithoutFeedback onPress={() => setTicketsModalVisible(false)}>
            <View style={styles.modalOverlay} />
          </TouchableWithoutFeedback>
          
          <View style={styles.centeredModalWrapper}>
            <View style={styles.modalContent}>
              <Text style={[styles.modalText, { fontFamily: 'Exo2-Bold' }]}>
                {t('raffle.currentlyOwn', { 
                  count: ticketsCount, 
                  plural: ticketsCount === 1 ? '' : 's' 
                })}
              </Text>
              <Text style={styles.modalSubText}>
                {t('raffle.goodLuck')}
              </Text>
              <TouchableOpacity
                style={styles.modalButton}
                onPress={() => setTicketsModalVisible(false)}
              >
                <Text style={styles.modalButtonText}>{t('common.close')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Rules Modal using RaffleRules component */}
        <RaffleRules
          visible={rulesVisible}
          onClose={toggleRulesModal}
        />
      </ScrollView>
    </ImageBackground>
  );
};

export default RafflePage;

// === STYLES ===
const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  fullBackground: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  scrollContainer: {
    padding: 8,
    paddingBottom: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#121212',
  },
  loadingText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  heroContainer: {
    marginHorizontal: 8,
    marginBottom: 16,
    height: 500,
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    borderWidth: 1, // Subtle border
    borderColor: 'rgba(255, 215, 0, 0.2)', // Goldish border
  },
heroOverlay: {
  flex: 1,
  padding: 20,
  justifyContent: 'flex-start', // Change from 'space-between'
  alignItems: 'center',
  backgroundColor: 'rgba(0, 0, 0, 0.4)',
  position: 'relative', // Add this
},
  heroTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFD700',
    textAlign: 'center',
    marginTop: 30,
    textShadowColor: '#000',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
  },
  entriesText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFF',
    textAlign: 'center',
    marginVertical: 10,
    textShadowColor: '#000',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },

  neonButton: {
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#FF4500',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
  },

circularHelpButton: {
  position: 'absolute',
  top: 15,
  right: 15,
  width: 30,
  height: 30,
  borderRadius: 22,
  elevation: 8,
  shadowColor: '#FFD700',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.6,
  shadowRadius: 8,
  zIndex: 10,
},
helpButtonGradient: {
  width: 30,
  height: 30,
  borderRadius: 22,
  justifyContent: 'center',
  alignItems: 'center',
  borderWidth: 2,
  borderColor: 'rgba(255, 255, 255, 0.3)',
},
helpButtonGlow: {
  position: 'absolute',
  top: -8,
  left: -8,
  right: -8,
  bottom: -8,
  borderRadius: 30,
  backgroundColor: 'rgba(255, 215, 0, 0.2)',
  shadowColor: '#FFD700',
  shadowOffset: { width: 0, height: 0 },
  shadowOpacity: 0.8,
  shadowRadius: 12,
  elevation: 5,
  zIndex: -1,
},
  // === REDESIGNED WINNERS CONTAINER ===
// === REDESIGNED WINNERS STYLES ===
winnersContainer: {
  marginHorizontal: 8,
  marginBottom: 16,
  borderRadius: 20,
  overflow: 'hidden',
  borderWidth: 3,
  borderColor: 'rgba(255, 215, 0, 0.8)',
  elevation: 15,
  shadowColor: '#FFD700',
  shadowOffset: { width: 0, height: 8 },
  shadowOpacity: 0.7,
  shadowRadius: 15,
},
winnersInnerContainer: {
  padding: 20,
  backgroundColor: 'rgba(0, 0, 0, 0.7)',
  borderRadius: 17,
},
winnersHeader: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  marginBottom: 20,
},
trophyIcon: {
  textShadowColor: '#FFD700',
  textShadowOffset: { width: 0, height: 0 },
  textShadowRadius: 10,
},
sectionTitle: {
  fontSize: 24,
  fontWeight: 'bold',
  marginHorizontal: 12,
  color: '#FFD700',
  textAlign: 'center',
  textShadowColor: '#FF8C00',
  textShadowOffset: { width: 2, height: 2 },
  textShadowRadius: 5,
  textTransform: 'uppercase',
  letterSpacing: 1,
},
championCard: {
  marginBottom: 15,
  borderRadius: 16,
  overflow: 'hidden',
  position: 'relative',
  elevation: 10,
  shadowColor: '#FFD700',
  shadowOffset: { width: 0, height: 5 },
  shadowOpacity: 0.5,
  shadowRadius: 10,
},
shineOverlay: {
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: 'rgba(255, 255, 255, 0.3)',
  width: 50,
  zIndex: 2,
  transform: [{ skewX: '-20deg' }],
},
championBorder: {
  padding: 3,
  borderRadius: 16,
},
championInner: {
  backgroundColor: 'rgba(20, 20, 20, 0.95)',
  padding: 16,
  borderRadius: 13,
  flexDirection: 'row',
  alignItems: 'center',
  borderWidth: 1,
  borderColor: 'rgba(255, 215, 0, 0.3)',
},
winnerImageContainer: {
  position: 'relative',
  marginRight: 16,
},
championImage: {
  width: 56,
  height: 56,
  borderRadius: 28,
  borderWidth: 3,
  borderColor: '#FFD700',
  shadowColor: '#FFD700',
  shadowOffset: { width: 0, height: 0 },
  shadowOpacity: 0.8,
  shadowRadius: 8,
  elevation: 8,
},
crownOverlay: {
  position: 'absolute',
  top: -5,
  right: -5,
  backgroundColor: 'rgba(255, 215, 0, 0.9)',
  borderRadius: 12,
  padding: 4,
  borderWidth: 1,
  borderColor: '#FFA500',
},
winnerInfo: {
  flex: 1,
},
championName: {
  fontSize: 18,
  color: '#FFD700',
  fontWeight: 'bold',
  marginBottom: 4,
  textShadowColor: '#FF8C00',
  textShadowOffset: { width: 1, height: 1 },
  textShadowRadius: 3,
},
prizeText: {
  fontSize: 14,
  color: '#FFA500',
  fontWeight: '600',
  textShadowColor: '#000',
  textShadowOffset: { width: 1, height: 1 },
  textShadowRadius: 2,
},
celebrationEffects: {
  justifyContent: 'center',
  alignItems: 'center',
},
sparkles: {
  fontSize: 24,
  textShadowColor: '#FFD700',
  textShadowOffset: { width: 0, height: 0 },
  textShadowRadius: 10,
},
noWinnersContainer: {
  alignItems: 'center',
  paddingVertical: 30,
},
noWinnersText: {
  fontSize: 18,
  color: '#888',
  textAlign: 'center',
  fontStyle: 'italic',
  marginTop: 12,
},

  // === REDESIGNED BUY RAFFLE TICKETS CONTAINER ===
  rafflePurchaseContainer: {
    marginHorizontal: 8,
    marginBottom: 16,
    borderRadius: 16, // More rounded corners
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(65, 105, 225, 0.6)', // Royal blue border
    elevation: 10,
    shadowColor: '#4169E1', // Royal blue shadow
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    backgroundColor: 'transparent', // Gradient will handle background
  },
  purchaseContainer: {
    padding: 20, // More padding
    backgroundColor: 'rgba(0, 0, 0, 0.5)', // Darker, semi-transparent overlay
    borderRadius: 14, // Match outer border
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)', // Inner subtle border
  },
  purchaseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20, // More spacing
  },
  purchaseTitle: {
    fontSize: 24, // Larger title
    fontWeight: 'bold',
    color: '#4169E1', // Royal blue
    textShadowColor: '#000',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  ticketPrice: {
    fontSize: 18, // Larger
    marginBottom: 10,
    color: '#fff',
    textAlign: 'center',
    fontWeight: '700', // Bolder
  },
  bulkDiscount: {
    fontSize: 15,
    color: '#7CFC00', // Brighter green for emphasis
    marginBottom: 20,
    textAlign: 'center',
    fontWeight: '600',
  },
  counterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    marginBottom: 25, // More spacing
  },
  counterButton: {
    backgroundColor: '#00BFFF', // Deeper sky blue
    padding: 15, // Larger tap area
    borderRadius: 12, // More rounded
    width: 60, // Larger
    height: 60, // Larger
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#00BFFF',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 5,
  },
  disabledButton: {
    backgroundColor: '#666',
    opacity: 0.6, // Slightly more opaque when disabled
  },
  counterButtonText: {
    color: '#fff',
    fontSize: 30, // Larger text
    fontWeight: 'bold',
  },
  purchaseCount: {
    fontSize: 40, // Larger number
    fontWeight: 'bold',
    color: '#7CFC00', // Bright green for count
    textShadowColor: '#000',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
  },
  gradientButton: {
    borderRadius: 12, // More rounded
    marginVertical: 15, // More spacing
    elevation: 6,
    shadowColor: '#FF6347', // Tomato red for button shadow
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
  },
  purchaseButton: {
    padding: 16, // More padding
    borderRadius: 12,
    alignItems: 'center',
  },
  purchaseButtonText: {
    color: '#fff',
    fontSize: 18, // Larger text
    fontWeight: 'bold',
  },
  ticketOwned: {
    fontSize: 17, // Larger
    textAlign: 'center',
    color: '#FFD700', // Gold color for emphasis
    marginTop: 10,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)', // Darker overlay
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalOverlayBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  centeredModalWrapper: {
    position: 'absolute',
    bottom: 200,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalContent: {
    backgroundColor: '#1e1e1e', // Darker background
    padding: 28, // More padding
    borderRadius: 16, // More rounded
    alignItems: 'center',
    width: '90%', // Wider
    maxWidth: 450, // Slightly larger max width
    elevation: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.6,
    shadowRadius: 12,
    borderWidth: 2,
    borderColor: 'rgba(255, 215, 0, 0.5)', // Gold border
  },
  confirmationModalContent: {
    backgroundColor: '#1e1e1e', // Darker background
    padding: 28, // More padding
    borderRadius: 16, // More rounded
    alignItems: 'center',
    width: '90%',
    maxWidth: 450,
    elevation: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.6,
    shadowRadius: 12,
    borderWidth: 2,
    borderColor: '#7CFC00', // Lime green border for success
  },
  sparkleText: {
    fontSize: 40, // Larger sparkle
    marginBottom: 20, // More spacing
  },
  modalText: {
    fontSize: 18, // Larger
    marginBottom: 25, // More spacing
    textAlign: 'center',
    color: '#fff',
    lineHeight: 25,
  },
  modalSubText: {
    fontSize: 16, // Added style for sub-text
    marginBottom: 20,
    textAlign: 'center',
    color: '#ccc',
  },
  modalButton: {
    backgroundColor: '#00BFFF', // Sky blue button
    padding: 14, // More padding
    borderRadius: 10, // More rounded
    width: '100%',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#00BFFF',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 5,
  },
  modalButtonText: {
    color: '#fff',
    fontSize: 18, // Larger
    fontWeight: 'bold',
  },
  rulesModalContentWrapper: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
    maxHeight: '90%',
  },
  rulesContainer: {
    padding: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.3)',
  },
  rulesTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFD700',
    textAlign: 'center',
    marginBottom: 16,
  },
  rulesText: {
    fontSize: 16,
    color: '#fff',
    textAlign: 'left',
    lineHeight: 24,
    marginBottom: 20,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    gap: 12,
  },
  switchButton: {
    backgroundColor: '#1E90FF',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    flex: 1,
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#1E90FF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  switchButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  closeButton: {
    backgroundColor: '#FF4500',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#FF4500',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  neonContainer: {
  position: 'relative',
  marginVertical: 12,
  top:50
},
neonGlow: {
  position: 'absolute',
  top: -10,
  left: -10,
  right: -10,
  bottom: -10,
  backgroundColor: 'rgba(0, 255, 255, 0.1)',
  borderRadius: 20,
  shadowColor: '#00FFFF',
  shadowOffset: { width: 0, height: 0 },
  shadowOpacity: 0.8,
  shadowRadius: 20,
  elevation: 20,
},
neonBorder: {
  padding: 2,
  borderRadius: 16,
},
neonInner: {
  backgroundColor: '#0a0a0a',
  padding: 20,
  borderRadius: 14,
  alignItems: 'center',
},
neonTitle: {
  color: '#00FFFF',
  fontSize: 14,
  fontWeight: 'bold',
  textTransform: 'uppercase',
  letterSpacing: 2,
  marginBottom: 16,
  textShadowColor: '#00FFFF',
  textShadowOffset: { width: 0, height: 0 },
  textShadowRadius: 10,
},
neonTimeContainer: {
  flexDirection: 'row',
  justifyContent: 'space-around',
  width: '100%',
},
neonTimeSegment: {
  alignItems: 'center',
},
neonTimeValue: {
  fontSize: 28,
  fontFamily: 'monospace',
  fontWeight: 'bold',
  textShadowColor: 'currentColor',
  textShadowOffset: { width: 0, height: 0 },
  textShadowRadius: 15,
},
neonTimeLabel: {
  color: '#666',
  fontSize: 10,
  fontWeight: 'bold',
  textTransform: 'uppercase',
  letterSpacing: 1,
  marginTop: 4,
},
circularButtonContainer: {
  alignItems: 'center',
  marginVertical: 20,
  position: 'relative',
},
circularButtonWrapper: {
  position: 'relative',
},
circularButtonGlow: {
  position: 'absolute',
  width: 140,
  height: 140,
  borderRadius: 70,
  backgroundColor: 'rgba(255, 215, 0, 0.3)',
  top: -10,
  left: -10,
  shadowColor: '#FFD700',
  shadowOffset: { width: 0, height: 0 },
  shadowOpacity: 1,
  shadowRadius: 30,
  elevation: 30,
},
circularButtonBorder: {
  width: 120,
  height: 120,
  borderRadius: 60,
  padding: 3,
  shadowColor: '#FF0080',
  shadowOffset: { width: 0, height: 8 },
  shadowOpacity: 0.6,
  shadowRadius: 15,
  elevation: 15,
},
circularButtonInner: {
  width: '100%',
  height: '100%',
  borderRadius: 57,
  overflow: 'hidden',
},
circularButtonCenter: {
  width: '100%',
  height: '100%',
  borderRadius: 57,
  justifyContent: 'center',
  alignItems: 'center',
  borderWidth: 2,
  borderColor: 'rgba(255, 215, 0, 0.4)',
  position: 'relative',
},
buttonIcon: {
  textShadowColor: '#FFD700',
  textShadowOffset: { width: 0, height: 0 },
  textShadowRadius: 10,
  marginBottom: 4,
},
circularButtonText: {
  color: '#fff',
  fontSize: 14,
  fontWeight: 'bold',
  textAlign: 'center',
  textTransform: 'uppercase',
  letterSpacing: 1,
  lineHeight: 14,
  textShadowColor: '#FFD700',
  textShadowOffset: { width: 0, height: 1 },
  textShadowRadius: 3,
},
countdownPosition: {
  position: 'absolute',
  top: '60%', // Adjust this percentage to move up/down
  left: 0,
  right: 0,
  alignItems: 'center',
},

entriesPosition: {
  position: 'absolute',
  bottom: 0, // Fixed distance from bottom
  left: 0,
  right: 0,
  alignItems: 'center',
}
});