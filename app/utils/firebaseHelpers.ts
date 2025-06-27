// helpers/firebaseHelpers.ts
import {
  getFirestore,
  doc,
  addDoc,
  collection,
  serverTimestamp,
  getDoc,
  updateDoc,
  increment,
  setDoc,
  query,
  collectionGroup,
  where,
  Timestamp,
  getDocs,
} from 'firebase/firestore';
import { firebaseApp } from '../app/firebaseConfig'; // Adjust path as needed

const db = getFirestore(firebaseApp);

/* ------------------------------------------------------------------
   HELPER: Create Notification
------------------------------------------------------------------ */
export async function createNotification(targetUserId: string, data: any) {
  try {
    console.log('🔹 createNotification called. targetUserId:', targetUserId, 'data:', data);
    if (!targetUserId) {
      throw new Error('❌ targetUserId is missing');
    }
    const notificationsRef = collection(db, 'users', targetUserId, 'notifications');
    const docRef = await addDoc(notificationsRef, {
      ...data,
      timestamp: serverTimestamp(),
      read: false,
    });
    console.log('✅ Notification doc created for:', targetUserId, '=> doc:', docRef.id);
  } catch (error) {
    console.error('❌ Error creating notification:', error);
  }
}

/* ------------------------------------------------------------------
   REWARD HELPER: Check and apply daily reward
------------------------------------------------------------------ */
export async function checkAndGrantDailyReward(userId: string, rewardKey: string, xp: number, coins: number) {
  try {
    console.log(`🟩 checkAndGrantDailyReward triggered for user: ${userId}, rewardKey: ${rewardKey}`);
    const userRef = doc(db, 'users', userId);
    const rewardTrackerRef = doc(db, 'users', userId, 'rewardTracking', rewardKey);
    const rewardSnap = await getDoc(rewardTrackerRef);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayTimestamp = today.getTime();

    let alreadyClaimedToday = false;

    if (rewardSnap.exists()) {
      const lastClaimed = rewardSnap.data()?.lastClaimed?.toDate?.();
      if (lastClaimed && lastClaimed.getTime() >= todayTimestamp) {
        alreadyClaimedToday = true;
      }
    }

    if (!alreadyClaimedToday) {
      await updateDoc(userRef, {
        XP: increment(xp),
        DailyXP: increment(xp),
        coins: increment(coins),
        dailyCoins: increment(coins),
      });

      await setDoc(rewardTrackerRef, {
        lastClaimed: serverTimestamp(),
      });

      console.log(`🎉 Reward granted: ${rewardKey} (+${xp} XP / +${coins} Coins)`);
    } else {
      console.log(`⏳ Reward already claimed today for: ${rewardKey}`);
    }
  } catch (error) {
    console.error(`❌ Error in reward ${rewardKey}:`, error);
  }
}

/* ------------------------------------------------------------------
   HELPER: Format time-ago
------------------------------------------------------------------ */
export function timeAgo(timestamp: any) {
  if (!timestamp || !timestamp.seconds) return 'Just now';
  const seconds = Math.floor(Date.now() / 1000 - timestamp.seconds);
  let interval = Math.floor(seconds / 31536000);
  if (interval >= 1) return `${interval} year${interval !== 1 ? 's' : ''} ago`;
  interval = Math.floor(seconds / 2592000);
  if (interval >= 1) return `${interval} month${interval !== 1 ? 's' : ''} ago`;
  interval = Math.floor(seconds / 86400);
  if (interval >= 1) return `${interval} day${interval !== 1 ? 's' : ''} ago`;
  interval = Math.floor(seconds / 3600);
  if (interval >= 1) return `${interval} hour${interval !== 1 ? 's' : ''} ago`;
  interval = Math.floor(seconds / 60);
  if (interval >= 1) return `${interval} minute${interval !== 1 ? 's' : ''} ago`;
  return `${seconds} second${seconds !== 1 ? 's' : ''} ago`;
}