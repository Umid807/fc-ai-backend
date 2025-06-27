import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

admin.initializeApp();
const db = admin.firestore();

export const recalculateHotnessScores = functions.pubsub
  .topic('firebase-schedule-recalculateHotnessScores-us-central1')
  .onPublish(async (message) => {
    const now = Date.now();
    const snapshot = await db.collection('posts').get();

    const updates: Promise<any>[] = [];

    snapshot.forEach(doc => {
      const post = doc.data();
      const createdAt =
        post.createdAt?.toMillis?.() ||
        (post.createdAt?.seconds ? post.createdAt.seconds * 1000 : now);
      const hoursOld = (now - createdAt) / 3600000;

      const likes = post.likes || 0;
      const comments = post.comments || 0;

      const score = Math.max((likes * 3 + comments * 2 - hoursOld * 0.5), 0);

      updates.push(doc.ref.update({ hotnessScore: score }));
    });

    await Promise.all(updates);
    console.log(`🔥 Recalculated hotness for ${updates.length} posts`);
  });
