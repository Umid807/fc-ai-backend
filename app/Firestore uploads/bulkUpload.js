const admin = require('firebase-admin');
const serviceAccount = require('./firebase-key.json');
const articles = require('./articles.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function uploadArticles() {
  const batch = db.batch();
  
  articles.forEach(article => {
    const docRef = db.collection('posts').doc(); // Auto-generated ID
    batch.set(docRef, article);
  });

  await batch.commit();
  console.log('✅ Articles successfully uploaded!');
}

uploadArticles().catch(console.error);
