import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Easing,
  Dimensions,
  TextInput,
  Alert,
  Image,
  ImageBackground,
  ScrollView,
  PixelRatio
} from 'react-native';
import ConfettiCannon from 'react-native-confetti-cannon';

// === FIREBASE IMPORTS ===
import { getApps, initializeApp } from 'firebase/app';
import {
  getFirestore,
  doc,
  collection,
  updateDoc,
  onSnapshot,
  runTransaction,
  query,
  orderBy,
  limit,
  getDocs,
  writeBatch,
  where,
  setDoc,
} from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { firebaseConfig } from '../firebaseConfig';

// === INITIALIZE FIREBASE & FIRESTORE ===
console.log("DrawPageAdvanced: Initializing Firebase app.");
const app = !getApps().length ? initializeApp(firebaseConfig) : getApps()[0];
const db = getFirestore(app);
const auth = getAuth(app);

const { width, height } = Dimensions.get('window');
const hp = (percentage) => (height * percentage) / 100;

// =====================================
// HELPER FUNCTION: Compute Next Friday 6PM UTC
// =====================================
const getNextFriday6PMUTC = () => {
  console.log("DrawPageAdvanced: Calculating next Friday 6 PM UTC.");
  const now = new Date();
  // Get current UTC values
  const utcNow = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), now.getUTCHours(), now.getUTCMinutes(), now.getUTCSeconds()));
  let dayOfWeek = utcNow.getUTCDay(); // 0 (Sun) ... 6 (Sat)
  let daysUntilFriday = (5 - dayOfWeek + 7) % 7;

  // If today is Friday and it's already 6PM or later, jump to next week
  if (daysUntilFriday === 0 && utcNow.getUTCHours() >= 18) {
    console.log("DrawPageAdvanced: Today is Friday past 6 PM UTC, jumping to next week for countdown.");
    daysUntilFriday = 7;
  }
  const nextFriday = new Date(Date.UTC(utcNow.getUTCFullYear(), utcNow.getUTCMonth(), utcNow.getUTCDate() + daysUntilFriday, 18, 0, 0));
  return nextFriday.getTime() - utcNow.getTime();
};

// =============================
// Reusable Components
// =============================

// Displays a single candidate with image & name
const CandidateCard = ({ username, profileImage }) => {
  console.log(`CandidateCard: Component mounted for user: ${username}`);
  const glowAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    console.log(`CandidateCard: Starting glow animation loop for ${username}.`);
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: false,
        }),
        Animated.timing(glowAnim, {
          toValue: 0,
          duration: 500,
          useNativeDriver: false,
        }),
      ])
    ).start(() => {
      console.log(`CandidateCard: Glow animation completed for ${username}.`);
    });
  }, []);

  const animatedStyle = {
    shadowColor: '#00ffff',
    shadowOpacity: glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 0.9] }),
    shadowRadius: glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 10] }),
    shadowOffset: { width: 0, height: 0 },
  };

  return (
    <Animated.View style={[styles.candidateCard, animatedStyle]}>
      <Image
        source={
          profileImage
            ? { uri: profileImage }
            : require('../../assets/images/avatar.png')
        }
        style={styles.candidateAvatar}
      />
      <Text style={styles.candidateName}>{username}</Text>
    </Animated.View>
  );
};

// Winner Card updated to display a consistent container using bk.png as background
const WinnerCard = ({ winner, prize }) => {
  console.log(`WinnerCard: Component mounted for winner: ${winner.username}`);
  return (
    <ImageBackground
      source={require('../../assets/images/drawingprocess.png')}
      style={styles.winnerCardContainer}
      imageStyle={styles.winnerCardBackground}
    >
      <View style={styles.winnerCardContent}>
        <Image
          source={
            winner.profileImage
              ? { uri: winner.profileImage }
              : require('../../assets/images/avatar.png')
          }
          style={styles.winnerAvatar}
        />
        <Text style={styles.winnerName}>
          {winner.username} {winner.vip && <Text style={styles.crown}>👑</Text>}
        </Text>
        {winner.vip && <Text style={styles.vipBonus}>+5K Bonus Coins!</Text>}
        {prize && <Text style={styles.prizeText}>{prize}</Text>}
        <Animated.Image
          source={require('../../assets/images/coin.png')}
          style={styles.coinFall}
        />
      </View>
    </ImageBackground>
  );
};

// Simple overlay to show colored aura during phase transitions (if needed)
const TransitionOverlay = ({ phase, visible }) => {
  console.log(`TransitionOverlay: Component mounted for phase: ${phase}, visible: ${visible}.`);
  let auraColor = 'transparent';
  if (phase === 'progressBar') auraColor = 'rgba(0, 0, 255, 0)'; // Blue aura for progress bar phase
  return visible ? (
    <View style={[styles.transitionOverlay, { backgroundColor: auraColor }]}>
      <Text style={styles.transitionText}>Drawing Winners...</Text>
    </View>
  ) : null;
};

// =============================
// Main Component
// =============================

const DrawPageAdvanced = () => {
  console.log("DrawPageAdvanced: Component function started.");
  const glowOpacity = useRef(new Animated.Value(0.3)).current;
  const colorGlow1 = useRef(new Animated.Value(0)).current;
  const colorGlow2 = useRef(new Animated.Value(0)).current;
  const colorGlow3 = useRef(new Animated.Value(0)).current;

  // Helper delay function
  const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  // =====================================
  // STATE VARIABLES & REFERENCES
  // =====================================
  console.log("DrawPageAdvanced: Initializing state variables.");
  // Use the real countdown to next Friday 6PM UTC
  const [timeLeft, setTimeLeft] = useState(getNextFriday6PMUTC());
  const [userTickets, setUserTickets] = useState(0);
  const [poolTickets, setPoolTickets] = useState(0);
  const [userEntries, setUserEntries] = useState(0);
  const [username, setUsername] = useState('Guest');
  const [profileImage, setProfileImage] = useState(null);
  const [isVip, setIsVip] = useState(false);

  // Live draw & winners state variables
  const [isLive, setIsLive] = useState(false);
  const [winner, setWinner] = useState(null);
  const [currentPhase, setCurrentPhase] = useState('initial'); // now will use 'progressBar' for the animation phase
  const [winnersData, setWinnersData] = useState(null);
  const [showWinnersSubpage, setShowWinnersSubpage] = useState(false);

  // Leaderboard (top 5 by "entries")
  const [leaderboard, setLeaderboard] = useState([]);

  // Timer control
  const [timerPaused, setTimerPaused] = useState(false);

  // Confetti flags
  const [ticketConfettiVisible, setTicketConfettiVisible] = useState(false);
  const [winnerConfettiVisible, setWinnerConfettiVisible] = useState(false);

  // Animated values
  const ticketAnim = useRef(new Animated.Value(0)).current;
  const flashAnim = useRef(new Animated.Value(0)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const countdownGlow = useRef(new Animated.Value(0)).current;
  // New animated value for progress bar
  const progressAnim = useRef(new Animated.Value(0)).current;
  const animatedTotalEntries = useRef(new Animated.Value(poolTickets)).current;
  const animatedUserEntries = useRef(new Animated.Value(userEntries)).current;
  const castGlow = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    console.log("DrawPageAdvanced: Starting cast glow animation loop.");
    Animated.loop(
      Animated.sequence([
        Animated.timing(castGlow, {
          toValue: 1,
          duration: 800,
          useNativeDriver: false,
        }),
        Animated.timing(castGlow, {
          toValue: 0,
          duration: 800,
          useNativeDriver: false,
        }),
      ])
    ).start(() => {
      console.log("DrawPageAdvanced: Cast glow animation loop completed.");
    });
  }, []);

  // Raffle Pool Data
  const [rafflePool, setRafflePool] = useState([]);

  // On mount, fetch/listen to "raffle pool" collection from Firestore
  useEffect(() => {
    console.log("DrawPageAdvanced: Subscribing to raffle pool updates.");
    const colRef = collection(db, 'raffle pool');
    const unsub = onSnapshot(colRef, (snapshot) => {
      const data = [];
      let total = 0;
      snapshot.forEach((docSnap) => {
        const docData = docSnap.data();
        data.push(docData);
        total += docData.lockedTickets || 0;
      });
      setRafflePool(data);
      setPoolTickets(total);
      console.log(`DrawPageAdvanced: Raffle pool data updated. Total pool tickets: ${total}.`);
    });
    return () => {
      console.log("DrawPageAdvanced: Unsubscribing from raffle pool updates.");
      unsub();
    };
  }, []);

  // =====================================
  // HELPER: Reset all user "entries" to 0 (to clear leaderboard)
  // =====================================
  const resetAllEntries = async () => {
    console.log("DrawPageAdvanced: Attempting to reset all user entries to 0.");
    try {
      const q = query(collection(db, 'users'), where('entries', '>', 0));
      console.log("DrawPageAdvanced: Querying users with entries > 0.");
      const querySnapshot = await getDocs(q);
      const batch = writeBatch(db);
      console.log("DrawPageAdvanced: Initializing batch write for resetting entries.");
      querySnapshot.forEach((docSnap) => {
        batch.update(docSnap.ref, { entries: 0 });
        console.log(`DrawPageAdvanced: User entries marked for reset for doc: ${docSnap.id}.`);
      });
      await batch.commit();
      console.log('DrawPageAdvanced: All user entries have been reset to 0.');
    } catch (error) {
      console.error('DrawPageAdvanced: Error resetting entries:', error);
      Alert.alert('Error', 'Failed to reset user entries.');
    }
  };

  // Listen to poolTickets from Firestore ("draw/current" document)
  useEffect(() => {
    console.log("DrawPageAdvanced: Subscribing to draw/current document for pool tickets.");
    const colRef = collection(db, 'raffle pool');
    const unsubscribe = onSnapshot(colRef, (snapshot) => {
      let total = 0;
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        total += data.lockedTickets || 0;
      });
      setPoolTickets(total);
      console.log(`DrawPageAdvanced: Pool tickets updated to: ${total}.`);
    });
    return () => {
      console.log("DrawPageAdvanced: Unsubscribing from draw/current pool tickets.");
      unsubscribe();
    };
  }, []);

  // Listen to current user's document in Firestore
  useEffect(() => {
    console.log("DrawPageAdvanced: Subscribing to current user document updates.");
    const currentUser = auth.currentUser;
    if (!currentUser) {
      console.warn('DrawPageAdvanced: No user logged in. Cannot fetch user data.');
      return;
    }
    const userDocRef = doc(db, 'users', currentUser.uid);
    const unsubscribe = onSnapshot(userDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        console.log("DrawPageAdvanced: User document data updated.");
        setUsername(data.username || 'Guest');
        setProfileImage(data.profileImage || null);
        setUserTickets(data.raffleTickets || 0);
        setUserEntries(data.entries || 0);
        setIsVip(data.vip === true);
        console.log(`DrawPageAdvanced: Username: ${data.username}, Tickets: ${data.raffleTickets}, Entries: ${data.entries}, VIP: ${data.vip}.`);
      } else {
        console.warn('DrawPageAdvanced: User document not found. Please ensure it is created at signup.');
      }
    });
    return () => {
      console.log("DrawPageAdvanced: Unsubscribing from user document updates.");
      unsubscribe();
    };
  }, []);

  // Listen to leaderboard data: top 5 users by "entries"
  useEffect(() => {
    console.log("DrawPageAdvanced: Subscribing to leaderboard (top 5 users by entries) updates.");
    const q = query(collection(db, 'users'), orderBy('entries', 'desc'), limit(5));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = [];
      snapshot.forEach((doc) => {
        data.push({
          name: doc.data().username || doc.id,
          tickets: doc.data().entries || 0,
        });
        console.log(`DrawPageAdvanced: Leaderboard entry: ${doc.data().username || doc.id} with ${doc.data().entries} entries.`);
      });
      setLeaderboard(data);
      console.log("DrawPageAdvanced: Leaderboard data updated.");
    });
    return () => {
      console.log("DrawPageAdvanced: Unsubscribing from leaderboard updates.");
      unsubscribe();
    };
  }, []);

  // =====================================
  // COUNTDOWN LOGIC
  // =====================================
  useEffect(() => {
    console.log("DrawPageAdvanced: Initializing countdown timer.");
    if (timerPaused || isLive) {
      console.log(`DrawPageAdvanced: Timer paused (${timerPaused}) or Live (${isLive}). Skipping timer update.`);
      return;
    }
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1000) {
          clearInterval(timer);
          console.log('DrawPageAdvanced: Countdown finished. Starting live draw process.');
          setTimeLeft(0);
          setTimeout(() => startLiveDraw(), 1000);
          return 0;
        }
        console.log(`DrawPageAdvanced: Time left: ${prev - 1000}ms.`);
        return prev - 1000;
      });
    }, 1000);
    return () => {
      console.log("DrawPageAdvanced: Cleaning up countdown timer.");
      clearInterval(timer);
    };
  }, [timerPaused, isLive]);

  // Glow effect in the final 10 seconds
  useEffect(() => {
    if (timeLeft <= 10000 && timeLeft > 0) {
      console.log(`DrawPageAdvanced: Countdown glow animation triggered. Time left: ${timeLeft}ms.`);
      Animated.loop(
        Animated.sequence([
          Animated.timing(countdownGlow, {
            toValue: 1,
            duration: 500,
            useNativeDriver: false,
          }),
          Animated.timing(countdownGlow, {
            toValue: 0,
            duration: 500,
            useNativeDriver: false,
          }),
        ])
      ).start(() => {
        console.log("DrawPageAdvanced: Countdown glow animation completed.");
      });
    } else {
      countdownGlow.setValue(0); // Reset glow if outside 10-second window
    }
  }, [timeLeft]);

  useEffect(() => {
    console.log(`DrawPageAdvanced: Current phase changed to: ${currentPhase}.`);
    if (currentPhase === 'progressBar') {
      // ⚡ Start base pulsing glow
      console.log("DrawPageAdvanced: Starting live draw pulsating glow animation.");
      Animated.loop(
        Animated.sequence([
          Animated.timing(glowOpacity, {
            toValue: 0.7,
            duration: 800,
            useNativeDriver: false,
          }),
          Animated.timing(glowOpacity, {
            toValue: 0.3,
            duration: 800,
            useNativeDriver: false,
          }),
        ])
      ).start();

      // 🌈 Start rotating color layers
      console.log("DrawPageAdvanced: Starting rotating color layers animation.");
      Animated.loop(
        Animated.sequence([
          Animated.timing(colorGlow1, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: false,
          }),
          Animated.timing(colorGlow1, {
            toValue: 0,
            duration: 1000,
            useNativeDriver: false,
          }),
        ])
      ).start();

      Animated.loop(
        Animated.sequence([
          Animated.delay(600),
          Animated.timing(colorGlow2, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: false,
          }),
          Animated.timing(colorGlow2, {
            toValue: 0,
            duration: 1000,
            useNativeDriver: false,
          }),
        ])
      ).start();

      Animated.loop(
        Animated.sequence([
          Animated.delay(1200),
          Animated.timing(colorGlow3, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: false,
          }),
          Animated.timing(colorGlow3, {
            toValue: 0,
            duration: 1000,
            useNativeDriver: false,
          }),
        ])
      ).start();
    }
  }, [currentPhase]);

  // =====================================
  // Ticket Submission
  // =====================================
  const handleSubmitTickets = () => {
    console.log("DrawPageAdvanced: Handle submit tickets initiated.");
    const currentUser = auth.currentUser;
    if (!currentUser) {
      console.log('DrawPageAdvanced: User not logged in. Alerting to log in.');
      Alert.alert('Not Logged In', 'Please log in before submitting tickets.');
      return;
    }
    if (userTickets <= 0) {
      console.log('DrawPageAdvanced: No tickets to submit. Alerting.');
      Alert.alert('No Tickets', 'You have no tickets left to submit.');
      return;
    }

    console.log(`DrawPageAdvanced: Initiating ticket submission animation for user: ${currentUser.uid}.`);
    Animated.sequence([
      Animated.timing(ticketAnim, {
        toValue: 1,
        duration: 600,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(ticketAnim, {
        toValue: 0,
        duration: 400,
        delay: 50,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start(() => {
      console.log("DrawPageAdvanced: Ticket submission animation completed. Triggering confetti and transaction.");
      setTicketConfettiVisible(true);
      console.log("DrawPageAdvanced: Ticket confetti visibility set to true.");
      setTimeout(() => {
        setTicketConfettiVisible(false);
        console.log("DrawPageAdvanced: Ticket confetti visibility set to false after 2000ms.");
      }, 2000);
      submitTicketTransaction(currentUser);
    });
  };

  const submitTicketTransaction = async (currentUser) => {
    console.log(`DrawPageAdvanced: Starting ticket submission transaction for user: ${currentUser.uid}.`);
    const poolDocRef = doc(db, 'draw', 'current');
    const userDocRef = doc(db, 'users', currentUser.uid);
    const raffleUserDocRef = doc(db, 'raffle pool', currentUser.uid); // key for individual user in raffle pool

    try {
      await runTransaction(db, async (transaction) => {
        console.log("DrawPageAdvanced: Fetching pool, user, and raffle user documents within transaction.");
        const poolDoc = await transaction.get(poolDocRef);
        const userDoc = await transaction.get(userDocRef);
        const raffleDoc = await transaction.get(raffleUserDocRef);

        if (!poolDoc.exists()) {
          console.error("DrawPageAdvanced: Error: draw/current document does not exist.");
          throw new Error("draw/current doesn't exist.");
        }
        if (!userDoc.exists()) {
          console.error("DrawPageAdvanced: Error: User doc doesn't exist.");
          throw new Error("User doc doesn't exist.");
        }

        const userData = userDoc.data();
        const currentPool = poolDoc.data().poolTickets || 0;
        const currentRaffleTickets = userData.raffleTickets || 0;
        const currentEntries = userData.entries || 0;

        if (currentRaffleTickets <= 0) {
          console.warn('DrawPageAdvanced: User tried to submit ticket with 0 raffleTickets.');
          throw new Error('No tickets to submit.');
        }

        // ✅ Update draw pool and user
        console.log(`DrawPageAdvanced: Updating pool tickets from ${currentPool} to ${currentPool + 1}.`);
        transaction.update(poolDocRef, { poolTickets: currentPool + 1 });
        console.log(`DrawPageAdvanced: Updating user tickets from ${currentRaffleTickets} to ${currentRaffleTickets - 1} and entries from ${currentEntries} to ${currentEntries + 1}.`);
        transaction.update(userDocRef, {
          raffleTickets: currentRaffleTickets - 1,
          entries: currentEntries + 1,
        });

        // ✅ Update raffle pool
        if (raffleDoc.exists()) {
          // Increment lockedTickets
          const currentLocked = raffleDoc.data().lockedTickets || 0;
          console.log(`DrawPageAdvanced: Raffle user document exists. Updating locked tickets from ${currentLocked} to ${currentLocked + 1}.`);
          transaction.update(raffleUserDocRef, {
            lockedTickets: currentLocked + 1,
          });
        } else {
          // Create new doc in raffle pool
          console.log(`DrawPageAdvanced: Raffle user document does not exist. Creating new entry for user: ${userData.username || 'Anonymous'}.`);
          transaction.set(raffleUserDocRef, {
            enteredTime: new Date().toLocaleString('en-US', {
              timeZone: 'America/New_York',
              hour12: true,
            }),
            lockedTickets: 1,
            profileImage: userData.profileImage || null,
            userId: currentUser.uid,
            username: userData.username || 'Anonymous',
          });
        }
      });
      console.log('DrawPageAdvanced: Ticket submitted and raffle pool updated successfully.');
      setTicketConfettiVisible(true);
      setTimeout(() => setTicketConfettiVisible(false), 2000);
    } catch (error) {
      console.error('DrawPageAdvanced: Error during ticket submission transaction:', error);
      Alert.alert('Error', error.message);
    }
  };

  // Helper function to shuffle an array
  const shuffleArray = (array) => {
    console.log("DrawPageAdvanced: Shuffling array.");
    const copy = [...array];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  };

  // Function to update the winnersOfTheWeek collection in Firestore:
  const updateWinnersOfTheWeek = async (computedWinners) => {
    console.log("DrawPageAdvanced: Attempting to update 'winnerOfTheWeek' collection.");
    try {
      // Clear the collection first
      const winnersCollectionRef = collection(db, 'winnerOfTheWeek');
      const snapshot = await getDocs(winnersCollectionRef);
      const batchClear = writeBatch(db);
      console.log("DrawPageAdvanced: Clearing existing 'winnerOfTheWeek' collection.");
      snapshot.forEach((docSnap) => {
        batchClear.delete(docSnap.ref);
        console.log(`DrawPageAdvanced: Marking doc ${docSnap.id} for deletion from winnerOfTheWeek.`);
      });
      await batchClear.commit();
      console.log('DrawPageAdvanced: Existing winnerOfTheWeek collection cleared.');

      // Add new winners
      let batchAdd = writeBatch(db);
      console.log("DrawPageAdvanced: Initializing batch write for adding new winners.");

      console.log("DrawPageAdvanced: Adding Tier 1 winners.");
      computedWinners.tier1.forEach((winner) => {
        const docRef = doc(collection(db, 'winnerOfTheWeek'));
        batchAdd.set(docRef, {
          username: winner.username,
          userId: winner.userId,
          profileImage: winner.profileImage || null,
          tier: 'Tier1',
          prize: 'Grand Prize',
        });
      });
      console.log("DrawPageAdvanced: Adding Tier 2 winners.");
      computedWinners.tier2.forEach((winner) => {
        const docRef = doc(collection(db, 'winnerOfTheWeek'));
        batchAdd.set(docRef, {
          username: winner.username,
          userId: winner.userId,
          profileImage: winner.profileImage || null,
          tier: 'Tier2',
          prize: 'Runner-Up Prize',
        });
      });
      console.log("DrawPageAdvanced: Adding Tier 3 winners.");
      computedWinners.tier3.forEach((winner) => {
        const docRef = doc(collection(db, 'winnerOfTheWeek'));
        batchAdd.set(docRef, {
          username: winner.username,
          userId: winner.userId,
          profileImage: winner.profileImage || null,
          tier: 'Tier3',
          prize: 'Consolation Prize',
        });
      });
      await batchAdd.commit();
      console.log('DrawPageAdvanced: New winners added to winnerOfTheWeek collection.');
    } catch (error) {
      console.error('DrawPageAdvanced: Error updating winnerOfTheWeek collection:', error);
      Alert.alert('Error', 'Failed to update winners of the week.');
    }
  };

  // Transition function to compute winners and show winners subpage
  const transitionToWinners = async () => {
    console.log("DrawPageAdvanced: Initiating transition to winners screen.");

    let computedWinners = { tier1: [], tier2: [], tier3: [] };
    if (!rafflePool || rafflePool.length === 0) {
      console.warn("DrawPageAdvanced: No entries in raffle pool. Creating empty winners data.");
      setWinnersData(computedWinners);
    } else {
      const totalTickets = rafflePool.reduce((sum, user) => sum + (user.lockedTickets || 0), 0);
      console.log(`DrawPageAdvanced: Total tickets for winner computation: ${totalTickets}.`);

      const flatEntries = [];
      console.log("DrawPageAdvanced: Flattening entries for shuffling.");
      rafflePool.forEach((user) => {
        const tickets = user.lockedTickets || 0;
        for (let i = 0; i < tickets; i++) {
          flatEntries.push(user);
        }
      });

      const shuffled = shuffleArray(flatEntries);
      console.log("DrawPageAdvanced: Shuffled entries successfully.");

      // Calculate number of winners for each tier based on total tickets
      // Ensure at least 1 winner per tier if tickets available for that tier
      const tier1Count = Math.max(1, Math.floor(totalTickets * 0.01));
      const tier2Count = Math.max(1, Math.floor(totalTickets * 0.02));
      const tier3Count = Math.max(1, Math.floor(totalTickets * 0.05));
      console.log(`DrawPageAdvanced: Calculated Tier 1 count: ${tier1Count}, Tier 2 count: ${tier2Count}, Tier 3 count: ${tier3Count}.`);


      // Distribute winners
      let currentIdx = 0;

      if (shuffled.length > 0) {
        // Tier 1 winners
        for (let i = 0; i < tier1Count && currentIdx < shuffled.length; i++) {
          const winner = shuffled[currentIdx];
          // Check if winner is already in Tier 1 to avoid duplicates
          if (!computedWinners.tier1.some(w => w.userId === winner.userId)) {
            computedWinners.tier1.push(winner);
          }
          currentIdx++;
        }
      }

      // Tier 2 winners
      if (shuffled.length > currentIdx) {
        for (let i = 0; i < tier2Count && currentIdx < shuffled.length; i++) {
          const winner = shuffled[currentIdx];
          // Check if winner is already in Tier 1 or Tier 2
          if (!computedWinners.tier1.some(w => w.userId === winner.userId) &&
              !computedWinners.tier2.some(w => w.userId === winner.userId)) {
            computedWinners.tier2.push(winner);
          }
          currentIdx++;
        }
      }

      // Tier 3 winners
      if (shuffled.length > currentIdx) {
        for (let i = 0; i < tier3Count && currentIdx < shuffled.length; i++) {
          const winner = shuffled[currentIdx];
          // Check if winner is already in Tier 1, Tier 2, or Tier 3
          if (!computedWinners.tier1.some(w => w.userId === winner.userId) &&
              !computedWinners.tier2.some(w => w.userId === winner.userId) &&
              !computedWinners.tier3.some(w => w.userId === winner.userId)) {
            computedWinners.tier3.push(winner);
          }
          currentIdx++;
        }
      }

      setWinnersData(computedWinners);
      console.log(`DrawPageAdvanced: Winners computed: Tier 1: ${computedWinners.tier1.length}, Tier 2: ${computedWinners.tier2.length}, Tier 3: ${computedWinners.tier3.length}.`);
    }

    // Update state and Firestore
    console.log("DrawPageAdvanced: Setting winners data.");
    setWinnersData(computedWinners);
    console.log("DrawPageAdvanced: Updating winners to Firestore 'winnerOfTheWeek' collection.");
    await updateWinnersOfTheWeek(computedWinners);
    console.log("DrawPageAdvanced: Winners data updated in Firestore.");

    setShowWinnersSubpage(true);
    console.log("DrawPageAdvanced: Displaying winners subpage.");
    await clearRafflePool();
    console.log("DrawPageAdvanced: Raffle pool cleared after winner computation.");
  };

  // Resetting the raffle pool
  const clearRafflePool = async () => {
    console.log("DrawPageAdvanced: Attempting to clear raffle pool collection.");
    try {
      const poolRef = collection(db, 'raffle pool');
      const snapshot = await getDocs(poolRef);
      const batch = writeBatch(db);
      console.log("DrawPageAdvanced: Initializing batch delete for raffle pool.");
      snapshot.forEach((docSnap) => {
        batch.delete(docSnap.ref);
        console.log(`DrawPageAdvanced: Deleting document from raffle pool: ${docSnap.id}.`);
      });
      await batch.commit();
      console.log('DrawPageAdvanced: Raffle pool cleared successfully.');
    } catch (error) {
      console.error('DrawPageAdvanced: Error clearing raffle pool:', error);
      Alert.alert('Error', 'Failed to clear raffle pool.');
    }
  };

  // Modified live draw function: start progress bar animation over 5 seconds
  const startLiveDraw = async () => {
    console.log("DrawPageAdvanced: Starting live draw process.");
    setIsLive(true);
    console.log("DrawPageAdvanced: Setting isLive to true.");

    // Reset poolTickets and user entries in Firestore
    try {
      await updateDoc(doc(db, 'draw', 'current'), { poolTickets: 0 });
      console.log('DrawPageAdvanced: Pool tickets reset to 0.');
    } catch (err) {
      console.error('DrawPageAdvanced: Error resetting pool:', err);
    }
    await resetAllEntries();
    console.log('DrawPageAdvanced: All user entries reset to 0.');
    // Removed vibration/haptic feedback as per instructions

    // Start the progress bar animation phase
    setCurrentPhase('progressBar');
    progressAnim.setValue(0);
    console.log("DrawPageAdvanced: Starting progress bar animation.");
    Animated.timing(progressAnim, {
      toValue: 1,
      duration: 5000,
      easing: Easing.linear,
      useNativeDriver: false,
    }).start(() => {
      console.log('DrawPageAdvanced: Progress bar animation complete. Transitioning to winner calculation.');
      transitionToWinners();
    });
  };

  // =====================================
  // NAVIGATION HANDLERS
  // =====================================
  const handleBackToRaffle = () => {
    console.log("DrawPageAdvanced: Navigating back to raffle page.");
    setIsLive(false);
    console.log("DrawPageAdvanced: Setting isLive to false.");
    setTimeLeft(getNextFriday6PMUTC());
    console.log("DrawPageAdvanced: Resetting timer to next Friday.");
    setWinner(null);
    console.log("DrawPageAdvanced: Resetting winner data.");
    setCurrentPhase('initial');
    console.log("DrawPageAdvanced: Setting current phase to 'initial'.");
    setShowWinnersSubpage(false);
    console.log("DrawPageAdvanced: Hiding winners subpage.");
  };

  const handleSeeFullWinnerList = () => {
    console.log("DrawPageAdvanced: Attempting to view full winner list.");
    Alert.alert('Winners', 'This would navigate to the full winner list.');
  };

  // =====================================
  // TIMER CONTROL HANDLERS
  // =====================================
  const toggleTimerPause = () => {
    setTimerPaused((prev) => {
      const newVal = !prev;
      console.log(`DrawPageAdvanced: Timer paused: ${newVal ? 'true' : 'false'}.`);
      return newVal;
    });
  };

  const skipCountdown = () => {
    console.log("DrawPageAdvanced: Skipping countdown. Initiating live draw immediately.");
    setTimeLeft(0);
    setTimerPaused(false);
    startLiveDraw();
  };

  // =====================================
  // HELPER: Format Time (mm:ss)
  // =====================================
  const formatTime = (ms) => {
    const totalSeconds = Math.floor(ms / 1000);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    return `${days}d ${hours.toString().padStart(2, '0')}h:${minutes.toString().padStart(2, '0')}m:${seconds.toString().padStart(2, '0')}s`;
  };

  const formatNumber = (value) => Math.floor(value);

  // =====================================
  // RENDER COMPONENT
  // =====================================
  // If winners subpage is active, render it with a new background image and tiered winners
  if (showWinnersSubpage && winnersData) {
    console.log("DrawPageAdvanced: Rendering winners subpage.");
    return (
      <ImageBackground
        source={require('../../assets/images/drawingprocess.png')}
        style={{ flex: 1 }}
        resizeMode="cover"
      >
        <ScrollView contentContainerStyle={styles.winnersContainer}>
          <Text style={styles.winnersHeader}>Winners</Text>

          <Text style={styles.tierHeader}>Tier 1 Winners - Grand Prize</Text>
          <View style={styles.winnersRow}>
            {winnersData.tier1.map((winner, idx) => (
              <WinnerCard key={idx} winner={winner} prize="Grand Prize" />
            ))}
            {winnersData.tier1.length === 0 && <Text style={styles.noWinnersText}>No Tier 1 winners this round.</Text>}
          </View>

          <Text style={styles.tierHeader}>Tier 2 Winners - Runner-Up Prize</Text>
          <View style={styles.winnersRow}>
            {winnersData.tier2.map((winner, idx) => (
              <WinnerCard key={idx} winner={winner} prize="Runner-Up Prize" />
            ))}
            {winnersData.tier2.length === 0 && <Text style={styles.noWinnersText}>No Tier 2 winners this round.</Text>}
          </View>

          <Text style={styles.tierHeader}>Tier 3 Winners - Consolation Prize</Text>
          <View style={styles.winnersRow}>
            {winnersData.tier3.map((winner, idx) => (
              <WinnerCard key={idx} winner={winner} prize="Consolation Prize" />
            ))}
            {winnersData.tier3.length === 0 && <Text style={styles.noWinnersText}>No Tier 3 winners this round.</Text>}
          </View>

          <TouchableOpacity style={styles.postDrawButton} onPress={handleBackToRaffle}>
            <Text style={styles.buttonText}>Back to Raffle Page</Text>
          </TouchableOpacity>
        </ScrollView>
      </ImageBackground>
    );
  }

  // Main Render: Pre-draw and Live Draw UI
  console.log("DrawPageAdvanced: Rendering main pre-draw/live draw UI.");
  return (
    <ImageBackground
      source={
        isLive
          ? require('../../assets/images/drawingprocess.png') // special image during draw
          : require('../../assets/images/drawbk.png') // default pre-draw image
      }
      style={{ flex: 1 }}
      resizeMode="cover"
    >
      {winner && isVip && (
        <Animated.View style={[styles.vipFlash, { opacity: flashAnim }]} />
      )}

      {timeLeft <= 5000 && (
        <Animated.View style={[styles.darkOverlay, { opacity: countdownGlow }]} />
      )}

      <View style={{ flex: 1 }}>
        {ticketConfettiVisible && (
          <ConfettiCannon count={100} origin={{ x: width / 2, y: 0 }} fadeOut />
        )}
        {winnerConfettiVisible && (
          <ConfettiCannon count={150} origin={{ x: width / 2, y: 0 }} fadeOut />
        )}

        {/* Pre-draw UI */}
        {!isLive ? (
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={styles.preDrawContainer}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.profileHeader}>
              {profileImage && (
                <Image
                  source={{ uri: profileImage }}
                  style={styles.profileImage}
                />
              )}
              <Text style={styles.username}>{username}</Text>
              {isVip && <Text style={styles.vipBadge}>VIP</Text>}
            </View>

            <Animated.Text
              style={[
                styles.countdownText,
                {
                  transform: [
                    {
                      scale: countdownGlow.interpolate({
                        inputRange: [0, 1],
                        outputRange: [1, 1.2],
                      }),
                    },
                  ],
                },
              ]}
            >
              {formatTime(timeLeft)}
            </Animated.Text>

            {timeLeft <= 5000 && (
              <Animated.Text style={styles.shimmerBanner}>
                Draw Starting...
              </Animated.Text>
            )}

            <Text style={styles.totalTicketsText}>{poolTickets}</Text>
            <Text style={styles.userEntriesText}>{userEntries}</Text>
            <Text style={styles.userTicketsText}>Your Tickets: {userTickets}</Text>

            <Animated.View
              style={[
                styles.buttonWrapper,
                {
                  shadowColor: '#00ffff',
                  shadowOpacity: castGlow.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] }),
                  shadowRadius: castGlow.interpolate({ inputRange: [0, 1], outputRange: [8, 16] }),
                  shadowOffset: { width: 0, height: 0 },
                },
              ]}
            >
              <TouchableOpacity onPress={handleSubmitTickets}>
                <Image
                  source={require('../../assets/images/castTicketButton.png')}
                  style={styles.castButtonImage}
                  resizeMode="contain"
                />
              </TouchableOpacity>
            </Animated.View>

            {/* Ticket Animation */}
            <Animated.View
              style={[
                styles.ticketAnimation,
                {
                  transform: [
                    {
                      translateY: ticketAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, -200],
                      }),
                    },
                  ],
                  opacity: ticketAnim,
                },
              ]}
            >
              <Image
                source={require('../../assets/images/ticket.png')}
                style={styles.ticketImage}
              />
            </Animated.View>

            <View style={styles.timerControls}>
              <TouchableOpacity style={styles.controlButton} onPress={toggleTimerPause}>
                <Text style={styles.buttonText}>
                  {timerPaused ? 'Resume Timer' : 'Pause Timer'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.controlButton} onPress={skipCountdown}>
                <Text style={styles.buttonText}>Skip Countdown</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.tierHeader}>Leaderboard (Top 5 Entries)</Text>
            <View style={styles.winnersRow}>
              {leaderboard.map((user, idx) => (
                <CandidateCard key={idx} username={user.name} profileImage={user.profileImage} />
              ))}
              {leaderboard.length === 0 && <Text style={styles.noWinnersText}>No leaderboard data yet.</Text>}
            </View>
          </ScrollView>
        ) : (
          // Live draw UI with progress bar animation
          <View style={styles.liveDrawContainer}>
            <Text style={styles.liveHeader}>Live Draw!</Text>
            <Animated.View style={[styles.stageGlow, { opacity: glowOpacity }]} />
            <Animated.View style={[styles.colorGlowBlue, { opacity: colorGlow1 }]} />
            <Animated.View style={[styles.colorGlowPink, { opacity: colorGlow2 }]} />
            <Animated.View style={[styles.colorGlowGold, { opacity: colorGlow3 }]} />
            {/* Progress Bar Overlay */}
            <View style={styles.progressBarWrapper}>
              <Animated.View
                style={[
                  styles.progressBar,
                  {
                    width: progressAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, width * 0.8],
                    }),
                  },
                ]}
              />
            </View>
            <TransitionOverlay phase={currentPhase} visible={true} />
          </View>
        )}
      </View>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  // Background styles
  darkOverlay: {
    position: 'absolute',
    width: width,
    height: height,
    backgroundColor: 'rgba(0,0,0,0.5)',
    zIndex: 2,
  },
  vipFlash: {
    position: 'absolute',
    width: width,
    height: height,
    backgroundColor: 'rgba(255,215,0,0.5)',
    zIndex: 3,
  },
  mainContent: {
    flex: 1,
    zIndex: 4,
  },
  // Pre-draw container
  preDrawContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginBottom: 10,
  },
  profileImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
    bottom: hp(25)
  },
  username: {
    fontSize: 18,
    color: '#fff',
    marginRight: 5,
    bottom: hp(25)
  },
  vipBadge: {
    backgroundColor: '#ffd700',
    color: '#000',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 5,
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 5,
  },
  countdownText: {
    fontSize: 42,
    fontWeight: 'bold',
    color: '#d1faff',
    textShadowColor: '#00ffff',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 20,
    letterSpacing: 1,
    marginBottom: hp(24),
    textAlign: 'center',
  },
  shimmerBanner: {
    fontSize: 24,
    color: '#fff',
    marginBottom: 10,
    opacity: 0.8,
  },
  totalTicketsText: {
    fontSize: 24,
    color: '#00ffff',
    marginBottom: 6,
    top: hp(12),
    fontWeight: 'bold',
  },
  userEntriesText: {
    fontSize: 22,
    fontWeight: '600',
    top: hp(28.5),
    color: '#00ff88',
    textShadowColor: '#00ffcc',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 12,
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  userTicketsText: {
    fontSize: 18,
    color: '#ebdd00',
    marginBottom: 4,
    bottom: hp(45),
    left: 100,
  },
  buttonWrapper: {
    position: 'absolute',
    top: hp(35),
    left: width / 3 - 90,
    zIndex: 10,
  },
  castButtonImage: {
    width: 310,
    height: 110,
    opacity: 0.9,
  },
  ticketAnimation: {
    position: 'absolute',
    bottom: 50,
    left: width / 2 - 25,
  },
  ticketImage: {
    width: 50,
    height: 50,
  },
  timerControls: {
    flexDirection: 'row',
    marginTop: 15,
  },
  controlButton: {
    backgroundColor: '#555',
    padding: 10,
    top: 200,
    marginHorizontal: 5,
    borderRadius: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
  },
  liveDrawContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  liveHeader: {
    fontSize: 32,
    color: '#fff',
    marginBottom: 20,
    fontWeight: 'bold',
  },
  // New styles for progress bar animation phase
  progressBarWrapper: {
    position: 'absolute',
    bottom: 50,
    left: width * 0.1,
    width: width * 0.8,
    height: 20,
    backgroundColor: '#ccc',
    borderRadius: 10,
    overflow: 'hidden',
    zIndex: 5,
  },
  progressBar: {
    height: 20,
    backgroundColor: '#27ae60',
    borderRadius: 10,
  },
  backgroundCandidates: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    paddingTop: 50,
  },
  transitionOverlay: {
    position: 'absolute',
    width: width,
    height: height,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 20,
  },
  transitionText: {
    fontSize: 24,
    color: '#fff',
    fontWeight: 'bold',
  },
  // Winner & transitions styles
  // WinnerCard container now uses a consistent size and bk.png background
  winnerCardContainer: {
    width: 150,
    height: 200,
    margin: 10,
  },
  winnerCardBackground: {
    borderRadius: 15,
  },
  winnerCardContent: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: 20,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  winnerAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 10,
  },
  winnerName: {
    fontSize: 28,
    color: '#fff',
    fontWeight: 'bold',
  },
  crown: {
    fontSize: 28,
  },
  vipBonus: {
    fontSize: 20,
    color: '#ffd700',
    marginBottom: 20,
    fontWeight: 'bold',
  },
  coinFall: {
    width: 30,
    height: 30,
    marginTop: 10,
  },
  prizeText: {
    fontSize: 18,
    color: '#ffdd00',
    marginTop: 5,
  },
  postDrawButton: {
    backgroundColor: '#27ae60',
    padding: 12,
    borderRadius: 10,
    marginVertical: 5,
    width: width * 0.7,
    alignItems: 'center',
  },
  // Winners subpage styles
  winnersContainer: {
    flexGrow: 1,
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  winnersHeader: {
    fontSize: 36,
    color: '#fff',
    fontWeight: 'bold',
    marginBottom: 30,
  },
  tierHeader: {
    fontSize: 24,
    color: '#fff',
    marginVertical: 10,
    textDecorationLine: 'underline',
  },
  winnersRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginBottom: 20,
  },
  candidateCard: {
    width: width / 4 - 10,
    height: width / 4,
    margin: 5,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius: 10,
    shadowColor: '#00ffff',
    shadowOpacity: 0.8,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
  },
  candidateAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginBottom: 5,
  },
  candidateName: {
    fontSize: 16,
    color: '#fff',
  },
  stageGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: width,
    height: height,
    backgroundColor: 'rgba(0, 255, 255, 0.2)',
    zIndex: 1,
  },
  colorGlowBlue: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: width,
    height: height,
    backgroundColor: 'rgba(0, 255, 255, 0.15)',
    zIndex: 1,
  },
  colorGlowPink: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: width,
    height: height,
    backgroundColor: 'rgba(255, 0, 255, 0.15)',
    zIndex: 1,
  },
  colorGlowGold: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: width,
    height: height,
    backgroundColor: 'rgba(255, 215, 0, 0.12)',
    zIndex: 1,
  },
  noWinnersText: {
    color: '#fff',
    fontSize: 16,
    marginTop: 10,
    textAlign: 'center',
    width: '100%',
  },
});

export default DrawPageAdvanced;