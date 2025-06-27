const admin = require('firebase-admin');
const serviceAccount = require('./firebase-key.json');
const articles = require('./articles.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function uploadArticles() {
  for (const article of articles) {
    const { comments, ...postData } = article; // separate comments

    const postRef = db.collection('posts').doc(); // generate post doc

    // Upload main post (without comments)
    await postRef.set(postData);
    console.log(`✅ Uploaded post: ${postData.title}`);

    // Upload comments as subcollection
    if (Array.isArray(comments) && comments.length > 0) {
      for (const comment of comments) {
        await postRef.collection('comments').add(comment);
      }
      console.log(`💬 Added ${comments.length} comment(s) to "${postData.title}"`);
    }
  }

  console.log('✅ All articles successfully uploaded!');
}

uploadArticles().catch(console.error);
