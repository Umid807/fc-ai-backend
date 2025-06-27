import admin from 'firebase-admin';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { Timestamp } from 'firebase-admin/firestore';

// __dirname workaround in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Read service account JSON
const serviceAccount = JSON.parse(readFileSync(`${__dirname}/serviceAccountKey.json`, 'utf8'));

// Initialize Firebase
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = admin.firestore();

async function createAcademySession() {
  const sessionData = {
    title: "Mastering 433 Build-up",
    coachId: "coach Brian",
    coachName: "Brian Wisely",
    coachAvatar: "https://example.com/coach.png",
    scheduleTime: Timestamp.fromDate(new Date('2025-06-01T19:00:00Z')),
    duration: 60,
    language: "en",
    isVIPOnly: true,
    capacity: 80,
    registeredCount: 0,
    zoomLink: "https://zoom.us/j/123456789",
    createdAt: Timestamp.now(),
    status: "scheduled",
    description: "Dominate your Ultimate Team with advanced 433 build-up tips."
  };

  const sessionRef = await db.collection('academy_sessions').add(sessionData);
  const sessionId = sessionRef.id;

  console.log(`✅ Session created with ID: ${sessionId}`);

  const testUser = {
    userId: "testUID123",
    username: "VIP_Baller",
    userAvatar: "https://example.com/user.png",
    registeredAt: Timestamp.now(),
    attended: false
  };

  await db
    .collection('academy_sessions')
    .doc(sessionId)
    .collection('attendees')
    .doc(testUser.userId)
    .set(testUser);

  console.log(`👤 Test attendee added under session: ${sessionId}`);
}

createAcademySession()
  .then(() => {
    console.log('✅ Done!');
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Error creating session:', err);
    process.exit(1);
  });
