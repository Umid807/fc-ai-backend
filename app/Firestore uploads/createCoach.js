const admin = require('firebase-admin');

// 🔥 Initialize Firebase Admin SDK
const serviceAccount = require('./serviceAccountKey.json'); // your service account file

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// 👤 New Coach Data
const newCoach = {
  coachName: 'David Cooper',
  coachImage: 'https://firebasestorage.googleapis.com/v0/b/fc25assistant.appspot.com/o/coach-david.png?alt=media&token=abc123',
  Nationality: 'United Kingdom',
  Slogan: 'Start with a good defense, be patient.',
  achievements: '2019 FC Cup Winner',
  joinedSince: new Date('2025-05-14T12:00:00Z'),
  offeringLanguage: 'English, Chinese',
  timezone: '0',
  // Optional future fields:
  // visible: true,
  // playstyle: 'Tactical Builder'
};

// 📌 Main function to upload
async function addCoach() {
  try {
    const coachRef = await db.collection('coaches').add(newCoach);

    await coachRef.set(newCoach);
    console.log('✅ Coach added successfully!');
  } catch (err) {
    console.error('🔥 Error adding coach:', err);
  }
}

addCoach();
