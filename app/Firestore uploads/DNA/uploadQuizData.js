const admin = require("firebase-admin");
const fs = require("fs");

// Load service account credentials
const serviceAccount = require("./serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

// Load your JSON file
const quizData = JSON.parse(fs.readFileSync("./DNA quiz es.json", "utf-8"));

async function uploadQuiz() {
  try {
    await db.collection("dna_quiz").doc("es").set(quizData);
    console.log("✅ Successfully uploaded quiz data to Firestore.");
  } catch (err) {
    console.error("❌ Failed to upload quiz data:", err);
  }
}

uploadQuiz();
