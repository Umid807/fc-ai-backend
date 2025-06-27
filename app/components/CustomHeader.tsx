import React from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet, ImageBackground } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NotificationBell } from './notification'; // ✅ Adjust path if needed
import { useFonts } from 'expo-font';
// useRouter is specifically for Expo Router, we don't need it if we're using react-navigation's goBack
// import { useRouter } from 'expo-router'; // REMOVED THIS LINE

interface Props {
  navigation: any; // This will now be used for goBack()
  route: any;
  // router: any; // REMOVED THIS PROP, no longer needed
  options: any;
  back: any; // This prop indicates if a back button should be shown
  notifications: any[];
  markNotificationAsRead: (notifId: string) => Promise<void>;
  userId: string;
  onBackPress?: () => void; // ADDED THIS PROP for explicit back handling
}

export const CustomHeader = ({
  navigation,
  // router, // REMOVED THIS PROP
  route,
  options,
  back,
  notifications,
  markNotificationAsRead,
  userId,
  onBackPress // ACCEPT THE NEW onBackPress PROP
}: Props) => {
  const title = options.headerTitle ?? route.name;
  const insets = useSafeAreaInsets();

  const [fontsLoaded] = useFonts({
    Orbitron: require('../assets/fonts/Orbitron/Orbitron-Regular.ttf'), // ✅ Make sure font file exists
  });

  if (!fontsLoaded) return null; // Prevents flicker

  return (
    <ImageBackground
      source={require('../assets/images/header.png')} // ✅ Your cool background
      style={[styles.headerBackground, { height: 60 + insets.top, paddingTop: insets.top }]}
      imageStyle={{ opacity: 0.9 }}
    >
      <View style={styles.headerContent}>
        {/* Left Button */}
        {back ? (
          // Use onBackPress if provided, otherwise default to navigation.goBack()
          <TouchableOpacity onPress={onBackPress || (() => navigation.goBack())}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity onPress={() => navigation.navigate('Settings')} style={styles.settingsButton}>
            <Image
              source={require('../assets/images/settings.png')}
              style={styles.settingsIcon}
            />
          </TouchableOpacity>
        )}

        {/* Title */}
        <Text style={[styles.headerTitle, { fontFamily: 'Orbitron' }]}>{title}</Text>

        {/* Notification Bell */}
        <View style={styles.rightContainer}>
          {userId && (
            <NotificationBell
              notifications={notifications}
              navigation={navigation}
              markNotificationAsRead={markNotificationAsRead}
              userId={userId}
            />
          )}
        </View>
      </View>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  headerBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    backgroundColor: 'transparent',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 60,
    paddingHorizontal: 10,
  },
  headerTitle: {
    fontSize: 16,
    color: '#ffffffdd',
    fontWeight: '600',
    letterSpacing: 1.5,
    textShadowColor: '#39FF14',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
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
  backButton: { // This style might not be directly used anymore if the Ionicons touchable is used
    padding: 5,
  },
  rightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});