const admin = require('firebase-admin');
const serviceAccount = require('./firebase-key.json');
const articles = require('./Userupload.ison');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function uploadArticles() {
  const batch = db.batch();
  
  articles.forEach(article => {
    const docRef = db.collection('users').doc(); // Auto-generated ID
    batch.set(docRef, article);
  });

  await batch.commit();
  console.log('✅ Articles successfully uploaded!');
}

uploadArticles().catch(console.error);
