import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { logger } from "firebase-functions";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { onDocumentUpdated } from "firebase-functions/v2/firestore";
import { FirestoreEvent } from "firebase-functions/v2/firestore";
import { Change } from "firebase-functions";
// ✅ REQUIRED: Initialize Firebase app FIRST
initializeApp();
const db = getFirestore();

// 🔁 Scheduled daily hotness recalculation
export const recalculateHotnessScoresV2 = onSchedule("every 24 hours", async () => {
  logger.log("🔥 [Scheduled] Starting hotness score recalculation");

  try {
    const postsSnapshot = await db.collection("posts").get();
    logger.log(`📄 Total posts fetched: ${postsSnapshot.size}`);

    const now = Date.now();
    const batch = db.batch();

    postsSnapshot.forEach((doc) => {
      const data = doc.data();
      const likes = data.likes ?? 0;
      const comments = data.comments ?? 0;

      if (!data.createdAt || !data.createdAt.toDate) {
        logger.warn(`⛔ Skipping ${doc.id} - missing or invalid createdAt`);
        return;
      }

      const createdAtMillis = data.createdAt.toDate().getTime();
      const ageHours = Math.max((now - createdAtMillis) / (1000 * 60 * 60), 1);
      const hotness = (likes + comments * 2) / ageHours;

      logger.log(`✅ Post ${doc.id} → hotness: ${hotness.toFixed(2)}`);
      batch.update(doc.ref, { hotness });
    });

    await batch.commit();
    logger.log("🎉 [Scheduled] Hotness scores updated successfully");
  } catch (error) {
    logger.error("🔥 [Scheduled] Error during hotness score recalculation", error);
  }
});

// 🧪 Firestore-triggered version (manually triggered)
export const triggerHotnessManually = onDocumentUpdated(
  {
    document: "Admin/hotnessTrigger",
  },
  async (
    event: FirestoreEvent<Change<FirebaseFirestore.DocumentData> | undefined>
  ) => {
    logger.log("🔥 [Firestore Trigger] Starting manual hotness recalculation");

    try {
      const postsSnapshot = await db.collection("posts").get();
      logger.log(`📄 Total posts fetched: ${postsSnapshot.size}`);

      const now = Date.now();
      const batch = db.batch();

      postsSnapshot.forEach((doc) => {
        const data = doc.data();
        const likes = data.likes ?? 0;
        const comments = data.comments ?? 0;

        if (!data.createdAt || !data.createdAt.toDate) {
          logger.warn(`⛔ Skipping ${doc.id} - missing or invalid createdAt`);
          return;
        }

        const createdAtMillis = data.createdAt.toDate().getTime();
        const ageHours = Math.max((now - createdAtMillis) / (1000 * 60 * 60), 1);
        const hotness = (likes + comments * 2) / ageHours;

        logger.log(`✅ Post ${doc.id} → hotness: ${hotness.toFixed(2)}`);
        batch.update(doc.ref, { hotness });
      });

      await batch.commit();
      logger.log("🎉 [Firestore Trigger] Hotness scores updated successfully");
    } catch (err) {
      logger.error("🔥 [Firestore Trigger] Error during hotness recalculation", err);
    }
  }
);