import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  ImageBackground,
  Modal,
  FlatList,
  Animated,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const CustomHeader = ({
  navigation,
  route,
  back,
  notifications = [],
  markNotificationAsRead,
  userId,
}) => {
  console.log("CustomHeader: Component initialized with props.");
  const [modalVisible, setModalVisible] = useState(false);
  console.log(`CustomHeader: Initial modalVisible state set to: ${modalVisible}`);
  const unreadCount = notifications.filter((notif) => !notif.read).length;
  console.log(`CustomHeader: Unread notifications count calculated: ${unreadCount}`);
  const dropAnim = useRef(new Animated.Value(-500)).current;
  console.log("CustomHeader: Animated value dropAnim initialized.");

  useEffect(() => {
    console.log(`CustomHeader: useEffect triggered. modalVisible changed to: ${modalVisible}`);
    Animated.timing(dropAnim, {
      toValue: modalVisible ? 0 : -500,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      console.log(`CustomHeader: Modal animation ${modalVisible ? 'opened' : 'closed'} completed.`);
    });
    return () => {
      console.log("CustomHeader: useEffect cleanup executed.");
    };
  }, [modalVisible]);

  const title = route.name === 'Home' ? 'proVision FC' : route.name;
  console.log(`CustomHeader: Header title derived: ${title}`);
  const notificationImage = unreadCount > 0
    ? require('../../assets/images/bell alert.png')
    : require('../../assets/images/bell.png');
  console.log(`CustomHeader: Notification image determined based on unread count: ${unreadCount}`);

  return (
    <ImageBackground
      source={require('../../assets/images/bk6.png')}
      style={styles.headerBackground}
      imageStyle={{ opacity: 0.9 }}
    >
      <View style={styles.headerContent}>
        {back ? (
          <TouchableOpacity onPress={() => {
            console.log("CustomHeader: Back button pressed. Initiating navigation.goBack().");
            navigation.goBack();
          }} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            onPress={() => {
              console.log("CustomHeader: Settings button pressed. Navigating to SettingsScreen.");
              navigation.navigate('Settings');
            }}
            style={styles.settingsButton}
          >
            <Image
              source={require('../../assets/images/settings.png')}
              style={styles.settingsIcon}
            />
          </TouchableOpacity>
        )}
        <Text style={styles.headerTitle}>{title}</Text>
        <View style={styles.rightContainer}>
          {userId && (
            <TouchableOpacity
              onPress={() => {
                console.log("CustomHeader: Notification button pressed. Setting modalVisible to true.");
                setModalVisible(true);
              }}
              style={styles.button}
            >
              <Image source={notificationImage} style={styles.notificationIcon} />
              {unreadCount > 0 && (
                <View style={styles.unreadCountBadge}>
                  <Text style={styles.unreadCountText}>{unreadCount}</Text>
                </View>
              )}
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Notification Modal */}
      <Modal visible={modalVisible} transparent animationType="none">
        <TouchableOpacity style={styles.modalOverlay} onPress={() => {
          console.log("CustomHeader: Modal overlay pressed. Setting modalVisible to false.");
          setModalVisible(false);
        }}>
          <Animated.View style={[styles.modalContainer, { transform: [{ translateY: dropAnim }] }]}>
            <LinearGradient colors={['#4c669f', '#3b5998', '#192f6a']} style={styles.gradientBackground}>
              <Text style={styles.modalTitle}>Notifications</Text>
              <FlatList
                data={notifications.slice(0, 5)}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <View style={styles.notificationItem}>
                    <TouchableOpacity
                      onPress={async () => {
                        console.log(`CustomHeader: Notification item pressed. ID: ${item.id}. Attempting to mark as read.`);
                        try {
                          await markNotificationAsRead(item.id);
                          console.log(`CustomHeader: Notification ID: ${item.id} marked as read successfully.`);
                        } catch (error) {
                          console.log(`CustomHeader: Failed to mark notification ID: ${item.id} as read. Error: ${error.message}`);
                        }
                        console.log("CustomHeader: Closing notification modal after item press.");
                        setModalVisible(false);
                      }}
                      style={styles.notificationTextContainer}
                    >
                      <Text style={[styles.notificationText, !item.read && styles.unreadText]}>
                        {item.message}
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              />
              <TouchableOpacity
                style={styles.viewAllButton}
                onPress={() => {
                  console.log("CustomHeader: View All button pressed. Closing modal and navigating to NotificationsScreen.");
                  setModalVisible(false);
                  navigation.navigate('Notifications');
                }}
              >
                <Text style={styles.viewAllText}>View All</Text>
              </TouchableOpacity>
            </LinearGradient>
          </Animated.View>
        </TouchableOpacity>
      </Modal>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  headerBackground: {
    height: 60,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 60,
    paddingHorizontal: 10,
  },
  headerTitle: {
    fontSize: 24,
    color: '#fff',
    fontWeight: 'bold',
  },
  settingsButton: {
    padding: 5,
    bottom: -15,
  },
  settingsIcon: {
    width: 40,
    height: 40,
    resizeMode: 'contain',
  },
  backButton: {
    padding: 5,
  },
  rightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  button: {
    width: 40,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationIcon: {
    width: 30,
    height: 30,
    resizeMode: 'contain',
  },
  unreadCountBadge: {
    position: 'absolute',
    top: 5,
    right: 5,
    backgroundColor: 'red',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  unreadCountText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-start',
    alignItems: 'center',
  },
  modalContainer: {
    width: '90%',
    marginTop: 50,
  },
  gradientBackground: {
    borderRadius: 10,
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
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    padding: 10,
    borderRadius: 5,
    marginBottom: 8,
  },
  notificationTextContainer: {
    flex: 1,
  },
  notificationText: {
    color: '#fff',
    fontSize: 14,
  },
  unreadText: {
    fontWeight: 'bold',
  },
  viewAllButton: {
    marginTop: 10,
    alignSelf: 'center',
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 5,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  viewAllText: {
    color: '#fff',
    fontSize: 16,
  },
});

export default CustomHeader;