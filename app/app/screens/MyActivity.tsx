import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ImageBackground,
  TouchableOpacity,
} from "react-native";
import { useRouter } from "expo-router";
import i18n from '../i18n/i18n';
import { useTranslation } from 'react-i18next';
import {
  getFirestore,
  doc,
  onSnapshot,
  collection,
  collectionGroup,
  query,
  where,
} from "firebase/firestore";
import auth from "../firebaseAuth";
import { getDoc } from "firebase/firestore";


const backgroundImage = require("../../assets/images/Article bk.png");

const MyActivity = () => {
  const { t } = useTranslation();
  const router = useRouter();
  const db = getFirestore();
  const currentUser = auth.currentUser;

  // Basic user info from user doc
  const [userData, setUserData] = useState({
    username: t('activity.defaultUsername'),
    rank: t('activity.defaultRank'),
    coinBalance: 0,
  });

  // Real-time arrays for each activity type
  const [myPosts, setMyPosts] = useState([]);      // user's own posts
  const [myReplies, setMyReplies] = useState([]);  // user's comments
  const [mySavedItems, setMySavedItems] = useState([]); // user's saved items

  // Derived counts
  const postsCount = myPosts.length;
  const commentsCount = myReplies.length;
  const postsSaved = mySavedItems.length;

  // Tab state: removed "liked"
  type ActivityTab = "posts" | "replies" | "saved";
  const [activeTab, setActiveTab] = useState<ActivityTab>("posts");

  // -----------------------------
  // Subscribe to the user doc for basic info
  // -----------------------------
  useEffect(() => {
    if (!currentUser) return;
    const userDocRef = doc(db, "users", currentUser.uid);
    const unsubscribeUser = onSnapshot(userDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setUserData({
          username: data.username || t('activity.defaultUsername'),
          rank: data.rank || t('activity.defaultRank'),
          coinBalance: data.coins || 0,
        });
      }
    });
    return () => unsubscribeUser();
  }, [currentUser, db, t]);

  // -----------------------------
  // 1) Query "posts" for user's own posts
  // -----------------------------
  useEffect(() => {
    if (!currentUser) return;
    const postsRef = collection(db, "posts");
    const q = query(postsRef, where("userId", "==", currentUser.uid));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedPosts: any[] = [];
      snapshot.forEach((doc) => {
        fetchedPosts.push({ id: doc.id, ...doc.data() });
      });
      setMyPosts(fetchedPosts);
    });

    return () => unsubscribe();
  }, [currentUser, db]);

  // -----------------------------
  // 2) Query "comments" – either top-level or subcollection
  //    If comments are subcollections under posts, use collectionGroup
  // -----------------------------
  useEffect(() => {
    if (!currentUser) return;

    // Example if "comments" is a subcollection under each post:
    //    const commentsGroup = collectionGroup(db, "comments");
    //    const q = query(commentsGroup, where("userID", "==", currentUser.uid));
    //
    // Example if "comments" is a top-level collection:
    //    const commentsRef = collection(db, "comments");
    //    const q = query(commentsRef, where("userID", "==", currentUser.uid));
    //
    // Adjust according to your structure:

    const commentsGroup = collectionGroup(db, "comments"); // subcollection approach
    const q = query(commentsGroup, where("userId", "==", currentUser.uid));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedComments: any[] = [];
      snapshot.forEach((doc) => {
        fetchedComments.push({ id: doc.id, ...doc.data() });
      });
      setMyReplies(fetchedComments);
    });

    return () => unsubscribe();
  }, [currentUser, db]);

  // -----------------------------
  // 3) Query "saved" collection
  // -----------------------------
  useEffect(() => {
    if (!currentUser) return;
  
    const savedRef = collection(db, "saved");
    const q = query(savedRef, where("userID", "==", currentUser.uid));
  
    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const fetchedSaved: any[] = [];
  
      for (const docSnap of snapshot.docs) {
        const savedData = docSnap.data();
        const postId = savedData.postID || savedData.postId;
  
        if (!postId) continue;
  
        try {
          const postRef = doc(db, "posts", postId);
          const postSnap = await getDoc(postRef);
  
          if (postSnap.exists()) {
            fetchedSaved.push({
              id: postId, // for linking
              ...postSnap.data(), // actual post content
            });
          }
        } catch (error) {
          console.error("❌ Error fetching post for saved item:", error);
        }
      }
  
      setMySavedItems(fetchedSaved);
    });
  
    return () => unsubscribe();
  }, [currentUser, db]);
  

  // -----------------------------
  // Render the feed based on the active tab
  // -----------------------------
  const renderList = () => {
    let data: any[] = [];
    switch (activeTab) {
      case "posts":
        data = myPosts;
        break;
      case "replies":
        data = myReplies;
        break;
      case "saved":
        data = mySavedItems;
        break;
      default:
        data = [];
    }
  
    if (!data || data.length === 0) {
      return (
        <Text style={styles.emptyText}>
          {t('activity.emptyListMessage')}
        </Text>
      );
    }
  
    return data.map((item) => {
      const content = (
        <View style={styles.listItem}>
          <Text style={styles.postTitle}>
            {item.title || item.text || item.content || t('activity.untitled')}
          </Text>
          <Text style={styles.postSnippet}>
            {item.snippet || item.text || item.content || t('activity.noPreview')}
          </Text>
          <View style={styles.itemFooter}>
            <Text style={styles.timestamp}>
              {item.timestamp
                ? new Date(item.timestamp.seconds * 1000).toLocaleString()
                : t('activity.unknownTime')}
            </Text>
            <Text style={styles.tag}>{item.category || t('activity.generalCategory')}</Text>
          </View>
        </View>
      );
  
      // Only wrap in TouchableOpacity if not a reply
      if (activeTab === "replies") {
        return <View key={item.id}>{content}</View>;
      } else {
        return (
          <TouchableOpacity
            key={item.id}
            onPress={() => router.push(`/forum/PostDetails?id=${item.id}`)}
          >
            {content}
          </TouchableOpacity>
        );
      }
    });
  };
  

  return (
    <ImageBackground
      source={backgroundImage}
      style={styles.background}
      resizeMode="cover"
    >
      <ScrollView contentContainerStyle={styles.container}>
        {/* Top Bar */}
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.title}>{t('activity.title')}</Text>
          <Text style={styles.username}>@{userData.username}</Text>
          <Text style={styles.rank}>{userData.rank}</Text>
          <Text style={styles.coinBalance}>${userData.coinBalance}</Text>
        </View>

        {/* Milestone Section */}
        <View style={styles.milestoneCard}>
          <View style={styles.milestoneRow}>
            <Text style={styles.icon}>📝</Text>
            <Text style={styles.milestoneText}>
              {t('activity.postsCreated')} {postsCount}
            </Text>
          </View>
          <View style={styles.milestoneRow}>
            <Text style={styles.icon}>💬</Text>
            <Text style={styles.milestoneText}>
              {t('activity.commentsMade')} {commentsCount}
            </Text>
          </View>
          <View style={styles.milestoneRow}>
            <Text style={styles.icon}>🔖</Text>
            <Text style={styles.milestoneText}>
              {t('activity.postsSaved')} {postsSaved}
            </Text>
          </View>
        </View>

        {/* Tabs / Segmented Controls */}
        <View style={styles.tabs}>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === "posts" && styles.activeTab]}
            onPress={() => setActiveTab("posts")}
          >
            <Text style={styles.tabText}>{t('activity.myPosts')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabButton, activeTab === "replies" && styles.activeTab]}
            onPress={() => setActiveTab("replies")}
          >
            <Text style={styles.tabText}>{t('activity.myReplies')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabButton, activeTab === "saved" && styles.activeTab]}
            onPress={() => setActiveTab("saved")}
          >
            <Text style={styles.tabText}>{t('activity.saved')}</Text>
          </TouchableOpacity>
        </View>

        {/* Feed / List Section */}
        <View style={styles.feed}>{renderList()}</View>
      </ScrollView>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  background: { flex: 1, width: "100%", height: "100%" },
  container: { padding: 20, paddingBottom: 40 },
  topBar: { marginBottom: 20, alignItems: "center" },
  backButton: { alignSelf: "flex-start", marginBottom: 10 },
  backButtonText: { fontSize: 18, color: "#00FF9D" },
  title: { fontSize: 24, fontWeight: "bold", color: "#00FF9D", marginBottom: 5 },
  username: { fontSize: 16, color: "#fff" },
  rank: { fontSize: 14, color: "#fff", marginTop: 2 },
  coinBalance: { fontSize: 16, color: "#fff", marginTop: 2 },

  milestoneCard: {
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    borderRadius: 10,
    padding: 15,
    marginBottom: 20,
  },
  milestoneRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  icon: { marginRight: 10, fontSize: 16 },
  milestoneText: { fontSize: 16, color: "#fff" },

  tabs: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 15,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    marginHorizontal: 5,
    borderRadius: 5,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    alignItems: "center",
  },
  activeTab: { backgroundColor: "#2196F3" },
  tabText: { color: "#00FF9D", fontWeight: "bold" },

  feed: {},
  listItem: {
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
  },
  postTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 5,
  },
  postSnippet: { fontSize: 14, color: "#ccc", marginBottom: 5 },
  itemFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  timestamp: { fontSize: 12, color: "#aaa" },
  tag: { fontSize: 12, color: "#00FF9D" },

  emptyText: { textAlign: "center", color: "#aaa", marginTop: 20 },
});

export default MyActivity;