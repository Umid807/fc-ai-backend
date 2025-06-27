import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Animated,
  Alert,
  Image,
  ImageBackground,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export const NotificationBell = ({
  notifications,
  navigation,
  markNotificationAsRead,
  userId,
  iconSource,
}: {
  notifications: any[];
  navigation: any;
  markNotificationAsRead: (id: string) => Promise<void>;
  userId: string;
  iconSource?: any;
}) => {
  const [modalVisible, setModalVisible] = useState(false);
  const unreadCount = notifications.filter((n) => !n.read).length;
  const notificationImage =
    unreadCount > 0
      ? require('../assets/images/bell alert.png')
      : require('../assets/images/bell.png');
  const notificationStyle =
    unreadCount > 0 ? styles.customIconAlert : styles.customIcon;

  return (
    <View style={styles.notificationButtonContainer}>
      <TouchableOpacity
        onPress={() => setModalVisible(true)}
        style={styles.button}
        hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
      >
        <Image source={iconSource || notificationImage} style={notificationStyle} />
      </TouchableOpacity>
      <NotificationModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        notifications={notifications}
        navigation={navigation}
        markNotificationAsRead={markNotificationAsRead}
        userId={userId}
      />
    </View>
  );
};

export const NotificationModal = ({
  visible,
  onClose,
  notifications,
  navigation,
  markNotificationAsRead,
  userId,
}: {
  visible: boolean;
  onClose: () => void;
  notifications: any[];
  navigation: any;
  markNotificationAsRead: (id: string) => Promise<void>;
  userId: string;
}) => {
  const dropAnim = useRef(new Animated.Value(-500)).current;

  useEffect(() => {
    Animated.timing(dropAnim, {
      toValue: visible ? 0 : -500,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [visible]);

  const handleDeleteNotification = async (notifId: string) => {
    const { getFirestore, doc, deleteDoc } = await import('firebase/firestore');
    const db = getFirestore();
    try {
      await deleteDoc(doc(db, 'users', userId, 'notifications', notifId));
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  const handleClearAll = async () => {
    const { getFirestore, doc, deleteDoc } = await import('firebase/firestore');
    const db = getFirestore();
    const deletes = notifications.map((n) =>
      deleteDoc(doc(db, 'users', userId, 'notifications', n.id))
    );
    try {
      await Promise.all(deletes);
      onClose();
    } catch (error) {
      console.error('Error clearing notifications:', error);
    }
  };

  const renderNotificationItem = ({ item }: { item: any }) => (
    <View
      style={[
        styles.notificationItem,
        item.read ? styles.readBackground : styles.unreadBackground,
      ]}
    >
      <TouchableOpacity
        style={styles.messageContainer}
        onPress={async () => {
          await markNotificationAsRead(item.id);
          onClose();
          if (!item.postId) {
            Alert.alert('Error', 'Post ID is missing in this notification.');
            return;
          }
          setTimeout(() => {
            navigation.navigate('PostDetails', {
              id: item.postId,
              highlightComment: item.commentId || null,
            });
          }, 300);
        }}
      >
        <Text style={[styles.notificationText, !item.read && styles.unreadText]}>
          {item.message}
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        onPress={() => handleDeleteNotification(item.id)}
        style={styles.deleteButton}
      >
        <Ionicons name="remove-circle-outline" size={20} color="red" />
      </TouchableOpacity>
    </View>
  );

  return (
    <Modal visible={visible} transparent animationType="none">
      <TouchableOpacity style={styles.modalOverlay} onPress={onClose} activeOpacity={1}>
        <Animated.View style={[styles.modalContainer, { transform: [{ translateY: dropAnim }] }]}>
          <ImageBackground
            source={require('../assets/images/postcard.png')}
            style={[styles.backgroundImage, { opacity: 1.0 }]}
          >
            <Text style={styles.modalTitle}>Notifications</Text>
            <FlatList
  data={notifications.slice(0, 5)}
  keyExtractor={(item) => item.id}
  renderItem={renderNotificationItem}
  contentContainerStyle={[
    styles.notificationList,
    notifications.length === 0 && styles.emptyListContainer,
  ]}
  ListEmptyComponent={
    <Text style={styles.emptyText}>You're all caught up </Text>
  }
/>

            <View style={styles.buttonsRow}>
              <TouchableOpacity
                style={styles.viewAllButton}
                onPress={() => {
                  onClose();
                  navigation.navigate('Notifications');
                }}
              >
                <Text style={styles.viewAllText}>View All</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.clearAllButton} onPress={handleClearAll}>
                <Text style={styles.clearAllText}>Clear All</Text>
              </TouchableOpacity>
            </View>
          </ImageBackground>
        </Animated.View>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  notificationButtonContainer: { marginRight: 15 },
  button: {
    width: 40,
    height: 50,
    marginTop: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  customIcon: { width: 20, height: 20, resizeMode: 'contain' },
  customIconAlert: { width: 30, height: 30, resizeMode: 'contain' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-start',
    alignItems: 'center',
  },
  modalContainer: {
    width: '90%',
    marginTop: 50,
    borderRadius: 10,
    overflow: 'hidden',
  },
  backgroundImage: {
    padding: 15,
    maxHeight: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 10,
    textAlign: 'center',
  },
  notificationList: { paddingBottom: 10 },
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    marginBottom: 10,
    padding: 8,
  },
  readBackground: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)', // softer, less saturated
    borderRadius: 10,
    opacity: 0.6,
  },
  
  unreadBackground: {
    backgroundColor: 'rgba(0, 255, 255, 0.1)', // light aqua base
    borderRadius: 10,
    shadowColor: '#00f0ff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 12,
    elevation: 0,
  },
  
  
  messageContainer: { flex: 1 },
  notificationText: { color: '#fff', fontSize: 14 },
  unreadText: {
    fontWeight: 'bold',
    color: '#00f0ff',
  },
  
  buttonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  viewAllButton: {
    flex: 1,
    marginRight: 5,
    paddingVertical: 6,
    borderRadius: 5,
    backgroundColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
  },
  viewAllText: { color: '#fff', fontSize: 14 },
  clearAllButton: {
    flex: 1,
    marginLeft: 5,
    paddingVertical: 6,
    borderRadius: 5,
    backgroundColor: 'rgba(255,0,0,0.3)',
    alignItems: 'center',
  },
  clearAllText: { color: '#fff', fontSize: 14 },
  emptyListContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 30,
  },
  
  emptyText: {
    color: '#ccc',
    fontSize: 16,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  
});
