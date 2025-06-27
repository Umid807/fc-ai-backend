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
  const [modalVisible, setModalVisible] = useState(false);
  const unreadCount = notifications.filter((notif) => !notif.read).length;
  const dropAnim = useRef(new Animated.Value(-500)).current;

  useEffect(() => {
    Animated.timing(dropAnim, {
      toValue: modalVisible ? 0 : -500,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [modalVisible]);

  const title = route.name === 'Home' ? 'proVision FC' : route.name;
  const notificationImage = unreadCount > 0
    ? require('../../assets/images/bell alert.png')
    : require('../../assets/images/bell.png');

  return (
    <ImageBackground
      source={require('../../assets/images/bk6.png')}
      style={styles.headerBackground}
      imageStyle={{ opacity: 0.9 }}
    >
      <View style={styles.headerContent}>
        {back ? (
          <TouchableOpacity onPress={navigation.goBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            onPress={() => navigation.navigate('Settings')}
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
              onPress={() => setModalVisible(true)}
              style={styles.button}
            >
              <Image source={notificationImage} style={styles.notificationIcon} />
            </TouchableOpacity>
          )}
        </View>
      </View>
      
      {/* Notification Modal */}
      <Modal visible={modalVisible} transparent animationType="none">
        <TouchableOpacity style={styles.modalOverlay} onPress={() => setModalVisible(false)}>
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
                        await markNotificationAsRead(item.id);
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
  headerBackground: { height: 60, position: 'absolute', top: 0, left: 0, right: 0, zIndex: 1000 },
  headerContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: 60, paddingHorizontal: 10 },
  headerTitle: { fontSize: 24, color: '#fff', fontWeight: 'bold' },
  settingsButton: { padding: 5, bottom: -15 },
  settingsIcon: { width: 40, height: 40, resizeMode: 'contain' },
  backButton: { padding: 5 },
  rightContainer: { flexDirection: 'row', alignItems: 'center' },
  button: { width: 40, height: 50, justifyContent: 'center', alignItems: 'center' },
  notificationIcon: { width: 30, height: 30, resizeMode: 'contain' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-start', alignItems: 'center' },
  modalContainer: { width: '90%', marginTop: 50 },
  gradientBackground: { borderRadius: 10, padding: 15, maxHeight: 400 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff', marginBottom: 10, textAlign: 'center' },
  notificationItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.2)', padding: 10, borderRadius: 5, marginBottom: 8 },
  notificationTextContainer: { flex: 1 },
  notificationText: { color: '#fff', fontSize: 14 },
  unreadText: { fontWeight: 'bold' },
  viewAllButton: { marginTop: 10, alignSelf: 'center', paddingVertical: 8, paddingHorizontal: 20, borderRadius: 5, backgroundColor: 'rgba(255,255,255,0.3)' },
  viewAllText: { color: '#fff', fontSize: 16 },
});

export default CustomHeader;