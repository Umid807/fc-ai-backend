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
import i18n from "../i18n/i18n";
import { useTranslation } from "react-i18next";
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

console.log("MyActivity: Component file loaded");

const backgroundImage = require("../../assets/images/Article bk.png");

const MyActivity = () => {
  console.log("MyActivity: Component rendered");
  const { t } = useTranslation();
  const router = useRouter();
  const db = getFirestore();
  const currentUser = auth.currentUser;
  console.log(`MyActivity: Current user ID: ${currentUser?.uid || 'Not logged in'}`);

  // Basic user info from user doc
  const [userData, setUserData] = useState({
    username: t('activity.defaultUsername'),
    rank: t('activity.defaultRank'),
    coinBalance: 0,
  });
  console.log("MyActivity: UserData state initialized", userData);

  // Real-time arrays for each activity type
  const [myPosts, setMyPosts] = useState([]);     // user's own posts
  console.log("MyActivity: MyPosts state initialized");
  const [myReplies, setMyReplies] = useState([]);  // user's comments
  console.log("MyActivity: MyReplies state initialized");
  const [mySavedItems, setMySavedItems] = useState([]); // user's saved items
  console.log("MyActivity: MySavedItems state initialized");

  // Derived counts
  const postsCount = myPosts.length;
  const commentsCount = myReplies.length;
  const postsSaved = mySavedItems.length;
  console.log(`MyActivity: Derived counts - Posts: ${postsCount}, Comments: ${commentsCount}, Saved: ${postsSaved}`);

  // Tab state: removed "liked"
  type ActivityTab = "posts" | "replies" | "saved";
  const [activeTab, setActiveTab] = useState<ActivityTab>("posts");
  console.log("MyActivity: ActiveTab state initialized to 'posts'");

  // ------------------------------------
  // Subscribe to the user doc for basic info
  // ------------------------------------
  useEffect(() => {
    console.log("MyActivity: useEffect for user data subscription triggered");
    if (!currentUser) {
      console.log("MyActivity: User not logged in, skipping user data subscription.");
      return;
    }

    const userDocRef = doc(db, "users", currentUser.uid);
    console.log("MyActivity: Subscribing to user document for UID: " + currentUser.uid);
    const unsubscribeUser = onSnapshot(userDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setUserData({
          username: data.username || t('activity.defaultUsername'),
          rank: data.rank || t('activity.defaultRank'),
          coinBalance: data.coins || 0,
        });
        console.log("MyActivity: UserData updated from Firestore. New data:", {
          username: data.username,
          rank: data.rank,
          coinBalance: data.coins,
        });
      } else {
        console.log("MyActivity: User document does not exist.");
      }
    });
    return () => {
      unsubscribeUser();
      console.log("MyActivity: User data subscription unsubscribed.");
    };
  }, [currentUser, db, t]);

  // ------------------------------------
  // 1) Query "posts" for user's own posts
  // ------------------------------------
  useEffect(() => {
    console.log("MyActivity: useEffect for user posts subscription triggered");
    if (!currentUser) {
      console.log("MyActivity: User not logged in, skipping posts subscription.");
      return;
    }
    const postsRef = collection(db, "posts");
    const q = query(postsRef, where("userId", "==", currentUser.uid));
    console.log("MyActivity: Subscribing to 'posts' collection for userId: " + currentUser.uid);

    const unsubscribePosts = onSnapshot(q, (snapshot) => {
      console.log("MyActivity: Posts data received from Firestore.");
      const fetchedPosts: any[] = [];
      snapshot.forEach((doc) => {
        fetchedPosts.push({ id: doc.id, ...doc.data() });
      });
      setMyPosts(fetchedPosts);
      console.log(`MyActivity: MyPosts state updated. Total posts fetched: ${fetchedPosts.length}`);
    });

    return () => {
      unsubscribePosts();
      console.log("MyActivity: User posts subscription unsubscribed.");
    };
  }, [currentUser, db]);

  // ------------------------------------
  // 2) Query "comments" – either top-level or subcollection
  //    If comments are subcollections under posts, use collectionGroup
  // ------------------------------------
  useEffect(() => {
    console.log("MyActivity: useEffect for user replies subscription triggered");
    if (!currentUser) {
      console.log("MyActivity: User not logged in, skipping replies subscription.");
      return;
    }

    // Adjust according to your structure:
    const commentsGroup = collectionGroup(db, "comments"); // subcollection approach
    const q = query(commentsGroup, where("userId", "==", currentUser.uid));
    console.log("MyActivity: Subscribing to 'comments' collection group for userId: " + currentUser.uid);

    const unsubscribeReplies = onSnapshot(q, (snapshot) => {
      console.log("MyActivity: Replies data received from Firestore.");
      const fetchedComments: any[] = [];
      snapshot.forEach((doc) => {
        fetchedComments.push({ id: doc.id, ...doc.data() });
      });
      setMyReplies(fetchedComments);
      console.log(`MyActivity: MyReplies state updated. Total replies fetched: ${fetchedComments.length}`);
    });

    return () => {
      unsubscribeReplies();
      console.log("MyActivity: User replies subscription unsubscribed.");
    };
  }, [currentUser, db]);

  // ------------------------------------
  // 3) Query "saved" collection
  // ------------------------------------
  useEffect(() => {
    console.log("MyActivity: useEffect for saved items subscription triggered");
    if (!currentUser) {
      console.log("MyActivity: User not logged in, skipping saved items subscription.");
      return;
    }

    const savedRef = collection(db, "saved");
    const q = query(savedRef, where("userId", "==", currentUser.uid));
    console.log("MyActivity: Subscribing to 'saved' collection for userId: " + currentUser.uid);

    const unsubscribeSaved = onSnapshot(q, async (snapshot) => {
      console.log("MyActivity: Saved items data received from Firestore.");
      const fetchedSaved: any[] = [];

      for (const docSnap of snapshot.docs) {
        const savedData = docSnap.data();
        // Assuming 'postId' or 'postID' exists in the saved document
        const postId = savedData.postId || savedData.postID; 
        console.log(`MyActivity: Processing saved item with document ID: ${docSnap.id}, postId: ${postId}`);

        if (!postId) {
          console.log("MyActivity: Saved item missing postId, skipping this item.");
          continue;
        }

        try {
          console.log(`MyActivity: Attempting to fetch post details for postId: ${postId}`);
          const postRef = doc(db, "posts", postId);
          const postSnap = await getDoc(postRef);

          if (postSnap.exists()) {
            fetchedSaved.push({
              id: postId, // for linking
              ...postSnap.data(), // actual post content
            });
            console.log(`MyActivity: Post details fetched successfully for postId: ${postId}`);
          } else {
            console.log(`MyActivity: Post not found for postId: ${postId} (may have been deleted).`);
          }
        } catch (error: any) {
          console.error("MyActivity: Error fetching post for saved item: " + error.message);
          console.error("MyActivity: Error details for saved item fetch:", error);
        }
      }
      setMySavedItems(fetchedSaved);
      console.log(`MyActivity: MySavedItems state updated. Total saved items fetched: ${fetchedSaved.length}`);
    });

    return () => {
      unsubscribeSaved();
      console.log("MyActivity: Saved items subscription unsubscribed.");
    };
  }, [currentUser, db]);

  // ------------------------------------
  // Render the feed based on the active tab
  // ------------------------------------
  const renderList = () => {
    console.log("MyActivity: renderList function called. Active tab: " + activeTab);
    let data: any[] = [];
    switch (activeTab) {
      case "posts":
        data = myPosts;
        console.log("MyActivity: Switched to 'posts' tab. Displaying " + data.length + " items.");
        break;
      case "replies":
        data = myReplies;
        console.log("MyActivity: Switched to 'replies' tab. Displaying " + data.length + " items.");
        break;
      case "saved":
        data = mySavedItems;
        console.log("MyActivity: Switched to 'saved' tab. Displaying " + data.length + " items.");
        break;
      default:
        data = [];
        console.log("MyActivity: Default tab selected, no data to display.");
    }

    if (!data || data.length === 0) {
      console.log("MyActivity: Displaying empty list message for tab: " + activeTab);
      return (
        <Text style={styles.emptyText}>
          {t('activity.emptyListMessage')}
        </Text>
      );
    }
    console.log(`MyActivity: Mapping over ${data.length} items for display.`);
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
        console.log("MyActivity: Rendering reply item (not clickable). Item ID: " + item.id);
        return <View key={item.id}>{content}</View>;
      } else {
        console.log("MyActivity: Rendering clickable item. Item ID: " + item.id);
        return (
          <TouchableOpacity
            key={item.id}
            onPress={() => {
                router.push(`/forum/PostDetails?id=${item.id}`);
                console.log(`MyActivity: Navigating to PostDetails for item ID: ${item.id}`);
            }}
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
          <TouchableOpacity onPress={() => {
              router.back();
              console.log("MyActivity: Back button pressed. Navigating back.");
            }} style={styles.backButton}>
            <Text style={styles.backButtonText}>&#x2190;</Text>
          </TouchableOpacity>
          <Text style={styles.title}>{t('activity.title')}</Text>
          <Text style={styles.username}>@{userData.username}</Text>
          <Text style={styles.rank}>{userData.rank}</Text>
          <Text style={styles.coinBalance}>${userData.coinBalance}</Text>
        </View>

        {/* Milestone Section */}
        <View style={styles.milestoneCard}>
          <View style={styles.milestoneRow}>
            <Text style={styles.icon}>🏆</Text>
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
            <Text style={styles.icon}>💾</Text>
            <Text style={styles.milestoneText}>
              {t('activity.postsSaved')} {postsSaved}
            </Text>
          </View>
        </View>

        {/* Tabs / Segmented Controls */}
        <View style={styles.tabs}>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === "posts" && styles.activeTab]}
            onPress={() => {
                setActiveTab("posts");
                console.log("MyActivity: Tab switched to 'posts'.");
            }}
          >
            <Text style={styles.tabText}>{t('activity.myPosts')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabButton, activeTab === "replies" && styles.activeTab]}
            onPress={() => {
                setActiveTab("replies");
                console.log("MyActivity: Tab switched to 'replies'.");
            }}
          >
            <Text style={styles.tabText}>{t('activity.myReplies')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabButton, activeTab === "saved" && styles.activeTab]}
            onPress={() => {
                setActiveTab("saved");
                console.log("MyActivity: Tab switched to 'saved'.");
            }}
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