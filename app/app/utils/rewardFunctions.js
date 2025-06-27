// app/utils/rewardFunctions.js

import { getFirestore, doc, runTransaction, Timestamp, increment } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

export const claimDailyReward = async (rewardAmount = 50) => {
  try {
    const auth = getAuth();
    const db = getFirestore();
    const user = auth.currentUser;

    if (!user) {
      throw new Error("No authenticated user found");
    }

    const userDocRef = doc(db, "users", user.uid);

    await runTransaction(db, async (transaction) => {
      const userDoc = await transaction.get(userDocRef);

      if (!userDoc.exists()) {
        throw new Error("User document does not exist");
      }

      const data = userDoc.data();

      // Get today's date string in 'YYYY-MM-DD' format
      const today = new Date();
      const todayString = today.toISOString().split('T')[0];

      let lastClaimedString = "";
      if (data.lastClaimedDate) {
        // If lastClaimedDate is stored as a Firestore Timestamp, convert it
        if (data.lastClaimedDate.toDate) {
          lastClaimedString = data.lastClaimedDate.toDate().toISOString().split('T')[0];
        } else if (typeof data.lastClaimedDate === "string") {
          lastClaimedString = data.lastClaimedDate;
        }
      }

      // If the reward has already been claimed today, abort the transaction.
      if (lastClaimedString === todayString) {
        throw new Error("Daily reward already claimed today");
      }

      // Otherwise, increment coins and update the lastClaimedDate
      transaction.update(userDocRef, {
        coins: increment(rewardAmount),
        lastClaimedDate: Timestamp.fromDate(today)
      });
    });

    return true;
  } catch (error) {
    console.error("Error claiming daily reward: ", error);
    return false;
  }
};
