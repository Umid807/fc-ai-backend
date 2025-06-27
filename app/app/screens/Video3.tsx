import React from 'react';
import { StyleSheet, View, TouchableOpacity, Text } from 'react-native';
import { WebView } from 'react-native-webview';
import { useNavigation } from '@react-navigation/native';

export default function Video3() {
  const navigation = useNavigation();

  return (
    <View style={styles.container}>
      
      {/* ✅ Back Button */}
      <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
        <Text style={styles.backText}>Back</Text>
      </TouchableOpacity>

      {/* ✅ Video */}
      <WebView
        style={styles.video}
        javaScriptEnabled={true}
        allowsFullscreenVideo={true}
        source={{ uri: 'https://www.youtube.com/embed/BlhDTGIqrm0?autoplay=1&mute=1&controls=1&rel=0&playsinline=1' }} 
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  video: {
    flex: 1,
    height: '100%',
    borderRadius: 10,
  },
  backButton: {
    position: 'absolute',
    top: 70,
    left: 20,
    zIndex: 1,
    backgroundColor: '#333',
    padding: 10,
    borderRadius: 5,
  },
  backText: {
    color: '#fff',
    fontSize: 16,
  },
});
