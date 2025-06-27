
import React, { useEffect, useState } from "react";
import { View, Text, FlatList, ActivityIndicator, TouchableOpacity } from "react-native";
import { getFirestore, collection, query, orderBy, onSnapshot, doc, updateDoc } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import i18n from '../i18n/i18n';
import { useTranslation } from 'react-i18next';

const NotificationScreen = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const auth = getAuth();
  const db = getFirestore();
  const { t } = useTranslation();

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    const userId = user.uid;
    const notificationsRef = collection(db, "users", userId, "notifications");

    const q = query(notificationsRef, orderBy("timestamp", "desc"));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedNotifications = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      setNotifications(fetchedNotifications);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [auth]);

  const markAsRead = async (notificationId) => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      const notificationRef = doc(db, "users", user.uid, "notifications", notificationId);
      await updateDoc(notificationRef, { read: true });
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#121212" }}>
        <ActivityIndicator size="large" color="#FFA500" />
      </View>
    );
  }

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
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => markAsRead(item.id)}
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
          )}
        />
      )}
    </View>
  );
};

export default NotificationScreen;
