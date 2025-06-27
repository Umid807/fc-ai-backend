const admin = require('firebase-admin');
const serviceAccount = require('./firebase-key.json');
const posts = require('./articles.json');

// 🔐 Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function uploadPosts() {
  for (const post of posts) {
    // Check for a valid ID
    if (!post.id || typeof post.id !== 'string' || post.id.trim() === '') {
      console.error(`❌ Skipped post due to missing or invalid ID: ${post.title}`);
      continue;
    }

    const { id, comments = [], createdAt, ...rest } = post;

// Use the current server timestamp
rest.createdAt = admin.firestore.Timestamp.now();


    try {
      const postRef = db.collection('posts').doc(id.trim()); // ✅ Set doc ID explicitly
      await postRef.set(rest); // ✅ Store all fields at the root

      // 🔁 Add comments to the subcollection
      const commentsRef = postRef.collection('comments');
      for (const comment of comments) {
        await commentsRef.add(comment); // Firestore auto-generates comment ID
      }

      console.log(`✅ Uploaded post: ${rest.title}`);
    } catch (err) {
      console.error(`❌ Failed to upload post: ${post.title}`, err.message);
    }
  }

  console.log('🎉 All posts and comments uploaded!');
}

uploadPosts().catch((err) => {
  console.error('🔥 Upload script failed:', err.message);
});
