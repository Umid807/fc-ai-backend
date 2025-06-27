// 🚀 FIREBASE TEMPLATE UPLOAD SCRIPT
// Run this script to upload templates to Firestore

const admin = require('firebase-admin');
const path = require('path');

// 📋 PLAYER CARD REVIEW TEMPLATE DATA (Firestore-Safe)
const PLAYER_CARD_REVIEW_TEMPLATE = {
  id: 'fc25_player_card_review',
  name: '⭐ Player Card Review',
  description: 'Complete review template for FC25/26 player cards with stats, gameplay analysis, and community rating',
  category: 'review',
  difficulty: 'beginner',
  isVIP: false,
  isActive: true,
  type: 'advanced',
  
  sections: [
    {
      id: 'card_showcase',
      label: '📸 Card Showcase',
      style: {
        fontSize: 16,
        fontWeight: 'normal',
        fontStyle: 'normal',
        textDecorationLine: 'none',
        textAlign: 'center',
        color: '#FFFFFF',
        fontFamily: 'System',
      },
      config: {
        placeholder: 'Upload your player card image and gameplay screenshots',
        minHeight: 200,
        maxHeight: 400,
        allowEmpty: false,
        type: 'image',
      },
      order: 0,
      exampleContent: 'Player card image showcase'
    },
    
    {
      id: 'stats_breakdown',
      label: '📊 Stats & Info',
      style: {
        fontSize: 14,
        fontWeight: 'normal',
        fontStyle: 'normal',
        textDecorationLine: 'none',
        textAlign: 'left',
        color: '#FFFFFF',
        fontFamily: 'System',
      },
      config: {
        placeholder: 'Player stats, playstyles, roles, and positions breakdown',
        minHeight: 180,
        maxHeight: 300,
        allowEmpty: false,
        type: 'table',
      },
      order: 1,
      exampleContent: 'Stats and information table'
    },
    
    {
      id: 'gameplay_review',
      label: '🎮 Gameplay Review',
      style: {
        fontSize: 16,
        fontWeight: 'normal',
        fontStyle: 'normal',
        textDecorationLine: 'none',
        textAlign: 'left',
        color: '#FFFFFF',
        fontFamily: 'System',
      },
      config: {
        placeholder: 'How does this card feel in-game? Share your experience after using it...',
        minHeight: 120,
        maxHeight: 250,
        allowEmpty: false,
        type: 'text',
      },
      order: 2,
      exampleContent: 'This card is absolutely insane! The pace feels even faster than the stats suggest. In my 15 games with TOTW Salah, he scored 12 goals and provided 8 assists. His finesse shots are broken - literally every shot from the edge of the box goes in. The only downside is his physical presence; stronger defenders can push him off the ball. Overall, if you can afford him, he\'s a game-changer.',
    },
    
    {
      id: 'pros_cons',
      label: '⚖️ Pros & Cons',
      style: {
        fontSize: 16,
        fontWeight: 'normal',
        fontStyle: 'italic',
        textDecorationLine: 'none',
        textAlign: 'center',
        color: '#FFD700',
        fontFamily: 'System',
      },
      config: {
        placeholder: 'Quick pros and cons summary',
        minHeight: 100,
        maxHeight: 200,
        allowEmpty: false,
        type: 'quote',
      },
      order: 3,
      exampleContent: 'Quote format for pros and cons'
    },
    
    {
      id: 'community_rating',
      label: '🗳️ Community Rating',
      style: {
        fontSize: 16,
        fontWeight: 'normal',
        fontStyle: 'normal',
        textDecorationLine: 'none',
        textAlign: 'center',
        color: '#FF69B4',
        fontFamily: 'System',
      },
      config: {
        placeholder: 'Let the community rate this card',
        minHeight: 150,
        maxHeight: 250,
        allowEmpty: false,
        type: 'poll',
      },
      order: 4,
      exampleContent: 'Community rating poll'
    }
  ],
  
  metadata: {
    author: 'FC Community Team',
    estimatedTime: 8,
    features: [
      'Card Image Showcase',
      'Detailed Stats Table', 
      'Gameplay Analysis',
      'Pros & Cons Format',
      'Community Rating Poll'
    ],
    useCase: 'Perfect for sharing detailed reviews of new player cards, TOTW releases, or comparing similar players',
    preview: 'Comprehensive player card review with visual showcase, stats breakdown, gameplay analysis, and community voting',
    icon: 'star',
    gradient: ['#667eea', '#764ba2', '#f093fb'],
    complexity: 2,
    popularity: 0,
    tags: ['player-review', 'fc25', 'fc26', 'ultimate-team', 'card-analysis', 'community-rating']
  }
};

// 🔧 FIREBASE INITIALIZATION
let app;

function initializeFirebase() {
  try {
    // Initialize Firebase Admin SDK with your service account
    const serviceAccount = require('./serviceAccountKey.json');
    
    if (!admin.apps.length) {
      app = admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: 'fc25assistant'
      });
      console.log('✅ Firebase Admin initialized successfully');
    } else {
      app = admin.app();
      console.log('✅ Using existing Firebase Admin instance');
    }
    
    return admin.firestore();
  } catch (error) {
    console.error('❌ Firebase initialization failed:', error.message);
    throw error;
  }
}

// 📤 UPLOAD FUNCTION
async function uploadTemplate(db, template) {
  try {
    console.log(`📤 Uploading template: ${template.name}`);
    
    // Add Firestore timestamps
    const templateWithTimestamps = {
      ...template,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    // Upload to AdvancedPostTemplates collection
    const docRef = await db.collection('AdvancedPostTemplates').add(templateWithTimestamps);
    
    console.log(`✅ Template uploaded successfully!`);
    console.log(`📄 Document ID: ${docRef.id}`);
    console.log(`🔗 Firestore URL: https://console.firebase.google.com/v1/r/project/fc25assistant/firestore/data/~2FAdvancedPostTemplates~2F${docRef.id}`);
    
    return docRef.id;
  } catch (error) {
    console.error(`❌ Upload failed:`, error);
    throw error;
  }
}

// 🔍 VERIFY UPLOAD
async function verifyUpload(db, docId) {
  try {
    console.log(`🔍 Verifying upload...`);
    
    const doc = await db.collection('AdvancedPostTemplates').doc(docId).get();
    
    if (doc.exists) {
      const data = doc.data();
      console.log(`✅ Verification successful!`);
      console.log(`📋 Template name: ${data.name}`);
      console.log(`📊 Sections count: ${data.sections?.length || 0}`);
      console.log(`🎯 Category: ${data.category}`);
      console.log(`⭐ Is VIP: ${data.isVIP}`);
      return true;
    } else {
      console.log(`❌ Document not found`);
      return false;
    }
  } catch (error) {
    console.error(`❌ Verification failed:`, error);
    return false;
  }
}

// 📋 LIST EXISTING TEMPLATES
async function listExistingTemplates(db) {
  try {
    console.log(`📋 Checking existing templates...`);
    
    const snapshot = await db.collection('AdvancedPostTemplates').get();
    
    if (snapshot.empty) {
      console.log(`📭 No existing templates found`);
      return [];
    }
    
    const templates = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      templates.push({
        id: doc.id,
        name: data.name,
        category: data.category,
        isVIP: data.isVIP
      });
    });
    
    console.log(`📚 Found ${templates.length} existing templates:`);
    templates.forEach((template, index) => {
      console.log(`  ${index + 1}. ${template.name} (${template.category}) ${template.isVIP ? '👑' : ''}`);
    });
    
    return templates;
  } catch (error) {
    console.error(`❌ Failed to list templates:`, error);
    return [];
  }
}

// 🚀 MAIN EXECUTION
async function main() {
  console.log('🎮 FC25 Template Upload Script');
  console.log('================================');
  
  try {
    // Initialize Firebase
    const db = initializeFirebase();
    
    // List existing templates
    await listExistingTemplates(db);
    
    console.log('\n🚀 Starting upload process...');
    
    // Upload the template
    const docId = await uploadTemplate(db, PLAYER_CARD_REVIEW_TEMPLATE);
    
    // Verify the upload
    const verified = await verifyUpload(db, docId);
    
    if (verified) {
      console.log('\n🎉 SUCCESS! Template is ready to use.');
      console.log('💡 You can now test it in your TemplateSelector component.');
    } else {
      console.log('\n⚠️  Upload completed but verification failed.');
    }
    
  } catch (error) {
    console.error('\n💥 Script failed:', error.message);
    process.exit(1);
  }
  
  console.log('\n✨ Script completed. Exiting...');
  process.exit(0);
}

// Run the script
if (require.main === module) {
  main();
}

module.exports = {
  initializeFirebase,
  uploadTemplate,
  verifyUpload,
  PLAYER_CARD_REVIEW_TEMPLATE
};