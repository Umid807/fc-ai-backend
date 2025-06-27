const admin = require('firebase-admin');
const serviceAccount = require('./firebase-key.json');
const articles = require('./url.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://fc25assistant-default-rtdb.firebaseio.com/' // Replace with your actual database URL
});

const db = admin.database();

async function uploadArticles() {
  const ref = db.ref('posts'); // Creates or references 'ProTips' node in Realtime Database

  const updates = {};
  
  articles.forEach((article, index) => {
    const newKey = ref.push().key; // Generate unique key for each article
    updates[newKey] = article;
  });

  await ref.update(updates);
  console.log('✅ Articles successfully uploaded to Realtime Database!');
}

uploadArticles().catch(console.error);
