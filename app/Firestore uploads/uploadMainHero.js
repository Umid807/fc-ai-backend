const admin = require('firebase-admin');
const serviceAccount = require('../firebase-key.json');
const heroCards = require('./herocontent.json');

// 🔐 Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

async function uploadHeroCards() {
  for (const card of heroCards) {
    // Ensure valid ID
    if (!card.id || typeof card.id !== 'string' || card.id.trim() === '') {
      console.error(`❌ Skipped due to missing ID: ${card.title}`);
      continue;
    }

    const { id, ...rest } = card;

    // Assign timestamps
    rest.createdAt = admin.firestore.Timestamp.now();

    // Optional expireAt: 7 days from now
    rest.expireAt =
      rest.expireAt ||
      admin.firestore.Timestamp.fromDate(
        new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      );

    try {
      const docRef = db.collection('mainHero').doc(id.trim());
      await docRef.set(rest);
      console.log(`✅ Uploaded hero card: ${rest.title}`);
    } catch (err) {
      console.error(`❌ Failed to upload hero card: ${card.title}`, err.message);
    }
  }

  console.log('🎉 All hero cards uploaded!');
}

uploadHeroCards().catch((err) => {
  console.error('🔥 Upload script failed:', err.message);
});
