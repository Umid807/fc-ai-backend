import React, { useEffect, useState } from "react";
import { View, Text, FlatList, ActivityIndicator, TouchableOpacity } from "react-native";
import { getFirestore, collection, query, orderBy, onSnapshot, doc, updateDoc } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import i18n from '../i18n/i18n';
import { useTranslation } from 'react-i18next';

const NotificationScreen = () => {
  console.log("NotificationScreen: Component mounted.");
  const [notifications, setNotifications] = useState([]);
  console.log("NotificationScreen: State initialized - notifications: []");
  const [loading, setLoading] = useState(true);
  console.log("NotificationScreen: State initialized - loading: true");
  const auth = getAuth();
  const db = getFirestore();
  const { t } = useTranslation();

  useEffect(() => {
    console.log("NotificationScreen: useEffect triggered for fetching notifications.");
    const user = auth.currentUser;
    if (!user) {
      console.log("NotificationScreen: User not authenticated. Aborting notification fetch.");
      return;
    }
    console.log("NotificationScreen: User authenticated. User ID: " + user.uid);

    const userId = user.uid;
    console.log("NotificationScreen: Fetching notifications for userId: " + userId);
    const notificationsRef = collection(db, "users", userId, "notifications");

    console.log("NotificationScreen: Building Firestore query.");
    const q = query(notificationsRef, orderBy("timestamp", "desc"));

    console.log("NotificationScreen: Starting real-time listener for notifications.");
    const unsubscribe = onSnapshot(q, (snapshot) => {
      console.log("NotificationScreen: New snapshot received from Firestore.");
      const fetchedNotifications = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      setNotifications(fetchedNotifications as any);
      console.log("NotificationScreen: Notifications state updated. Total notifications: " + fetchedNotifications.length);
      setLoading(false);
      console.log("NotificationScreen: Loading state updated to false.");
    }, (error) => {
      console.log("NotificationScreen: Real-time listener error: " + error.message);
      setLoading(false);
      console.log("NotificationScreen: Loading state updated to false due to error.");
    });

    return () => {
      unsubscribe();
      console.log("NotificationScreen: useEffect cleanup - Unsubscribing from real-time notifications.");
    };
  }, [auth]);

  const markAsRead = async (notificationId: string) => {
    console.log("NotificationScreen: markAsRead function called for notificationId: " + notificationId);
    try {
      console.log("NotificationScreen: Attempting to mark notification as read.");
      const user = auth.currentUser;
      if (!user) {
        console.log("NotificationScreen: User not authenticated. Cannot mark notification as read.");
        return;
      }
      console.log("NotificationScreen: User authenticated for markAsRead. User ID: " + user.uid);

      const notificationRef = doc(db, "users", user.uid, "notifications", notificationId);
      console.log("NotificationScreen: Updating document for notificationId: " + notificationId + " to read: true.");
      await updateDoc(notificationRef, { read: true });
      console.log("NotificationScreen: Notification " + notificationId + " marked as read successfully.");
    } catch (error: any) {
      console.error("NotificationScreen: Error marking notification as read: " + error.message, error);
      console.log("NotificationScreen: markAsRead operation failed. Error: " + error.message);
    }
  };

  if (loading) {
    console.log("NotificationScreen: Displaying loading indicator.");
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#121212" }}>
        <ActivityIndicator size="large" color="#FFA500" />
      </View>
    );
  }

  console.log("NotificationScreen: Rendering main content.");
  return (
    <View style={{ flex: 1, padding: 20, backgroundColor: "#121212" }}>
      <Text style={{ fontSize: 24, fontWeight: "bold", color: "white", marginBottom: 20 }}>
        {t("notifications.title")}
      </Text>

      {notifications.length === 0 ? (
        <Text style={{ color: "gray", textAlign: "center", fontSize: 16 }}>
          {t("notifications.noNotifications")}
        </Text>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => {
            console.log("NotificationScreen: Rendering notification item - ID: " + item.id + ", Read Status: " + item.read);
            return (
              <TouchableOpacity
                onPress={() => {
                  console.log("NotificationScreen: Notification item pressed - ID: " + item.id);
                  markAsRead(item.id);
                }}
                style={{
                  padding: 15,
                  marginBottom: 10,
                  backgroundColor: item.read ? "#333" : "#1E90FF",
                  borderRadius: 8,
                }}
              >
                <Text style={{ color: "white", fontSize: 16 }}>{item.message}</Text>
                <Text style={{ color: "gray", fontSize: 12 }}>
                  {item.timestamp?.toDate
                    ? new Date(item.timestamp.toDate()).toLocaleString()
                    : t("notifications.justNow")}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      )}
    </View>
  );
};

export default NotificationScreen;